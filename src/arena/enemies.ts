/**
 * 敵人型別表與波次生成的純函式，現在依「篇章」分組（2026-08：主線篇章
 * 入口拉回來，要求各篇章對應出現各自的敵人池）。
 *
 * 現實限制：即時制只有 goblin/skeleton/orc/slimeking/mimic/dark_knight/
 * golem/ice_witch/lightning_lancer/dragon 這幾種敵人做了逐幀圖
 * （/assets/frames/enemies/{id}/），舊回合制其餘十幾種敵人（sand_rat/
 * coral_crab/ash_soldier...）都還是整排 spritesheet，沒有對應素材。
 * 灰燼王國篇（main）本身三章的敵人+Boss 剛好都在這份清單裡，其餘三個
 * 篇章（王城餘燼/裂隙前兆/深海遺城）目前沒有專屬美術，只能用現有素材
 * 重新配一組風味相近的池子頂著，等有新美術再換成真正對應的敵人。
 */

import type { EnemyAiType } from './enemyAI'

export interface EnemyTypeDef {
  id: string // 對應 /assets/frames/enemies/{id}/idle_0.png
  name: string
  hpMult: number
  speedMult: number
  damageMult: number
  spriteHeight: number
  weight: number
  minMinute: number // 幾分鐘後才會加入池子，製造內容隨時間展開的節奏
  isBoss?: boolean
  aiType: EnemyAiType // 見 enemyAI.ts；決定 ArenaGame.ts 的攻擊狀態機分派
  /** 森林遺跡新敵人專用（2026-08）：id 本身還沒有專屬美術時，frameLoader
   * 改讀這個現有敵人 id 的圖頂著，等真的素材到位再拿掉這個欄位即可，遊戲
   * 邏輯（AI/數值）完全不受影響，只影響貼圖來源。 */
  placeholderSpriteId?: string
  /** 森林遺跡真圖專用（2026-08-12）：來源逐幀圖 20 幀共用同一個畫布尺寸，
   * 角色「落地錨點」不在畫布正中心（跟英雄圖每幀各自裁切、用 anchor(0.5,1)
   * 腳底對齊的做法不同），這裡直接記錄該畫布上錨點的 0~1 比例，
   * spawnEnemyOfType() 會用這個取代寫死的 anchor.set(0.5)。沒有這個欄位的
   * 敵人（含所有舊敵人）維持原本 0.5/0.5 置中錨點，行為不變。 */
  anchorRatio?: { x: number; y: number }
}

export type ArenaCampaignId =
  | 'main' | 'ash_kingdom' | 'rift_omen' | 'deep_sea'
  // 舊回合制副本轉即時制（2026-08）：先用現有敵人池頂著風味，沒有專屬美術，
  // 副本原本的骰子專屬機制（禁忌骰面/魔焰計量/氧氣潮汐/聖約進度）不會
  // 移植，副本目前等同「換一種怪物風味 + Boss 的 arena_run」。
  | 'star_eclipse' | 'burning_throne' | 'black_tide' | 'ash_covenant'

const GOBLIN: EnemyTypeDef        = { id: 'goblin', name: '哥布林', hpMult: 1.0, speedMult: 1.0, damageMult: 1.0, spriteHeight: 64, weight: 30, minMinute: 0, aiType: 'chase' }
const SKELETON: EnemyTypeDef      = { id: 'skeleton', name: '骸骨兵士', hpMult: 0.7, speedMult: 1.35, damageMult: 0.8, spriteHeight: 66, weight: 24, minMinute: 0, aiType: 'chase' }
const ORC: EnemyTypeDef           = { id: 'orc', name: '荊棘野豬', hpMult: 1.8, speedMult: 0.72, damageMult: 1.3, spriteHeight: 70, weight: 16, minMinute: 0.5, aiType: 'charge' }
const SLIMEKING: EnemyTypeDef     = { id: 'slimeking', name: '史萊姆王', hpMult: 1.4, speedMult: 0.85, damageMult: 1.0, spriteHeight: 60, weight: 16, minMinute: 1, aiType: 'aoe' }
const MIMIC: EnemyTypeDef         = { id: 'mimic', name: '寶箱怪', hpMult: 1.2, speedMult: 1.1, damageMult: 1.1, spriteHeight: 62, weight: 14, minMinute: 1.5, aiType: 'chase' }
const DARK_KNIGHT: EnemyTypeDef   = { id: 'dark_knight', name: '黑暗騎士', hpMult: 2.6, speedMult: 0.9, damageMult: 1.6, spriteHeight: 74, weight: 8, minMinute: 2.5, aiType: 'heavy' }
const LIGHTNING_LANCER: EnemyTypeDef = { id: 'lightning_lancer', name: '冰甲騎士', hpMult: 2.0, speedMult: 0.95, damageMult: 1.4, spriteHeight: 72, weight: 10, minMinute: 1.5, aiType: 'ranged' }

