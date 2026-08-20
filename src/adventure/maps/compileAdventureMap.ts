import type {
  AdventureRect,
  AdventureStageDef,
  AdventureVec2,
  ColliderDef,
  CollectibleDef,
  CombatZoneDef,
  NpcDef,
  PuzzleDef,
  QuestDef,
  RoomDef,
  SecretDef,
  TriggerDef,
} from '../adventureTypes'
import type { AdventureMapSource, AdventureRoomSource } from './mapSourceTypes'

export interface AdventureMapValidationIssue {
  level: 'error' | 'warning'
  code: string
  message: string
}

function offsetPoint(p: AdventureVec2, origin: AdventureVec2): AdventureVec2 {
  return { x: p.x + origin.x, y: p.y + origin.y }
}

function offsetRect(r: AdventureRect, origin: AdventureVec2): AdventureRect {
  return { x: r.x + origin.x, y: r.y + origin.y, width: r.width, height: r.height }
}

function containsPoint(r: AdventureRect, p: AdventureVec2): boolean {
  return p.x >= r.x && p.y >= r.y && p.x <= r.x + r.width && p.y <= r.y + r.height
}

function rectInRoom(r: AdventureRect, room: AdventureRoomSource, roomSize: { width: number; height: number }): boolean {
  return r.x >= 0 && r.y >= 0 && r.width >= 0 && r.height >= 0 &&
    r.x + r.width <= roomSize.width && r.y + r.height <= roomSize.height
}

function pointInRoom(p: AdventureVec2, roomSize: { width: number; height: number }): boolean {
  return p.x >= 0 && p.y >= 0 && p.x <= roomSize.width && p.y <= roomSize.height
}

function pushDuplicateIssues(ids: string[], category: string, issues: AdventureMapValidationIssue[]) {
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) {
      issues.push({ level: 'error', code: 'duplicate_id', message: `${category} id 重複：${id}` })
    }
    seen.add(id)
  }
}

/**
 * Validates authoring data before it becomes runtime world coordinates.
 * This catches the mistakes that made Forest Ruins 01 hard to maintain:
 * bad room ids, local coordinates outside the room, transition targets that do
 * not exist, duplicated gameplay ids, and unreachable rooms.
 */
