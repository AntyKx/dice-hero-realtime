/**
 * 雪原（snowfield_wastes）2-1 ~ 2-10 固定關卡資料（2026-08-16 從 20 關砍到
 * 10 關，見 forestRuins.ts 開頭的說明——同一套壓縮邏輯，5 關普通內容 +
 * 2-5 中王 + 2-10 最終王。ice_golem_colossus/frost_queen 這兩隻 Boss 這次
 * 沒有位置放，資料留在 enemies.ts/bossSkills.ts 不刪。
 */
import type { CampaignStage } from '../campaignTypes'
import { CAMPAIGN_ID_SNOWFIELD } from '../campaignTypes'

const campaignId = CAMPAIGN_ID_SNOWFIELD

function stage(n: number, partial: Omit<CampaignStage, 'id' | 'campaignId' | 'chapter' | 'stageNumber'>): CampaignStage {
  return { id: `snowfield_2_${n}`, campaignId, chapter: 2, stageNumber: n, ...partial }
}

export const SNOWFIELD_STAGES: CampaignStage[] = [
  stage(1, {
    name: '雪原前哨',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { ice_goblin: 4 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { ice_goblin: 5 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { ice_goblin: 6 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 60, description: 'HP ≥ 60% 通關' },
      { type: 'time_under', value: 95, description: '95 秒內通關' },
    ],
    estimatedDurationSec: [65, 95],
    firstClearReward: { gold: 52, heroExp: 40 },
    bgTheme: 'snow_foothills',
  }),
  stage(2, {
    name: '凍林小徑',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { ice_goblin: 3, frost_skeleton: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { ice_goblin: 4, frost_skeleton: 3 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { ice_goblin: 3, frost_skeleton: 3 } },
    ],
    hazards: [{ kind: 'root', count: 3, radius: 55, dps: 6, duration: 999, slowMult: 0.7, rootSec: 0.6 }],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 50, description: 'HP ≥ 50% 通關' },
      { type: 'avoid_hazard', value: 0, hazardId: 'root', description: '不踩中任何結冰地面' },
    ],
    estimatedDurationSec: [85, 115],
    firstClearReward: { gold: 62, heroExp: 46 },
    bgTheme: 'snow_foothills',
  }),
  stage(3, {
    name: '冰晶哨站',
    objective: { type: 'destroy', destroyCount: 3 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { ice_goblin: 3, frost_archer: 2, ice_crystal_totem: 3 } },
      { trigger: { type: 'elapsed_time', sec: 30 }, enemies: { ice_goblin: 3, frost_archer: 2 } },
      { trigger: { type: 'elapsed_time', sec: 60 }, enemies: { ice_goblin: 2, frost_archer: 2 } },
    ],
    starConditions: [
      { type: 'clear', description: '摧毀 3 個冰晶法陣' },
      { type: 'custom', description: '擊敗所有冰霜弓手' },
      { type: 'time_under', value: 80, description: '80 秒內摧毀全部法陣' },
    ],
    estimatedDurationSec: [95, 135],
    firstClearReward: { gold: 70, heroExp: 52 },
    bgTheme: 'snow_foothills',
  }),
  stage(4, {
    name: '薩滿冰窟',
    objective: { type: 'hunt', huntTargetId: 'ice_shaman' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { ice_goblin: 4, yeti_brute: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 1 }, enemies: { yeti_brute: 2 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { yeti_brute: 1 }, eliteEnemies: { ice_shaman: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗冰霜薩滿' },
      { type: 'custom', description: '擊敗全部敵人' },
      { type: 'heal_count_under', value: 2, targetId: 'ice_shaman', description: '薩滿成功治療 ≤ 2 次' },
    ],
    estimatedDurationSec: [110, 150],
    firstClearReward: { gold: 78, heroExp: 60 },
    bgTheme: 'frozen_keep',
  }),
  stage(5, {
    name: '霜甲騎士長',
    objective: { type: 'boss' },
    boss: { bossEnemyId: 'frost_knight_captain' },
    starConditions: [
      { type: 'clear', description: '擊敗 Boss' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'avoid_skill', value: 0, skillId: 'frost_knight_ice_charge', description: '不被 Ice Charge 命中' },
    ],
    estimatedDurationSec: [130, 165],
    firstClearReward: { gold: 140, heroExp: 125 },
    bgTheme: 'frozen_keep',
  }),
  stage(6, {
    name: '凍骨洞穴',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { frost_wolf: 3, ice_goblin: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { frost_wolf: 3, frost_skeleton: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { frost_wolf: 2, ice_goblin: 3 } },
    ],
    hazards: [{ kind: 'root', count: 2, radius: 70, dps: 8, duration: 999, slowMult: 0.6, rootSec: 0.8 }],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 50, description: 'HP ≥ 50% 通關' },
      { type: 'avoid_hazard', value: 2, hazardId: 'root', description: '結冰地面命中 ≤ 2 次' },
    ],
    estimatedDurationSec: [110, 160],
    firstClearReward: { gold: 84, heroExp: 66 },
    bgTheme: 'glacier_cavern',
  }),
  stage(7, {
    name: '雪怪領地',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { frost_archer: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 1 }, enemies: { snow_troll: 1, frost_archer: 1 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { snow_troll: 1, ice_shaman: 1, frost_archer: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'custom', description: '優先擊敗薩滿' },
      { type: 'control_count_under', value: 3, description: '被冰面控制 ≤ 3 次' },
    ],
    estimatedDurationSec: [130, 165],
    firstClearReward: { gold: 90, heroExp: 72 },
    bgTheme: 'glacier_cavern',
  }),
  stage(8, {
    name: '冰晶壁壘',
    objective: { type: 'defense', durationSec: 90, defenseTargetMaxHp: 440 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { ice_goblin: 2, frost_skeleton: 1 } },
      { trigger: { type: 'elapsed_time', sec: 20 }, enemies: { frost_archer: 2, frost_skeleton: 1 } },
      { trigger: { type: 'elapsed_time', sec: 45 }, enemies: { ice_goblin: 2, frost_archer: 1 } },
      { trigger: { type: 'elapsed_time', sec: 70 }, enemies: { yeti_brute: 1, frost_archer: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: 'Core 存活' },
      { type: 'protect_hp', value: 60, description: 'Core HP ≥ 60%' },
      { type: 'protect_hp', value: 85, description: 'Core HP ≥ 85%' },
    ],
    estimatedDurationSec: [95, 115],
    firstClearReward: { gold: 94, heroExp: 76 },
    bgTheme: 'frost_shrine',
  }),
  stage(9, {
    name: '寒狼追獵',
    objective: { type: 'hunt', huntTargetId: 'frost_wolf' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { frost_skeleton: 2, ice_goblin: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 1 }, enemies: { frost_wolf: 2, ice_goblin: 1 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: {}, eliteEnemies: { frost_wolf: 1 } },
    ],
    hazards: [{ kind: 'root', count: 2, radius: 55, dps: 6, duration: 999, slowMult: 0.7, rootSec: 0.6 }],
    starConditions: [
      { type: 'clear', description: '擊殺 Elite 寒冰狼' },
      { type: 'hp_above', value: 50, description: 'HP ≥ 50% 通關' },
      { type: 'avoid_skill', value: 0, skillId: 'frost_wolf_leap', description: '不被寒冰狼的 Leap 命中' },
    ],
    estimatedDurationSec: [130, 160],
    firstClearReward: { gold: 104, heroExp: 86 },
    bgTheme: 'glacier_cavern',
  }),
  stage(10, {
    name: '冰霜巨龍',
    objective: { type: 'boss' },
    boss: { bossEnemyId: 'ice_dragon' },
    hazards: [{ kind: 'root', triggerAtSec: 40, count: 1, radius: 60, dps: 8, duration: 8, slowMult: 0.5, rootSec: 1 }],
    starConditions: [
      { type: 'clear', description: '擊敗冰霜巨龍' },
      { type: 'hp_above', value: 30, description: '通關時 HP ≥ 30%' },
      { type: 'avoid_skill', value: 0, skillId: 'ice_dragon_breath', description: '不被 Frost Breath 直接命中' },
    ],
    estimatedDurationSec: [260, 380],
    firstClearReward: { gold: 290, heroExp: 260 },
    bgTheme: 'ice_dragon_lair',
  }),
]

export function getSnowfieldStage(stageId: string): CampaignStage | undefined {
  return SNOWFIELD_STAGES.find(s => s.id === stageId)
}
