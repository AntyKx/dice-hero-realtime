/**
 * 吟遊詩人天賦系統 v2 職業機制。核心是「攻擊次數形成節奏」：beatCount 在
 * 1~4 循環，第4拍額外爆發，走完一整輪疊迴響層數，滿層時安可加倍。
 *
 * 五個大型技能循環：Lv20 節拍第4拍爆發 → Lv40 回血（既有Keystone，第4拍
 * 必定觸發）→ Lv60 完整循環疊攻擊力迴響 → Lv80 迴響滿層安可雙倍爆發+回血
 * → Lv100 Ultimate 進化：節拍與迴響瞬間預填，循環縮短。
 */
import { ULTIMATE_RADIUS, type ArenaGame, type EnemyInstance } from '../ArenaGame'

const BEAT_MAX = 4
const BEAT_BURST_MULT = 0.5
const BEAT_BURST_RADIUS = 70
const ECHO_MAX_STACKS = 5
const ECHO_DECAY_SEC = 8
const ECHO_ATK_PCT_PER_STACK = 0.03
const ENCORE_BURST_MULT = 2
const ENCORE_HEAL_PCT = 0.15
const ULTIMATE_SHORT_CYCLE_SEC = 8
const SHORT_BEAT_MAX = 2

function beatMax(game: ArenaGame): number {
  return game.majorTimer2 > 0 ? SHORT_BEAT_MAX : BEAT_MAX
}

/** Lv20 旋律：普攻命中推進節拍，第4拍額外範圍爆發。由 onAttackHit() 呼叫。 */
export function bardOnHit(game: ArenaGame, e: EnemyInstance): boolean {
  if (!game.unlockedMajorSkillIds.has('bard_lv20')) return false
  game.beatCount++
  const max = beatMax(game)
  if (game.beatCount < max) return false
  game.beatCount = 0

  // Lv60 戰歌迴響：走完一整輪節拍疊層
  if (game.unlockedMajorSkillIds.has('bard_lv60')) {
    game.majorStacks = Math.min(ECHO_MAX_STACKS, game.majorStacks + 1)
    game.majorTimer = ECHO_DECAY_SEC
  }

  let mult = BEAT_BURST_MULT
  let healPct = 0
  if (game.unlockedMajorSkillIds.has('bard_lv80') && game.majorStacks >= ECHO_MAX_STACKS) {
    mult *= ENCORE_BURST_MULT
    healPct = ENCORE_HEAL_PCT
    game.majorStacks = 0
    game.spawnFloatingText('安可！', game.player.x, game.player.y - 40)
  }

  const dmg = (game.cfg.atkDamage + game.bonusDamage) * mult
  for (const other of game.enemies) {
    if (other.alive && Math.hypot(other.x - e.x, other.y - e.y) <= BEAT_BURST_RADIUS) game.damageEnemy(other, dmg)
  }
  if (healPct > 0) game.player.hp = Math.min(game.player.maxHp, game.player.hp + game.player.maxHp * healPct)
  game.spawnGlowBurst(e.x, e.y, 0xffe9a8, BEAT_BURST_RADIUS)
  return true // 第4拍已觸發，供 Lv40 連動判斷是否要保底觸發回血
}

export function bardMajorTick(game: ArenaGame, dt: number): void {
  if (game.majorTimer > 0) {
    game.majorTimer -= dt
    if (game.majorTimer <= 0) game.majorStacks = 0 // 迴響衰減
  }
  if (game.majorTimer2 > 0) game.majorTimer2 -= dt // Lv100 短循環視窗
}

/** Lv60 戰歌迴響：每層攻擊力 +3%，供 fireNormalAttack() 套用在傷害倍率上。 */
export function bardEchoDamageMult(game: ArenaGame): number {
  if (!game.unlockedMajorSkillIds.has('bard_lv60')) return 1
  return 1 + game.majorStacks * ECHO_ATK_PCT_PER_STACK
}

/** Lv100 終章協奏：Ultimate 進化，套用在 applyUltimateDamage() 裡。 */
export function bardUltimateMastery(game: ArenaGame): void {
  if (!game.unlockedMajorSkillIds.has('bard_lv100')) return
  game.beatCount = BEAT_MAX
  game.majorStacks = ECHO_MAX_STACKS
  game.majorTimer = ECHO_DECAY_SEC
  game.majorTimer2 = ULTIMATE_SHORT_CYCLE_SEC
  game.spawnFloatingText('終章協奏！', game.player.x, game.player.y - 60)
}

// ── 職業裝備武器必殺技（2026-08）：跟上面 Lv100 Mastery 獨立疊加的一層。 ──

/** 武器 A 戰歌豎琴：戰歌爆發，自我回復＋範圍內敵人受到追加傷害。 */
export function bardHarpUltimate(game: ArenaGame): void {
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + game.player.maxHp * 0.2)
  for (const e of game.enemies) {
    if (!e.alive) continue
    if (Math.hypot(e.x - game.player.x, e.y - game.player.y) <= ULTIMATE_RADIUS) game.damageEnemy(e, 20)
  }
  game.spawnGlowBurst(game.player.x, game.player.y, 0xffe9a8, ULTIMATE_RADIUS)
  game.spawnFloatingText('戰歌奏鳴！', game.player.x, game.player.y - 60)
}

/** 武器 B 悲鳴魯特琴：悲鳴領域，範圍內敵人追加傷害＋長硬直削弱。 */
export function bardLuteUltimate(game: ArenaGame): void {
  for (const e of game.enemies) {
    if (!e.alive) continue
    if (Math.hypot(e.x - game.player.x, e.y - game.player.y) <= ULTIMATE_RADIUS) {
      game.damageEnemy(e, 25)
      e.attackCooldown += 1.5
    }
  }
  game.spawnFloatingText('悲鳴輓歌！', game.player.x, game.player.y - 60)
}
