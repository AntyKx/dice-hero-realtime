import type { CombatWaveDef } from '../adventureTypes'

/** 古老石橋 Combat #1：兩波，第一波森林史萊姆試探，第二波史萊姆+哥布林
 * 混編收尾（見 src/arena/enemies.ts 的 forest_slime/goblin_warrior）。 */
export const BRIDGE_COMBAT_WAVES: CombatWaveDef[][] = [
  [{ enemyId: 'forest_slime', count: 3 }],
  [{ enemyId: 'forest_slime', count: 2 }, { enemyId: 'goblin_warrior', count: 2 }],
]

/** 哥布林營地 Combat #2：一波，戰士+弓手+薩滿混編。薩滿是支援型敵人，
 * Adventure Stage 的 Greybox 輕量戰鬤系統一律簡化成近戰接觸傷害（見
 * AdventureCombatController.ts 開頭註解），不重現 enemyAI.ts 的 support AI。 */
export const GOBLIN_CAMP_COMBAT_WAVES: CombatWaveDef[][] = [
  [
    { enemyId: 'goblin_warrior', count: 2 },
    { enemyId: 'goblin_archer', count: 2 },
    { enemyId: 'forest_shaman', count: 1 },
  ],
]

/** 花圃支線任務「遺失的小熊」擊殺目標：兩隻弱小史萊姆。不是正式 Combat
 * Zone，QuestSystem 接受任務後玩家走近花圃才直接呼叫
 * AdventureCombatController.spawnHostileEnemy 生成（見 QuestDef.killTarget）。 */
export const QUEST_FLOWER_BED_ENEMY_ID = 'forest_slime'
export const QUEST_FLOWER_BED_ENEMY_COUNT = 2
