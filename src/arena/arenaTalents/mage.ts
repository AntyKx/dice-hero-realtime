import { linkChain, type ArenaTalentNode } from './types'

const heroId = 'mage'

function n(tier: number, partial: Omit<ArenaTalentNode, 'id' | 'heroId' | 'tier' | 'connections'>): ArenaTalentNode {
  return { id: `${heroId}_n${tier}`, heroId, tier, connections: [], ...partial }
}

export const mageTalentTree: ArenaTalentNode[] = linkChain([
  n(0, { kind: 'stat', name: '+魔力', desc: '魔法攻擊 +3', effect: { magicAtk: 3 } }),
  n(1, { kind: 'stat', name: '+魔力', desc: '魔法攻擊 +3', effect: { magicAtk: 3 } }),
  n(2, { kind: 'stat', name: '+體魄', desc: '最大 HP +15', effect: { maxHpBonus: 15 } }),
  n(3, { kind: 'major', name: '燃燒', desc: '普通攻擊附加 1 層燃燒（每層每秒造成固定傷害，持續 3 秒，上限 5 層）', majorSkillId: 'mage_lv20' }),
  n(4, { kind: 'stat', name: '+魔力', desc: '魔法攻擊 +4', effect: { magicAtk: 4 } }),
  n(5, { kind: 'stat', name: '+燃燒傷害', desc: '燃燒每層傷害 +20%', effect: {} }),
  n(6, { kind: 'stat', name: '+燃燒持續', desc: '燃燒持續時間 +1 秒', effect: {} }),
  n(7, { kind: 'major', name: '烈焰隕星', desc: '每 8 秒對最近敵人造成 60 傷害；命中時目標燃燒層數直接封頂 5 層', majorSkillId: 'mage_lv40' }),
  n(8, { kind: 'stat', name: '+魔力', desc: '魔法攻擊 +4', effect: { magicAtk: 4 } }),
  n(9, { kind: 'stat', name: '+燃燒上限', desc: '燃燒疊層上限 +2（共7層）', effect: {} }),
  n(10, { kind: 'stat', name: '+隕星傷害', desc: '烈焰隕星傷害 +15', effect: {} }),
  n(11, { kind: 'major', name: '爆燃', desc: '燃燒滿層敵人每秒有 20% 機率觸發爆燃：清空燃燒層數，造成已損耗燃燒總傷害 60% 的範圍爆炸', majorSkillId: 'mage_lv60' }),
  n(12, { kind: 'stat', name: '+魔力', desc: '魔法攻擊 +5', effect: { magicAtk: 5 } }),
  n(13, { kind: 'stat', name: '+爆燃機率', desc: '爆燃觸發機率 +10%', effect: {} }),
  n(14, { kind: 'stat', name: '+爆炸範圍', desc: '爆燃範圍 +25%', effect: {} }),
  n(15, { kind: 'major', name: '燃燒連鎖', desc: '爆燃波及範圍內其他帶燃燒的敵人會重新點燃並疊 2 層；燃燒疊層上限再 +1（共8層）', majorSkillId: 'mage_lv80' }),
  n(16, { kind: 'stat', name: '+魔力', desc: '魔法攻擊 +5', effect: { magicAtk: 5 } }),
  n(17, { kind: 'stat', name: '+隕星頻率', desc: '烈焰隕星冷卻 -1 秒（7秒）', effect: {} }),
  n(18, { kind: 'stat', name: '+連鎖範圍', desc: '燃燒連鎖再擴散一次（二段連鎖）', effect: {} }),
  n(19, { kind: 'mastery', name: '末日隕星', desc: 'Ultimate 進化：場上所有敵人燃燒層數立即引爆（無燃燒則直接附加5層），大招後續效時間內隕星週期 8秒→4秒', majorSkillId: 'mage_lv100' }),
])
