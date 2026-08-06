import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import type { MapNode, NodeType, RunState } from '../types'
import { getChapter, isChapterBossFloor, CHAPTER_NAMES, RIFT_OMEN_CHAPTER_NAMES, DEEP_SEA_CHAPTER_NAMES, ASH_KINGDOM_CHAPTER_NAMES, getBossEnemyId } from '../mapGen'
import { ENEMIES } from '../data'
import { getRelicById } from '../relics'
import { ALL_BUFF_CARDS } from '../buffCards'
import { getCurseById } from '../curses'

const NODE_ICONS: Record<NodeType, string> = {
  battle: '⚔', elite: '💀', rest: '💤', shop: '🏪', event: '❓', boss: '🔥', chest: '📦',
}

const NODE_LABELS: Record<NodeType, string> = {
  battle: '戰鬥', elite: '精英', rest: '休息', shop: '商店', event: '事件', boss: 'BOSS', chest: '寶箱',
}

const TIER_LABEL: Record<string, string> = { common: '普通', rare: '稀有', boss: 'BOSS 遺物' }
const RARITY_LABEL: Record<string, string> = { common: '普通', rare: '稀有', epic: '史詩' }

type SelectedItem = { icon: string; name: string; tag: string; tagColor: string; desc: string }
type PanelTab = 'cards' | 'relics' | 'curses'

interface Props {
  run: RunState
  onSelectNode: (node: MapNode) => void
  onExit: () => void
}

function isReachable(nodes: MapNode[], nodeId: number): boolean {
  const cleared = nodes.filter(n => n.cleared)
  if (cleared.length === 0) {
    const minFloor = Math.min(...nodes.map(n => n.floor))
    return nodes.find(n => n.id === nodeId)?.floor === minFloor
  }
  // Only use the frontier (highest cleared floor) — prevents backtracking and
  // re-opening sibling nodes from earlier floors whose connections still point forward.
  const maxClearedFloor = Math.max(...cleared.map(n => n.floor))
  const reachableIds = new Set<number>()
  cleared
    .filter(n => n.floor === maxClearedFloor)
    .forEach(n => n.connections.forEach(id => reachableIds.add(id)))
  return reachableIds.has(nodeId)
}

type Line = { x1: number; y1: number; x2: number; y2: number; cls: string }

