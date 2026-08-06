// 11 職業傷害平衡模擬測試
// 重現 src/gameLogic.ts + src/screens/BattleScreen.tsx 內各職業的傷害公式（基礎/技能/套裝/傳奇武器/天賦）
// 跑 N 場「單刷敵人 12 回合」模擬，比較三個投資階段下各職業的平均每回合輸出。
// 用法：node scripts/balance_sim.mjs
//
// 已知簡化（會在報告中註明）：
// - 不模擬敵人反擊消耗護盾，slash/聖盾系護盾傷害用「本回合新增護盾」估算（會略低估上限）
// - 不模擬增益卡、遺物（只看天賦 + 裝備套裝 + 傳奇武器）
// - 天賦 100 級技能改寫只挑「明確倍率型」的選項；ice/song 等沒有乾淨倍率選項則略過並在報告註明

const ENEMY_DEF = 12        // 代表性中期敵人防禦
const BATTLE_TURNS = 12     // 每場戰鬥回合數
const TRIALS = 4000          // 模擬場次

const HERO_ATK = {
  slash: 28, fire: 39, holy: 18, shadow: 31, ice: 24,
  arrow: 26, hammer: 27, song: 19, beast: 24, gear: 23, fighter: 28,
}

function roll() { return Math.floor(Math.random() * 6) + 1 }
function rollFive() { return Array.from({ length: 5 }, roll) }

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

function getComboDiceIndices(dice) {
  const sorted = [...dice].sort((a, b) => a - b)
  const counts = {}
  dice.forEach(v => { counts[v] = (counts[v] ?? 0) + 1 })
  const countVals = Object.values(counts).sort((a, b) => b - a)
  const isStraight = sorted.join(',') === '1,2,3,4,5' || sorted.join(',') === '2,3,4,5,6'
  const all = dice.map((_, i) => i)
  const indicesOfValue = (val) => dice.reduce((acc, v, i) => v === val ? [...acc, i] : acc, [])
  if (countVals[0] === 5) return all
  if (countVals[0] === 4) {
    const val = Number(Object.entries(counts).find(([, c]) => c === 4)[0])
    return indicesOfValue(val)
  }
  if (countVals[0] === 3 && countVals[1] === 2) return all
  if (isStraight) return all
  if (countVals[0] === 3) {
    const val = Number(Object.entries(counts).find(([, c]) => c === 3)[0])
    return indicesOfValue(val)
  }
  if (countVals[0] === 2 && countVals[1] === 2) {
    const pairVals = Object.entries(counts).filter(([, c]) => c === 2).map(([k]) => Number(k))
    return dice.reduce((acc, v, i) => pairVals.includes(v) ? [...acc, i] : acc, [])
  }
  if (countVals[0] === 2) {
    const val = Number(Object.entries(counts).find(([, c]) => c === 2)[0])
    return indicesOfValue(val)
  }
  return []
}

// 一般職業：每次重骰保留目前湊成骰型的骰子，重骰其餘；2 次重骰取期間 rank 最高的結果
function rerollForRank(initialDice, rerolls) {
  let dice = initialDice
  let best = { dice, combo: evaluateDice(dice) }
  for (let i = 0; i < rerolls; i++) {
    const keepIdx = new Set(getComboDiceIndices(dice))
    dice = dice.map((v, idx) => keepIdx.has(idx) ? v : roll())
    const combo = evaluateDice(dice)
    if (combo.rank > best.combo.rank) best = { dice, combo }
  }
  return best
}

// 遊俠：ARROW_BASE 表「順子最強、五條最弱」，所以保留所有不重複的點數，重骰重複的，追逐順子/全不同點
const ARROW_BASE = { '順子': 55, '散骰': 45, '一對': 40, '兩對': 35, '三條': 30, '葫蘆': 28, '四條': 24, '五條': 20 }
function arrowScore(combo) { return ARROW_BASE[combo.label] ?? combo.baseDamage }
function rerollForArrow(initialDice, rerolls) {
  let dice = initialDice
  let best = { dice, combo: evaluateDice(dice) }
  for (let i = 0; i < rerolls; i++) {
    const seen = new Set()
    dice = dice.map(v => {
      if (!seen.has(v)) { seen.add(v); return v }
      return roll() // 重複點數的骰子重骰，追逐「全不同」或順子
    })
    const combo = evaluateDice(dice)
    if (arrowScore(combo) > arrowScore(best.combo)) best = { dice, combo }
  }
  return best
}

