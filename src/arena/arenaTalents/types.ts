/**
 * 天賦系統 v2（2026-08 全面重做）共用型別。取代舊版「19個共用數值模板節點 +
 * 1個Lv40職業Keystone」——改成每個英雄手寫 20 格，Lv20/40/60/80/100 五格是
 * 大型職業節點（major/mastery），其餘 15 格是數值小天賦（stat）。行為邏輯本身
 * 不放在這裡，major/mastery 節點只存一個 `majorSkillId` 字串，實際行為寫在
 * `src/arena/skills/{heroId}.ts`（見那邊的檔頭說明）。
 */

export type ArenaTalentNodeKind = 'stat' | 'major' | 'mastery'

export interface ArenaTalentNodeEffect {
  physicalAtk?: number
  magicAtk?: number
  maxHpBonus?: number
  moveSpeedBonus?: number    // 加成比例，0.04 = +4%
  pickupRangeBonus?: number  // 加成比例
  atkCooldownMult?: number   // 乘在冷卻時間上，越小越快，可疊乘
  damageReductionPct?: number  // 永久減傷比例（加總），聖騎士/矮人系小天賦用
  startShieldCharges?: number  // 戰鬥開局起始護盾格數（加總），沿用遺物 shieldCharges 同一套機制
  lifestealPct?: number        // 永久吸血比例（加總）
}

export interface ArenaTalentNode {
  id: string
  heroId: string
  kind: ArenaTalentNodeKind
  tier: number              // 0-based index，requiredLevel = (tier+1)*5
  name: string
  desc: string
  effect?: ArenaTalentNodeEffect  // 'stat' 節點用
  majorSkillId?: string           // 'major'/'mastery' 節點用，對應 arena/skills/{heroId}.ts 裡的常數
  connections: string[]           // 線性鏈，只指向下一格
}

export const NODES_PER_TREE = 20
export const MAJOR_TIERS = [3, 7, 11, 15] as const // Lv20/40/60/80
export const MASTERY_TIER = 19 as const            // Lv100

export function requiredLevelForTier(tier: number): number {
  return (tier + 1) * 5
}

export function pointCostForKind(kind: ArenaTalentNodeKind): number {
  if (kind === 'major') return 3
  if (kind === 'mastery') return 5
  return 1
}

export interface ArenaTalentBonus {
  flatDamage: number
  hpBonus: number
  moveSpeedMult: number
  pickupRangeMult: number
  atkCooldownMult: number
  damageReductionPct: number
  startShieldCharges: number
  lifestealPct: number
  unlockedMajorSkillIds: string[]  // 取代舊版單一 keystoneUnlocked 布林值——5個大型技能各自獨立解鎖
}

/** 建立線性鏈：每個節點的 connections 指向下一個節點。20 格共用。 */
export function linkChain(nodes: ArenaTalentNode[]): ArenaTalentNode[] {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connections = [nodes[i + 1].id]
  return nodes
}
