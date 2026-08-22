import type { CombatWaveDef } from '../adventureTypes'

/**
 * 2-8《冰封王城》六場 Combat 的波次資料，來源：官方 V5.1 設計配置包
 * `snowfield_2_8/encounters.json`。
 */

/** room_03 西街冰廊（同房間有 frost_tower 危害）：frost_skeleton x4 + frost_archer x2。 */
export const WEST_STREET_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_skeleton', count: 2 }, { enemyId: 'frost_archer', count: 1 }],
  [{ enemyId: 'frost_skeleton', count: 2 }, { enemyId: 'frost_archer', count: 1 }],
]

export const EAST_STREET_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'ice_goblin', count: 2 }, { enemyId: 'frost_archer', count: 2 }],
  [{ enemyId: 'ice_goblin', count: 2 }, { enemyId: 'frost_archer', count: 1 }],
]

export const BARRACKS_RUINS_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_skeleton', count: 2 }],
  [{ enemyId: 'frost_skeleton', count: 1 }, { enemyId: 'yeti_brute', count: 1 }],
]

export const NORTH_TOWER_AVENUE_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_archer', count: 2 }, { enemyId: 'ice_goblin', count: 1 }],
  [{ enemyId: 'frost_archer', count: 1 }, { enemyId: 'ice_goblin', count: 2 }],
]

/** room_08 冰鐘樓（同房間有 frost_tower 危害）：frost_skeleton x3 + ice_shaman x1。 */
export const ICE_BELL_TOWER_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_skeleton', count: 2 }],
  [{ enemyId: 'frost_skeleton', count: 1 }, { enemyId: 'ice_shaman', count: 1 }],
]

/** room_10 冰封將軍庭（Boss room）：frost_skeleton x2 一般 + 精英冰封將軍（frost_knight_captain）x1。 */
export const FROZEN_GENERAL_BOSS_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_skeleton', count: 2 }],
  [{ enemyId: 'frost_knight_captain', count: 1, isElite: true }],
]
