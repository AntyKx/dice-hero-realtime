/**
 * 森林遺跡 1-1~1-5「同一張地圖完成探索＋戰鬥＋結算」的世界資料
 * （2026-08-17，見 ArenaGame.ts 的 initExploreStage/updateExploreWorld）。
 *
 * 設計原則：不新增任何遭遇戰內容——每關真正的戰鬤還是那一關 CampaignStage
 * 資料表裡本來就有的 waves/boss（見 forestRuins.ts），只是觸發方式從
 * 「一進場就打」改成「走到 battleZone 才觸發」，敵人從 battleZone 邊緣
 * 冒出來，不是從整個世界邊緣冒出來。totem/altar/shaman/chest 這些地標是
 * 純視覺（探索感用），不是各自獨立的遭遇戰——1-3 的 3 個圖騰在真實資料裡
 * 其實是 battleZone 那一波敵人（forest_totem 類型）的一部分，這裡的地標
 * 只是讓玩家探索時「看得到」它們大概在哪，實際摧毀判定仍是既有的
 * destroyRemaining 機制。
 */

export type LandmarkKind = 'totem' | 'altar' | 'shaman' | 'chest' | 'supply' | 'boss'

export interface ExploreLandmark {
  kind: LandmarkKind
  x: number
  y: number
  label: string
}

export interface ExploreWorld {
  stageId: `forest_1_${1 | 2 | 3 | 4 | 5}`
  world: { width: number; height: number }
  spawn: { x: number; y: number }
  /** 觸發戰鬤的區域——玩家進入這個矩形（含 margin）就會觸發這一關的
   * 既有 waves／boss；戰鬤期間鏡頭與移動範圍鎖定在這個矩形（略放寬）內。 */
  battleZone: { x: number; y: number; width: number; height: number }
  /** 純視覺地標，探索感用，不是獨立觸發點。 */
  landmarks: ExploreLandmark[]
  /** 通關（battleZone 清空）後才能使用的出口，抵達即完成整關。 */
  exit: { x: number; y: number; radius: number }
}

const W = 1440
const H = 2560

export const EXPLORE_WORLDS: ExploreWorld[] = [
  {
    stageId: 'forest_1_1', world: { width: W, height: H }, spawn: { x: 720, y: 2320 },
    battleZone: { x: 340, y: 1250, width: 760, height: 520 },
    landmarks: [{ kind: 'supply', x: 260, y: 1850, label: '枯木哨台' }],
    exit: { x: 720, y: 150, radius: 170 },
  },
  {
    stageId: 'forest_1_2', world: { width: W, height: H }, spawn: { x: 220, y: 2300 },
    battleZone: { x: 370, y: 950, width: 780, height: 560 },
    landmarks: [
      { kind: 'supply', x: 200, y: 1650, label: '古樹根部' },
      { kind: 'chest', x: 1150, y: 1500, label: '荊棘密藏' },
    ],
    exit: { x: 1180, y: 150, radius: 180 },
  },
  {
    stageId: 'forest_1_3', world: { width: W, height: H }, spawn: { x: 720, y: 2320 },
    battleZone: { x: 340, y: 850, width: 760, height: 620 },
    landmarks: [
      { kind: 'totem', x: 350, y: 1000, label: '西側圖騰' },
      { kind: 'totem', x: 1090, y: 1000, label: '東側圖騰' },
      { kind: 'totem', x: 720, y: 780, label: '北側圖騰' },
    ],
    exit: { x: 720, y: 150, radius: 170 },
  },
  {
    stageId: 'forest_1_4', world: { width: W, height: H }, spawn: { x: 720, y: 2320 },
    battleZone: { x: 340, y: 900, width: 760, height: 600 },
    landmarks: [
      { kind: 'altar', x: 720, y: 950, label: '祭壇' },
      { kind: 'shaman', x: 720, y: 720, label: '森林薩滿' },
    ],
    exit: { x: 720, y: 130, radius: 160 },
  },
  {
    stageId: 'forest_1_5', world: { width: W, height: H }, spawn: { x: 720, y: 2330 },
    battleZone: { x: 190, y: 500, width: 1060, height: 800 },
    landmarks: [
      { kind: 'supply', x: 720, y: 1850, label: 'Boss 前補給' },
      { kind: 'boss', x: 720, y: 700, label: '狂暴獸人隊長' },
    ],
    exit: { x: 720, y: 90, radius: 160 },
  },
]

export function getExploreWorld(stageId: string): ExploreWorld | undefined {
  return EXPLORE_WORLDS.find(w => w.stageId === stageId)
}

export function isExploreStageId(stageId: string | undefined): boolean {
  return !!stageId && EXPLORE_WORLDS.some(w => w.stageId === stageId)
}
