import type { CombatWaveDef } from '../adventureTypes'

/**
 * 2-7《巨獸雪谷》五場 Combat 的波次資料，來源：官方 V5.1 設計配置包
 * `snowfield_2_7/encounters.json`。room_03a/room_04a 是「長安全路」，
 * room_03b/room_04b 是「短危險路」（各自帶 falling_icicle／ice_floor 危害）。
 */

export const HIGH_RIDGE_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_archer', count: 2 }, { enemyId: 'frost_skeleton', count: 1 }],
  [{ enemyId: 'frost_archer', count: 1 }, { enemyId: 'frost_skeleton', count: 2 }],
]

export const WINDCUT_TERRACE_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'ice_goblin', count: 2 }],
  [{ enemyId: 'ice_goblin', count: 2 }, { enemyId: 'yeti_brute', count: 1 }],
]

/** room_03b 冰落捷徑（同房間有 falling_icicle 危害）：frost_wolf x2 + frost_archer x1。 */
export const ICEFALL_SHORTCUT_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_wolf', count: 1 }, { enemyId: 'frost_archer', count: 1 }],
  [{ enemyId: 'frost_wolf', count: 1 }],
]

/** room_04b 滑冰谷底（同房間有 ice_floor 危害）：frost_wolf x3。 */
export const SLIPPERY_GULLY_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_wolf', count: 2 }],
  [{ enemyId: 'frost_wolf', count: 1 }],
]

export const TWIN_PATH_JUNCTION_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'yeti_brute', count: 1 }, { enemyId: 'frost_archer', count: 1 }],
  [{ enemyId: 'frost_archer', count: 1 }, { enemyId: 'frost_skeleton', count: 2 }],
]

/** room_06 暴君巢地（Boss room）：精英雪谷暴君（snow_troll）x1，帶重砸技能。 */
export const TYRANT_LAIR_BOSS_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'snow_troll', count: 1, isElite: true }],
]
