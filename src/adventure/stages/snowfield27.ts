import type { AdventureStageDef } from '../adventureTypes'
import {
  HIGH_RIDGE_COMBAT_WAVES, WINDCUT_TERRACE_COMBAT_WAVES, ICEFALL_SHORTCUT_COMBAT_WAVES,
  SLIPPERY_GULLY_COMBAT_WAVES, TWIN_PATH_JUNCTION_COMBAT_WAVES, TYRANT_LAIR_BOSS_WAVES,
} from '../encounters/snowfield27Encounters'
import { SNOWFIELD_27_DIALOGUES } from '../dialogues/snowfield27Dialogues'

/**
 * 雪原 2-7「巨獸雪谷」（campaign stageId: snowfield_2_7）。長安全路／短危險路
 * 拓樸：room_02 分岔成 room_03a→room_04a（高脊長路→風切平台，安全）跟
 * room_03b→room_04b（冰落捷徑→滑冰谷底，危險，各帶 falling_icicle／
 * ice_floor），兩條路在 room_05（雙路匯口）會合，room_06 是 Boss
 * （雪谷暴君 snow_troll，帶重砸 aoe 技能），room_07 收尾。
 *
 * 沒有 dual-same-rect 出口衝突，官方資料每個房間往不同方位都只有一個出口。
 * 新機制：hits_under／custom 星星條件（見下方 starConditions 註解）、
 * combat_clear 語意的 story trigger（t04，room_05 清空戰鬤才觸發，見
 * StoryTriggerSystem.ts 的 requiresCombatCleared）。
 */

const EAST = { x: 920, y: 760, width: 160, height: 400 }
const WEST = { x: 0, y: 760, width: 160, height: 400 }
const NORTH = { x: 390, y: 0, width: 300, height: 160 }
const SOUTH = { x: 390, y: 1760, width: 300, height: 160 }

const WALKABLE = { x: 60, y: 60, width: 960, height: 1800 }
const SPAWN = { x: 540, y: 1640 }

