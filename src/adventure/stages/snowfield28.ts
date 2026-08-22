import type { AdventureStageDef } from '../adventureTypes'
import {
  WEST_STREET_COMBAT_WAVES, EAST_STREET_COMBAT_WAVES, BARRACKS_RUINS_COMBAT_WAVES,
  NORTH_TOWER_AVENUE_COMBAT_WAVES, ICE_BELL_TOWER_COMBAT_WAVES, FROZEN_GENERAL_BOSS_WAVES,
} from '../encounters/snowfield28Encounters'
import { SNOWFIELD_28_DIALOGUES } from '../dialogues/snowfield28Dialogues'

/**
 * 雪原 2-8「冰封王城」（campaign stageId: snowfield_2_8）。全篇最大探索型
 * Stage（12 房），Hub／Central Plaza 拓樸：room_02（中央廣場）跟 room_09
 * （王城內門）都是四向 Hub，四個方向都要能走。room_04 東側同時通往
 * room_03（往中央廣場）跟 room_09（往內門），用 EAST_UPPER/EAST_LOWER
 * 分帶處理（跟 2-2/2-3/2-6 同一招）。
 *
 * 新機制：frost_tower（HazardSystem.ts，固定點朝玩家目前位置的扇形預警，
 * 見 room_03/room_08）。Boss room_10「冰封將軍」沿用 frost_knight_captain
 * （2-5 已經有的精英，ice_charge 衝刺技能），只是換了場景敘事身份。
 */

const EAST = { x: 920, y: 760, width: 160, height: 400 }
const WEST = { x: 0, y: 760, width: 160, height: 400 }
const NORTH = { x: 390, y: 0, width: 300, height: 160 }
const SOUTH = { x: 390, y: 1760, width: 300, height: 160 }
const EAST_UPPER = { x: 920, y: 260, width: 160, height: 360 }
const EAST_LOWER = { x: 920, y: 1300, width: 160, height: 360 }

const WALKABLE = { x: 60, y: 60, width: 960, height: 1800 }
const SPAWN = { x: 540, y: 1640 }

