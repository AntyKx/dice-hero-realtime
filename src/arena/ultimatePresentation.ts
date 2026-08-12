/**
 * 必殺技 Cut-in 演出的純資料/型別（2026-08）。執行期狀態機（含 Pixi 物件
 * 參照）在 ArenaGame.ts 的 UltimatePresentationState，這裡只放時間軸常數
 * 跟視覺調校數值，方便之後單獨調整不用去翻主檔案。
 */

export type UltimatePresentationPhase = 'freeze' | 'cutin'
// 沒有對應「非啟用」的第三種 phase 值——非啟用狀態純粹用 active:false 表示，
// 跟既有 TelegraphInstance.resolved 用 boolean 不用 enum 的做法一致。

export const ULTIMATE_FREEZE_SEC = 0.3           // 純定格 hitstop（規格 0.2~0.4s）
export const ULTIMATE_CUTIN_SEC = 0.8            // cut-in 演出總長（規格 0.6~1.0s）
export const ULTIMATE_CUTIN_SLIDE_IN_SEC = 0.2   // cutin 開頭滑入/淡入子區間
export const ULTIMATE_CUTIN_FADE_OUT_SEC = 0.15  // cutin 尾端淡出子區間

export const ULTIMATE_CUTIN_BACKDROP_ALPHA = 0.72
export const ULTIMATE_CUTIN_BACKDROP_COLOR = 0x000000
export const ULTIMATE_CUTIN_PORTRAIT_HEIGHT_RATIO = 0.62          // 立繪高度佔畫面高度比例
export const ULTIMATE_CUTIN_PORTRAIT_FALLBACK_HEIGHT_RATIO = 0.32 // fallback 用現有 sprite 時縮小一點（低解析度放太大會糊）
export const ULTIMATE_CUTIN_TITLE_COLOR = 0xffe9a8    // 沿用飄字的金色
export const ULTIMATE_CUTIN_TITLE_SIZE = 34
export const ULTIMATE_CUTIN_SUBTITLE_COLOR = 0xff8a3c // 沿用 applyUltimateDamage 光爆的橘色
export const ULTIMATE_CUTIN_SUBTITLE_SIZE = 22
export const ULTIMATE_CUTIN_SPEEDLINE_COUNT = 16
export const ULTIMATE_CUTIN_SPEEDLINE_COLOR = 0xffffff
