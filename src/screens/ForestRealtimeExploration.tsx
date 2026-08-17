import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { MetaState } from '../types'
import { HEROES, getHeroSprite } from '../data'
import SpriteAnimator from '../components/SpriteAnimator'
import { getStageProgress } from '../campaign/campaignProgress'
import {
  FOREST_REALTIME_STAGES_1_TO_5, getForestRealtimeStage, isCombatZone,
  type ForestRealtimeStage, type Rect, type ExplorationZone,
} from '../exploration/forestRealtimeConfig.1to5'

type Point = { x: number; y: number }
type InputVector = { x: number; y: number }

interface Props {
  meta: MetaState
  heroId: string
  stageId: string
  /** 是不是有一場 Arena 戰鬥正疊在這個畫面上（原地觸發，不整頁導航）。
   * true 時要停止移動輸入/鏡頭更新，避免角色在戰鬥疊層底下偷偷移動。 */
  inBattle: boolean
  /** 靠近戰鬥點時呼叫；外層決定要不要疊上 Arena，這裡不知道戰鬥怎麼渲染。 */
  onStartBattle: () => void
  /** 走到出口且這關已通關時呼叫；nextStageId 有值代表接續下一關的探索地圖，
   * 沒有值代表這是 1-5 出口，交給呼叫端導回關卡地圖／章節結算。 */
  onExitStage: (request: { stageId: string; nextStageId?: string }) => void
  onBack: () => void
}

const VIEWPORT = { width: 360, height: 640 }
const HERO_RADIUS = 28
const MOVE_SPEED = 260
const CAMERA_LERP = 0.16

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function zoneCenter(zone: Rect): Point {
  return { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 }
}

function circleHitsRect(point: Point, radius: number, rect: Rect) {
  const closestX = clamp(point.x, rect.x, rect.x + rect.width)
  const closestY = clamp(point.y, rect.y, rect.y + rect.height)
  return distance(point, { x: closestX, y: closestY }) < radius
}

function collides(point: Point, stage: ForestRealtimeStage) {
  return stage.colliders.some(rect => circleHitsRect(point, HERO_RADIUS, rect))
}

const ZONE_LABEL: Record<ExplorationZone['kind'], string> = {
  skirmish: '清場戰鬥', totem: '圖騰戰鬥', shaman: '薩滿戰鬥', boss: 'BOSS 戰鬥', supply: '補給', exit: '出口',
}

