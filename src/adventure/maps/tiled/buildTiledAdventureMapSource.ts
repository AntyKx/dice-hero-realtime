import type { AdventureRect, AdventureVec2 } from '../../adventureTypes'
import type { AdventureMapSource, AdventureRoomSource } from '../mapSourceTypes'
import type {
  TiledAdventureMapGameplay,
  TiledObject,
  TiledObjectLayer,
  TiledRoomGameplay,
  TiledRoomMap,
} from './tiledAdventureTypes'

function fail(roomId: string, message: string): never {
  throw new Error(`[Tiled/${roomId}] ${message}`)
}

function objectLayer(map: TiledRoomMap, roomId: string, name: string, required: boolean): TiledObjectLayer | undefined {
  const layer = map.layers.find(l => l.name === name)
  if (!layer) {
    if (required) fail(roomId, `缺少 Object Layer：${name}`)
    return undefined
  }
  if (layer.type !== 'objectgroup') fail(roomId, `${name} 必須是 Object Layer，不是 ${layer.type}`)
  return layer as TiledObjectLayer
}

function uniqueObject(layer: TiledObjectLayer | undefined, roomId: string, layerName: string, objectName: string): TiledObject {
  if (!layer) fail(roomId, `缺少 Object Layer：${layerName}`)
  const found = layer.objects.filter(o => o.name === objectName)
  if (found.length === 0) fail(roomId, `${layerName} 找不到物件：${objectName}`)
  if (found.length > 1) fail(roomId, `${layerName} 物件名稱重複：${objectName}`)
  return found[0]
}

function asRect(obj: TiledObject, roomId: string, layerName: string): AdventureRect {
  const width = obj.width ?? 0
  const height = obj.height ?? 0
  if (obj.point || width <= 0 || height <= 0) fail(roomId, `${layerName}/${obj.name} 必須是矩形物件`)
  return { x: obj.x, y: obj.y, width, height }
}

function asPoint(obj: TiledObject, roomId: string, layerName: string): AdventureVec2 {
  if (!obj.point && ((obj.width ?? 0) !== 0 || (obj.height ?? 0) !== 0)) {
    fail(roomId, `${layerName}/${obj.name} 必須是 Point 物件`)
  }
  return { x: obj.x, y: obj.y }
}

function assertLayerObjectSet(
  map: TiledRoomMap,
  roomId: string,
  layerName: string,
  expectedIds: string[],
) {
  if (expectedIds.length === 0) return
  const layer = objectLayer(map, roomId, layerName, true)!
  const expected = new Set(expectedIds)
  const actual = new Set(layer.objects.map(o => o.name))

  for (const id of expected) {
    if (!actual.has(id)) fail(roomId, `${layerName} 缺少玩法物件：${id}`)
  }
  for (const id of actual) {
    if (!expected.has(id)) fail(roomId, `${layerName} 有未綁定玩法設定的物件：${id}`)
  }
}

function validateRoomDocument(room: TiledRoomGameplay, map: TiledRoomMap, roomSize: { width: number; height: number }) {
  if (map.type !== 'map' || map.orientation !== 'orthogonal') fail(room.id, '只支援 Tiled orthogonal map')
  const pixelWidth = map.width * map.tilewidth
  const pixelHeight = map.height * map.tileheight
  if (pixelWidth !== roomSize.width || pixelHeight !== roomSize.height) {
    fail(room.id, `TMJ 尺寸 ${pixelWidth}x${pixelHeight} 必須等於 roomSize ${roomSize.width}x${roomSize.height}`)
  }

  const walkable = objectLayer(map, room.id, 'Walkable', true)!
  const walkableObjects = walkable.objects.filter(o => o.name === 'walkable')
  if (walkableObjects.length !== 1) fail(room.id, 'Walkable layer 必須剛好有一個名為 walkable 的矩形')
  asRect(walkableObjects[0], room.id, 'Walkable')

  const entry = objectLayer(map, room.id, 'Entry', true)!
  uniqueObject(entry, room.id, 'Entry', 'spawn')
  asPoint(uniqueObject(entry, room.id, 'Entry', 'spawn'), room.id, 'Entry')

  assertLayerObjectSet(map, room.id, 'Transition', room.transitions.map(t => t.id))
  assertLayerObjectSet(map, room.id, 'Collision', (room.colliders ?? []).map(v => v.id))
  assertLayerObjectSet(map, room.id, 'NPC', (room.npcs ?? []).map(v => v.id))
  assertLayerObjectSet(map, room.id, 'Trigger', (room.triggers ?? []).map(v => v.id))
  assertLayerObjectSet(map, room.id, 'Combat', (room.combatZones ?? []).map(v => v.id))
  assertLayerObjectSet(map, room.id, 'Puzzle', (room.puzzles ?? []).flatMap(p => p.braziers.map(b => b.id)))
  assertLayerObjectSet(map, room.id, 'Collectible', (room.collectibles ?? []).map(v => v.id))
  assertLayerObjectSet(map, room.id, 'Secret', (room.secrets ?? []).map(v => v.id))
  assertLayerObjectSet(map, room.id, 'Quest', (room.quests ?? []).map(v => v.id))
  assertLayerObjectSet(map, room.id, 'Exit', room.exit ? ['stage_exit'] : [])
}

