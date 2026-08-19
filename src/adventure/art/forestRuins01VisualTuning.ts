import { getHeroRenderHeight } from '../../arena/heroSpriteRig'

/**
 * Forest 01 Adventure 專用視覺調校。
 * 注意：這裡只調 Adventure，禁止改 Arena 的 HERO_RENDER_HEIGHT，避免戰鬥畫面比例一起被破壞。
 */
export const FOREST01_V2_ART = {
  ground: '/assets/adventure/forest_1_1/v2/ground/forest_1_1_ground_v2.webp',
  foreground: '/assets/adventure/forest_1_1/v2/foreground/forest_1_1_foreground_v2.webp',
  contactShadow: '/assets/adventure/forest_1_1/v2/fx/contact_shadow.png',
} as const

export interface AdventureCameraTuning {
  targetVisibleWorldWidth: number
  minScale: number
  maxScale: number
}

export const FOREST01_CAMERA_TUNING = {
  portrait: {
    targetVisibleWorldWidth: 620,
    minScale: 0.58,
    maxScale: 0.82,
  },
  landscapeMobileTablet: {
    targetVisibleWorldWidth: 980,
    minScale: 0.72,
    maxScale: 1.0,
  },
  desktop: {
    targetVisibleWorldWidth: 1400,
    minScale: 0.9,
    maxScale: 1.35,
  },
} as const satisfies Record<string, AdventureCameraTuning>

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/**
 * 讓不同裝置看到「差不多的遊戲視野」，而不是目前 1 world unit = 1 CSS px、
 * 螢幕越大就看到越多地圖。此 scale 必須同時套在 worldLayer.scale 與 Camera clamp。
 */
export function getForest01CameraScale(screenW: number, screenH: number): number {
  const portrait = screenH >= screenW
  const tuning = portrait
    ? FOREST01_CAMERA_TUNING.portrait
    : screenW < 1100
      ? FOREST01_CAMERA_TUNING.landscapeMobileTablet
      : FOREST01_CAMERA_TUNING.desktop
  return clamp(screenW / tuning.targetVisibleWorldWidth, tuning.minScale, tuning.maxScale)
}

/**
 * 探索畫面專用英雄顯示高度。沿用既有角色裁切差異，但整體比 Arena 60px 系統大。
 * 不要把這組值寫回 heroSpriteRig.ts。
 */
export function getAdventureHeroRenderHeight(heroId: string): number {
  return clamp(Math.round(getHeroRenderHeight(heroId) * 1.25), 82, 100)
}

export const FOREST01_ADVENTURE_DISPLAY = {
  npcHeight: 66,
  contactShadowWidth: 48,
  contactShadowHeight: 18,
  contactShadowAlpha: 0.28,
  contactShadowOffsetY: -2,
  foregroundNormalAlpha: 0.96,
  foregroundOccludedAlpha: 0.58,
  foregroundFadeMs: 180,
} as const
