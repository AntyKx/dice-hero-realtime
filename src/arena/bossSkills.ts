/**
 * Boss 三階段技能資料表。純資料，執行邏輯（怎麼畫 telegraph、怎麼結算傷害）
 * 在 ArenaGame.ts 依 `kind` 分派。三個階段對應血量 100~70% / 70~35% / 35~0%
 * （見 ArenaGame.ts 的 bossPhase 計算）。
 *
 * kind 對照執行方式：
 *   circle_aoe  → circle telegraph，resolve 時玩家在範圍內才傷
 *   cone_breath → cone telegraph，resolve 時玩家在扇形內才傷
 *   fire_floor  → circle telegraph，resolve 後在原地留一個 hazard（持續 dps）
 *   cross_slam  → 4 條十字方向的 line telegraph 同時觸發
 *   quake       → 連續 `count` 次 circle telegraph（隨機偏移點）
 *   charge      → 沿用 Charge AI 的 line telegraph + 衝刺邏輯
 *   projectile  → 直接發射 EnemyProjectile，沒有 telegraph
 *   summon_cores → 森林遺跡新增（2026-08，見古樹守衛）：telegraph 後在 Boss 附近
 *                  召喚 `summonCount` 個 `summonTypeId` 子物件（走既有 summonedBy
 *                  連動，見 ArenaGame.ts damageEnemy() 的減傷判斷），這段期間
 *                  同一隻 Boss 不會重複觸發這個技能（見 tryCastBossSkill 的過濾）。
 *   guard_counter → 森林遺跡新增（2026-08，見黑騎士先鋒）：沒有 telegraph，Boss
 *                  直接進入 `guardWindowSec` 秒的格擋狀態；這段期間玩家打中 Boss
 *                  不會造成傷害，改觸發反擊（見 ArenaGame.ts damageEnemy() 開頭
 *                  的攔截）。教學目的是「這時候不該攻擊」，不是要玩家閃避什麼。
 *   summon      → 森林遺跡新增（2026-08，見森林巨龍 Phase2+）：跟 summon_cores
 *                  同樣走 spawnEnemyOfType()，但不掛 summonedBy 減傷語意、也不
 *                  限制重複觸發——純粹的戰場壓力，數量刻意壓低（見設計文件
 *                  「不要塞怪海」原則）。
 */

export type BossSkillKind =
  | 'circle_aoe' | 'cone_breath' | 'fire_floor' | 'cross_slam' | 'quake' | 'charge' | 'projectile'
  | 'summon_cores' | 'guard_counter' | 'summon'

export interface BossSkillDef {
  id: string
  kind: BossSkillKind
  telegraphSec: number
  damage: number
  radius: number        // circle/cone/quake/hazard/projectile 判定半徑
  coneAngleDeg?: number  // cone_breath 用，扇形張角
  count?: number         // quake 用，重複次數
  hazardDurationSec?: number // fire_floor 用
  hazardDps?: number
  /** fire_floor 用：留下的地板種類（不寫則沿用舊行為 'fire'），森林遺跡的
   * 樹根/毒霧地板技能靠這個欄位重用同一個 kind，不用另開新 BossSkillKind。 */
  hazardKind?: 'fire' | 'poison' | 'thorn' | 'root'
  hazardSlowMult?: number
  hazardRootSec?: number
  /** summon_cores/summon 共用。 */
  summonCount?: number
  summonTypeId?: string
  /** guard_counter 用：格擋狀態持續秒數。 */
  guardWindowSec?: number
  /** circle_aoe/cone_breath 選用：命中時把玩家往外推開的距離（px），森林巨龍
   * Wing Gust 用——是位移不是傷害，Telegraph/傷害邏輯完全不變。 */
  pushback?: number
  cooldownSec: number
}