export const SNOWFIELD_27_STAGE: AdventureStageDef = {
  stageId: 'snowfield_2_7',
  world: { width: 7560, height: 5760 },
  // 2026-08-21 修正：世界座標 = room_01.atlasOrigin(0,1920) + spawnLocal(540,1640)。
  spawn: { x: 540, y: 3560 },
  groundColor: 0x1c2a3a,

  colliders: [],

  rooms: [
    {
      id: 'room_01', name: '雪谷入口',
      atlasOrigin: { x: 0, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_7/rooms/room01.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '01_to_02', zone: EAST, targetRoomId: 'room_02', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_02', name: '巨足岔道',
      atlasOrigin: { x: 1080, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_7/rooms/room02.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '02_to_01', zone: WEST, targetRoomId: 'room_01', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '02_to_03a', zone: NORTH, targetRoomId: 'room_03a', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '02_to_03b', zone: SOUTH, targetRoomId: 'room_03b', targetSpawnLocal: { x: 540, y: 280 } },
      ],
    },
    {
      id: 'room_03a', name: '高脊長路',
      atlasOrigin: { x: 2160, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_7/rooms/room03a.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '03a_to_02', zone: SOUTH, targetRoomId: 'room_02', targetSpawnLocal: { x: 540, y: 280 } },
        { id: '03a_to_04a', zone: EAST, targetRoomId: 'room_04a', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_04a', name: '風切平台',
      atlasOrigin: { x: 3240, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_7/rooms/room04a.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '04a_to_03a', zone: WEST, targetRoomId: 'room_03a', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '04a_to_05', zone: SOUTH, targetRoomId: 'room_05', targetSpawnLocal: { x: 540, y: 280 } },
      ],
    },
    {
      id: 'room_03b', name: '冰落捷徑',
      atlasOrigin: { x: 2160, y: 3840 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_7/rooms/room03b.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '03b_to_02', zone: NORTH, targetRoomId: 'room_02', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '03b_to_04b', zone: EAST, targetRoomId: 'room_04b', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_04b', name: '滑冰谷底',
      atlasOrigin: { x: 3240, y: 3840 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_7/rooms/room04b.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '04b_to_03b', zone: WEST, targetRoomId: 'room_03b', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '04b_to_05', zone: NORTH, targetRoomId: 'room_05', targetSpawnLocal: { x: 540, y: 1640 } },
      ],
    },
    {
      id: 'room_05', name: '雙路匯口',
      atlasOrigin: { x: 4320, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_7/rooms/room05.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '05_to_04a', zone: NORTH, targetRoomId: 'room_04a', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '05_to_04b', zone: SOUTH, targetRoomId: 'room_04b', targetSpawnLocal: { x: 540, y: 280 } },
        { id: '05_to_06', zone: EAST, targetRoomId: 'room_06', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_06', name: '暴君巢地',
      atlasOrigin: { x: 5400, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_7/rooms/room06.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '06_to_05', zone: WEST, targetRoomId: 'room_05', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '06_to_07', zone: EAST, targetRoomId: 'room_07', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_07', name: '王城後門',
      atlasOrigin: { x: 6480, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_7/rooms/room07.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '07_to_06', zone: WEST, targetRoomId: 'room_06', targetSpawnLocal: { x: 840, y: 960 } },
      ],
    },
  ],

  npcs: [],
  dialogues: SNOWFIELD_27_DIALOGUES,
  storyTriggers: [
    { id: 'snowfield_2_7_t01', roomId: 'room_01', mode: 'once' },
    { id: 'snowfield_2_7_t02', roomId: 'room_02', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_7_t03', roomId: 'room_03b', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    // combat_clear 語意：room_05 的戰鬤（twin_path_junction_combat）清空
    // 才觸發，不是一進房間就播。
    { id: 'snowfield_2_7_t04', roomId: 'room_05', mode: 'once', requiresCombatCleared: 'twin_path_junction_combat' },
    { id: 'snowfield_2_7_t05', roomId: 'room_06', mode: 'once' },
    { id: 'snowfield_2_7_t06', roomId: 'room_07', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
  ],
  triggers: [],

  combatZones: [
    { id: 'high_ridge_combat', area: { x: 2380, y: 500, width: 640, height: 850 }, gateColliderIds: [], waves: HIGH_RIDGE_COMBAT_WAVES, rewardGold: 40, rewardExp: 32 },
    { id: 'windcut_terrace_combat', area: { x: 3460, y: 500, width: 640, height: 850 }, gateColliderIds: [], waves: WINDCUT_TERRACE_COMBAT_WAVES, rewardGold: 44, rewardExp: 34 },
    { id: 'icefall_shortcut_combat', area: { x: 2380, y: 4340, width: 640, height: 850 }, gateColliderIds: [], waves: ICEFALL_SHORTCUT_COMBAT_WAVES, rewardGold: 44, rewardExp: 34 },
    { id: 'slippery_gully_combat', area: { x: 3460, y: 4340, width: 640, height: 850 }, gateColliderIds: [], waves: SLIPPERY_GULLY_COMBAT_WAVES, rewardGold: 44, rewardExp: 34 },
    { id: 'twin_path_junction_combat', area: { x: 4540, y: 2420, width: 640, height: 850 }, gateColliderIds: [], waves: TWIN_PATH_JUNCTION_COMBAT_WAVES, rewardGold: 50, rewardExp: 40 },
    { id: 'tyrant_lair_boss_combat', area: { x: 5620, y: 2420, width: 640, height: 850 }, gateColliderIds: [], waves: TYRANT_LAIR_BOSS_WAVES, rewardGold: 140, rewardExp: 105 },
  ],

  puzzles: [],
  collectibles: [],
  secrets: [],
  quests: [],

  // room_07 中央，遠離唯一出口（西側 07_to_06），世界座標 =
  // atlasOrigin(6480,1920) + local(540,420)。
  exit: { x: 7020, y: 2340, radius: 90, roomId: 'room_07' },

  starConditions: [
    { type: 'clear', description: '擊敗雪谷暴君' },
    // 官方 star_conditions.json 沒給 skillId，補上 snow_troll 重砸的 skillId
    // （跟 AdventureCombatController.ts ELITE_SKILL_CONFIG 的 snow_troll 對應）。
    { type: 'hits_under', value: 2, skillId: 'snow_troll_heavy_slam', description: '被重砸技能命中 ≤ 2 次' },
    // 官方 star_conditions.json 的 custom「完成高危捷徑並通關」用走過
    // room_04b（危險路終點）當判定依據。
    { type: 'custom', targetId: 'room_04b', description: '完成高危捷徑並通關' },
  ],
  inStageBuild: true,

  hazards: [
    { id: 'icicle_shortcut', roomId: 'room_03b', kind: 'falling_icicle', area: { x: 160, y: 340, width: 760, height: 1200 }, params: { warningSec: 0.75, intervalSec: 3.0 } },
    { id: 'ice_floor_shortcut', roomId: 'room_04b', kind: 'ice_floor', area: { x: 210, y: 520, width: 660, height: 840 }, params: { slideStrength: 1.15 } },
  ],
}
