import { describe, expect, it } from 'vitest'
import { buildTiledAdventureMapSource } from './buildTiledAdventureMapSource'
import type { TiledAdventureMapGameplay, TiledRoomMap } from './tiledAdventureTypes'

function roomMap(objects: Record<string, Array<Record<string, unknown>>>): TiledRoomMap {
  const layerNames = ['Walkable', 'Entry', 'Transition', 'Collision', 'NPC', 'Trigger', 'Combat', 'Puzzle', 'Collectible', 'Secret', 'Quest', 'Exit']
  return {
    type: 'map', orientation: 'orthogonal', width: 10, height: 10, tilewidth: 10, tileheight: 10,
    layers: layerNames.map((name, index) => ({
      id: index + 1,
      name,
      type: 'objectgroup' as const,
      objects: (objects[name] ?? []).map((o, objectIndex) => ({ id: objectIndex + 1, visible: true, ...o })) as never,
    })),
  }
}

const gameplay: TiledAdventureMapGameplay = {
  stageId: 'test_map',
  groundColor: 0,
  roomSize: { width: 100, height: 100 },
  atlasColumns: 2,
  startRoomId: 'a',
  dialogues: [],
  starThresholds: { purpleCoinCount: 0, starPieceCount: 0 },
  rooms: [
    {
      id: 'a', name: 'A', background: '/a.webp',
      transitions: [{ id: 'a_to_b', targetRoomId: 'b', targetEntryId: 'from_a' }],
    },
    { id: 'b', name: 'B', background: '/b.webp', transitions: [] },
  ],
}

function goodMaps(): Record<string, TiledRoomMap> {
  return {
    a: roomMap({
      Walkable: [{ name: 'walkable', x: 10, y: 10, width: 80, height: 80 }],
      Entry: [{ name: 'spawn', x: 20, y: 30, point: true }],
      Transition: [{ name: 'a_to_b', x: 40, y: 0, width: 20, height: 10 }],
    }),
    b: roomMap({
      Walkable: [{ name: 'walkable', x: 5, y: 5, width: 90, height: 90 }],
      Entry: [
        { name: 'spawn', x: 50, y: 80, point: true },
        { name: 'from_a', x: 70, y: 75, point: true },
      ],
    }),
  }
}

describe('Tiled adventure importer', () => {
  it('uses Tiled points/rectangles as the spatial source of truth', () => {
    const source = buildTiledAdventureMapSource(gameplay, goodMaps())
    expect(source.rooms[0].spawnLocal).toEqual({ x: 20, y: 30 })
    expect(source.rooms[0].walkableBoundsLocal).toEqual({ x: 10, y: 10, width: 80, height: 80 })
    expect(source.rooms[0].transitions[0].zone).toEqual({ x: 40, y: 0, width: 20, height: 10 })
    expect(source.rooms[0].transitions[0].targetSpawnLocal).toEqual({ x: 70, y: 75 })
  })

  it('fails fast when a required target Entry is missing', () => {
    const maps = goodMaps()
    const entryLayer = maps.b.layers.find(l => l.name === 'Entry' && l.type === 'objectgroup') as { objects: Array<{ name: string }> }
    entryLayer.objects = entryLayer.objects.filter(o => o.name !== 'from_a')
    expect(() => buildTiledAdventureMapSource(gameplay, maps)).toThrow(/from_a/)
  })
})
