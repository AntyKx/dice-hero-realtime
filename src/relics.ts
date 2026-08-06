import type { Relic, RelicEffect, Role } from './types'

export const ALL_RELICS: Relic[] = [
  // ── Universal: Common ─────────────────────────────────────────────────────
  { id: 'fire_gem',     name: '火焰寶石', tier: 'common', desc: '每場戰鬥開始，敵人獲得 3 層燃燒',          effect: { startEnemyBurn: 3 }, maxLevel: 3, levelData: [
      { desc: '每場戰鬥開始，敵人獲得 4 層燃燒', effectOverride: { startEnemyBurn: 4 } },
      { desc: '每場戰鬥開始，敵人獲得 5 層燃燒', effectOverride: { startEnemyBurn: 5 } },
    ] },
  { id: 'iron_crown',  name: '鐵王冠',   tier: 'common', desc: '戰鬥開始獲得 4 點護盾',                  effect: { startShield: 4 }, maxLevel: 3, levelData: [
      { desc: '戰鬥開始獲得 6 點護盾', effectOverride: { startShield: 6 } },
      { desc: '戰鬥開始獲得 8 點護盾', effectOverride: { startShield: 8 } },
    ] },
  { id: 'lucky_charm', name: '幸運符',   tier: 'common', desc: '重骰次數 +1',                             effect: { rerollBonus: 1 } },
  { id: 'iron_skin',   name: '鐵皮',     tier: 'common', desc: '防禦 +5',                                 effect: { defBonus: 5 }, maxLevel: 3, levelData: [
      { desc: '防禦 +7', effectOverride: { defBonus: 7 } },
      { desc: '防禦 +9', effectOverride: { defBonus: 9 } },
    ] },

  // ── Universal: Rare ───────────────────────────────────────────────────────
  { id: 'gold_coin',    name: '黃金骰',   tier: 'rare', desc: '每顆骰出 6，額外獲得 5 金幣',               effect: { goldOnSix: 5 }, maxLevel: 3, levelData: [
      { desc: '每顆骰出 6，額外獲得 7 金幣', effectOverride: { goldOnSix: 7 } },
      { desc: '每顆骰出 6，額外獲得 10 金幣', effectOverride: { goldOnSix: 10 } },
    ] },
  { id: 'flame_die',   name: '火焰骰',   tier: 'rare', desc: '每顆骰出 6，施加 2 層燃燒',                 effect: { burnOnSix: 2 }, maxLevel: 3, levelData: [
      { desc: '每顆骰出 6，施加 3 層燃燒', effectOverride: { burnOnSix: 3 } },
      { desc: '每顆骰出 6，施加 4 層燃燒', effectOverride: { burnOnSix: 4 } },
    ] },
  { id: 'war_drum',    name: '戰鼓',     tier: 'rare', desc: '三條以上時傷害 +20',                        effect: { comboBonusDmg: 20 }, maxLevel: 3, levelData: [
      { desc: '三條以上時傷害 +25', effectOverride: { comboBonusDmg: 25 } },
      { desc: '三條以上時傷害 +32', effectOverride: { comboBonusDmg: 32 } },
    ] },
  { id: 'fate_cup',    name: '命運骰杯', tier: 'rare', desc: '第一次重骰不消耗次數，且本場重骰次數+1',     effect: { firstRerollFree: true, rerollBonus: 1 } },
  { id: 'broken_crown',name: '破碎骰冠', tier: 'rare', desc: '所有骰出 1 的骰子自動變為 6；但每場戰鬥開始受到 5 傷害', effect: { onesToSix: true, startSelfDmg: 5 }, maxLevel: 3, levelData: [
      { desc: '所有骰出 1 的骰子自動變為 6；但每場戰鬥開始受到 4 傷害', effectOverride: { startSelfDmg: 4 } },
      { desc: '所有骰出 1 的骰子自動變為 6；但每場戰鬥開始受到 3 傷害', effectOverride: { startSelfDmg: 3 } },
    ] },
  { id: 'hourglass',   name: '逆轉沙漏', tier: 'rare', desc: '每場戰鬥首次 HP 歸零時，回復至 30% HP',     effect: { reviveAtHp: 0.3 }, maxLevel: 3, levelData: [
      { desc: '每場戰鬥首次 HP 歸零時，回復至 40% HP', effectOverride: { reviveAtHp: 0.4 } },
      { desc: '每場戰鬥首次 HP 歸零時，回復至 50% HP', effectOverride: { reviveAtHp: 0.5 } },
    ] },

  // ── Universal: Boss ───────────────────────────────────────────────────────
  { id: 'blessed_drop', name: '聖水',   tier: 'boss', desc: '戰鬥開始獲得 10 護盾；每次治療+10', effect: { startShield: 10, healBonus: 10 }, maxLevel: 3, levelData: [
      { desc: '戰鬥開始獲得 13 護盾；每次治療+13', effectOverride: { startShield: 13, healBonus: 13 } },
      { desc: '戰鬥開始獲得 16 護盾；每次治療+16', effectOverride: { startShield: 16, healBonus: 16 } },
    ] },
  { id: 'gold_hoard',   name: '金幣堆', tier: 'boss', desc: '戰鬥金幣獎勵 ×1.5',           effect: { goldMult: 1.5 }, maxLevel: 3, levelData: [
      { desc: '戰鬥金幣獎勵 ×1.65', effectOverride: { goldMult: 1.65 } },
      { desc: '戰鬥金幣獎勵 ×1.8', effectOverride: { goldMult: 1.8 } },
    ] },

  // ── Universal sustain ───────────────────────────────────────────────────────
  { id: 'adventurer_flask', name: '冒險者水壺', tier: 'common', desc: '每場戰鬥勝利後，回復最大 HP 的 10%', effect: { healOnWinPct: 0.10 }, maxLevel: 3, levelData: [
      { desc: '每場戰鬥勝利後，回復最大 HP 的 13%', effectOverride: { healOnWinPct: 0.13 } },
      { desc: '每場戰鬥勝利後，回復最大 HP 的 16%', effectOverride: { healOnWinPct: 0.16 } },
    ] },
  { id: 'life_dice_cup',    name: '生命骰杯',   tier: 'rare',   desc: '每顆骰出 6，額外回復 4 HP',        effect: { healOnSix: 4 }, maxLevel: 3, levelData: [
      { desc: '每顆骰出 6，額外回復 6 HP', effectOverride: { healOnSix: 6 } },
      { desc: '每顆骰出 6，額外回復 8 HP', effectOverride: { healOnSix: 8 } },
    ] },
  { id: 'reversal_charm',   name: '逆轉護符',   tier: 'rare',   desc: '每場戰鬥首次低於 30% HP 時，獲得 25 護盾並本場傷害永久 +12', effect: { lowHpGuard: 25, lowHpPermanentAtk: 12 }, maxLevel: 3, levelData: [
      { desc: '每場戰鬥首次低於 30% HP 時，獲得 30 護盾並本場傷害永久 +15', effectOverride: { lowHpGuard: 30, lowHpPermanentAtk: 15 } },
      { desc: '每場戰鬥首次低於 30% HP 時，獲得 36 護盾並本場傷害永久 +18', effectOverride: { lowHpGuard: 36, lowHpPermanentAtk: 18 } },
    ] },
  { id: 'vampire_ring',     name: '吸血戒指',   tier: 'rare',   desc: '造成傷害的 8% 轉化為治療',          effect: { lifestealPct: 0.08 }, maxLevel: 3, levelData: [
      { desc: '造成傷害的 11% 轉化為治療', effectOverride: { lifestealPct: 0.11 } },
      { desc: '造成傷害的 15% 轉化為治療', effectOverride: { lifestealPct: 0.15 } },
    ] },
  { id: 'blood_rage_charm', name: '血怒護符', tier: 'rare', desc: '每層怒氣額外 +3 傷害；HP < 30% 時怒氣不因出手消耗', effect: { angerBonusDmg: 3, angerLowHpKeep: true }, maxLevel: 3, levelData: [
      { desc: '每層怒氣額外 +4 傷害；HP < 30% 時怒氣不因出手消耗', effectOverride: { angerBonusDmg: 4 } },
      { desc: '每層怒氣額外 +5 傷害；HP < 30% 時怒氣不因出手消耗', effectOverride: { angerBonusDmg: 5 } },
    ] },
  { id: 'fate_hand',        name: '命運之手',   tier: 'rare',   desc: '本回合重骰 2 次以上時，傷害 +15%', effect: { rerollDmgPct: 15 }, maxLevel: 3, levelData: [
      { desc: '本回合重骰 2 次以上時，傷害 +20%', effectOverride: { rerollDmgPct: 20 } },
      { desc: '本回合重骰 2 次以上時，傷害 +26%', effectOverride: { rerollDmgPct: 26 } },
    ] },
  { id: 'armor_break_seal', name: '破甲石錠', tier: 'boss',   desc: '對破甲值 ≥ 5 的敵人，傷害 +20%', effect: { brokenArmorAmpPct: 20 }, maxLevel: 3, levelData: [
      { desc: '對破甲值 ≥ 5 的敵人，傷害 +26%', effectOverride: { brokenArmorAmpPct: 26 } },
      { desc: '對破甲值 ≥ 5 的敵人，傷害 +33%', effectOverride: { brokenArmorAmpPct: 33 } },
    ] },

  // ── Slash 聖騎士 ──────────────────────────────────────────────────────────
  { id: 'shield_badge',  name: '聖盾徽章', tier: 'rare', requiredRole: 'slash',
    desc: '三條以上時獲得 14 護盾；五條時敵人本回合攻擊 −50%',
    effect: { shieldBadgeShield: 14, shieldBadgeTauntPct: 50 }, maxLevel: 3, levelData: [
      { desc: '三條以上時獲得 18 護盾；五條時敵人本回合攻擊 −60%', effectOverride: { shieldBadgeShield: 18, shieldBadgeTauntPct: 60 } },
      { desc: '三條以上時獲得 23 護盾；五條時敵人本回合攻擊 −75%', effectOverride: { shieldBadgeShield: 23, shieldBadgeTauntPct: 75 } },
    ] },
  { id: 'kingdom_oath',  name: '王國誓約', tier: 'rare', requiredRole: 'slash',
    desc: '戰鬥開始獲得 20 護盾；護盾存在時防禦額外 +6', effect: { startShield: 20 }, maxLevel: 3, levelData: [
      { desc: '戰鬥開始獲得 26 護盾；護盾存在時防禦額外 +6', effectOverride: { startShield: 26 } },
      { desc: '戰鬥開始獲得 33 護盾；護盾存在時防禦額外 +6', effectOverride: { startShield: 33 } },
    ] },
  { id: 'shield_codex',  name: '護盾聖典', tier: 'rare', requiredRole: 'slash',
    desc: '護盾轉傷比率額外 +8%（與盾擊訓練疊加）；護盾值 ≥30 時追加 12 傷害',
    effect: { shieldToDmgRelicPct: 8, highShieldFlatDmg: 12 }, maxLevel: 3, levelData: [
      { desc: '護盾轉傷比率額外 +11%（與盾擊訓練疊加）；護盾值 ≥30 時追加 16 傷害', effectOverride: { shieldToDmgRelicPct: 11, highShieldFlatDmg: 16 } },
      { desc: '護盾轉傷比率額外 +14%（與盾擊訓練疊加）；護盾值 ≥30 時追加 20 傷害', effectOverride: { shieldToDmgRelicPct: 14, highShieldFlatDmg: 20 } },
    ] },

  // ── Fire 火焰法師 ─────────────────────────────────────────────────────────
  { id: 'fire_crystal',  name: '炎晶法核', tier: 'rare', requiredRole: 'fire',
    desc: '順子時追加一發火球（+14 傷害、+3 燃燒）',
    effect: { fireCrystalDmg: 14, fireCrystalBurn: 3 }, maxLevel: 3, levelData: [
      { desc: '順子時追加一發火球（+18 傷害、+4 燃燒）', effectOverride: { fireCrystalDmg: 18, fireCrystalBurn: 4 } },
      { desc: '順子時追加一發火球（+23 傷害、+5 燃燒）', effectOverride: { fireCrystalDmg: 23, fireCrystalBurn: 5 } },
    ] },
  { id: 'burn_codex',    name: '灼熱魔典', tier: 'rare', requiredRole: 'fire',
    desc: '每次施加燃燒時額外 +1 層；但自身受到傷害 +10%',
    effect: { burnCodexExtraBurn: 1, burnCodexSelfDmgPct: 10 }, maxLevel: 3, levelData: [
      { desc: '每次施加燃燒時額外 +2 層；但自身受到傷害 +13%', effectOverride: { burnCodexExtraBurn: 2, burnCodexSelfDmgPct: 13 } },
      { desc: '每次施加燃燒時額外 +3 層；但自身受到傷害 +16%', effectOverride: { burnCodexExtraBurn: 3, burnCodexSelfDmgPct: 16 } },
    ] },
  { id: 'ember_heart',   name: '餘燼心臟', tier: 'rare', requiredRole: 'fire',
    desc: '擊殺帶有燃燒的敵人時，回復 10 HP', effect: { burnKillHeal: 10 }, maxLevel: 3, levelData: [
      { desc: '擊殺帶有燃燒的敵人時，回復 13 HP', effectOverride: { burnKillHeal: 13 } },
      { desc: '擊殺帶有燃燒的敵人時，回復 17 HP', effectOverride: { burnKillHeal: 17 } },
    ] },

  // ── Holy 神官祭司 ─────────────────────────────────────────────────────────
  { id: 'star_chalice',  name: '星泉聖杯', tier: 'rare', requiredRole: 'holy',
    desc: '每顆骰出 6 的骰子治療 5 HP', effect: { healOnSix: 5 }, maxLevel: 3, levelData: [
      { desc: '每顆骰出 6 的骰子治療 7 HP', effectOverride: { healOnSix: 7 } },
      { desc: '每顆骰出 6 的骰子治療 9 HP', effectOverride: { healOnSix: 9 } },
    ] },
  { id: 'revival_crown', name: '復甦羽冠', tier: 'rare', requiredRole: 'holy',
    desc: 'HP 低於 30% 時，治療效果 ×1.5（每場最多 2 次）',
    effect: { revivalCrownHealMult: 1.5, revivalCrownMaxUses: 2 }, maxLevel: 3, levelData: [
      { desc: 'HP 低於 30% 時，治療效果 ×1.7（每場最多 3 次）', effectOverride: { revivalCrownHealMult: 1.7, revivalCrownMaxUses: 3 } },
      { desc: 'HP 低於 30% 時，治療效果 ×2.0（每場最多 4 次）', effectOverride: { revivalCrownHealMult: 2.0, revivalCrownMaxUses: 4 } },
    ] },

  // ── Shadow 影刃刺客 ───────────────────────────────────────────────────────
  { id: 'night_cloak',   name: '夜行者斗篷', tier: 'rare', requiredRole: 'shadow',
    desc: '兩對以上時，50% 機率追加一次攻擊',
    effect: { nightCloakProcPct: 50 } },
  { id: 'blood_blade',   name: '血月短刃',   tier: 'rare', requiredRole: 'shadow',
    desc: '每次攻擊後回復造成傷害的 15%',
    effect: { bloodBladeLifestealPct: 0.15 }, maxLevel: 3, levelData: [
      { desc: '每次攻擊後回復造成傷害的 19%', effectOverride: { bloodBladeLifestealPct: 0.19 } },
      { desc: '每次攻擊後回復造成傷害的 25%', effectOverride: { bloodBladeLifestealPct: 0.25 } },
    ] },
  { id: 'poison_fang_ring', name: '毒牙之環', tier: 'rare', requiredRole: 'shadow',
    desc: '敵人中毒期間，每回合蓄積 +4 攻擊力（最多 +15）；擊殺中毒敵人回復 8 HP', effect: { poisonAtkPerTurn: 4, poisonKillHeal: 8 }, maxLevel: 3, levelData: [
      { desc: '敵人中毒期間，每回合蓄積 +5 攻擊力（最多 +15）；擊殺中毒敵人回復 10 HP', effectOverride: { poisonAtkPerTurn: 5, poisonKillHeal: 10 } },
      { desc: '敵人中毒期間，每回合蓄積 +7 攻擊力（最多 +15）；擊殺中毒敵人回復 13 HP', effectOverride: { poisonAtkPerTurn: 7, poisonKillHeal: 13 } },
    ] },

  // ── Ice 皇家公主 ──────────────────────────────────────────────────────────
  { id: 'frost_shard',   name: '冰晶碎片',   tier: 'rare', requiredRole: 'ice',
    desc: '凍結敵人時額外造成 16 傷害',
    effect: { frostShardDmg: 16 }, maxLevel: 3, levelData: [
      { desc: '凍結敵人時額外造成 21 傷害', effectOverride: { frostShardDmg: 21 } },
      { desc: '凍結敵人時額外造成 27 傷害', effectOverride: { frostShardDmg: 27 } },
    ] },
  { id: 'permafrost',    name: '永凍之地',   tier: 'rare', requiredRole: 'ice',
    desc: '凍結解除時，造成 20 碎冰傷害',
    effect: { permafrostDmg: 20 }, maxLevel: 3, levelData: [
      { desc: '凍結解除時，造成 26 碎冰傷害', effectOverride: { permafrostDmg: 26 } },
      { desc: '凍結解除時，造成 33 碎冰傷害', effectOverride: { permafrostDmg: 33 } },
    ] },

  // ── Arrow 遊俠獵人 ────────────────────────────────────────────────────────
  { id: 'hawk_charm',    name: '鷹眼護符', tier: 'rare', requiredRole: 'arrow',
    desc: '順子時傷害 ×1.6（暴擊）',
    effect: { hawkCharmCritMult: 1.6 }, maxLevel: 3, levelData: [
      { desc: '順子時傷害 ×1.8（暴擊）', effectOverride: { hawkCharmCritMult: 1.8 } },
      { desc: '順子時傷害 ×2.1（暴擊）', effectOverride: { hawkCharmCritMult: 2.1 } },
    ] },
  { id: 'hunter_trap',   name: '獵人陷阱', tier: 'rare', requiredRole: 'arrow',
    desc: '敵人攻擊前 30% 機率被束縛，跳過本次攻擊',
    effect: { hunterTrapProcPct: 30 } },
  { id: 'forest_cloak',  name: '森林斗篷', tier: 'rare', requiredRole: 'arrow',
    desc: '順子時，使敵人下次攻擊傷害 −30%', effect: { straightWeaken: true } },
  { id: 'scatter_quiver', name: '散形箭袋', tier: 'rare', requiredRole: 'arrow',
    desc: '散骰時，獲得 10 護盾',
    effect: { scatterQuiverShield: 10 }, maxLevel: 3, levelData: [
      { desc: '散骰時，獲得 14 護盾', effectOverride: { scatterQuiverShield: 14 } },
      { desc: '散骰時，獲得 19 護盾', effectOverride: { scatterQuiverShield: 19 } },
    ] },
  { id: 'fate_hunter_dice', name: '命運獵骰', tier: 'rare', requiredRole: 'arrow',
    desc: '每回合前 2 次重骰，若結果與其他骰重複，自動換成目前缺少的點數',
    effect: { fateHunterDiceRerollCount: 2 }, maxLevel: 3, levelData: [
      { desc: '每回合前 3 次重骰，若結果與其他骰重複，自動換成目前缺少的點數', effectOverride: { fateHunterDiceRerollCount: 3 } },
      { desc: '每回合前 4 次重骰，若結果與其他骰重複，自動換成目前缺少的點數', effectOverride: { fateHunterDiceRerollCount: 4 } },
    ] },

  // ── Hammer 矮人戰士 ───────────────────────────────────────────────────────
  { id: 'anvil_king',    name: '山王鐵砧', tier: 'rare', requiredRole: 'hammer',
    desc: '受到攻擊後獲得 6 護盾（每回合最多疊加 3 次）',
    effect: { anvilKingShield: 6 }, maxLevel: 3, levelData: [
      { desc: '受到攻擊後獲得 8 護盾（每回合最多疊加 3 次）', effectOverride: { anvilKingShield: 8 } },
      { desc: '受到攻擊後獲得 11 護盾（每回合最多疊加 3 次）', effectOverride: { anvilKingShield: 11 } },
    ] },
  { id: 'armor_hammer',  name: '破甲鐵錘', tier: 'rare', requiredRole: 'hammer',
    desc: '三條以上時，敵人防禦永久 −3（可疊加）',
    effect: { armorHammerBreak: 3 }, maxLevel: 3, levelData: [
      { desc: '三條以上時，敵人防禦永久 −4（可疊加）', effectOverride: { armorHammerBreak: 4 } },
      { desc: '三條以上時，敵人防禦永久 −6（可疊加）', effectOverride: { armorHammerBreak: 6 } },
    ] },

  // ── Song 吟遊詩人 ─────────────────────────────────────────────────────────
  { id: 'ancient_lute',  name: '古老魯特琴', tier: 'rare', requiredRole: 'song',
    desc: '每回合首次擲出兩對以上時，傷害 +20%',
    effect: { ancientLuteDmgPct: 20 }, maxLevel: 3, levelData: [
      { desc: '每回合首次擲出兩對以上時，傷害 +26%', effectOverride: { ancientLuteDmgPct: 26 } },
      { desc: '每回合首次擲出兩對以上時，傷害 +34%', effectOverride: { ancientLuteDmgPct: 34 } },
    ] },
  { id: 'victory_song',  name: '勝利樂章',   tier: 'rare', requiredRole: 'song',
    desc: '每場戰鬥勝利後回復 15 HP', effect: { healOnWin: 15 }, maxLevel: 3, levelData: [
      { desc: '每場戰鬥勝利後回復 19 HP', effectOverride: { healOnWin: 19 } },
      { desc: '每場戰鬥勝利後回復 24 HP', effectOverride: { healOnWin: 24 } },
    ] },
  { id: 'melody_mark',   name: '旋律印記',   tier: 'rare', requiredRole: 'song',
    desc: '每場治療超過 30 的回合，ATK 永久 +4（上限 +20）',
    effect: { melodyHealAtkBonus: 4 }, maxLevel: 3, levelData: [
      { desc: '每場治療超過 30 的回合，ATK 永久 +5（上限 +20）', effectOverride: { melodyHealAtkBonus: 5 } },
      { desc: '每場治療超過 30 的回合，ATK 永久 +7（上限 +20）', effectOverride: { melodyHealAtkBonus: 7 } },
    ] },

  // ── Beast 獸語馴獸師 ──────────────────────────────────────────────────────
  { id: 'wolf_necklace', name: '狼魂項鍊', tier: 'rare', requiredRole: 'beast',
    desc: '攻擊後 30% 機率召喚狼追加 12 傷害；三條以上時機率提升至 100%',
    effect: { wolfNecklaceProcPct: 30 } },
  { id: 'wild_bond',     name: '野性羈絆', tier: 'rare', requiredRole: 'beast',
    desc: '受到治療時，對敵人造成 10 傷害',
    effect: { wildBondDmg: 10 }, maxLevel: 3, levelData: [
      { desc: '受到治療時，對敵人造成 13 傷害', effectOverride: { wildBondDmg: 13 } },
      { desc: '受到治療時，對敵人造成 17 傷害', effectOverride: { wildBondDmg: 17 } },
    ] },

  // ── Gear 機關技師 ─────────────────────────────────────────────────────────
  { id: 'steam_core',    name: '蒸氣核心', tier: 'rare', requiredRole: 'gear',
    desc: '每次重骰蓄力 +1（最多 3 層）；攻擊時每層釋放 +10 傷害',
    effect: { steamCoreDmgPerCharge: 10 }, maxLevel: 3, levelData: [
      { desc: '每次重骰蓄力 +1（最多 3 層）；攻擊時每層釋放 +13 傷害', effectOverride: { steamCoreDmgPerCharge: 13 } },
      { desc: '每次重骰蓄力 +1（最多 3 層）；攻擊時每層釋放 +17 傷害', effectOverride: { steamCoreDmgPerCharge: 17 } },
    ] },
  { id: 'auto_turret',   name: '自動砲台', tier: 'rare', requiredRole: 'gear',
    desc: '每回合開始對敵人造成 8 傷害；上回合擲出順子以上時雙倍',
    effect: { autoTurretDmg: 8 }, maxLevel: 3, levelData: [
      { desc: '每回合開始對敵人造成 11 傷害；上回合擲出順子以上時雙倍', effectOverride: { autoTurretDmg: 11 } },
      { desc: '每回合開始對敵人造成 14 傷害；上回合擲出順子以上時雙倍', effectOverride: { autoTurretDmg: 14 } },
    ] },

  // ── Fighter 武鬥家 ────────────────────────────────────────────────────────
  { id: 'fist_jade_ring',     name: '拳意玉環',   tier: 'common', requiredRole: 'fighter',
    desc: '每層拳勢額外 +4 傷害（出手時結算）',
    effect: { fistJadeRingDmgPerStack: 4 }, maxLevel: 3, levelData: [
      { desc: '每層拳勢額外 +5 傷害（出手時結算）', effectOverride: { fistJadeRingDmgPerStack: 5 } },
      { desc: '每層拳勢額外 +7 傷害（出手時結算）', effectOverride: { fistJadeRingDmgPerStack: 7 } },
    ] },
  { id: 'dragon_heart_relic', name: '龍心碑',     tier: 'rare',   requiredRole: 'fighter',
    desc: '無雙架式期間每次攻擊追加 25 真實傷害；無雙架式結束時回復 15 HP',
    effect: { dragonHeartTrueDmg: 25, dragonHeartHealOnEnd: 15 }, maxLevel: 3, levelData: [
      { desc: '無雙架式期間每次攻擊追加 32 真實傷害；無雙架式結束時回復 19 HP', effectOverride: { dragonHeartTrueDmg: 32, dragonHeartHealOnEnd: 19 } },
      { desc: '無雙架式期間每次攻擊追加 41 真實傷害；無雙架式結束時回復 24 HP', effectOverride: { dragonHeartTrueDmg: 41, dragonHeartHealOnEnd: 24 } },
    ] },

  // ── 代價型遺物 (Trade-off Relics) ────────────────────────────────────────
  { id: 'blood_dice',       name: '血色骰',   tier: 'rare',
    desc: '每次重骰失去最大 HP 的 5%；但本回合傷害 +10%（最多 +30%）',
    effect: { bloodDiceRerollSelfDmgPct: 5, bloodDiceRerollDmgPct: 10 }, maxLevel: 3, levelData: [
      { desc: '每次重骰失去最大 HP 的 10%；但本回合傷害 +20%（最多 +60%）', effectOverride: { bloodDiceRerollSelfDmgPct: 10, bloodDiceRerollDmgPct: 20 } },
      { desc: '每次重骰失去最大 HP 的 20%；但本回合傷害 +40%（最多 +120%）', effectOverride: { bloodDiceRerollSelfDmgPct: 20, bloodDiceRerollDmgPct: 40 } },
    ] },
  { id: 'curse_crown',      name: '詛咒王冠', tier: 'rare',
    desc: '每個詛咒：傷害 +12%；每個詛咒：治療 -5%',
    effect: { curseDmgPct: 12, curseHealPenaltyPct: 5 }, maxLevel: 3, levelData: [
      { desc: '每個詛咒：傷害 +15%；每個詛咒：治療 -5%', effectOverride: { curseDmgPct: 15 } },
      { desc: '每個詛咒：傷害 +19%；每個詛咒：治療 -5%', effectOverride: { curseDmgPct: 19 } },
    ] },
  { id: 'demon_contract',   name: '惡魔契約', tier: 'boss',
    desc: '傷害 +35%；最大 HP -20%（立即生效，不可恢復）',
    effect: { demonDmgPct: 35, relicMaxHpMult: 0.8 }, maxLevel: 3, levelData: [
      { desc: '傷害 +42%；最大 HP -20%（立即生效，不可恢復）', effectOverride: { demonDmgPct: 42 } },
      { desc: '傷害 +50%；最大 HP -20%（立即生效，不可恢復）', effectOverride: { demonDmgPct: 50 } },
    ] },
  { id: 'shattered_grail',  name: '破碎聖杯', tier: 'rare',
    desc: '治療效果 -50%；護盾獲得量 +80%',
    effect: { relicHealMult: 0.5, shieldGainMult: 1.8 }, maxLevel: 3, levelData: [
      { desc: '治療效果 -40%；護盾獲得量 +100%', effectOverride: { relicHealMult: 0.6, shieldGainMult: 2.0 } },
      { desc: '治療效果 -30%；護盾獲得量 +120%', effectOverride: { relicHealMult: 0.7, shieldGainMult: 2.2 } },
    ] },
  { id: 'corrupt_dice_cup', name: '腐化骰杯', tier: 'rare',
    desc: '每顆 6 不再回血；改為造成 10 傷害並施加 1 層易傷',
    effect: { corruptSixDice: true } },

  // ── 星蝕裂隙専用遺物（dungeonRelic: true） ────────────────────────────────
  // 普通遺物
  { id: 'star_sand_compass',  name: '星砂羅盤',   tier: 'common', dungeonOnly: 'star_eclipse',
    desc: '每場戰鬥第一個禁忌點數固定為 1',
    effect: { starSandCompassGuaranteedLow: 1 } },
  { id: 'rift_amulet',        name: '裂隙護符',   tier: 'common', dungeonOnly: 'star_eclipse',
    desc: '禁忌自傷效果 -50%',
    effect: { riftAmuletReducePct: 50 }, maxLevel: 3, levelData: [
      { desc: '禁忌自傷效果 -65%', effectOverride: { riftAmuletReducePct: 65 } },
      { desc: '禁忌自傷效果 -85%', effectOverride: { riftAmuletReducePct: 85 } },
    ] },
  { id: 'moon_dice_cup',      name: '月紋骰杯',   tier: 'common', dungeonOnly: 'star_eclipse',
    desc: '不含禁忌點數出手時，獲得 5 護盾',
    effect: { moonDiceCupShield: 5 }, maxLevel: 3, levelData: [
      { desc: '不含禁忌點數出手時，獲得 7 護盾', effectOverride: { moonDiceCupShield: 7 } },
      { desc: '不含禁忌點數出手時，獲得 9 護盾', effectOverride: { moonDiceCupShield: 9 } },
    ] },
  // 稀有遺物
  { id: 'reversed_astrolabe', name: '逆位星盤',   tier: 'rare',   dungeonOnly: 'star_eclipse',
    desc: '禁忌點數改為加成點數（含禁忌時傷害 +20%），但敵人攻擊 +20%',
    effect: { reversedAstrolabeDmgPct: 20 }, maxLevel: 3, levelData: [
      { desc: '禁忌點數改為加成點數（含禁忌時傷害 +26%），但敵人攻擊 +20%', effectOverride: { reversedAstrolabeDmgPct: 26 } },
      { desc: '禁忌點數改為加成點數（含禁忌時傷害 +34%），但敵人攻擊 +20%', effectOverride: { reversedAstrolabeDmgPct: 34 } },
    ] },
  { id: 'forbidden_contract', name: '禁忌契約',   tier: 'rare',   dungeonOnly: 'star_eclipse',
    desc: '含禁忌點數時傷害 +30%，但受到 8 自傷',
    effect: { forbiddenContractDmgPct: 30, forbiddenContractSelfDmg: 8 }, maxLevel: 3, levelData: [
      { desc: '含禁忌點數時傷害 +39%，但受到 10 自傷', effectOverride: { forbiddenContractDmgPct: 39, forbiddenContractSelfDmg: 10 } },
      { desc: '含禁忌點數時傷害 +51%，但受到 13 自傷', effectOverride: { forbiddenContractDmgPct: 51, forbiddenContractSelfDmg: 13 } },
    ] },
  { id: 'star_hourglass',     name: '星界沙漏',   tier: 'rare',   dungeonOnly: 'star_eclipse',
    desc: '每場戰鬥一次，可將所有禁忌點數改成隨機其他點數',
    effect: { starHourglassMaxUses: 1 }, maxLevel: 3, levelData: [
      { desc: '每場戰鬥兩次，可將所有禁忌點數改成隨機其他點數', effectOverride: { starHourglassMaxUses: 2 } },
      { desc: '每場戰鬥三次，可將所有禁忌點數改成隨機其他點數', effectOverride: { starHourglassMaxUses: 3 } },
    ] },
  { id: 'rift_core',          name: '裂隙核心',   tier: 'rare',   dungeonOnly: 'star_eclipse',
    desc: '每次避開禁忌點數，下一次攻擊 +10 傷害（最多 +30）',
    effect: { riftCoreStackGain: 10, riftCoreCap: 30 }, maxLevel: 3, levelData: [
      { desc: '每次避開禁忌點數，下一次攻擊 +13 傷害（最多 +39）', effectOverride: { riftCoreStackGain: 13, riftCoreCap: 39 } },
      { desc: '每次避開禁忌點數，下一次攻擊 +17 傷害（最多 +51）', effectOverride: { riftCoreStackGain: 17, riftCoreCap: 51 } },
    ] },
  // Boss 遺物
  { id: 'eclipse_crown',      name: '星蝕王冠',   tier: 'boss',   dungeonOnly: 'star_eclipse',
    desc: 'Boss 戰中，不含禁忌點數出手時，Boss 獲得 1 層易傷', effect: {} },
  { id: 'judgment_eye',       name: '審判之眼',   tier: 'boss',   dungeonOnly: 'star_eclipse',
    desc: '每 3 回合，如果本回合不含禁忌點數，追加 40 真實傷害',
    effect: { judgmentEyeDmg: 40 }, maxLevel: 3, levelData: [
      { desc: '每 3 回合，如果本回合不含禁忌點數，追加 52 真實傷害', effectOverride: { judgmentEyeDmg: 52 } },
      { desc: '每 3 回合，如果本回合不含禁忌點數，追加 68 真實傷害', effectOverride: { judgmentEyeDmg: 68 } },
    ] },

  // ── 燃燒王座専用遺物（dungeonOnly: 'burning_throne'） ────────────────────────
  // 普通遺物
  { id: 'snuffed_candlestick', name: '熄火燭台',   tier: 'common', dungeonOnly: 'burning_throne',
    desc: '每場戰鬥第一次魔焰反噬無效',                        effect: { infernalFirstBacklashNegate: true } },
  { id: 'ash_talisman',        name: '灰燼護符',   tier: 'common', dungeonOnly: 'burning_throne',
    desc: '受到燃燒時，回復 3 HP',                             effect: { healOnBurnApplied: 3 }, maxLevel: 3, levelData: [
      { desc: '受到燃燒時，回復 4 HP', effectOverride: { healOnBurnApplied: 4 } },
      { desc: '受到燃燒時，回復 6 HP', effectOverride: { healOnBurnApplied: 6 } },
    ] },
  { id: 'throne_ember',        name: '王座餘燼',   tier: 'common', dungeonOnly: 'burning_throne',
    desc: '擊敗精英後，下一場戰鬥初始魔焰 -1',                 effect: { eliteKillFlameReduction: 1 }, maxLevel: 3, levelData: [
      { desc: '擊敗精英後，下一場戰鬥初始魔焰 -2', effectOverride: { eliteKillFlameReduction: 2 } },
      { desc: '擊敗精英後，下一場戰鬥初始魔焰 -3', effectOverride: { eliteKillFlameReduction: 3 } },
    ] },
  // 稀有遺物
  { id: 'black_flame_crown',   name: '黑焰王冠',   tier: 'rare',   dungeonOnly: 'burning_throne',
    desc: '魔焰值 4 以上時，玩家傷害 +15%',                    effect: { highFlameDmgPct: 15 }, maxLevel: 3, levelData: [
      { desc: '魔焰值 4 以上時，玩家傷害 +19%', effectOverride: { highFlameDmgPct: 19 } },
      { desc: '魔焰值 4 以上時，玩家傷害 +24%', effectOverride: { highFlameDmgPct: 24 } },
    ] },
  { id: 'burning_soul_relic',  name: '燃魂契約',   tier: 'rare',   dungeonOnly: 'burning_throne',
    desc: '魔焰值越高傷害越高（每點 +3%），但反噬傷害也增加 +5', effect: { flamePerPointDmgPct: 3, flameBacklashExtra: 5 }, maxLevel: 3, levelData: [
      { desc: '魔焰值越高傷害越高（每點 +4%），但反噬傷害也增加 +5', effectOverride: { flamePerPointDmgPct: 4 } },
      { desc: '魔焰值越高傷害越高（每點 +5%），但反噬傷害也增加 +5', effectOverride: { flamePerPointDmgPct: 5 } },
    ] },
  // Boss 遺物
  { id: 'shattered_demon_core', name: '破碎魔核',  tier: 'boss',   dungeonOnly: 'burning_throne',
    desc: 'Boss 戰中第一次王座崩壞全部清除時，Boss 受到 60 真實傷害', effect: { throneCollapseNullifyDmg: 60 }, maxLevel: 3, levelData: [
      { desc: 'Boss 戰中第一次王座崩壞全部清除時，Boss 受到 75 真實傷害', effectOverride: { throneCollapseNullifyDmg: 75 } },
      { desc: 'Boss 戰中第一次王座崩壞全部清除時，Boss 受到 95 真實傷害', effectOverride: { throneCollapseNullifyDmg: 95 } },
    ] },

  // ── 黑潮王座専用遺物（dungeonOnly: 'black_tide'） ────────────────────────
  // 普通遺物
  { id: 'tide_pearl',      name: '潮汐珍珠',   tier: 'common', dungeonOnly: 'black_tide',
    desc: '每次潮汐切換時，回復 5 HP',                       effect: { tideHealOnChange: 5 }, maxLevel: 3, levelData: [
      { desc: '每次潮汐切換時，回復 7 HP', effectOverride: { tideHealOnChange: 7 } },
      { desc: '每次潮汐切換時，回復 9 HP', effectOverride: { tideHealOnChange: 9 } },
    ] },
  { id: 'oxygen_mask',     name: '深海面罩',   tier: 'common', dungeonOnly: 'black_tide',
    desc: '氧氣上限 +1（本場即時生效）',                      effect: { oxygenMaxBonus: 1 }, maxLevel: 3, levelData: [
      { desc: '氧氣上限 +2（本場即時生效）', effectOverride: { oxygenMaxBonus: 2 } },
      { desc: '氧氣上限 +3（本場即時生效）', effectOverride: { oxygenMaxBonus: 3 } },
    ] },
  { id: 'tidal_deflector', name: '潮殼護符',   tier: 'common', dungeonOnly: 'black_tide',
    desc: '漲潮時受到的傷害 -15%',                           effect: { tidalDmgReduce: 15 }, maxLevel: 3, levelData: [
      { desc: '漲潮時受到的傷害 -20%', effectOverride: { tidalDmgReduce: 20 } },
      { desc: '漲潮時受到的傷害 -26%', effectOverride: { tidalDmgReduce: 26 } },
    ] },
  // 稀有遺物
  { id: 'depth_compass',   name: '深壓羅盤',   tier: 'rare',   dungeonOnly: 'black_tide',
    desc: '深壓狀態時，攻擊傷害 +20%',                       effect: { deepPressDmgPct: 20 }, maxLevel: 3, levelData: [
      { desc: '深壓狀態時，攻擊傷害 +25%', effectOverride: { deepPressDmgPct: 25 } },
      { desc: '深壓狀態時，攻擊傷害 +32%', effectOverride: { deepPressDmgPct: 32 } },
    ] },
  { id: 'drowned_crown',   name: '溺冠碎片',   tier: 'rare',   dungeonOnly: 'black_tide',
    desc: '擊殺敵人後恢復 2 點氧氣',                         effect: { killRestoreOxygen: 2 }, maxLevel: 3, levelData: [
      { desc: '擊殺敵人後恢復 3 點氧氣', effectOverride: { killRestoreOxygen: 3 } },
      { desc: '擊殺敵人後恢復 4 點氧氣', effectOverride: { killRestoreOxygen: 4 } },
    ] },
  // Boss 遺物
  { id: 'tidal_king_seal', name: '潮汐王印',   tier: 'boss',   dungeonOnly: 'black_tide',
    desc: '每場戰鬥開始獲得 2 護盾；氧氣不自然消耗',          effect: { startShield: 2, oxygenNoDecay: true }, maxLevel: 3, levelData: [
      { desc: '每場戰鬥開始獲得 4 護盾；氧氣不自然消耗', effectOverride: { startShield: 4 } },
      { desc: '每場戰鬥開始獲得 6 護盾；氧氣不自然消耗', effectOverride: { startShield: 6 } },
    ] },

  // ── 灰燼聖約専用遺物（dungeonOnly: 'ash_covenant'） ──────────────────────
  // 普通遺物
  { id: 'covenant_charm',  name: '聖約護符',   tier: 'common', dungeonOnly: 'ash_covenant',
    desc: '聖約進度 < 50 時，每回合開始獲得 4 護盾',          effect: { covenantLowShield: 4 }, maxLevel: 3, levelData: [
      { desc: '聖約進度 < 50 時，每回合開始獲得 6 護盾', effectOverride: { covenantLowShield: 6 } },
      { desc: '聖約進度 < 50 時，每回合開始獲得 8 護盾', effectOverride: { covenantLowShield: 8 } },
    ] },
  { id: 'ash_pendant',     name: '灰燼護墜',   tier: 'common', dungeonOnly: 'ash_covenant',
    desc: '聖約審判後回復 12 HP',                             effect: { covenantBurstHeal: 12 }, maxLevel: 3, levelData: [
      { desc: '聖約審判後回復 16 HP', effectOverride: { covenantBurstHeal: 16 } },
      { desc: '聖約審判後回復 20 HP', effectOverride: { covenantBurstHeal: 20 } },
    ] },
  { id: 'vow_stone',       name: '誓約石',     tier: 'common', dungeonOnly: 'ash_covenant',
    desc: '聖約審判對英雄的傷害 -50%',                        effect: { covenantBurstDmgReduce: 50 }, maxLevel: 3, levelData: [
      { desc: '聖約審判對英雄的傷害 -62%', effectOverride: { covenantBurstDmgReduce: 62 } },
      { desc: '聖約審判對英雄的傷害 -75%', effectOverride: { covenantBurstDmgReduce: 75 } },
    ] },
  // 稀有遺物
  { id: 'judgment_focus',  name: '審判之眸',   tier: 'rare',   dungeonOnly: 'ash_covenant',
    desc: '聖約進度 ≥ 75 時，傷害 +20%',                     effect: { covenantHighDmgPct: 20 }, maxLevel: 3, levelData: [
      { desc: '聖約進度 ≥ 75 時，傷害 +26%', effectOverride: { covenantHighDmgPct: 26 } },
      { desc: '聖約進度 ≥ 75 時，傷害 +33%', effectOverride: { covenantHighDmgPct: 33 } },
    ] },
  { id: 'covenant_seal',   name: '聖約封印',   tier: 'rare',   dungeonOnly: 'ash_covenant',
    desc: '每次聖約審判後，本場攻擊永久 +8（最多 +32）',      effect: { covenantBurstAtkBonus: 8 }, maxLevel: 3, levelData: [
      { desc: '每次聖約審判後，本場攻擊永久 +10（最多 +32）', effectOverride: { covenantBurstAtkBonus: 10 } },
      { desc: '每次聖約審判後，本場攻擊永久 +13（最多 +32）', effectOverride: { covenantBurstAtkBonus: 13 } },
    ] },
  // Boss 遺物
  { id: 'ashen_kings_trophy', name: '灰燼王印', tier: 'boss',  dungeonOnly: 'ash_covenant',
    desc: '聖約審判後獲得 25 護盾',                           effect: { covenantBurstShieldBonus: 25 }, maxLevel: 3, levelData: [
      { desc: '聖約審判後獲得 32 護盾', effectOverride: { covenantBurstShieldBonus: 32 } },
      { desc: '聖約審判後獲得 40 護盾', effectOverride: { covenantBurstShieldBonus: 40 } },
    ] },
]

