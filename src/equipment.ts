import type {
  Equipment, EquipmentSlot, EquipmentRarity, Affix, AffixId,
  LegendaryEffectId, HeroLoadout, LoadoutSlot, Role, SetId,
} from './types'

// ── Role labels ───────────────────────────────────────────────────────────
export const ROLE_LABEL: Record<Role, string> = {
  slash: '聖騎士', fire: '火焰法師', holy: '神官祭司', shadow: '影刃刺客',
  ice: '皇家公主', arrow: '遊俠獵人', hammer: '矮人戰士',
  song: '吟遊詩人', beast: '獸語馴獸師', gear: '機關技師', fighter: '武鬥家',
  death: '死亡騎士', // 2026-08 取代訓獸師；死亡騎士的裝備套裝/傳奇效果沿用舊回合制的死代碼路徑，未特別設計，先給預設值讓型別過關
}

// ── Salvage values ────────────────────────────────────────────────────────
export const SALVAGE_VALUE: Record<EquipmentRarity, number> = {
  normal: 10, magic: 35, rare: 90, legendary: 220,
}

// ── Affix value ranges [min, max] per rarity ──────────────────────────────
const AFFIX_RANGES: Record<AffixId, Record<'magic' | 'rare' | 'legendary', [number, number]>> = {
  flat_damage:       { magic: [5, 10],  rare: [10, 18], legendary: [15, 25] },
  damage_per_rank:   { magic: [2, 4],   rare: [4, 7],   legendary: [6, 10] },
  burn_on_attack:    { magic: [1, 2],   rare: [2, 3],   legendary: [3, 5]  },
  poison_on_attack:  { magic: [1, 2],   rare: [2, 4],   legendary: [4, 6]  },
  hp_bonus:          { magic: [15, 25], rare: [22, 38], legendary: [30, 55] },
  def_bonus:         { magic: [2, 5],   rare: [4, 8],   legendary: [7, 14] },
  start_shield:      { magic: [5, 10],  rare: [8, 16],  legendary: [12, 22] },
  reroll_bonus:      { magic: [1, 1],   rare: [1, 1],   legendary: [1, 2]  },
  heal_bonus:        { magic: [5, 10],  rare: [8, 16],  legendary: [12, 22] },
  gold_pct:          { magic: [10, 20], rare: [20, 35], legendary: [30, 55] },
  // 職業專屬
  six_shield_affix:  { magic: [2, 3],   rare: [3, 5],   legendary: [5, 8]  },
  shield_dmg_pct:    { magic: [6, 9],   rare: [9, 15],  legendary: [12, 18] },
  burn_amp:          { magic: [18, 25], rare: [25, 35], legendary: [35, 48] },
  burn_enemy_bonus:  { magic: [6, 10],  rare: [10, 18], legendary: [15, 25] },
  overheal_shield:   { magic: [20, 30], rare: [30, 45], legendary: [45, 60] },
  post_heal_atk:     { magic: [5, 8],   rare: [8, 14],  legendary: [12, 20] },
  two_pair_extra:    { magic: [25, 35], rare: [35, 50], legendary: [45, 60] },
  poison_bonus:      { magic: [5, 8],   rare: [8, 14],  legendary: [12, 20] },
  frozen_bonus:      { magic: [6, 10],  rare: [10, 18], legendary: [15, 25] },
  distinct_dice_dmg: { magic: [3, 5],   rare: [5, 8],   legendary: [7, 12] },
  def_to_dmg:        { magic: [10, 15], rare: [15, 22], legendary: [20, 28] },
  reroll_charge_atk: { magic: [3, 5],   rare: [5, 8],   legendary: [7, 11] },
  wolf_dmg_bonus:    { magic: [4, 6],   rare: [6, 10],  legendary: [8, 14] },
  // 星蝕詞綴
  forbidden_clean_dmg:       { magic: [8, 12],  rare: [12, 20], legendary: [18, 28] },
  forbidden_once_guard:      { magic: [1, 1],   rare: [1, 1],   legendary: [1, 1]  },
  forbidden_self_dmg_reduce: { magic: [20, 30], rare: [30, 45], legendary: [40, 55] },
  clean_dice_shield:         { magic: [4, 7],   rare: [7, 12],  legendary: [10, 18] },
  forbidden_removed_atk:     { magic: [3, 5],   rare: [5, 8],   legendary: [7, 12] },
  eclipse_followup:          { magic: [8, 12],  rare: [12, 20], legendary: [16, 26] },
  // 燃燒王座詞綴
  infernal_flame_dmg:  { magic: [8, 12],  rare: [12, 18], legendary: [16, 22] },
  ember_shield:        { magic: [4, 8],   rare: [8, 14],  legendary: [12, 20] },
  flame_suppressor:    { magic: [20, 30], rare: [30, 40], legendary: [40, 55] },
  burning_soul:        { magic: [10, 15], rare: [15, 22], legendary: [20, 30] },
  shield_breaker_dmg:  { magic: [6, 10],  rare: [10, 18], legendary: [15, 25] },
  ash_resonance:       { magic: [8, 12],  rare: [12, 20], legendary: [16, 26] },
  // 黑潮王座詞綴
  tide_dmg_bonus:    { magic: [8, 12],  rare: [12, 18], legendary: [16, 24] },
  oxygen_shield:     { magic: [2, 4],   rare: [4, 7],   legendary: [6, 10]  },
  deep_suppress_dmg: { magic: [8, 12],  rare: [12, 18], legendary: [16, 24] },
  tidal_barrier:     { magic: [8, 12],  rare: [12, 18], legendary: [16, 24] },
  kelp_resonance:    { magic: [1, 1],   rare: [1, 1],   legendary: [1, 1]   },
  drowned_soul:      { magic: [8, 12],  rare: [12, 18], legendary: [16, 24] },
  // 灰燼聖約詞綴
  covenant_low_dmg:     { magic: [8, 12],  rare: [12, 18], legendary: [16, 22] },
  covenant_burst_shield:{ magic: [8, 14],  rare: [14, 20], legendary: [18, 26] },
  covenant_suppress:    { magic: [15, 25], rare: [25, 40], legendary: [35, 50] },
  covenant_high_atk:    { magic: [8, 12],  rare: [12, 18], legendary: [16, 22] },
  // ── 職業專屬詞綴第二輪 ─────────────────────────────────────────────────
  slash_shield_echo:    { magic: [3, 6],   rare: [6, 10],  legendary: [9, 15]  },
  slash_divine_punish:  { magic: [5, 9],   rare: [9, 15],  legendary: [14, 22] },
  fire_conflagration:   { magic: [10, 16], rare: [16, 26], legendary: [24, 36] },
  fire_ember_guard:     { magic: [4, 7],   rare: [7, 12],  legendary: [10, 18] },
  holy_light_return:    { magic: [20, 35], rare: [35, 55], legendary: [50, 75] },
  holy_blessed_dice:    { magic: [5, 9],   rare: [9, 15],  legendary: [14, 22] },
  shadow_backstab:      { magic: [15, 25], rare: [25, 40], legendary: [35, 55] },
  shadow_poison_burst:  { magic: [6, 10],  rare: [10, 16], legendary: [14, 22] },
  ice_frost_mark:       { magic: [20, 35], rare: [35, 55], legendary: [50, 70] },
  ice_shatter:          { magic: [8, 14],  rare: [14, 22], legendary: [20, 32] },
  arrow_volley:         { magic: [10, 16], rare: [16, 26], legendary: [24, 36] },
  arrow_snipe:          { magic: [15, 25], rare: [25, 40], legendary: [35, 55] },
  hammer_counter:       { magic: [6, 10],  rare: [10, 16], legendary: [14, 24] },
  hammer_armor_crush:   { magic: [1, 2],   rare: [2, 3],   legendary: [3, 5]   },
  song_war_cry:         { magic: [15, 25], rare: [25, 40], legendary: [35, 55] },
  song_melody:          { magic: [8, 14],  rare: [14, 22], legendary: [20, 30] },
  beast_wolf_echo:      { magic: [6, 10],  rare: [10, 16], legendary: [14, 22] },
  beast_wild_heal:      { magic: [4, 7],   rare: [7, 12],  legendary: [10, 18] },
  gear_overload:        { magic: [8, 13],  rare: [13, 21], legendary: [20, 30] },
  gear_cog_shield:      { magic: [3, 5],   rare: [5, 8],   legendary: [7, 12]  },
  fighter_combo_strike: { magic: [6, 10],  rare: [10, 16], legendary: [14, 22] },
  fighter_exploit:      { magic: [8, 14],  rare: [14, 22], legendary: [20, 30] },
  fighter_dragon_charge:{ magic: [15, 25], rare: [25, 40], legendary: [35, 55] },
  // ── 頭部詞綴 ──────────────────────────────────────────────────────────
  low_reroll_bonus:     { magic: [15, 25], rare: [25, 40], legendary: [35, 55] },
  focus_first_turns:    { magic: [20, 35], rare: [35, 55], legendary: [50, 75] },
  first_reroll_free:    { magic: [1, 1],   rare: [1, 1],   legendary: [1, 1]   },
  vulnerable_on_straight:{ magic: [1, 1],  rare: [1, 1],   legendary: [1, 1]   },
  // ── 武器通用詞綴 ──────────────────────────────────────────────────────
  execute_dmg:          { magic: [15, 25], rare: [25, 40], legendary: [35, 55] },
  combo_dmg:            { magic: [10, 18], rare: [18, 30], legendary: [28, 42] },
  armor_break_on_combo: { magic: [1, 2],   rare: [2, 3],   legendary: [3, 5]   },
  crit_on_big_combo:    { magic: [12, 20], rare: [20, 32], legendary: [28, 45] },
  // ── 手部詞綴 ──────────────────────────────────────────────────────────
  two_pair_followup:    { magic: [8, 14],  rare: [14, 22], legendary: [20, 32] },
  armor_break_on_attack:{ magic: [1, 1],   rare: [1, 2],   legendary: [2, 3]   },
  reroll_shield:        { magic: [3, 5],   rare: [5, 8],   legendary: [7, 12]  },
  // ── 身體詞綴 ──────────────────────────────────────────────────────────
  shield_guard:         { magic: [8, 15],  rare: [15, 25], legendary: [22, 35] },
  first_hit_reduce:     { magic: [25, 40], rare: [40, 60], legendary: [55, 80] },
  thorns_dmg:           { magic: [4, 8],   rare: [8, 14],  legendary: [12, 20] },
  shield_retain:        { magic: [20, 35], rare: [35, 50], legendary: [45, 65] },
  turn_shield:          { magic: [6, 10],  rare: [10, 16], legendary: [14, 22] },
  // ── 鞋子詞綴 ──────────────────────────────────────────────────────────
  first_turn_dmg:    { magic: [15, 25], rare: [25, 40], legendary: [35, 55] },
  no_reroll_bonus:   { magic: [15, 25], rare: [25, 40], legendary: [35, 55] },
  dodge_once:        { magic: [20, 30], rare: [30, 45], legendary: [40, 60] },
  early_reroll_bonus:{ magic: [1, 1],   rare: [1, 1],   legendary: [1, 1]  },
  kill_next_turn_dmg:{ magic: [20, 35], rare: [35, 50], legendary: [45, 65] },
  // ── 戒指詞綴 ──────────────────────────────────────────────────────────
  straight_dmg:      { magic: [15, 25], rare: [25, 40], legendary: [35, 55] },
  fire_resonance:    { magic: [15, 25], rare: [25, 40], legendary: [35, 55] },
  poison_resonance:  { magic: [3, 6],   rare: [6, 10],  legendary: [10, 16] },
  frozen_resonance:  { magic: [8, 14],  rare: [14, 22], legendary: [20, 32] },
  five_unique_bonus: { magic: [12, 20], rare: [20, 32], legendary: [28, 42] },
  straight_shield:   { magic: [6, 10],  rare: [10, 16], legendary: [14, 22] },
  // ── 飾品詞綴 ──────────────────────────────────────────────────────────
  salvage_bonus:    { magic: [15, 25], rare: [25, 40], legendary: [35, 55] },
  drop_luck:        { magic: [5, 10],  rare: [10, 18], legendary: [15, 25] },
  forge_discount:   { magic: [10, 20], rare: [20, 35], legendary: [30, 50] },
  cleanse_once:     { magic: [1, 1],   rare: [1, 1],   legendary: [1, 1]  },
  life_recover_once:{ magic: [20, 30], rare: [30, 45], legendary: [40, 60] },
  bad_roll_retry:   { magic: [1, 1],   rare: [1, 1],   legendary: [1, 1]  },
}

export function getAffixTier(id: AffixId, value: number, rarity: 'magic' | 'rare' | 'legendary'): 'S' | 'A' | 'B' | 'C' {
  const ranges = AFFIX_RANGES[id]
  if (!ranges) return 'C'
  const [min, max] = ranges[rarity]
  if (min === max) return 'A'
  const pct = (value - min) / (max - min)
  if (pct >= 0.9) return 'S'
  if (pct >= 0.6) return 'A'
  if (pct >= 0.3) return 'B'
  return 'C'
}

