/**
 * forest_1_1「迷途的林間入口」正式美術 Manifest（2026-08-19，
 * ASTERVOW_Forest01_Claude_ArtPack）。集中管理素材路徑跟顯示尺寸，
 * AdventureGame.ts／各 system 不應該散落硬編碼路徑，一律從這裡讀。
 *
 * 素材來源：public/assets/adventure/forest_1_1/source/ 5 張圖，經
 * scripts/import-forest01-art.mjs 用 sharp 的 alpha connected-components
 * 自動切成獨立貼圖，檔名是切圖順序（interactive_01.webp 等），底下用
 * 有語意的常數名對應，方便之後對照 _slice_manifest.json 核對。
 *
 * 每個 sprite 只給路徑，不寫死 scale——顯示尺寸一律用
 * heroSpriteRig.ts 的 setSpriteHeight(sprite, TARGET_HEIGHT) 在建立時
 * 依貼圖實際像素高度換算，跟英雄/敵人逐幀動畫的做法一致。
 */

const BASE = '/assets/adventure/forest_1_1'

// 2026-08-19 Room Transition 改版：原本這裡有 FOREST01_GROUND/
// FOREST01_FOREGROUND（單一連續世界的大圖，V2 修過 runtime 拉伸問題）跟
// FOREST01_PROPS_ART（裝飾道具 sprite），現在都被 9 張房間背景取代（見
// forestRuins01.ts 的 rooms[].background）——那批圖已經把裝飾直接畫進場景，
// 這兩份 manifest 沒有用了，整份刪掉，不留死 export。

export const FOREST01_NPC_ART = {
  idle: `${BASE}/entities/entities_01.webp`,
  talking: `${BASE}/entities/entities_02.webp`,
  happy: `${BASE}/entities/entities_03.webp`,
}

export const FOREST01_COLLECTIBLE_ART = {
  purpleCoin: `${BASE}/entities/entities_07.webp`,
  starPiece: `${BASE}/entities/entities_05.webp`,
  pickupSparkle: `${BASE}/entities/entities_06.webp`,
  dirtyTeddy: `${BASE}/entities/entities_04.webp`,
}

/** 支線任務花圃小怪的靜態立繪（沒有走路/攻擊/受擊逐幀），只有單張圖，
 * AdventureCombatController 遇到有對應項目的 enemyId 時改用靜態 Sprite，
 * 不呼叫 frameLoader。三色只是美術變化，遊戲數值仍是同一個 forest_slime。 */
export const FOREST01_ENEMY_STATIC_ART: Partial<Record<string, string>> = {
  forest_slime: `${BASE}/entities/entities_08.webp`,
}

export const FOREST01_INTERACTIVE_ART = {
  /** 三個火盆各自固定配色，跟 forestRuins01.ts 的 brazier_01/02/03 id 對應。 */
  brazierLit: {
    brazier_01: `${BASE}/interactive/interactive_07.webp`, // 橙焰
    brazier_02: `${BASE}/interactive/interactive_06.webp`, // 藍焰
    brazier_03: `${BASE}/interactive/interactive_08.webp`, // 綠焰
  } as Record<string, string>,
  brazierUnlit: `${BASE}/interactive/interactive_09.webp`,
  vineGateClosed: `${BASE}/interactive/interactive_12.webp`,
  vineGateOpen: `${BASE}/interactive/interactive_13.webp`,
  wallIntact: `${BASE}/interactive/interactive_14.webp`,
  wallBroken: `${BASE}/interactive/interactive_15.webp`,
  treasureOpen: `${BASE}/interactive/interactive_18.webp`,
  treasureClosed: `${BASE}/interactive/interactive_19.webp`,
}

/** 各類物件的目標顯示高度（px），建立 Sprite 時搭配
 * heroSpriteRig.ts 的 setSpriteHeight() 依貼圖實際像素高度換算縮放。
 * 英雄本身走 HERO_RENDER_HEIGHT（60px）這一路現有邏輯，NPC 走
 * forestRuins01VisualTuning.ts 的 FOREST01_ADVENTURE_DISPLAY.npcHeight，
 * 都不在這裡重複定義。 */
// 2026-08-20：整體物件太小（跟英雄一起被回報），紫幣/星星碎片/任務道具/
// 寶箱一起放大到約 3 倍（見 forestRuins01VisualTuning.ts 同一輪英雄放大的
// 註解，換算邏輯一致）。brazier/vineGate/wall 維持原尺寸不動——這三個是
// 卡進謎題 collider 寬高算出來的，跟角色觀感無關，使用者這次也沒提到。
export const FOREST01_DISPLAY_HEIGHT = {
  purpleCoin: 65,
  starPiece: 90,          // 比紫幣約 1.4 倍
  pickupSparkle: 85,
  dirtyTeddy: 85,
  brazier: 48,
  vineGate: 190,          // 撐滿謎題藤蔓門 collider 的寬度（見 forestRuins01.ts puzzle_vine_gate）
  wall: 210,              // 撐滿裂牆 collider 高度（見 secret02_wall）
  treasure: 130,
} as const
