import type { AdventureStageDef } from '../adventureTypes'
import {
  OUTPOST_GATE_COMBAT_WAVES, WEST_WALL_COMBAT_WAVES, EAST_TOWER_COMBAT_WAVES,
  BLOCKADE_HALL_COMBAT_WAVES, ICE_GUARD_BOSS_WAVES,
} from '../encounters/snowfield22Encounters'
import { SNOWFIELD_22_DIALOGUES } from '../dialogues/snowfield22Dialogues'

/**
 * 雪原 2-2「失聯哨站」（campaign stageId: snowfield_2_2）。第三個 Room
 * Transition Adventure 關卡。第一版實作時只拿到 8 張正式 Room 圖
 * （`ASTERVOW_雪原篇_2-2_失聯哨站_8張正式Room圖.zip`），沒有精確座標
 * JSON，房間拓撲/連接方向/劇情/戰鬤/Hazard/星星條件是從主線設計文件的純
 * 文字表格取得，Room-local 座標照 snowfield_2_1 已驗證過的標準模板自己排
 * （見下方 EAST/WEST/NORTH/SOUTH 常數）。後來拿到
 * `ASTERVOW_雪原篇_2-1到2-10_V5.1完整設計配置包.zip`（內含真正的
 * `snowfield_2_2/room_cut_spec.json` 等完整資料）逐項比對過：enemySpawnAreas／
 * encounters／hazard 參數／star_conditions 全部一致；官方資料本身在
 * room_04/room_06 的雙出口也用了同一個矩形（跟 2-1 的南北縫隙是同一類
 * 「產生器沒有實際跑過遊戲驗證」的問題），這裡維持原本已經修過的
 * upper/lower 分帶處理；story trigger id 對照官方編號改成 t01~t06（純編號
 * 同步，文字內容原本就對得上）。walkableBoundsLocal 維持統一寬版（比官方
 * 給的略寬），因為官方的逐房數字一樣有跟南/北 zone 不重疊的問題。
 *
 * Y 型 / Split & Merge 拓撲：room_03 分岔成 room_04（西側牆）／room_05
 * （東側塔）兩條路線，最後在 room_06（封鎖走廊）匯合，走 room_07 Boss 房
 * 結束。room_04 額外有一個 hidden 側房 room_04a（封雪補給庫，3 星條件）。
 *
 * 兩個房間各有「同一側兩個出口」的情況（room_04 的東側同時通往 room_06 跟
 * room_04a；room_06 的西側同時通往 room_04 跟 room_05）——處理方式是同一邊
 * 切上/下兩個獨立 zone（EAST_UPPER/EAST_LOWER、WEST_UPPER/WEST_LOWER），
 * 不能讓兩個出口共用同一個矩形（同矩形會讓 RoomSystem 永遠只吃到陣列裡
 * 先出現的那個 transition，另一個出口變成走不進去）。
 *
 * atlas 位置（world 座標）純粹是離屏貼圖排版，跟房間拓撲/玩家實際移動
 * 方向無關（MiniMapHud 的方向推導只看 transition zone 貼哪一邊，不看
 * atlasOrigin，見 docs/adventure-room-design-guide.md 第五節）——這裡就
 * 單純排成 4x2 grid，不特地排成 Y 字型。
 */

const EAST = { x: 920, y: 760, width: 160, height: 400 }
const WEST = { x: 0, y: 760, width: 160, height: 400 }
const NORTH = { x: 390, y: 0, width: 300, height: 160 }
const SOUTH = { x: 390, y: 1760, width: 300, height: 160 }
const EAST_UPPER = { x: 920, y: 260, width: 160, height: 360 }
const EAST_LOWER = { x: 920, y: 1300, width: 160, height: 360 }
const WEST_UPPER = { x: 0, y: 260, width: 160, height: 360 }
const WEST_LOWER = { x: 0, y: 1300, width: 160, height: 360 }

const WALKABLE = { x: 60, y: 60, width: 960, height: 1800 }
const SPAWN = { x: 540, y: 1640 }

