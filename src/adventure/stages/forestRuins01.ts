import { compileAdventureMap } from '../maps/compileAdventureMap'
import { FOREST_RUINS_01_MAP_SOURCE } from '../maps/forestRuins01MapSource'

/**
 * Runtime Forest Ruins 01 stage.
 *
 * Do not hand-author gameplay world coordinates in this file anymore.
 * Edit ../maps/forestRuins01MapSource.ts using room-local coordinates; the map
 * compiler validates and converts it to AdventureStageDef for the existing
 * AdventureGame systems.
 */
export const FOREST_RUINS_01_STAGE = compileAdventureMap(FOREST_RUINS_01_MAP_SOURCE)
