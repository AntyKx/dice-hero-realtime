export type Role = 'slash' | 'fire' | 'holy' | 'shadow' | 'ice' | 'arrow' | 'hammer' | 'song' | 'beast' | 'gear' | 'fighter' | 'death'

export type StatusType = 'burn' | 'freeze' | 'poison' | 'vulnerable' | 'armor_break'
export type StatusEffect = { type: StatusType; stacks: number }

export type BuffCardRarity = 'common' | 'rare' | 'epic'
export type CardLevelData = {
  desc: string
  effectOverride: Partial<BuffEffect>
}

export type BuffEffect = {
  flatDamage?: number
  damagePerRank?: number
  healMult?: number
  rerollBonus?: number
  burnOnAttack?: number
  freezeOnHighCombo?: number
  lowHpDamageMult?: number
  maxHpBonus?: number
  startShield?: number
  defBonus?: number
  luckyDie?: boolean
  fiveOfAKindBonus?: number
  angerStacks?: boolean
  poisonOnAttack?: number          // apply N poison stacks each attack
  armorBreakOnHighCombo?: number   // [minRank, amount] handled via separate fields
  armorBreakRank?: number
  vulnerableOnHighCombo?: number   // rank >= N → apply vulnerable
  comboDamage?: { minRank: number; value: number }  // combo.rank >= minRank → +value 傷害
  shieldBonusDmgPct?: number    // 護盾存在時傷害 +N%
  burnEnemyDmgPct?: number      // 敵人燃燒時傷害 +N%
  onesDamage?: number           // 每顆骰出 1 追加 N 傷害
  firstRerollFreeCard?: boolean // 快手改版: 第一次重骰免費
  rerollPlusDie?: boolean       // 完美主義改版: 每次重骰隨機一顆骰+1
  distinctDiceCardDmg?: number  // 精準射擊改版: 每種不同點數+N傷害
  overclockCard?: boolean       // 超頻機關改版: 重骰蓄層，攻擊釋放
  straightWeakenCard?: number   // 寒冰碎裂改版: 順子以上敵人攻擊-N%
  ignitePct?: number            // 烈焰噴發: 引爆N%燃燒層數造成即時傷害
  shieldToDmgPct?: number       // 盾擊訓練: 護盾值 N% 轉為傷害
  noRerollShield?: number       // 安全閥: 未重骰時 +N 護盾
  noRerollDmgPct?: number       // 穩定射擊: 未重骰時傷害 +N%
  rerollBurnBonus?: number      // 過熱爆破: 重骰≥2 次時攻擊附加 N 燃燒
  tabooRerollDmgPct?: number    // 禁忌重骰: each reroll adds N% dmg (max pct*3)
  tabooRerollSelfDmgPct?: number  // 禁忌重骰: lose N% of max HP per reroll
  curseDmgPct?: number          // 詛咒親和: each curse adds N% dmg
  cardHealPenaltyPct?: number   // 詛咒親和/破碎信仰: reduce heal by N%
  shieldGainMult?: number       // 破碎信仰: multiply skill shield gains
  sixHealPenaltyPct?: number    // 低語骰: reduce 6-die base heal by N%
  regenPerTurn?: number         // 鐵壁持久: each turn-start heal N HP
  highBurnDmgPct?: number       // 炎獄覺醒: enemy burn≥15 → dmg +N%
  healMilestoneBonus?: number   // 神罰強化: cumul heal≥maxHp → perm dmg +N%
  shadowMarkBurstDmg?: number   // 影刃爆印: mark consume → +N/stack, keep 1
  iceMarkDmgPerTurn?: number    // 霜晶爆裂: each ice mark → N dmg/turn
  iceBurstBonusDmg?: number     // 霜晶爆裂: ice burst extra N dmg
  fullUniqueBurnBonus?: number  // 火矢淬毒: 5 unique dice → +N burn stacks
  wolfDmgPerAtkStack?: number   // 獸魂共鳴: wolf +N% per 5 ATK stacks (cap 3×)
  minBoostCapRaise?: number     // 動能超載: raise min boost cap by N (to 4)
  lowHpFistGain?: boolean       // 破釜沉舟: HP<50% → +1 fist at turn start
  lowHpMunsouBonus?: number     // 破釜沉舟: HP<30% → 無雙 mult +N%
  highAtkStackDmgPct?: number   // 獸血爆發: 野性積累(attackAtkStack)≥10 → dmg +N%
  poetSoulHealToDmgPct?: number  // 詩人之魂: 治療時額外造成 N% 等量傷害（100% = 等量）
}
export type BuffCard = {
  id: string
  name: string
  desc: string
  rarity: BuffCardRarity
  effect: BuffEffect
  role?: Role
  dungeonOnly?: string
  maxLevel?: number        // 預設 1（不可升級）；3 = 可升至三級
  levelData?: CardLevelData[]  // [lv2, lv3] — effectOverride 只寫有變動的欄位
}

// ── Party ─────────────────────────────────────────────────────────────────
export type PartyMember = {
  heroId: string
  hp: number
  maxHp: number
  angerCount: number
  undyingUsed: boolean
}

