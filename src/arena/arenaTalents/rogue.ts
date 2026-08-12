import { linkChain, type ArenaTalentNode } from './types'

const heroId = 'rogue'

function n(tier: number, partial: Omit<ArenaTalentNode, 'id' | 'heroId' | 'tier' | 'connections'>): ArenaTalentNode {
  return { id: `${heroId}_n${tier}`, heroId, tier, connections: [], ...partial }
}

export const rogueTalentTree: ArenaTalentNode[] = linkChain([
  n(0, { kind: 'stat', name: '+力量', desc: '物理攻擊 +3', effect: { physicalAtk: 3 } }),
  n(1, { kind: 'stat', name: '+力量', desc: '物理攻擊 +3', effect: { physicalAtk: 3 } }),
  n(2, { kind: 'stat', name: '+體魄', desc: '最大 HP +10', effect: { maxHpBonus: 10 } }),
  n(3, { kind: 'major', name: '影襲步', desc: '攻擊命中後 1.5 秒內移動速度 +25%，且期間下一次攻擊免除站穩延遲', majorSkillId: 'rogue_lv20' }),
  n(4, { kind: 'stat', name: '+力量', desc: '物理攻擊 +3', effect: { physicalAtk: 3 } }),
  n(5, { kind: 'stat', name: '+暴擊率', desc: '攻擊 15% 機率造成 200% 暴擊傷害', effect: {} }),
  n(6, { kind: 'stat', name: '+影襲時長', desc: '影襲步效果時間 +0.5 秒', effect: {} }),
  n(7, { kind: 'major', name: '暗影連襲', desc: '20% 機率追加 2 次攻擊；觸發時刷新影襲步時間窗', majorSkillId: 'rogue_lv40' }),
  n(8, { kind: 'stat', name: '+力量', desc: '物理攻擊 +4', effect: { physicalAtk: 4 } }),
  n(9, { kind: 'stat', name: '+暴擊率', desc: '暴擊機率 +5%（共20%）', effect: {} }),
  n(10, { kind: 'stat', name: '+力量', desc: '物理攻擊 +3（過渡格）', effect: { physicalAtk: 3 } }),
  n(11, { kind: 'major', name: '血影爆擊', desc: '攻擊命中疊「暗影標記」（上限3層），滿層引爆：造成標記期間累積傷害 30% 的額外單體傷害', majorSkillId: 'rogue_lv60' }),
  n(12, { kind: 'stat', name: '+力量', desc: '物理攻擊 +4', effect: { physicalAtk: 4 } }),
  n(13, { kind: 'stat', name: '+標記傷害', desc: '血影爆擊額外傷害比例 +10%（共40%）', effect: {} }),
  n(14, { kind: 'stat', name: '+暴擊傷害', desc: '暴擊倍率 +20%（共220%）', effect: {} }),
  n(15, { kind: 'major', name: '瞬影突襲', desc: '攻擊 10% 機率瞬移至目標背後再出手，該次攻擊必定觸發暗影連襲', majorSkillId: 'rogue_lv80' }),
  n(16, { kind: 'stat', name: '+力量', desc: '物理攻擊 +5', effect: { physicalAtk: 5 } }),
  n(17, { kind: 'stat', name: '+瞬影機率', desc: '瞬影突襲機率 +5%（共15%）', effect: {} }),
  n(18, { kind: 'stat', name: '+移速', desc: '移動速度永久 +5%', effect: { moveSpeedBonus: 0.05 } }),
  n(19, { kind: 'mastery', name: '百影夜襲', desc: 'Ultimate 進化：召喚多重殘影同時攻擊鎖定目標周圍所有敵人，期間移動速度大幅提升', majorSkillId: 'rogue_lv100' }),
])
