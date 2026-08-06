import type { BuffCard, BuffEffect, Role } from './types'

// ── 等級效果計算 ───────────────────────────────────────────────────────────
export function getEffectiveCardEffect(card: BuffCard, level: number): BuffEffect {
  if (level <= 1 || !card.levelData) return card.effect
  const idx = Math.min(level - 2, card.levelData.length - 1)
  return { ...card.effect, ...card.levelData[idx].effectOverride }
}

export function getEffectiveCardDesc(card: BuffCard, level: number): string {
  if (level <= 1 || !card.levelData) return card.desc
  const idx = Math.min(level - 2, card.levelData.length - 1)
  return card.levelData[idx].desc
}

export const ALL_BUFF_CARDS: BuffCard[] = [
  // ── Common ────────────────────────────────────────────────────────────
  { id: 'sharp_blade',   name: '鋒刃',     rarity: 'common', desc: '兩對以上時額外 +12 傷害',
    effect: { comboDamage: { minRank: 2, value: 12 } }, maxLevel: 3, levelData: [
      { desc: '兩對以上時額外 +15 傷害', effectOverride: { comboDamage: { minRank: 2, value: 15 } } },
      { desc: '兩對以上時額外 +19 傷害', effectOverride: { comboDamage: { minRank: 2, value: 19 } } },
    ] },
  { id: 'quick_hands',   name: '快手',     rarity: 'common', desc: '每場戰鬥第一次重骰不消耗次數',
    effect: { firstRerollFreeCard: true }, maxLevel: 1 },
  { id: 'iron_wall',     name: '鐵壁',     rarity: 'common', desc: '戰鬥開始獲得 8 點護盾',
    effect: { startShield: 8 }, maxLevel: 3, levelData: [
      { desc: '戰鬥開始獲得 11 點護盾', effectOverride: { startShield: 11 } },
      { desc: '戰鬥開始獲得 14 點護盾', effectOverride: { startShield: 14 } },
    ] },
  { id: 'vitality',      name: '生命力',   rarity: 'common', desc: '最大 HP +15；敵人燃燒時傷害 +15%',
    effect: { maxHpBonus: 15, burnEnemyDmgPct: 15 }, maxLevel: 3, levelData: [
      { desc: '最大 HP +20；敵人燃燒時傷害 +20%', effectOverride: { maxHpBonus: 20, burnEnemyDmgPct: 20 } },
      { desc: '最大 HP +25；敵人燃燒時傷害 +25%', effectOverride: { maxHpBonus: 25, burnEnemyDmgPct: 25 } },
    ] },
  { id: 'combo_master',  name: '連擊精通', rarity: 'common', desc: '骰型每階 +4 傷害',
    effect: { damagePerRank: 4 }, maxLevel: 3, levelData: [
      { desc: '骰型每階 +5 傷害', effectOverride: { damagePerRank: 5 } },
      { desc: '骰型每階 +6 傷害', effectOverride: { damagePerRank: 6 } },
    ] },
  { id: 'healing_touch', name: '治癒之觸', rarity: 'common', desc: '治療效果 +20%；每次治療同時獲得等量護盾',
    effect: { healMult: 1.2 }, maxLevel: 3, levelData: [
      { desc: '治療效果 +32%；每次治療同時獲得等量護盾', effectOverride: { healMult: 1.32 } },
      { desc: '治療效果 +45%；每次治療同時獲得等量護盾', effectOverride: { healMult: 1.45 } },
    ] },
  { id: 'tough_skin',    name: '堅韌皮膚', rarity: 'common', desc: '護盾存在時傷害 +8%',
    effect: { shieldBonusDmgPct: 8 }, maxLevel: 3, levelData: [
      { desc: '護盾存在時傷害 +11%', effectOverride: { shieldBonusDmgPct: 11 } },
      { desc: '護盾存在時傷害 +15%', effectOverride: { shieldBonusDmgPct: 15 } },
    ] },
  { id: 'heavy_blow',    name: '重擊',     rarity: 'common', desc: '三條以上時額外 +20 傷害',
    effect: { comboDamage: { minRank: 3, value: 20 } }, maxLevel: 3, levelData: [
      { desc: '三條以上時額外 +26 傷害', effectOverride: { comboDamage: { minRank: 3, value: 26 } } },
      { desc: '三條以上時額外 +33 傷害', effectOverride: { comboDamage: { minRank: 3, value: 33 } } },
    ] },

  // ── Rare ──────────────────────────────────────────────────────────────
  { id: 'burning_touch', name: '燃燒之觸', rarity: 'rare',   desc: '每次攻擊施加 2 層燃燒',
    effect: { burnOnAttack: 2 }, maxLevel: 3, levelData: [
      { desc: '每次攻擊施加 3 層燃燒', effectOverride: { burnOnAttack: 3 } },
      { desc: '每次攻擊施加 4 層燃燒', effectOverride: { burnOnAttack: 4 } },
    ] },
  { id: 'frost_grip',    name: '冰霜之握', rarity: 'rare',   desc: '四條以上時凍結敵人一回合',
    effect: { freezeOnHighCombo: 5 }, maxLevel: 1 },
  { id: 'berserker',     name: '狂戰士',   rarity: 'rare',   desc: 'HP 低於 30% 時傷害 ×2.0',
    effect: { lowHpDamageMult: 2.0 }, maxLevel: 3, levelData: [
      { desc: 'HP 低於 30% 時傷害 ×2.3', effectOverride: { lowHpDamageMult: 2.3 } },
      { desc: 'HP 低於 30% 時傷害 ×2.7', effectOverride: { lowHpDamageMult: 2.7 } },
    ] },
  { id: 'poet_soul',     name: '詩人之魂', rarity: 'rare',   desc: '治療時額外造成等量傷害',
    effect: { poetSoulHealToDmgPct: 100 }, maxLevel: 3, levelData: [
      { desc: '治療時額外造成 130% 傷害', effectOverride: { poetSoulHealToDmgPct: 130 } },
      { desc: '治療時額外造成 160% 傷害', effectOverride: { poetSoulHealToDmgPct: 160 } },
    ] },
  { id: 'anger_stacks',  name: '怒火蓄積', rarity: 'rare',   desc: '未達三條時憤怒+1，每層憤怒+5傷害（上限5層）', effect: { angerStacks: true }, maxLevel: 1 },
  { id: 'lucky_die',     name: '幸運骰',   rarity: 'rare',   desc: '每次初始擲骰後，隨機一顆骰子變為 6',        effect: { luckyDie: true }, maxLevel: 1 },
  { id: 'perfect',       name: '完美主義', rarity: 'rare',   desc: '每次重骰後，隨機一顆骰子點數 +1（最高 6）',  effect: { rerollPlusDie: true }, maxLevel: 1 },
  { id: 'venom_blade',   name: '劇毒之刃', rarity: 'rare',   role: 'shadow', desc: '每次攻擊施加 2 層中毒',
    effect: { poisonOnAttack: 2 }, maxLevel: 3, levelData: [
      { desc: '每次攻擊施加 3 層中毒', effectOverride: { poisonOnAttack: 3 } },
      { desc: '每次攻擊施加 4 層中毒', effectOverride: { poisonOnAttack: 4 } },
    ] },
  { id: 'fighting_spirit', name: '奮戰鬥志', rarity: 'rare', desc: '受到攻擊後，下次出手 +8 傷害（最多蓄積 2 次）',
    effect: {}, maxLevel: 3, levelData: [
      { desc: '受到攻擊後，下次出手 +10 傷害（最多蓄積 2 次）', effectOverride: {} },
      { desc: '受到攻擊後，下次出手 +12 傷害（最多蓄積 3 次）', effectOverride: {} },
    ] },
  { id: 'gamblers_rush',  name: '賭徒衝勁', rarity: 'rare', desc: '每次出手傷害永久 +2（本場戰鬥上限 +20）',
    effect: {}, maxLevel: 3, levelData: [
      { desc: '每次出手傷害永久 +3（本場戰鬥上限 +25）', effectOverride: {} },
      { desc: '每次出手傷害永久 +4（本場戰鬥上限 +30）', effectOverride: {} },
    ] },
  { id: 'armor_breaker', name: '破甲打擊', rarity: 'rare',   desc: '三條以上時，敵人防禦永久 -3',
    effect: { armorBreakOnHighCombo: 3, armorBreakRank: 3 }, maxLevel: 3, levelData: [
      { desc: '三條以上時，敵人防禦永久 -4', effectOverride: { armorBreakOnHighCombo: 4 } },
      { desc: '三條以上時，敵人防禦永久 -5', effectOverride: { armorBreakOnHighCombo: 5 } },
    ] },
  { id: 'expose_weak',   name: '致命弱點', rarity: 'rare',   desc: '四條以上時，敵人陷入易傷 2 回合',
    effect: { vulnerableOnHighCombo: 5 }, maxLevel: 3, levelData: [
      { desc: '葫蘆/順子以上時，敵人陷入易傷 2 回合', effectOverride: { vulnerableOnHighCombo: 4 } },
      { desc: '三條以上時，敵人陷入易傷 2 回合', effectOverride: { vulnerableOnHighCombo: 3 } },
    ] },

  // ── Epic ──────────────────────────────────────────────────────────────
  { id: 'undying',       name: '不死之魂', rarity: 'epic',   desc: '一場戰鬥中，HP 歸零時回復至 1（觸發一次）', effect: {}, maxLevel: 1 },
  { id: 'fate_die',      name: '命運骰',   rarity: 'epic',   desc: '每場戰鬥：前 2 次重骰後，各有一顆骰子變為 6', effect: {}, maxLevel: 1 },
  { id: 'five_king',     name: '骰王降臨', rarity: 'epic',   desc: '擲出五條時額外 +80 傷害',
    effect: { fiveOfAKindBonus: 80 }, maxLevel: 3, levelData: [
      { desc: '擲出五條時額外 +95 傷害', effectOverride: { fiveOfAKindBonus: 95 } },
      { desc: '擲出五條時額外 +115 傷害', effectOverride: { fiveOfAKindBonus: 115 } },
    ] },

  // ════════ 職業專屬卡（僅對應職業英雄會抽到）════════

  // ── 聖騎士 slash ──
  { id: 'slash_judgment', name: '聖光裁決', rarity: 'rare',   role: 'slash', desc: '三條以上時額外 +22 傷害',
    effect: { comboDamage: { minRank: 3, value: 22 } }, maxLevel: 3, levelData: [
      { desc: '三條以上時額外 +27 傷害', effectOverride: { comboDamage: { minRank: 3, value: 27 } } },
      { desc: '三條以上時額外 +32 傷害', effectOverride: { comboDamage: { minRank: 3, value: 32 } } },
    ] },
  { id: 'slash_guardian', name: '守護壁壘', rarity: 'common', role: 'slash', desc: '戰鬥開始 +12 護盾，防禦 +3',
    effect: { startShield: 12, defBonus: 3 }, maxLevel: 3, levelData: [
      { desc: '戰鬥開始 +15 護盾，防禦 +4', effectOverride: { startShield: 15, defBonus: 4 } },
      { desc: '戰鬥開始 +18 護盾，防禦 +5', effectOverride: { startShield: 18, defBonus: 5 } },
    ] },
  { id: 'slash_shield_strike', name: '盾擊訓練', rarity: 'rare', role: 'slash', desc: '攻擊時追加當前護盾值 8% 的傷害',
    effect: { shieldToDmgPct: 8 }, maxLevel: 3, levelData: [
      { desc: '攻擊時追加當前護盾值 11% 的傷害', effectOverride: { shieldToDmgPct: 11 } },
      { desc: '攻擊時追加當前護盾值 14% 的傷害', effectOverride: { shieldToDmgPct: 14 } },
    ] },

  // ── 火焰法師 fire ──
  { id: 'fire_pyromania', name: '縱火狂熱', rarity: 'rare',   role: 'fire',  desc: '每次攻擊施加 3 層燃燒',
    effect: { burnOnAttack: 3 }, maxLevel: 3, levelData: [
      { desc: '每次攻擊施加 4 層燃燒', effectOverride: { burnOnAttack: 4 } },
      { desc: '每次攻擊施加 5 層燃燒', effectOverride: { burnOnAttack: 5 } },
    ] },
  { id: 'fire_eruption',  name: '烈焰噴發', rarity: 'rare',   role: 'fire',  desc: '順子以上 +24 傷害，並引爆 15% 燃燒層數',
    effect: { comboDamage: { minRank: 4, value: 24 }, ignitePct: 15 }, maxLevel: 3, levelData: [
      { desc: '順子以上 +28 傷害，引爆 18% 燃燒層數', effectOverride: { comboDamage: { minRank: 4, value: 28 }, ignitePct: 18 } },
      { desc: '順子以上 +33 傷害，引爆 22% 燃燒層數', effectOverride: { comboDamage: { minRank: 4, value: 33 }, ignitePct: 22 } },
    ] },
  { id: 'fire_explosion',  name: '爆燃術',   rarity: 'rare',   role: 'fire',  desc: '敵人燃燒≥10 層時，引爆 22% 燃燒層數（每回合一次）',
    effect: {}, maxLevel: 3, levelData: [
      { desc: '敵人燃燒≥10 層時，引爆 28% 燃燒層數（每回合一次）', effectOverride: {} },
      { desc: '敵人燃燒≥8 層時，引爆 35% 燃燒層數（每回合一次）', effectOverride: {} },
    ] },
  { id: 'fire_high_burn', name: '炎獄覺醒', rarity: 'rare', role: 'fire',
    desc: '敵人燃燒≥15 層時傷害 +30%',
    effect: { highBurnDmgPct: 30 }, maxLevel: 3, levelData: [
      { desc: '敵人燃燒≥15 層時傷害 +38%', effectOverride: { highBurnDmgPct: 38 } },
      { desc: '敵人燃燒≥15 層時傷害 +48%', effectOverride: { highBurnDmgPct: 48 } },
    ] },

  // ── 神官祭司 holy ──
  { id: 'holy_blessing',  name: '神聖祝福', rarity: 'common', role: 'holy',  desc: '治療效果 +30%',
    effect: { healMult: 1.3 }, maxLevel: 3, levelData: [
      { desc: '治療效果 +42%', effectOverride: { healMult: 1.42 } },
      { desc: '治療效果 +55%', effectOverride: { healMult: 1.55 } },
    ] },
  { id: 'holy_radiance',  name: '聖光普照', rarity: 'rare',   role: 'holy',  desc: '兩對以上 +10 傷害，治療 +20%',
    effect: { comboDamage: { minRank: 2, value: 10 }, healMult: 1.2 }, maxLevel: 3, levelData: [
      { desc: '兩對以上 +13 傷害，治療 +28%', effectOverride: { comboDamage: { minRank: 2, value: 13 }, healMult: 1.28 } },
      { desc: '兩對以上 +16 傷害，治療 +36%', effectOverride: { comboDamage: { minRank: 2, value: 16 }, healMult: 1.36 } },
    ] },
  { id: 'holy_overflow_shield', name: '溢補轉盾', rarity: 'rare', role: 'holy', desc: '溢出治療的 40% 轉為護盾（上限 20）',
    effect: {}, maxLevel: 3, levelData: [
      { desc: '溢出治療的 50% 轉為護盾（上限 25）', effectOverride: {} },
      { desc: '溢出治療的 60% 轉為護盾（上限 30）', effectOverride: {} },
    ] },
  { id: 'holy_echo',      name: '聖光回響', rarity: 'rare',   role: 'holy',  desc: '每次治療後，下次攻擊 +10（最多疊 2 層）',
    effect: {}, maxLevel: 3, levelData: [
      { desc: '每次治療後，下次攻擊 +13（最多疊 2 層）', effectOverride: {} },
      { desc: '每次治療後，下次攻擊 +16（最多疊 3 層）', effectOverride: {} },
    ] },
  { id: 'holy_judgment_power', name: '神罰強化', rarity: 'rare', role: 'holy',
    desc: '本場累計治療超過最大 HP 後，傷害永久 +25%',
    effect: { healMilestoneBonus: 25 }, maxLevel: 3, levelData: [
      { desc: '本場累計治療超過最大 HP 後，傷害永久 +32%', effectOverride: { healMilestoneBonus: 32 } },
      { desc: '本場累計治療超過最大 HP 後，傷害永久 +42%', effectOverride: { healMilestoneBonus: 42 } },
    ] },

  // ── 影刃刺客 shadow ──
  { id: 'shadow_combo',   name: '影襲連擊', rarity: 'rare',   role: 'shadow', desc: '兩對以上 +12 傷害；本回合有重骰時再 +6',
    effect: { comboDamage: { minRank: 2, value: 12 } }, maxLevel: 3, levelData: [
      { desc: '兩對以上 +15 傷害；本回合有重骰時再 +8', effectOverride: { comboDamage: { minRank: 2, value: 15 } } },
      { desc: '兩對以上 +18 傷害；本回合有重骰時再 +10', effectOverride: { comboDamage: { minRank: 2, value: 18 } } },
    ] },
  { id: 'shadow_assassin',name: '暗殺本能', rarity: 'rare',   role: 'shadow', desc: 'HP < 30% 時傷害 ×1.5，傷害 +6',
    effect: { lowHpDamageMult: 1.5, flatDamage: 6 }, maxLevel: 3, levelData: [
      { desc: 'HP < 30% 時傷害 ×1.7，傷害 +8', effectOverride: { lowHpDamageMult: 1.7, flatDamage: 8 } },
      { desc: 'HP < 30% 時傷害 ×2.0，傷害 +10', effectOverride: { lowHpDamageMult: 2.0, flatDamage: 10 } },
    ] },
  { id: 'shadow_weak_strike', name: '弱點突襲', rarity: 'rare', role: 'shadow', desc: '敵人每有一種負面狀態，傷害 +6%（最多 +24%）',
    effect: {}, maxLevel: 3, levelData: [
      { desc: '敵人每有一種負面狀態，傷害 +8%（最多 +32%）', effectOverride: {} },
      { desc: '敵人每有一種負面狀態，傷害 +10%（最多 +40%）', effectOverride: {} },
    ] },
  { id: 'shadow_mark_burst', name: '影刃爆印', rarity: 'rare', role: 'shadow',
    desc: '暗影印記消耗時，每層額外 +10 傷害（消耗後仍留 1 層）',
    effect: { shadowMarkBurstDmg: 10 }, maxLevel: 3, levelData: [
      { desc: '暗影印記消耗時，每層額外 +13 傷害（消耗後仍留 1 層）', effectOverride: { shadowMarkBurstDmg: 13 } },
      { desc: '暗影印記消耗時，每層額外 +16 傷害（消耗後仍留 1 層）', effectOverride: { shadowMarkBurstDmg: 16 } },
    ] },

  // ── 皇家公主 ice ──
  { id: 'ice_shatter',    name: '寒冰碎裂', rarity: 'rare',   role: 'ice',   desc: '順子以上使敵人下回合攻擊 −40%',
    effect: { straightWeakenCard: 40 }, maxLevel: 3, levelData: [
      { desc: '順子以上使敵人下回合攻擊 −52%', effectOverride: { straightWeakenCard: 52 } },
      { desc: '順子以上使敵人下回合攻擊 −68%', effectOverride: { straightWeakenCard: 68 } },
    ] },
  { id: 'ice_frostbite',  name: '凍傷',     rarity: 'common', role: 'ice',   desc: '骰型每階 +5 傷害',
    effect: { damagePerRank: 5 }, maxLevel: 3, levelData: [
      { desc: '骰型每階 +6 傷害', effectOverride: { damagePerRank: 6 } },
      { desc: '骰型每階 +8 傷害', effectOverride: { damagePerRank: 8 } },
    ] },
  { id: 'ice_shatter_strike', name: '碎冰追擊', rarity: 'rare', role: 'ice', desc: '攻擊凍結敵人時傷害 +25%，但解除凍結',
    effect: {}, maxLevel: 3, levelData: [
      { desc: '攻擊凍結敵人時傷害 +32%，但解除凍結', effectOverride: {} },
      { desc: '攻擊凍結敵人時傷害 +40%，但解除凍結', effectOverride: {} },
    ] },
  { id: 'ice_mark_burst', name: '霜晶爆裂', rarity: 'rare', role: 'ice',
    desc: '每層冰痕每回合造成 3 傷害；冰爆觸發額外 +25 傷害',
    effect: { iceMarkDmgPerTurn: 3, iceBurstBonusDmg: 25 }, maxLevel: 3, levelData: [
      { desc: '每層冰痕每回合造成 4 傷害；冰爆觸發額外 +32 傷害', effectOverride: { iceMarkDmgPerTurn: 4, iceBurstBonusDmg: 32 } },
      { desc: '每層冰痕每回合造成 5 傷害；冰爆觸發額外 +40 傷害', effectOverride: { iceMarkDmgPerTurn: 5, iceBurstBonusDmg: 40 } },
    ] },

  // ── 遊俠獵人 arrow ──
  { id: 'arrow_volley',   name: '箭雨齊射', rarity: 'rare',   role: 'arrow', desc: '順子以上 +20 傷害，並追加一次 40% 傷害',
    effect: { comboDamage: { minRank: 4, value: 20 } }, maxLevel: 3, levelData: [
      { desc: '順子以上 +24 傷害，並追加一次 40% 傷害', effectOverride: { comboDamage: { minRank: 4, value: 24 } } },
      { desc: '順子以上 +30 傷害，並追加一次 40% 傷害', effectOverride: { comboDamage: { minRank: 4, value: 30 } } },
    ] },
  { id: 'arrow_precision',name: '精準射擊', rarity: 'common', role: 'arrow', desc: '骰子點數種類越多，每種 +3 傷害',
    effect: { distinctDiceCardDmg: 3 }, maxLevel: 3, levelData: [
      { desc: '骰子點數種類越多，每種 +4 傷害', effectOverride: { distinctDiceCardDmg: 4 } },
      { desc: '骰子點數種類越多，每種 +5 傷害', effectOverride: { distinctDiceCardDmg: 5 } },
    ] },
  { id: 'arrow_bullseye', name: '百步穿楊', rarity: 'rare',   role: 'arrow', desc: '5 顆骰子點數全不同時，追加一次 50% 傷害',
    effect: {}, maxLevel: 3, levelData: [
      { desc: '5 顆骰子點數全不同時，追加一次 62% 傷害', effectOverride: {} },
      { desc: '5 顆骰子點數全不同時，追加一次 75% 傷害', effectOverride: {} },
    ] },
  { id: 'arrow_steady',   name: '穩定射擊', rarity: 'common', role: 'arrow', desc: '本回合未重骰時，傷害 +20%',
    effect: { noRerollDmgPct: 20 }, maxLevel: 3, levelData: [
      { desc: '本回合未重骰時，傷害 +26%', effectOverride: { noRerollDmgPct: 26 } },
      { desc: '本回合未重骰時，傷害 +33%', effectOverride: { noRerollDmgPct: 33 } },
    ] },
  { id: 'arrow_fire_scatter', name: '火矢淬燒', rarity: 'rare', role: 'arrow',
    desc: '5 種不同點數出手時附加 2 層燃燒；敵人有燃燒時傷害 +15%',
    effect: { fullUniqueBurnBonus: 2, burnEnemyDmgPct: 15 }, maxLevel: 3, levelData: [
      { desc: '5 種不同點數出手時附加 3 層燃燒；敵人有燃燒時傷害 +20%', effectOverride: { fullUniqueBurnBonus: 3, burnEnemyDmgPct: 20 } },
      { desc: '5 種不同點數出手時附加 3 層燃燒；敵人有燃燒時傷害 +26%', effectOverride: { fullUniqueBurnBonus: 3, burnEnemyDmgPct: 26 } },
    ] },
  { id: 'arrow_scatter_chain', name: '散形連射', rarity: 'rare', role: 'arrow',
    desc: '散骰時 +18 傷害；若上回合也是散骰，再追加 30% 傷害',
    effect: {}, maxLevel: 3, levelData: [
      { desc: '散骰時 +23 傷害；若上回合也是散骰，再追加 38% 傷害', effectOverride: {} },
      { desc: '散骰時 +28 傷害；若上回合也是散骰，再追加 46% 傷害', effectOverride: {} },
    ] },
  { id: 'arrow_scatter_strike', name: '散形迅擊', rarity: 'common', role: 'arrow',
    desc: '散骰時額外 +12 傷害',
    effect: {}, maxLevel: 3, levelData: [
      { desc: '散骰時額外 +15 傷害', effectOverride: {} },
      { desc: '散骰時額外 +19 傷害', effectOverride: {} },
    ] },
  { id: 'arrow_scatter_guard', name: '散形強擊', rarity: 'rare', role: 'arrow',
    desc: '散骰時 +18 傷害；護盾存在時傷害 +10%',
    effect: {}, maxLevel: 3, levelData: [
      { desc: '散骰時 +22 傷害；護盾存在時傷害 +13%', effectOverride: {} },
      { desc: '散骰時 +27 傷害；護盾存在時傷害 +16%', effectOverride: {} },
    ] },

  // ── 矮人戰士 hammer ──
  { id: 'hammer_sunder',  name: '裂甲重錘', rarity: 'rare',   role: 'hammer', desc: '三條以上時敵人防禦永久 -4',
    effect: { armorBreakOnHighCombo: 4, armorBreakRank: 3 }, maxLevel: 3, levelData: [
      { desc: '三條以上時敵人防禦永久 -5', effectOverride: { armorBreakOnHighCombo: 5 } },
      { desc: '三條以上時敵人防禦永久 -6', effectOverride: { armorBreakOnHighCombo: 6 } },
    ] },
  { id: 'hammer_quake',   name: '震地猛擊', rarity: 'rare',   role: 'hammer', desc: '三條以上 +18 傷害；護盾存在時傷害 +10%',
    effect: { comboDamage: { minRank: 3, value: 18 }, shieldBonusDmgPct: 10 }, maxLevel: 3, levelData: [
      { desc: '三條以上 +22 傷害；護盾存在時傷害 +13%', effectOverride: { comboDamage: { minRank: 3, value: 22 }, shieldBonusDmgPct: 13 } },
      { desc: '三條以上 +27 傷害；護盾存在時傷害 +16%', effectOverride: { comboDamage: { minRank: 3, value: 27 }, shieldBonusDmgPct: 16 } },
    ] },
  { id: 'hammer_forge_counter', name: '鍛造反擊', rarity: 'common', role: 'hammer', desc: '每次使敵人破甲時，獲得 4 護盾',
    effect: {}, maxLevel: 3, levelData: [
      { desc: '每次使敵人破甲時，獲得 5 護盾', effectOverride: {} },
      { desc: '每次使敵人破甲時，獲得 7 護盾', effectOverride: {} },
    ] },
  { id: 'hammer_smash',   name: '粉碎打擊', rarity: 'rare',   role: 'hammer', desc: '敵人防禦降至負值時，超出部分 50% 轉為額外傷害',
    effect: {}, maxLevel: 3, levelData: [
      { desc: '敵人防禦降至負值時，超出部分 62% 轉為額外傷害', effectOverride: {} },
      { desc: '敵人防禦降至負值時，超出部分 75% 轉為額外傷害', effectOverride: {} },
    ] },
  { id: 'hammer_regen_wall', name: '鐵壁持久', rarity: 'common', role: 'hammer',
    desc: '每回合回復 3 HP；防禦 +4',
    effect: { regenPerTurn: 3, defBonus: 4 }, maxLevel: 3, levelData: [
      { desc: '每回合回復 4 HP；防禦 +5', effectOverride: { regenPerTurn: 4, defBonus: 5 } },
      { desc: '每回合回復 5 HP；防禦 +6', effectOverride: { regenPerTurn: 5, defBonus: 6 } },
    ] },

  // ── 吟遊詩人 song ──
  { id: 'song_anthem',    name: '戰意讚歌', rarity: 'common', role: 'song',  desc: '最大 HP +25，治療 +25%',
    effect: { maxHpBonus: 25, healMult: 1.25 }, maxLevel: 3, levelData: [
      { desc: '最大 HP +28，治療 +33%', effectOverride: { maxHpBonus: 28, healMult: 1.33 } },
      { desc: '最大 HP +30，治療 +42%', effectOverride: { maxHpBonus: 30, healMult: 1.42 } },
    ] },
  { id: 'song_crescendo', name: '漸強樂章', rarity: 'rare',   role: 'song',  desc: '兩對以上 +10 傷害；連續兩回合達成兩對以上，再 +10',
    effect: { comboDamage: { minRank: 2, value: 10 } }, maxLevel: 3, levelData: [
      { desc: '兩對以上 +13 傷害；連續兩回合達成兩對以上，再 +13', effectOverride: { comboDamage: { minRank: 2, value: 13 } } },
      { desc: '兩對以上 +16 傷害；連續兩回合達成兩對以上，再 +16', effectOverride: { comboDamage: { minRank: 2, value: 16 } } },
    ] },
  { id: 'song_rhythm',    name: '節奏記憶', rarity: 'rare',   role: 'song',  desc: '連續兩回合骰型等級 ≥2 時，本回合傷害 +25%',
    effect: {}, maxLevel: 3, levelData: [
      { desc: '連續兩回合骰型等級 ≥2 時，本回合傷害 +32%', effectOverride: {} },
      { desc: '連續兩回合骰型等級 ≥2 時，本回合傷害 +40%', effectOverride: {} },
    ] },
  { id: 'song_requiem',   name: '安魂曲',   rarity: 'rare',   role: 'song',  desc: '治療時，敵人受到治療量 50% 的傷害（可與覺醒「永恆旋律」疊加）',
    effect: {}, maxLevel: 3, levelData: [
      { desc: '治療時，敵人受到治療量 62% 的傷害（可與覺醒「永恆旋律」疊加）', effectOverride: {} },
      { desc: '治療時，敵人受到治療量 75% 的傷害（可與覺醒「永恆旋律」疊加，共 125%）', effectOverride: {} },
    ] },

  // ── 獸語馴獸師 beast ──
  { id: 'beast_pack',     name: '狼群戰術', rarity: 'rare',   role: 'beast', desc: '三條以上 +15 傷害，最大 HP +15',
    effect: { comboDamage: { minRank: 3, value: 15 }, maxHpBonus: 15 }, maxLevel: 3, levelData: [
      { desc: '三條以上 +18 傷害，最大 HP +18', effectOverride: { comboDamage: { minRank: 3, value: 18 }, maxHpBonus: 18 } },
      { desc: '三條以上 +22 傷害，最大 HP +20', effectOverride: { comboDamage: { minRank: 3, value: 22 }, maxHpBonus: 20 } },
    ] },
  { id: 'beast_feral',    name: '野性爆發', rarity: 'common', role: 'beast', desc: '傷害 +6；HP < 30% 時傷害 ×1.4',
    effect: { flatDamage: 6, lowHpDamageMult: 1.4 }, maxLevel: 3, levelData: [
      { desc: '傷害 +8；HP < 30% 時傷害 ×1.55', effectOverride: { flatDamage: 8, lowHpDamageMult: 1.55 } },
      { desc: '傷害 +10；HP < 30% 時傷害 ×1.7', effectOverride: { flatDamage: 10, lowHpDamageMult: 1.7 } },
    ] },
  { id: 'beast_wolf_soul',name: '狼魂累積', rarity: 'rare',   role: 'beast', desc: '每次召喚狼獲得 1 層狼魂；3 層後下次狼攻擊傷害翻倍',
    effect: {}, maxLevel: 1 },
  { id: 'beast_hunt',     name: '群獵本能', rarity: 'rare',   role: 'beast', desc: '敵人有破甲或中毒時，狼傷害 +50%', effect: {}, maxLevel: 1 },
  { id: 'beast_atk_wolf', name: '獸魂共鳴', rarity: 'rare', role: 'beast',
    desc: '本場 ATK 積累每達 5 層，狼傷害 +15%（上限 +45%）',
    effect: { wolfDmgPerAtkStack: 15 }, maxLevel: 3, levelData: [
      { desc: '本場 ATK 積累每達 5 層，狼傷害 +20%（上限 +60%）', effectOverride: { wolfDmgPerAtkStack: 20 } },
      { desc: '本場 ATK 積累每達 5 層，狼傷害 +25%（上限 +75%）', effectOverride: { wolfDmgPerAtkStack: 25 } },
    ] },
  { id: 'beast_blood_surge', name: '獸血爆發', rarity: 'rare', role: 'beast',
    desc: '野性積累 ≥10 層時，傷害 +20%（不依賴召喚狼觸發）',
    effect: { highAtkStackDmgPct: 20 }, maxLevel: 3, levelData: [
      { desc: '野性積累 ≥10 層時，傷害 +26%', effectOverride: { highAtkStackDmgPct: 26 } },
      { desc: '野性積累 ≥10 層時，傷害 +34%', effectOverride: { highAtkStackDmgPct: 34 } },
    ] },

  // ── 機關技師 gear ──
  { id: 'gear_overclock', name: '超頻機關', rarity: 'rare',   role: 'gear',  desc: '每次重骰蓄 1 層過熱（最多 4）；攻擊時每層 +6 傷害；≥3 層過熱後自傷 3 HP',
    effect: { overclockCard: true }, maxLevel: 1 },
  { id: 'gear_cannon',    name: '機關炮擊', rarity: 'rare',   role: 'gear',  desc: '兩對以上 +12 傷害，攻擊 +1 燃燒',
    effect: { comboDamage: { minRank: 2, value: 12 }, burnOnAttack: 1 }, maxLevel: 3, levelData: [
      { desc: '兩對以上 +15 傷害，攻擊 +2 燃燒', effectOverride: { comboDamage: { minRank: 2, value: 15 }, burnOnAttack: 2 } },
      { desc: '兩對以上 +18 傷害，攻擊 +2 燃燒', effectOverride: { comboDamage: { minRank: 2, value: 18 }, burnOnAttack: 2 } },
    ] },
  { id: 'gear_safety',    name: '安全閥',   rarity: 'common', role: 'gear',  desc: '本回合未重骰時，獲得 12 護盾',
    effect: { noRerollShield: 12 }, maxLevel: 3, levelData: [
      { desc: '本回合未重骰時，獲得 16 護盾', effectOverride: { noRerollShield: 16 } },
      { desc: '本回合未重骰時，獲得 20 護盾', effectOverride: { noRerollShield: 20 } },
    ] },
  { id: 'gear_overheat',  name: '過熱爆破', rarity: 'rare',   role: 'gear',  desc: '本回合重骰 2 次以上時，攻擊附加 2 層燃燒',
    effect: { rerollBurnBonus: 2 }, maxLevel: 3, levelData: [
      { desc: '本回合重骰 2 次以上時，攻擊附加 3 層燃燒', effectOverride: { rerollBurnBonus: 3 } },
      { desc: '本回合重骰 2 次以上時，攻擊附加 4 層燃燒', effectOverride: { rerollBurnBonus: 4 } },
    ] },
  { id: 'gear_kinetic_overload', name: '動能超載', rarity: 'rare', role: 'gear',
    desc: '重骰後骰子最低值 +1 上限提高至 +4；達 +4 時攻擊追加 15 傷害',
    effect: { minBoostCapRaise: 1 }, maxLevel: 1 },

  // ── 武鬥家 fighter ────────────────────────────────────────────────────────
  { id: 'fighter_iron_fist',    name: '鋼鐵拳意', rarity: 'common', role: 'fighter', desc: '傷害 +16；最大 HP +12',
    effect: { flatDamage: 16, maxHpBonus: 12 }, maxLevel: 3, levelData: [
      { desc: '傷害 +20；最大 HP +15', effectOverride: { flatDamage: 20, maxHpBonus: 15 } },
      { desc: '傷害 +24；最大 HP +18', effectOverride: { flatDamage: 24, maxHpBonus: 18 } },
    ] },
  { id: 'fighter_chi_burst',    name: '真氣迸發', rarity: 'rare', role: 'fighter', desc: '傷害 +14；三條以上額外 +8 傷害',
    effect: { flatDamage: 14, comboDamage: { minRank: 3, value: 8 } }, maxLevel: 3, levelData: [
      { desc: '傷害 +18；三條以上額外 +10 傷害', effectOverride: { flatDamage: 18, comboDamage: { minRank: 3, value: 10 } } },
      { desc: '傷害 +23；三條以上額外 +13 傷害', effectOverride: { flatDamage: 23, comboDamage: { minRank: 3, value: 13 } } },
    ] },
  { id: 'fighter_chain_strike', name: '連環破甲', rarity: 'rare', role: 'fighter', desc: '兩對以上施加 1 層破甲',
    effect: { armorBreakOnHighCombo: 1, armorBreakRank: 2 }, maxLevel: 3, levelData: [
      { desc: '兩對以上施加 2 層破甲', effectOverride: { armorBreakOnHighCombo: 2, armorBreakRank: 2 } },
      { desc: '兩對以上施加 3 層破甲', effectOverride: { armorBreakOnHighCombo: 3, armorBreakRank: 2 } },
    ] },
  { id: 'fighter_unyielding',   name: '不屈意志', rarity: 'common', role: 'fighter', desc: '防禦 +8；骰型每階 +3 傷害',
    effect: { defBonus: 8, damagePerRank: 3 }, maxLevel: 3, levelData: [
      { desc: '防禦 +10；骰型每階 +4 傷害', effectOverride: { defBonus: 10, damagePerRank: 4 } },
      { desc: '防禦 +12；骰型每階 +5 傷害', effectOverride: { defBonus: 12, damagePerRank: 5 } },
    ] },
  { id: 'fighter_quick_fist',    name: '疾拳精修', rarity: 'common', role: 'fighter', desc: '連段成功時，拳勢額外 +1（上限仍為 5）',
    effect: {}, maxLevel: 1 },
  { id: 'fighter_munsou_extend', name: '無雙之魄', rarity: 'rare',   role: 'fighter', desc: '進入無雙架式時延長 1 回合（共 3 回合）；無雙架式期間傷害乘數 +20%（共 ×1.7）',
    effect: {}, maxLevel: 1 },
  { id: 'fighter_desperate', name: '破釜沉舟', rarity: 'rare', role: 'fighter',
    desc: 'HP<50% 時每回合開始自動獲得 1 層拳勢；HP<30% 時無雙傷害乘數再 +20%（×1.7→×1.9）',
    effect: { lowHpFistGain: true, lowHpMunsouBonus: 20 }, maxLevel: 1 },

  // ── 代價型 (Trade-off) ────────────────────────────────────────────────
  { id: 'taboo_reroll',    name: '禁忌重骰', rarity: 'rare',
    desc: '每次重骰：傷害 +6%（最多 +18%），但失去最大 HP 的 3%',
    effect: { tabooRerollDmgPct: 6, tabooRerollSelfDmgPct: 3 }, maxLevel: 3, levelData: [
      { desc: '每次重骰：傷害 +12%（最多 +36%），但失去最大 HP 的 6%', effectOverride: { tabooRerollDmgPct: 12, tabooRerollSelfDmgPct: 6 } },
      { desc: '每次重骰：傷害 +24%（最多 +72%），但失去最大 HP 的 12%', effectOverride: { tabooRerollDmgPct: 24, tabooRerollSelfDmgPct: 12 } },
    ] },
  { id: 'whisper_die',     name: '低語骰',   rarity: 'rare',
    desc: '每顆骰出 1 追加 6 傷害；骰出 6 的基礎回血效果減半',
    effect: { onesDamage: 6, sixHealPenaltyPct: 50 }, maxLevel: 3, levelData: [
      { desc: '每顆骰出 1 追加 8 傷害；骰出 6 的基礎回血效果 -35%', effectOverride: { onesDamage: 8, sixHealPenaltyPct: 35 } },
      { desc: '每顆骰出 1 追加 10 傷害；骰出 6 的基礎回血效果 -20%', effectOverride: { onesDamage: 10, sixHealPenaltyPct: 20 } },
    ] },
  { id: 'curse_affinity',  name: '詛咒親和', rarity: 'rare',
    desc: '每個詛咒：傷害 +6%（最多 +30%）；治療 -10%',
    effect: { curseDmgPct: 6, cardHealPenaltyPct: 10 }, maxLevel: 3, levelData: [
      { desc: '每個詛咒：傷害 +8%（最多 +40%）；治療 -8%', effectOverride: { curseDmgPct: 8, cardHealPenaltyPct: 8 } },
      { desc: '每個詛咒：傷害 +10%（最多 +50%）；治療 -6%', effectOverride: { curseDmgPct: 10, cardHealPenaltyPct: 6 } },
    ] },
  { id: 'shattered_faith', name: '破碎信仰', rarity: 'rare',
    desc: '治療 -40%；攻擊技能護盾獲得量 +50%',
    effect: { cardHealPenaltyPct: 40, shieldGainMult: 1.5 }, maxLevel: 3, levelData: [
      { desc: '治療 -32%；攻擊技能護盾獲得量 +80%', effectOverride: { cardHealPenaltyPct: 32, shieldGainMult: 1.8 } },
      { desc: '治療 -25%；攻擊技能護盾獲得量 +120%', effectOverride: { cardHealPenaltyPct: 25, shieldGainMult: 2.2 } },
    ] },

  // ── 灰燼聖約専屬卡 ────────────────────────────────────────────────────
  { id: 'covenant_purgatory', name: '煉獄誓焰', rarity: 'common', dungeonOnly: 'ash_covenant',
    desc: '每次攻擊附加 3 層燃燒',
    effect: { burnOnAttack: 3 }, maxLevel: 3, levelData: [
      { desc: '每次攻擊附加 5 層燃燒', effectOverride: { burnOnAttack: 5 } },
      { desc: '每次攻擊附加 8 層燃燒', effectOverride: { burnOnAttack: 8 } },
    ] },
  { id: 'ash_vow_shield', name: '灰燼盾誓', rarity: 'rare', dungeonOnly: 'ash_covenant',
    desc: '戰鬥開始獲得 8 護盾；護盾存在時傷害 +20%',
    effect: { startShield: 8, shieldBonusDmgPct: 20 }, maxLevel: 3, levelData: [
      { desc: '戰鬥開始獲得 12 護盾；護盾存在時傷害 +28%', effectOverride: { startShield: 12, shieldBonusDmgPct: 28 } },
      { desc: '戰鬥開始獲得 16 護盾；護盾存在時傷害 +36%', effectOverride: { startShield: 16, shieldBonusDmgPct: 36 } },
    ] },
  { id: 'judgment_fury', name: '審判怒焰', rarity: 'epic', dungeonOnly: 'ash_covenant',
    desc: '敵人燃燒時傷害 +30%；每次攻擊附加 2 層燃燒',
    effect: { burnEnemyDmgPct: 30, burnOnAttack: 2 }, maxLevel: 3, levelData: [
      { desc: '敵人燃燒時傷害 +39%；每次攻擊附加 3 層燃燒', effectOverride: { burnEnemyDmgPct: 39, burnOnAttack: 3 } },
      { desc: '敵人燃燒時傷害 +51%；每次攻擊附加 4 層燃燒', effectOverride: { burnEnemyDmgPct: 51, burnOnAttack: 4 } },
    ] },
]

