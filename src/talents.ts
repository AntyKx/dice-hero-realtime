import type {
  HeroTalentTree, HeroProgress, TalentBonus, TalentEffect,
} from './types'

// ── EXP formula ────────────────────────────────────────────────────────────
// Total EXP to reach lv100: ~19,600 (was 116,820)
export function getExpForLevel(level: number): number {
  return 100 + (level - 1) * 2
}

// 每 3 級發 1 點天賦點數；用 Math.floor(level/3) 的差值算，一次升好幾級
// 也不會漏發（跟 gainXp 的 while-not-if 是同一種顧慮）。
const LEVELS_PER_TALENT_POINT = 3

export function addHeroExp(progress: HeroProgress, exp: number): HeroProgress {
  if (progress.level >= 100) return progress
  const startLevel = progress.level
  let { level, exp: cur } = progress
  cur += exp
  while (level < 100) {
    const needed = getExpForLevel(level)
    if (cur >= needed) { cur -= needed; level++ } else break
  }
  if (level >= 100) { level = 100; cur = 0 }
  const gainedPoints = Math.floor(level / LEVELS_PER_TALENT_POINT) - Math.floor(startLevel / LEVELS_PER_TALENT_POINT)
  return { ...progress, level, exp: cur, talentPoints: (progress.talentPoints ?? 0) + gainedPoints }
}

export function checkStarConditions(p: HeroProgress): number {
  if (p.runsWon >= 10 && p.level >= 60) return 3
  if (p.runsWon >= 5) return 2
  if (p.runsWon >= 1) return 1
  return 0
}

// 30 floors total. Full clear = 30*25 + 250 = 1000 EXP; 0 kills = 0 EXP.
export function calcRunExp(won: boolean, floorsCleared: number): number {
  return floorsCleared * 25 + (won ? 250 : 0)
}

export function defaultHeroProgress(): HeroProgress {
  return {
    level: 1, exp: 0, stars: 0, runsCompleted: 0, runsWon: 0, selectedTalents: {},
    talentPoints: 0, allocatedTalentIds: [], ownedRelicIds: [],
  }
}

// ── Star multiplier ────────────────────────────────────────────────────────
const STAR_MULT = [1.0, 1.2, 1.4, 1.65]

// ── Per-level growth (independent of talent tree / star mult) ──────────────
// 每級小幅成長，讓天賦節點門檻之間的等級也有感；所有英雄一致，不受星等加成影響
const PER_LEVEL_DMG = 0.15
const PER_LEVEL_HP  = 0.4
const PER_LEVEL_DEF = 0.05

// ── Talent Bonus computation ───────────────────────────────────────────────
export function computeTalentBonus(heroId: string, progress: HeroProgress): TalentBonus {
  const tree = HERO_TALENT_TREES[heroId]
  const bonus: TalentBonus = {
    flatDamage: 0, damagePerRank: 0, hpBonus: 0, defBonus: 0, startShield: 0,
    rerollBonus: 0, healBonus: 0, burnOnAttack: 0, startEnemyBurn: 0, startEnemyFreeze: 0, startEnemyPoison: 0,
    rankedDamages: [], lowHpDamageMult: 1, passives: [],
  }

  const levelSteps = Math.max(0, progress.level - 1)
  bonus.flatDamage += Math.round(levelSteps * PER_LEVEL_DMG)
  bonus.hpBonus    += Math.round(levelSteps * PER_LEVEL_HP)
  bonus.defBonus   += Math.round(levelSteps * PER_LEVEL_DEF)

  if (!tree) return bonus

  const mult = STAR_MULT[Math.min(progress.stars, 3)]

  for (const node of tree.nodes) {
    if (progress.level < node.level) continue
    const sel = progress.selectedTalents[node.level]
    if (!sel) continue
    const choice = node.choices.find(c => c.id === sel)
    if (!choice) continue
    applyEffect(bonus, choice.effect, mult)
  }

  if (progress.stars >= 3) applyEffect(bonus, tree.awakening.effect, mult)

  // Apply cumulative star passives (not scaled — fixed values regardless of star count)
  const starEntries = HERO_STAR_PASSIVES[heroId]
  if (starEntries) {
    for (let i = 0; i < Math.min(progress.stars, 3); i++) {
      applyEffect(bonus, starEntries[i].effect, 1.0)
    }
  }

  return bonus
}

