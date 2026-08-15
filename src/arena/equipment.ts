/**
 * 即時制（Arena）專屬裝備系統（2026-08 重整）——跟回合制的 `equipment.ts`
 * 完全分開：不共用型別、不共用存檔欄位（存在 MetaState.arenaInventory/
 * arenaLoadouts，不是 inventory/loadouts）。
 *
 * 跟回合制那套的核心差異：
 *   - 沒有骰子相關詞綴（沒有 rerollBonus/燃燒層數/點數觸發），全部是直接
 *     的戰鬥數值加成，接到 Arena 既有的執行期欄位（bonusDamage 之外的
 *     hp/def/moveSpeedMult/atkCooldownMult/lifestealPct/extraProjectiles/
 *     pierceBonus）——刻意不給直接傷害加成，太容易失衡。
 *   - 分「通用裝備」（頭/身/手/靴/戒指/飾品，任何英雄都能戴，隨機詞綴）
 *     跟「職業武器」（武器欄位，每個英雄專屬一把，固定詞綴組合＋稀有度
 *     分級，不是隨機生成）兩種，武器另外帶 weaponTag，供 relics.ts 的
 *     `getRandomRelics()` 篩選武器專屬遂物用。
 *   - 沒有套裝效果、沒有強化/重鑄系統，第一版故意保持簡單。
 */
import type { Role } from '../types'

export type ArenaEquipSlot = 'weapon' | 'head' | 'body' | 'hands' | 'boots' | 'ring' | 'accessory'
export type ArenaLoadoutSlot = 'weapon' | 'head' | 'body' | 'hands' | 'boots' | 'ring1' | 'ring2' | 'accessory'
export type ArenaEquipRarity = 'normal' | 'magic' | 'rare' | 'legendary'

export const ARENA_EQUIP_SLOTS: ArenaEquipSlot[] = ['weapon', 'head', 'body', 'hands', 'boots', 'ring', 'accessory']
export const ARENA_LOADOUT_SLOTS: ArenaLoadoutSlot[] = ['weapon', 'head', 'body', 'hands', 'boots', 'ring1', 'ring2', 'accessory']

export const ARENA_RARITY_LABEL: Record<ArenaEquipRarity, string> = {
  normal: '普通', magic: '魔法', rare: '稀有', legendary: '傳說',
}
export const ARENA_RARITY_COLOR: Record<ArenaEquipRarity, string> = {
  normal: '#8090a8', magic: '#6db8ff', rare: '#c79bff', legendary: '#ff9a3c',
}
const RARITY_MULT: Record<ArenaEquipRarity, number> = { normal: 1, magic: 1.5, rare: 2.2, legendary: 3.2 }
const RARITY_ORDER: ArenaEquipRarity[] = ['normal', 'magic', 'rare', 'legendary']

/** 直接接到 Arena 執行期欄位的加成——刻意不含傷害加成。 */
export type ArenaEquipBonus = {
  hpBonus?: number
  defBonus?: number
  moveSpeedPct?: number     // 換算進 moveSpeedMult：1 + moveSpeedPct/100
  atkSpeedPct?: number      // 換算進 atkCooldownMult：1 - atkSpeedPct/100（下限見 clampAtkSpeedMult）
  lifestealPct?: number     // 直接是 0~1 的比例，累加進 lifestealPct
  extraProjectiles?: number
  pierceBonus?: number
}

export interface ArenaEquipment {
  id: string           // 該裝備實例的唯一 id（生成時 nanoid 風格字串）
  defId: string         // 對應下面目錄的 id，通用裝備是 slot 本身，武器是 heroId
  slot: ArenaEquipSlot
  kind: 'universal' | 'class'
  heroRole?: Role        // kind==='class' 時鎖定的職業（只有該職業英雄能裝備）
  name: string
  rarity: ArenaEquipRarity
  bonus: ArenaEquipBonus
  /** 只有武器有：對應 relics.ts 的專屬遂物池 tag。 */
  weaponTag?: string
}

export type ArenaLoadout = Partial<Record<ArenaLoadoutSlot, string | null>>

let idCounter = 0
function newId(): string {
  idCounter += 1
  return `ae_${Date.now().toString(36)}_${idCounter}_${Math.floor(Math.random() * 1e6).toString(36)}`
}

