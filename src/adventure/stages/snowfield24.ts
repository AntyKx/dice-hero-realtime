import type { AdventureStageDef } from '../adventureTypes'
import {
  BLUE_CRYSTAL_TUNNEL_COMBAT_WAVES, ICICLE_HALL_COMBAT_WAVES, FROZEN_BONE_CORRIDOR_COMBAT_WAVES,
  SHAMAN_FORECOURT_COMBAT_WAVES, FROST_ALTAR_BOSS_WAVES,
} from '../encounters/snowfield24Encounters'
import { SNOWFIELD_24_DIALOGUES } from '../dialogues/snowfield24Dialogues'

/**
 * 雪原 2-4「冰窟低語」（campaign stageId: snowfield_2_4）。第四個 Room
 * Transition Adventure 關卡，這次一開始就有官方 V5.1 設計配置包的完整
 * `snowfield_2_4/room_cut_spec.json` 等資料可用（不用像 2-2 那樣憑文字
 * 表格手推），9 個房間、倒 U 型 + Hidden Branch（room_04a 冰晶裂穴）。
 *
 * 官方資料這次沒有 dual-same-rect 的出口衝突（每個房間往不同方位各只有
 * 一個出口），維持 walkableBoundsLocal 統一寬版（跟 2-1/2-2/2-4 一致，
 * 官方逐房數字一樣有跟南/北 zone 不重疊的問題，見 room_04 同時有 north/
 * south 兩個 zone 但官方 walkableBoundsLocal 對這兩邊都留了 100 單位縫隙）。
 * atlas 位置這次直接採用官方 overviewPosition（x*1080, y*1920），不用自己
 * 另外排序（跟 world 座標/gameplay 無關，純粹省一次手動計算的出錯機會）。
 *
 * 新機制：frozen_zone（room_03，連續停留過久定身，見 MovementSystem.ts）、
 * Boss ice_shaman 精英自我治療（AdventureCombatController.ts
 * updateSupportHeal，對應 heal_count_under 星星條件）、room_07 三句
 * 主角/薩滿交錯對話（npc_ice_shaman speaker，見
 * DialogueController.resolveSpeaker）。
 */

const EAST = { x: 920, y: 760, width: 160, height: 400 }
const WEST = { x: 0, y: 760, width: 160, height: 400 }
const NORTH = { x: 390, y: 0, width: 300, height: 160 }
const SOUTH = { x: 390, y: 1760, width: 300, height: 160 }

const WALKABLE = { x: 60, y: 60, width: 960, height: 1800 }
const SPAWN = { x: 540, y: 1640 }

