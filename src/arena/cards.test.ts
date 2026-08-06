import { describe, it, expect } from 'vitest'
import { ARENA_CARDS, pickThreeCards } from './cards'

describe('pickThreeCards', () => {
  it('永遠回傳 3 張不重複的卡', () => {
    for (let roll = 1; roll <= 6; roll++) {
      const picked = pickThreeCards(roll)
      expect(picked).toHaveLength(3)
      expect(new Set(picked.map(c => c.id)).size).toBe(3)
    }
  })

  it('骰越大，抽到史詩的機率越高（統計上）', () => {
    const countEpic = (roll: number) => {
      let epics = 0
      const trials = 400
      for (let i = 0; i < trials; i++) {
        epics += pickThreeCards(roll).filter(c => c.rarity === 'epic').length
      }
      return epics
    }
    const low = countEpic(1)
    const high = countEpic(6)
    expect(high).toBeGreaterThan(low)
  })

  it('骰 1 幾乎抽不到史詩', () => {
    let epics = 0
    for (let i = 0; i < 300; i++) {
      epics += pickThreeCards(1).filter(c => c.rarity === 'epic').length
    }
    expect(epics).toBe(0)
  })

  it('卡池的每張卡 id 唯一', () => {
    const ids = ARENA_CARDS.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
