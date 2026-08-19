/**
 * 森林遺跡固定式主線關卡系統（2026-08）共用型別。這一整套（campaign/）刻意
 * 跟 Arena Roguelite Run（`dungeonZones.ts` 隨機生成）、Dungeon 副本
 * （`dungeon.ts`）完全分開——固定關卡資料放這裡，執行期邏輯（波次生成、
 * Objective 判定、星星計算）寫在 `src/arena/objectives.ts` 跟
 * `ArenaGame.ts` 的 `initCampaignStage()`/`updateObjective()`，這個檔案
 * 只放純資料型別，不含任何行為邏輯。
 */

export type StageObjectiveType =
  | 'elimination'  // 擊敗指定敵人/波次
  | 'survival'     // 存活指定秒數
  | 'defense'      // 保護 NPC/Core
  | 'hunt'         // 擊敗指定 Elite/主目標
  | 'destroy'      // 破壞圖騰/核心/祭壇
  | 'collection'   // 收集指定物件
  | 'escape'       // 到達出口
  | 'boss'         // 擊敗 Boss

export interface StageObjective {
  type: StageObjectiveType
  /** elimination/hunt 用：主目標敵人的 enemyId（沒有指定則等於清空全場）。 */
  huntTargetId?: string
  /** survival/defense 用：需要撐過的秒數。 */
  durationSec?: number
  /** defense 用：被保護目標的最大 HP（實際生成時建立一個 0 移動速度的 EnemyInstance 當作 Core）。 */
  defenseTargetMaxHp?: number
  /** destroy 用：需要摧毀的圖騰/核心數量。 */
  destroyCount?: number
  /** collection 用：需要收集的物件數量。 */
  collectCount?: number
  /** escape 用：出口座標（畫面比例 0~1，實際生成時換算成像素）。 */
  escapeTarget?: { xRatio: number; yRatio: number }
}

/**
 * 波次觸發條件（2026-08-12 V2 重構）：取代原本單純的 triggerAtSec，資料驅動、
 * 不寫死 stageId 判斷。四種目前實際會用到的類型：
 *   stage_start          → 關卡一開始就觸發
 *   elapsed_time         → 關卡開始後固定秒數觸發（跟舊 triggerAtSec 等價）
 *   previous_wave_cleared → 場上敵人清空後觸發，delaySec 是清空後的緩衝
 *                          （Soft Wave Transition：0.5~1.5秒讓玩家喘口氣，
 *                          不是「Wave Clear 3 2 1」那種硬倒數）
 *   remaining_enemy_count → 場上存活敵人數 ≤ count 就觸發（下一波提前重疊
 *                          進場，製造「連續戰鬥」的節奏，不是清空才開始）
 * 沒有實作 objective_progress/boss_hp/custom（V2 文件也提到的類型）——目前
 * 20 關資料不需要，Boss 專屬的 HP 門檻機制（例如古樹守衛 Life Core）走
 * bossSkills.ts 自己的判斷，不透過 EnemyWave。
 */
export type WaveTrigger =
  | { type: 'stage_start' }
  | { type: 'elapsed_time'; sec: number }
  | { type: 'previous_wave_cleared'; delaySec?: number }
  | { type: 'remaining_enemy_count'; count: number }

/** 單一波次的固定敵人組成——跟 Arena Roguelite Run 的 pickEnemyType() 加權隨機完全不同，這裡是作者指定的確切配置。 */
export interface EnemyWave {
  trigger: WaveTrigger
  /** enemyId → 數量。 */
  enemies: Record<string, number>
  /** enemyId → 數量，這幾隻強制帶菁英詞綴（例如 1-13 的 Elite Thorn Wolf 主目標）。 */
  eliteEnemies?: Record<string, number>
}

export type StageHazardKind = 'fire' | 'poison' | 'thorn' | 'root'

export interface StageHazardConfig {
  kind: StageHazardKind
  /** 關卡開始後幾秒生成（沒指定則開場就有）。 */
  triggerAtSec?: number
  /** 場上同時存在幾團（例如 1-8 毒菇森林是 2 團）。 */
  count: number
  radius: number
  /** fire/poison 用：每 0.5 秒 tick 的傷害；thorn/root 主要靠 slowMult/rootSec，可以是 0 或很低。 */
  dps: number
  duration: number
  slowMult?: number  // thorn/root 用：移速乘數（0.6 = 減速40%）
  rootSec?: number    // root 用：進入時額外附加的短暫定身秒數
}

