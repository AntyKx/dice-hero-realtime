import type { AdventureStageDef } from '../adventureTypes'
import { SNOW_PATH_COMBAT_WAVES, GLACIER_FLATS_COMBAT_WAVES, WOLF_AMBUSH_COMBAT_WAVES } from '../encounters/snowfield21Encounters'
import { SNOWFIELD_21_DIALOGUES } from '../dialogues/snowfield21Dialogues'

/**
 * 雪原 2-1「雪線之外」（campaign stageId: snowfield_2_1，見
 * src/campaign/chapters/snowfield.ts 的 stage(1)）。第二個 Room Transition
 * Adventure 關卡，資料來源是外部交付包
 * ASTERVOW_雪原篇_2-1_完整交付包/snowfield_2_1/（room_cut_spec.json／
 * entrance_exit_table.json／story_triggers.json／encounters.json／
 * hazards.json／star_conditions.json），照 docs/adventure-room-design-guide.md
 * 既有方法論實作，細節見 claude_code/IMPLEMENT_THIS_STAGE.md 的規則清單。
 *
 * 6 個房間貼在 2160x5760 的離屏 atlas 上（2x3 grid，跟交付包
 * room_cut_spec.json 的 overviewPosition 一比一對應：col=x*1080,
 * row=y*1920），Z 型動線 room_01→02→03→04→05→06（東/南/西/南/東交錯），跟
 * entrance_exit_table.json 完全吻合。
 *
 * 跟 forest_1_1 的差異（新制關卡，見 adventureTypes.ts 對應欄位註解）：
 * - 沒有 NPC／支線任務／謎題／秘密／收集品，starConditions 改用
 *   clear/hp_above/avoid_skill（跟 CampaignStage 共用 StarConditionType），
 *   不再用紫幣/星片門檻。
 * - inStageBuild:true，擊殺累積 EXP 到門檻會跳三選一 Build 選卡（見
 *   AdventureGame.gainBuildExp）。
 * - room_02 有 ice_floor 環境危害（MovementSystem 依 hazards 套用滑動；
 *   2026-08-21 依重新出圖的 ASTERVOW_SNOW_2_1_HANDOFF.md 拓樸契約從
 *   room_03 移過來，room_02/03 名稱同步改成「冰痕林道」「逃狼坡道」，
 *   連線與座標完全沒變）。
 * - room_05 的精英 frost_wolf 有 leap 技能（AdventureCombatController），
 *   對應 star_conditions.json 的 avoid_skill frost_wolf_leap。
 * - 交付包 room_cut_spec.json 六間房的 staticCollisionCandidates／
 *   foregroundCandidates 全部是空陣列（v1 美術包本身承認「若要更進一步，
 *   可再針對個別房間做碰撞與視覺微調」），所以這裡先不生 terrainCollidersLocal
 *   /foregroundPiecesLocal——跟 forest_1_1 逐房像素分析的做法不同，是因為
 *   來源資料本身就还没有到那個階段，不是漏做。
 */
