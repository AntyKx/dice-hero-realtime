import type { AdventureStageDef } from '../adventureTypes'
import { FOREST_RUINS_01_STAGE } from './forestRuins01'
import { SNOWFIELD_21_STAGE } from './snowfield21'
import { SNOWFIELD_22_STAGE } from './snowfield22'
import { SNOWFIELD_23_STAGE } from './snowfield23'
import { SNOWFIELD_24_STAGE } from './snowfield24'
import { SNOWFIELD_25_STAGE } from './snowfield25'
import { SNOWFIELD_26_STAGE } from './snowfield26'
import { SNOWFIELD_27_STAGE } from './snowfield27'
import { SNOWFIELD_28_STAGE } from './snowfield28'
import { SNOWFIELD_29_STAGE } from './snowfield29'
import { SNOWFIELD_210_STAGE } from './snowfield210'

/** Adventure Stage 關卡登記表——新增關卡在這裡加一筆即可，App.tsx 的
 * isAdventureStageId() 判斷跟著自動涵蓋。 */
export const ADVENTURE_STAGES: Record<string, AdventureStageDef> = {
  forest_1_1: FOREST_RUINS_01_STAGE,
  snowfield_2_1: SNOWFIELD_21_STAGE,
  snowfield_2_2: SNOWFIELD_22_STAGE,
  snowfield_2_3: SNOWFIELD_23_STAGE,
  snowfield_2_4: SNOWFIELD_24_STAGE,
  snowfield_2_5: SNOWFIELD_25_STAGE,
  snowfield_2_6: SNOWFIELD_26_STAGE,
  snowfield_2_7: SNOWFIELD_27_STAGE,
  snowfield_2_8: SNOWFIELD_28_STAGE,
  snowfield_2_9: SNOWFIELD_29_STAGE,
  snowfield_2_10: SNOWFIELD_210_STAGE,
}

export function getAdventureStageDef(stageId: string): AdventureStageDef | undefined {
  return ADVENTURE_STAGES[stageId]
}

export function isAdventureStageId(stageId: string | undefined): boolean {
  return !!stageId && stageId in ADVENTURE_STAGES
}
