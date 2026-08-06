export type DungeonId = 'star_eclipse' | 'burning_throne' | 'black_tide' | 'ash_covenant'

export function rollDungeonAffixes(
  difficulty: DungeonDifficulty,
  isElite: boolean,
  isBoss: boolean,
): import('./types').EnemyAffix[] {
  type Id = import('./types').EnemyAffixId
  const mk = (id: Id, val: number, label: string): import('./types').EnemyAffix => ({ id, value: val, label })
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
  const pickN = <T>(arr: T[], n: number): T[] => {
    const pool = [...arr]
    const result: T[] = []
    for (let i = 0; i < n && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length)
      result.push(pool.splice(idx, 1)[0])
    }
    return result
  }

  if (difficulty === 'normal') return []

  if (difficulty === 'hero') {
    if (isBoss)  return [mk('berserk', 0, '激怒 ×1.5'), pick([mk('regen', 15, '再生 +15/回'), mk('armor', 8, '護甲 -8傷')])]
    if (isElite) return [pick([mk('regen', 10, '再生 +10/回'), mk('armor', 6, '護甲 -6傷'), mk('berserk', 0, '激怒 ×1.5')])]
    // hero 普通怪：40% 機率出現 1 個輕量詞綴
    return Math.random() < 0.4 ? [pick([mk('regen', 8, '再生 +8/回'), mk('armor', 4, '護甲 -4傷'), mk('thorns', 5, '荊棘 反彈5')])] : []
  }

  // legendary
  if (isBoss) return [
    mk('berserk', 0, '激怒 ×1.5'),
    // Boss 固定激怒，再從池子隨機抽 2（每場組合不同）
    ...pickN([
      mk('regen', 25, '再生 +25/回'),
      mk('armor', 10, '護甲 -10傷'),
      mk('thorns', 12, '荊棘 反彈12'),
      mk('immune', 3, '免疫 3回'),
    ], 2),
  ]
  // legendary elite：從 6 選 2，激怒不再保證出現
  if (isElite) return pickN([
    mk('berserk', 0, '激怒 ×1.5'),
    mk('regen', 18, '再生 +18/回'),
    mk('armor', 8, '護甲 -8傷'),
    mk('immune', 2, '免疫 2回'),
    mk('thorns', 10, '荊棘 反彈10'),
    mk('poison_sting', 3, '毒刺 +3層/攻'),
  ], 2)
  // legendary 普通怪：加入毒刺選項
  return [pick([
    mk('regen', 12, '再生 +12/回'),
    mk('armor', 8, '護甲 -8傷'),
    mk('berserk', 0, '激怒 ×1.5'),
    mk('thorns', 8, '荊棘 反彈8'),
    mk('poison_sting', 2, '毒刺 +2層/攻'),
  ])]
}

export type DungeonDifficulty = 'normal' | 'hero' | 'legendary'

export type DifficultyConfig = {
  label: string
  desc: string
  color: string
  floorMultMod: number           // multiplier on all floorMults
  forbiddenByZone: [number, number, number]  // forbidden dice count per zone
  goldMult: number
  expMult: number
  rewardCount: number            // card / relic choices offered
}

export const DIFFICULTY_CONFIG: Record<DungeonDifficulty, DifficultyConfig> = {
  normal: {
    label: '一般', desc: '標準難度・禁忌遞增', color: '#60c080',
    floorMultMod: 1.0, forbiddenByZone: [1, 1, 2],
    goldMult: 1.0, expMult: 1.0, rewardCount: 3,
  },
  hero: {
    label: '英雄', desc: '敵人強化 ×1.3・第二區起雙禁忌', color: '#6090ff',
    floorMultMod: 1.3, forbiddenByZone: [1, 2, 2],
    goldMult: 1.5, expMult: 1.5, rewardCount: 3,
  },
  legendary: {
    label: '傳奇', desc: '敵人強化 ×1.6・雙禁忌起跳・三區三禁忌', color: '#ffd36e',
    floorMultMod: 1.6, forbiddenByZone: [2, 2, 3],
    goldMult: 2.5, expMult: 2.5, rewardCount: 3,
  },
}

