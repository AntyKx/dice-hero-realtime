import { linkChain, type ArenaTalentNode } from './types'

const heroId = 'death_knight'

function n(tier: number, partial: Omit<ArenaTalentNode, 'id' | 'heroId' | 'tier' | 'connections'>): ArenaTalentNode {
  return { id: `${heroId}_n${tier}`, heroId, tier, connections: [], ...partial }
}

export const deathKnightTalentTree: ArenaTalentNode[] = linkChain([
  n(0, { kind: 'stat', name: '+力量', desc: '物理攻擊 +3', effect: { physicalAtk: 3 } }),
  n(1, { kind: 'stat', name: '+力量', desc: '物理攻擊 +3', effect: { physicalAtk: 3 } }),
  n(2, { kind: 'stat', name: '+體魄', desc: '最大 HP +20', effect: { maxHpBonus: 20 } }),
  n(3, { kind: 'major', name: '死亡意志', desc: '每損失10%maxHP，傷害+4%（上限損失70%時封頂+28%）', majorSkillId: 'death_knight_lv20' }),
  n(4, { kind: 'stat', name: '+體魄', desc: '最大 HP +20', effect: { maxHpBonus: 20 } }),
  n(5, { kind: 'stat', name: '+死亡意志上限', desc: '傷害加成上限 +4%（共32%）', effect: {} }),
  n(6, { kind: 'stat', name: '+力量', desc: '物理攻擊 +4', effect: { physicalAtk: 4 } }),
  n(7, { kind: 'major', name: '鮮血符文', desc: '普攻疊血印（上限5層），滿層進入4秒「血腥狀態」：吸血15%＋傷害+20%，狀態結束血印歸零', majorSkillId: 'death_knight_lv40' }),
  n(8, { kind: 'stat', name: '+體魄', desc: '最大 HP +25', effect: { maxHpBonus: 25 } }),
  n(9, { kind: 'stat', name: '+血腥傷害', desc: '血腥狀態傷害加成 20%→28%', effect: {} }),
  n(10, { kind: 'stat', name: '+血腥吸血', desc: '血腥狀態吸血 15%→20%', effect: {} }),
  n(11, { kind: 'major', name: '死亡纏繞', desc: '每6秒對最近敵人造成暗屬傷害並回復自身該傷害50%的HP', majorSkillId: 'death_knight_lv60' }),
  n(12, { kind: 'stat', name: '+力量', desc: '物理攻擊 +5', effect: { physicalAtk: 5 } }),
  n(13, { kind: 'stat', name: '+纏繞頻率', desc: '死亡纏繞冷卻 -1秒（5秒）', effect: {} }),
  n(14, { kind: 'stat', name: '+纏繞回血', desc: '纏繞回血比例 50%→65%', effect: {} }),
  n(15, { kind: 'major', name: '不死契約', desc: '每場一次，受到致死傷害時保留1HP並進入3秒無法死亡，須靠吸血/回血脫離險境', majorSkillId: 'death_knight_lv80' }),
  n(16, { kind: 'stat', name: '+體魄', desc: '最大 HP +30', effect: { maxHpBonus: 30 } }),
  n(17, { kind: 'stat', name: '+血腥吸血', desc: '血腥狀態吸血再 +5%（共25%）', effect: {} }),
  n(18, { kind: 'stat', name: '+死亡意志', desc: '傷害加成上限再 +4%（共36%）', effect: {} }),
  n(19, { kind: 'mastery', name: '死亡領域', desc: 'Ultimate 進化：展開5秒黑暗領域，域內敵人減速25%、自身受傷-20%、造成傷害+15%吸血，擊殺延長領域1.5秒', majorSkillId: 'death_knight_lv100' }),
])
