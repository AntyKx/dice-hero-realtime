/**
 * 天賦樹重做（取代 src/talents.ts 的 HERO_TALENT_TREES）：不再是「5個固定
 * 等級關卡、每關免費選一個」，改成一條線性的節點鏈——大量小數值節點
 * （全英雄共用同一組模板，依 hero.school 決定塞物理還魔法攻擊版本）+
 * 沿路一個由等級控制、要花點數解鎖的職業專屬技能節點。跟 cards.ts/
 * relics.ts/dungeonZones.ts 同一個決策：不沿用舊 `TalentEffect`/
 * `HeroTalentTree`（那些欄位是回合制專用，語意套不進即時戰鬥）。
 *
 * 職業技能本身的實際行為寫在 ArenaGame.ts 的 updateKeystone()，這裡只
 * 決定「這個節點存不存在、要花幾點、等級門檻多少」，不含行為邏輯。
 */

import { HEROES } from '../data'

export type ArenaTalentNodeKind = 'stat' | 'keystone'

export interface ArenaTalentNodeEffect {
  physicalAtk?: number
  magicAtk?: number
  maxHpBonus?: number
  moveSpeedBonus?: number   // 加成比例，0.04 = +4%
  pickupRangeBonus?: number // 加成比例
  atkCooldownMult?: number  // 乘在冷卻時間上，越小越快，可疊乘
}

export interface ArenaTalentNode {
  id: string
  heroId: string
  kind: ArenaTalentNodeKind
  tier: number
  name: string
  desc: string
  requiredLevel?: number      // 只有 keystone 節點有
  effect?: ArenaTalentNodeEffect
  connections: string[]       // 線性鏈，正常只有 0 或 1 個
}

const NODES_PER_TREE = 20
const KEYSTONE_TIER = 11        // 第 12 個節點（0-based index 11）
const KEYSTONE_REQUIRED_LEVEL = 40

// 共用小節點模板：index 對應 tier % 模板數，決定這一格是什麼類型。
// atk 類會依 hero.school 換成 physicalAtk 或 magicAtk。
type StatTemplateId = 'atk' | 'hp' | 'speed' | 'pickup' | 'haste'
const NODE_PATTERN: StatTemplateId[] = [
  'atk', 'hp', 'speed', 'atk', 'pickup', 'hp', 'atk', 'haste', 'atk', 'hp',
  'speed', /* KEYSTONE 卡在這個位置 */ 'atk', 'atk', 'hp', 'pickup', 'atk',
  'haste', 'hp', 'atk', 'speed',
]

function buildStatNode(heroId: string, tier: number, school: 'physical' | 'magic'): ArenaTalentNode {
  const kind = NODE_PATTERN[tier]
  const id = `${heroId}_n${tier}`
  switch (kind) {
    case 'atk': {
      const label = school === 'magic' ? '魔力' : '力量'
      const field = school === 'magic' ? 'magicAtk' : 'physicalAtk'
      return {
        id, heroId, kind: 'stat', tier, name: `+${label}`,
        desc: `${label === '魔力' ? '魔法' : '物理'}攻擊 +3`,
        effect: { [field]: 3 }, connections: [],
      }
    }
    case 'hp':
      return { id, heroId, kind: 'stat', tier, name: '+體魄', desc: '最大 HP +15', effect: { maxHpBonus: 15 }, connections: [] }
    case 'speed':
      return { id, heroId, kind: 'stat', tier, name: '+敏捷', desc: '移動速度 +4%', effect: { moveSpeedBonus: 0.04 }, connections: [] }
    case 'pickup':
      return { id, heroId, kind: 'stat', tier, name: '+感知', desc: '拾取範圍 +8%', effect: { pickupRangeBonus: 0.08 }, connections: [] }
    case 'haste':
      return { id, heroId, kind: 'stat', tier, name: '+熟練', desc: '攻擊速度 +3%', effect: { atkCooldownMult: 0.97 }, connections: [] }
  }
}