// ── Relics ────────────────────────────────────────────────────────────────
export type RelicEffect = {
  rerollBonus?: number
  defBonus?: number
  startShield?: number
  goldOnSix?: number
  burnOnSix?: number
  startEnemyBurn?: number
  damageBonus?: number
  comboBonusDmg?: number   // 戰鼓: rank≥3 時傷害 +N
  healBonus?: number
  goldMult?: number
  // new rule-changing effects
  firstRerollFree?: boolean   // 命運骰杯: first reroll/battle is free
  onesToSix?: boolean         // 破碎骰冠: dice showing 1 become 6
  startSelfDmg?: number       // 破碎骰冠: take N damage at battle start
  reviveAtHp?: number         // 逆轉沙漏: revive once at N% HP (0-1)
  healOnSix?: number          // 星泉聖杯/生命骰杯: each 6 on dice → heal N HP
  healOnWin?: number          // 勝利樂章: after winning battle heal N HP
  // sustain relics
  healOnWinPct?: number       // 冒險者水壺: win → heal N% max HP (0-1)
  lowHpGuard?: number         // 逆轉護符: first time <30% HP → gain N guard
  lifestealPct?: number       // 吸血戒指/血月: N% of damage dealt → heal (0-1)
  straightWeaken?: boolean    // 森林斗篷: straight → enemy next atk -30%
  burnKillHeal?: number       // 餘燼心臟: kill a burning enemy → heal N HP
  poisonAtkPerTurn?: number   // 毒牙之環: 敵人中毒時每回合蓄積攻擊力（最多+15）
  poisonKillHeal?: number     // 毒牙之環: 擊殺中毒敵人回復 N HP
  angerBonusDmg?: number      // 血怒護符: 每層怒氣額外 +N 傷害
  angerLowHpKeep?: boolean    // 血怒護符: HP < 30% 時怒氣不消耗
  brokenArmorAmpPct?: number  // 破甲石錠: 破甲≥5 時傷害 +N%
  rerollDmgPct?: number          // 命運之手: 本回合重骰≥2 次時傷害 +N%
  lowHpPermanentAtk?: number     // 逆轉護符改版: 首次低血量時本場永久 +N 攻擊
  bloodDiceRerollSelfDmgPct?: number  // 血色骰: lose N% of max HP per reroll
  bloodDiceRerollDmgPct?: number    // 血色骰: +N% dmg per reroll (max pct*3)
  curseDmgPct?: number              // 詛咒王冠: +N% dmg per curse
  curseHealPenaltyPct?: number      // 詛咒王冠: -N% heal per curse
  shieldGainMult?: number           // 破碎聖杯: multiply shield gains
  relicHealMult?: number            // 破碎聖杯: multiply all healing
  relicMaxHpMult?: number           // 惡魔契約: max HP * N at pickup
  demonDmgPct?: number              // 惡魔契約: +N% damage
  corruptSixDice?: boolean          // 腐化骰杯: 6s deal dmg+vuln instead of heal
  // 燃燒王座遺物效果
  infernalFirstBacklashNegate?: boolean // 熄火燭台: first backlash per battle is negated
  healOnBurnApplied?: number            // 灰燼護符: heal N HP when burn is applied to self
  eliteKillFlameReduction?: number      // 王座餘燼: kill elite → next battle -N flame start
  highFlameDmgPct?: number              // 黑焰王冠: flame>=4 → player dmg +N%
  flamePerPointDmgPct?: number          // 燃魂契約: each flame point +N% damage
  flameBacklashExtra?: number           // 燃魂契約: backlash deals +N extra damage
  throneCollapseNullifyDmg?: number     // 破碎魔核: first full collapse clear → boss -N true dmg
  // 黑潮王座遺物效果
  tideHealOnChange?: number    // 潮汐珍珠: 潮汐切換時回復 N HP
  oxygenMaxBonus?: number      // 深海面罩: 氧氣上限 +N
  tidalDmgReduce?: number      // 潮殼護符: 漲潮時受傷害 -N%
  deepPressDmgPct?: number     // 深壓羅盤: 深壓時傷害 +N%
  killRestoreOxygen?: number   // 溺冠碎片: 擊殺後恢復 N 氧氣
  oxygenNoDecay?: boolean      // 潮汐王印: 氧氣不自然消耗
  // 灰燼聖約遺物效果
  covenantLowShield?: number       // 聖約護符: 聖約進度<50時每回合+N護盾
  covenantBurstHeal?: number       // 灰燼護墜: 審判後回復N HP
  covenantBurstDmgReduce?: number  // 誓約石: 審判傷害-N%
  covenantHighDmgPct?: number      // 審判之眸: 聖約進度≥75時傷害+N%
  covenantBurstAtkBonus?: number   // 聖約封印: 審判後本場永久攻擊+N（最多+32）
  covenantBurstShieldBonus?: number// 灰燼王印: 審判後獲N護盾
  // 職業專屬遺物效果
  shieldToDmgRelicPct?: number  // 護盾聖典: shield → extra +N% dmg (slash)
  highShieldFlatDmg?: number    // 護盾聖典: shield≥30 → +N flat dmg
  melodyHealAtkBonus?: number   // 旋律印記: heal turn>30 → ATK+N (cap 20)
  // 職業專屬遺物效果（v1.26.3 起把原本寫死在 BattleScreen.tsx 的數字搬進 effect，才能分級）
  shieldBadgeShield?: number       // 聖盾徽章: rank≥3 → +N 護盾
  shieldBadgeTauntPct?: number     // 聖盾徽章: rank=6 → 敵人本回合攻擊 -N%
  fireCrystalDmg?: number          // 炎晶法核: 順子 → 追加 N 傷害
  fireCrystalBurn?: number         // 炎晶法核: 順子 → 追加 N 層燃燒
  burnCodexExtraBurn?: number      // 灼熱魔典: 施加燃燒時額外 +N 層
  burnCodexSelfDmgPct?: number     // 灼熱魔典: 自身受到傷害 +N%
  revivalCrownHealMult?: number    // 復甦羽冠: HP<30% 時治療 ×N
  revivalCrownMaxUses?: number     // 復甦羽冠: 每場最多 N 次
  hawkCharmCritMult?: number       // 鷹眼護符: 順子傷害 ×N
  scatterQuiverShield?: number     // 散形箭袋: 散骰 → +N 護盾
  armorHammerBreak?: number        // 破甲鐵錘: 三條以上 → 敵人防禦 -N
  frostShardDmg?: number           // 冰晶碎片: 凍結時額外 +N 傷害
  ancientLuteDmgPct?: number       // 古老魯特琴: 首次兩對以上 → 傷害 +N%
  steamCoreDmgPerCharge?: number   // 蒸氣核心: 每層充能釋放 +N 傷害
  nightCloakProcPct?: number       // 夜行者斗篷: 兩對以上追加攻擊機率 N%
  bloodBladeLifestealPct?: number  // 血月短刃: 吸血 N%
  wildBondDmg?: number             // 野性羈絆: 受治療時對敵造成 N 傷害
  wolfNecklaceProcPct?: number     // 狼魂項鍊: 攻擊後召喚狼機率 N%（三條以上仍固定 100%）
  permafrostDmg?: number           // 永凍之地: 凍結解除時造成 N 碎冰傷害
  hunterTrapProcPct?: number       // 獵人陷阱: 敵人攻擊前 N% 機率被束縛
  anvilKingShield?: number         // 山王鐵砧: 受到攻擊後獲得 N 護盾（每回合最多3次）
  autoTurretDmg?: number           // 自動砲台: 每回合 N 傷害（順子以上雙倍）
  fistJadeRingDmgPerStack?: number // 拳意玉環: 每層拳勢額外 +N 傷害
  dragonHeartTrueDmg?: number      // 龍心碑: 無雙架式期間每次攻擊追加 N 真實傷害
  dragonHeartHealOnEnd?: number    // 龍心碑: 無雙架式結束時回復 N HP
  fateHunterDiceRerollCount?: number // 命運獵骰: 每回合前 N 次重骰套用效果
  // 星蝕裂隙専屬遺物效果
  starSandCompassGuaranteedLow?: number // 星砂羅盤: 戰鬥開始保證 N 個禁忌點數落在最低幾位數字
  riftAmuletReducePct?: number     // 裂隙護符: 禁忌自傷效果 -N%
  moonDiceCupShield?: number       // 月紋骰杯: 淨骰時 +N 護盾
  reversedAstrolabeDmgPct?: number // 逆位星盤: 含禁忌時傷害 +N%
  forbiddenContractDmgPct?: number // 禁忌契約: 含禁忌時傷害 +N%
  forbiddenContractSelfDmg?: number // 禁忌契約: 含禁忌時額外自傷 N
  starHourglassMaxUses?: number    // 星界沙漏: 每場戰鬥最多 N 次
  riftCoreStackGain?: number       // 裂隙核心: 每次避開禁忌蓄積 +N 傷害
  riftCoreCap?: number             // 裂隙核心: 蓄積上限 N
  judgmentEyeDmg?: number          // 審判之眼: 每 3 回合淨骰 → N 真實傷害
}
export type RelicLevelData = {
  desc: string
  effectOverride: Partial<RelicEffect>
}
export type Relic = {
  id: string
  name: string
  desc: string
  tier: 'common' | 'rare' | 'boss'
  requiredRole?: Role         // class-specific: only appears for this role
  dungeonOnly?: string        // only drops in this dungeon id
  effect: RelicEffect
  maxLevel?: number          // 預設 1（不可升級）；3 = 可升至三級
  levelData?: RelicLevelData[]  // [lv2, lv3] — effectOverride 只寫有變動的欄位
}

