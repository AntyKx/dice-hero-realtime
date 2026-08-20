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
  /** 2026-08-19 Room Transition v2：false 表示這個 collider 純粹是視覺用
   * （藤蔓門/裂牆貼圖狀態切換），CollisionSystem 不會拿它擋路——實際「能不能
   * 過」改用 RoomTransitionDef.lockedByFlag 判斷。矩形對位錯誤只會讓貼圖
   * 顯示不準，不會再造成玩家卡死走不出去，比連續世界那套風險低很多。
   * 預設 true（維持舊有「collider 真的擋路」的行為，相容其他關卡）。 */
  blocksMovement?: boolean
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
  /** setsFlag：播完（一開始）順便記一個 flag，給 RoomTransitionDef.lockedByFlag
   * 用（例如祭壇劇情看過一次才能繼續往出口走）。 */
  | { type: 'start_cutscene'; cutsceneId: string; setsFlag?: string }

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
   * 結束時自動解除，不需要玩家額外操作。Room Transition 架構下通常留空
   * （戰鬤中 RoomSystem 本來就不檢查換房，見該檔案開頭註解），只有還在用
   * 連續世界的舊關卡才需要真的填 collider id。 */
  gateColliderIds: string[]
  /** 波次陣列：上一波清空才生下一波，呼應文件「Wave 1／Wave 2」設計。 */
  waves: CombatWaveDef[][]
  rewardGold: number
  rewardExp: number
  /** 清空時順便記一個 flag，給 RoomTransitionDef.lockedByFlag 用（例如清完
   * 哥布林營地才能往下一個房間走）。 */
  setsFlag?: string
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
  /** 任務完成後再次跟 NPC 對話要顯示的閒聊台詞（不是交任務當下那句「謝謝
   * 你」，是之後隨時回來找他都會看到的固定台詞）。選填，沒給就退回顯示
   * completeDialogueId（NpcController 的 fallback），不會再顯示
   * inProgressDialogueId（那句是「小熊還沒找到」，任務都完成了還顯示會
   * 很奇怪，2026-08-20 修掉的 bug 就是誤用了這個）。 */
  postCompleteDialogueId?: string
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

// ── 房間（Room Transition 架構，2026-08-19） ─────────────────────────────
//
// 取代前一版「連續大世界 + area-aware camera + 手繪多邊形碰撞」——那套在
// 兩輪實測都抓到「還是卡手」，而且我沒辦法在瀏覽器裡即時走過確認（見
// CollisionSystem.ts 開頭）。Room Transition 改成每個房間固定 1280x720、
// 彼此不視覺相連，玩家踩到出口 zone 就 fade+teleport 到下一間，鏡頭永遠只
// contain-fit 目前這個房間——不用連續世界的縫隙銜接，碰撞也只要「一個矩形
// +幾道動態門」，出錯機會小很多。
//
// 實作上，9 個房間貼在一張 3840x2160 的離屏 atlas 上（3x3 grid），
// stage.world 就是這張 atlas 的尺寸，每個房間有自己的 atlasOrigin；所有
// 既有系統（Puzzle/Secret/Quest/Combat/Collectible/Trigger）讀的
// x/y／rect 全部沿用「atlas 世界座標」（= atlasOrigin + local），不需要
// 另外做一套 local-only 的座標系統，這些 controller 完全不用改。

export interface RoomTransitionDef {
  id: string
  /** 房間 local 座標（0,0 為房間左上角）。 */
  zone: AdventureRect
  targetRoomId: string
  /** 進入下一個房間後，玩家要放在那個房間的哪個 local 座標。 */
  targetSpawnLocal: AdventureVec2
  /** 給定時，RoomSystem 只有在 game.flags[lockedByFlag] 為 true 才會真的
   * 觸發換房——玩家踩進 zone 但條件沒滿足時什麼都不會發生（原地不動）。
   * 三火盆謎題／哥布林營地戰鬤／祭壇劇情都是靠這個擋，不再用實體 collider
   * 卡住玩家的座標——這樣「gate 矩形沒對準」頂多變成「還沒解鎖」，不會變成
   * 玩家被憑空卡死走不出去（連續世界那版兩輪都栽在這種對位問題）。 */
  lockedByFlag?: string
}

