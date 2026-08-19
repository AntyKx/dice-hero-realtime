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

export const FOREST01_GROUND = `${BASE}/ground/forest_1_1_ground.webp`
export const FOREST01_FOREGROUND = `${BASE}/foreground/forest_1_1_foreground.webp`

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
  altarObelisk: `${BASE}/interactive/interactive_01.webp`,
  altarFlame: [
    `${BASE}/interactive/interactive_02.webp`,
    `${BASE}/interactive/interactive_03.webp`,
    `${BASE}/interactive/interactive_04.webp`,
    `${BASE}/interactive/interactive_05.webp`,
  ] as const,
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
  sealedDoor: `${BASE}/interactive/interactive_16.webp`,
  exitGlow: `${BASE}/interactive/interactive_17.webp`,
  treasureOpen: `${BASE}/interactive/interactive_18.webp`,
  treasureClosed: `${BASE}/interactive/interactive_19.webp`,
}

/** 純裝飾用環境道具（哥布林營地/遺跡廣場/花圃擺設），不參與互動邏輯，
 * AdventureGame 只會在建場景時一次性擺放，不會被任何 system 讀取狀態。 */
export const FOREST01_PROPS_ART = {
  goblinTent1: `${BASE}/props/props_01.webp`,
  goblinTent2: `${BASE}/props/props_04.webp`,
  campfire: `${BASE}/props/props_05.webp`,
  fenceStraight1: `${BASE}/props/props_02.webp`,
  fenceStraight2: `${BASE}/props/props_06.webp`,
  fencePostCluster: `${BASE}/props/props_07.webp`,
  fencePost1: `${BASE}/props/props_08.webp`,
  fencePost2: `${BASE}/props/props_09.webp`,
  crateStack: `${BASE}/props/props_10.webp`,
  crate1: `${BASE}/props/props_11.webp`,
  supplyStack: `${BASE}/props/props_12.webp`,
  crate2: `${BASE}/props/props_13.webp`,
  crate3: `${BASE}/props/props_14.webp`,
  barrel1: `${BASE}/props/props_15.webp`,
  barrel2: `${BASE}/props/props_16.webp`,
  barrel3: `${BASE}/props/props_17.webp`,
  ruinArchCluster: `${BASE}/props/props_18.webp`,
  ruinPillar1: `${BASE}/props/props_19.webp`,
  ruinWallCluster: `${BASE}/props/props_20.webp`,
  ruinPillar2: `${BASE}/props/props_21.webp`,
  ruinWallLong: `${BASE}/props/props_22.webp`,
  rubbleCluster: `${BASE}/props/props_23.webp`,
  flowerFencePurple: `${BASE}/props/props_24.webp`,
  flowerFenceYellow: `${BASE}/props/props_25.webp`,
  flowerFencePost1: `${BASE}/props/props_26.webp`,
  flowerFencePost2: `${BASE}/props/props_27.webp`,
  flowerFencePost3: `${BASE}/props/props_28.webp`,
}

/** 各類物件的目標顯示高度（px），建立 Sprite 時搭配
 * heroSpriteRig.ts 的 setSpriteHeight() 依貼圖實際像素高度換算縮放。
 * 英雄本身走 HERO_RENDER_HEIGHT（60px）這一路現有邏輯，不在這裡重複定義。 */
export const FOREST01_DISPLAY_HEIGHT = {
  npc: 50,               // 「小型 Q 版比例，不要當大型立繪」，比英雄 60px 略小
  purpleCoin: 20,
  starPiece: 28,          // 比紫幣約 1.4 倍
  pickupSparkle: 26,
  dirtyTeddy: 26,
  enemyStatic: 40,
  altarObelisk: 150,
  altarFlame: 46,
  brazier: 48,
  vineGate: 190,          // 撐滿謎題藤蔓門 collider 的寬度（見 forestRuins01.ts puzzle_vine_gate）
  wall: 210,              // 撐滿裂牆 collider 高度（見 secret02_wall）
  sealedDoor: 160,
  exitGlow: 130,
  treasure: 40,
  propSmall: 44,          // 柵欄柱/木箱/木桶等小型裝飾
  propMedium: 70,         // 石柱/長牆/花圃柵欄等中型裝飾
  propLarge: 130,         // 帳篷/營火/遺跡拱門群等大型裝飾
} as const
