/**
 * M3.5：Boss 戰利品的即時制遺物。跟 src/arena/cards.ts 同樣的決策——不沿用
 * src/relics.ts（531 行，大多是回合制專用效果），改成一組小而乾淨、直接對應
 * ArenaGame 即時屬性的遺物。
 *
 * 跟 cards.ts 的差異是刻意的：cards 是「頻繁出現的小數值加成」，relics 是
 * 「稀有、帶新機制」的被動——穿透、多重射擊、吸血、反傷、護盾這些 cards.ts
 * 完全沒有的行為，讓兩層強化在玩起來的感覺上有明確區別。
 */

export interface ArenaRelicEffect {
  pierceBonus?: number       // 投射物額外穿透次數
  extraProjectiles?: number  // 每次攻擊多發射幾發投射物
  lifestealPct?: number      // 造成傷害轉換為回血的比例，0.15 = 15%
  thornsPct?: number         // 被敵人碰到時，反彈給對方的傷害比例
  hpRegenPctPerSec?: number  // 每秒回復最大 HP 的比例
  shieldIntervalSec?: number // 每隔幾秒獲得一次可格擋下次攻擊的護盾
}

export interface ArenaRelic {
  id: string
  name: string
  desc: string
  effect: ArenaRelicEffect
}

export const ARENA_RELICS: ArenaRelic[] = [
  { id: 'piercing_arrow', name: '穿透之矢', desc: '攻擊可額外穿透 2 個敵人', effect: { pierceBonus: 2 } },
  { id: 'twin_shot', name: '雙重射擊', desc: '每次攻擊多發射 1 發投射物', effect: { extraProjectiles: 1 } },
  { id: 'bloodthirsty_blade', name: '嗜血之刃', desc: '造成傷害的 15% 轉換為回復', effect: { lifestealPct: 0.15 } },
  { id: 'thorn_armor', name: '荊棘護甲', desc: '被敵人碰到時，反彈 40% 傷害給對方', effect: { thornsPct: 0.4 } },
  { id: 'vital_aura', name: '生命回復', desc: '每秒回復最大 HP 的 2%', effect: { hpRegenPctPerSec: 0.02 } },
  { id: 'shield_core', name: '護盾核心', desc: '每 12 秒獲得一次護盾，完全格擋下一次傷害', effect: { shieldIntervalSec: 12 } },
]

/** 從還沒擁有的遺物裡隨機挑 count 個（不重複）。 */
export function pickRelicChoices(excludeIds: string[] = [], count = 3): ArenaRelic[] {
  const pool = ARENA_RELICS.filter(r => !excludeIds.includes(r.id))
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}
