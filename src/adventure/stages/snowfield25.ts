import type { AdventureStageDef } from '../adventureTypes'
import {
  OUTER_CITY_SNOWPATH_COMBAT_WAVES, FROST_WALL_FORECOURT_COMBAT_WAVES,
  GATE_PLAZA_COMBAT_WAVES, FROST_KNIGHT_DUEL_BOSS_WAVES,
} from '../encounters/snowfield25Encounters'
import { SNOWFIELD_25_DIALOGUES } from '../dialogues/snowfield25Dialogues'

/**
 * 雪原 2-5「霜甲關門」（campaign stageId: snowfield_2_5）。第五個 Room
 * Transition Adventure 關卡，官方 V5.1 設計配置包的 `snowfield_2_5/
 * room_cut_spec.json` 這次每個房間往不同方位都只有一個出口，沒有
 * dual-same-rect 衝突，直接照官方 zone/destSpawn 抄。atlas 位置採用官方
 * overviewPosition，walkableBoundsLocal 維持統一寬版（同一套系統性修正，
 * 見 snowfield21.ts/snowfield22.ts 開頭註解）。
 *
 * 灰燼王國篇雪原前半章「中王戰」：Boss room_06 只有精英霜甲騎士長，沒有
 * 雜兵陪同（呼應 stage_design 的「城門攻堅型」高潮節奏）。新增 Boss 專屬
 * ice_charge 衝刺技能（跟 2-1 frost_wolf 的 leap 共用同一套
 * updateEliteChargeSkill 狀態機，見 AdventureCombatController.ts），
 * 對應 avoid_skill frost_knight_ice_charge 星星條件。room_06 額外有
 * frost_line 危害（決鬥場戰鬤同時進行）。
 */

const EAST = { x: 920, y: 760, width: 160, height: 400 }
const WEST = { x: 0, y: 760, width: 160, height: 400 }
const NORTH = { x: 390, y: 0, width: 300, height: 160 }
const SOUTH = { x: 390, y: 1760, width: 300, height: 160 }

const WALKABLE = { x: 60, y: 60, width: 960, height: 1800 }
const SPAWN = { x: 540, y: 1640 }

export const SNOWFIELD_25_STAGE: AdventureStageDef = {
  stageId: 'snowfield_2_5',
  world: { width: 7560, height: 3840 },
  // 2026-08-21 修正：世界座標 = room_01.atlasOrigin(0,1920) + spawnLocal(540,1640)。
  spawn: { x: 540, y: 3560 },
  groundColor: 0x1c2a3a,

  colliders: [],

  rooms: [
    {
      id: 'room_01', name: '冰城遠望',
      atlasOrigin: { x: 0, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_5/rooms/room01.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '01_to_02', zone: EAST, targetRoomId: 'room_02', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_02', name: '外城雪道',
      atlasOrigin: { x: 1080, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_5/rooms/room02.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '02_to_01', zone: WEST, targetRoomId: 'room_01', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '02_to_03', zone: EAST, targetRoomId: 'room_03', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_03', name: '霜壁前庭',
      atlasOrigin: { x: 2160, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_5/rooms/room03.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '03_to_02', zone: WEST, targetRoomId: 'room_02', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '03_to_03a', zone: NORTH, targetRoomId: 'room_03a', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '03_to_04', zone: EAST, targetRoomId: 'room_04', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_03a', name: '封存軍械庫',
      atlasOrigin: { x: 2160, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_5/rooms/room03a.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '03a_to_03', zone: SOUTH, targetRoomId: 'room_03', targetSpawnLocal: { x: 540, y: 280 } },
      ],
    },
    {
      id: 'room_04', name: '城門廣場',
      atlasOrigin: { x: 3240, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_5/rooms/room04.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '04_to_03', zone: WEST, targetRoomId: 'room_03', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '04_to_05', zone: EAST, targetRoomId: 'room_05', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_05', name: '內門階梯',
      atlasOrigin: { x: 4320, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_5/rooms/room05.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '05_to_04', zone: WEST, targetRoomId: 'room_04', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '05_to_06', zone: EAST, targetRoomId: 'room_06', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_06', name: '霜甲決鬥場',
      atlasOrigin: { x: 5400, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_5/rooms/room06.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '06_to_05', zone: WEST, targetRoomId: 'room_05', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '06_to_07', zone: EAST, targetRoomId: 'room_07', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_07', name: '冰封城內',
      atlasOrigin: { x: 6480, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_5/rooms/room07.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '07_to_06', zone: WEST, targetRoomId: 'room_06', targetSpawnLocal: { x: 840, y: 960 } },
      ],
    },
  ],

  npcs: [],
  dialogues: SNOWFIELD_25_DIALOGUES,
  storyTriggers: [
    { id: 'snowfield_2_5_t01', roomId: 'room_01', mode: 'once' },
    { id: 'snowfield_2_5_t02', roomId: 'room_03a', mode: 'once' },
    { id: 'snowfield_2_5_t03', roomId: 'room_05', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_5_t04', roomId: 'room_06', mode: 'once' },
    { id: 'snowfield_2_5_t05', roomId: 'room_06', mode: 'once' },
    { id: 'snowfield_2_5_t06', roomId: 'room_06', mode: 'once' },
    { id: 'snowfield_2_5_t07', roomId: 'room_07', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
  ],
  triggers: [],

  combatZones: [
    { id: 'outer_city_snowpath_combat', area: { x: 1300, y: 2420, width: 640, height: 850 }, gateColliderIds: [], waves: OUTER_CITY_SNOWPATH_COMBAT_WAVES, rewardGold: 36, rewardExp: 28 },
    { id: 'frost_wall_forecourt_combat', area: { x: 2380, y: 2420, width: 640, height: 850 }, gateColliderIds: [], waves: FROST_WALL_FORECOURT_COMBAT_WAVES, rewardGold: 38, rewardExp: 30 },
    { id: 'gate_plaza_combat', area: { x: 3460, y: 2420, width: 640, height: 850 }, gateColliderIds: [], waves: GATE_PLAZA_COMBAT_WAVES, rewardGold: 48, rewardExp: 38 },
    { id: 'frost_knight_duel_combat', area: { x: 5620, y: 2420, width: 640, height: 850 }, gateColliderIds: [], waves: FROST_KNIGHT_DUEL_BOSS_WAVES, rewardGold: 130, rewardExp: 100 },
  ],

  puzzles: [],
  collectibles: [],
  secrets: [],
  quests: [],

  // room_07 中央，遠離唯一出口（西側 07_to_06），世界座標 =
  // atlasOrigin(6480,1920) + local(540,900)。
  exit: { x: 7020, y: 2820, radius: 90, roomId: 'room_07' },

  starConditions: [
    { type: 'clear', description: '擊敗霜甲騎士長' },
    { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
    { type: 'avoid_skill', value: 0, skillId: 'frost_knight_ice_charge', description: '不被 Ice Charge 命中' },
  ],
  inStageBuild: true,

  hazards: [
    { id: 'frost_line_gate', roomId: 'room_06', kind: 'frost_line', area: { x: 160, y: 360, width: 760, height: 1160 }, params: { warningSec: 1.0, intervalSec: 4.5, laneCount: 2 } },
  ],
}
