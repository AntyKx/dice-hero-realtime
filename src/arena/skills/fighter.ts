/**
 * 武鬥家天賦系統 v2 職業機制。核心是「咬著同一個目標打」的 Combo 系統，
 * 跟其他英雄「打誰都一樣」明確區隔。
 *
 * 五個大型技能循環：Lv20 連續命中同目標≥3次追加傷害 → Lv40 擊殺疊氣勢
 * （既有Keystone，對Boss連段也能疊）→ Lv60 連擊≥5次追加擊退硬直 → Lv80
 * 氣勢爆發瞬間無敵 → Lv100 Ultimate 進化：連擊/氣勢門檻暫時降低。
 */
import { ULTIMATE_RADIUS, type ArenaGame, type EnemyInstance } from '../ArenaGame'

const COMBO_THRESHOLD = 3
const COMBO_DAMAGE_MULT = 0.4
const STAGGER_COMBO_THRESHOLD = 5
const STAGGER_DURATION = 0.2
const INVULN_DURATION = 0.5
const ULTIMATE_WINDOW_SEC = 5
const ULTIMATE_MOMENTUM_THRESHOLD = 3

/**
 * Lv20 連擊之心：攻擊發射瞬間更新連擊計數（換目標即重置）。由
 * ArenaGame.fireNormalAttack() 呼叫，回傳目前連擊次數供傷害倍率/其他天賦判斷。
 */
export function fighterTrackCombo(game: ArenaGame, target: EnemyInstance): number {
  if (game.comboTarget === target) {
    game.comboCount++
  } else {
    game.comboTarget = target
    game.comboCount = 1
  }
  // Lv40 對 Boss 連段也能疊氣勢（Boss相容 fallback，見設計文件 D 節）
  if (game.unlockedMajorSkillIds.has('fighter_lv40') && target.isBoss && game.comboCount >= COMBO_THRESHOLD) {
    game.keystoneStacks++
    const threshold = game.majorTimer2 > 0 ? ULTIMATE_MOMENTUM_THRESHOLD : 5
    if (game.keystoneStacks >= threshold) { game.keystoneStacks = 0; game.keystoneNextAtkBonus = true }
  }
  // Lv60 崩拳連段：連續命中≥5次額外附加擊退+硬直
  if (game.unlockedMajorSkillIds.has('fighter_lv60') && game.comboCount >= STAGGER_COMBO_THRESHOLD) {
    target.frozenTimer = Math.max(target.frozenTimer, target.isBoss ? 0.1 : STAGGER_DURATION)
  }
  return game.comboCount
}

/** Lv20 連擊之心：連續命中同目標≥3次的傷害倍率，供 fireProjectileAt()/meleeAttackAt() 套用。 */
export function fighterComboDamageMult(game: ArenaGame): number {
  if (!game.unlockedMajorSkillIds.has('fighter_lv20')) return 1
  return game.comboCount >= COMBO_THRESHOLD ? 1 + COMBO_DAMAGE_MULT : 1
}

/** Lv80 不動明王：氣勢 200% 傷害觸發瞬間附加短暫無敵。由消耗 keystoneNextAtkBonus 的地方呼叫。 */
export function fighterOnMomentumTrigger(game: ArenaGame): void {
  if (!game.unlockedMajorSkillIds.has('fighter_lv80')) return
  game.majorInvulnTimer = INVULN_DURATION
  game.spawnGlowBurst(game.player.x, game.player.y, 0xff4040, 60)
}

export function fighterMajorTick(game: ArenaGame, dt: number): void {
  if (game.majorTimer2 > 0) game.majorTimer2 -= dt // Lv100 連擊/氣勢降低門檻視窗
}

/** Lv100 真氣爆發：Ultimate 進化，套用在 applyUltimateDamage() 裡。 */
export function fighterUltimateMastery(game: ArenaGame): void {
  if (!game.unlockedMajorSkillIds.has('fighter_lv100')) return
  game.majorTimer2 = ULTIMATE_WINDOW_SEC
  game.comboCount = Math.max(game.comboCount, STAGGER_COMBO_THRESHOLD)
  game.spawnFloatingText('真氣爆發！', game.player.x, game.player.y - 60)
}

// ── 職業裝備武器必殺技（2026-08）：跟上面 Lv100 Mastery 獨立疊加的一層。 ──

/** 武器 A 連拳護手：連環爆拳，對最近敵人快速追加多段傷害。 */
export function fighterGauntletsUltimate(game: ArenaGame): void {
  const target = game.enemies
    .filter(e => e.alive && Math.hypot(e.x - game.player.x, e.y - game.player.y) <= ULTIMATE_RADIUS)
    .sort((a, b) => Math.hypot(a.x - game.player.x, a.y - game.player.y) - Math.hypot(b.x - game.player.x, b.y - game.player.y))[0]
  if (target) { game.damageEnemy(target, 20); game.damageEnemy(target, 20); game.damageEnemy(target, 20) }
  game.spawnFloatingText('連環爆拳！', game.player.x, game.player.y - 60)
}

/** 武器 B 縛靈拳甲：真氣蓄力爆發，範圍內敵人追加高額傷害＋自身短暫無敵。 */
export function fighterSpiritWrapsUltimate(game: ArenaGame): void {
  for (const e of game.enemies) {
    if (!e.alive) continue
    if (Math.hypot(e.x - game.player.x, e.y - game.player.y) <= ULTIMATE_RADIUS) game.damageEnemy(e, 45)
  }
  game.majorInvulnTimer = Math.max(game.majorInvulnTimer, INVULN_DURATION)
  game.spawnGlowBurst(game.player.x, game.player.y, 0xff4040, ULTIMATE_RADIUS)
  game.spawnFloatingText('縛靈爆裂拳！', game.player.x, game.player.y - 60)
}
