import type { AdventureStageDef } from '../adventureTypes'
import {
  THRONE_OUTER_COURT_COMBAT_WAVES, CRYSTAL_GALLERY_COMBAT_WAVES, FROSTBONE_ROAD_COMBAT_WAVES,
  CORE_CONFLUENCE_COMBAT_WAVES, ICE_CORE_STAIRS_COMBAT_WAVES, ICE_DRAGON_BOSS_WAVES,
} from '../encounters/snowfield210Encounters'
import { SNOWFIELD_210_DIALOGUES } from '../dialogues/snowfield210Dialogues'

/**
 * 雪原 2-10「極寒王座」（campaign stageId: snowfield_2_10）。雪原篇最終關，
 * Split → Merge → Final Boss 拓樸：room_03 分岔成 room_04a（冰晶長廊，
 * falling_icicle）／room_04b（霜骨道路，ice_floor）兩條路，在 room_05
 * （核心匯口）會合，一路到 room_08 極寒王座（Final Boss 冰霜巨龍，帶
 * dragon_frozen_zone + dragon_icicle 雙危害＋冰息 cone 技能），room_09/
 * room_10 收尾。
 *
 * room_05 西側同時通往 room_04a／room_04b，用 WEST_UPPER/WEST_LOWER
 * 分帶處理（跟 2-2/2-3/2-6/2-8 同一招）。room_08 的兩個危害 hazards.json
 * 原始資料帶了 phase:2/phase:3 欄位（暗示照 Boss 血量分階段啟動），這裡
 * 簡化系統沒有 Boss 血量分階段機制，兩個危害從 Boss 房一開始就同時生效，
 * phase 欄位單純略過不用（跟其他關卡「用不到的 params 安全忽略」同一個
 * 慣例）。
 */

const EAST = { x: 920, y: 760, width: 160, height: 400 }
const WEST = { x: 0, y: 760, width: 160, height: 400 }
const NORTH = { x: 390, y: 0, width: 300, height: 160 }
const SOUTH = { x: 390, y: 1760, width: 300, height: 160 }
const WEST_UPPER = { x: 0, y: 260, width: 160, height: 360 }
const WEST_LOWER = { x: 0, y: 1300, width: 160, height: 360 }

const WALKABLE = { x: 60, y: 60, width: 960, height: 1800 }
const SPAWN = { x: 540, y: 1640 }

