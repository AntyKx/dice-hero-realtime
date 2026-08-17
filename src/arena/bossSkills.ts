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

// ══════════════════════════════════════════════════════════════════════════
// 雪原（snowfield_wastes）+ 魔王城（demon_king_castle）Boss 技能（2026-08-16）。
// 全部沿用森林已驗證過的技能 kind（不用 guard_counter/summon_cores——那兩種
// 在 updateHeavyAI() 裡有額外的 typeId 專屬掛鉤，複製一份風險大於效益），
// aiType 全部用 'heavy'（同理避開 summoner AI 的 getCampaignEnemyPool() 召喚
// 邏輯，那是給 Roguelite Run 用的加權池，固定關卡 Boss 召喚小怪不該混進去）。
// ══════════════════════════════════════════════════════════════════════════

// 2-5 霜甲騎士長 / 2-18 雙霜甲騎士長：跟森林 1-5 狂暴獸人隊長同款節奏。
const FROST_KNIGHT_SLASH: BossSkillDef = {
  id: 'frost_knight_slash', kind: 'circle_aoe', telegraphSec: 0.9, damage: 26, radius: 88, cooldownSec: 2.6,
}
const FROST_KNIGHT_ICE_CHARGE: BossSkillDef = {
  id: 'frost_knight_ice_charge', kind: 'charge', telegraphSec: 0.7, damage: 28, radius: 45, cooldownSec: 4.2,
}

// 2-10 冰封巨像：跟舊 Roguelite golem 同款 Slam/Cross/Quake 三招式頂著。
const ICE_GOLEM_SLAM: BossSkillDef = {
  id: 'ice_golem_slam', kind: 'circle_aoe', telegraphSec: 1.0, damage: 30, radius: 95, cooldownSec: 2.6,
}
const ICE_GOLEM_CROSS: BossSkillDef = {
  id: 'ice_golem_cross', kind: 'cross_slam', telegraphSec: 0.9, damage: 24, radius: 260, cooldownSec: 4.0,
}
const ICE_GOLEM_SHATTER: BossSkillDef = {
  id: 'ice_golem_shatter', kind: 'quake', telegraphSec: 0.8, damage: 22, radius: 85, count: 3, cooldownSec: 5.2,
}

// 2-15 冰霜女王：借 fire_floor 的地板機制，hazardKind 用 root（減速+短暫定身）
// 代表冰霜地面，不用開新的 StageHazardKind。
const FROST_QUEEN_SHARD: BossSkillDef = {
  id: 'frost_queen_shard', kind: 'projectile', telegraphSec: 0, damage: 18, radius: 10, cooldownSec: 1.4,
}
const FROST_QUEEN_RING: BossSkillDef = {
  id: 'frost_queen_ring', kind: 'circle_aoe', telegraphSec: 1.1, damage: 25, radius: 100, cooldownSec: 3.4,
}
const FROST_QUEEN_BLIZZARD: BossSkillDef = {
  id: 'frost_queen_blizzard', kind: 'quake', telegraphSec: 0.9, damage: 20, radius: 80, count: 4, cooldownSec: 5.5,
}

// 2-20 冰霜巨龍（最終王）：跟森林巨龍同款三階段結構，Frost Floor 借 root 地板代表凍地。
const ICE_DRAGON_CLAW: BossSkillDef = {
  id: 'ice_dragon_claw', kind: 'circle_aoe', telegraphSec: 0.8, damage: 25, radius: 90, cooldownSec: 2.4,
}
const ICE_DRAGON_TAIL_SWIPE: BossSkillDef = {
  id: 'ice_dragon_tail_swipe', kind: 'cone_breath', telegraphSec: 0.9, damage: 23, radius: 160, coneAngleDeg: 110, cooldownSec: 3.2,
}
const ICE_DRAGON_BREATH: BossSkillDef = {
  id: 'ice_dragon_breath', kind: 'cone_breath', telegraphSec: 1.0, damage: 32, radius: 240, coneAngleDeg: 75, cooldownSec: 4.0,
}
const ICE_DRAGON_FROST_FLOOR: BossSkillDef = {
  id: 'ice_dragon_frost_floor', kind: 'fire_floor', telegraphSec: 0.8, damage: 0, radius: 65,
  hazardDurationSec: 5, hazardKind: 'root', hazardSlowMult: 0.5, hazardRootSec: 1, cooldownSec: 6.0,
}

