/**
 * Adventure Stage 探索引擎（2026-08-19）共用型別。整個 src/adventure/ 都是
 * 全新、獨立的 PixiJS 引擎——跟 ArenaGame.ts 平行，不共用 class，但同樣是
 * 「單一 worldLayer + camera，探索/戰鬥/劇情/謎題全部在同一張畫布切換狀態」
 * 的架構（見 AdventureGame.ts），不會有跳頁弄丟場景狀態的問題。
 *
 * 這個檔案只放純資料型別，不含任何行為邏輯（呼應 campaignTypes.ts 的慣例）。
 */

export interface AdventureRect { x: number; y: number; width: number; height: number }
export interface AdventureVec2 { x: number; y: number }

export type AdventureGameState = 'explore' | 'dialogue' | 'combat' | 'cutscene' | 'puzzle' | 'stage_clear'

// ── 碰撞 ─────────────────────────────────────────────────────────────────

export interface ColliderDef {
  id: string
  rect: AdventureRect
  /** false 表示一開始就是關閉狀態（不擋路），PuzzleSystem/CombatController
   * 之後可以動態開關（例如藤蔓門/裂牆打穿後）。預設 true。 */
  active?: boolean
}

// ── NPC／對話 ────────────────────────────────────────────────────────────

export interface DialogueLine {
  speaker: string
  text: string
}

export interface DialogueDef {
  id: string
  /** Party Conditional Dialogue（文件第十節祭壇需求）：依序檢查，第一個
   * partyHasHeroId 命中目前隊伍（含隊長+夥伴）的分支優先顯示；都沒命中就用
   * 沒有 condition 的 fallback（一定要放最後一筆）。 */
  variants: { condition?: { partyHasHeroId: string }; lines: DialogueLine[] }[]
}

export interface NpcDef {
  id: string
  name: string
  x: number
  y: number
  interactRadius?: number
  /** 依序嘗試：第一個「還沒對過（若 dialogueId 只想觸發一次）」的對話。
   * QuestSystem 會依任務進度動態決定 NPC 現在該顯示哪一句（接任務前/任務中/
   * 任務完成後對話不同），這裡只列出全部可能用到的 dialogueId，順序代表
   * 優先權，實際挑選邏輯在 NpcController.pickDialogue()。 */
  dialogueIds: string[]
}

// ── 觸發區 ───────────────────────────────────────────────────────────────

export type TriggerAction =
  | { type: 'discover_area'; areaId: string; areaName: string }
  | { type: 'start_cutscene'; cutsceneId: string }

export interface TriggerDef {
  id: string
  area: AdventureRect
  /** 'once' 只會觸發一次（例如發現區域），'repeat' 每次進入都觸發。 */
  mode: 'once' | 'repeat'
  action: TriggerAction
}

// ── 戰鬥區 ───────────────────────────────────────────────────────────────

export interface CombatWaveDef { enemyId: string; count: number }

export interface CombatZoneDef {
  id: string
  area: AdventureRect
  /** 戰鬥開始時要關閉（變成 collider 擋路）的 colliderId（前後藤蔓），
   * 結束時自動解除，不需要玩家額外操作。 */
  gateColliderIds: string[]
  /** 波次陣列：上一波清空才生下一波，呼應文件「Wave 1／Wave 2」設計。 */
  waves: CombatWaveDef[][]
  rewardGold: number
  rewardExp: number
}

// ── 謎題（三火盆／藤蔓門） ──────────────────────────────────────────────

export interface BrazierDef { id: string; x: number; y: number; hitsRequired: number }

export interface PuzzleDef {
  id: string
  kind: 'brazier_gate'
  braziers: BrazierDef[]
  /** 全部點燃後移除（開啟通行）的 colliderId。 */
  gateColliderId: string
  completeFlag: string
}

// ── 收集品 ───────────────────────────────────────────────────────────────

export type CollectibleKind = 'purple_coin' | 'star_piece' | 'treasure' | 'quest_item'

export interface CollectibleDef {
  id: string
  kind: CollectibleKind
  x: number
  y: number
  /** star_piece 專用：文件要求碎片 2、3 第一版先做鎖定佔位（畫面上看得到但
   * 撿不到，之後回頭探索用），locked=true 時 CollectibleSystem 不允許撿取。 */
  locked?: boolean
  /** 秘密區域專用：hidden=true 的收集品要等對應 SecretDef.revealsCollectibleIds
   * 揭露後才會顯示/可撿取，一開始不畫出來也不參與撿取檢查。 */
  hidden?: boolean
  /** treasure 專用：開啟內容物。 */
  reward?: { gold?: number; enhanceStones?: number }
}

// ── 秘密區域 ─────────────────────────────────────────────────────────────

export interface SecretDef {
  id: string
  kind: 'illusory_wall' | 'breakable_wall'
  /** illusory_wall：純視覺假牆，玩家可以直接走過去（不是真的 collider）。
   * breakable_wall：真的 collider，打到 hp 0 才移除。 */
  area: AdventureRect
  hp?: number // breakable_wall 用
  revealsCollectibleIds: string[]
}

// ── 支線任務 ─────────────────────────────────────────────────────────────

