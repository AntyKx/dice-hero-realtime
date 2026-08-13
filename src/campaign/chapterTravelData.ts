/**
 * 森林遺跡 1–20 關的完整旅程資料：四篇章 × 六段 = 24 段節點，對應既有 20
 * 場戰鬥（forest_1_1 ~ forest_1_20）+ 4 個純轉場段（每篇章末的過場，接在
 * 該篇章 Boss 段前面一起播）。
 *
 * ground/midground/foreground 欄位存的是「裝飾代稱」而不是圖片路徑——
 * 第一版刻意不生產/下載新場景圖，改由 CampaignTravelPreview.tsx 內建的
 * GROUND_STYLE/DECOR_GLYPH 對照表，把這些代稱轉成 CSS 漸層色塊或既有
 * emoji 圖示當暫代地面/地標。日後要換真美術，見 docs/campaign-travel-system.md
 * 的替換對照表。
 *
 * 地面/地標/前景刻意收斂成 6 種地面模組、6 種地標、10 種前景遮罩重複使用
 * （而不是 24 段各自發明新代稱），對應 docs 文件要求的美術替換資產分類。
 *
 * backdrop 用森林遺跡專屬戰鬥場景圖（2026-08-14 美術交付，
 * `D:\CLAUDE專案\三選一\戰鬥場景圖\森林遺跡`，已複製進
 * public/assets/backgrounds/forest_ruins_2026_08/），依 forestRuins.ts
 * 各關卡實際的 bgTheme 一對一對應同一張圖，確保旅程畫面跟即將進入的戰鬥
 * 背景完全一致：1-4 forest_entrance / 5-7 ancient_ruins / 8-9,13-14,16
 * poison_forest / 10-12,15,17 ancient_altar / 18-20 dragon_nest。目前每個
 * 主題只有 1 張圖（不是舊的 forest/castle/snowfield 三張變體借用機制），
 * 同主題的段落背景會相同，之後美術補齊變體再擴充。
 */
import type { ChapterId, TravelLayer, TravelPathNode, TravelSegment } from './chapterTravelTypes'

const BACKDROP_PARALLAX = 0.15
const GROUND_PARALLAX = 1.0
const MIDGROUND_PARALLAX = 0.45
const FOREGROUND_PARALLAX = 1.18

function layers(backdrop: string, ground: string, midground: string[], foreground: string[]): TravelLayer[] {
  const out: TravelLayer[] = [
    { id: 'backdrop', kind: 'backdrop', asset: backdrop, parallax: BACKDROP_PARALLAX },
    { id: 'ground', kind: 'ground', className: ground, parallax: GROUND_PARALLAX },
  ]
  midground.forEach((k, i) => out.push({ id: `mg_${i}`, kind: 'midground', className: k, parallax: MIDGROUND_PARALLAX }))
  foreground.forEach((k, i) => out.push({ id: `fg_${i}`, kind: 'foreground', className: k, parallax: FOREGROUND_PARALLAX }))
  return out
}

function path(nodes: Array<[number, number, number]>): TravelPathNode[] {
  return nodes.map(([x, footY, scale]) => ({ x, footY, scale }))
}

function segment(
  id: string,
  chapterId: ChapterId,
  order: number,
  title: string,
  kind: 'battle' | 'transition',
  stageId: string | undefined,
  layerList: TravelLayer[],
  pathNodes: TravelPathNode[],
  ambience: TravelSegment['ambience'],
): TravelSegment {
  return {
    id, chapterId, order, title, kind, stageId, layers: layerList, pathNodes,
    entrance: pathNodes[0], exit: pathNodes[pathNodes.length - 1], ambience,
  }
}

const BG_DIR = '/assets/backgrounds/forest_ruins_2026_08/arena_ready_941x1672'
const FOREST_ENTRANCE = `${BG_DIR}/forest_entrance_1.jpg`
const POISON_FOREST = `${BG_DIR}/poison_forest_1.jpg`
const ANCIENT_RUINS = `${BG_DIR}/ancient_ruins_1.jpg`
const ANCIENT_ALTAR = `${BG_DIR}/ancient_altar_1.jpg`
const DRAGON_NEST = `${BG_DIR}/dragon_nest_1.jpg`

