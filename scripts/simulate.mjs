// Battle simulator – base + Lv100 3★ talent builds
// Usage: node scripts/simulate.mjs [iterations]

const N = parseInt(process.argv[2] ?? '60000')

// ── Hero base stats ────────────────────────────────────────────────────────────
const HEROES = [
  { id: 'knight',      name: '聖騎士',      hp: 168, atk: 28, def: 14, role: 'slash'  },
  { id: 'mage',        name: '火焰法師',    hp: 102, atk: 39, def: 5,  role: 'fire'   },
  { id: 'priest',      name: '神官祭司',    hp: 122, atk: 18, def: 8,  role: 'holy'   },
  { id: 'rogue',       name: '影刃刺客',    hp: 108, atk: 31, def: 5,  role: 'shadow' },
  { id: 'princess',   name: '皇家公主',    hp: 118, atk: 24, def: 8,  role: 'ice'    },
  { id: 'archer',      name: '遊俠獵人',    hp: 114, atk: 26, def: 7,  role: 'arrow'  },
  { id: 'dwarf',       name: '矮人戰士',    hp: 148, atk: 27, def: 12, role: 'hammer' },
  { id: 'bard',        name: '吟遊詩人',    hp: 108, atk: 19, def: 6,  role: 'song'   },
  { id: 'beastmaster', name: '獸語馴獸師',  hp: 132, atk: 24, def: 9,  role: 'beast'  },
  { id: 'engineer',    name: '機關技師',    hp: 120, atk: 23, def: 8,  role: 'gear'   },
]

