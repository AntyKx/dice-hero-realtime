/**
 * 森林遺跡（forest_ruins）1-1 ~ 1-10 固定關卡資料。
 *
 * 2026-08-16 從 20 關砍到 10 關（見「森林雪原魔王城_10關自然冒險地圖包」
 * 重新設計的地圖美術）：不是砍半留單數關，是重新設計節奏——保留 V2 版本
 * 驗證過的機制多樣性（destroy/hunt/priority-kill/defense/elite hunt），
 * 只是壓縮成 5 關普通內容 + 1-5 中王 + 1-10 最終王，不再是 4 個 Boss + 雙王
 * 關的節奏。原本 15/18/20 用到的 ancient_treant_guardian/dark_knight_vanguard
 * 兩隻 Boss 這次沒有位置放，資料留在 enemies.ts/bossSkills.ts 不刪，純粹
 * 未使用。custom 星星條件對應的 stage id 判斷邏輯已同步搬到 ArenaGame.ts
 * 的 evaluateCustomStar()/shaman priority-kill 區塊（forest_1_3/1_4/1_7）。
 */
import type { CampaignStage } from '../campaignTypes'
import { CAMPAIGN_ID_FOREST_RUINS } from '../campaignTypes'

const campaignId = CAMPAIGN_ID_FOREST_RUINS

function stage(n: number, partial: Omit<CampaignStage, 'id' | 'campaignId' | 'chapter' | 'stageNumber'>): CampaignStage {
  return { id: `forest_1_${n}`, campaignId, chapter: 1, stageNumber: n, ...partial }
}

