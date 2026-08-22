import type { CombatWaveDef } from '../adventureTypes'

/**
 * 2-2《失聯哨站》五場 Combat 的波次資料，來源：主線設計文件
 * `ASTERVOW_雪原篇_2-1到2-10_完整劇情關卡地圖總整版.md` 的「2-2《失聯哨站》」
 * 段落「戰鬤與 Encounter」小節。文件只給「總數＋波次數」，拆波規則跟
 * snowfield21Encounters.ts 一致：先弱後強，Elite/精裝敵人放最後一波。
 */

/** room_02 破雪門道：ice_goblin x4 + frost_skeleton x2。 */
export const OUTPOST_GATE_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'ice_goblin', count: 2 }, { enemyId: 'frost_skeleton', count: 1 }],
  [{ enemyId: 'ice_goblin', count: 2 }, { enemyId: 'frost_skeleton', count: 1 }],
]

/** room_04 西側牆：ice_goblin x4 + frost_archer x2。 */
export const WEST_WALL_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'ice_goblin', count: 2 }, { enemyId: 'frost_archer', count: 1 }],
  [{ enemyId: 'ice_goblin', count: 2 }, { enemyId: 'frost_archer', count: 1 }],
]

/** room_05 東側塔（同房間有 falling_icicle 危害）：frost_archer x3 + frost_skeleton x2。 */
export const EAST_TOWER_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'frost_archer', count: 2 }, { enemyId: 'frost_skeleton', count: 1 }],
  [{ enemyId: 'frost_archer', count: 1 }, { enemyId: 'frost_skeleton', count: 1 }],
]

/** room_06 封鎖走廊：yeti_brute x1 + ice_goblin x3。 */
export const BLOCKADE_HALL_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'ice_goblin', count: 2 }],
  [{ enemyId: 'yeti_brute', count: 1 }, { enemyId: 'ice_goblin', count: 1 }],
]

/** room_07 冰甲守衛（Boss room）：精英 yeti_brute x1，單波。 */
export const ICE_GUARD_BOSS_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'yeti_brute', count: 1, isElite: true }],
]
