import { linkChain, type ArenaTalentNode } from './types'

const heroId = 'dwarf'

function n(tier: number, partial: Omit<ArenaTalentNode, 'id' | 'heroId' | 'tier' | 'connections'>): ArenaTalentNode {
  return { id: `${heroId}_n${tier}`, heroId, tier, connections: [], ...partial }
}

export const dwarfTalentTree: ArenaTalentNode[] = linkChain([
  n(0, { kind: 'stat', name: '+力量', desc: '物理攻擊 +3', effect: { physicalAtk: 3 } }),
  n(1, { kind: 'stat', name: '+力量', desc: '物理攻擊 +3', effect: { physicalAtk: 3 } }),
  n(2, { kind: 'stat', name: '+體魄', desc: '最大 HP +20', effect: { maxHpBonus: 20 } }),
  n(3, { kind: 'major', name: '重擊蓄力', desc: '站穩後的下一擊必為「蓄力重擊」：傷害+40%，對雜兵/菁英造成0.3秒硬直（Boss降為0.1秒）', majorSkillId: 'dwarf_lv20' }),
  n(4, { kind: 'stat', name: '+體魄', desc: '最大 HP +20', effect: { maxHpBonus: 20 } }),
  n(5, { kind: 'stat', name: '+蓄力傷害', desc: '蓄力重擊加成 40%→50%', effect: {} }),
  n(6, { kind: 'stat', name: '+破甲層數', desc: '震地戰錘破甲上限 +1（共4層）', effect: {} }),
  n(7, { kind: 'major', name: '震地戰錘', desc: '攻擊附加破甲（每層+10%受傷）；蓄力重擊命中額外多疊1層', majorSkillId: 'dwarf_lv40' }),
  n(8, { kind: 'stat', name: '+體魄', desc: '最大 HP +25', effect: { maxHpBonus: 25 } }),
  n(9, { kind: 'stat', name: '+硬直時間', desc: '蓄力重擊硬直 +0.1秒', effect: {} }),
  n(10, { kind: 'stat', name: '+破甲層數', desc: '破甲上限再 +1（共5層）', effect: {} }),
  n(11, { kind: 'major', name: '地震波', desc: '蓄力重擊命中額外對周圍敵人造成50%傷害的範圍震盪並使其硬直0.3秒', majorSkillId: 'dwarf_lv60' }),
  n(12, { kind: 'stat', name: '+體魄', desc: '最大 HP +30', effect: { maxHpBonus: 30 } }),
  n(13, { kind: 'stat', name: '+震波範圍', desc: '地震波範圍 +25%', effect: {} }),
  n(14, { kind: 'stat', name: '+震波傷害', desc: '地震波傷害比例 +15%（共65%）', effect: {} }),
  n(15, { kind: 'major', name: '不可動搖', desc: '受到控制效果50%機率免疫；破甲每滿3層額外獲得「巨岩護甲」，減傷15%直到破甲重置', majorSkillId: 'dwarf_lv80' }),
  n(16, { kind: 'stat', name: '+體魄', desc: '最大 HP +35', effect: { maxHpBonus: 35 } }),
  n(17, { kind: 'stat', name: '+蓄力傷害', desc: '蓄力重擊加成再 +10%（共60%）', effect: {} }),
  n(18, { kind: 'stat', name: '+免疫機率', desc: '控制免疫機率 +10%（共60%）', effect: {} }),
  n(19, { kind: 'mastery', name: '山嶽崩塌', desc: 'Ultimate 進化：2倍範圍地震波，100%附加0.6秒硬直，大招後6秒內蓄力重擊冷卻歸零', majorSkillId: 'dwarf_lv100' }),
])