export interface QuestDef {
  id: string
  npcId: string
  title: string
  acceptDialogueId: string
  inProgressDialogueId: string
  completeDialogueId: string
  /** 任務專屬小規模擊殺目標（文件：花圃打倒兩隻弱小史萊姆），跟 6/9 節的
   * 兩場正式 Combat Zone 分開——接受任務後玩家進入 spawnArea 才生成，不是
   * 一進關卡就有。 */
  killTarget: { enemyId: string; count: number; spawnArea: AdventureRect }
  /** 擊殺目標全滅後掉落的收集品 id（dirty_teddy），撿到才算任務條件完成，
   * 回頭找 NPC 交任務才真正發獎勵。 */
  requiredCollectibleId: string
  reward: { gold: number; purpleCoins: number }
  completeFlag: string
}

// ── 出口 ─────────────────────────────────────────────────────────────────

export interface ExitDef { x: number; y: number; radius: number }

// ── 區域（純展示用，供發現度/HUD 顯示） ─────────────────────────────────

export interface AreaDef { id: string; name: string; area: AdventureRect }

// ── 關卡定義 ─────────────────────────────────────────────────────────────

export interface AdventureStageDef {
  stageId: string
  world: { width: number; height: number }
  spawn: AdventureVec2
  /** greybox 階段可以留空：AdventureGame.ts 沒有 backgroundAsset 時畫純色
   * 地板代替，不強求正式美術到位才能玩。 */
  backgroundAsset?: string
  groundColor: number
  colliders: ColliderDef[]
  areas: AreaDef[]
  npcs: NpcDef[]
  dialogues: DialogueDef[]
  triggers: TriggerDef[]
  combatZones: CombatZoneDef[]
  puzzles: PuzzleDef[]
  collectibles: CollectibleDef[]
  secrets: SecretDef[]
  quests: QuestDef[]
  exit: ExitDef
  /** 呼應 forestRuins.ts 這關的 starConditions［1］/［2］門檻值，兩邊要手動
   * 對齊（沒有自動同步機制，改一邊記得改另一邊）。 */
  starThresholds: { purpleCoinCount: number; starPieceCount: number }
}

// ── 存檔進度（MetaState.adventureStageProgress[stageId]） ───────────────

export interface AdventureStageProgress {
  cleared: boolean
  bestStars: 0 | 1 | 2 | 3
  discoveredAreas: string[]
  collectedPurpleCoins: string[]
  collectedStarPieces: string[]
  openedTreasures: string[]
  completedQuests: string[]
  completedPuzzles: string[]
  discoveredSecrets: string[]
  /** 2026-08-19 補上：重玩關卡時已清過的戰鬤區不該重打一次（尤其死亡後
   * 重進——finishStage(false) 一樣會寫一份 progress，累積到死亡當下的
   * 進度都算數，不是只有真的通關才存）。 */
  clearedCombatZones: string[]
  flags: Record<string, boolean>
}

/** AdventureStageScreen 的 onAdventureStageEnd(result) 回呼payload——
 * App.tsx 依此寫回 meta.adventureStageProgress + gold/enhanceStoneCount/
 * heroProgress，比照現有 onCampaignStageEnd 的寫回模式。 */
export interface AdventureStageResult {
  won: boolean
  stars: 0 | 1 | 2 | 3
  progress: AdventureStageProgress
  pendingGold: number
  pendingEnhanceStones: number
  pendingHeroExp: number
}

export function defaultAdventureStageProgress(): AdventureStageProgress {
  return {
    cleared: false, bestStars: 0,
    discoveredAreas: [], collectedPurpleCoins: [], collectedStarPieces: [],
    openedTreasures: [], completedQuests: [], completedPuzzles: [], discoveredSecrets: [],
    clearedCombatZones: [],
    flags: {},
  }
}

// ── HUD 狀態（比照 ArenaHudState 的模式：AdventureGame 算好丟給 React 層） ─

export interface AdventureHudState {
  state: AdventureGameState
  purpleCoinCount: number
  purpleCoinTotal: number
  starPieceCount: number
  starPieceTotal: number
  activeDialogue: { speaker: string; text: string; hasMore: boolean } | null
  /** 「按互動鍵」之類的提示文字，null＝畫面上沒有可互動物件。 */
  interactionPrompt: string | null
  activeQuestTitle: string | null
  /** 一次性小提示（撿到道具/任務完成/秘密發現），AdventureStageScreen 顯示
   * 幾秒後自動消失。 */
  toast: string | null
  stageResult: {
    won: boolean
    stars: 0 | 1 | 2 | 3
    purpleCoinCount: number
    starPieceCount: number
    questCompleted: boolean
  } | null
}

// ── 英雄探索能力接口（文件第七節，第一版只留接口） ──────────────────────

export type ExplorationAbilityKind = 'ignite'

/** 第一版沒有任何英雄真的有探索能力，永遠回 false——火盆一律走「攻擊
 * hitsRequired 次點燃」這條路徑。之後要幫特定英雄加能力時，只需要改這個
 * 函式本體，呼叫端（PuzzleSystem）不用動。 */
export function heroHasExplorationAbility(_heroId: string, _kind: ExplorationAbilityKind): boolean {
  return false
}
