import { getHeroRenderHeight } from '../../arena/heroSpriteRig'

/**
 * Forest 01 Adventure 專用視覺調校。
 * 注意：這裡只調 Adventure，禁止改 Arena 的 HERO_RENDER_HEIGHT，避免戰鬥畫面比例一起被破壞。
 */
export const FOREST01_V2_ART = {
  contactShadow: '/assets/adventure/forest_1_1/v2/fx/contact_shadow.png',
} as const

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/**
 * 探索畫面專用英雄顯示高度。沿用既有角色裁切差異，但整體比 Arena 60px 系統大。
 * 不要把這組值寫回 heroSpriteRig.ts。
 *
 * 2026-08-20：房間世界座標是 1080x1920（Room Transition v2），螢幕上實際
 * cover-fit 縮放約 0.455（見 CameraSystem.ts），舊的 1.25 倍率換算下來英雄
 * 只有 82~100 世界單位 ≈ 螢幕 37~45px，玩家回報「整體人物跟地圖物件都很
 * 小」——把倍率跟 clamp 範圍一起放大到 2.75 倍／180~220，換算螢幕高度約
 * 82~100px，跟手機 RPG 常見角色顯示比例接近。
 */
export function getAdventureHeroRenderHeight(heroId: string): number {
  return clamp(Math.round(getHeroRenderHeight(heroId) * 2.75), 180, 220)
}

/** 2026-08-20：敵人立繪跟 hitbox 這一輪一起補上——英雄放大到 180~220 之後，
 * 敵人如果還是照 EnemyTypeDef.spriteHeight 原始比例顯示，兩邊會明顯不成
 * 比例（敵人看起來比英雄矮小很多）。1.15 倍是刻意讓一般雜兵略小於英雄、
 * Boss 級（spriteHeight 本來就比較大）能接近甚至持平英雄高度，不是統一套
 * 同一個數字。 */
export function getAdventureEnemyRenderHeight(baseHeight: number): number {
  return clamp(Math.round(baseHeight * 1.15), 150, 230)
}

/** Adventure 的邏輯碰撞半徑，跟角色腳底的 world-space 座標共用同一套基準。
 * 半徑不是整張立繪的寬度，是角色腳下實際佔用的圓形身體範圍——用顯示高度
 * 換算，放大立繪後 hitbox 會跟著等比放大，不會停留在放大前的舊尺寸，
 * 造成「看起來已經碰到了但判定沒過」。 */
export const ADVENTURE_PLAYER_HITBOX_RADIUS = 22

export function getAdventureEnemyHitboxRadius(renderHeight: number): number {
  return clamp(Math.round(renderHeight * 0.18), 18, 34)
}

export const FOREST01_ADVENTURE_DISPLAY = {
  npcHeight: 210,
  contactShadowWidth: 105,
  contactShadowHeight: 40,
  contactShadowAlpha: 0.28,
  contactShadowOffsetY: -4,
} as const
