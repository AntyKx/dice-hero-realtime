import { linkChain, type ArenaTalentNode } from './types'

const heroId = 'knight'

function n(tier: number, partial: Omit<ArenaTalentNode, 'id' | 'heroId' | 'tier' | 'connections'>): ArenaTalentNode {
  return { id: `${heroId}_n${tier}`, heroId, tier, connections: [], ...partial }
}

export const knightTalentTree: ArenaTalentNode[] = linkChain([
  n(0, { kind: 'stat', name: '+力量', desc: '物理攻擊 +3', effect: { physicalAtk: 3 } }),
  n(1, { kind: 'stat', name: '+力量', desc: '物理攻擊 +3', effect: { physicalAtk: 3 } }),
  n(2, { kind: 'stat', name: '+體魄', desc: '最大 HP +20', effect: { maxHpBonus: 20 } }),
  n(3, { kind: 'major', name: '守護核心', desc: '站立不動輸出時每秒疊 1 層聖印（上限5層，移動即清空），每層減傷 5%', majorSkillId: 'knight_lv20' }),
  n(4, { kind: 'stat', name: '+體魄', desc: '最大 HP +25', effect: { maxHpBonus: 25 } }),
  n(5, { kind: 'stat', name: '+防禦', desc: '受到傷害 -3%', effect: { damageReductionPct: 0.03 } }),
  n(6, { kind: 'stat', name: '+護盾量', desc: '戰鬥開局多 1 個護盾格', effect: { startShieldCharges: 1 } }),
  n(7, { kind: 'major', name: '聖盾破軍斬', desc: '每 20 秒嘲諷附近敵人並自身 3 秒減傷 50%；施放瞬間聖印補滿 5 層', majorSkillId: 'knight_lv40' }),
  n(8, { kind: 'stat', name: '+體魄', desc: '最大 HP +30', effect: { maxHpBonus: 30 } }),
  n(9, { kind: 'stat', name: '+防禦', desc: '受到傷害 -3%', effect: { damageReductionPct: 0.03 } }),
  n(10, { kind: 'stat', name: '+嘲諷範圍', desc: '聖盾破軍斬嘲諷半徑 +20%', effect: {} }),
  n(11, { kind: 'major', name: '盾擊反制', desc: '受到攻擊 35% 機率格擋（該次傷害歸零）並反擊造成一次普攻傷害；格擋額外疊 1 層聖印', majorSkillId: 'knight_lv60' }),
  n(12, { kind: 'stat', name: '+體魄', desc: '最大 HP +35', effect: { maxHpBonus: 35 } }),
  n(13, { kind: 'stat', name: '+防禦', desc: '受到傷害 -3%', effect: { damageReductionPct: 0.03 } }),
  n(14, { kind: 'stat', name: '+反擊傷害', desc: '盾擊反制的反擊傷害 +25%', effect: {} }),
  n(15, { kind: 'major', name: '神聖壁壘', desc: '聖印滿 5 層時自動觸發 2 秒完全無敵（冷卻 45 秒，被動不用按鍵）', majorSkillId: 'knight_lv80' }),
  n(16, { kind: 'stat', name: '+體魄', desc: '最大 HP +40', effect: { maxHpBonus: 40 } }),
  n(17, { kind: 'stat', name: '+防禦', desc: '受到傷害 -3%', effect: { damageReductionPct: 0.03 } }),
  n(18, { kind: 'stat', name: '+聖印效率', desc: '聖印疊層速度加快（0.8 秒/層）', effect: {} }),
  n(19, { kind: 'mastery', name: '不動聖城', desc: 'Ultimate 進化：召喚結界，範圍內敵人攻速 -20%、自身聖印永久滿層、受到傷害額外 -30%，結界期間普攻必定嘲諷命中', majorSkillId: 'knight_lv100' }),
])