function applyEffect(b: TalentBonus, e: TalentEffect, mult: number) {
  const s = (v?: number) => v ? Math.round(v * mult) : 0
  b.flatDamage     += s(e.flatDamage)
  b.damagePerRank  += s(e.damagePerRank)
  b.hpBonus        += s(e.hpBonus)
  b.defBonus       += s(e.defBonus)
  b.startShield    += s(e.startShield)
  b.rerollBonus    += e.rerollBonus ?? 0          // not scaled
  b.healBonus      += s(e.healBonus)
  b.burnOnAttack      += s(e.burnOnAttack)
  b.startEnemyBurn    += s(e.startEnemyBurn)
  b.startEnemyFreeze  += e.startEnemyFreeze ?? 0   // not scaled
  b.startEnemyPoison  += e.startEnemyPoison ?? 0   // not scaled
  if (e.rankedDamage) b.rankedDamages.push({ minRank: e.rankedDamage.minRank, value: s(e.rankedDamage.value) })
  if (e.lowHpDamageMult && e.lowHpDamageMult > b.lowHpDamageMult) b.lowHpDamageMult = e.lowHpDamageMult // take max
  if (e.passiveId) b.passives.push({ id: e.passiveId, value: s(e.passiveValue), value2: e.passiveValue2 })
  if (e.skillOverrideId) b.skillOverrideId = e.skillOverrideId
}

// helper for concise nodes
function n(level: 20|40|60|80|100, a: TalentEffect, an: string, ad: string,
          b: TalentEffect, bn: string, bd: string,
          c: TalentEffect, cn: string, cd: string): import('./types').TalentNode {
  return {
    level,
    choices: [
      { id: `${level}a`, name: an, desc: ad, effect: a },
      { id: `${level}b`, name: bn, desc: bd, effect: b },
      { id: `${level}c`, name: cn, desc: cd, effect: c },
    ],
  }
}