const DRAGON: EnemyTypeDef    = { id: 'dragon', name: '巨龍', hpMult: 26, speedMult: 0.55, damageMult: 2.6, spriteHeight: 130, weight: 0, minMinute: 0, isBoss: true, aiType: 'heavy' }
const GOLEM: EnemyTypeDef     = { id: 'golem', name: '石巨人', hpMult: 30, speedMult: 0.5, damageMult: 2.2, spriteHeight: 120, weight: 0, minMinute: 0, isBoss: true, aiType: 'heavy' }
const ICE_WITCH: EnemyTypeDef = { id: 'ice_witch', name: '冰霜女巫', hpMult: 22, speedMult: 0.7, damageMult: 2.4, spriteHeight: 100, weight: 0, minMinute: 0, isBoss: true, aiType: 'summoner' }

// ══════════════════════════════════════════════════════════════════════════
// 森林遺跡固定式主線關卡（2026-08，見 src/campaign/）專用敵人。跟上面
// CAMPAIGN_ENEMY_POOLS 那套「加權隨機池」完全無關——這 12 種小怪 + 4 個
// Boss 只會被 src/campaign/chapters/forestRuins.ts 的固定 EnemyWave 資料
// 點名生成，weight/minMinute 對它們沒有意義（維持 0 純佔位，不影響任何
// 現有的 Roguelite Run 池子）。2026-08-12：全部 12 隻已換上真圖（見
// scripts/import-forest-monster-frames.mjs），anchorRatio 是那支腳本算出來
// 的落地錨點比例。forest_totem/root_core 這兩個非戰鬥召喚物不在原始 12 隻
// 名單內，維持 placeholderSpriteId 頂著。
// ══════════════════════════════════════════════════════════════════════════
const GOBLIN_WARRIOR: EnemyTypeDef = { id: 'goblin_warrior', name: '哥布林戰士', hpMult: 1.0, speedMult: 1.0, damageMult: 1.0, spriteHeight: 114, weight: 0, minMinute: 0, aiType: 'chase', anchorRatio: { x: 0.517, y: 0.702 } }
const SKELETON_SCOUT: EnemyTypeDef = { id: 'skeleton_scout', name: '骷髏斥候', hpMult: 0.6, speedMult: 1.5, damageMult: 0.7, spriteHeight: 106, weight: 0, minMinute: 0, aiType: 'skirmisher', anchorRatio: { x: 0.469, y: 0.707 } }
const ORC_WARRIOR: EnemyTypeDef    = { id: 'orc_warrior', name: '獸人戰士', hpMult: 2.0, speedMult: 0.75, damageMult: 1.3, spriteHeight: 127, weight: 0, minMinute: 0, aiType: 'heavy', anchorRatio: { x: 0.5, y: 0.756 } }
const GOBLIN_ARCHER: EnemyTypeDef  = { id: 'goblin_archer', name: '哥布林弓手', hpMult: 0.7, speedMult: 1.0, damageMult: 0.9, spriteHeight: 109, weight: 0, minMinute: 0, aiType: 'ranged', anchorRatio: { x: 0.423, y: 0.698 } }
const FOREST_SHAMAN: EnemyTypeDef  = { id: 'forest_shaman', name: '森林薩滿', hpMult: 0.8, speedMult: 0.9, damageMult: 0.5, spriteHeight: 106, weight: 0, minMinute: 0, aiType: 'support', anchorRatio: { x: 0.409, y: 0.791 } }
const TOXIC_MUSHROOM: EnemyTypeDef = { id: 'toxic_mushroom', name: '毒菇怪', hpMult: 1.2, speedMult: 0.7, damageMult: 0.8, spriteHeight: 98, weight: 0, minMinute: 0, aiType: 'aoe', anchorRatio: { x: 0.45, y: 0.77 } }
const FOREST_TREANT: EnemyTypeDef  = { id: 'forest_treant', name: '森林樹精', hpMult: 2.5, speedMult: 0.5, damageMult: 1.1, spriteHeight: 135, weight: 0, minMinute: 0, aiType: 'heavy', anchorRatio: { x: 0.525, y: 0.778 } }
const THORN_WOLF: EnemyTypeDef     = { id: 'thorn_wolf', name: '荊棘狼', hpMult: 1.1, speedMult: 1.3, damageMult: 1.2, spriteHeight: 109, weight: 0, minMinute: 0, aiType: 'charge', anchorRatio: { x: 0.526, y: 0.694 } }
// 1-4 哥布林營地的破壞目標：完全靜止、無攻擊（updateTotemAI 是 no-op），純粹讓玩家找到並打掉。不在 12 隻真圖名單內，維持佔位圖。
const FOREST_TOTEM: EnemyTypeDef   = { id: 'forest_totem', name: '哥布林圖騰', hpMult: 0.9, speedMult: 0, damageMult: 0, spriteHeight: 96, weight: 0, minMinute: 0, aiType: 'totem', placeholderSpriteId: 'golem' }

