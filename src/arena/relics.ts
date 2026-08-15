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
  /** 只有裝備系統重整（2026-08）新增的武器專屬遺物才有：對應
   *  arena/equipment.ts 的 weaponTagForHero(heroId)，只有裝著那把武器的
   *  英雄才會在戰利品裡看到。沒有這個欄位＝所有英雄都通用（原本 6 個）。 */
  weaponTag?: string
}

export const ARENA_RELICS: ArenaRelic[] = [
  { id: 'piercing_arrow', name: '穿透之矢', desc: '攻擊可額外穿透 2 個敵人', effect: { pierceBonus: 2 } },
  { id: 'twin_shot', name: '雙重射擊', desc: '每次攻擊多發射 1 發投射物', effect: { extraProjectiles: 1 } },
  { id: 'bloodthirsty_blade', name: '嗜血之刃', desc: '造成傷害的 15% 轉換為回復', effect: { lifestealPct: 0.15 } },
  { id: 'thorn_armor', name: '荊棘護甲', desc: '被敵人碰到時，反彈 40% 傷害給對方', effect: { thornsPct: 0.4 } },
  { id: 'vital_aura', name: '生命回復', desc: '每秒回復最大 HP 的 2%', effect: { hpRegenPctPerSec: 0.02 } },
  { id: 'shield_core', name: '護盾核心', desc: '每 12 秒獲得一次護盾，完全格擋下一次傷害', effect: { shieldIntervalSec: 12 } },
]

/**
 * 武器專屬遺物（2026-08 裝備系統重整）：每個英雄的職業武器綁一個獨占的
 * 遺物——只有裝著那把武器才會在戰利品清單看到，換裝別把武器就看不到、
 * 也抽不到，是刻意設計成「跟裝備綁定」而不是跟英雄本身綁定（同一個英雄
 * 沒戴武器/戴通用裝備時不會看到）。效果數值刻意比通用 6 個遺物略強一截，
 * 呼應「稀有度更高的獨占內容」的定位。
 */
export const ARENA_WEAPON_RELICS: ArenaRelic[] = [
  { id: 'weapon_relic_knight',   name: '聖盾反震',   desc: '被敵人碰到時，反彈 60% 傷害給對方',   effect: { thornsPct: 0.6 },        weaponTag: 'knight_weapon' },
  { id: 'weapon_relic_mage',     name: '焰刃齊發',   desc: '每次攻擊多發射 1 發投射物',           effect: { extraProjectiles: 1 },   weaponTag: 'mage_weapon' },
  { id: 'weapon_relic_priest',   name: '聖光恆愈',   desc: '每秒回復最大 HP 的 3%',               effect: { hpRegenPctPerSec: 0.03 }, weaponTag: 'priest_weapon' },
  { id: 'weapon_relic_rogue',    name: '夜血汲取',   desc: '造成傷害的 18% 轉換為回復',           effect: { lifestealPct: 0.18 },    weaponTag: 'rogue_weapon' },
  { id: 'weapon_relic_princess', name: '凍穿萬物',   desc: '攻擊可額外穿透 2 個敵人',             effect: { pierceBonus: 2 },        weaponTag: 'princess_weapon' },
  { id: 'weapon_relic_archer',   name: '破空穿甲',   desc: '攻擊可額外穿透 3 個敵人',             effect: { pierceBonus: 3 },        weaponTag: 'archer_weapon' },
  { id: 'weapon_relic_dwarf',    name: '巨錘反震',   desc: '被敵人碰到時，反彈 60% 傷害給對方',   effect: { thornsPct: 0.6 },        weaponTag: 'dwarf_weapon' },
  { id: 'weapon_relic_bard',     name: '戰歌護盾',   desc: '每 8 秒獲得一次護盾，完全格擋下一次傷害', effect: { shieldIntervalSec: 8 }, weaponTag: 'bard_weapon' },
  { id: 'weapon_relic_death_knight', name: '血色狂怒', desc: '造成傷害的 22% 轉換為回復',        effect: { lifestealPct: 0.22 },    weaponTag: 'death_knight_weapon' },
  { id: 'weapon_relic_engineer', name: '重型連裝',   desc: '每次攻擊多發射 2 發投射物',           effect: { extraProjectiles: 2 },   weaponTag: 'engineer_weapon' },
  { id: 'weapon_relic_fighter',  name: '連拳護體',   desc: '每 10 秒獲得一次護盾，完全格擋下一次傷害', effect: { shieldIntervalSec: 10 }, weaponTag: 'fighter_weapon' },
]

/**
 * 從還沒擁有的遺物裡隨機挑 count 個（不重複）。遺物是跨局永久收藏（2026-08），
 * excludeIds 傳進來的是這個英雄目前為止永久擁有的全部遺物 id——集滿全部種類後
 * pool 會是空的，這時 fallback 回完整清單讓玩家可以疊加已擁有的效果，不會卡在
 * 戰利品畫面選不到東西。
 *
 * weaponTag 有給值時，該武器專屬遺物會併入候選池；沒有武器或武器沒有專屬
 * 遺物（尚未擴充/查無）時就只有原本的通用 6 個，行為完全不變。
 */
