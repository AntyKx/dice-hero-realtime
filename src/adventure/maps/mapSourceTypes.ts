import type {
  AdventureRect,
  AdventureVec2,
  ColliderDef,
  CollectibleDef,
  CombatZoneDef,
  DialogueDef,
  ExitDef,
  NpcDef,
  PuzzleDef,
  QuestDef,
  RoomTransitionDef,
  SecretDef,
  TriggerDef,
} from '../adventureTypes'

/**
 * Authoring-time map data.
 *
 * The runtime AdventureStageDef still uses atlas/world coordinates for backward
 * compatibility with the existing AdventureGame systems. Map authors should no
 * longer write atlas/world coordinates by hand. Every gameplay object lives in
 * a room and is authored in that room's local 0..width / 0..height coordinate
 * space. compileAdventureMap() is the only place allowed to translate local
 * coordinates into runtime world coordinates.
 */

export type LocalColliderDef = Omit<ColliderDef, 'rect'> & { rect: AdventureRect }
export type LocalNpcDef = Omit<NpcDef, 'x' | 'y'> & AdventureVec2
export type LocalTriggerDef = Omit<TriggerDef, 'area'> & { area: AdventureRect }
export type LocalCombatZoneDef = Omit<CombatZoneDef, 'area'> & { area: AdventureRect }
export type LocalPuzzleDef = PuzzleDef
export type LocalCollectibleDef = CollectibleDef
export type LocalSecretDef = Omit<SecretDef, 'area'> & { area: AdventureRect }
export type LocalQuestDef = Omit<QuestDef, 'killTarget'> & {
  killTarget: Omit<QuestDef['killTarget'], 'spawnArea'> & { spawnArea: AdventureRect }
}
export type LocalExitDef = ExitDef

export interface AdventureRoomSource {
  id: string
  name: string
  background: string
  walkableBoundsLocal: AdventureRect
  spawnLocal: AdventureVec2
  transitions: RoomTransitionDef[]

  colliders?: LocalColliderDef[]
  npcs?: LocalNpcDef[]
  triggers?: LocalTriggerDef[]
  combatZones?: LocalCombatZoneDef[]
  puzzles?: LocalPuzzleDef[]
  collectibles?: LocalCollectibleDef[]
  secrets?: LocalSecretDef[]
  quests?: LocalQuestDef[]
  exit?: LocalExitDef
}

export interface AdventureMapSource {
  stageId: string
  groundColor: number

  /** All rooms use one fixed canvas size. This is intentional for mobile maps. */
  roomSize: { width: number; height: number }

  /**
   * Runtime keeps rooms in an off-screen atlas for compatibility. Authors only
   * choose the number of columns; room origins and world size are generated.
   */
  atlasColumns: number
  startRoomId: string

  rooms: AdventureRoomSource[]
  dialogues: DialogueDef[]
  starThresholds: { purpleCoinCount: number; starPieceCount: number }
}