// ── 等級效果計算（mirror buffCards.ts 的 getEffectiveCardEffect/getEffectiveCardDesc） ──
export function getEffectiveRelicEffect(relic: Relic, level: number): RelicEffect {
  if (level <= 1 || !relic.levelData) return relic.effect
  const idx = Math.min(level - 2, relic.levelData.length - 1)
  return { ...relic.effect, ...relic.levelData[idx].effectOverride }
}

export function getEffectiveRelicDesc(relic: Relic, level: number): string {
  if (level <= 1 || !relic.levelData) return relic.desc
  const idx = Math.min(level - 2, relic.levelData.length - 1)
  return relic.levelData[idx].desc
}

// ── Helpers ───────────────────────────────────────────────────────────────

export const getRelicById = (id: string): Relic | undefined =>
  ALL_RELICS.find(r => r.id === id)

/** 取得「目前持有的遺物在其當前等級下」的有效 effect；未持有則回傳 undefined。
 *  取代過去散落各處的 `ALL_RELICS.find(r => r.id === id)?.effect.xxx` 寫法，
 *  讓讀到的數值會隨 relicLevels 套用 levelData 往上調整。 */
export function getOwnedRelicEffect(
  relics: string[],
  relicLevels: Record<string, number> | undefined,
  id: string,
): RelicEffect | undefined {
  if (!relics.includes(id)) return undefined
  const relic = getRelicById(id)
  if (!relic) return undefined
  return getEffectiveRelicEffect(relic, relicLevels?.[id] ?? 1)
}

