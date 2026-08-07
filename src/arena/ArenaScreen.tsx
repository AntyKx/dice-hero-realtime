import { useEffect, useRef, useState } from 'react'
import { ArenaGame, type ArenaConfig, type ArenaHudState } from './ArenaGame'
import DiceUpgradeOverlay from './DiceUpgradeOverlay'
import RelicLootOverlay from './RelicLootOverlay'
import type { ArenaCard } from './cards'
import type { ArenaRelic } from './relics'
import type { ArenaZoneType } from './dungeonZones'

interface Props {
  config: ArenaConfig
  onExit: () => void
}

const INITIAL_HUD: ArenaHudState = {
  hp: 0, maxHp: 0, xp: 0, xpToNext: 1, level: 1, elapsed: 0, fps: 0,
  enemyCount: 0, bossState: 'none', bossHp: 0, bossMaxHp: 0,
  killCount: 0, gameOver: false,
  zoneType: 'battle', zoneIndex: 1, zoneCount: 7,
  ultimateCharge: 0, ultimateMax: 100, bonusGold: 0, runComplete: false,
}

const ZONE_LABEL: Record<ArenaZoneType, string> = {
  battle: '戰鬥', elite: '菁英', rest: '補給', card: '祝福', hidden: '秘境', boss: 'BOSS',
}

