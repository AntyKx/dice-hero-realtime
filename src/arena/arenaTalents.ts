/**
 * 天賦系統 v2（2026-08 全面重做）入口。取代舊版「19個共用數值模板節點 + 1個
 * Lv40職業Keystone」的生成器寫法——現在每個英雄的 20 格是手寫資料，放在
 * `arenaTalents/{heroId}.ts`，這裡只做彙總查表 + 共用的加總/門檻邏輯。
 *
 * 職業技能本身的實際行為寫在 `arena/skills/{heroId}.ts`，這裡（跟舊版一樣）
 * 只決定「這個節點存不存在、要花幾點、等級門檻多少」，不含行為邏輯。
 */

import type { ArenaTalentNode } from './arenaTalents/types'
import { requiredLevelForTier, pointCostForKind } from './arenaTalents/types'
import { knightTalentTree } from './arenaTalents/knight'
import { mageTalentTree } from './arenaTalents/mage'
import { priestTalentTree } from './arenaTalents/priest'
import { rogueTalentTree } from './arenaTalents/rogue'
import { princessTalentTree } from './arenaTalents/princess'
import { archerTalentTree } from './arenaTalents/archer'
import { dwarfTalentTree } from './arenaTalents/dwarf'
import { bardTalentTree } from './arenaTalents/bard'
import { engineerTalentTree } from './arenaTalents/engineer'
import { fighterTalentTree } from './arenaTalents/fighter'
import { deathKnightTalentTree } from './arenaTalents/deathKnight'

export type { ArenaTalentNode, ArenaTalentNodeKind, ArenaTalentNodeEffect, ArenaTalentBonus } from './arenaTalents/types'
export { pointCostForKind, requiredLevelForTier } from './arenaTalents/types'

const TREES: Record<string, ArenaTalentNode[]> = {
  knight: knightTalentTree,
  mage: mageTalentTree,
  priest: priestTalentTree,
  rogue: rogueTalentTree,
  princess: princessTalentTree,
  archer: archerTalentTree,
  dwarf: dwarfTalentTree,
  bard: bardTalentTree,
  engineer: engineerTalentTree,
  fighter: fighterTalentTree,
  death_knight: deathKnightTalentTree,
}

/** 固定、非隨機——同一個英雄每次呼叫結果都一樣，不是每局重抽。 */
export function generateHeroTalentTree(heroId: string): ArenaTalentNode[] {
  return TREES[heroId] ?? []
}

import type { ArenaTalentBonus } from './arenaTalents/types'

/** 取代 App.tsx 原本呼叫的地方。 */
export function computeArenaTalentBonus(heroId: string, allocatedIds: string[]): ArenaTalentBonus {
  const tree = generateHeroTalentTree(heroId)
  const allocated = new Set(allocatedIds)
  const bonus: ArenaTalentBonus = {
    flatDamage: 0, hpBonus: 0, moveSpeedMult: 1, pickupRangeMult: 1, atkCooldownMult: 1,
    damageReductionPct: 0, startShieldCharges: 0, lifestealPct: 0, unlockedMajorSkillIds: [],
  }
  for (const node of tree) {
    if (!allocated.has(node.id)) continue
    if (node.kind === 'major' || node.kind === 'mastery') {
      if (node.majorSkillId) bonus.unlockedMajorSkillIds.push(node.majorSkillId)
      continue
    }
    const e = node.effect
    if (!e) continue
    if (e.physicalAtk) bonus.flatDamage += e.physicalAtk
    if (e.magicAtk) bonus.flatDamage += e.magicAtk
    if (e.maxHpBonus) bonus.hpBonus += e.maxHpBonus
    if (e.moveSpeedBonus) bonus.moveSpeedMult *= 1 + e.moveSpeedBonus
    if (e.pickupRangeBonus) bonus.pickupRangeMult *= 1 + e.pickupRangeBonus
    if (e.atkCooldownMult) bonus.atkCooldownMult *= e.atkCooldownMult
    if (e.damageReductionPct) bonus.damageReductionPct += e.damageReductionPct
    if (e.startShieldCharges) bonus.startShieldCharges += e.startShieldCharges
    if (e.lifestealPct) bonus.lifestealPct += e.lifestealPct
  }
  return bonus
}

/**
 * 節點是否可以被點亮：前一個節點（tier-1）已點亮，且等級門檻夠——現在「每個
 * 節點都檢查等級」，不再只有大型技能才擋等級（舊版只有 keystone 有 requiredLevel）。
 */
export function isTalentNodeAvailable(tree: ArenaTalentNode[], node: ArenaTalentNode, allocatedIds: string[], heroLevel: number): boolean {
  if (heroLevel < requiredLevelForTier(node.tier)) return false
  if (node.tier === 0) return true
  const prev = tree.find(n => n.tier === node.tier - 1)
  return prev ? allocatedIds.includes(prev.id) : true
}
