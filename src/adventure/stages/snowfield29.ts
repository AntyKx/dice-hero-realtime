import type { AdventureStageDef } from '../adventureTypes'
import {
  FROSTVEIN_GALLERY_COMBAT_WAVES, WHITE_MIST_COMBAT_WAVES, ICEVEIN_HALL_COMBAT_WAVES,
  RITUAL_COURTYARD_COMBAT_WAVES, QUEEN_ANTECHAMBER_COMBAT_WAVES, WINTER_THRONE_BOSS_WAVES,
} from '../encounters/snowfield29Encounters'
import { SNOWFIELD_29_DIALOGUES } from '../dialogues/snowfield29Dialogues'

/**
 * 雪原 2-9「永冬祭壇」（campaign stageId: snowfield_2_9）。Snake + Hidden
 * Side Branch 拓樸：room_01→02→03→04→05→06→07→08→09 一路蜿蜒，room_02
 * 東側有一個隱藏側房 room_02a。沒有 dual-same-rect 出口衝突。
 *
 * 新機制驗證：whiteout（room_04，純視覺，HazardSystem.ts）+ frozen_zone
 * （room_08 Boss 房）。room_08 有三句開戰對話（t04~t06）+ 一句
 * boss_clear（t07，見 requiresCombatCleared），room_09 有兩句連續劇情
 * （t08/t09，同一個 area）。Boss frost_queen 沒有專屬技能（星星條件是
 * clear/no_death/control_count_under，不需要 avoid_skill）。
 */

const EAST = { x: 920, y: 760, width: 160, height: 400 }
const WEST = { x: 0, y: 760, width: 160, height: 400 }
const NORTH = { x: 390, y: 0, width: 300, height: 160 }
const SOUTH = { x: 390, y: 1760, width: 300, height: 160 }

const WALKABLE = { x: 60, y: 60, width: 960, height: 1800 }
const SPAWN = { x: 540, y: 1640 }