export const ALL_TRAVEL_SEGMENTS: TravelSegment[] = [
  // ── 篇章 I：枯葉邊境（forest_1_1 ~ forest_1_5）── ambience: leaves
  segment('c1_01_watchpost', 'forest-ch1', 1, '枯木哨口', 'battle', 'forest_1_1',
    layers(FOREST_ENTRANCE, 'dirt_path', ['wood_post', 'wood_post'], ['fallen_leaves']),
    path([[0.06, 0.32, 0.55], [0.24, 0.42, 0.65], [0.46, 0.55, 0.78], [0.68, 0.68, 0.9], [0.86, 0.8, 1.0]]),
    'leaves'),
  segment('c1_02_moss_road', 'forest-ch1', 2, '苔蘚古道', 'battle', 'forest_1_2',
    layers(FOREST_ENTRANCE, 'stone_path', ['stone_pillar'], ['moss_tuft', 'moss_tuft']),
    path([[0.08, 0.3, 0.55], [0.3, 0.4, 0.65], [0.5, 0.5, 0.75], [0.7, 0.63, 0.88], [0.88, 0.78, 1.0]]),
    'leaves'),
  segment('c1_03_thorn_bend', 'forest-ch1', 3, '荊棘彎道', 'battle', 'forest_1_3',
    layers(FOREST_ENTRANCE, 'wood_bridge', ['stone_pillar'], ['thorn_cluster', 'thorn_cluster']),
    path([[0.07, 0.34, 0.55], [0.26, 0.46, 0.68], [0.44, 0.5, 0.72], [0.64, 0.62, 0.86], [0.82, 0.74, 0.96], [0.9, 0.82, 1.0]]),
    'leaves'),
  segment('c1_04_goblin_palisade', 'forest-ch1', 4, '哥布林木柵', 'battle', 'forest_1_4',
    layers(FOREST_ENTRANCE, 'dirt_path', ['palisade', 'palisade'], ['ember_spark']),
    path([[0.08, 0.33, 0.55], [0.28, 0.44, 0.66], [0.5, 0.56, 0.8], [0.7, 0.68, 0.9], [0.87, 0.79, 1.0]]),
    'leaves'),
  segment('c1_05_broken_arch', 'forest-ch1', 5, '崩塌拱門', 'transition', undefined,
    layers(ANCIENT_RUINS, 'stone_stairs', ['ruin_gate'], ['fallen_rock']),
    path([[0.1, 0.3, 0.55], [0.32, 0.44, 0.68], [0.56, 0.58, 0.82], [0.8, 0.74, 0.96]]),
    'leaves'),
  segment('c1_06_orc_ritual_ground', 'forest-ch1', 6, '獸人儀式台', 'battle', 'forest_1_5',
    layers(ANCIENT_RUINS, 'ritual_platform', ['broken_altar', 'brazier'], ['ember_spark', 'ember_spark']),
    path([[0.08, 0.34, 0.55], [0.3, 0.46, 0.7], [0.52, 0.58, 0.84], [0.72, 0.7, 0.94], [0.88, 0.82, 1.0]]),
    'leaves'),

  // ── 篇章 II：根脈低語（forest_1_6 ~ forest_1_10）── ambience: root-glow
  segment('c2_01_arrowfall_passage', 'forest-ch2', 1, '箭雨殘道', 'battle', 'forest_1_6',
    layers(ANCIENT_RUINS, 'stone_path', ['stone_pillar', 'stone_pillar'], ['fallen_rock']),
    path([[0.06, 0.32, 0.55], [0.26, 0.44, 0.68], [0.48, 0.56, 0.8], [0.7, 0.68, 0.9], [0.88, 0.8, 1.0]]),
    'root-glow'),
  segment('c2_02_shaman_altar', 'forest-ch2', 2, '薩滿祭壇', 'battle', 'forest_1_7',
    layers(ANCIENT_RUINS, 'stone_stairs', ['brazier', 'brazier'], ['ember_spark', 'ember_spark']),
    path([[0.08, 0.28, 0.5], [0.24, 0.42, 0.62], [0.42, 0.52, 0.72], [0.6, 0.64, 0.84], [0.78, 0.74, 0.94], [0.88, 0.82, 1.0]]),
    'root-glow'),
  segment('c2_03_fungal_marsh', 'forest-ch2', 3, '毒菇濕地', 'battle', 'forest_1_8',
    layers(POISON_FOREST, 'wood_bridge', ['stone_pillar'], ['mushroom_cluster', 'mist_wisp']),
    path([[0.07, 0.33, 0.55], [0.28, 0.45, 0.68], [0.5, 0.55, 0.78], [0.7, 0.67, 0.9], [0.87, 0.79, 1.0]]),
    'root-glow'),
  segment('c2_04_root_maze', 'forest-ch2', 4, '樹根迷境', 'battle', 'forest_1_9',
    layers(POISON_FOREST, 'dirt_path', [], ['root_tangle', 'root_tangle']),
    path([[0.08, 0.32, 0.55], [0.3, 0.4, 0.62], [0.5, 0.52, 0.74], [0.68, 0.62, 0.84], [0.86, 0.78, 1.0]]),
    'root-glow'),
  segment('c2_05_heartwood_gate', 'forest-ch2', 5, '心材之門', 'transition', undefined,
    layers(ANCIENT_ALTAR, 'ritual_platform', ['ruin_gate', 'broken_altar'], ['crystal_shard', 'root_tangle']),
    path([[0.1, 0.32, 0.55], [0.34, 0.46, 0.7], [0.58, 0.6, 0.84], [0.8, 0.76, 0.98]]),
    'root-glow'),
  segment('c2_06_ancient_tree_chamber', 'forest-ch2', 6, '古樹心室', 'battle', 'forest_1_10',
    layers(ANCIENT_ALTAR, 'ritual_platform', ['broken_altar', 'stone_pillar'], ['root_tangle', 'root_tangle']),
    path([[0.08, 0.34, 0.55], [0.3, 0.46, 0.7], [0.52, 0.58, 0.84], [0.72, 0.7, 0.94], [0.88, 0.82, 1.0]]),
    'root-glow'),

  // ── 篇章 III：黑霧裂口（forest_1_11 ~ forest_1_15）── ambience: miasma
  segment('c3_01_shattered_core_court', 'forest-ch3', 1, '碎核庭院', 'battle', 'forest_1_11',
    layers(ANCIENT_ALTAR, 'stone_path', ['stone_pillar', 'broken_altar'], ['crystal_shard']),
    path([[0.07, 0.32, 0.55], [0.28, 0.44, 0.68], [0.5, 0.56, 0.8], [0.7, 0.68, 0.9], [0.88, 0.8, 1.0]]),
    'miasma'),
  segment('c3_02_shard_gallery', 'forest-ch3', 2, '碎片回廊', 'battle', 'forest_1_12',
    layers(ANCIENT_ALTAR, 'stone_path', ['stone_pillar'], ['crystal_shard', 'crystal_shard']),
    path([[0.08, 0.3, 0.55], [0.3, 0.42, 0.66], [0.5, 0.54, 0.78], [0.7, 0.66, 0.9], [0.88, 0.8, 1.0]]),
    'miasma'),
  segment('c3_03_thorn_hunting_ground', 'forest-ch3', 3, '荊棘獵場', 'battle', 'forest_1_13',
    layers(POISON_FOREST, 'scorched_rock', ['wood_post'], ['thorn_cluster', 'thorn_cluster']),
    path([[0.06, 0.3, 0.5], [0.22, 0.4, 0.6], [0.4, 0.48, 0.68], [0.58, 0.6, 0.8], [0.76, 0.72, 0.92], [0.88, 0.82, 1.0]]),
    'miasma'),
  segment('c3_04_miasma_bridge', 'forest-ch3', 4, '毒霧低谷', 'battle', 'forest_1_14',
    layers(POISON_FOREST, 'wood_bridge', [], ['mist_wisp', 'mist_wisp']),
    path([[0.07, 0.32, 0.55], [0.28, 0.42, 0.65], [0.5, 0.52, 0.76], [0.7, 0.64, 0.88], [0.87, 0.78, 1.0]]),
    'miasma'),
  segment('c3_05_obsidian_rift_gate', 'forest-ch3', 5, '黑曜裂門', 'transition', undefined,
    layers(ANCIENT_ALTAR, 'scorched_rock', ['ruin_gate'], ['mist_wisp', 'mist_wisp']),
    path([[0.1, 0.3, 0.55], [0.34, 0.44, 0.7], [0.58, 0.58, 0.84], [0.8, 0.74, 0.98]]),
    'miasma'),
  segment('c3_06_vanguard_duel_platform', 'forest-ch3', 6, '先鋒決鬥坪', 'battle', 'forest_1_15',
    layers(ANCIENT_ALTAR, 'ritual_platform', ['stone_pillar', 'brazier'], ['crystal_shard', 'fallen_rock']),
    path([[0.08, 0.34, 0.55], [0.3, 0.46, 0.7], [0.52, 0.58, 0.84], [0.72, 0.7, 0.94], [0.88, 0.82, 1.0]]),
    'miasma'),

  // ── 篇章 IV：巢穴終焉（forest_1_16 ~ forest_1_20）── ambience: heat-haze
  segment('c4_01_blighted_trail', 'forest-ch4', 1, '腐敗林徑', 'battle', 'forest_1_16',
    layers(POISON_FOREST, 'dirt_path', [], ['mushroom_cluster', 'mushroom_cluster']),
    path([[0.06, 0.32, 0.55], [0.26, 0.42, 0.66], [0.48, 0.54, 0.78], [0.7, 0.66, 0.9], [0.88, 0.8, 1.0]]),
    'heat-haze'),
  segment('c4_02_broken_defense', 'forest-ch4', 2, '殘破防線', 'battle', 'forest_1_17',
    layers(ANCIENT_ALTAR, 'stone_path', ['palisade', 'broken_altar'], ['banner_flag', 'banner_flag']),
    path([[0.08, 0.32, 0.55], [0.3, 0.44, 0.68], [0.5, 0.56, 0.8], [0.7, 0.68, 0.9], [0.87, 0.8, 1.0]]),
    'heat-haze'),
  segment('c4_03_orc_iron_gate', 'forest-ch4', 3, '獸人鐵關', 'battle', 'forest_1_18',
    layers(DRAGON_NEST, 'wood_bridge', ['palisade', 'palisade'], ['banner_flag', 'banner_flag']),
    path([[0.07, 0.3, 0.55], [0.28, 0.42, 0.66], [0.5, 0.54, 0.78], [0.7, 0.66, 0.9], [0.88, 0.8, 1.0]]),
    'heat-haze'),
  segment('c4_04_dragon_nest_cavern', 'forest-ch4', 4, '龍巢岩穴', 'battle', 'forest_1_19',
    layers(DRAGON_NEST, 'scorched_rock', ['stone_pillar'], ['fallen_rock', 'fallen_rock']),
    path([[0.08, 0.32, 0.55], [0.3, 0.44, 0.68], [0.52, 0.56, 0.8], [0.72, 0.68, 0.9], [0.88, 0.8, 1.0]]),
    'heat-haze'),
  segment('c4_05_crater_ascent', 'forest-ch4', 5, '火山口上坡', 'transition', undefined,
    layers(DRAGON_NEST, 'stone_stairs', ['stone_pillar'], ['ember_spark']),
    path([[0.1, 0.26, 0.5], [0.3, 0.4, 0.62], [0.52, 0.52, 0.74], [0.72, 0.66, 0.88], [0.86, 0.78, 1.0]]),
    'heat-haze'),
  segment('c4_06_dragon_nest_oculus', 'forest-ch4', 6, '龍巢天井', 'battle', 'forest_1_20',
    layers(DRAGON_NEST, 'ritual_platform', ['broken_altar', 'stone_pillar'], ['ember_spark', 'ember_spark']),
    path([[0.08, 0.34, 0.55], [0.3, 0.46, 0.7], [0.52, 0.58, 0.84], [0.72, 0.7, 0.94], [0.88, 0.82, 1.0]]),
    'heat-haze'),
]

