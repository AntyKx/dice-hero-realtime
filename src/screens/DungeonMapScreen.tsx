import { useRef, useLayoutEffect, useState, useEffect } from 'react'
import type { DungeonNode, DungeonNodeType } from '../dungeon'
import { playBgm } from '../lib/sound'

const DUNGEON_BGM: Record<string, string> = {
  star_eclipse:   '/assets/bgm/star_eclipse_battle.mp3',
  burning_throne: '/assets/bgm/throne_battle.mp3',
  black_tide:     '/assets/bgm/black_tide_battle.wav',
  ash_covenant:   '/assets/bgm/ash_covenant_battle.mp3',
}

const DUNGEON_BOSS_ICONS: Record<string, string> = {
  star_eclipse:   '🌑',
  burning_throne: '🔥',
  black_tide:     '🌊',
  ash_covenant:   '🔱',
}

function getNodeIcons(dungeonId: string): Record<DungeonNodeType, string> {
  return {
    battle: '⚔', elite: '💀', mini_boss: '👑', rest: '💤',
    boss: DUNGEON_BOSS_ICONS[dungeonId] ?? '👑',
    event: '📜', chest: '📦',
  }
}
const NODE_LABELS: Record<DungeonNodeType, string> = {
  battle: '戰鬥', elite: '精英', mini_boss: '小BOSS', rest: '休息', boss: 'BOSS',
  event: '事件', chest: '寶箱',
}

const ZONE_HEADERS: Record<string, Record<number, string>> = {
  star_eclipse: {
    14: '✦ 第三區：主教寢宮',
    9:  '☆ 第二區：星蝕迴廊',
    4:  '☽ 第一區：裂隙入口',
  },
  burning_throne: {
    14: '🔥 第三區：王座廳',
    9:  '🔥 第二區：熔岩走廊',
    4:  '🔥 第一區：焰獄前廳',
  },
  black_tide: {
    14: '🌊 第三區：沉海王座',
    9:  '🌊 第二區：深壓廊道',
    4:  '🌊 第一區：潮汐前廳',
  },
  ash_covenant: {
    14: '🔱 第三區：禁咒核心',
    9:  '🔱 第二區：聖約廊道',
    4:  '🔱 第一區：王陵前廳',
  },
}

const DUNGEON_TITLES: Record<string, string> = {
  star_eclipse:   '🌑 星蝕裂隙',
  burning_throne: '🔥 燃燒王座',
  black_tide:     '🌊 黑潮深淵',
  ash_covenant:   '🔱 灰燼聖約',
}

type Line = { x1: number; y1: number; x2: number; y2: number; cls: string }

interface Props {
  nodes: DungeonNode[]
  heroHp: number
  heroMaxHp: number
  dungeonId: string
  onSelectNode: (node: DungeonNode) => void
  onExit: () => void
}

function computeReachable(nodes: DungeonNode[], nodeId: string): boolean {
  const node = nodes.find(n => n.id === nodeId)
  if (!node) return false
  const cleared = nodes.filter(n => n.cleared)
  if (cleared.length === 0) return node.layer === 0
  const maxLayer = Math.max(...cleared.map(n => n.layer))
  return cleared
    .filter(n => n.layer === maxLayer)
    .some(n => n.connections.includes(nodeId))
}

