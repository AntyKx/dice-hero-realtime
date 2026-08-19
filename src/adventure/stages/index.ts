import type { AdventureStageDef } from '../adventureTypes'
import { FOREST_RUINS_01_STAGE } from './forestRuins01'

/** Adventure Stage 關卡登記表——目前只有 forest_1_1，之後新增關卡在這裡
 * 加一筆即可，App.tsx 的 isAdventureStageId() 判斷跟著自動涵蓋。 */
export const ADVENTURE_STAGES: Record<string, AdventureStageDef> = {
  forest_1_1: FOREST_RUINS_01_STAGE,
}

export function getAdventureStageDef(stageId: string): AdventureStageDef | undefined {
  return ADVENTURE_STAGES[stageId]
}

export function isAdventureStageId(stageId: string | undefined): boolean {
  return !!stageId && stageId in ADVENTURE_STAGES
}
