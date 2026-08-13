import { useEffect, useMemo, useRef, useState } from 'react'
import { HEROES } from '../data'
import type { TravelSegment, TravelPathNode, TravelLayer } from '../campaign/chapterTravelTypes'
import SpriteAnimator from './SpriteAnimator'

interface Props {
  segments: TravelSegment[]
  heroId: string
  /** 走完最後一段、或按下略過都會呼叫這個——跟指令要求一致，兩者呼叫同一個回呼。 */
  onFinish: () => void
}

/** 地面代稱 → 暫代 CSS 漸層。收斂成 6 種地面模組重複使用（見 docs/campaign-travel-system.md）。 */
const GROUND_STYLE: Record<string, string> = {
  dirt_path: 'linear-gradient(180deg, rgba(90,74,52,0) 0%, rgba(90,74,52,.55) 35%, rgba(66,52,34,.85) 100%)',
  stone_path: 'linear-gradient(180deg, rgba(120,120,128,0) 0%, rgba(110,112,120,.5) 35%, rgba(74,76,84,.85) 100%)',
  wood_bridge: 'linear-gradient(180deg, rgba(94,72,42,0) 0%, rgba(94,72,42,.5) 35%, rgba(58,44,26,.85) 100%)',
  stone_stairs: 'linear-gradient(180deg, rgba(100,98,104,0) 0%, rgba(90,88,96,.55) 35%, rgba(56,54,60,.88) 100%)',
  ritual_platform: 'linear-gradient(180deg, rgba(96,92,88,0) 0%, rgba(96,92,88,.5) 35%, rgba(60,56,52,.88) 100%)',
  scorched_rock: 'linear-gradient(180deg, rgba(60,32,28,0) 0%, rgba(60,32,28,.55) 35%, rgba(32,16,14,.9) 100%)',
}
const DEFAULT_GROUND_STYLE = 'linear-gradient(180deg, rgba(80,80,80,0) 0%, rgba(80,80,80,.5) 35%, rgba(50,50,50,.85) 100%)'

// 注意：只挑舊版 Unicode（emoji 13.0/2020 之前）的符號，避免在字型較舊的
// 環境（例如 Windows 沒更新 Segoe UI Emoji）變成空心方框豆腐字——實測
// 🪵/🪨 這兩個 2020 年才加入的新 emoji 在本機瀏覽器就直接不顯示。
// 地標（midground）收斂成 6 類、前景遮罩收斂成 10 類重複使用。
const DECOR_GLYPH: Record<string, string> = {
  // 地標（6 類）
  wood_post: '🌲',
  stone_pillar: '🗿',
  palisade: '🚧',
  brazier: '🔥',
  ruin_gate: '⛩️',
  broken_altar: '🏛️',
  // 前景遮罩（10 類）
  fallen_leaves: '🍂',
  thorn_cluster: '🌵',
  fallen_rock: '⛰️',
  moss_tuft: '🌿',
  mushroom_cluster: '🍄',
  root_tangle: '🥀',
  mist_wisp: '💨',
  ember_spark: '✨',
  banner_flag: '🚩',
  crystal_shard: '💎',
}
const DEFAULT_DECOR_GLYPH = '❔'

const AMBIENCE_LABEL: Record<TravelSegment['ambience'], string> = {
  leaves: '落葉', embers: '餘燼', miasma: '瘴氣', 'root-glow': '根脈光', 'heat-haze': '熱霧',
}
const AMBIENCE_SLOTS = [
  { left: 8, top: 18, delay: 0 }, { left: 24, top: 55, delay: 0.8 }, { left: 42, top: 30, delay: 1.6 },
  { left: 60, top: 62, delay: 0.4 }, { left: 78, top: 22, delay: 1.2 }, { left: 90, top: 48, delay: 2.0 },
]

