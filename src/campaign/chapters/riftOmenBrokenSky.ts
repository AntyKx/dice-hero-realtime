/**
 * 裂隙前兆 · 第一章：破碎天幕（rift_omen_broken_sky）1-1 ~ 1-10。
 *
 * 2026-08-16 稍晚新增（見「裂隙前兆與深海遺城_六章10關自然冒險地圖包」）：
 * 跟森林/雪原/魔王城同一套骨架，但只有第 10 關一個 Boss（沒有第 5 關中王），
 * 且刻意只用不需要 ArenaGame.ts 額外 hardcode 的通用星星條件類型（不用
 * 'custom'/'heal_count_under'），敵人 id 直接重用舊 Roguelite 系統的
 * goblin/skeleton/orc/slimeking/mimic/dark_knight/lightning_lancer（見
 * enemies.ts 的 RIFT_DEEP_SEA_CAMPAIGN_ENEMIES 說明），不重新設計小怪。
 * hazard 用 poison kind 代表裂隙腐蝕地帶。
 */
import type { CampaignStage } from '../campaignTypes'
import { CAMPAIGN_ID_RIFT_BROKEN_SKY } from '../campaignTypes'

const campaignId = CAMPAIGN_ID_RIFT_BROKEN_SKY

function stage(n: number, partial: Omit<CampaignStage, 'id' | 'campaignId' | 'chapter' | 'stageNumber'>): CampaignStage {
  return { id: `rift1_${n}`, campaignId, chapter: 1, stageNumber: n, ...partial }
}