// ── Curses ────────────────────────────────────────────────────────────────
export type CurseEffect = {
  rerollPenalty?: number
  maxHpMult?: number
  selfDmgPct?: number       // % of current HP lost per turn start (bleeding)
  healPenaltyPct?: number   // reduce healing received by N% (corrosion)
  lockRandomDie?: number    // lock N random dice per turn start (chaos)
  enemyAtkMult?: number     // enemy ATK +N% (exposed)
  // 燃燒王座詛咒效果
  flameExtraChance?: number   // % chance to gain extra +1 flame on any increase
  backlashHealPenalty?: number// heal -N% for 2 turns after backlash
  bossFlameAtkBonus?: number  // boss ATK +N% when flame >= 4 (boss battle)
  highDmgSelfHit?: number     // self-damage N when dealing > 100 damage
  startFlameBonus?: number    // start each battle with +N flame
  // 黑潮王座詛咒效果
  oxygenExtraDecay?: number    // 深淵窒息: 每回合額外 -N 氧氣
  tidalSurgeShield?: number    // 怒潮洶湧: 漲潮切入時敵人額外獲得 +N 護盾
  drownDmgPct?: number         // 溺亡命運: 溺水傷害 = N% 最大HP（int, e.g. 15）
}
export type Curse = { id: string; name: string; desc: string; effect: CurseEffect; dungeonOnly?: string }

// ── Potions (consumables) ───────────────────────────────────────────────────
export type PotionEffect = {
  healFlat?: number
  healPct?: number          // fraction of max HP (0-1)
  shield?: number
  regenTurns?: number
  regenAmt?: number
  applyBurnStacks?: number     // 烈焰藥水: apply N burn stacks to enemy
  applyPoisonStacks?: number   // 毒液藥水: apply N poison stacks to enemy
  applyFreezeStacks?: number   // 霜凍藥水: freeze enemy N turns
  applyVulnerableStacks?: number // 易傷藥水: apply N turns vulnerable to enemy
  atkBonus?: number            // 力量藥水: permanent ATK +N this battle
  potionDefBonus?: number      // 石皮藥水: permanent DEF +N this battle
  furyDmgMult?: number         // 狂怒藥水: next attack ×N
  furySelfDmg?: number         // 狂怒藥水: self-damage on use
  lifestealOncePct?: number    // 吸血藥水: this attack heals N% of damage dealt
  forceSixOneDie?: boolean     // 骰神藥水: one random die becomes 6
  rerollBonus?: number         // 醒神藥水: +N rerolls this turn
}
export type Potion = { id: string; name: string; icon: string; desc: string; effect: PotionEffect }
export const MAX_POTIONS = 3

// ── Equipment ─────────────────────────────────────────────────────────────
export type EquipmentSlot =
  | 'weapon' | 'head' | 'body' | 'hands' | 'boots' | 'ring' | 'accessory'
  | 'armor'   // legacy alias (舊存檔相容)
export type LoadoutSlot = 'weapon' | 'head' | 'body' | 'hands' | 'boots' | 'ring1' | 'ring2' | 'accessory'
export type EquipmentRarity  = 'normal' | 'magic' | 'rare' | 'legendary'

