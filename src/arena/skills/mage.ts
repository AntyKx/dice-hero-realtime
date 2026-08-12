/**
 * 火焰法師天賦系統 v2 職業機制。燃燒 DoT 本體的持續傷害/到期清空寫在
 * ArenaGame.updateStatusEffects()（所有英雄共用同一套燃燒/聖印 tick），
 * 這裡只放「燃燒相關但屬於火法專屬」的邏輯：命中疊層、爆燃、連鎖、Ultimate。
 *
 * 五個大型技能循環：Lv20 攻擊附加燃燒 → Lv40 隕星週期爆發（命中燃燒敵人時
 * 燃燒封頂）→ Lv60 燃燒滿層有機率自爆 → Lv80 自爆連鎖點燃鄰近燃燒敵人 →
 * Lv100 Ultimate 進化成全屏引爆+隕星加速。
 */
import type { ArenaGame, EnemyInstance } from '../ArenaGame'

const BURN_STACK_INTERVAL = 3 // 秒，onAttackHit 疊一層燃燒時順便刷新的持續時間
const BURN_MAX_STACKS_BASE = 5
const BURN_MAX_STACKS_LV80 = 8
const DETONATE_CHANCE_PER_SEC = 0.20
const DETONATE_RADIUS = 90
const DETONATE_DAMAGE_MULT = 0.6 * 3 // 近似「已損耗燃燒總傷害60%」：用滿層3秒份燃燒傷害的60%估算，避免另外加一個逐敵人累積傷害的欄位
const CHAIN_REIGNITE_STACKS = 2
const ULTIMATE_HASTE_SEC = 6
const ULTIMATE_HASTE_INTERVAL = 4 // 隕星週期 8秒→4秒

function burnMaxStacks(game: ArenaGame): number {
  return game.unlockedMajorSkillIds.has('mage_lv80') ? BURN_MAX_STACKS_LV80 : BURN_MAX_STACKS_BASE
}

/** Lv20 燃燒：普通攻擊命中附加 1 層燃燒。由 ArenaGame.onAttackHit() 呼叫。 */
export function mageOnHit(game: ArenaGame, e: EnemyInstance): void {
  if (!game.unlockedMajorSkillIds.has('mage_lv20')) return
  e.burnStacks = Math.min(burnMaxStacks(game), e.burnStacks + 1)
  e.burnTimer = BURN_STACK_INTERVAL
}

export function mageMajorTick(game: ArenaGame, dt: number): void {
  if (game.majorTimer2 > 0) game.majorTimer2 -= dt // Lv100 隕星加速視窗剩餘時間

  if (!game.unlockedMajorSkillIds.has('mage_lv60')) return
  game.majorTimer += dt
  if (game.majorTimer < 1) return
  game.majorTimer -= 1

  const maxStacks = burnMaxStacks(game)
  for (const e of game.enemies) {
    if (!e.alive || e.burnStacks < maxStacks) continue
    if (Math.random() >= DETONATE_CHANCE_PER_SEC) continue
    detonateBurn(game, e)
  }
}

function detonateBurn(game: ArenaGame, e: EnemyInstance): void {
  const burstDamage = e.burnStacks * DETONATE_DAMAGE_MULT
  e.burnStacks = 0
  e.burnTimer = 0
  game.damageEnemy(e, burstDamage)
  game.spawnGlowBurst(e.x, e.y, 0xff6a3c, DETONATE_RADIUS)
  if (!game.unlockedMajorSkillIds.has('mage_lv80')) return
  // Lv80 燃燒連鎖：波及範圍內其他帶燃燒的敵人重新點燃
  for (const other of game.enemies) {
    if (!other.alive || other === e || other.burnStacks <= 0) continue
    if (Math.hypot(other.x - e.x, other.y - e.y) > DETONATE_RADIUS) continue
    other.burnStacks = Math.min(burnMaxStacks(game), other.burnStacks + CHAIN_REIGNITE_STACKS)
    other.burnTimer = BURN_STACK_INTERVAL
  }
}

/** Lv100 末日隕星：Ultimate 進化，套用在 applyUltimateDamage() 裡。 */
export function mageUltimateMastery(game: ArenaGame): void {
  if (!game.unlockedMajorSkillIds.has('mage_lv100')) return
  for (const e of game.enemies) {
    if (!e.alive) continue
    if (e.burnStacks > 0) detonateBurn(game, e)
    else { e.burnStacks = BURN_MAX_STACKS_BASE; e.burnTimer = BURN_STACK_INTERVAL }
  }
  game.majorTimer2 = ULTIMATE_HASTE_SEC
  game.spawnFloatingText('末日隕星！', game.player.x, game.player.y - 60)
}

/** Lv40 烈焰隕星的週期間隔：Lv100 大招後的加速視窗內縮短為 4 秒。 */
export function mageMeteorInterval(game: ArenaGame, baseInterval: number): number {
  return game.majorTimer2 > 0 ? ULTIMATE_HASTE_INTERVAL : baseInterval
}