function AmbienceLayer({ ambience }: { ambience: TravelSegment['ambience'] }) {
  return (
    <div className="ctp-layer ctp-ambience" aria-hidden="true" title={AMBIENCE_LABEL[ambience]}>
      {AMBIENCE_SLOTS.map((slot, i) => (
        <span
          key={i}
          className={`ctp-amb-particle ctp-amb-${ambience}`}
          style={{ left: `${slot.left}%`, top: `${slot.top}%`, animationDelay: `${slot.delay}s` }}
        />
      ))}
    </div>
  )
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

/** 沿 pathNodes 插值：t 為 0..1，回傳當下的 x/footY/scale。 */
function sampleNodes(nodes: TravelPathNode[], t: number): TravelPathNode {
  if (nodes.length === 1) return nodes[0]
  const clamped = Math.max(0, Math.min(1, t))
  const segCount = nodes.length - 1
  const segF = clamped * segCount
  const idx = Math.min(segCount - 1, Math.floor(segF))
  const localT = segF - idx
  const a = nodes[idx]
  const b = nodes[idx + 1]
  return { x: lerp(a.x, b.x, localT), footY: lerp(a.footY, b.footY, localT), scale: lerp(a.scale, b.scale, localT) }
}

const SEGMENT_DURATION_SEC = (nodeCount: number) => Math.min(2.4, Math.max(1.4, 0.35 * nodeCount))
const CHAR_SCALE_BASE = 0.95
/** 角色行走時，各圖層依 parallax 係數位移的最大像素幅度（ground=1.0 的圖層位移永遠是 0）。 */
const PARALLAX_PAN_PX = 50

function LayerView({ layer, setRef }: { layer: TravelLayer; setRef: (el: HTMLDivElement | null) => void }) {
  if (layer.kind === 'backdrop') {
    return <div ref={setRef} className="ctp-layer ctp-backdrop" style={{ backgroundImage: `url(${layer.asset})` }} />
  }
  if (layer.kind === 'ground') {
    return <div ref={setRef} className="ctp-layer ctp-ground" style={{ background: GROUND_STYLE[layer.className ?? ''] ?? DEFAULT_GROUND_STYLE }} />
  }
  // midground / foreground：單一裝飾圖示，置中於自己的圖層 div，位置由外層 wrapper 決定。
  const isFg = layer.kind === 'foreground'
  return (
    <div ref={setRef} className={`ctp-layer ${isFg ? 'ctp-foreground-item' : 'ctp-midground-item'}`}>
      <span className="ctp-decor-glyph" style={{ fontSize: isFg ? 44 : 30 }} title={layer.className}>
        {DECOR_GLYPH[layer.className ?? ''] ?? DEFAULT_DECOR_GLYPH}
      </span>
    </div>
  )
}

export default function CampaignTravelPreview({ segments, heroId, onFinish }: Props) {
  const hero = useMemo(() => HEROES.find(h => h.id === heroId), [heroId])
  const [segIndex, setSegIndex] = useState(0)
  const [arrived, setArrived] = useState(false)
  const reducedMotion = useMemo(
    () => (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) ?? false,
    [],
  )

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const shadowRef = useRef<HTMLDivElement | null>(null)
  const layerElsRef = useRef<Map<string, HTMLDivElement>>(new Map())
  const rafRef = useRef<number | null>(null)

  const segment = segments[segIndex]

  // 同一個 kind 的圖層要平均分布在自己的橫向帶狀區域裡，事先算好每個 layer id 的 left%。
  const decorPositions = useMemo(() => {
    if (!segment) return new Map<string, number>()
    const byKind: Record<string, TravelLayer[]> = { midground: [], foreground: [] }
    for (const l of segment.layers) { if (l.kind === 'midground' || l.kind === 'foreground') byKind[l.kind].push(l) }
    const map = new Map<string, number>()
    for (const kind of ['midground', 'foreground'] as const) {
      const list = byKind[kind]
      list.forEach((l, i) => map.set(l.id, ((i + 0.5) / list.length) * 100))
    }
    return map
  }, [segment])

  const finish = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    onFinish()
  }

  const advanceOrFinish = () => {
    if (segIndex < segments.length - 1) {
      setSegIndex(i => i + 1)
      setArrived(false)
    } else {
      setArrived(true)
      window.setTimeout(finish, 650)
    }
  }

  useEffect(() => {
    if (!segment) return
    const nodes = segment.pathNodes

    if (reducedMotion) {
      const last = nodes[nodes.length - 1]
      applyFrame(last, 0, 0.5)
      const fadeRaf = requestAnimationFrame(() => applyFrame(last, 0, 1))
      const t = window.setTimeout(advanceOrFinish, 500)
      return () => { window.clearTimeout(t); cancelAnimationFrame(fadeRaf) }
    }

    applyFrame(nodes[0], 0, 1)
    const durationMs = SEGMENT_DURATION_SEC(nodes.length) * 1000
    const startedAt = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startedAt
      const t = Math.min(1, elapsed / durationMs)
      const bob = Math.sin(t * Math.PI * 6) * 2.2 * (1 - t < 0.04 ? 0 : 1)
      const pose = sampleNodes(nodes, t)
      applyFrame(pose, t, 1, bob)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
        advanceOrFinish()
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segIndex, segments])

  function applyFrame(pose: TravelPathNode, walkT: number, opacity: number, bobPx = 0) {
    const wrap = wrapRef.current, anchor = anchorRef.current, shadow = shadowRef.current
    if (!wrap || !anchor) return
    wrap.style.left = `${pose.x * 100}%`
    wrap.style.top = `${pose.footY * 100}%`
    wrap.style.zIndex = String(20 + Math.round(pose.footY * 60))
    wrap.style.opacity = String(opacity)
    const s = CHAR_SCALE_BASE * pose.scale
    anchor.style.transform = `translate(-50%, calc(-100% + ${bobPx}px)) scale(${s})`
    if (shadow) shadow.style.transform = `translate(-50%, -50%) scale(${pose.scale})`

    if (segment) {
      const camPan = (walkT - 0.5) * PARALLAX_PAN_PX
      for (const layer of segment.layers) {
        const el = layerElsRef.current.get(layer.id)
        if (!el) continue
        const shift = camPan * (layer.parallax - 1)
        el.style.setProperty('--ctp-pan', `${shift}px`)
      }
    }
  }

  if (!segment || !hero) return null

  const midgroundLayers = segment.layers.filter(l => l.kind === 'midground')
  const foregroundLayers = segment.layers.filter(l => l.kind === 'foreground')
  const backdropLayer = segment.layers.find(l => l.kind === 'backdrop')
  const groundLayer = segment.layers.find(l => l.kind === 'ground')

  return (
    <div className="ctp-overlay" role="dialog" aria-label={`前往 ${segment.title}`}>
      <div className="ctp-scene">
        {backdropLayer && (
          <LayerView layer={backdropLayer} setRef={el => { if (el) layerElsRef.current.set(backdropLayer.id, el); else layerElsRef.current.delete(backdropLayer.id) }} />
        )}

        {midgroundLayers.map(l => (
          <div key={l.id} className="ctp-decor-slot ctp-decor-slot-mg" style={{ left: `${decorPositions.get(l.id) ?? 50}%` }}>
            <LayerView layer={l} setRef={el => { if (el) layerElsRef.current.set(l.id, el); else layerElsRef.current.delete(l.id) }} />
          </div>
        ))}

        {groundLayer && (
          <LayerView layer={groundLayer} setRef={el => { if (el) layerElsRef.current.set(groundLayer.id, el); else layerElsRef.current.delete(groundLayer.id) }} />
        )}

        <AmbienceLayer ambience={segment.ambience} />

        <div ref={wrapRef} className="ctp-char-wrap">
          <div ref={shadowRef} className="ctp-char-shadow" />
          <div ref={anchorRef} className="ctp-char-anchor">
            <SpriteAnimator sprite={hero.sprite} state="idle" scale={1} />
          </div>
        </div>

        {foregroundLayers.map(l => (
          <div key={l.id} className="ctp-decor-slot ctp-decor-slot-fg" style={{ left: `${decorPositions.get(l.id) ?? 50}%` }}>
            <LayerView layer={l} setRef={el => { if (el) layerElsRef.current.set(l.id, el); else layerElsRef.current.delete(l.id) }} />
          </div>
        ))}

        <div className={`ctp-title-card${arrived ? ' arrived' : ''}`}>
          <div className="ctp-title-text">{segment.title}</div>
        </div>

        {segments.length > 1 && (
          <div className="ctp-segment-dots">
            {segments.map((s, i) => (
              <span key={s.id} className={`ctp-segment-dot${i === segIndex ? ' active' : i < segIndex ? ' done' : ''}`} />
            ))}
          </div>
        )}

        <button className="ghost ctp-skip-btn" onClick={finish}>略過 ▶</button>
      </div>
    </div>
  )
}
