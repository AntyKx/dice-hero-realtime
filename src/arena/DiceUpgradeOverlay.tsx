import { useEffect, useState } from 'react'
import DieFace from '../components/DieFace'
import { pickThreeCards, type ArenaCard } from './cards'

interface Props {
  onComplete: (card: ArenaCard) => void
}

const RARITY_LABEL = { common: '普通', rare: '稀有', epic: '史詩' } as const
const RARITY_COLOR = { common: '#8090a8', rare: '#6db8ff', epic: '#d080ff' } as const
const ROLL_TICKS = 7
const ROLL_TICK_MS = 100

export default function DiceUpgradeOverlay({ onComplete }: Props) {
  const [face, setFace] = useState(1)
  const [settled, setSettled] = useState(false)
  const [cards, setCards] = useState<ArenaCard[] | null>(null)

  useEffect(() => {
    let tick = 0
    const timer = window.setInterval(() => {
      tick++
      if (tick >= ROLL_TICKS) {
        window.clearInterval(timer)
        const finalRoll = 1 + Math.floor(Math.random() * 6)
        setFace(finalRoll)
        setSettled(true)
        setCards(pickThreeCards(finalRoll))
        return
      }
      setFace(1 + Math.floor(Math.random() * 6))
    }, ROLL_TICK_MS)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="arena-levelup-overlay">
      <div className={`arena-levelup-die${settled ? ' settled' : ''}`}>
        <DieFace value={face} />
      </div>
      {!settled && <div className="arena-levelup-hint">擲骰決定強化品質…</div>}

      {cards && (
        <>
          <div className="arena-levelup-title">升級！選擇一項強化</div>
          <div className="reward-cards">
            {cards.map(card => (
              <button
                key={card.id}
                className={`reward-card rarity-${card.rarity}`}
                onClick={() => onComplete(card)}
              >
                <div className="rc-rarity" style={{ color: RARITY_COLOR[card.rarity] }}>
                  {RARITY_LABEL[card.rarity]}
                </div>
                <div className="rc-name">{card.name}</div>
                <div className="rc-desc">{card.desc}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
