/**
 * 深海遺城 · 第一章：珊瑚淺灘（deep_sea_coral_shallows）1-1 ~ 1-10。
 * 跟 riftOmenBrokenSky.ts 同一套骨架，敵人偏重 slimeking/mimic/skeleton/goblin
 * （軟體/深海感，呼應舊 DEEP_SEA_POOL 配置邏輯），hazard 用 root kind 代表
 * 潮流/海草拖曳。見該檔案開頭的完整說明。
 */
import type { CampaignStage } from '../campaignTypes'
import { CAMPAIGN_ID_DEEP_CORAL_SHALLOWS } from '../campaignTypes'

const campaignId = CAMPAIGN_ID_DEEP_CORAL_SHALLOWS

function stage(n: number, partial: Omit<CampaignStage, 'id' | 'campaignId' | 'chapter' | 'stageNumber'>): CampaignStage {
  return { id: `deep1_${n}`, campaignId, chapter: 1, stageNumber: n, ...partial }
}

export const DEEP_SEA_CORAL_SHALLOWS_STAGES: CampaignStage[] = [
  stage(1, {
    name: '潮光入口',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { goblin: 4 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { goblin: 5 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { skeleton: 3, goblin: 3 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 60, description: 'HP ≥ 60% 通關' },
      { type: 'time_under', value: 95, description: '95 秒內通關' },
    ],
    estimatedDurationSec: [65, 95],
    firstClearReward: { gold: 68, heroExp: 52 },
    bgTheme: 'deep_coral_shallows',
  }),
  stage(2, {
    name: '巨蚌珍珠林',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { slimeking: 2, goblin: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { slimeking: 2, mimic: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { goblin: 3, slimeking: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hits_under', value: 8, description: '被擊中 ≤ 8 次' },
      { type: 'hp_above', value: 65, description: 'HP ≥ 65% 通關' },
    ],
    estimatedDurationSec: [80, 115],
    firstClearReward: { gold: 76, heroExp: 58 },
    bgTheme: 'deep_coral_shallows',
  }),
  stage(3, {
    name: '斷桅沉船',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton: 3, mimic: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { skeleton: 3, mimic: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { goblin: 2, skeleton: 2 } },
    ],
    hazards: [{ kind: 'root', count: 2, radius: 60, dps: 5, duration: 999, slowMult: 0.7, rootSec: 0.6 }],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 50, description: 'HP ≥ 50% 通關' },
      { type: 'avoid_hazard', value: 1, hazardId: 'root', description: '潮流拖曳命中 ≤ 1 次' },
    ],
    estimatedDurationSec: [90, 125],
    firstClearReward: { gold: 82, heroExp: 62 },
    bgTheme: 'deep_coral_shallows',
  }),
  stage(4, {
    name: '珊瑚迷庭',
    objective: { type: 'destroy', destroyCount: 3 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { goblin: 3, slimeking: 1, deep_sea_totem: 3 } },
      { trigger: { type: 'elapsed_time', sec: 30 }, enemies: { goblin: 2, mimic: 2 } },
      { trigger: { type: 'elapsed_time', sec: 60 }, enemies: { skeleton: 2, slimeking: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '摧毀 3 個月珠法陣' },
      { type: 'hp_above', value: 50, description: 'HP ≥ 50% 通關' },
      { type: 'time_under', value: 80, description: '80 秒內摧毀全部法陣' },
    ],
    estimatedDurationSec: [95, 135],
    firstClearReward: { gold: 88, heroExp: 66 },
    bgTheme: 'deep_coral_shallows',
  }),
  stage(5, {
    name: '泡泉峽谷',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { slimeking: 2, mimic: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { slimeking: 2, skeleton: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { mimic: 2, goblin: 2 } },
    ],
    hazards: [{ kind: 'root', count: 2, radius: 65, dps: 6, duration: 999, slowMult: 0.6, rootSec: 0.8 }],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 45, description: 'HP ≥ 45% 通關' },
      { type: 'avoid_hazard', value: 2, hazardId: 'root', description: '潮流拖曳命中 ≤ 2 次' },
    ],
    estimatedDurationSec: [110, 150],
    firstClearReward: { gold: 96, heroExp: 74 },
    bgTheme: 'deep_coral_shallows',
  }),
  stage(6, {
    name: '海龜古壇',
    objective: { type: 'defense', durationSec: 90, defenseTargetMaxHp: 430 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { goblin: 2, skeleton: 1 } },
      { trigger: { type: 'elapsed_time', sec: 20 }, enemies: { slimeking: 1, mimic: 1 } },
      { trigger: { type: 'elapsed_time', sec: 45 }, enemies: { goblin: 2, skeleton: 1 } },
      { trigger: { type: 'elapsed_time', sec: 70 }, enemies: { slimeking: 1, mimic: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '古壇存活' },
      { type: 'protect_hp', value: 60, description: 'Core HP ≥ 60%' },
      { type: 'protect_hp', value: 85, description: 'Core HP ≥ 85%' },
    ],
    estimatedDurationSec: [95, 115],
    firstClearReward: { gold: 100, heroExp: 78 },
    bgTheme: 'deep_coral_shallows',
  }),
  stage(7, {
    name: '沉沒漁村',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { mimic: 2, skeleton: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { orc: 1, mimic: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { slimeking: 2, skeleton: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 45, description: 'HP ≥ 45% 通關' },
      { type: 'control_count_under', value: 3, description: '被潮流控制 ≤ 3 次' },
    ],
    estimatedDurationSec: [120, 155],
    firstClearReward: { gold: 106, heroExp: 84 },
    bgTheme: 'deep_coral_shallows',
  }),
  stage(8, {
    name: '月珠神殿',
    objective: { type: 'hunt', huntTargetId: 'orc' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton: 3, mimic: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 1 }, enemies: { slimeking: 2 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { mimic: 1 }, eliteEnemies: { orc: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗神殿守衛' },
      { type: 'hp_above', value: 45, description: 'HP ≥ 45% 通關' },
      { type: 'time_under', value: 130, description: '130 秒內擊敗' },
    ],
    estimatedDurationSec: [110, 150],
    firstClearReward: { gold: 112, heroExp: 90 },
    bgTheme: 'deep_coral_shallows',
  }),
  stage(9, {
    name: '深流門',
    objective: { type: 'survival', durationSec: 95 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { mimic: 3 } },
      { trigger: { type: 'elapsed_time', sec: 25 }, enemies: { orc: 1, slimeking: 1 } },
      { trigger: { type: 'elapsed_time', sec: 55 }, enemies: { skeleton: 2, mimic: 1 } },
      { trigger: { type: 'elapsed_time', sec: 80 }, enemies: { slimeking: 2 } },
    ],
    hazards: [{ kind: 'root', count: 1, radius: 90, dps: 6, duration: 999, slowMult: 0.6, rootSec: 0.8 }],
    starConditions: [
      { type: 'clear', description: '存活 95 秒' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'avoid_hazard', value: 3, hazardId: 'root', description: '潮流拖曳命中 ≤ 3 次' },
    ],
    estimatedDurationSec: [95, 115],
    firstClearReward: { gold: 118, heroExp: 96 },
    bgTheme: 'deep_coral_shallows',
  }),
  stage(10, {
    name: '礁海巨獸・澤菲隆',
    objective: { type: 'boss' },
    boss: { bossEnemyId: 'reef_leviathan_zephyron' },
    starConditions: [
      { type: 'clear', description: '擊敗礁海巨獸' },
      { type: 'hp_above', value: 35, description: '通關時 HP ≥ 35%' },
      { type: 'avoid_skill', value: 0, skillId: 'zephyron_tide_breath', description: '不被 Tide Breath 命中' },
    ],
    estimatedDurationSec: [180, 260],
    firstClearReward: { gold: 200, heroExp: 175 },
    bgTheme: 'deep_coral_shallows',
  }),
]

export function getDeepSeaCoralShallowsStage(stageId: string): CampaignStage | undefined {
  return DEEP_SEA_CORAL_SHALLOWS_STAGES.find(s => s.id === stageId)
}