export default function ForestRealtimeExploration({ meta, heroId, stageId, inBattle, onStartBattle, onExitStage, onBack }: Props) {
  const stage = useMemo(() => getForestRealtimeStage(stageId) ?? FOREST_REALTIME_STAGES_1_TO_5[0], [stageId])
  const hero = useMemo(() => HEROES.find(h => h.id === heroId) ?? HEROES[0], [heroId])
  const heroSprite = useMemo(() => getHeroSprite(hero, meta.heroProgress[hero.id]?.stars ?? 0), [hero, meta.heroProgress])
  const heroScale = 52 / heroSprite.frameHeight

  const stageProg = getStageProgress(meta, stageId)
  const stageCleared = stageProg.cleared

  const [heroPos, setHero] = useState<Point>(stage.spawn)
  const [camera, setCamera] = useState<Point>({ x: stage.spawn.x - VIEWPORT.width / 2, y: stage.spawn.y - VIEWPORT.height / 2 })
  const [visitedSupply, setVisitedSupply] = useState<Set<string>>(new Set())
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)
  const [joystick, setJoystick] = useState<InputVector>({ x: 0, y: 0 })
  const keys = useRef(new Set<string>())
  const joystickOrigin = useRef<Point | null>(null)
  const lastTime = useRef<number | null>(null)
  // joystick state 只用來畫搖桿旋鈕視覺；移動迴圈讀這顆 ref（拖曳中每次
  // pointermove 都會變的是 state，如果 tick 的 effect 依賴 joystick state，
  // 每次拖曳都會把 rAF 迴圈整個拆掉重排，導致排進去的 frame 永遠來不及真的
  // 執行——這是搖桿完全不動的實際原因，鍵盤不受影響是因為鍵盤輸入只讀
  // keys ref，不會觸發這個 effect 重跑。
  const joystickRef = useRef<InputVector>({ x: 0, y: 0 })

  // 換關（進到不同 stageId）時重置角色位置/鏡頭/補給狀態，不繼承上一關的座標。
  useEffect(() => {
    setHero(stage.spawn)
    setCamera({ x: stage.spawn.x - VIEWPORT.width / 2, y: stage.spawn.y - VIEWPORT.height / 2 })
    setVisitedSupply(new Set())
    setActiveZoneId(null)
  }, [stage])

  useEffect(() => {
    const down = (event: KeyboardEvent) => keys.current.add(event.key.toLowerCase())
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  // 戰鬥疊層開啟時（inBattle）整個移動迴圈直接不跑——角色留在觸發戰鬥當下
  // 的位置，等疊層收掉後從原地繼續，不是暫停後還會偷偷位移。
  useEffect(() => {
    if (inBattle) return
    let frame = 0
    const tick = (time: number) => {
      const previous = lastTime.current ?? time
      const delta = Math.min((time - previous) / 1000, 0.05)
      lastTime.current = time
      const keyboard: InputVector = {
        x: Number(keys.current.has('d') || keys.current.has('arrowright')) - Number(keys.current.has('a') || keys.current.has('arrowleft')),
        y: Number(keys.current.has('s') || keys.current.has('arrowdown')) - Number(keys.current.has('w') || keys.current.has('arrowup')),
      }
      const input = keyboard.x || keyboard.y ? keyboard : joystickRef.current
      const magnitude = Math.hypot(input.x, input.y) || 1
      const velocity = { x: (input.x / magnitude) * MOVE_SPEED * delta, y: (input.y / magnitude) * MOVE_SPEED * delta }
      setHero(current => {
        const nextX = { x: clamp(current.x + velocity.x, HERO_RADIUS, stage.world.width - HERO_RADIUS), y: current.y }
        const afterX = collides(nextX, stage) ? current : nextX
        const nextY = { x: afterX.x, y: clamp(afterX.y + velocity.y, HERO_RADIUS, stage.world.height - HERO_RADIUS) }
        return collides(nextY, stage) ? afterX : nextY
      })
      frame = requestAnimationFrame(tick)
    }
    lastTime.current = null
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [stage, inBattle])

  useEffect(() => {
    if (inBattle) return
    const zone = stage.zones.find(candidate => distance(heroPos, zoneCenter(candidate)) <= candidate.triggerRadius) ?? null
    setActiveZoneId(zone?.id ?? null)
    setCamera(current => ({
      x: current.x + (clamp(heroPos.x - VIEWPORT.width / 2, 0, stage.world.width - VIEWPORT.width) - current.x) * CAMERA_LERP,
      y: current.y + (clamp(heroPos.y - VIEWPORT.height / 2, 0, stage.world.height - VIEWPORT.height) - current.y) * CAMERA_LERP,
    }))
  }, [heroPos, stage, inBattle])

  const activeZone = stage.zones.find(zone => zone.id === activeZoneId) ?? null
  const stageIdx = FOREST_REALTIME_STAGES_1_TO_5.findIndex(candidate => candidate.stageId === stage.stageId)
  const nextStage = FOREST_REALTIME_STAGES_1_TO_5[stageIdx + 1]

  const interact = (zone: ExplorationZone) => {
    if (isCombatZone(zone.kind)) {
      onStartBattle()
      return
    }
    if (zone.kind === 'exit') {
      if (!stageCleared) return
      onExitStage({ stageId: stage.stageId, nextStageId: nextStage?.stageId })
      return
    }
    // supply：純敘事互動，只有本地一次性狀態，沒有機制後果。
    setVisitedSupply(current => new Set(current).add(zone.id))
  }

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickOrigin.current) return
    const dx = clientX - joystickOrigin.current.x
    const dy = clientY - joystickOrigin.current.y
    const length = Math.min(58, Math.hypot(dx, dy)) || 1
    const next = { x: (dx / length) * Math.min(1, Math.abs(dx) / 58), y: (dy / length) * Math.min(1, Math.abs(dy) / 58) }
    joystickRef.current = next
    setJoystick(next)
  }

  const interactionLabel = (zone: ExplorationZone): string => {
    if (isCombatZone(zone.kind)) return stageCleared ? '再次挑戰' : `進入${ZONE_LABEL[zone.kind]}`
    if (zone.kind === 'exit') return stageCleared ? (nextStage ? '前往下一關' : '完成本章') : '尚未通關，無法通過'
    return visitedSupply.has(zone.id) ? '已補給' : '汲取補給'
  }

  return (
    <main className="forest-realtime-shell" style={{ '--world-w': `${stage.world.width}px`, '--world-h': `${stage.world.height}px` } as CSSProperties}>
      <header className="forest-realtime-hud">
        <button type="button" onClick={onBack}>← 關卡圖</button>
        <div><span>ASTERVOW · FOREST RUINS</span><strong>{stage.name}</strong></div>
        <span>{stageCleared ? '已通關' : '探索中'}</span>
      </header>
      <section className="forest-realtime-viewport" aria-label={`${stage.name}連續探索地圖`}>
        <div className="forest-realtime-world" style={{ width: stage.world.width, height: stage.world.height, transform: `translate(${-camera.x}px, ${-camera.y}px)`, backgroundColor: stage.backgroundColor }}>
          <div className="forest-realtime-path" />
          {stage.colliders.map((rect, index) => <div key={`collider-${index}`} className="forest-realtime-collider" style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }} />)}
          {stage.zones.map(zone => {
            const done = isCombatZone(zone.kind) ? stageCleared : zone.kind === 'supply' ? visitedSupply.has(zone.id) : false
            return (
              <div key={zone.id} className={`forest-realtime-zone zone-${zone.kind}${done ? ' is-complete' : ''}`}
                style={{ left: zone.x, top: zone.y, width: zone.width, height: zone.height }} aria-label={zone.label}>
                {zone.label}
              </div>
            )
          })}
          <div className="forest-realtime-hero" style={{ left: heroPos.x - HERO_RADIUS, top: heroPos.y - HERO_RADIUS }}>
            <SpriteAnimator sprite={heroSprite} state="idle" scale={heroScale} idleFrame={0} />
          </div>
        </div>
        {!inBattle && activeZone && (
          <div className="forest-realtime-interaction">
            <strong>{activeZone.label}</strong>
            <button type="button" disabled={activeZone.kind === 'exit' && !stageCleared} onClick={() => interact(activeZone)}>
              {interactionLabel(activeZone)}
            </button>
          </div>
        )}
        {!inBattle && <div className="forest-realtime-joystick"
          onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); joystickOrigin.current = { x: event.clientX, y: event.clientY }; updateJoystick(event.clientX, event.clientY) }}
          onPointerMove={event => updateJoystick(event.clientX, event.clientY)}
          onPointerUp={() => { joystickOrigin.current = null; joystickRef.current = { x: 0, y: 0 }; setJoystick({ x: 0, y: 0 }) }}
          onPointerCancel={() => { joystickOrigin.current = null; joystickRef.current = { x: 0, y: 0 }; setJoystick({ x: 0, y: 0 }) }}
        >
          <i style={{ transform: `translate(${joystick.x * 24}px, ${joystick.y * 24}px)` }} />
        </div>}
      </section>
      <footer className="forest-realtime-footer">WASD／方向鍵或虛擬搖桿移動 · 靠近事件區後互動 · 地圖鏡頭跟隨英雄</footer>
    </main>
  )
}
