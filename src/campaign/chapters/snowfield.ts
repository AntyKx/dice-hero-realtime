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
  // 2026-08-21：這一關改走 Adventure Room Transition 探索引擎（見
  // src/adventure/stages/snowfield21.ts），跟 forest_1_1 同一個模式——
  // id/campaignId/chapter/stageNumber/bgTheme/firstClearReward 留著給
  // CampaignMapScreen 讀（地圖節點/底部關卡資訊面板），App.tsx 的
  // isAdventureStageId('snowfield_2_1') 會把玩家導去 AdventureStageScreen
  // 而不是這裡的 waves/objective，那些欄位變成安全的死欄位，不特地清（見
  // forestRuins.ts 開頭的同款說明）。starConditions 換成跟
  // snowfield21.ts stage.starConditions 完全一致的三個新條件，純粹給 UI
  // 顯示文字用，兩邊沒有自動同步機制，改一邊記得改另一邊。
  stage(1, {
    name: '雪線之外',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { ice_goblin: 4 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { ice_goblin: 5 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { ice_goblin: 6 } },
    ],
    starConditions: [
      { type: 'clear', description: '通關' },
      { type: 'hp_above', value: 60, description: 'HP ≥ 60% 通關' },
      { type: 'avoid_skill', value: 1, skillId: 'frost_wolf_leap', description: '被霜狼 Leap 命中 ≤ 1 次' },
    ],
    estimatedDurationSec: [480, 720],
    firstClearReward: { gold: 52, heroExp: 40 },
    bgTheme: 'snow_foothills',
  }),
  // 2026-08-21：跟 stage(1) 同一個模式，換成 Adventure Room Transition
  // 探索引擎（見 src/adventure/stages/snowfield22.ts）。waves/objective/
  // hazards 是死欄位不特地清，starConditions 換成跟 snowfield22.ts
  // stage.starConditions 一致的三個新條件（純顯示文字用）。
  stage(2, {
    name: '失聯哨站',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { ice_goblin: 3, frost_skeleton: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { ice_goblin: 4, frost_skeleton: 3 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { ice_goblin: 3, frost_skeleton: 3 } },
    ],
    hazards: [{ kind: 'root', count: 3, radius: 55, dps: 6, duration: 999, slowMult: 0.7, rootSec: 0.6 }],
    starConditions: [
      { type: 'clear', description: '通關' },
      { type: 'time_under', value: 720, description: '12 分鐘內通關' },
      { type: 'custom', description: '找到封雪補給庫' },
    ],
    estimatedDurationSec: [600, 840],
    firstClearReward: { gold: 62, heroExp: 46 },
    bgTheme: 'snow_foothills',
  }),
  // 2026-08-21：換成 Adventure Room Transition（見
  // src/adventure/stages/snowfield23.ts），跟其他已轉換的雪原關卡同一個
  // 模式，starConditions 換成跟 snowfield23.ts 一致的三個條件。
  stage(3, {
    name: '白樺獵場',
    objective: { type: 'destroy', destroyCount: 3 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { ice_goblin: 3, frost_archer: 2, ice_crystal_totem: 3 } },
      { trigger: { type: 'elapsed_time', sec: 30 }, enemies: { ice_goblin: 3, frost_archer: 2 } },
      { trigger: { type: 'elapsed_time', sec: 60 }, enemies: { ice_goblin: 2, frost_archer: 2 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗白牙狼王並通關' },
      { type: 'control_count_under', value: 2, description: '被暴風干擾 ≤ 2 次' },
      { type: 'no_death', description: '不使用復活通關' },
    ],
    estimatedDurationSec: [540, 780],
    firstClearReward: { gold: 70, heroExp: 52 },
    bgTheme: 'snow_foothills',
  }),
  // 2026-08-21：換成 Adventure Room Transition（見
  // src/adventure/stages/snowfield24.ts）——跟 stage(1)/(2) 同一個模式，
  // starConditions 換成跟 snowfield24.ts 一致的三個條件。
  stage(4, {
    name: '冰窟低語',
    objective: { type: 'hunt', huntTargetId: 'ice_shaman' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { ice_goblin: 4, yeti_brute: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 1 }, enemies: { yeti_brute: 2 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { yeti_brute: 1 }, eliteEnemies: { ice_shaman: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗冰霜薩滿' },
      { type: 'heal_count_under', value: 2, targetId: 'ice_shaman', description: '薩滿成功治療 ≤ 2 次' },
      { type: 'control_count_under', value: 2, description: 'Frozen ≤ 2 次' },
    ],
    estimatedDurationSec: [660, 960],
    firstClearReward: { gold: 78, heroExp: 60 },
    bgTheme: 'frozen_keep',
  }),
  // 2026-08-21：換成 Adventure Room Transition（見
  // src/adventure/stages/snowfield25.ts）。starConditions 本來就已經跟
  // 新關卡一致，只改 name／estimatedDurationSec／第一顆星描述。
  stage(5, {
    name: '霜甲關門',
    objective: { type: 'boss' },
    boss: { bossEnemyId: 'frost_knight_captain' },
    starConditions: [
      { type: 'clear', description: '擊敗霜甲騎士長' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'avoid_skill', value: 0, skillId: 'frost_knight_ice_charge', description: '不被 Ice Charge 命中' },
    ],
    estimatedDurationSec: [720, 1020],
    firstClearReward: { gold: 140, heroExp: 125 },
    bgTheme: 'frozen_keep',
  }),
  // 2026-08-21：換成 Adventure Room Transition（見
  // src/adventure/stages/snowfield26.ts）。
  stage(6, {
    name: '碎冰之湖',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { frost_wolf: 3, ice_goblin: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { frost_wolf: 3, frost_skeleton: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { frost_wolf: 2, ice_goblin: 3 } },
    ],
    hazards: [{ kind: 'root', count: 2, radius: 70, dps: 8, duration: 999, slowMult: 0.6, rootSec: 0.8 }],
    starConditions: [
      { type: 'clear', description: '擊敗冰晶巨像' },
      { type: 'avoid_hazard', value: 3, hazardId: 'thin_ice', description: '薄冰破裂傷害 ≤ 3 次' },
      { type: 'custom', description: '發現湖心遺跡' },
    ],
    estimatedDurationSec: [700, 1000],
    firstClearReward: { gold: 84, heroExp: 66 },
    bgTheme: 'glacier_cavern',
  }),
  // 2026-08-21：換成 Adventure Room Transition（見
  // src/adventure/stages/snowfield27.ts）。
  stage(7, {
    name: '巨獸雪谷',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { frost_archer: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 1 }, enemies: { snow_troll: 1, frost_archer: 1 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { snow_troll: 1, ice_shaman: 1, frost_archer: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗雪谷暴君' },
      { type: 'hits_under', value: 2, skillId: 'snow_troll_heavy_slam', description: '被重砸技能命中 ≤ 2 次' },
      { type: 'custom', description: '完成高危捷徑並通關' },
    ],
    estimatedDurationSec: [650, 950],
    firstClearReward: { gold: 90, heroExp: 72 },
    bgTheme: 'glacier_cavern',
  }),
  // 2026-08-21：換成 Adventure Room Transition（見
  // src/adventure/stages/snowfield28.ts）。
  stage(8, {
    name: '冰封王城',
    objective: { type: 'defense', durationSec: 90, defenseTargetMaxHp: 440 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { ice_goblin: 2, frost_skeleton: 1 } },
      { trigger: { type: 'elapsed_time', sec: 20 }, enemies: { frost_archer: 2, frost_skeleton: 1 } },
      { trigger: { type: 'elapsed_time', sec: 45 }, enemies: { ice_goblin: 2, frost_archer: 1 } },
      { trigger: { type: 'elapsed_time', sec: 70 }, enemies: { yeti_brute: 1, frost_archer: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗冰封將軍' },
      { type: 'avoid_hazard', value: 4, hazardId: 'frost_tower', description: 'Frost Tower 命中 ≤ 4 次' },
      { type: 'custom', description: '找到冰封寶庫' },
    ],
    estimatedDurationSec: [800, 1150],
    firstClearReward: { gold: 94, heroExp: 76 },
    bgTheme: 'frost_shrine',
  }),
  // 2026-08-21：換成 Adventure Room Transition（見
  // src/adventure/stages/snowfield29.ts）。
  stage(9, {
    name: '永冬祭壇',
    objective: { type: 'hunt', huntTargetId: 'frost_wolf' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { frost_skeleton: 2, ice_goblin: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 1 }, enemies: { frost_wolf: 2, ice_goblin: 1 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: {}, eliteEnemies: { frost_wolf: 1 } },
    ],
    hazards: [{ kind: 'root', count: 2, radius: 55, dps: 6, duration: 999, slowMult: 0.7, rootSec: 0.6 }],
    starConditions: [
      { type: 'clear', description: '擊敗冰霜女王' },
      { type: 'no_death', description: '不使用復活通關' },
      { type: 'control_count_under', value: 2, description: 'Frozen ≤ 2 次' },
    ],
    estimatedDurationSec: [700, 1000],
    firstClearReward: { gold: 104, heroExp: 86 },
    bgTheme: 'glacier_cavern',
  }),
  // 2026-08-21：換成 Adventure Room Transition（見
  // src/adventure/stages/snowfield210.ts）。starConditions 本來就已經跟
  // 新關卡一致，只改 name／estimatedDurationSec。
  stage(10, {
    name: '極寒王座',
    objective: { type: 'boss' },
    boss: { bossEnemyId: 'ice_dragon' },
    hazards: [{ kind: 'root', triggerAtSec: 40, count: 1, radius: 60, dps: 8, duration: 8, slowMult: 0.5, rootSec: 1 }],
    starConditions: [
      { type: 'clear', description: '擊敗冰霜巨龍' },
      { type: 'hp_above', value: 30, description: '通關時 HP ≥ 30%' },
      { type: 'avoid_skill', value: 0, skillId: 'ice_dragon_breath', description: '不被 Frost Breath 直接命中' },
    ],
    estimatedDurationSec: [850, 1200],
    firstClearReward: { gold: 290, heroExp: 260 },
    bgTheme: 'ice_dragon_lair',
  }),
]

export function getSnowfieldStage(stageId: string): CampaignStage | undefined {
  return SNOWFIELD_STAGES.find(s => s.id === stageId)
}