// ── Lv100 3★ max-DPS talent builds ──────────────────────────────────────────
// Rules:
//   - 3★ star-multiplier = ×2.0 on all talent values
//   - rerollBonus: NOT scaled (stays as-is per talents.ts)
//   - star passives: NOT scaled
//   - Awakening: ×2.0 applied
//   - skillMult: applied when isSkill
//   - healToAtkPct: fraction of heal added as bonus damage each turn (e.g. bard awakening)
//   - healToAtk: boolean – when isSkill, convert all heal to damage (holy_resonance)
//   - extraHealBonus: added to heal each turn before all conversions
// ─────────────────────────────────────────────────────────────────────────────
const BUILDS = {
  slash: {
    // Lv20b flat+10, Lv40b rank≥3+12, Lv60a rank+3, Lv80b flat+18  (all ×2.0)
    // + 1★ startShield:6 (not dmg), 2★ shield_on_combo (not dmg), 3★ shield_to_dmg:12% (≈+10/turn with ~80 shield)
    // Awakening (3★): skill_shield:15*2=30 (not modeled)
    // Lv100: slash_power ×2.5 on skill (rank≥4)
    flatBonus: 56, rankBonus: 6,
    rankThresholds: [{minRank:3, value:24}],
    rerollBonus: 0, skillMult: 2.5,
    notes: '聖騎注意: 3★ shield_to_dmg 12% 護盾→傷害未計（每回合約+8~15）',
  },
  fire: {
    // Lv20b flat+12, Lv40c rank+4, Lv60b flat+18, Lv80b flat+20  (all ×2.0)
    // Awakening (3★): startEnemyBurn:5*2=10 (只首回合)
    // 1★ burnOnAttack+1, 2★ burn_on_high_combo rank≥4+2
    // Lv100: fire_furnace ×3 on skill (rank≥4)
    flatBonus: 100, rankBonus: 8,
    rankThresholds: [],
    rerollBonus: 0, skillMult: 3.0,
    notes: '燃燒未計：1★+2層/turn、2★rank≥4再+2、開局+10（相當於額外4~8傷/turn）',
  },
  holy: {
    // holy_resonance build: heal → damage when isSkill (rank≥2, ≈90% turns)
    // Lv20a healBonus+8, Lv60a healBonus+12  (×2.0 = +16/+24)
    // Lv40c heal_shield (護盾不減heal), Lv80c heal_atk_bonus (heal>20 → next atk+20)
    // 1★ heal_pct_bonus +12% (applied after heal), 2★ six_heal:+4/turn(if any 6s)
    // Awakening (3★): heal_shield:20 (not reducing heal)
    flatBonus: 0, rankBonus: 0,
    rankThresholds: [],
    rerollBonus: 0,
    extraHealBonus: 40,   // (8+12)*2.0
    healPctBonus: 0.12,   // 1★ star passive (not scaled)
    healToAtk: true,      // holy_resonance: isSkill → convert all heal to damage
    notes: 'holy_resonance：等級≥2(90%回合)治療全轉傷害。2★ six_heal約+2/turn(未計)。',
  },
  shadow: {
    // Lv20a flat+12, Lv60a rank+4, Lv80a rank≥4+28  (all ×2.0)
    // No flat from Lv40 (all burn/utility/hp)
    // 1★ rank≥2+6, Awakening: rerollBonus+1
    // Lv100: shadow_burst ×2.0 on skill (rank≥4)
    flatBonus: 24, rankBonus: 8,
    rankThresholds: [{minRank:4, value:56}, {minRank:2, value:6}],  // Lv80a ×2, 1★ star (not scaled)
    rerollBonus: 1, skillMult: 2.0,
    notes: '2★ proc_double_strike 25%機率追加45%傷害(rank≥2) ≈+5/turn(未計)',
  },
  ice: {
    // Lv20b flat+12, Lv40c rank+3, Lv60b flat+15, Lv80b flat+8+rank≥3+15  (all ×2.0)
    // Awakening(3★): startEnemyFreeze:2 (首回合敵人凍結2回)
    // 1★ taunt -15%敵人ATK, 2★ proc_freeze15%, 3★ freeze_burst +25%dmg
    // Lv100: ice_cryo_burst +20 dmg if enemy burning (combo with mage/rogue burn builds)
    //        ice_permafrost freeze 3 turns (×0.5 dmg), ice_barrier +40 shield
    // Using standard skillMult:1.0 (no direct dmg boost from skill for solo run)
    flatBonus: 70, rankBonus: 6,
    rankThresholds: [{minRank:3, value:30}],
    rerollBonus: 0, skillMult: 1.0,
    notes: '冰系技能偏控場。3★ freeze_burst(凍結時+25%)實際效益高。ice_cryo_burst需燃燒配合。',
  },
  arrow: {
    // Standard DPS build (not unique-dice build):
    // Lv20b reroll+1, Lv40c flat+15, Lv60b reroll+1+flat+10, Lv80a flat+20  (flat values ×2.0)
    // rerollBonus: 2 (not scaled)
    // Awakening(3★): unique_atk_stack+12 per 5-unique (hard to model, adds ~3~6/turn)
    // 1★ unique_dice_dmg:+2/unique, 2★ full_unique_bonus:+35% on all 5 different
    // 3★ no_reroll_bonus: +18% if no reroll (hard to model here)
    // Lv100: arrow_snipe ×2.5 + ignore 50% def
    flatBonus: 90, rankBonus: 0,
    rankThresholds: [{minRank:4, value:28}],  // base role already has +14 rank≥4; but we don't double-count
    rerollBonus: 2, skillMult: 2.5,
    notes: '獨特build: 散形骰(所有點數不同)+no_reroll可達+80%傷加成(未計入, 這是標準build)',
  },
  hammer: {
    // Lv20c rank≥3+10, Lv40a rank≥3+12, Lv60b flat+18, Lv80b rank≥3+20  (all ×2.0)
    // 1★ armor_break_on_combo, 2★ shield_on_armor_break, 3★ armor_break_dmg_bonus+15%
    // Awakening(3★): tank_stack+8 per hit (up to +64) — powerful in sustained fights
    // Lv100: hammer_quake ×2.5 + shield+30
    flatBonus: 36, rankBonus: 0,
    rankThresholds: [{minRank:3, value:84}],  // (10+12+20)*2 = 84 combined
    rerollBonus: 0, skillMult: 2.5,
    notes: '3★ armor_break_dmg_bonus+15%+坦克疊加未計。破甲實際加成：破甲5時≈+10~15傷/hit',
  },
  song: {
    // heal_dmg awakening (3★ ×2.0): 每次heal, 敵人受heal*100%傷害! (passiveValue:50 × 2.0 = 100%)
    // Lv40a rank≥2+12 healBonus+5, Lv60c rank+3  (×2.0)
    // Lv80b heal_atk_bonus (conditional, not modeled directly)
    // Lv100: song_power: isSkill → damage ×1.5 + heal+30
    rankBonus: 6, rankThresholds: [{minRank:2, value:24}],
    flatBonus: 0, rerollBonus: 0,
    extraHealBonus: 30,       // Lv20a+Lv40a heal talents (rough sum)
    healToAtkPct: 1.0,        // Awakening 3★: heal_dmg 50% × ×2.0 mult = 100% of heal as bonus damage
    songPower: true,          // Lv100 song_power: isSkill → damage ×1.5 AND extra heal+30
    notes: '覺醒3★: 每次治療100%治療量作為傷害！song_power把dmg×1.5。吟遊詩人實際傷害遠超基礎值。',
  },
  beast: {
    // Lv20a flat+12, Lv40a rank≥3+15, Lv60b flat+20, Lv80b rank+6  (all ×2.0)
    // 1★ wolf_summon 25%機率+8dmg, 2★ wolf_on_combo(rank≥3保證), 3★ wolf_super_strike(每3次×1.8)
    // Awakening(3★): flat+10*2=20 (戰鬥開始ATK+10, scaled as flatDamage)
    // Lv100: beast_king ×2.0 + 5層燃燒
    flatBonus: 64 + 20, rankBonus: 12,  // includes awakening flat+20
    rankThresholds: [{minRank:3, value:30}],
    rerollBonus: 0, skillMult: 2.0,
    notes: '狼召喚: 1★25%+8, 2★rank≥3必定+8, 3★每3次×1.8 ≈ +8~12/turn(未計). 獸系爆發強',
  },
  gear: {
    // Lv20b reroll+1, Lv40b reroll+1+flat+8, Lv60b flat+20, Lv80b rank+7  (flat/rank ×2.0, reroll not scaled)
    // 1★ star_reroll_charge+3/layer(3max) → up to +9/atk with 2 rerolls, 2★ upgrade to +4/layer+4max → up to +16
    // 3★ overclock_cannon 30% extra hit (complex)
    // Awakening(3★): reroll_min_boost:4*2=8 per reroll (raises dice min by up to 8; modeled as approx +rank bonus)
    // Lv100: gear_explosion ×3.0 (no reroll that turn)
    flatBonus: 56, rankBonus: 14,  // (8+20)*2 flat, 7*2 rank
    rankThresholds: [],
    rerollBonus: 2, skillMult: 3.0,
    notes: '3★ 覺醒reroll_min_boost每次重骰骰值最低+1(上限+8)大幅提升combo率(未計). 星級蓄能+9~16/atk未計',
  },
}