export const SNOWFIELD_29_STAGE: AdventureStageDef = {
  stageId: 'snowfield_2_9',
  world: { width: 2160, height: 11520 },
  spawn: { x: 540, y: 1640 },
  groundColor: 0x1c2a3a,

  colliders: [],

  rooms: [
    {
      id: 'room_01', name: '祭壇入口',
      atlasOrigin: { x: 0, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_9/rooms/room01.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '01_to_02', zone: SOUTH, targetRoomId: 'room_02', targetSpawnLocal: { x: 540, y: 280 } },
      ],
    },
    {
      id: 'room_02', name: '寒紋回廊',
      atlasOrigin: { x: 0, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_9/rooms/room02.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '02_to_01', zone: NORTH, targetRoomId: 'room_01', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '02_to_02a', zone: EAST, targetRoomId: 'room_02a', targetSpawnLocal: { x: 240, y: 960 } },
        { id: '02_to_03', zone: SOUTH, targetRoomId: 'room_03', targetSpawnLocal: { x: 540, y: 280 } },
      ],
    },
    {
      id: 'room_02a', name: '祭司密室',
      atlasOrigin: { x: 1080, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_9/rooms/room02a.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '02a_to_02', zone: WEST, targetRoomId: 'room_02', targetSpawnLocal: { x: 840, y: 960 } },
      ],
    },
    {
      id: 'room_03', name: '霜印祭台',
      atlasOrigin: { x: 0, y: 3840 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_9/rooms/room03.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '03_to_02', zone: NORTH, targetRoomId: 'room_02', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '03_to_04', zone: EAST, targetRoomId: 'room_04', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_04', name: '白霧戰區',
      atlasOrigin: { x: 1080, y: 3840 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_9/rooms/room04.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '04_to_03', zone: WEST, targetRoomId: 'room_03', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '04_to_05', zone: SOUTH, targetRoomId: 'room_05', targetSpawnLocal: { x: 540, y: 280 } },
      ],
    },
    {
      id: 'room_05', name: '冰脈長廊',
      atlasOrigin: { x: 1080, y: 5760 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_9/rooms/room05.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '05_to_04', zone: NORTH, targetRoomId: 'room_04', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '05_to_06', zone: WEST, targetRoomId: 'room_06', targetSpawnLocal: { x: 840, y: 960 } },
      ],
    },
    {
      id: 'room_06', name: '祭器中庭',
      atlasOrigin: { x: 0, y: 5760 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_9/rooms/room06.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '06_to_05', zone: EAST, targetRoomId: 'room_05', targetSpawnLocal: { x: 240, y: 960 } },
        { id: '06_to_07', zone: SOUTH, targetRoomId: 'room_07', targetSpawnLocal: { x: 540, y: 280 } },
      ],
    },
    {
      id: 'room_07', name: '女王前殿',
      atlasOrigin: { x: 0, y: 7680 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_9/rooms/room07.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '07_to_06', zone: NORTH, targetRoomId: 'room_06', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '07_to_08', zone: EAST, targetRoomId: 'room_08', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_08', name: '永冬王座前',
      atlasOrigin: { x: 1080, y: 7680 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_9/rooms/room08.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '08_to_07', zone: WEST, targetRoomId: 'room_07', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '08_to_09', zone: SOUTH, targetRoomId: 'room_09', targetSpawnLocal: { x: 540, y: 280 } },
      ],
    },
    {
      id: 'room_09', name: '崩裂冰牆',
      atlasOrigin: { x: 1080, y: 9600 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_9/rooms/room09.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '09_to_08', zone: NORTH, targetRoomId: 'room_08', targetSpawnLocal: { x: 540, y: 1640 } },
      ],
    },
  ],

  npcs: [],
  dialogues: SNOWFIELD_29_DIALOGUES,
  storyTriggers: [
    { id: 'snowfield_2_9_t01', roomId: 'room_01', mode: 'once' },
    { id: 'snowfield_2_9_t02', roomId: 'room_03', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_9_t03', roomId: 'room_04', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_9_t04', roomId: 'room_08', mode: 'once' },
    { id: 'snowfield_2_9_t05', roomId: 'room_08', mode: 'once' },
    { id: 'snowfield_2_9_t06', roomId: 'room_08', mode: 'once' },
    // boss_clear 語意：room_08 的戰鬤（winter_throne_boss_combat）清空
    // 才觸發。
    { id: 'snowfield_2_9_t07', roomId: 'room_08', mode: 'once', requiresCombatCleared: 'winter_throne_boss_combat' },
    { id: 'snowfield_2_9_t08', roomId: 'room_09', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_9_t09', roomId: 'room_09', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
  ],
  triggers: [],

  combatZones: [
    { id: 'frostvein_gallery_combat', area: { x: 220, y: 2420, width: 640, height: 850 }, gateColliderIds: [], waves: FROSTVEIN_GALLERY_COMBAT_WAVES, rewardGold: 42, rewardExp: 34 },
    { id: 'white_mist_combat', area: { x: 1300, y: 4340, width: 640, height: 850 }, gateColliderIds: [], waves: WHITE_MIST_COMBAT_WAVES, rewardGold: 46, rewardExp: 36 },
    { id: 'icevein_hall_combat', area: { x: 1300, y: 6260, width: 640, height: 850 }, gateColliderIds: [], waves: ICEVEIN_HALL_COMBAT_WAVES, rewardGold: 48, rewardExp: 38 },
    { id: 'ritual_courtyard_combat', area: { x: 220, y: 6260, width: 640, height: 850 }, gateColliderIds: [], waves: RITUAL_COURTYARD_COMBAT_WAVES, rewardGold: 48, rewardExp: 38 },
    { id: 'queen_antechamber_combat', area: { x: 220, y: 8180, width: 640, height: 850 }, gateColliderIds: [], waves: QUEEN_ANTECHAMBER_COMBAT_WAVES, rewardGold: 54, rewardExp: 42 },
    { id: 'winter_throne_boss_combat', area: { x: 1300, y: 8180, width: 640, height: 850 }, gateColliderIds: [], waves: WINTER_THRONE_BOSS_WAVES, rewardGold: 170, rewardExp: 130 },
  ],

  puzzles: [],
  collectibles: [],
  secrets: [],
  quests: [],

  // room_09 中央，遠離唯一出口（北側 09_to_08），世界座標 =
  // atlasOrigin(1080,9600) + local(540,900)。
  exit: { x: 1620, y: 10500, radius: 90, roomId: 'room_09' },

  starConditions: [
    { type: 'clear', description: '擊敗冰霜女王' },
    { type: 'no_death', description: '不使用復活通關' },
    { type: 'control_count_under', value: 2, description: 'Frozen ≤ 2 次' },
  ],
  inStageBuild: true,

  hazards: [
    { id: 'whiteout_1', roomId: 'room_04', kind: 'whiteout', area: { x: 120, y: 260, width: 840, height: 1400 }, params: { durationSec: 5, intervalSec: 10, visibilityRadius: 310 } },
    { id: 'frozen_zone_queen', roomId: 'room_08', kind: 'frozen_zone', area: { x: 250, y: 560, width: 580, height: 760 }, params: { slowMult: 0.65, freezeAfterSec: 2.0 } },
  ],
}
