/**
 * 裂隙前兆 · 第三章：星蝕核心（rift_omen_eclipse_core）3-1 ~ 3-10。
 * 篇章最終章，難度/獎勵是三個子章節裡最高的，Boss 裂界使徒・厄洛斯是整個
 * 裂隙前兆篇章的最終王。見 riftOmenBrokenSky.ts 開頭的骨架說明。
 */
import type { CampaignStage } from '../campaignTypes'
import { CAMPAIGN_ID_RIFT_ECLIPSE_CORE } from '../campaignTypes'

const campaignId = CAMPAIGN_ID_RIFT_ECLIPSE_CORE

function stage(n: number, partial: Omit<CampaignStage, 'id' | 'campaignId' | 'chapter' | 'stageNumber'>): CampaignStage {
  return { id: `rift3_${n}`, campaignId, chapter: 3, stageNumber: n, ...partial }
}

export const RIFT_OMEN_ECLIPSE_CORE_STAGES: CampaignStage[] = [
  stage(1, {
    name: '日蝕外環',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { lightning_lancer: 4 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { lightning_lancer: 3, orc: 2 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { dark_knight: 1, lightning_lancer: 2 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 55, description: 'HP ≥ 55% 通關' },
      { type: 'time_under', value: 105, description: '105 秒內通關' },
    ],
    estimatedDurationSec: [75, 105],
    firstClearReward: { gold: 100, heroExp: 78 },
    bgTheme: 'rift_eclipse_core',
  }),
  stage(2, {
    name: '學者殘區',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton: 3, dark_knight: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { skeleton: 3, orc: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { dark_knight: 1, lightning_lancer: 2 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hits_under', value: 8, description: '被擊中 ≤ 8 次' },
      { type: 'hp_above', value: 60, description: 'HP ≥ 60% 通關' },
    ],
    estimatedDurationSec: [95, 130],
    firstClearReward: { gold: 108, heroExp: 84 },
    bgTheme: 'rift_eclipse_core',
  }),
  stage(3, {
    name: '破損星儀',
    objective: { type: 'destroy', destroyCount: 3 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { orc: 2, lightning_lancer: 2, rift_crystal_totem: 3 } },
      { trigger: { type: 'elapsed_time', sec: 30 }, enemies: { orc: 2, lightning_lancer: 1 } },
      { trigger: { type: 'elapsed_time', sec: 60 }, enemies: { dark_knight: 1, orc: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '摧毀 3 個星儀核心' },
      { type: 'hp_above', value: 45, description: 'HP ≥ 45% 通關' },
      { type: 'time_under', value: 90, description: '90 秒內摧毀全部核心' },
    ],
    estimatedDurationSec: [110, 150],
    firstClearReward: { gold: 116, heroExp: 90 },
    bgTheme: 'rift_eclipse_core',
  }),
  stage(4, {
    name: '星圖大廳',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { dark_knight: 1, skeleton: 3 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { dark_knight: 1, lightning_lancer: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { orc: 2, skeleton: 2 } },
    ],
    hazards: [{ kind: 'poison', count: 2, radius: 70, dps: 9, duration: 999 }],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'avoid_hazard', value: 2, hazardId: 'poison', description: '星蝕餘燼命中 ≤ 2 次' },
    ],
    estimatedDurationSec: [125, 165],
    firstClearReward: { gold: 124, heroExp: 96 },
    bgTheme: 'rift_eclipse_core',
  }),
  stage(5, {
    name: '時滯庭園',
    objective: { type: 'survival', durationSec: 100 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { lightning_lancer: 3 } },
      { trigger: { type: 'elapsed_time', sec: 25 }, enemies: { dark_knight: 1, skeleton: 2 } },
      { trigger: { type: 'elapsed_time', sec: 55 }, enemies: { orc: 2, lightning_lancer: 1 } },
      { trigger: { type: 'elapsed_time', sec: 85 }, enemies: { dark_knight: 1, orc: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '存活 100 秒' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'no_death', description: '過程中沒有觸發過死亡結算' },
    ],
    estimatedDurationSec: [100, 120],
    firstClearReward: { gold: 132, heroExp: 104 },
    bgTheme: 'rift_eclipse_core',
  }),
  stage(6, {
    name: '黑日聖堂',
    objective: { type: 'defense', durationSec: 100, defenseTargetMaxHp: 480 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton: 2, orc: 1 } },
      { trigger: { type: 'elapsed_time', sec: 20 }, enemies: { lightning_lancer: 2, skeleton: 1 } },
      { trigger: { type: 'elapsed_time', sec: 50 }, enemies: { dark_knight: 1, orc: 1 } },
      { trigger: { type: 'elapsed_time', sec: 80 }, enemies: { dark_knight: 1, lightning_lancer: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '聖堂存活' },
      { type: 'protect_hp', value: 55, description: 'Core HP ≥ 55%' },
      { type: 'protect_hp', value: 80, description: 'Core HP ≥ 80%' },
    ],
    estimatedDurationSec: [105, 125],
    firstClearReward: { gold: 138, heroExp: 110 },
    bgTheme: 'rift_eclipse_core',
  }),
  stage(7, {
    name: '星界引擎',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { dark_knight: 1, orc: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { dark_knight: 1, lightning_lancer: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { orc: 2, dark_knight: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'control_count_under', value: 3, description: '被重力異常控制 ≤ 3 次' },
    ],
    estimatedDurationSec: [140, 175],
    firstClearReward: { gold: 144, heroExp: 116 },
    bgTheme: 'rift_eclipse_core',
  }),
  stage(8, {
    name: '旋冠觀測台',
    objective: { type: 'hunt', huntTargetId: 'dark_knight' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { lightning_lancer: 3, orc: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 1 }, enemies: { skeleton: 2 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { lightning_lancer: 1 }, eliteEnemies: { dark_knight: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗觀測台守衛' },
      { type: 'hp_above', value: 35, description: 'HP ≥ 35% 通關' },
      { type: 'time_under', value: 150, description: '150 秒內擊敗' },
    ],
    estimatedDurationSec: [130, 170],
    firstClearReward: { gold: 150, heroExp: 122 },
    bgTheme: 'rift_eclipse_core',
  }),
  stage(9, {
    name: '事件視界',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton: 4 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { dark_knight: 2, orc: 2 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { lightning_lancer: 3, orc: 1 } },
    ],
    hazards: [{ kind: 'poison', count: 1, radius: 90, dps: 9, duration: 999 }],
    starConditions: [
      { type: 'clear', description: '完成三波' },
      { type: 'hp_above', value: 35, description: 'HP ≥ 35% 通關' },
      { type: 'no_death', description: '過程中沒有觸發過死亡結算' },
    ],
    estimatedDurationSec: [155, 190],
    firstClearReward: { gold: 158, heroExp: 130 },
    bgTheme: 'rift_eclipse_core',
  }),
  stage(10, {
    name: '裂界使徒・厄洛斯',
    objective: { type: 'boss' },
    boss: { bossEnemyId: 'rift_apostle_eros' },
    hazards: [{ kind: 'poison', triggerAtSec: 40, count: 1, radius: 60, dps: 9, duration: 8 }],
    starConditions: [
      { type: 'clear', description: '擊敗裂界使徒' },
      { type: 'hp_above', value: 30, description: '通關時 HP ≥ 30%' },
      { type: 'avoid_skill', value: 0, skillId: 'eros_void_breath', description: '不被 Void Breath 直接命中' },
    ],
    estimatedDurationSec: [260, 380],
    firstClearReward: { gold: 300, heroExp: 270 },
    bgTheme: 'rift_eclipse_core',
  }),
]

export function getRiftOmenEclipseCoreStage(stageId: string): CampaignStage | undefined {
  return RIFT_OMEN_ECLIPSE_CORE_STAGES.find(s => s.id === stageId)
}