function scaleValue(base: number, rarity: ArenaEquipRarity, round: 'int' | 'pct' = 'int'): number {
  const v = base * RARITY_MULT[rarity]
  return round === 'int' ? Math.max(1, Math.round(v)) : Math.round(v * 10) / 10
}

// ── 通用裝備（頭/身/手/靴/戒指/飾品）─────────────────────────────────────
// 每個部位固定一組「主詞綴 + 副詞綴候選」，稀有度只影響數值大小跟副詞綴
// 是否出現，不是完全隨機亂拼——比純隨機好控管強度，也讓玩家看部位就知道
// 大概會拿到什麼類型的加成。
type UniversalStatKey = keyof ArenaEquipBonus
const UNIVERSAL_SLOT_STATS: Record<Exclude<ArenaEquipSlot, 'weapon'>, { primary: UniversalStatKey; primaryBase: number; secondary: UniversalStatKey; secondaryBase: number }> = {
  head:      { primary: 'defBonus',    primaryBase: 3,    secondary: 'hpBonus',        secondaryBase: 8 },
  body:      { primary: 'hpBonus',     primaryBase: 10,   secondary: 'defBonus',       secondaryBase: 2 },
  hands:     { primary: 'atkSpeedPct', primaryBase: 3,    secondary: 'pierceBonus',    secondaryBase: 0.4 },
  boots:     { primary: 'moveSpeedPct',primaryBase: 4,    secondary: 'hpBonus',        secondaryBase: 6 },
  ring:      { primary: 'lifestealPct',primaryBase: 0.015,secondary: 'atkSpeedPct',    secondaryBase: 2 },
  accessory: { primary: 'extraProjectiles', primaryBase: 0.3, secondary: 'moveSpeedPct', secondaryBase: 2 },
}
const UNIVERSAL_SLOT_NAME: Record<Exclude<ArenaEquipSlot, 'weapon'>, string> = {
  head: '頭盔', body: '護甲', hands: '手套', boots: '靴子', ring: '戒指', accessory: '飾品',
}

function pctRound(key: UniversalStatKey, v: number): number {
  // extraProjectiles/pierceBonus 是整數；lifestealPct 是 0~1 比例維持一位小數；其餘（%/固定值）取整數。
  if (key === 'extraProjectiles' || key === 'pierceBonus') return v >= 1 ? Math.round(v) : (Math.random() < v ? 1 : 0)
  if (key === 'lifestealPct') return Math.round(v * 1000) / 1000
  return Math.round(v)
}

/** 生成一件通用裝備（非武器部位）。rare 以上才會有副詞綴。 */
export function generateUniversalItem(slot: Exclude<ArenaEquipSlot, 'weapon'>, rarity: ArenaEquipRarity): ArenaEquipment {
  const cfg = UNIVERSAL_SLOT_STATS[slot]
  const bonus: ArenaEquipBonus = {}
  const primaryVal = pctRound(cfg.primary, cfg.primaryBase * RARITY_MULT[rarity])
  if (primaryVal > 0) bonus[cfg.primary] = primaryVal
  const hasSecondary = RARITY_ORDER.indexOf(rarity) >= RARITY_ORDER.indexOf('rare')
  if (hasSecondary) {
    const secondaryVal = pctRound(cfg.secondary, cfg.secondaryBase * RARITY_MULT[rarity] * 0.6)
    if (secondaryVal > 0) bonus[cfg.secondary] = secondaryVal
  }
  return {
    id: newId(), defId: slot, slot, kind: 'universal',
    name: `${ARENA_RARITY_LABEL[rarity]}${UNIVERSAL_SLOT_NAME[slot]}`,
    rarity, bonus,
  }
}

