/**
 * 森林遺跡 1-1~1-5「同一張地圖完成探索＋戰鬥＋結算」的世界資料
 * （2026-08-17，見 ArenaGame.ts 的 initExploreStage/updateExploreWorld）。
 *
 * 2026-08-18：改用使用者提供的 5 張手繪地圖（2560×1440 橫向構圖，見
 * public/assets/campaign/explore/）取代原本借用的既有戰鬤背景。這幾張圖
 * 是橫向構圖但內容（大門/圖騰/祭壇/競技場）都集中在畫面中段，直接等比
 * 縮放鋪滿整個直向世界（cover-fit）會把左右兩側裁掉——改用「fit-width」
 * （寬度完全對齊世界寬度，不裁切，圖高等比縮小）貼在世界最上方，圖片
 * 涵蓋不到的下半部世界（玩家出生走上來的路）用純色延伸，不會露出破圖。
 * 座標是用實際圖片內容量出來的（哪裡是大門、哪裡是圖騰），不是憑空排版。
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
  /** 使用者提供的手繪地圖，fit-width 貼在世界最上方（見檔頭說明）。 */
  backgroundAsset: string
  /** 圖片涵蓋不到的下半部世界用這個顏色延伸鋪底，避免露出畫布底色。 */
  groundColor: number
  /** 觸發戰鬤的區域——玩家進入這個矩形（含 margin）就會觸發這一關的
   * 既有 waves／boss；戰鬤期間鏡頭與移動範圍鎖定在這個矩形（略放寬）內。 */
  battleZone: { x: number; y: number; width: number; height: number }
  /** 純視覺地標，探索感用，不是獨立觸發點。 */
  landmarks: ExploreLandmark[]
  /** 通關（battleZone 清空）後才能使用的出口，抵達即完成整關。 */
  exit: { x: number; y: number; radius: number }
}

const W = 1440
const H = 1500

export const EXPLORE_WORLDS: ExploreWorld[] = [
  {
    stageId: 'forest_1_1', world: { width: W, height: H }, spawn: { x: 720, y: 1420 },
    backgroundAsset: '/assets/campaign/explore/forest_1_1.jpg', groundColor: 0x5a8a4a,
    battleZone: { x: 280, y: 150, width: 880, height: 450 },
    landmarks: [{ kind: 'supply', x: 166, y: 360, label: '枯木哨台' }],
    exit: { x: 720, y: 55, radius: 140 },
  },
  {
    stageId: 'forest_1_2', world: { width: W, height: H }, spawn: { x: 220, y: 1420 },
    backgroundAsset: '/assets/campaign/explore/forest_1_2.jpg', groundColor: 0x577a45,
    battleZone: { x: 250, y: 150, width: 1050, height: 600 },
    landmarks: [
      { kind: 'supply', x: 200, y: 700, label: '古樹根部' },
      { kind: 'chest', x: 1300, y: 480, label: '荊棘密藏' },
    ],
    exit: { x: 1368, y: 50, radius: 140 },
  },
  {
    stageId: 'forest_1_3', world: { width: W, height: H }, spawn: { x: 720, y: 1420 },
    backgroundAsset: '/assets/campaign/explore/forest_1_3.jpg', groundColor: 0x5a8a42,
    battleZone: { x: 200, y: 80, width: 1050, height: 570 },
    landmarks: [
      { kind: 'totem', x: 274, y: 418, label: '西側圖騰' },
      { kind: 'totem', x: 1166, y: 418, label: '東側圖騰' },
      { kind: 'totem', x: 706, y: 180, label: '北側圖騰' },
    ],
    exit: { x: 706, y: 60, radius: 140 },
  },
  {
    stageId: 'forest_1_4', world: { width: W, height: H }, spawn: { x: 720, y: 1420 },
    backgroundAsset: '/assets/campaign/explore/forest_1_4.jpg', groundColor: 0x7a8a52,
    battleZone: { x: 280, y: 200, width: 880, height: 500 },
    landmarks: [{ kind: 'altar', x: 720, y: 158, label: '祭壇' }],
    exit: { x: 720, y: 85, radius: 130 },
  },
  {
    stageId: 'forest_1_5', world: { width: W, height: H }, spawn: { x: 720, y: 1420 },
    backgroundAsset: '/assets/campaign/explore/forest_1_5.jpg', groundColor: 0x6a7a5a,
    battleZone: { x: 150, y: 120, width: 1150, height: 530 },
    landmarks: [
      { kind: 'supply', x: 720, y: 700, label: 'Boss 前補給' },
      { kind: 'boss', x: 720, y: 220, label: '狂暴獸人隊長' },
    ],
    exit: { x: 720, y: 80, radius: 150 },
  },
]

export function getExploreWorld(stageId: string): ExploreWorld | undefined {
  return EXPLORE_WORLDS.find(w => w.stageId === stageId)
}

export function isExploreStageId(stageId: string | undefined): boolean {
  return !!stageId && EXPLORE_WORLDS.some(w => w.stageId === stageId)
}
