import type { Curse } from './types'

export const ALL_CURSES: Curse[] = [
  { id: 'bleeding',  name: '流血詛咒', desc: '每回合開始失去當前 HP 的 1%（最少 1 點）', effect: { selfDmgPct: 1 } },
  { id: 'weakness',  name: '虛弱詛咒', desc: '重骰次數 -1',                               effect: { rerollPenalty: 1 } },
  { id: 'brittle',   name: '易碎詛咒', desc: '最大 HP 永久 -20%（移除詛咒不恢復）',       effect: { maxHpMult: 0.8 } },
  { id: 'corrosion', name: '腐蝕詛咒', desc: '治療效果 -30%',                             effect: { healPenaltyPct: 30 } },
  { id: 'chaos',     name: '混亂詛咒', desc: '每回合開始隨機鎖定 1 顆骰子，無法重骰',     effect: { lockRandomDie: 1 } },
  { id: 'exposed',   name: '破綻詛咒', desc: '敵人攻擊力 +15%',                           effect: { enemyAtkMult: 15 } },

  // ── 燃燒王座専用詛咒 ──────────────────────────────────────────────────────
  { id: 'flame_surge',    name: '魔焰失控', desc: '每次增加魔焰時有 25% 機率額外 +1',          effect: { flameExtraChance: 25 }, dungeonOnly: 'burning_throne' },
  { id: 'ash_lung',       name: '灰燼肺',   desc: '每次魔焰反噬後，治療效果 -20%，持續 2 回合', effect: { backlashHealPenalty: 20 }, dungeonOnly: 'burning_throne' },
  { id: 'throne_gaze',    name: '王座凝視', desc: 'Boss 戰中魔焰值 4+ 時，Boss 攻擊額外 +10%', effect: { bossFlameAtkBonus: 10 }, dungeonOnly: 'burning_throne' },
  { id: 'burning_price',  name: '燃魂代價', desc: '造成超過 100 傷害時，受到 5 自傷',          effect: { highDmgSelfHit: 5 }, dungeonOnly: 'burning_throne' },
  { id: 'black_fire',     name: '黑火纏身', desc: '每場戰鬥開始時魔焰 +1',                     effect: { startFlameBonus: 1 }, dungeonOnly: 'burning_throne' },

  // ── 黑潮王座専用詛咒 ──────────────────────────────────────────────────────
  { id: 'oxygen_drain',  name: '深淵窒息', desc: '每回合額外減少 1 點氧氣',                    effect: { oxygenExtraDecay: 1 }, dungeonOnly: 'black_tide' },
  { id: 'tidal_surge',   name: '怒潮洶湧', desc: '漲潮切入時敵人額外獲得 15 護盾',             effect: { tidalSurgeShield: 15 }, dungeonOnly: 'black_tide' },
  { id: 'drowned_fate',  name: '溺亡命運', desc: '溺水傷害提升至最大 HP 的 15%（原 10%）',    effect: { drownDmgPct: 15 }, dungeonOnly: 'black_tide' },
]

export function getRandomCurse(): Curse {
  return ALL_CURSES[Math.floor(Math.random() * ALL_CURSES.length)]
}

export function getCurseById(id: string): Curse | undefined {
  return ALL_CURSES.find(c => c.id === id)
}
