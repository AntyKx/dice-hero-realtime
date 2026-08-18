/**
 * 森林遺跡 1-1~1-5「同一張地圖完成探索＋戰鬥＋結算」的世界資料
 * （2026-08-17，見 ArenaGame.ts 的 initExploreStage/updateExploreWorld）。
 *
 * 2026-08-18：換成使用者提供的「Q版戰鬥背景」手繪圖（2200×1238，見
 * public/assets/campaign/explore/）取代前一版手繪地圖。這批圖跟前一版不同
 * ——內容（廣場/祭壇/圖騰/競技場）不是集中在畫面中段的一小塊，而是幾乎鋪滿
 * 整張圖（構圖本身就是俯視的封閉競技場），所以沿用同一套「fit-width 貼在
 * 世界最上方」的算法，但世界高度大幅縮小（從 1500 降到 850，貼近圖片實際
 * 縮放後的高度 ~810），涵蓋不到的極少量下緣直接取圖片自己最下緣的平均色
 * （sharp 取樣，見 scripts/convert-qstyle-explore.mjs 印出的 bottomColor），
 * 而不是憑感覺挑一個純色，這樣延伸的部分幾乎看不出接縫，不會再出現「整塊
 * 突兀的綠色色塊」。座標一樣是用實際圖片內容量出來的。
 *
 * 同一版也新增 colliders（矩形陣列）——地圖上明顯的實體物件（大門柱、祭壇
 * 高台、圖騰基座、營火、瞭望塔）現在會真的擋路，不是只有外圍世界邊界會
 * 擋人，見 ArenaGame.ts 的 updatePlayerMovement() 如何套用。
 *
 * 設計原則不變：不新增任何遭遇戰內容——每關真正的戰鬤還是那一關 CampaignStage
 * 資料表裡本來就有的 waves/boss（見 forestRuins.ts），只是觸發方式從
 * 「一進場就打」改成「走到 battleZone 才觸發」，敵人從 battleZone 邊緣
 * 冒出來，不是從整個世界邊緣冒出來。totem/altar/shaman/chest 這些地標是
 * 純視覺（探索感用），不是各自獨立的遭遇戰——1-3 的 3 個圖騰在真實資料裡
 * 其實是 battleZone 那一波敵人（forest_totem 類型）的一部分。
 */

export type LandmarkKind = 'totem' | 'altar' | 'shaman' | 'chest' | 'supply' | 'boss'

export interface ExploreLandmark {
  kind: LandmarkKind
  x: number
  y: number
  label: string
}

/** 通用矩形——battleZone 跟 colliders 共用同一個形狀（左上角 x/y + 寬高）。 */
export interface ExploreRect {
  x: number
  y: number
  width: number
  height: number
}

export interface ExploreWorld {
  stageId: `forest_1_${1 | 2 | 3 | 4 | 5}`
  world: { width: number; height: number }
  spawn: { x: number; y: number }
  /** 使用者提供的 Q 版手繪地圖，fit-width 貼在世界最上方（見檔頭說明）。 */
  backgroundAsset: string
  /** 圖片涵蓋不到的極少量下緣用這個顏色延伸鋪底（取圖片自身下緣平均色，
   * 避免露出突兀的純色色塊）。 */
  groundColor: number
  /** 觸發戰鬤的區域——玩家進入這個矩形（含 margin）就會觸發這一關的
   * 既有 waves／boss；戰鬤期間鏡頭與移動範圍鎖定在這個矩形（略放寬）內。 */
  battleZone: ExploreRect
  /** 純視覺地標，探索感用，不是獨立觸發點。 */
  landmarks: ExploreLandmark[]
  /** 地圖上會真的擋路的實體物件（大門柱/祭壇高台/圖騰基座/營火/瞭望塔等），
   * 玩家跟敵人都不能穿過去——見 ArenaGame.ts updatePlayerMovement() 的
   * 圓形-矩形碰撞判定。刻意只放明顯的大型物件，不是每一叢草每一棵樹都做。 */
  colliders: ExploreRect[]
  /** 通關（battleZone 清空）後才能使用的出口，抵達即完成整關。 */
  exit: { x: number; y: number; radius: number }
}

const W = 1440
const H = 850