// ── Core logic ────────────────────────────────────────────────────────────────
function roll() { return Math.ceil(Math.random() * 6) }
function rollFive() { return [roll(), roll(), roll(), roll(), roll()] }

function evaluateDice(dice) {
  const sorted = [...dice].sort((a, b) => a - b)
  const counts = Object.values(
    dice.reduce((acc, v) => { acc[v] = (acc[v] ?? 0) + 1; return acc }, {})
  ).sort((a, b) => b - a)
  const isStraight = sorted.join(',') === '1,2,3,4,5' || sorted.join(',') === '2,3,4,5,6'
  if (counts[0] === 5) return { label: '五條', rank: 6, baseDamage: 58, heal: 8 }
  if (counts[0] === 4) return { label: '四條', rank: 5, baseDamage: 46, heal: 6 }
  if (counts[0] === 3 && counts[1] === 2) return { label: '葫蘆', rank: 4, baseDamage: 40, heal: 5 }
  if (isStraight) return { label: '順子', rank: 4, baseDamage: 38, heal: 4 }
  if (counts[0] === 3) return { label: '三條', rank: 3, baseDamage: 30, heal: 3 }
  if (counts[0] === 2 && counts[1] === 2) return { label: '兩對', rank: 2, baseDamage: 22, heal: 2 }
  if (counts[0] === 2) return { label: '一對', rank: 1, baseDamage: 14, heal: 1 }
  return { label: '散骰', rank: 0, baseDamage: 9, heal: 0 }
}

function computeHeroAction(hero, combo, dice) {
  let damage = combo.baseDamage + hero.atk
  let heal = 0
  let isSkill = combo.rank >= 4
  switch (hero.role) {
    case 'slash':
      if (combo.rank >= 3) damage += 10
      if (combo.rank >= 6) damage += 0
      break
    case 'fire':
      if (combo.rank >= 4) damage += 18
      if (combo.rank >= 5) damage += 6
      break
    case 'holy':
      heal += combo.heal * 4 + dice.filter(d => d === 6).length * 5
      damage -= 6; isSkill = combo.rank >= 2
      break
    case 'shadow':
      if (combo.rank >= 2) damage += 12
      if (combo.rank >= 4) damage += 8
      break
    case 'ice':
      damage += combo.rank >= 4 ? 12 : 4
      break
    case 'arrow':
      if (combo.rank >= 4) damage += 14
      break
    case 'hammer':
      damage += combo.rank >= 3 ? 11 : 5
      break
    case 'song':
      heal += 10 + combo.heal * 2; damage -= 4; isSkill = combo.rank >= 2
      break
    case 'beast':
      damage += 8 + combo.rank * 2
      break
    case 'gear':
      damage += combo.rank >= 2 ? 10 : 0
      if (combo.rank >= 4) damage += 6
      break
  }
  return { damage, heal, isSkill }
}

