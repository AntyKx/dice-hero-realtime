/**
 * 機關技師天賦系統 v2 職業機制。
 *
 * 五個大型技能循環：Lv20 熱能滿層確定觸發額外砲彈（跟Lv40機率制獨立疊加）
 * → Lv40 機率額外砲彈（既有Keystone）→ Lv60 額外砲彈機率部署自動炮塔 →
 * Lv80 額外砲彈傷害強化 → Lv100 Ultimate 進化成快速開火的強化炮塔。
 *
 * 簡化說明：自動炮塔沒有另外做一個 Pixi 物件/Sprite，用「持續時間內每隔
 * 固定秒數對最近敵人造成傷害+光效」表示，同一時間只會有一座炮塔在跑
 * （重複部署只會刷新持續時間），不做多炮塔同時存在——這是這次唯一被簡化
 * 掉的細節，核心的熱能/機率砲擊/炮塔仍然完整可玩。
 */
import type { ArenaGame } from '../ArenaGame'

const HEAT_MAX = 5
const TURRET_DEPLOY_CHANCE = 0.40
const TURRET_DURATION = 4
const TURRET_FIRE_INTERVAL = 0.8
const TURRET_HASTE_FIRE_INTERVAL = 0.4
const TURRET_DAMAGE = 12
const OVERCHARGE_BONUS_DAMAGE_MULT = 1.3
const ULTIMATE_HASTE_DURATION = 6

/** Lv20 熱能超載：每次普攻完整觸發疊1層熱能，滿層自動觸發額外砲彈。由 updateAutoAttack() 呼叫。 */
export function engineerOnAttackFired(game: ArenaGame): void {
  if (!game.unlockedMajorSkillIds.has('engineer_lv20')) return
  game.majorStacks++
  if (game.majorStacks < HEAT_MAX) return
  game.majorStacks = 0
  const target = game.findNearestEnemy()
  if (target) {
    game.fireNormalAttack(target)
    triggerBonusShotEffects(game)
  }
}

/** Lv40 機率額外砲彈觸發時（既有 Keystone），一併判定是否部署炮塔。由 updateAutoAttack() 呼叫。 */
export function engineerOnBonusShot(game: ArenaGame): void {
  triggerBonusShotEffects(game)
}

function triggerBonusShotEffects(game: ArenaGame): void {
  if (!game.unlockedMajorSkillIds.has('engineer_lv60')) return
  if (Math.random() >= TURRET_DEPLOY_CHANCE) return
  game.majorZoneTimer = TURRET_DURATION // 借用欄位表示炮塔剩餘持續時間
  game.spawnGlowBurst(game.player.x, game.player.y, 0x80a0c0, 40)
}

export function engineerMajorTick(game: ArenaGame, dt: number): void {
  if (game.majorTimer2 > 0) game.majorTimer2 -= dt // Lv100 超頻視窗
  if (game.majorZoneTimer <= 0) return
  game.majorZoneTimer -= dt
  game.majorTimer += dt
  const interval = game.majorTimer2 > 0 ? TURRET_HASTE_FIRE_INTERVAL : TURRET_FIRE_INTERVAL
  if (game.majorTimer < interval) return
  game.majorTimer -= interval
  const target = game.findNearestEnemy()
  if (target) {
    const dmg = TURRET_DAMAGE * (game.unlockedMajorSkillIds.has('engineer_lv80') ? OVERCHARGE_BONUS_DAMAGE_MULT : 1)
    game.damageEnemy(target, dmg)
    game.spawnGlowBurst(target.x, target.y, 0x80a0c0, 30)
  }
}

/** Lv100 機甲降臨：Ultimate 進化，套用在 applyUltimateDamage() 裡。 */
export function engineerUltimateMastery(game: ArenaGame): void {
  if (!game.unlockedMajorSkillIds.has('engineer_lv100')) return
  game.majorZoneTimer = ULTIMATE_HASTE_DURATION
  game.majorTimer2 = ULTIMATE_HASTE_DURATION
  game.spawnFloatingText('機甲降臨！', game.player.x, game.player.y - 60)
}