// ── 職業武器（每個英雄專屬一把，固定詞綴組合，4 個稀有度分級）───────────
// 武器是固定目錄項目（同一個英雄同一個稀有度永遠是同一組數值），不是隨機
// 生成——`stats` 放連續型數值（hp/def/移速/攻速/吸血，round(base*倍率)
// 就是穩定整數，沒有門檻問題）；`tieredStats` 放彈道/穿透這種整數強屬性，
// 用明確的 rare/legendary 門檻值，不用機率或連續公式硬湊整數。
type WeaponDef = {
  heroId: string; heroRole: Role; name: string
  stats: [UniversalStatKey, number][]
  tieredStats?: [UniversalStatKey, { rare: number; legendary: number }][]
}
const WEAPON_DEFS: WeaponDef[] = [
  { heroId: 'knight',       heroRole: 'slash',  name: '破軍聖劍', stats: [['hpBonus', 14], ['defBonus', 4]] },
  { heroId: 'mage',         heroRole: 'fire',   name: '赤焰法杖', stats: [['atkSpeedPct', 5]],
    tieredStats: [['extraProjectiles', { rare: 1, legendary: 1 }]] },
  { heroId: 'priest',       heroRole: 'holy',   name: '聖光權杖', stats: [['hpBonus', 12], ['lifestealPct', 0.025]] },
  { heroId: 'rogue',        heroRole: 'shadow', name: '夜影匕首', stats: [['atkSpeedPct', 6], ['moveSpeedPct', 4]] },
  { heroId: 'princess',     heroRole: 'ice',    name: '寒霜權杖', stats: [['moveSpeedPct', 4]],
    tieredStats: [['pierceBonus', { rare: 1, legendary: 1 }]] },
  { heroId: 'archer',       heroRole: 'arrow',  name: '疾風之弓', stats: [],
    tieredStats: [['pierceBonus', { rare: 1, legendary: 2 }], ['extraProjectiles', { rare: 0, legendary: 1 }]] },
  { heroId: 'dwarf',        heroRole: 'hammer', name: '山嶽戰錘', stats: [['hpBonus', 16], ['defBonus', 5]] },
  { heroId: 'bard',         heroRole: 'song',   name: '戰歌豎琴', stats: [['lifestealPct', 0.02], ['atkSpeedPct', 4]] },
  { heroId: 'death_knight', heroRole: 'death',  name: '噬魂之刃', stats: [['lifestealPct', 0.03], ['hpBonus', 8]] },
  { heroId: 'engineer',     heroRole: 'gear',   name: '蒸氣火炮', stats: [],
    tieredStats: [['extraProjectiles', { rare: 1, legendary: 1 }], ['pierceBonus', { rare: 0, legendary: 1 }]] },
  { heroId: 'fighter',      heroRole: 'fighter',name: '連拳護手', stats: [['atkSpeedPct', 5], ['moveSpeedPct', 3]] },
]
const WEAPON_DEF_BY_HERO: Record<string, WeaponDef> = Object.fromEntries(WEAPON_DEFS.map(w => [w.heroId, w]))

/** 對應每個英雄武器的專屬遂物池 tag（relics.ts 用）。 */
export function weaponTagForHero(heroId: string): string {
  return `${heroId}_weapon`
}

/** 生成某個英雄的武器（固定詞綴組合，稀有度決定數值大小）。查無此英雄回傳 null。 */
export function generateClassWeapon(heroId: string, rarity: ArenaEquipRarity): ArenaEquipment | null {
  const def = WEAPON_DEF_BY_HERO[heroId]
  if (!def) return null
  const bonus: ArenaEquipBonus = {}
  for (const [key, base] of def.stats) {
    const raw = key === 'lifestealPct' ? base * RARITY_MULT[rarity] : Math.round(base * RARITY_MULT[rarity])
    const v = key === 'lifestealPct' ? Math.round(raw * 1000) / 1000 : raw
    if (v > 0) bonus[key] = v
  }
  for (const [key, tiers] of def.tieredStats ?? []) {
    const v = rarity === 'legendary' ? tiers.legendary : rarity === 'rare' ? tiers.rare : 0
    if (v > 0) bonus[key] = v
  }
  return {
    id: newId(), defId: heroId, slot: 'weapon', kind: 'class', heroRole: def.heroRole,
    name: `${ARENA_RARITY_LABEL[rarity]}${def.name}`,
    rarity, bonus, weaponTag: weaponTagForHero(heroId),
  }
}

export function getWeaponDefForHero(heroId: string): { name: string } | null {
  const def = WEAPON_DEF_BY_HERO[heroId]
  return def ? { name: def.name } : null
}

/** 隨機生成一件裝備掉落（通用機率挑部位+稀有度）；heroId 給定時武器欄位會生成該英雄的專屬武器。 */
export function generateRandomDrop(heroId: string, rarityWeights: [ArenaEquipRarity, number][] = DEFAULT_RARITY_WEIGHTS): ArenaEquipment {
  const rarity = weightedPick(rarityWeights)
  const slot = ARENA_EQUIP_SLOTS[Math.floor(Math.random() * ARENA_EQUIP_SLOTS.length)]
  if (slot === 'weapon') {
    return generateClassWeapon(heroId, rarity) ?? generateUniversalItem('accessory', rarity)
  }
  return generateUniversalItem(slot, rarity)
}

