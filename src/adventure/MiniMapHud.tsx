import { useMemo, useState, type CSSProperties } from 'react'
import type { AdventureRect, AdventureStageDef, RoomDef } from './adventureTypes'

/**
 * 2026-08-20 修正：房間版面不能用 atlasOrigin 排——atlasOrigin 只是背景圖
 * 存在離屏 atlas 貼圖裡的座標（技術實作細節），跟玩家在遊戲裡實際往哪個
 * 方向走完全無關（room_02 在 atlas 上可能畫在 room_01 右邊，但玩家從
 * room_01 走到 room_02 其實是往「上」走，不是往右）。
 *
 * 真正的方位要從每個 transition 的 zone 在房間 local 座標裡「貼哪一邊」
 * 反推：zone 中心離房間頂邊最近＝北（往上），離底邊最近＝南，左邊＝西，
 * 右邊＝東。從 stage.rooms[0] 當起點做 BFS，一路依方向把每個房間放進一個
 * 邏輯格子（col/row），畫出來的地圖才會是跟玩家實際移動方向一致的樣子。
 *
 * 2026-08-21（雪原篇 2-1）：這個檔案原本整個寫死讀 FOREST_RUINS_01_STAGE，
 * 只有森林遺跡能用。改成吃 stage prop，所有幾何都用 useMemo 依 stage 重新
 * 算，才不會讓第二個 Room Transition 關卡（雪原 2-1）共用同一份地圖資料。
 */

type Direction = 'N' | 'S' | 'E' | 'W'

function transitionDirection(zone: AdventureRect, roomSize: { width: number; height: number }): Direction {
  const cx = zone.x + zone.width / 2
  const cy = zone.y + zone.height / 2
  const distTop = cy
  const distBottom = roomSize.height - cy
  const distLeft = cx
  const distRight = roomSize.width - cx
  const min = Math.min(distTop, distBottom, distLeft, distRight)
  if (min === distTop) return 'N'
  if (min === distBottom) return 'S'
  if (min === distLeft) return 'W'
  return 'E'
}

const DIR_OFFSET: Record<Direction, { col: number; row: number }> = {
  N: { col: 0, row: -1 },
  S: { col: 0, row: 1 },
  E: { col: 1, row: 0 },
  W: { col: -1, row: 0 },
}

function computeRoomGridPositions(rooms: RoomDef[]): Map<string, { col: number; row: number }> {
  const byId = new Map(rooms.map(r => [r.id, r]))
  const positions = new Map<string, { col: number; row: number }>()
  if (rooms.length === 0) return positions
  positions.set(rooms[0].id, { col: 0, row: 0 })
  const queue = [rooms[0].id]
  while (queue.length > 0) {
    const currentId = queue.shift()!
    const current = byId.get(currentId)
    const currentPos = positions.get(currentId)
    if (!current || !currentPos) continue
    for (const t of current.transitions) {
      if (positions.has(t.targetRoomId)) continue
      const offset = DIR_OFFSET[transitionDirection(t.zone, current.size)]
      positions.set(t.targetRoomId, { col: currentPos.col + offset.col, row: currentPos.row + offset.row })
      queue.push(t.targetRoomId)
    }
  }
  return positions
}

export interface MiniMapRoomGeometry {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
}

export interface MiniMapCorridorGeometry {
  id: string
  fromRoomId: string
  toRoomId: string
  x: number
  y: number
  width: number
  height: number
}

const CELL_W = 26
const CELL_H = 32
const CELL_GAP = 4
const ROOM_GAP = 2
const MAP_PADDING = 10

/** 房間短標籤，用 stageId 分開命名空間——不同關卡的房間 id 可能都叫
 * room_01/room_02，混在同一份表會互相蓋掉（曾經是森林遺跡專用表，這裡
 * 拆成 stageId → roomId → label 兩層）。沒有對應條目時退回 room.name
 * （完整名稱，稍長但一定正確）。 */
