import type { MapNode, NodeType, RouteType } from './types'

export const CHAPTER_COUNT      = 3
export const BIG_PER_CHAPTER    = 3          // 大關 per chapter
export const SMALL_PER_BIG      = 3          // 小關 (three-choose-one rows) per 大關
export const CHOICE_FLOORS      = BIG_PER_CHAPTER * SMALL_PER_BIG     // 9 choice rows per chapter
export const FLOORS_PER_CHAPTER = CHOICE_FLOORS + 1                   // + 1 boss row = 10
export const FLOOR_COUNT        = CHAPTER_COUNT * FLOORS_PER_CHAPTER  // 30 rows total

// 大關 / 小關 index within a chapter (1-based)
export function getBigStage(floor: number): number {
  const cf = getChapterFloor(floor)
  return cf > CHOICE_FLOORS ? BIG_PER_CHAPTER : Math.ceil(cf / SMALL_PER_BIG)
}
export function getSmallStage(floor: number): number {
  const cf = getChapterFloor(floor)
  return ((cf - 1) % SMALL_PER_BIG) + 1
}

// ── Chapter helpers ────────────────────────────────────────────────────────
export function getChapter(floor: number): number {
  return Math.ceil(floor / FLOORS_PER_CHAPTER)
}
export function getChapterFloor(floor: number): number {
  return ((floor - 1) % FLOORS_PER_CHAPTER) + 1
}
export function isChapterBossFloor(floor: number): boolean {
  return floor % FLOORS_PER_CHAPTER === 0
}
export function isFinalBossFloor(floor: number): boolean {
  return floor === FLOOR_COUNT
}

// ── Chapter themes ─────────────────────────────────────────────────────────
export const CHAPTER_NAMES: Record<number, string> = {
  1: '第一章：森林遺跡',
  2: '第二章：雪原地城',
  3: '第三章：魔王城',
}

// ── Enemy pools per chapter ────────────────────────────────────────────────
const CHAPTER_NORMAL: Record<number, string[]> = {
  1: ['goblin', 'skeleton'],
  2: ['ice_wolf', 'slimeking', 'lightning_lancer'],
  3: ['fire_hound', 'bat_dragon', 'dark_sorceress'],
}
const CHAPTER_ELITE: Record<number, string> = {
  1: 'orc',
  2: 'yeti',
  3: 'dark_knight',
}
const CHAPTER_BOSS: Record<number, string> = {
  1: 'golem',        // 石巨人（石甲護身機制）
  2: 'ice_witch',    // 冰霜女巫（骰子封印機制）
  3: 'dragon',       // 烈焰巨龍（龍息亂流機制）
}

// ── Node type picker (route-aware) ──────────────────────────────────────────
function pickNodeType(floor: number, routeType: RouteType): NodeType {
  if (floor === 1) return 'battle'   // ease-in: first node is always a battle
  const chapter = getChapter(floor)

  // 大關尾（每大關最後一個小關）：較高機率精英，營造大關收尾
  if (getSmallStage(floor) === SMALL_PER_BIG && Math.random() < 0.55) return 'elite'

  let chestChance = routeType === 'resource' ? 0.16 : 0.06
  let restChance  = routeType === 'safe'     ? 0.22 : routeType === 'risk' ? 0.08 : 0.13
  let shopChance  = routeType === 'resource' ? 0.18 : 0.07
  let eliteChance = routeType === 'risk'     ? 0.20 : 0.08
  let eventChance = routeType === 'risk'     ? 0.16 : 0.10
  if (chapter >= 2) eliteChance += 0.04

  const r = Math.random()
  let acc = 0
  if (r < (acc += chestChance))  return 'chest'
  if (r < (acc += restChance))   return 'rest'
  if (r < (acc += shopChance))   return 'shop'
  if (r < (acc += eliteChance))  return 'elite'
  if (r < (acc += eventChance))  return 'event'
  return 'battle'
}

// Connect a row to the next row using strict column-adjacency branching:
// a node at column c may only advance to next-row columns c-1, c, c+1.
// This gives readable branches (rightmost → middle+right) and never crosses.
function connectRows(cur: MapNode[], nxt: MapNode[]): void {
  // Boss / single-node next row: everything funnels in.
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
    c.connections = targets
  })
}

// ── Map generator (one chapter = 3 floors at a time) ─────────────────────────
export function generateMap(routeType: RouteType = 'risk', chapter = 1): MapNode[] {
  const nodes: MapNode[] = []
  let id = 0
  const rows: MapNode[][] = []

  const startFloor = (chapter - 1) * FLOORS_PER_CHAPTER + 1
  const endFloor   = chapter * FLOORS_PER_CHAPTER

  for (let floor = startFloor; floor <= endFloor; floor++) {
    const boss  = isChapterBossFloor(floor)
    const count = boss ? 1 : 3   // every choice row is a fixed 3-choose-one
    const row: MapNode[] = []
    for (let col = 0; col < count; col++) {
      row.push({
        id: id++,
        type: boss ? 'boss' : pickNodeType(floor, routeType),
        floor, layer: 0, col,
        connections: [],
        cleared: false,
        reachable: floor === startFloor,
      })
    }
    rows.push(row)
  }

  for (let f = 0; f < rows.length - 1; f++) connectRows(rows[f], rows[f + 1])
  rows.forEach(r => r.forEach(n => nodes.push(n)))
  return nodes
}