const DEFAULT_RARITY_WEIGHTS: [ArenaEquipRarity, number][] = [
  ['normal', 55], ['magic', 30], ['rare', 12], ['legendary', 3],
]
function weightedPick<T>(weights: [T, number][]): T {
  const total = weights.reduce((s, [, w]) => s + w, 0)
  let roll = Math.random() * total
  for (const [v, w] of weights) {
    if (roll < w) return v
    roll -= w
  }
  return weights[weights.length - 1][0]
}

// ── 抽獎系統（2026-08 裝備系統重整，最重要的特殊裝備取得管道）────────────
// 關卡掉落固定 normal，特殊裝備（magic/rare/legendary）幾乎都要靠抽獎。
// 武器欄位不限定目前選的英雄——11 個英雄的武器都可能抽到，是刻意的：
// 玩家會切換英雄遊玩，抽獎理當幫全部英雄湊裝備，不是只服務當下這一個。
// 原本這裡有一組金幣計價的抽獎（單抽100/十連900），2026-08 改成星界商城的
// 星塵召喚（見下面 summonSingle/summonTen）後移除，避免同一個系統兩種入口
// 兩種計價互相打架。
const GACHA_RARITY_WEIGHTS: [ArenaEquipRarity, number][] = [
  ['normal', 50], ['magic', 32], ['rare', 14], ['legendary', 4],
]

/** forceMinRarity 給值時，若隨機結果比它低就直接改用該檔位（只會往上墊，不會往下蓋）。 */
export function gachaPull(forceMinRarity?: ArenaEquipRarity): ArenaEquipment {
  let rarity = weightedPick(GACHA_RARITY_WEIGHTS)
  if (forceMinRarity && RARITY_ORDER.indexOf(rarity) < RARITY_ORDER.indexOf(forceMinRarity)) {
    rarity = forceMinRarity
  }
  const slot = ARENA_EQUIP_SLOTS[Math.floor(Math.random() * ARENA_EQUIP_SLOTS.length)]
  if (slot === 'weapon') {
    const randomHeroId = WEAPON_DEFS[Math.floor(Math.random() * WEAPON_DEFS.length)].heroId
    return generateClassWeapon(randomHeroId, rarity) ?? generateUniversalItem('accessory', rarity)
  }
  return generateUniversalItem(slot, rarity)
}

// ── 星界商城「裝備召喚」（2026-08）：跟上面的金幣抽獎共用 gachaPull()，
// 星塵計價，額外疊加兩層保底——累積抽數保底（40 抽必出橙裝，橫跨單抽/十連
// 累計）跟十連保底（每次十連保證至少一件紫裝以上，不夠格時直接把第十抽墊
// 到保底門檻，不額外多開第十一件）。pity 計數存在 MetaState.arenaGachaPityCount。
export const SUMMON_SINGLE_COST_STARDUST = 200
export const SUMMON_TEN_COST_STARDUST = 1800 // 比單抽 ×10 便宜 10%
export const SUMMON_TEN_GUARANTEE_RARITY: ArenaEquipRarity = 'rare'
export const SUMMON_PITY_THRESHOLD = 40
export const SUMMON_PITY_RARITY: ArenaEquipRarity = 'legendary'

function meetsRarityFloor(rarity: ArenaEquipRarity, floor: ArenaEquipRarity): boolean {
  return RARITY_ORDER.indexOf(rarity) >= RARITY_ORDER.indexOf(floor)
}

/** 單抽版本：pityCountBefore 是抽這次之前的累積抽數。 */
export function summonSingle(pityCountBefore: number): { item: ArenaEquipment; pityCountAfter: number } {
  const reachedPity = pityCountBefore + 1 >= SUMMON_PITY_THRESHOLD
  const item = gachaPull(reachedPity ? SUMMON_PITY_RARITY : undefined)
  const pityCountAfter = meetsRarityFloor(item.rarity, SUMMON_PITY_RARITY) ? 0 : pityCountBefore + 1
  return { item, pityCountAfter }
}