export function validateAdventureMapSource(source: AdventureMapSource): AdventureMapValidationIssue[] {
  const issues: AdventureMapValidationIssue[] = []
  const roomIds = source.rooms.map(r => r.id)
  const roomById = new Map(source.rooms.map(r => [r.id, r]))

  if (source.rooms.length === 0) {
    issues.push({ level: 'error', code: 'no_rooms', message: '地圖至少要有一個房間' })
    return issues
  }
  if (source.atlasColumns < 1) {
    issues.push({ level: 'error', code: 'bad_atlas_columns', message: 'atlasColumns 必須 >= 1' })
  }
  if (!roomById.has(source.startRoomId)) {
    issues.push({ level: 'error', code: 'bad_start_room', message: `起始房間不存在：${source.startRoomId}` })
  }
  pushDuplicateIssues(roomIds, 'room', issues)

  const allColliderIds: string[] = []
  const allNpcIds: string[] = []
  const allTriggerIds: string[] = []
  const allCombatIds: string[] = []
  const allCollectibleIds: string[] = []
  const allSecretIds: string[] = []
  const allQuestIds: string[] = []
  const allTransitionIds: string[] = []

  for (const room of source.rooms) {
    if (!rectInRoom(room.walkableBoundsLocal, room, source.roomSize)) {
      issues.push({ level: 'error', code: 'walkable_outside_room', message: `${room.id} walkableBoundsLocal 超出房間` })
    }
    if (!pointInRoom(room.spawnLocal, source.roomSize)) {
      issues.push({ level: 'error', code: 'spawn_outside_room', message: `${room.id} spawnLocal 超出房間` })
    }
    if (!containsPoint(room.walkableBoundsLocal, room.spawnLocal)) {
      issues.push({ level: 'warning', code: 'spawn_outside_walkable', message: `${room.id} spawnLocal 不在 walkableBoundsLocal 內` })
    }

    for (const t of room.transitions) {
      allTransitionIds.push(t.id)
      if (!rectInRoom(t.zone, room, source.roomSize)) {
        issues.push({ level: 'error', code: 'transition_outside_room', message: `${room.id}/${t.id} zone 超出房間` })
      }
      const target = roomById.get(t.targetRoomId)
      if (!target) {
        issues.push({ level: 'error', code: 'transition_missing_target', message: `${room.id}/${t.id} 目標房間不存在：${t.targetRoomId}` })
      } else if (!pointInRoom(t.targetSpawnLocal, source.roomSize)) {
        issues.push({ level: 'error', code: 'transition_spawn_outside_room', message: `${room.id}/${t.id} targetSpawnLocal 超出 ${target.id}` })
      }
    }

    for (const c of room.colliders ?? []) {
      allColliderIds.push(c.id)
      if (!rectInRoom(c.rect, room, source.roomSize)) issues.push({ level: 'error', code: 'collider_outside_room', message: `${room.id}/${c.id} collider 超出房間` })
    }
    for (const n of room.npcs ?? []) {
      allNpcIds.push(n.id)
      if (!pointInRoom(n, source.roomSize)) issues.push({ level: 'error', code: 'npc_outside_room', message: `${room.id}/${n.id} NPC 超出房間` })
    }
    for (const t of room.triggers ?? []) {
      allTriggerIds.push(t.id)
      if (!rectInRoom(t.area, room, source.roomSize)) issues.push({ level: 'error', code: 'trigger_outside_room', message: `${room.id}/${t.id} trigger 超出房間` })
    }
    for (const z of room.combatZones ?? []) {
      allCombatIds.push(z.id)
      if (!rectInRoom(z.area, room, source.roomSize)) issues.push({ level: 'error', code: 'combat_outside_room', message: `${room.id}/${z.id} combat zone 超出房間` })
    }
    for (const p of room.puzzles ?? []) {
      for (const b of p.braziers) {
        if (!pointInRoom(b, source.roomSize)) issues.push({ level: 'error', code: 'puzzle_outside_room', message: `${room.id}/${p.id}/${b.id} 火盆超出房間` })
      }
    }
    for (const c of room.collectibles ?? []) {
      allCollectibleIds.push(c.id)
      if (!pointInRoom(c, source.roomSize)) issues.push({ level: 'error', code: 'collectible_outside_room', message: `${room.id}/${c.id} 收集品超出房間` })
    }
    for (const s of room.secrets ?? []) {
      allSecretIds.push(s.id)
      if (!rectInRoom(s.area, room, source.roomSize)) issues.push({ level: 'error', code: 'secret_outside_room', message: `${room.id}/${s.id} secret 超出房間` })
    }
    for (const q of room.quests ?? []) {
      allQuestIds.push(q.id)
      if (!rectInRoom(q.killTarget.spawnArea, room, source.roomSize)) issues.push({ level: 'error', code: 'quest_spawn_outside_room', message: `${room.id}/${q.id} 任務生成區超出房間` })
    }
    if (room.exit && !pointInRoom(room.exit, source.roomSize)) {
      issues.push({ level: 'error', code: 'exit_outside_room', message: `${room.id} 關卡出口超出房間` })
    }
  }

  pushDuplicateIssues(allColliderIds, 'collider', issues)
  pushDuplicateIssues(allNpcIds, 'npc', issues)
  pushDuplicateIssues(allTriggerIds, 'trigger', issues)
  pushDuplicateIssues(allCombatIds, 'combatZone', issues)
  pushDuplicateIssues(allCollectibleIds, 'collectible', issues)
  pushDuplicateIssues(allSecretIds, 'secret', issues)
  pushDuplicateIssues(allQuestIds, 'quest', issues)
  pushDuplicateIssues(allTransitionIds, 'transition', issues)

  // Basic directed reachability. Locked transitions are still graph edges because
  // their flags are gameplay conditions, not map topology errors.
  if (roomById.has(source.startRoomId)) {
    const visited = new Set<string>()
    const queue = [source.startRoomId]
    while (queue.length > 0) {
      const id = queue.shift()!
      if (visited.has(id)) continue
      visited.add(id)
      const room = roomById.get(id)
      if (!room) continue
      for (const t of room.transitions) if (!visited.has(t.targetRoomId)) queue.push(t.targetRoomId)
    }
    for (const room of source.rooms) {
      if (!visited.has(room.id)) issues.push({ level: 'warning', code: 'unreachable_room', message: `${room.id} 從 ${source.startRoomId} 無法到達` })
    }
  }

  const exits = source.rooms.filter(r => !!r.exit)
  if (exits.length !== 1) {
    issues.push({ level: 'error', code: 'exit_count', message: `地圖必須剛好有 1 個關卡出口，目前 ${exits.length} 個` })
  }

  return issues
}

