import { linkChain, type ArenaTalentNode } from './types'

const heroId = 'bard'

function n(tier: number, partial: Omit<ArenaTalentNode, 'id' | 'heroId' | 'tier' | 'connections'>): ArenaTalentNode {
  return { id: `${heroId}_n${tier}`, heroId, tier, connections: [], ...partial }
}

export const bardTalentTree: ArenaTalentNode[] = linkChain([
  n(0, { kind: 'stat', name: '+力量', desc: '物理攻擊 +2', effect: { physicalAtk: 2 } }),
  n(1, { kind: 'stat', name: '+力量', desc: '物理攻擊 +2', effect: { physicalAtk: 2 } }),
  n(2, { kind: 'stat', name: '+體魄', desc: '最大 HP +15', effect: { maxHpBonus: 15 } }),
  n(3, { kind: 'major', name: '旋律', desc: '普攻推進1~4節拍計數器，第4拍額外造成50%範圍傷害爆發', majorSkillId: 'bard_lv20' }),
  n(4, { kind: 'stat', name: '+力量', desc: '物理攻擊 +3', effect: { physicalAtk: 3 } }),
  n(5, { kind: 'stat', name: '+節拍傷害', desc: '第4拍爆發傷害 50%→65%', effect: {} }),
  n(6, { kind: 'stat', name: '+節拍範圍', desc: '爆發範圍 +20%', effect: {} }),
  n(7, { kind: 'major', name: '戰歌奏鳴', desc: '攻擊25%機率回復5HP；第4拍必定觸發一次（不受機率限制）', majorSkillId: 'bard_lv40' }),
  n(8, { kind: 'stat', name: '+力量', desc: '物理攻擊 +3', effect: { physicalAtk: 3 } }),
  n(9, { kind: 'stat', name: '+回血量', desc: '戰歌奏鳴回血 5→7', effect: {} }),
  n(10, { kind: 'stat', name: '+回血機率', desc: '戰歌奏鳴機率 25%→35%', effect: {} }),
  n(11, { kind: 'major', name: '戰歌迴響', desc: '每完整走完一輪節拍疊1層迴響（上限5層，8秒衰減），每層攻擊力+3%', majorSkillId: 'bard_lv60' }),
  n(12, { kind: 'stat', name: '+力量', desc: '物理攻擊 +4', effect: { physicalAtk: 4 } }),
  n(13, { kind: 'stat', name: '+迴響上限', desc: '迴響上限 +2（共7層）', effect: {} }),
  n(14, { kind: 'stat', name: '+迴響時長', desc: '迴響持續 +2秒（共10秒）', effect: {} }),
  n(15, { kind: 'major', name: '安可', desc: '迴響滿層時，下次第4拍爆發傷害翻倍並回復15%maxHP，觸發後迴響歸零重新累積', majorSkillId: 'bard_lv80' }),
  n(16, { kind: 'stat', name: '+力量', desc: '物理攻擊 +4', effect: { physicalAtk: 4 } }),
  n(17, { kind: 'stat', name: '+回血量', desc: '戰歌奏鳴回血再 +2（共9）', effect: {} }),
  n(18, { kind: 'stat', name: '+安可傷害', desc: '安可額外傷害倍率再 +30%', effect: {} }),
  n(19, { kind: 'mastery', name: '終章協奏', desc: 'Ultimate 進化：發動瞬間節拍直接設為4且迴響瞬間滿層，大招期間節拍循環從4拍縮短為2拍', majorSkillId: 'bard_lv100' }),
])
