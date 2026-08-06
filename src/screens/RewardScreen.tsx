import { useState } from 'react'
import type { BuffCard } from '../types'
import { getEffectiveCardDesc } from '../buffCards'
import BackpackPanel from '../components/BackpackPanel'

interface Props {
  cards: BuffCard[]
  ownedCards?: BuffCard[]
  cardLevels?: Record<string, number>
  onSelect: (card: BuffCard) => void
  onSkip: () => void
}

const RARITY_LABEL = { common: '普通', rare: '稀有', epic: '史詩' }
const RARITY_COLOR = { common: '#8090a8', rare: '#6db8ff', epic: '#d080ff' }

export default function RewardScreen({ cards, ownedCards = [], cardLevels = {}, onSelect, onSkip }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [showBackpack, setShowBackpack] = useState(false)

  // 過濾掉「已持有且不可升級」的卡（maxLevel:1 已持有、或已達最高等級）
  const displayCards = cards.filter(card => {
    const lv = cardLevels[card.id] ?? 0
    const owned = lv > 0 || ownedCards.some(c => c.id === card.id)
    const canUpgrade = owned && (card.maxLevel ?? 1) > 1 && lv < (card.maxLevel ?? 1)
    return !owned || canUpgrade
  })

  return (
    <div className="reward-screen">
      {showBackpack && (
        <BackpackPanel
          title="目前持有的增益卡"
          items={ownedCards.map(c => ({
            id: c.id,
            name: c.name,
            desc: getEffectiveCardDesc(c, cardLevels[c.id] ?? 1),
            tierLabel: RARITY_LABEL[c.rarity],
            tierColor: RARITY_COLOR[c.rarity],
          }))}
          onClose={() => setShowBackpack(false)}
        />
      )}
      <button className="ghost reward-backpack-btn" onClick={() => setShowBackpack(true)}>🎒 我的增益卡（{ownedCards.length}）</button>
      <h2>選擇增益卡</h2>
      <p className="reward-hint">勝利！從以下 3 張卡選擇一張加入你的牌組。</p>
      <div className="reward-cards">
        {displayCards.map(card => {
          const currentLevel = cardLevels[card.id] ?? 0
          const isOwned = currentLevel > 0 || ownedCards.some(c => c.id === card.id)
          const maxLevel = card.maxLevel ?? 1
          const canUpgrade = isOwned && maxLevel > 1 && currentLevel < maxLevel
          const nextLevel = currentLevel + 1
          const nextDesc = canUpgrade ? getEffectiveCardDesc(card, nextLevel) : card.desc
          const rarityColor = RARITY_COLOR[card.rarity]

          return (
            <button
              key={card.id}
              className={`reward-card rarity-${card.rarity} ${hovered === card.id ? 'hovered' : ''} ${canUpgrade ? 'rc-upgradable' : ''}`}
              onClick={() => onSelect(card)}
              onMouseEnter={() => setHovered(card.id)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Header row */}
              <div className="rc-header-row">
                <div className="rc-rarity" style={{ color: rarityColor }}>{RARITY_LABEL[card.rarity]}</div>
                {canUpgrade && (
                  <div className="rc-lv-badge" style={{ color: '#4ddd88', borderColor: '#4ddd8855' }}>
                    Lv{currentLevel} ▶ Lv{nextLevel}
                  </div>
                )}
                {isOwned && !canUpgrade && maxLevel === 1 && (
                  <div className="rc-owned-badge">已持有</div>
                )}
              </div>

              {/* Card name */}
              <div className="rc-name">{card.name}</div>

              {/* Effect section */}
              {canUpgrade ? (
                <div className="rc-upgrade-block">
                  {/* Current level */}
                  <div className="rc-upgrade-row rc-upgrade-current">
                    <span className="rc-upgrade-lv-tag">Lv{currentLevel}</span>
                    <span className="rc-upgrade-text">{getEffectiveCardDesc(card, currentLevel)}</span>
                  </div>
                  {/* Arrow */}
                  <div className="rc-upgrade-divider">
                    <span className="rc-upgrade-arrow-icon">▲</span>
                    <span className="rc-upgrade-arrow-label">升級後</span>
                  </div>
                  {/* Next level */}
                  <div className="rc-upgrade-row rc-upgrade-next">
                    <span className="rc-upgrade-lv-tag rc-upgrade-lv-new">Lv{nextLevel}</span>
                    <span className="rc-upgrade-text rc-upgrade-new-text">{nextDesc}</span>
                  </div>
                </div>
              ) : (
                <div className="rc-desc">{card.desc}</div>
              )}
            </button>
          )
        })}
      </div>
      <button className="ghost skip-btn" onClick={onSkip}>跳過（不選）</button>
    </div>
  )
}
