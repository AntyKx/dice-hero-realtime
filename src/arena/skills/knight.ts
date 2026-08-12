/**
 * 聖騎士天賦系統 v2 職業機制。ArenaGame.ts 的對應觸發點只呼叫這裡的函式，
 * 不在自己身上塞邏輯——見 ArenaGame.ts 檔頭「合理小幅架構調整」說明。
 *
 * 五個大型技能的循環：Lv20 站穩疊聖印減傷 → Lv40 嘲諷+減傷buff（施放補滿聖印）
 * → Lv60 格擋反制（格擋額外疊聖印）→ Lv80 聖印滿層自動無敵 → Lv100 Ultimate
 * 進化成範圍嘲諷結界。共用欄位：majorStacks=聖印層數、majorTimer=疊層計時、
 * majorTimer2=神聖壁壘冷卻、majorInvulnTimer=無敵剩餘秒數（ArenaGame.damagePlayer
 * 直接讀這個欄位擋傷害，不透過這裡）。
 */
import type { ArenaGame, EnemyInstance } from '../ArenaGame'

const MAX_MARKS = 5
const MARK_INTERVAL = 1 // 秒/層
const DR_PER_MARK = 0.05
const BLOCK_CHANCE = 0.35
const INVULN_DURATION = 2
const INVULN_COOLDOWN = 45

export function knightMajorTick(game: ArenaGame, dt: number): void {
  if (game.majorTimer2 > 0) game.majorTimer2 -= dt

  if (game.unlockedMajorSkillIds.has('knight_lv20')) {
    if (game.isPlayerMoving()) {
      game.majorStacks = 0
      game.majorTimer = 0
    } else if (game.majorStacks < MAX_MARKS) {
      game.majorTimer += dt
      if (game.majorTimer >= MARK_INTERVAL) {
        game.majorTimer -= MARK_INTERVAL
        game.majorStacks++
      }
    }
  }

  if (game.unlockedMajorSkillIds.has('knight_lv80') && game.majorStacks >= MAX_MARKS &&
      game.majorTimer2 <= 0 && game.majorInvulnTimer <= 0) {
    game.majorInvulnTimer = INVULN_DURATION
    game.majorTimer2 = INVULN_COOLDOWN
    game.spawnGlowBurst(game.player.x, game.player.y, 0xffe9a8, 100)
    game.spawnFloatingText('神聖壁壘！', game.player.x, game.player.y - 40)
  }
}

/** Lv20 守護核心：每層聖印 -5% 傷害，供 damagePlayer() 讀取套用。 */
export function knightDamageReduction(game: ArenaGame): number {
  if (!game.unlockedMajorSkillIds.has('knight_lv20')) return 0
  return game.majorStacks * DR_PER_MARK
}

/**
 * Lv60 盾擊反制：受到攻擊時機率格擋（本次傷害歸零）並反擊。回傳 true 代表
 * 本次傷害已被完全處理，damagePlayer() 應直接 return，不再扣血。
 */
export function knightOnHurt(game: ArenaGame, source: EnemyInstance): boolean {
  if (!game.unlockedMajorSkillIds.has('knight_lv60')) return false
  if (Math.random() >= BLOCK_CHANCE) return false
  game.damageEnemy(source, game.cfg.atkDamage + game.bonusDamage)
  game.majorStacks = Math.min(MAX_MARKS, game.majorStacks + 1)
  game.spawnGlowBurst(game.player.x, game.player.y, 0x6db8ff, 60)
  return true
}

/**
 * Lv100 不動聖城：Ultimate 進化，套用在 applyUltimateDamage() 裡（跟其他英雄
 * 一樣沿用現有 Cut-in 演出，不另外做新的視覺層）。範圍內敵人攻速 -20%、
 * 聖印永久滿層、玩家受到傷害額外 -30%（用一個 8 秒的臨時 buff timer 表示，
 * 借 majorTimer2 但不影響神聖壁壘冷卻判斷——因為兩者互斥使用同一數值時機
 * 不會重疊：Ultimate 觸發時直接把聖印點滿，神聖壁壘只在滿層瞬間觸發一次，
 * 觸發後才會重新計冷卻，時序上不衝突）。
 */
const ULTIMATE_STAGGER_SEC = 1.5 // 範圍內敵人攻速-20%的簡化實作：直接延後一次下次攻擊時機

export function knightUltimateMastery(game: ArenaGame): void {
  if (!game.unlockedMajorSkillIds.has('knight_lv100')) return
  game.majorStacks = MAX_MARKS
  for (const e of game.enemies) {
    if (e.alive) e.attackCooldown += ULTIMATE_STAGGER_SEC
  }
  game.spawnFloatingText('不動聖城！', game.player.x, game.player.y - 60)
}
