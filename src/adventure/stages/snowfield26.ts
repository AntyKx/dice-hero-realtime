import type { AdventureStageDef } from '../adventureTypes'
import {
  SW_ICE_SHORE_COMBAT_WAVES, W_ICEBREAK_COMBAT_WAVES, N_ICE_RING_COMBAT_WAVES,
  E_SNOWBANK_COMBAT_WAVES, SE_ICE_FLAT_COMBAT_WAVES, CRYSTAL_COLOSSUS_BOSS_WAVES,
} from '../encounters/snowfield26Encounters'
import { SNOWFIELD_26_DIALOGUES } from '../dialogues/snowfield26Dialogues'

/**
 * 雪原 2-6「碎冰之湖」（campaign stageId: snowfield_2_6）。Ring／湖岸環線 +
 * 湖心 Hidden 拓樸：room_01→02→03→04→05→06→07→08→（回到）room_01 形成一個
 * 環，room_05 額外有一個往湖心的隱藏側房 room_05a。room_08（Boss）之後接
 * room_09（結尾 story 房）。
 *
 * room_05 西側同時通往 room_04（環線本體）跟 room_05a（隱藏側房），用
 * WEST_UPPER/WEST_LOWER 分帶處理（跟 2-2/2-3/2-8 同一招）。新機制：
 * thin_ice（MovementSystem.ts，連續停留過久裂冰扣血）。
 */

const EAST = { x: 920, y: 760, width: 160, height: 400 }
const WEST = { x: 0, y: 760, width: 160, height: 400 }
const NORTH = { x: 390, y: 0, width: 300, height: 160 }
const SOUTH = { x: 390, y: 1760, width: 300, height: 160 }
const WEST_UPPER = { x: 0, y: 260, width: 160, height: 360 }
const WEST_LOWER = { x: 0, y: 1300, width: 160, height: 360 }

const WALKABLE = { x: 60, y: 60, width: 960, height: 1800 }
const SPAWN = { x: 540, y: 1640 }

