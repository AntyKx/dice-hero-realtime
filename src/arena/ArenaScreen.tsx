import { useEffect, useRef, useState } from 'react'
import { ArenaGame, type ArenaConfig, type ArenaHudState } from './ArenaGame'
import DiceUpgradeOverlay from './DiceUpgradeOverlay'
import type { ArenaCard } from './cards'

interface Props {
  config: ArenaConfig
  onExit: () => void
}

const INITIAL_HUD: ArenaHudState = { hp: 0, maxHp: 0, xp: 0, xpToNext: 1, level: 1, elapsed: 0, fps: 0 }

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

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const game = new ArenaGame(config, setHud, () => setLevelUpOpen(true))
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

  const hpPct = hud.maxHp > 0 ? Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100)) : 0
  const xpPct = hud.xpToNext > 0 ? Math.max(0, Math.min(100, (hud.xp / hud.xpToNext) * 100)) : 0

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
        <div className="arena-hud-bottom">
          <div className="arena-xp-bar">
            <div className="arena-xp-fill" style={{ width: `${xpPct}%` }} />
          </div>
          <div className="arena-level">Lv.{hud.level}</div>
        </div>
        <div className="arena-fps">FPS {hud.fps}</div>
        <button className="arena-exit-btn" onClick={onExit}>✕ 離開測試</button>
      </div>

      {levelUpOpen && <DiceUpgradeOverlay onComplete={handleCardChosen} />}
    </div>
  )
}