export type AffixId =
  | 'flat_damage' | 'damage_per_rank' | 'burn_on_attack' | 'poison_on_attack'
  | 'hp_bonus' | 'def_bonus' | 'start_shield' | 'reroll_bonus'
  | 'heal_bonus' | 'gold_pct'
  // ── 職業專屬詞綴（只出現在套裝部位）────────────────────────────────────
  | 'six_shield_affix'    // 聖騎士：每顆 6 獲得 N 護盾
  | 'shield_dmg_pct'      // 聖騎士：護盾存在時傷害 +N%
  | 'burn_amp'            // 火法：燃燒傷害 +N%
  | 'burn_enemy_bonus'    // 火法：對燃燒敵人 +N 傷害
  | 'overheal_shield'     // 神官：溢出治療 N% 轉護盾
  | 'post_heal_atk'       // 神官：治療後下次攻擊 +N
  | 'two_pair_extra'      // 刺客：兩對以上追加 N% 傷害
  | 'poison_bonus'        // 刺客：對中毒敵人 +N 傷害
  | 'frozen_bonus'        // 冰法：對凍結敵人 +N 傷害
  | 'distinct_dice_dmg'   // 遊俠：每種不同點數 +N 傷害
  | 'def_to_dmg'          // 矮人：防禦 N% 轉化為傷害
  | 'reroll_charge_atk'   // 機關：每次重骰蓄能 +N 攻擊
  | 'wolf_dmg_bonus'      // 獸語：所有狼攻擊 +N 傷害
  // ── 武器通用詞綴 ──────────────────────────────────────────────────────
  // ── 頭部詞綴 ──────────────────────────────────────────────────────────
  | 'low_reroll_bonus'    // 冷靜：本回合重骰 ≤ 2 次時傷害 +N%
  | 'focus_first_turns'  // 專注：前 2 回合傷害 +N%
  | 'first_reroll_free'  // 預見：每場戰鬥第一次重骰不消耗次數（value=1 固定）
  | 'vulnerable_on_straight' // 弱點洞察：順子以上施加易傷（value=1 固定）
  // ── 武器通用詞綴 ──────────────────────────────────────────────────────
  | 'execute_dmg'         // 斬殺：敵人 HP < 30% 時傷害 +N%
  | 'combo_dmg'           // 三條強擊：三條以上時傷害 +N%
  | 'armor_break_on_combo'// 破甲重擊：三條以上施加 N 層破甲
  | 'crit_on_big_combo'   // 暴擊紋：順子以上時額外 +N 傷害
  // ── 職業專屬詞綴（第二輪，各職業 2-3 條）──────────────────────────────
  | 'slash_shield_echo'    // 聖騎：護盾>0每回合對敵 N 傷害
  | 'slash_divine_punish'  // 聖騎：護盾>20追加 N 真實傷害
  | 'fire_conflagration'   // 火法：敵燃燒≥6層追加 N 傷害
  | 'fire_ember_guard'     // 火法：施加燃燒後獲得 N 護盾
  | 'holy_light_return'    // 神官：治療時 N% 轉為傷害
  | 'holy_blessed_dice'    // 神官：兩對以上回復 N HP
  | 'shadow_backstab'      // 刺客：敵中毒+兩對以上傷害 +N%
  | 'shadow_poison_burst'  // 刺客：對中毒敵人追加 N 傷害
  | 'ice_frost_mark'       // 冰法：N% 機率施加 1 層凍結
  | 'ice_shatter'          // 冰法：攻擊凍結敵人追加 N 傷害
  | 'arrow_volley'         // 遊俠：5 顆不同追加 N 傷害
  | 'arrow_snipe'          // 遊俠：不重骰傷害 +N%
  | 'hammer_counter'       // 矮人：受攻後下次攻擊 +N
  | 'hammer_armor_crush'   // 矮人：三條以上施加 N 層破甲
  | 'song_war_cry'         // 詩人：治療後下次攻擊傷害 +N%
  | 'song_melody'          // 詩人：連續兩回合不同骰型獲得 N 護盾
  | 'beast_wolf_echo'      // 獸語：召喚狼後下次攻擊 +N
  | 'beast_wild_heal'      // 獸語：狼攻擊時回復 N HP
  | 'gear_overload'        // 機關：重骰 3 次以上追加 N 傷害
  | 'gear_cog_shield'      // 機關：每次重骰獲得 N 護盾
  | 'fighter_combo_strike' // 武鬥：連續技觸發時傷害 +N
  | 'fighter_exploit'      // 武鬥：敵易傷+兩對以上追加 N 傷害
  | 'fighter_dragon_charge'// 武鬥：未重骰時下回合攻擊 +N%
  // ── 星蝕詞綴 ──────────────────────────────────────────────────────────
  | 'forbidden_clean_dmg'        // 不含禁忌點數時傷害 +N%
  | 'forbidden_once_guard'       // 每場首次禁忌副作用免疫（value=1 固定）
  | 'forbidden_self_dmg_reduce'  // 禁忌自傷 -N%
  | 'clean_dice_shield'          // 不含禁忌點數時獲得 N 護盾
  | 'forbidden_removed_atk'      // 每次重骰蓄積 +N 傷害（禁忌戰鬥）
  | 'eclipse_followup'           // 兩對以上且不含禁忌點數追加 N 傷害
  // ── 燃燒王座詞綴 ───────────────────────────────────────────────────────
  | 'infernal_flame_dmg'   // 魔焰值≥3時傷害 +N%
  | 'ember_shield'         // 擊殺敵人後獲得 N 護盾
  | 'flame_suppressor'     // 魔焰反噬傷害降低 N%
  | 'burning_soul'         // HP<50% 時傷害 +N%
  | 'shield_breaker_dmg'   // 對有護盾敵人傷害 +N
  | 'ash_resonance'        // 受到燃燒或灰燼詛咒後，下次攻擊 +N
  // ── 黑潮王座詞綴 ───────────────────────────────────────────────────────
  | 'tide_dmg_bonus'        // 退潮/亂流時傷害 +N%
  | 'oxygen_shield'         // 每點氧氣回合開始獲得 +N 護盾
  | 'deep_suppress_dmg'     // 深壓中傷害 +N%
  | 'tidal_barrier'         // 漲潮時受傷害 -N%
  | 'kelp_resonance'        // 擊殺後恢復 1 點氧氣
  | 'drowned_soul'          // 氧氣耗盡時傷害 +N%（溺水搏命）
  // ── 灰燼聖約詞綴 ─────────────────────────────────────────────────────
  | 'covenant_low_dmg'      // 聖約進度 < 50 時傷害 +N%
  | 'covenant_burst_shield' // 聖約審判後獲得 N 護盾
  | 'covenant_suppress'     // 聖約審判傷害 -N%
  | 'covenant_high_atk'     // 聖約進度 ≥ 75 時傷害 +N%
  // ── 手部詞綴 ──────────────────────────────────────────────────────────
  | 'two_pair_followup'    // 連擊：兩對以上時追加 N 傷害
  | 'armor_break_on_attack'// 破甲手套：攻擊時施加 N 層破甲
  | 'reroll_shield'        // 重骰護盾：每次重骰獲得 N 護盾
  // ── 鞋子詞綴 ──────────────────────────────────────────────────────────
  | 'first_turn_dmg'       // 先制：第一回合傷害 +N%
  | 'no_reroll_bonus'      // 靜心：本回合不重骰時傷害 +N%
  | 'dodge_once'           // 迴避：每場首次受攻減傷 N%
  | 'early_reroll_bonus'   // 疾行：前 2 回合重骰次數 +1
  | 'kill_next_turn_dmg'   // 追擊：擊殺敵人後下回合傷害 +N%
  // ── 身體詞綴 ──────────────────────────────────────────────────────────
  | 'shield_guard'         // 護盾存在時受到傷害 -N%（堅壁）
  | 'first_hit_reduce'     // 每場戰鬥第一次受攻擊減傷 N%（厚甲）
  | 'thorns_dmg'           // 受到攻擊時反彈 N 傷害（反震）
  | 'shield_retain'        // 護盾吸收時保留 N% 護盾（護盾保留）
  | 'turn_shield'          // 每 3 回合獲得 N 護盾（鐵壁）
  // ── 戒指詞綴 ──────────────────────────────────────────────────────────
  | 'straight_dmg'         // 順勢攻擊：順子以上時傷害 +N%
  | 'fire_resonance'       // 火焰共鳴：敵人燃燒≥4層時傷害 +N%
  | 'poison_resonance'     // 毒蝕共鳴：中毒敵人每回合額外受到 N 傷害
  | 'frozen_resonance'     // 冰封共鳴：攻擊凍結敵人時追加 N 傷害
  | 'five_unique_bonus'    // 完美骰紋：五顆點數皆不同時追加 N 傷害
  | 'straight_shield'      // 小順子祝福：順子以上時獲得 N 護盾
  // ── 飾品詞綴 ──────────────────────────────────────────────────────────
  | 'salvage_bonus'        // 星塵回收：分解獲得星塵 +N%
  | 'drop_luck'            // 幸運：金幣獎勵 +N%
  | 'forge_discount'       // 重鑄折扣：重鑄費用 -N%
  | 'cleanse_once'         // 淨化：每場首次受到負面狀態時免疫
  | 'life_recover_once'    // 回魂：HP < 30% 時回復 N HP，每場一次
  | 'bad_roll_retry'       // 命運偏轉：每場首次重骰結果差時自動重骰一次

export type Affix = { id: AffixId; value: number; label: string }

