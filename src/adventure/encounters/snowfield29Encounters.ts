import type { CombatWaveDef } from '../adventureTypes'

/**
 * 2-9《永冬祭壇》六場 Combat 的波次資料，來源：官方 V5.1 設計配置包
 * `snowfield_2_9/encounters.json`。room_07 官方給 3 波（frost_archer x2 +
 * yeti_brute x1 + frost_skeleton x2），拆成弱→中→重收尾。
 */

export const FROSTVEIN_GALLERY_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_skeleton', count: 2 }, { enemyId: 'ice_goblin', count: 1 }],
  [{ enemyId: 'frost_skeleton', count: 1 }, { enemyId: 'ice_goblin', count: 2 }],
]

/** room_04 白霧戰區（同房間有 whiteout 危害）：frost_archer x3 + frost_wolf x2。 */
export const WHITE_MIST_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_archer', count: 2 }, { enemyId: 'frost_wolf', count: 1 }],
  [{ enemyId: 'frost_archer', count: 1 }, { enemyId: 'frost_wolf', count: 1 }],
]

export const ICEVEIN_HALL_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_skeleton', count: 2 }],
  [{ enemyId: 'frost_skeleton', count: 1 }, { enemyId: 'yeti_brute', count: 1 }],
]

export const RITUAL_COURTYARD_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'ice_goblin', count: 2 }],
  [{ enemyId: 'ice_goblin', count: 1 }, { enemyId: 'ice_shaman', count: 1 }],
]

export const QUEEN_ANTECHAMBER_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_skeleton', count: 2 }],
  [{ enemyId: 'frost_archer', count: 2 }],
  [{ enemyId: 'yeti_brute', count: 1 }],
]

/** room_08 永冬王座前（Boss room）：精英冰霜女王 x1，單波無雜兵。 */
export const WINTER_THRONE_BOSS_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_queen', count: 1, isElite: true }],
]
