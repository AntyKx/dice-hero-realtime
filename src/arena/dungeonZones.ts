/**
 * 一局約 3~5 分鐘的「關卡分區」節點圖，重用 src/mapGen.ts 的列/欄/connections
 * 概念（同一套欄位鄰接演算法），但這裡是給單局即時戰鬥內部換區用，跟舊回合制
 * 主線的 MapNode/NodeType 是完全獨立的兩套型別，不共用──語意不同（這裡的
 * 「一個節點」是即時戰鬥裡的一個房間，不是要整個切換畫面的回合制關卡）。
 *
 * 岔路刻意不讓玩家事先知道門後類型（見 ArenaGame 的門是統一造型），維持「偶爾
 * 一點驚喜分岔，但不會真的迷路」的設計——每排最多 2 個節點，不是網格迷宮。
 */

export type ArenaZoneType = 'battle' | 'elite' | 'rest' | 'card' | 'hidden' | 'boss'

export interface ArenaZoneNode {
  id: number
  type: ArenaZoneType
  row: number
  col: number
  connections: number[]
}

const PRE_BOSS_ROWS = 6

function pickZoneType(row: number): ArenaZoneType {
  if (row === 0) return 'battle' // 第一區固定戰鬥，暖身用，比照 mapGen.ts 的慣例
  const r = Math.random()
  let acc = 0
  if (r < (acc += 0.05)) return 'hidden'
  if (r < (acc += 0.10)) return 'card'
  if (r < (acc += 0.11)) return 'rest'
  if (r < (acc += 0.13)) return 'elite'
  return 'battle'
}

// 跟 mapGen.ts 的 connectRows 同一套欄位鄰接規則：col 差在 -1~+1 之內才連接，
// 下一排只有 1 個節點時全部收斂進去。這裡每排最多 2 個節點，剛好是這套規則
// 最單純的 case（1↔1 直走、1↔2 分岔、2↔1 收斂）。
function connectRows(cur: ArenaZoneNode[], nxt: ArenaZoneNode[]): void {
  if (nxt.length === 1) {
    cur.forEach(c => { c.connections = [nxt[0].id] })
    return
  }
  cur.forEach(c => {
    const targets: number[] = []
    for (let d = -1; d <= 1; d++) {
      const n = nxt.find(x => x.col === c.col + d)
      if (n) targets.push(n.id)
    }
    c.connections = targets.length > 0 ? targets : [nxt[0].id]
  })
}

/** 產生一局用的分區節點圖：6 個一般區（偶爾 1~2 排雙門岔路）+ 1 個 Boss 區。 */
export function generateArenaDungeon(): ArenaZoneNode[] {
  const forkCount = Math.random() < 0.5 ? 1 : 2
  const forkRows = new Set<number>()
  while (forkRows.size < forkCount) {
    forkRows.add(1 + Math.floor(Math.random() * (PRE_BOSS_ROWS - 1))) // 第 1~5 排才會岔路，第 0 排固定單一戰鬥
  }

  const rows: ArenaZoneNode[][] = []
  let id = 0
  for (let row = 0; row < PRE_BOSS_ROWS; row++) {
    const count = forkRows.has(row) ? 2 : 1
    const rowNodes: ArenaZoneNode[] = []
    for (let col = 0; col < count; col++) {
      rowNodes.push({ id: id++, type: pickZoneType(row), row, col, connections: [] })
    }
    rows.push(rowNodes)
  }
  rows.push([{ id: id++, type: 'boss', row: PRE_BOSS_ROWS, col: 0, connections: [] }])

  for (let i = 0; i < rows.length - 1; i++) connectRows(rows[i], rows[i + 1])

  const nodes: ArenaZoneNode[] = []
  rows.forEach(r => r.forEach(n => nodes.push(n)))
  return nodes
}

export function totalRows(dungeon: ArenaZoneNode[]): number {
  return dungeon.length > 0 ? Math.max(...dungeon.map(n => n.row)) + 1 : 0
}