export type LegendaryEffectId =
  // Weapon — class-specific, Build-defining (warps a dice rule, not flat stats)
  | 'slash_damage_shield'   // 每顆6→+8護盾；≥2顆6→敵人本回合攻擊-40%（嘲諷）
  | 'fire_burn_explosion'   // 三條以上每超過一階追加小火球(+10傷+2燃燒)，順子視為達標
  | 'holy_heal_damage'      // 兩對以上治療×1.5，溢出治療轉護盾
  | 'shadow_first_strike'   // 兩對以上攻擊傷害×1.6
  | 'ice_freeze_aura'       // 順子/四條以上必凍結；每1層凍結(含本回合新施加)→攻擊+8
  | 'arrow_double_hit'      // 骰子每種不同點數各追加一箭(+6傷)
  | 'arrow_scatter_free_attack' // 散骰(5種不同點數)傷害×1.6；順子傷害+50%
  | 'hammer_charge_crit'    // 三條以上敵防永久-5(可疊加)；對破甲敵人+25%傷害
  | 'song_dice_boost'       // 造成傷害後下回合骰子最低值+1（上限+3）
  | 'beast_atk_stack'       // 連續同骰型召喚狼(+14傷/回8HP)；每攻擊本場ATK+3(上限30)
  | 'gear_reroll_charge'    // 每次重骰累積炮彈(+8傷)；對子越多每對+50% (舊版)
  | 'gear_overheat_cannon'  // 每次重骰獲得1層過熱(最多5)；每層+6傷；5層追加爆裂炮30傷
  // 4-piece set exclusives (different from weapon legendaries)
  | 'slash_set4'            // 有護盾時受到傷害降低20%；攻擊追加護盾值25%傷害
  | 'fire_set4'             // 攻擊時每層燃燒額外+2傷（上限40）
  | 'ice_set4'              // 敵人每次獲得冰痕時英雄+5護盾；冰痕達5層觸發碎冰爆發(30傷+攻-20%)
  | 'song_set4'             // 治療時對敵人造成治療量30%的旋律傷害
  | 'beast_set4'            // 兩對以上時，狼魂助攻傷害+25%(隨本次傷害縮放)/+6HP
  // Armor — generic
  | 'armor_regen'           // 每回合回復5HP
  | 'armor_thorns'          // 受到攻擊反彈30%傷害
  | 'armor_fortify'         // 起始護盾翻倍
  // Armor — generic (new)
  | 'armor_undying'         // 本場首次致死保留1HP並回復20%最大HP
  | 'armor_retaliate'       // 每次受到攻擊累積+18傷，下次出手釋放
  | 'armor_last_stand'      // HP<30%時傷害×1.4
  // Accessory — generic
  | 'acc_berserker'         // HP<30%時傷害×1.5
  | 'acc_vampire'           // 每次攻擊回復3HP
  | 'acc_gold_rush'         // 每場戰鬥開始+20金幣
  // Accessory — generic (new)
  | 'acc_momentum'          // 每次出手後傷害+8（可疊加至+40）
  | 'acc_lifesteal'         // 每次攻擊回復傷害的10%（上限20HP）
  | 'acc_combo_burst'       // 葫蘆/順子以上時本次傷害+35%
  // Armor — additional generic
  | 'armor_barrier'         // 每2回合+10護盾
  | 'armor_vengeance'       // 受擊+4永久攻擊（上限+20）
  | 'armor_warden'          // 護盾存在時受傷害-3
  | 'armor_second_skin'     // 第3回合起傷害-20%
  // Ring — generic
  | 'ring_executioner'      // 敵人HP<25%傷害×1.6
  | 'ring_precision'        // 不重骰出手傷害+30%
  | 'ring_soul_drain'       // 每回合真實傷害5
  | 'ring_echo'             // 每3回合出手傷害×1.5
  | 'ring_double_edge'      // 傷害×1.25，每回合多受2傷害
  | 'ring_blood_price'      // 攻擊-3HP，永久+6傷害（上限+30）
  // Accessory — additional generic
  | 'acc_shield_battery'    // 每回合+7護盾
  | 'acc_rebirth'           // 首次HP≤20%回復40HP
  | 'acc_pain_convert'      // 受擊後下次出手+15傷害
  | 'acc_trance'            // 連續出手3回合後第4回合×1.5
  | 'acc_sacrifice'         // 每次攻擊-5HP，傷害×1.3
  // ── 星蝕裂隙 legendaries ───────────────────────────────────────────────────
  | 'judge_staff'           // 星蝕裁決杖：淨骰→易傷2層；含禁忌→自傷6+傷害+25%
  | 'rift_bow'              // 裂隙獵弓：全不同+淨骰→5發星箭(各+6傷)
  | 'moon_blade'            // 月影短刃：兩對以上+淨骰→追加60%傷害（含禁忌50%機率）
  | 'star_shield_armor'     // 星盾聖甲：受禁忌副作用→等量護盾；本回合無禁忌→下回合防禦+6
  | 'observer_ring'         // 觀測者戒指：每場首次淨骰出手→回復10HP+1重骰
  | 'eclipse_4pc'           // 星蝕觀測者套裝4件效果
  // ── 燃燒王座 legendaries ───────────────────────────────────────────────────
  | 'throne_sword'        // 王座斷劍：魔焰≥4破盾；反噬後護盾
  | 'dark_flame_dagger'   // 黑焰短刃：魔焰≥5暴擊+40%；擊殺不加魔焰
  | 'ash_grimoire'        // 灰燼魔典：首次反噬→對敵真傷代替自傷
  | 'inferno_longbow'     // 煉獄長弓：不重骰-1魔焰；魔焰≥3追加燃燒
  | 'demon_core_engine'   // 魔核引擎：首次魔焰到6→不反噬改為免費重骰+護盾
  | 'throne_4pc'          // 焰獄征服者套裝4件效果
  // ── 黑潮王座 legendaries ───────────────────────────────────────────────────
  | 'tide_blade'          // 潮汐劍：退潮/亂流傷害+20%；漲潮每回合+8護盾
  | 'depth_lance'         // 深壓長槍：深壓傷害×1.35；rank≥3追加+12傷害
  | 'drowned_staff'       // 沉沒法杖：攻擊施加+3中毒；氧氣≥3時中毒傷害+50%
  | 'tidal_dagger'        // 潮影短刃：出手消耗1氧氣，傷害×1.25
  | 'abyss_hymn'          // 深淵讚歌：潮汐切換+12 HP；每點氧氣+2傷害
  | 'abyss_4pc'           // 深淵勇者套裝4件效果
  // ── 武鬥家 legendaries ─────────────────────────────────────────────────────
  | 'fighter_weapon'      // 龍皇滅世拳套：連續技額外+1拳勢；防守連段+10護盾；解鎖奧義：順子→順子/葫蘆→四條以上
  | 'fighter_set4'        // 無極霸拳4件：連段觸發+8護盾；防守/調息連段效果升至12；第一次中斷不失拳勢
  // ── 灰燼聖約 legendaries ───────────────────────────────────────────────
  | 'covenant_sword'        // 誓約聖劍：聖約進度≥75時追加18傷害；審判後回復15HP
  | 'ash_judgment_reversal' // 灰燼審判杖：聖約審判改為對敵造成30真傷（英雄不受傷）
  | 'covenant_4pc'          // 套裝4件：每次審判後攻擊永久+8（最多+32）；審判傷害-25%

// ── Set System ────────────────────────────────────────────────────────────
// 每職業一套；2 件給屬性、4 件解鎖該職業的招牌效果（沿用 LegendaryEffectId）
export type SetId =
  | 'slash_set' | 'fire_set' | 'holy_set' | 'shadow_set' | 'ice_set'
  | 'arrow_set' | 'hammer_set' | 'song_set' | 'beast_set' | 'gear_set'
  | 'eclipse_set'  // 星蝕觀測者套裝（全職業）
  | 'throne_set'   // 焰獄征服者套裝（全職業）
  | 'abyss_set'     // 深淵勇者套裝（黑潮王座）
  | 'covenant_set'  // 灰燼誓約套裝（灰燼聖約）
  | 'fighter_set'   // 無極霸拳套裝（武鬥家）

export type Equipment = {
  uid: string
  name: string
  slot: EquipmentSlot
  rarity: EquipmentRarity
  requiredRole?: Role
  affixes: Affix[]
  legendaryEffectId?: LegendaryEffectId
  legendaryDesc?: string
  setId?: SetId
  setPiece?: number   // 1~4，套裝中的第幾件
  enhanceLevel?: number  // 0~3，每級詞綴數值+10%
}

export type HeroLoadout = {
  weapon?:    string | null
  head?:      string | null
  body?:      string | null
  hands?:     string | null
  boots?:     string | null
  ring1?:     string | null
  ring2?:     string | null
  accessory?: string | null
  // legacy
  armor?:     string | null
}

export const INVENTORY_MAX = 250

