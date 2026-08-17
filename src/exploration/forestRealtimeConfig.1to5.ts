export type Rect = { x: number; y: number; width: number; height: number }
export type ExplorationZoneKind = 'skirmish' | 'totem' | 'shaman' | 'supply' | 'boss' | 'exit'

export type ExplorationZone = Rect & {
  id: string
  kind: ExplorationZoneKind
  label: string
  triggerRadius: number
  /** 進入這個 zone 前必須先完成的其他 zone id（目前只有 exit 用到）。 */
  required?: string[]
}

export type ForestRealtimeStage = {
  stageId: `forest_1_${1 | 2 | 3 | 4 | 5}`
  name: string
  world: { width: number; height: number }
  spawn: { x: number; y: number }
  backgroundColor: string
  colliders: Rect[]
  zones: ExplorationZone[]
}

/**
 * 森林遺跡 1-1~1-5 連續探索示範用的直向 world-space 資料（2026-08-17）。
 * 1440×2560 純粹是設計基準，實際渲染時依 viewport 等比縮放。
 *
 * 座標／事件配置沿用使用者提供的美術包草案，但依討論結果簡化過：所有
 * skirmish/totem/shaman/boss 這類「戰鬥點」都指向同一場「這一關本來就有」
 * 的既有 Arena 戰鬥（不新增任何遭遇戰資料），玩家走到任一個都會觸發同一場
 * campaign_stage 戰鬥，打贏後整關視為通關。supply 是純敘事互動，沒有機制
 * 後果。exit 需要這一關已通關（isStageUnlocked+cleared）才能真正使用。
 */