// 3-5 煉獄騎士 / 3-18 雙煉獄騎士：跟 2-5 霜甲騎士長同款節奏，換傷害/血量。
const DEMON_KNIGHT_SLASH: BossSkillDef = {
  id: 'demon_knight_slash', kind: 'circle_aoe', telegraphSec: 0.9, damage: 27, radius: 88, cooldownSec: 2.6,
}
const DEMON_KNIGHT_CHARGE: BossSkillDef = {
  id: 'demon_knight_charge', kind: 'charge', telegraphSec: 0.7, damage: 29, radius: 45, cooldownSec: 4.2,
}

// 3-10 熔岩巨像：Slam/Cross 沿用 golem 節奏，第三招換成真的火焰地板（呼應魔王城主題）。
const LAVA_GOLEM_SLAM: BossSkillDef = {
  id: 'lava_golem_slam', kind: 'circle_aoe', telegraphSec: 1.0, damage: 31, radius: 95, cooldownSec: 2.6,
}
const LAVA_GOLEM_CROSS: BossSkillDef = {
  id: 'lava_golem_cross', kind: 'cross_slam', telegraphSec: 0.9, damage: 25, radius: 260, cooldownSec: 4.0,
}
const LAVA_GOLEM_ERUPTION: BossSkillDef = {
  id: 'lava_golem_eruption', kind: 'fire_floor', telegraphSec: 0.9, damage: 0, radius: 75,
  hazardDurationSec: 4, hazardKind: 'fire', hazardDps: 10, cooldownSec: 5.0,
}

// 3-15 煉獄主教：跟舊 Roguelite ice_witch 同款 Bolt/Ring/Multi-ring 節奏。
const INFERNAL_PRIESTESS_BOLT: BossSkillDef = {
  id: 'infernal_priestess_bolt', kind: 'projectile', telegraphSec: 0, damage: 19, radius: 10, cooldownSec: 1.4,
}
const INFERNAL_PRIESTESS_RING: BossSkillDef = {
  id: 'infernal_priestess_ring', kind: 'circle_aoe', telegraphSec: 1.1, damage: 26, radius: 100, cooldownSec: 3.4,
}
const INFERNAL_PRIESTESS_HELLFIRE: BossSkillDef = {
  id: 'infernal_priestess_hellfire', kind: 'quake', telegraphSec: 0.9, damage: 22, radius: 85, count: 4, cooldownSec: 5.5,
}

// 3-20 深淵魔王（最終王）：跟森林巨龍/冰霜巨龍同款三階段結構，地板換真火焰。
const DEMON_KING_SLASH: BossSkillDef = {
  id: 'demon_king_slash', kind: 'circle_aoe', telegraphSec: 0.8, damage: 27, radius: 92, cooldownSec: 2.4,
}
const DEMON_KING_SHOCKWAVE: BossSkillDef = {
  id: 'demon_king_shockwave', kind: 'cone_breath', telegraphSec: 0.9, damage: 24, radius: 170, coneAngleDeg: 110, cooldownSec: 3.2,
}
const DEMON_KING_INFERNO: BossSkillDef = {
  id: 'demon_king_inferno', kind: 'cone_breath', telegraphSec: 1.0, damage: 34, radius: 240, coneAngleDeg: 75, cooldownSec: 4.0,
}
const DEMON_KING_HELLFLOOR: BossSkillDef = {
  id: 'demon_king_hellfloor', kind: 'fire_floor', telegraphSec: 0.8, damage: 0, radius: 68,
  hazardDurationSec: 5, hazardKind: 'fire', hazardDps: 11, cooldownSec: 6.0,
}

// ══════════════════════════════════════════════════════════════════════════
// 裂隙前兆／深海遺城（2026-08-16 稍晚新增）：六個子章節各自只有一個 Boss
// （第 10 關），沒有第 5 關中王，技能組合沿用已驗證過的 kind 拼裝方式，
// 難度依子章節序位遞增（ch1 兩招、ch2 三招、ch3「篇章最終Boss」四招）。
// ══════════════════════════════════════════════════════════════════════════
const VOLGA_CLAW: BossSkillDef = {
  id: 'volga_claw', kind: 'circle_aoe', telegraphSec: 0.9, damage: 26, radius: 90, cooldownSec: 2.6,
}
const VOLGA_TAIL_SWIPE: BossSkillDef = {
  id: 'volga_tail_swipe', kind: 'cone_breath', telegraphSec: 0.9, damage: 24, radius: 160, coneAngleDeg: 110, cooldownSec: 3.4,
}

