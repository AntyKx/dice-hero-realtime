import type { CombatWaveDef } from '../adventureTypes'

/**
 * 2-6《碎冰之湖》五場 Combat 的波次資料，來源：官方 V5.1 設計配置包
 * `snowfield_2_6/encounters.json`。
 */

export const SW_ICE_SHORE_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_wolf', count: 2 }, { enemyId: 'frost_archer', count: 1 }],
  [{ enemyId: 'frost_wolf', count: 1 }, { enemyId: 'frost_archer', count: 1 }],
]

/** room_03 西岸裂冰（同房間有 thin_ice 危害）：ice_goblin x3 + frost_skeleton x3。 */
export const W_ICEBREAK_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'ice_goblin', count: 2 }, { enemyId: 'frost_skeleton', count: 1 }],
  [{ enemyId: 'ice_goblin', count: 1 }, { enemyId: 'frost_skeleton', count: 2 }],
]

export const N_ICE_RING_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_archer', count: 2 }],
  [{ enemyId: 'frost_archer', count: 1 }, { enemyId: 'yeti_brute', count: 1 }],
]

export const E_SNOWBANK_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_wolf', count: 2 }],
  [{ enemyId: 'frost_wolf', count: 1 }, { enemyId: 'ice_goblin', count: 2 }],
]

/** room_06 東南冰灘（同房間有 thin_ice 危害）：frost_skeleton x3 + frost_archer x2。 */
export const SE_ICE_FLAT_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_skeleton', count: 2 }, { enemyId: 'frost_archer', count: 1 }],
  [{ enemyId: 'frost_skeleton', count: 1 }, { enemyId: 'frost_archer', count: 1 }],
]

/** room_08 冰晶巨像台（Boss room）：精英冰晶巨像 x1，單波無雜兵。 */
export const CRYSTAL_COLOSSUS_BOSS_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'ice_golem_colossus', count: 1, isElite: true }],
]