export const FOREST_REALTIME_STAGES_1_TO_5: ForestRealtimeStage[] = [
  {
    stageId: 'forest_1_1', name: '森林入口', world: { width: 1440, height: 2560 },
    spawn: { x: 720, y: 2320 }, backgroundColor: '#3f6b3a',
    colliders: [
      { x: 70, y: 360, width: 180, height: 360 }, { x: 1190, y: 360, width: 180, height: 360 },
      { x: 80, y: 1460, width: 170, height: 260 }, { x: 1190, y: 1460, width: 170, height: 260 },
    ],
    zones: [
      { id: 'skirmish_1', kind: 'skirmish', label: '中央清場廣場', x: 420, y: 1300, width: 600, height: 420, triggerRadius: 190 },
      { id: 'supply_1', kind: 'supply', label: '枯木哨台補給', x: 180, y: 1500, width: 220, height: 220, triggerRadius: 130 },
      { id: 'exit_1', kind: 'exit', label: '北側石門', x: 520, y: 100, width: 400, height: 220, triggerRadius: 160, required: ['skirmish_1'] },
    ],
  },
  {
    stageId: 'forest_1_2', name: '荊棘之地', world: { width: 1440, height: 2560 },
    spawn: { x: 190, y: 2300 }, backgroundColor: '#457a3f',
    colliders: [
      { x: 50, y: 400, width: 180, height: 430 }, { x: 1210, y: 400, width: 180, height: 430 },
      { x: 420, y: 1700, width: 160, height: 300 }, { x: 860, y: 1700, width: 160, height: 300 },
    ],
    zones: [
      { id: 'skirmish_2', kind: 'skirmish', label: '中央十字清場區', x: 420, y: 1100, width: 600, height: 500, triggerRadius: 190 },
      { id: 'thorn_2', kind: 'skirmish', label: '東側荊棘區', x: 1080, y: 1050, width: 260, height: 480, triggerRadius: 130 },
      { id: 'supply_2', kind: 'supply', label: '古樹根部補給', x: 180, y: 1780, width: 220, height: 220, triggerRadius: 130 },
      { id: 'exit_2', kind: 'exit', label: '東北出口', x: 1040, y: 100, width: 300, height: 240, triggerRadius: 160, required: ['skirmish_2'] },
    ],
  },
  {
    stageId: 'forest_1_3', name: '哥布林營地', world: { width: 1440, height: 2560 },
    spawn: { x: 720, y: 2320 }, backgroundColor: '#3d6e39',
    colliders: [
      { x: 70, y: 360, width: 180, height: 300 }, { x: 1190, y: 360, width: 180, height: 300 },
      { x: 80, y: 1840, width: 170, height: 280 }, { x: 1190, y: 1840, width: 170, height: 280 },
    ],
    zones: [
      { id: 'camp_3', kind: 'skirmish', label: '中央營火廣場', x: 420, y: 1100, width: 600, height: 560, triggerRadius: 190 },
      { id: 'totem_west_3', kind: 'totem', label: '西側圖騰', x: 150, y: 720, width: 240, height: 240, triggerRadius: 130 },
      { id: 'totem_east_3', kind: 'totem', label: '東側圖騰', x: 1050, y: 720, width: 240, height: 240, triggerRadius: 130 },
      { id: 'totem_north_3', kind: 'totem', label: '北側圖騰', x: 600, y: 360, width: 240, height: 240, triggerRadius: 130 },
      { id: 'exit_3', kind: 'exit', label: '北側木柵', x: 540, y: 70, width: 360, height: 220, triggerRadius: 150, required: ['camp_3'] },
    ],
  },
  {
    stageId: 'forest_1_4', name: '薩滿祭壇', world: { width: 1440, height: 2560 },
    spawn: { x: 720, y: 2320 }, backgroundColor: '#39653a',
    colliders: [
      { x: 60, y: 440, width: 190, height: 370 }, { x: 1190, y: 440, width: 190, height: 370 },
      { x: 80, y: 1500, width: 170, height: 300 }, { x: 1190, y: 1500, width: 170, height: 300 },
    ],
    zones: [
      { id: 'guard_4', kind: 'skirmish', label: '護衛清場區', x: 400, y: 1350, width: 640, height: 420, triggerRadius: 190 },
      { id: 'altar_4', kind: 'totem', label: '中央祭壇圓場', x: 500, y: 720, width: 440, height: 420, triggerRadius: 180 },
      { id: 'shaman_4', kind: 'shaman', label: '北側森林薩滿', x: 570, y: 350, width: 300, height: 240, triggerRadius: 150 },
      { id: 'exit_4', kind: 'exit', label: '遺跡門', x: 540, y: 60, width: 360, height: 190, triggerRadius: 150, required: ['guard_4'] },
    ],
  },
  {
    stageId: 'forest_1_5', name: '狂暴獸人隊長', world: { width: 1440, height: 2560 },
    spawn: { x: 720, y: 2330 }, backgroundColor: '#2f4f39',
    colliders: [
      { x: 60, y: 380, width: 180, height: 300 }, { x: 1200, y: 380, width: 180, height: 300 },
      { x: 60, y: 1680, width: 160, height: 360 }, { x: 1220, y: 1680, width: 160, height: 360 },
    ],
    zones: [
      { id: 'supply_5', kind: 'supply', label: 'Boss 前補給', x: 560, y: 1820, width: 320, height: 220, triggerRadius: 140 },
      { id: 'boss_5', kind: 'boss', label: '獸人儀式台', x: 180, y: 720, width: 1080, height: 760, triggerRadius: 240 },
      { id: 'exit_5', kind: 'exit', label: '根門出口', x: 540, y: 50, width: 360, height: 180, triggerRadius: 150, required: ['boss_5'] },
    ],
  },
]

export function getForestRealtimeStage(stageId: string): ForestRealtimeStage | undefined {
  return FOREST_REALTIME_STAGES_1_TO_5.find(stage => stage.stageId === stageId)
}

/** 這一關要不要先走連續探索示範層，而不是點了直接進 Arena。 */
export function isForestExploreStageId(stageId: string): boolean {
  return FOREST_REALTIME_STAGES_1_TO_5.some(stage => stage.stageId === stageId)
}

/** 是不是需要走既有 Arena 才能標記完成的「戰鬥點」（相對於 supply/exit）。 */
export function isCombatZone(kind: ExplorationZoneKind): boolean {
  return kind === 'skirmish' || kind === 'totem' || kind === 'shaman' || kind === 'boss'
}
