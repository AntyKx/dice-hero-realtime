/**
 * 影刃刺客天賦系統 v2 職業機制。刺客是全樹唯一觸碰「站穩才能攻擊」核心
 * 規則的英雄（Lv20 影襲步），其餘天賦一律不碰那條規則。
 *
 * 五個大型技能循環：Lv20 命中後短暫加速+免站穩延遲 → Lv40 機率追加攻擊
 * （觸發時刷新加速視窗）→ Lv60 命中疊暗影標記滿層引爆 → Lv80 機率瞬移
 * 背後突襲必定觸發追加攻擊 → Lv100 Ultimate 進化成多重殘影 AoE。
 */
import type { ArenaGame, EnemyInstance } from '../ArenaGame'

const SPEED_WINDOW_SEC = 1.5
const SPEED_BONUS = 0.25
const SHADOW_MARK_MAX = 3
const SHADOW_MARK_BURST_MULT = 0.3 * 3 // 近似「標記期間累積傷害30%」：用3次普攻傷害估算，避免另加逐次傷害累積欄位
const TELEPORT_CHANCE = 0.10

/** Lv20 影襲步：普通攻擊真正發射時觸發（由 ArenaGame.fireNormalAttack() 呼叫）。 */
export function rogueOnAttackFired(game: ArenaGame): void {
  if (!game.unlockedMajorSkillIds.has('rogue_lv20')) return
  game.majorTimer = SPEED_WINDOW_SEC
  game.majorFlag = true // 下一次攻擊免除站穩延遲
}

/** 影襲步視窗期間的移動速度加成，供 updatePlayerMovement() 讀取套用。 */
export function rogueSpeedBonus(game: ArenaGame): number {
  return game.unlockedMajorSkillIds.has('rogue_lv20') && game.majorTimer > 0 ? SPEED_BONUS : 0
}

/**
 * 影襲步視窗期間免除站穩延遲：updateAutoAttack() 在判斷 ATTACK_READY_DELAY
 * 前呼叫這個，true 代表這次不用管站穩時間（消耗一次）。
 */
export function rogueConsumeAttackReadySkip(game: ArenaGame): boolean {
  if (!game.majorFlag) return false
  game.majorFlag = false
  return true
}

export function rogueMajorTick(game: ArenaGame, dt: number): void {
  if (game.majorTimer > 0) game.majorTimer -= dt
}

/** Lv60 血影爆擊：攻擊命中疊暗影標記，滿層引爆。由 onAttackHit() 呼叫。 */
export function rogueOnHit(game: ArenaGame, e: EnemyInstance): void {
  if (!game.unlockedMajorSkillIds.has('rogue_lv60')) return
  e.shadowMarkStacks++
  if (e.shadowMarkStacks < SHADOW_MARK_MAX) return
  e.shadowMarkStacks = 0
  const burst = (game.cfg.atkDamage + game.bonusDamage) * SHADOW_MARK_BURST_MULT
  game.damageEnemy(e, burst)
  game.spawnGlowBurst(e.x, e.y, 0x8a3cff, 50)
}

/**
 * Lv80 瞬影突襲：攻擊發射瞬間機率觸發，瞬移到目標背後並必定追加一次攻擊。
 * 由 ArenaGame.fireNormalAttack() 呼叫，回傳 true 代表已經觸發（呼叫端不用
 * 再做別的事，這裡已經自己補了一次攻擊）。
 */
export function rogueTryTeleportStrike(game: ArenaGame, target: EnemyInstance): boolean {
  if (!game.unlockedMajorSkillIds.has('rogue_lv80')) return false
  if (Math.random() >= TELEPORT_CHANCE) return false
  const dx = game.player.x - target.x
  const dy = game.player.y - target.y
  const len = Math.hypot(dx, dy) || 1
  const behindDist = 40
  game.player.x = target.x - (dx / len) * behindDist
  game.player.y = target.y - (dy / len) * behindDist
  game.spawnGlowBurst(game.player.x, game.player.y, 0x8a3cff, 40)
  game.fireNormalAttack(target)
  return true
}

/** Lv100 百影夜襲：Ultimate 進化，套用在 applyUltimateDamage() 裡。 */
export function rogueUltimateMastery(game: ArenaGame): void {
  if (!game.unlockedMajorSkillIds.has('rogue_lv100')) return
  game.majorTimer = SPEED_WINDOW_SEC * 2
  game.spawnFloatingText('百影夜襲！', game.player.x, game.player.y - 60)
}
