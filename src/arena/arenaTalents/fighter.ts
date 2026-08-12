import { linkChain, type ArenaTalentNode } from './types'

const heroId = 'fighter'

function n(tier: number, partial: Omit<ArenaTalentNode, 'id' | 'heroId' | 'tier' | 'connections'>): ArenaTalentNode {
  return { id: `${heroId}_n${tier}`, heroId, tier, connections: [], ...partial }
}

export const fighterTalentTree: ArenaTalentNode[] = linkChain([
  n(0, { kind: 'stat', name: '+力量', desc: '物理攻擊 +3', effect: { physicalAtk: 3 } }),
  n(1, { kind: 'stat', name: '+力量', desc: '物理攻擊 +3', effect: { physicalAtk: 3 } }),
  n(2, { kind: 'stat', name: '+體魄', desc: '最大 HP +15', effect: { maxHpBonus: 15 } }),
  n(3, { kind: 'major', name: '連擊之心', desc: '連續命中同一目標≥3次（換目標/落空即重置），第3擊起額外造成40%連擊追打傷害', majorSkillId: 'fighter_lv20' }),
  n(4, { kind: 'stat', name: '+力量', desc: '物理攻擊 +4', effect: { physicalAtk: 4 } }),
  n(5, { kind: 'stat', name: '+連擊傷害', desc: '連擊追打比例 40%→50%', effect: {} }),
  n(6, { kind: 'stat', name: '+連擊門檻', desc: '連擊觸發門檻 3→2 次', effect: {} }),
  n(7, { kind: 'major', name: '真氣運轉', desc: '擊殺疊氣勢，滿5層下次攻擊200%傷害；對 Boss 連段第3擊以上也疊1層氣勢', majorSkillId: 'fighter_lv40' }),
  n(8, { kind: 'stat', name: '+力量', desc: '物理攻擊 +4', effect: { physicalAtk: 4 } }),
  n(9, { kind: 'stat', name: '+連擊傷害', desc: '連擊追打比例再 +10%（共60%）', effect: {} }),
  n(10, { kind: 'stat', name: '+氣勢獲取', desc: '對雜兵擊殺額外+0.5層氣勢', effect: {} }),
  n(11, { kind: 'major', name: '崩拳連段', desc: '連續命中≥5次時額外附加擊退+0.2秒硬直', majorSkillId: 'fighter_lv60' }),
  n(12, { kind: 'stat', name: '+力量', desc: '物理攻擊 +5', effect: { physicalAtk: 5 } }),
  n(13, { kind: 'stat', name: '+崩拳硬直', desc: '崩拳硬直 +0.1秒', effect: {} }),
  n(14, { kind: 'stat', name: '+連擊傷害', desc: '連擊追打比例再 +10%（共70%）', effect: {} }),
  n(15, { kind: 'major', name: '不動明王', desc: '氣勢觸發200%傷害瞬間附加0.5秒完全無敵', majorSkillId: 'fighter_lv80' }),
  n(16, { kind: 'stat', name: '+力量', desc: '物理攻擊 +5', effect: { physicalAtk: 5 } }),
  n(17, { kind: 'stat', name: '+無敵時長', desc: '不動明王無敵時間 +0.2秒（共0.7秒）', effect: {} }),
  n(18, { kind: 'stat', name: '+氣勢層數', desc: '氣勢滿層門檻 5→4', effect: {} }),
  n(19, { kind: 'mastery', name: '真氣爆發', desc: 'Ultimate 進化：5秒內連擊需求視同已達5次以上，氣勢觸發閾值降至3層', majorSkillId: 'fighter_lv100' }),
])