// role 給定時：通用卡（無 role）＋ 該職業專屬卡才會出現
// dungeonId 給定時：通用卡（無 dungeonOnly）＋ 該副本専屬卡才會出現
// excludeIds：已達最高等級的卡 ID，從池中移除
export function getRandomCards(count: number, role?: Role, excludeIds: string[] = [], dungeonId?: string): BuffCard[] {
  const pool = ALL_BUFF_CARDS.filter(c =>
    (!c.role || c.role === role) &&
    (!c.dungeonOnly || c.dungeonOnly === dungeonId) &&
    !excludeIds.includes(c.id)
  )
  const result: BuffCard[] = []
  const available = [...pool]

  while (result.length < count && available.length > 0) {
    const roll = Math.random()
    let candidates: BuffCard[]
    if (roll < 0.12 && available.some(c => c.rarity === 'epic')) {
      candidates = available.filter(c => c.rarity === 'epic')
    } else if (roll < 0.42 && available.some(c => c.rarity === 'rare')) {
      candidates = available.filter(c => c.rarity === 'rare')
    } else {
      candidates = available.filter(c => c.rarity === 'common')
      if (candidates.length === 0) candidates = available
    }
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    result.push(pick)
    available.splice(available.indexOf(pick), 1)
  }
  return result
}