const DRAGON_FIREBALL_AOE: BossSkillDef = {
  id: 'dragon_fireball', kind: 'circle_aoe', telegraphSec: 0.9, damage: 26, radius: 85, cooldownSec: 2.4,
}
const DRAGON_CONE_BREATH: BossSkillDef = {
  id: 'dragon_breath', kind: 'cone_breath', telegraphSec: 0.8, damage: 22, radius: 220, coneAngleDeg: 70, cooldownSec: 3.2,
}
const DRAGON_FIRE_FLOOR: BossSkillDef = {
  id: 'dragon_fire_floor', kind: 'fire_floor', telegraphSec: 0.9, damage: 0, radius: 75,
  hazardDurationSec: 4, hazardDps: 10, cooldownSec: 3.6,
}
const DRAGON_CHARGE: BossSkillDef = {
  id: 'dragon_charge', kind: 'charge', telegraphSec: 0.7, damage: 30, radius: 45, cooldownSec: 4.5,
}

const GOLEM_GROUND_SLAM: BossSkillDef = {
  id: 'golem_slam', kind: 'circle_aoe', telegraphSec: 1.0, damage: 30, radius: 95, cooldownSec: 2.6,
}
const GOLEM_CROSS_SLAM: BossSkillDef = {
  id: 'golem_cross', kind: 'cross_slam', telegraphSec: 0.9, damage: 24, radius: 260, cooldownSec: 4.0,
}
const GOLEM_QUAKE: BossSkillDef = {
  id: 'golem_quake', kind: 'quake', telegraphSec: 0.7, damage: 26, radius: 90, count: 3, cooldownSec: 5.0,
}

const ICE_WITCH_BOLT: BossSkillDef = {
  id: 'ice_witch_bolt', kind: 'projectile', telegraphSec: 0, damage: 18, radius: 10, cooldownSec: 1.4,
}
const ICE_WITCH_RING: BossSkillDef = {
  id: 'ice_witch_ring', kind: 'circle_aoe', telegraphSec: 1.1, damage: 24, radius: 100, cooldownSec: 3.4,
}
const ICE_WITCH_MULTI_RING: BossSkillDef = {
  id: 'ice_witch_multi_ring', kind: 'quake', telegraphSec: 0.9, damage: 20, radius: 80, count: 4, cooldownSec: 5.5,
}

// ══════════════════════════════════════════════════════════════════════════
// 森林遺跡固定式主線關卡（2026-08，見 src/campaign/）Boss 技能。跟上面
// dragon/golem/ice_witch 三隻 Roguelite Boss 完全獨立，只會被 forestRuins.ts
// 點名的 CampaignStage.boss 用到。
// ══════════════════════════════════════════════════════════════════════════

// 1-5/1-18 狂暴獸人隊長：Phase1 只有重斧，Phase2（≤70% HP）起加上 Charge——
// 教學目的是 Dodge，第一次逼玩家「整個離開範圍」而不是靠站樁輸出硬吃。
const ORC_CHIEFTAIN_AXE: BossSkillDef = {
  id: 'orc_chieftain_axe', kind: 'circle_aoe', telegraphSec: 1.1, damage: 24, radius: 90, cooldownSec: 2.8,
}
const ORC_CHIEFTAIN_CHARGE: BossSkillDef = {
  id: 'orc_chieftain_charge', kind: 'charge', telegraphSec: 0.7, damage: 28, radius: 45, cooldownSec: 4.2,
}

// 1-10 古樹守衛：Branch Sweep（大角度近戰）／Root Burst（腳下留一灘短暫樹根，
// 不是純粹傷害）／Life Core（召喚 3 個 Root Core，存在時 Boss 減傷，逼玩家
// 切換目標——教學目的是 Mechanic Target）。
const ANCIENT_TREANT_SWEEP: BossSkillDef = {
  id: 'ancient_treant_sweep', kind: 'cone_breath', telegraphSec: 1.0, damage: 22, radius: 150, coneAngleDeg: 130, cooldownSec: 3.0,
}
const ANCIENT_TREANT_ROOT_BURST: BossSkillDef = {
  id: 'ancient_treant_root_burst', kind: 'fire_floor', telegraphSec: 0.9, damage: 0, radius: 70,
  hazardDurationSec: 3, hazardKind: 'root', hazardRootSec: 1.2, cooldownSec: 3.6,
}
const ANCIENT_TREANT_LIFE_CORE: BossSkillDef = {
  id: 'ancient_treant_life_core', kind: 'summon_cores', telegraphSec: 1.2, damage: 0, radius: 0,
  summonCount: 3, summonTypeId: 'root_core', cooldownSec: 22,
}

