import type { CSSProperties } from 'react'
import { FOREST_RUINS_01_STAGE } from './stages/forestRuins01'

/**
 * 迷你地圖房間/走廊幾何全部從 FOREST_RUINS_01_STAGE.rooms 動態算出來，不
 * 維護獨立的座標表——關卡改房間位置、加房間、改連接方式時，這裡自動跟著
 * 變，不會有兩份資料各自維護、其中一份忘記更新的風險。
 */

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

export const MINI_MAP_VIEWBOX = { width: 360, height: 180 }

const ROOM_GAP = 6
const MAP_PADDING = 12
const ATLAS_X_SCALE = 0.06
const ATLAS_Y_SCALE = 0.025

const ROOM_LABELS: Record<string, string> = {
  room_01: '入口', room_02: '小徑', room_03: '岔路', room_03a: '花圃',
  room_05: '石橋', room_06: '廣場', room_06a: '密室', room_07: '營地',
  room_08: '祭壇', room_09: '出口',
}

function roomGeometryFromStage() {
  const rooms = FOREST_RUINS_01_STAGE.rooms ?? []
  const maxX = Math.max(...rooms.map(room => room.atlasOrigin.x + room.size.width))
  const maxY = Math.max(...rooms.map(room => room.atlasOrigin.y + room.size.height))
  const usableWidth = MINI_MAP_VIEWBOX.width - MAP_PADDING * 2
  const usableHeight = MINI_MAP_VIEWBOX.height - MAP_PADDING * 2
  const xScale = Math.min(ATLAS_X_SCALE, usableWidth / maxX)
  const yScale = Math.min(ATLAS_Y_SCALE, usableHeight / maxY)

  return rooms.map(room => ({
    id: room.id,
    label: ROOM_LABELS[room.id] ?? room.name,
    x: MAP_PADDING + room.atlasOrigin.x * xScale,
    y: MAP_PADDING + room.atlasOrigin.y * yScale,
    width: Math.max(18, room.size.width * xScale - ROOM_GAP),
    height: Math.max(14, room.size.height * yScale - ROOM_GAP),
  }))
}

export const FOREST_RUINS_MINIMAP_ROOMS: MiniMapRoomGeometry[] = roomGeometryFromStage()

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
  const width = horizontal ? Math.max(10, Math.abs(b.x - a.x) - (from.width + to.width) / 2) : 12
  const height = horizontal ? 12 : Math.max(10, Math.abs(b.y - a.y) - (from.height + to.height) / 2)
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

function roomStyle(active: boolean, discovered: boolean): CSSProperties {
  return {
    fill: active ? '#96d94f' : discovered ? '#69a83d' : '#27492d',
    fillOpacity: active ? 0.98 : discovered ? 0.82 : 0.42,
    stroke: active ? '#fff2b2' : discovered ? '#d6ee9b' : '#658c58',
    strokeWidth: active ? 2.5 : 1.6,
    vectorEffect: 'non-scaling-stroke',
  }
}

export default function MiniMapHud({ activeRoomId, discoveredRoomIds }: MiniMapHudProps) {
  const discovered = new Set(discoveredRoomIds)
  const active = FOREST_RUINS_MINIMAP_ROOMS.find(room => room.id === activeRoomId)
  const pinX = active ? active.x + active.width / 2 : MAP_PADDING
  const pinY = active ? active.y + active.height / 2 : MAP_PADDING
  // 只有兩端都探索過的走廊才顯示——要走過那條路才看得到，不會提前爆雷還
  // 沒去過的區域怎麼連。
  const visibleCorridors = FOREST_RUINS_MINIMAP_CORRIDORS.filter(corridor => (
    discovered.has(corridor.fromRoomId) && discovered.has(corridor.toRoomId)
  ))

  return (
    <div className="adv-minimap" aria-label="森林遺跡探索地圖">
      <div className="adv-minimap-title">森林遺跡</div>
      <svg className="adv-minimap-svg" viewBox={`0 0 ${MINI_MAP_VIEWBOX.width} ${MINI_MAP_VIEWBOX.height}`} role="img">
        <defs>
          <filter id="adv-minimap-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g className="adv-minimap-corridors">
          {visibleCorridors.map(corridor => (
            <rect key={corridor.id} x={corridor.x} y={corridor.y} width={corridor.width} height={corridor.height} rx="5" />
          ))}
        </g>
        <g className="adv-minimap-rooms">
          {FOREST_RUINS_MINIMAP_ROOMS.filter(room => discovered.has(room.id)).map(room => (
            <rect key={room.id} x={room.x} y={room.y} width={room.width} height={room.height} style={roomStyle(room.id === activeRoomId, discovered.has(room.id))} rx="8" />
          ))}
        </g>
        {active && <rect className="adv-minimap-active-halo" x={active.x - 3} y={active.y - 3} width={active.width + 6} height={active.height + 6} rx="10" />}
        {active && (
          <g className="adv-minimap-pin" transform={`translate(${pinX} ${pinY})`} filter="url(#adv-minimap-glow)">
            <circle className="adv-minimap-pin-halo" r="10" />
            <path d="M0,-7 C-5,-7 -8,-3 -8,1 C-8,6 0,13 0,13 C0,13 8,6 8,1 C8,-3 5,-7 0,-7Z" />
            <circle r="2.8" />
          </g>
        )}
      </svg>
      <div className="adv-minimap-legend"><span className="adv-minimap-dot" />目前位置</div>
    </div>
  )
}
