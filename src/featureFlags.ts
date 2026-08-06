/**
 * 即時制轉向 v1 的範圍控制。關閉的系統邏輯全部保留，只在 UI 入口隱藏，
 * 之後要接回即時戰鬥時把對應項目打開即可。見 REALTIME_PIVOT_PLAN.md §4。
 */
export const FEATURE_FLAGS = {
  equipment: false,
  talents: false,
  dungeons: false,
  leaderboard: false,
  potionsAndCurses: false,
} as const