const AFFIX_LABELS: Record<AffixId, (v: number) => string> = {
  flat_damage:       v => `傷害 +${v}`,
  damage_per_rank:   v => `骰型每階 +${v} 傷害`,
  burn_on_attack:    v => `攻擊時施加 ${v} 層燃燒`,
  poison_on_attack:  v => `攻擊時施加 ${v} 層中毒`,
  hp_bonus:          v => `最大 HP +${v}`,
  def_bonus:         v => `防禦 +${v}`,
  start_shield:      v => `戰鬥開始 +${v} 護盾`,
  reroll_bonus:      v => `重骰次數 +${v}`,
  heal_bonus:        v => `治療量 +${v}`,
  gold_pct:          v => `金幣獎勵 +${v}%`,
  // 職業專屬
  six_shield_affix:  v => `每顆 6 獲得 ${v} 護盾`,
  shield_dmg_pct:    v => `護盾存在時傷害 +${v}%`,
  burn_amp:          v => `燃燒傷害 +${v}%`,
  burn_enemy_bonus:  v => `對燃燒敵人傷害 +${v}`,
  overheal_shield:   v => `溢出治療 ${v}% 轉護盾`,
  post_heal_atk:     v => `治療後下次攻擊 +${v}`,
  two_pair_extra:    v => `兩對以上追加 ${v}% 傷害`,
  poison_bonus:      v => `對中毒敵人傷害 +${v}`,
  frozen_bonus:      v => `對凍結敵人傷害 +${v}`,
  distinct_dice_dmg: v => `每種不同點數 +${v} 傷害`,
  def_to_dmg:        v => `防禦 ${v}% 轉化為傷害`,
  reroll_charge_atk: v => `每次重骰蓄能 +${v} 攻擊`,
  wolf_dmg_bonus:    v => `所有狼攻擊 +${v} 傷害`,
  // 星蝕詞綴
  forbidden_clean_dmg:       v => `不含禁忌點數時傷害 +${v}%`,
  forbidden_once_guard:      _v => `每場首次禁忌副作用免疫`,
  forbidden_self_dmg_reduce: v => `禁忌自傷 -${v}%`,
  clean_dice_shield:         v => `不含禁忌點數時獲得 ${v} 護盾`,
  forbidden_removed_atk:     v => `每移除禁忌骰下次攻擊 +${v}`,
  eclipse_followup:          v => `兩對以上且不含禁忌時追加 ${v} 傷害`,
  // 燃燒王座詞綴
  infernal_flame_dmg:  v => `魔焰值 3+ 時傷害 +${v}%`,
  ember_shield:        v => `擊殺後獲得 ${v} 護盾`,
  flame_suppressor:    v => `魔焰反噬傷害 -${v}%`,
  burning_soul:        v => `HP < 50% 時傷害 +${v}%`,
  shield_breaker_dmg:  v => `對有護盾敵人傷害 +${v}`,
  ash_resonance:       v => `受到燃燒後下次攻擊 +${v}`,
  // 黑潮王座詞綴
  tide_dmg_bonus:    v => `退潮/亂流時傷害 +${v}%`,
  oxygen_shield:     v => `每點氧氣回合開始獲得 ${v} 護盾`,
  deep_suppress_dmg: v => `深壓中傷害 +${v}%`,
  tidal_barrier:     v => `漲潮時受傷害 -${v}%`,
  kelp_resonance:    _v => `擊殺後恢復 1 點氧氣`,
  drowned_soul:      v => `氧氣耗盡時傷害 +${v}%`,
  // 灰燼聖約詞綴
  covenant_low_dmg:      v => `聖約進度 < 50 時傷害 +${v}%`,
  covenant_burst_shield: v => `聖約審判後獲得 ${v} 護盾`,
  covenant_suppress:     v => `聖約審判傷害 -${v}%`,
  covenant_high_atk:     v => `聖約進度 ≥ 75 時傷害 +${v}%`,
  // 職業專屬第二輪
  slash_shield_echo:    v => `護盾存在時每回合對敵 ${v} 傷害`,
  slash_divine_punish:  v => `護盾 > 20 時追加 ${v} 真實傷害`,
  fire_conflagration:   v => `敵人燃燒 ≥ 6 層時追加 ${v} 傷害`,
  fire_ember_guard:     v => `施加燃燒後獲得 ${v} 護盾`,
  holy_light_return:    v => `治療量 ${v}% 轉化為傷害`,
  holy_blessed_dice:    v => `兩對以上時回復 ${v} HP`,
  shadow_backstab:      v => `敵人中毒+兩對以上傷害 +${v}%`,
  shadow_poison_burst:  v => `對中毒敵人追加 ${v} 傷害`,
  ice_frost_mark:       v => `攻擊時 ${v}% 機率施加凍結`,
  ice_shatter:          v => `攻擊凍結敵人追加 ${v} 傷害`,
  arrow_volley:         v => `五顆點數全不同追加 ${v} 傷害`,
  arrow_snipe:          v => `不重骰時傷害 +${v}%`,
  hammer_counter:       v => `受攻後下次攻擊 +${v}`,
  hammer_armor_crush:   v => `三條以上施加 ${v} 層破甲`,
  song_war_cry:         v => `治療後下次攻擊傷害 +${v}%`,
  song_melody:          v => `連續兩回合不同骰型獲得 ${v} 護盾`,
  beast_wolf_echo:      v => `召喚狼後下次攻擊 +${v}`,
  beast_wild_heal:      v => `狼攻擊時回復 ${v} HP`,
  gear_overload:        v => `重骰 3 次以上追加 ${v} 傷害`,
  gear_cog_shield:      v => `每次重骰獲得 ${v} 護盾`,
  fighter_combo_strike: v => `連續技觸發時傷害 +${v}`,
  fighter_exploit:      v => `敵人易傷+兩對以上追加 ${v} 傷害`,
  fighter_dragon_charge:v => `未重骰時下回合攻擊 +${v}%`,
  // 頭部
  low_reroll_bonus:     v => `本回合重骰 ≤ 2 次時傷害 +${v}%`,
  focus_first_turns:    v => `前 2 回合傷害 +${v}%`,
  first_reroll_free:    _v => `每場戰鬥第一次重骰不消耗次數`,
  vulnerable_on_straight:_v => `順子以上施加易傷`,
  // 武器通用
  execute_dmg:          v => `敵人 HP < 30% 時傷害 +${v}%`,
  combo_dmg:            v => `三條以上時傷害 +${v}%`,
  armor_break_on_combo: v => `三條以上施加 ${v} 層破甲`,
  crit_on_big_combo:    v => `順子以上時暴擊 +${v} 傷害`,
  // 手部詞綴
  two_pair_followup:    v => `兩對以上追加 ${v} 傷害`,
  armor_break_on_attack:v => `攻擊時施加 ${v} 層破甲`,
  reroll_shield:        v => `每次重骰獲得 ${v} 護盾`,
  // 身體詞綴
  shield_guard:         v => `護盾存在時受傷害 -${v}%`,
  first_hit_reduce:     v => `首次受攻擊減傷 ${v}%`,
  thorns_dmg:           v => `受攻擊時反彈 ${v} 傷害`,
  shield_retain:        v => `護盾吸收時保留 ${v}% 護盾`,
  turn_shield:          v => `每 3 回合獲得 ${v} 護盾`,
  // 鞋子詞綴
  first_turn_dmg:    v => `第一回合傷害 +${v}%`,
  no_reroll_bonus:   v => `不重骰時傷害 +${v}%`,
  dodge_once:        v => `首次受攻減傷 ${v}%`,
  early_reroll_bonus:_v => `前 2 回合重骰 +1 次`,
  kill_next_turn_dmg:v => `擊殺後下回合傷害 +${v}%`,
  // 戒指詞綴
  straight_dmg:      v => `順子以上時傷害 +${v}%`,
  fire_resonance:    v => `敵人燃燒≥4層時傷害 +${v}%`,
  poison_resonance:  v => `中毒敵人每回合額外 ${v} 傷害`,
  frozen_resonance:  v => `攻擊凍結敵人追加 ${v} 傷害`,
  five_unique_bonus: v => `五顆不同點數時追加 ${v} 傷害`,
  straight_shield:   v => `順子以上時獲得 ${v} 護盾`,
  // 飾品詞綴
  salvage_bonus:    v => `分解獲得星塵 +${v}%`,
  drop_luck:        v => `金幣獎勵 +${v}%`,
  forge_discount:   v => `重鑄費用 -${v}%`,
  cleanse_once:    _v => `每場首次負面狀態免疫`,
  life_recover_once:v => `HP < 30% 時回復 ${v} HP（每場一次）`,
  bad_roll_retry:  _v => `每場首次重骰差時自動重骰一次`,
}

// ── Affix pools（依部位分類，確保主題符合）──────────────────────────────────
// BASIC：magic+ 可出現的詞綴（每部位主題化）
const SLOT_BASIC: Record<EquipmentSlot, AffixId[]> = {
  weapon:    ['flat_damage', 'damage_per_rank', 'execute_dmg', 'combo_dmg'], // 攻擊/斬殺/爆發
  head:      ['hp_bonus', 'def_bonus', 'start_shield', 'low_reroll_bonus', 'focus_first_turns'], // 生命/防禦/護盾/冷靜/專注
  body:      ['hp_bonus', 'def_bonus', 'shield_guard', 'first_hit_reduce'], // 生命/防禦/堅壁/厚甲
  hands:     ['flat_damage', 'damage_per_rank', 'combo_dmg', 'two_pair_followup'], // 攻擊/精準/連擊
  boots:     ['hp_bonus', 'def_bonus', 'first_turn_dmg', 'no_reroll_bonus'], // 生命/防禦/先制/靜心
  ring:      ['flat_damage', 'start_shield', 'heal_bonus', 'straight_dmg'],                      // 攻擊/護盾/治療/順勢
  accessory: ['hp_bonus', 'heal_bonus', 'gold_pct', 'salvage_bonus', 'drop_luck'],  // 生存 / 輔助
  armor:     ['hp_bonus', 'def_bonus'],                                    // legacy
}

// CORE：rare+ 額外詞綴（構築型 / 機制型；與同部位 BASIC 不重疊）
const SLOT_CORE: Record<EquipmentSlot, AffixId[]> = {
  weapon:    ['burn_on_attack', 'poison_on_attack', 'armor_break_on_combo', 'crit_on_big_combo'], // 武器：狀態/破甲/爆擊
  head:      ['reroll_bonus', 'def_to_dmg', 'first_reroll_free', 'vulnerable_on_straight'],    // 頭盔：智慧/甲轉傷/預見/弱點洞察
  body:      ['start_shield', 'def_to_dmg', 'thorns_dmg', 'shield_retain', 'turn_shield'],     // 身甲：護盾/甲轉傷/反震/保留/鐵壁
  hands:     ['burn_on_attack', 'poison_on_attack', 'armor_break_on_attack', 'reroll_shield'], // 護手：狀態/重骰強化
  boots:     ['dodge_once', 'early_reroll_bonus', 'kill_next_turn_dmg', 'start_shield'],       // 靴子：迴避/疾行/追擊/護盾
  ring:      ['damage_per_rank', 'burn_on_attack', 'poison_on_attack', 'frozen_bonus', 'distinct_dice_dmg',
             'fire_resonance', 'poison_resonance', 'frozen_resonance', 'five_unique_bonus', 'straight_shield'], // 戒指：流派核心
  accessory: ['reroll_bonus', 'start_shield', 'burn_enemy_bonus',
             'forge_discount', 'cleanse_once', 'life_recover_once', 'bad_roll_retry'], // 飾品：多系加成
  armor:     ['start_shield'],                                                                  // legacy
}

const corePool = (slot: EquipmentSlot): AffixId[] => SLOT_CORE[slot] ?? SLOT_CORE.ring
const basicPool = (slot: EquipmentSlot): AffixId[] => SLOT_BASIC[slot] ?? SLOT_BASIC.ring

// 防具類部位（legendary armor 來源，不含戒指/飾品）
const ARMOR_SLOTS: EquipmentSlot[] = ['head', 'body', 'hands', 'boots']
// 套裝可掉落的部位（6 件）：4 防具 + 戒指 + 飾品
const SET_SLOTS: EquipmentSlot[] = ['head', 'body', 'hands', 'boots', 'ring', 'accessory']

// 職業專屬詞綴池（只出現在該職業套裝部位）
const CLASS_AFFIXES: Partial<Record<Role, AffixId[]>> = {
  slash:  ['six_shield_affix', 'shield_dmg_pct', 'slash_shield_echo', 'slash_divine_punish'],
  fire:   ['burn_amp', 'burn_enemy_bonus', 'fire_conflagration', 'fire_ember_guard'],
  holy:   ['overheal_shield', 'post_heal_atk', 'holy_light_return', 'holy_blessed_dice'],
  shadow: ['two_pair_extra', 'poison_bonus', 'shadow_backstab', 'shadow_poison_burst'],
  ice:    ['frozen_bonus', 'ice_frost_mark', 'ice_shatter'],
  arrow:  ['distinct_dice_dmg', 'arrow_volley', 'arrow_snipe'],
  hammer: ['def_to_dmg', 'hammer_counter', 'hammer_armor_crush'],
  song:   ['heal_bonus', 'song_war_cry', 'song_melody'],
  beast:  ['wolf_dmg_bonus', 'beast_wolf_echo', 'beast_wild_heal'],
  gear:   ['reroll_charge_atk', 'gear_overload', 'gear_cog_shield'],
  fighter:['fighter_combo_strike', 'fighter_exploit', 'fighter_dragon_charge'],
}

function pickOne<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function pickUnique<T>(arr: T[], n: number): T[] { return [...arr].sort(() => Math.random() - 0.5).slice(0, n) }

// ── Legendary data ─────────────────────────────────────────────────────────
export type LegendaryDef = { name: string; effectId: LegendaryEffectId; desc: string }

// Build-defining legendaries: each warps a dice rule for its class instead of
// granting flat numbers. effectId strings are kept stable so old saves/loadouts
// still resolve — only the name / desc / battle behavior changed.
const WEAPON_LEGENDARIES: Record<Role, LegendaryDef> = {
  slash:  { name: '聖盾嘲諷劍', effectId: 'slash_damage_shield',  desc: '每擲出一顆 6 獲得 8 護盾；骰出 2 顆以上 6 時，敵人本回合攻擊 −40%（嘲諷）' },
  fire:   { name: '連環隕星杖', effectId: 'fire_burn_explosion',  desc: '三條以上時，每超過一階追加一發小火球（+10 傷害、+2 燃燒）；順子視為達標' },
  holy:   { name: '聖光迴響杖', effectId: 'holy_heal_damage',     desc: '兩對以上時治療量 ×1.5，並對敵人造成治療量 25% 的神聖傷害' },
  shadow: { name: '雙影連襲刃', effectId: 'shadow_first_strike',  desc: '每回合首次兩對以上攻擊追加 45% 暗影傷害；敵人有中毒或破甲時提高為 70%；暗影印記每層追加 +10%（上限 3 層，印記在追擊後消耗）' },
  ice:    { name: '凍結連鎖杖', effectId: 'ice_freeze_aura',      desc: '順子或四條以上施加 1 層冰痕；未凍結時凍結 1 回合；已凍結時追加 24 冰晶傷害；Boss 免疫凍結時改為額外施加 1 層冰痕' },
  arrow:  { name: '萬箭齊發弓', effectId: 'arrow_double_hit',     desc: '攻擊時，骰子上每種不同點數各追加一箭（每箭固定 6 傷害）' },
  hammer: { name: '碎甲戰錘',   effectId: 'hammer_charge_crit',   desc: '三條以上時敵人防禦永久 −5（可疊加）；對已破甲的敵人傷害 +25%' },
  song:   { name: '漸強琴弦',   effectId: 'song_dice_boost',      desc: '每次造成傷害後，下回合骰子最低值 +1（上限 +3）' },
  beast:  { name: '狼群號角',   effectId: 'beast_atk_stack',      desc: '連續兩回合擲出相同骰型時，召喚狼追加 14 傷害並回復 8 HP；每次攻擊本場 ATK +3（上限 +30）' },
  gear:    { name: '過載機關炮', effectId: 'gear_overheat_cannon', desc: '每次重骰獲得 1 層過熱（最多 5）；每層過熱炮擊 +6；過熱 3–4 層：出手後自傷 6 HP，下回合重骰 -1；過熱 5 層：追加爆裂炮 30 傷害，自傷 15 HP，下回合重骰 -2 且禁用炮彈' },
  fighter: { name: '龍皇滅世拳套', effectId: 'fighter_weapon', desc: '連續技觸發時額外獲得 1 層拳勢；防守連段額外 +10 護盾；解鎖奧義：順子→順子（龍翔百裂 +30 傷），葫蘆→四條以上（霸王震天擊 +25 傷）' },
  // 死亡騎士（2026-08 取代訓獸師）：舊回合制傳奇武器系統是死代碼，未特別設計，
  // 沿用矮人的 effectId 純粹是為了讓 Record<Role,...> 型別過關。
  death: { name: '噬魂戰斧', effectId: 'hammer_charge_crit', desc: '（尚未設計，舊回合制系統不會被觸及）' },
}