// 1-15 黑騎士先鋒：Great Sword Slash／Dark Shockwave／Black Steel Counter——
// Counter 沒有傷害也沒有 Telegraph（格擋本身就是預警），教學目的是「這時候
// 不該攻擊」，是全戰役第一個「玩家自己的攻擊也可能是錯誤決策」的 Boss。
const DARK_KNIGHT_VANGUARD_SLASH: BossSkillDef = {
  id: 'dark_knight_vanguard_slash', kind: 'circle_aoe', telegraphSec: 0.9, damage: 26, radius: 85, cooldownSec: 2.6,
}
const DARK_KNIGHT_VANGUARD_SHOCKWAVE: BossSkillDef = {
  id: 'dark_knight_vanguard_shockwave', kind: 'circle_aoe', telegraphSec: 1.1, damage: 22, radius: 140, cooldownSec: 3.8,
}
const DARK_KNIGHT_VANGUARD_COUNTER: BossSkillDef = {
  id: 'dark_knight_vanguard_counter', kind: 'guard_counter', telegraphSec: 0, damage: 0, radius: 0,
  guardWindowSec: 1.3, cooldownSec: 6.5,
}

// 1-20 森林巨龍：Phase1「Forest Guardian」只有三招基本盤（Claw/Tail Swipe/
// Forest Breath——第三星條件的判定來源）；Phase2（70%起）加 Wing Gust（純
// 擊退，不是傷害威脅）／Hazard Ground（小範圍地板，數量刻意壓低）／Summon
// （2~3隻森林小怪，不塞怪海）；Phase3（35%起，逼近設計文件的「30%」門檻）
// 換上張角更寬的 Forest Breath，其餘技能沿用 Phase2 池子——cooldown 加快
// 已經由 tryCastBossSkill() 的 PHASE3_COOLDOWN_MULT 統一處理，這裡不用重複算。
const FOREST_DRAGON_CLAW: BossSkillDef = {
  id: 'forest_dragon_claw', kind: 'circle_aoe', telegraphSec: 0.8, damage: 24, radius: 90, cooldownSec: 2.4,
}
const FOREST_DRAGON_TAIL_SWIPE: BossSkillDef = {
  id: 'forest_dragon_tail_swipe', kind: 'cone_breath', telegraphSec: 0.9, damage: 22, radius: 160, coneAngleDeg: 110, cooldownSec: 3.2,
}
const FOREST_DRAGON_BREATH: BossSkillDef = {
  id: 'forest_dragon_breath', kind: 'cone_breath', telegraphSec: 1.0, damage: 30, radius: 240, coneAngleDeg: 75, cooldownSec: 4.0,
}
const FOREST_DRAGON_BREATH_P3: BossSkillDef = {
  id: 'forest_dragon_breath', kind: 'cone_breath', telegraphSec: 0.85, damage: 32, radius: 240, coneAngleDeg: 95, cooldownSec: 3.6,
}
const FOREST_DRAGON_WING_GUST: BossSkillDef = {
  id: 'forest_dragon_wing_gust', kind: 'circle_aoe', telegraphSec: 0.8, damage: 8, radius: 170, pushback: 130, cooldownSec: 5.0,
}
const FOREST_DRAGON_HAZARD_GROUND: BossSkillDef = {
  id: 'forest_dragon_hazard_ground', kind: 'fire_floor', telegraphSec: 0.8, damage: 0, radius: 65,
  hazardDurationSec: 5, hazardKind: 'fire', hazardDps: 9, cooldownSec: 6.0,
}
const FOREST_DRAGON_SUMMON: BossSkillDef = {
  id: 'forest_dragon_summon', kind: 'summon', telegraphSec: 1.0, damage: 0, radius: 0,
  summonCount: 2, summonTypeId: 'thorn_wolf', cooldownSec: 14,
}