// ── gameLogic.ts computeHeroAction 原樣搬過來 ──────────────────────────────
function computeHeroAction(role, atk, combo, dice) {
  let damage = combo.baseDamage + atk
  let heal = 0, defend = 0
  let isSkill = combo.rank >= 4
  switch (role) {
    case 'slash':
      if (combo.rank >= 3) damage += 10
      if (combo.rank >= 6) defend += 6
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
      defend += combo.rank >= 4 ? 5 : 0
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
      damage += 6 + combo.rank * 2
      defend += combo.rank >= 4 ? 3 : 0
      break
    case 'gear':
      damage += combo.rank >= 2 ? 10 : 0
      if (combo.rank >= 4) damage += 6
      break
    case 'fighter':
      break // chain 加成在 BattleScreen 另算
  }
  return { damage, heal, defend, isSkill }
}

const FIGHTER_CHAINS = {
  '一對→兩對':     { type: 'defend', def: 8 },
  '兩對→三條':     { type: 'attack', dmg: 12 },
  '三條→四條以上': { type: 'attack', dmg: 20 },
  '散骰→順子':     { type: 'break',  armorBreak: 2 },
  '兩對→順子':     { type: 'heal',   healAmt: 8 },
  '三條→兩對':     { type: 'defend', def: 10 },
  '順子→順子':     { type: 'attack', dmg: 30, weaponOnly: true },
  '葫蘆→四條以上': { type: 'attack', dmg: 25, weaponOnly: true },
}
function normChainLabel(label) { return (label === '四條' || label === '五條') ? '四條以上' : label }

// ── 各職業 Lv100 天賦 DPS 路線（每節點挑最直接提升傷害的選項；mult=1.65 為 3★ 星級倍率）──
const STAR_MULT = 1.65
const LEVEL_FLAT = Math.round(99 * 0.15) // 15，全職業 Lv100 共通成長

const TALENT_DPS = {
  slash:   (rank) => Math.round(10 * STAR_MULT) + (rank >= 3 ? Math.round(12 * STAR_MULT) : 0) + Math.round(3 * STAR_MULT) * rank + Math.round(18 * STAR_MULT),
  fire:    (rank) => Math.round(12 * STAR_MULT) + Math.round(4 * STAR_MULT) * rank + Math.round(8 * STAR_MULT) + (rank >= 4 ? Math.round(25 * STAR_MULT) : 0),
  holy:    (rank) => Math.round(7 * STAR_MULT), // 治療職，天賦多投資治療量，傷害路線弱
  shadow:  (rank) => Math.round(12 * STAR_MULT) + Math.round(10 * STAR_MULT) + Math.round(4 * STAR_MULT) * rank + (rank >= 4 ? Math.round(22 * STAR_MULT) : 0),
  ice:     (rank) => Math.round(12 * STAR_MULT) + Math.round(3 * STAR_MULT) * rank + Math.round(15 * STAR_MULT) + (rank >= 4 ? Math.round(25 * STAR_MULT) : 0),
  arrow:   (rank, distinct) => Math.round(4 * STAR_MULT) * distinct, // + full_unique_bonus% 另外算
  hammer:  (rank) => (rank >= 3 ? Math.round(10 * STAR_MULT) + Math.round(12 * STAR_MULT) : 0) + Math.round(18 * STAR_MULT) + (rank >= 4 ? Math.round(24 * STAR_MULT) : 0),
  song:    (rank) => (rank >= 2 ? Math.round(12 * STAR_MULT) : 0) + Math.round(3 * STAR_MULT) * rank + Math.round(15 * STAR_MULT),
  beast:   (rank) => Math.round(3 * STAR_MULT) * rank + (rank >= 3 ? Math.round(15 * STAR_MULT) : 0) + Math.round(20 * STAR_MULT) + Math.round(4 * STAR_MULT) * rank,
  gear:    (rank) => Math.round(3 * STAR_MULT) * rank + (rank >= 2 ? Math.round(15 * STAR_MULT) : 0) + Math.round(20 * STAR_MULT) + Math.round(5 * STAR_MULT) * rank,
  fighter: (rank) => Math.round(14 * STAR_MULT) + (rank >= 3 ? Math.round(12 * STAR_MULT) : 0) + Math.round(18 * STAR_MULT) + (rank >= 4 ? Math.round(22 * STAR_MULT) : 0),
}