function buildRoom(
  room: TiledRoomGameplay,
  map: TiledRoomMap,
  roomMaps: Record<string, TiledRoomMap>,
  gameplayByRoomId: Map<string, TiledRoomGameplay>,
): AdventureRoomSource {
  const walkableLayer = objectLayer(map, room.id, 'Walkable', true)!
  const entryLayer = objectLayer(map, room.id, 'Entry', true)!
  const transitionLayer = objectLayer(map, room.id, 'Transition', room.transitions.length > 0)
  const collisionLayer = objectLayer(map, room.id, 'Collision', (room.colliders?.length ?? 0) > 0)
  const npcLayer = objectLayer(map, room.id, 'NPC', (room.npcs?.length ?? 0) > 0)
  const triggerLayer = objectLayer(map, room.id, 'Trigger', (room.triggers?.length ?? 0) > 0)
  const combatLayer = objectLayer(map, room.id, 'Combat', (room.combatZones?.length ?? 0) > 0)
  const puzzleLayer = objectLayer(map, room.id, 'Puzzle', (room.puzzles?.length ?? 0) > 0)
  const collectibleLayer = objectLayer(map, room.id, 'Collectible', (room.collectibles?.length ?? 0) > 0)
  const secretLayer = objectLayer(map, room.id, 'Secret', (room.secrets?.length ?? 0) > 0)
  const questLayer = objectLayer(map, room.id, 'Quest', (room.quests?.length ?? 0) > 0)
  const exitLayer = objectLayer(map, room.id, 'Exit', !!room.exit)

  const transitions = room.transitions.map(t => {
    const targetGameplay = gameplayByRoomId.get(t.targetRoomId)
    const targetMap = roomMaps[t.targetRoomId]
    if (!targetGameplay || !targetMap) fail(room.id, `${t.id} 目標房間不存在：${t.targetRoomId}`)
    const targetEntryLayer = objectLayer(targetMap, t.targetRoomId, 'Entry', true)!
    const targetEntry = uniqueObject(targetEntryLayer, t.targetRoomId, 'Entry', t.targetEntryId)
    return {
      id: t.id,
      zone: asRect(uniqueObject(transitionLayer, room.id, 'Transition', t.id), room.id, 'Transition'),
      targetRoomId: t.targetRoomId,
      targetSpawnLocal: asPoint(targetEntry, t.targetRoomId, 'Entry'),
      lockedByFlag: t.lockedByFlag,
    }
  })

  return {
    id: room.id,
    name: room.name,
    background: room.background,
    walkableBoundsLocal: asRect(uniqueObject(walkableLayer, room.id, 'Walkable', 'walkable'), room.id, 'Walkable'),
    spawnLocal: asPoint(uniqueObject(entryLayer, room.id, 'Entry', 'spawn'), room.id, 'Entry'),
    transitions,
    colliders: (room.colliders ?? []).map(c => ({
      ...c,
      rect: asRect(uniqueObject(collisionLayer, room.id, 'Collision', c.id), room.id, 'Collision'),
    })),
    npcs: (room.npcs ?? []).map(n => ({
      ...n,
      ...asPoint(uniqueObject(npcLayer, room.id, 'NPC', n.id), room.id, 'NPC'),
    })),
    triggers: (room.triggers ?? []).map(t => ({
      ...t,
      area: asRect(uniqueObject(triggerLayer, room.id, 'Trigger', t.id), room.id, 'Trigger'),
    })),
    combatZones: (room.combatZones ?? []).map(c => ({
      ...c,
      area: asRect(uniqueObject(combatLayer, room.id, 'Combat', c.id), room.id, 'Combat'),
    })),
    puzzles: (room.puzzles ?? []).map(p => ({
      ...p,
      braziers: p.braziers.map(b => ({
        ...b,
        ...asPoint(uniqueObject(puzzleLayer, room.id, 'Puzzle', b.id), room.id, 'Puzzle'),
      })),
    })),
    collectibles: (room.collectibles ?? []).map(c => ({
      ...c,
      ...asPoint(uniqueObject(collectibleLayer, room.id, 'Collectible', c.id), room.id, 'Collectible'),
    })),
    secrets: (room.secrets ?? []).map(s => ({
      ...s,
      area: asRect(uniqueObject(secretLayer, room.id, 'Secret', s.id), room.id, 'Secret'),
    })),
    quests: (room.quests ?? []).map(q => ({
      ...q,
      killTarget: {
        ...q.killTarget,
        spawnArea: asRect(uniqueObject(questLayer, room.id, 'Quest', q.id), room.id, 'Quest'),
      },
    })),
    exit: room.exit ? {
      ...asPoint(uniqueObject(exitLayer, room.id, 'Exit', 'stage_exit'), room.id, 'Exit'),
      radius: room.exit.radius,
    } : undefined,
  }
}

/**
 * Converts Tiled room documents + semantic gameplay definitions into the same
 * room-local AdventureMapSource consumed by compileAdventureMap().
 *
 * Spatial truth: Tiled.
 * Gameplay truth: TypeScript semantic config.
 */
export function buildTiledAdventureMapSource(
  gameplay: TiledAdventureMapGameplay,
  roomMaps: Record<string, TiledRoomMap>,
): AdventureMapSource {
  const gameplayByRoomId = new Map(gameplay.rooms.map(r => [r.id, r]))

  for (const room of gameplay.rooms) {
    const map = roomMaps[room.id]
    if (!map) fail(room.id, '找不到對應 TMJ 文件')
    validateRoomDocument(room, map, gameplay.roomSize)
  }

  const rooms = gameplay.rooms.map(room => buildRoom(room, roomMaps[room.id], roomMaps, gameplayByRoomId))
  return { ...gameplay, rooms }
}

export function parseTiledRoomMap(raw: string, roomId: string): TiledRoomMap {
  try {
    return JSON.parse(raw) as TiledRoomMap
  } catch (error) {
    throw new Error(`[Tiled/${roomId}] TMJ JSON 解析失敗：${error instanceof Error ? error.message : String(error)}`)
  }
}
