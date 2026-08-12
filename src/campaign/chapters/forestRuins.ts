/**
 * 森林遺跡（forest_ruins）1-1 ~ 1-20 固定關卡資料。
 *
 * 2026-08-12 V2 重寫（見 D:\CLAUDE專案\三選一\關卡\森林篇章\關卡機制.txt）：
 * 第一版每關只塞一次性生成的 4~6 隻小怪，套用的又是 Roguelite 那套「怪物
 * 血量低、靠源源不絕刷怪撐時間」的公式，導致關卡幾秒鐘就被清空，完全沒有
 * 「打完一場關卡」的感覺。這次全部改成多波（EnemyWave + WaveTrigger）結構：
 * 「同時在場敵人數」維持 3~8 隻可讀範圍，但「整關總敵人數」拉到 7~25 隻，
 * 用 Soft Wave Transition（remaining_enemy_count 重疊進場 / previous_wave_cleared
 * 短暫延遲）讓整關像一場連續戰鬥，不是一次性小房間。時間型星星門檻也依
 * V2 文件原則（門檻大約落在目標時間上緣，不是硬要求最短時間）重新校準。
 *
 * 星星條件裡原文寫「指定次數/指定值」的地方補上具體數字，理由見核准的
 * 設計文件 C 節說明（不能讓 Mage/Rogue/Fighter 天然佔便宜）。敵人 id 對應
 * src/arena/enemies.ts 新增的 12 種森林敵人 + 4 個 Boss。
 */
import type { CampaignStage } from '../campaignTypes'
import { CAMPAIGN_ID_FOREST_RUINS } from '../campaignTypes'

const campaignId = CAMPAIGN_ID_FOREST_RUINS

function stage(n: number, partial: Omit<CampaignStage, 'id' | 'campaignId' | 'chapter' | 'stageNumber'>): CampaignStage {
  return { id: `forest_1_${n}`, campaignId, chapter: 1, stageNumber: n, ...partial }
}