const HEAD_LEGENDARIES: LegendaryDef[] = [
  { name: '神聖冠冕',   effectId: 'armor_regen',        desc: '每回合開始回復 5 HP' },
  { name: '荊棘面具',   effectId: 'armor_thorns',       desc: '受到攻擊後，對敵人反彈 30% 傷害' },
  { name: '堡壘鐵盔',   effectId: 'armor_fortify',      desc: '戰鬥開始護盾量翻倍' },
  { name: '不死面盔',   effectId: 'armor_undying',      desc: '本場首次致死時保留 1 HP 並回復 20% 最大 HP' },
  { name: '復仇戰盔',   effectId: 'armor_retaliate',    desc: '每次受到攻擊累積 +18 傷害，下次出手一次性釋放' },
  { name: '絕境鐵冠',   effectId: 'armor_last_stand',   desc: 'HP 低於 30% 時傷害 ×1.4' },
  { name: '壁壘護盔',   effectId: 'armor_barrier',      desc: '每 2 回合開始自動獲得 10 護盾' },
  { name: '怒火鐵冠',   effectId: 'armor_vengeance',    desc: '每次受到攻擊，本場攻擊永久 +4（上限 +20）' },
  { name: '守衛護盔',   effectId: 'armor_warden',       desc: '護盾存在時受到傷害 -3' },
  { name: '磐石護面',   effectId: 'armor_second_skin',  desc: '第 3 回合起受到傷害降低 20%' },
]
const BODY_LEGENDARIES: LegendaryDef[] = [
  { name: '神聖胸甲',   effectId: 'armor_regen',        desc: '每回合開始回復 5 HP' },
  { name: '荊棘之甲',   effectId: 'armor_thorns',       desc: '受到攻擊後，對敵人反彈 30% 傷害' },
  { name: '堡壘護甲',   effectId: 'armor_fortify',      desc: '戰鬥開始護盾量翻倍' },
  { name: '不死之甲',   effectId: 'armor_undying',      desc: '本場首次致死時保留 1 HP 並回復 20% 最大 HP' },
  { name: '復仇護甲',   effectId: 'armor_retaliate',    desc: '每次受到攻擊累積 +18 傷害，下次出手一次性釋放' },
  { name: '絕境護甲',   effectId: 'armor_last_stand',   desc: 'HP 低於 30% 時傷害 ×1.4' },
  { name: '壁壘鎧甲',   effectId: 'armor_barrier',      desc: '每 2 回合開始自動獲得 10 護盾' },
  { name: '怒火護甲',   effectId: 'armor_vengeance',    desc: '每次受到攻擊，本場攻擊永久 +4（上限 +20）' },
  { name: '守衛胸甲',   effectId: 'armor_warden',       desc: '護盾存在時受到傷害 -3' },
  { name: '磐石鎧甲',   effectId: 'armor_second_skin',  desc: '第 3 回合起受到傷害降低 20%' },
]
const HANDS_LEGENDARIES: LegendaryDef[] = [
  { name: '神聖護腕',   effectId: 'armor_regen',        desc: '每回合開始回復 5 HP' },
  { name: '荊棘拳甲',   effectId: 'armor_thorns',       desc: '受到攻擊後，對敵人反彈 30% 傷害' },
  { name: '堡壘護手',   effectId: 'armor_fortify',      desc: '戰鬥開始護盾量翻倍' },
  { name: '不死護腕',   effectId: 'armor_undying',      desc: '本場首次致死時保留 1 HP 並回復 20% 最大 HP' },
  { name: '復仇鐵拳',   effectId: 'armor_retaliate',    desc: '每次受到攻擊累積 +18 傷害，下次出手一次性釋放' },
  { name: '絕境拳甲',   effectId: 'armor_last_stand',   desc: 'HP 低於 30% 時傷害 ×1.4' },
  { name: '壁壘護腕',   effectId: 'armor_barrier',      desc: '每 2 回合開始自動獲得 10 護盾' },
  { name: '怒火拳甲',   effectId: 'armor_vengeance',    desc: '每次受到攻擊，本場攻擊永久 +4（上限 +20）' },
  { name: '守衛手甲',   effectId: 'armor_warden',       desc: '護盾存在時受到傷害 -3' },
  { name: '磐石護腕',   effectId: 'armor_second_skin',  desc: '第 3 回合起受到傷害降低 20%' },
]
const BOOTS_LEGENDARIES: LegendaryDef[] = [
  { name: '神聖戰靴',   effectId: 'armor_regen',        desc: '每回合開始回復 5 HP' },
  { name: '荊棘踏靴',   effectId: 'armor_thorns',       desc: '受到攻擊後，對敵人反彈 30% 傷害' },
  { name: '堡壘重靴',   effectId: 'armor_fortify',      desc: '戰鬥開始護盾量翻倍' },
  { name: '不死長靴',   effectId: 'armor_undying',      desc: '本場首次致死時保留 1 HP 並回復 20% 最大 HP' },
  { name: '復仇戰靴',   effectId: 'armor_retaliate',    desc: '每次受到攻擊累積 +18 傷害，下次出手一次性釋放' },
  { name: '絕境戰靴',   effectId: 'armor_last_stand',   desc: 'HP 低於 30% 時傷害 ×1.4' },
  { name: '壁壘重靴',   effectId: 'armor_barrier',      desc: '每 2 回合開始自動獲得 10 護盾' },
  { name: '怒火長靴',   effectId: 'armor_vengeance',    desc: '每次受到攻擊，本場攻擊永久 +4（上限 +20）' },
  { name: '守衛長靴',   effectId: 'armor_warden',       desc: '護盾存在時受到傷害 -3' },
  { name: '磐石戰靴',   effectId: 'armor_second_skin',  desc: '第 3 回合起受到傷害降低 20%' },
]

const RING_LEGENDARIES: LegendaryDef[] = [
  { name: '狂戰士之戒', effectId: 'acc_berserker',      desc: 'HP 低於 30% 時，傷害 ×1.5' },
  { name: '吸血指環',   effectId: 'acc_vampire',        desc: '每次攻擊後回復 3 HP' },
  { name: '財富之環',   effectId: 'acc_gold_rush',      desc: '每場戰鬥開始額外獲得 20 金幣' },
  { name: '衝勢寶環',   effectId: 'acc_momentum',       desc: '每次出手後傷害 +8（最高疊加至 +40）' },
  { name: '嗜血之戒',   effectId: 'acc_lifesteal',      desc: '每次攻擊回復造成傷害的 10%（每次上限 20 HP）' },
  { name: '爆發寶戒',   effectId: 'acc_combo_burst',    desc: '葫蘆/順子以上時本次傷害 +35%' },
  { name: '終結之戒',   effectId: 'ring_executioner',   desc: '敵人 HP 低於 25% 時傷害 ×1.6' },
  { name: '精準之環',   effectId: 'ring_precision',     desc: '本回合不重骰直接出手時傷害 +30%' },
  { name: '汲魂之環',   effectId: 'ring_soul_drain',    desc: '每回合開始對敵人造成 5 真實傷害（無視防禦）' },
  { name: '迴響寶環',   effectId: 'ring_echo',          desc: '每 3 回合出手傷害 ×1.5' },
  { name: '雙刃之戒',   effectId: 'ring_double_edge',   desc: '傷害永久 ×1.25，但每回合多受 2 點傷害' },
  { name: '血代之戒',   effectId: 'ring_blood_price',   desc: '每次攻擊消耗 3 HP，本場攻擊永久 +6（上限 +30）' },
]
const ACCESSORY_LEGENDARIES: LegendaryDef[] = [
  { name: '狂戰士護符', effectId: 'acc_berserker',      desc: 'HP 低於 30% 時，傷害 ×1.5' },
  { name: '吸血護符',   effectId: 'acc_vampire',        desc: '每次攻擊後回復 3 HP' },
  { name: '財富吊墜',   effectId: 'acc_gold_rush',      desc: '每場戰鬥開始額外獲得 20 金幣' },
  { name: '衝勢護符',   effectId: 'acc_momentum',       desc: '每次出手後傷害 +8（最高疊加至 +40）' },
  { name: '嗜血項鍊',   effectId: 'acc_lifesteal',      desc: '每次攻擊回復造成傷害的 10%（每次上限 20 HP）' },
  { name: '爆發護符',   effectId: 'acc_combo_burst',    desc: '葫蘆/順子以上時本次傷害 +35%' },
  { name: '鋼鐵意志',   effectId: 'acc_shield_battery', desc: '每回合開始獲得 7 護盾' },
  { name: '涅槃護符',   effectId: 'acc_rebirth',        desc: '本場首次 HP ≤ 20% 時立即回復 40 HP' },
  { name: '痛苦轉化',   effectId: 'acc_pain_convert',   desc: '每次受到攻擊後，下次出手傷害 +15（出手後重置）' },
  { name: '戰鬥冥想',   effectId: 'acc_trance',         desc: '連續出手 3 回合後，第 4 回合傷害 ×1.5（重置計數）' },
  { name: '獻祭腰帶',   effectId: 'acc_sacrifice',      desc: '每次攻擊消耗 5 HP，傷害 ×1.3' },
]

const SLOT_LEGENDARIES: Partial<Record<EquipmentSlot, LegendaryDef[]>> = {
  head: HEAD_LEGENDARIES,
  body: BODY_LEGENDARIES,
  hands: HANDS_LEGENDARIES,
  boots: BOOTS_LEGENDARIES,
  armor: BODY_LEGENDARIES,
  ring: RING_LEGENDARIES,
  accessory: ACCESSORY_LEGENDARIES,
}

// 黑潮王座専用傳奇武器
export const COVENANT_WEAPON_LEGENDARIES: LegendaryDef[] = [
  { name: '誓約聖劍',   effectId: 'covenant_sword',        desc: '聖約進度 ≥ 75 時每次攻擊追加 18 傷害；聖約審判後回復 15 HP' },
  { name: '灰燼審判杖', effectId: 'ash_judgment_reversal', desc: '聖約審判：對敵方造成 20 真實傷害，英雄仍承受 15 傷害（可被抑制詞綴減免）' },
]

export const BLACK_TIDE_WEAPON_LEGENDARIES: LegendaryDef[] = [
  { name: '潮汐劍',   effectId: 'tide_blade',    desc: '退潮/亂流時傷害 +20%；漲潮時每回合獲得 8 護盾' },
  { name: '深壓長槍', effectId: 'depth_lance',   desc: '深壓中傷害 ×1.35；rank ≥ 3 時追加 +12 傷害' },
  { name: '沉沒法杖', effectId: 'drowned_staff',  desc: '攻擊後施加 3 層中毒；氧氣 ≥ 3 時中毒每回合傷害 +50%' },
  { name: '潮影短刃', effectId: 'tidal_dagger',  desc: '出手時消耗 1 點氧氣，傷害 ×1.25；氧氣為 0 時不觸發' },
  { name: '深淵讚歌', effectId: 'abyss_hymn',    desc: '潮汐切換後回復 12 HP；每保有 1 點氧氣傷害 +2' },
]

// 燃燒王座専用傳奇武器
export const THRONE_WEAPON_LEGENDARIES: LegendaryDef[] = [
  { name: '王座斷劍',   effectId: 'throne_sword',        desc: '魔焰值 4+ 時攻擊附加破甲；受到魔焰反噬後獲得 15 護盾' },
  { name: '黑焰短刃',   effectId: 'dark_flame_dagger',   desc: '魔焰值 5+ 時暴擊傷害 +40%；擊殺敵人時魔焰不增加一次' },
  { name: '灰燼魔典',   effectId: 'ash_grimoire',        desc: '第一次魔焰反噬時不受傷害，改為對敵人造成 40 真實傷害' },
  { name: '煉獄長弓',   effectId: 'inferno_longbow',     desc: '不重骰出手時降低 1 點魔焰；魔焰值 3+ 時追加燃燒箭（+8 傷害 +2 燃燒）' },
  { name: '魔核引擎',   effectId: 'demon_core_engine',   desc: '每場戰鬥第一次魔焰到 6 時不觸發反噬，改為獲得免費重骰 1 次與 20 護盾' },
]

// 星蝕裂隙専用傳奇
const ECLIPSE_WEAPON_LEGENDARIES: LegendaryDef[] = [
  { name: '星蝕裁決杖', effectId: 'judge_staff',  desc: '不含禁忌點數時施加 2 層易傷；含禁忌點數時改為自傷 6 但傷害 +25%' },
  { name: '裂隙獵弓',   effectId: 'rift_bow',     desc: '全不同點數且不含禁忌點數時，追加 5 發星箭（每發 +6 傷害）' },
  { name: '月影短刃',   effectId: 'moon_blade',   desc: '兩對以上且不含禁忌點數時追加 60% 傷害；含禁忌點數時機率減半' },
]
const ECLIPSE_ARMOR_LEGENDARIES: LegendaryDef[] = [
  { name: '星盾聖甲',   effectId: 'star_shield_armor', desc: '每次受到禁忌副作用時獲得等量護盾；本回合無禁忌副作用時下回合防禦 +6' },
]
const ECLIPSE_ACC_LEGENDARIES: LegendaryDef[] = [
  { name: '觀測者戒指', effectId: 'observer_ring', desc: '每場戰鬥第一次避開禁忌點數出手時，回復 10 HP 並獲得 1 次額外重骰' },
]

// Canonical name/desc per legendary effectId — lets us refresh stale text on
// equipment saved before a legendary was redesigned (behavior follows effectId).
const LEGENDARY_DEFS: Partial<Record<LegendaryEffectId, LegendaryDef>> = {
  ...Object.fromEntries(Object.values(WEAPON_LEGENDARIES).map(l => [l.effectId, l])),
  ...Object.fromEntries(BODY_LEGENDARIES.map(l => [l.effectId, l])),
  ...Object.fromEntries(RING_LEGENDARIES.map(l => [l.effectId, l])),
  ...Object.fromEntries(ECLIPSE_WEAPON_LEGENDARIES.map(l => [l.effectId, l])),
  ...Object.fromEntries(ECLIPSE_ARMOR_LEGENDARIES.map(l => [l.effectId, l])),
  ...Object.fromEntries(ECLIPSE_ACC_LEGENDARIES.map(l => [l.effectId, l])),
  ...Object.fromEntries(THRONE_WEAPON_LEGENDARIES.map(l => [l.effectId, l])),
  ...Object.fromEntries(BLACK_TIDE_WEAPON_LEGENDARIES.map(l => [l.effectId, l])),
  ...Object.fromEntries(COVENANT_WEAPON_LEGENDARIES.map(l => [l.effectId, l])),
}

/** Refresh a single item's legendary name/desc from the canonical definition.
 *  Weapon names are class-flavored so we only rename weapons (slot-scoped). */
export function refreshLegendaryDesc(item: Equipment): Equipment {
  if (!item.legendaryEffectId) return item
  const def = LEGENDARY_DEFS[item.legendaryEffectId]
  if (!def) return item
  const name = item.slot === 'weapon' ? def.name : item.name
  if (def.desc === item.legendaryDesc && name === item.name) return item
  return { ...item, name, legendaryDesc: def.desc }
}