// Boss 血量（2026-08-12 V2 重新調校）：舊數值是沿用 Roguelite 那套「靠持續
// 刷怪撐時間」的量級，實測森林巨龍在一般輸出下 46 秒就會被打死，離文件要
// 的 4~6 分鐘差非常多。這裡依「有效 DPS ~15/秒（含 Telegraph/Recovery 空
// 檔）」反推目標血量，是第一版估算，之後要依實際多職業測試再微調。
const ORC_CHIEFTAIN: EnemyTypeDef          = { id: 'orc_chieftain', name: '狂暴獸人隊長', hpMult: 60, speedMult: 0.6, damageMult: 1.8, spriteHeight: 168, weight: 0, minMinute: 0, isBoss: true, aiType: 'heavy', anchorRatio: { x: 0.463, y: 0.784 } }
const ANCIENT_TREANT_GUARDIAN: EnemyTypeDef = { id: 'ancient_treant_guardian', name: '古樹守衛', hpMult: 75, speedMult: 0.45, damageMult: 1.6, spriteHeight: 188, weight: 0, minMinute: 0, isBoss: true, aiType: 'heavy', anchorRatio: { x: 0.464, y: 0.804 } }
// aiType 用 'heavy' 而非字面上更貼近「快速劍士」的 chase——目前只有
// updateHeavyAI()/updateSummonerAI() 這兩個移動狀態機有呼叫 tryCastBossSkill()，
// updateChaseAI() 沒有；Boss 一定要能放技能，所以基底移動邏輯選 heavy。
const DARK_KNIGHT_VANGUARD: EnemyTypeDef    = { id: 'dark_knight_vanguard', name: '黑騎士先鋒', hpMult: 85, speedMult: 0.85, damageMult: 2.0, spriteHeight: 148, weight: 0, minMinute: 0, isBoss: true, aiType: 'heavy', anchorRatio: { x: 0.546, y: 0.805 } }
const FOREST_DRAGON: EnemyTypeDef           = { id: 'forest_dragon', name: '森林巨龍', hpMult: 145, speedMult: 0.55, damageMult: 2.4, spriteHeight: 210, weight: 0, minMinute: 0, isBoss: true, aiType: 'heavy', anchorRatio: { x: 0.478, y: 0.518 } }
// 古樹守衛 Life Core 召喚物：完全靜止、無攻擊，靠 summonedBy 連動讓 Boss
// 減傷（見 ArenaGame.ts damageEnemy()），血量夠厚但不到「打不動」，呼應
// 1-10 三星「每次 Core 出現後 10 秒內全滅」的節奏。
const ROOT_CORE: EnemyTypeDef = { id: 'root_core', name: '古樹根核', hpMult: 3.5, speedMult: 0, damageMult: 0, spriteHeight: 48, weight: 0, minMinute: 0, aiType: 'totem', placeholderSpriteId: 'golem' }

