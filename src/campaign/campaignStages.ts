/**
 * 全部篇章的關卡資料彙總查表——目前只有森林遺跡一個篇章，未來新篇章
 * （chapters/ 底下加新檔）只需要在這裡多一行 import + 併入陣列。
 */
import type { CampaignStage } from './campaignTypes'
import { FOREST_RUINS_STAGES } from './chapters/forestRuins'

export const ALL_CAMPAIGN_STAGES: CampaignStage[] = [...FOREST_RUINS_STAGES]

export function getCampaignStage(stageId: string): CampaignStage | undefined {
  return ALL_CAMPAIGN_STAGES.find(s => s.id === stageId)
}

export function getChapterStages(campaignId: string): CampaignStage[] {
  return ALL_CAMPAIGN_STAGES.filter(s => s.campaignId === campaignId).sort((a, b) => a.stageNumber - b.stageNumber)
}

/** 下一關的 id（線性推進用）；沒有下一關（該篇章最後一關）回傳 null。 */
export function getNextStageId(stageId: string): string | null {
  const stage = getCampaignStage(stageId)
  if (!stage) return null
  const chapterStages = getChapterStages(stage.campaignId)
  const idx = chapterStages.findIndex(s => s.id === stageId)
  if (idx === -1 || idx === chapterStages.length - 1) return null
  return chapterStages[idx + 1].id
}
