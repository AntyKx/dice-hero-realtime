/**
 * 深海遺城 · 第三章：海皇深淵（deep_sea_emperor_abyss）3-1 ~ 3-10。
 * 篇章最終章，Boss 潮汐王・奧瑟雷恩是整個深海遺城篇章的最終王，也是全部
 * 九個固定式主線篇章裡最後一個。見 deepSeaCoralShallows.ts 開頭的骨架說明。
 */
import type { CampaignStage } from '../campaignTypes'
import { CAMPAIGN_ID_DEEP_EMPEROR_ABYSS } from '../campaignTypes'

const campaignId = CAMPAIGN_ID_DEEP_EMPEROR_ABYSS

function stage(n: number, partial: Omit<CampaignStage, 'id' | 'campaignId' | 'chapter' | 'stageNumber'>): CampaignStage {
  return { id: `deep3_${n}`, campaignId, chapter: 3, stageNumber: n, ...partial }
}

export const DEEP_SEA_EMPEROR_ABYSS_STAGES: CampaignStage[] = [
  stage(1, {
    name: '深淵降壇',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton: 4 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { skeleton: 3, mimic: 2 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { orc: 1, slimeking: 2 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 55, description: 'HP ≥ 55% 通關' },
      { type: 'time_under', value: 105, description: '105 秒內通關' },
    ],
    estimatedDurationSec: [75, 105],
    firstClearReward: { gold: 100, heroExp: 78 },
    bgTheme: 'deep_emperor_abyss',
  }),
  stage(2, {
    name: '鯨落墓場',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { mimic: 2, orc: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { mimic: 2, slimeking: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { orc: 2, skeleton: 2 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hits_under', value: 8, description: '被擊中 ≤ 8 次' },
      { type: 'hp_above', value: 55, description: 'HP ≥ 55% 通關' },
    ],
    estimatedDurationSec: [95, 130],
    firstClearReward: { gold: 108, heroExp: 84 },
    bgTheme: 'deep_emperor_abyss',
  }),
  stage(3, {
    name: '幽光水母林',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { slimeking: 3, mimic: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { slimeking: 2, orc: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { mimic: 2, skeleton: 1 } },
    ],
    hazards: [{ kind: 'root', count: 2, radius: 65, dps: 7, duration: 999, slowMult: 0.6, rootSec: 0.8 }],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'avoid_hazard', value: 2, hazardId: 'root', description: '潮流拖曳命中 ≤ 2 次' },
    ],
    estimatedDurationSec: [110, 150],
    firstClearReward: { gold: 116, heroExp: 90 },
    bgTheme: 'deep_emperor_abyss',
  }),
  stage(4, {
    name: '黑煙熱泉橋',
    objective: { type: 'destroy', destroyCount: 3 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { orc: 2, mimic: 1, deep_sea_totem: 3 } },
      { trigger: { type: 'elapsed_time', sec: 30 }, enemies: { skeleton: 2, orc: 1 } },
      { trigger: { type: 'elapsed_time', sec: 60 }, enemies: { slimeking: 2, mimic: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '摧毀 3 個潮神法陣' },
      { type: 'hp_above', value: 45, description: 'HP ≥ 45% 通關' },
      { type: 'time_under', value: 90, description: '90 秒內摧毀全部法陣' },
    ],
    estimatedDurationSec: [110, 150],
    firstClearReward: { gold: 124, heroExp: 96 },
    bgTheme: 'deep_emperor_abyss',
  }),
  stage(5, {
    name: '鎖海獸牢',
    objective: { type: 'hunt', huntTargetId: 'orc' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton: 3, mimic: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 1 }, enemies: { slimeking: 2 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { mimic: 1 }, eliteEnemies: { orc: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗獸牢守衛' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'time_under', value: 145, description: '145 秒內擊敗' },
    ],
    estimatedDurationSec: [125, 165],
    firstClearReward: { gold: 132, heroExp: 104 },
    bgTheme: 'deep_emperor_abyss',
  }),
  stage(6, {
    name: '潮神諭聖殿',
    objective: { type: 'defense', durationSec: 100, defenseTargetMaxHp: 480 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton: 2, mimic: 1 } },
      { trigger: { type: 'elapsed_time', sec: 20 }, enemies: { slimeking: 2, skeleton: 1 } },
      { trigger: { type: 'elapsed_time', sec: 50 }, enemies: { orc: 1, mimic: 1 } },
      { trigger: { type: 'elapsed_time', sec: 80 }, enemies: { orc: 1, slimeking: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '聖殿存活' },
      { type: 'protect_hp', value: 55, description: 'Core HP ≥ 55%' },
      { type: 'protect_hp', value: 80, description: 'Core HP ≥ 80%' },
    ],
    estimatedDurationSec: [105, 125],
    firstClearReward: { gold: 138, heroExp: 110 },
    bgTheme: 'deep_emperor_abyss',
  }),
  stage(7, {
    name: '海溝亂流',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { orc: 1, mimic: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { orc: 2, slimeking: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { skeleton: 2, orc: 1 } },
    ],
    hazards: [{ kind: 'root', count: 2, radius: 70, dps: 8, duration: 999, slowMult: 0.55, rootSec: 0.9 }],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'control_count_under', value: 3, description: '被潮流控制 ≤ 3 次' },
    ],
    estimatedDurationSec: [140, 175],
    firstClearReward: { gold: 144, heroExp: 116 },
    bgTheme: 'deep_emperor_abyss',
  }),
  stage(8, {
    name: '海皇外殿',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { orc: 2, mimic: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { orc: 1, slimeking: 2, mimic: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { skeleton: 2, orc: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 35, description: 'HP ≥ 35% 通關' },
      { type: 'hits_under', value: 10, description: '被擊中 ≤ 10 次' },
    ],
    estimatedDurationSec: [130, 170],
    firstClearReward: { gold: 150, heroExp: 122 },
    bgTheme: 'deep_emperor_abyss',
  }),
  stage(9, {
    name: '黑潮王路',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton: 4 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { orc: 2, mimic: 2 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { slimeking: 3, orc: 1 } },
    ],
    hazards: [{ kind: 'root', count: 1, radius: 90, dps: 8, duration: 999, slowMult: 0.55, rootSec: 0.9 }],
    starConditions: [
      { type: 'clear', description: '完成三波' },
      { type: 'hp_above', value: 35, description: 'HP ≥ 35% 通關' },
      { type: 'no_death', description: '過程中沒有觸發過死亡結算' },
    ],
    estimatedDurationSec: [155, 190],
    firstClearReward: { gold: 158, heroExp: 130 },
    bgTheme: 'deep_emperor_abyss',
  }),
  stage(10, {
    name: '潮汐王・奧瑟雷恩',
    objective: { type: 'boss' },
    boss: { bossEnemyId: 'tidal_king_osrein' },
    hazards: [{ kind: 'root', triggerAtSec: 40, count: 1, radius: 60, dps: 8, duration: 8, slowMult: 0.5, rootSec: 1 }],
    starConditions: [
      { type: 'clear', description: '擊敗潮汐王' },
      { type: 'hp_above', value: 30, description: '通關時 HP ≥ 30%' },
      { type: 'avoid_skill', value: 0, skillId: 'osrein_maelstrom', description: '不被 Maelstrom 命中' },
    ],
    estimatedDurationSec: [260, 380],
    firstClearReward: { gold: 300, heroExp: 270 },
    bgTheme: 'deep_emperor_abyss',
  }),
]

export function getDeepSeaEmperorAbyssStage(stageId: string): CampaignStage | undefined {
  return DEEP_SEA_EMPEROR_ABYSS_STAGES.find(s => s.id === stageId)
}
