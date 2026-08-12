import { linkChain, type ArenaTalentNode } from './types'

const heroId = 'engineer'

function n(tier: number, partial: Omit<ArenaTalentNode, 'id' | 'heroId' | 'tier' | 'connections'>): ArenaTalentNode {
  return { id: `${heroId}_n${tier}`, heroId, tier, connections: [], ...partial }
}

export const engineerTalentTree: ArenaTalentNode[] = linkChain([
  n(0, { kind: 'stat', name: '+力量', desc: '物理攻擊 +2', effect: { physicalAtk: 2 } }),
  n(1, { kind: 'stat', name: '+力量', desc: '物理攻擊 +2', effect: { physicalAtk: 2 } }),
  n(2, { kind: 'stat', name: '+體魄', desc: '最大 HP +15', effect: { maxHpBonus: 15 } }),
  n(3, { kind: 'major', name: '熱能超載', desc: '每次普攻完整觸發疊1層熱能（上限5層），滿層下次攻擊自動觸發額外砲彈並清空', majorSkillId: 'engineer_lv20' }),
  n(4, { kind: 'stat', name: '+力量', desc: '物理攻擊 +3', effect: { physicalAtk: 3 } }),
  n(5, { kind: 'stat', name: '+熱能上限', desc: '熱能上限 +2（共7層）', effect: {} }),
  n(6, { kind: 'stat', name: '+砲彈傷害', desc: '額外砲彈傷害 +20%', effect: {} }),
  n(7, { kind: 'major', name: '蒸氣砲擊', desc: '攻擊25%機率額外發射固定傷害砲彈；與熱能超載獨立疊加判定', majorSkillId: 'engineer_lv40' }),
  n(8, { kind: 'stat', name: '+力量', desc: '物理攻擊 +3', effect: { physicalAtk: 3 } }),
  n(9, { kind: 'stat', name: '+砲擊機率', desc: '蒸氣砲擊機率 25%→32%', effect: {} }),
  n(10, { kind: 'stat', name: '+熱能上限', desc: '熱能上限再 +1（共8層）', effect: {} }),
  n(11, { kind: 'major', name: '自動砲塔', desc: '額外砲彈觸發時40%機率部署持續4秒的自動炮塔，每0.8秒自動攻擊最近敵人', majorSkillId: 'engineer_lv60' }),
  n(12, { kind: 'stat', name: '+力量', desc: '物理攻擊 +4', effect: { physicalAtk: 4 } }),
  n(13, { kind: 'stat', name: '+炮塔機率', desc: '自動炮塔部署機率 +10%（共50%）', effect: {} }),
  n(14, { kind: 'stat', name: '+炮塔時長', desc: '炮塔持續 +2秒（共6秒）', effect: {} }),
  n(15, { kind: 'major', name: '超頻核心', desc: '熱能上限提升至10；額外砲彈命中疊「過熱」，滿5層過熱時引爆範圍傷害並清空', majorSkillId: 'engineer_lv80' }),
  n(16, { kind: 'stat', name: '+力量', desc: '物理攻擊 +5', effect: { physicalAtk: 5 } }),
  n(17, { kind: 'stat', name: '+過熱傷害', desc: '過熱引爆傷害 +25%', effect: {} }),
  n(18, { kind: 'stat', name: '+砲擊機率', desc: '蒸氣砲擊機率再 +8%（共40%）', effect: {} }),
  n(19, { kind: 'mastery', name: '機甲降臨', desc: 'Ultimate 進化：同時部署3座自動炮塔（持續6秒），期間普攻冷卻大幅縮短', majorSkillId: 'engineer_lv100' }),
])