/** 森林遺跡專用敵人 id → 資料查表，供 ArenaGame.ts 的 initCampaignStage() 生成固定波次時使用。 */
export const FOREST_CAMPAIGN_ENEMIES: Record<string, EnemyTypeDef> = {
  goblin_warrior: GOBLIN_WARRIOR,
  skeleton_scout: SKELETON_SCOUT,
  orc_warrior: ORC_WARRIOR,
  goblin_archer: GOBLIN_ARCHER,
  forest_shaman: FOREST_SHAMAN,
  toxic_mushroom: TOXIC_MUSHROOM,
  forest_treant: FOREST_TREANT,
  thorn_wolf: THORN_WOLF,
  forest_totem: FOREST_TOTEM,
  orc_chieftain: ORC_CHIEFTAIN,
  ancient_treant_guardian: ANCIENT_TREANT_GUARDIAN,
  dark_knight_vanguard: DARK_KNIGHT_VANGUARD,
  forest_dragon: FOREST_DRAGON,
}

// ── 灰燼王國篇 第一章（main）：跟舊回合制三章敵人池一一對應，美術剛好齊全 ──
const MAIN_POOL: EnemyTypeDef[] = [GOBLIN, SKELETON, ORC, SLIMEKING, LIGHTNING_LANCER, DARK_KNIGHT]

// ── 灰燼王國篇 第二章：王城餘燼——沒有專屬美術，偏重裝敵人頂著廢墟王城的味道 ──
const ASH_KINGDOM_POOL: EnemyTypeDef[] = [
  { ...GOBLIN, weight: 18 }, { ...SKELETON, weight: 22 }, { ...ORC, weight: 22, minMinute: 0.3 },
  { ...DARK_KNIGHT, weight: 16, minMinute: 1.2 },
]

// ── 裂隙前兆篇：沒有專屬美術，偏重冰甲/冰霜這種帶點異界感的敵人頂著 ──
const RIFT_OMEN_POOL: EnemyTypeDef[] = [
  { ...SKELETON, weight: 20 }, { ...SLIMEKING, weight: 18 },
  { ...LIGHTNING_LANCER, weight: 22, minMinute: 0.5 }, { ...ORC, weight: 10, minMinute: 1.5 },
]

// ── 深海遺城篇：沒有專屬美術，偏重史萊姆/骷髏這種軟體/浸水感的敵人頂著 ──
const DEEP_SEA_POOL: EnemyTypeDef[] = [
  { ...SKELETON, weight: 26 }, { ...SLIMEKING, weight: 26 }, { ...GOBLIN, weight: 16 },
  { ...MIMIC, weight: 10, minMinute: 1.5 },
]