// ── Reachability (dynamic) ──────────────────────────────────────────────────
export function advanceMap(nodes: MapNode[], clearedId: number): MapNode[] {
  const updated = nodes.map(n => n.id === clearedId ? { ...n, cleared: true } : n)
  const reachableIds = new Set<number>()
  updated.filter(n => n.cleared).forEach(n => n.connections.forEach(id => reachableIds.add(id)))
  return updated.map(n => n.cleared ? n : { ...n, reachable: reachableIds.has(n.id) })
}

// ── 深海遺城篇 chapter names ──────────────────────────────────────────────
export const DEEP_SEA_CHAPTER_NAMES: Record<number, string> = {
  1: '第一章：珊瑚淺灘',
  2: '第二章：沉沒王城',
  3: '第三章：海皇深淵',
}

// ── 深海遺城篇 enemy pools ─────────────────────────────────────────────────
const DEEP_SEA_NORMAL: Record<number, string[]> = {
  1: ['coral_crab', 'blue_jellyfish', 'tide_piranha'],
  2: ['drowned_guard', 'deep_lancer', 'heavy_drowned'],
  3: ['abyss_siren', 'ancient_shell_knight', 'leviathan_pup'],
}
const DEEP_SEA_ELITE: Record<number, string> = {
  1: 'coral_colossus',
  2: 'sea_priestess',
  3: 'sea_queen',
}
const DEEP_SEA_BOSS: Record<number, string> = {
  1: 'abyss_anglerfish',
  2: 'sea_emperor_guard',
  3: 'sleeping_emperor',
}

// ── 灰燼王國篇・第二章 chapter names ──────────────────────────────────────
export const ASH_KINGDOM_CHAPTER_NAMES: Record<number, string> = {
  1: '第一章：王城餘燼',
  2: '第二章：亡國迴廊',
  3: '第三章：灰燼王陵',
}

// ── 灰燼王國篇・第二章 enemy pools ────────────────────────────────────────
const ASH_KINGDOM_NORMAL: Record<number, string[]> = {
  1: ['ash_soldier', 'charred_archer', 'molten_shieldman'],
  2: ['castle_remnant', 'ash_guard', 'broken_knight'],
  3: ['tomb_keeper', 'soul_knight', 'royal_soul'],
}
const ASH_KINGDOM_ELITE: Record<number, string> = {
  1: 'ember_commander',
  2: 'lost_court_mage',
  3: 'forbidden_priest',
}
const ASH_KINGDOM_BOSS: Record<number, string> = {
  1: 'levok',
  2: 'laon',
  3: 'elysia',
}

// ── 裂隙前兆篇 chapter names ───────────────────────────────────────────────
export const RIFT_OMEN_CHAPTER_NAMES: Record<number, string> = {
  1: '第一區：星砂邊境',
  2: '第二區：月影廢都',
  3: '第三區：暗月聖堂',
}

// ── 裂隙前兆篇 enemy pools ─────────────────────────────────────────────────
const RIFT_NORMAL: Record<number, string[]> = {
  1: ['sand_rat', 'rift_goblin', 'star_slime'],
  2: ['moon_rogue', 'ruin_guard', 'moon_mage'],
  3: ['dark_devotee', 'rift_praying', 'black_judge'],
}
const RIFT_ELITE: Record<number, string> = {
  1: 'rift_scout',
  2: 'mirror_assassin',
  3: 'dark_shaman',
}
const RIFT_BOSS: Record<number, string> = {
  1: 'sand_beast',
  2: 'moon_executor',
  3: 'bishop_vanguard',
}

// ── Boss ID lookup ─────────────────────────────────────────────────────────
export function getBossEnemyId(chapter: number, campaign = 'main'): string {
  if (campaign === 'rift_omen')   return RIFT_BOSS[chapter]        ?? 'sand_beast'
  if (campaign === 'deep_sea')    return DEEP_SEA_BOSS[chapter]    ?? 'abyss_anglerfish'
  if (campaign === 'ash_kingdom') return ASH_KINGDOM_BOSS[chapter] ?? 'levok'
  return CHAPTER_BOSS[chapter] ?? 'dragon'
}

