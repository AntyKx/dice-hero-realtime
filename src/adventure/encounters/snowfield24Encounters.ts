import type { CombatWaveDef } from '../adventureTypes'

/**
 * 2-4《冰窟低語》五場 Combat 的波次資料，來源：官方 V5.1 設計配置包
 * `snowfield_2_4/encounters.json`。拆波規則跟其他雪原關卡一致：先弱後強，
 * Elite 放最後一波。
 */

/** room_02 藍晶甬道：frost_skeleton x3 + frost_archer x2。 */
export const BLUE_CRYSTAL_TUNNEL_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_skeleton', count: 2 }, { enemyId: 'frost_archer', count: 1 }],
  [{ enemyId: 'frost_skeleton', count: 1 }, { enemyId: 'frost_archer', count: 1 }],
]

/** room_03 冰柱廳（同房間有 frozen_zone 危害）：ice_goblin x3 + frost_archer x2。 */
export const ICICLE_HALL_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'ice_goblin', count: 2 }, { enemyId: 'frost_archer', count: 1 }],
  [{ enemyId: 'ice_goblin', count: 1 }, { enemyId: 'frost_archer', count: 1 }],
]

/** room_05 凍骨廊（同房間有 falling_icicle 危害）：frost_skeleton x3 + yeti_brute x1。 */
export const FROZEN_BONE_CORRIDOR_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_skeleton', count: 2 }],
  [{ enemyId: 'frost_skeleton', count: 1 }, { enemyId: 'yeti_brute', count: 1 }],
]

/** room_06 薩滿前庭：ice_goblin x3 + yeti_brute x1。 */
export const SHAMAN_FORECOURT_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'ice_goblin', count: 2 }],
  [{ enemyId: 'ice_goblin', count: 1 }, { enemyId: 'yeti_brute', count: 1 }],
]

/** room_07 冰霜祭台（Boss room）：ice_goblin x2 一般 + 精英 ice_shaman x1（自我治療）。 */
export const FROST_ALTAR_BOSS_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'ice_goblin', count: 2 }],
  [{ enemyId: 'ice_shaman', count: 1, isElite: true }],
]