export type StarConditionType =
  | 'clear'                 // 完成主要 Objective 即算（通常是第一星）
  | 'time_under'             // 在 value 秒內完成
  | 'hp_above'               // 通關時 HP% >= value
  | 'hits_under'             // 被擊中次數 <= value
  | 'avoid_hazard'           // 沒有被 hazardId 指定的地板效果命中（value 當作次數上限，0 = 完全不能中）
  | 'avoid_skill'            // 沒有被 skillId 指定的 Boss 技能直接命中（value 當作次數上限，0 = 完全不能中）
  | 'destroy_within'         // 每次目標出現後 value 秒內摧毀完畢（例如古樹守衛的 Core）
  | 'protect_hp'             // Defense 目標 HP% 通關時 >= value
  | 'heal_count_under'       // 指定敵人（targetId）成功治療次數 <= value
  | 'control_count_under'    // 玩家被控制效果（root/thorn slow）命中次數 <= value
  | 'counter_trigger_under'  // Boss 反擊觸發次數 <= value（1-15 專用，第三星是 0）
  | 'no_death'               // 過程中沒有觸發過死亡結算（1-19 三波連續戰用）
  | 'custom'                 // 特殊情境（目前只有 1-9「優先擊敗 Shaman」用，靠 objective.progress.customFlag 判斷）
  // Adventure Stage 專用（2026-08-19）：判定邏輯不在 ArenaGame.ts 的
  // evaluateCampaignStars()，改由 AdventureGame.ts 在 Exit 時自己算，這兩個
  // 成員純粹給 UI（CampaignMapScreen 底部關卡資訊面板）顯示描述文字用。
  | 'purple_coin_count'      // 收集的紫幣數 >= value
  | 'star_piece_found'       // 找到的星星碎片數 >= value

export interface StarCondition {
  type: StarConditionType
  value?: number
  targetId?: string
  skillId?: string
  hazardId?: string
  description: string
}

export interface StageBossConfig {
  bossEnemyId: string
  /** 1-18 雙獸人隊長用：場上同時出現幾隻（預設 1）。 */
  count?: number
}

export interface RewardConfig {
  gold: number
  heroExp: number
}

export interface CampaignStage {
  id: string             // 'forest_1_1' ~ 'forest_1_10'
  campaignId: string      // 'forest_ruins'
  chapter: number         // 1
  stageNumber: number      // 1~10
  name: string

  objective: StageObjective
  waves?: EnemyWave[]
  hazards?: StageHazardConfig[]
  boss?: StageBossConfig

  starConditions: [StarCondition, StarCondition, StarCondition]  // 固定三顆星，順序對應第一~三星

  estimatedDurationSec: [number, number]  // [下限, 上限]，供關卡地圖顯示預估時間用
  firstClearReward: RewardConfig

  /** 場景主題（見 App.css 既有的 arena 背景切換慣例）。森林/雪原/魔王城各 5 種
   * （2026-08-16）；裂隙前兆/深海遺城各 6 個子章節各只給 1 種（2026-08-16
   * 稍晚新增，60 關規模下不再比照前三篇章每篇 5 種主題的密度）。 */
  bgTheme:
    | 'forest_entrance' | 'ancient_ruins' | 'poison_forest' | 'ancient_altar' | 'dragon_nest'
    | 'snow_foothills' | 'frozen_keep' | 'glacier_cavern' | 'frost_shrine' | 'ice_dragon_lair'
    | 'demon_gate' | 'crimson_hollow' | 'shadow_keep' | 'blood_altar' | 'throne_of_ash'
    | 'rift_broken_sky' | 'rift_void_chasm' | 'rift_eclipse_core'
    | 'deep_coral_shallows' | 'deep_sunken_capital' | 'deep_emperor_abyss'
}

export const CAMPAIGN_ID_FOREST_RUINS = 'forest_ruins'
// 2026-08-16 新篇章：命名刻意避開 Roguelite 舊系統（campaignPick/mapGen.ts）
// 已經在用的 'snowfield'/'castle'/'rift_omen'/'deep_sea' 字面值（CAMPAIGN_BG_THEME
// 那組），完全不共用任何資料——固定式主線關卡的 campaignId 一律用更長、
// 帶場景描述的字尾避免混淆（`_ruins`/`_wastes`/`_castle`/`_broken_sky` 等）。
export const CAMPAIGN_ID_SNOWFIELD = 'snowfield_wastes'
export const CAMPAIGN_ID_DEMON_CASTLE = 'demon_king_castle'
// 裂隙前兆／深海遺城（2026-08-16 稍晚新增）：每個篇章底下再分 3 個子章節，
// 每個子章節都是獨立 10 關地圖——架構上比照前三篇章「一個 campaignId = 一張
// 地圖」的模式，把子章節當成獨立的 campaignId，而不是在既有 CampaignStage.chapter
// 欄位上疊第二層分組（getChapterStages() 目前只用 campaignId 過濾，改成
// chapter-aware 會動到 CampaignMapScreen/campaignProgress 好幾個地方）。
export const CAMPAIGN_ID_RIFT_BROKEN_SKY = 'rift_omen_broken_sky'
export const CAMPAIGN_ID_RIFT_VOID_CHASM = 'rift_omen_void_chasm'
export const CAMPAIGN_ID_RIFT_ECLIPSE_CORE = 'rift_omen_eclipse_core'
export const CAMPAIGN_ID_DEEP_CORAL_SHALLOWS = 'deep_sea_coral_shallows'
export const CAMPAIGN_ID_DEEP_SUNKEN_CAPITAL = 'deep_sea_sunken_capital'
export const CAMPAIGN_ID_DEEP_EMPEROR_ABYSS = 'deep_sea_emperor_abyss'

