/**
 * Forest 01 v12.1.0 的實際 Gameplay Area 座標。
 * V2 先保持 Gameplay 座標不動；這份資料用來做 Art Debug 與未來逐區替換真正高解析 Area Art。
 */
export const FOREST01_AREA_LAYOUT = [
  { id: 'area1',  name: '森林入口',       x: 900,  y: 3250, width: 600, height: 300 },
  { id: 'area2',  name: '林間小徑',       x: 900,  y: 2850, width: 600, height: 300 },
  { id: 'area3',  name: '迷途女孩岔路',   x: 900,  y: 2450, width: 600, height: 300 },
  { id: 'area3a', name: '被遺忘的花圃',   x: 450,  y: 2400, width: 500, height: 350 },
  { id: 'area4',  name: '古老石橋',       x: 950,  y: 2100, width: 500, height: 280 },
  { id: 'area5',  name: '森林遺跡廣場',   x: 900,  y: 1500, width: 600, height: 350 },
  { id: 'area5a', name: '隱藏密室',       x: 1520, y: 1550, width: 400, height: 250 },
  { id: 'area6',  name: '哥布林營地',     x: 1500, y: 750,  width: 600, height: 350 },
  { id: 'area7',  name: '古老祭壇',       x: 350,  y: 750,  width: 550, height: 350 },
  { id: 'area8',  name: '出口',           x: 1000, y: 120,  width: 400, height: 220 },
] as const

export const FOREST01_WORLD_SIZE = { width: 2400, height: 3600 } as const
