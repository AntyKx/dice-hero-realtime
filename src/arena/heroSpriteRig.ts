import type { Sprite } from 'pixi.js'
import type { AnimState } from './frameLoader'
import { STATE_FPS } from './frameLoader'

/**
 * 英雄逐幀動畫的顯示尺寸/攻擊觸發幀調校表，從 ArenaGame.ts 抽出來（2026-08-19，
 * 給 AdventureGame.ts 共用，避免重新踩一次「英雄整個共用一個裁切框後顯示
 * 變小」「攻擊幀觸發時機」這些已經調好的坑）。單一資料來源，ArenaGame.ts
 * 跟 AdventureGame.ts 都從這裡 import，不要各自維護一份。
 */

export const HERO_RENDER_HEIGHT = 60

/** 2026-08-18：火焰法師/死亡騎士/機關技師改成「整個角色共用一個裁切框」後，
 * 裁切畫布比舊版（同狀態內共用）明顯更高，用同一個 HERO_RENDER_HEIGHT 縮放
 * 角色反而變小——這裡個別放大回「新裁切框高度 ÷ 舊裁切框高度」換算出的倍率。 */
export const HERO_RENDER_HEIGHT_OVERRIDE: Partial<Record<string, number>> = {
  mage: 80,
  death_knight: 87,
  engineer: 72,
}

/** 攻擊觸發幀（0-indexed，攻擊播到這一格才真的開火）：預設抓中間那格；
 * 有明確 impactFrame 資料的角色照美術給的資料覆寫。 */
export const ATTACK_TRIGGER_FRAME_OVERRIDE: Partial<Record<string, number>> = {
  mage: 3,
  death_knight: 3,
  engineer: 3,
}

/** 不等速逐格時間（毫秒），依「這個狀態實際幀數是否等於這裡設計的張數」
 * 決定要不要套用——張數對不上就維持原本統一 STATE_FPS 換算出的等速播放。 */
export const DEFAULT_FRAME_DURATIONS_MS: Partial<Record<AnimState, number[]>> = {
  idle: [170, 160, 150, 170, 160, 150],
  walk: [90, 80, 85, 90, 80, 85],
  attack: [120, 70, 45, 65, 160],
  skill: [160, 90, 260],
}

export function getHeroRenderHeight(heroId: string): number {
  return HERO_RENDER_HEIGHT_OVERRIDE[heroId] ?? HERO_RENDER_HEIGHT
}

export function getAttackTriggerFrame(heroId: string, frameCount: number): number {
  return ATTACK_TRIGGER_FRAME_OVERRIDE[heroId] ?? Math.floor(frameCount / 2)
}

export function getFrameDurationSec(state: AnimState, frameIndex: number, frameCount: number): number {
  const arr = DEFAULT_FRAME_DURATIONS_MS[state]
  const ms = arr && arr.length === frameCount ? arr[frameIndex] : undefined
  return ms !== undefined ? ms / 1000 : 1 / STATE_FPS[state]
}

/** 播完整組動畫要用的總時長——非等速時要把每一格的自訂時間加總，不能直接拿
 * frameCount/STATE_FPS 算，不然狀態會在最後一格真的播完之前提早切回 idle。 */
export function getStateTotalDurationSec(state: AnimState, frameCount: number): number {
  const arr = DEFAULT_FRAME_DURATIONS_MS[state]
  if (arr && arr.length === frameCount) return arr.reduce((sum, ms) => sum + ms, 0) / 1000
  return frameCount / STATE_FPS[state]
}

/** 依貼圖實際高度重算縮放，讓角色顯示高度固定在 targetHeight。 */
export function setSpriteHeight(sprite: Sprite, targetHeight: number) {
  const scale = targetHeight / sprite.texture.height
  sprite.scale.set(scale)
}