const DPAD_RADIUS = 30 // px，搖桿鈕可拖曳的最大半徑（pad半徑52 - 鈕半徑24 再留一點邊界，要跟 CSS 的 .arena-dpad/.arena-dpad-knob 尺寸對應）

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ArenaScreen({ config, onExit }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<ArenaGame | null>(null)
  const knobRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ active: boolean; centerX: number; centerY: number }>({ active: false, centerX: 0, centerY: 0 })
  const [hud, setHud] = useState<ArenaHudState>(INITIAL_HUD)
  const [levelUpOpen, setLevelUpOpen] = useState(false)
  const [bossLootChoices, setBossLootChoices] = useState<ArenaRelic[] | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const game = new ArenaGame(config, setHud, () => setLevelUpOpen(true), choices => setBossLootChoices(choices))
    gameRef.current = game
    game.init(el)
    ;(window as unknown as { __arena?: ArenaGame }).__arena = game
    return () => { gameRef.current = null; game.destroy() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCardChosen = (card: ArenaCard) => {
    gameRef.current?.applyCard(card)
    setLevelUpOpen(false)
  }

  const handleRelicChosen = (relic: ArenaRelic) => {
    gameRef.current?.applyRelic(relic)
    setBossLootChoices(null)
  }

  // 類比搖桿：單指拖曳，方向/距離連續變化，天然支援 8 方向以上（不用同時按兩顆鍵）
  const updateKnob = (dx: number, dy: number) => {
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`
    gameRef.current?.setMoveDir(dx / DPAD_RADIUS, dy / DPAD_RADIUS)
  }

  const handlePadPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    dragRef.current = { active: true, centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2 }
    e.currentTarget.setPointerCapture(e.pointerId)
    handlePadPointerMove(e)
  }

  const handlePadPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return
    let dx = e.clientX - dragRef.current.centerX
    let dy = e.clientY - dragRef.current.centerY
    const dist = Math.hypot(dx, dy)
    if (dist > DPAD_RADIUS) { dx = (dx / dist) * DPAD_RADIUS; dy = (dy / dist) * DPAD_RADIUS }
    updateKnob(dx, dy)
  }

  const handlePadRelease = () => {
    dragRef.current.active = false
    updateKnob(0, 0)
  }

  const xpPct = hud.xpToNext > 0 ? Math.max(0, Math.min(100, (hud.xp / hud.xpToNext) * 100)) : 0
  const hpPct = hud.maxHp > 0 ? Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100)) : 0
  const bossPct = hud.bossMaxHp > 0 ? Math.max(0, Math.min(100, (hud.bossHp / hud.bossMaxHp) * 100)) : 0
  const ultPct = hud.ultimateMax > 0 ? Math.max(0, Math.min(100, (hud.ultimateCharge / hud.ultimateMax) * 100)) : 0
  const ultReady = hud.ultimateCharge >= hud.ultimateMax

  return (
    <div className="arena-screen">
      <div className="arena-canvas-wrap" ref={containerRef} />

      {/* HUD 疊層：純 React，只讀 ArenaGame 節流丟出來的狀態，不碰 canvas 內部 */}
      <div className="arena-hud">
        <div className="arena-hud-top">
          <div className="arena-timer">{formatTime(hud.elapsed)}</div>
        </div>

        <div className="arena-zone-badge">
          {ZONE_LABEL[hud.zoneType]}　{hud.zoneIndex} / {hud.zoneCount}
        </div>

        {hud.bossState === 'alive' && (
          <div className="arena-boss-bar">
            <div className="arena-boss-fill" style={{ width: `${bossPct}%` }} />
            <span className="arena-boss-text">巨龍　{hud.bossHp} / {hud.bossMaxHp}</span>
          </div>
        )}
        {hud.bossState === 'defeated' && (
          <div className="arena-boss-defeated">👑 Boss 擊敗！</div>
        )}

        <div className="arena-hud-bottom">
          <div className="arena-xp-bar">
            <div className="arena-xp-fill" style={{ width: `${xpPct}%` }} />
          </div>
        </div>
        <div className="arena-fps">FPS {hud.fps} ｜ 敵 {hud.enemyCount}</div>
        {!hud.gameOver && !hud.runComplete && <button className="arena-exit-btn" onClick={onExit}>✕ 返回</button>}

        {/* ── 左下：類比搖桿（單指拖曳，取代拖曳移動/舊的方向鍵按鈕） ── */}
        <div
          className="arena-dpad"
          onPointerDown={handlePadPointerDown}
          onPointerMove={handlePadPointerMove}
          onPointerUp={handlePadRelease}
          onPointerCancel={handlePadRelease}
          onPointerLeave={handlePadRelease}
        >
          <span className="arena-dpad-arrow arena-dpad-arrow-up">▲</span>
          <span className="arena-dpad-arrow arena-dpad-arrow-down">▼</span>
          <span className="arena-dpad-arrow arena-dpad-arrow-left">◀</span>
          <span className="arena-dpad-arrow arena-dpad-arrow-right">▶</span>
          <div className="arena-dpad-knob" ref={knobRef} />
        </div>

        {/* ── 右下：頭像+HP+必殺技能量條，仿主流手遊 HUD 排版 ── */}
        <div className="arena-ultimate-cluster">
          <div className="arena-ultimate-info">
            <div className="arena-portrait-wrap">
              <img className="arena-portrait" src={`/assets/frames/heroes/${config.heroId}/idle_0.png`} alt={config.heroName} />
              <div className="arena-level-badge">Lv.{hud.level}</div>
            </div>
            <div className="arena-ultimate-bars">
              <div className="arena-mini-hp-bar"><div className="arena-mini-hp-fill" style={{ width: `${hpPct}%` }} /></div>
              <div className="arena-ultimate-bar"><div className="arena-ultimate-fill" style={{ width: `${ultPct}%` }} /></div>
            </div>
          </div>
          <button
            className={`arena-ultimate-btn${ultReady ? ' ready' : ''}`}
            disabled={!ultReady}
            onClick={() => gameRef.current?.tryActivateUltimate()}
          >
            必殺技
          </button>
        </div>
      </div>

      {levelUpOpen && !hud.gameOver && <DiceUpgradeOverlay onComplete={handleCardChosen} />}
      {bossLootChoices && !hud.gameOver && <RelicLootOverlay choices={bossLootChoices} onComplete={handleRelicChosen} />}

      {hud.gameOver && (
        <div className="arena-gameover-overlay">
          <div className="arena-gameover-title">陣亡</div>
          <div className="arena-gameover-stats">
            <div className="arena-gameover-row"><span>存活時間</span><strong>{formatTime(hud.elapsed)}</strong></div>
            <div className="arena-gameover-row"><span>等級</span><strong>Lv.{hud.level}</strong></div>
            <div className="arena-gameover-row"><span>擊殺數</span><strong>{hud.killCount}</strong></div>
            {hud.bossState === 'defeated' && <div className="arena-gameover-boss">👑 擊敗了 Boss</div>}
          </div>
          <button className="arena-gameover-btn" onClick={onExit}>返回主選單</button>
        </div>
      )}

      {hud.runComplete && !hud.gameOver && (
        <div className="arena-gameover-overlay">
          <div className="arena-gameover-title arena-runcomplete-title">關卡完成！</div>
          <div className="arena-gameover-stats">
            <div className="arena-gameover-row"><span>存活時間</span><strong>{formatTime(hud.elapsed)}</strong></div>
            <div className="arena-gameover-row"><span>等級</span><strong>Lv.{hud.level}</strong></div>
            <div className="arena-gameover-row"><span>擊殺數</span><strong>{hud.killCount}</strong></div>
            <div className="arena-gameover-row"><span>賺得金幣</span><strong>{hud.bonusGold}</strong></div>
            <div className="arena-gameover-boss">👑 擊敗了 Boss</div>
          </div>
          <button className="arena-gameover-btn" onClick={onExit}>返回主選單</button>
        </div>
      )}
    </div>
  )
}