export const SNOWFIELD_26_STAGE: AdventureStageDef = {
  stageId: 'snowfield_2_6',
  world: { width: 3240, height: 7680 },
  // 2026-08-21 修正：世界座標 = room_01.atlasOrigin(0,3840) + spawnLocal(540,1640)。
  spawn: { x: 540, y: 5480 },
  groundColor: 0x1c2a3a,

  colliders: [],

  rooms: [
    {
      id: 'room_01', name: '碎冰湖口',
      atlasOrigin: { x: 0, y: 3840 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_6/rooms/room01.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '01_to_02', zone: NORTH, targetRoomId: 'room_02', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '01_to_08', zone: EAST, targetRoomId: 'room_08', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_02', name: '西南冰岸',
      atlasOrigin: { x: 0, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_6/rooms/room02.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '02_to_01', zone: SOUTH, targetRoomId: 'room_01', targetSpawnLocal: { x: 540, y: 280 } },
        { id: '02_to_03', zone: NORTH, targetRoomId: 'room_03', targetSpawnLocal: { x: 540, y: 1640 } },
      ],
    },
    {
      id: 'room_03', name: '西岸裂冰',
      atlasOrigin: { x: 0, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_6/rooms/room03.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '03_to_02', zone: SOUTH, targetRoomId: 'room_02', targetSpawnLocal: { x: 540, y: 280 } },
        { id: '03_to_04', zone: EAST, targetRoomId: 'room_04', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_04', name: '北岸冰環',
      atlasOrigin: { x: 1080, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_6/rooms/room04.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '04_to_03', zone: WEST, targetRoomId: 'room_03', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '04_to_05', zone: EAST, targetRoomId: 'room_05', targetSpawnLocal: { x: 240, y: 440 } },
      ],
    },
    {
      id: 'room_05', name: '東岸雪堤',
      atlasOrigin: { x: 2160, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_6/rooms/room05.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '05_to_04', zone: WEST_UPPER, targetRoomId: 'room_04', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '05_to_06', zone: SOUTH, targetRoomId: 'room_06', targetSpawnLocal: { x: 540, y: 280 } },
        { id: '05_to_05a', zone: WEST_LOWER, targetRoomId: 'room_05a', targetSpawnLocal: { x: 840, y: 960 } },
      ],
    },
    {
      id: 'room_05a', name: '湖心遺跡',
      atlasOrigin: { x: 1080, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_6/rooms/room05a.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '05a_to_05', zone: EAST, targetRoomId: 'room_05', targetSpawnLocal: { x: 240, y: 1480 } },
      ],
    },
    {
      id: 'room_06', name: '東南冰灘',
      atlasOrigin: { x: 2160, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_6/rooms/room06.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '06_to_05', zone: NORTH, targetRoomId: 'room_05', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '06_to_07', zone: SOUTH, targetRoomId: 'room_07', targetSpawnLocal: { x: 540, y: 280 } },
      ],
    },
    {
      id: 'room_07', name: '湖底門影',
      atlasOrigin: { x: 2160, y: 3840 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_6/rooms/room07.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '07_to_06', zone: NORTH, targetRoomId: 'room_06', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '07_to_08', zone: WEST, targetRoomId: 'room_08', targetSpawnLocal: { x: 840, y: 960 } },
      ],
    },
    {
      id: 'room_08', name: '冰晶巨像台',
      atlasOrigin: { x: 1080, y: 3840 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_6/rooms/room08.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '08_to_07', zone: EAST, targetRoomId: 'room_07', targetSpawnLocal: { x: 240, y: 960 } },
        { id: '08_to_01', zone: WEST, targetRoomId: 'room_01', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '08_to_09', zone: SOUTH, targetRoomId: 'room_09', targetSpawnLocal: { x: 540, y: 280 } },
      ],
    },
    {
      id: 'room_09', name: '湖後裂谷',
      atlasOrigin: { x: 1080, y: 5760 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_6/rooms/room09.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '09_to_08', zone: NORTH, targetRoomId: 'room_08', targetSpawnLocal: { x: 540, y: 1640 } },
      ],
    },
  ],

  npcs: [],
  dialogues: SNOWFIELD_26_DIALOGUES,
  storyTriggers: [
    { id: 'snowfield_2_6_t01', roomId: 'room_01', mode: 'once' },
    { id: 'snowfield_2_6_t02', roomId: 'room_03', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_6_t03', roomId: 'room_05a', mode: 'once' },
    { id: 'snowfield_2_6_t04', roomId: 'room_07', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_6_t05', roomId: 'room_08', mode: 'once' },
    { id: 'snowfield_2_6_t06', roomId: 'room_09', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
  ],
  triggers: [],

  combatZones: [
    { id: 'sw_ice_shore_combat', area: { x: 220, y: 2420, width: 640, height: 850 }, gateColliderIds: [], waves: SW_ICE_SHORE_COMBAT_WAVES, rewardGold: 38, rewardExp: 30 },
    { id: 'w_icebreak_combat', area: { x: 220, y: 500, width: 640, height: 850 }, gateColliderIds: [], waves: W_ICEBREAK_COMBAT_WAVES, rewardGold: 40, rewardExp: 32 },
    { id: 'n_ice_ring_combat', area: { x: 1300, y: 500, width: 640, height: 850 }, gateColliderIds: [], waves: N_ICE_RING_COMBAT_WAVES, rewardGold: 42, rewardExp: 34 },
    { id: 'e_snowbank_combat', area: { x: 2380, y: 500, width: 640, height: 850 }, gateColliderIds: [], waves: E_SNOWBANK_COMBAT_WAVES, rewardGold: 44, rewardExp: 36 },
    { id: 'se_ice_flat_combat', area: { x: 2380, y: 2420, width: 640, height: 850 }, gateColliderIds: [], waves: SE_ICE_FLAT_COMBAT_WAVES, rewardGold: 46, rewardExp: 38 },
    { id: 'crystal_colossus_boss_combat', area: { x: 1300, y: 4340, width: 640, height: 850 }, gateColliderIds: [], waves: CRYSTAL_COLOSSUS_BOSS_WAVES, rewardGold: 150, rewardExp: 115 },
  ],

  puzzles: [],
  collectibles: [],
  secrets: [],
  quests: [],

  // room_09 中央，遠離唯一出口（北側 09_to_08），世界座標 =
  // atlasOrigin(1080,5760) + local(540,900)。
  exit: { x: 1620, y: 6660, radius: 90, roomId: 'room_09' },

  starConditions: [
    { type: 'clear', description: '擊敗冰晶巨像' },
    { type: 'avoid_hazard', value: 3, hazardId: 'thin_ice', description: '薄冰破裂傷害 ≤ 3 次' },
    { type: 'custom', targetId: 'room_05a', description: '發現湖心遺跡' },
  ],
  inStageBuild: true,

  hazards: [
    { id: 'thin_ice_west', roomId: 'room_03', kind: 'thin_ice', area: { x: 180, y: 420, width: 720, height: 980 }, params: { crackTimeSec: 2.0, breakDamagePct: 8 } },
    { id: 'thin_ice_east', roomId: 'room_06', kind: 'thin_ice', area: { x: 220, y: 500, width: 640, height: 900 }, params: { crackTimeSec: 1.8, breakDamagePct: 8 } },
  ],
}
