import type { CombatWaveDef } from '../adventureTypes'

/**
 * 2-5《霜甲關門》四場 Combat 的波次資料，來源：官方 V5.1 設計配置包
 * `snowfield_2_5/encounters.json`。room_04 官方給的是 3 波（yeti_brute x1 +
 * ice_goblin x3 + frost_archer x2），拆成弱→中→重收尾；Boss room_06
 * 只有精英霜甲騎士長單波，沒有雜兵。
 */

/** room_02 外城雪道：ice_goblin x4 + frost_archer x2。 */
export const OUTER_CITY_SNOWPATH_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'ice_goblin', count: 2 }, { enemyId: 'frost_archer', count: 1 }],
  [{ enemyId: 'ice_goblin', count: 2 }, { enemyId: 'frost_archer', count: 1 }],
]

/** room_03 霜壁前庭：frost_skeleton x4 + frost_archer x2。 */
export const FROST_WALL_FORECOURT_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_skeleton', count: 2 }, { enemyId: 'frost_archer', count: 1 }],
  [{ enemyId: 'frost_skeleton', count: 2 }, { enemyId: 'frost_archer', count: 1 }],
]

/** room_04 城門廣場：yeti_brute x1 + ice_goblin x3 + frost_archer x2，官方給 3 波。 */
export const GATE_PLAZA_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'ice_goblin', count: 2 }],
  [{ enemyId: 'ice_goblin', count: 1 }, { enemyId: 'frost_archer', count: 2 }],
  [{ enemyId: 'yeti_brute', count: 1 }],
]

/** room_06 霜甲決鬥場（Boss room）：精英霜甲騎士長 x1，單波，沒有雜兵。 */
export const FROST_KNIGHT_DUEL_BOSS_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_knight_captain', count: 1, isElite: true }],
]
