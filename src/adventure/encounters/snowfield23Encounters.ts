import type { CombatWaveDef } from '../adventureTypes'

/**
 * 2-3《白樺獵場》四場 Combat 的波次資料，來源：官方 V5.1 設計配置包
 * `snowfield_2_3/encounters.json`。room_05 是 Boss room（白牙狼王 frost_wolf
 * 精英 + 一般狼群混編），跟 2-1 霜狼伏擊同一種「精英 + 雜兵」組合，Elite
 * 自動解鎖 leap 技能（見 AdventureCombatController.ts ELITE_CHARGE_SKILL_ID）。
 */

/** room_03a 白樺高地：ice_goblin x4 + frost_archer x3。 */
export const BIRCH_HIGHLAND_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'ice_goblin', count: 2 }, { enemyId: 'frost_archer', count: 2 }],
  [{ enemyId: 'ice_goblin', count: 2 }, { enemyId: 'frost_archer', count: 1 }],
]

/** room_03b 風雪低谷（同房間有 snow_gust 危害）：frost_wolf x2 + frost_archer x1。 */
export const BLIZZARD_VALLEY_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_wolf', count: 1 }, { enemyId: 'frost_archer', count: 1 }],
  [{ enemyId: 'frost_wolf', count: 1 }],
]

/** room_04 狼跡匯口：frost_wolf x3 + ice_goblin x2。 */
export const WOLF_TRACK_JUNCTION_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_wolf', count: 2 }],
  [{ enemyId: 'frost_wolf', count: 1 }, { enemyId: 'ice_goblin', count: 2 }],
]

/** room_05 白牙獵場（Boss room）：frost_wolf x3 一般 + 精英白牙狼王 x1。 */
export const WHITE_FANG_BOSS_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_wolf', count: 2 }],
  [{ enemyId: 'frost_wolf', count: 1 }, { enemyId: 'frost_wolf', count: 1, isElite: true }],
]
