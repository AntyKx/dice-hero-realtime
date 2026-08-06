import type { Potion } from './types'

export const ALL_POTIONS: Potion[] = [
  // ── 治療型 ──
  { id: 'heal_small', name: '小型治療藥水', icon: '🧪', desc: '回復 30 HP',                    effect: { healFlat: 30 } },
  { id: 'heal_large', name: '大型治療藥水', icon: '🍷', desc: '回復最大 HP 的 35%',            effect: { healPct: 0.35 } },
  { id: 'regen',      name: '再生藥水',     icon: '🌿', desc: '接下來 3 回合每回合回復 10 HP', effect: { regenTurns: 3, regenAmt: 10 } },
  { id: 'shield',     name: '護盾藥水',     icon: '🛡️', desc: '立即獲得 30 點護盾',             effect: { shield: 30 } },
  // ── 攻擊型 ──
  { id: 'burn_potion',   name: '烈焰藥水',   icon: '🔥', desc: '立即對敵人施加 8 層燃燒',       effect: { applyBurnStacks: 8 } },
  { id: 'poison_potion', name: '毒液藥水',   icon: '🐍', desc: '立即對敵人施加 5 層中毒',       effect: { applyPoisonStacks: 5 } },
  { id: 'freeze_potion', name: '霜凍藥水',   icon: '❄️', desc: '使敵人凍結 2 回合',             effect: { applyFreezeStacks: 2 } },
  // ── 強化型 ──
  { id: 'power_potion',      name: '力量藥水',   icon: '💪', desc: '本場戰鬥永久 +20 攻擊力',                    effect: { atkBonus: 20 } },
  { id: 'reroll_potion',     name: '醒神藥水',   icon: '✨', desc: '本回合立即獲得 2 次額外重骰',               effect: { rerollBonus: 2 } },
  { id: 'vuln_potion',       name: '易傷藥水',   icon: '💉', desc: '對敵人施加 2 回合易傷（受傷 +35%）',        effect: { applyVulnerableStacks: 2 } },
  { id: 'stone_skin_potion', name: '石皮藥水',   icon: '🪨', desc: '本場戰鬥永久 +10 防禦',                    effect: { potionDefBonus: 10 } },
  { id: 'fury_potion',       name: '狂怒藥水',   icon: '😡', desc: '下次攻擊傷害 ×1.8；使用時自傷 10 HP',      effect: { furyDmgMult: 1.8, furySelfDmg: 10 } },
  { id: 'lifesteal_potion',  name: '吸血藥水',   icon: '🩸', desc: '本次攻擊造成傷害的 30% 轉為 HP 回復',      effect: { lifestealOncePct: 30 } },
  { id: 'dice_god_potion',   name: '骰神藥水',   icon: '🎲', desc: '立即將一顆骰子強制變為 6',                  effect: { forceSixOneDie: true } },
]

export const getPotionById = (id: string): Potion | undefined =>
  ALL_POTIONS.find(p => p.id === id)

export function getRandomPotion(): Potion {
  return ALL_POTIONS[Math.floor(Math.random() * ALL_POTIONS.length)]
}

// Shop prices
export const POTION_PRICE: Record<string, number> = {
  heal_small:    30,
  heal_large:    60,
  regen:         55,
  shield:        45,
  burn_potion:       40,
  poison_potion:     40,
  freeze_potion:     55,
  power_potion:      50,
  reroll_potion:     45,
  vuln_potion:       50,
  stone_skin_potion: 45,
  fury_potion:       35,
  lifesteal_potion:  50,
  dice_god_potion:   60,
}