// ── Talent System ────────────────────────────────────────────────────────
export type TalentPassiveId =
  | 'regen'            | 'shield_per_turn'  | 'burn_per_turn'
  | 'heal_shield'      | 'heal_dmg'         | 'skill_shield'
  | 'tank_stack'       | 'attack_atk_stack' | 'six_dmg_stack'   | 'unique_atk_stack'
  | 'reroll_min_boost' | 'proc_freeze'      | 'proc_freeze_chance' | 'freeze_per_turn'
  | 'heal_atk_bonus'
  // ── Star ability passives ─────────────────────────────────────────────
  | 'shield_on_combo'        | 'shield_to_dmg'
  | 'burn_on_high_combo'     | 'burn_explosion'
  | 'heal_pct_bonus'         | 'six_heal'             | 'overflow_shield'
  | 'proc_double_strike'     | 'enhanced_proc_debuff'
  | 'taunt_on_combo'         | 'freeze_burst'
  | 'unique_dice_dmg'        | 'full_unique_bonus'    | 'no_reroll_bonus'
  | 'armor_break_on_combo'   | 'shield_on_armor_break'| 'armor_break_dmg_bonus'
  | 'ranked_heal'            | 'consecutive_combo_bonus'
  | 'wolf_summon'            | 'wolf_summon_on_combo' | 'wolf_super_strike'
  | 'star_reroll_charge'     | 'star_reroll_charge_max' | 'star_overclock_cannon'
  // ── Talent-only passives ──────────────────────────────────────────────────
  | 'shield_to_dmg_talent'   | 'armor_break_on_attack'  | 'no_reroll_talent'
  // ── 機關技師 passives ─────────────────────────────────────────────────────
  | 'gear_heat_control'      // 過熱懲罰降低1；過熱3層以上獲得護盾
  | 'gear_blueprint_cooling' // 首次重骰不增加過熱；攻擊後過熱3+層獲得護盾
  // ── 影刃刺客 passives ─────────────────────────────────────────────────────
  | 'shadow_assassinate_poisoned' // 攻擊中毒敵人時追加 N 暗影傷害
  | 'shadow_evasion_mark'         // 重骰後達兩對以上獲得暗影印記（最多 3 層）
  | 'shadow_execute'              // 敵 HP < N% 時追加 N% 處決傷害
  | 'shadow_poison_bonus'         // 攻擊中毒敵人額外追加 1 層中毒
  | 'shadow_chain_execute'        // 擊敗敵人後下次攻擊必定觸發暗影追擊
  // ── 武鬥家 passives ───────────────────────────────────────────────────────
  | 'chain_armor_break'      // 連續技觸發時施加 N 層破甲
  | 'fist_power_flat_dmg'    // 拳勢每層 +N 傷害
  | 'munsou_enhance'         // 無雙架式連段效果 +N%；結束後保留 2 層拳勢

export type SkillOverrideId =
  | 'slash_power'    | 'slash_fortress'  | 'slash_combo'
  | 'fire_ignite'    | 'fire_furnace'    | 'fire_easy'
  | 'holy_angel'     | 'holy_judgment'   | 'holy_resonance'
  | 'shadow_burst'   | 'shadow_poison'   | 'shadow_easy' | 'shadow_deadly_poison_blade'
  | 'ice_permafrost' | 'ice_cryo_burst'  | 'ice_barrier'
  | 'arrow_barrage'  | 'arrow_snipe'     | 'arrow_poison'
  | 'hammer_quake'   | 'hammer_crush'    | 'hammer_easy'
  | 'song_power'     | 'song_requiem'    | 'song_inspire'
  | 'beast_fury'     | 'beast_king'      | 'beast_hold'
  | 'gear_overdrive' | 'gear_explosion'  | 'gear_precision' | 'gear_precision_v2'
  | 'fighter_dragon' | 'fighter_formless' | 'fighter_infinite'

export type TalentEffect = {
  flatDamage?: number
  damagePerRank?: number
  hpBonus?: number
  defBonus?: number
  startShield?: number
  rerollBonus?: number
  healBonus?: number
  burnOnAttack?: number
  startEnemyBurn?: number
  startEnemyFreeze?: number
  startEnemyPoison?: number
  rankedDamage?: { minRank: number; value: number }
  lowHpDamageMult?: number
  passiveId?: TalentPassiveId
  passiveValue?: number
  passiveValue2?: number   // NOT scaled by stars (used as threshold/rank)
  skillOverrideId?: SkillOverrideId
}

export type TalentChoice = {
  id: string; name: string; desc: string; effect: TalentEffect
}

export type TalentNode = {
  level: 20 | 40 | 60 | 80 | 100
  choices: [TalentChoice, TalentChoice, TalentChoice]
}

export type HeroAwakening = { name: string; desc: string; effect: TalentEffect }

export type HeroTalentTree = {
  heroId: string
  nodes: TalentNode[]
  awakening: HeroAwakening
}

export type HeroProgress = {
  level: number
  exp: number
  stars: number
  runsCompleted: number
  runsWon: number
  selectedTalents: Record<number, string>  // 舊天賦系統遺留欄位，新系統不再寫入，保留避免舊存檔炸開
  talentPoints: number        // 新天賦系統：可花費的點數，跟這個英雄自己綁定
  allocatedTalentIds: string[] // 新天賦系統：已點亮的節點 id（src/arena/arenaTalents.ts 的 ArenaTalentNode.id）
  ownedRelicIds: string[]     // Arena 遺物永久收藏（2026-08）：跨局持有，開局自動套用效果，見 src/arena/relics.ts
  /** 星界商城「遺物召喚」保底計數（2026-08），分英雄記錄——跟 ownedRelicIds/
   * 武器專屬遺物池都是分英雄的，保底邏輯自然也該跟著英雄走，不用全域計數。
   * relicSummonPityCount：累積抽數，抽到未持有的新遺物就歸零。
   * relicSummonDupStreak：連續抽到已持有的次數，抽到新的就歸零。 */
  relicSummonPityCount?: number
  relicSummonDupStreak?: number
}

export type TalentBonus = {
  flatDamage: number
  damagePerRank: number
  hpBonus: number
  defBonus: number
  startShield: number
  rerollBonus: number
  healBonus: number
  burnOnAttack: number
  startEnemyBurn: number
  startEnemyFreeze: number
  startEnemyPoison: number
  rankedDamages: Array<{ minRank: number; value: number }>
  lowHpDamageMult: number
  passives: Array<{ id: TalentPassiveId; value: number; value2?: number }>
  skillOverrideId?: SkillOverrideId
}

// ── Boss Mechanics ────────────────────────────────────────────────────────
export type BossSpecial =
  | 'dragon_scramble' | 'dark_knight_counter' | 'golem_armor'
  | 'goblin_poison' | 'orc_rage' | 'skeleton_revive'
  | 'slime_regen' | 'mimic_treasure' | 'witch_lock_die' | 'lancer_thunder'
  | 'wolf_frost' | 'yeti_shield_break' | 'hound_enrage' | 'bat_reroll_counter' | 'sorceress_curse'
  // ── 星蝕裂隙 enemies ───────────────────────────────────────────────────────
  | 'rift_imp_chaos' | 'star_sand_shield' | 'mirror_thief_copy'
  | 'eclipse_nun_regen' | 'rift_guardian_counter' | 'star_reaper_countdown'
  | 'eclipse_bishop'
  // ── 裂隙前兆篇 enemies ─────────────────────────────────────────────────────
  | 'dark_devotee_regen' | 'rift_praying_shield' | 'black_judge_eye'
  | 'dark_shaman_dual' | 'bishop_vanguard_mech'
  // ── 燃燒王座 enemies ───────────────────────────────────────────────────────
  | 'flame_imp_ignite' | 'molten_guard_shield' | 'ash_mage_curse'
  | 'inferno_hound_chase' | 'black_flame_counter' | 'fallen_fire_ritual'
  | 'throne_demon_king'
  // ── 深海遺城篇 enemies ─────────────────────────────────────────────────────
  | 'coral_crab_shell' | 'jellyfish_disrupt' | 'piranha_frenzy'
  | 'coral_colossus_shield' | 'anglerfish_lure'
  | 'drowned_guard_charge' | 'deep_lancer_ebb' | 'heavy_drowned_pressure'
  | 'sea_priestess_drain' | 'sea_emperor_guard_tide'
  | 'abyss_siren_song' | 'shell_knight_counter' | 'leviathan_charge'
  | 'sea_queen_blessing' | 'sleeping_emperor_phase'
  // ── 黑潮王座 enemies ───────────────────────────────────────────────────────
  | 'tidal_shell_guard' | 'azure_jellyfish_envoy' | 'drowned_court_soldier'
  | 'coral_guard_captain' | 'deep_pressure_eel' | 'sunken_crown_witch'
  | 'tide_king_ausrein'
  // ── 灰燼王國篇・第二章 enemies ────────────────────────────────────────────
  | 'ash_soldier_ember' | 'charred_archer_snipe' | 'molten_guardian_thorns' | 'ember_commander_buff'
  | 'levok_shield_boss'
  | 'castle_soldier_stubborn' | 'ash_guard_protect' | 'broken_knight_bleed' | 'soul_mage_dice'
  | 'laon_memory_boss'
  | 'tomb_keeper_seal' | 'soul_knight_lock' | 'royal_soul_empower' | 'forbidden_priest_six'
  | 'elysia_curse_boss'
