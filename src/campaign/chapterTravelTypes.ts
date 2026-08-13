/**
 * 章節旅程節點系統的共用型別（2026-08 全篇章擴充版，取代原本篇章 I MVP 用
 * 的四個固定字串欄位）。跟 `campaignTypes.ts`（關卡戰鬥資料）刻意分開——
 * 這裡只描述「選關前後的走位過場動畫」要怎麼畫，不含任何戰鬥/勝負邏輯，
 * 也不會被 ArenaGame.ts 讀取。
 */

export type TravelLayer = {
  id: string
  kind: 'backdrop' | 'midground' | 'ground' | 'foreground'
  /** backdrop 用：重用既有 /assets/backgrounds/*.jpg 路徑。 */
  asset?: string
  /** ground/midground/foreground 用：暫代地面/裝飾代稱，由 CampaignTravelPreview
   *  的對照表轉成 CSS 漸層或 emoji 圖示；日後要換真美術只改對照表，不用動這裡。 */
  className?: string
  /** 視差係數：1.0 = 跟角色移動同步（ground 的參考平面）；越偏離 1.0，
   *  在角色行走時的位移量越大／方向越不同。 */
  parallax: number
}

export type TravelPathNode = {
  /** 螢幕水平位置，0..1（0=最左，1=最右）。 */
  x: number
  /** 角色腳底的螢幕垂直位置，0..1（0=最遠/最上，1=最近/最下）；同時決定深度層次。 */
  footY: number
  /** 角色顯示縮放，越靠近鏡頭（footY 越大）通常越大。 */
  scale: number
}

export type ChapterId = 'forest-ch1' | 'forest-ch2' | 'forest-ch3' | 'forest-ch4'

export type TravelSegment = {
  id: string
  chapterId: ChapterId
  /** 篇章內的段落序號，1~6。 */
  order: number
  title: string
  kind: 'battle' | 'transition'
  /** 對應的既有 CampaignStage id；純轉場段（kind:'transition'）沒有這欄。 */
  stageId?: string
  layers: TravelLayer[]
  /** 角色行走的路徑點，至少 4 個，依序插值移動。 */
  pathNodes: TravelPathNode[]
  /** 進入點（目前等同 pathNodes[0]），保留給日後「上一段結束位置接續」用。 */
  entrance?: TravelPathNode
  /** 離開點（目前等同 pathNodes 最後一個），保留給日後「通關後短距離前進」用。 */
  exit?: TravelPathNode
  /** 篇章氣氛粒子層：落葉／餘燼／瘴氣／根脈光／熱霧，四篇章各自固定一種。 */
  ambience: 'leaves' | 'embers' | 'miasma' | 'root-glow' | 'heat-haze'
}
