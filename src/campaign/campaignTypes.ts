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
  id: string             // 'forest_1_1' ~ 'forest_1_20'
  campaignId: string      // 'forest_ruins'
  chapter: number         // 1
  stageNumber: number      // 1~20
  name: string

  objective: StageObjective
  waves?: EnemyWave[]
  hazards?: StageHazardConfig[]
  boss?: StageBossConfig

  starConditions: [StarCondition, StarCondition, StarCondition]  // 固定三顆星，順序對應第一~三星

  estimatedDurationSec: [number, number]  // [下限, 上限]，供關卡地圖顯示預估時間用
  firstClearReward: RewardConfig

  /** 場景主題（見 App.css 既有的 arena 背景切換慣例），5 種森林主題之一。 */
  bgTheme: 'forest_entrance' | 'ancient_ruins' | 'poison_forest' | 'ancient_altar' | 'dragon_nest'
}

export const CAMPAIGN_ID_FOREST_RUINS = 'forest_ruins'

/** 60 星 4 個 Milestone 門檻（15/30/45/60），對應設計文件第 27~28 節。 */
export const CHAPTER_STAR_MILESTONES = [15, 30, 45, 60] as const