export const FOREST_RUINS_STAGES: CampaignStage[] = [
  // 2026-08-19：1-1 從「3 波哥布林清怪」換成 Adventure Stage 探索關卡
  // 「迷途的林間入口」（見 src/adventure/stages/forestRuins01.ts）。這裡的
  // waves/objective/hazards 保留不刪（App.tsx 依 isAdventureStageId() 分流，
  // 這幾個欄位不會再被讀到，是安全的死欄位），id/campaignId/chapter/
  // stageNumber/bgTheme/firstClearReward 仍是 CampaignMapScreen 地圖節點與
  // 底部關卡資訊面板要讀的真實資料，不能動。starConditions 換成新規則的
  // 描述文字，真正的判定邏輯在 AdventureGame.ts，不是 evaluateCampaignStars()。
  stage(1, {
    name: '迷途的林間入口',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { goblin_warrior: 4 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { goblin_warrior: 5 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { goblin_warrior: 6 } },
    ],
    starConditions: [
      { type: 'clear', description: '通關' },
      { type: 'purple_coin_count', value: 15, description: '收集 ≥ 15 / 20 紫幣' },
      { type: 'star_piece_found', value: 1, description: '找到 ≥ 1 個星星碎片' },
    ],
    estimatedDurationSec: [180, 360],
    firstClearReward: { gold: 40, heroExp: 30 },
    bgTheme: 'forest_entrance',
  }),
  stage(2, {
    name: '荊棘之地',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { goblin_warrior: 3, skeleton_scout: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { goblin_warrior: 4, skeleton_scout: 3 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { goblin_warrior: 3, skeleton_scout: 3 } },
    ],
    hazards: [{ kind: 'thorn', count: 3, radius: 55, dps: 6, duration: 999, slowMult: 0.7 }],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 50, description: 'HP ≥ 50% 通關' },
      { type: 'avoid_hazard', value: 0, hazardId: 'thorn', description: '不踩中任何荊棘' },
    ],
    estimatedDurationSec: [80, 110],
    firstClearReward: { gold: 50, heroExp: 38 },
    bgTheme: 'forest_entrance',
  }),
  stage(3, {
    name: '哥布林營地',
    objective: { type: 'destroy', destroyCount: 3 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { goblin_warrior: 3, goblin_archer: 2, forest_totem: 3 } },
      { trigger: { type: 'elapsed_time', sec: 30 }, enemies: { goblin_warrior: 3, goblin_archer: 2 } },
      { trigger: { type: 'elapsed_time', sec: 60 }, enemies: { goblin_warrior: 2, goblin_archer: 2 } },
    ],
    starConditions: [
      { type: 'clear', description: '摧毀 3 個圖騰' },
      { type: 'custom', description: '擊敗所有哥布林弓手' },
      { type: 'time_under', value: 75, description: '75 秒內摧毀全部圖騰' },
    ],
    estimatedDurationSec: [90, 130],
    firstClearReward: { gold: 58, heroExp: 44 },
    bgTheme: 'forest_entrance',
  }),
  stage(4, {
    name: '薩滿祭壇',
    objective: { type: 'hunt', huntTargetId: 'forest_shaman' },
    // 只在最後一波放單一薩滿（Hunt 的勝利判定是「命中 huntTargetId 就算贏」，
    // 場上不能同時有第二隻同 typeId 的敵人）——前面的波次先讓玩家打過一輪
    // 護衛，符合「先經過一小段戰鬥→Shaman登場」的設計。
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { goblin_warrior: 4, orc_warrior: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 1 }, enemies: { orc_warrior: 2 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { orc_warrior: 1 }, eliteEnemies: { forest_shaman: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗森林薩滿' },
      { type: 'custom', description: '擊敗全部敵人' },
      { type: 'heal_count_under', value: 2, targetId: 'forest_shaman', description: '薩滿成功治療 ≤ 2 次' },
    ],
    estimatedDurationSec: [100, 140],
    firstClearReward: { gold: 65, heroExp: 52 },
    bgTheme: 'ancient_ruins',
  }),
  stage(5, {
    name: '狂暴獸人隊長',
    objective: { type: 'boss' },
    boss: { bossEnemyId: 'orc_chieftain' },
    starConditions: [
      { type: 'clear', description: '擊敗 Boss' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'avoid_skill', value: 0, skillId: 'orc_chieftain_charge', description: '不被 Charge 命中' },
    ],
    estimatedDurationSec: [120, 150],
    firstClearReward: { gold: 130, heroExp: 115 },
    bgTheme: 'ancient_ruins',
  }),
  stage(6, {
    name: '毒菇森林',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { toxic_mushroom: 3, goblin_warrior: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { toxic_mushroom: 3, skeleton_scout: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { toxic_mushroom: 2, goblin_warrior: 3 } },
    ],
    hazards: [{ kind: 'poison', count: 2, radius: 70, dps: 8, duration: 999 }],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 50, description: 'HP ≥ 50% 通關' },
      { type: 'avoid_hazard', value: 2, hazardId: 'poison', description: '毒霧命中 ≤ 2 次' },
    ],
    estimatedDurationSec: [100, 150],
    firstClearReward: { gold: 72, heroExp: 58 },
    bgTheme: 'poison_forest',
  }),
  stage(7, {
    name: '樹根迷境',
    objective: { type: 'elimination' },
    // Tank+Ranged+Support 逐步加入，薩滿放最後一波，呼應「優先擊敗薩滿」的三星。
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { goblin_archer: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 1 }, enemies: { forest_treant: 1, goblin_archer: 1 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { forest_treant: 1, forest_shaman: 1, goblin_archer: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'custom', description: '優先擊敗薩滿' },
      { type: 'control_count_under', value: 3, description: '被樹根控制 ≤ 3 次' },
    ],
    estimatedDurationSec: [120, 150],
    firstClearReward: { gold: 78, heroExp: 64 },
    bgTheme: 'poison_forest',
  }),
  stage(8, {
    name: '遺跡守護',
    objective: { type: 'defense', durationSec: 90, defenseTargetMaxHp: 420 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { goblin_warrior: 2, skeleton_scout: 1 } },
      { trigger: { type: 'elapsed_time', sec: 20 }, enemies: { goblin_archer: 2, skeleton_scout: 1 } },
      { trigger: { type: 'elapsed_time', sec: 45 }, enemies: { goblin_warrior: 2, goblin_archer: 1 } },
      { trigger: { type: 'elapsed_time', sec: 70 }, enemies: { orc_warrior: 1, goblin_archer: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: 'Core 存活' },
      { type: 'protect_hp', value: 60, description: 'Core HP ≥ 60%' },
      { type: 'protect_hp', value: 85, description: 'Core HP ≥ 85%' },
    ],
    estimatedDurationSec: [95, 115],
    firstClearReward: { gold: 82, heroExp: 68 },
    bgTheme: 'ancient_altar',
  }),
  stage(9, {
    name: '荊棘追獵',
    objective: { type: 'hunt', huntTargetId: 'thorn_wolf' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton_scout: 2, toxic_mushroom: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 1 }, enemies: { thorn_wolf: 2, toxic_mushroom: 1 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: {}, eliteEnemies: { thorn_wolf: 1 } },
    ],
    hazards: [{ kind: 'thorn', count: 2, radius: 55, dps: 6, duration: 999, slowMult: 0.7 }],
    starConditions: [
      { type: 'clear', description: '擊殺 Elite 荊棘狼' },
      { type: 'hp_above', value: 50, description: 'HP ≥ 50% 通關' },
      { type: 'avoid_skill', value: 0, skillId: 'thorn_wolf_leap', description: '不被荊棘狼的 Leap 命中' },
    ],
    estimatedDurationSec: [120, 150],
    firstClearReward: { gold: 90, heroExp: 76 },
    bgTheme: 'poison_forest',
  }),
  stage(10, {
    name: '森林巨龍',
    objective: { type: 'boss' },
    boss: { bossEnemyId: 'forest_dragon' },
    hazards: [{ kind: 'fire', triggerAtSec: 40, count: 1, radius: 60, dps: 10, duration: 8 }],
    starConditions: [
      { type: 'clear', description: '擊敗森林巨龍' },
      { type: 'hp_above', value: 30, description: '通關時 HP ≥ 30%' },
      { type: 'avoid_skill', value: 0, skillId: 'forest_dragon_breath', description: '不被 Forest Breath 直接命中' },
    ],
    estimatedDurationSec: [240, 360],
    firstClearReward: { gold: 260, heroExp: 230 },
    bgTheme: 'dragon_nest',
  }),
]

export function getForestRuinsStage(stageId: string): CampaignStage | undefined {
  return FOREST_RUINS_STAGES.find(s => s.id === stageId)
}