const SET2PC_FLAT = { slash: 0, fire: 15, holy: 0, shadow: 17, ice: 0, arrow: 16, hammer: 0, song: 0, beast: 15, gear: 17, fighter: 0 }
const ARCHER_FULL_UNIQUE_BONUS_PCT = 20 + 40 + 15 // 三個節點疊加（node40/60/80 都選 full_unique_bonus）

function simulateRole(role, tier) {
  const atk = HERO_ATK[role]
  let totalDamage = 0
  let totalTrueDamage = 0 // 略過防禦的傷害（如冰爆發）
  let totalHeal = 0

  for (let t = 0; t < TRIALS; t++) {
    // per-battle state
    let prevComboLabel = ''
    let armorBreakStacks = 0
    let frozenNextTurn = false
    let isFrozenNow = false
    let enemyBurn = 0
    let iceMark = 0
    let lastCombo = ''
    let overheatStacks = 0
    let rerollPenalty = 0
    let fistPower = 0
    let noDoubleLeft = 0
    let missedChain = 0
    let atkStack = 0
    let shadowFirstStrikeUsed = false
    let guardBonus = 0

    for (let turn = 0; turn < BATTLE_TURNS; turn++) {
      const initial = rollFive()
      const rerollsAvail = Math.max(0, 2 - rerollPenalty)
      const { dice, combo } = role === 'arrow' ? rerollForArrow(initial, rerollsAvail) : rerollForRank(initial, rerollsAvail)
      const rerollsUsed = rerollsAvail // 簡化：假設都用滿（追求最佳骰型/點數）

      const base = computeHeroAction(role, atk, combo, dice)
      let dmg = base.damage
      let heal = base.heal
      let isSkill = base.isSkill

      // arrow 覆寫：完全用 ARROW_BASE 取代 combo.baseDamage 部分
      if (role === 'arrow') {
        const standardBase = combo.baseDamage + (combo.rank >= 4 ? 14 : 0)
        dmg = dmg - standardBase + arrowScore(combo)
      }

      // ── 基礎技能補丁（BattleScreen.tsx 1078-1113）──
      if (role === 'fire' && isSkill) { /* 燃燒，不直接加傷 */ }
      if (role === 'ice') {
        if (combo.rank >= 2) iceMark += 0 // mark 由下方統一處理（含 legendary）
        if (isFrozenNow) { dmg += 20 }
        else if (combo.rank >= 4) frozenNextTurn = true
      }
      if (role === 'hammer' && combo.rank >= 3) armorBreakStacks = Math.min(10, armorBreakStacks + 3)
      if (role === 'shadow' && combo.rank >= 2) {
        const critChance = combo.rank >= 4 ? 0.5 : 0.3
        if (Math.random() < critChance) dmg += (combo.rank >= 4 ? 25 : 20)
      }

      // ── 馴獸師裸裝基礎狼召喚（無論 tier 都算，10% 機率 +6 傷，星等天賦會疊加更強版本）──
      if (role === 'beast' && Math.random() < 0.10) dmg += 6

      // ── 武鬥家連段（無論 tier 都算，因為這是基礎機制不是天賦/裝備）──
      let fighterChainDmg = 0
      if (role === 'fighter') {
        const chainKey = `${normChainLabel(prevComboLabel)}→${normChainLabel(combo.label)}`
        const chain = FIGHTER_CHAINS[chainKey]
        const weaponOK = tier === 'bis' || !chain?.weaponOnly
        if (chain && weaponOK && prevComboLabel !== '') {
          missedChain = 0
          const fpGain = tier === 'bis' ? 2 : 1
          const enterMunsou = fistPower + fpGain >= 5 && noDoubleLeft === 0
          fistPower = Math.min(fistPower + fpGain, 5)
          if (enterMunsou) noDoubleLeft = 2
          const munsouBonus = tier === 'bis' ? 50 : 0 // 霸天武聖星等被動（3★ 才有，BiS 視為已點滿）
          const munsouMult = noDoubleLeft > 0 ? (1.5 + munsouBonus / 100) : 1.0
          const hasFSet4 = tier === 'bis'
          const set4Mult = hasFSet4 ? 1.2 : 1.0
          fighterChainDmg = Math.round((chain.dmg ?? 0) * munsouMult * set4Mult)
          dmg += fighterChainDmg
          if (chain.type === 'attack' && tier === 'bis') atkStack = Math.min(atkStack + 2, 20) // 武道傳承覺醒（3★）
        } else if (prevComboLabel !== '') {
          missedChain += 1
          if (missedChain >= 2) { if (fistPower > 0) fistPower -= 1; missedChain = 0 }
        }
        if (noDoubleLeft > 0) noDoubleLeft -= 1
        prevComboLabel = combo.label
        dmg += atkStack
        // 真氣運轉 base skill（沒點 100 技改時觸發）：簡化為 attack 連段後 rank>=4 額外 +20
        if (isSkill && fighterChainDmg > 0) dmg += 20
        // 拳勢倍率（每層 +3% 總傷害）
        if (fistPower > 0) dmg = Math.round(dmg * (1 + fistPower * 0.03))
      }

      if (tier !== 'naked') {
        // talent dps path
        const distinct = new Set(dice).size
        dmg += TALENT_DPS[role](combo.rank, distinct)
        dmg += LEVEL_FLAT
        dmg += SET2PC_FLAT[role]
        if (role === 'arrow') {
          if (combo.label === '順子') dmg = Math.round(dmg * 1.3) // 2pc 順子倍率
          if (distinct === 5) dmg = Math.round(dmg * (1 + ARCHER_FULL_UNIQUE_BONUS_PCT / 100))
        }
      }

      let hammerIgnoreDef = false
      if (tier === 'tier2' || tier === 'bis') {
        // 100 級技改（明確倍率型）：只在 isSkill 時觸發。BiS 是天賦疊裝備，所以要繼承這段，不能只給 tier2。
        if (isSkill) {
          if (role === 'slash') dmg = Math.round((dmg) * 2.5 / 1) // slash_power：簡化為對含天賦後總傷乘 2.5（近似，原為對 base 傷害乘）
          if (role === 'fire') dmg = Math.round(dmg * 3)
          if (role === 'shadow') dmg = Math.round(dmg * 2)
          if (role === 'hammer') { dmg = Math.round(dmg * 2); hammerIgnoreDef = true } // hammer_crush 同時無視防禦
          if (role === 'gear') dmg = Math.round(dmg * 3)
          if (role === 'beast' && combo.rank >= 4) { dmg = Math.round(dmg * 2) }
          if (role === 'song' && combo.rank >= 2) dmg = Math.round(dmg * 1.5)
        }
      }

      let trueDmg = 0
      if (tier === 'bis') {
        // ── 傳奇武器 + 4pc（皆視為已裝備）──
        if (role === 'fire' && combo.rank >= 3) {
          const balls = combo.rank - 2
          dmg += balls * 10
          enemyBurn = Math.min(enemyBurn + balls * 2 + (isSkill ? 2 : 0), 99)
        } else if (role === 'fire' && isSkill) {
          enemyBurn = Math.min(enemyBurn + 2, 99)
        }
        if (role === 'fire') {
          const burnBonus = Math.min(enemyBurn * 2, 40)
          if (enemyBurn > 0) dmg += burnBonus
          enemyBurn = Math.max(0, enemyBurn - 1) // 每回合衰減
        }
        if (role === 'ice') {
          let gain = combo.rank >= 2 ? 1 : 0
          if (combo.rank >= 4) gain += 1 // ice_freeze_aura 額外冰痕
          if (isFrozenNow) dmg += 24
          if (gain > 0) {
            const rawNew = iceMark + gain
            const burst = rawNew >= 5
            iceMark = burst ? Math.max(0, rawNew - 3) : Math.min(rawNew, 5)
            if (burst) trueDmg += 30 // 碎冰爆發：直接扣血，無視防禦
          }
        }
        if (role === 'hammer') {
          if (armorBreakStacks > 0) dmg = Math.round(dmg * 1.25)
          if (combo.rank >= 3) armorBreakStacks = Math.min(10, armorBreakStacks + Math.min(5, 10 - armorBreakStacks))
        }
        if (role === 'holy' && combo.rank >= 2 && heal > 0) {
          heal = Math.round(heal * 1.5)
          dmg += Math.round(heal * 0.25)
        }
        if (role === 'shadow' && combo.rank >= 2 && !shadowFirstStrikeUsed) {
          dmg += Math.round(dmg * 0.45)
          shadowFirstStrikeUsed = true
        }
        if (role === 'arrow') {
          const distinct = new Set(dice).size
          dmg += distinct * 6 // arrow_double_hit
          if (combo.label === '順子') dmg = dmg * 2 // 4pc：順子追加一次免費攻擊（等同雙倍）
          else if (distinct === 5) dmg = Math.round(dmg * 1.6)
        }
        if (role === 'beast') {
          if (combo.label === lastCombo) dmg += 14
          lastCombo = combo.label
          if (combo.rank >= 2) dmg += Math.round(dmg * 0.25)
        }
        if (role === 'gear') {
          overheatStacks = Math.min(5, overheatStacks + rerollsUsed)
          const heatDmg = overheatStacks * 6
          dmg += heatDmg
          if (overheatStacks >= 5) dmg += 30
          rerollPenalty = (overheatStacks >= 5) ? 2 : (overheatStacks >= 3 ? 1 : 0)
          overheatStacks = Math.max(0, overheatStacks - 2)
        }
        if (role === 'slash') {
          // guardBonus 在實際遊戲中會被敵人攻擊消耗，這裡假設「完全不被消耗」做天花板估算
          const sixes = dice.filter(d => d === 6).length
          guardBonus += sixes * 8
          if (guardBonus > 0) dmg += Math.round(guardBonus * 0.1)
        }
        if (role === 'song') {
          // song_set4：治療量 30% 轉真傷（無視防禦）
          trueDmg += Math.round(heal * 0.3)
        }
      }

      if (role === 'ice') { isFrozenNow = frozenNextTurn; frozenNextTurn = false }

      const effDef = hammerIgnoreDef ? 0 // hammer_crush：技能觸發回合無視防禦
        : Math.max(0, ENEMY_DEF - armorBreakStacks)
      const realDmg = Math.max(0, dmg) <= 0 ? 0 : Math.max(1, dmg - effDef)

      totalDamage += realDmg
      totalTrueDamage += trueDmg
      totalHeal += heal
    }
  }

  const turns = TRIALS * BATTLE_TURNS
  return {
    avgDmgPerTurn: (totalDamage + totalTrueDamage) / turns,
    avgHealPerTurn: totalHeal / turns,
  }
}