// Smart hold: keep most common value group
function smartHeld(dice) {
  const freq = {}
  dice.forEach(v => { freq[v] = (freq[v] ?? 0) + 1 })
  const maxCount = Math.max(...Object.values(freq))
  const keepValues = new Set(
    Object.entries(freq).filter(([, c]) => c === maxCount).map(([v]) => parseInt(v))
  )
  const heldCount = {}
  return dice.map(v => {
    if (keepValues.has(v)) { heldCount[v] = (heldCount[v] ?? 0) + 1; return heldCount[v] <= maxCount }
    return false
  })
}

function rerollDice(current, held) {
  return current.map((v, i) => held[i] ? v : roll())
}

// ── Simulate one turn with optional talent build ──────────────────────────────
function simulateTurn(hero, build) {
  const totalRerolls = 2 + (build?.rerollBonus ?? 0)
  let dice = rollFive()
  for (let r = 0; r < totalRerolls; r++) {
    const held = smartHeld(dice)
    if (held.every(Boolean)) break
    dice = rerollDice(dice, held)
  }
  const combo = evaluateDice(dice)
  let { damage, heal, isSkill } = computeHeroAction(hero, combo, dice)

  if (!build) return { damage: Math.max(0, damage), heal, rank: combo.rank, label: combo.label }

  // Apply talent flat bonuses
  damage += build.flatBonus ?? 0
  damage += (build.rankBonus ?? 0) * combo.rank
  for (const rt of (build.rankThresholds ?? [])) {
    if (combo.rank >= rt.minRank) damage += rt.value
  }

  // Apply extra heal from talents
  if (build.extraHealBonus) heal += build.extraHealBonus
  if (build.healPctBonus && heal > 0) heal = Math.round(heal * (1 + build.healPctBonus))

  // Skill override: skill multiplier
  if (isSkill && build.skillMult && build.skillMult > 1) {
    damage = Math.round(damage * build.skillMult)
  }

  // song_power: isSkill → damage ×1.5 (overrides base skillMult above) + extra heal+30
  if (build.songPower && isSkill) {
    damage = Math.round(damage * 1.5)
    heal += 30
  }

  // holy_resonance: isSkill → all heal converts to damage
  if (build.healToAtk && isSkill && heal > 0) {
    damage += heal
    heal = 0
  }

  // Bard awakening: healToAtkPct × heal added as bonus damage (always, not just skill)
  if (build.healToAtkPct && heal > 0) {
    damage += Math.round(heal * build.healToAtkPct)
  }

  return { damage: Math.max(0, damage), heal, rank: combo.rank, label: combo.label }
}

// ── Run both base and talent simulations ──────────────────────────────────────
console.log(`\n🎲 Dice Hero 平衡分析 — ${N.toLocaleString()} 回合/職業  |  Base = Lv1 無天賦  |  Talent = Lv100 3★ 最強DPS路線\n`)

const RANK_LABEL = ['散', '一對', '兩對', '三條', '葫/順', '四條', '五條']

const allResults = []

for (const hero of HEROES) {
  const build = BUILDS[hero.role]

  let baseDmg = 0, baseHeal = 0, talentDmg = 0, talentHeal = 0
  const baseRanks = new Array(7).fill(0), talentRanks = new Array(7).fill(0)
  const baseSamples = [], talentSamples = []

  for (let i = 0; i < N; i++) {
    const b = simulateTurn(hero, null)
    baseDmg += b.damage; baseHeal += b.heal; baseRanks[b.rank]++; baseSamples.push(b.damage)

    const t = simulateTurn(hero, build)
    talentDmg += t.damage; talentHeal += t.heal; talentRanks[t.rank]++; talentSamples.push(t.damage)
  }

  const avgBase    = baseDmg / N
  const avgTalent  = talentDmg / N
  const avgHealB   = baseHeal / N
  const avgHealT   = talentHeal / N
  const mult       = (avgTalent / avgBase).toFixed(2)

  baseSamples.sort((a, b) => a - b)
  talentSamples.sort((a, b) => a - b)

  allResults.push({
    hero, build,
    avgBase, avgTalent, avgHealB, avgHealT,
    mult: parseFloat(mult),
    p50base:   baseSamples[Math.floor(N * 0.50)],
    p95base:   baseSamples[Math.floor(N * 0.95)],
    p50talent: talentSamples[Math.floor(N * 0.50)],
    p95talent: talentSamples[Math.floor(N * 0.95)],
    rankDist: talentRanks,
  })
}

// Sort by talent DPS descending
allResults.sort((a, b) => b.avgTalent - a.avgTalent)

