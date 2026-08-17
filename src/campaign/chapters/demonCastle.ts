/**
 * 魔王城（demon_king_castle）3-1 ~ 3-10 固定關卡資料（2026-08-16 從 20 關
 * 砍到 10 關，見 forestRuins.ts 開頭的說明——同一套壓縮邏輯，5 關普通
 * 內容 + 3-5 中王 + 3-10 最終王。lava_golem/infernal_priestess 這次沒有
 * 位置放，資料留在 enemies.ts/bossSkills.ts 不刪。
 */
import type { CampaignStage } from '../campaignTypes'
import { CAMPAIGN_ID_DEMON_CASTLE } from '../campaignTypes'

const campaignId = CAMPAIGN_ID_DEMON_CASTLE

function stage(n: number, partial: Omit<CampaignStage, 'id' | 'campaignId' | 'chapter' | 'stageNumber'>): CampaignStage {
  return { id: `castle_3_${n}`, campaignId, chapter: 3, stageNumber: n, ...partial }
}

export const DEMON_CASTLE_STAGES: CampaignStage[] = [
  stage(1, {
    name: '煉獄之門',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { imp_soldier: 4 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { imp_soldier: 5 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { imp_soldier: 6 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 60, description: 'HP ≥ 60% 通關' },
      { type: 'time_under', value: 100, description: '100 秒內通關' },
    ],
    estimatedDurationSec: [70, 100],
    firstClearReward: { gold: 64, heroExp: 50 },
    bgTheme: 'demon_gate',
  }),
  stage(2, {
    name: '熔岩裂谷',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { imp_soldier: 3, hell_skeleton: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { imp_soldier: 4, hell_skeleton: 3 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { imp_soldier: 3, hell_skeleton: 3 } },
    ],
    hazards: [{ kind: 'fire', count: 3, radius: 55, dps: 7, duration: 999 }],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 50, description: 'HP ≥ 50% 通關' },
      { type: 'avoid_hazard', value: 0, hazardId: 'fire', description: '不踩中任何熔岩裂縫' },
    ],
    estimatedDurationSec: [90, 120],
    firstClearReward: { gold: 76, heroExp: 56 },
    bgTheme: 'demon_gate',
  }),
  stage(3, {
    name: '熔岩哨站',
    objective: { type: 'destroy', destroyCount: 3 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { imp_soldier: 3, imp_archer: 2, lava_totem: 3 } },
      { trigger: { type: 'elapsed_time', sec: 30 }, enemies: { imp_soldier: 3, imp_archer: 2 } },
      { trigger: { type: 'elapsed_time', sec: 60 }, enemies: { imp_soldier: 2, imp_archer: 2 } },
    ],
    starConditions: [
      { type: 'clear', description: '摧毀 3 個熔岩法陣' },
      { type: 'custom', description: '擊敗所有地獄弓手' },
      { type: 'time_under', value: 85, description: '85 秒內摧毀全部法陣' },
    ],
    estimatedDurationSec: [100, 140],
    firstClearReward: { gold: 84, heroExp: 62 },
    bgTheme: 'demon_gate',
  }),
  stage(4, {
    name: '邪炎祭壇',
    objective: { type: 'hunt', huntTargetId: 'demon_shaman' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { imp_soldier: 4, demon_brute: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 1 }, enemies: { demon_brute: 2 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { demon_brute: 1 }, eliteEnemies: { demon_shaman: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗邪炎術士' },
      { type: 'custom', description: '擊敗全部敵人' },
      { type: 'heal_count_under', value: 2, targetId: 'demon_shaman', description: '術士成功治療 ≤ 2 次' },
    ],
    estimatedDurationSec: [115, 155],
    firstClearReward: { gold: 92, heroExp: 70 },
    bgTheme: 'crimson_hollow',
  }),
  stage(5, {
    name: '煉獄騎士',
    objective: { type: 'boss' },
    boss: { bossEnemyId: 'demon_knight' },
    starConditions: [
      { type: 'clear', description: '擊敗 Boss' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'avoid_skill', value: 0, skillId: 'demon_knight_charge', description: '不被 Charge 命中' },
    ],
    estimatedDurationSec: [135, 170],
    firstClearReward: { gold: 155, heroExp: 140 },
    bgTheme: 'crimson_hollow',
  }),
  stage(6, {
    name: '焚燒迴廊',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { hellhound: 3, imp_soldier: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { hellhound: 3, hell_skeleton: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { hellhound: 2, imp_soldier: 3 } },
    ],
    hazards: [{ kind: 'fire', count: 2, radius: 70, dps: 9, duration: 999 }],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 50, description: 'HP ≥ 50% 通關' },
      { type: 'avoid_hazard', value: 2, hazardId: 'fire', description: '熔岩地面命中 ≤ 2 次' },
    ],
    estimatedDurationSec: [115, 165],
    firstClearReward: { gold: 100, heroExp: 78 },
    bgTheme: 'shadow_keep',
  }),
  stage(7, {
    name: '魔軍要塞',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { imp_archer: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 1 }, enemies: { demon_brute: 1, imp_archer: 1 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { demon_brute: 1, demon_shaman: 1, imp_archer: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'custom', description: '優先擊敗術士' },
      { type: 'control_count_under', value: 3, description: '被地面效果控制 ≤ 3 次' },
    ],
    estimatedDurationSec: [135, 170],
    firstClearReward: { gold: 108, heroExp: 84 },
    bgTheme: 'shadow_keep',
  }),
  stage(8, {
    name: '血色壁壘',
    objective: { type: 'defense', durationSec: 90, defenseTargetMaxHp: 460 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { imp_soldier: 2, hell_skeleton: 1 } },
      { trigger: { type: 'elapsed_time', sec: 20 }, enemies: { imp_archer: 2, hell_skeleton: 1 } },
      { trigger: { type: 'elapsed_time', sec: 45 }, enemies: { imp_soldier: 2, imp_archer: 1 } },
      { trigger: { type: 'elapsed_time', sec: 70 }, enemies: { demon_brute: 1, imp_archer: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: 'Core 存活' },
      { type: 'protect_hp', value: 60, description: 'Core HP ≥ 60%' },
      { type: 'protect_hp', value: 85, description: 'Core HP ≥ 85%' },
    ],
    estimatedDurationSec: [95, 115],
    firstClearReward: { gold: 114, heroExp: 90 },
    bgTheme: 'blood_altar',
  }),
  stage(9, {
    name: '獵犬追獵',
    objective: { type: 'hunt', huntTargetId: 'hellhound' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { hell_skeleton: 2, imp_soldier: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 1 }, enemies: { hellhound: 2, imp_soldier: 1 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: {}, eliteEnemies: { hellhound: 1 } },
    ],
    hazards: [{ kind: 'fire', count: 2, radius: 55, dps: 7, duration: 999 }],
    starConditions: [
      { type: 'clear', description: '擊殺 Elite 地獄獵犬' },
      { type: 'hp_above', value: 50, description: 'HP ≥ 50% 通關' },
      { type: 'avoid_skill', value: 0, skillId: 'hellhound_leap', description: '不被地獄獵犬的 Leap 命中' },
    ],
    estimatedDurationSec: [135, 165],
    firstClearReward: { gold: 124, heroExp: 100 },
    bgTheme: 'shadow_keep',
  }),
  stage(10, {
    name: '深淵魔王',
    objective: { type: 'boss' },
    boss: { bossEnemyId: 'demon_king' },
    hazards: [{ kind: 'fire', triggerAtSec: 40, count: 1, radius: 60, dps: 11, duration: 8 }],
    starConditions: [
      { type: 'clear', description: '擊敗深淵魔王' },
      { type: 'hp_above', value: 30, description: '通關時 HP ≥ 30%' },
      { type: 'avoid_skill', value: 0, skillId: 'demon_king_inferno', description: '不被 Inferno 直接命中' },
    ],
    estimatedDurationSec: [270, 400],
    firstClearReward: { gold: 340, heroExp: 310 },
    bgTheme: 'throne_of_ash',
  }),
]

export function getDemonCastleStage(stageId: string): CampaignStage | undefined {
  return DEMON_CASTLE_STAGES.find(s => s.id === stageId)
}
