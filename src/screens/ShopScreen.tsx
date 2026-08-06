import { useState } from 'react'
import type { BuffCard, RunState } from '../types'
import { MAX_POTIONS } from '../types'
import { getRandomCards, getEffectiveCardDesc } from '../buffCards'
import { getRandomRelics, getRelicById } from '../relics'
import type { Relic } from '../types'
import { HEROES } from '../data'
import { ALL_POTIONS, POTION_PRICE, getPotionById } from '../potions'
import { FEATURE_FLAGS } from '../featureFlags'

interface Props {
  run: RunState
  onLeave: (result: {
    goldSpent: number
    hpGained: number
    newCard: BuffCard | null
    potions: string[]
    upgradedCardIds: string[]
    newRelicId: string | null
    copiedCardId: string | null
    upgradedRarityCardId: string | null
    newRarity: 'rare' | 'epic' | null
  }) => void
}

const RARITY_LABEL = { common: '普通', rare: '稀有', epic: '史詩' }
const RARITY_COLOR = { common: '#8090a8', rare: '#6db8ff', epic: '#d080ff' }

export default function ShopScreen({ run, onLeave }: Props) {
  const activeMember = run.party[run.activePartyIdx]
  const activeRole = HEROES.find(h => h.id === activeMember.heroId)?.role

  const [shopData] = useState(() => {
    // Cards owned and upgradeable (level < maxLevel, maxLevel > 1)
    const upgradeCards = run.cards
      .filter(c => {
        const lv = run.cardLevels?.[c.id] ?? 1
        return (c.maxLevel ?? 1) > 1 && lv < (c.maxLevel ?? 1)
      })
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
    // 新卡池排除所有已持有的卡（可升級的走 upgrade 區塊，maxLevel:1 已持有不再出現）
    const hasUnusedRevival = (run.cards.some(c => c.id === 'undying') && !activeMember.undyingUsed) || (run.relics.includes('hourglass') && !(run.hourglassUsed ?? false))
    const excludeIds = [...new Set(run.cards.map(c => c.id))]
    if (hasUnusedRevival) excludeIds.push('undying')
    const newCards = getRandomCards(2, activeRole, excludeIds)
    const relicExclude = hasUnusedRevival ? [...run.relics, 'hourglass'] : run.relics
    const relics = getRandomRelics(1, relicExclude, undefined, activeRole)
    const copyCards = [...run.cards].sort(() => Math.random() - 0.5).slice(0, 2)
    const rarityCards = [...run.cards].filter(c => c.rarity === 'common' || c.rarity === 'rare').sort(() => Math.random() - 0.5).slice(0, 2)
    return { upgradeCards, newCards, relics, copyCards, rarityCards }
  })

  const [bought, setBought] = useState<Set<string>>(new Set())
  const [upgradedIds, setUpgradedIds] = useState<Set<string>>(new Set())
  const [boughtRelicId, setBoughtRelicId] = useState<string | null>(null)
  const [gold, setGold] = useState(run.gold)
  const [hpGained, setHpGained] = useState(0)
  const [acquiredCards, setAcquiredCards] = useState<BuffCard[]>([])
  const [potions, setPotions] = useState<string[]>(run.potions ?? [])

  const [copiedCardId, setCopiedCardId] = useState<string | null>(null)
  const [upgradedRarityCardId, setUpgradedRarityCardId] = useState<string | null>(null)
  const [newRarity, setNewRarity] = useState<'rare' | 'epic' | null>(null)

  const [shopPotions] = useState(() => {
    const pool = [...ALL_POTIONS].sort(() => Math.random() - 0.5).slice(0, 3)
    return pool.map(p => p.id)
  })

  const ch = run.chapter ?? 1
  const healCost          = 60 + ch * 20   // 第一章:80 第二章:100 第三章:120
  const fullHealCost      = 120 + ch * 45  // 第一章:165 第二章:210 第三章:255
  const cardCost          = 120
  const upgradeCost       = 110
  const relicCost         = 200
  const copyCardCost      = 240
  const upgradeRarityCost = 300

  const buyPotion = (pid: string, slotKey: string) => {
    const price = POTION_PRICE[pid] ?? 50
    if (gold < price || bought.has(slotKey) || potions.length >= MAX_POTIONS) return
    setGold(g => g - price)
    setBought(s => new Set([...s, slotKey]))
    setPotions(p => [...p, pid])
  }

  const buyHeal = () => {
    if (gold < healCost) return
    const amount = Math.round(activeMember.maxHp * 0.3)
    setGold(g => g - healCost)
    setHpGained(h => h + amount)
  }

  const buyFullHeal = () => {
    if (gold < fullHealCost) return
    const amount = activeMember.maxHp - activeMember.hp - hpGained
    if (amount <= 0) return
    setGold(g => g - fullHealCost)
    setHpGained(activeMember.maxHp - activeMember.hp)
  }

  const buyCard = (card: BuffCard) => {
    if (gold < cardCost || bought.has(card.id)) return
    setGold(g => g - cardCost)
    setBought(s => new Set([...s, card.id]))
    setAcquiredCards(a => [...a, card])
  }

  const buyUpgrade = (card: BuffCard) => {
    if (gold < upgradeCost || upgradedIds.has(card.id)) return
    setGold(g => g - upgradeCost)
    setUpgradedIds(s => new Set([...s, card.id]))
  }

  const buyRelic = (relic: Relic) => {
    if (gold < relicCost || boughtRelicId !== null) return
    setGold(g => g - relicCost)
    setBoughtRelicId(relic.id)
  }

  const buyCopyCard = (card: BuffCard) => {
    if (copiedCardId || gold < copyCardCost) return
    setGold(g => g - copyCardCost)
    setCopiedCardId(card.id)
  }

  const buyUpgradeRarity = (card: BuffCard) => {
    if (upgradedRarityCardId || gold < upgradeRarityCost) return
    const next: 'rare' | 'epic' = card.rarity === 'common' ? 'rare' : 'epic'
    setGold(g => g - upgradeRarityCost)
    setUpgradedRarityCardId(card.id)
    setNewRarity(next)
  }

  const leave = () => {
    const newCard = acquiredCards[acquiredCards.length - 1] ?? null
    onLeave({
      goldSpent: run.gold - gold,
      hpGained,
      newCard,
      potions,
      upgradedCardIds: [...upgradedIds],
      newRelicId: boughtRelicId,
      copiedCardId,
      upgradedRarityCardId,
      newRarity,
    })
  }

  return (
    <div className="shop-screen">
      <div className="shop-header">
        <h2>商店</h2>
        <span className="gold-display">💰 {gold}</span>
      </div>

      {/* ── 治療 ── */}
      <div className="shop-section">
        <h3>治療</h3>
        <div className="shop-items">
          <button
            className={`shop-item ${gold < healCost ? 'cant-afford' : ''}`}
            onClick={buyHeal}
            disabled={gold < healCost}
          >
            <div className="si-name">小回復</div>
            <div className="si-desc">回復 30% 最大 HP</div>
            <div className="si-cost">💰 {healCost}</div>
          </button>
          <button
            className={`shop-item ${gold < fullHealCost ? 'cant-afford' : ''}`}
            onClick={buyFullHeal}
            disabled={gold < fullHealCost || activeMember.hp + hpGained >= activeMember.maxHp}
          >
            <div className="si-name">完全回復</div>
            <div className="si-desc">HP 回滿</div>
            <div className="si-cost">💰 {fullHealCost}</div>
          </button>
        </div>
      </div>

      {/* ── 升級已持有增益卡 ── */}
      {shopData.upgradeCards.length > 0 && (
        <div className="shop-section">
          <h3>升級增益卡 （{upgradeCost} 金幣）</h3>
          <div className="shop-cards">
            {shopData.upgradeCards.map(card => {
              const currentLv = run.cardLevels?.[card.id] ?? 1
              const nextLv = currentLv + 1
              const nextDesc = getEffectiveCardDesc(card, nextLv)
              const isDone = upgradedIds.has(card.id)
              const cantAfford = gold < upgradeCost && !isDone
              const rarityColor = RARITY_COLOR[card.rarity]
              return (
                <button
                  key={card.id}
                  className={`reward-card rarity-${card.rarity} rc-upgradable ${isDone ? 'sold' : ''} ${cantAfford ? 'cant-afford' : ''}`}
                  onClick={() => buyUpgrade(card)}
                  disabled={isDone || cantAfford}
                >
                  <div className="rc-header-row">
                    <div className="rc-rarity" style={{ color: rarityColor }}>{RARITY_LABEL[card.rarity]}</div>
                    <div className="rc-lv-badge" style={{ color: '#4ddd88', borderColor: '#4ddd8855' }}>
                      Lv{currentLv} ▶ Lv{nextLv}
                    </div>
                  </div>
                  <div className="rc-name">{card.name}</div>
                  <div className="rc-upgrade-block">
                    <div className="rc-upgrade-row rc-upgrade-current">
                      <span className="rc-upgrade-lv-tag">Lv{currentLv}</span>
                      <span className="rc-upgrade-text">{card.desc}</span>
                    </div>
                    <div className="rc-upgrade-divider">
                      <span className="rc-upgrade-arrow-icon">▲</span>
                      <span className="rc-upgrade-arrow-label">升級後</span>
                    </div>
                    <div className="rc-upgrade-row rc-upgrade-next">
                      <span className="rc-upgrade-lv-tag rc-upgrade-lv-new">Lv{nextLv}</span>
                      <span className="rc-upgrade-text rc-upgrade-new-text">{nextDesc}</span>
                    </div>
                  </div>
                  {isDone && <div className="sold-label">已升級</div>}
                </button>
              )
            })}
          </div>
        </div>
      )}



      {/* ── 新增益卡 ── */}
      <div className="shop-section">
        <h3>新增益卡 （{cardCost} 金幣）</h3>
        <div className="shop-cards">
          {shopData.newCards.length === 0 ? (
            <div className="shop-empty-hint">目前沒有可購入的新增益卡</div>
          ) : shopData.newCards.map(card => {
            const isBought = bought.has(card.id)
            const cantAfford = gold < cardCost && !isBought
            const rarityColor = RARITY_COLOR[card.rarity]
            return (
              <button
                key={card.id}
                className={`reward-card rarity-${card.rarity} ${isBought ? 'sold' : ''} ${cantAfford ? 'cant-afford' : ''}`}
                onClick={() => buyCard(card)}
                disabled={isBought || cantAfford}
              >
                <div className="rc-header-row">
                  <div className="rc-rarity" style={{ color: rarityColor }}>{RARITY_LABEL[card.rarity]}</div>
                </div>
                <div className="rc-name">{card.name}</div>
                <div className="rc-desc">{card.desc}</div>
                {isBought && <div className="sold-label">已購買</div>}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 遺物 ── */}
      {shopData.relics.length > 0 && (
        <div className="shop-section">
          <h3>遺物 （{relicCost} 金幣）</h3>
          <div className="shop-items">
            {shopData.relics.map(relic => {
              const isBought = boughtRelicId === relic.id
              const cantAfford = gold < relicCost && !isBought
              return (
                <button
                  key={relic.id}
                  className={`shop-item shop-relic ${isBought ? 'sold' : ''} ${cantAfford ? 'cant-afford' : ''}`}
                  onClick={() => buyRelic(relic)}
                  disabled={isBought || cantAfford}
                >
                  <div className="si-name">{relic.name}</div>
                  <div className="si-desc">{relic.desc}</div>
                  <div className="si-cost">
                    {isBought ? '已購買' : `💰 ${relicCost}`}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 藥水（v1 即時制範圍先隱藏，見 FEATURE_FLAGS） ── */}
      {FEATURE_FLAGS.potionsAndCurses && (
        <div className="shop-section">
          <h3>藥水（攜帶上限 {MAX_POTIONS}，目前 {potions.length}）</h3>
          <div className="shop-items">
            {shopPotions.map((pid, i) => {
              const p = getPotionById(pid)!
              const price = POTION_PRICE[pid] ?? 50
              const slotKey = `potion_${i}`
              const cantBuy = gold < price || bought.has(slotKey) || potions.length >= MAX_POTIONS
              return (
                <button
                  key={slotKey}
                  className={`shop-item ${cantBuy ? 'cant-afford' : ''}`}
                  onClick={() => buyPotion(pid, slotKey)}
                  disabled={cantBuy}
                >
                  <div className="si-name">{p.icon} {p.name}</div>
                  <div className="si-desc">{p.desc}</div>
                  <div className="si-cost">💰 {price}{bought.has(slotKey) ? '（已購）' : ''}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 購買預覽 ── */}
      {hpGained > 0 && (
        <div className="shop-preview">已回復 {hpGained} HP</div>
      )}
      {acquiredCards.length > 0 && (
        <div className="shop-preview">獲得：{acquiredCards.map(c => c.name).join('、')}</div>
      )}
      {upgradedIds.size > 0 && (
        <div className="shop-preview">
          已升級：{[...upgradedIds].map(id => run.cards.find(c => c.id === id)?.name ?? id).join('、')}
        </div>
      )}
      {boughtRelicId && (
        <div className="shop-preview">
          獲得遺物：{getRelicById(boughtRelicId)?.name ?? boughtRelicId}
        </div>
      )}

      <button className="primary leave-btn" onClick={leave}>離開商店</button>
    </div>
  )
}
