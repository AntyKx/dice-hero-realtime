import type {
  ColliderDef,
  CollectibleDef,
  CombatZoneDef,
  NpcDef,
  PuzzleDef,
  QuestDef,
  SecretDef,
  TriggerDef,
} from '../../adventureTypes'

export interface TiledProperty {
  name: string
  type?: string
  value: string | number | boolean
}

export interface TiledObject {
  id: number
  name: string
  type?: string
  x: number
  y: number
  width?: number
  height?: number
  point?: boolean
  ellipse?: boolean
  visible?: boolean
  properties?: TiledProperty[]
}

export interface TiledObjectLayer {
  id: number
  name: string
  type: 'objectgroup'
  visible?: boolean
  objects: TiledObject[]
}

export interface TiledImageLayer {
  id: number
  name: string
  type: 'imagelayer'
  image: string
  x?: number
  y?: number
  visible?: boolean
  opacity?: number
}

export interface TiledRoomMap {
  type: 'map'
  orientation: 'orthogonal'
  width: number
  height: number
  tilewidth: number
  tileheight: number
  infinite?: boolean
  layers: Array<TiledObjectLayer | TiledImageLayer | { id: number; name: string; type: string }>
}

export interface TiledTransitionGameplay {
  id: string
  targetRoomId: string
  /** Name of an Entry-layer point in the target room. */
  targetEntryId: string
  lockedByFlag?: string
}

export interface TiledPuzzleGameplay extends Omit<PuzzleDef, 'braziers'> {
  braziers: Array<Omit<PuzzleDef['braziers'][number], 'x' | 'y'>>
}

export interface TiledQuestGameplay extends Omit<QuestDef, 'killTarget'> {
  killTarget: Omit<QuestDef['killTarget'], 'spawnArea'>
}

/**
 * Semantic gameplay configuration for one Tiled room.
 * Coordinates are deliberately absent: Tiled is the only coordinate source.
 */
export interface TiledRoomGameplay {
  id: string
  name: string
  background: string
  transitions: TiledTransitionGameplay[]
  colliders?: Array<Omit<ColliderDef, 'rect'>>
  npcs?: Array<Omit<NpcDef, 'x' | 'y'>>
  triggers?: Array<Omit<TriggerDef, 'area'>>
  combatZones?: Array<Omit<CombatZoneDef, 'area'>>
  puzzles?: TiledPuzzleGameplay[]
  collectibles?: Array<Omit<CollectibleDef, 'x' | 'y'>>
  secrets?: Array<Omit<SecretDef, 'area'>>
  quests?: TiledQuestGameplay[]
  exit?: { radius: number }
}
