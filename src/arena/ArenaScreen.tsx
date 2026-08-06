import { useEffect, useRef, useState } from 'react'
import { ArenaGame, type ArenaConfig, type ArenaHudState } from './ArenaGame'
import DiceUpgradeOverlay from './DiceUpgradeOverlay'
import RelicLootOverlay from './RelicLootOverlay'
import type { ArenaCard } from './cards'
import type { ArenaRelic } from './relics'

interface Props {
  config: ArenaConfig
  onExit: () => void
}

const INITIAL_HUD: ArenaHudState = {
  hp: 0, maxHp: 0, xp: 0, xpToNext: 1, level: 1, elapsed: 0, fps: 0,
  enemyCount: 0, bossState: 'none', bossHp: 0, bossMaxHp: 0,
  killCount: 0, gameOver: false,
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ArenaScreen({ config, onExit }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<ArenaGame | null>(null)
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

  const hpPct = hud.maxHp > 0 ? Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100)) : 0
  const xpPct = hud.xpToNext > 0 ? Math.max(0, Math.min(100, (hud.xp / hud.xpToNext) * 100)) : 0
  const bossPct = hud.bossMaxHp > 0 ? Math.max(0, Math.min(100, (hud.bossHp / hud.bossMaxHp) * 100)) : 0

  return (
    <div className="arena-screen">
      <div className="arena-canvas-wrap" ref={containerRef} />

      {/* HUD 疊層：純 React，只讀 ArenaGame 節流丟出來的狀態，不碰 canvas 內部 */}
      <div className="arena-hud">
        <div className="arena-hud-top">
          <div className="arena-hp-bar">
            <div className="arena-hp-fill" style={{ width: `${hpPct}%` }} />
            <span className="arena-hp-text">{hud.hp} / {hud.maxHp}</span>
          </div>
          <div className="arena-timer">{formatTime(hud.elapsed)}</div>
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
          <div className="arena-level">Lv.{hud.level}</div>
        </div>
        <div className="arena-fps">FPS {hud.fps} ｜ 敵 {hud.enemyCount}</div>
        {!hud.gameOver && <button className="arena-exit-btn" onClick={onExit}>✕ 返回</button>}
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
    </div>
  )
}