// ── Talent Trees ───────────────────────────────────────────────────────────
export const HERO_TALENT_TREES: Record<string, HeroTalentTree> = {

  knight: {
    heroId: 'knight',
    nodes: [
      n(20, {startShield:10}, '聖盾之光', '戰鬥開始護盾 +10',
            {flatDamage:10},  '神聖鋒刃', '傷害 +10',
            {hpBonus:20},     '聖者體魄', 'HP +20'),
      n(40, {defBonus:8},                          '鐵甲護衛', '防禦 +8',
            {rankedDamage:{minRank:3,value:12}},   '神判之力', '三條以上傷害 +12',
            {passiveId:'regen',passiveValue:5},     '聖光恢復', '每回合回復 5 HP'),
      n(60, {damagePerRank:3},                     '聖戰精通', '骰型每階 +3 傷害',
            {startShield:15,defBonus:4},            '守護誓約', '開戰護盾 +15，防禦 +4',
            {lowHpDamageMult:1.5},                  '不屈鋼鐵', 'HP < 30% 時傷害 ×1.5'),
      n(80, {passiveId:'shield_to_dmg_talent',passiveValue:15}, '盾裂神罰', '攻擊時，追加護盾值 15% 的傷害',
            {flatDamage:18},                                   '破城一擊', '傷害 +18',
            {startShield:20,defBonus:5},                       '聖盾壁壘', '開戰護盾 +20，防禦 +5'),
      n(100, {skillOverrideId:'slash_power'},    '破軍突擊', '技能：傷害 ×2.5，不獲護盾',
             {skillOverrideId:'slash_fortress'}, '聖殿防護', '技能：改為回復 25HP + 50 護盾',
             {skillOverrideId:'slash_combo'},    '聖光連擊', '技能：傷害 ×1.3，追加一次普攻'),
    ],
    awakening: { name:'不滅聖騎', desc:'每次技能觸發獲得 15 護盾',
                 effect:{passiveId:'skill_shield',passiveValue:15} },
  },

  mage: {
    heroId: 'mage',
    nodes: [
      n(20, {burnOnAttack:1},  '灼熱之觸', '攻擊施加 1 層燃燒',
            {flatDamage:12},   '烈焰衝擊', '傷害 +12',
            {rerollBonus:1},   '魔法加速', '重骰次數 +1'),
      n(40, {burnOnAttack:1,flatDamage:6},         '炎息衝擊', '攻擊施加 1 層燃燒，傷害 +6',
            {hpBonus:20},                         '法師體魄', 'HP +20',
            {damagePerRank:4},                    '烈焰精通', '骰型每階 +4 傷害'),
      n(60, {damagePerRank:2,burnOnAttack:1},              '業火精通', '骰型每階 +2 傷害，攻擊施加 1 層燃燒',
            {startEnemyBurn:3,flatDamage:8},              '烈焰詛咒', '開戰敵人 +3 燃燒，傷害 +8',
            {lowHpDamageMult:1.5},                        '背水一戰', 'HP < 30% 時傷害 ×1.5'),
      n(80, {passiveId:'burn_per_turn',passiveValue:2},    '業火持燃', '每回合敵人燃燒 +2',
            {rankedDamage:{minRank:4,value:25}},           '魔爆強擊', '四條以上傷害 +25',
            {flatDamage:14,startEnemyBurn:3},              '爆裂烈焰', '傷害 +14，開戰敵人 +3 燃燒'),
      n(100, {skillOverrideId:'fire_ignite'},  '業火注入', '技能：改為施加 10 層燃燒',
             {skillOverrideId:'fire_furnace'}, '魔法熔爐', '技能：傷害 ×3，消耗 1 重骰',
             {skillOverrideId:'fire_easy'},    '燃燒天才', '技能觸發條件降為三條（×0.7）'),
    ],
    awakening: { name:'末日引信', desc:'每場戰鬥開始，敵人獲得 5 層燃燒',
                 effect:{startEnemyBurn:5} },
  },

  priest: {
    heroId: 'priest',
    nodes: [
      n(20, {healBonus:8},  '治癒之光', '治療量 +8',
            {hpBonus:25},   '神聖體魄', 'HP +25',
            {flatDamage:7,defBonus:5}, '聖光護衛', '傷害 +7，防禦 +5'),
      n(40, {defBonus:6},  '聖光庇護', '防禦 +6',
            {startShield:10}, '神聖護盾', '開戰護盾 +10',
            {passiveId:'heal_shield',passiveValue:15,passiveValue2:0}, '聖盾共鳴', '治療時獲得等量護盾（上限 15）'),
      n(60, {healBonus:12},            '神蹟祝福', '治療量 +12',
            {flatDamage:10},           '光輝打擊', '傷害 +10',
            {passiveId:'regen',passiveValue:4,flatDamage:6}, '神聖恢復', '每回合回復 4 HP，傷害 +6'),
      n(80, {defBonus:8,hpBonus:15,passiveId:'regen',passiveValue:2}, '神聖堡壘', '防禦 +8，HP +15，每回合回復 2 HP',
            {healBonus:15,defBonus:5},             '聖殿守護', '治療量 +15，防禦 +5',
            {passiveId:'heal_atk_bonus',passiveValue:20,passiveValue2:20}, '神蹟激勵', '治療超過 20 時，下次攻擊 +20'),
      n(100, {skillOverrideId:'holy_angel'},     '天使降臨', '技能：回復 45HP + 敵人 5 層燃燒',
             {skillOverrideId:'holy_judgment'},   '審判天使', '技能：傷害 ×2，治療 ×0.5',
             {skillOverrideId:'holy_resonance'},  '神聖共鳴', '技能：全部治療量轉化為傷害'),
    ],
    awakening: { name:'神蹟降臨', desc:'治療時同時獲得護盾（上限 20）',
                 effect:{passiveId:'heal_shield',passiveValue:20,passiveValue2:0} },
  },

  rogue: {
    heroId: 'rogue',
    nodes: [
      n(20, {flatDamage:12},   '暗影刃光', '傷害 +12',
            {rerollBonus:1},   '影速反應', '重骰次數 +1',
            {hpBonus:18,flatDamage:4}, '暗影護體', 'HP +18，傷害 +4'),
      n(40, {startEnemyPoison:3},            '暗影毒霧', '戰鬥開始，敵人獲得 3 層中毒',
            {flatDamage:10,rerollBonus:1},   '刃光急速', '傷害 +10，重骰 +1',
            {hpBonus:20},                    '影者體魄', 'HP +20'),
      n(60, {damagePerRank:4},                                                        '影刃精通', '骰型每階 +4 傷害',
            {passiveId:'shadow_assassinate_poisoned',passiveValue:18},                '暗殺大師', '攻擊中毒敵人時，追加 18 暗影傷害',
            {rerollBonus:1,passiveId:'shadow_evasion_mark',passiveValue:1},           '影刃身法', '重骰 +1；重骰後達成兩對以上，獲得 1 層暗影印記（最多 3 層，下次追擊傷害 +10%/層）'),
      n(80, {rankedDamage:{minRank:4,value:22}},              '奪命刺擊', '四條以上傷害 +22',
            {rerollBonus:1,damagePerRank:2},                  '影速精通', '重骰 +1 且骰型每階 +2 傷害',
            {passiveId:'shadow_execute',passiveValue:35},      '殺手本能', '攻擊 HP 低於 35% 的敵人時，追加 35% 處決傷害'),
      n(100, {skillOverrideId:'shadow_burst'},                '暗影爆裂',  '技能：傷害 ×2，護盾歸零',
             {skillOverrideId:'shadow_deadly_poison_blade'},  '致命毒刃',  '技能：傷害 ×1.2，施加 8 層中毒；若敵人已中毒，引爆追加傷害（每層 +3）',
             {skillOverrideId:'shadow_easy'},                 '殺手直覺',  '技能在任意點數觸發（傷害 ×0.6）'),
    ],
    awakening: { name:'影之化身', desc:'重骰次數永久 +1',
                 effect:{rerollBonus:1} },
  },

  princess: {
    heroId: 'princess',
    nodes: [
      n(20, {startShield:8}, '寒冰護盾', '開戰護盾 +8',
            {flatDamage:12}, '冰霜刺擊', '傷害 +12',
            {hpBonus:20},    '皇家體魄', 'HP +20'),
      n(40, {passiveId:'proc_freeze_chance',passiveValue:20,passiveValue2:3}, '冰晶精通', 'rank≥3時 20% 機率凍結',
            {startShield:12},                                           '霜甲加固', '開戰護盾 +12',
            {damagePerRank:3},                                          '寒冰之力', '骰型每階 +3 傷害'),
      n(60, {defBonus:8,hpBonus:15},                           '冰霜壁壘', '防禦 +8，HP +15',
            {flatDamage:15},                                    '冰刃衝擊', '傷害 +15',
            {passiveId:'freeze_per_turn',passiveValue:5},       '寒冰腐蝕', '每回合造成 冰痕層數 × 5 傷害'),
      n(80, {hpBonus:30},                                        '極寒體魄', 'HP +30',
            {flatDamage:8,rankedDamage:{minRank:3,value:15}},  '凜冬攻勢', '傷害 +8；三條以上再 +15',
            {rankedDamage:{minRank:4,value:25}},               '冰川爆裂', '順子以上傷害 +25'),
      n(100, {skillOverrideId:'ice_permafrost'}, '永凍禁錮', '技能：凍結（遞減正常計算），傷害 ×0.8；凍結成功時額外 +1 冰痕；免疫時改施加 2 層冰痕',
             {skillOverrideId:'ice_cryo_burst'}, '冰火爆炸', '技能：敵人有燃燒時追加 35 傷害，並將一半燃燒層數轉為冰痕',
             {skillOverrideId:'ice_barrier'},    '絕對護衛', '技能：獲得 35 護盾，本回合敵方攻擊 -30%；若護盾存活，下回合傷害 +20%'),
    ],
    awakening: { name:'永恆凜冬', desc:'每場戰鬥開始，敵人自動被凍結 1 回合',
                 effect:{startEnemyFreeze:1} },
  },

  archer: {
    heroId: 'archer',
    nodes: [
      n(20, {passiveId:'no_reroll_talent',passiveValue:20}, '蓄力之眼', '本回合未重骰時，傷害 +20%',
            {rerollBonus:1},                               '快速搭弓', '重骰次數 +1',
            {passiveId:'unique_dice_dmg',passiveValue:4},  '散形之眼', '每種不同點數 +4 傷害'),
      n(40, {passiveId:'full_unique_bonus',passiveValue:20}, '散矢突破', '5種不同點數時傷害 +20%',
            {hpBonus:20},                                    '遊俠體魄', 'HP +20',
            {flatDamage:15},                                 '強弓訓練', '傷害 +15'),
      n(60, {passiveId:'unique_dice_dmg',passiveValue:5},             '精準散形', '每種不同點數 +5 傷害',
            {rerollBonus:1,flatDamage:10},                            '疾風連射', '重骰 +1 且傷害 +10',
            {passiveId:'full_unique_bonus',passiveValue:40},           '亂矢天穿', '5種不同點數時傷害 +40%'),
      n(80, {flatDamage:20},                                          '獵人本能', '傷害 +20',
            {hpBonus:20,passiveId:'unique_dice_dmg',passiveValue:3},    '散形本能', 'HP +20，每種不同點數 +3 傷害',
            {burnOnAttack:2,passiveId:'full_unique_bonus',passiveValue:15}, '火矢散射', '攻擊附加 2 層燃燒；5種不同點數時追加 +15%'),
      n(100, {skillOverrideId:'arrow_barrage'}, '連環箭雨', '技能：攻擊兩次（各 ×0.7）',
             {skillOverrideId:'arrow_snipe'},   '定點狙擊', '技能：傷害 ×2.5，無視 50% 防禦',
             {skillOverrideId:'arrow_poison'},  '毒箭浸透', '技能：正常傷害 + 施加 10 層燃燒'),
    ],
    awakening: { name:'散矢傳說', desc:'每次以5種不同點數出手，下次攻擊累積 +12',
                 effect:{passiveId:'unique_atk_stack',passiveValue:12} },
  },

  dwarf: {
    heroId: 'dwarf',
    nodes: [
      n(20, {defBonus:10},   '鐵牆防禦', '防禦 +10',
            {hpBonus:30},    '矮人體魄', 'HP +30',
            {rankedDamage:{minRank:3,value:10}}, '震怒之錘', '三條以上傷害 +10'),
      n(40, {rankedDamage:{minRank:3,value:12}},          '震地強擊', '三條以上傷害 +12',
            {passiveId:'armor_break_on_attack',passiveValue:2}, '震地破甲', '攻擊時破甲 -2（疊加）',
            {hpBonus:25},                                  '耐戰體魄', 'HP +25'),
      n(60, {hpBonus:20,passiveId:'regen',passiveValue:3}, '鐵壁持久', 'HP +20，每回合回復 3 HP',
            {flatDamage:18},                              '戰錘爆發', '傷害 +18',
            {passiveId:'armor_break_on_attack',passiveValue:1,defBonus:8}, '鐵盾破甲', '防禦 +8，攻擊時破甲 -1'),
      n(80, {passiveId:'armor_break_on_attack',passiveValue:3}, '鐵拳碎甲', '攻擊時破甲 -3（疊加）',
            {rankedDamage:{minRank:4,value:24}},               '震地猛擊', '四條以上傷害 +24',
            {hpBonus:20,defBonus:4,passiveId:'regen',passiveValue:3}, '鋼鐵堡壘', 'HP +20，防禦 +4，每回合回復 3 HP'),
      n(100, {skillOverrideId:'hammer_quake'}, '震地衝擊', '技能：傷害 ×2.5，護盾 +30',
             {skillOverrideId:'hammer_crush'}, '破甲之錘', '技能：傷害 ×2，完全無視防禦',
             {skillOverrideId:'hammer_easy'},  '巨人衝鋒', '技能觸發條件降為兩對（加成 ×0.8）'),
    ],
    awakening: { name:'不倒翁', desc:'每次受到傷害後，下次攻擊 +8（上限 +64）',
                 effect:{passiveId:'tank_stack',passiveValue:8} },
  },

  bard: {
    heroId: 'bard',
    nodes: [
      n(20, {healBonus:10},  '旋律治癒', '治療量 +10',
            {hpBonus:25},    '詩人體魄', 'HP +25',
            {rerollBonus:1,healBonus:3}, '即興演奏', '重骰 +1，治療量 +3'),
      n(40, {rankedDamage:{minRank:2,value:12},healBonus:5}, '戰歌強擊', '兩對以上時傷害 +12，治療量 +5',
            {flatDamage:8,passiveId:'regen',passiveValue:3},  '搖滾旋律', '傷害 +8，每回合回復 3 HP',
            {passiveId:'heal_shield',passiveValue:12,passiveValue2:0}, '治癒護盾', '治療時獲得等量護盾（上限 12）'),
      n(60, {hpBonus:30},              '吟遊體魄', 'HP +30',
            {healBonus:8,flatDamage:5}, '共鳴聖歌', '治療量 +8，傷害 +5',
            {damagePerRank:3},          '音波攻擊', '骰型每階 +3 傷害'),
      n(80, {healBonus:10,defBonus:6}, '聖音護盾', '治療量 +10，防禦 +6',
            {passiveId:'heal_atk_bonus',passiveValue:25,passiveValue2:20}, '激勵聖歌', '治療超過 20 時，下次攻擊 +25',
            {flatDamage:15},                                                '戰歌爆發', '傷害 +15'),
      n(100, {skillOverrideId:'song_power'},   '聖歌力量', '技能：治療 +30，傷害 ×1.5',
             {skillOverrideId:'song_requiem'}, '安魂聖詠', '技能：改為一次性回復 50 HP',
             {skillOverrideId:'song_inspire'}, '戰歌激勵', '技能：後 2 回合重骰次數 +2'),
    ],
    awakening: { name:'永恆旋律', desc:'每次治療，敵人受到 50% 治療量的傷害（可與「安魂曲」卡疊加）',
                 effect:{passiveId:'heal_dmg',passiveValue:50} },
  },

  beastmaster: {
    heroId: 'beastmaster',
    nodes: [
      n(20, {flatDamage:12},   '野性衝擊', '傷害 +12',
            {hpBonus:25},      '獸族體魄', 'HP +25',
            {damagePerRank:3}, '野性精通', '骰型每階 +3 傷害'),
      n(40, {rankedDamage:{minRank:3,value:15},hpBonus:10}, '獸王直覺', '三條以上傷害 +15，HP +10',
            {burnOnAttack:1,hpBonus:20},                   '野性烙印', 'HP +20，攻擊施加 1 層燃燒',
            {rerollBonus:1},                               '直覺反應', '重骰次數 +1'),
      n(60, {passiveId:'attack_atk_stack',passiveValue:2}, '野性積累', '每次攻擊 ATK +2（上限 +20）',
            {flatDamage:20},                                '蠻力爆發', '傷害 +20',
            {burnOnAttack:1,rankedDamage:{minRank:2,value:12}}, '野性怒火', '兩對以上傷害 +12，攻擊施加 1 層燃燒'),
      n(80, {hpBonus:35},            '頑強體魄', 'HP +35',
            {damagePerRank:4},        '萬獸之力', '骰型每階 +4 傷害',
            {burnOnAttack:2},         '毒獸之牙', '攻擊施加 2 層燃燒'),
      n(100, {skillOverrideId:'beast_fury'}, '野性爆發', '技能：本局 ATK 加成翻倍',
             {skillOverrideId:'beast_king'}, '獸王號令', '技能：傷害 ×2，施加 5 層燃燒',
             {skillOverrideId:'beast_hold'}, '共鳴之心', '技能：下回合骰子最低值升至 5'),
    ],
    awakening: { name:'萬獸之主', desc:'每場戰鬥開始，ATK +10',
                 effect:{flatDamage:10} },
  },

  engineer: {
    heroId: 'engineer',
    nodes: [
      n(20, {flatDamage:12},   '精密校準', '傷害 +12',
            {rerollBonus:1},   '機械加速', '重骰次數 +1',
            {damagePerRank:3}, '齒輪精通', '骰型每階 +3 傷害'),
      n(40, {rankedDamage:{minRank:2,value:15}}, '雙動機關', '兩對以上傷害 +15',
            {rerollBonus:1,flatDamage:8},         '超頻改裝', '重骰 +1 且傷害 +8',
            {hpBonus:20},                          '機師體魄', 'HP +20'),
      n(60, {passiveId:'reroll_min_boost',passiveValue:3}, '動能積累', '每次重骰，骰子最低值 +1（上限 +3）',
            {flatDamage:20},                                '超載輸出', '傷害 +20',
            {rankedDamage:{minRank:5,value:20},rerollBonus:1}, '精密連擊', '四條以上傷害 +20，重骰 +1'),
      n(80, {rerollBonus:1},                                      '極限重骰', '重骰次數 +1',
            {damagePerRank:4},                                     '齒輪共鳴', '骰型每階 +4 傷害',
            {passiveId:'gear_heat_control',passiveValue:1},        '熱能校準', '過熱造成的下回合重骰減少效果降低 1；過熱 3 層以上時獲得 10 護盾'),
      n(100, {skillOverrideId:'gear_overdrive'},    '超頻運轉', '技能：重骰全回復，傷害 ×1.5',
             {skillOverrideId:'gear_explosion'},    '機關大爆', '技能：傷害 ×3，本回合不能重骰',
             {skillOverrideId:'gear_precision_v2'}, '精密瞄準', '技能：下回合開始時，最低 2 顆骰子 +2，最高不超過 5'),
    ],
    awakening: { name:'永動圖紙', desc:'每回合第一次重骰不增加過熱；若攻擊後仍有 3 層以上過熱，獲得 12 護盾',
                 effect:{passiveId:'gear_blueprint_cooling'} },
  },

  fighter: {
    heroId: 'fighter',
    nodes: [
      n(20, {flatDamage:14},   '鐵拳強化', '傷害 +14',
            {hpBonus:20},      '武者體魄', 'HP +20',
            {rerollBonus:1,flatDamage:6}, '出手如風', '重骰 +1，傷害 +6'),
      n(40, {rankedDamage:{minRank:3,value:12}}, '連擊精通', '三條以上傷害 +12',
            {rerollBonus:1},                     '快速出招', '重骰次數 +1',
            {hpBonus:25},                         '硬漢體魄', 'HP +25'),
      n(60, {flatDamage:18},                      '爆裂拳', '傷害 +18',
            {damagePerRank:4},                    '骨碎精通', '骰型每階 +4 傷害',
            {defBonus:8,hpBonus:15},              '鐵牆防禦', '防禦 +8，HP +15'),
      n(80, {rankedDamage:{minRank:4,value:22}},  '破天神拳', '順子以上傷害 +22',
            {lowHpDamageMult:1.5},                '絕地反擊', 'HP < 30% 時傷害 ×1.5',
            {flatDamage:10,hpBonus:20},           '武道極意', '傷害 +10，HP +20'),
      n(100, {skillOverrideId:'fighter_dragon'},   '龍霸滅世', '技能：消耗全部拳勢，每層造成 12 傷害',
             {skillOverrideId:'fighter_formless'}, '無形天罡', '技能：強制觸發攻擊連段效果，拳勢 +1',
             {skillOverrideId:'fighter_infinite'}, '武道無極', '技能：同時觸發攻擊+防守+調息連段效果'),
    ],
    awakening: { name:'武道傳承', desc:'每次連續技觸發，本場 ATK 永久 +2（上限 +20）',
                 effect:{passiveId:'attack_atk_stack',passiveValue:2} },
  },
}