function throwOnMapErrors(source: AdventureMapSource) {
  const issues = validateAdventureMapSource(source)
  const errors = issues.filter(i => i.level === 'error')
  if (errors.length > 0) {
    throw new Error(`[AdventureMap:${source.stageId}] 編譯失敗\n${errors.map(e => `- [${e.code}] ${e.message}`).join('\n')}`)
  }
  if (typeof console !== 'undefined') {
    for (const w of issues.filter(i => i.level === 'warning')) console.warn(`[AdventureMap:${source.stageId}] ${w.message}`)
  }
}

export function compileAdventureMap(source: AdventureMapSource): AdventureStageDef {
  throwOnMapErrors(source)

  const { width: roomWidth, height: roomHeight } = source.roomSize
  const rowCount = Math.ceil(source.rooms.length / source.atlasColumns)
  const world = { width: roomWidth * source.atlasColumns, height: roomHeight * rowCount }

  const originByRoomId = new Map<string, AdventureVec2>()
  const rooms: RoomDef[] = source.rooms.map((room, index) => {
    const atlasOrigin = {
      x: (index % source.atlasColumns) * roomWidth,
      y: Math.floor(index / source.atlasColumns) * roomHeight,
    }
    originByRoomId.set(room.id, atlasOrigin)
    return {
      id: room.id,
      name: room.name,
      atlasOrigin,
      size: { ...source.roomSize },
      background: room.background,
      walkableBoundsLocal: { ...room.walkableBoundsLocal },
      spawnLocal: { ...room.spawnLocal },
      transitions: room.transitions.map(t => ({ ...t, zone: { ...t.zone }, targetSpawnLocal: { ...t.targetSpawnLocal } })),
    }
  })

  const colliders: ColliderDef[] = []
  const npcs: NpcDef[] = []
  const triggers: TriggerDef[] = []
  const combatZones: CombatZoneDef[] = []
  const puzzles: PuzzleDef[] = []
  const collectibles: CollectibleDef[] = []
  const secrets: SecretDef[] = []
  const quests: QuestDef[] = []
  let exit: AdventureStageDef['exit'] | null = null

  for (const room of source.rooms) {
    const origin = originByRoomId.get(room.id)!

    for (const c of room.colliders ?? []) colliders.push({ ...c, rect: offsetRect(c.rect, origin) })
    for (const n of room.npcs ?? []) {
      const p = offsetPoint(n, origin)
      npcs.push({ ...n, x: p.x, y: p.y })
    }
    for (const t of room.triggers ?? []) triggers.push({ ...t, area: offsetRect(t.area, origin) })
    for (const z of room.combatZones ?? []) combatZones.push({ ...z, area: offsetRect(z.area, origin) })
    for (const p of room.puzzles ?? []) {
      puzzles.push({
        ...p,
        braziers: p.braziers.map(b => {
          const pos = offsetPoint(b, origin)
          return { ...b, x: pos.x, y: pos.y }
        }),
      })
    }
    for (const c of room.collectibles ?? []) {
      const p = offsetPoint(c, origin)
      collectibles.push({ ...c, x: p.x, y: p.y })
    }
    for (const s of room.secrets ?? []) secrets.push({ ...s, area: offsetRect(s.area, origin) })
    for (const q of room.quests ?? []) {
      quests.push({
        ...q,
        killTarget: { ...q.killTarget, spawnArea: offsetRect(q.killTarget.spawnArea, origin) },
      })
    }
    if (room.exit) {
      const p = offsetPoint(room.exit, origin)
      exit = { ...room.exit, x: p.x, y: p.y }
    }
  }

  const startRoom = source.rooms.find(r => r.id === source.startRoomId)!
  const startOrigin = originByRoomId.get(source.startRoomId)!
  const spawn = offsetPoint(startRoom.spawnLocal, startOrigin)

  return {
    stageId: source.stageId,
    world,
    spawn,
    groundColor: source.groundColor,
    colliders,
    rooms,
    npcs,
    dialogues: source.dialogues,
    triggers,
    combatZones,
    puzzles,
    collectibles,
    secrets,
    quests,
    exit: exit!,
    starThresholds: { ...source.starThresholds },
  }
}
