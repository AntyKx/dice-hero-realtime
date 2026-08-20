import { useState, type CSSProperties } from 'react'
import type { AdventureRect } from './adventureTypes'
import { FOREST_RUINS_01_STAGE } from './stages/forestRuins01'

/**
 * 2026-08-20 修正：房間版面不能用 atlasOrigin 排——atlasOrigin 只是背景圖
 * 存在離屏 atlas 貼圖裡的座標（5x2 紋理排列，純技術實作細節），跟玩家在
 * 遊戲裡實際往哪個方向走完全無關（room_02 在 atlas 上是畫在 room_01 右邊，
 * 但玩家從 room_01 走到 room_02 其實是往「上」走，不是往右）。
 *
 * 真正的方位要從每個 transition 的 zone 在房間 local 座標裡「貼哪一邊」
 * 反推：zone 中心離房間頂邊最近＝北（往上），離底邊最近＝南，左邊＝西，
 * 右邊＝東。從 stage.rooms[0]（森林入口）當起點做 BFS，一路依方向把每個
 * 房間放進一個邏輯格子（col/row），畫出來的地圖才會是「入口在最下面，
 * 一路往上走，中途分岔往左/右」這種跟玩家實際移動方向一致的樣子。
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

function computeRoomGridPositions(): Map<string, { col: number; row: number }> {
  const rooms = FOREST_RUINS_01_STAGE.rooms ?? []
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

const ROOM_LABELS: Record<string, string> = {
  room_01: '入口', room_02: '小徑', room_03: '岔路', room_03a: '花圃',
  room_05: '石橋', room_06: '廣場', room_06a: '密室', room_07: '營地',
  room_08: '祭壇', room_09: '出口',
}

function roomGeometryFromStage(): MiniMapRoomGeometry[] {
  const rooms = FOREST_RUINS_01_STAGE.rooms ?? []
  const gridPos = computeRoomGridPositions()
  const cols = rooms.map(r => gridPos.get(r.id)?.col ?? 0)
  const rows = rooms.map(r => gridPos.get(r.id)?.row ?? 0)
  const minCol = cols.length > 0 ? Math.min(...cols) : 0
  const minRow = rows.length > 0 ? Math.min(...rows) : 0

  return rooms.map(room => {
    const pos = gridPos.get(room.id) ?? { col: 0, row: 0 }
    const col = pos.col - minCol
    const row = pos.row - minRow
    return {
      id: room.id,
      label: ROOM_LABELS[room.id] ?? room.name,
      x: MAP_PADDING + col * (CELL_W + CELL_GAP),
      y: MAP_PADDING + row * (CELL_H + CELL_GAP),
      width: Math.max(10, CELL_W - ROOM_GAP),
      height: Math.max(10, CELL_H - ROOM_GAP),
    }
  })
}

export const FOREST_RUINS_MINIMAP_ROOMS: MiniMapRoomGeometry[] = roomGeometryFromStage()

/** 地圖實際內容的邊界（含 padding）——只有「展開看全圖」用得到，本地視窗
 * 是固定大小的獨立窗口，不受這個影響。 */
export const MINI_MAP_VIEWBOX = (() => {
  if (FOREST_RUINS_MINIMAP_ROOMS.length === 0) return { width: 120, height: 120 }
  const maxRight = Math.max(...FOREST_RUINS_MINIMAP_ROOMS.map(r => r.x + r.width))
  const maxBottom = Math.max(...FOREST_RUINS_MINIMAP_ROOMS.map(r => r.y + r.height))
  return { width: maxRight + MAP_PADDING, height: maxBottom + MAP_PADDING }
})()

// 2026-08-20：像守望傳說那種風格——平常畫面上固定是一個「小窗口」，只顯示
// 玩家目前周圍的一小塊範圍（不是整張地圖縮小塞進去），點一下才彈出完整
// 地圖。本地窗口固定 3 格寬 x 3 格高，跟目前所在房間的內容多寡無關。
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

