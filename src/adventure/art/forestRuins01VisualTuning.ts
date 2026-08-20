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

export const FOREST01_ADVENTURE_DISPLAY = {
  npcHeight: 190,
  contactShadowWidth: 105,
  contactShadowHeight: 40,
  contactShadowAlpha: 0.28,
  contactShadowOffsetY: -4,
} as const