export const SNOWFIELD_24_STAGE: AdventureStageDef = {
  stageId: 'snowfield_2_4',
  world: { width: 4320, height: 7680 },
  spawn: { x: 540, y: 1640 },
  groundColor: 0x1c2a3a,

  colliders: [],

  rooms: [
    {
      id: 'room_01', name: '冰窟入口',
      atlasOrigin: { x: 0, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_4/rooms/room01.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '01_to_02', zone: EAST, targetRoomId: 'room_02', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_02', name: '藍晶甬道',
      atlasOrigin: { x: 1080, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_4/rooms/room02.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '02_to_01', zone: WEST, targetRoomId: 'room_01', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '02_to_03', zone: EAST, targetRoomId: 'room_03', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_03', name: '冰柱廳',
      atlasOrigin: { x: 2160, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_4/rooms/room03.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '03_to_02', zone: WEST, targetRoomId: 'room_02', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '03_to_04', zone: SOUTH, targetRoomId: 'room_04', targetSpawnLocal: { x: 540, y: 280 } },
      ],
    },
    {
      id: 'room_04', name: '寒息中庭',
      atlasOrigin: { x: 2160, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_4/rooms/room04.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '04_to_03', zone: NORTH, targetRoomId: 'room_03', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '04_to_05', zone: SOUTH, targetRoomId: 'room_05', targetSpawnLocal: { x: 540, y: 280 } },
        { id: '04_to_04a', zone: EAST, targetRoomId: 'room_04a', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_04a', name: '冰晶裂穴',
      atlasOrigin: { x: 3240, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_4/rooms/room04a.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '04a_to_04', zone: WEST, targetRoomId: 'room_04', targetSpawnLocal: { x: 840, y: 960 } },
      ],
    },
    {
      id: 'room_05', name: '凍骨廊',
      atlasOrigin: { x: 2160, y: 3840 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_4/rooms/room05.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '05_to_04', zone: NORTH, targetRoomId: 'room_04', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '05_to_06', zone: WEST, targetRoomId: 'room_06', targetSpawnLocal: { x: 840, y: 960 } },
      ],
    },
    {
      id: 'room_06', name: '薩滿前庭',
      atlasOrigin: { x: 1080, y: 3840 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_4/rooms/room06.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '06_to_05', zone: EAST, targetRoomId: 'room_05', targetSpawnLocal: { x: 240, y: 960 } },
        { id: '06_to_07', zone: WEST, targetRoomId: 'room_07', targetSpawnLocal: { x: 840, y: 960 } },
      ],
    },
    {
      id: 'room_07', name: '冰霜祭台',
      atlasOrigin: { x: 0, y: 3840 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_4/rooms/room07.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '07_to_06', zone: EAST, targetRoomId: 'room_06', targetSpawnLocal: { x: 240, y: 960 } },
        { id: '07_to_08', zone: SOUTH, targetRoomId: 'room_08', targetSpawnLocal: { x: 540, y: 280 } },
      ],
    },
    {
      id: 'room_08', name: '回聲出口',
      atlasOrigin: { x: 0, y: 5760 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_4/rooms/room08.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '08_to_07', zone: NORTH, targetRoomId: 'room_07', targetSpawnLocal: { x: 540, y: 1640 } },
      ],
    },
  ],

  npcs: [],
  dialogues: SNOWFIELD_24_DIALOGUES,
  storyTriggers: [
    { id: 'snowfield_2_4_t01', roomId: 'room_01', mode: 'once' },
    { id: 'snowfield_2_4_t02', roomId: 'room_03', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_4_t03', roomId: 'room_04a', mode: 'once' },
    { id: 'snowfield_2_4_t04', roomId: 'room_07', mode: 'once' },
    { id: 'snowfield_2_4_t05', roomId: 'room_07', mode: 'once' },
    { id: 'snowfield_2_4_t06', roomId: 'room_07', mode: 'once' },
    { id: 'snowfield_2_4_t07', roomId: 'room_08', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
  ],
  triggers: [],

  combatZones: [
    { id: 'blue_crystal_tunnel_combat', area: { x: 1300, y: 500, width: 640, height: 850 }, gateColliderIds: [], waves: BLUE_CRYSTAL_TUNNEL_COMBAT_WAVES, rewardGold: 34, rewardExp: 26 },
    { id: 'icicle_hall_combat', area: { x: 2380, y: 500, width: 640, height: 850 }, gateColliderIds: [], waves: ICICLE_HALL_COMBAT_WAVES, rewardGold: 36, rewardExp: 28 },
    { id: 'frozen_bone_corridor_combat', area: { x: 2380, y: 4340, width: 640, height: 850 }, gateColliderIds: [], waves: FROZEN_BONE_CORRIDOR_COMBAT_WAVES, rewardGold: 40, rewardExp: 32 },
    { id: 'shaman_forecourt_combat', area: { x: 1300, y: 4340, width: 640, height: 850 }, gateColliderIds: [], waves: SHAMAN_FORECOURT_COMBAT_WAVES, rewardGold: 42, rewardExp: 34 },
    { id: 'frost_altar_boss_combat', area: { x: 220, y: 4340, width: 640, height: 850 }, gateColliderIds: [], waves: FROST_ALTAR_BOSS_WAVES, rewardGold: 90, rewardExp: 70 },
  ],

  puzzles: [],
  collectibles: [],
  secrets: [],
  quests: [],

  // room_08 中央，遠離唯一出口（北側 08_to_07），世界座標 =
  // atlasOrigin(0,5760) + local(540,900)。
  exit: { x: 540, y: 6660, radius: 90, roomId: 'room_08' },

  starConditions: [
    { type: 'clear', description: '擊敗冰霜薩滿' },
    { type: 'heal_count_under', value: 2, targetId: 'ice_shaman', description: '薩滿成功治療 ≤ 2 次' },
    { type: 'control_count_under', value: 2, description: 'Frozen ≤ 2 次' },
  ],
  inStageBuild: true,

  hazards: [
    { id: 'frozen_zone_1', roomId: 'room_03', kind: 'frozen_zone', area: { x: 240, y: 560, width: 600, height: 720 }, params: { slowMult: 0.7, freezeAfterSec: 2.2 } },
    { id: 'falling_icicle_2', roomId: 'room_05', kind: 'falling_icicle', area: { x: 160, y: 340, width: 760, height: 1220 }, params: { warningSec: 0.8, intervalSec: 3.5 } },
  ],
}
