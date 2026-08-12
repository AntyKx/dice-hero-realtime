/**
 * 森林遺跡進度的純函式（讀取/彙總/解鎖判斷），不碰 React state、不直接寫
 * localStorage——寫入走 App.tsx 既有的 `updateMeta()` 模式，這裡只回傳
 * 新的 MetaState 片段。衍生資料（總星數/最高進度/是否整章通關）刻意不存
 * 進存檔，每次從 `campaignStageProgress` 這個扁平表現算，避免跟真實進度
 * 兜不攏（參考 dungeonProgress 的教訓）。
 */
import type { MetaState } from '../types'
import { getChapterStages, getCampaignStage } from './campaignStages'
import { CHAPTER_STAR_MILESTONES } from './campaignTypes'

export function getStageProgress(meta: MetaState, stageId: string) {
  return meta.campaignStageProgress?.[stageId] ?? { cleared: false, stars: 0, firstClearClaimed: false }
}

/** 章節總星數（現算，不存檔）。 */
export function getChapterTotalStars(meta: MetaState, campaignId: string): number {
  return getChapterStages(campaignId).reduce((sum, s) => sum + getStageProgress(meta, s.id).stars, 0)
}

export function getChapterMaxStars(campaignId: string): number {
  return getChapterStages(campaignId).length * 3
}

/** 已達成的星數 Milestone（15/30/45/60）列表。 */
export function getReachedMilestones(meta: MetaState, campaignId: string): number[] {
  const total = getChapterTotalStars(meta, campaignId)
  return CHAPTER_STAR_MILESTONES.filter(m => total >= m)
}

/**
 * 關卡是否解鎖：第一關永遠解鎖；其餘關卡只要「上一關」cleared（不用三星）
 * 就解鎖，線性推進，比照設計文件第26節。
 */
export function isStageUnlocked(meta: MetaState, stageId: string): boolean {
  const stage = getCampaignStage(stageId)
  if (!stage) return false
  if (stage.stageNumber === 1) return true
  const chapterStages = getChapterStages(stage.campaignId)
  const prevStage = chapterStages.find(s => s.stageNumber === stage.stageNumber - 1)
  if (!prevStage) return true
  return getStageProgress(meta, prevStage.id).cleared
}

/**
 * 一次關卡結算後寫回進度：星數只升不降、cleared/firstClearClaimed 只會從
 * false 變 true。回傳新的 MetaState，供 `updateMeta(m => recordStageResult(m, ...))`
 * 這種寫法直接使用。
 */
export function recordStageResult(meta: MetaState, stageId: string, starsEarned: number): MetaState {
  const prev = getStageProgress(meta, stageId)
  const next = {
    cleared: prev.cleared || starsEarned > 0,
    stars: Math.max(prev.stars, starsEarned),
    firstClearClaimed: prev.firstClearClaimed, // 首通獎勵是否已領，由呼叫端另外視情況設成 true（跟星數結算分開）
  }
  return {
    ...meta,
    campaignStageProgress: { ...meta.campaignStageProgress, [stageId]: next },
  }
}

/** 標記首通獎勵已領（呼叫端確認 `!prev.firstClearClaimed` 才會真的發獎勵）。 */
export function claimFirstClearReward(meta: MetaState, stageId: string): MetaState {
  const prev = getStageProgress(meta, stageId)
  return {
    ...meta,
    campaignStageProgress: { ...meta.campaignStageProgress, [stageId]: { ...prev, firstClearClaimed: true } },
  }
}