const DUNGEON_RELIC_WEIGHT = 4  // dungeon-specific relics appear 4x more likely

export function getRandomRelics(
  count: number,
  excludeIds: string[] = [],
  tier?: Relic['tier'],
  heroRole?: Role,
  dungeonId?: string,
): Relic[] {
  const pool = ALL_RELICS.filter(r =>
    !excludeIds.includes(r.id) &&
    (!tier || r.tier === tier) &&
    (!r.requiredRole || r.requiredRole === heroRole) &&
    (dungeonId ? (!r.dungeonOnly || r.dungeonOnly === dungeonId) : !r.dungeonOnly)
  )

  // Tier-weighted bucket roll, same odds as getRandomCards: boss 12%, rare 30%, common 58%.
  // Only kicks in when `tier` isn't already forced by the caller (pool would then be single-tier already).
  const pickTierBucket = (candidates: Relic[]): Relic['tier'] | undefined => {
    const roll = Math.random()
    if (roll < 0.12 && candidates.some(r => r.tier === 'boss')) return 'boss'
    if (roll < 0.42 && candidates.some(r => r.tier === 'rare')) return 'rare'
    return candidates.some(r => r.tier === 'common') ? 'common' : undefined
  }

  if (!dungeonId) {
    const available = [...pool]
    const result: Relic[] = []
    while (result.length < count && available.length > 0) {
      const bucket = pickTierBucket(available)
      const candidates = bucket ? available.filter(r => r.tier === bucket) : available
      const pick = candidates[Math.floor(Math.random() * candidates.length)]
      result.push(pick)
      available.splice(available.indexOf(pick), 1)
    }
    return result
  }

  // Weighted sampling: dungeon-specific relics get DUNGEON_RELIC_WEIGHT, others get 1
  const weighted = pool.map(r => ({ relic: r, weight: r.dungeonOnly === dungeonId ? DUNGEON_RELIC_WEIGHT : 1 }))
  const result: Relic[] = []
  while (result.length < count && weighted.length > 0) {
    const bucket = pickTierBucket(weighted.map(e => e.relic))
    const candidates = bucket ? weighted.filter(e => e.relic.tier === bucket) : weighted
    const total = candidates.reduce((s, e) => s + e.weight, 0)
    let rand = Math.random() * total
    for (let i = 0; i < candidates.length; i++) {
      rand -= candidates[i].weight
      if (rand <= 0) {
        const idx = weighted.indexOf(candidates[i])
        result.push(weighted.splice(idx, 1)[0].relic)
        break
      }
    }
  }
  return result
}