export function getDungeonForbiddenCount(difficulty: DungeonDifficulty, layer: number): number {
  const zone = layer < 5 ? 0 : layer < 10 ? 1 : 2
  return DIFFICULTY_CONFIG[difficulty].forbiddenByZone[zone]
}

export type DungeonFloor = {
  enemyId: string
  floorMult: number
  isElite?: boolean
  isBoss?: boolean
  forbiddenCount?: number  // how many forbidden dice numbers this floor (default 1)
}

export type DungeonDef = {
  id: DungeonId
  name: string
  subtitle: string
  desc: string
  floors: DungeonFloor[]
  minLevel?: number
  requireCampaign?: string  // campaign id that must be cleared to unlock
  goldReward: number
  equipRarity: 'magic' | 'rare' | 'legendary'
  expReward: number
  color: string
  icon: string
}

// 星蝕裂隙：15 層副本，分三區
export const DUNGEON_DEFS: DungeonDef[] = [
  {
    id: 'star_eclipse',
    name: '星蝕裂隙',
    subtitle: '星蝕副本 · 15 層',
    desc: '星蝕裂隙是中後期單人副本，主打骰面干擾、禁忌點數、裂隙腐化。每場戰鬥皆有禁忌骰面，踩中將引發強力副作用。',
    floors: [
      // 第一區：裂隙入口（1-5 層）
      { enemyId: 'rift_imp',         floorMult: 0.9  },
      { enemyId: 'star_sand_golem',  floorMult: 0.95 },
      { enemyId: 'rift_imp',         floorMult: 1.0  },
      { enemyId: 'mirror_thief',     floorMult: 1.0  },
      { enemyId: 'rift_guardian',    floorMult: 1.05, isElite: true },
      // 第二區：星蝕迴廊（6-10 層）
      { enemyId: 'eclipse_nun',      floorMult: 1.1  },
      { enemyId: 'star_sand_golem',  floorMult: 1.15 },
      { enemyId: 'mirror_thief',     floorMult: 1.2  },
      { enemyId: 'star_reaper',      floorMult: 1.25, isElite: true },
      { enemyId: 'rift_guardian',    floorMult: 1.3,  isElite: true },
      // 第三區：主教寢宮（11-15 層）
      { enemyId: 'eclipse_nun',      floorMult: 1.35 },
      { enemyId: 'star_reaper',      floorMult: 1.4,  isElite: true },
      { enemyId: 'rift_imp',         floorMult: 1.45 },
      { enemyId: 'mirror_thief',     floorMult: 1.5  },
      { enemyId: 'eclipse_bishop',   floorMult: 1.6,  isBoss: true },
    ],
    goldReward: 200,
    equipRarity: 'legendary',
    expReward: 500,
    color: '#9060ff',
    icon: '🌑',
  },
  {
    id: 'burning_throne',
    name: '燃燒王座',
    subtitle: '焰獄副本 · 15 層',
    desc: '魔王城深處的焰獄王座，越激烈的戰鬥越能激發魔焰之力。善用魔焰加成，但小心被反噬！',
    floors: [],  // node-based, uses generateBurningThroneMap()
    minLevel: 25,
    goldReward: 220,
    equipRarity: 'legendary',
    expReward: 550,
    color: '#ff6020',
    icon: '🔥',
  },
  {
    id: 'black_tide',
    name: '黑潮深淵',
    subtitle: '深海副本 · 15 層',
    desc: '深海遺城核心禁地，潮汐壓力隨節點遞增。退潮、漲潮、深壓、亂流四種狀態每 2 回合切換，氧氣耗盡則受致命窒息傷害。三條血條的潮汐王等待著最深處的挑戰者。',
    floors: [],  // node-based, uses generateBlackTideMap()
    minLevel: 35,
    goldReward: 280,
    equipRarity: 'legendary',
    expReward: 700,
    color: '#1060c0',
    icon: '🌊',
  },
  {
    id: 'ash_covenant',
    name: '灰燼聖約',
    subtitle: '聖約副本 · 15 層',
    desc: '王陵禁咒核心，聖約殘響不息。每場戰鬥聖約進度會隨骰面與行動上升，進度 100 時爆發灰燼審判。王血詛咒疊加可引發反噬。三條血的灰燼殘王在最深處等待。',
    floors: [],  // node-based, uses generateAshCovenantMap()
    requireCampaign: 'ash_kingdom',
    goldReward: 340,
    equipRarity: 'legendary',
    expReward: 850,
    color: '#c07030',
    icon: '🔱',
  },
]