const ROOM_LABELS: Record<string, Record<string, string>> = {
  forest_1_1: {
    room_01: '入口', room_02: '小徑', room_03: '岔路', room_03a: '花圃',
    room_05: '石橋', room_06: '廣場', room_06a: '密室', room_07: '營地',
    room_08: '祭壇', room_09: '出口',
  },
  snowfield_2_1: {
    room_01: '入口', room_02: '林道', room_03: '坡道',
    room_04: '營地', room_05: '伏擊', room_06: '崖口',
  },
  snowfield_2_2: {
    room_01: '外徑', room_02: '門道', room_03: '廣場', room_04: '西牆',
    room_04a: '補給庫', room_05: '東塔', room_06: '走廊', room_07: '守衛',
  },
  snowfield_2_3: {
    room_01: '入口', room_02: '岔口', room_03a: '高地', room_03b: '低谷',
    room_04: '匯口', room_05: '獵場', room_06: '雪坡',
  },
  snowfield_2_4: {
    room_01: '入口', room_02: '甬道', room_03: '冰柱廳', room_04: '中庭',
    room_04a: '裂穴', room_05: '凍骨廊', room_06: '前庭', room_07: '祭台', room_08: '出口',
  },
  snowfield_2_5: {
    room_01: '遠望', room_02: '雪道', room_03: '前庭', room_03a: '軍械庫',
    room_04: '廣場', room_05: '階梯', room_06: '決鬥場', room_07: '城內',
  },
  snowfield_2_6: {
    room_01: '湖口', room_02: '西南岸', room_03: '西岸', room_04: '北岸',
    room_05: '東岸', room_05a: '湖心', room_06: '東南岸', room_07: '門影',
    room_08: '巨像台', room_09: '裂谷',
  },
  snowfield_2_7: {
    room_01: '入口', room_02: '岔道', room_03a: '高脊', room_04a: '風切台',
    room_03b: '捷徑', room_04b: '谷底', room_05: '匯口', room_06: '巢地', room_07: '後門',
  },
  snowfield_2_8: {
    room_01: '入口', room_02: '廣場', room_03: '西街', room_04: '西庭',
    room_04a: '寶庫', room_05: '東街', room_06: '軍營', room_07: '北塔',
    room_08: '鐘樓', room_09: '內門', room_10: '將軍庭', room_11: '前廊',
  },
  snowfield_2_9: {
    room_01: '入口', room_02: '回廊', room_02a: '密室', room_03: '祭台',
    room_04: '戰區', room_05: '長廊', room_06: '中庭', room_07: '前殿',
    room_08: '王座前', room_09: '冰牆',
  },
  snowfield_2_10: {
    room_01: '門扉', room_02: '外庭', room_03: '岔口', room_04a: '長廊',
    room_04b: '道路', room_05: '匯口', room_06: '階梯', room_07: '前殿',
    room_08: '王座', room_09: '核心', room_10: '餘光',
  },
}

/** 全圖展開視窗的標題，用 stageId 對應——跟 ROOM_LABELS 一樣故意不用
 * room.name 自動推，避免每個房間名稱不一致時標題跳來跳去。 */
const STAGE_MAP_TITLES: Record<string, string> = {
  forest_1_1: '森林遺跡',
  snowfield_2_1: '雪線之外',
  snowfield_2_2: '失聯哨站',
  snowfield_2_3: '白樺獵場',
  snowfield_2_4: '冰窟低語',
  snowfield_2_5: '霜甲關門',
  snowfield_2_6: '碎冰之湖',
  snowfield_2_7: '巨獸雪谷',
  snowfield_2_8: '冰封王城',
  snowfield_2_9: '永冬祭壇',
  snowfield_2_10: '極寒王座',
}

function roomGeometryFromStage(stage: AdventureStageDef, rooms: RoomDef[]): MiniMapRoomGeometry[] {
  const gridPos = computeRoomGridPositions(rooms)
  const cols = rooms.map(r => gridPos.get(r.id)?.col ?? 0)
  const rows = rooms.map(r => gridPos.get(r.id)?.row ?? 0)
  const minCol = cols.length > 0 ? Math.min(...cols) : 0
  const minRow = rows.length > 0 ? Math.min(...rows) : 0
  const labels = ROOM_LABELS[stage.stageId] ?? {}

  return rooms.map(room => {
    const pos = gridPos.get(room.id) ?? { col: 0, row: 0 }
    const col = pos.col - minCol
    const row = pos.row - minRow
    return {
      id: room.id,
      label: labels[room.id] ?? room.name,
      x: MAP_PADDING + col * (CELL_W + CELL_GAP),
      y: MAP_PADDING + row * (CELL_H + CELL_GAP),
      width: Math.max(10, CELL_W - ROOM_GAP),
      height: Math.max(10, CELL_H - ROOM_GAP),
    }
  })
}

/** 本地視窗固定 3 格寬 x 3 格高，跟目前所在房間的內容多寡無關——像守望傳說
 * 那種風格：平常畫面上固定是一個「小窗口」，只顯示玩家目前周圍的一小塊
 * 範圍，點一下才彈出完整地圖。 */