/** 九個篇章的固定順序（線性解鎖用，見 campaignProgress.ts 的 isChapterUnlocked）。 */
export const CAMPAIGN_CHAPTER_ORDER = [
  CAMPAIGN_ID_FOREST_RUINS, CAMPAIGN_ID_SNOWFIELD, CAMPAIGN_ID_DEMON_CASTLE,
  CAMPAIGN_ID_RIFT_BROKEN_SKY, CAMPAIGN_ID_RIFT_VOID_CHASM, CAMPAIGN_ID_RIFT_ECLIPSE_CORE,
  CAMPAIGN_ID_DEEP_CORAL_SHALLOWS, CAMPAIGN_ID_DEEP_SUNKEN_CAPITAL, CAMPAIGN_ID_DEEP_EMPEROR_ABYSS,
] as const

/**
 * 「篇」（saga）分組（2026-08-16 補上）：九個篇章其實分屬三個更大的「篇」——
 * 灰燼王國篇（森林遺跡/雪原/魔王城 3 章）、裂隙前兆篇（破碎天幕/虛空裂谷/
 * 星蝕核心 3 章）、深海遺城篇（珊瑚淺灘/沉沒王城/海皇深淵 3 章），呼應舊
 * Roguelite 系統原本的三個 LOBBY_CHAPTERS 命名（'main'=灰燼王國篇／
 * 'rift_omen'=裂隙前兆篇／'deep_sea'=深海遺城篇，見 AdventureReadyScreen.tsx）。
 * 這一層純粹是 UI 導覽用的分組資料（SagaSelectScreen 用），不影響
 * CAMPAIGN_CHAPTER_ORDER 的線性解鎖順序——九個篇章解鎖判斷完全不變，只是
 * 選篇章的路徑多一層「先選篇再選章」。
 */
export const CAMPAIGN_ID_ASH_KINGDOM_SAGA = 'ash_kingdom_saga'
export const CAMPAIGN_ID_RIFT_OMEN_SAGA = 'rift_omen_saga'
export const CAMPAIGN_ID_DEEP_SEA_SAGA = 'deep_sea_saga'

export interface CampaignSaga {
  id: string
  label: string
  sub: string
  chapters: readonly string[]  // campaignId[]，依 CAMPAIGN_CHAPTER_ORDER 的順序
}

/** 章節 campaignId 反查所屬的篇 id——campaign_map 離開時要導回「這一章所屬
 * 的篇」的章節選擇畫面，不能寫死。 */
export function getSagaIdForCampaign(campaignId: string): string {
  return CAMPAIGN_SAGAS.find(s => s.chapters.includes(campaignId))?.id ?? CAMPAIGN_SAGAS[0].id
}

export const CAMPAIGN_SAGAS: CampaignSaga[] = [
  {
    id: CAMPAIGN_ID_ASH_KINGDOM_SAGA,
    label: '灰燼王國篇',
    sub: '荊棘森林・冰封雪原・熔岩王城',
    chapters: [CAMPAIGN_ID_FOREST_RUINS, CAMPAIGN_ID_SNOWFIELD, CAMPAIGN_ID_DEMON_CASTLE],
  },
  {
    id: CAMPAIGN_ID_RIFT_OMEN_SAGA,
    label: '裂隙前兆篇',
    sub: '破碎天幕・虛空裂谷・星蝕核心',
    chapters: [CAMPAIGN_ID_RIFT_BROKEN_SKY, CAMPAIGN_ID_RIFT_VOID_CHASM, CAMPAIGN_ID_RIFT_ECLIPSE_CORE],
  },
  {
    id: CAMPAIGN_ID_DEEP_SEA_SAGA,
    label: '深海遺城篇',
    sub: '珊瑚淺灘・沉沒王城・海皇深淵',
    chapters: [CAMPAIGN_ID_DEEP_CORAL_SHALLOWS, CAMPAIGN_ID_DEEP_SUNKEN_CAPITAL, CAMPAIGN_ID_DEEP_EMPEROR_ABYSS],
  },
]

/** 4 個 Milestone 門檻，對應各篇章滿星數的 25/50/75/100%。2026-08-16 三篇章從
 * 20 關砍到 10 關（滿星 30）後從 [15,30,45,60] 等比例縮小為 [8,15,23,30]，
 * 對應設計文件第 27~28 節同一套比例。 */
export const CHAPTER_STAR_MILESTONES = [8, 15, 23, 30] as const