export default function DungeonMapScreen({ nodes, heroHp, heroMaxHp, dungeonId, onSelectNode, onExit }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [lines, setLines] = useState<Line[]>([])
  const [gridSize, setGridSize] = useState({ w: 0, h: 0 })
  const [resizeTick, setResizeTick] = useState(0)

  // 進入地圖時開始 BGM
  useEffect(() => {
    const src = DUNGEON_BGM[dungeonId]
    if (src) playBgm(src, 0.45)
  }, [dungeonId])

  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const gr = grid.getBoundingClientRect()
    setGridSize({ w: gr.width, h: gr.height })
    const out: Line[] = []
    nodes.forEach(node => {
      const fromEl = nodeRefs.current[node.id]
      if (!fromEl) return
      const fr = fromEl.getBoundingClientRect()
      const x1 = fr.left + fr.width / 2 - gr.left
      const y1 = fr.top + fr.height / 2 - gr.top
      node.connections.forEach(tid => {
        const toEl = nodeRefs.current[tid]
        if (!toEl) return
        const tr = toEl.getBoundingClientRect()
        const x2 = tr.left + tr.width / 2 - gr.left
        const y2 = tr.top + tr.height / 2 - gr.top
        const target = nodes.find(n => n.id === tid)
        const travelled = node.cleared && target?.cleared
        const available = node.cleared && !target?.cleared && computeReachable(nodes, tid)
        const cls = travelled ? 'travelled' : available ? 'available' : 'dim'
        out.push({ x1, y1, x2, y2, cls })
      })
    })
    setLines(out)
  }, [nodes, resizeTick])

  useEffect(() => {
    const onResize = () => setResizeTick(t => t + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // 進入地圖時捲動到起點，過關後捲動到下一個可進入節點
  useEffect(() => {
    const clearedNodes = nodes.filter(n => n.cleared)
    const nextNode = clearedNodes.length === 0
      ? nodes.filter(n => n.reachable).sort((a, b) => a.layer - b.layer)[0]
      : nodes.filter(n => !n.cleared && computeReachable(nodes, n.id)).sort((a, b) => a.layer - b.layer)[0]
    const el = nextNode ? nodeRefs.current[nextNode.id] : null
    if (!el) return
    const timer = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
    return () => clearTimeout(timer)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // Layers displayed top to bottom: boss (layer 4) at top, entry (layer 0) at bottom
  const layers = [...new Set(nodes.map(n => n.layer))].sort((a, b) => b - a)

  const NODE_ICONS = getNodeIcons(dungeonId)
  const hpPct = Math.max(0, heroHp / heroMaxHp)
  const hpColor = hpPct > 0.5 ? '#40c060' : hpPct > 0.25 ? '#e0a020' : '#e04040'

  const clearedCount = nodes.filter(n => n.cleared).length
  const totalBattle = nodes.filter(n => n.type !== 'rest').length

  return (
    <div className="dungeon-map-wrap">
      <header className="dmap-header">
        <div className="dmap-header-left">
          <div className="dmap-title">{DUNGEON_TITLES[dungeonId] ?? '🌑 星蝕裂隙'}</div>
          <div className="dmap-stats">
            <span className="dmap-hp-bar-wrap">
              <span className="dmap-hp-bar" style={{ width: `${hpPct * 100}%`, background: hpColor }} />
            </span>
            <span className="dmap-hp-text" style={{ color: hpColor }}>❤️ {heroHp} / {heroMaxHp}</span>
            <span className="dmap-progress-text">⚔ {clearedCount} / {totalBattle}</span>
          </div>
        </div>
        <button className="ghost dmap-exit-btn" onClick={onExit}>放棄副本</button>
      </header>

      <div className="dmap-grid" ref={gridRef}>
        <svg
          className="dmap-svg"
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
          width={gridSize.w}
          height={gridSize.h}
        >
          {lines.map((l, i) => (
            <line
              key={i}
              x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              className={`dmap-line ${l.cls}`}
            />
          ))}
        </svg>

        {layers.map(layer => {
          const layerNodes = nodes.filter(n => n.layer === layer).sort((a, b) => a.col - b.col)
          const isLastLayer = layer === Math.max(...nodes.map(n => n.layer))
          const zoneHeader = (ZONE_HEADERS[dungeonId] ?? ZONE_HEADERS.star_eclipse)[layer]
          return (
            <div key={layer}>
            {zoneHeader && <div className="dmap-zone-header">{zoneHeader}</div>}
            <div className={`dmap-row${isLastLayer ? ' dmap-row-boss' : ''}`}>
              {layerNodes.map(node => {
                const reachable = !node.cleared && computeReachable(nodes, node.id)
                const cls = [
                  'dmap-node',
                  `dmap-node-${node.type}`,
                  node.cleared ? 'cleared' : '',
                  reachable ? 'reachable' : '',
                  !reachable && !node.cleared ? 'locked' : '',
                ].filter(Boolean).join(' ')
                return (
                  <button
                    key={node.id}
                    ref={el => { nodeRefs.current[node.id] = el }}
                    className={cls}
                    disabled={!reachable}
                    onClick={() => onSelectNode(node)}
                  >
                    <div className="dmap-node-icon">
                      {node.cleared ? '✓' : NODE_ICONS[node.type]}
                    </div>
                    <div className="dmap-node-label">{NODE_LABELS[node.type]}</div>
                  </button>
                )
              })}
            </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