const SEGMENT_BY_ID: Record<string, TravelSegment> = Object.fromEntries(ALL_TRAVEL_SEGMENTS.map(s => [s.id, s]))

/** stageId → 依序要播放的旅程段落。每篇章最後一戰（Boss）前面接一段純轉場。 */
const SEGMENTS_BY_STAGE_ID: Record<string, TravelSegment[]> = {
  forest_1_1: [SEGMENT_BY_ID.c1_01_watchpost],
  forest_1_2: [SEGMENT_BY_ID.c1_02_moss_road],
  forest_1_3: [SEGMENT_BY_ID.c1_03_thorn_bend],
  forest_1_4: [SEGMENT_BY_ID.c1_04_goblin_palisade],
  forest_1_5: [SEGMENT_BY_ID.c1_05_broken_arch, SEGMENT_BY_ID.c1_06_orc_ritual_ground],

  forest_1_6: [SEGMENT_BY_ID.c2_01_arrowfall_passage],
  forest_1_7: [SEGMENT_BY_ID.c2_02_shaman_altar],
  forest_1_8: [SEGMENT_BY_ID.c2_03_fungal_marsh],
  forest_1_9: [SEGMENT_BY_ID.c2_04_root_maze],
  forest_1_10: [SEGMENT_BY_ID.c2_05_heartwood_gate, SEGMENT_BY_ID.c2_06_ancient_tree_chamber],

  forest_1_11: [SEGMENT_BY_ID.c3_01_shattered_core_court],
  forest_1_12: [SEGMENT_BY_ID.c3_02_shard_gallery],
  forest_1_13: [SEGMENT_BY_ID.c3_03_thorn_hunting_ground],
  forest_1_14: [SEGMENT_BY_ID.c3_04_miasma_bridge],
  forest_1_15: [SEGMENT_BY_ID.c3_05_obsidian_rift_gate, SEGMENT_BY_ID.c3_06_vanguard_duel_platform],

  forest_1_16: [SEGMENT_BY_ID.c4_01_blighted_trail],
  forest_1_17: [SEGMENT_BY_ID.c4_02_broken_defense],
  forest_1_18: [SEGMENT_BY_ID.c4_03_orc_iron_gate],
  forest_1_19: [SEGMENT_BY_ID.c4_04_dragon_nest_cavern],
  forest_1_20: [SEGMENT_BY_ID.c4_05_crater_ascent, SEGMENT_BY_ID.c4_06_dragon_nest_oculus],
}