const ROLES = ['slash', 'fire', 'holy', 'shadow', 'ice', 'arrow', 'hammer', 'song', 'beast', 'gear', 'fighter']
const ROLE_NAME = {
  slash: '聖騎士/slash', fire: '法師/fire', holy: '祭司/holy', shadow: '刺客/shadow', ice: '公主/ice',
  arrow: '遊俠/arrow', hammer: '矮人/hammer', song: '詩人/song', beast: '馴獸師/beast', gear: '技師/gear', fighter: '武鬥家/fighter',
}

console.log(`敵人防禦 = ${ENEMY_DEF}，每場 ${BATTLE_TURNS} 回合，模擬 ${TRIALS} 場\n`)
console.log('職業'.padEnd(16), 'Lv1裸裝'.padEnd(10), 'Lv100+天賦+2pc'.padEnd(16), 'BiS(天賦+傳奇+4pc)'.padEnd(18), '治療/回合')
const results = {}
for (const role of ROLES) {
  const naked = simulateRole(role, 'naked')
  const tier2 = simulateRole(role, 'tier2')
  const bis = simulateRole(role, 'bis')
  results[role] = { naked, tier2, bis }
  console.log(
    ROLE_NAME[role].padEnd(16),
    naked.avgDmgPerTurn.toFixed(1).padEnd(10),
    tier2.avgDmgPerTurn.toFixed(1).padEnd(16),
    bis.avgDmgPerTurn.toFixed(1).padEnd(18),
    naked.avgHealPerTurn > 0.5 ? naked.avgHealPerTurn.toFixed(1) + ' / ' + bis.avgHealPerTurn.toFixed(1) : '-'
  )
}

console.log('\n── 相對極差（BiS 階段，純輸出職業間）──')
const dpsRoles = ROLES.filter(r => r !== 'holy' && r !== 'song')
const bisVals = dpsRoles.map(r => results[r].bis.avgDmgPerTurn)
const max = Math.max(...bisVals), min = Math.min(...bisVals)
console.log(`最高: ${dpsRoles[bisVals.indexOf(max)]} = ${max.toFixed(1)}`)
console.log(`最低: ${dpsRoles[bisVals.indexOf(min)]} = ${min.toFixed(1)}`)
console.log(`差距: ${(max - min).toFixed(1)} (${((max / min - 1) * 100).toFixed(0)}%)`)