/** 2026-08-20：靜態地形碰撞（岩石/木柱/水面/帳篷這類畫在房間美術裡、不會
 * 開關的障礙物）改成房間 local 座標——上一輪全部塞進 stage.colliders 的
 * world/atlas 座標，每加一個都要手動加 atlasOrigin，room_05 那次直接手算錯
 * 導致玩家一進房間就卡在南側入口的碰撞箱裡出不來。CollisionSystem.ts 只在
 * 檢查 activeRoom 的 terrainCollidersLocal 時統一加一次 atlasOrigin，資料
 * 端不用再算。真正需要「開關」的機關（藤蔓門/裂牆）維持留在
 * stage.colliders，那邊本來就需要 colliderActive 這個全域動態狀態。 */
export interface RoomTerrainColliderDef {
  id: string
  /** 房間 local 座標（0,0 為房間左上角），不含 atlasOrigin。 */
  rect: AdventureRect
}

export interface RoomDef {
  id: string
  name: string
  /** 這個房間的左上角在 3840x2160 atlas 世界座標裡的位置。 */
  atlasOrigin: AdventureVec2
  size: { width: number; height: number }
  background: string
  /** 選填的透明前景圖來源貼圖，跟 background 同尺寸(1080x1920)、除了要蓋住
   * 角色的物件（門樑/帳篷屋頂/拱門上緣）以外都是透明。純視覺遮擋，不參與
   * 碰撞判定（碰撞完全交給 terrainCollidersLocal）。 */
  foreground?: string
  /** 2026-08-20 修正：foreground 不能整張圖用固定 zIndex 蓋在角色上面——
   * 那樣不管玩家站在物件前面還後面都一定被蓋住，變成「角色被切一半」的
   * bug（原因：這個引擎全部角色/NPC/敵人都是用 zIndex=y 動態排序決定前後，
   * 固定 zIndex 直接打破這個規則）。正確做法是比照這套 y-sort 慣例：把
   * foreground 圖依每個獨立物件（每頂帳篷、每根門樑）切成多塊，每塊各自
   * 用自己的 zIndex=底部 y 座標跟玩家的 zIndex=y 比大小——玩家腳的 y 還沒
   * 超過物件底部時物件蓋住玩家（走到物件後面/上方），玩家 y 超過之後換
   * 玩家蓋住物件（走到物件前面），這樣才會隨著玩家位置動態切換前後。
   * rect 是 foreground 貼圖裡的裁切範圍（房間 local 座標），排序基準點
   * 用 rect 本身的下緣（y+height），不用另外存一個數字。 */
  foregroundPiecesLocal?: AdventureRect[]
  /** 房間 local 座標，玩家只能在這塊矩形（∪ 底下任一 transitions[].zone）
   * 內移動——CollisionSystem.ts 刻意把 walkableBounds 跟 transition zone
   * 兩者用 OR 判定，不要求兩塊矩形本身有沒有緊貼在一起，這樣才不會重演
   * 上一版矩形/多邊形對不齊留下縫隙的問題。 */
  walkableBoundsLocal: AdventureRect
  /** 這個矩形範圍內，依實際美術補的靜態地形障礙（岩石/木柱/水面/帳篷…）。 */
  terrainCollidersLocal?: RoomTerrainColliderDef[]
  spawnLocal: AdventureVec2
  transitions: RoomTransitionDef[]
}

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
  /** 只有 Room Transition 關卡才給（目前只有 forest_1_1）。 */
  rooms?: RoomDef[]
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
  /** 2026-08-20：走近 room_09 的 stage exit（但還沒真的踩到結算圈）時的
   * 提示文字——手機搖桿很難一次精準對準結算圈，先讓玩家知道「快到了」。
   * null＝不在提示範圍內。 */
  stageExitPrompt: string | null
  activeQuestTitle: string | null
  /** 一次性小提示（撿到道具/任務完成/秘密發現），AdventureStageScreen 顯示
   * 幾秒後自動消失。 */
  toast: string | null
  /** 2026-08-19 除錯用：🐞 debug mode 開啟時顯示 app.screen／window 尺寸跟
   * 目前房間縮放倍率——玩家回報「畫面沒填滿」但無法遠端裝置除錯，用這個
   * 讓玩家截圖直接把數字帶回來，不用我繼續憑空猜 CSS。null＝debug 模式關閉。 */
  debugScreenText: string | null
  stageResult: {
    won: boolean
    stars: 0 | 1 | 2 | 3
    purpleCoinCount: number
    starPieceCount: number
    questCompleted: boolean
    /** 2026-08-20：結算畫面直接顯示這趟賺到的獎勵，不用等回到關卡地圖才
     * 看到——實際寫回 meta 還是走 buildStageResult()/onAdventureStageEnd
     * 那條既有路徑，這裡純粹是提早給玩家看一眼。 */
    pendingGold: number
    pendingEnhanceStones: number
    pendingHeroExp: number
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