const LOCAL_WINDOW_COLS = 3
const LOCAL_WINDOW_ROWS = 3
const LOCAL_WINDOW_W = LOCAL_WINDOW_COLS * (CELL_W + CELL_GAP)
const LOCAL_WINDOW_H = LOCAL_WINDOW_ROWS * (CELL_H + CELL_GAP)

function roomCenter(room: MiniMapRoomGeometry) {
  return { x: room.x + room.width / 2, y: room.y + room.height / 2 }
}

function corridorForTransition(
  from: MiniMapRoomGeometry,
  to: MiniMapRoomGeometry,
  transitionId: string,
): MiniMapCorridorGeometry {
  const a = roomCenter(from)
  const b = roomCenter(to)
  const horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)
  const width = horizontal ? Math.max(6, Math.abs(b.x - a.x) - (from.width + to.width) / 2) : 10
  const height = horizontal ? 10 : Math.max(6, Math.abs(b.y - a.y) - (from.height + to.height) / 2)
  const x = horizontal ? Math.min(a.x, b.x) + Math.min(from.width, to.width) / 2 : a.x - width / 2
  const y = horizontal ? a.y - height / 2 : Math.min(a.y, b.y) + Math.min(from.height, to.height) / 2
  return { id: transitionId, fromRoomId: from.id, toRoomId: to.id, x, y, width, height }
}

function corridorsFromStage(rooms: RoomDef[], roomGeo: MiniMapRoomGeometry[]) {
  const byId = new Map(roomGeo.map(room => [room.id, room]))
  const seen = new Set<string>()
  const corridors: MiniMapCorridorGeometry[] = []
  for (const room of rooms) {
    for (const transition of room.transitions) {
      const target = byId.get(transition.targetRoomId)
      const source = byId.get(room.id)
      if (!source || !target) continue
      const pair = [room.id, target.id].sort().join('|')
      if (seen.has(pair)) continue
      seen.add(pair)
      corridors.push(corridorForTransition(source, target, `${room.id}-${target.id}`))
    }
  }
  return corridors
}

interface MiniMapHudProps {
  stage: AdventureStageDef
  activeRoomId: string
  discoveredRoomIds: string[]
}

function roomStyle(active: boolean): CSSProperties {
  return {
    fill: active ? '#96d94f' : '#69a83d',
    fillOpacity: active ? 0.98 : 0.82,
    stroke: active ? '#fff2b2' : '#d6ee9b',
    strokeWidth: active ? 2.5 : 1.6,
    vectorEffect: 'non-scaling-stroke',
  }
}

interface MapBodyProps {
  viewBox: string
  activeRoomId: string
  discovered: Set<string>
  rooms: MiniMapRoomGeometry[]
  corridors: MiniMapCorridorGeometry[]
  glowId: string
}

/** 房間/走廊/目前位置 pin 的共用畫法，本地小窗跟展開全圖都是同一套，只有
 * viewBox（顯示範圍）不一樣——展開全圖看得到的房間跟走廊，本地小窗一定
 * 也看得到同一批（畢竟資料完全相同，只是視窗裁切範圍不同），不會有兩邊
 * 資料兜不起來的問題。長寬比由外層容器決定（本地是按鈕本身、全圖是
 * .adv-minimap-full-body），這裡的 svg 永遠只是 100%/100% 填滿容器。 */
function MiniMapBody({ viewBox, activeRoomId, discovered, rooms, corridors, glowId }: MapBodyProps) {
  const active = rooms.find(room => room.id === activeRoomId)
  const pinX = active ? active.x + active.width / 2 : MAP_PADDING
  const pinY = active ? active.y + active.height / 2 : MAP_PADDING
  return (
    <svg className="adv-minimap-svg" viewBox={viewBox} role="img">
      <defs>
        <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g className="adv-minimap-corridors">
        {corridors.filter(c => discovered.has(c.fromRoomId) && discovered.has(c.toRoomId)).map(corridor => (
          <rect key={corridor.id} x={corridor.x} y={corridor.y} width={corridor.width} height={corridor.height} rx="4" />
        ))}
      </g>
      <g className="adv-minimap-rooms">
        {rooms.filter(room => discovered.has(room.id)).map(room => (
          <rect key={room.id} x={room.x} y={room.y} width={room.width} height={room.height} style={roomStyle(room.id === activeRoomId)} rx="6" />
        ))}
      </g>
      {active && <rect className="adv-minimap-active-halo" x={active.x - 3} y={active.y - 3} width={active.width + 6} height={active.height + 6} rx="8" />}
      {active && (
        <g className="adv-minimap-pin" transform={`translate(${pinX} ${pinY})`} filter={`url(#${glowId})`}>
          <circle className="adv-minimap-pin-halo" r="8" />
          <path d="M0,-6 C-4,-6 -6.5,-2.5 -6.5,0.5 C-6.5,4.5 0,10.5 0,10.5 C0,10.5 6.5,4.5 6.5,0.5 C6.5,-2.5 4,-6 0,-6Z" />
          <circle r="2.2" />
        </g>
      )}
    </svg>
  )
}

