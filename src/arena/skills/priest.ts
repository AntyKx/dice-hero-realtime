/**
 * 神官祭司天賦系統 v2 職業機制。聖印到期回血的共用 tick 在
 * ArenaGame.updateStatusEffects()，這裡放疊層/低血循環/緊急保命/Ultimate。
 *
 * 五個大型技能循環：Lv20 攻擊附加聖印、到期回血（攻擊換治療）→ Lv40 週期
 * 自癒（施放時聖印立即結算）→ Lv60 低血時攻擊追加範圍聖光+回血 → Lv80
 * 聖印上限/回血翻倍+瀕死自動保命 → Lv100 Ultimate 進化成持續聖域。
 */
import { ULTIMATE_RADIUS, type ArenaGame, type EnemyInstance } from '../ArenaGame'

const HOLY_MARK_DURATION = 4
const HOLY_MARK_MAX_BASE = 3
const HOLY_MARK_MAX_LV80 = 5
const LOOP_HP_THRESHOLD = 0.5
const LOOP_RADIUS = 90
const LOOP_DAMAGE_MULT = 0.5
const LOOP_HEAL_PCT = 0.2
const DEATH_SAVE_HP_THRESHOLD = 0.25
const DEATH_SAVE_GRACE_SEC = 2
const DEATH_SAVE_COOLDOWN_SEC = 45
const SANCTUARY_DURATION = 6
const SANCTUARY_HEAL_PCT_PER_SEC = 0.02

function holyMarkMax(game: ArenaGame): number {
  return game.unlockedMajorSkillIds.has('priest_lv80') ? HOLY_MARK_MAX_LV80 : HOLY_MARK_MAX_BASE
}

/** Lv20 聖光印記：普攻命中附加聖印。由 ArenaGame.onAttackHit() 呼叫。 */
export function priestOnHit(game: ArenaGame, e: EnemyInstance): void {
  if (!game.unlockedMajorSkillIds.has('priest_lv20')) return
  e.holyMarkStacks = Math.min(holyMarkMax(game), e.holyMarkStacks + 1)
  e.holyMarkTimer = HOLY_MARK_DURATION

  // Lv60 聖光迴圈：HP<50% 時，命中額外造成範圍聖光爆炸並回血
  if (game.unlockedMajorSkillIds.has('priest_lv60') && game.player.hp < game.player.maxHp * LOOP_HP_THRESHOLD) {
    const dmg = (game.cfg.atkDamage + game.bonusDamage) * LOOP_DAMAGE_MULT
    for (const other of game.enemies) {
      if (other.alive && Math.hypot(other.x - e.x, other.y - e.y) <= LOOP_RADIUS) game.damageEnemy(other, dmg)
    }
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + dmg * LOOP_HEAL_PCT)
    game.spawnGlowBurst(e.x, e.y, 0x8ad4ff, LOOP_RADIUS)
  }
}

export function priestMajorTick(game: ArenaGame, dt: number): void {
  if (game.majorTimer2 > 0) game.majorTimer2 -= dt // Lv80 死亡保護冷卻
  if (game.majorStacks2 > 0) game.majorStacks2 -= dt // Lv100 聖域剩餘時間

  if (!game.unlockedMajorSkillIds.has('priest_lv80')) return
  if (game.majorTimer2 > 0) return
  if (game.player.hp >= game.player.maxHp * DEATH_SAVE_HP_THRESHOLD) return
  // 觸發：所有帶聖印敵人立即結算，並開啟短暫免死視窗
  for (const e of game.enemies) {
    if (e.alive && e.holyMarkStacks > 0) {
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + game.player.maxHp * 0.03 * e.holyMarkStacks * 2)
      e.holyMarkStacks = 0
      e.holyMarkTimer = 0
    }
  }
  game.majorTimer = DEATH_SAVE_GRACE_SEC
  game.majorTimer2 = DEATH_SAVE_COOLDOWN_SEC
  game.spawnGlowBurst(game.player.x, game.player.y, 0xffe9a8, 90)
  game.spawnFloatingText('聖光庇護！', game.player.x, game.player.y - 40)
}

/** Lv80 瀕死保護視窗內，damagePlayer() 呼叫這個把致死傷害鎖在 1 HP。 */
export function priestDeathSaveActive(game: ArenaGame): boolean {
  return game.unlockedMajorSkillIds.has('priest_lv80') && game.majorTimer > 0
}

/** Lv100 永晝聖域：Ultimate 進化，套用在 applyUltimateDamage() 裡。 */
export function priestUltimateMastery(game: ArenaGame): void {
  if (!game.unlockedMajorSkillIds.has('priest_lv100')) return
  game.majorStacks2 = SANCTUARY_DURATION
  game.spawnFloatingText('永晝聖域！', game.player.x, game.player.y - 60)
}

/** 聖域期間（Lv100）每秒額外回血，供 updatePassives() 或 majorTick 內直接套用。 */
export function priestSanctuaryHealPerSec(game: ArenaGame): number {
  return game.majorStacks2 > 0 ? game.player.maxHp * SANCTUARY_HEAL_PCT_PER_SEC : 0
}

/** 聖域期間（Lv100）敵人受到傷害 +15%，供 damageEnemy() 呼叫端加成用。 */
export function priestSanctuaryDamageMult(game: ArenaGame): number {
  return game.majorStacks2 > 0 ? 1.15 : 1
}

// ── 職業裝備武器必殺技（2026-08）：跟上面 Lv100 Mastery 獨立疊加的一層。 ──

/** 武器 A 聖光權杖：自療爆發。 */
export function priestScepterUltimate(game: ArenaGame): void {
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + game.player.maxHp * 0.3)
  game.spawnGlowBurst(game.player.x, game.player.y, 0x8ad4ff, 90)
  game.spawnFloatingText('光輪祝禱！', game.player.x, game.player.y - 60)
}

/** 武器 B 聖徽法典：護盾爆發（連擋 2 下）＋範圍內敵人短暫反傷。 */
export function priestHolyTomeUltimate(game: ArenaGame): void {
  game.shieldCharges = Math.max(game.shieldCharges, 2)
  for (const e of game.enemies) {
    if (!e.alive) continue
    if (Math.hypot(e.x - game.player.x, e.y - game.player.y) <= ULTIMATE_RADIUS) e.attackCooldown += 1
  }
  game.spawnGlowBurst(game.player.x, game.player.y, 0xffe9a8, 90)
  game.spawnFloatingText('聖光庇護結界！', game.player.x, game.player.y - 60)
}