/** 十連版本：逐抽模擬（不是十抽完再統一判斷），保底結果直接墊在第十抽。 */
export function summonTen(pityCountBefore: number): { items: ArenaEquipment[]; pityCountAfter: number } {
  const items: ArenaEquipment[] = []
  let pity = pityCountBefore
  for (let i = 0; i < 10; i++) {
    const reachedPity = pity + 1 >= SUMMON_PITY_THRESHOLD
    let forceMin: ArenaEquipRarity | undefined = reachedPity ? SUMMON_PITY_RARITY : undefined
    const isLastPull = i === 9
    const alreadyHasGuarantee = items.some(it => meetsRarityFloor(it.rarity, SUMMON_TEN_GUARANTEE_RARITY))
    if (isLastPull && !alreadyHasGuarantee && !forceMin) forceMin = SUMMON_TEN_GUARANTEE_RARITY
    const item = gachaPull(forceMin)
    pity = meetsRarityFloor(item.rarity, SUMMON_PITY_RARITY) ? 0 : pity + 1
    items.push(item)
  }
  return { items, pityCountAfter: pity }
}

// ── 加成加總 + 套用進 ArenaConfig ────────────────────────────────────────
export type ArenaEquipBonusTotal = {
  hpBonus: number
  defBonus: number
  moveSpeedMult: number     // 直接是乘數（1 + 加總%/100）
  atkCooldownMult: number   // 直接是乘數（1 - 加總%/100，有下限）
  lifestealPct: number
  extraProjectiles: number
  pierceBonus: number
}

const MIN_ATK_COOLDOWN_MULT = 0.55 // 攻速加成上限，避免疊到冷卻幾乎歸零
const MAX_DEF_DAMAGE_REDUCTION_PCT = 0.25 // 裝備防禦轉減傷的上限，留空間給天賦減傷疊加不會失控

/** 裝備 defBonus 轉成 Arena 傷害公式看得懂的減傷比例——Arena 沒有傳統
 *  「防禦力」數值運算，用跟 talentDamageReductionPct 同一種百分比疊加。
 *  UI 顯示仍然用原始 defBonus（比較直覺），只有實際套用到戰鬥時才轉換。 */
export function defBonusToDamageReductionPct(defBonus: number): number {
  return Math.min(MAX_DEF_DAMAGE_REDUCTION_PCT, Math.max(0, defBonus) * 0.008)
}

export function computeArenaEquipBonus(items: ArenaEquipment[]): ArenaEquipBonusTotal {
  let hpBonus = 0, defBonus = 0, moveSpeedPct = 0, atkSpeedPct = 0, lifestealPct = 0, extraProjectiles = 0, pierceBonus = 0
  for (const item of items) {
    hpBonus += item.bonus.hpBonus ?? 0
    defBonus += item.bonus.defBonus ?? 0
    moveSpeedPct += item.bonus.moveSpeedPct ?? 0
    atkSpeedPct += item.bonus.atkSpeedPct ?? 0
    lifestealPct += item.bonus.lifestealPct ?? 0
    extraProjectiles += item.bonus.extraProjectiles ?? 0
    pierceBonus += item.bonus.pierceBonus ?? 0
  }
  return {
    hpBonus, defBonus,
    moveSpeedMult: 1 + moveSpeedPct / 100,
    atkCooldownMult: Math.max(MIN_ATK_COOLDOWN_MULT, 1 - atkSpeedPct / 100),
    lifestealPct,
    extraProjectiles: Math.round(extraProjectiles),
    pierceBonus: Math.round(pierceBonus),
  }
}

/** 依 loadout 從 inventory 取出實際裝備的物品（跟回合制 getEquippedItems 同邏輯，型別不同）。 */
export function getEquippedArenaItems(inventory: ArenaEquipment[], loadout?: ArenaLoadout): ArenaEquipment[] {
  if (!loadout) return []
  const byId = new Map(inventory.map(i => [i.id, i]))
  return ARENA_LOADOUT_SLOTS
    .map(slot => loadout[slot])
    .filter((id): id is string => !!id)
    .map(id => byId.get(id))
    .filter((i): i is ArenaEquipment => !!i)
}

/** 目前裝備的武器（若有）——供 App.tsx 把 weaponTag 傳進 getRandomRelics()。 */
export function getEquippedWeapon(inventory: ArenaEquipment[], loadout?: ArenaLoadout): ArenaEquipment | undefined {
  const weaponId = loadout?.weapon
  if (!weaponId) return undefined
  return inventory.find(i => i.id === weaponId && i.slot === 'weapon')
}