// ── Enemy selection ─────────────────────────────────────────────────────────
export function getEnemyForNode(floor: number, isElite: boolean, isBoss: boolean, campaign = 'main'): string {
  const chapter = getChapter(floor)
  if (campaign === 'rift_omen') {
    if (isBoss)  return RIFT_BOSS[chapter]   ?? 'sand_beast'
    if (isElite) return RIFT_ELITE[chapter]  ?? 'rift_scout'
    const pool = RIFT_NORMAL[chapter] ?? ['sand_rat']
    return pool[Math.floor(Math.random() * pool.length)]
  }
  if (campaign === 'deep_sea') {
    if (isBoss)  return DEEP_SEA_BOSS[chapter]   ?? 'abyss_anglerfish'
    if (isElite) return DEEP_SEA_ELITE[chapter]  ?? 'coral_colossus'
    const pool = DEEP_SEA_NORMAL[chapter] ?? ['coral_crab']
    return pool[Math.floor(Math.random() * pool.length)]
  }
  if (campaign === 'ash_kingdom') {
    if (isBoss)  return ASH_KINGDOM_BOSS[chapter]   ?? 'levok'
    if (isElite) return ASH_KINGDOM_ELITE[chapter]  ?? 'ember_commander'
    const pool = ASH_KINGDOM_NORMAL[chapter] ?? ['ash_soldier']
    return pool[Math.floor(Math.random() * pool.length)]
  }
  if (isBoss)  return CHAPTER_BOSS[chapter]  ?? 'dragon'
  if (isElite) return CHAPTER_ELITE[chapter] ?? 'orc'
  const pool = CHAPTER_NORMAL[chapter] ?? ['goblin']
  return pool[Math.floor(Math.random() * pool.length)]
}

// ── Difficulty scaling ──────────────────────────────────────────────────────
export function getFloorMult(floor: number, isElite: boolean, isBoss: boolean, fateMult = 1, campaign: 'main' | 'rift_omen' | 'deep_sea' | 'ash_kingdom' = 'main'): number {
  const chapter      = getChapter(floor)
  const chapterFloor = getChapterFloor(floor)
  // 裂隙前兆篇 +0.8；深海遺城篇 +0.9（最難）；灰燼王國第二章 +0.7
  const chapterStep = campaign === 'deep_sea' ? 0.9 : campaign === 'rift_omen' ? 0.8 : campaign === 'ash_kingdom' ? 0.7 : 0.5
  const base = 1 + (chapter - 1) * chapterStep + (chapterFloor - 1) * 0.1
  let mult = base * fateMult
  if (isBoss)  mult *= 1.8
  if (isElite) mult *= 1.35
  return mult
}

export function getGoldReward(floor: number, isElite: boolean, isBoss: boolean): number {
  if (isBoss)  return 80 + floor * 14
  if (isElite) return 28 + floor * 7 + Math.floor(Math.random() * 10)
  return 8 + floor * 4 + Math.floor(Math.random() * 8)
}

export function rollEnemyAffixes(fateLevel: number, isBoss: boolean): import('./types').EnemyAffix[] {
  if (fateLevel <= 0) return []
  // Cap value scaling at Lv5 to keep numbers readable; higher levels add more affixes instead
  const scaledLevel = Math.min(fateLevel, 5)
  const v = (base: number) => base * scaledLevel
  type Id = import('./types').EnemyAffixId
  const make = (id: Id): import('./types').EnemyAffix => {
    const vals: Record<Id, number> = {
      thorns: v(4), regen: v(12), armor: v(4), berserk: 0, poison_sting: v(2), immune: 2,
    }
    const labels: Record<Id, string> = {
      thorns: `荊棘 反彈${vals.thorns}`, regen: `再生 +${vals.regen}/回`,
      armor: `護甲 -${vals.armor}傷`, berserk: `激怒 ×1.5`,
      poison_sting: `毒刺 +${vals.poison_sting}層`, immune: `免疫 2回`,
    }
    return { id, value: vals[id], label: labels[id] }
  }
  const pool: Id[] = ['thorns', 'regen', 'armor', 'poison_sting', 'immune']
  const all: Id[] = ['thorns', 'regen', 'armor', 'berserk', 'poison_sting', 'immune']
  // Boss: berserk + 1 random (Lv1–7); berserk + 2 random (Lv8–9); berserk + 3 random (Lv10)
  if (isBoss) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    if (fateLevel >= 10) return [make('berserk'), make(shuffled[0]), make(shuffled[1]), make(shuffled[2])]
    if (fateLevel >= 8)  return [make('berserk'), make(shuffled[0]), make(shuffled[1])]
    return [make('berserk'), make(shuffled[0])]
  }
  // Regular/elite: 2 affixes (Lv1–6); 3 affixes (Lv7–9); 4 affixes (Lv10)
  const count = fateLevel >= 10 ? 4 : fateLevel >= 7 ? 3 : 2
  return all.sort(() => Math.random() - 0.5).slice(0, count).map(make)
}

export function countFloorsCleared(nodes: MapNode[]): number {
  let max = 0
  nodes.filter(n => n.cleared).forEach(n => { if (n.floor > max) max = n.floor })
  return max
}
