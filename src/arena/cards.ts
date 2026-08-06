/**
 * M2：即時戰鬥的升級卡池。刻意跟 src/buffCards.ts（456 行，回合制專用效果如
 * rerollBonus/damagePerRank/freezeOnHighCombo）分開，不共用型別——那些效果
 * 語意上是回合制的，硬套進即時戰鬥會很牽強。這裡先用一組小而乾淨、直接對應
 * ArenaGame 即時屬性的卡，驗證「擲骰→三選一」這個節奏本身好不好玩（M2 的
 * 驗收重點）。卡池夠不夠豐富是 M3 內容擴充的事，見 REALTIME_PIVOT_PLAN.md。
 */

export type ArenaCardRarity = 'common' | 'rare' | 'epic'

export interface ArenaCardEffect {
  flatDamage?: number
  atkCooldownMult?: number   // 直接乘在冷卻時間上，越小越快
  moveSpeedBonus?: number    // 加成比例，0.1 = +10%
  maxHpBonus?: number
  pickupRangeBonus?: number  // 加成比例
}

export interface ArenaCard {
  id: string
  name: string
  desc: string
  rarity: ArenaCardRarity
  effect: ArenaCardEffect
}

export const ARENA_CARDS: ArenaCard[] = [
  { id: 'power_1', name: '力量鍛鍊', desc: '攻擊傷害 +4', rarity: 'common', effect: { flatDamage: 4 } },
  { id: 'power_2', name: '力量強化', desc: '攻擊傷害 +9', rarity: 'rare', effect: { flatDamage: 9 } },
  { id: 'power_3', name: '力量爆發', desc: '攻擊傷害 +18', rarity: 'epic', effect: { flatDamage: 18 } },

  { id: 'haste_1', name: '敏捷訓練', desc: '攻擊速度 +14%', rarity: 'common', effect: { atkCooldownMult: 0.88 } },
  { id: 'haste_2', name: '疾風之刃', desc: '攻擊速度 +33%', rarity: 'rare', effect: { atkCooldownMult: 0.75 } },
  { id: 'haste_3', name: '瞬光連擊', desc: '攻擊速度 +82%', rarity: 'epic', effect: { atkCooldownMult: 0.55 } },

  { id: 'vital_1', name: '體魄鍛鍊', desc: '最大 HP +20（立即回復）', rarity: 'common', effect: { maxHpBonus: 20 } },
  { id: 'vital_2', name: '堅韌之軀', desc: '最大 HP +45（立即回復）', rarity: 'rare', effect: { maxHpBonus: 45 } },
  { id: 'vital_3', name: '不朽意志', desc: '最大 HP +90（立即回復）', rarity: 'epic', effect: { maxHpBonus: 90 } },

  { id: 'swift_1', name: '輕盈步伐', desc: '移動速度 +10%', rarity: 'common', effect: { moveSpeedBonus: 0.10 } },
  { id: 'swift_2', name: '疾風之靴', desc: '移動速度 +22%', rarity: 'rare', effect: { moveSpeedBonus: 0.22 } },

  { id: 'magnet_1', name: '拾荒之心', desc: '拾取範圍 +30%', rarity: 'common', effect: { pickupRangeBonus: 0.30 } },
  { id: 'magnet_2', name: '貪婪引力', desc: '拾取範圍 +65%', rarity: 'rare', effect: { pickupRangeBonus: 0.65 } },
]

function rarityWeight(rarity: ArenaCardRarity, roll: number): number {
  if (rarity === 'common') return Math.max(10, 70 - roll * 6)
  if (rarity === 'rare') return 20 + roll * 5
  return Math.max(0, roll - 2) * 8
}

/** 擲骰結果（1-6）決定三張卡的稀有度加權；骰越大，稀有/史詩機率越高。 */
export function pickThreeCards(roll: number): ArenaCard[] {
  const pool = [...ARENA_CARDS]
  const picked: ArenaCard[] = []
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const weights = pool.map(c => rarityWeight(c.rarity, roll))
    const total = weights.reduce((a, b) => a + b, 0)
    let r = Math.random() * total
    let idx = 0
    for (; idx < pool.length - 1; idx++) {
      r -= weights[idx]
      if (r <= 0) break
    }
    picked.push(pool[idx])
    pool.splice(idx, 1)
  }
  return picked
}
