/**
 * 裂隙前兆 · 第二章：虛空裂谷（rift_omen_void_chasm）2-1 ~ 2-10。
 * 跟 riftOmenBrokenSky.ts 同一套骨架，難度/獎勵再往上一階，見該檔案開頭說明。
 */
import type { CampaignStage } from '../campaignTypes'
import { CAMPAIGN_ID_RIFT_VOID_CHASM } from '../campaignTypes'

const campaignId = CAMPAIGN_ID_RIFT_VOID_CHASM

function stage(n: number, partial: Omit<CampaignStage, 'id' | 'campaignId' | 'chapter' | 'stageNumber'>): CampaignStage {
  return { id: `rift2_${n}`, campaignId, chapter: 2, stageNumber: n, ...partial }
}

export const RIFT_OMEN_VOID_CHASM_STAGES: CampaignStage[] = [
  stage(1, {
    name: '破界落點',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton: 4 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { skeleton: 5 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { lightning_lancer: 3, skeleton: 2 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 60, description: 'HP ≥ 60% 通關' },
      { type: 'time_under', value: 100, description: '100 秒內通關' },
    ],
    estimatedDurationSec: [70, 100],
    firstClearReward: { gold: 82, heroExp: 64 },
    bgTheme: 'rift_void_chasm',
  }),
  stage(2, {
    name: '逆瀑神殿',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { orc: 2, lightning_lancer: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { orc: 3, lightning_lancer: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { orc: 2, lightning_lancer: 2 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hits_under', value: 8, description: '被擊中 ≤ 8 次' },
      { type: 'hp_above', value: 65, description: 'HP ≥ 65% 通關' },
    ],
    estimatedDurationSec: [90, 125],
    firstClearReward: { gold: 90, heroExp: 70 },
    bgTheme: 'rift_void_chasm',
  }),
  stage(3, {
    name: '鎖鏈浮島',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { dark_knight: 1, skeleton: 3 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { dark_knight: 1, lightning_lancer: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { skeleton: 3, orc: 1 } },
    ],
    hazards: [{ kind: 'poison', count: 2, radius: 65, dps: 8, duration: 999 }],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 45, description: 'HP ≥ 45% 通關' },
      { type: 'avoid_hazard', value: 1, hazardId: 'poison', description: '裂隙腐蝕命中 ≤ 1 次' },
    ],
    estimatedDurationSec: [100, 140],
    firstClearReward: { gold: 98, heroExp: 76 },
    bgTheme: 'rift_void_chasm',
  }),
  stage(4, {
    name: '重力迷城',
    objective: { type: 'destroy', destroyCount: 3 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton: 3, orc: 1, rift_crystal_totem: 3 } },
      { trigger: { type: 'elapsed_time', sec: 30 }, enemies: { skeleton: 2, lightning_lancer: 2 } },
      { trigger: { type: 'elapsed_time', sec: 60 }, enemies: { orc: 2, skeleton: 2 } },
    ],
    starConditions: [
      { type: 'clear', description: '摧毀 3 個重力錨點' },
      { type: 'hp_above', value: 45, description: 'HP ≥ 45% 通關' },
      { type: 'time_under', value: 85, description: '85 秒內摧毀全部錨點' },
    ],
    estimatedDurationSec: [105, 145],
    firstClearReward: { gold: 104, heroExp: 82 },
    bgTheme: 'rift_void_chasm',
  }),
  stage(5, {
    name: '虛空渡口',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { lightning_lancer: 3, orc: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { dark_knight: 1, lightning_lancer: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { orc: 2, dark_knight: 1 } },
    ],
    hazards: [{ kind: 'poison', count: 2, radius: 70, dps: 9, duration: 999 }],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'avoid_hazard', value: 2, hazardId: 'poison', description: '裂隙腐蝕命中 ≤ 2 次' },
    ],
    estimatedDurationSec: [120, 160],
    firstClearReward: { gold: 112, heroExp: 90 },
    bgTheme: 'rift_void_chasm',
  }),
  stage(6, {
    name: '星流斷層',
    objective: { type: 'defense', durationSec: 95, defenseTargetMaxHp: 460 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton: 2, orc: 1 } },
      { trigger: { type: 'elapsed_time', sec: 20 }, enemies: { lightning_lancer: 2 } },
      { trigger: { type: 'elapsed_time', sec: 45 }, enemies: { orc: 2, skeleton: 1 } },
      { trigger: { type: 'elapsed_time', sec: 75 }, enemies: { dark_knight: 1, lightning_lancer: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '斷層存活' },
      { type: 'protect_hp', value: 55, description: 'Core HP ≥ 55%' },
      { type: 'protect_hp', value: 80, description: 'Core HP ≥ 80%' },
    ],
    estimatedDurationSec: [100, 120],
    firstClearReward: { gold: 118, heroExp: 96 },
    bgTheme: 'rift_void_chasm',
  }),
  stage(7, {
    name: '黑晶聖所',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { dark_knight: 1, orc: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { dark_knight: 1, lightning_lancer: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { orc: 2, lightning_lancer: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'control_count_under', value: 3, description: '被重力異常控制 ≤ 3 次' },
    ],
    estimatedDurationSec: [130, 165],
    firstClearReward: { gold: 124, heroExp: 100 },
    bgTheme: 'rift_void_chasm',
  }),
  stage(8, {
    name: '崩輪遺跡',
    objective: { type: 'hunt', huntTargetId: 'dark_knight' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton: 2, orc: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 1 }, enemies: { lightning_lancer: 2 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { orc: 1 }, eliteEnemies: { dark_knight: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗崩輪守衛' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'time_under', value: 140, description: '140 秒內擊敗' },
    ],
    estimatedDurationSec: [120, 160],
    firstClearReward: { gold: 130, heroExp: 106 },
    bgTheme: 'rift_void_chasm',
  }),
  stage(9, {
    name: '深淵門扉',
    objective: { type: 'survival', durationSec: 100 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { lightning_lancer: 3 } },
      { trigger: { type: 'elapsed_time', sec: 25 }, enemies: { dark_knight: 1, orc: 1 } },
      { trigger: { type: 'elapsed_time', sec: 55 }, enemies: { skeleton: 2, lightning_lancer: 1 } },
      { trigger: { type: 'elapsed_time', sec: 85 }, enemies: { orc: 2, dark_knight: 1 } },
    ],
    hazards: [{ kind: 'poison', count: 1, radius: 90, dps: 8, duration: 999 }],
    starConditions: [
      { type: 'clear', description: '存活 100 秒' },
      { type: 'hp_above', value: 35, description: 'HP ≥ 35% 通關' },
      { type: 'avoid_hazard', value: 3, hazardId: 'poison', description: '裂隙腐蝕命中 ≤ 3 次' },
    ],
    estimatedDurationSec: [100, 120],
    firstClearReward: { gold: 136, heroExp: 112 },
    bgTheme: 'rift_void_chasm',
  }),
  stage(10, {
    name: '虛空守望者・涅摩斯',
    objective: { type: 'boss' },
    boss: { bossEnemyId: 'void_sentinel_nemos' },
    starConditions: [
      { type: 'clear', description: '擊敗虛空守望者' },
      { type: 'hp_above', value: 35, description: '通關時 HP ≥ 35%' },
      { type: 'time_under', value: 220, description: '220 秒內擊敗' },
    ],
    estimatedDurationSec: [190, 270],
    firstClearReward: { gold: 230, heroExp: 200 },
    bgTheme: 'rift_void_chasm',
  }),
]

export function getRiftOmenVoidChasmStage(stageId: string): CampaignStage | undefined {
  return RIFT_OMEN_VOID_CHASM_STAGES.find(s => s.id === stageId)
}
