/**
 * Elite 詞綴定義。純資料 + 型別，執行邏輯散落在 ArenaGame.ts 對應的 hook 點
 * （updateEnemies 的 berserker 判斷、damageEnemy 的 split、各自的計時觸發、
 * damagePlayer 的 vampiric）。之後要加新詞綴：這裡加一筆 + eliteModifierState
 * 需要的計時器 key，再到 ArenaGame.ts 加對應的 hook。
 */

export type EliteModifierId = 'berserker' | 'split' | 'frost' | 'lightning' | 'vampiric'

export const ELITE_MODIFIER_IDS: EliteModifierId[] = ['berserker', 'split', 'frost', 'lightning', 'vampiric']

export const BERSERKER_CONFIG = {
  hpThreshold: 0.5,   // hp/maxHp 低於這個比例時觸發
  speedMult: 1.3,
  cooldownRateMult: 1.5, // 攻擊/技能冷卻累加速率倍率（等同攻速變快）
}

export const SPLIT_CONFIG = {
  minCount: 2,
  maxCount: 3,
  hpMultOfParent: 0.4, // 分裂出來的小怪血量是本體的比例，避免雪球
  spawnOffsetRadius: 30,
}

export const FROST_CONFIG = {
  intervalSec: 4,
  telegraphSec: 0.8,
  radius: 80,
  damage: 12,
  moveSpeedDebuffMult: 0.6,
  moveSpeedDebuffSec: 2,
}

export const LIGHTNING_CONFIG = {
  intervalSec: 3.2,
  telegraphSec: 0.6,
  radius: 70,
  damage: 18,
}

export const VAMPIRIC_CONFIG = {
  healPctOfDamage: 0.3,
}

export function rollEliteModifier(): EliteModifierId {
  return ELITE_MODIFIER_IDS[Math.floor(Math.random() * ELITE_MODIFIER_IDS.length)]
}