export const SNOWFIELD_21_STAGE: AdventureStageDef = {
  stageId: 'snowfield_2_1',
  world: { width: 2160, height: 5760 },
  spawn: { x: 540, y: 1640 },
  groundColor: 0x1c2a3a,

  colliders: [],

  rooms: [
    {
      id: 'room_01', name: '雪線入口',
      atlasOrigin: { x: 0, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_1/rooms/room01.webp',
      // 2026-08-21：v1 交付包給的 walkableBoundsLocal 跟南/北 transition
      // zone 之間留了 70~100 單位真空帶（既不在 walkableBounds 也不在任何
      // zone 內），玩家走到那條帶子上會被 CollisionSystem 判定卡住走不到
      // 出口——這裡改成統一收窄邊界成「room 邊緣留 60 單位視覺餘裕」，
      // 跟四個方向的 zone 都至少重疊 40 單位以上（見 stages/snowfield21.ts
      // 開頭跑過的 Node 驗證腳本），之後要疊真正的地形碰撞美術再細分縮小。
      walkableBoundsLocal: { x: 60, y: 60, width: 960, height: 1800 },
      spawnLocal: { x: 540, y: 1640 },
      transitions: [
        { id: '01_to_02', zone: { x: 920, y: 760, width: 160, height: 400 }, targetRoomId: 'room_02', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_02', name: '冰痕林道',
      atlasOrigin: { x: 1080, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_1/rooms/room02.webp',
      walkableBoundsLocal: { x: 60, y: 60, width: 960, height: 1800 },
      spawnLocal: { x: 540, y: 1640 },
      transitions: [
        { id: '02_to_01', zone: { x: 0, y: 760, width: 160, height: 400 }, targetRoomId: 'room_01', targetSpawnLocal: { x: 840, y: 960 } },
        { id: '02_to_03', zone: { x: 390, y: 1760, width: 300, height: 160 }, targetRoomId: 'room_03', targetSpawnLocal: { x: 540, y: 280 } },
      ],
    },
    {
      id: 'room_03', name: '逃狼坡道',
      atlasOrigin: { x: 1080, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_1/rooms/room03.webp',
      walkableBoundsLocal: { x: 60, y: 60, width: 960, height: 1800 },
      spawnLocal: { x: 540, y: 1640 },
      transitions: [
        { id: '03_to_02', zone: { x: 390, y: 0, width: 300, height: 160 }, targetRoomId: 'room_02', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '03_to_04', zone: { x: 0, y: 760, width: 160, height: 400 }, targetRoomId: 'room_04', targetSpawnLocal: { x: 840, y: 960 } },
      ],
    },
    {
      id: 'room_04', name: '斷木營地',
      atlasOrigin: { x: 0, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_1/rooms/room04.webp',
      // 2026-08-21：v1 交付包給的 walkableBoundsLocal 跟南/北 transition
      // zone 之間留了 70~100 單位真空帶（既不在 walkableBounds 也不在任何
      // zone 內），玩家走到那條帶子上會被 CollisionSystem 判定卡住走不到
      // 出口——這裡改成統一收窄邊界成「room 邊緣留 60 單位視覺餘裕」，
      // 跟四個方向的 zone 都至少重疊 40 單位以上（見 stages/snowfield21.ts
      // 開頭跑過的 Node 驗證腳本），之後要疊真正的地形碰撞美術再細分縮小。
      walkableBoundsLocal: { x: 60, y: 60, width: 960, height: 1800 },
      spawnLocal: { x: 540, y: 1640 },
      transitions: [
        { id: '04_to_03', zone: { x: 920, y: 760, width: 160, height: 400 }, targetRoomId: 'room_03', targetSpawnLocal: { x: 240, y: 960 } },
        { id: '04_to_05', zone: { x: 390, y: 1760, width: 300, height: 160 }, targetRoomId: 'room_05', targetSpawnLocal: { x: 540, y: 280 } },
      ],
    },
    {
      id: 'room_05', name: '霜狼伏擊',
      atlasOrigin: { x: 0, y: 3840 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_1/rooms/room05.webp',
      walkableBoundsLocal: { x: 60, y: 60, width: 960, height: 1800 },
      spawnLocal: { x: 540, y: 1640 },
      transitions: [
        { id: '05_to_04', zone: { x: 390, y: 0, width: 300, height: 160 }, targetRoomId: 'room_04', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '05_to_06', zone: { x: 920, y: 760, width: 160, height: 400 }, targetRoomId: 'room_06', targetSpawnLocal: { x: 240, y: 960 } },
      ],
    },
    {
      id: 'room_06', name: '風雪崖口',
      atlasOrigin: { x: 1080, y: 3840 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/snowfield_2_1/rooms/room06.webp',
      // 2026-08-21：v1 交付包給的 walkableBoundsLocal 跟南/北 transition
      // zone 之間留了 70~100 單位真空帶（既不在 walkableBounds 也不在任何
      // zone 內），玩家走到那條帶子上會被 CollisionSystem 判定卡住走不到
      // 出口——這裡改成統一收窄邊界成「room 邊緣留 60 單位視覺餘裕」，
      // 跟四個方向的 zone 都至少重疊 40 單位以上（見 stages/snowfield21.ts
      // 開頭跑過的 Node 驗證腳本），之後要疊真正的地形碰撞美術再細分縮小。
      walkableBoundsLocal: { x: 60, y: 60, width: 960, height: 1800 },
      spawnLocal: { x: 540, y: 1640 },
      transitions: [
        { id: '06_to_05', zone: { x: 0, y: 760, width: 160, height: 400 }, targetRoomId: 'room_05', targetSpawnLocal: { x: 840, y: 960 } },
      ],
    },
  ],

  npcs: [],
  dialogues: SNOWFIELD_21_DIALOGUES,
  // 房間 local 座標，見 StoryTriggerSystem.ts；room_01 的 t01/t02 合併成單一
  // DialogueDef 兩行播放（見 snowfield21Dialogues.ts 註解）。
  storyTriggers: [
    { id: 'snowfield_2_1_t01', roomId: 'room_01', mode: 'once' },
    { id: 'snowfield_2_1_t03', roomId: 'room_02', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_1_t04', roomId: 'room_04', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
    { id: 'snowfield_2_1_t05', roomId: 'room_05', mode: 'once' },
    { id: 'snowfield_2_1_t06', roomId: 'room_06', mode: 'once', area: { x: 260, y: 700, width: 560, height: 420 } },
  ],
  triggers: [],

  // 世界座標（atlasOrigin + local，legacy 系統沿用森林遺跡既有寫法）——
  // enemySpawnAreas 來源：room_cut_spec.json 各房 { x:220, y:500, width:640, height:850 }。
  combatZones: [
    {
      id: 'snow_path_combat',
      area: { x: 1300, y: 500, width: 640, height: 850 }, // room_02 atlasOrigin(1080,0) + local
      gateColliderIds: [],
      waves: SNOW_PATH_COMBAT_WAVES,
      rewardGold: 32,
      rewardExp: 24,
    },
    {
      id: 'glacier_flats_combat',
      area: { x: 1300, y: 2420, width: 640, height: 850 }, // room_03 atlasOrigin(1080,1920) + local
      gateColliderIds: [],
      waves: GLACIER_FLATS_COMBAT_WAVES,
      rewardGold: 36,
      rewardExp: 28,
    },
    {
      id: 'wolf_ambush_combat',
      area: { x: 220, y: 4340, width: 640, height: 850 }, // room_05 atlasOrigin(0,3840) + local
      gateColliderIds: [],
      waves: WOLF_AMBUSH_COMBAT_WAVES,
      rewardGold: 70,
      rewardExp: 55,
    },
  ],

  puzzles: [],
  collectibles: [],
  secrets: [],
  quests: [],

  // room_06 東北側崖口，遠離 room_06 自己的入口（西側 05_to_06 出口對應的
  // spawn 點），世界座標 = room_06 atlasOrigin(1080,3840) + local(540,420)，
  // 跟 walkableBoundsLocal 上緣(y:260)留 330 單位餘裕，跟 06_to_05 出口
  // zone（x:0-160）完全不重疊。
  exit: { x: 1620, y: 4260, radius: 90, roomId: 'room_06' },

  starConditions: [
    { type: 'clear', description: '通關' },
    { type: 'hp_above', value: 60, description: 'HP ≥ 60% 通關' },
    { type: 'avoid_skill', value: 1, skillId: 'frost_wolf_leap', description: '被霜狼 Leap 命中 ≤ 1 次' },
  ],
  inStageBuild: true,

  // 2026-08-21：依 ASTERVOW_SNOW_2_1_HANDOFF.md 重新出圖的拓樸契約，
  // ice_floor 從 room_03 移到 room_02（「room_02 首次展示 Ice Floor」），
  // room_02/03 名稱同步改成「冰痕林道」「逃狼坡道」，連線/座標完全不變。
  hazards: [
    { id: 'ice_floor_intro', roomId: 'room_02', kind: 'ice_floor', area: { x: 260, y: 650, width: 560, height: 620 }, params: { slideStrength: 1.0 } },
  ],
}