export const FOREST_RUINS_STAGES: CampaignStage[] = [
  stage(1, {
    name: '森林入口',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { goblin_warrior: 4 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { goblin_warrior: 5 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { goblin_warrior: 6 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 60, description: 'HP ≥ 60% 通關' },
      { type: 'time_under', value: 90, description: '90 秒內通關' },
    ],
    estimatedDurationSec: [60, 90],
    firstClearReward: { gold: 40, heroExp: 30 },
    bgTheme: 'forest_entrance',
  }),
  stage(2, {
    name: '苔蘚古道',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { goblin_warrior: 4, skeleton_scout: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { goblin_warrior: 3, skeleton_scout: 3 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { skeleton_scout: 4, goblin_warrior: 3 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hits_under', value: 8, description: '被擊中 ≤ 8 次' },
      { type: 'hp_above', value: 70, description: 'HP ≥ 70% 通關' },
    ],
    estimatedDurationSec: [70, 100],
    firstClearReward: { gold: 45, heroExp: 35 },
    bgTheme: 'forest_entrance',
  }),
  stage(3, {
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
    firstClearReward: { gold: 50, heroExp: 35 },
    bgTheme: 'forest_entrance',
  }),
  stage(4, {
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
    firstClearReward: { gold: 55, heroExp: 40 },
    bgTheme: 'forest_entrance',
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
    firstClearReward: { gold: 100, heroExp: 90 },
    bgTheme: 'ancient_ruins',
  }),
  stage(6, {
    name: '遠方箭雨',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { goblin_warrior: 4, goblin_archer: 2 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { goblin_warrior: 3, goblin_archer: 3 } },
      { trigger: { type: 'remaining_enemy_count', count: 2 }, enemies: { orc_warrior: 2, goblin_archer: 3, goblin_warrior: 2 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { goblin_archer: 3, goblin_warrior: 3 } },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'custom', description: '擊敗全部哥布林弓手' },
      { type: 'hits_under', value: 8, description: '被箭矢命中 ≤ 8 次' },
    ],
    estimatedDurationSec: [100, 140],
    firstClearReward: { gold: 55, heroExp: 45 },
    bgTheme: 'ancient_ruins',
  }),
  stage(7, {
    name: '薩滿祭壇',
    objective: { type: 'hunt', huntTargetId: 'forest_shaman' },
    // 只在最後一波放單一薩滿（Hunt 的勝利判定是「命中 huntTargetId 就算贏」，
    // 場上不能同時有第二隻同 typeId 的敵人，不然玩家可能先殺掉錯的那隻就
    // 提前結算，見 objectives.ts 的 onHuntTargetDefeated）——前面的波次先讓
    // 玩家打過一輪護衛，符合「先經過一小段戰鬥→Shaman登場」的設計。
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
    firstClearReward: { gold: 60, heroExp: 50 },
    bgTheme: 'ancient_ruins',
  }),
  stage(8, {
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
    firstClearReward: { gold: 60, heroExp: 50 },
    bgTheme: 'poison_forest',
  }),
  stage(9, {
    name: '樹根迷境',
    objective: { type: 'elimination' },
    // Tank+Ranged+Support 逐步加入，不要第一秒就把整組合塞給玩家；薩滿放最後一波，呼應「優先擊敗薩滿」的三星。
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
    firstClearReward: { gold: 65, heroExp: 55 },
    bgTheme: 'poison_forest',
  }),
  stage(10, {
    name: '古樹守衛',
    objective: { type: 'boss' },
    boss: { bossEnemyId: 'ancient_treant_guardian' },
    starConditions: [
      { type: 'clear', description: '擊敗 Boss' },
      { type: 'time_under', value: 195, description: '195 秒內通關' },
      { type: 'destroy_within', value: 10, targetId: 'root_core', description: '每次 Core 出現後 10 秒內全滅' },
    ],
    estimatedDurationSec: [155, 195],
    firstClearReward: { gold: 120, heroExp: 110 },
    bgTheme: 'ancient_altar',
  }),
  stage(11, {
    name: '遺跡守護',
    objective: { type: 'defense', durationSec: 90, defenseTargetMaxHp: 400 },
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
    firstClearReward: { gold: 65, heroExp: 55 },
    bgTheme: 'ancient_altar',
  }),
  stage(12, {
    name: '魔力碎片',
    objective: { type: 'collection', collectCount: 5 },
    // 簡化版「區域清怪」：完整的 Area A/B/C 逐區守衛+碎片重構是更大的引擎改動
    // （見 objectives.ts 的說明），這裡先用拉長的多波敵人壓力頂著，讓收集
    // 過程始終有戰鬥張力，不是空地上站著撿 5 秒——回報時會明確列出這個簡化。
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { goblin_warrior: 2, skeleton_scout: 2 } },
      { trigger: { type: 'elapsed_time', sec: 35 }, enemies: { goblin_archer: 2, goblin_warrior: 1 } },
      { trigger: { type: 'elapsed_time', sec: 70 }, enemies: { skeleton_scout: 2, goblin_archer: 1 } },
      { trigger: { type: 'elapsed_time', sec: 100 }, enemies: { goblin_warrior: 2 } },
    ],
    starConditions: [
      { type: 'clear', description: '收集 5 個魔力碎片' },
      { type: 'hp_above', value: 50, description: 'HP ≥ 50% 通關' },
      { type: 'time_under', value: 140, description: '140 秒內完成' },
    ],
    estimatedDurationSec: [125, 155],
    firstClearReward: { gold: 65, heroExp: 55 },
    bgTheme: 'ancient_altar',
  }),
  stage(13, {
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
    firstClearReward: { gold: 70, heroExp: 60 },
    bgTheme: 'poison_forest',
  }),
  stage(14, {
    name: '毒霧生存戰',
    objective: { type: 'survival', durationSec: 90 },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { toxic_mushroom: 3 } },
      { trigger: { type: 'elapsed_time', sec: 25 }, enemies: { forest_treant: 1, goblin_archer: 1 } },
      { trigger: { type: 'elapsed_time', sec: 55 }, enemies: { goblin_archer: 1, toxic_mushroom: 1 } },
      { trigger: { type: 'elapsed_time', sec: 75 }, enemies: { skeleton_scout: 2 } },
    ],
    hazards: [{ kind: 'poison', count: 1, radius: 90, dps: 6, duration: 999 }],
    starConditions: [
      { type: 'clear', description: '存活 90 秒' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'avoid_hazard', value: 35, hazardId: 'poison_cumulative_pct', description: '毒霧累積傷害 ≤ 最大HP的35%' },
    ],
    estimatedDurationSec: [90, 105],
    firstClearReward: { gold: 70, heroExp: 60 },
    bgTheme: 'poison_forest',
  }),
  stage(15, {
    name: '黑騎士先鋒',
    objective: { type: 'boss' },
    boss: { bossEnemyId: 'dark_knight_vanguard' },
    starConditions: [
      { type: 'clear', description: '擊敗 Boss' },
      { type: 'time_under', value: 200, description: '200 秒內擊敗' },
      { type: 'counter_trigger_under', value: 0, description: '完全不觸發 Counter' },
    ],
    estimatedDurationSec: [150, 210],
    firstClearReward: { gold: 140, heroExp: 130 },
    bgTheme: 'ancient_altar',
  }),
  stage(16, {
    name: '腐敗森林',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { toxic_mushroom: 2, forest_shaman: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 1 }, enemies: { forest_treant: 1, toxic_mushroom: 1 } },
      { trigger: { type: 'remaining_enemy_count', count: 1 }, enemies: { toxic_mushroom: 2, forest_treant: 1 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { forest_shaman: 1, toxic_mushroom: 2 } },
    ],
    hazards: [
      { kind: 'poison', count: 1, radius: 70, dps: 8, duration: 999 },
      { kind: 'thorn', count: 2, radius: 55, dps: 6, duration: 999, slowMult: 0.7 },
    ],
    starConditions: [
      { type: 'clear', description: '擊敗所有敵人' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'avoid_hazard', value: 5, hazardId: 'any', description: '地板效果命中總數 ≤ 5' },
    ],
    estimatedDurationSec: [120, 160],
    firstClearReward: { gold: 75, heroExp: 65 },
    bgTheme: 'poison_forest',
  }),
  stage(17, {
    name: '遺跡防衛戰',
    objective: { type: 'defense', durationSec: 110, defenseTargetMaxHp: 500 },
    // 分階段：前30秒 Basic → 30~70秒 Ranged+Support → 70秒後 Heavy+Mixed
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { goblin_warrior: 2 } },
      { trigger: { type: 'elapsed_time', sec: 30 }, enemies: { goblin_archer: 1, forest_shaman: 1 } },
      { trigger: { type: 'elapsed_time', sec: 55 }, enemies: { goblin_archer: 1, forest_shaman: 1 } },
      { trigger: { type: 'elapsed_time', sec: 75 }, enemies: { orc_warrior: 1, goblin_warrior: 1 } },
      { trigger: { type: 'elapsed_time', sec: 95 }, enemies: { orc_warrior: 1, goblin_archer: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: 'Defense 成功' },
      { type: 'protect_hp', value: 50, description: 'Core HP ≥ 50%' },
      { type: 'protect_hp', value: 75, description: 'Core HP ≥ 75%' },
    ],
    estimatedDurationSec: [110, 130],
    firstClearReward: { gold: 80, heroExp: 70 },
    bgTheme: 'ancient_altar',
  }),
  stage(18, {
    name: '雙獸人隊長',
    objective: { type: 'boss' },
    boss: { bossEnemyId: 'orc_chieftain', count: 2 },
    starConditions: [
      { type: 'clear', description: '擊敗雙 Boss' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'avoid_skill', value: 0, skillId: 'orc_chieftain_charge', description: '不被任何 Charge 命中' },
    ],
    estimatedDurationSec: [150, 180],
    firstClearReward: { gold: 150, heroExp: 140 },
    bgTheme: 'dragon_nest',
  }),
  stage(19, {
    name: '龍巢入口',
    objective: { type: 'elimination' },
    waves: [
      { trigger: { type: 'stage_start' }, enemies: { skeleton_scout: 4 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { forest_treant: 2, forest_shaman: 2 } },
      { trigger: { type: 'previous_wave_cleared', delaySec: 1 }, enemies: { orc_warrior: 2, goblin_archer: 2, toxic_mushroom: 1 } },
    ],
    starConditions: [
      { type: 'clear', description: '完成三波' },
      { type: 'hp_above', value: 40, description: 'HP ≥ 40% 通關' },
      { type: 'no_death', description: '過程中沒有觸發過死亡結算' },
    ],
    estimatedDurationSec: [150, 180],
    firstClearReward: { gold: 90, heroExp: 80 },
    bgTheme: 'dragon_nest',
  }),
  stage(20, {
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
    firstClearReward: { gold: 250, heroExp: 220 },
    bgTheme: 'dragon_nest',
  }),
]

export function getForestRuinsStage(stageId: string): CampaignStage | undefined {
  return FOREST_RUINS_STAGES.find(s => s.id === stageId)
}
