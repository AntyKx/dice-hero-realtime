import { describe, it, expect } from 'vitest'
import { sanitizeParty, replacePartySlot, getPartyHeroIds, computePartyBonus, type PartyState } from './party'

const OWNED = ['knight', 'mage', 'priest', 'rogue']

// ── sanitizeParty ────────────────────────────────────────────────────────
describe('sanitizeParty', () => {
  it('undefined 輸入退回 fallback 隊長，支援全空', () => {
    expect(sanitizeParty(undefined, OWNED, 'knight')).toEqual({
      leaderId: 'knight',
      supportIds: [null, null],
    })
  })

  it('舊存檔沒有 party 欄位（null）行為跟 undefined 一致', () => {
    expect(sanitizeParty(null, OWNED, 'knight')).toEqual({
      leaderId: 'knight',
      supportIds: [null, null],
    })
  })

  it('隊長不在 ownedHeroIds 時退回 fallback', () => {
    const r = sanitizeParty({ leaderId: 'ghost', supportIds: [null, null] }, OWNED, 'knight')
    expect(r.leaderId).toBe('knight')
  })

  it('支援跟隊長重複時該格變 null', () => {
    const r = sanitizeParty({ leaderId: 'knight', supportIds: ['knight', 'mage'] }, OWNED, 'knight')
    expect(r).toEqual({ leaderId: 'knight', supportIds: [null, 'mage'] })
  })

  it('兩個支援互相重複時只保留第一個', () => {
    const r = sanitizeParty({ leaderId: 'knight', supportIds: ['mage', 'mage'] }, OWNED, 'knight')
    expect(r).toEqual({ leaderId: 'knight', supportIds: ['mage', null] })
  })

  it('無效（不存在的）支援 heroId 變 null', () => {
    const r = sanitizeParty({ leaderId: 'knight', supportIds: ['ghost', 'mage'] }, OWNED, 'knight')
    expect(r).toEqual({ leaderId: 'knight', supportIds: [null, 'mage'] })
  })
})

// ── replacePartySlot ─────────────────────────────────────────────────────
describe('replacePartySlot', () => {
  const base: PartyState = { leaderId: 'knight', supportIds: ['mage', null] }

  it('替換隊長（slot 0）', () => {
    expect(replacePartySlot(base, 0, 'rogue').leaderId).toBe('rogue')
  })

  it('傳 null 給隊長是 no-op（不可清空）', () => {
    expect(replacePartySlot(base, 0, null)).toEqual(base)
  })

  it('替換支援格（slot 1，對應 supportIds[0]）', () => {
    expect(replacePartySlot(base, 1, 'priest').supportIds).toEqual(['priest', null])
  })

  it('清空支援格', () => {
    expect(replacePartySlot(base, 1, null).supportIds).toEqual([null, null])
  })

  it('選到已在別的 slot 的英雄會交換，不產生重複', () => {
    // base: leader=knight, support=[mage, null]；把 mage 放進隊長 slot
    const r = replacePartySlot(base, 0, 'mage')
    expect(r.leaderId).toBe('mage')
    expect(r.supportIds).toEqual(['knight', null]) // 原本的隊長 knight 換去 mage 原本的位置
    const ids = getPartyHeroIds(r)
    expect(new Set(ids).size).toBe(ids.length) // 無重複
  })

  it('兩個支援格之間交換', () => {
    const p: PartyState = { leaderId: 'knight', supportIds: ['mage', 'priest'] }
    const r = replacePartySlot(p, 2, 'mage') // 把 mage 放進 slot2（原本是 priest）
    expect(r.supportIds).toEqual(['priest', 'mage'])
  })
})

// ── getPartyHeroIds ──────────────────────────────────────────────────────
describe('getPartyHeroIds', () => {
  it('只回傳隊長跟非 null 的支援', () => {
    expect(getPartyHeroIds({ leaderId: 'knight', supportIds: ['mage', null] })).toEqual(['knight', 'mage'])
  })
  it('沒有支援時只有隊長一個', () => {
    expect(getPartyHeroIds({ leaderId: 'knight', supportIds: [null, null] })).toEqual(['knight'])
  })
})

// ── computePartyBonus ────────────────────────────────────────────────────
describe('computePartyBonus', () => {
  it('沒有支援時加成為 0', () => {
    expect(computePartyBonus({ leaderId: 'knight', supportIds: [null, null] })).toEqual({ hpBonusPct: 0, dmgBonusPct: 0 })
  })
  it('1 位支援 +4%/+4%', () => {
    expect(computePartyBonus({ leaderId: 'knight', supportIds: ['mage', null] })).toEqual({ hpBonusPct: 0.04, dmgBonusPct: 0.04 })
  })
  it('2 位支援上限 +8%/+8%', () => {
    expect(computePartyBonus({ leaderId: 'knight', supportIds: ['mage', 'priest'] })).toEqual({ hpBonusPct: 0.08, dmgBonusPct: 0.08 })
  })
})
