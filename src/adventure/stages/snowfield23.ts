import type { AdventureStageDef } from '../adventureTypes'
import {
  BIRCH_HIGHLAND_COMBAT_WAVES, BLIZZARD_VALLEY_COMBAT_WAVES,
  WOLF_TRACK_JUNCTION_COMBAT_WAVES, WHITE_FANG_BOSS_WAVES,
} from '../encounters/snowfield23Encounters'
import { SNOWFIELD_23_DIALOGUES } from '../dialogues/snowfield23Dialogues'

/**
 * 雪原 2-3「白樺獵場」（campaign stageId: snowfield_2_3）。第六個 Room
 * Transition Adventure 關卡，也是先前因為交付美術跟 room_cut_spec.json
 * 房間拓撲兜不起來而擱置的那一關——2026-08-21 使用者重新出圖後（8 張改成
 * 官方命名 room_01/02/03a/03b/04/05/06，內容確認跟 room_cut_spec.json
 * 一致）補上實作，結構化資料沿用官方 V5.1 設計配置包，跟先前 2-4/2-5 同一
 * 套流程。
 *
 * 雙路線／高地與低谷拓樸：room_02 分岔成 room_03a（白樺高地）／room_03b
 * （風雪低谷，snow_gust 危害）兩條路線，在 room_04（狼跡匯口）會合。
 * room_04 西側同時通往 room_03a／room_03b，用 EAST_UPPER/EAST_LOWER→改成
 * WEST_UPPER/WEST_LOWER 分帶處理（跟 2-2 room_04/room_06 同一招）。
 *
 * 新機制：snow_gust（MovementSystem.ts，逆風減速＋陣風干擾計數，見
 * adventureTypes.ts HazardKind 註解）。Boss room_05 白牙獵場沿用 2-1
 * 霜狼伏擊同一種「精英 frost_wolf + 雜兵」組合，自動有 leap 技能（本關
 * 星星條件沒有用到 avoid_skill，純粹是額外的戰鬤變化)。
 */

const EAST = { x: 920, y: 760, width: 160, height: 400 }
const WEST = { x: 0, y: 760, width: 160, height: 400 }
const NORTH = { x: 390, y: 0, width: 300, height: 160 }
const SOUTH = { x: 390, y: 1760, width: 300, height: 160 }
const WEST_UPPER = { x: 0, y: 260, width: 160, height: 360 }
const WEST_LOWER = { x: 0, y: 1300, width: 160, height: 360 }

const WALKABLE = { x: 60, y: 60, width: 960, height: 1800 }
const SPAWN = { x: 540, y: 1640 }

