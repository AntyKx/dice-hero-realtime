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
  // ── 職業裝備專屬特效（2026-08 職業裝備重製，見 CLASS_FLAVOR_STAT）：只有
  // kind==='class' 的非武器部位會帶，全部是 0~1 的比例，累加寫法跟
  // lifestealPct 完全一樣。 ──
  thornsPct?: number             // 聖騎士：受擊反傷
  burnChancePct?: number         // 火焰法師：攻擊命中機率灼燒
  shieldRegenPct?: number        // 神官祭司：護盾回充速度加成
  critChancePct?: number         // 影刃刺客：暴擊率
  freezeChancePct?: number       // 皇家公主：攻擊命中機率凍結
  markDamageBonusPct?: number    // 遊俠獵人：對滿血目標（首擊）加傷
  extraDamageReductionPct?: number // 矮人戰士：額外固定減傷
  slowAuraPct?: number           // 吟遊詩人：周圍敵人減速光環
  executeBonusPct?: number       // 死亡騎士：對低血量目標加傷
  overloadOnKillPct?: number     // 機關技師：擊殺後短暫攻速加成
  comboAtkSpeedPct?: number      // 武鬥家：連續命中攻速遞增（每層）
}

export interface ArenaEquipment {
  id: string           // 該裝備實例的唯一 id（生成時 nanoid 風格字串）
  defId: string         // 對應下面目錄的 id，通用裝備是 slot 本身，武器是 weaponId，職業防具是 `${slot}_${heroRole}`
  slot: ArenaEquipSlot
  kind: 'universal' | 'class'
  heroRole?: Role        // kind==='class' 時鎖定的職業（只有該職業英雄能裝備）
  name: string
  rarity: ArenaEquipRarity
  bonus: ArenaEquipBonus
  /** 只有武器有：對應 relics.ts 的專屬遂物池 tag。 */
  weaponTag?: string
  /** 只有武器有：武器類型 id（如 'sword'/'greatsword'），決定必殺技招式，見 skills/{heroId}.ts。 */
  weaponType?: string
  /** 只有武器有：必殺技演出用招式名稱，取代預設的 hero.skill。 */
  ultimateSkillName?: string
  /** 強化等級（2026-08 倉庫重製，見 ENHANCE_MAX_LEVEL/getEffectiveBonus）。
   *  undefined 視同 0，不強制每個舊物品都補這個欄位。 */
  enhanceLevel?: number
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
/** 通用裝備正式名稱（2026-08 命名更新，取代原本純部位字樣「頭盔」「護甲」）。 */
export const UNIVERSAL_SLOT_NAME: Record<Exclude<ArenaEquipSlot, 'weapon'>, string> = {
  head: '縛風兜帽', body: '精鋼胸甲', hands: '靈巧手甲', boots: '輕捷戰靴', ring: '微光指環', accessory: '護身墜飾',
}

// 職業特效欄位（thornsPct/burnChancePct/... 全部是 0~1 比例），跟 lifestealPct
// 用同一種捨入規則——比整數% 精細，機率型數值需要小數才有意義。
const RATIO_KEYS = new Set<UniversalStatKey>([
  'lifestealPct', 'thornsPct', 'burnChancePct', 'shieldRegenPct', 'critChancePct',
  'freezeChancePct', 'markDamageBonusPct', 'extraDamageReductionPct', 'slowAuraPct',
  'executeBonusPct', 'overloadOnKillPct', 'comboAtkSpeedPct',
])
function pctRound(key: UniversalStatKey, v: number): number {
  // extraProjectiles/pierceBonus 是整數；比例型欄位維持三位小數；其餘（%/固定值）取整數。
  if (key === 'extraProjectiles' || key === 'pierceBonus') return v >= 1 ? Math.round(v) : (Math.random() < v ? 1 : 0)
  if (RATIO_KEYS.has(key)) return Math.round(v * 1000) / 1000
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

// ── 職業武器（每個英雄 2 種武器類型，固定詞綴組合，4 個稀有度分級）───────
// 武器是固定目錄項目（同一把武器同一個稀有度永遠是同一組數值），不是隨機
// 生成——`stats` 放連續型數值（hp/def/移速/攻速/吸血，round(base*倍率)
// 就是穩定整數，沒有門檻問題）；`tieredStats` 放彈道/穿透這種整數強屬性，
// 用明確的 rare/legendary 門檻值，不用機率或連續公式硬湊整數。
//
// 每個英雄「武器 A」是這系統原本就有的那把（2026-08 職業裝備重製時新增
// 武器 B 才拆出這個概念）——weaponId 刻意維持等於 heroId 本身（例如
// 'knight'），不能改，因為玩家現有存檔裡的武器就是靠這個 id 對應定義；
// 武器 B 一律用新的 weaponId（如 'knight_greatsword'）。武器類型
// （weaponType）決定必殺技招式差異，見 ArenaGame.ts 的 applyUltimateDamage()
// 跟對應的 skills/{heroId}.ts。
type WeaponDef = {
  weaponId: string; heroId: string; heroRole: Role; weaponType: string
  name: string; ultimateSkillName: string
  stats: [UniversalStatKey, number][]
  tieredStats?: [UniversalStatKey, { rare: number; legendary: number }][]
}
const WEAPON_DEFS: WeaponDef[] = [
  { weaponId: 'knight', heroId: 'knight', heroRole: 'slash', weaponType: 'sword',
    name: '破軍聖劍', ultimateSkillName: '聖盾破軍斬', stats: [['hpBonus', 14], ['defBonus', 4]] },
  { weaponId: 'knight_greatsword', heroId: 'knight', heroRole: 'slash', weaponType: 'greatsword',
    name: '裂地雙手劍', ultimateSkillName: '裂地萬鈞擊', stats: [['hpBonus', 20], ['defBonus', 6]],
    tieredStats: [['pierceBonus', { rare: 1, legendary: 2 }]] },

  { weaponId: 'mage', heroId: 'mage', heroRole: 'fire', weaponType: 'staff',
    name: '赤焰法杖', ultimateSkillName: '烈焰隕星', stats: [['atkSpeedPct', 5]],
    tieredStats: [['extraProjectiles', { rare: 1, legendary: 1 }]] },
  { weaponId: 'mage_grimoire', heroId: 'mage', heroRole: 'fire', weaponType: 'grimoire',
    name: '業火魔典', ultimateSkillName: '業火燎原', stats: [['hpBonus', 10]],
    tieredStats: [['extraProjectiles', { rare: 1, legendary: 2 }]] },

  { weaponId: 'priest', heroId: 'priest', heroRole: 'holy', weaponType: 'scepter',
    name: '聖光權杖', ultimateSkillName: '光輪祝禱', stats: [['hpBonus', 12], ['lifestealPct', 0.025]] },
  { weaponId: 'priest_holy_tome', heroId: 'priest', heroRole: 'holy', weaponType: 'holy_tome',
    name: '聖徽法典', ultimateSkillName: '聖光庇護結界', stats: [['defBonus', 8], ['hpBonus', 6]] },

  { weaponId: 'rogue', heroId: 'rogue', heroRole: 'shadow', weaponType: 'dagger',
    name: '夜影匕首', ultimateSkillName: '暗影連襲', stats: [['atkSpeedPct', 6], ['moveSpeedPct', 4]] },
  { weaponId: 'rogue_dual_daggers', heroId: 'rogue', heroRole: 'shadow', weaponType: 'dual_daggers',
    name: '雙月魅影匕', ultimateSkillName: '千刃亂舞', stats: [['atkSpeedPct', 8]],
    tieredStats: [['extraProjectiles', { rare: 1, legendary: 1 }]] },

  { weaponId: 'princess', heroId: 'princess', heroRole: 'ice', weaponType: 'frost_scepter',
    name: '寒霜權杖', ultimateSkillName: '皇家冰晶陣', stats: [['moveSpeedPct', 4]],
    tieredStats: [['pierceBonus', { rare: 1, legendary: 1 }]] },
  { weaponId: 'princess_ice_staff', heroId: 'princess', heroRole: 'ice', weaponType: 'ice_staff',
    name: '永冬冰晶杖', ultimateSkillName: '極寒凍界', stats: [['defBonus', 4], ['hpBonus', 6]],
    tieredStats: [['extraProjectiles', { rare: 0, legendary: 1 }]] },

  { weaponId: 'archer', heroId: 'archer', heroRole: 'arrow', weaponType: 'longbow',
    name: '疾風之弓', ultimateSkillName: '疾風箭雨', stats: [],
    tieredStats: [['pierceBonus', { rare: 1, legendary: 2 }], ['extraProjectiles', { rare: 0, legendary: 1 }]] },
  { weaponId: 'archer_crossbow', heroId: 'archer', heroRole: 'arrow', weaponType: 'crossbow',
    name: '追魂連弩', ultimateSkillName: '追魂連弩擊', stats: [['atkSpeedPct', 6]],
    tieredStats: [['extraProjectiles', { rare: 1, legendary: 2 }]] },

  { weaponId: 'dwarf', heroId: 'dwarf', heroRole: 'hammer', weaponType: 'warhammer',
    name: '山嶽戰錘', ultimateSkillName: '震地戰錘', stats: [['hpBonus', 16], ['defBonus', 5]] },
  { weaponId: 'dwarf_twin_axes', heroId: 'dwarf', heroRole: 'hammer', weaponType: 'twin_axes',
    name: '雙頭巨斧', ultimateSkillName: '旋風劈斬', stats: [['atkSpeedPct', 5], ['hpBonus', 8]],
    tieredStats: [['pierceBonus', { rare: 1, legendary: 1 }]] },

  { weaponId: 'bard', heroId: 'bard', heroRole: 'song', weaponType: 'harp',
    name: '戰歌豎琴', ultimateSkillName: '戰歌奏鳴', stats: [['lifestealPct', 0.02], ['atkSpeedPct', 4]] },
  { weaponId: 'bard_lute', heroId: 'bard', heroRole: 'song', weaponType: 'lute',
    name: '悲鳴魯特琴', ultimateSkillName: '悲鳴輓歌', stats: [['atkSpeedPct', 5], ['moveSpeedPct', 3]],
    tieredStats: [['pierceBonus', { rare: 0, legendary: 1 }]] },

  { weaponId: 'death_knight', heroId: 'death_knight', heroRole: 'death', weaponType: 'runeblade',
    name: '噬魂之刃', ultimateSkillName: '噬魂斬', stats: [['lifestealPct', 0.03], ['hpBonus', 8]] },
  { weaponId: 'death_knight_scythe', heroId: 'death_knight', heroRole: 'death', weaponType: 'scythe',
    name: '死亡鐮刀', ultimateSkillName: '死亡收割', stats: [['atkSpeedPct', 5]],
    tieredStats: [['pierceBonus', { rare: 1, legendary: 2 }]] },

  { weaponId: 'engineer', heroId: 'engineer', heroRole: 'gear', weaponType: 'cannon',
    name: '蒸氣火炮', ultimateSkillName: '蒸氣砲擊', stats: [],
    tieredStats: [['extraProjectiles', { rare: 1, legendary: 1 }], ['pierceBonus', { rare: 0, legendary: 1 }]] },
  { weaponId: 'engineer_gatling', heroId: 'engineer', heroRole: 'gear', weaponType: 'gatling',
    name: '齒輪連射槍', ultimateSkillName: '彈幕掃射', stats: [['atkSpeedPct', 6]],
    tieredStats: [['extraProjectiles', { rare: 1, legendary: 2 }]] },

  { weaponId: 'fighter', heroId: 'fighter', heroRole: 'fighter', weaponType: 'gauntlets',
    name: '連拳護手', ultimateSkillName: '真氣運轉', stats: [['atkSpeedPct', 5], ['moveSpeedPct', 3]] },
  { weaponId: 'fighter_spirit_wraps', heroId: 'fighter', heroRole: 'fighter', weaponType: 'spirit_wraps',
    name: '縛靈拳甲', ultimateSkillName: '縛靈爆裂拳', stats: [['hpBonus', 10], ['atkSpeedPct', 3]],
    tieredStats: [['pierceBonus', { rare: 0, legendary: 1 }]] },
]
const WEAPON_DEF_BY_ID: Record<string, WeaponDef> = Object.fromEntries(WEAPON_DEFS.map(w => [w.weaponId, w]))

export const WEAPON_TYPE_LABEL: Record<string, string> = {
  sword: '劍', greatsword: '雙手劍', staff: '法杖', grimoire: '魔典',
  scepter: '權杖', holy_tome: '聖典', dagger: '匕首', dual_daggers: '雙匕首',
  frost_scepter: '權杖', ice_staff: '冰晶杖', longbow: '長弓', crossbow: '連弩',
  warhammer: '戰錘', twin_axes: '雙斧', harp: '豎琴', lute: '魯特琴',
  runeblade: '闇刃', scythe: '鐮刀', cannon: '火炮', gatling: '連射槍',
  gauntlets: '護手', spirit_wraps: '拳甲',
}

/** 對應每個英雄武器的專屬遂物池 tag（relics.ts 用）——維持英雄範圍，不細分武器類型。 */
export function weaponTagForHero(heroId: string): string {
  return `${heroId}_weapon`
}

/** 生成某把武器（固定詞綴組合，稀有度決定數值大小）。weaponId 省略時在該英雄可用的武器裡隨機挑一把。查無此英雄回傳 null。 */
export function generateClassWeapon(heroId: string, rarity: ArenaEquipRarity, weaponId?: string): ArenaEquipment | null {
  const candidates = weaponId ? [WEAPON_DEF_BY_ID[weaponId]].filter((d): d is WeaponDef => !!d) : WEAPON_DEFS.filter(w => w.heroId === heroId)
  if (candidates.length === 0) return null
  const def = candidates[Math.floor(Math.random() * candidates.length)]
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
    id: newId(), defId: def.weaponId, slot: 'weapon', kind: 'class', heroRole: def.heroRole,
    name: `${ARENA_RARITY_LABEL[rarity]}${def.name}`,
    rarity, bonus, weaponTag: weaponTagForHero(heroId),
    weaponType: def.weaponType, ultimateSkillName: def.ultimateSkillName,
  }
}

/** 該英雄可用的全部武器定義（裝備頁選擇器／召喚結果用）。 */
export function getWeaponDefsForHero(heroId: string): { weaponId: string; weaponType: string; name: string; ultimateSkillName: string }[] {
  return WEAPON_DEFS.filter(w => w.heroId === heroId)
    .map(({ weaponId, weaponType, name, ultimateSkillName }) => ({ weaponId, weaponType, name, ultimateSkillName }))
}

// ── 職業防具（頭/身/手/靴/戒指/飾品的職業鎖定版本，2026-08 職業裝備重製）──
// 主屬性跟通用裝備同一部位完全一樣（維持部位的屬性識別），副屬性固定換成
// 該職業的專屬特效（不像通用裝備要 rare 以上才有副屬性——職業裝備的識別
// 特徵本來就該一直在，這樣玩家選職業裝備不是「更強」而是「更專精」）。
export const CLASS_FLAVOR_STAT: Record<Role, { key: UniversalStatKey; label: string; base: number }> = {
  slash:   { key: 'thornsPct',             label: '荊棘反傷', base: 0.04 },
  fire:    { key: 'burnChancePct',         label: '灼燒觸發', base: 0.08 },
  holy:    { key: 'shieldRegenPct',        label: '護盾回復', base: 0.10 },
  shadow:  { key: 'critChancePct',         label: '暴擊率',   base: 0.06 },
  ice:     { key: 'freezeChancePct',       label: '凍結觸發', base: 0.06 },
  arrow:   { key: 'markDamageBonusPct',    label: '首擊加成', base: 0.10 },
  hammer:  { key: 'extraDamageReductionPct', label: '額外減傷', base: 0.03 },
  song:    { key: 'slowAuraPct',           label: '減速光環', base: 0.08 },
  death:   { key: 'executeBonusPct',       label: '處決加成', base: 0.15 },
  gear:    { key: 'overloadOnKillPct',     label: '過載連擊', base: 0.15 },
  fighter: { key: 'comboAtkSpeedPct',      label: '連擊蓄力', base: 0.02 },
  beast:   { key: 'thornsPct',             label: '荊棘反傷', base: 0.04 }, // 目前沒有英雄用這個 role，佔位避免 Record 缺 key
}

/** 職業防具正式名稱（2026-08 命名更新）：每個職業固定用同一個「稱號」（沿用該
 *  職業武器名稱裡已經有的稱號字，如騎士的「破軍」、法師的「業火」）貫穿 6 個
 *  部位，同職業裝備一眼就看得出是同一套，取代原本「部位＋職業特效」的功能性
 *  命名（那個描述留在 formatBonus() 顯示的詞綴列表裡就夠了，不用塞進名字）。 */
export const CLASS_ARMOR_NAME: Record<Role, Record<Exclude<ArenaEquipSlot, 'weapon'>, string>> = {
  slash:   { head: '破軍兜鍪',   body: '破軍戰甲', hands: '破軍護手', boots: '破軍戰靴', ring: '破軍誓戒', accessory: '破軍徽記' },
  fire:    { head: '業火兜帽',   body: '業火法袍', hands: '業火護腕', boots: '業火靴',   ring: '業火戒',   accessory: '業火墜飾' },
  holy:    { head: '聖光寶冠',   body: '聖光聖袍', hands: '聖光護腕', boots: '聖光長靴', ring: '聖光聖戒', accessory: '聖光徽印' },
  shadow:  { head: '夜影兜帽',   body: '夜影勁裝', hands: '夜影手甲', boots: '夜影軟靴', ring: '夜影戒',   accessory: '夜影徽' },
  ice:     { head: '永冬冰冠',   body: '永冬冰袍', hands: '永冬手套', boots: '永冬舞靴', ring: '永冬戒',   accessory: '永冬墜' },
  arrow:   { head: '疾風兜帽',   body: '疾風皮甲', hands: '疾風護指', boots: '疾風獵靴', ring: '疾風戒',   accessory: '疾風徽' },
  hammer:  { head: '山嶽鐵盔',   body: '山嶽重甲', hands: '山嶽拳套', boots: '山嶽戰靴', ring: '山嶽戒',   accessory: '山嶽徽記' },
  song:    { head: '戰歌羽冠',   body: '戰歌戰袍', hands: '戰歌護指', boots: '戰歌舞靴', ring: '戰歌戒',   accessory: '戰歌徽' },
  death:   { head: '噬魂兜鍪',   body: '噬魂甲冑', hands: '噬魂護手', boots: '噬魂戰靴', ring: '噬魂戒',   accessory: '噬魂徽' },
  gear:    { head: '齒輪護目盔', body: '齒輪鎧甲', hands: '齒輪手套', boots: '齒輪戰靴', ring: '齒輪戒',   accessory: '齒輪徽' },
  fighter: { head: '真氣頭帶',   body: '真氣勁裝', hands: '真氣拳套', boots: '真氣戰靴', ring: '真氣戒',   accessory: '真氣徽' },
  // 目前沒有英雄用這個 role，佔位避免 Record 缺 key（同 CLASS_FLAVOR_STAT 的處理方式）。
  beast:   { head: '荒獸兜帽',   body: '荒獸皮甲', hands: '荒獸爪套', boots: '荒獸獵靴', ring: '荒獸戒',   accessory: '荒獸徽' },
}

/** 生成一件職業防具（非武器部位，heroRole 鎖定）。主屬性同通用裝備，副屬性固定是該職業的專屬特效。 */
export function generateClassArmorItem(slot: Exclude<ArenaEquipSlot, 'weapon'>, rarity: ArenaEquipRarity, heroRole: Role): ArenaEquipment {
  const cfg = UNIVERSAL_SLOT_STATS[slot]
  const flavor = CLASS_FLAVOR_STAT[heroRole]
  const bonus: ArenaEquipBonus = {}
  const primaryVal = pctRound(cfg.primary, cfg.primaryBase * RARITY_MULT[rarity])
  if (primaryVal > 0) bonus[cfg.primary] = primaryVal
  const flavorVal = pctRound(flavor.key, flavor.base * RARITY_MULT[rarity] * 0.6)
  if (flavorVal > 0) bonus[flavor.key] = flavorVal
  return {
    id: newId(), defId: `${slot}_${heroRole}`, slot, kind: 'class', heroRole,
    name: `${ARENA_RARITY_LABEL[rarity]}${CLASS_ARMOR_NAME[heroRole][slot]}`,
    rarity, bonus,
  }
}

const CLASS_ARMOR_DROP_CHANCE = 0.4 // 非武器欄位掉落時，有多少機率是職業防具而不是通用裝備

/** 隨機生成一件裝備掉落（通用機率挑部位+稀有度）；heroId 給定時武器欄位會生成該英雄的專屬武器（兩種類型隨機挑一把）。 */
export function generateRandomDrop(heroId: string, rarityWeights: [ArenaEquipRarity, number][] = DEFAULT_RARITY_WEIGHTS): ArenaEquipment {
  const rarity = weightedPick(rarityWeights)
  const slot = ARENA_EQUIP_SLOTS[Math.floor(Math.random() * ARENA_EQUIP_SLOTS.length)]
  if (slot === 'weapon') {
    return generateClassWeapon(heroId, rarity) ?? generateUniversalItem('accessory', rarity)
  }
  const heroRole = WEAPON_DEFS.find(w => w.heroId === heroId)?.heroRole
  if (heroRole && Math.random() < CLASS_ARMOR_DROP_CHANCE) {
    return generateClassArmorItem(slot, rarity, heroRole)
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
    const randomDef = WEAPON_DEFS[Math.floor(Math.random() * WEAPON_DEFS.length)]
    return generateClassWeapon(randomDef.heroId, rarity, randomDef.weaponId) ?? generateUniversalItem('accessory', rarity)
  }
  if (Math.random() < CLASS_ARMOR_DROP_CHANCE) {
    const randomRole = WEAPON_DEFS[Math.floor(Math.random() * WEAPON_DEFS.length)].heroRole
    return generateClassArmorItem(slot, rarity, randomRole)
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
  // ── 職業裝備專屬特效加總，全部直接對應 ArenaEquipBonus 同名欄位，單純加總 ──
  thornsPct: number
  burnChancePct: number
  shieldRegenPct: number
  critChancePct: number
  freezeChancePct: number
  markDamageBonusPct: number
  extraDamageReductionPct: number
  slowAuraPct: number
  executeBonusPct: number
  overloadOnKillPct: number
  comboAtkSpeedPct: number
}

const FLAVOR_STAT_KEYS = [
  'thornsPct', 'burnChancePct', 'shieldRegenPct', 'critChancePct', 'freezeChancePct',
  'markDamageBonusPct', 'extraDamageReductionPct', 'slowAuraPct', 'executeBonusPct',
  'overloadOnKillPct', 'comboAtkSpeedPct',
] as const

const MIN_ATK_COOLDOWN_MULT = 0.55 // 攻速加成上限，避免疊到冷卻幾乎歸零
const MAX_DEF_DAMAGE_REDUCTION_PCT = 0.25 // 裝備防禦轉減傷的上限，留空間給天賦減傷疊加不會失控

/** 裝備 defBonus 轉成 Arena 傷害公式看得懂的減傷比例——Arena 沒有傳統
 *  「防禦力」數值運算，用跟 talentDamageReductionPct 同一種百分比疊加。
 *  UI 顯示仍然用原始 defBonus（比較直覺），只有實際套用到戰鬥時才轉換。 */
export function defBonusToDamageReductionPct(defBonus: number): number {
  return Math.min(MAX_DEF_DAMAGE_REDUCTION_PCT, Math.max(0, defBonus) * 0.008)
}

// ── 裝備強化（2026-08 倉庫重製）：小幅連續成長，花強化石＋金幣，讓一件裝備
// 現有的所有數值一起等比例放大，不改變裝備的「身份」（部位/職業鎖定/武器
// 類型都不動）。 ──
export const ENHANCE_MAX_LEVEL = 10
export const ENHANCE_BONUS_PER_LEVEL = 0.05 // 每級 +5%，封頂 10 級 = +50%

export function enhanceCost(level: number): { stones: number; gold: number } {
  return { stones: (level + 1) * 8, gold: (level + 1) * 200 }
}

/** 強化一級（呼叫端負責檢查等級上限＋扣資源＋寫回 arenaInventory）。 */
export function applyEnhance(item: ArenaEquipment): ArenaEquipment {
  return { ...item, enhanceLevel: Math.min(ENHANCE_MAX_LEVEL, (item.enhanceLevel ?? 0) + 1) }
}

function scaleBonusValue(key: UniversalStatKey, v: number): number {
  // 跟 pctRound() 的差異：這裡是「已存在的數值」乘上強化倍率，用穩定四捨
  // 五入，不能用 pctRound 那種機率捨入（每次渲染呼叫都會抽一次籤，數字
  // 會一直閃爍）。
  if (key === 'extraProjectiles' || key === 'pierceBonus') return Math.round(v)
  if (RATIO_KEYS.has(key)) return Math.round(v * 1000) / 1000
  return Math.round(v)
}

/** 套用強化加成後的實際數值——UI 顯示跟 computeArenaEquipBonus() 加總都要走
 *  這個函式，不要直接讀 item.bonus 原始值（那是強化前的基礎值）。 */
export function getEffectiveBonus(item: ArenaEquipment): ArenaEquipBonus {
  const level = item.enhanceLevel ?? 0
  if (level <= 0) return item.bonus
  const mult = 1 + level * ENHANCE_BONUS_PER_LEVEL
  const result: ArenaEquipBonus = {}
  for (const [key, value] of Object.entries(item.bonus) as [UniversalStatKey, number | undefined][]) {
    if (value == null) continue
    result[key] = scaleBonusValue(key, value * mult)
  }
  return result
}

export function computeArenaEquipBonus(items: ArenaEquipment[]): ArenaEquipBonusTotal {
  let hpBonus = 0, defBonus = 0, moveSpeedPct = 0, atkSpeedPct = 0, lifestealPct = 0, extraProjectiles = 0, pierceBonus = 0
  const flavor = Object.fromEntries(FLAVOR_STAT_KEYS.map(k => [k, 0])) as Record<typeof FLAVOR_STAT_KEYS[number], number>
  for (const item of items) {
    const bonus = getEffectiveBonus(item)
    hpBonus += bonus.hpBonus ?? 0
    defBonus += bonus.defBonus ?? 0
    moveSpeedPct += bonus.moveSpeedPct ?? 0
    atkSpeedPct += bonus.atkSpeedPct ?? 0
    lifestealPct += bonus.lifestealPct ?? 0
    extraProjectiles += bonus.extraProjectiles ?? 0
    pierceBonus += bonus.pierceBonus ?? 0
    for (const key of FLAVOR_STAT_KEYS) flavor[key] += bonus[key] ?? 0
  }
  return {
    hpBonus, defBonus,
    moveSpeedMult: 1 + moveSpeedPct / 100,
    atkCooldownMult: Math.max(MIN_ATK_COOLDOWN_MULT, 1 - atkSpeedPct / 100),
    lifestealPct,
    extraProjectiles: Math.round(extraProjectiles),
    pierceBonus: Math.round(pierceBonus),
    ...flavor,
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

// ── 裝備分解（2026-08 倉庫重製）：把不要的裝備換成強化石／合成材料。只有
// rare/legendary 才出合成材料——分解好裝備才有機會拿到稀有材料，呼應「分解
// 後的碎片」這個取得管道要有一定門檻，不是隨便一件都出。 ──
export const SALVAGE_TABLE: Record<ArenaEquipRarity, { stones: number; material: number }> = {
  normal: { stones: 2, material: 0 },
  magic: { stones: 5, material: 0 },
  rare: { stones: 12, material: 1 },
  legendary: { stones: 30, material: 3 },
}

export function salvageArenaEquipment(item: ArenaEquipment): { enhanceStones: number; synthesisMaterial: number } {
  const t = SALVAGE_TABLE[item.rarity]
  return { enhanceStones: t.stones, synthesisMaterial: t.material }
}

// ── 裝備合成（2026-08 倉庫重製）：花合成材料＋金幣把裝備的稀有度直接跳一
// 階，數值依新稀有度重新套用既有的生成公式（保留原本的部位/職業鎖定/武器
// 類型身份，只換數值＋稀有度標籤），不做「消耗祭品裝備」這種額外揀選 UI。
// legendary 已經是頂級，不能再合成。 ──
export const SYNTHESIS_COST: Partial<Record<ArenaEquipRarity, { material: number; gold: number }>> = {
  normal: { material: 1, gold: 100 },
  magic: { material: 3, gold: 400 },
  rare: { material: 6, gold: 1200 },
}
const RARITY_NEXT: Partial<Record<ArenaEquipRarity, ArenaEquipRarity>> = {
  normal: 'magic', magic: 'rare', rare: 'legendary',
}

/** 稀有度跳一階，保留原本的 id（loadout/inventory 位置不變）跟已投入的強化等級。查無下一階（legendary）回 null。 */
export function synthesizeUpgrade(item: ArenaEquipment): ArenaEquipment | null {
  const nextRarity = RARITY_NEXT[item.rarity]
  if (!nextRarity) return null
  let regenerated: ArenaEquipment | null = null
  if (item.slot === 'weapon') {
    const def = WEAPON_DEFS.find(w => w.weaponId === item.defId)
    regenerated = def ? generateClassWeapon(def.heroId, nextRarity, def.weaponId) : null
  } else if (item.kind === 'class' && item.heroRole) {
    regenerated = generateClassArmorItem(item.slot, nextRarity, item.heroRole)
  } else {
    regenerated = generateUniversalItem(item.slot, nextRarity)
  }
  if (!regenerated) return null
  return { ...regenerated, id: item.id, enhanceLevel: item.enhanceLevel }
}
