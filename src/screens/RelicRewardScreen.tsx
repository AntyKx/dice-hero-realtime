import { useState } from 'react'
import type { Relic } from '../types'
import { getRelicById, getEffectiveRelicDesc } from '../relics'
import BackpackPanel from '../components/BackpackPanel'

interface Props {
  relics: Relic[]
  ownedRelicIds?: string[]
  relicLevels?: Record<string, number>
  onSelect: (relic: Relic) => void
  onSkip?: () => void
  title?: string
}

const TIER_LABEL: Record<string, string> = { common: '普通', rare: '稀有', boss: '傳說' }
const TIER_CLASS: Record<string, string> = { common: 'common', rare: 'rare', boss: 'epic' }
const TIER_COLOR: Record<string, string> = { common: '#8090a8', rare: '#6db8ff', boss: '#ffb347' }

export default function RelicRewardScreen({ relics, ownedRelicIds = [], relicLevels = {}, onSelect, onSkip, title }: Props) {
  const [showBackpack, setShowBackpack] = useState(false)
  const ownedRelics = ownedRelicIds.map(getRelicById).filter((r): r is Relic => !!r)

  // 過濾掉「已持有且不可升級」的遺物（maxLevel:1 已持有、或已達最高等級）
  const displayRelics = relics.filter(relic => {
    const lv = relicLevels[relic.id] ?? 0
    const owned = lv > 0 || ownedRelicIds.includes(relic.id)
    const canUpgrade = owned && (relic.maxLevel ?? 1) > 1 && lv < (relic.maxLevel ?? 1)
    return !owned || canUpgrade
  })

  return (
    <div className="reward-screen">
      {showBackpack && (
        <BackpackPanel
          title="目前持有的遺物"
          items={ownedRelics.map(r => ({
            id: r.id,
            name: r.name,
            desc: getEffectiveRelicDesc(r, relicLevels[r.id] ?? 1),
            tierLabel: TIER_LABEL[r.tier] ?? r.tier,
            tierColor: TIER_COLOR[r.tier] ?? '#8090a8',
          }))}
          onClose={() => setShowBackpack(false)}
        />
      )}
      <button className="ghost reward-backpack-btn" onClick={() => setShowBackpack(true)}>🎒 我的遺物（{ownedRelics.length}）</button>
      <h2>{title ?? '選擇遺物'}</h2>
      <p className="reward-hint">從以下遺物中選擇一件加入你的旅途。</p>
      <div className="reward-cards">
        {displayRelics.map(relic => {
          const currentLevel = relicLevels[relic.id] ?? 0
          const isOwned = currentLevel > 0 || ownedRelicIds.includes(relic.id)
          const maxLevel = relic.maxLevel ?? 1
          const canUpgrade = isOwned && maxLevel > 1 && currentLevel < maxLevel
          const nextLevel = currentLevel + 1
          const nextDesc = canUpgrade ? getEffectiveRelicDesc(relic, nextLevel) : relic.desc

          return (
            <button
              key={relic.id}
              className={`reward-card rarity-${TIER_CLASS[relic.tier] ?? 'common'} ${canUpgrade ? 'rc-upgradable' : ''}`}
              onClick={() => onSelect(relic)}
            >
              <div className="rc-header-row">
                <div className="rc-rarity">{TIER_LABEL[relic.tier] ?? relic.tier}</div>
                {canUpgrade && (
                  <div className="rc-lv-badge" style={{ color: '#4ddd88', borderColor: '#4ddd8855' }}>
                    Lv{currentLevel} ▶ Lv{nextLevel}
                  </div>
                )}
              </div>
              <div className="rc-name">{relic.name}</div>
              {canUpgrade ? (
                <div className="rc-upgrade-block">
                  <div className="rc-upgrade-row rc-upgrade-current">
                    <span className="rc-upgrade-lv-tag">Lv{currentLevel}</span>
                    <span className="rc-upgrade-text">{getEffectiveRelicDesc(relic, currentLevel)}</span>
                  </div>
                  <div className="rc-upgrade-divider">
                    <span className="rc-upgrade-arrow-icon">▲</span>
                    <span className="rc-upgrade-arrow-label">升級後</span>
                  </div>
                  <div className="rc-upgrade-row rc-upgrade-next">
                    <span className="rc-upgrade-lv-tag rc-upgrade-lv-new">Lv{nextLevel}</span>
                    <span className="rc-upgrade-text rc-upgrade-new-text">{nextDesc}</span>
                  </div>
                </div>
              ) : (
                <div className="rc-desc">{relic.desc}</div>
              )}
            </button>
          )
        })}
      </div>
      {onSkip && (
        <button className="ghost skip-btn" onClick={onSkip}>跳過（不選）</button>
      )}
    </div>
  )
}