const NEMOS_SLAM: BossSkillDef = {
  id: 'nemos_slam', kind: 'circle_aoe', telegraphSec: 1.0, damage: 29, radius: 95, cooldownSec: 2.6,
}
const NEMOS_CROSS: BossSkillDef = {
  id: 'nemos_cross', kind: 'cross_slam', telegraphSec: 0.9, damage: 24, radius: 260, cooldownSec: 4.0,
}
const NEMOS_QUAKE: BossSkillDef = {
  id: 'nemos_quake', kind: 'quake', telegraphSec: 0.8, damage: 22, radius: 85, count: 3, cooldownSec: 5.2,
}

const EROS_SLASH: BossSkillDef = {
  id: 'eros_slash', kind: 'circle_aoe', telegraphSec: 0.8, damage: 28, radius: 92, cooldownSec: 2.4,
}
const EROS_VOID_BREATH: BossSkillDef = {
  id: 'eros_void_breath', kind: 'cone_breath', telegraphSec: 1.0, damage: 33, radius: 235, coneAngleDeg: 75, cooldownSec: 4.0,
}
const EROS_CHARGE: BossSkillDef = {
  id: 'eros_charge', kind: 'charge', telegraphSec: 0.7, damage: 29, radius: 45, cooldownSec: 4.4,
}
const EROS_RIFT_FLOOR: BossSkillDef = {
  id: 'eros_rift_floor', kind: 'fire_floor', telegraphSec: 0.8, damage: 0, radius: 66,
  hazardDurationSec: 5, hazardKind: 'poison', hazardDps: 9, cooldownSec: 6.0,
}

const ZEPHYRON_CLAW: BossSkillDef = {
  id: 'zephyron_claw', kind: 'circle_aoe', telegraphSec: 0.9, damage: 27, radius: 90, cooldownSec: 2.6,
}
const ZEPHYRON_TIDE_BREATH: BossSkillDef = {
  id: 'zephyron_tide_breath', kind: 'cone_breath', telegraphSec: 0.9, damage: 24, radius: 165, coneAngleDeg: 110, cooldownSec: 3.4,
}

const SELRONE_SLAM: BossSkillDef = {
  id: 'selrone_slam', kind: 'circle_aoe', telegraphSec: 1.0, damage: 28, radius: 92, cooldownSec: 2.6,
}
const SELRONE_CHARGE: BossSkillDef = {
  id: 'selrone_charge', kind: 'charge', telegraphSec: 0.7, damage: 30, radius: 45, cooldownSec: 4.2,
}
const SELRONE_TIDE_FLOOR: BossSkillDef = {
  id: 'selrone_tide_floor', kind: 'fire_floor', telegraphSec: 0.9, damage: 0, radius: 72,
  hazardDurationSec: 4, hazardKind: 'poison', hazardDps: 8, cooldownSec: 5.0,
}