export function getDungeon(id: string): DungeonDef | undefined {
  return DUNGEON_DEFS.find(d => d.id === id)
}

// ── 黑潮王座地圖生成 ───────────────────────────────────────────────────────
// 結構：15 層 / 3 區（每區 5 層）
//  Zone 1 (0-4)：4 選擇層 → 小Boss 珊瑚禁衛長 (layer 4)
//  Zone 2 (5-9)：4 選擇層 → 小Boss 沉冠海巫   (layer 9)
//  Zone 3 (10-14)：4 選擇層 → 最終Boss 潮汐王・奧瑟雷恩 (layer 14)
const BLACK_Z1 = ['tidal_shell_guard', 'azure_jellyfish_envoy', 'drowned_court_soldier']
const BLACK_Z2 = ['azure_jellyfish_envoy', 'drowned_court_soldier', 'deep_pressure_eel']
const BLACK_Z3 = ['tidal_shell_guard', 'deep_pressure_eel', 'drowned_court_soldier']

export function generateBlackTideMap(): DungeonNode[] {
  const specs: { layer: number; types: DungeonNodeType[]; enemies: string[]; baseMult: number; eliteMult?: number }[] = [
    // Zone 1
    { layer: 0,  types: ['battle', 'battle', 'battle'], enemies: BLACK_Z1, baseMult: 1.00 },
    { layer: 1,  types: ['battle', 'battle', 'rest'],   enemies: BLACK_Z1, baseMult: 1.08 },
    { layer: 2,  types: ['battle', 'elite', 'battle'],  enemies: BLACK_Z1, baseMult: 1.16, eliteMult: 1.30 },
    { layer: 3,  types: ['battle', 'battle', 'battle'], enemies: BLACK_Z1, baseMult: 1.25 },
    // Zone 2
    { layer: 5,  types: ['battle', 'battle', 'battle'], enemies: BLACK_Z2, baseMult: 1.40 },
    { layer: 6,  types: ['battle', 'elite', 'rest'],    enemies: BLACK_Z2, baseMult: 1.50, eliteMult: 1.65 },
    { layer: 7,  types: ['battle', 'battle', 'battle'], enemies: BLACK_Z2, baseMult: 1.60 },
    { layer: 8,  types: ['battle', 'elite', 'battle'],  enemies: BLACK_Z2, baseMult: 1.72, eliteMult: 1.88 },
    // Zone 3
    { layer: 10, types: ['battle', 'battle', 'battle'], enemies: BLACK_Z3, baseMult: 1.80 },
    { layer: 11, types: ['battle', 'elite', 'rest'],    enemies: BLACK_Z3, baseMult: 1.92, eliteMult: 2.10 },
    { layer: 12, types: ['battle', 'battle', 'battle'], enemies: BLACK_Z3, baseMult: 2.02 },
    { layer: 13, types: ['battle', 'elite', 'battle'],  enemies: BLACK_Z3, baseMult: 2.15, eliteMult: 2.35 },
  ]

  const layerMap: Record<number, DungeonNode[]> = {}

  for (const spec of specs) {
    const types = shuffle<DungeonNodeType>([...spec.types])
    layerMap[spec.layer] = types.map((type, col) => ({
      id: `bk_${spec.layer}_${col}`,
      type,
      layer: spec.layer,
      col,
      enemyId: type === 'rest' ? undefined : type === 'elite' ? 'coral_guard_captain' : randFrom(spec.enemies),
      floorMult: Math.round(
        (type === 'elite' ? (spec.eliteMult ?? spec.baseMult + 0.14) : spec.baseMult + Math.random() * 0.06) * 100
      ) / 100,
      connections: [] as string[],
      cleared: false,
      reachable: spec.layer === 0,
    }))
  }

  layerMap[4]  = [{ id: 'bk_4_0',  type: 'mini_boss', layer: 4,  col: 0, enemyId: 'coral_guard_captain', floorMult: 1.85, connections: [], cleared: false, reachable: false }]
  layerMap[9]  = [{ id: 'bk_9_0',  type: 'mini_boss', layer: 9,  col: 0, enemyId: 'sunken_crown_witch',  floorMult: 2.55, connections: [], cleared: false, reachable: false }]
  layerMap[14] = [{ id: 'bk_14_0', type: 'boss',      layer: 14, col: 0, enemyId: 'tide_king_ausrein',   floorMult: 3.20, connections: [], cleared: false, reachable: false }]

  const layerOrder = Object.keys(layerMap).map(Number).sort((a, b) => a - b)

  for (let li = 0; li < layerOrder.length - 1; li++) {
    const current = layerMap[layerOrder[li]]
    const next    = layerMap[layerOrder[li + 1]]

    if (next.length === 1) {
      for (const n of current) n.connections.push(next[0].id)
    } else if (current.length === 1) {
      for (const n of next) current[0].connections.push(n.id)
    } else {
      const reached = new Set<string>()
      for (const node of current) {
        const tc = Math.min(node.col, next.length - 1)
        node.connections.push(next[tc].id)
        reached.add(next[tc].id)
        if (Math.random() < 0.4) {
          const adj = tc + (Math.random() < 0.5 ? -1 : 1)
          if (adj >= 0 && adj < next.length && adj !== tc) {
            node.connections.push(next[adj].id)
            reached.add(next[adj].id)
          }
        }
      }
      for (const n of next) {
        if (!reached.has(n.id)) {
          const pick = current[Math.floor(Math.random() * current.length)]
          if (!pick.connections.includes(n.id)) pick.connections.push(n.id)
        }
      }
    }
  }

  return layerOrder.flatMap(l => layerMap[l])
}

