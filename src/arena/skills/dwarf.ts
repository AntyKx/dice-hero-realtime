/**
 * 矮人戰士天賦系統 v2 職業機制。刻意跟聖騎士區隔：矮人靠「每一下都很痛+
 * 短暫硬直」立足，不是減傷苟活——重擊蓄力本身不需要額外的蓄力狀態機，
 * 因為矮人（近戰）本來就只有站穩才能出手，每一擊天生就是「已蓄力」。
 * 硬直沿用皇家公主凍結用的 frozenTimer（updateEnemies() 對 frozenTimer>0
 * 的處理跟「硬直」語意完全一致：原地不動、AI 狀態機暫停）。
 *
 * 五個大型技能循環：Lv20 攻擊天生強化+短暫硬直 → Lv40 破甲（既有Keystone，
 * 蓄力重擊命中額外多疊1層）→ Lv60 命中額外範圍震盪+硬直 → Lv80 破甲滿層
 * 獲得減傷 → Lv100 Ultimate 進化成大範圍硬直+冷卻歸零。
 */
import type { ArenaGame, EnemyInstance } from '../ArenaGame'

const CHARGED_DAMAGE_MULT = 1.4
const STAGGER_NORMAL = 0.3
const STAGGER_BOSS = 0.1 // Boss 硬直抗性：短很多，避免大招/一般怪同樣硬直時間卡死Boss戰
const QUAKE_RADIUS = 70
const QUAKE_DAMAGE_MULT = 0.5
const ROCK_ARMOR_DR = 0.15
const ROCK_ARMOR_TRIGGER_STACKS = 3
const ULTIMATE_STAGGER_RADIUS = QUAKE_RADIUS * 2
const ULTIMATE_STAGGER_DURATION = 0.6

function staggerDuration(e: EnemyInstance): number {
  return e.isBoss ? STAGGER_BOSS : STAGGER_NORMAL
}

/** Lv20 重擊蓄力：矮人每次攻擊天生就是「已蓄力」，直接加成傷害倍率。 */
export function dwarfChargedDamageMult(game: ArenaGame): number {
  return game.unlockedMajorSkillIds.has('dwarf_lv20') ? CHARGED_DAMAGE_MULT : 1
}

/** Lv20 硬直／Lv40 破甲連動／Lv60 地震波／Lv80 巨岩護甲觸發。由 onAttackHit() 呼叫。 */
export function dwarfOnHit(game: ArenaGame, e: EnemyInstance): void {
  if (game.unlockedMajorSkillIds.has('dwarf_lv20')) {
    e.frozenTimer = Math.max(e.frozenTimer, staggerDuration(e))
    if (game.unlockedMajorSkillIds.has('dwarf_lv40')) e.armorBreakStacks = Math.min(3, e.armorBreakStacks + 1)
  }
  if (game.unlockedMajorSkillIds.has('dwarf_lv60')) {
    const dmg = (game.cfg.atkDamage + game.bonusDamage) * QUAKE_DAMAGE_MULT
    for (const other of game.enemies) {
      if (other.alive && other !== e && Math.hypot(other.x - e.x, other.y - e.y) <= QUAKE_RADIUS) {
        game.damageEnemy(other, dmg)
        other.frozenTimer = Math.max(other.frozenTimer, staggerDuration(other))
      }
    }
    game.spawnGlowBurst(e.x, e.y, 0xffcf6b, QUAKE_RADIUS)
  }
  if (game.unlockedMajorSkillIds.has('dwarf_lv80') && e.armorBreakStacks >= ROCK_ARMOR_TRIGGER_STACKS) {
    game.majorFlag = true
  }
}

/** Lv80 不可動搖：巨岩護甲減傷，供 damagePlayer() 套用。 */
export function dwarfRockArmorDR(game: ArenaGame): number {
  return game.unlockedMajorSkillIds.has('dwarf_lv80') && game.majorFlag ? ROCK_ARMOR_DR : 0
}

/** Lv100 山嶽崩塌：Ultimate 進化，套用在 applyUltimateDamage() 裡。 */
export function dwarfUltimateMastery(game: ArenaGame): void {
  if (!game.unlockedMajorSkillIds.has('dwarf_lv100')) return
  for (const e of game.enemies) {
    if (e.alive && Math.hypot(e.x - game.player.x, e.y - game.player.y) <= ULTIMATE_STAGGER_RADIUS) {
      e.frozenTimer = Math.max(e.frozenTimer, ULTIMATE_STAGGER_DURATION)
    }
  }
  game.player.atkTimer = 0
  game.spawnFloatingText('山嶽崩塌！', game.player.x, game.player.y - 60)
}
