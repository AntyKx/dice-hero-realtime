import { linkChain, type ArenaTalentNode } from './types'

const heroId = 'archer'

function n(tier: number, partial: Omit<ArenaTalentNode, 'id' | 'heroId' | 'tier' | 'connections'>): ArenaTalentNode {
  return { id: `${heroId}_n${tier}`, heroId, tier, connections: [], ...partial }
}

export const archerTalentTree: ArenaTalentNode[] = linkChain([
  n(0, { kind: 'stat', name: '+力量', desc: '物理攻擊 +3', effect: { physicalAtk: 3 } }),
  n(1, { kind: 'stat', name: '+力量', desc: '物理攻擊 +3', effect: { physicalAtk: 3 } }),
  n(2, { kind: 'stat', name: '+體魄', desc: '最大 HP +15', effect: { maxHpBonus: 15 } }),
  n(3, { kind: 'major', name: '追風箭', desc: '普攻永久附加1次基礎穿透（獨立於遺物穿透），穿透命中第二目標傷害 70%', majorSkillId: 'archer_lv20' }),
  n(4, { kind: 'stat', name: '+力量', desc: '物理攻擊 +4', effect: { physicalAtk: 4 } }),
  n(5, { kind: 'stat', name: '+射程', desc: '自動鎖定/攻擊判定距離 +15%', effect: {} }),
  n(6, { kind: 'stat', name: '+穿透傷害', desc: '穿透命中傷害比例 70%→85%', effect: {} }),
  n(7, { kind: 'major', name: '疾風箭雨', desc: '每 12 秒範圍40傷害；命中敵人2秒內獲得「破風標記」，普攻對其傷害+15%', majorSkillId: 'archer_lv40' }),
  n(8, { kind: 'stat', name: '+力量', desc: '物理攻擊 +4', effect: { physicalAtk: 4 } }),
  n(9, { kind: 'stat', name: '+射程', desc: '攻擊判定距離再 +15%（共30%）', effect: {} }),
  n(10, { kind: 'stat', name: '+箭雨範圍', desc: '疾風箭雨半徑 +15%', effect: {} }),
  n(11, { kind: 'major', name: '風之箭陣', desc: '疾風箭雨冷卻期間每4秒對當前目標補發一發強化箭矢（必定穿透2次）', majorSkillId: 'archer_lv60' }),
  n(12, { kind: 'stat', name: '+力量', desc: '物理攻擊 +5', effect: { physicalAtk: 5 } }),
  n(13, { kind: 'stat', name: '+破風效果', desc: '破風標記加傷 15%→20%', effect: {} }),
  n(14, { kind: 'stat', name: '+箭陣傷害', desc: '風之箭陣補發傷害 +20%', effect: {} }),
  n(15, { kind: 'major', name: '驟風連矢', desc: '普攻穿透次數不再有上限（原永久1次穿透 → 無限穿透）', majorSkillId: 'archer_lv80' }),
  n(16, { kind: 'stat', name: '+力量', desc: '物理攻擊 +5', effect: { physicalAtk: 5 } }),
  n(17, { kind: 'stat', name: '+箭雨頻率', desc: '疾風箭雨冷卻 -1秒（11秒）', effect: {} }),
  n(18, { kind: 'stat', name: '+射程', desc: '攻擊判定距離再 +10%（共40%）', effect: {} }),
  n(19, { kind: 'mastery', name: '萬箭穿心', desc: 'Ultimate 進化：連續3波全屏箭雨（間隔0.4秒，傷害提升），期間普攻固定觸發風之箭陣強化箭矢', majorSkillId: 'archer_lv100' }),
])
