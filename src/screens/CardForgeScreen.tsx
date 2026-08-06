import { useState } from 'react'
import type { BuffCard, RunState } from '../types'

export interface CardForgeResult {
  goldSpent: number
  copiedCard: BuffCard | null
  upgradedCardId: string | null
  newRarity: 'rare' | 'epic' | null
}

interface Props {
  run: RunState
  onLeave: (result: CardForgeResult) => void
}

const COPY_COST    = 260
const UPGRADE_COST = 320

const RARITY_LABEL: Record<string, string> = { common: '普通', rare: '稀有', epic: '史詩' }
const RARITY_COLOR: Record<string, string> = { common: '#8090a8', rare: '#6db8ff', epic: '#d080ff' }

export default function CardForgeScreen({ run, onLeave }: Props) {
  const [gold, setGold] = useState(run.gold)
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null)
  const [upgradedCardId, setUpgradedCardId] = useState<string | null>(null)
  const [newRarity, setNewRarity] = useState<'rare' | 'epic' | null>(null)

  const upgradeableCards = run.cards.filter(c => c.rarity === 'common' || c.rarity === 'rare')

  const doCopy = (card: BuffCard) => {
    if (copiedCardId || gold < COPY_COST) return
    setGold(g => g - COPY_COST)
    setCopiedCardId(card.id)
  }

  const doUpgrade = (card: BuffCard) => {
    if (upgradedCardId || gold < UPGRADE_COST) return
    const next: 'rare' | 'epic' = card.rarity === 'common' ? 'rare' : 'epic'
    setGold(g => g - UPGRADE_COST)
    setUpgradedCardId(card.id)
    setNewRarity(next)
  }

  const handleLeave = () => {
    const copiedCard = copiedCardId ? (run.cards.find(c => c.id === copiedCardId) ?? null) : null
    onLeave({
      goldSpent: run.gold - gold,
      copiedCard,
      upgradedCardId,
      newRarity,
    })
  }

  return (
    <div className="shop-screen">
      <div className="shop-header">
        <div className="shop-title">🔨 鑄造所</div>
        <span className="gold-display">💰 {gold}</span>
      </div>

      {/* ── 複製增益卡 ── */}
      <div className="shop-section">
        <h3>複製增益卡（{COPY_COST} 金幣，限一次）</h3>
        {run.cards.length === 0 && <p style={{ color: '#888' }}>尚無卡牌</p>}
        <div className="shop-cards">
          {run.cards.map(card => {
            const done = copiedCardId === card.id
            const cantAfford = gold < COPY_COST && !done
            return (
              <button
                key={card.id + '_copy'}
                className={`reward-card rarity-${card.rarity} ${done ? 'sold' : ''} ${cantAfford ? 'cant-afford' : ''}`}
                disabled={!!copiedCardId || cantAfford}
                onClick={() => doCopy(card)}
              >
                <div className="rc-header-row">
                  <div className="rc-rarity" style={{ color: RARITY_COLOR[card.rarity] }}>{RARITY_LABEL[card.rarity]}</div>
                </div>
                <div className="rc-name">{card.name}</div>
                <div className="rc-desc">{card.desc}</div>
                {done && <div className="sold-label">已複製</div>}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 升格品質 ── */}
      <div className="shop-section">
        <h3>升格品質（{UPGRADE_COST} 金幣，限一次）普通→稀有 / 稀有→史詩</h3>
        {upgradeableCards.length === 0 && <p style={{ color: '#888' }}>無可升格的卡牌</p>}
        <div className="shop-cards">
          {upgradeableCards.map(card => {
            const next: 'rare' | 'epic' = card.rarity === 'common' ? 'rare' : 'epic'
            const done = upgradedCardId === card.id
            const cantAfford = gold < UPGRADE_COST && !done
            return (
              <button
                key={card.id + '_rar'}
                className={`reward-card rarity-${card.rarity} ${done ? 'sold' : ''} ${cantAfford ? 'cant-afford' : ''}`}
                disabled={!!upgradedCardId || cantAfford}
                onClick={() => doUpgrade(card)}
              >
                <div className="rc-header-row">
                  <div className="rc-rarity" style={{ color: RARITY_COLOR[card.rarity] }}>{RARITY_LABEL[card.rarity]}</div>
                </div>
                <div className="rc-name">{card.name}</div>
                <div className="rc-desc">{card.desc}</div>
                {done
                  ? <div className="sold-label">已升格為{RARITY_LABEL[next]}</div>
                  : <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: 4 }}>→ {RARITY_LABEL[next]}</div>
                }
              </button>
            )
          })}
        </div>
      </div>

      <button className="primary leave-btn" style={{ width: '100%', marginTop: 16 }} onClick={handleLeave}>
        離開鑄造所
      </button>
    </div>
  )
}