export const RIFT_OMEN_BROKEN_SKY_STAGES: CampaignStage[] = [
  stage(1, {
    name: '邊境殘門',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { goblin: 4 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { goblin: 5 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { goblin: 6 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 60, description: 'HP ≥ 60% 通關' },
      { type: 'time_under', value: 95, description: '95 秒內通關' },
    ],
    estimatedDurationSec: [65, 95],
    firstClearReward: { gold: 68, heroExp: 52 },
    bgTheme: 'rift_broken_sky',
  }),
  stage(2, {
    name: '無聲農莊',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { goblin: 3, skeleton: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { goblin: 4, skeleton: 3 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { goblin: 3, skeleton: 3 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hits_under', value: 8, description: '被擊中 ≤ 8 次' },
      { type: 'hp_above', value: 70, description: 'HP ≥ 70% 通關' },
    ],
    estimatedDurationSec: [80, 110],
    firstClearReward: { gold: 76, heroExp: 58 },
    bgTheme: 'rift_broken_sky',
  }),
  stage(3, {
    name: '斷空古橋',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton: 3, lightning_lancer: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { skeleton: 3, lightning_lancer: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { goblin: 3, lightning_lancer: 1 } },
    ],
    hazards: [{ kind: 'poison', count: 2, radius: 65, dps: 7, duration: 999 }],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 50, description: 'HP ≥ 50% 通關' },
      { type: 'avoid_hazard', value: 1, hazardId: 'poison', description: '裂隙腐蝕命中 ≤ 1 次' },
    ],
    estimatedDurationSec: [90, 125],
    firstClearReward: { gold: 82, heroExp: 62 },
    bgTheme: 'rift_broken_sky',
  }),
  stage(4, {
    name: '墜星之坑',
    objective: { type: 'destroy', destroyCount: 3 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { goblin: 3, skeleton: 2, rift_crystal_totem: 3 } },
      { trigger: { type: 'elapsed_time', sec: 30 }, enemies: { goblin: 3, skeleton: 2 } },
      { trigger: { type: 'elapsed_time', sec: 60 }, enemies: { goblin: 2, skeleton: 2 } },
    ],
    starConditions: [
      { type: 'clear', description: '摧毀 3 個藍晶隕石' },
      { type: 'hp_above', value: 50, description: 'HP ≥ 50% 通關' },
      { type: 'time_under', value: 80, description: '80 秒內摧毀全部隕石' },
    ],
    estimatedDurationSec: [95, 135],
    firstClearReward: { gold: 88, heroExp: 66 },
    bgTheme: 'rift_broken_sky',
  }),
  stage(5, {
    name: '扭曲林徑',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { orc: 2, skeleton: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { orc: 2, lightning_lancer: 1, skeleton: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { orc: 1, lightning_lancer: 2 } },
    ],
    hazards: [{ kind: 'poison', count: 2, radius: 65, dps: 8, duration: 999 }],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 45, description: 'HP ≥ 45% 通關' },
      { type: 'avoid_hazard', value: 2, hazardId: 'poison', description: '裂隙腐蝕命中 ≤ 2 次' },
    ],
    estimatedDurationSec: [110, 150],
    firstClearReward: { gold: 96, heroExp: 74 },
    bgTheme: 'rift_broken_sky',
  }),
  stage(6, {
    name: '微火難民營',
    objective: { type: 'defense', durationSec: 90, defenseTargetMaxHp: 430 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { goblin: 2, skeleton: 1 } },
      { trigger: { type: 'elapsed_time', sec: 20 }, enemies: { skeleton: 2, lightning_lancer: 1 } },
      { trigger: { type: 'elapsed_time', sec: 45 }, enemies: { orc: 1, goblin: 2 } },
      { trigger: { type: 'elapsed_time', sec: 70 }, enemies: { orc: 1, lightning_lancer: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '難民營存活' },
      { type: 'protect_hp', value: 60, description: 'Core HP ≥ 60%' },
      { type: 'protect_hp', value: 85, description: 'Core HP ≥ 85%' },
    ],
    estimatedDurationSec: [95, 115],
    firstClearReward: { gold: 100, heroExp: 78 },
    bgTheme: 'rift_broken_sky',
  }),
  stage(7, {
    name: '浮岩裂谷',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { orc: 2, lightning_lancer: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { dark_knight: 1, orc: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { lightning_lancer: 2, orc: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 45, description: 'HP ≥ 45% 通關' },
      { type: 'control_count_under', value: 3, description: '被重力異常控制 ≤ 3 次' },
    ],
    estimatedDurationSec: [120, 155],
    firstClearReward: { gold: 106, heroExp: 84 },
    bgTheme: 'rift_broken_sky',
  }),
  stage(8, {
    name: '失聯觀測所',
    objective: { type: 'hunt', huntTargetId: 'dark_knight' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton: 3, lightning_lancer: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 1 }, enemies: { skeleton: 2 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { lightning_lancer: 1 }, eliteEnemies: { dark_knight: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗觀測所守衛' },
      { type: 'hp_above', value: 45, description: 'HP ≥ 45% 通關' },
      { type: 'time_under', value: 130, description: '130 秒內擊敗' },
    ],
    estimatedDurationSec: [110, 150],
    firstClearReward: { gold: 112, heroExp: 90 },
    bgTheme: 'rift_broken_sky',
  }),
  stage(9, {
    name: '裂痕集積地',
    objective: { type: 'survival', durationSec: 95 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { lightning_lancer: 3 } },
      { trigger: { type: 'elapsed_time', sec: 25 }, enemies: { orc: 1, dark_knight: 1 } },
      { trigger: { type: 'elapsed_time', sec: 55 }, enemies: { skeleton: 2, lightning_lancer: 1 } },
      { trigger: { type: 'elapsed_time', sec: 80 }, enemies: { orc: 2 } },
    ],
    hazards: [{ kind: 'poison', count: 1, radius: 90, dps: 7, duration: 999 }],
    starConditions: [
      { type: 'clear', description: '存活 95 秒' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'avoid_hazard', value: 3, hazardId: 'poison', description: '裂隙腐蝕命中 ≤ 3 次' },
    ],
    estimatedDurationSec: [95, 115],
    firstClearReward: { gold: 118, heroExp: 96 },
    bgTheme: 'rift_broken_sky',
  }),
  stage(10, {
    name: '天裂獸・沃爾迦',
    objective: { type: 'boss' },
    boss: { bossEnemyId: 'rift_beast_volga' },
    starConditions: [
      { type: 'clear', description: '擊敗天裂獸' },
      { type: 'hp_above', value: 35, description: '通關時 HP ≥ 35%' },
      { type: 'avoid_skill', value: 0, skillId: 'volga_tail_swipe', description: '不被 Tail Swipe 命中' },
    ],
    estimatedDurationSec: [180, 260],
    firstClearReward: { gold: 200, heroExp: 175 },
    bgTheme: 'rift_broken_sky',
  }),
]

export function getRiftOmenBrokenSkyStage(stageId: string): CampaignStage | undefined {
  return RIFT_OMEN_BROKEN_SKY_STAGES.find(s => s.id === stageId)
}
