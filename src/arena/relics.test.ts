import { describe, it, expect } from 'vitest'
import { ARENA_RELICS, pickRelicChoices } from './relics'

describe('pickRelicChoices', () => {
  it('預設回傳 3 個不重複的遺物', () => {
    const picked = pickRelicChoices()
    expect(picked).toHaveLength(3)
    expect(new Set(picked.map(r => r.id)).size).toBe(3)
  })

  it('排除已擁有的遺物', () => {
    const owned = ['piercing_arrow', 'twin_shot']
    for (let i = 0; i < 50; i++) {
      const picked = pickRelicChoices(owned, 3)
      expect(picked.some(r => owned.includes(r.id))).toBe(false)
    }
  })

  it('可選遺物不夠 count 時，回傳剩下有的', () => {
    const owned = ARENA_RELICS.slice(0, 4).map(r => r.id)
    const picked = pickRelicChoices(owned, 3)
    expect(picked).toHaveLength(2)
  })

  it('每個遺物 id 唯一', () => {
    const ids = ARENA_RELICS.map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
