import { describe, it, expect } from 'vitest'
import {
  evaluateDice, computeHeroAction, applyCardEffects,
  getRerollBonus, getDefBonus, getStartShield, clamp,
} from './gameLogic'
import type { BuffCard } from './types'
import type { Hero } from './data'

// ── evaluateDice：骰型判定與 rank 階層 ──────────────────────────────────────
describe('evaluateDice', () => {
  it('五條 rank 6', () => {
    expect(evaluateDice([3, 3, 3, 3, 3])).toMatchObject({ label: '五條', rank: 6 })
  })
  it('四條 rank 5', () => {
    expect(evaluateDice([2, 2, 2, 2, 5])).toMatchObject({ label: '四條', rank: 5 })
  })
  it('葫蘆 rank 4', () => {
    expect(evaluateDice([4, 4, 4, 6, 6])).toMatchObject({ label: '葫蘆', rank: 4 })
  })
  it('順子 1-5 rank 4', () => {
    expect(evaluateDice([1, 2, 3, 4, 5])).toMatchObject({ label: '順子', rank: 4 })
  })
  it('順子 2-6 rank 4', () => {
    expect(evaluateDice([6, 5, 4, 3, 2])).toMatchObject({ label: '順子', rank: 4 })
  })
  it('三條 rank 3', () => {
    expect(evaluateDice([5, 5, 5, 1, 2])).toMatchObject({ label: '三條', rank: 3 })
  })
  it('兩對 rank 2', () => {
    expect(evaluateDice([1, 1, 2, 2, 6])).toMatchObject({ label: '兩對', rank: 2 })
  })
  it('一對 rank 1', () => {
    expect(evaluateDice([1, 1, 3, 4, 6])).toMatchObject({ label: '一對', rank: 1 })
  })
  it('散骰 rank 0', () => {
    expect(evaluateDice([1, 2, 4, 5, 6])).toMatchObject({ label: '散骰', rank: 0 })
  })
  it('1-6 非連續不算順子', () => {
    // 1,3,4,5,6 → 散骰
    expect(evaluateDice([1, 3, 4, 5, 6]).label).toBe('散骰')
  })
})

// ── computeHeroAction：職業加成 ─────────────────────────────────────────────
const heroOf = (role: Hero['role'], atk = 10): Hero =>
  ({ id: 'x', name: 'x', title: '', hp: 100, atk, def: 5, role, skill: '', desc: '', sprite: {} as Hero['sprite'] })

describe('computeHeroAction', () => {
  it('基礎傷害 = baseDamage + atk', () => {
    const combo = evaluateDice([1, 1, 3, 4, 6])  // 一對 base14
    const r = computeHeroAction(heroOf('arrow'), combo, [1, 1, 3, 4, 6])
    expect(r.damage).toBe(14 + 10)  // arrow 一對無加成
  })
  it('slash 三條以上 +10', () => {
    const combo = evaluateDice([5, 5, 5, 1, 2])  // 三條 base30
    const r = computeHeroAction(heroOf('slash'), combo, [5, 5, 5, 1, 2])
    expect(r.damage).toBe(30 + 10 + 10)
  })
  it('holy 治療隨 6 的數量提升', () => {
    const combo = evaluateDice([6, 6, 1, 2, 3])  // 一對 heal1
    const r = computeHeroAction(heroOf('holy'), combo, [6, 6, 1, 2, 3])
    // heal = combo.heal*4 + (兩顆6)*5 = 4 + 10 = 14
    expect(r.heal).toBe(14)
  })
  it('rank>=4 視為技能', () => {
    const combo = evaluateDice([1, 2, 3, 4, 5])  // 順子 rank4
    expect(computeHeroAction(heroOf('fire'), combo, [1, 2, 3, 4, 5]).isSkill).toBe(true)
  })
})

// ── applyCardEffects：增益卡疊加 ────────────────────────────────────────────
const card = (effect: BuffCard['effect'], id = 'c'): BuffCard =>
  ({ id, name: id, desc: '', rarity: 'common', effect })

const base = { damage: 100, heal: 0, defend: 0 }
const combo3 = evaluateDice([5, 5, 5, 1, 2])  // 三條 rank3

describe('applyCardEffects', () => {
  it('flatDamage 疊加', () => {
    const r = applyCardEffects(base, combo3, [card({ flatDamage: 8 }), card({ flatDamage: 8 })], 100, 100, 0)
    expect(r.damage).toBe(116)
  })
  it('comboDamage 達標才生效', () => {
    const hit = applyCardEffects(base, combo3, [card({ comboDamage: { minRank: 3, value: 20 } })], 100, 100, 0)
    expect(hit.damage).toBe(120)
    const combo1 = evaluateDice([1, 1, 3, 4, 6])  // rank1
    const miss = applyCardEffects(base, combo1, [card({ comboDamage: { minRank: 3, value: 20 } })], 100, 100, 0)
    expect(miss.damage).toBe(100)
  })
  it('lowHpDamageMult 僅低血量觸發', () => {
    const lo = applyCardEffects(base, combo3, [card({ lowHpDamageMult: 2 })], 20, 100, 0)
    expect(lo.damage).toBe(200)
    const hi = applyCardEffects(base, combo3, [card({ lowHpDamageMult: 2 })], 80, 100, 0)
    expect(hi.damage).toBe(100)
  })
  it('burn/poison 累加，freeze 依 rank', () => {
    const r = applyCardEffects(base, combo3, [
      card({ burnOnAttack: 2 }), card({ burnOnAttack: 3 }),
      card({ poisonOnAttack: 2 }),
      card({ freezeOnHighCombo: 3 }),
    ], 100, 100, 0)
    expect(r.applyBurn).toBe(5)
    expect(r.applyPoison).toBe(2)
    expect(r.applyFreeze).toBe(true)
  })
  it('healMult 只在有治療時生效', () => {
    const withHeal = applyCardEffects({ damage: 0, heal: 10, defend: 0 }, combo3, [card({ healMult: 1.8 })], 100, 100, 0)
    expect(withHeal.heal).toBe(18)
  })
  it('poet_soul 將治療轉為等量額外傷害', () => {
    const r = applyCardEffects({ damage: 50, heal: 20, defend: 0 }, combo3, [card({}, 'poet_soul')], 100, 100, 0)
    expect(r.damage).toBe(70)
  })
  it('angerStacks 每層 +5，上限 5 層', () => {
    const r = applyCardEffects(base, combo3, [card({ angerStacks: true })], 100, 100, 99)
    expect(r.damage).toBe(125)
  })
})

// ── 聚合工具 ────────────────────────────────────────────────────────────────
describe('彙總函式', () => {
  it('getRerollBonus / getDefBonus / getStartShield 加總', () => {
    const cards = [card({ rerollBonus: 1 }), card({ rerollBonus: 2 }), card({ defBonus: 4 }), card({ startShield: 8 })]
    expect(getRerollBonus(cards)).toBe(3)
    expect(getDefBonus(cards)).toBe(4)
    expect(getStartShield(cards)).toBe(8)
  })
  it('clamp 邊界', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(15, 0, 10)).toBe(10)
    expect(clamp(5, 0, 10)).toBe(5)
  })
})