export const SNOWFIELD_22_STAGE: AdventureStageDef = {
  stageId: 'snowfield_2_2',
  world: { width: 4320, height: 3840 },
  spawn: { x: 540, y: 1640 },
  groundColor: 0x1c2a3a,

  colliders: [],

  rooms: [
    {
      id: 'room_01', name: '哨站外徑',
      atlasOrigin: { x: 0, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_2/rooms/room01.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '01_to_02', zone: EAST, targetRoomId: 'room_02', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_02', name: '破雪門道',
      atlasOrigin: { x: 1080, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_2/rooms/room02.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '02_to_01', zone: WEST, targetRoomId: 'room_01', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '02_to_03', zone: EAST, targetRoomId: 'room_03', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_03', name: '哨站廣場',
      atlasOrigin: { x: 2160, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_2/rooms/room03.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '03_to_02', zone: WEST, targetRoomId: 'room_02', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '03_to_04', zone: NORTH, targetRoomId: 'room_04', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '03_to_05', zone: SOUTH, targetRoomId: 'room_05', targetSpawnLocal: { x: 540, y: 280 } },
      ],
    },
    {
      id: 'room_04', name: '西側牆',
      atlasOrigin: { x: 3240, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_2/rooms/room04.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '04_to_03', zone: SOUTH, targetRoomId: 'room_03', targetSpawnLocal: { x: 540, y: 280 } },
        { id: '04_to_06', zone: EAST_UPPER, targetRoomId: 'room_06', targetSpawnLocal: { x: 240, y: 440 } },
        { id: '04_to_04a', zone: EAST_LOWER, targetRoomId: 'room_04a', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_04a', name: '封雪補給庫',
      atlasOrigin: { x: 0, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_2/rooms/room04a.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '04a_to_04', zone: WEST, targetRoomId: 'room_04', targetSpawnLocal: { x: 800, y: 1480 } },
      ],
    },
    {
      id: 'room_05', name: '東側塔',
      atlasOrigin: { x: 1080, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_2/rooms/room05.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '05_to_03', zone: NORTH, targetRoomId: 'room_03', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '05_to_06', zone: EAST, targetRoomId: 'room_06', targetSpawnLocal: { x: 240, y: 1480 } },
      ],
    },
    {
      id: 'room_06', name: '封鎖走廊',
      atlasOrigin: { x: 2160, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_2/rooms/room06.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '06_to_04', zone: WEST_UPPER, targetRoomId: 'room_04', targetSpawnLocal: { x: 800, y: 440 } },
        { id: '06_to_05', zone: WEST_LOWER, targetRoomId: 'room_05', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '06_to_07', zone: EAST, targetRoomId: 'room_07', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_07', name: '冰甲守衛',
      atlasOrigin: { x: 3240, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_2/rooms/room07.webp',
      walkableBoundsLocal: WALKABLE, spawnLocal: SPAWN,
      transitions: [
        { id: '07_to_06', zone: WEST, targetRoomId: 'room_06', targetSpawnLocal: { x: 840, y: 960 } },
      ],
    },
  ],

  npcs: [],
  dialogues: SNOWFIELD_22_DIALOGUES,
  // 2026-08-21：id 對齊官方 room_cut_spec.json/story_triggers.json 的編號
  // （t01~t06，不是我原本手推的 t01/t03/t04a/t05/t06/t07）——後來拿到
  // V5.1 完整設計配置包比對出來的落差，純粹是編號不同，文字內容本來就
  // 一致，改這裡順便同步 snowfield22Dialogues.ts 的 id。
  storyTriggers: [
    { id: 'snowfield_2_2_t01', roomId: 'room_01', mode: 'once' },
    { id: 'snowfield_2_2_t02', roomId: 'room_03', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_2_t03', roomId: 'room_04a', mode: 'once' },
    { id: 'snowfield_2_2_t04', roomId: 'room_05', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_2_t05', roomId: 'room_06', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_2_t06', roomId: 'room_07', mode: 'once' },
  ],
  triggers: [],

  // 世界座標（atlasOrigin + local）；enemySpawnArea 沿用 snowfield_2_1 的
  // 標準置中範圍 {x:220,y:500,width:640,height:850}。
  combatZones: [
    { id: 'outpost_gate_combat', area: { x: 1300, y: 500, width: 640, height: 850 }, gateColliderIds: [], waves: OUTPOST_GATE_COMBAT_WAVES, rewardGold: 34, rewardExp: 26 },
    { id: 'west_wall_combat', area: { x: 3460, y: 500, width: 640, height: 850 }, gateColliderIds: [], waves: WEST_WALL_COMBAT_WAVES, rewardGold: 36, rewardExp: 28 },
    { id: 'east_tower_combat', area: { x: 1300, y: 2420, width: 640, height: 850 }, gateColliderIds: [], waves: EAST_TOWER_COMBAT_WAVES, rewardGold: 36, rewardExp: 28 },
    { id: 'blockade_hall_combat', area: { x: 2380, y: 2420, width: 640, height: 850 }, gateColliderIds: [], waves: BLOCKADE_HALL_COMBAT_WAVES, rewardGold: 44, rewardExp: 34 },
    { id: 'ice_guard_boss_combat', area: { x: 3460, y: 2420, width: 640, height: 850 }, gateColliderIds: [], waves: ICE_GUARD_BOSS_WAVES, rewardGold: 80, rewardExp: 62 },
  ],

  puzzles: [],
  collectibles: [],
  secrets: [],
  quests: [],

  // room_07 北側，世界座標 = atlasOrigin(3240,1920) + local(540,420)。
  exit: { x: 3780, y: 2340, radius: 90, roomId: 'room_07' },

  starConditions: [
    { type: 'clear', description: '通關' },
    { type: 'time_under', value: 720, description: '12 分鐘內通關' },
    { type: 'custom', targetId: 'room_04a', description: '找到封雪補給庫' },
  ],
  inStageBuild: true,

  hazards: [
    { id: 'icicle_tower', roomId: 'room_05', kind: 'falling_icicle', area: { x: 180, y: 360, width: 720, height: 1180 }, params: { warningSec: 0.8, intervalSec: 3.2 } },
  ],
}