export type BossMechanic = {
  chargeMax: number
  chargeName: string
  special: BossSpecial
  armorTurns?: number
}

// ── Events ────────────────────────────────────────────────────────────────
export type EventOutcomeType = 'heal' | 'full_heal' | 'gold' | 'damage' | 'relic' | 'curse' | 'rare_card' | 'nothing'
export type EventOutcome = {
  type: EventOutcomeType
  value?: number
  relicId?: string
  curseId?: string
  withCurse?: boolean   // 同時附加一個詛咒
  goldBonus?: number    // 同時增減金幣
}
export type EventChoice = { label: string; desc: string; outcome: EventOutcome }
export type GameEvent = { id: string; name: string; icon: string; desc: string; choices: EventChoice[] }

// ── Map ───────────────────────────────────────────────────────────────────
export type NodeType = 'battle' | 'elite' | 'rest' | 'shop' | 'event' | 'boss' | 'chest'
export type RouteType = 'safe' | 'risk' | 'resource'
export type MapNode = {
  id: number; type: NodeType; floor: number; layer: number; col: number
  connections: number[]; cleared: boolean; reachable: boolean
}

// ── Run & Meta ────────────────────────────────────────────────────────────
export type RunState = {
  party: PartyMember[]
  activePartyIdx: number
  gold: number
  cards: BuffCard[]
  relics: string[]
  curses: string[]
  enemyStatus: StatusEffect[]
  heroStatus: StatusEffect[]
  nodes: MapNode[]
  currentNodeId: number | null
  noDamageBattleCount: number
  chapter: number           // current chapter (1-3)
  routeType: RouteType      // chosen route type
  potions: string[]         // carried potion ids (max MAX_POTIONS)
  cardLevels: Record<string, number>  // card id → level (1~3)
  relicLevels?: Record<string, number>  // relic id → level (1~3); optional for old saves predating relic leveling
  campaign?: 'main' | 'rift_omen' | 'deep_sea' | 'ash_kingdom'    // active campaign (default 'main')
  dungeonEliteFlameBonus?: number  // throne_ember: accumulated elite kills → subtract from starting flame
  hourglassUsed?: boolean      // 逆轉沙漏：本 run 是否已觸發過
  equipUndyingUsed?: boolean   // 不死之甲：本 run 是否已觸發過
}

export type RunResult = { won: boolean; floorsCleared: number }

// ── Dungeon Clear Record (for leaderboard) ────────────────────────────────
export type DungeonClearRecord = {
  id: string
  playerId: string
  playerName: string
  dungeonId: string
  dungeonName: string
  difficulty: string
  heroClass: string
  // legendary-only fields
  score?: number
  rankGrade?: 'A' | 'S' | 'SS' | 'SSS'
  totalTurns: number
  remainingHpPercent?: number
  diceScore?: number
  challengeBonus?: number
  noDeathBonus?: number
  retryCount?: number
  clearSuccess: boolean
  clearTime: string  // ISO date string
  seasonId?: string
  isValidForRanking?: boolean
  starsEarned?: number
  rewards?: string[]
}

export interface ItemStack {
  id: string  // 'chest_normal' | 'chest_hero' | 'chest_legendary' | future item ids
  count: number
}

export type WorldCupPickChoice = 'home' | 'away' | 'draw'

export interface WorldCupPick {
  matchId: string
  home: string
  away: string
  date: string  // YYYY-MM-DD
  pick: WorldCupPickChoice
  resolved: boolean
  won?: boolean
}

export interface WorldCupState {
  picks: WorldCupPick[]
  successCount: number  // 累積成功次數（每滿 5 次兌換自選套裝寶箱後歸零繼續累積）
}

export type MetaState = {
  gold: number       // 通用貨幣：商店/裝備重鑄強化/直接買等級花費，跟 stardust（裝備強化材料）分開
  stardust: number
  totalRuns: number
  totalWins: number
  unlockedCardIds: string[]
  unlockedRelicIds: string[]
  inventory: Equipment[]
  loadouts: Record<string, HeroLoadout>
  heroProgress: Record<string, HeroProgress>
  fateLevel: number
  activeFateLevel: number
  lockedUids: string[]
  dungeonProgress?: Record<string, { cleared: boolean; bestFloor: number; clearedDifficulties?: string[] }>
  items?: ItemStack[]
  campaignCleared?: Record<string, boolean>   // campaign id → whether it's been cleared（舊回合制專用，森林遺跡不共用）
  worldCup?: WorldCupState
  talentTreeSchemaVersion?: number // Arena 天賦樹版本號（2026-08 v2 重做用），見 meta.ts loadMeta() 的遷移邏輯
  /** 森林遺跡固定關卡進度（2026-08）：純新增選填欄位，舊存檔沒有時視同 {}
   * （全部未通關），不需要 migration。key 是 CampaignStage.id（如 'forest_1_5'），
   * 星數只升不降、首通只會從 false 變 true，見 campaignProgress.ts。 */
  campaignStageProgress?: Record<string, { cleared: boolean; stars: number; firstClearClaimed: boolean }>
  /** 最後一次進去打的固定式主線關卡 id（2026-08-17，跨所有 9 個篇章通用，
   * 全域唯一 stageId 就能反查 campaignId）——不管陣亡或過關都會更新，供
   * 大廳「回到大廳看到的是我最後打的那一關」的預覽卡使用，見
   * AdventureReadyScreen.tsx。純新增選填欄位，舊存檔沒有時 fallback 回
   * 森林遺跡第一關。 */
  lastPlayedStageId?: string
  /** 即時制專屬裝備（2026-08 裝備系統重整）：跟回合制的 inventory/loadouts
   * 完全分開，型別是 arena/equipment.ts 的 ArenaEquipment/ArenaLoadout，
   * 不是 Equipment/HeroLoadout。純新增選填欄位，舊存檔沒有時視同空陣列/
   * 空物件，不需要 migration（本來就沒有舊資料可搬）。 */
  arenaInventory?: import('./arena/equipment').ArenaEquipment[]
  arenaLoadouts?: Record<string, import('./arena/equipment').ArenaLoadout>
  /** 星界商城「裝備召喚」抽卡保底計數（2026-08）：即時制裝備不分英雄
   * （全英雄共用倉庫），保底計數也全域一份即可。純新增選填欄位，舊存檔
   * 沒有時視同 0，不需要 migration。抽中橙裝(legendary)後歸零。
   * 「遺物召喚」的保底計數是分英雄的，見 HeroProgress.relicSummonPityCount。 */
  arenaGachaPityCount?: number
  /** 出戰陣容（2026-08，見 src/party.ts）：隊長（slot 0）＝目前實際出戰、
   * 傳給 ArenaConfig 的英雄，跟大廳選英雄是同一件事；2 位支援只提供
   * computePartyBonus() 算出的加成，不進入戰鬥。純新增選填欄位，舊存檔
   * 沒有時由 sanitizeParty() 補預設值，不需要 migration。 */
  party?: import('./party').PartyState
  /** 職業裝備強化／合成經濟（2026-08 倉庫重製，見 arena/equipment.ts）：
   * enhanceStoneCount 用於裝備強化（小幅連續成長），synthesisMaterialCount
   * 用於裝備合成（稀有度跳階），兩者都是帳號共用、不分英雄。純新增欄位，
   * 舊存檔沒有時視同 0，不需要 migration。 */
  enhanceStoneCount: number
  synthesisMaterialCount: number
  /** Adventure Stage 探索關卡進度（2026-08-19，見 src/adventure/adventureTypes.ts
   * 的 AdventureStageProgress）：key 是 stageId（目前只有 'forest_1_1'）。純新增
   * 選填欄位，舊存檔沒有時視同 {}，不需要 migration。 */
  adventureStageProgress?: Record<string, import('./adventure/adventureTypes').AdventureStageProgress>
}

