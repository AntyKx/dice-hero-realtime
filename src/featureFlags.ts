/**
 * 即時制轉向 v1 的範圍控制。關閉的系統邏輯全部保留，只在 UI 入口隱藏，
 * 之後要接回即時戰鬥時把對應項目打開即可。見 REALTIME_PIVOT_PLAN.md §4。
 */
export const FEATURE_FLAGS = {
  equipment: true,
  talents: true,
  dungeons: true,
  leaderboard: false,
  potionsAndCurses: false,
  worldCup: false, // 世界盃競猜（2026-08 下架）：底層邏輯/資料保留，只隱藏入口，之後要恢復直接打開即可
  // 回合制主線（地圖/戰鬥/獎勵）已被 arena_run 取代——新開局一律進即時戰鬥，
  // 這條路徑現在只有「繼續冒險」讀到轉向前的舊存檔時才會用到，故一併關閉
  // 入口。底層 saveRun/loadSavedRun/SAVE_PHASES 邏輯不動，之後真的要幫
  // arena_run 做中途存檔可以重新利用。
  turnBasedMainline: false,
} as const
