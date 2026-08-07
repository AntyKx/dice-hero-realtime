import { describe, it, expect } from 'vitest'
import { getCampaignEnemyPool, pickEnemyType, spawnIntervalSec, maxConcurrentEnemies, BOSS_SPAWN_SEC } from './enemies'

describe('pickEnemyType', () => {
  it('minMinute 未到之前不會抽到該型別', () => {
    for (let i = 0; i < 300; i++) {
      const t = pickEnemyType(0) // elapsed=0 秒
      expect(t.minMinute).toBeLessThanOrEqual(0)
    }
  })

  it('過了 minMinute 之後有機會抽到較晚解鎖的型別', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 500; i++) {
      seen.add(pickEnemyType(200).id) // 200秒 ≈ 3.3分，全部型別都解鎖了
    }
    expect(seen.has('dark_knight')).toBe(true)
  })

  it('每個型別權重都是正數（不會有抽不到/永遠抽到的死型別）', () => {
    for (const t of getCampaignEnemyPool('main')) {
      expect(t.weight).toBeGreaterThan(0)
    }
  })
})

describe('spawnIntervalSec', () => {
  it('隨時間遞減，不會小於下限', () => {
    expect(spawnIntervalSec(0)).toBeCloseTo(2.2, 5)
    expect(spawnIntervalSec(120)).toBeLessThan(spawnIntervalSec(0))
    expect(spawnIntervalSec(240)).toBeCloseTo(0.5, 5)
    expect(spawnIntervalSec(999)).toBeCloseTo(0.5, 5) // 封頂後不再變小
  })
})

describe('maxConcurrentEnemies', () => {
  it('隨時間遞增，不會超過上限', () => {
    expect(maxConcurrentEnemies(0)).toBe(6)
    expect(maxConcurrentEnemies(300)).toBe(30)
    expect(maxConcurrentEnemies(9999)).toBe(30) // 封頂後不再變大
    expect(maxConcurrentEnemies(150)).toBeGreaterThan(maxConcurrentEnemies(0))
  })
})

describe('BOSS_SPAWN_SEC', () => {
  it('設定在 3 分鐘', () => {
    expect(BOSS_SPAWN_SEC).toBe(180)
  })
})
