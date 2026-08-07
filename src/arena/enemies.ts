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
}

export type ArenaCampaignId = 'main' | 'ash_kingdom' | 'rift_omen' | 'deep_sea'

const GOBLIN: EnemyTypeDef        = { id: 'goblin', name: '哥布林', hpMult: 1.0, speedMult: 1.0, damageMult: 1.0, spriteHeight: 64, weight: 30, minMinute: 0 }
const SKELETON: EnemyTypeDef      = { id: 'skeleton', name: '骸骨兵士', hpMult: 0.7, speedMult: 1.35, damageMult: 0.8, spriteHeight: 66, weight: 24, minMinute: 0 }
const ORC: EnemyTypeDef           = { id: 'orc', name: '荊棘野豬', hpMult: 1.8, speedMult: 0.72, damageMult: 1.3, spriteHeight: 70, weight: 16, minMinute: 0.5 }
const SLIMEKING: EnemyTypeDef     = { id: 'slimeking', name: '史萊姆王', hpMult: 1.4, speedMult: 0.85, damageMult: 1.0, spriteHeight: 60, weight: 16, minMinute: 1 }
const MIMIC: EnemyTypeDef         = { id: 'mimic', name: '寶箱怪', hpMult: 1.2, speedMult: 1.1, damageMult: 1.1, spriteHeight: 62, weight: 14, minMinute: 1.5 }
const DARK_KNIGHT: EnemyTypeDef   = { id: 'dark_knight', name: '黑暗騎士', hpMult: 2.6, speedMult: 0.9, damageMult: 1.6, spriteHeight: 74, weight: 8, minMinute: 2.5 }
const LIGHTNING_LANCER: EnemyTypeDef = { id: 'lightning_lancer', name: '冰甲騎士', hpMult: 2.0, speedMult: 0.95, damageMult: 1.4, spriteHeight: 72, weight: 10, minMinute: 1.5 }

const DRAGON: EnemyTypeDef    = { id: 'dragon', name: '巨龍', hpMult: 26, speedMult: 0.55, damageMult: 2.6, spriteHeight: 130, weight: 0, minMinute: 0, isBoss: true }
const GOLEM: EnemyTypeDef     = { id: 'golem', name: '石巨人', hpMult: 30, speedMult: 0.5, damageMult: 2.2, spriteHeight: 120, weight: 0, minMinute: 0, isBoss: true }
const ICE_WITCH: EnemyTypeDef = { id: 'ice_witch', name: '冰霜女巫', hpMult: 22, speedMult: 0.7, damageMult: 2.4, spriteHeight: 100, weight: 0, minMinute: 0, isBoss: true }

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

export const CAMPAIGN_ENEMY_POOLS: Record<ArenaCampaignId, EnemyTypeDef[]> = {
  main: MAIN_POOL,
  ash_kingdom: ASH_KINGDOM_POOL,
  rift_omen: RIFT_OMEN_POOL,
  deep_sea: DEEP_SEA_POOL,
}

export const CAMPAIGN_BOSS: Record<ArenaCampaignId, EnemyTypeDef> = {
  main: DRAGON,
  ash_kingdom: GOLEM,
  rift_omen: ICE_WITCH,
  deep_sea: DRAGON, // 沒有第4種Boss美術，先跟main共用，等新美術再換
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
