import type { CombatWaveDef } from '../adventureTypes'

/**
 * 2-10《極寒王座》五場 Combat 的波次資料，來源：官方 V5.1 設計配置包
 * `snowfield_2_10/encounters.json`。room_05（核心匯口）官方給 3 波，
 * room_06（冰心階梯）也是 3 波，都拆成弱→中→重收尾。
 */

export const THRONE_OUTER_COURT_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_skeleton', count: 2 }, { enemyId: 'frost_archer', count: 2 }],
  [{ enemyId: 'frost_skeleton', count: 2 }, { enemyId: 'frost_archer', count: 1 }],
]

/** room_04a 冰晶長廊（同房間有 falling_icicle 危害）：frost_archer x3 + ice_shaman x1。 */
export const CRYSTAL_GALLERY_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_archer', count: 2 }],
  [{ enemyId: 'frost_archer', count: 1 }, { enemyId: 'ice_shaman', count: 1 }],
]

/** room_04b 霜骨道路（同房間有 ice_floor 危害）：yeti_brute x1 + frost_wolf x3。 */
export const FROSTBONE_ROAD_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_wolf', count: 2 }],
  [{ enemyId: 'frost_wolf', count: 1 }, { enemyId: 'yeti_brute', count: 1 }],
]

export const CORE_CONFLUENCE_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'ice_goblin', count: 2 }],
  [{ enemyId: 'frost_skeleton', count: 2 }, { enemyId: 'frost_archer', count: 1 }],
  [{ enemyId: 'frost_skeleton', count: 1 }, { enemyId: 'frost_archer', count: 1 }],
]

export const ICE_CORE_STAIRS_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_archer', count: 2 }],
  [{ enemyId: 'ice_shaman', count: 1 }],
  [{ enemyId: 'yeti_brute', count: 1 }],
]

/** room_08 極寒王座（Final Boss room）：精英冰霜巨龍 x1，單波無雜兵，帶冰息 cone 技能。 */
export const ICE_DRAGON_BOSS_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'ice_dragon', count: 1, isElite: true }],
]