export type EnemyAffixId = 'thorns' | 'regen' | 'armor' | 'berserk' | 'poison_sting' | 'immune'
export interface EnemyAffix { id: EnemyAffixId; value: number; label: string }

/** 戰場上的召喚小怪（被玩家攻擊優先擊殺） */
export interface BattleMinion {
  uid: string
  name: string
  hp: number
  maxHp: number
  atk: number
  def: number
  shield: number
  enemyId?: string
  dying?: boolean
}

export type CovenantEventBuff = {
  covenantStartBonus?: number   // add N to covenant progress at battle start
  covenantRateMult?: number     // multiply covenant gain rate (0.8 = -20%)
  covenantMaxLimit?: number     // override 100 cap (e.g., 80)
  ashJudgmentDmgMult?: number   // multiply 灰燼審判 damage
  enemyAtkMult?: number         // multiply enemy base ATK
  heroHealMult?: number         // multiply hero healing this battle
  startCovenantEmber?: boolean  // spawn a covenant_ember minion at battle start
}

export type GamePhase =
  | { type: 'main_menu' }
  | { type: 'equipment_manage' }
  | { type: 'adventure_ready' }
  | { type: 'hero_select' }
  | { type: 'route_select' }
  | { type: 'equipment_drop' }
  | { type: 'map' }
  | { type: 'battle'; isElite: boolean; isBoss: boolean; isChapterBoss: boolean; floorMult: number; goldReward: number; enemyId: string; enemyAffixes: EnemyAffix[]; forbiddenDice?: number[]; dungeonId?: string; dungeonDifficulty?: string; covenantEventBuff?: CovenantEventBuff }
  | { type: 'reward' }
  | { type: 'relic_reward' }
  | { type: 'shop' }
  | { type: 'rest' }
  | { type: 'event'; eventId: string }
  | { type: 'chapter_clear'; chapter: number }
  | { type: 'meta'; result: RunResult }
  | { type: 'game_over' }
  | { type: 'victory'; result: RunResult }
  | { type: 'dungeon_event'; eventId: string; nodeId: string }
  | { type: 'dungeon_select' }
  | { type: 'dungeon_map'; dungeonId: string; heroId: string }
  | { type: 'dungeon_result'; dungeonId: string; heroId: string; cleared: boolean; floorsCleared: number; difficulty?: string; expEarned?: number }
  | { type: 'dungeon_score'; dungeonId: string; heroId: string; clearRecord: DungeonClearRecord; rankings: import('./scoring').RankPositions; goldEarned: number; expEarned: number }
  | { type: 'leaderboard'; dungeonId?: string }
  | { type: 'gm' }
  | { type: 'arena_test' } // M1 即時制垂直切片測試場景，見 REALTIME_PIVOT_PLAN.md
  | { type: 'arena_run'; heroId: string; campaign?: string } // 正式即時制冒險入口，見 REALTIME_PIVOT_PLAN.md M3；campaign 決定敵人池，見 src/arena/enemies.ts
  // 固定式主線關卡（2026-08 森林遺跡；2026-08-16 加入雪原/魔王城共三篇章，
  // 見 src/campaign/）：跟上面 arena_run（Roguelite）完全分開的「第三種
  // 模式」，不共用/不覆寫 campaign 欄位語意。campaignId 決定 CampaignMapScreen
  // 顯示哪個篇章的地圖（見 campaignTypes.ts 的 CAMPAIGN_ID_FOREST_RUINS 等常數）。
  | { type: 'campaign_map'; heroId: string; campaignId: string }
  // 森林遺跡 1-1~1-5（2026-08-17）：跟其餘 85 關共用同一個 campaign_stage
  // phase／ArenaScreen，「同一張地圖完成探索＋戰鬤」完全是 ArenaGame.ts
  // 內部依 stageId 自動切換的行為（見 src/arena/exploreWorlds.ts），
  // App.tsx 不需要另外判斷或另一個 phase。
  | { type: 'campaign_stage'; heroId: string; stageId: string }
  // 篇選擇（2026-08-16 新增，稍晚補上兩層架構）：大廳「冒險」入口先到這裡選
  // 灰燼王國篇／裂隙前兆篇／深海遺城篇三篇之一，再進 campaign_chapter_select
  // 選篇底下的 3 個章節，最後才進 campaign_map；三層 phase 各自獨立，不是 modal。
  | { type: 'campaign_saga_select'; heroId: string }
  // 章節選擇：sagaId 決定顯示哪個篇底下的 3 個章節（見 campaignTypes.ts 的
  // CAMPAIGN_SAGAS），選好章節後進 campaign_map。
  | { type: 'campaign_chapter_select'; heroId: string; sagaId: string }
  // 出戰陣容設定（2026-08，見 src/party.ts）：大廳 3-slot 隊伍列點入的全頁
  // 編成畫面，不是 modal。editingSlot 記住從哪個格子點進來，離開時導回大廳。
  | { type: 'party_setup'; editingSlot: 0 | 1 | 2 }
  // 星界商城（2026-08-14）：大廳「商店」磚/抽屜入口的全頁畫面。目前沒有
  // 真實商城後端，商品是展示用原型資料，不接受真實購買（見
  // AstralShopScreen.tsx）。取名 astral_shop 不是 shop，因為 shop 已經是
  // Roguelite 副本節點商店（ShopScreen.tsx）在用的既有 phase，撞名的話
  // TS union 判別會直接壞掉。
  | { type: 'astral_shop' }
  // 倉庫（2026-08，取代大廳底部導覽的「英雄」）：裝備／遺物／道具三分頁的
  // 全頁畫面，見 WarehouseScreen.tsx。
  | { type: 'warehouse' }
  // Adventure Stage 探索關卡（2026-08-19，見 src/adventure/）：跟上面
  // campaign_stage／ArenaGame.ts 的 exploreWorld 系統完全獨立的全新引擎——
  // forest_1_1 從「跟其餘 85 關共用 campaign_stage/ArenaScreen」改成專屬
  // 這個 phase，走 AdventureStageScreen.tsx/AdventureGame.ts；其餘 89 關
  // （含森林遺跡 1-2~1-5）不受影響，繼續走 campaign_stage。是否要走這個
  // phase 由 isAdventureStageId(stageId) 判斷（見 App.tsx）。
  | { type: 'adventure_stage'; heroId: string; stageId: string }
