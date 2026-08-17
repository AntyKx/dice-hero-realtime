/**
 * 全部篇章的關卡資料彙總查表——2026-08-16 加入雪原/魔王城後共三個篇章，
 * 同日稍晚再加入裂隙前兆/深海遺城各 3 個子章節共九個篇章。新篇章
 * （chapters/ 底下加新檔）只需要在這裡多一行 import + 併入陣列。
 */
import type { CampaignStage } from './campaignTypes'
import { FOREST_RUINS_STAGES } from './chapters/forestRuins'
import { SNOWFIELD_STAGES } from './chapters/snowfield'
import { DEMON_CASTLE_STAGES } from './chapters/demonCastle'
import { RIFT_OMEN_BROKEN_SKY_STAGES } from './chapters/riftOmenBrokenSky'
import { RIFT_OMEN_VOID_CHASM_STAGES } from './chapters/riftOmenVoidChasm'
import { RIFT_OMEN_ECLIPSE_CORE_STAGES } from './chapters/riftOmenEclipseCore'
import { DEEP_SEA_CORAL_SHALLOWS_STAGES } from './chapters/deepSeaCoralShallows'
import { DEEP_SEA_SUNKEN_CAPITAL_STAGES } from './chapters/deepSeaSunkenCapital'
import { DEEP_SEA_EMPEROR_ABYSS_STAGES } from './chapters/deepSeaEmperorAbyss'

export const ALL_CAMPAIGN_STAGES: CampaignStage[] = [
  ...FOREST_RUINS_STAGES, ...SNOWFIELD_STAGES, ...DEMON_CASTLE_STAGES,
  ...RIFT_OMEN_BROKEN_SKY_STAGES, ...RIFT_OMEN_VOID_CHASM_STAGES, ...RIFT_OMEN_ECLIPSE_CORE_STAGES,
  ...DEEP_SEA_CORAL_SHALLOWS_STAGES, ...DEEP_SEA_SUNKEN_CAPITAL_STAGES, ...DEEP_SEA_EMPEROR_ABYSS_STAGES,
]

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