function corridorsFromStage(rooms: MiniMapRoomGeometry[]) {
  const byId = new Map(rooms.map(room => [room.id, room]))
  const seen = new Set<string>()
  const corridors: MiniMapCorridorGeometry[] = []
  for (const room of FOREST_RUINS_01_STAGE.rooms ?? []) {
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

export const FOREST_RUINS_MINIMAP_CORRIDORS = corridorsFromStage(FOREST_RUINS_MINIMAP_ROOMS)

interface MiniMapHudProps {
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
  visibleCorridors: MiniMapCorridorGeometry[]
  glowId: string
}

/** 房間/走廊/目前位置 pin 的共用畫法，本地小窗跟展開全圖都是同一套，只有
 * viewBox（顯示範圍）不一樣——展開全圖看得到的房間跟走廊，本地小窗一定
 * 也看得到同一批（畢竟資料完全相同，只是視窗裁切範圍不同），不會有兩邊
 * 資料兜不起來的問題。長寬比由外層容器決定（本地是按鈕本身、全圖是
 * .adv-minimap-full-body），這裡的 svg 永遠只是 100%/100% 填滿容器。 */
function MiniMapBody({ viewBox, activeRoomId, discovered, visibleCorridors, glowId }: MapBodyProps) {
  const active = FOREST_RUINS_MINIMAP_ROOMS.find(room => room.id === activeRoomId)
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
        {visibleCorridors.map(corridor => (
          <rect key={corridor.id} x={corridor.x} y={corridor.y} width={corridor.width} height={corridor.height} rx="4" />
        ))}
      </g>
      <g className="adv-minimap-rooms">
        {FOREST_RUINS_MINIMAP_ROOMS.filter(room => discovered.has(room.id)).map(room => (
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

export default function MiniMapHud({ activeRoomId, discoveredRoomIds }: MiniMapHudProps) {
  const [fullOpen, setFullOpen] = useState(false)
  const discovered = new Set(discoveredRoomIds)
  const active = FOREST_RUINS_MINIMAP_ROOMS.find(room => room.id === activeRoomId)
  // 只有兩端都探索過的走廊才顯示——要走過那條路才看得到，不會提前爆雷還
  // 沒去過的區域怎麼連。本地窗跟全圖共用同一份過濾結果。
  const visibleCorridors = FOREST_RUINS_MINIMAP_CORRIDORS.filter(corridor => (
    discovered.has(corridor.fromRoomId) && discovered.has(corridor.toRoomId)
  ))

  const activeCenter = active ? roomCenter(active) : { x: MAP_PADDING, y: MAP_PADDING }
  const localViewBox = `${activeCenter.x - LOCAL_WINDOW_W / 2} ${activeCenter.y - LOCAL_WINDOW_H / 2} ${LOCAL_WINDOW_W} ${LOCAL_WINDOW_H}`
  const fullViewBox = `0 0 ${MINI_MAP_VIEWBOX.width} ${MINI_MAP_VIEWBOX.height}`

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
          visibleCorridors={visibleCorridors}
          glowId="adv-minimap-glow-local"
        />
      </button>

      {fullOpen && (
        <div className="adv-minimap-overlay-backdrop" onClick={() => setFullOpen(false)}>
          <div
            className="adv-minimap-overlay-panel"
            role="dialog"
            aria-label="森林遺跡完整探索地圖"
            onClick={e => e.stopPropagation()}
          >
            <button className="adv-minimap-collapse-btn" onClick={() => setFullOpen(false)} aria-label="收合地圖">✕</button>
            <div className="adv-minimap-title">森林遺跡</div>
            {/* 2026-08-20 修正：地圖內容是又窄又高的長條（一路往北的走廊），
                直接把長寬比套在整個面板上，用「寬度」去反推高度會爆版
                （寬度隨螢幕給，算出來的高度遠超過螢幕能看到的範圍，畫面
                下半段整個超出去）。改成這個包住 svg 的容器直接用「高度」
                當基準（有上限夾住），寬度用長寬比反推——內容窄高，算出來
                的寬度自然也小，不會爆版。 */}
            <div
              className="adv-minimap-full-body"
              style={{ aspectRatio: `${MINI_MAP_VIEWBOX.width} / ${MINI_MAP_VIEWBOX.height}` }}
            >
              <MiniMapBody
                viewBox={fullViewBox}
                activeRoomId={activeRoomId}
                discovered={discovered}
                visibleCorridors={visibleCorridors}
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