export default function MapScreen({ run, onSelectNode, onExit }: Props) {
  const { nodes } = run
  const [selected, setSelected] = useState<SelectedItem | null>(null)
  const [showPanel, setShowPanel] = useState(false)
  const [tab, setTab] = useState<PanelTab>('cards')

  const floors = [...new Set(nodes.map(n => n.floor))].sort((a, b) => a - b)

  const gridRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Record<number, HTMLButtonElement | null>>({})
  const [lines, setLines] = useState<Line[]>([])
  const [gridSize, setGridSize] = useState({ w: 0, h: 0 })
  const [resizeTick, setResizeTick] = useState(0)

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
        const available = node.cleared && !target?.cleared && isReachable(nodes, tid)
        out.push({ x1, y1, x2, y2, cls: travelled ? 'travelled' : available ? 'available' : 'dim' })
      })
    })
    setLines(out)
  }, [nodes, resizeTick])

  useEffect(() => {
    const onResize = () => setResizeTick(t => t + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // 地圖掛載時捲動到起點或下一個可進入節點
  useEffect(() => {
    const maxClearedFloor = nodes
      .filter(n => n.cleared)
      .reduce((max, n) => Math.max(max, n.floor), 0)

    const nextNode = maxClearedFloor === 0
      ? nodes.filter(n => n.reachable).sort((a, b) => a.floor - b.floor)[0]
      : nodes.filter(n => !n.cleared && isReachable(nodes, n.id)).sort((a, b) => a.floor - b.floor)[0]

    const el = nextNode ? nodeRefs.current[nextNode.id] : null
    if (!el) return

    const timer = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
    return () => clearTimeout(timer)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const selectCard = (id: string) => {
    const card = ALL_BUFF_CARDS.find(c => c.id === id)
    if (!card) return
    const colorMap: Record<string, string> = { common: '#8090a8', rare: '#6db8ff', epic: '#d080ff' }
    setSelected({ icon: '🃏', name: card.name, tag: RARITY_LABEL[card.rarity], tagColor: colorMap[card.rarity], desc: card.desc })
  }

  const selectRelic = (id: string) => {
    const relic = getRelicById(id)
    if (!relic) return
    const colorMap: Record<string, string> = { common: '#8090a8', rare: '#6db8ff', boss: '#ffd36e' }
    setSelected({ icon: '💎', name: relic.name, tag: TIER_LABEL[relic.tier], tagColor: colorMap[relic.tier], desc: relic.desc })
  }

  const selectCurse = (id: string) => {
    const curse = getCurseById(id)
    if (!curse) return
    setSelected({ icon: '💀', name: curse.name, tag: '詛咒', tagColor: '#c080ff', desc: curse.desc })
  }

  const closePanel = () => { setShowPanel(false); setSelected(null) }

  const highestFloor = nodes.reduce((max, n) => n.cleared && n.floor > max ? n.floor : max, 0)
  const currentChapter = run.chapter ?? getChapter(Math.max(highestFloor, 1))
  const isRiftOmen   = run.campaign === 'rift_omen'
  const isDeepSea    = run.campaign === 'deep_sea'
  const isAshKingdom = run.campaign === 'ash_kingdom'
  const chapterNames = isAshKingdom ? ASH_KINGDOM_CHAPTER_NAMES : isDeepSea ? DEEP_SEA_CHAPTER_NAMES : isRiftOmen ? RIFT_OMEN_CHAPTER_NAMES : CHAPTER_NAMES
  const chapterName = chapterNames[currentChapter] ?? '冒險地圖'
  const chapterIcon = isAshKingdom ? ['🏚️', '👑', '💀'][currentChapter - 1] ?? '🔥' : isDeepSea ? ['🌊', '🏚️', '🌀'][currentChapter - 1] ?? '🌊' : isRiftOmen ? ['🌌', '🌙', '🌑'][currentChapter - 1] ?? '⚔️' : ['🌲', '❄️', '🔥'][currentChapter - 1] ?? '⚔️'

  const CHAPTER_COLORS: Record<number, string> = {
    1: 'rgba(60,140,60,.18)',
    2: 'rgba(60,120,200,.18)',
    3: 'rgba(160,30,30,.18)',
  }

  const totalItems = run.cards.length + run.relics.length + run.curses.length

  // default tab: prefer cards if any, else relics, else curses
  const openPanel = () => {
    if (run.cards.length > 0) setTab('cards')
    else if (run.relics.length > 0) setTab('relics')
    else setTab('curses')
    setSelected(null)
    setShowPanel(true)
  }

  return (
    <div
      className="map-screen"
      onClick={closePanel}
      style={{ background: CHAPTER_COLORS[currentChapter] }}
    >
      {/* ── Bag panel overlay ── */}
      {showPanel && (
        <div className="bag-overlay" onClick={closePanel}>
          <div className="bag-panel" onClick={e => e.stopPropagation()}>
            <div className="bag-panel-header">
              <span className="bag-panel-title">冒險背包</span>
              <button className="bag-panel-close" onClick={closePanel}>✕</button>
            </div>

            {/* Tabs */}
            <div className="bag-tabs">
              <button
                className={`bag-tab ${tab === 'cards' ? 'active' : ''}`}
                onClick={() => { setTab('cards'); setSelected(null) }}
              >
                🃏 增益卡
                <span className="bag-tab-count">{run.cards.length}</span>
              </button>
              <button
                className={`bag-tab ${tab === 'relics' ? 'active' : ''}`}
                onClick={() => { setTab('relics'); setSelected(null) }}
              >
                💎 遺物
                <span className="bag-tab-count">{run.relics.length}</span>
              </button>
              {run.curses.length > 0 && (
                <button
                  className={`bag-tab bag-tab-curse ${tab === 'curses' ? 'active' : ''}`}
                  onClick={() => { setTab('curses'); setSelected(null) }}
                >
                  💀 詛咒
                  <span className="bag-tab-count">{run.curses.length}</span>
                </button>
              )}
            </div>

            {/* Selected item description */}
            {selected && (
              <div className="bag-desc">
                <div className="bag-desc-top">
                  <span className="bag-desc-icon">{selected.icon}</span>
                  <span className="bag-desc-name">{selected.name}</span>
                  <span className="bag-desc-tag" style={{ borderColor: selected.tagColor + '70', color: selected.tagColor }}>
                    {selected.tag}
                  </span>
                </div>
                <p className="bag-desc-text">{selected.desc}</p>
              </div>
            )}

            {/* Item list */}
            <div className="bag-item-list">
              {tab === 'cards' && (
                run.cards.length === 0
                  ? <div className="bag-empty">尚無增益卡</div>
                  : run.cards.map(c => {
                      const colorMap: Record<string, string> = { common: '#8090a8', rare: '#6db8ff', epic: '#d080ff' }
                      const card = ALL_BUFF_CARDS.find(x => x.id === c.id)
                      const isActive = selected?.name === c.name
                      return (
                        <button
                          key={c.id}
                          className={`bag-item bag-item-card rarity-${c.rarity} ${isActive ? 'bag-item-active' : ''}`}
                          onClick={() => isActive ? setSelected(null) : selectCard(c.id)}
                        >
                          <span className="bag-item-icon">🃏</span>
                          <div className="bag-item-info">
                            <span className="bag-item-name" style={{ color: colorMap[c.rarity] }}>{c.name}</span>
                            <span className="bag-item-sub">{RARITY_LABEL[c.rarity]}</span>
                          </div>
                          {card && <span className="bag-item-arrow">›</span>}
                        </button>
                      )
                    })
              )}

              {tab === 'relics' && (
                run.relics.length === 0
                  ? <div className="bag-empty">尚無遺物</div>
                  : run.relics.map(id => {
                      const relic = getRelicById(id)
                      const colorMap: Record<string, string> = { common: '#8090a8', rare: '#6db8ff', boss: '#ffd36e' }
                      const tier = relic?.tier ?? 'common'
                      const isActive = selected?.name === relic?.name
                      return (
                        <button
                          key={id}
                          className={`bag-item ${isActive ? 'bag-item-active' : ''}`}
                          onClick={() => isActive ? setSelected(null) : selectRelic(id)}
                        >
                          <span className="bag-item-icon">💎</span>
                          <div className="bag-item-info">
                            <span className="bag-item-name" style={{ color: colorMap[tier] }}>{relic?.name ?? id}</span>
                            <span className="bag-item-sub">{TIER_LABEL[tier]}</span>
                          </div>
                          <span className="bag-item-arrow">›</span>
                        </button>
                      )
                    })
              )}

              {tab === 'curses' && (
                run.curses.length === 0
                  ? <div className="bag-empty">尚無詛咒</div>
                  : run.curses.map(id => {
                      const curse = getCurseById(id)
                      const isActive = selected?.name === curse?.name
                      return (
                        <button
                          key={id}
                          className={`bag-item bag-item-curse ${isActive ? 'bag-item-active' : ''}`}
                          onClick={() => isActive ? setSelected(null) : selectCurse(id)}
                        >
                          <span className="bag-item-icon">💀</span>
                          <div className="bag-item-info">
                            <span className="bag-item-name" style={{ color: '#c79bff' }}>{curse?.name ?? id}</span>
                            <span className="bag-item-sub">詛咒</span>
                          </div>
                          <span className="bag-item-arrow">›</span>
                        </button>
                      )
                    })
              )}
            </div>
          </div>
        </div>
      )}

      <div className="map-header">
        <div className="map-header-left">
          <button className="ghost map-back-btn" onClick={e => { e.stopPropagation(); onExit() }}>← 主選單</button>
          <div className="map-header-title">
            <div className="map-chapter-label">{chapterIcon} {chapterName}</div>
            <h2 className="map-title-h2">冒險地圖</h2>
          </div>
        </div>
        <div className="map-header-right">
          <div className="run-stats">
            <span>❤️ {run.party[run.activePartyIdx].hp}/{run.party[run.activePartyIdx].maxHp}</span>
            <span>💰 {run.gold}</span>
          </div>
          <button
            className={`bag-btn ${totalItems === 0 ? 'bag-btn-empty' : ''}`}
            onClick={e => { e.stopPropagation(); totalItems > 0 && openPanel() }}
            title="查看增益卡與遺物"
          >
            🎒<span className="bag-btn-label"> 背包</span>
            {run.cards.length > 0 && <span className="bag-btn-chip bag-btn-card">🃏{run.cards.length}</span>}
            {run.relics.length > 0 && <span className="bag-btn-chip bag-btn-relic">💎{run.relics.length}</span>}
            {run.curses.length > 0 && <span className="bag-btn-chip bag-btn-curse">💀{run.curses.length}</span>}
          </button>
        </div>
      </div>

      {/* Map grid with connection lines */}
      <div className="map-grid" ref={gridRef}>
        <svg className="map-lines" width={gridSize.w} height={gridSize.h}>
          {lines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} className={`map-line ${l.cls}`} />
          ))}
        </svg>

        {floors.map(floor => {
          const ch = getChapter(floor)
          const isBossRow = isChapterBossFloor(floor)
          const isFirstOfChapter = !isBossRow && floor === floors[0]
          return (
          <div key={floor} className={`map-floor chapter-${ch}`}>
            {isFirstOfChapter && (
              <div className="chapter-divider">{isRiftOmen ? (['🌌', '🌙', '🌑'][ch - 1] ?? '⚔️') : (['🌲', '❄️', '🔥'][ch - 1] ?? '⚔️')} {chapterNames[ch]}</div>
            )}
            <div className="map-layer">
              {nodes
                .filter(n => n.floor === floor)
                .sort((a, b) => a.col - b.col)
                .map(node => {
                  const reachable = isReachable(nodes, node.id)
                  return (
                    <button
                      key={node.id}
                      ref={el => { nodeRefs.current[node.id] = el }}
                      className={`map-node node-${node.type} ${node.cleared ? 'cleared' : ''} ${reachable && !node.cleared ? 'reachable' : ''} ${!reachable && !node.cleared ? 'locked' : ''}`}
                      onClick={() => reachable && !node.cleared && onSelectNode(node)}
                      disabled={!reachable || node.cleared}
                      title={NODE_LABELS[node.type]}
                    >
                      <span className="node-icon">{NODE_ICONS[node.type]}</span>
                      <span className="node-label">
                        {node.type === 'boss'
                          ? (ENEMIES.find(e => e.id === getBossEnemyId(getChapter(node.floor), run.campaign))?.name ?? 'BOSS')
                          : NODE_LABELS[node.type]}
                      </span>
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
