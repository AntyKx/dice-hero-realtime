/**
 * 深海遺城 · 第二章：沉沒王城（deep_sea_sunken_capital）2-1 ~ 2-10。
 * 跟 deepSeaCoralShallows.ts 同一套骨架，難度/獎勵再往上一階。
 */
import type { CampaignStage } from '../campaignTypes'
import { CAMPAIGN_ID_DEEP_SUNKEN_CAPITAL } from '../campaignTypes'

const campaignId = CAMPAIGN_ID_DEEP_SUNKEN_CAPITAL

function stage(n: number, partial: Omit<CampaignStage, 'id' | 'campaignId' | 'chapter' | 'stageNumber'>): CampaignStage {
  return { id: `deep2_${n}`, campaignId, chapter: 2, stageNumber: n, ...partial }
}

export const DEEP_SEA_SUNKEN_CAPITAL_STAGES: CampaignStage[] = [
  stage(1, {
    name: '王都凱旋門',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton: 4 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { skeleton: 5 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { slimeking: 2, skeleton: 3 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 60, description: 'HP ≥ 60% 通關' },
      { type: 'time_under', value: 100, description: '100 秒內通關' },
    ],
    estimatedDurationSec: [70, 100],
    firstClearReward: { gold: 82, heroExp: 64 },
    bgTheme: 'deep_sunken_capital',
  }),
  stage(2, {
    name: '海神像長廊',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { mimic: 2, slimeking: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { mimic: 2, orc: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { slimeking: 2, skeleton: 2 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hits_under', value: 8, description: '被擊中 ≤ 8 次' },
      { type: 'hp_above', value: 60, description: 'HP ≥ 60% 通關' },
    ],
    estimatedDurationSec: [90, 125],
    firstClearReward: { gold: 90, heroExp: 70 },
    bgTheme: 'deep_sunken_capital',
  }),
  stage(3, {
    name: '沉潮市集',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton: 3, mimic: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { orc: 1, skeleton: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { slimeking: 2, mimic: 1 } },
    ],
    hazards: [{ kind: 'root', count: 2, radius: 60, dps: 6, duration: 999, slowMult: 0.7, rootSec: 0.6 }],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 45, description: 'HP ≥ 45% 通關' },
      { type: 'avoid_hazard', value: 1, hazardId: 'root', description: '潮流拖曳命中 ≤ 1 次' },
    ],
    estimatedDurationSec: [100, 140],
    firstClearReward: { gold: 98, heroExp: 76 },
    bgTheme: 'deep_sunken_capital',
  }),
  stage(4, {
    name: '崩落歌劇院',
    objective: { type: 'destroy', destroyCount: 3 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { mimic: 2, orc: 1, deep_sea_totem: 3 } },
      { trigger: { type: 'elapsed_time', sec: 30 }, enemies: { skeleton: 2, mimic: 1 } },
      { trigger: { type: 'elapsed_time', sec: 60 }, enemies: { slimeking: 2, orc: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '摧毀 3 個共鳴法陣' },
      { type: 'hp_above', value: 45, description: 'HP ≥ 45% 通關' },
      { type: 'time_under', value: 85, description: '85 秒內摧毀全部法陣' },
    ],
    estimatedDurationSec: [105, 145],
    firstClearReward: { gold: 104, heroExp: 82 },
    bgTheme: 'deep_sunken_capital',
  }),
  stage(5, {
    name: '皇家水庭',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { slimeking: 3, orc: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { orc: 2, mimic: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { skeleton: 2, slimeking: 2 } },
    ],
    hazards: [{ kind: 'root', count: 2, radius: 65, dps: 7, duration: 999, slowMult: 0.6, rootSec: 0.8 }],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'avoid_hazard', value: 2, hazardId: 'root', description: '潮流拖曳命中 ≤ 2 次' },
    ],
    estimatedDurationSec: [120, 160],
    firstClearReward: { gold: 112, heroExp: 90 },
    bgTheme: 'deep_sunken_capital',
  }),
  stage(6, {
    name: '潮汐機關區',
    objective: { type: 'defense', durationSec: 95, defenseTargetMaxHp: 460 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton: 2, mimic: 1 } },
      { trigger: { type: 'elapsed_time', sec: 20 }, enemies: { slimeking: 2 } },
      { trigger: { type: 'elapsed_time', sec: 45 }, enemies: { orc: 1, skeleton: 1 } },
      { trigger: { type: 'elapsed_time', sec: 75 }, enemies: { orc: 1, mimic: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '機關區存活' },
      { type: 'protect_hp', value: 55, description: 'Core HP ≥ 55%' },
      { type: 'protect_hp', value: 80, description: 'Core HP ≥ 80%' },
    ],
    estimatedDurationSec: [100, 120],
    firstClearReward: { gold: 118, heroExp: 96 },
    bgTheme: 'deep_sunken_capital',
  }),
  stage(7, {
    name: '學者穹殿',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { orc: 1, mimic: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { orc: 1, slimeking: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { skeleton: 2, orc: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'control_count_under', value: 3, description: '被潮流控制 ≤ 3 次' },
    ],
    estimatedDurationSec: [130, 165],
    firstClearReward: { gold: 124, heroExp: 100 },
    bgTheme: 'deep_sunken_capital',
  }),
  stage(8, {
    name: '海宮中庭',
    objective: { type: 'hunt', huntTargetId: 'orc' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton: 2, mimic: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 1 }, enemies: { slimeking: 2 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { mimic: 1 }, eliteEnemies: { orc: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗中庭守衛' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'time_under', value: 140, description: '140 秒內擊敗' },
    ],
    estimatedDurationSec: [120, 160],
    firstClearReward: { gold: 130, heroExp: 106 },
    bgTheme: 'deep_sunken_capital',
  }),
  stage(9, {
    name: '王座長堤',
    objective: { type: 'survival', durationSec: 100 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { slimeking: 3 } },
      { trigger: { type: 'elapsed_time', sec: 25 }, enemies: { orc: 1, mimic: 1 } },
      { trigger: { type: 'elapsed_time', sec: 55 }, enemies: { skeleton: 2, slimeking: 1 } },
      { trigger: { type: 'elapsed_time', sec: 85 }, enemies: { orc: 2 } },
    ],
    hazards: [{ kind: 'root', count: 1, radius: 90, dps: 7, duration: 999, slowMult: 0.6, rootSec: 0.8 }],
    starConditions: [
      { type: 'clear', description: '存活 100 秒' },
      { type: 'hp_above', value: 35, description: 'HP ≥ 35% 通關' },
      { type: 'avoid_hazard', value: 3, hazardId: 'root', description: '潮流拖曳命中 ≤ 3 次' },
    ],
    estimatedDurationSec: [100, 120],
    firstClearReward: { gold: 136, heroExp: 112 },
    bgTheme: 'deep_sunken_capital',
  }),
  stage(10, {
    name: '墮落海攝政・賽洛恩',
    objective: { type: 'boss' },
    boss: { bossEnemyId: 'fallen_regent_selrone' },
    starConditions: [
      { type: 'clear', description: '擊敗墮落海攝政' },
      { type: 'hp_above', value: 35, description: '通關時 HP ≥ 35%' },
      { type: 'avoid_skill', value: 0, skillId: 'selrone_charge', description: '不被 Charge 命中' },
    ],
    estimatedDurationSec: [190, 270],
    firstClearReward: { gold: 230, heroExp: 200 },
    bgTheme: 'deep_sunken_capital',
  }),
]

export function getDeepSeaSunkenCapitalStage(stageId: string): CampaignStage | undefined {
  return DEEP_SEA_SUNKEN_CAPITAL_STAGES.find(s => s.id === stageId)
}