// 11 個英雄的職業技能節點資料（行為在 ArenaGame.ts 的 updateKeystone() 依 heroId 分派）。
const KEYSTONE_INFO: Record<string, { name: string; desc: string }> = {
  knight:      { name: '聖盾破軍斬', desc: '每 20 秒嘲諷附近敵人，自身 3 秒內減傷 50%' },
  mage:        { name: '烈焰隕星',   desc: '每 8 秒對最近敵人造成一次範圍爆擊傷害' },
  priest:      { name: '光輪祝禱',   desc: '每 10 秒自動回復 10% 最大 HP' },
  rogue:       { name: '暗影連襲',   desc: '攻擊有 20% 機率觸發追加 2 次攻擊' },
  princess:    { name: '皇家冰晶陣', desc: '攻擊疊加冰痕，5 層時凍結目標 2 秒' },
  archer:      { name: '疾風箭雨',   desc: '每 12 秒箭雨攻擊範圍內所有敵人' },
  dwarf:       { name: '震地戰錘',   desc: '攻擊附加破甲（最多疊 3 層，每層 +10% 受到傷害）' },
  bard:        { name: '戰歌奏鳴',   desc: '攻擊時有機率回復少量 HP' },
  beastmaster: { name: '狼魂突擊',   desc: '受到攻擊時有 30% 機率反擊造成傷害' },
  engineer:    { name: '蒸氣砲擊',   desc: '攻擊有 25% 機率額外發射一枚固定傷害砲彈' },
  fighter:     { name: '真氣運轉',   desc: '擊殺疊氣勢，滿 5 層時下次攻擊造成 200% 傷害' },
}

function buildKeystoneNode(heroId: string): ArenaTalentNode {
  const info = KEYSTONE_INFO[heroId] ?? { name: '職業技能', desc: '（尚未設計）' }
  return {
    id: `${heroId}_keystone`, heroId, kind: 'keystone', tier: KEYSTONE_TIER,
    name: info.name, desc: info.desc, requiredLevel: KEYSTONE_REQUIRED_LEVEL,
    connections: [],
  }
}

/** 固定、非隨機——同一個英雄每次呼叫結果都一樣，不是每局重抽。 */
export function generateHeroTalentTree(heroId: string): ArenaTalentNode[] {
  const hero = HEROES.find(h => h.id === heroId)
  const school = hero?.school ?? 'physical'
  const nodes: ArenaTalentNode[] = []
  for (let tier = 0; tier < NODES_PER_TREE; tier++) {
    nodes.push(tier === KEYSTONE_TIER ? buildKeystoneNode(heroId) : buildStatNode(heroId, tier, school))
  }
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connections = [nodes[i + 1].id]
  return nodes
}

export interface ArenaTalentBonus {
  flatDamage: number
  hpBonus: number
  moveSpeedMult: number
  pickupRangeMult: number
  atkCooldownMult: number
  keystoneUnlocked: boolean
}

/** 取代 App.tsx 原本呼叫舊 computeTalentBonus() 的地方。 */
export function computeArenaTalentBonus(heroId: string, allocatedIds: string[]): ArenaTalentBonus {
  const tree = generateHeroTalentTree(heroId)
  const allocated = new Set(allocatedIds)
  const bonus: ArenaTalentBonus = {
    flatDamage: 0, hpBonus: 0, moveSpeedMult: 1, pickupRangeMult: 1, atkCooldownMult: 1,
    keystoneUnlocked: false,
  }
  for (const node of tree) {
    if (!allocated.has(node.id)) continue
    if (node.kind === 'keystone') { bonus.keystoneUnlocked = true; continue }
    const e = node.effect
    if (!e) continue
    if (e.physicalAtk) bonus.flatDamage += e.physicalAtk
    if (e.magicAtk) bonus.flatDamage += e.magicAtk
    if (e.maxHpBonus) bonus.hpBonus += e.maxHpBonus
    if (e.moveSpeedBonus) bonus.moveSpeedMult *= 1 + e.moveSpeedBonus
    if (e.pickupRangeBonus) bonus.pickupRangeMult *= 1 + e.pickupRangeBonus
    if (e.atkCooldownMult) bonus.atkCooldownMult *= e.atkCooldownMult
  }
  return bonus
}

/** 節點是否可以被點亮：前一個節點（tier-1）已點亮，且（若是keystone）等級門檻夠。 */
export function isTalentNodeAvailable(tree: ArenaTalentNode[], node: ArenaTalentNode, allocatedIds: string[], heroLevel: number): boolean {
  if (node.requiredLevel && heroLevel < node.requiredLevel) return false
  if (node.tier === 0) return true
  const prev = tree.find(n => n.tier === node.tier - 1)
  return prev ? allocatedIds.includes(prev.id) : true
}