// ── Star condition descriptions ────────────────────────────────────────────
export const STAR_CONDITIONS = [
  { stars: 1, desc: '通關 1 次（主線或副本）' },
  { stars: 2, desc: '通關 5 次（主線或副本）' },
  { stars: 3, desc: '通關 10 次 + 達到 Lv60' },
]

// ── Hero star passive abilities (cumulative: 2★ also grants 1★ effect) ─────
type StarEntry = { name: string; desc: string; effect: import('./types').TalentEffect }
export const HERO_STAR_PASSIVES: Record<string, [StarEntry, StarEntry, StarEntry]> = {
  knight: [
    { name: '誓約騎士',   desc: '戰鬥開始獲得 6 護盾',
      effect: { startShield: 6 } },
    { name: '聖盾守護者', desc: '三條以上時，額外獲得 6 護盾',
      effect: { passiveId: 'shield_on_combo', passiveValue: 6, passiveValue2: 3 } },
    { name: '天啟聖騎士', desc: '攻擊時，追加目前護盾值 12% 的傷害',
      effect: { passiveId: 'shield_to_dmg', passiveValue: 12 } },
  ],
  mage: [
    { name: '焰印術士',   desc: '攻擊附加 1 層燃燒',
      effect: { burnOnAttack: 1 } },
    { name: '赤炎咒導師', desc: '順子以上時，額外附加 2 層燃燒',
      effect: { passiveId: 'burn_on_high_combo', passiveValue: 2, passiveValue2: 4 } },
    { name: '紅蓮大賢者', desc: '敵人燃燒 ≥10 層時，攻擊引爆 20% 燃燒層數，每回合最多 1 次',
      effect: { passiveId: 'burn_explosion', passiveValue: 20 } },
  ],
  priest: [
    { name: '聖光修士', desc: '治療量 +12%',
      effect: { passiveId: 'heal_pct_bonus', passiveValue: 12 } },
    { name: '曙光祭司', desc: '每回合第一顆 6 額外治療 4 HP',
      effect: { passiveId: 'six_heal', passiveValue: 4 } },
    { name: '神諭大主教', desc: '溢出治療的 35% 轉為護盾，每回合最多 20',
      effect: { passiveId: 'overflow_shield', passiveValue: 35, passiveValue2: 20 } },
  ],
  rogue: [
    { name: '暮影行者', desc: '攻擊中毒敵人時，額外附加 1 層中毒',
      effect: { passiveId: 'shadow_poison_bonus', passiveValue: 1 } },
    { name: '夜刃執行者', desc: '擊敗敵人（BOSS 血條轉換）後，下一次攻擊必定觸發暗影追擊（每回合最多一次）',
      effect: { passiveId: 'shadow_chain_execute', passiveValue: 1 } },
    { name: '血月影王', desc: '攻擊中毒或破甲敵人時，30% 機率額外觸發暗影追擊（每回合最多一次）',
      effect: { passiveId: 'enhanced_proc_debuff', passiveValue: 30 } },
  ],
  princess: [
    { name: '霜晶公主', desc: '順子以上時，使敵人下回合攻擊 -20%；若敵人有冰痕，額外獲得 8 護盾',
      effect: { passiveId: 'taunt_on_combo', passiveValue: 20, passiveValue2: 4 } },
    { name: '冰冠女爵', desc: '順子以上時，必定施加 1 層冰痕，並有 30% 機率凍結敵人',
      effect: { passiveId: 'proc_freeze', passiveValue: 30, passiveValue2: 4 } },
    { name: '凜冬女王', desc: '攻擊凍結敵人時，傷害 +13%，不解除凍結（每回合一次）',
      effect: { passiveId: 'freeze_burst', passiveValue: 13 } },
  ],
  archer: [
    { name: '森林斥候', desc: '骰子點數種類每多 1 種，傷害 +2',
      effect: { passiveId: 'unique_dice_dmg', passiveValue: 2 } },
    { name: '鷹眼獵手', desc: '5 顆骰子點數都不同時，追加一次 35% 傷害',
      effect: { passiveId: 'full_unique_bonus', passiveValue: 35 } },
    { name: '風行者', desc: '本回合未重骰時，傷害 +18%；若同時點數全不同，再追加 +8%',
      effect: { passiveId: 'no_reroll_bonus', passiveValue: 18, passiveValue2: 8 } },
  ],
  dwarf: [
    { name: '鐵拳礦衛', desc: '三條以上時，破甲 2',
      effect: { passiveId: 'armor_break_on_combo', passiveValue: 2, passiveValue2: 3 } },
    { name: '鍛魂戰錘', desc: '每次造成破甲時，獲得 4 護盾',
      effect: { passiveId: 'shield_on_armor_break', passiveValue: 4 } },
    { name: '山王破城者', desc: '敵人有破甲時，攻擊追加 15% 傷害',
      effect: { passiveId: 'armor_break_dmg_bonus', passiveValue: 15 } },
  ],
  bard: [
    { name: '流浪樂者', desc: '兩對以上時，治療 4 HP',
      effect: { passiveId: 'ranked_heal', passiveValue: 4, passiveValue2: 2 } },
    { name: '星詠詩人', desc: '兩對以上時，傷害 +6，治療 +4 HP',
      effect: { rankedDamage: { minRank: 2, value: 6 } } },
    { name: '傳世歌聖', desc: '連續兩回合骰型等級 ≥ 兩對時，第二回合傷害 +22%',
      effect: { passiveId: 'consecutive_combo_bonus', passiveValue: 22, passiveValue2: 2 } },
  ],
  beastmaster: [
    { name: '狼語使徒', desc: '攻擊後 25% 機率召喚狼，造成 8 傷害',
      effect: { passiveId: 'wolf_summon', passiveValue: 8, passiveValue2: 25 } },
    { name: '獸魂馭者', desc: '三條以上時，必定召喚狼造成 8 傷害',
      effect: { passiveId: 'wolf_summon_on_combo', passiveValue: 8, passiveValue2: 3 } },
    { name: '萬獸君王', desc: '每召喚 3 次狼，下次狼攻擊傷害 ×1.8',
      effect: { passiveId: 'wolf_super_strike' } },
  ],
  engineer: [
    { name: '齒輪工匠', desc: '每次重骰獲得 1 層蓄能（最多 3 層），攻擊時每層 +3 傷害',
      effect: { passiveId: 'star_reroll_charge', passiveValue: 3, passiveValue2: 3 } },
    { name: '蒸氣鍊金師', desc: '蓄能上限提高到 4，每層傷害提高為 +4',
      effect: { passiveId: 'star_reroll_charge_max', passiveValue: 4, passiveValue2: 4 } },
    { name: '超頻機神匠', desc: '蓄能滿層時，攻擊後追加一次 30% 砲擊；若本回合重骰 3 次以上，回合結束失去 3 HP',
      effect: { passiveId: 'star_overclock_cannon', passiveValue: 30 } },
  ],
  fighter: [
    { name: '震骨武者', desc: '連續技觸發時，額外施加 1 層破甲',
      effect: { passiveId: 'chain_armor_break', passiveValue: 1 } },
    { name: '裂地拳宗', desc: '拳勢每層額外 +2 傷害',
      effect: { passiveId: 'fist_power_flat_dmg', passiveValue: 2 } },
    { name: '霸天武聖', desc: '無雙架式期間連段效果 +50%；無雙架式結束後保留 2 層拳勢',
      effect: { passiveId: 'munsou_enhance', passiveValue: 50 } },
  ],
}

export function getHeroStarTitle(heroId: string, stars: number): string | null {
  const entries = HERO_STAR_PASSIVES[heroId]
  if (!entries || stars < 1 || stars > 3) return null
  return entries[stars - 1].name
}