export function getRelicRerollBonus(ids: string[], levels: Record<string, number> = {}): number {
  return ids.reduce((s, id) => s + (getOwnedRelicEffect(ids, levels, id)?.rerollBonus ?? 0), 0)
}
export function getRelicDefBonus(ids: string[], levels: Record<string, number> = {}): number {
  return ids.reduce((s, id) => s + (getOwnedRelicEffect(ids, levels, id)?.defBonus ?? 0), 0)
}
export function getRelicStartShield(ids: string[], levels: Record<string, number> = {}): number {
  return ids.reduce((s, id) => s + (getOwnedRelicEffect(ids, levels, id)?.startShield ?? 0), 0)
}
export function getRelicStartEnemyBurn(ids: string[], levels: Record<string, number> = {}): number {
  return ids.reduce((s, id) => s + (getOwnedRelicEffect(ids, levels, id)?.startEnemyBurn ?? 0), 0)
}
export function getRelicDamageBonus(ids: string[], levels: Record<string, number> = {}): number {
  return ids.reduce((s, id) => s + (getOwnedRelicEffect(ids, levels, id)?.damageBonus ?? 0), 0)
}
export function getRelicHealBonus(ids: string[], levels: Record<string, number> = {}): number {
  return ids.reduce((s, id) => s + (getOwnedRelicEffect(ids, levels, id)?.healBonus ?? 0), 0)
}
export function getRelicGoldMult(ids: string[], levels: Record<string, number> = {}): number {
  return ids.reduce((s, id) => s * (getOwnedRelicEffect(ids, levels, id)?.goldMult ?? 1), 1)
}
export function getRelicBurnOnSix(ids: string[], levels: Record<string, number> = {}): number {
  return ids.reduce((s, id) => s + (getOwnedRelicEffect(ids, levels, id)?.burnOnSix ?? 0), 0)
}
export function getRelicGoldOnSix(ids: string[], levels: Record<string, number> = {}): number {
  return ids.reduce((s, id) => s + (getOwnedRelicEffect(ids, levels, id)?.goldOnSix ?? 0), 0)
}
export function getRelicHealOnSix(ids: string[], levels: Record<string, number> = {}): number {
  return ids.reduce((s, id) => s + (getOwnedRelicEffect(ids, levels, id)?.healOnSix ?? 0), 0)
}
export function getRelicHealOnWin(ids: string[], levels: Record<string, number> = {}): number {
  return ids.reduce((s, id) => s + (getOwnedRelicEffect(ids, levels, id)?.healOnWin ?? 0), 0)
}
export function getRelicHealOnWinPct(ids: string[], levels: Record<string, number> = {}): number {
  return ids.reduce((s, id) => s + (getOwnedRelicEffect(ids, levels, id)?.healOnWinPct ?? 0), 0)
}
export function hasRelic(ids: string[], id: string): boolean {
  return ids.includes(id)
}