export default function MiniMapHud({ stage, activeRoomId, discoveredRoomIds }: MiniMapHudProps) {
  const [fullOpen, setFullOpen] = useState(false)

  const rooms = useMemo(() => stage.rooms ?? [], [stage])
  const roomGeo = useMemo(() => roomGeometryFromStage(stage, rooms), [stage, rooms])
  const corridors = useMemo(() => corridorsFromStage(rooms, roomGeo), [rooms, roomGeo])
  const viewBoxSize = useMemo(() => {
    if (roomGeo.length === 0) return { width: 120, height: 120 }
    const maxRight = Math.max(...roomGeo.map(r => r.x + r.width))
    const maxBottom = Math.max(...roomGeo.map(r => r.y + r.height))
    return { width: maxRight + MAP_PADDING, height: maxBottom + MAP_PADDING }
  }, [roomGeo])

  const discovered = new Set(discoveredRoomIds)
  const active = roomGeo.find(room => room.id === activeRoomId)

  const activeCenter = active ? roomCenter(active) : { x: MAP_PADDING, y: MAP_PADDING }
  const localViewBox = `${activeCenter.x - LOCAL_WINDOW_W / 2} ${activeCenter.y - LOCAL_WINDOW_H / 2} ${LOCAL_WINDOW_W} ${LOCAL_WINDOW_H}`
  const fullViewBox = `0 0 ${viewBoxSize.width} ${viewBoxSize.height}`

  return (
    <>
      {/* 固定大小的本地窗口——只顯示玩家目前周圍一小塊範圍，不是整張地圖
          縮小塞進去；點一下彈出完整地圖。 */}
      <button
        className="adv-minimap-local-btn"
        onClick={() => setFullOpen(true)}
        aria-label="展開完整地圖"
        style={{ aspectRatio: `${LOCAL_WINDOW_W} / ${LOCAL_WINDOW_H}` }}
      >
        <MiniMapBody
          viewBox={localViewBox}
          activeRoomId={activeRoomId}
          discovered={discovered}
          rooms={roomGeo}
          corridors={corridors}
          glowId="adv-minimap-glow-local"
        />
      </button>

      {fullOpen && (
        <div className="adv-minimap-overlay-backdrop" onClick={() => setFullOpen(false)}>
          <div
            className="adv-minimap-overlay-panel"
            role="dialog"
            aria-label="完整探索地圖"
            onClick={e => e.stopPropagation()}
          >
            <button className="adv-minimap-collapse-btn" onClick={() => setFullOpen(false)} aria-label="收合地圖">✕</button>
            <div className="adv-minimap-title">{STAGE_MAP_TITLES[stage.stageId] ?? '探索地圖'}</div>
            {/* 2026-08-20 修正：地圖內容是又窄又高的長條（一路往北的走廊），
                直接把長寬比套在整個面板上，用「寬度」去反推高度會爆版
                （寬度隨螢幕給，算出來的高度遠超過螢幕能看到的範圍，畫面
                下半段整個超出去）。改成這個包住 svg 的容器直接用「高度」
                當基準（有上限夾住），寬度用長寬比反推——內容窄高，算出來
                的寬度自然也小，不會爆版。 */}
            <div
              className="adv-minimap-full-body"
              style={{ aspectRatio: `${viewBoxSize.width} / ${viewBoxSize.height}` }}
            >
              <MiniMapBody
                viewBox={fullViewBox}
                activeRoomId={activeRoomId}
                discovered={discovered}
                rooms={roomGeo}
                corridors={corridors}
                glowId="adv-minimap-glow-full"
              />
            </div>
            <div className="adv-minimap-legend"><span className="adv-minimap-dot" />目前位置</div>
          </div>
        </div>
      )}
    </>
  )
}