export const SNOWFIELD_210_STAGE: AdventureStageDef = {
  stageId: 'snowfield_2_10',
  world: { width: 10800, height: 5760 },
  // 2026-08-21 修正：世界座標 = room_01.atlasOrigin(0,1920) + spawnLocal(540,1640)。
  spawn: { x: 540, y: 3560 },
  groundColor: 0x1c2a3a,

  colliders: [],

  rooms: [
    {
      id: 'room_01', name: '永冬門扉',
      atlasOrigin: { x: 0, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_10/rooms/room01.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '01_to_02', zone: EAST, targetRoomId: 'room_02', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_02', name: '王座外庭',
      atlasOrigin: { x: 1080, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_10/rooms/room02.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '02_to_01', zone: WEST, targetRoomId: 'room_01', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '02_to_03', zone: EAST, targetRoomId: 'room_03', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_03', name: '最後岔口',
      atlasOrigin: { x: 2160, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_10/rooms/room03.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '03_to_02', zone: WEST, targetRoomId: 'room_02', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '03_to_04a', zone: NORTH, targetRoomId: 'room_04a', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '03_to_04b', zone: SOUTH, targetRoomId: 'room_04b', targetSpawnLocal: { x: 540, y: 280 } },
      ],
    },
    {
      id: 'room_04a', name: '冰晶長廊',
      atlasOrigin: { x: 3240, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_10/rooms/room04a.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '04a_to_03', zone: SOUTH, targetRoomId: 'room_03', targetSpawnLocal: { x: 540, y: 280 } },
        { id: '04a_to_05', zone: EAST, targetRoomId: 'room_05', targetSpawnLocal: { x: 240, y: 440 } },
      ],
    },
    {
      id: 'room_04b', name: '霜骨道路',
      atlasOrigin: { x: 3240, y: 3840 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_10/rooms/room04b.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '04b_to_03', zone: NORTH, targetRoomId: 'room_03', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '04b_to_05', zone: EAST, targetRoomId: 'room_05', targetSpawnLocal: { x: 240, y: 1480 } },
      ],
    },
    {
      id: 'room_05', name: '核心匯口',
      atlasOrigin: { x: 4320, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_10/rooms/room05.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '05_to_04a', zone: WEST_UPPER, targetRoomId: 'room_04a', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '05_to_04b', zone: WEST_LOWER, targetRoomId: 'room_04b', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '05_to_06', zone: EAST, targetRoomId: 'room_06', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_06', name: '冰心階梯',
      atlasOrigin: { x: 5400, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_10/rooms/room06.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '06_to_05', zone: WEST, targetRoomId: 'room_05', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '06_to_07', zone: EAST, targetRoomId: 'room_07', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_07', name: '王座前殿',
      atlasOrigin: { x: 6480, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_10/rooms/room07.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '07_to_06', zone: WEST, targetRoomId: 'room_06', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '07_to_08', zone: EAST, targetRoomId: 'room_08', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_08', name: '極寒王座',
      atlasOrigin: { x: 7560, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_10/rooms/room08.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '08_to_07', zone: WEST, targetRoomId: 'room_07', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '08_to_09', zone: EAST, targetRoomId: 'room_09', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_09', name: '崩解核心',
      atlasOrigin: { x: 8640, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_10/rooms/room09.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '09_to_08', zone: WEST, targetRoomId: 'room_08', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '09_to_10', zone: EAST, targetRoomId: 'room_10', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_10', name: '裂隙餘光',
      atlasOrigin: { x: 9720, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_10/rooms/room10.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '10_to_09', zone: WEST, targetRoomId: 'room_09', targetSpawnLocal: { x: 840, y: 960 } },
      ],
    },
  ],

  npcs: [],
  dialogues: SNOWFIELD_210_DIALOGUES,
  storyTriggers: [
    { id: 'snowfield_2_10_t01', roomId: 'room_01', mode: 'once' },
    { id: 'snowfield_2_10_t02', roomId: 'room_03', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_10_t03', roomId: 'room_07', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_10_t04', roomId: 'room_07', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_10_t05', roomId: 'room_08', mode: 'once' },
    // boss_clear 語意：room_08 的戰鬤（ice_dragon_boss_combat）清空才觸發。
    { id: 'snowfield_2_10_t06', roomId: 'room_08', mode: 'once', requiresCombatCleared: 'ice_dragon_boss_combat' },
    { id: 'snowfield_2_10_t07', roomId: 'room_09', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_10_t08', roomId: 'room_10', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
  ],
  triggers: [],

  combatZones: [
    { id: 'throne_outer_court_combat', area: { x: 1300, y: 2420, width: 640, height: 850 }, gateColliderIds: [], waves: THRONE_OUTER_COURT_COMBAT_WAVES, rewardGold: 46, rewardExp: 36 },
    { id: 'crystal_gallery_combat', area: { x: 3460, y: 500, width: 640, height: 850 }, gateColliderIds: [], waves: CRYSTAL_GALLERY_COMBAT_WAVES, rewardGold: 48, rewardExp: 38 },
    { id: 'frostbone_road_combat', area: { x: 3460, y: 4340, width: 640, height: 850 }, gateColliderIds: [], waves: FROSTBONE_ROAD_COMBAT_WAVES, rewardGold: 48, rewardExp: 38 },
    { id: 'core_confluence_combat', area: { x: 4540, y: 2420, width: 640, height: 850 }, gateColliderIds: [], waves: CORE_CONFLUENCE_COMBAT_WAVES, rewardGold: 54, rewardExp: 42 },
    { id: 'ice_core_stairs_combat', area: { x: 5620, y: 2420, width: 640, height: 850 }, gateColliderIds: [], waves: ICE_CORE_STAIRS_COMBAT_WAVES, rewardGold: 56, rewardExp: 44 },
    { id: 'ice_dragon_boss_combat', area: { x: 7780, y: 2420, width: 640, height: 850 }, gateColliderIds: [], waves: ICE_DRAGON_BOSS_WAVES, rewardGold: 320, rewardExp: 280 },
  ],

  puzzles: [],
  collectibles: [],
  secrets: [],
  quests: [],

  // room_10 北側，遠離唯一出口（西側 10_to_09），世界座標 =
  // atlasOrigin(9720,1920) + local(540,420)。
  exit: { x: 10260, y: 2340, radius: 90, roomId: 'room_10' },

  starConditions: [
    { type: 'clear', description: '擊敗冰霜巨龍' },
    { type: 'hp_above', value: 30, description: '通關時 HP ≥ 30%' },
    { type: 'avoid_skill', value: 0, skillId: 'ice_dragon_breath', description: '不被 Frost Breath 正面命中' },
  ],
  inStageBuild: true,

  hazards: [
    { id: 'final_icicle', roomId: 'room_04a', kind: 'falling_icicle', area: { x: 160, y: 340, width: 760, height: 1220 }, params: { warningSec: 0.7, intervalSec: 2.8 } },
    { id: 'final_ice_floor', roomId: 'room_04b', kind: 'ice_floor', area: { x: 220, y: 500, width: 640, height: 900 }, params: { slideStrength: 1.15 } },
    { id: 'dragon_frozen_zone', roomId: 'room_08', kind: 'frozen_zone', area: { x: 200, y: 500, width: 680, height: 900 }, params: { slowMult: 0.65, freezeAfterSec: 2.0 } },
    { id: 'dragon_icicle', roomId: 'room_08', kind: 'falling_icicle', area: { x: 130, y: 300, width: 820, height: 1300 }, params: { warningSec: 0.75, intervalSec: 3.0 } },
  ],
}