export const SNOWFIELD_28_STAGE: AdventureStageDef = {
  stageId: 'snowfield_2_8',
  world: { width: 5400, height: 11520 },
  // 2026-08-21 修正：世界座標 = room_01.atlasOrigin(2160,9600) + spawnLocal(540,1640)。
  spawn: { x: 2700, y: 11240 },
  groundColor: 0x1c2a3a,

  colliders: [],

  rooms: [
    {
      id: 'room_01', name: '王城入口',
      atlasOrigin: { x: 2160, y: 9600 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_8/rooms/room01.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '01_to_02', zone: NORTH, targetRoomId: 'room_02', targetSpawnLocal: { x: 540, y: 1640 } },
      ],
    },
    {
      id: 'room_02', name: '中央廣場',
      atlasOrigin: { x: 2160, y: 7680 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_8/rooms/room02.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '02_to_01', zone: SOUTH, targetRoomId: 'room_01', targetSpawnLocal: { x: 540, y: 280 } },
        { id: '02_to_03', zone: WEST, targetRoomId: 'room_03', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '02_to_05', zone: EAST, targetRoomId: 'room_05', targetSpawnLocal: { x: 240, y: 960 } },
        { id: '02_to_07', zone: NORTH, targetRoomId: 'room_07', targetSpawnLocal: { x: 540, y: 1640 } },
      ],
    },
    {
      id: 'room_03', name: '西街冰廊',
      atlasOrigin: { x: 1080, y: 7680 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_8/rooms/room03.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '03_to_02', zone: EAST, targetRoomId: 'room_02', targetSpawnLocal: { x: 240, y: 960 } },
        { id: '03_to_04', zone: WEST, targetRoomId: 'room_04', targetSpawnLocal: { x: 800, y: 440 } },
      ],
    },
    {
      id: 'room_04', name: '西庭',
      atlasOrigin: { x: 0, y: 7680 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_8/rooms/room04.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '04_to_03', zone: EAST_UPPER, targetRoomId: 'room_03', targetSpawnLocal: { x: 240, y: 960 } },
        { id: '04_to_04a', zone: NORTH, targetRoomId: 'room_04a', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '04_to_09', zone: EAST_LOWER, targetRoomId: 'room_09', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_04a', name: '冰封寶庫',
      atlasOrigin: { x: 0, y: 5760 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_8/rooms/room04a.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '04a_to_04', zone: SOUTH, targetRoomId: 'room_04', targetSpawnLocal: { x: 540, y: 280 } },
      ],
    },
    {
      id: 'room_05', name: '東街殘陣',
      atlasOrigin: { x: 3240, y: 7680 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_8/rooms/room05.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '05_to_02', zone: WEST, targetRoomId: 'room_02', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '05_to_06', zone: EAST, targetRoomId: 'room_06', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_06', name: '軍營廢墟',
      atlasOrigin: { x: 4320, y: 7680 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_8/rooms/room06.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '06_to_05', zone: WEST, targetRoomId: 'room_05', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '06_to_08', zone: NORTH, targetRoomId: 'room_08', targetSpawnLocal: { x: 540, y: 1640 } },
      ],
    },
    {
      id: 'room_07', name: '北塔大道',
      atlasOrigin: { x: 2160, y: 5760 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_8/rooms/room07.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '07_to_02', zone: SOUTH, targetRoomId: 'room_02', targetSpawnLocal: { x: 540, y: 280 } },
        { id: '07_to_09', zone: NORTH, targetRoomId: 'room_09', targetSpawnLocal: { x: 540, y: 1640 } },
      ],
    },
    {
      id: 'room_08', name: '冰鐘樓',
      atlasOrigin: { x: 4320, y: 5760 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_8/rooms/room08.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '08_to_06', zone: SOUTH, targetRoomId: 'room_06', targetSpawnLocal: { x: 540, y: 280 } },
        { id: '08_to_09', zone: WEST, targetRoomId: 'room_09', targetSpawnLocal: { x: 840, y: 960 } },
      ],
    },
    {
      id: 'room_09', name: '王城內門',
      atlasOrigin: { x: 2160, y: 3840 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_8/rooms/room09.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '09_to_07', zone: SOUTH, targetRoomId: 'room_07', targetSpawnLocal: { x: 540, y: 280 } },
        { id: '09_to_08', zone: EAST, targetRoomId: 'room_08', targetSpawnLocal: { x: 240, y: 960 } },
        { id: '09_to_04', zone: WEST, targetRoomId: 'room_04', targetSpawnLocal: { x: 800, y: 1480 } },
        { id: '09_to_10', zone: NORTH, targetRoomId: 'room_10', targetSpawnLocal: { x: 540, y: 1640 } },
      ],
    },
    {
      id: 'room_10', name: '冰封將軍庭',
      atlasOrigin: { x: 2160, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_8/rooms/room10.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '10_to_09', zone: SOUTH, targetRoomId: 'room_09', targetSpawnLocal: { x: 540, y: 280 } },
        { id: '10_to_11', zone: NORTH, targetRoomId: 'room_11', targetSpawnLocal: { x: 540, y: 1640 } },
      ],
    },
    {
      id: 'room_11', name: '王宮前廊',
      atlasOrigin: { x: 2160, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_8/rooms/room11.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '11_to_10', zone: SOUTH, targetRoomId: 'room_10', targetSpawnLocal: { x: 540, y: 280 } },
      ],
    },
  ],

  npcs: [],
  dialogues: SNOWFIELD_28_DIALOGUES,
  storyTriggers: [
    { id: 'snowfield_2_8_t01', roomId: 'room_01', mode: 'once' },
    { id: 'snowfield_2_8_t02', roomId: 'room_02', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_8_t03', roomId: 'room_04a', mode: 'once' },
    { id: 'snowfield_2_8_t04', roomId: 'room_03', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_8_t05', roomId: 'room_09', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_8_t06', roomId: 'room_10', mode: 'once' },
    { id: 'snowfield_2_8_t07', roomId: 'room_10', mode: 'once' },
    { id: 'snowfield_2_8_t08', roomId: 'room_10', mode: 'once' },
    { id: 'snowfield_2_8_t09', roomId: 'room_11', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
  ],
  triggers: [],

  combatZones: [
    { id: 'west_street_combat', area: { x: 1300, y: 8180, width: 640, height: 850 }, gateColliderIds: [], waves: WEST_STREET_COMBAT_WAVES, rewardGold: 44, rewardExp: 34 },
    { id: 'east_street_combat', area: { x: 3460, y: 8180, width: 640, height: 850 }, gateColliderIds: [], waves: EAST_STREET_COMBAT_WAVES, rewardGold: 46, rewardExp: 36 },
    { id: 'barracks_ruins_combat', area: { x: 4540, y: 8180, width: 640, height: 850 }, gateColliderIds: [], waves: BARRACKS_RUINS_COMBAT_WAVES, rewardGold: 48, rewardExp: 38 },
    { id: 'north_tower_avenue_combat', area: { x: 2380, y: 6260, width: 640, height: 850 }, gateColliderIds: [], waves: NORTH_TOWER_AVENUE_COMBAT_WAVES, rewardGold: 48, rewardExp: 38 },
    { id: 'ice_bell_tower_combat', area: { x: 4540, y: 6260, width: 640, height: 850 }, gateColliderIds: [], waves: ICE_BELL_TOWER_COMBAT_WAVES, rewardGold: 50, rewardExp: 40 },
    { id: 'frozen_general_boss_combat', area: { x: 2380, y: 2420, width: 640, height: 850 }, gateColliderIds: [], waves: FROZEN_GENERAL_BOSS_WAVES, rewardGold: 160, rewardExp: 125 },
  ],

  puzzles: [],
  collectibles: [],
  secrets: [],
  quests: [],

  // room_11 中央，遠離唯一出口（南側 11_to_10），世界座標 =
  // atlasOrigin(2160,0) + local(540,420)。
  exit: { x: 2700, y: 420, radius: 90, roomId: 'room_11' },

  starConditions: [
    { type: 'clear', description: '擊敗冰封將軍' },
    { type: 'avoid_hazard', value: 4, hazardId: 'frost_tower', description: 'Frost Tower 命中 ≤ 4 次' },
    { type: 'custom', targetId: 'room_04a', description: '找到冰封寶庫' },
  ],
  inStageBuild: true,

  hazards: [
    { id: 'frost_tower_west', roomId: 'room_03', kind: 'frost_tower', area: { x: 150, y: 320, width: 780, height: 1250 }, params: { warningSec: 1.0, intervalSec: 4.0, coneDeg: 55 } },
    { id: 'frost_tower_east', roomId: 'room_08', kind: 'frost_tower', area: { x: 150, y: 320, width: 780, height: 1250 }, params: { warningSec: 1.0, intervalSec: 3.8, coneDeg: 55 } },
  ],
}
