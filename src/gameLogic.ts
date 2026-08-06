import type { BuffCard } from './types'
import type { Hero } from './data'

export type ComboResult = {
  label: string
  rank: number
  baseDamage: number
  heal: number
}

export function rollFive(): number[] {
  return Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1)
}

export function rerollDice(current: number[], held: boolean[]): number[] {
  return current.map((v, i) => held[i] ? v : Math.floor(Math.random() * 6) + 1)
}

export function evaluateDice(dice: number[]): ComboResult {
  const sorted = [...dice].sort((a, b) => a - b)
  const counts = Object.values(
    dice.reduce<Record<number, number>>((acc, v) => { acc[v] = (acc[v] ?? 0) + 1; return acc }, {})
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

// 回傳目前湊成骰型的骰子 index（UI 用來標色框，提示玩家哪些骰子已經湊成、哪些可以重骰）
export function getComboDiceIndices(dice: number[]): number[] {
  const sorted = [...dice].sort((a, b) => a - b)
  const counts: Record<number, number> = {}
  dice.forEach(v => { counts[v] = (counts[v] ?? 0) + 1 })
  const countVals = Object.values(counts).sort((a, b) => b - a)
  const isStraight = sorted.join(',') === '1,2,3,4,5' || sorted.join(',') === '2,3,4,5,6'
  const all = dice.map((_, i) => i)
  const indicesOfValue = (val: number) => dice.reduce<number[]>((acc, v, i) => v === val ? [...acc, i] : acc, [])

  if (countVals[0] === 5) return all
  if (countVals[0] === 4) {
    const val = Number(Object.entries(counts).find(([, c]) => c === 4)![0])
    return indicesOfValue(val)
  }
  if (countVals[0] === 3 && countVals[1] === 2) return all
  if (isStraight) return all
  if (countVals[0] === 3) {
    const val = Number(Object.entries(counts).find(([, c]) => c === 3)![0])
    return indicesOfValue(val)
  }
  if (countVals[0] === 2 && countVals[1] === 2) {
    const pairVals = Object.entries(counts).filter(([, c]) => c === 2).map(([k]) => Number(k))
    return dice.reduce<number[]>((acc, v, i) => pairVals.includes(v) ? [...acc, i] : acc, [])
  }
  if (countVals[0] === 2) {
    const val = Number(Object.entries(counts).find(([, c]) => c === 2)![0])
    return indicesOfValue(val)
  }
  return []
}

export function computeHeroAction(hero: Hero, combo: ComboResult, dice: number[]) {
  let damage = combo.baseDamage + hero.atk
  let heal = 0
  let defend = 0
  let isSkill = combo.rank >= 4
  switch (hero.role) {
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
      // Chain bonuses handled in BattleScreen; base damage via hero.atk
      break
  }
  return { damage, heal, defend, isSkill }
}

export type AppliedAction = {
  damage: number
  heal: number
  defend: number
  applyBurn: number
  applyFreeze: boolean
  applyPoison: number
  applyArmorBreak: number
  applyVulnerable: boolean
  extraLog: string[]
  enemyRageMult: number  // 禁忌 ×5：敵人本回合 ATK 倍率（預設 1）
}

export function applyCardEffects(
  base: { damage: number; heal: number; defend: number },
  combo: ComboResult,
  cards: BuffCard[],
  heroHp: number,
  heroMaxHp: number,
  angerCount: number,
): AppliedAction {
  let { damage, heal, defend } = base
  let applyBurn = 0
  let applyFreeze = false
  let applyPoison = 0
  let applyArmorBreak = 0
  let applyVulnerable = false
  const extraLog: string[] = []

  // Accumulate healMult additively (e.g. ×1.55 + ×1.45 = ×2.0, not ×2.25)
  let healMultBonus = 0
  for (const card of cards) {
    if (card.effect.healMult) healMultBonus += card.effect.healMult - 1
  }
  if (healMultBonus > 0 && heal > 0) heal = Math.round(heal * (1 + healMultBonus))

  for (const card of cards) {
    const e = card.effect
    if (e.flatDamage) damage += e.flatDamage
    if (e.damagePerRank) damage += e.damagePerRank * combo.rank
    if (e.burnOnAttack) applyBurn += e.burnOnAttack
    if (e.freezeOnHighCombo && combo.rank >= e.freezeOnHighCombo) applyFreeze = true
    if (e.poisonOnAttack) applyPoison += e.poisonOnAttack
    if (e.armorBreakOnHighCombo && combo.rank >= (e.armorBreakRank ?? 3)) applyArmorBreak += e.armorBreakOnHighCombo
    if (e.vulnerableOnHighCombo && combo.rank >= e.vulnerableOnHighCombo) applyVulnerable = true
    if (e.fiveOfAKindBonus && combo.rank === 6) { damage += e.fiveOfAKindBonus; extraLog.push(`骰王降臨 +${e.fiveOfAKindBonus}!`) }
    if (e.lowHpDamageMult && heroHp < heroMaxHp * 0.3) { damage = Math.round(damage * e.lowHpDamageMult); extraLog.push('背水一戰！') }
    if (e.angerStacks) damage += Math.min(angerCount, 5) * 5
    if (e.comboDamage && combo.rank >= e.comboDamage.minRank) damage += e.comboDamage.value
    if (e.poetSoulHealToDmgPct && heal > 0) { const bonus = Math.round(heal * e.poetSoulHealToDmgPct / 100); damage += bonus; extraLog.push(`詩人之魂 +${bonus}`) }
    if (card.id === 'heavy_blow' && combo.rank >= 3) damage += 20
  }

  return { damage, heal, defend, applyBurn, applyFreeze, applyPoison, applyArmorBreak, applyVulnerable, extraLog, enemyRageMult: 1 }
}

export function getRerollBonus(cards: BuffCard[]): number {
  return cards.reduce((s, c) => s + (c.effect.rerollBonus ?? 0), 0)
}

export function getDefBonus(cards: BuffCard[]): number {
  return cards.reduce((s, c) => s + (c.effect.defBonus ?? 0), 0)
}

export function getStartShield(cards: BuffCard[]): number {
  return cards.reduce((s, c) => s + (c.effect.startShield ?? 0), 0)
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}