const OSREIN_BOLT: BossSkillDef = {
  id: 'osrein_bolt', kind: 'projectile', telegraphSec: 0, damage: 19, radius: 10, cooldownSec: 1.4,
}
const OSREIN_TIDE_RING: BossSkillDef = {
  id: 'osrein_tide_ring', kind: 'circle_aoe', telegraphSec: 1.1, damage: 26, radius: 100, cooldownSec: 3.4,
}
const OSREIN_MAELSTROM: BossSkillDef = {
  id: 'osrein_maelstrom', kind: 'quake', telegraphSec: 0.9, damage: 22, radius: 85, count: 4, cooldownSec: 5.5,
}
const OSREIN_ABYSS_FLOOR: BossSkillDef = {
  id: 'osrein_abyss_floor', kind: 'fire_floor', telegraphSec: 0.8, damage: 0, radius: 68,
  hazardDurationSec: 5, hazardKind: 'poison', hazardDps: 9, cooldownSec: 6.0,
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
  frost_knight_captain: {
    1: [FROST_KNIGHT_SLASH],
    2: [FROST_KNIGHT_SLASH, FROST_KNIGHT_ICE_CHARGE],
    3: [FROST_KNIGHT_SLASH, FROST_KNIGHT_ICE_CHARGE],
  },
  ice_golem_colossus: {
    1: [ICE_GOLEM_SLAM],
    2: [ICE_GOLEM_SLAM, ICE_GOLEM_CROSS],
    3: [ICE_GOLEM_SLAM, ICE_GOLEM_CROSS, ICE_GOLEM_SHATTER],
  },
  frost_queen: {
    1: [FROST_QUEEN_SHARD],
    2: [FROST_QUEEN_SHARD, FROST_QUEEN_RING],
    3: [FROST_QUEEN_SHARD, FROST_QUEEN_RING, FROST_QUEEN_BLIZZARD],
  },
  ice_dragon: {
    1: [ICE_DRAGON_CLAW, ICE_DRAGON_TAIL_SWIPE, ICE_DRAGON_BREATH],
    2: [ICE_DRAGON_CLAW, ICE_DRAGON_TAIL_SWIPE, ICE_DRAGON_BREATH, ICE_DRAGON_FROST_FLOOR],
    3: [ICE_DRAGON_CLAW, ICE_DRAGON_TAIL_SWIPE, ICE_DRAGON_BREATH, ICE_DRAGON_FROST_FLOOR],
  },
  demon_knight: {
    1: [DEMON_KNIGHT_SLASH],
    2: [DEMON_KNIGHT_SLASH, DEMON_KNIGHT_CHARGE],
    3: [DEMON_KNIGHT_SLASH, DEMON_KNIGHT_CHARGE],
  },
  lava_golem: {
    1: [LAVA_GOLEM_SLAM],
    2: [LAVA_GOLEM_SLAM, LAVA_GOLEM_CROSS],
    3: [LAVA_GOLEM_SLAM, LAVA_GOLEM_CROSS, LAVA_GOLEM_ERUPTION],
  },
  infernal_priestess: {
    1: [INFERNAL_PRIESTESS_BOLT],
    2: [INFERNAL_PRIESTESS_BOLT, INFERNAL_PRIESTESS_RING],
    3: [INFERNAL_PRIESTESS_BOLT, INFERNAL_PRIESTESS_RING, INFERNAL_PRIESTESS_HELLFIRE],
  },
  demon_king: {
    1: [DEMON_KING_SLASH, DEMON_KING_SHOCKWAVE, DEMON_KING_INFERNO],
    2: [DEMON_KING_SLASH, DEMON_KING_SHOCKWAVE, DEMON_KING_INFERNO, DEMON_KING_HELLFLOOR],
    3: [DEMON_KING_SLASH, DEMON_KING_SHOCKWAVE, DEMON_KING_INFERNO, DEMON_KING_HELLFLOOR],
  },
  rift_beast_volga: {
    1: [VOLGA_CLAW],
    2: [VOLGA_CLAW, VOLGA_TAIL_SWIPE],
    3: [VOLGA_CLAW, VOLGA_TAIL_SWIPE],
  },
  void_sentinel_nemos: {
    1: [NEMOS_SLAM],
    2: [NEMOS_SLAM, NEMOS_CROSS],
    3: [NEMOS_SLAM, NEMOS_CROSS, NEMOS_QUAKE],
  },
  rift_apostle_eros: {
    1: [EROS_SLASH, EROS_VOID_BREATH],
    2: [EROS_SLASH, EROS_VOID_BREATH, EROS_CHARGE],
    3: [EROS_SLASH, EROS_VOID_BREATH, EROS_CHARGE, EROS_RIFT_FLOOR],
  },
  reef_leviathan_zephyron: {
    1: [ZEPHYRON_CLAW],
    2: [ZEPHYRON_CLAW, ZEPHYRON_TIDE_BREATH],
    3: [ZEPHYRON_CLAW, ZEPHYRON_TIDE_BREATH],
  },
  fallen_regent_selrone: {
    1: [SELRONE_SLAM],
    2: [SELRONE_SLAM, SELRONE_CHARGE],
    3: [SELRONE_SLAM, SELRONE_CHARGE, SELRONE_TIDE_FLOOR],
  },
  tidal_king_osrein: {
    1: [OSREIN_BOLT, OSREIN_TIDE_RING],
    2: [OSREIN_BOLT, OSREIN_TIDE_RING, OSREIN_MAELSTROM],
    3: [OSREIN_BOLT, OSREIN_TIDE_RING, OSREIN_MAELSTROM, OSREIN_ABYSS_FLOOR],
  },
}

// phase 3 技能節奏加快（見 dragon/golem/ice_witch 三階段規劃「技能 cooldown 減少」）
export const PHASE3_COOLDOWN_MULT = 0.6
// ice_witch 從 phase 2 開始才會額外觸發召喚（沿用 Summoner AI 的召喚邏輯）
export const ICE_WITCH_SUMMON_MIN_PHASE = 2