// ── Name tables ───────────────────────────────────────────────────────────
const NAMES: Record<EquipmentSlot, Record<EquipmentRarity, string[]>> = {
  weapon: {
    normal:    ['生鏽劍', '舊木杖', '破弓', '鈍錘', '朽木匕首', '裂痕斧'],
    magic:     ['魔力劍', '法術杖', '強弓', '魔戰錘', '靈能刃', '咒語杖',
                '鋒銳匕首', '鍍銀長劍', '烈焰法杖', '寒冰尖刃', '迅捷短弓', '雷紋戰斧',
                '元素短杖', '鬼火法鞭', '幽魂刃', '破甲戰斧'],
    rare:      ['精鋼巨劍', '龍紋法杖', '神射精弓', '裂地錘', '幻影刃', '狂暴之斧', '血咒長劍',
                '熔岩裂刃', '暗夜長劍', '極寒法典', '風神長弓', '深淵戰斧', '雷霆匕首',
                '赤龍牙劍', '冥府法鐮', '星墜短弓', '鋼魂巨錘', '毒蠍雙刃', '虛空法杖'],
    legendary: ['傳奇武器'],
  },
  head: {
    normal:    ['破舊頭盔', '布帽', '舊鐵頭盔'],
    magic:     ['魔力頭冠', '符文盔', '法師帽', '智慧頭帶', '元素護盔', '戰士護盔', '魔紋冠冕', '靈視目鏡', '黑曜護面'],
    rare:      ['精鋼盔', '龍首盔', '智者冠', '戰神盔', '天界頭盔', '不滅鐵冠', '深淵護頭', '冥火骷髏冠', '星光頭盔', '暗影面具'],
    legendary: ['傳奇頭冠'],
  },
  body: {
    normal:    ['破舊皮甲', '舊鐵甲', '獸皮外衣'],
    magic:     ['魔力皮甲', '法師長袍', '強化鎧甲', '符文護甲',
                '獸皮護甲', '聖光戰袍', '輕量護甲', '魔焰戰衣', '黑夜外衣', '暗紋軟甲', '雷鱗護甲'],
    rare:      ['精鋼胸甲', '龍鱗甲', '幽靈長袍', '戰神鎧', '秘銀護甲',
                '龍晶甲', '鳳凰戰袍', '深夜黑甲', '星辰鎧甲', '天地護胸', '熔岩板甲', '冥府死衣', '血誓護甲'],
    legendary: ['傳奇鎧甲'],
  },
  hands: {
    normal:    ['破舊護手', '布手套', '舊皮手套'],
    magic:     ['魔力護手', '符文手甲', '迅捷手套', '迅捷指套', '魔晶護腕', '破甲護手', '靈能手甲', '火焰手甲', '影刃指套'],
    rare:      ['精鋼護手', '龍爪手甲', '刺客指套', '巨力護腕',
                '黑鐵手甲', '天界護腕', '爪形指套', '血紋護手', '暗殺者爪甲', '雷霆拳套', '毒刃護手'],
    legendary: ['傳奇護手'],
  },
  boots: {
    normal:    ['破舊靴', '布鞋', '草編涼鞋'],
    magic:     ['魔力長靴', '符文戰靴', '輕羽靴', '疾行靴', '魔焰短靴', '強健靴子', '隱形軟靴', '風刃戰靴', '幽靈踏靴'],
    rare:      ['精鋼戰靴', '龍鱗靴', '疾風靴', '踏地重靴',
                '天界長靴', '黑鐵重靴', '暗影足具', '雷霆靴', '死靈皮靴', '熔岩踏靴', '星光疾靴'],
    legendary: ['傳奇戰靴'],
  },
  ring: {
    normal:    ['普通戒指', '舊銅環', '木質指環'],
    magic:     ['魔力戒指', '靈氣指環', '幸運戒', '火焰指環', '冰霜戒', '古老寶環', '黑曜石環', '碧玉指環', '血色戒指'],
    rare:      ['龍血戒指', '命運指環', '古老戒指', '英雄之戒',
                '鳳凰寶戒', '龍焰之環', '時間之環', '深淵印記', '深海珊瑚環', '星辰永恆戒', '滅世印記', '骸骨指環'],
    legendary: ['傳奇戒指'],
  },
  accessory: {
    normal:    ['舊護符', '布腰帶', '骨頭項鍊'],
    magic:     ['靈氣項鍊', '幸運護符', '星辰腰帶', '元素吊墜', '古老徽章', '戰士腰帶', '幸運四葉草', '黑夜披風', '毒牙護身符'],
    rare:      ['命運項鍊', '古老護符', '英雄腰帶', '先知之眼',
                '英雄勛章', '龍晶吊墜', '天界翅膀', '星火護符', '王者徽章', '深淵力量石', '古龍心臟', '骸骨守護者'],
    legendary: ['傳奇飾品'],
  },
  armor: {  // legacy
    normal:    ['破舊皮甲', '舊鐵甲'],
    magic:     ['魔力皮甲', '法師長袍', '強化鎧甲'],
    rare:      ['精鋼胸甲', '龍鱗甲', '幽靈長袍'],
    legendary: ['傳奇鎧甲'],
  },
}

// ── Set definitions ─────────────────────────────────────────────────────────
// 2 件套：屬性加成；4 件套：解鎖該職業招牌效果（沿用武器 legendary effectId）
type SetStat = Partial<{
  flatDamage: number; damagePerRank: number; burnOnAttack: number
  hpBonus: number; defBonus: number; startShield: number
  rerollBonus: number; healBonus: number; goldPct: number
  straightDamageMult: number   // 順子傷害乘數（相乘疊加）
}>

export type SetDef = {
  id: SetId; name: string; role: Role | null
  bonus2: SetStat; desc2: string
  grants4: LegendaryEffectId; desc4: string
}

type SetMetaEntry = { name: string; bonus2: SetStat; desc2: string; grants4Override?: { effectId: LegendaryEffectId; desc: string } }

const SET_META: Record<Role, SetMetaEntry> = {
  slash:  {
    name: '聖殿守護', bonus2: { flatDamage: 14, startShield: 12 }, desc2: '傷害 +14，戰鬥開始護盾 +12',
    grants4Override: { effectId: 'slash_set4', desc: '有護盾時受到傷害降低 20%；攻擊時追加護盾值 25% 的傷害' },
  },
  fire:   {
    name: '焚天烈焰', bonus2: { flatDamage: 15, burnOnAttack: 3 }, desc2: '傷害 +15，攻擊施加 +3 燃燒',
    grants4Override: { effectId: 'fire_set4', desc: '攻擊時，敵人每層燃燒額外造成 2 傷害（上限 40）' },
  },
  // 4pc 直接沿用武器傳奇效果（無獨立加值），2pc 多補一些做為湊套裝的補償
  holy:   { name: '聖光神官', bonus2: { flatDamage: 12, healBonus: 20 }, desc2: '傷害 +12，治療量 +20' },
  shadow: { name: '暗影刺殺', bonus2: { flatDamage: 17, rerollBonus: 1 }, desc2: '傷害 +17，重骰 +1' },
  ice:    { name: '永凍冰霜', bonus2: { damagePerRank: 4, defBonus: 9 }, desc2: '骰型每階 +4 傷害，防禦 +9',
    grants4Override: { effectId: 'ice_set4', desc: '敵人每次獲得冰痕時，皇家公主獲得 5 護盾；冰痕達 5 層觸發碎冰爆發（30 傷害 + 下回合敵方攻擊 -20%）' } },
  arrow:  {
    name: '疾風遊俠',
    bonus2: { flatDamage: 16, damagePerRank: 3 },
    desc2: '傷害 +16，骰型每階 +3 傷害',
    grants4Override: { effectId: 'arrow_scatter_free_attack', desc: '散骰（5 種不同點數）時追加 60% 矢雨傷害；順子傷害額外 +50%' },
  },
  // 4pc 直接沿用武器傳奇效果（無獨立加值），2pc 多補一些做為湊套裝的補償
  hammer: { name: '不滅壁壘', bonus2: { flatDamage: 12, hpBonus: 26 }, desc2: '傷害 +12，最大 HP +26' },
  song:   {
    name: '樂韻共鳴', bonus2: { flatDamage: 10, healBonus: 18 }, desc2: '傷害 +10，治療量 +18',
    grants4Override: { effectId: 'song_set4', desc: '治療時對敵人造成治療量 30% 的旋律傷害' },
  },
  beast:  {
    name: '荒野獸魂', bonus2: { flatDamage: 15, hpBonus: 40 }, desc2: '傷害 +15，最大 HP +40',
    grants4Override: { effectId: 'beast_set4', desc: '兩對以上時，狼魂助攻傷害 +25%，回復 6 HP' },
  },
  // 4pc 直接沿用武器傳奇效果（無獨立加值），2pc 多補一些做為湊套裝的補償
  gear:    { name: '機巧造物', bonus2: { flatDamage: 17, rerollBonus: 1 }, desc2: '傷害 +17，重骰 +1' },
  fighter: { name: '無極霸拳', bonus2: { flatDamage: 14, startShield: 10 }, desc2: '傷害 +14，戰鬥開始護盾 +10',
    grants4Override: { effectId: 'fighter_set4', desc: '連續技觸發時獲得 8 護盾；防守/調息連段效果升至 12；每場第一次連段中斷不失去拳勢' } },
  // 死亡騎士（2026-08 取代訓獸師）：舊回合制套裝系統是死代碼，未特別設計，
  // 純粹是為了讓 Record<Role,...> 型別過關。
  death: { name: '噬魂王朝', bonus2: { flatDamage: 15, hpBonus: 30 }, desc2: '（尚未設計，舊回合制系統不會被觸及）' },
}

// eclipse_set, throne_set, abyss_set, covenant_set excluded since they have no role (all-class / dungeon-specific)
const ROLE_OF_SET: Record<Exclude<SetId, 'eclipse_set' | 'throne_set' | 'abyss_set' | 'covenant_set'>, Role> = {
  slash_set: 'slash', fire_set: 'fire', holy_set: 'holy', shadow_set: 'shadow', ice_set: 'ice',
  arrow_set: 'arrow', hammer_set: 'hammer', song_set: 'song', beast_set: 'beast', gear_set: 'gear',
  fighter_set: 'fighter',
}

type RoleSetId = Exclude<SetId, 'eclipse_set' | 'throne_set' | 'abyss_set' | 'covenant_set'>

export const SET_DEFS: Record<SetId, SetDef> = {
  ...(Object.fromEntries(
    (Object.keys(ROLE_OF_SET) as RoleSetId[]).map(id => {
      const role = ROLE_OF_SET[id]
      const meta = SET_META[role]
      const leg = WEAPON_LEGENDARIES[role]
      const g4 = meta.grants4Override ?? { effectId: leg.effectId, desc: leg.desc }
      return [id, {
        id, name: meta.name, role,
        bonus2: meta.bonus2, desc2: meta.desc2,
        grants4: g4.effectId, desc4: g4.desc,
      }]
    })
  ) as Record<SetId, SetDef>),
  eclipse_set: {
    id: 'eclipse_set',
    name: '星蝕觀測者',
    role: null,
    bonus2: { flatDamage: 6 },
    desc2: '傷害 +6；禁忌副作用 -30%',
    grants4: 'eclipse_4pc',
    desc4: '不含禁忌點數出手時，追加 20 傷害並獲得 8 護盾',
  },
  throne_set: {
    id: 'throne_set',
    name: '焰獄征服者',
    role: null,
    bonus2: { defBonus: 6 },
    desc2: '防禦 +6；魔焰反噬傷害 -30%',
    grants4: 'throne_4pc',
    desc4: '每次魔焰反噬後，下次攻擊 +30 傷害並獲得 10 護盾',
  },
  abyss_set: {
    id: 'abyss_set',
    name: '深淵勇者',
    role: null,
    bonus2: {},
    desc2: '氧氣上限 +1；漲潮時防禦 +8',
    grants4: 'abyss_4pc',
    desc4: '潮汐切換時獲得 12 護盾；退潮出手追加 +15 傷害',
  },
  covenant_set: {
    id: 'covenant_set',
    name: '灰燼誓約',
    role: null,
    bonus2: { hpBonus: 20, defBonus: 3 },
    desc2: '最大 HP +20，防禦 +3',
    grants4: 'covenant_4pc',
    desc4: '每次聖約審判後本場攻擊永久 +8（最多 +32）；審判傷害 -25%',
  },
}

const SET_OF_ROLE: Record<Role, SetId> = Object.fromEntries(
  (Object.keys(ROLE_OF_SET) as RoleSetId[]).map(id => [ROLE_OF_SET[id], id])
) as Record<Role, SetId>

const ALL_SET_ROLES = Object.keys(SET_OF_ROLE) as Role[]

const SET_PIECE_NAME = ['頭盔', '戰甲', '護手', '戰靴', '戒指', '飾品']  // setPiece 1~6

// ── Helpers ───────────────────────────────────────────────────────────────
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function rollAffix(id: AffixId, rarity: 'magic' | 'rare' | 'legendary'): Affix {
  const [min, max] = AFFIX_RANGES[id][rarity]
  const value = rand(min, max)
  return { id, value, label: AFFIX_LABELS[id](value) }
}

function pickName(slot: EquipmentSlot, rarity: EquipmentRarity): string {
  const pool = NAMES[slot][rarity]
  return pool[Math.floor(Math.random() * pool.length)]
}