export const BOSS_SKILLS: Record<string, Record<1 | 2 | 3, BossSkillDef[]>> = {
  dragon: {
    1: [DRAGON_FIREBALL_AOE, DRAGON_CONE_BREATH],
    2: [DRAGON_FIREBALL_AOE, DRAGON_CONE_BREATH, DRAGON_FIRE_FLOOR],
    3: [DRAGON_FIREBALL_AOE, DRAGON_CONE_BREATH, DRAGON_FIRE_FLOOR, DRAGON_CHARGE],
  },
  golem: {
    1: [GOLEM_GROUND_SLAM],
    2: [GOLEM_GROUND_SLAM, GOLEM_CROSS_SLAM],
    3: [GOLEM_GROUND_SLAM, GOLEM_CROSS_SLAM, GOLEM_QUAKE],
  },
  ice_witch: {
    1: [ICE_WITCH_BOLT],
    2: [ICE_WITCH_BOLT, ICE_WITCH_RING],
    3: [ICE_WITCH_BOLT, ICE_WITCH_RING, ICE_WITCH_MULTI_RING],
  },
  orc_chieftain: {
    1: [ORC_CHIEFTAIN_AXE],
    2: [ORC_CHIEFTAIN_AXE, ORC_CHIEFTAIN_CHARGE],
    3: [ORC_CHIEFTAIN_AXE, ORC_CHIEFTAIN_CHARGE],
  },
  ancient_treant_guardian: {
    1: [ANCIENT_TREANT_SWEEP],
    2: [ANCIENT_TREANT_SWEEP, ANCIENT_TREANT_ROOT_BURST, ANCIENT_TREANT_LIFE_CORE],
    3: [ANCIENT_TREANT_SWEEP, ANCIENT_TREANT_ROOT_BURST, ANCIENT_TREANT_LIFE_CORE],
  },
  dark_knight_vanguard: {
    1: [DARK_KNIGHT_VANGUARD_SLASH, DARK_KNIGHT_VANGUARD_SHOCKWAVE, DARK_KNIGHT_VANGUARD_COUNTER],
    2: [DARK_KNIGHT_VANGUARD_SLASH, DARK_KNIGHT_VANGUARD_SHOCKWAVE, DARK_KNIGHT_VANGUARD_COUNTER],
    3: [DARK_KNIGHT_VANGUARD_SLASH, DARK_KNIGHT_VANGUARD_SHOCKWAVE, DARK_KNIGHT_VANGUARD_COUNTER],
  },
  forest_dragon: {
    1: [FOREST_DRAGON_CLAW, FOREST_DRAGON_TAIL_SWIPE, FOREST_DRAGON_BREATH],
    2: [
      FOREST_DRAGON_CLAW, FOREST_DRAGON_TAIL_SWIPE, FOREST_DRAGON_BREATH,
      FOREST_DRAGON_WING_GUST, FOREST_DRAGON_HAZARD_GROUND, FOREST_DRAGON_SUMMON,
    ],
    3: [
      FOREST_DRAGON_CLAW, FOREST_DRAGON_TAIL_SWIPE, FOREST_DRAGON_BREATH_P3,
      FOREST_DRAGON_WING_GUST, FOREST_DRAGON_HAZARD_GROUND, FOREST_DRAGON_SUMMON,
    ],
  },
}

// phase 3 技能節奏加快（見 dragon/golem/ice_witch 三階段規劃「技能 cooldown 減少」）
export const PHASE3_COOLDOWN_MULT = 0.6
// ice_witch 從 phase 2 開始才會額外觸發召喚（沿用 Summoner AI 的召喚邏輯）
export const ICE_WITCH_SUMMON_MIN_PHASE = 2