// ── 舊副本轉即時制：一樣沒有專屬美術，用既有敵人重新配權重頂著各自風味 ──
// 星蝕裂隙（原：禁忌骰面/不穩定骰）→ 偏重冰甲/黑暗騎士，異界威壓感
const STAR_ECLIPSE_POOL: EnemyTypeDef[] = [
  { ...LIGHTNING_LANCER, weight: 26 }, { ...DARK_KNIGHT, weight: 18, minMinute: 0.5 },
  { ...SKELETON, weight: 20 },
]
// 燃燒王座（原：魔焰計量條）→ 偏重野豬/黑暗騎士，重裝衝撞感
const BURNING_THRONE_POOL: EnemyTypeDef[] = [
  { ...ORC, weight: 28 }, { ...DARK_KNIGHT, weight: 20, minMinute: 0.8 },
  { ...GOBLIN, weight: 14 },
]
// 黑潮深淵（原：氧氣+潮汐）→ 偏重史萊姆/寶箱怪，軟體/深海感
const BLACK_TIDE_POOL: EnemyTypeDef[] = [
  { ...SLIMEKING, weight: 28 }, { ...MIMIC, weight: 18, minMinute: 0.5 },
  { ...SKELETON, weight: 16 },
]
// 灰燼聖約（原：聖約進度）→ 偏重骷髏/黑暗騎士，殘灰亡靈感
const ASH_COVENANT_POOL: EnemyTypeDef[] = [
  { ...SKELETON, weight: 26 }, { ...DARK_KNIGHT, weight: 20, minMinute: 0.5 },
  { ...ORC, weight: 12, minMinute: 1 },
]

export const CAMPAIGN_ENEMY_POOLS: Record<ArenaCampaignId, EnemyTypeDef[]> = {
  main: MAIN_POOL,
  ash_kingdom: ASH_KINGDOM_POOL,
  rift_omen: RIFT_OMEN_POOL,
  deep_sea: DEEP_SEA_POOL,
  star_eclipse: STAR_ECLIPSE_POOL,
  burning_throne: BURNING_THRONE_POOL,
  black_tide: BLACK_TIDE_POOL,
  ash_covenant: ASH_COVENANT_POOL,
}

export const CAMPAIGN_BOSS: Record<ArenaCampaignId, EnemyTypeDef> = {
  main: DRAGON,
  ash_kingdom: GOLEM,
  rift_omen: ICE_WITCH,
  deep_sea: DRAGON, // 沒有第4種Boss美術，先跟main共用，等新美術再換
  star_eclipse: ICE_WITCH,
  burning_throne: GOLEM,
  black_tide: DRAGON,
  ash_covenant: GOLEM,
}

export function getCampaignEnemyPool(campaign?: string): EnemyTypeDef[] {
  return CAMPAIGN_ENEMY_POOLS[campaign as ArenaCampaignId] ?? MAIN_POOL
}

export function getCampaignBoss(campaign?: string): EnemyTypeDef {
  return CAMPAIGN_BOSS[campaign as ArenaCampaignId] ?? DRAGON
}

export const BOSS_SPAWN_SEC = 180 // 3 分鐘（目前 arena_run 用分區系統控制 Boss 時機，這個常數保留給舊 debug 參考用）

/** 依照目前經過秒數，從指定篇章已解鎖的敵人型別中依權重抽一種。 */
export function pickEnemyType(elapsedSec: number, campaign?: string): EnemyTypeDef {
  const pool = getCampaignEnemyPool(campaign)
  const minute = elapsedSec / 60
  const usablePool = pool.filter(t => t.minMinute <= minute)
  const usable = usablePool.length > 0 ? usablePool : pool.filter(t => t.minMinute === 0)
  const total = usable.reduce((sum, t) => sum + t.weight, 0)
  let r = Math.random() * total
  for (const t of usable) {
    r -= t.weight
    if (r <= 0) return t
  }
  return usable[usable.length - 1]
}

/** 生怪間隔：開局 2.2 秒一隻，4 分鐘內線性收斂到 0.5 秒一隻。 */
export function spawnIntervalSec(elapsedSec: number): number {
  const t = Math.min(elapsedSec, 240) / 240
  return 2.2 - t * 1.7
}

/** 同屏上限：開局 6 隻，5 分鐘內線性長到 30 隻。 */
export function maxConcurrentEnemies(elapsedSec: number): number {
  const t = Math.min(elapsedSec, 300) / 300
  return Math.round(6 + t * 24)
}