// ── 燃燒王座地圖生成 ───────────────────────────────────────────────────────
const THRONE_Z1 = ['flame_imp', 'molten_guard']
const THRONE_Z2 = ['ash_mage', 'inferno_hound', 'molten_guard']
const THRONE_Z3 = ['flame_imp', 'ash_mage', 'inferno_hound']

export function generateBurningThroneMap(): DungeonNode[] {
  const specs: { layer: number; types: DungeonNodeType[]; enemies: string[]; baseMult: number; eliteMult?: number }[] = [
    // Zone 1（每區僅保留 1 個休息點）
    { layer: 0,  types: ['battle', 'battle', 'battle'], enemies: THRONE_Z1, baseMult: 0.90 },
    { layer: 1,  types: ['battle', 'battle', 'rest'],   enemies: THRONE_Z1, baseMult: 0.97 },
    { layer: 2,  types: ['battle', 'elite', 'battle'],  enemies: THRONE_Z1, baseMult: 1.04, eliteMult: 1.16 },
    { layer: 3,  types: ['battle', 'battle', 'battle'], enemies: THRONE_Z1, baseMult: 1.12 },
    // Zone 2
    { layer: 5,  types: ['battle', 'battle', 'battle'], enemies: THRONE_Z2, baseMult: 1.22 },
    { layer: 6,  types: ['battle', 'elite', 'rest'],    enemies: THRONE_Z2, baseMult: 1.30, eliteMult: 1.44 },
    { layer: 7,  types: ['battle', 'battle', 'battle'], enemies: THRONE_Z2, baseMult: 1.38 },
    { layer: 8,  types: ['battle', 'elite', 'battle'],  enemies: THRONE_Z2, baseMult: 1.48, eliteMult: 1.62 },
    // Zone 3
    { layer: 10, types: ['battle', 'battle', 'battle'], enemies: THRONE_Z3, baseMult: 1.53 },
    { layer: 11, types: ['battle', 'elite', 'rest'],    enemies: THRONE_Z3, baseMult: 1.63, eliteMult: 1.78 },
    { layer: 12, types: ['battle', 'battle', 'battle'], enemies: THRONE_Z3, baseMult: 1.72 },
    { layer: 13, types: ['battle', 'elite', 'battle'],  enemies: THRONE_Z3, baseMult: 1.83, eliteMult: 1.98 },
  ]

  const layerMap: Record<number, DungeonNode[]> = {}

  for (const spec of specs) {
    const types = shuffle<DungeonNodeType>([...spec.types])
    layerMap[spec.layer] = types.map((type, col) => ({
      id: `bt_${spec.layer}_${col}`,
      type,
      layer: spec.layer,
      col,
      enemyId: type === 'rest' ? undefined : type === 'elite' ? 'black_flame_knight' : randFrom(spec.enemies),
      floorMult: Math.round(
        (type === 'elite' ? (spec.eliteMult ?? spec.baseMult + 0.12) : spec.baseMult + Math.random() * 0.06) * 100
      ) / 100,
      connections: [] as string[],
      cleared: false,
      reachable: spec.layer === 0,
    }))
  }

  // Zone mini-bosses and final boss
  layerMap[4]  = [{ id: 'bt_4_0',  type: 'mini_boss', layer: 4,  col: 0, enemyId: 'black_flame_knight', floorMult: 1.70, connections: [], cleared: false, reachable: false }]
  layerMap[9]  = [{ id: 'bt_9_0',  type: 'mini_boss', layer: 9,  col: 0, enemyId: 'fallen_fire_priest', floorMult: 2.30, connections: [], cleared: false, reachable: false }]
  layerMap[14] = [{ id: 'bt_14_0', type: 'boss',      layer: 14, col: 0, enemyId: 'throne_demon_king',  floorMult: 2.90, connections: [], cleared: false, reachable: false }]

  const layerOrder = Object.keys(layerMap).map(Number).sort((a, b) => a - b)

  for (let li = 0; li < layerOrder.length - 1; li++) {
    const current = layerMap[layerOrder[li]]
    const next    = layerMap[layerOrder[li + 1]]

    if (next.length === 1) {
      for (const n of current) n.connections.push(next[0].id)
    } else if (current.length === 1) {
      for (const n of next) current[0].connections.push(n.id)
    } else {
      const reached = new Set<string>()
      for (const node of current) {
        const tc = Math.min(node.col, next.length - 1)
        node.connections.push(next[tc].id)
        reached.add(next[tc].id)
        if (Math.random() < 0.4) {
          const adj = tc + (Math.random() < 0.5 ? -1 : 1)
          if (adj >= 0 && adj < next.length && adj !== tc) {
            node.connections.push(next[adj].id)
            reached.add(next[adj].id)
          }
        }
      }
      for (const n of next) {
        if (!reached.has(n.id)) {
          const pick = current[Math.floor(Math.random() * current.length)]
          if (!pick.connections.includes(n.id)) pick.connections.push(n.id)
        }
      }
    }
  }

  return layerOrder.flatMap(l => layerMap[l])
}

