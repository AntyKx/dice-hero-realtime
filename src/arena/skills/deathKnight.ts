/**
 * 死亡騎士天賦系統 v2 職業機制（取代訓獸師，見設計文件的 Migration 方案）。
 * 沿用使用者原文構想：殘血換輸出 → 靠吸血維持 → 危險時不死 → 滿級死亡領域
 * 放大整套機制，是全樹裡唯一「主動壓血量」的常態玩法（跟神官祭司的低血
 * 緊急應變不同，死亡騎士是刻意長期維持低血輸出）。
 *
 * 五個大型技能循環：Lv20 血量越低傷害越高（封頂）→ Lv40 攻擊疊血印，滿層
 * 進入血腥狀態（吸血+增傷）→ Lv60 週期暗屬傷害+吸血 → Lv80 每場一次死亡
 * 保護 → Lv100 Ultimate 進化成持續黑暗領域。
 */
import type { ArenaGame } from '../ArenaGame'

const DEATH_WILL_MISSING_CAP = 0.7
const DEATH_WILL_DAMAGE_PER_MISSING = 0.4 / 0.7 * 0.7 // 損失70%時封頂+28%：0.28/0.7
const BLOOD_RUNE_MAX_STACKS = 5
const BLOOD_FRENZY_DURATION = 4
const BLOOD_FRENZY_LIFESTEAL = 0.15
const BLOOD_FRENZY_DAMAGE_MULT = 1.2
const DEATH_COIL_INTERVAL = 6
const DEATH_COIL_DAMAGE = 30
const DEATH_COIL_HEAL_PCT = 0.5
const UNDYING_GRACE_SEC = 3
const DOMAIN_DURATION = 5
const DOMAIN_SLOW = 0.25
const DOMAIN_DR = 0.20
const DOMAIN_LIFESTEAL = 0.15
const DOMAIN_KILL_EXTEND_SEC = 1.5

/** Lv20 死亡意志：血量越低傷害越高（封頂+28%），供 fireProjectileAt()/meleeAttackAt() 套用。 */
export function deathKnightDamageMult(game: ArenaGame): number {
  if (!game.unlockedMajorSkillIds.has('death_knight_lv20')) return 1
  const missingPct = Math.min(DEATH_WILL_MISSING_CAP, 1 - game.player.hp / game.player.maxHp)
  return 1 + missingPct * (DEATH_WILL_DAMAGE_PER_MISSING / DEATH_WILL_MISSING_CAP) * DEATH_WILL_MISSING_CAP
}

/** Lv40 鮮血符文：普攻疊血印，滿層進入血腥狀態。由 onAttackHit() 呼叫。 */
export function deathKnightOnHit(game: ArenaGame): void {
  if (!game.unlockedMajorSkillIds.has('death_knight_lv40')) return
  if (game.majorTimer > 0) return // 血腥狀態中不再疊層，等狀態結束重新累積
  game.majorStacks = Math.min(BLOOD_RUNE_MAX_STACKS, game.majorStacks + 1)
  if (game.majorStacks >= BLOOD_RUNE_MAX_STACKS) {
    game.majorTimer = BLOOD_FRENZY_DURATION
    game.spawnGlowBurst(game.player.x, game.player.y, 0xff2020, 60)
    game.spawnFloatingText('血腥狀態！', game.player.x, game.player.y - 40)
  }
}

/** 血腥狀態期間的傷害倍率/額外吸血，供 fireProjectileAt()/meleeAttackAt() 套用。 */
export function deathKnightFrenzyDamageMult(game: ArenaGame): number {
  return game.majorTimer > 0 ? BLOOD_FRENZY_DAMAGE_MULT : 1
}
export function deathKnightFrenzyLifesteal(game: ArenaGame): number {
  return game.majorTimer > 0 ? BLOOD_FRENZY_LIFESTEAL : 0
}

export function deathKnightMajorTick(game: ArenaGame, dt: number): void {
  if (game.majorTimer > 0) {
    game.majorTimer -= dt
    if (game.majorTimer <= 0) game.majorStacks = 0 // 血腥狀態結束，血印歸零重新累積
  }
  if (game.majorStacks2 > 0) game.majorStacks2 -= dt // Lv80 不死契約寬限視窗
  if (game.majorZoneTimer > 0) game.majorZoneTimer -= dt // Lv100 死亡領域持續時間

  // Lv60 死亡纏繞：週期暗屬傷害+吸血
  if (game.unlockedMajorSkillIds.has('death_knight_lv60')) {
    game.majorTimer2 -= dt
    if (game.majorTimer2 <= 0) {
      game.majorTimer2 = DEATH_COIL_INTERVAL
      const target = game.findNearestEnemy()
      if (target) {
        game.damageEnemy(target, DEATH_COIL_DAMAGE)
        game.player.hp = Math.min(game.player.maxHp, game.player.hp + DEATH_COIL_DAMAGE * DEATH_COIL_HEAL_PCT)
        game.spawnGlowBurst(target.x, target.y, 0x8a2020, 50)
      }
    }
  }
}

/**
 * Lv80 不死契約：受到致死傷害時保留1HP並進入短暫無法死亡，每場一次。由
 * damagePlayer() 在判斷 triggerGameOver() 前呼叫，true 代表已經接住這次死亡。
 */
export function deathKnightTryUndyingPact(game: ArenaGame): boolean {
  if (!game.unlockedMajorSkillIds.has('death_knight_lv80')) return false
  if (game.majorFlag) return false // 每場只能觸發一次
  game.majorFlag = true
  game.player.hp = 1
  game.majorStacks2 = UNDYING_GRACE_SEC
  game.spawnFloatingText('不死契約！', game.player.x, game.player.y - 40)
  return true
}

/** Lv100 死亡領域：Ultimate 進化，套用在 applyUltimateDamage() 裡。 */
export function deathKnightUltimateMastery(game: ArenaGame): void {
  if (!game.unlockedMajorSkillIds.has('death_knight_lv100')) return
  game.majorZoneTimer = Math.max(game.majorZoneTimer, DOMAIN_DURATION)
  game.spawnFloatingText('死亡領域！', game.player.x, game.player.y - 60)
}

/** 死亡領域期間：敵人減速，供 moveEnemyToward/moveEnemyAway 套用。 */
export function deathKnightDomainSlowMult(game: ArenaGame): number {
  return game.majorZoneTimer > 0 ? 1 - DOMAIN_SLOW : 1
}
/** 死亡領域期間：自身受到傷害減免，供 damagePlayer() 套用。 */
export function deathKnightDomainDR(game: ArenaGame): number {
  return game.majorZoneTimer > 0 ? DOMAIN_DR : 0
}
/** 死亡領域期間：造成傷害額外吸血，供 fireProjectileAt()/meleeAttackAt() 套用。 */
export function deathKnightDomainLifesteal(game: ArenaGame): number {
  return game.majorZoneTimer > 0 ? DOMAIN_LIFESTEAL : 0
}
/** 死亡領域期間：擊殺延長領域時間，由擊殺分支呼叫。 */
export function deathKnightOnKillExtendDomain(game: ArenaGame): void {
  if (game.majorZoneTimer > 0) game.majorZoneTimer += DOMAIN_KILL_EXTEND_SEC
}