export function pickRelicChoices(excludeIds: string[] = [], count = 3, weaponTag?: string): ArenaRelic[] {
  const weaponPool = weaponTag ? ARENA_WEAPON_RELICS.filter(r => r.weaponTag === weaponTag) : []
  const all = [...ARENA_RELICS, ...weaponPool]
  const fresh = all.filter(r => !excludeIds.includes(r.id))
  const pool = fresh.length > 0 ? fresh : all
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

// ── 星界商城「遺物召喚」（2026-08）：星塵計價，直接寫進
// HeroProgress.ownedRelicIds（跟打贏 Boss 掉落是同一份清單，分英雄持有）。
// 這個池子只有 17 個、沒有稀有度分級，所以原本設計給主線遺物系統的「稀有度
// 保底」改成「未持有新品項保底」：累積抽數保底（30 抽必出新品項）＋十連
// 保底（每次十連保證至少一件新品項，墊在第十抽，不多開第十一件），另外
// 連續兩次抽到已持有品項後，下一抽強制未持有。注意：Arena 遺物重複持有是
// 有意義的（ArenaGame 會讓重複 id 疊加生效，不是廢料），這裡的「避免連續
// 重複」純粹是收集體驗考量，不是因為重複沒用。
export const RELIC_SUMMON_SINGLE_COST = 400
export const RELIC_SUMMON_TEN_COST = 3800 // 比單抽 ×10 便宜 10%
export const RELIC_SUMMON_PITY_THRESHOLD = 30
export const RELIC_SUMMON_DUP_STREAK_LIMIT = 2

function summonPool(weaponTag?: string): ArenaRelic[] {
  const weaponPool = weaponTag ? ARENA_WEAPON_RELICS.filter(r => r.weaponTag === weaponTag) : []
  return [...ARENA_RELICS, ...weaponPool]
}

/** forceNew 時只從尚未持有的品項抽；集滿全部可召喚遺物時 fallback 回完整池子允許重複
 *  （跟 pickRelicChoices 同一套 fallback 邏輯），避免抽不出東西。 */
export function summonRelic(ownedIds: string[], weaponTag: string | undefined, forceNew = false): ArenaRelic {
  const pool = summonPool(weaponTag)
  let candidates = forceNew ? pool.filter(r => !ownedIds.includes(r.id)) : pool
  if (candidates.length === 0) candidates = pool
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function summonRelicSingle(
  ownedIdsBefore: string[],
  weaponTag: string | undefined,
  pityCountBefore: number,
  dupStreakBefore: number,
): { relic: ArenaRelic; pityCountAfter: number; dupStreakAfter: number } {
  const forceNew = pityCountBefore + 1 >= RELIC_SUMMON_PITY_THRESHOLD || dupStreakBefore >= RELIC_SUMMON_DUP_STREAK_LIMIT
  const relic = summonRelic(ownedIdsBefore, weaponTag, forceNew)
  const wasOwned = ownedIdsBefore.includes(relic.id)
  return {
    relic,
    pityCountAfter: wasOwned ? pityCountBefore + 1 : 0,
    dupStreakAfter: wasOwned ? dupStreakBefore + 1 : 0,
  }
}

/** 十連版本：逐抽模擬（不是十抽完再統一判斷），保底結果直接墊在第十抽，池內已持有狀態
 *  跟連續重複計數也逐抽即時更新（同一次十連內先抽到的品項，後面幾抽也會被視為已持有）。 */
export function summonRelicTen(
  ownedIdsBefore: string[],
  weaponTag: string | undefined,
  pityCountBefore: number,
  dupStreakBefore: number,
): { relics: ArenaRelic[]; pityCountAfter: number; dupStreakAfter: number } {
  const relics: ArenaRelic[] = []
  let pity = pityCountBefore
  let dupStreak = dupStreakBefore
  let ownedSoFar = ownedIdsBefore
  for (let i = 0; i < 10; i++) {
    const isLastPull = i === 9
    const alreadyHasNew = relics.some(r => !ownedIdsBefore.includes(r.id))
    const forceNew = pity + 1 >= RELIC_SUMMON_PITY_THRESHOLD || dupStreak >= RELIC_SUMMON_DUP_STREAK_LIMIT || (isLastPull && !alreadyHasNew)
    const relic = summonRelic(ownedSoFar, weaponTag, forceNew)
    const wasOwned = ownedSoFar.includes(relic.id)
    dupStreak = wasOwned ? dupStreak + 1 : 0
    pity = wasOwned ? pity + 1 : 0
    if (!wasOwned) ownedSoFar = [...ownedSoFar, relic.id]
    relics.push(relic)
  }
  return { relics, pityCountAfter: pity, dupStreakAfter: dupStreak }
}
