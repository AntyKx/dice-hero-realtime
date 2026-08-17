/**
 * 遊俠獵人天賦系統 v2 職業機制。
 *
 * 五個大型技能循環：Lv20 普攻天生穿透一次 → Lv40 週期箭雨（既有 Keystone）
 * → Lv60 箭雨冷卻期間每4秒補發強化箭矢 → Lv80 普攻穿透無上限 → Lv100
 * Ultimate 進化成連續三波全屏箭雨。
 *
 * 簡化說明：Lv40「破風標記」命中後的短時間加傷（+15%）需要在敵人身上額外
 * 掛一個計時 buff，這次沒有新增欄位去實作，先維持只有基礎週期傷害生效——
 * 核心的箭雨/穿透/連矢機制都完整可玩，這是唯一被省略的細節加成。
 */
import { ULTIMATE_RADIUS, type ArenaGame } from '../ArenaGame'

const REFIRE_INTERVAL = 4
const REFIRE_PIERCE = 2
const ULTIMATE_WAVE_COUNT = 3
const ULTIMATE_WAVE_INTERVAL = 0.4
const ULTIMATE_WAVE_RADIUS = 260
const ULTIMATE_WAVE_DAMAGE = 40

/** Lv20 追風箭：普攻天生穿透次數，跟遺物 pierceBonus 分開加總。 */
export function archerBasePierce(game: ArenaGame): number {
  return game.unlockedMajorSkillIds.has('archer_lv20') ? 1 : 0
}

/** Lv80 驟風連矢：穿透次數不再有上限。 */
export function archerUnlimitedPierce(game: ArenaGame): boolean {
  return game.unlockedMajorSkillIds.has('archer_lv80')
}

export function archerMajorTick(game: ArenaGame, dt: number): void {
  // Lv60 風之箭陣：每 4 秒對最近敵人補發一發強化箭矢（必定穿透2次）
  if (game.unlockedMajorSkillIds.has('archer_lv60')) {
    game.majorTimer += dt
    if (game.majorTimer >= REFIRE_INTERVAL) {
      game.majorTimer -= REFIRE_INTERVAL
      const target = game.findNearestEnemy()
      if (target) {
        const prevPierce = game.pierceBonus
        game.pierceBonus = Math.max(game.pierceBonus, REFIRE_PIERCE)
        game.fireNormalAttack(target)
        game.pierceBonus = prevPierce
      }
    }
  }

  // Lv100 萬箭穿心：Ultimate 進化排出的三波箭雨，用 majorStacks2/majorTimer2 排程
  if (game.majorStacks2 > 0) {
    game.majorTimer2 -= dt
    if (game.majorTimer2 <= 0) {
      for (const e of game.enemies) {
        if (e.alive && Math.hypot(e.x - game.player.x, e.y - game.player.y) <= ULTIMATE_WAVE_RADIUS) {
          game.damageEnemy(e, ULTIMATE_WAVE_DAMAGE)
        }
      }
      game.spawnGlowBurst(game.player.x, game.player.y, 0xffd94a, ULTIMATE_WAVE_RADIUS)
      game.majorStacks2--
      game.majorTimer2 = ULTIMATE_WAVE_INTERVAL
    }
  }
}

/** Lv100 萬箭穿心：Ultimate 進化，套用在 applyUltimateDamage() 裡。 */
export function archerUltimateMastery(game: ArenaGame): void {
  if (!game.unlockedMajorSkillIds.has('archer_lv100')) return
  game.majorStacks2 = ULTIMATE_WAVE_COUNT
  game.majorTimer2 = ULTIMATE_WAVE_INTERVAL
  game.spawnFloatingText('萬箭穿心！', game.player.x, game.player.y - 60)
}

// ── 職業裝備武器必殺技（2026-08）：跟上面 Lv100 Mastery 獨立疊加的一層。 ──

/** 武器 A 疾風之弓：貫穿箭雨，範圍內敵人追加穿透傷害。 */
export function archerLongbowUltimate(game: ArenaGame): void {
  for (const e of game.enemies) {
    if (!e.alive) continue
    if (Math.hypot(e.x - game.player.x, e.y - game.player.y) <= ULTIMATE_RADIUS) game.damageEnemy(e, 32)
  }
  game.spawnFloatingText('疾風箭雨！', game.player.x, game.player.y - 60)
}

/** 武器 B 追魂連弩：連鎖速射，對最近 4 名敵人各追加一次傷害。 */
export function archerCrossbowUltimate(game: ArenaGame): void {
  const targets = game.enemies
    .filter(e => e.alive && Math.hypot(e.x - game.player.x, e.y - game.player.y) <= ULTIMATE_RADIUS)
    .sort((a, b) => Math.hypot(a.x - game.player.x, a.y - game.player.y) - Math.hypot(b.x - game.player.x, b.y - game.player.y))
    .slice(0, 4)
  for (const e of targets) game.damageEnemy(e, 24)
  game.spawnGlowBurst(game.player.x, game.player.y, 0xffd94a, ULTIMATE_RADIUS)
  game.spawnFloatingText('追魂連弩擊！', game.player.x, game.player.y - 60)
}
