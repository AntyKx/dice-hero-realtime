import { linkChain, type ArenaTalentNode } from './types'

const heroId = 'priest'

function n(tier: number, partial: Omit<ArenaTalentNode, 'id' | 'heroId' | 'tier' | 'connections'>): ArenaTalentNode {
  return { id: `${heroId}_n${tier}`, heroId, tier, connections: [], ...partial }
}

export const priestTalentTree: ArenaTalentNode[] = linkChain([
  n(0, { kind: 'stat', name: '+魔力', desc: '魔法攻擊 +2', effect: { magicAtk: 2 } }),
  n(1, { kind: 'stat', name: '+魔力', desc: '魔法攻擊 +2', effect: { magicAtk: 2 } }),
  n(2, { kind: 'stat', name: '+體魄', desc: '最大 HP +20', effect: { maxHpBonus: 20 } }),
  n(3, { kind: 'major', name: '聖光印記', desc: '普通攻擊為目標附加聖印（上限3層，4秒到期），聖印到期時祭司回復 3%maxHP／層', majorSkillId: 'priest_lv20' }),
  n(4, { kind: 'stat', name: '+體魄', desc: '最大 HP +20', effect: { maxHpBonus: 20 } }),
  n(5, { kind: 'stat', name: '+聖印回血', desc: '聖印到期回血比例 +1%（共4%/層）', effect: {} }),
  n(6, { kind: 'stat', name: '+聖印上限', desc: '聖印上限 +1（共4層）', effect: {} }),
  n(7, { kind: 'major', name: '光輪祝禱', desc: '每 10 秒回復 10%maxHP；施放瞬間所有帶聖印敵人立即結算回血', majorSkillId: 'priest_lv40' }),
  n(8, { kind: 'stat', name: '+體魄', desc: '最大 HP +25', effect: { maxHpBonus: 25 } }),
  n(9, { kind: 'stat', name: '+攻擊回血', desc: '普通攻擊命中額外回復固定 2 HP', effect: {} }),
  n(10, { kind: 'stat', name: '+光輪頻率', desc: '光輪祝禱冷卻 -1 秒（9秒）', effect: {} }),
  n(11, { kind: 'major', name: '聖光迴圈', desc: 'HP <50% 時，普攻命中額外造成一次範圍聖光爆炸，並回復本次傷害 20% 作為 HP', majorSkillId: 'priest_lv60' }),
  n(12, { kind: 'stat', name: '+體魄', desc: '最大 HP +30', effect: { maxHpBonus: 30 } }),
  n(13, { kind: 'stat', name: '+迴圈傷害', desc: '聖光迴圈爆炸傷害 +20%', effect: {} }),
  n(14, { kind: 'stat', name: '+迴圈回血', desc: '迴圈回血比例 +5%（共25%）', effect: {} }),
  n(15, { kind: 'major', name: '聖光庇護', desc: '聖印上限5層＋到期回血翻倍；HP<25%時自動觸發全體聖印結算＋2秒免死（HP不低於1，冷卻45秒）', majorSkillId: 'priest_lv80' }),
  n(16, { kind: 'stat', name: '+體魄', desc: '最大 HP +35', effect: { maxHpBonus: 35 } }),
  n(17, { kind: 'stat', name: '+攻擊回血', desc: '普攻命中額外回血 +2（共4）', effect: {} }),
  n(18, { kind: 'stat', name: '+庇護冷卻', desc: '聖光庇護冷卻 -10 秒（35秒）', effect: {} }),
  n(19, { kind: 'mastery', name: '永晝聖域', desc: 'Ultimate 進化：召喚持續聖域，域內自身每秒回復2%maxHP、聖印效果加倍、敵人受到傷害+15%', majorSkillId: 'priest_lv100' }),
])