/** 該 stageId 是否有旅程預覽資料（目前涵蓋森林遺跡全部 20 關）。 */
export function hasTravelSegments(stageId: string): boolean {
  return !!SEGMENTS_BY_STAGE_ID[stageId]
}

/** 取得某關卡對應要依序播放的旅程段落；沒有資料回傳空陣列。 */
export function getTravelSegmentsForStage(stageId: string): TravelSegment[] {
  return SEGMENTS_BY_STAGE_ID[stageId] ?? []
}

// 開發期自我檢查：20 個既有戰鬥關卡剛好各對應一個 battle 段落，不重複、
// 不遺漏；4 個 transition 段落不算在內。只在 dev 模式跑，正式建置不受影響。
if (import.meta.env.DEV) {
  const battleStageIds = ALL_TRAVEL_SEGMENTS.filter(s => s.kind === 'battle').map(s => s.stageId!)
  const expected = Array.from({ length: 20 }, (_, i) => `forest_1_${i + 1}`)
  const missing = expected.filter(id => !battleStageIds.includes(id))
  const duplicates = battleStageIds.filter((id, i) => battleStageIds.indexOf(id) !== i)
  if (missing.length > 0 || duplicates.length > 0) {
    throw new Error(
      `[chapterTravelData] 關卡覆蓋率檢查失敗——missing=[${missing.join(',')}] duplicates=[${duplicates.join(',')}]`,
    )
  }
}