// ── Node-based dungeon map ─────────────────────────────────────────────────

export type DungeonNodeType = 'battle' | 'elite' | 'mini_boss' | 'rest' | 'boss' | 'event' | 'chest'

export type DungeonNode = {
  id: string
  type: DungeonNodeType
  layer: number       // 0 = entry, 14 = final boss
  col: number
  enemyId?: string
  floorMult: number
  connections: string[]
  cleared: boolean
  reachable: boolean
  eventId?: string    // for event nodes only
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function randFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const NORMAL_Z1 = ['rift_imp', 'star_sand_golem', 'mirror_thief']
const NORMAL_Z2 = ['star_sand_golem', 'mirror_thief', 'rift_imp']
const NORMAL_Z3 = ['star_sand_golem', 'mirror_thief']

// 15-layer / 3-zone dungeon (5 layers per zone):
//  Zone 1 (layers 0-4):  4 choice layers → mini-boss 星蝕修女  (layer 4)
//  Zone 2 (layers 5-9):  4 choice layers → mini-boss 裂隙守衛  (layer 9)
//  Zone 3 (layers 10-14): 4 choice layers → final boss 星蝕主教 (layer 14)
export function generateDungeonMap(): DungeonNode[] {
  type LayerSpec = {
    layer: number
    types: DungeonNodeType[]
    enemies: string[]
    baseMult: number
    eliteMult?: number
  }

  const specs: LayerSpec[] = [
    // ── Zone 1（每區僅保留 1 個休息點）────────────────────────
    { layer: 0,  types: ['battle','battle','battle'],  enemies: NORMAL_Z1, baseMult: 0.90 },
    { layer: 1,  types: ['battle','battle','rest'],    enemies: NORMAL_Z1, baseMult: 0.98 },
    { layer: 2,  types: ['battle','elite','battle'],   enemies: NORMAL_Z1, baseMult: 1.05, eliteMult: 1.16 },
    { layer: 3,  types: ['battle','battle','battle'],  enemies: NORMAL_Z1, baseMult: 1.14 },
    // ── Zone 2 ───────────────────────────────────────────────
    { layer: 5,  types: ['battle','battle','battle'],  enemies: NORMAL_Z2, baseMult: 1.24 },
    { layer: 6,  types: ['battle','elite','rest'],     enemies: NORMAL_Z2, baseMult: 1.32, eliteMult: 1.45 },
    { layer: 7,  types: ['battle','battle','battle'],  enemies: NORMAL_Z2, baseMult: 1.40 },
    { layer: 8,  types: ['battle','elite','battle'],   enemies: NORMAL_Z2, baseMult: 1.50, eliteMult: 1.64 },
    // ── Zone 3 ───────────────────────────────────────────────
    { layer: 10, types: ['battle','battle','battle'],  enemies: NORMAL_Z3, baseMult: 1.56 },
    { layer: 11, types: ['battle','elite','rest'],     enemies: NORMAL_Z3, baseMult: 1.66, eliteMult: 1.80 },
    { layer: 12, types: ['battle','battle','battle'],  enemies: NORMAL_Z3, baseMult: 1.74 },
    { layer: 13, types: ['battle','elite','battle'],   enemies: NORMAL_Z3, baseMult: 1.85, eliteMult: 2.00 },
  ]

  const layerMap: Record<number, DungeonNode[]> = {}

  // Build choice layers
  for (const spec of specs) {
    const types = shuffle<DungeonNodeType>([...spec.types])
    layerMap[spec.layer] = types.map((type, col) => ({
      id: `dn_${spec.layer}_${col}`,
      type,
      layer: spec.layer,
      col,
      enemyId: type === 'rest' ? undefined : type === 'elite' ? 'star_reaper' : randFrom(spec.enemies),
      floorMult: Math.round(
        (type === 'elite' ? (spec.eliteMult ?? spec.baseMult + 0.1) : spec.baseMult + Math.random() * 0.06) * 100
      ) / 100,
      connections: [] as string[],
      cleared: false,
      reachable: spec.layer === 0,
    }))
  }

  // Zone mini-bosses and final boss
  layerMap[4]  = [{ id: 'dn_4_0',  type: 'mini_boss', layer: 4,  col: 0, enemyId: 'eclipse_nun',   floorMult: 1.70, connections: [], cleared: false, reachable: false }]
  layerMap[9]  = [{ id: 'dn_9_0',  type: 'mini_boss', layer: 9,  col: 0, enemyId: 'rift_guardian', floorMult: 2.30, connections: [], cleared: false, reachable: false }]
  layerMap[14] = [{ id: 'dn_14_0', type: 'boss',      layer: 14, col: 0, enemyId: 'eclipse_bishop',floorMult: 2.90, connections: [], cleared: false, reachable: false }]

  // Sorted layer indices for connection building
  const layerOrder = Object.keys(layerMap).map(Number).sort((a, b) => a - b)

  for (let li = 0; li < layerOrder.length - 1; li++) {
    const current = layerMap[layerOrder[li]]
    const next    = layerMap[layerOrder[li + 1]]

    if (next.length === 1) {
      // All current nodes converge on single boss/mini-boss
      for (const n of current) n.connections.push(next[0].id)
    } else if (current.length === 1) {
      // Zone boss fans out to all next choice nodes
      for (const n of next) current[0].connections.push(n.id)
    } else {
      // Regular branching: aligned + optional adjacent
      const reached = new Set<string>()
      for (const node of current) {
        const tc = Math.min(node.col, next.length - 1)
        node.connections.push(next[tc].id)
        reached.add(next[tc].id)
        if (Math.random() < 0.4) {
          const adj = tc + (Math.random() < 0.5 ? -1 : 1)
          if (adj >= 0 && adj < next.length && adj !== tc) {
            node.connections.push(next[adj].id)
            reached.add(next[adj].id)
          }
        }
      }
      for (const n of next) {
        if (!reached.has(n.id)) {
          const pick = current[Math.floor(Math.random() * current.length)]
          if (!pick.connections.includes(n.id)) pick.connections.push(n.id)
        }
      }
    }
  }

  return layerOrder.flatMap(l => layerMap[l])
}

// ── 灰燼聖約地圖生成 ──────────────────────────────────────────────────────
const ASH_Z1 = ['covenant_ember', 'royal_blood_disciple', 'mass_resentment']
const ASH_Z2 = ['royal_blood_disciple', 'covenant_guard', 'mass_resentment']
const ASH_Z3 = ['covenant_guard', 'covenant_ember', 'royal_blood_disciple']
const ASH_EVENTS = ['ash_altar', 'mass_whisper', 'fallen_edict', 'covenant_stele']

export function generateAshCovenantMap(): DungeonNode[] {
  const specs: { layer: number; types: DungeonNodeType[]; enemies: string[]; baseMult: number; eliteMult?: number }[] = [
    // Zone 1
    { layer: 0,  types: ['battle', 'event',  'battle'], enemies: ASH_Z1, baseMult: 0.95 },
    { layer: 1,  types: ['battle', 'battle', 'rest'],   enemies: ASH_Z1, baseMult: 1.03 },
    { layer: 2,  types: ['battle', 'elite',  'chest'],  enemies: ASH_Z1, baseMult: 1.12, eliteMult: 1.24 },
    { layer: 3,  types: ['battle', 'event',  'battle'], enemies: ASH_Z1, baseMult: 1.20 },
    // Zone 2
    { layer: 5,  types: ['battle', 'battle', 'battle'], enemies: ASH_Z2, baseMult: 1.40 },
    { layer: 6,  types: ['event',  'elite',  'rest'],   enemies: ASH_Z2, baseMult: 1.52, eliteMult: 1.68 },
    { layer: 7,  types: ['battle', 'battle', 'chest'],  enemies: ASH_Z2, baseMult: 1.62 },
    { layer: 8,  types: ['battle', 'elite',  'event'],  enemies: ASH_Z2, baseMult: 1.75, eliteMult: 1.92 },
    // Zone 3
    { layer: 10, types: ['battle', 'battle', 'battle'], enemies: ASH_Z3, baseMult: 1.90 },
    { layer: 11, types: ['battle', 'event',  'rest'],   enemies: ASH_Z3, baseMult: 2.05 },
    { layer: 12, types: ['battle', 'elite',  'battle'], enemies: ASH_Z3, baseMult: 2.18, eliteMult: 2.38 },
    { layer: 13, types: ['chest',  'battle', 'elite'],  enemies: ASH_Z3, baseMult: 2.32, eliteMult: 2.55 },
  ]

  const layerMap: Record<number, DungeonNode[]> = {}

  for (const spec of specs) {
    const types = shuffle<DungeonNodeType>([...spec.types])
    layerMap[spec.layer] = types.map((type, col) => {
      const isEvent = type === 'event', isChest = type === 'chest', isRest = type === 'rest'
      const isElite = type === 'elite'
      return {
        id: `ac_${spec.layer}_${col}`, type, layer: spec.layer, col,
        enemyId: (isEvent || isChest || isRest) ? undefined : isElite ? 'ash_judge' : randFrom(spec.enemies),
        floorMult: Math.round(
          (isElite ? (spec.eliteMult ?? spec.baseMult + 0.12) : (isEvent || isChest || isRest) ? 0 : spec.baseMult + Math.random() * 0.06) * 100
        ) / 100,
        connections: [] as string[],
        cleared: false,
        reachable: spec.layer === 0,
        eventId: isEvent ? randFrom(ASH_EVENTS) : undefined,
      }
    })
  }

  layerMap[4]  = [{ id: 'ac_4_0',  type: 'mini_boss', layer: 4,  col: 0, enemyId: 'ash_judge',             floorMult: 1.90, connections: [], cleared: false, reachable: false }]
  layerMap[9]  = [{ id: 'ac_9_0',  type: 'mini_boss', layer: 9,  col: 0, enemyId: 'crown_priest_seron',    floorMult: 2.60, connections: [], cleared: false, reachable: false }]
  layerMap[14] = [{ id: 'ac_14_0', type: 'boss',      layer: 14, col: 0, enemyId: 'ash_fallen_king_aldrek',floorMult: 3.40, connections: [], cleared: false, reachable: false }]

  const layerOrder = Object.keys(layerMap).map(Number).sort((a, b) => a - b)

  for (let li = 0; li < layerOrder.length - 1; li++) {
    const current = layerMap[layerOrder[li]]
    const next    = layerMap[layerOrder[li + 1]]
    if (next.length === 1) {
      for (const n of current) n.connections.push(next[0].id)
    } else if (current.length === 1) {
      for (const n of next) current[0].connections.push(n.id)
    } else {
      const reached = new Set<string>()
      for (const node of current) {
        const tc = Math.min(node.col, next.length - 1)
        node.connections.push(next[tc].id); reached.add(next[tc].id)
        if (Math.random() < 0.4) {
          const adj = tc + (Math.random() < 0.5 ? -1 : 1)
          if (adj >= 0 && adj < next.length && adj !== tc) { node.connections.push(next[adj].id); reached.add(next[adj].id) }
        }
      }
      for (const n of next) {
        if (!reached.has(n.id)) {
          const pick = current[Math.floor(Math.random() * current.length)]
          if (!pick.connections.includes(n.id)) pick.connections.push(n.id)
        }
      }
    }
  }

  return layerOrder.flatMap(l => layerMap[l])
}

export function advanceDungeonMap(nodes: DungeonNode[], clearedId: string): DungeonNode[] {
  const clearedSet = new Set(nodes.filter(n => n.cleared).map(n => n.id))
  clearedSet.add(clearedId)

  const maxClearedLayer = Math.max(
    ...Array.from(clearedSet).map(id => nodes.find(n => n.id === id)!.layer),
  )

  const reachableIds = new Set<string>()
  nodes
    .filter(n => clearedSet.has(n.id) && n.layer === maxClearedLayer)
    .forEach(n => n.connections.forEach(id => reachableIds.add(id)))

  return nodes.map(n => {
    if (n.id === clearedId) return { ...n, cleared: true, reachable: true }
    if (reachableIds.has(n.id)) return { ...n, reachable: true }
    return n
  })
}