const PAD  = (s, n) => String(s).padStart(n)
const PADL = (s, n) => String(s).padEnd(n)
const FMT  = v => v.toFixed(1)

// ── Table 1: Base vs Talent comparison ───────────────────────────────────────
console.log('─'.repeat(95))
console.log(
  PADL('職業', 13) + PAD('ATK', 4) +
  PAD('Base傷', 8) + PAD('P50', 5) + PAD('P95', 5) + '  ' +
  PAD('Talent傷', 9) + PAD('P50', 6) + PAD('P95', 6) +
  PAD('倍率', 6) + PAD('Talent治', 9)
)
console.log('─'.repeat(95))
for (const r of allResults) {
  const healStr = r.avgHealT > 3 ? `+${FMT(r.avgHealT)} HP` : '-'
  console.log(
    PADL(`${r.hero.name}(${r.hero.role})`, 13) + PAD(r.hero.atk, 4) +
    PAD(FMT(r.avgBase), 8) + PAD(r.p50base, 5) + PAD(r.p95base, 5) + '  ' +
    PAD(FMT(r.avgTalent), 9) + PAD(r.p50talent, 6) + PAD(r.p95talent, 6) +
    PAD(`×${r.mult}`, 6) + PAD(healStr, 9)
  )
}
console.log('─'.repeat(95))

// ── Summary analytics ─────────────────────────────────────────────────────────
const talentDmgValues = allResults.map(r => r.avgTalent)
const globalMean = talentDmgValues.reduce((s, v) => s + v, 0) / talentDmgValues.length
const globalMax  = Math.max(...talentDmgValues)
const globalMin  = Math.min(...talentDmgValues)

console.log(`\n📊 Lv100 3★ 傷害概況：平均 ${FMT(globalMean)}，最高 ${FMT(globalMax)}，最低 ${FMT(globalMin)}，差距 ${FMT(globalMax - globalMin)} (${((globalMax/globalMin - 1)*100).toFixed(0)}%)`)

console.log('\n⚠️  各職業 Lv100 3★ 偏離平均超過 ±20%：')
let anyOutlier = false
for (const r of allResults) {
  const pct = (r.avgTalent - globalMean) / globalMean * 100
  if (Math.abs(pct) > 20) {
    anyOutlier = true
    const tag = pct > 0 ? '🔴過強' : '🔵過弱'
    console.log(`   ${tag}  ${r.hero.name}(${r.hero.role}): ${FMT(r.avgTalent)} (${pct > 0 ? '+' : ''}${pct.toFixed(0)}%)`)
  }
}
if (!anyOutlier) console.log('   ✅ 所有職業均在平均 ±20% 以內')

// ── Table 2: Effective DPS (damage + heal value) ──────────────────────────────
// Treats heal as 80% value (saves HP = avoids future damage, but doesn't kill)
console.log('\n💡 有效 DPS（傷害 + 治療量 × 0.8）：治療型職業實際戰鬥貢獻')
const effectiveResults = allResults.map(r => ({
  name: r.hero.name, role: r.hero.role,
  eff: r.avgTalent + r.avgHealT * 0.8,
})).sort((a, b) => b.eff - a.eff)
for (const r of effectiveResults) {
  const bar = '█'.repeat(Math.round(r.eff / 8))
  console.log(`   ${PADL(r.name, 8)} ${PAD(FMT(r.eff), 7)}  ${bar}`)
}

// ── Table 3: Talent multiplier ranking ───────────────────────────────────────
console.log('\n🚀 天賦加成倍率排名（Lv100 3★ vs 基礎）：')
const multRanking = [...allResults].sort((a, b) => b.mult - a.mult)
for (const r of multRanking) {
  const tag = r.mult >= 3.5 ? '🔴' : r.mult >= 2.5 ? '🟡' : '🟢'
  console.log(`   ${tag} ${PADL(r.hero.name, 8)} ×${r.mult.toFixed(2)}  (${FMT(r.avgBase)} → ${FMT(r.avgTalent)})`)
}

// ── Per-hero build notes ──────────────────────────────────────────────────────
console.log('\n📝 天賦路線備注（未計入模擬的額外效益）：')
for (const r of allResults) {
  if (r.build.notes) console.log(`   ${r.hero.name}：${r.build.notes}`)
}

console.log('\n⚠️  模擬覆蓋率估計：基礎公式+天賦直接加值 ≈ 60~70% 實際傷害。')
console.log('    未計：燃燒/中毒/破甲累積傷害、機率觸發技能、護盾→傷害、重骰骰值提升、特殊skill override細節。\n')