export const EXPLORE_WORLDS: ExploreWorld[] = [
  {
    // 森林入口：大門在正上方，左側有一座瞭望塔，中間是一片開闊草原。
    stageId: 'forest_1_1', world: { width: W, height: H }, spawn: { x: 720, y: 790 },
    backgroundAsset: '/assets/campaign/explore/forest_1_1.jpg', groundColor: 0x455b2d,
    battleZone: { x: 260, y: 180, width: 920, height: 520 },
    landmarks: [{ kind: 'supply', x: 195, y: 410, label: '哨戒塔' }],
    colliders: [
      { x: 60, y: 300, width: 270, height: 220 }, // 瞭望塔＋柵欄
      { x: 585, y: 15, width: 60, height: 110 },  // 大門左柱
      { x: 795, y: 15, width: 60, height: 110 },  // 大門右柱
    ],
    exit: { x: 720, y: 50, radius: 130 },
  },
  {
    // 荊棘之地：石板小徑從左下角斜向右上角，右側與下緣是成片荊棘叢，
    // 中段散落斷裂石柱。
    stageId: 'forest_1_2', world: { width: W, height: H }, spawn: { x: 110, y: 780 },
    backgroundAsset: '/assets/campaign/explore/forest_1_2.jpg', groundColor: 0x383e21,
    battleZone: { x: 280, y: 180, width: 800, height: 430 },
    landmarks: [{ kind: 'chest', x: 338, y: 374, label: '荊棘密藏' }],
    colliders: [
      { x: 270, y: 250, width: 180, height: 220 },  // 斷裂石柱群
      { x: 1050, y: 100, width: 390, height: 550 }, // 右側荊棘叢
      { x: 430, y: 700, width: 1010, height: 150 }, // 下緣荊棘叢
    ],
    exit: { x: 1332, y: 45, radius: 130 },
  },
  {
    // 哥布林營地：北／西／東三座圖騰基座圍著中央營火，正上方有柵欄大門。
    stageId: 'forest_1_3', world: { width: W, height: H }, spawn: { x: 713, y: 780 },
    backgroundAsset: '/assets/campaign/explore/forest_1_3.jpg', groundColor: 0x4a5f2c,
    battleZone: { x: 200, y: 120, width: 1040, height: 460 },
    landmarks: [
      { kind: 'totem', x: 713, y: 187, label: '北側圖騰' },
      { kind: 'totem', x: 310, y: 403, label: '西側圖騰' },
      { kind: 'totem', x: 1159, y: 403, label: '東側圖騰' },
    ],
    colliders: [
      { x: 658, y: 132, width: 110, height: 110 }, // 北側圖騰基座
      { x: 255, y: 348, width: 110, height: 110 }, // 西側圖騰基座
      { x: 1104, y: 348, width: 110, height: 110 }, // 東側圖騰基座
      { x: 668, y: 423, width: 90, height: 90 },   // 中央營火
    ],
    exit: { x: 713, y: 65, radius: 130 },
  },
  {
    // 薩滿祭壇：正上方是同心圓石造祭壇高台，下緣兩座木造大門塔夾出入口，
    // 左右是石造遺跡框住整個場地。
    stageId: 'forest_1_4', world: { width: W, height: H }, spawn: { x: 742, y: 720 },
    backgroundAsset: '/assets/campaign/explore/forest_1_4.jpg', groundColor: 0x516321,
    battleZone: { x: 260, y: 180, width: 920, height: 430 },
    landmarks: [{ kind: 'altar', x: 713, y: 150, label: '薩滿祭壇' }],
    colliders: [
      { x: 540, y: 605, width: 115, height: 158 }, // 左側大門塔
      { x: 828, y: 605, width: 115, height: 158 }, // 右側大門塔
      { x: 0, y: 108, width: 216, height: 360 },   // 左側遺跡群
      { x: 1224, y: 108, width: 216, height: 360 }, // 右側遺跡群
    ],
    exit: { x: 713, y: 60, radius: 130 },
  },
  {
    // 狂暴獸人隊長：整場是一座同心圓石造競技場，Boss 站在正上方高台，
    // 下緣拱門是唯一出入口。
    stageId: 'forest_1_5', world: { width: W, height: H }, spawn: { x: 713, y: 720 },
    backgroundAsset: '/assets/campaign/explore/forest_1_5.jpg', groundColor: 0x3d5219,
    battleZone: { x: 180, y: 144, width: 1080, height: 504 },
    landmarks: [
      { kind: 'supply', x: 360, y: 500, label: 'Boss 前補給' },
      { kind: 'boss', x: 713, y: 130, label: '狂暴獸人隊長' },
    ],
    colliders: [
      // 拱門柱之間淨空要留超過玩家碰撞直徑（EXPLORE_PLAYER_COLLIDE_RADIUS
      // ×2=60），不然出生點附近的位移一開始就判定卡住，哪個方向都走不掉
      // （2026-08-18 真機回報：一進場英雄完全上不去，根源就是這裡淨空只有
      // 50px，比玩家碰撞直徑還窄）。
      { x: 578, y: 614, width: 80, height: 140 }, // 拱門左柱
      { x: 768, y: 614, width: 80, height: 140 }, // 拱門右柱
    ],
    exit: { x: 713, y: 60, radius: 150 },
  },
]

export function getExploreWorld(stageId: string): ExploreWorld | undefined {
  return EXPLORE_WORLDS.find(w => w.stageId === stageId)
}

export function isExploreStageId(stageId: string | undefined): boolean {
  return !!stageId && EXPLORE_WORLDS.some(w => w.stageId === stageId)
}