function makeUid(): string {
  return `eq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ── Main generator ────────────────────────────────────────────────────────
export function generateEquipment(
  slot: EquipmentSlot,
  rarity: EquipmentRarity,
  heroRole?: Role,
): Equipment {
  const uid = makeUid()

  const bp = basicPool(slot)
  const cp = corePool(slot)

  // Legendary weapon: 2 generic + 1 class-specific + class legendary effect
  if (rarity === 'legendary' && slot === 'weapon') {
    const role = heroRole ?? (['slash', 'fire', 'holy', 'shadow', 'ice', 'arrow', 'hammer', 'song', 'beast', 'gear'] as Role[])[rand(0, 9)]
    const leg = WEAPON_LEGENDARIES[role]
    const classPool = CLASS_AFFIXES[role]
    let a1: AffixId, a2: AffixId, a3: AffixId
    if (classPool && classPool.length > 0) {
      ;[a1, a2] = pickUnique([...bp, ...cp], 2)
      a3 = pickOne(classPool)
    } else {
      ;[a1, a2, a3] = pickUnique([...bp, ...cp], 3)
    }
    return {
      uid, name: leg.name, slot, rarity: 'legendary',
      requiredRole: role,
      affixes: [rollAffix(a1, 'legendary'), rollAffix(a2, 'legendary'), rollAffix(a3, 'legendary')],
      legendaryEffectId: leg.effectId,
      legendaryDesc: leg.desc,
    }
  }

  // Legendary armor-type pieces: 2 BASIC + 1 CORE + legendary effect
  if (rarity === 'legendary' && (ARMOR_SLOTS.includes(slot) || slot === 'armor')) {
    const pool = SLOT_LEGENDARIES[slot] ?? BODY_LEGENDARIES
    const leg = pool[rand(0, pool.length - 1)]
    return {
      uid, name: leg.name, slot, rarity: 'legendary',
      affixes: [...pickUnique(bp, Math.min(2, bp.length)).map(a => rollAffix(a, 'legendary')), rollAffix(pickOne(cp), 'legendary')],
      legendaryEffectId: leg.effectId,
      legendaryDesc: leg.desc,
    }
  }

  // Legendary ring / accessory: 2 BASIC + 1 CORE + legendary effect
  if (rarity === 'legendary' && (slot === 'accessory' || slot === 'ring')) {
    const pool = SLOT_LEGENDARIES[slot] ?? RING_LEGENDARIES
    const leg = pool[rand(0, pool.length - 1)]
    return {
      uid, name: leg.name, slot, rarity: 'legendary',
      affixes: [...pickUnique(bp, Math.min(2, bp.length)).map(a => rollAffix(a, 'legendary')), rollAffix(pickOne(cp), 'legendary')],
      legendaryEffectId: leg.effectId,
      legendaryDesc: leg.desc,
    }
  }

  // Normal: no affixes
  if (rarity === 'normal') return { uid, name: pickName(slot, 'normal'), slot, rarity, affixes: [] }

  // Magic: 1~2 BASIC（依部位主題池）
  if (rarity === 'magic') {
    const affixes = pickUnique(bp, rand(1, Math.min(2, bp.length))).map(a => rollAffix(a, 'magic'))
    return { uid, name: pickName(slot, 'magic'), slot, rarity, affixes }
  }

  // Rare: 1 BASIC + 1 CORE（依部位分別挑選）
  const affixes = [rollAffix(pickOne(bp), 'rare'), rollAffix(pickOne(cp), 'rare')]
  return { uid, name: pickName(slot, 'rare'), slot, rarity, affixes }
}

// 產生一件套裝部位（6 件：頭/身/手/鞋/戒指/飾品），綁定指定職業
export function generateSetPiece(role: Role, rarity: EquipmentRarity): Equipment {
  const pieceIdx = rand(0, SET_SLOTS.length - 1)          // 0~5
  const slot = SET_SLOTS[pieceIdx]
  const setId = SET_OF_ROLE[role]
  const def = SET_DEFS[setId]
  const rk: 'magic' | 'rare' | 'legendary' = rarity === 'normal' ? 'magic' : rarity as 'magic' | 'rare' | 'legendary'
  let setAffixes: Affix[]
  const classPool = CLASS_AFFIXES[role] ?? SLOT_CORE[slot]
  const bp = basicPool(slot)
  if (rk === 'legendary') {
    setAffixes = [...pickUnique(bp, Math.min(2, bp.length)).map(a => rollAffix(a, 'legendary')), rollAffix(pickOne(classPool), 'legendary')]
  } else if (rk === 'rare') {
    setAffixes = [rollAffix(pickOne(bp), 'rare'), rollAffix(pickOne(classPool), 'rare')]
  } else {
    setAffixes = pickUnique(bp, rand(1, Math.min(2, bp.length))).map(a => rollAffix(a, 'magic'))
  }
  return {
    uid: makeUid(),
    name: `${def.name}·${SET_PIECE_NAME[pieceIdx]}`,
    slot, rarity,
    requiredRole: role,
    affixes: setAffixes,
    setId, setPiece: pieceIdx + 1,
  }
}

// ── Drop system ────────────────────────────────────────────────────────────
const ALL_DROP_SLOTS: EquipmentSlot[] = ['weapon', 'head', 'body', 'hands', 'boots', 'ring', 'accessory']

export function tryGenerateDrop(isElite: boolean, isBoss: boolean, heroRole?: Role, fateLevel = 0): Equipment | null {
  const pickSlot = () => ALL_DROP_SLOTS[rand(0, ALL_DROP_SLOTS.length - 1)]

  if (isBoss) {
    const noDropChance = Math.max(0, 0.20 - fateLevel * 0.02)
    if (Math.random() < noDropChance) return null
    const legPct = Math.min(0.60, 0.35 + fateLevel * 0.05)
    const rarity: EquipmentRarity = Math.random() < legPct ? 'legendary' : Math.random() < 0.65 ? 'rare' : 'magic'
    const setChance = rarity === 'legendary' ? 0.05 : rarity === 'rare' ? 0.20 : 0
    if (setChance > 0 && Math.random() < setChance) {
      const role = ALL_SET_ROLES[Math.floor(Math.random() * ALL_SET_ROLES.length)]
      return generateSetPiece(role, rarity)
    }
    return generateEquipment(pickSlot(), rarity, heroRole)
  }
  if (isElite) {
    const dropChance = Math.min(0.30, 0.15 + fateLevel * 0.03)
    if (Math.random() > dropChance) return null
    const legPct = Math.min(0.25, 0.08 + fateLevel * 0.03)
    const rarity: EquipmentRarity = Math.random() < legPct ? 'legendary' : Math.random() < 0.45 ? 'rare' : 'magic'
    const setChance = rarity === 'legendary' ? 0.02 : rarity === 'rare' ? 0.15 : 0
    if (setChance > 0 && Math.random() < setChance) {
      const role = ALL_SET_ROLES[Math.floor(Math.random() * ALL_SET_ROLES.length)]
      return generateSetPiece(role, rarity)
    }
    return generateEquipment(pickSlot(), rarity, heroRole)
  }
  return null
}

// ── Bonus computation ──────────────────────────────────────────────────────
export type EquipBonus = {
  flatDamage: number
  damagePerRank: number
  burnOnAttack: number
  poisonOnAttack: number
  hpBonus: number
  defBonus: number
  startShield: number
  rerollBonus: number
  healBonus: number
  goldPct: number
  straightDamageMult: number
  // 職業專屬詞綴
  sixShieldBonus: number        // 每顆 6 → +N 護盾
  shieldDmgPct: number          // 護盾存在時傷害 +N%
  burnAmp: number               // 燃燒傷害 +N%
  burnEnemyBonus: number        // 對燃燒敵人 +N
  overhealShieldPct: number     // 溢出治療 N% → 護盾
  postHealAtk: number           // 治療後下次攻擊 +N
  twoPairExtraPct: number       // 兩對以上追加 N% 傷害
  poisonBonus: number           // 對中毒敵人 +N
  frozenBonus: number           // 對凍結敵人 +N
  distinctDiceDmg: number       // 每種不同點數 +N
  defToDmgPct: number           // 防禦 N% → 傷害
  rerollChargeAtk: number       // 每次重骰蓄能 +N 攻擊
  wolfDmgBonus: number          // 所有狼攻擊 +N 傷害
  // 星蝕詞綴
  forbiddenCleanDmgPct: number  // 不含禁忌時傷害 +N%
  forbiddenOnceGuard: boolean   // 每場首次禁忌副作用免疫
  forbiddenSelfDmgReduce: number// 禁忌自傷 -N%
  cleanDiceShield: number       // 不含禁忌時獲得 N 護盾
  forbiddenRemovedAtk: number   // 每移除禁忌骰 +N 攻擊（暫存）
  eclipseFollowup: number       // 兩對以上且不含禁忌追加 N 傷害
  eclipseSet2pc: boolean        // 星蝕觀測者 2 件套效果（禁忌副作用 -30%）
  // 燃燒王座詞綴
  infernalFlameDmgPct: number  // 魔焰值 3+ 時傷害 +N%
  emberShieldBonus: number     // 擊殺後獲得 N 護盾
  flameSuppressorPct: number   // 魔焰反噬傷害 -N%
  burningSoulDmgPct: number    // HP < 50% 時傷害 +N%
  shieldBreakerDmg: number     // 對有護盾敵人傷害 +N
  ashResonanceDmg: number      // 受到燃燒後下次攻擊 +N
  throneSet2pc: boolean        // 焰獄征服者 2 件套效果（魔焰反噬 -30%）
  // 黑潮王座詞綴
  tideDmgBonus: number        // 退潮/亂流時傷害 +N%
  oxygenShield: number        // 每點氧氣回合開始獲得 N 護盾
  deepSuppressDmg: number     // 深壓中傷害 +N%
  tidalBarrier: number        // 漲潮時受傷害 -N%
  kelpResonance: number       // 擊殺後恢復 N 氧氣
  drownedSoul: number         // 氧氣耗盡時傷害 +N%
  abyssSet2pc: boolean        // 深淵勇者套裝 2 件套效果
  // 職業專屬詞綴第二輪
  slashShieldEcho: number      // 護盾>0每回合對敵 N 傷害
  slashDivinePunish: number    // 護盾>20追加 N 真實傷害
  fireConflagration: number    // 敵燃燒≥6層追加 N 傷害
  fireEmberGuard: number       // 施加燃燒後獲得 N 護盾
  holyLightReturn: number      // 治療時 N% 轉為傷害
  holyBlessedDice: number      // 兩對以上回復 N HP
  shadowBackstab: number       // 敵中毒+兩對以上傷害 +N%
  shadowPoisonBurst: number    // 對中毒敵人追加 N 傷害
  iceFrostMark: number         // N% 機率施加凍結
  iceShatter: number           // 攻擊凍結敵人追加 N 傷害
  arrowVolley: number          // 5 顆不同追加 N 傷害
  arrowSnipe: number           // 不重骰傷害 +N%
  hammerCounter: number        // 受攻後下次攻擊 +N
  hammerArmorCrush: number     // 三條以上施加 N 層破甲
  songWarCry: number           // 治療後下次攻擊傷害 +N%
  songMelody: number           // 連續兩回合不同骰型獲得 N 護盾
  beastWolfEcho: number        // 召喚狼後下次攻擊 +N
  beastWildHeal: number        // 狼攻擊時回復 N HP
  gearOverload: number         // 重骰3次以上追加 N 傷害
  gearCogShield: number        // 每次重骰獲得 N 護盾
  fighterComboStrike: number   // 連續技觸發時傷害 +N
  fighterExploit: number       // 敵易傷+兩對以上追加 N 傷害
  fighterDragonCharge: number  // 未重骰時下回合攻擊 +N%
  // 頭部
  lowRerollBonus: number       // 本回合重骰 ≤ 2 次時傷害 +N%
  focusFirstTurns: number      // 前 2 回合傷害 +N%
  firstRerollFree: boolean     // 每場戰鬥第一次重骰不消耗次數
  vulnerableOnStraight: boolean// 順子以上施加易傷
  // 武器通用
  executeDmg: number           // 敵人 HP < 30% 時傷害 +N%
  comboDmg: number             // 三條以上時傷害 +N%
  critOnBigCombo: number       // 順子以上時額外 +N 傷害（非倍率）
  // 手部
  twoPairFollowup: number      // 兩對以上追加 N 傷害
  armorBreakOnAttack: number   // 攻擊時施加 N 層破甲
  rerollShield: number         // 每次重骰獲得 N 護盾
  // 鞋子
  firstTurnDmg: number         // 先制：第一回合傷害 +N%
  noRerollBonus: number        // 靜心：不重骰時傷害 +N%
  dodgeOnce: number            // 迴避：首次受攻減傷 N%
  earlyRerollBonus: number     // 疾行：前 2 回合重骰 +1
  killNextTurnDmg: number      // 追擊：擊殺後下回合傷害 +N%
  // 戒指
  straightDmgPct: number       // 順勢攻擊：順子以上時傷害 +N%
  fireResonancePct: number     // 火焰共鳴：敵人燃燒≥4層時傷害 +N%
  poisonResonance: number      // 毒蝕共鳴：中毒敵人每回合額外 N 傷害
  frozenResonance: number      // 冰封共鳴：攻擊凍結敵人追加 N 傷害
  fiveUniqueBonusDmg: number   // 完美骰紋：五顆不同點數追加 N 傷害
  straightShield: number       // 小順子祝福：順子以上時獲得 N 護盾
  // 飾品
  salvageBonus: number         // 星塵回收：分解獲得星塵 +N%
  dropLuck: number             // 幸運：金幣獎勵 +N%
  forgeDiscount: number        // 重鑄折扣：重鑄費用 -N%
  cleanseOnce: boolean         // 淨化：每場首次負面狀態免疫
  lifeRecoverOnce: number      // 回魂：HP<30%時回復 N HP，每場一次
  badRollRetry: boolean        // 命運偏轉：每場首次重骰差時自動重骰
  // 身體
  shieldGuard: number          // 護盾存在時受傷害 -N%
  firstHitReduce: number       // 首次受攻減傷 N%
  thornsDmg: number            // 受攻反彈 N 傷害
  shieldRetain: number         // 護盾吸收時保留 N%
  turnShield: number           // 每 3 回合獲得 N 護盾
  legendaryEffects: LegendaryEffectId[]
  // 灰燼聖約詞綴
  covenantLowDmgPct: number
  covenantBurstShield: number
  covenantSuppressPct: number
  covenantHighAtkPct: number
  covenantSet2pc: boolean
}

export function computeEquipBonus(items: Equipment[]): EquipBonus {
  const b: EquipBonus = {
    flatDamage: 0, damagePerRank: 0, burnOnAttack: 0, poisonOnAttack: 0,
    hpBonus: 0, defBonus: 0, startShield: 0,
    rerollBonus: 0, healBonus: 0, goldPct: 0,
    straightDamageMult: 1,
    sixShieldBonus: 0, shieldDmgPct: 0, burnAmp: 0, burnEnemyBonus: 0,
    overhealShieldPct: 0, postHealAtk: 0, twoPairExtraPct: 0,
    poisonBonus: 0, frozenBonus: 0, distinctDiceDmg: 0,
    defToDmgPct: 0, rerollChargeAtk: 0, wolfDmgBonus: 0,
    forbiddenCleanDmgPct: 0, forbiddenOnceGuard: false,
    forbiddenSelfDmgReduce: 0, cleanDiceShield: 0,
    forbiddenRemovedAtk: 0, eclipseFollowup: 0, eclipseSet2pc: false,
    infernalFlameDmgPct: 0, emberShieldBonus: 0, flameSuppressorPct: 0,
    burningSoulDmgPct: 0, shieldBreakerDmg: 0, ashResonanceDmg: 0, throneSet2pc: false,
    tideDmgBonus: 0, oxygenShield: 0, deepSuppressDmg: 0, tidalBarrier: 0, kelpResonance: 0, drownedSoul: 0, abyssSet2pc: false,
    slashShieldEcho: 0, slashDivinePunish: 0, fireConflagration: 0, fireEmberGuard: 0,
    holyLightReturn: 0, holyBlessedDice: 0, shadowBackstab: 0, shadowPoisonBurst: 0,
    iceFrostMark: 0, iceShatter: 0, arrowVolley: 0, arrowSnipe: 0,
    hammerCounter: 0, hammerArmorCrush: 0, songWarCry: 0, songMelody: 0,
    beastWolfEcho: 0, beastWildHeal: 0, gearOverload: 0, gearCogShield: 0,
    fighterComboStrike: 0, fighterExploit: 0, fighterDragonCharge: 0,
    lowRerollBonus: 0, focusFirstTurns: 0, firstRerollFree: false, vulnerableOnStraight: false,
    executeDmg: 0, comboDmg: 0, critOnBigCombo: 0,
    twoPairFollowup: 0, armorBreakOnAttack: 0, rerollShield: 0,
    firstTurnDmg: 0, noRerollBonus: 0, dodgeOnce: 0, earlyRerollBonus: 0, killNextTurnDmg: 0,
    straightDmgPct: 0, fireResonancePct: 0, poisonResonance: 0, frozenResonance: 0, fiveUniqueBonusDmg: 0, straightShield: 0,
    salvageBonus: 0, dropLuck: 0, forgeDiscount: 0, cleanseOnce: false, lifeRecoverOnce: 0, badRollRetry: false,
    shieldGuard: 0, firstHitReduce: 0, thornsDmg: 0, shieldRetain: 0, turnShield: 0,
    legendaryEffects: [],
    covenantLowDmgPct: 0, covenantBurstShield: 0, covenantSuppressPct: 0, covenantHighAtkPct: 0, covenantSet2pc: false,
  }
  for (const item of items) {
    const enhLv = item.enhanceLevel ?? 0
    const ev = (v: number) => enhLv > 0 ? Math.round(v * (1 + enhLv * 0.1)) : v
    for (const affix of item.affixes) {
      switch (affix.id) {
        case 'flat_damage':     b.flatDamage += ev(affix.value); break
        case 'damage_per_rank': b.damagePerRank += ev(affix.value); break
        case 'burn_on_attack':    b.burnOnAttack   += ev(affix.value); break
        case 'poison_on_attack':  b.poisonOnAttack += ev(affix.value); break
        case 'hp_bonus':        b.hpBonus += ev(affix.value); break
        case 'def_bonus':       b.defBonus += ev(affix.value); break
        case 'start_shield':    b.startShield += ev(affix.value); break
        case 'reroll_bonus':      b.rerollBonus += ev(affix.value); break
        case 'heal_bonus':        b.healBonus += ev(affix.value); break
        case 'gold_pct':          b.goldPct += ev(affix.value); break
        case 'six_shield_affix':  b.sixShieldBonus += ev(affix.value); break
        case 'shield_dmg_pct':    b.shieldDmgPct += ev(affix.value); break
        case 'burn_amp':          b.burnAmp += ev(affix.value); break
        case 'burn_enemy_bonus':  b.burnEnemyBonus += ev(affix.value); break
        case 'overheal_shield':   b.overhealShieldPct += ev(affix.value); break
        case 'post_heal_atk':     b.postHealAtk += ev(affix.value); break
        case 'two_pair_extra':    b.twoPairExtraPct += ev(affix.value); break
        case 'poison_bonus':      b.poisonBonus += ev(affix.value); break
        case 'frozen_bonus':      b.frozenBonus += ev(affix.value); break
        case 'distinct_dice_dmg': b.distinctDiceDmg += ev(affix.value); break
        case 'def_to_dmg':        b.defToDmgPct += ev(affix.value); break
        case 'reroll_charge_atk': b.rerollChargeAtk += ev(affix.value); break
        case 'wolf_dmg_bonus':    b.wolfDmgBonus    += ev(affix.value); break
        // 星蝕詞綴
        case 'forbidden_clean_dmg':       b.forbiddenCleanDmgPct  += ev(affix.value); break
        case 'forbidden_once_guard':      b.forbiddenOnceGuard     = true; break
        case 'forbidden_self_dmg_reduce': b.forbiddenSelfDmgReduce += ev(affix.value); break
        case 'clean_dice_shield':         b.cleanDiceShield        += ev(affix.value); break
        case 'forbidden_removed_atk':     b.forbiddenRemovedAtk   += ev(affix.value); break
        case 'eclipse_followup':          b.eclipseFollowup        += ev(affix.value); break
        // 燃燒王座詞綴
        case 'infernal_flame_dmg':  b.infernalFlameDmgPct += ev(affix.value); break
        case 'ember_shield':        b.emberShieldBonus    += ev(affix.value); break
        case 'flame_suppressor':    b.flameSuppressorPct  += ev(affix.value); break
        case 'burning_soul':        b.burningSoulDmgPct   += ev(affix.value); break
        case 'shield_breaker_dmg':  b.shieldBreakerDmg    += ev(affix.value); break
        case 'ash_resonance':       b.ashResonanceDmg     += ev(affix.value); break
        // 黑潮王座詞綴
        case 'tide_dmg_bonus':    b.tideDmgBonus    += ev(affix.value); break
        case 'oxygen_shield':     b.oxygenShield    += ev(affix.value); break
        case 'deep_suppress_dmg': b.deepSuppressDmg += ev(affix.value); break
        case 'tidal_barrier':     b.tidalBarrier    += ev(affix.value); break
        case 'kelp_resonance':    b.kelpResonance   += ev(affix.value); break
        case 'drowned_soul':      b.drownedSoul     += ev(affix.value); break
        // 灰燼聖約詞綴
        case 'covenant_low_dmg':     b.covenantLowDmgPct  += ev(affix.value); break
        case 'covenant_burst_shield':b.covenantBurstShield += ev(affix.value); break
        case 'covenant_suppress':    b.covenantSuppressPct += ev(affix.value); break
        case 'covenant_high_atk':    b.covenantHighAtkPct  += ev(affix.value); break
        // 職業專屬第二輪
        case 'slash_shield_echo':    b.slashShieldEcho    += ev(affix.value); break
        case 'slash_divine_punish':  b.slashDivinePunish  += ev(affix.value); break
        case 'fire_conflagration':   b.fireConflagration  += ev(affix.value); break
        case 'fire_ember_guard':     b.fireEmberGuard     += ev(affix.value); break
        case 'holy_light_return':    b.holyLightReturn    += ev(affix.value); break
        case 'holy_blessed_dice':    b.holyBlessedDice    += ev(affix.value); break
        case 'shadow_backstab':      b.shadowBackstab     += ev(affix.value); break
        case 'shadow_poison_burst':  b.shadowPoisonBurst  += ev(affix.value); break
        case 'ice_frost_mark':       b.iceFrostMark       += ev(affix.value); break
        case 'ice_shatter':          b.iceShatter         += ev(affix.value); break
        case 'arrow_volley':         b.arrowVolley        += ev(affix.value); break
        case 'arrow_snipe':          b.arrowSnipe         += ev(affix.value); break
        case 'hammer_counter':       b.hammerCounter      += ev(affix.value); break
        case 'hammer_armor_crush':   b.hammerArmorCrush   += ev(affix.value); break
        case 'song_war_cry':         b.songWarCry         += ev(affix.value); break
        case 'song_melody':          b.songMelody         += ev(affix.value); break
        case 'beast_wolf_echo':      b.beastWolfEcho      += ev(affix.value); break
        case 'beast_wild_heal':      b.beastWildHeal      += ev(affix.value); break
        case 'gear_overload':        b.gearOverload       += ev(affix.value); break
        case 'gear_cog_shield':      b.gearCogShield      += ev(affix.value); break
        case 'fighter_combo_strike': b.fighterComboStrike += ev(affix.value); break
        case 'fighter_exploit':      b.fighterExploit     += ev(affix.value); break
        case 'fighter_dragon_charge':b.fighterDragonCharge+= ev(affix.value); break
        // 頭部
        case 'low_reroll_bonus':      b.lowRerollBonus      += ev(affix.value); break
        case 'focus_first_turns':     b.focusFirstTurns     += ev(affix.value); break
        case 'first_reroll_free':     b.firstRerollFree      = true; break
        case 'vulnerable_on_straight':b.vulnerableOnStraight = true; break
        // 武器通用
        case 'execute_dmg':          b.executeDmg         += ev(affix.value); break
        case 'combo_dmg':            b.comboDmg           += ev(affix.value); break
        case 'armor_break_on_combo': b.hammerArmorCrush   += ev(affix.value); break  // 共用破甲欄位
        case 'crit_on_big_combo':    b.critOnBigCombo     += ev(affix.value); break
        // 手部詞綴
        case 'two_pair_followup':    b.twoPairFollowup    += ev(affix.value); break
        case 'armor_break_on_attack':b.armorBreakOnAttack += ev(affix.value); break
        case 'reroll_shield':        b.rerollShield       += ev(affix.value); break
        // 鞋子詞綴
        case 'first_turn_dmg':    b.firstTurnDmg    += ev(affix.value); break
        case 'no_reroll_bonus':   b.noRerollBonus   += ev(affix.value); break
        case 'dodge_once':        b.dodgeOnce       += ev(affix.value); break
        case 'early_reroll_bonus':b.earlyRerollBonus += ev(affix.value); break
        case 'kill_next_turn_dmg':b.killNextTurnDmg += ev(affix.value); break
        // 戒指詞綴
        case 'straight_dmg':     b.straightDmgPct     += ev(affix.value); break
        case 'fire_resonance':   b.fireResonancePct   += ev(affix.value); break
        case 'poison_resonance': b.poisonResonance    += ev(affix.value); break
        case 'frozen_resonance': b.frozenResonance    += ev(affix.value); break
        case 'five_unique_bonus':b.fiveUniqueBonusDmg += ev(affix.value); break
        case 'straight_shield':  b.straightShield     += ev(affix.value); break
        // 飾品詞綴
        case 'salvage_bonus':    b.salvageBonus       += ev(affix.value); break
        case 'drop_luck':        b.dropLuck           += ev(affix.value); break
        case 'forge_discount':   b.forgeDiscount      += ev(affix.value); break
        case 'cleanse_once':     b.cleanseOnce         = true; break
        case 'life_recover_once':b.lifeRecoverOnce    += ev(affix.value); break
        case 'bad_roll_retry':   b.badRollRetry        = true; break
        // 身體詞綴
        case 'shield_guard':         b.shieldGuard        += ev(affix.value); break
        case 'first_hit_reduce':     b.firstHitReduce     += ev(affix.value); break
        case 'thorns_dmg':           b.thornsDmg          += ev(affix.value); break
        case 'shield_retain':        b.shieldRetain       += ev(affix.value); break
        case 'turn_shield':          b.turnShield         += ev(affix.value); break
      }
    }
    if (item.legendaryEffectId) b.legendaryEffects.push(item.legendaryEffectId)
  }

  // ── Set bonuses ──
  const sets = computeSetBonus(items)
  b.flatDamage    += sets.stats.flatDamage    ?? 0
  b.damagePerRank += sets.stats.damagePerRank ?? 0
  b.burnOnAttack  += sets.stats.burnOnAttack  ?? 0
  b.hpBonus       += sets.stats.hpBonus       ?? 0
  b.defBonus      += sets.stats.defBonus      ?? 0
  b.startShield   += sets.stats.startShield   ?? 0
  b.rerollBonus   += sets.stats.rerollBonus   ?? 0
  b.healBonus     += sets.stats.healBonus     ?? 0
  b.goldPct       += sets.stats.goldPct       ?? 0
  if (sets.stats.straightDamageMult) b.straightDamageMult *= sets.stats.straightDamageMult
  for (const eff of sets.effects4) {
    if (!b.legendaryEffects.includes(eff)) b.legendaryEffects.push(eff)
  }
  // 星蝕觀測者 2 件套：禁忌副作用 -30%
  const eclipseStatus = sets.status.find(s => s.id === 'eclipse_set')
  if (eclipseStatus?.active2) b.eclipseSet2pc = true
  // 焰獄征服者 2 件套：魔焰反噬傷害 -30%
  const throneStatus = sets.status.find(s => s.id === 'throne_set')
  if (throneStatus?.active2) b.throneSet2pc = true
  // 深淵勇者 2 件套：氧氣上限 +1；漲潮時防禦 +8
  const abyssStatus = sets.status.find(s => s.id === 'abyss_set')
  if (abyssStatus?.active2) b.abyssSet2pc = true
  // 灰燼誓約 2 件套：最大 HP +20，防禦 +3
  const covenantStatus = sets.status.find(s => s.id === 'covenant_set')
  if (covenantStatus?.active2) b.covenantSet2pc = true
  // 重骰詞綴上限：裝備來源（含套裝加成）合計不超過 +3
  b.rerollBonus = Math.min(b.rerollBonus, 3)
  return b
}

// ── Set bonus computation ────────────────────────────────────────────────────
export type SetStatus = {
  id: SetId; name: string; count: number
  active2: boolean; active4: boolean
  desc2: string; desc4: string
}

export function computeSetBonus(items: Equipment[]): {
  stats: SetStat; effects4: LegendaryEffectId[]; status: SetStatus[]
} {
  const counts = new Map<SetId, number>()
  for (const it of items) {
    if (it.setId) counts.set(it.setId, (counts.get(it.setId) ?? 0) + 1)
  }
  const stats: SetStat = {}
  const effects4: LegendaryEffectId[] = []
  const status: SetStatus[] = []

  const addStat = (s: SetStat) => {
    for (const k of Object.keys(s) as (keyof SetStat)[]) {
      stats[k] = (stats[k] ?? 0) + (s[k] ?? 0)
    }
  }

  for (const [setId, count] of counts) {
    const def = SET_DEFS[setId]
    const active2 = count >= 2
    const active4 = count >= 4
    if (active2) addStat(def.bonus2)
    if (active4) effects4.push(def.grants4)
    status.push({ id: setId, name: def.name, count, active2, active4, desc2: def.desc2, desc4: def.desc4 })
  }
  return { stats, effects4, status }
}

// ── Loadout helpers ──────────────────────────────────────────────────────────
export const LOADOUT_SLOTS: LoadoutSlot[] = [
  'weapon', 'head', 'body', 'hands', 'boots', 'ring1', 'ring2', 'accessory',
]

export const LOADOUT_SLOT_META: Record<LoadoutSlot, { label: string; itemSlot: EquipmentSlot }> = {
  weapon:    { label: '武器',    itemSlot: 'weapon' },
  head:      { label: '頭部',    itemSlot: 'head' },
  body:      { label: '身體',    itemSlot: 'body' },
  hands:     { label: '手部',    itemSlot: 'hands' },
  boots:     { label: '鞋子',    itemSlot: 'boots' },
  ring1:     { label: '戒指 I',  itemSlot: 'ring' },
  ring2:     { label: '戒指 II', itemSlot: 'ring' },
  accessory: { label: '飾品',    itemSlot: 'accessory' },
}

// 將 item.slot 正規化（legacy armor → body）
export function effectiveSlot(slot: EquipmentSlot): EquipmentSlot {
  return slot === 'armor' ? 'body' : slot
}

// 此裝備可放入的 loadout 欄位（戒指可放兩格）
export function loadoutSlotsForItem(item: Equipment): LoadoutSlot[] {
  const s = effectiveSlot(item.slot)
  if (s === 'ring') return ['ring1', 'ring2']
  return [s as LoadoutSlot]
}

export function getEquippedItems(inventory: Equipment[], loadout?: HeroLoadout): Equipment[] {
  if (!loadout) return []
  const uids = [
    loadout.weapon, loadout.head, loadout.body, loadout.hands,
    loadout.boots, loadout.ring1, loadout.ring2, loadout.accessory,
    loadout.armor,  // legacy
  ]
  return uids
    .filter(Boolean)
    .map(uid => inventory.find(e => e.uid === uid))
    .filter(Boolean) as Equipment[]
}

// 從所有 loadout 欄位移除指定 uid（分解裝備時用）
export function removeUidFromLoadout(lo: HeroLoadout, uid: string): HeroLoadout {
  const out: HeroLoadout = { ...lo }
  for (const k of Object.keys(out) as (keyof HeroLoadout)[]) {
    if (out[k] === uid) out[k] = null
  }
  return out
}

// ── 裝備強度評分（一鍵裝備用）────────────────────────────────────────────────
const RARITY_SCORE: Record<EquipmentRarity, number> = {
  normal: 0, magic: 12, rare: 30, legendary: 60,
}
// 不同詞綴量級不同，加權後相加才公平（傷害類較稀有→權重高）
const AFFIX_WEIGHT: Record<AffixId, number> = {
  flat_damage: 1.4, damage_per_rank: 3, burn_on_attack: 5, poison_on_attack: 5, reroll_bonus: 18,
  hp_bonus: 0.5, def_bonus: 2.2, start_shield: 1.1, heal_bonus: 1.2, gold_pct: 0.4,
  // 職業專屬
  six_shield_affix: 2, shield_dmg_pct: 3, burn_amp: 2, burn_enemy_bonus: 1.5,
  overheal_shield: 1.5, post_heal_atk: 2, two_pair_extra: 2, poison_bonus: 1.5,
  frozen_bonus: 1.5, distinct_dice_dmg: 2, def_to_dmg: 1.5, reroll_charge_atk: 2,
  wolf_dmg_bonus: 2,
  // 星蝕詞綴
  forbidden_clean_dmg: 2, forbidden_once_guard: 20, forbidden_self_dmg_reduce: 1.5,
  clean_dice_shield: 1.5, forbidden_removed_atk: 2.5, eclipse_followup: 2,
  // 燃燒王座詞綴
  infernal_flame_dmg: 2.5, ember_shield: 1.5, flame_suppressor: 2,
  burning_soul: 2.5, shield_breaker_dmg: 2, ash_resonance: 2,
  // 黑潮王座詞綴
  tide_dmg_bonus: 2, oxygen_shield: 1.5, deep_suppress_dmg: 2,
  tidal_barrier: 2, kelp_resonance: 10, drowned_soul: 2.5,
  // 灰燼聖約詞綴
  covenant_low_dmg: 2, covenant_burst_shield: 1.5, covenant_suppress: 2, covenant_high_atk: 2,
  // 職業專屬第二輪
  slash_shield_echo: 1.5, slash_divine_punish: 2, fire_conflagration: 2.5, fire_ember_guard: 1.5,
  holy_light_return: 2, holy_blessed_dice: 1.5, shadow_backstab: 2.5, shadow_poison_burst: 2,
  ice_frost_mark: 2, ice_shatter: 2, arrow_volley: 2.5, arrow_snipe: 2.5,
  hammer_counter: 1.5, hammer_armor_crush: 3, song_war_cry: 2, song_melody: 1.5,
  beast_wolf_echo: 2, beast_wild_heal: 1.5, gear_overload: 2.5, gear_cog_shield: 1.5,
  fighter_combo_strike: 2, fighter_exploit: 2, fighter_dragon_charge: 2.5,
  // 頭部
  low_reroll_bonus: 2, focus_first_turns: 2, first_reroll_free: 25, vulnerable_on_straight: 8,
  // 武器通用
  execute_dmg: 2.5, combo_dmg: 2, armor_break_on_combo: 3, crit_on_big_combo: 3,
  // 手部詞綴
  two_pair_followup: 2, armor_break_on_attack: 3, reroll_shield: 2,
  // 鞋子詞綴
  first_turn_dmg: 2, no_reroll_bonus: 2.5, dodge_once: 2.5, early_reroll_bonus: 18, kill_next_turn_dmg: 2.5,
  // 戒指詞綴
  straight_dmg: 2.5, fire_resonance: 2.5, poison_resonance: 2, frozen_resonance: 2, five_unique_bonus: 2.5, straight_shield: 2,
  // 飾品詞綴
  salvage_bonus: 1.5, drop_luck: 1.5, forge_discount: 2, cleanse_once: 15, life_recover_once: 3, bad_roll_retry: 8,
  // 身體詞綴
  shield_guard: 2, first_hit_reduce: 2.5, thorns_dmg: 2, shield_retain: 2.5, turn_shield: 2,
}

export function scoreItem(item: Equipment): number {
  let s = RARITY_SCORE[item.rarity]
  for (const a of item.affixes) s += a.value * (AFFIX_WEIGHT[a.id] ?? 1)
  if (item.legendaryEffectId) s += 45
  if (item.setId) s += 18   // 略偏好套裝件，利於湊套
  return s
}

type ArmorSlotKey = 'head' | 'body' | 'hands' | 'boots' | 'ring1' | 'ring2' | 'accessory'

// 一鍵裝備：依分數為每個欄位挑最強（尊重職業限定）；若湊套裝（2件/4件）總分更高，優先湊套裝
export function autoEquipBest(
  inventory: Equipment[],
  heroRole: Role,
  current: HeroLoadout,
): HeroLoadout {
  const usable = inventory.filter(it => !it.requiredRole || it.requiredRole === heroRole)
  const bySlot = (itemSlot: EquipmentSlot) =>
    usable.filter(it => effectiveSlot(it.slot) === itemSlot)
          .sort((a, b) => scoreItem(b) - scoreItem(a))

  const out: HeroLoadout = { ...current, armor: null }  // 清掉 legacy 欄位
  out.weapon = bySlot('weapon')[0]?.uid ?? null

  const slotLists = {
    head: bySlot('head'), body: bySlot('body'), hands: bySlot('hands'),
    boots: bySlot('boots'), accessory: bySlot('accessory'),
  }
  const ringList = bySlot('ring')

  const baselinePick: Record<ArmorSlotKey, Equipment | null> = {
    head: slotLists.head[0] ?? null,
    body: slotLists.body[0] ?? null,
    hands: slotLists.hands[0] ?? null,
    boots: slotLists.boots[0] ?? null,
    ring1: ringList[0] ?? null,
    ring2: ringList[1] ?? null,
    accessory: slotLists.accessory[0] ?? null,
  }
  const scoreOf = (pick: Record<ArmorSlotKey, Equipment | null>) =>
    Object.values(pick).reduce((s, it) => s + (it ? scoreItem(it) : 0), 0)

  // 找出可用且跟英雄有關的套裝（自身職業套裝、或全職業共用的副本套裝）
  const candidateSetIds = new Set<SetId>()
  for (const it of usable) if (it.setId) candidateSetIds.add(it.setId)

  let bestPick = baselinePick
  let bestGain = 0
  for (const setId of candidateSetIds) {
    const setHead      = slotLists.head.find(it => it.setId === setId) ?? null
    const setBody      = slotLists.body.find(it => it.setId === setId) ?? null
    const setHands     = slotLists.hands.find(it => it.setId === setId) ?? null
    const setBoots     = slotLists.boots.find(it => it.setId === setId) ?? null
    const setAccessory = slotLists.accessory.find(it => it.setId === setId) ?? null
    const setRings      = ringList.filter(it => it.setId === setId)  // 同套裝可能有 0~2 件戒指

    const candidate: Record<ArmorSlotKey, Equipment | null> = { ...baselinePick }
    let pieceCount = 0
    if (setHead)      { candidate.head      = setHead;      pieceCount++ }
    if (setBody)      { candidate.body      = setBody;      pieceCount++ }
    if (setHands)     { candidate.hands     = setHands;     pieceCount++ }
    if (setBoots)     { candidate.boots     = setBoots;     pieceCount++ }
    if (setAccessory) { candidate.accessory = setAccessory; pieceCount++ }
    if (setRings[0])  { candidate.ring1     = setRings[0];  pieceCount++ }
    if (setRings[1])  { candidate.ring2     = setRings[1];  pieceCount++ }

    if (pieceCount < 2) continue  // 湊不到 2 件，沒有套裝加成可言，不值得評估

    const setBonusValue = pieceCount >= 4 ? 130 : 50  // 概略對應 4件/2件套裝效果的強度
    const gain = (scoreOf(candidate) + setBonusValue) - scoreOf(baselinePick)
    if (gain > bestGain) { bestGain = gain; bestPick = candidate }
  }

  out.head      = bestPick.head?.uid      ?? null
  out.body      = bestPick.body?.uid      ?? null
  out.hands     = bestPick.hands?.uid     ?? null
  out.boots     = bestPick.boots?.uid     ?? null
  out.accessory = bestPick.accessory?.uid ?? null
  out.ring1     = bestPick.ring1?.uid     ?? null
  out.ring2     = bestPick.ring2?.uid     ?? null
  return out
}

export const RARITY_LABEL: Record<EquipmentRarity, string> = {
  normal: '普通', magic: '魔法', rare: '稀有', legendary: '傳奇',
}

// 產生一件星蝕觀測者套裝部位（全職業，不綁定職業）
export function generateEclipseSetPiece(rarity: EquipmentRarity): Equipment {
  const pieceIdx = rand(0, SET_SLOTS.length - 1)
  const slot = SET_SLOTS[pieceIdx]
  const def = SET_DEFS['eclipse_set']
  const rk: 'magic' | 'rare' | 'legendary' = rarity === 'normal' ? 'magic' : rarity as 'magic' | 'rare' | 'legendary'
  const bp = basicPool(slot)
  const eclipsePool: AffixId[] = ['forbidden_self_dmg_reduce', 'clean_dice_shield', 'forbidden_removed_atk', 'eclipse_followup', 'forbidden_clean_dmg']
  let setAffixes: Affix[]
  if (rk === 'legendary') {
    setAffixes = [...pickUnique(bp, Math.min(2, bp.length)).map(a => rollAffix(a, 'legendary')), rollAffix(pickOne(eclipsePool), 'legendary')]
  } else if (rk === 'rare') {
    setAffixes = [rollAffix(pickOne(bp), 'rare'), rollAffix(pickOne(eclipsePool), 'rare')]
  } else {
    setAffixes = [rollAffix(pickOne(eclipsePool), 'magic')]
  }
  return {
    uid: makeUid(),
    name: `${def.name}·${SET_PIECE_NAME[pieceIdx]}`,
    slot, rarity,
    affixes: setAffixes,
    setId: 'eclipse_set', setPiece: pieceIdx + 1,
  }
}

// 星蝕裂隙専用傳奇掉落（武器/防具/飾品各池）
export function generateEclipseLegendary(slot: EquipmentSlot): Equipment {
  const uid = makeUid()
  const bp = basicPool(slot)
  const cp = corePool(slot)
  if (slot === 'weapon') {
    const leg = ECLIPSE_WEAPON_LEGENDARIES[rand(0, ECLIPSE_WEAPON_LEGENDARIES.length - 1)]
    const [a1, a2] = pickUnique([...bp, ...cp], 2)
    return {
      uid, name: leg.name, slot, rarity: 'legendary',
      affixes: [rollAffix(a1, 'legendary'), rollAffix(a2, 'legendary')],
      legendaryEffectId: leg.effectId,
      legendaryDesc: leg.desc,
    }
  }
  if (ARMOR_SLOTS.includes(slot) || slot === 'armor') {
    const leg = ECLIPSE_ARMOR_LEGENDARIES[0]
    return {
      uid, name: leg.name, slot: 'body', rarity: 'legendary',
      affixes: [...pickUnique(bp, Math.min(2, bp.length)).map(a => rollAffix(a, 'legendary')), rollAffix(pickOne(cp), 'legendary')],
      legendaryEffectId: leg.effectId,
      legendaryDesc: leg.desc,
    }
  }
  const leg = ECLIPSE_ACC_LEGENDARIES[0]
  return {
    uid, name: leg.name, slot: 'ring', rarity: 'legendary',
    affixes: [...pickUnique(bp, Math.min(2, bp.length)).map(a => rollAffix(a, 'legendary')), rollAffix(pickOne(cp), 'legendary')],
    legendaryEffectId: leg.effectId,
    legendaryDesc: leg.desc,
  }
}

// 星蝕裂隙地城掉落：較高機率星蝕套裝/傳奇
export function tryGenerateEclipseDrop(isElite: boolean, isBoss: boolean, heroRole?: Role, difficulty: 'normal' | 'hero' | 'legendary' = 'normal'): Equipment | null {
  const ELITE_DROP: Record<string, number> = { normal: 0.25, hero: 0.38, legendary: 0.50 }
  if (isBoss) {
    const rarity: EquipmentRarity = Math.random() < 0.5 ? 'legendary' : 'rare'
    if (Math.random() < 0.40) return generateEclipseSetPiece(rarity)
    if (Math.random() < 0.30) {
      const slots: EquipmentSlot[] = ['weapon', 'body', 'ring']
      return generateEclipseLegendary(pickOne(slots))
    }
    return generateEquipment(pickOne(['weapon', 'head', 'body', 'hands', 'boots', 'ring', 'accessory'] as EquipmentSlot[]), rarity, heroRole)
  }
  if (isElite) {
    if (Math.random() > ELITE_DROP[difficulty]) return null
    const rarity: EquipmentRarity = Math.random() < 0.25 ? 'legendary' : Math.random() < 0.5 ? 'rare' : 'magic'
    if (rarity !== 'magic' && Math.random() < 0.30) return generateEclipseSetPiece(rarity)
    return generateEquipment(pickOne(['weapon', 'head', 'body', 'hands', 'boots', 'ring', 'accessory'] as EquipmentSlot[]), rarity, heroRole)
  }
  return null
}

// 燃燒王座専用套裝部位
function generateThroneSetPiece(rarity: EquipmentRarity): Equipment {
  const pieceIdx = rand(0, SET_SLOTS.length - 1)
  const slot = SET_SLOTS[pieceIdx]
  const def = SET_DEFS['throne_set']
  const rk: 'magic' | 'rare' | 'legendary' = rarity === 'normal' ? 'magic' : rarity as 'magic' | 'rare' | 'legendary'
  const thronePool: AffixId[] = ['infernal_flame_dmg', 'ember_shield', 'flame_suppressor', 'burning_soul', 'shield_breaker_dmg', 'ash_resonance']
  const bp = basicPool(slot)
  let setAffixes: Affix[]
  if (rk === 'legendary') {
    setAffixes = [...pickUnique(bp, Math.min(2, bp.length)).map(a => rollAffix(a, 'legendary')), rollAffix(pickOne(thronePool), 'legendary')]
  } else if (rk === 'rare') {
    setAffixes = [rollAffix(pickOne(bp), 'rare'), rollAffix(pickOne(thronePool), 'rare')]
  } else {
    setAffixes = [rollAffix(pickOne(thronePool), 'magic')]
  }
  return {
    uid: makeUid(),
    name: `${def.name}·${SET_PIECE_NAME[pieceIdx]}`,
    slot, rarity,
    affixes: setAffixes,
    setId: 'throne_set', setPiece: pieceIdx + 1,
  }
}

// 燃燒王座専用傳奇武器掉落
function generateThroneLegendary(slot: EquipmentSlot): Equipment {
  const uid = makeUid()
  const bp = basicPool(slot)
  const cp = corePool(slot)
  if (slot === 'weapon') {
    const leg = THRONE_WEAPON_LEGENDARIES[rand(0, THRONE_WEAPON_LEGENDARIES.length - 1)]
    const [a1, a2] = pickUnique([...bp, ...cp], 2)
    return {
      uid, name: leg.name, slot, rarity: 'legendary',
      affixes: [rollAffix(a1, 'legendary'), rollAffix(a2, 'legendary')],
      legendaryEffectId: leg.effectId,
      legendaryDesc: leg.desc,
    }
  }
  const pool = SLOT_LEGENDARIES[slot] ?? BODY_LEGENDARIES
  const leg = pool[rand(0, pool.length - 1)]
  return {
    uid, name: leg.name, slot, rarity: 'legendary',
    affixes: [...pickUnique(bp, Math.min(2, bp.length)).map(a => rollAffix(a, 'legendary')), rollAffix(pickOne(cp), 'legendary')],
    legendaryEffectId: leg.effectId,
    legendaryDesc: leg.desc,
  }
}

// 燃燒王座地城掉落
export function tryGenerateThroneDrops(isElite: boolean, isBoss: boolean, heroRole?: Role, difficulty: 'normal' | 'hero' | 'legendary' = 'normal'): Equipment | null {
  const ELITE_DROP: Record<string, number> = { normal: 0.25, hero: 0.38, legendary: 0.50 }
  if (isBoss) {
    const rarity: EquipmentRarity = Math.random() < 0.5 ? 'legendary' : 'rare'
    if (Math.random() < 0.40) return generateThroneSetPiece(rarity)
    if (Math.random() < 0.35) {
      const slots: EquipmentSlot[] = ['weapon', 'body', 'ring']
      return generateThroneLegendary(pickOne(slots))
    }
    return generateEquipment(pickOne(['weapon', 'head', 'body', 'hands', 'boots', 'ring', 'accessory'] as EquipmentSlot[]), rarity, heroRole)
  }
  if (isElite) {
    if (Math.random() > ELITE_DROP[difficulty]) return null
    const rarity: EquipmentRarity = Math.random() < 0.25 ? 'legendary' : Math.random() < 0.5 ? 'rare' : 'magic'
    if (rarity !== 'magic' && Math.random() < 0.30) return generateThroneSetPiece(rarity)
    return generateEquipment(pickOne(['weapon', 'head', 'body', 'hands', 'boots', 'ring', 'accessory'] as EquipmentSlot[]), rarity, heroRole)
  }
  return null
}

// 黑潮王座専用套裝部位
function generateAbyssSetPiece(rarity: EquipmentRarity): Equipment {
  const pieceIdx = rand(0, SET_SLOTS.length - 1)
  const slot = SET_SLOTS[pieceIdx]
  const def = SET_DEFS['abyss_set']
  const rk: 'magic' | 'rare' | 'legendary' = rarity === 'normal' ? 'magic' : rarity as 'magic' | 'rare' | 'legendary'
  const abyssPool: AffixId[] = ['tide_dmg_bonus', 'oxygen_shield', 'deep_suppress_dmg', 'tidal_barrier', 'kelp_resonance', 'drowned_soul']
  const bp = basicPool(slot)
  let setAffixes: Affix[]
  if (rk === 'legendary') {
    setAffixes = [...pickUnique(bp, Math.min(2, bp.length)).map(a => rollAffix(a, 'legendary')), rollAffix(pickOne(abyssPool), 'legendary')]
  } else if (rk === 'rare') {
    setAffixes = [rollAffix(pickOne(bp), 'rare'), rollAffix(pickOne(abyssPool), 'rare')]
  } else {
    setAffixes = [rollAffix(pickOne(abyssPool), 'magic')]
  }
  return {
    uid: makeUid(),
    name: `${def.name}·${SET_PIECE_NAME[pieceIdx]}`,
    slot, rarity,
    affixes: setAffixes,
    setId: 'abyss_set', setPiece: pieceIdx + 1,
  }
}

// 黑潮王座専用傳奇武器掉落
function generateBlackTideLegendary(slot: EquipmentSlot): Equipment {
  const uid = makeUid()
  const bp = basicPool(slot)
  const cp = corePool(slot)
  if (slot === 'weapon') {
    const leg = BLACK_TIDE_WEAPON_LEGENDARIES[rand(0, BLACK_TIDE_WEAPON_LEGENDARIES.length - 1)]
    const [a1, a2] = pickUnique([...bp, ...cp], 2)
    return {
      uid, name: leg.name, slot, rarity: 'legendary',
      affixes: [rollAffix(a1, 'legendary'), rollAffix(a2, 'legendary')],
      legendaryEffectId: leg.effectId,
      legendaryDesc: leg.desc,
    }
  }
  const pool = SLOT_LEGENDARIES[slot] ?? BODY_LEGENDARIES
  const leg = pool[rand(0, pool.length - 1)]
  return {
    uid, name: leg.name, slot, rarity: 'legendary',
    affixes: [...pickUnique(bp, Math.min(2, bp.length)).map(a => rollAffix(a, 'legendary')), rollAffix(pickOne(cp), 'legendary')],
    legendaryEffectId: leg.effectId,
    legendaryDesc: leg.desc,
  }
}

// 灰燼聖約専用套裝部位
function generateCovenantSetPiece(rarity: EquipmentRarity): Equipment {
  const pieceIdx = rand(0, SET_SLOTS.length - 1)
  const slot = SET_SLOTS[pieceIdx]
  const def = SET_DEFS['covenant_set']
  const rk: 'magic' | 'rare' | 'legendary' = rarity === 'normal' ? 'magic' : rarity as 'magic' | 'rare' | 'legendary'
  const covenantPool: AffixId[] = ['covenant_low_dmg', 'covenant_burst_shield', 'covenant_suppress', 'covenant_high_atk']
  const bp = basicPool(slot)
  let setAffixes: Affix[]
  if (rk === 'legendary') {
    setAffixes = [...pickUnique(bp, Math.min(2, bp.length)).map(a => rollAffix(a, 'legendary')), rollAffix(pickOne(covenantPool), 'legendary')]
  } else if (rk === 'rare') {
    setAffixes = [rollAffix(pickOne(bp), 'rare'), rollAffix(pickOne(covenantPool), 'rare')]
  } else {
    setAffixes = [rollAffix(pickOne(covenantPool), 'magic')]
  }
  return {
    uid: makeUid(),
    name: `${def.name}·${SET_PIECE_NAME[pieceIdx]}`,
    slot, rarity,
    affixes: setAffixes,
    setId: 'covenant_set', setPiece: pieceIdx + 1,
  }
}

// 灰燼聖約専用傳奇武器掉落
function generateCovenantLegendary(slot: EquipmentSlot): Equipment {
  const uid = makeUid()
  const bp = basicPool(slot)
  const cp = corePool(slot)
  if (slot === 'weapon') {
    const leg = COVENANT_WEAPON_LEGENDARIES[rand(0, COVENANT_WEAPON_LEGENDARIES.length - 1)]
    const [a1, a2] = pickUnique([...bp, ...cp], 2)
    return {
      uid, name: leg.name, slot, rarity: 'legendary',
      affixes: [rollAffix(a1, 'legendary'), rollAffix(a2, 'legendary')],
      legendaryEffectId: leg.effectId,
      legendaryDesc: leg.desc,
    }
  }
  const pool = SLOT_LEGENDARIES[slot] ?? BODY_LEGENDARIES
  const leg = pool[rand(0, pool.length - 1)]
  return {
    uid, name: leg.name, slot, rarity: 'legendary',
    affixes: [...pickUnique(bp, Math.min(2, bp.length)).map(a => rollAffix(a, 'legendary')), rollAffix(pickOne(cp), 'legendary')],
    legendaryEffectId: leg.effectId,
    legendaryDesc: leg.desc,
  }
}

// 灰燼聖約地城掉落
export function tryGenerateCovenantDrop(isElite: boolean, isBoss: boolean, heroRole?: Role, difficulty: 'normal' | 'hero' | 'legendary' = 'normal'): Equipment | null {
  const ELITE_DROP: Record<string, number> = { normal: 0.25, hero: 0.38, legendary: 0.50 }
  if (isBoss) {
    const rarity: EquipmentRarity = Math.random() < 0.5 ? 'legendary' : 'rare'
    if (Math.random() < 0.40) return generateCovenantSetPiece(rarity)
    if (Math.random() < 0.35) {
      const slots: EquipmentSlot[] = ['weapon', 'body', 'ring']
      return generateCovenantLegendary(pickOne(slots))
    }
    return generateEquipment(pickOne(['weapon', 'head', 'body', 'hands', 'boots', 'ring', 'accessory'] as EquipmentSlot[]), rarity, heroRole)
  }
  if (isElite) {
    if (Math.random() > ELITE_DROP[difficulty]) return null
    const rarity: EquipmentRarity = Math.random() < 0.25 ? 'legendary' : Math.random() < 0.5 ? 'rare' : 'magic'
    if (rarity !== 'magic' && Math.random() < 0.30) return generateCovenantSetPiece(rarity)
    return generateEquipment(pickOne(['weapon', 'head', 'body', 'hands', 'boots', 'ring', 'accessory'] as EquipmentSlot[]), rarity, heroRole)
  }
  return null
}

// 黑潮王座地城掉落
export function tryGenerateBlackTideDrop(isElite: boolean, isBoss: boolean, heroRole?: Role, difficulty: 'normal' | 'hero' | 'legendary' = 'normal'): Equipment | null {
  const ELITE_DROP: Record<string, number> = { normal: 0.25, hero: 0.38, legendary: 0.50 }
  if (isBoss) {
    const rarity: EquipmentRarity = Math.random() < 0.5 ? 'legendary' : 'rare'
    if (Math.random() < 0.40) return generateAbyssSetPiece(rarity)
    if (Math.random() < 0.35) {
      const slots: EquipmentSlot[] = ['weapon', 'body', 'ring']
      return generateBlackTideLegendary(pickOne(slots))
    }
    return generateEquipment(pickOne(['weapon', 'head', 'body', 'hands', 'boots', 'ring', 'accessory'] as EquipmentSlot[]), rarity, heroRole)
  }
  if (isElite) {
    if (Math.random() > ELITE_DROP[difficulty]) return null
    const rarity: EquipmentRarity = Math.random() < 0.25 ? 'legendary' : Math.random() < 0.5 ? 'rare' : 'magic'
    if (rarity !== 'magic' && Math.random() < 0.30) return generateAbyssSetPiece(rarity)
    return generateEquipment(pickOne(['weapon', 'head', 'body', 'hands', 'boots', 'ring', 'accessory'] as EquipmentSlot[]), rarity, heroRole)
  }
  return null
}

export const SLOT_LABEL: Record<EquipmentSlot, string> = {
  weapon: '武器', head: '頭部', body: '身體', hands: '手部',
  boots: '鞋子', ring: '戒指', accessory: '飾品', armor: '身體',
}

// ── Forge costs ────────────────────────────────────────────────────────────
export const REROLL_COST: Record<EquipmentRarity, number> = {
  normal: 25, magic: 50, rare: 120, legendary: 280,
}

export function rerollCostWithLocks(rarity: EquipmentRarity, lockedCount: number): number {
  return Math.round(REROLL_COST[rarity] * (1 + lockedCount * 0.5))
}

export const UPGRADE_COST: Partial<Record<EquipmentRarity, number>> = {
  normal: 150, magic: 400, rare: 1500,
}

export const RARITY_NEXT: Partial<Record<EquipmentRarity, EquipmentRarity>> = {
  normal: 'magic', magic: 'rare', rare: 'legendary',
}

// 傳奇效果 id 改版對照表：舊 id → 新 id（載入時自動升級存檔）
const LEGENDARY_EFFECT_RENAMES: Partial<Record<string, LegendaryEffectId>> = {
  gear_reroll_charge: 'gear_overheat_cannon',
}

/**
 * 存檔遷移：若裝備含有不屬於新部位詞綴池的詞綴，重骰全部詞綴。
 * - 套裝件跳過（含職業專屬詞綴，不在通用池內）
 * - normal 品質跳過（無詞綴）
 * - 冪等：已合規的裝備不會被動到
 * - 同時處理傳奇 effectId 改版（LEGENDARY_EFFECT_RENAMES）
 */
export function migrateEquipment(item: Equipment): Equipment {
  // 傳奇 effectId 改版升級
  if (item.legendaryEffectId && item.legendaryEffectId in LEGENDARY_EFFECT_RENAMES) {
    const newId = LEGENDARY_EFFECT_RENAMES[item.legendaryEffectId]!
    const def = LEGENDARY_DEFS[newId]
    item = {
      ...item,
      legendaryEffectId: newId,
      legendaryDesc: def?.desc ?? item.legendaryDesc,
      name: item.slot === 'weapon' ? (def?.name ?? item.name) : item.name,
    }
  }

  if (item.rarity === 'normal' || item.affixes.length === 0) return item
  if (item.setId) return item  // 套裝件保留職業詞綴
  const allowed = new Set<AffixId>([...basicPool(item.slot), ...corePool(item.slot)])
  if (item.affixes.every(a => allowed.has(a.id))) return item  // 已合規，不動
  return forgeReroll(item)  // 有違規詞綴 → 重骰（使用新部位池）
}

/** Re-roll affixes only; keeps uid, name, slot, rarity, role, legendaryEffectId */
export function forgeReroll(item: Equipment): Equipment {
  const bp = basicPool(item.slot)
  const cp = corePool(item.slot)
  let affixes: Affix[]
  const setClassPool = item.setId && item.requiredRole ? (CLASS_AFFIXES[item.requiredRole] ?? undefined) : undefined
  if (item.rarity === 'legendary') {
    const classPool = setClassPool ?? (item.slot === 'weapon' && item.requiredRole ? CLASS_AFFIXES[item.requiredRole] : undefined)
    let a1: AffixId, a2: AffixId, a3: AffixId
    if (classPool && classPool.length > 0) {
      ;[a1, a2] = pickUnique([...bp, ...cp], 2)
      a3 = pickOne(classPool)
    } else {
      ;[a1, a2, a3] = pickUnique([...bp, ...cp], 3)
    }
    affixes = [rollAffix(a1, 'legendary'), rollAffix(a2, 'legendary'), rollAffix(a3, 'legendary')]
  } else if (item.rarity === 'rare') {
    const thirdPool = setClassPool && setClassPool.length > 0 ? setClassPool : cp
    affixes = [rollAffix(pickOne(bp), 'rare'), rollAffix(pickOne(thirdPool), 'rare')]
  } else {
    affixes = pickUnique(bp, rand(1, Math.min(2, bp.length))).map(a => rollAffix(a, 'magic'))
  }
  return { ...item, affixes }
}

/** Re-roll only unlocked affixes; locked indices are preserved from the original item. */
export function forgeRerollPartial(item: Equipment, lockedIndices: Set<number>): Equipment {
  if (lockedIndices.size === 0) return forgeReroll(item)
  const newItem = forgeReroll(item)
  const affixes = newItem.affixes.map((a, i) =>
    lockedIndices.has(i) && i < item.affixes.length ? item.affixes[i] : a
  )
  return { ...newItem, affixes }
}

/** Upgrade rarity one tier; keeps existing affix IDs and re-rolls values to new tier.
 *  magic→rare also adds 1 new affix; rare→legendary adds legendary effect. */
export function forgeUpgrade(item: Equipment): Equipment {
  const next = RARITY_NEXT[item.rarity]
  if (!next) return item

  const nextRarity = next as 'magic' | 'rare' | 'legendary'

  // normal → magic: no existing affixes, generate fresh set
  if (item.rarity === 'normal') {
    const bp = basicPool(item.slot)
    const setClassPool = item.setId && item.requiredRole ? (CLASS_AFFIXES[item.requiredRole] ?? undefined) : undefined
    const pool = setClassPool && setClassPool.length > 0 ? setClassPool : bp
    const affixes = pickUnique(pool, rand(1, Math.min(2, pool.length))).map(a => rollAffix(a, 'magic'))
    return { ...item, rarity: 'magic', affixes }
  }

  // Re-roll existing affixes to next tier's range (keep IDs)
  const upgradedAffixes = item.affixes.map(a => rollAffix(a.id, nextRarity))

  // magic → rare: keep existing (now rare values); if only 1 affix, add 1 from core/classPool to reach 2
  if (item.rarity === 'magic') {
    const setClassPool = item.setId && item.requiredRole ? (CLASS_AFFIXES[item.requiredRole] ?? undefined) : undefined
    const extraPool = setClassPool && setClassPool.length > 0 ? setClassPool : corePool(item.slot)
    const finalAffixes = upgradedAffixes.length < 2
      ? [...upgradedAffixes, rollAffix(pickOne(extraPool), 'rare')]
      : upgradedAffixes
    return { ...item, rarity: 'rare', affixes: finalAffixes }
  }

  // rare → legendary: keep existing (now legendary values) + add legendary effect
  // Set pieces don't get legendaryEffectId (power comes from set bonuses)
  if (item.setId) {
    return { ...item, rarity: 'legendary', affixes: upgradedAffixes }
  }

  let legendaryEffectId: LegendaryEffectId | undefined
  let legendaryDesc: string | undefined
  let name = item.name

  if (item.slot === 'weapon' && item.requiredRole) {
    const leg = WEAPON_LEGENDARIES[item.requiredRole]
    legendaryEffectId = leg.effectId
    legendaryDesc = leg.desc
    name = leg.name
  } else if (ARMOR_SLOTS.includes(item.slot) || item.slot === 'armor') {
    const pool = SLOT_LEGENDARIES[item.slot] ?? BODY_LEGENDARIES
    const leg = pool[rand(0, pool.length - 1)]
    legendaryEffectId = leg.effectId
    legendaryDesc = leg.desc
    name = leg.name
  } else {
    const pool = SLOT_LEGENDARIES[item.slot] ?? RING_LEGENDARIES
    const leg = pool[rand(0, pool.length - 1)]
    legendaryEffectId = leg.effectId
    legendaryDesc = leg.desc
    name = leg.name
  }

  return { ...item, rarity: 'legendary', name, affixes: upgradedAffixes, legendaryEffectId, legendaryDesc }
}

// ── 裝備強化 ─────────────────────────────────────────────────────────────────
// +1 需要 1 件重複，+2 需要 2 件，+3 需要 3 件（每次升級的消耗，非累計）
/** 顯示用：回傳套入強化倍率後的詞墜文字（boolean 型詞墜不受影響） */
export function getAffixLabel(affix: Affix, enhanceLevel = 0): string {
  if (enhanceLevel <= 0 || affix.id === 'forbidden_once_guard') return affix.label
  const enhanced = Math.round(affix.value * (1 + enhanceLevel * 0.1))
  const fmt = AFFIX_LABELS[affix.id]
  return fmt ? fmt(enhanced) : affix.label
}

export const ENHANCE_COST: Record<number, number> = { 1: 1, 2: 2, 3: 3 }

export function getEnhanceDuplicates(item: Equipment, inventory: Equipment[]): Equipment[] {
  return inventory.filter(e => e.uid !== item.uid && e.name === item.name && e.rarity === item.rarity)
}

export function enhanceItem(
  item: Equipment,
  inventory: Equipment[],
): { updatedItem: Equipment; updatedInventory: Equipment[] } | null {
  const currentLevel = item.enhanceLevel ?? 0
  if (currentLevel >= 3) return null
  const nextLevel = currentLevel + 1
  const cost = ENHANCE_COST[nextLevel]
  const dupes = getEnhanceDuplicates(item, inventory)
  if (dupes.length < cost) return null
  const toConsume = new Set(dupes.slice(0, cost).map(d => d.uid))
  const updatedItem: Equipment = { ...item, enhanceLevel: nextLevel }
  const updatedInventory = inventory
    .filter(e => !toConsume.has(e.uid))
    .map(e => e.uid === item.uid ? updatedItem : e)
  return { updatedItem, updatedInventory }
}
