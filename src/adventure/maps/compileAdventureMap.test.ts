import { describe, expect, it } from 'vitest'
import { compileAdventureMap, validateAdventureMapSource } from './compileAdventureMap'
import { FOREST_RUINS_01_MAP_SOURCE } from './forestRuins01MapSource'

describe('Forest Ruins 01 map compiler', () => {
  it('keeps the current runtime atlas layout and gameplay coordinates', () => {
    const stage = compileAdventureMap(FOREST_RUINS_01_MAP_SOURCE)

    expect(stage.stageId).toBe('forest_1_1')
    expect(stage.world).toEqual({ width: 5400, height: 3840 })
    expect(stage.spawn).toEqual({ x: 540, y: 1540 })
    expect(stage.rooms).toHaveLength(10)

    expect(stage.rooms?.find(r => r.id === 'room_05')?.atlasOrigin).toEqual({ x: 4320, y: 0 })
    expect(stage.rooms?.find(r => r.id === 'room_06')?.atlasOrigin).toEqual({ x: 0, y: 1920 })
    expect(stage.rooms?.find(r => r.id === 'room_09')?.atlasOrigin).toEqual({ x: 4320, y: 1920 })

    expect(stage.npcs.find(n => n.id === 'lost_girl')).toMatchObject({ x: 2705, y: 980 })
    expect(stage.triggers.find(t => t.id === 't_altar_cutscene')?.area).toEqual({ x: 3620, y: 2440, width: 320, height: 220 })
    expect(stage.combatZones.find(z => z.id === 'bridge_combat')?.area).toEqual({ x: 4680, y: 920, width: 360, height: 180 })
    expect(stage.combatZones.find(z => z.id === 'goblin_camp_combat')?.area).toEqual({ x: 2400, y: 2480, width: 600, height: 520 })

    const puzzle = stage.puzzles.find(p => p.id === 'bridge_brazier_puzzle')
    expect(puzzle?.braziers.map(b => ({ id: b.id, x: b.x, y: b.y }))).toEqual([
      { id: 'brazier_01', x: 4600, y: 600 },
      { id: 'brazier_02', x: 4860, y: 450 },
      { id: 'brazier_03', x: 5120, y: 600 },
    ])

    expect(stage.collectibles.find(c => c.id === 'pc19')).toMatchObject({ x: 2480, y: 3180 })
    expect(stage.collectibles.find(c => c.id === 'treasure1')).toMatchObject({ x: 1870, y: 2340 })
    expect(stage.secrets.find(s => s.id === 'secret02_wall')?.area).toEqual({ x: 900, y: 2830, width: 40, height: 180 })
    expect(stage.quests.find(q => q.id === 'lost_teddy')?.killTarget.spawnArea).toEqual({ x: 3420, y: 650, width: 710, height: 400 })
    expect(stage.exit).toEqual({ x: 4860, y: 2290, radius: 90 })
  })

  it('has no structural errors in the authoring source', () => {
    const errors = validateAdventureMapSource(FOREST_RUINS_01_MAP_SOURCE).filter(i => i.level === 'error')
    expect(errors).toEqual([])
  })

  it('rejects a transition pointing to a missing room', () => {
    const bad = structuredClone(FOREST_RUINS_01_MAP_SOURCE)
    bad.rooms[0].transitions[0].targetRoomId = 'room_missing'
    const issues = validateAdventureMapSource(bad)
    expect(issues.some(i => i.code === 'transition_missing_target' && i.level === 'error')).toBe(true)
  })
})
