import type { CombatWaveDef } from '../adventureTypes'

/**
 * 2-1《雪線之外》三場 Combat 的波次資料，來源：交付包 encounters.json
 * （snowfield_2_1_room_02/03/05_encounter）。JSON 只給「總數＋波次數」，沒有
 * 明確拆每一波各多少隻——這裡依「先弱後強」拆成兩波，精英（room_05 的
 * eliteEnemies.frost_wolf:1）放在最後一波，呼應 stage_design.md「Boss 前
 * 形成第一個小 Build」的節奏敘述。
 */

/** room_02 白雪小徑：ice_goblin x3 + frost_skeleton x2。 */
export const SNOW_PATH_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'ice_goblin', count: 2 }, { enemyId: 'frost_skeleton', count: 1 }],
  [{ enemyId: 'ice_goblin', count: 1 }, { enemyId: 'frost_skeleton', count: 1 }],
]

/** room_03 冰河灘地：ice_goblin x3 + frost_archer x2（同房間有 ice_floor 危害）。 */
export const GLACIER_FLATS_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'ice_goblin', count: 2 }, { enemyId: 'frost_archer', count: 1 }],
  [{ enemyId: 'ice_goblin', count: 1 }, { enemyId: 'frost_archer', count: 1 }],
]

/** room_05 霜狼伏擊：frost_wolf x3 一般 + 精英 frost_wolf x1（leap 技能）。 */
export const WOLF_AMBUSH_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_wolf', count: 2 }],
  [{ enemyId: 'frost_wolf', count: 1 }, { enemyId: 'frost_wolf', count: 1, isElite: true }],
]
