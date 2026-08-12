import { linkChain, type ArenaTalentNode } from './types'

const heroId = 'princess'

function n(tier: number, partial: Omit<ArenaTalentNode, 'id' | 'heroId' | 'tier' | 'connections'>): ArenaTalentNode {
  return { id: `${heroId}_n${tier}`, heroId, tier, connections: [], ...partial }
}

// 設計偏差說明（見設計文件 B 節）：舊 Keystone「皇家冰晶陣」同時包含「疊冰痕」跟
// 「滿5層凍結」兩段行為，這裡拆成兩格：Lv20 拿疊冰痕+減速的基礎版，Lv40 保留
// 原技能名稱、行為窄化為「滿層凍結」的進階付費——全表唯一一處把舊 Keystone
// 一分為二而非整顆搬到 Lv40 的英雄。
export const princessTalentTree: ArenaTalentNode[] = linkChain([
  n(0, { kind: 'stat', name: '+魔力', desc: '魔法攻擊 +3', effect: { magicAtk: 3 } }),
  n(1, { kind: 'stat', name: '+魔力', desc: '魔法攻擊 +3', effect: { magicAtk: 3 } }),
  n(2, { kind: 'stat', name: '+體魄', desc: '最大 HP +15', effect: { maxHpBonus: 15 } }),
  n(3, { kind: 'major', name: '冰霜之觸', desc: '普攻疊冰痕（+1/次，上限5層，不衰減），每層減速目標 6%（上限30%）', majorSkillId: 'princess_lv20' }),
  n(4, { kind: 'stat', name: '+魔力', desc: '魔法攻擊 +4', effect: { magicAtk: 4 } }),
  n(5, { kind: 'stat', name: '+減速強度', desc: '冰痕每層減速 +2%（上限40%）', effect: {} }),
  n(6, { kind: 'stat', name: '+冰痕上限', desc: '冰痕上限 +1（共6層才觸發凍結）', effect: {} }),
  n(7, { kind: 'major', name: '皇家冰晶陣', desc: '冰痕滿層時凍結目標 2 秒，凍結後冰痕歸零重新累積', majorSkillId: 'princess_lv40' }),
  n(8, { kind: 'stat', name: '+魔力', desc: '魔法攻擊 +4', effect: { magicAtk: 4 } }),
  n(9, { kind: 'stat', name: '+凍結時間', desc: '凍結持續 +0.5 秒', effect: {} }),
  n(10, { kind: 'stat', name: '+冰痕效率', desc: '穿透命中也計入冰痕疊層', effect: {} }),
  n(11, { kind: 'major', name: '碎冰爆發', desc: '攻擊命中凍結中敵人：150% 傷害碎冰爆炸並提前結束凍結，波及範圍內敵人 +2 層冰痕', majorSkillId: 'princess_lv60' }),
  n(12, { kind: 'stat', name: '+魔力', desc: '魔法攻擊 +5', effect: { magicAtk: 5 } }),
  n(13, { kind: 'stat', name: '+碎冰傷害', desc: '碎冰爆炸傷害 +20%（共170%）', effect: {} }),
  n(14, { kind: 'stat', name: '+碎冰範圍', desc: '碎冰爆炸範圍 +25%', effect: {} }),
  n(15, { kind: 'major', name: '冰痕擴散', desc: '敵人死亡時剩餘冰痕層數擴散給最近 3 個敵人（各 +1 層）', majorSkillId: 'princess_lv80' }),
  n(16, { kind: 'stat', name: '+魔力', desc: '魔法攻擊 +5', effect: { magicAtk: 5 } }),
  n(17, { kind: 'stat', name: '+凍結時間', desc: '凍結持續 +0.5 秒（共3秒）', effect: {} }),
  n(18, { kind: 'stat', name: '+擴散範圍', desc: '冰痕擴散半徑 +30%', effect: {} }),
  n(19, { kind: 'mastery', name: '絕對零度', desc: 'Ultimate 進化：範圍內敵人直接附加5層冰痕、凍結延長至4秒，大招期間自身攻速小幅提升', majorSkillId: 'princess_lv100' }),
])