export const SNOWFIELD_23_STAGE: AdventureStageDef = {
  stageId: 'snowfield_2_3',
  world: { width: 6480, height: 5760 },
  // 2026-08-21 修正：世界座標 = room_01.atlasOrigin(0,1920) + spawnLocal(540,1640)。
  // 原本誤寫成 room_01 的 local 座標，玩家一進場就落在房間 y 範圍外，被
  // roomMask 裁掉整個看不到（「英雄沒有出現」的真正原因，不是碰撞或地圖
  // 替換問題）。
  spawn: { x: 540, y: 3560 },
  groundColor: 0x1c2a3a,

  colliders: [],

  rooms: [
    {
      id: 'room_01', name: '白樺入口',
      atlasOrigin: { x: 0, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_3/rooms/room01.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '01_to_02', zone: EAST, targetRoomId: 'room_02', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_02', name: '獵跡岔口',
      atlasOrigin: { x: 1080, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_3/rooms/room02.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '02_to_01', zone: WEST, targetRoomId: 'room_01', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '02_to_03a', zone: NORTH, targetRoomId: 'room_03a', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '02_to_03b', zone: SOUTH, targetRoomId: 'room_03b', targetSpawnLocal: { x: 540, y: 280 } },
      ],
    },
    {
      id: 'room_03a', name: '白樺高地',
      atlasOrigin: { x: 2160, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_3/rooms/room03a.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '03a_to_02', zone: SOUTH, targetRoomId: 'room_02', targetSpawnLocal: { x: 540, y: 280 } },
        { id: '03a_to_04', zone: EAST, targetRoomId: 'room_04', targetSpawnLocal: { x: 240, y: 440 } },
      ],
    },
    {
      id: 'room_03b', name: '風雪低谷',
      atlasOrigin: { x: 2160, y: 3840 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_3/rooms/room03b.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '03b_to_02', zone: NORTH, targetRoomId: 'room_02', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '03b_to_04', zone: EAST, targetRoomId: 'room_04', targetSpawnLocal: { x: 240, y: 1480 } },
      ],
    },
    {
      id: 'room_04', name: '狼跡匯口',
      atlasOrigin: { x: 3240, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_3/rooms/room04.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '04_to_03a', zone: WEST_UPPER, targetRoomId: 'room_03a', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '04_to_03b', zone: WEST_LOWER, targetRoomId: 'room_03b', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '04_to_05', zone: EAST, targetRoomId: 'room_05', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_05', name: '白牙獵場',
      atlasOrigin: { x: 4320, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_3/rooms/room05.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '05_to_04', zone: WEST, targetRoomId: 'room_04', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '05_to_06', zone: EAST, targetRoomId: 'room_06', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_06', name: '符文雪坡',
      atlasOrigin: { x: 5400, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_3/rooms/room06.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '06_to_05', zone: WEST, targetRoomId: 'room_05', targetSpawnLocal: { x: 840, y: 960 } },
      ],
    },
  ],

  npcs: [],
  dialogues: SNOWFIELD_23_DIALOGUES,
  storyTriggers: [
    { id: 'snowfield_2_3_t01', roomId: 'room_01', mode: 'once' },
    { id: 'snowfield_2_3_t02', roomId: 'room_02', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_3_t03', roomId: 'room_03b', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_3_t04', roomId: 'room_04', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_3_t05', roomId: 'room_05', mode: 'once' },
    { id: 'snowfield_2_3_t06', roomId: 'room_06', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
  ],
  triggers: [],

  combatZones: [
    { id: 'birch_highland_combat', area: { x: 2380, y: 500, width: 640, height: 850 }, gateColliderIds: [], waves: BIRCH_HIGHLAND_COMBAT_WAVES, rewardGold: 36, rewardExp: 28 },
    { id: 'blizzard_valley_combat', area: { x: 2380, y: 4340, width: 640, height: 850 }, gateColliderIds: [], waves: BLIZZARD_VALLEY_COMBAT_WAVES, rewardGold: 40, rewardExp: 32 },
    { id: 'wolf_track_junction_combat', area: { x: 3460, y: 2420, width: 640, height: 850 }, gateColliderIds: [], waves: WOLF_TRACK_JUNCTION_COMBAT_WAVES, rewardGold: 44, rewardExp: 36 },
    { id: 'white_fang_boss_combat', area: { x: 4540, y: 2420, width: 640, height: 850 }, gateColliderIds: [], waves: WHITE_FANG_BOSS_WAVES, rewardGold: 95, rewardExp: 75 },
  ],

  puzzles: [],
  collectibles: [],
  secrets: [],
  quests: [],

  // room_06 北側，遠離唯一出口（西側 06_to_05），世界座標 =
  // atlasOrigin(5400,1920) + local(540,420)。
  exit: { x: 5940, y: 2340, radius: 90, roomId: 'room_06' },

  starConditions: [
    { type: 'clear', description: '擊敗白牙狼王並通關' },
    { type: 'control_count_under', value: 2, description: '被暴風干擾 ≤ 2 次' },
    { type: 'no_death', description: '不使用復活通關' },
  ],
  inStageBuild: true,

  hazards: [
    { id: 'snow_gust_lowland', roomId: 'room_03b', kind: 'snow_gust', area: { x: 120, y: 300, width: 840, height: 1300 }, params: { direction: 'west', intervalSec: 4.5, slowAgainstWind: 0.65 } },
  ],
}
