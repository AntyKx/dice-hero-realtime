/**
 * 皇家公主天賦系統 v2 職業機制。設計文件裡唯一一處把舊 Keystone 拆成兩格
 * 的英雄：Lv20 拿疊冰痕+減速的基礎版，Lv40 保留原技能名稱「皇家冰晶陣」、
 * 行為窄化為「滿層凍結」的進階付費——冰痕欄位（frostStacks/frozenTimer）
 * 兩格共用，沒有另外拆欄位。
 *
 * 五個大型技能循環：Lv20 疊冰痕減速 → Lv40 滿層凍結 → Lv60 命中凍結目標
 * 碎冰爆發+波及疊痕 → Lv80 敵人死亡冰痕擴散給鄰近敵人 → Lv100 Ultimate
 * 進化成範圍直接施加冰痕+延長凍結。
 */
import { ULTIMATE_RADIUS, type ArenaGame, type EnemyInstance } from '../ArenaGame'

const FROST_MAX_STACKS = 5
const SLOW_PER_STACK = 0.06
const SLOW_CAP = 0.30
const FREEZE_DURATION = 2
const SHATTER_DAMAGE_MULT = 1.5
const SHATTER_RADIUS = 80
const SHATTER_SPREAD_STACKS = 2
const SPREAD_ON_DEATH_TARGETS = 3
const SPREAD_ON_DEATH_STACKS = 1

/** Lv20/40 冰痕：普攻命中疊層，滿層時（若 Lv40 已解鎖）觸發凍結。由 onAttackHit() 呼叫。 */
export function princessOnHit(game: ArenaGame, e: EnemyInstance): void {
  if (game.unlockedMajorSkillIds.has('princess_lv20')) {
    e.frostStacks = Math.min(FROST_MAX_STACKS, e.frostStacks + 1)
  }
  if (game.unlockedMajorSkillIds.has('princess_lv40') && e.frostStacks >= FROST_MAX_STACKS) {
    e.frostStacks = 0
    e.frozenTimer = FREEZE_DURATION
    game.spawnGlowBurst(e.x, e.y, 0x8ad4ff, 50)
  }

  // Lv60 碎冰爆發：命中凍結中的敵人時提前結束凍結，造成爆炸傷害並波及鄰近敵人
  if (game.unlockedMajorSkillIds.has('princess_lv60') && e.frozenTimer > 0) {
    e.frozenTimer = 0
    const dmg = (game.cfg.atkDamage + game.bonusDamage) * SHATTER_DAMAGE_MULT
    game.damageEnemy(e, dmg)
    game.spawnGlowBurst(e.x, e.y, 0xbfe8ff, SHATTER_RADIUS)
    for (const other of game.enemies) {
      if (other.alive && other !== e && Math.hypot(other.x - e.x, other.y - e.y) <= SHATTER_RADIUS) {
        other.frostStacks = Math.min(FROST_MAX_STACKS, other.frostStacks + SHATTER_SPREAD_STACKS)
      }
    }
  }
}

/** Lv20 冰痕減速：供 moveEnemyToward/moveEnemyAway 套用在敵人移速上。 */
export function princessSlowMult(game: ArenaGame, e: EnemyInstance): number {
  if (!game.unlockedMajorSkillIds.has('princess_lv20') || e.frostStacks <= 0) return 1
  return 1 - Math.min(SLOW_CAP, e.frostStacks * SLOW_PER_STACK)
}

/** Lv80 冰痕擴散：敵人死亡時剩餘冰痕擴散給最近的鄰近敵人。由擊殺分支呼叫。 */
export function princessOnKill(game: ArenaGame, dead: EnemyInstance): void {
  if (!game.unlockedMajorSkillIds.has('princess_lv80') || dead.frostStacks <= 0) return
  const nearby = game.enemies
    .filter(e => e.alive && e !== dead)
    .sort((a, b) => Math.hypot(a.x - dead.x, a.y - dead.y) - Math.hypot(b.x - dead.x, b.y - dead.y))
    .slice(0, SPREAD_ON_DEATH_TARGETS)
  for (const e of nearby) e.frostStacks = Math.min(FROST_MAX_STACKS, e.frostStacks + SPREAD_ON_DEATH_STACKS)
}

/** Lv100 絕對零度：Ultimate 進化，套用在 applyUltimateDamage() 裡。 */
export function princessUltimateMastery(game: ArenaGame): void {
  if (!game.unlockedMajorSkillIds.has('princess_lv100')) return
  for (const e of game.enemies) {
    if (!e.alive) continue
    e.frostStacks = FROST_MAX_STACKS
    e.frozenTimer = FREEZE_DURATION * 2
  }
  game.spawnFloatingText('絕對零度！', game.player.x, game.player.y - 60)
}

// ── 職業裝備武器必殺技（2026-08）：跟上面 Lv100 Mastery 獨立疊加的一層。 ──

/** 武器 A 寒霜權杖：冰刃風暴，範圍內敵人追加穿透傷害。 */
export function princessFrostScepterUltimate(game: ArenaGame): void {
  for (const e of game.enemies) {
    if (!e.alive) continue
    if (Math.hypot(e.x - game.player.x, e.y - game.player.y) <= ULTIMATE_RADIUS) game.damageEnemy(e, 30)
  }
  game.spawnFloatingText('皇家冰晶陣！', game.player.x, game.player.y - 60)
}

/** 武器 B 永冬冰晶杖：極寒領域，範圍內敵人直接凍結。 */
export function princessIceStaffUltimate(game: ArenaGame): void {
  for (const e of game.enemies) {
    if (!e.alive) continue
    if (Math.hypot(e.x - game.player.x, e.y - game.player.y) <= ULTIMATE_RADIUS) {
      e.frostStacks = FROST_MAX_STACKS
      e.frozenTimer = Math.max(e.frozenTimer, FREEZE_DURATION * 1.5)
    }
  }
  game.spawnGlowBurst(game.player.x, game.player.y, 0x8ad4ff, ULTIMATE_RADIUS)
  game.spawnFloatingText('極寒凍界！', game.player.x, game.player.y - 60)
}
