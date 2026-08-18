import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js'
import { Pool } from './Pool'
import type { ArenaCard } from './cards'
import { getCampaignEnemyPool, getCampaignBoss, pickEnemyType, ALL_CAMPAIGN_STAGE_ENEMIES, type EnemyTypeDef } from './enemies'
import { getCampaignStage } from '../campaign/campaignStages'
import type { CampaignStage, EnemyWave, WaveTrigger } from '../campaign/campaignTypes'
import { getCampaignStageBgPath } from '../campaign/campaignStageBg'
import { getExploreWorld, type ExploreWorld, type ExploreLandmark, type LandmarkKind, type ExploreRect } from './exploreWorlds'
import {
  isObjectiveWon, isObjectiveLost, updateObjectiveState, spawnCollectibles,
  onHuntTargetDefeated, onDestroyTargetDefeated, markCustomStarFailed, type ObjectiveState,
} from './objectives'
import { pickRelicChoices, ARENA_RELICS, type ArenaRelic, type ArenaRelicEffect } from './relics'
import { generateArenaDungeon, type ArenaZoneNode, type ArenaZoneType } from './dungeonZones'
import { loadCharacterFrames, STATE_FPS, type AnimState } from './frameLoader'
import {
  CHASE_CONFIG, CHARGE_CONFIG, RANGED_CONFIG, AOE_CONFIG, SUMMONER_CONFIG, HEAVY_CONFIG,
  SUPPORT_CONFIG, SKIRMISHER_CONFIG,
  type EnemyAiType,
} from './enemyAI'
import { BOSS_SKILLS, PHASE3_COOLDOWN_MULT, ICE_WITCH_SUMMON_MIN_PHASE } from './bossSkills'
import {
  rollEliteModifier, BERSERKER_CONFIG, SPLIT_CONFIG, FROST_CONFIG, LIGHTNING_CONFIG, VAMPIRIC_CONFIG,
  type EliteModifierId,
} from './eliteModifiers'
import {
  ULTIMATE_FREEZE_SEC, ULTIMATE_CUTIN_SEC, ULTIMATE_CUTIN_SLIDE_IN_SEC, ULTIMATE_CUTIN_FADE_OUT_SEC,
  ULTIMATE_CUTIN_BACKDROP_ALPHA, ULTIMATE_CUTIN_BACKDROP_COLOR,
  ULTIMATE_CUTIN_PORTRAIT_HEIGHT_RATIO, ULTIMATE_CUTIN_PORTRAIT_FALLBACK_HEIGHT_RATIO,
  ULTIMATE_CUTIN_TITLE_COLOR, ULTIMATE_CUTIN_TITLE_SIZE, ULTIMATE_CUTIN_SUBTITLE_COLOR, ULTIMATE_CUTIN_SUBTITLE_SIZE,
  ULTIMATE_CUTIN_SPEEDLINE_COUNT, ULTIMATE_CUTIN_SPEEDLINE_COLOR,
  type UltimatePresentationPhase,
} from './ultimatePresentation'
import {
  knightMajorTick, knightDamageReduction, knightOnHurt, knightUltimateMastery,
  knightSwordUltimate, knightGreatswordUltimate,
} from './skills/knight'
import {
  mageOnHit, mageMajorTick, mageMeteorInterval, mageUltimateMastery,
  mageStaffUltimate, mageGrimoireUltimate,
} from './skills/mage'
import {
  priestOnHit, priestMajorTick, priestDeathSaveActive, priestUltimateMastery,
  priestSanctuaryHealPerSec, priestSanctuaryDamageMult,
  priestScepterUltimate, priestHolyTomeUltimate,
} from './skills/priest'
import {
  rogueOnAttackFired, rogueSpeedBonus, rogueConsumeAttackReadySkip, rogueMajorTick,
  rogueOnHit, rogueTryTeleportStrike, rogueUltimateMastery,
  rogueDaggerUltimate, rogueDualDaggersUltimate,
} from './skills/rogue'
import {
  princessOnHit, princessSlowMult, princessOnKill, princessUltimateMastery,
  princessFrostScepterUltimate, princessIceStaffUltimate,
} from './skills/princess'
import {
  archerBasePierce, archerUnlimitedPierce, archerMajorTick, archerUltimateMastery,
  archerLongbowUltimate, archerCrossbowUltimate,
} from './skills/archer'
import {
  dwarfChargedDamageMult, dwarfOnHit, dwarfRockArmorDR, dwarfUltimateMastery,
  dwarfWarhammerUltimate, dwarfTwinAxesUltimate,
} from './skills/dwarf'
import {
  bardOnHit, bardMajorTick, bardEchoDamageMult, bardUltimateMastery,
  bardHarpUltimate, bardLuteUltimate,
} from './skills/bard'
import {
  engineerOnAttackFired, engineerOnBonusShot, engineerMajorTick, engineerUltimateMastery,
  engineerCannonUltimate, engineerGatlingUltimate,
} from './skills/engineer'
import {
  fighterTrackCombo, fighterComboDamageMult, fighterOnMomentumTrigger, fighterMajorTick, fighterUltimateMastery,
  fighterGauntletsUltimate, fighterSpiritWrapsUltimate,
} from './skills/fighter'
import {
  deathKnightDamageMult, deathKnightOnHit, deathKnightFrenzyDamageMult, deathKnightFrenzyLifesteal,
  deathKnightMajorTick, deathKnightTryUndyingPact, deathKnightUltimateMastery, deathKnightDomainSlowMult,
  deathKnightDomainDR, deathKnightDomainLifesteal, deathKnightOnKillExtendDomain,
  deathKnightRunebladeUltimate, deathKnightScytheUltimate,
} from './skills/deathKnight'

export interface ArenaHudState {
  hp: number
  maxHp: number
  xp: number
  xpToNext: number
  level: number
  elapsed: number
  fps: number
  enemyCount: number
  bossState: 'none' | 'alive' | 'defeated'
  bossHp: number
  bossMaxHp: number
  killCount: number
  gameOver: boolean
  zoneType: ArenaZoneType
  zoneIndex: number
  zoneCount: number
  ultimateCharge: number
  ultimateMax: number
  bonusGold: number
  runComplete: boolean
  ownedRelicIds: string[]
  /** 森林遺跡固定關卡專用（2026-08）：只有 cfg.campaignStageId 有值時才會有內容。 */
  campaignResult?: {
    won: boolean
    stars: 0 | 1 | 2 | 3
    starConditionsMet: [boolean, boolean, boolean]
    objectiveLabel: string
    /** 探索模式撿到的 chest 額外強化石（見 exploreBonusEnhanceStones），
     * 只有森林遺跡 1-1~1-5 且真的開過寶箱才會有值。 */
    bonusEnhanceStones?: number
  }
}

export interface ArenaConfig {
  heroId: string
  heroName: string
  maxHp: number
  atkDamage: number
  atkCooldown: number // 秒/次
  moveSpeed: number    // px/秒
  pickupRangeMult?: number  // 天賦帶來的起始拾取範圍倍率，預設 1（PICKUP_RANGE 是內部常數，只能靠這個 config 種初始值）
  unlockedMajorSkillIds?: string[] // 天賦樹已點亮的大型技能 id（如 'knight_lv40'），取代舊版單一 keystoneUnlocked 布林值
  campaign?: string // 篇章（main/ash_kingdom/rift_omen/deep_sea），決定敵人池/Boss，預設 main
  stars?: number // 英雄星等（0-3），決定要載入 frames/heroes/{heroId}/s{stars}/ 底下哪一套貼圖，預設 0
  ultimateName?: string // 必殺技演出用的技能名，預設 hero.skill
  attackType?: 'melee' | 'ranged' // 普通攻擊型態（見 data.ts 的 getAttackType()），預設 'ranged'（維持舊行為）
  ownedRelicIds?: string[] // 這個英雄跨局永久擁有的遺物（2026-08，見 relics.ts）；開局即套用效果，boss 戰利品也會排除已擁有的種類
  talentDamageReductionPct?: number // 天賦 ArenaTalentBonus.damageReductionPct，開局套用
  talentStartShieldCharges?: number // 天賦 ArenaTalentBonus.startShieldCharges，開局套用
  talentLifestealPct?: number       // 天賦 ArenaTalentBonus.lifestealPct，開局套用
  // ── 即時制專屬裝備（2026-08 重整，見 src/arena/equipment.ts）：開局套用，
  // 全部是 computeArenaEquipBonus() 算好的最終值，這裡只負責讀不負責算。
  // HP 加成沒有獨立欄位——比照舊系統 eqBonus.hpBonus/talentBon.hpBonus 的
  // 慣例，直接由呼叫端加進 maxHp 本身傳進來。
  equipDamageReductionPct?: number   // defBonusToDamageReductionPct() 轉換過的減傷比例
  equipMoveSpeedMult?: number
  equipAtkCooldownMult?: number
  equipLifestealPct?: number
  equipExtraProjectiles?: number
  equipPierceBonus?: number
  equippedWeaponTag?: string // 目前裝備武器的 weaponTag，boss 戰利品用來併入武器專屬遺物池
  // ── 職業裝備專屬特效（2026-08 職業裝備重製，見 arena/equipment.ts 的
  // CLASS_FLAVOR_STAT）：開局套用，全部是 computeArenaEquipBonus() 算好的
  // 加總值，跟上面 equip* 欄位同一種寫法。 ──
  equipThornsPct?: number
  equipBurnChancePct?: number
  equipShieldRegenPct?: number
  equipCritChancePct?: number
  equipFreezeChancePct?: number
  equipMarkDamageBonusPct?: number
  equipExtraDamageReductionPct?: number
  equipSlowAuraPct?: number
  equipExecuteBonusPct?: number
  equipOverloadOnKillPct?: number
  equipComboAtkSpeedPct?: number
  equipWeaponType?: string // 目前裝備武器的 weaponType（如 'sword'/'greatsword'），決定必殺技招式
  /** 森林遺跡固定關卡（2026-08，見 src/campaign/）：有值時 init() 完全跳過
   * Arena Roguelite Run 的隨機分區生成，改跑固定波次/Hazard/Objective。
   * 跟 `campaign` 欄位語意獨立，不會互相覆寫。 */
  campaignStageId?: string
}

interface Projectile {
  gfx: Graphics
  x: number
  y: number
  vx: number
  vy: number
  damage: number
  pierceLeft: number
  hit: Set<EnemyInstance>
  alive: boolean
  /** 森林遺跡黑騎士 Black Steel Counter 公平性用（2026-08-12 V2）：格擋開始
   * 「之前」就已經飛在半空中的箭矢命中時，不該被算成 Counter（玩家沒有
   * 「格擋亮起還硬打」的主觀決策，只是彈道剛好命中），見 damageEnemy()。 */
  firedAtElapsed: number
}

interface Gem {
  gfx: Graphics
  x: number
  y: number
  value: number
  alive: boolean
}

export interface EnemyInstance {
  sprite: Sprite
  x: number
  y: number
  hp: number
  maxHp: number
  speed: number
  damage: number
  isBoss: boolean
  isElite: boolean
  alive: boolean
  // 職業技能專用的每敵人狀態（只有對應英雄的技能會用到，其他英雄永遠是 0）
  frostStacks: number   // 皇家公主：冰痕層數，滿5層觸發凍結
  frozenTimer: number   // 皇家公主：凍結剩餘秒數，>0 時敵人不移動（也讓下方新 AI 狀態機整個凍結）
  armorBreakStacks: number // 矮人戰士：破甲層數（最多3），damageEnemy() 依此加傷
  burnStacks: number    // 火焰法師：燃燒層數（天賦系統 v2）
  burnTimer: number     // 火焰法師：燃燒剩餘秒數，到期清空 burnStacks
  holyMarkStacks: number // 神官祭司：聖印層數（天賦系統 v2）
  holyMarkTimer: number  // 神官祭司：聖印剩餘秒數，到期結算回血並清空
  shadowMarkStacks: number // 影刃刺客：暗影標記層數（天賦系統 v2）
  // 逐幀動畫用（見 frameLoader.ts）
  typeId: string
  spriteHeight: number
  baseTint: number      // 受擊染紅閃爍後要復原的原色（一般/菁英/Boss 各自不同）
  animState: AnimState
  animFrame: number
  animTimer: number
  hitTimer: number      // >0 時播放受擊震動/染色，見 updateEnemyVisual()
  bobSeed: number        // 走路程式化 bob 的隨機相位，避免多隻敵人同步抖動
  // ── Enemy AI / Attack State（2026-08 重做，見 enemyAI.ts/bossSkills.ts/eliteModifiers.ts）──
  aiType: EnemyAiType
  state: string          // 各 aiType 各自的狀態機字串，見對應 update*AI() 函式
  stateTimer: number     // 目前狀態已經過的秒數
  attackCooldown: number // 一般攻擊/召喚的冷卻倒數
  targetX: number        // 鎖定的目標點（衝鋒方向、AoE落點、召喚點），依 aiType 用途不同
  targetY: number
  velocityX: number      // Charge/衝鋒類 Boss 技能的固定衝刺速度向量
  velocityY: number
  skillCooldown: number  // Boss 技能專用冷卻，跟 attackCooldown（一般攻擊/召喚）分開算
  bossPhase: 1 | 2 | 3    // 只有 isBoss 有意義，由 hp/maxHp 即時算出並快取
  eliteModifier: EliteModifierId | null
  eliteModifierState: Record<string, number> // 詞綴自己的計時器，用 dict 避免每個詞綴都加專屬欄位
  summonedCount: number  // Summoner 專用：目前存活的召喚物數量（上限判斷）
  isSummoned: boolean    // 這隻是被召喚出來的小怪（不計入清區判定，避免召喚讓區域永遠清不完）
  summonedBy: EnemyInstance | null // isSummoned 時指回召喚者，死亡時要扣回召喚者的 summonedCount
}

type TelegraphType = 'line' | 'circle' | 'cone'

/** 攻擊預警圖形。maxTimer 倒數到時呼叫 onResolve() 結算傷害，owner 死亡則提前取消不結算。 */
interface TelegraphInstance {
  gfx: Graphics
  type: TelegraphType
  timer: number
  maxTimer: number
  x: number
  y: number
  radius: number // circle/cone 用半徑，line 用長度
  angle: number  // line/cone 方向（弧度）
  width: number  // line 粗細（px）／cone 張角（弧度），circle 不使用
  owner: EnemyInstance
  onResolve: () => void
  resolved: boolean
}

/** 敵人發射的彈幕，跟玩家 Projectile 分開管理，只會打玩家。 */
interface EnemyProjectile {
  gfx: Graphics
  x: number
  y: number
  vx: number
  vy: number
  damage: number
  radius: number
  lifetime: number
  alive: boolean
}

export type HazardKind = 'fire' | 'poison' | 'thorn' | 'root'

const HAZARD_COLORS: Record<HazardKind, { fill: number; stroke: number }> = {
  fire: { fill: 0xff6a1a, stroke: 0xff8a3c },
  poison: { fill: 0x5fd94a, stroke: 0x8aff6a },
  thorn: { fill: 0x8a5a2a, stroke: 0xc98a4a },
  root: { fill: 0x4a7a3a, stroke: 0x6aac52 },
}

// 森林遺跡 Defense 關卡（1-11/1-17）Core 被動掉血：附近存活敵人越多扣越快，
// 不用改寫每種 AI 的攻擊目標邏輯（見 updateObjective() 用法）。
const DEFENSE_CORE_DRAIN_RADIUS = 90
const DEFENSE_CORE_DRAIN_PER_SEC = 8

/** 地面持續效果區域（Dragon 的火焰地板／森林遺跡的毒霧/荊棘/樹根等），resolve 完攻擊預警後才開始存在。 */
interface Hazard {
  gfx: Graphics
  x: number
  y: number
  radius: number
  dps: number
  timer: number
  duration: number
  tickTimer: number // 每 0.5 秒判一次傷害，不必每 frame 判
  kind: HazardKind
  slowMult?: number // thorn/root 用：站在裡面時的移速乘數（持續，離開才恢復）
  rootSec?: number   // root 用：進入時額外附加的短暫定身秒數（只在剛進入時觸發一次，不是持續）
  playerInside: boolean // 玩家上一幀是否還在範圍內——root 的一次性定身靠「剛進入」這個邊緣觸發，不是持續判定
}

/**
 * 必殺技 Cut-in 演出狀態機（2026-08）。五個 Pixi 物件終身只建立一次（見
 * init()），每次放必殺只是重置屬性、切換 visible，不重新 new——避免每次
 * 放必殺都重新配置資源。非啟用狀態純粹用 active:false 表示，不需要第三種
 * phase 值，跟 TelegraphInstance.resolved 用 boolean 的做法一致。
 */
interface UltimatePresentationState {
  active: boolean
  phase: UltimatePresentationPhase
  timer: number
  heroId: string
  skillName: string
  overlayGfx: Graphics
  speedLineGfx: Graphics
  portraitSprite: Sprite
  portraitBaseScale: number // setSpriteHeight() 算出的基礎縮放，滑入時疊加的縮放彈跳（0.85→1.0）以此為基準乘，不從上一幀的 scale 反推
  titleText: Text
  subtitleText: Text
}

interface DeathFx {
  sprite: Sprite
  frames: Texture[]
  targetHeight: number
  x: number
  y: number
  timer: number
}

interface Door {
  gfx: Graphics
  x: number
  y: number
  targetNodeId: number
}

interface FloatingText {
  obj: Text
  vy: number
  life: number
  maxLife: number
  alive: boolean
}

interface GlowBurst {
  gfx: Graphics
  life: number
  maxLife: number
  alive: boolean
}

const PROJECTILE_SPEED = 620
const PROJECTILE_RADIUS = 6

// 各英雄普通攻擊特效主題色（2026-08）：沿用 AdventureReadyScreen.tsx 的
// ROLE_META 配色，讓戰鬥內的攻擊特效（遠程彈道/近戰揮擊）跟角色選擇畫面
// 的職業色系一致。原本全部英雄共用同一顆黃色圓點，這裡讓每個英雄的普攻
// 有自己的辨識度（火法火球/公主冰箭/遊俠弓箭/騎士揮劍…）。
const HERO_ATTACK_COLOR: Record<string, number> = {
  knight: 0x6090ff, mage: 0xff6040, priest: 0xffd36e, rogue: 0xa060ff,
  princess: 0x60c8ff, archer: 0x60d080, dwarf: 0xc08040, bard: 0xff80c0,
  death_knight: 0xc03050, engineer: 0x90a0b0, fighter: 0xffa040,
}
const ENEMY_CONTACT_RADIUS = 34 // 敵人受擊判定半徑（玩家 Projectile 命中用），跟攻擊距離是兩件事
const ENEMY_CONTACT_DAMAGE = 8  // 敵人攻擊基礎傷害，乘上 type.damageMult 就是 EnemyInstance.damage
const ENEMY_BASE_HP = 30
const ENEMY_BASE_SPEED = 90
const PLAYER_HIT_FLASH_DURATION = 0.15 // 秒，玩家受傷時的染紅閃爍
const PICKUP_RANGE = 90
const MAGNET_SPEED = 380
const GEM_RADIUS = 7
const GEM_XP_VALUE = 10
const BOSS_GEM_XP_VALUE = GEM_XP_VALUE * 8
const ARENA_MARGIN = 40
// 上緣要留給左上角的返回鍵+關卡徽章疊層（HUD 佔到約 y:14~72px），
// 不能跟其他三邊共用同一個 margin，不然角色/門會滑到 HUD 底下看不見
// （2026-08 真機回報：清完怪找不到門、角色可以滑出邊界，根源就是這裡）。
const ARENA_TOP_MARGIN = 110
const HUD_EMIT_INTERVAL = 150 // ms，HUD 不用每 frame 更新
// 森林遺跡探索模式玩家與地圖實體物件（大門柱/祭壇高台/圖騰基座等）碰撞判定
// 用的圓形半徑，跟 ENEMY_CONTACT_RADIUS 同一量級，讓「撞到東西」的手感跟
// 「撞到敵人」一致。
const EXPLORE_PLAYER_COLLIDE_RADIUS = 30
// supply/chest 地標的互動觸發半徑（走近就自動觸發，不用另外按按鈕，跟
// battleZone/exit 的「走進去就觸發」是同一套操作邏輯，手機上不用多一個
// 觸控目標）。
const EXPLORE_INTERACT_RADIUS = 70
// chest 給的強化石數量，量級比照 equipment.ts SALVAGE_TABLE 分解 rare 裝備
// 的數量（12），沒有另外發明一套經濟數值。
const EXPLORE_CHEST_ENHANCE_STONES = 12
// 開發用碰撞除錯框開關：URL 帶 ?collision=1 才會畫，正式玩家不會意外看到
// （這個環境的 claude-in-chrome rAF 幾乎不會動，沒辦法活測碰撞位置對不對，
// 這個開關讓使用者自己在手機上開一下就能直接肉眼確認，比截圖猜座標準）。
const EXPLORE_COLLISION_DEBUG = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('collision') === '1'

const ELITE_HP_MULT = 2.2
const ELITE_DAMAGE_MULT = 1.6
const ELITE_TINT = 0xd080ff

const ULTIMATE_MAX = 100
export const ULTIMATE_RADIUS = 220 // 武器類型必殺技效果（skills/{heroId}.ts）沿用同一個範圍判定
const ULTIMATE_DAMAGE = 80
const ULTIMATE_CHARGE_NORMAL = 8
const ULTIMATE_CHARGE_ELITE = 20
const ULTIMATE_CHARGE_BOSS = 40

const ALTAR_TRIGGER_RADIUS = 55
const ALTAR_HEAL_PCT = 0.3
const DOOR_RADIUS = 42
const HIDDEN_GOLD_MIN = 50
const HIDDEN_GOLD_MAX = 120

// 逐幀動畫（見 frameLoader.ts）：真的幀圖到位前，用這些程式化參數頂手感
// （攻擊頓感/走路 bob/受擊震動染色/死亡淡出縮小），畫好對應狀態的幀圖後
// updatePlayerAnim()/updateEnemyVisual() 會自動改播真的逐幀動畫。
const HERO_RENDER_HEIGHT = 60    // 火焰法師動畫模組要求：英雄顯示高度統一 60px（原本 76px 偏大）
const ATTACK_ANIM_DURATION = 0.2 // 秒，沒有真的攻擊幀圖時的程式化頓感時長
const SKILL_ANIM_DURATION = 0.3  // 秒，沒有真的技能幀圖時的程式化演出時長
const HIT_SHAKE_DURATION = 0.18  // 秒，受擊震動+染色總時長
const HIT_FLASH_DURATION = 0.08  // 秒，受擊染紅只在震動開頭這段時間
const HIT_SHAKE_PX = 5
const DEATH_FX_DURATION = 0.4    // 秒，死亡淡出/縮小（或真的死亡幀圖）總時長
const WALK_BOB_SPEED = 10        // rad/秒
const WALK_BOB_HEIGHT = 2.4      // px

// 戰鬥節奏（2026-08）：避免「邊移動邊自動攻擊」讓戰鬥變成純繞圈輸出，把
// 「走位」跟「輸出」拆成兩個明確互斥的階段。三個數字集中在這裡，之後要
// 調手感只改這裡就好，不用去搜散落在各處的魔法數字。
const MOVE_DEAD_ZONE = 0.10       // 搖桿輸入強度低於這個值視為沒有輸入，濾掉手機虛擬搖桿的微小雜訊
const ATTACK_READY_DELAY = 0.15   // 秒，玩家停止移動後要先站穩這麼久，才允許自動攻擊觸發
const ATTACK_MOVE_LOCK = 0.10     // 秒，普通攻擊發動瞬間鎖定移動的時間，讓攻擊有重量感

// 近戰/遠程分流（2026-08）：近戰英雄（見 data.ts getAttackType()）沒有飛行道具，
// 站穩後要走進這個距離內才會出手，用瞬間判定命中取代 Projectile 飛行。
// 敵人 chase AI 的 attackRange 落在 40~55（enemyAI.ts），玩家武器再留一點揮擊
// 空間，取 70。
const MELEE_RANGE = 70

// 職業裝備專屬特效（2026-08 職業裝備重製）數值常數，集中放在這裡方便日後調整。
const SHIELD_REGEN_BASE_INTERVAL = 30 // 神官祭司護盾回復：equipShieldRegenPct=0 時的基準間隔（秒）
const SHIELD_REGEN_MIN_INTERVAL = 8   // 疊到再高也不會低於這個間隔
const CRIT_DAMAGE_MULT = 1.8          // 影刃刺客暴擊倍率
const EXECUTE_HP_THRESHOLD_PCT = 0.25 // 死亡騎士處決：目標血量低於此比例才加成
const BURN_ON_HIT_STACKS = 3          // 火焰法師職業裝備灼燒觸發時附加的層數（沿用既有 burnStacks/burnTimer 機制）
const FREEZE_ON_HIT_DURATION = 1.2    // 皇家公主職業裝備凍結觸發時的秒數（沿用既有 frozenTimer 機制）
const SLOW_AURA_RADIUS = 140          // 吟遊詩人減速光環半徑
const OVERLOAD_DURATION = 3           // 機關技師擊殺過載持續秒數
const COMBO_DECAY_WINDOW = 1.5        // 武鬥家連擊：這麼久沒命中就重置層數
const COMBO_MAX_STACKS = 8            // 武鬥家連擊層數上限

// 天賦系統 v2（2026-08）新增狀態效果數值：燃燒（火焰法師）跟聖印（神官祭司）
// 都是「持續時間到期才結算/清空」的敵人身上狀態，用連續傷害/固定到期回血
// 取代逐秒 tick，寫法比照現有 hpRegenPctPerSec 的連續結算慣例。
const BURN_DAMAGE_PER_STACK_PER_SEC = 4  // 火焰法師：燃燒每層每秒傷害
const HOLY_MARK_HEAL_PCT_PER_STACK = 0.03 // 神官祭司：聖印每層到期回復比例（3%maxHP/層）

// 戰鬥場景背景圖（2026-08 加入）：依篇章對應美術主題，每個主題 3 張變化，
// 每次換區隨機挑一張。裂隙前兆/深海遺城目前沒有專屬美術，先借用雪原場景。
const CAMPAIGN_BG_THEME: Record<string, string> = {
  main: 'forest', ash_kingdom: 'castle', rift_omen: 'snowfield', deep_sea: 'snowfield',
  // 舊副本轉即時制：沒有專屬場景美術，借用既有主題頂著
  star_eclipse: 'snowfield', burning_throne: 'castle', black_tide: 'snowfield', ash_covenant: 'castle',
}
const BG_VARIANTS_PER_THEME = 3

export class ArenaGame {
  app: Application | null = null
  destroyed = false

  playerSprite: Sprite | null = null
  heroFrames: Record<AnimState, Texture[]> | null = null
  enemyFrames: Record<string, Record<AnimState, Texture[]>> = {}
  bgSprite: Sprite | null = null
  bgTextures: Texture[] = []

  // ── 森林遺跡 1-1~1-5「同一張地圖完成探索＋戰鬤」（2026-08-17，見
  // exploreWorlds.ts）：worldLayer 是所有會跟著鏡頭捲動的物件（背景/玩家/
  // 敵人/特效…）共用的父容器，鏡頭移動只要搬動這一個容器，裡面每個子物件
  // 的 x/y 完全不用改寫成「螢幕座標」，繼續當世界座標用——這是刻意選的
  // 作法，PixiJS 容器本身就會處理座標轉換，不用去改動散落在全檔案幾十處
  // 「sprite.x = e.x」這種賦值。非探索關卡（其餘 89 關／Roguelite）
  // exploreWorld 永遠是 null，camera 永遠是 {0,0}，worldLayer 位置永遠是
  // (0,0)——等於完全沒有這層轉換，行為跟改動前一模一樣。 */
  worldLayer: Container | null = null
  camera = { x: 0, y: 0 }
  exploreWorld: ExploreWorld | null = null
  exploreState: 'roam' | 'encounter' | 'cleared' = 'roam'
  exploreLandmarkSprites: { landmark: ExploreLandmark; gfx: Graphics; text: Text; claimed: boolean }[] = []
  exploreExitGfx: Graphics | null = null
  exploreBossTriggered = false
  // ── 2026-08-18 第二輪：真的有狀態的互動物件＋敵人-地標綁定（見檔頭
  // ArenaGame.ts 該章節與 exploreWorlds.ts 的說明）──
  /** 已經互動過的 supply/chest 地標 id，防止同一個重複領取。 */
  exploreInteracted = new Set<string>()
  /** 這局探索額外賺到的強化石（chest 給的），結算時併入 campaignResult，
   * 由外層（App.tsx）跟關卡固定掉落一起發放，不另開一條發獎路徑。 */
  exploreBonusEnhanceStones = 0
  /** linkedEnemyId 對應的敵人生成時綁定到這裡，死亡時反查回地標讓它變灰
   * （見 spawnCampaignWave/damageEnemy）。key 是敵人物件參照本身，不需要
   * 額外的敵人 id 欄位。 */
  exploreEnemyLandmarks = new Map<EnemyInstance, { landmark: ExploreLandmark; gfx: Graphics; text: Text; claimed: boolean }>()

  player = { x: 0, y: 0, hp: 0, maxHp: 0, atkTimer: 0, moveSpeedDebuffMult: 1, moveSpeedDebuffTimer: 0 }
  playerHitTimer = 0 // >0 時玩家 sprite 染紅閃爍，見 damagePlayer()/updatePlayerAnim()
  moveDir = { x: 0, y: 0 } // -1~1 連續值，類比搖桿輸入，取代舊的拖曳移動
  facing = { x: 0, y: 1 }  // 最後移動方向，先只記錄，鋪路給之後的方向性走路動畫
  facingRight = true       // 素材統一朝右繪製，moveDir.x<0 時水平翻轉；純上下移動/靜止時保留上次面向

  // ── 走位/輸出節奏（2026-08）：見 MOVE_DEAD_ZONE/ATTACK_READY_DELAY/
  // ATTACK_MOVE_LOCK 常數說明 ────────────────────────────────────────
  stoppedTimer = 0        // 累積「已經停止移動」的秒數，見 isPlayerMoving()/updateAutoAttack()
  attackMoveLockTimer = 0 // >0 時禁止移動（攻擊硬直），見 fireProjectileAt()/updatePlayerMovement()
  playerAnim: {
    state: AnimState; frame: number; timer: number
    attackTimer: number; skillTimer: number
  } = { state: 'idle', frame: 0, timer: 0, attackTimer: 0, skillTimer: 0 }
  // 攻擊動畫播到觸發幀才真的開火（見 updateAutoAttack/updatePlayerAnim），
  // 只有英雄有真的 attack 逐幀圖時才會延後；沒有就維持原本立即開火。
  pendingAttackTarget: EnemyInstance | null = null
  attackFired = false
  deathFx: DeathFx[] = []

  enemies: EnemyInstance[] = []
  enemySpritePool: Pool<Sprite>
  campaign = 'main' // 決定敵人池/Boss，見 src/arena/enemies.ts 的 CAMPAIGN_ENEMY_POOLS
  bossState: 'none' | 'alive' | 'defeated' = 'none'
  killCount = 0
  gameOver = false

  projectiles: Projectile[] = []
  projectilePool: Pool<Graphics>
  gems: Gem[] = []
  gemPool: Pool<Graphics>

  xp = 0
  level = 1
  elapsed = 0
  fpsAccum = 0
  fpsFrames = 0
  fps = 0
  hudEmitTimer = 0

  cfg: ArenaConfig

  // 升級卡疊加的即時屬性加成，套用點見 applyCard()
  bonusDamage = 0
  atkCooldownMult = 1
  moveSpeedMult = 1
  pickupRangeMult = 1

  // Boss 戰利品（遺物）疊加的機制，套用點見 applyRelic()
  ownedRelicIds: string[] = []
  pierceBonus = 0
  extraProjectiles = 0
  lifestealPct = 0
  thornsPct = 0
  hpRegenPctPerSec = 0
  shieldIntervalSec = 0
  shieldTimer = 0
  shieldCharges = 0
  talentDamageReductionPct = 0 // 天賦樹永久減傷（聖騎士/矮人系小天賦），damagePlayer() 套用

  // ── 職業裝備專屬特效（2026-08 職業裝備重製）：套用點見 damageEnemy()／
  // getSlowMult()／updatePassives()／攻速消費處，純數值判定，不另開
  // per-hero 檔案。extraDamageReductionPct/shieldRegenPct 沒有獨立欄位——
  // 前者直接疊進 talentDamageReductionPct，後者直接換算成縮短
  // shieldIntervalSec，建構子套用時就折算完畢。 ──
  burnChancePct = 0
  critChancePct = 0
  freezeChancePct = 0
  markDamageBonusPct = 0
  slowAuraPct = 0
  executeBonusPct = 0
  overloadOnKillPct = 0 // 擊殺觸發的臨時攻速加成幅度，實際啟用中的量見 overloadTimer
  overloadTimer = 0     // >0 時套用 overloadOnKillPct 到攻速，updatePassives() 遞減
  comboAtkSpeedPct = 0  // 每層連擊攻速加成幅度
  comboStacks = 0       // 目前連擊層數，damageEnemy() 命中疊層
  comboDecayTimer = 0   // 停手多久後連擊歸零，updatePassives() 遞減／重置

  // ── 關卡分區（M3.6）──────────────────────────────────────────────────
  dungeon: ArenaZoneNode[] = []
  currentNodeId = 0
  currentZoneType: ArenaZoneType = 'battle'
  zoneEnemiesRemaining = 0
  pendingZoneCardTrigger = false
  doors: Door[] = []
  altarGfx: Graphics | null = null
  altarPos: { x: number; y: number } | null = null
  altarTriggered = false
  bonusGold = 0
  runComplete = false

  // ── 森林遺跡固定關卡專用統計（2026-08，見 src/campaign/）：只有
  // cfg.campaignStageId 有值時才有意義，供三星判定讀取。跟 Arena Roguelite
  // Run／Dungeon 完全無關，那兩個模式永遠不會讀到這包資料。
  campaignStats = {
    hitsTaken: 0,               // 被敵人攻擊命中次數
    hazardHits: {} as Record<string, number>, // hazardKind → 被命中次數
    skillHits: {} as Record<string, number>,  // Boss skillId → 被命中次數
    healCounts: {} as Record<string, number>, // 敵人 typeId → 成功治療次數
    controlHits: 0,              // 被 root/thorn 減速或定身命中次數
    counterTriggers: 0,           // Boss 反擊觸發次數
    poisonDamageTaken: 0,         // 毒霧累積傷害（給「累積傷害≤maxHP某%」這類星星條件用）
    diedDuringStage: false,       // 過關過程中是否觸發過死亡（給 no_death 星星條件用）
    destroyWithinViolated: false, // 古樹守衛 Root Core 曾經超過時限沒清完（給 destroy_within 星星條件用，見 damageEnemy()）
  }
  campaignStage: CampaignStage | null = null   // 目前跑的固定關卡資料（非 campaignStageId 時為 null）
  pendingWaves: EnemyWave[] = []
  enemiesEmptySec = 0 // 場上敵人歸零後累積的秒數，previous_wave_cleared 的 delaySec 用（見 isWaveTriggerReady）
  objectiveState: ObjectiveState | null = null
  defenseCore: { x: number; y: number; hp: number; maxHp: number; gfx: Graphics } | null = null // Defense 目標，刻意不進 this.enemies[]（玩家不會誤攻擊自己要保護的東西）
  campaignResult: ArenaHudState['campaignResult'] = undefined

  // ── 必殺技（擊殺充能）────────────────────────────────────────────────
  ultimateCharge = 0

  // ── 必殺技演出（Cut-in，2026-08）─────────────────────────────────────
  presentation: UltimatePresentationState | null = null
  portraitTextureCache = new Map<string, Texture | null>() // heroId → texture；null = 試過載入失敗，別再重試

  // ── 天賦樹職業技能（11個英雄各自一套，依 cfg.heroId 分派見 updateKeystone）──
  unlockedMajorSkillIds = new Set<string>()
  keystoneTimer = 0     // 週期觸發類共用（聖騎士/火焰法師/神官祭司/遊俠獵人）
  keystoneBuffTimer = 0 // 聖騎士：減傷buff剩餘時間
  keystoneStacks = 0    // 武鬥家：擊殺氣勢層數
  keystoneNextAtkBonus = false // 武鬥家：氣勢滿了，下次攻擊加成待觸發

  // ── 天賦系統 v2（2026-08）新增大型技能暫存欄位：同一個 ArenaGame 實例
  // 同時只服務一個英雄（cfg.heroId 固定），不同英雄的大型技能可以放心共用
  // 同一組欄位，語意由當下 heroId 決定，比照上面 keystoneStacks 等舊欄位的
  // 既有慣例，避免 11 個英雄各自加一套同義欄位。實際行為寫在 arena/skills/。
  majorStacks = 0             // 通用疊層：聖騎士聖印／技師熱能／吟遊詩人迴響／死亡騎士血印
  majorStacks2 = 0               // 第二組疊層（技師過熱、部分英雄需要兩種獨立層數）
  majorTimer = 0               // 通用週期/持續計時
  majorTimer2 = 0               // 第二組計時（部分英雄需要兩個獨立計時）
  majorInvulnTimer = 0           // 聖騎士神聖壁壘等「完全無敵」效果剩餘秒數
  majorZoneTimer = 0             // 持續型領域效果剩餘秒數（死亡騎士死亡領域等）
  majorFlag = false             // 通用一次性旗標（死亡騎士不死契約是否已觸發等）
  beatCount = 0                 // 吟遊詩人節拍：0 起算，每次攻擊 +1，到 beatMax（預設4）觸發並歸零
  comboTarget: EnemyInstance | null = null // 武鬥家連擊鎖定目標
  comboCount = 0                 // 武鬥家連續命中同目標次數
  deathWillDamageMult = 1        // 死亡騎士死亡意志：依血量即時計算的傷害乘數，updatePassives() 每幀更新

  // ── 飄字/光效（祭壇、必殺技、隱藏獎勵共用）──────────────────────────
  floatingTexts: FloatingText[] = []
  textPool: Pool<Text>
  glows: GlowBurst[] = []
  glowPool: Pool<Graphics>

  // ── Enemy AI / Attack State（2026-08 重做）──────────────────────────
  telegraphs: TelegraphInstance[] = []
  telegraphPool: Pool<Graphics>
  enemyProjectiles: EnemyProjectile[] = []
  enemyProjectilePool: Pool<Graphics>
  hazards: Hazard[] = []
  hazardPool: Pool<Graphics>

  constructor(
    cfg: ArenaConfig,
    private onHudChange: (s: ArenaHudState) => void,
    private onLevelUp: () => void,
    private onBossLoot: (choices: ArenaRelic[]) => void,
  ) {
    this.cfg = cfg
    this.pickupRangeMult = cfg.pickupRangeMult ?? 1
    this.unlockedMajorSkillIds = new Set(cfg.unlockedMajorSkillIds ?? [])
    this.talentDamageReductionPct = cfg.talentDamageReductionPct ?? 0
    this.shieldCharges = cfg.talentStartShieldCharges ?? 0
    this.lifestealPct = cfg.talentLifestealPct ?? 0
    // 即時制專屬裝備（2026-08）：跟天賦加成一樣開局套用，來源分開（天賦 vs
    // 裝備）但套用的是同一組執行期欄位，疊加起來自然發生，不用另外處理。
    this.talentDamageReductionPct += cfg.equipDamageReductionPct ?? 0
    this.lifestealPct += cfg.equipLifestealPct ?? 0
    this.atkCooldownMult *= cfg.equipAtkCooldownMult ?? 1
    this.moveSpeedMult *= cfg.equipMoveSpeedMult ?? 1
    this.pierceBonus += cfg.equipPierceBonus ?? 0
    this.extraProjectiles += cfg.equipExtraProjectiles ?? 0
    // 職業裝備專屬特效（2026-08）：跟上面裝備加成同一批套用邏輯。
    this.thornsPct += cfg.equipThornsPct ?? 0
    this.burnChancePct += cfg.equipBurnChancePct ?? 0
    this.critChancePct += cfg.equipCritChancePct ?? 0
    this.freezeChancePct += cfg.equipFreezeChancePct ?? 0
    this.markDamageBonusPct += cfg.equipMarkDamageBonusPct ?? 0
    this.slowAuraPct += cfg.equipSlowAuraPct ?? 0
    this.executeBonusPct += cfg.equipExecuteBonusPct ?? 0
    this.overloadOnKillPct = cfg.equipOverloadOnKillPct ?? 0
    this.comboAtkSpeedPct = cfg.equipComboAtkSpeedPct ?? 0
    // 額外減傷沒有獨立欄位，直接疊進跟裝備防禦減傷同一顆累加欄位。
    this.talentDamageReductionPct += cfg.equipExtraDamageReductionPct ?? 0
    // 護盾回復沒有獨立欄位，換算成縮短既有的護盾回充間隔（跟遺物/天賦共用
    // 同一組 shieldIntervalSec/shieldTimer/shieldCharges，取較快的那個間隔）。
    if (cfg.equipShieldRegenPct) {
      const interval = Math.max(SHIELD_REGEN_MIN_INTERVAL, SHIELD_REGEN_BASE_INTERVAL * (1 - cfg.equipShieldRegenPct))
      this.shieldIntervalSec = this.shieldIntervalSec > 0 ? Math.min(this.shieldIntervalSec, interval) : interval
    }
    this.campaign = cfg.campaign ?? 'main'
    // 遺物永久收藏（2026-08）：cfg.ownedRelicIds 是這個英雄先前 boss 戰利品累積下來
    // 的永久持有清單，開局就直接套用效果（不用等這局也打贏 boss 才有感），
    // pickRelicChoices() 也是沿用同一份清單排除已擁有種類，逐局收集剩下的遺物。
    this.ownedRelicIds = [...(cfg.ownedRelicIds ?? [])]
    for (const id of this.ownedRelicIds) {
      const relic = ARENA_RELICS.find(r => r.id === id)
      if (relic) this.applyRelicEffect(relic.effect)
    }
    this.projectilePool = new Pool<Graphics>(
      () => new Graphics(),
      g => { g.clear(); g.visible = true },
    )
    this.gemPool = new Pool<Graphics>(
      () => new Graphics(),
      g => { g.clear(); g.visible = true },
    )
    this.enemySpritePool = new Pool<Sprite>(
      () => new Sprite(),
      s => { s.visible = true; s.tint = 0xffffff },
    )
    this.textPool = new Pool<Text>(
      () => new Text({ text: '', style: { fontSize: 16, fontWeight: 'bold', fill: 0xffe9a8, stroke: { color: 0x1a1000, width: 3 } } }),
      t => { t.visible = true; t.alpha = 1 },
    )
    this.glowPool = new Pool<Graphics>(
      () => new Graphics(),
      g => { g.clear(); g.visible = true; g.scale.set(1) },
    )
    this.telegraphPool = new Pool<Graphics>(
      () => new Graphics(),
      g => { g.clear(); g.visible = true; g.rotation = 0; g.scale.set(1) },
    )
    this.enemyProjectilePool = new Pool<Graphics>(
      () => new Graphics(),
      g => { g.clear(); g.visible = true },
    )
    this.hazardPool = new Pool<Graphics>(
      () => new Graphics(),
      g => { g.clear(); g.visible = true },
    )
  }

  async init(container: HTMLElement): Promise<void> {
    const app = new Application()
    await app.init({
      resizeTo: container,
      backgroundColor: 0x0b1220,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    })
    if (this.destroyed) { app.destroy(true, { children: true }); return }

    this.app = app
    container.appendChild(app.canvas)

    // worldLayer 必須在其他東西 addChild 之前建立好，見上面欄位宣告的說明。
    this.worldLayer = new Container()
    app.stage.addChild(this.worldLayer)

    // 森林遺跡固定關卡（2026-08）：跟 Arena Roguelite Run 完全不同的敵人來源
    // ——不是 getCampaignEnemyPool() 那組加權池，是這一關 waves/boss 實際點名
    // 用到的森林敵人。placeholderSpriteId 有值代表這個 id 還沒有專屬美術，
    // 直接改讀那個現有敵人的資料夾（讀取路徑用 placeholder，但存進
    // enemyFrames 時仍然用真正的 id 當 key，遊戲邏輯完全不受影響，只影響
    // 貼圖來源）。
    this.campaignStage = this.cfg.campaignStageId ? getCampaignStage(this.cfg.campaignStageId) ?? null : null
    // 森林遺跡 1-1~1-5：探索世界資料要在算背景/出生點之前就決定好。
    this.exploreWorld = this.campaignStage ? getExploreWorld(this.campaignStage.id) ?? null : null
    const allEnemyTypes = this.campaignStage
      ? this.getCampaignStageEnemyTypes(this.campaignStage)
      : [...getCampaignEnemyPool(this.campaign), getCampaignBoss(this.campaign)]
    const bgPaths = this.exploreWorld
      ? [this.exploreWorld.backgroundAsset]
      : this.campaignStage
      ? [getCampaignStageBgPath(this.campaignStage.bgTheme)]
      : Array.from({ length: BG_VARIANTS_PER_THEME }, (_, i) => `/assets/backgrounds/${CAMPAIGN_BG_THEME[this.campaign] ?? 'forest'}_${i + 1}.jpg`)
    const heroStars = Math.min(3, Math.max(0, this.cfg.stars ?? 0))
    const [heroFrames, bgTexList, enemyFrameList, portraitTex] = await Promise.all([
      loadCharacterFrames(`/assets/frames/heroes/${this.cfg.heroId}/s${heroStars}`),
      Promise.all(bgPaths.map(p => Assets.load(p))),
      Promise.all(allEnemyTypes.map(t => loadCharacterFrames(`/assets/frames/enemies/${t.placeholderSpriteId ?? t.id}`))),
      // 必殺技 Cut-in 立繪（2026-08-13：跟 data.ts 的 hero.portrait 分開存放，
      // 各自可以用不同張圖——hero.portrait 是英雄選擇畫面的立繪預覽，這裡是
      // 戰鬥內必殺技演出專用，不共用同一張）：先在集滿必殺技之前就把已有的
      // Cut-in 圖快取好，第一次放技能不會有載入延遲。載入失敗（例如還沒有
      // 專屬 Cut-in 圖的英雄）就存 null，startUltimatePresentation() 會
      // fallback 成放大版 hero sprite。
      Assets.load<Texture>(`/assets/cutin/${this.cfg.heroId}.png`).catch(() => null),
    ])
    if (this.destroyed) return
    this.heroFrames = heroFrames
    allEnemyTypes.forEach((t, i) => { this.enemyFrames[t.id] = enemyFrameList[i] })
    this.bgTextures = bgTexList
    this.portraitTextureCache.set(this.cfg.heroId, portraitTex)

    // 探索模式的地圖是橫向構圖（fit-width 貼在世界最上方，見 exploreWorlds.ts
    // 檔頭說明），世界高度已經盡量貼近縮放後的圖片高度，圖片涵蓋不到的極少量
    // 下緣先鋪一層純色打底（顏色取圖片自己下緣的平均色，不是隨便挑的），
    // 不然會露出畫布底色。這層必須在 bgSprite 之前 addChild，才會被蓋在
    // 背景圖底下而不是疊在上面。
    if (this.exploreWorld) {
      const ground = new Graphics()
      ground.rect(0, 0, this.exploreWorld.world.width, this.exploreWorld.world.height)
        .fill({ color: this.exploreWorld.groundColor })
      this.worldLayer!.addChild(ground)
    }

    const bgSprite = new Sprite(this.bgTextures[0])
    bgSprite.anchor.set(this.exploreWorld ? 0 : 0.5)
    this.worldLayer!.addChild(bgSprite)
    this.bgSprite = bgSprite
    this.layoutBackground()

    this.player = this.exploreWorld
      ? {
          x: this.exploreWorld.spawn.x, y: this.exploreWorld.spawn.y,
          hp: this.cfg.maxHp, maxHp: this.cfg.maxHp, atkTimer: 0,
          moveSpeedDebuffMult: 1, moveSpeedDebuffTimer: 0,
        }
      : {
          x: app.screen.width / 2, y: app.screen.height - ARENA_MARGIN - 40,
          hp: this.cfg.maxHp, maxHp: this.cfg.maxHp, atkTimer: 0,
          moveSpeedDebuffMult: 1, moveSpeedDebuffTimer: 0,
        }

    const playerSprite = new Sprite(heroFrames.idle[0])
    // 有真的逐幀圖（例如火焰法師）就用腳底置中錨點，讓不同幀的裁切高度不一致
    // 時角色腳底還是釘在同一個位置；還沒有動畫美術的英雄維持原本正中心錨點，
    // 視覺位置不變，不影響其他英雄。
    playerSprite.anchor.set(0.5, heroFrames.idle.length > 1 ? 1 : 0.5)
    this.setSpriteHeight(playerSprite, HERO_RENDER_HEIGHT)
    playerSprite.x = this.player.x
    playerSprite.y = this.player.y
    this.worldLayer!.addChild(playerSprite)
    this.playerSprite = playerSprite

    this.initUltimatePresentation()

    if (this.campaignStage) {
      this.initCampaignStage(this.campaignStage)
    } else {
      this.dungeon = generateArenaDungeon()
      this.enterZone(this.dungeon[0].id)
    }

    app.ticker.add(ticker => this.update(ticker.deltaMS))
  }

  /** 收集一個森林遺跡固定關卡實際會用到的敵人型別（waves + boss + Boss 技能會召喚的子物件），去重。 */
  getCampaignStageEnemyTypes(stage: CampaignStage): EnemyTypeDef[] {
    const ids = new Set<string>()
    for (const wave of stage.waves ?? []) {
      Object.keys(wave.enemies).forEach(id => ids.add(id))
      Object.keys(wave.eliteEnemies ?? {}).forEach(id => ids.add(id))
    }
    if (stage.boss) {
      ids.add(stage.boss.bossEnemyId)
      // summon_cores 這類技能召喚的子物件（例如古樹守衛的 root_core）不會出現
      // 在 waves 資料裡，貼圖要在這裡一起收集，不然 spawnEnemyOfType() 會因為
      // enemyFrames[id] 沒有預先載入而直接 return、Boss 技能悄悄召喚失敗。
      for (const skills of Object.values(BOSS_SKILLS[stage.boss.bossEnemyId] ?? {})) {
        for (const skill of skills) if (skill.summonTypeId) ids.add(skill.summonTypeId)
      }
    }
    return [...ids].map(id => ALL_CAMPAIGN_STAGE_ENEMIES[id]).filter((t): t is EnemyTypeDef => !!t)
  }

  setSpriteHeight(sprite: Sprite, targetHeight: number) {
    const scale = targetHeight / sprite.texture.height
    sprite.scale.set(scale)
  }

  /**
   * 逐幀動畫每 tick 共用的視覺套用：換貼圖、依貼圖實際高度重算縮放（手繪
   * 逐幀圖各張畫布大小可能不一致，不能假設跟前一張同尺寸）、疊加程式化
   * 縮放/位移特效。每次都從 targetHeight 重新算 base scale，不會因為疊加
   * 特效而累積漂移。
   */
  applyAnimVisual(
    sprite: Sprite, tex: Texture, targetHeight: number,
    worldX: number, worldY: number, scaleMult: number, offsetX: number, offsetY: number,
    flipX = false,
  ) {
    if (sprite.texture !== tex) sprite.texture = tex
    const base = targetHeight / sprite.texture.height
    sprite.scale.set(base * scaleMult * (flipX ? -1 : 1), base * scaleMult)
    sprite.x = worldX + offsetX
    sprite.y = worldY + offsetY
  }

  /**
   * 玩家的 idle/walk/attack/skill 狀態機，優先級 Skill > Attack > Move > Idle
   * （Skill 不會被中斷；Attack 進行中 Move/Idle 蓋不掉它，但 Skill 可以）。
   * 真的幀圖到位前用程式化頓感/bob 頂著。攻擊/技能的實際傷害結算時機見
   * updateAutoAttack()/tryActivateUltimate() 與下方 frame-trigger 判斷。
   */
  updatePlayerAnim(dt: number) {
    if (!this.playerSprite || !this.heroFrames) return
    const anim = this.playerAnim
    if (anim.attackTimer > 0) anim.attackTimer = Math.max(0, anim.attackTimer - dt)
    if (anim.skillTimer > 0) anim.skillTimer = Math.max(0, anim.skillTimer - dt)

    if (this.moveDir.x > 0) this.facingRight = true
    else if (this.moveDir.x < 0) this.facingRight = false
    // moveDir.x === 0（純上下移動或靜止）：保留上一次的左右面向，不重置

    const moving = this.moveDir.x !== 0 || this.moveDir.y !== 0
    const nextState: AnimState =
      anim.skillTimer > 0 ? 'skill' : anim.attackTimer > 0 ? 'attack' : moving ? 'walk' : 'idle'

    if (nextState !== anim.state) {
      // Attack 被 Skill 中斷、還沒播到觸發幀：保底立刻開火，不讓這次攻擊悄悄消失
      // （不改變攻擊機制本身，只是把「一定會打出去」這件事挪到中斷的瞬間）。
      if (anim.state === 'attack' && this.pendingAttackTarget && !this.attackFired) {
        if (this.pendingAttackTarget.alive) this.fireNormalAttack(this.pendingAttackTarget)
        this.pendingAttackTarget = null
      }
      anim.state = nextState; anim.frame = 0; anim.timer = 0
    }

    const frames = this.heroFrames[nextState]
    const hasReal = frames.length > 1
    let scaleMult = 1
    let offsetY = 0

    if (hasReal) {
      anim.timer += dt
      const frameDur = 1 / STATE_FPS[nextState]
      const prevFrame = anim.frame
      while (anim.timer >= frameDur) { anim.timer -= frameDur; anim.frame = (anim.frame + 1) % frames.length }

      // Attack 播到觸發幀（取中間那格）才真的結算，跟動畫演出對齊，不用
      // setTimeout 猜時間。同一次演出只能觸發一次。Skill 幀的播放本身還是
      // 照常跑（下面的 while 迴圈已經在推進），但傷害結算已經改由 Cut-in
      // 演出的 finishUltimatePresentation() 統一觸發，這裡不再重複判斷。
      if (nextState === 'attack' && anim.frame !== prevFrame) {
        const triggerFrame = Math.floor(frames.length / 2)
        if (anim.frame === triggerFrame && !this.attackFired && this.pendingAttackTarget) {
          this.attackFired = true
          if (this.pendingAttackTarget.alive) this.fireNormalAttack(this.pendingAttackTarget)
          this.pendingAttackTarget = null
        }
      }
    } else if (nextState === 'attack') {
      const t = Math.min(1, Math.max(0, 1 - anim.attackTimer / ATTACK_ANIM_DURATION))
      scaleMult = 1 + Math.sin(t * Math.PI) * 0.14
    } else if (nextState === 'skill') {
      const t = Math.min(1, Math.max(0, 1 - anim.skillTimer / SKILL_ANIM_DURATION))
      scaleMult = 1 + Math.sin(t * Math.PI) * 0.22
    } else if (nextState === 'walk') {
      anim.timer += dt
      offsetY = Math.sin(anim.timer * WALK_BOB_SPEED) * WALK_BOB_HEIGHT
    }

    const tex = frames[Math.min(anim.frame, frames.length - 1)]
    this.applyAnimVisual(
      this.playerSprite, tex, HERO_RENDER_HEIGHT, this.player.x, this.player.y,
      scaleMult, 0, offsetY, !this.facingRight,
    )

    if (this.playerHitTimer > 0) {
      this.playerHitTimer = Math.max(0, this.playerHitTimer - dt)
      this.playerSprite.tint = 0xff6a6a
    } else {
      this.playerSprite.tint = 0xffffff
    }
  }

  /** 敵人的 idle/walk/hit 狀態機（受擊優先於走路），死亡動畫走另一條 deathFx 路徑。 */
  updateEnemyVisual(e: EnemyInstance, dt: number) {
    if (e.hitTimer > 0) e.hitTimer = Math.max(0, e.hitTimer - dt)

    const nextState: AnimState = e.hitTimer > 0 ? 'hit' : e.frozenTimer > 0 ? 'idle' : 'walk'
    if (nextState !== e.animState) { e.animState = nextState; e.animFrame = 0; e.animTimer = 0 }

    const frames = this.enemyFrames[e.typeId]
    const stateFrames = frames?.[nextState] ?? [e.sprite.texture]
    const hasReal = stateFrames.length > 1
    let scaleMult = 1
    let offsetX = 0
    let offsetY = 0

    if (hasReal) {
      e.animTimer += dt
      const frameDur = 1 / STATE_FPS[nextState]
      while (e.animTimer >= frameDur) { e.animTimer -= frameDur; e.animFrame = (e.animFrame + 1) % stateFrames.length }
    } else if (nextState === 'walk') {
      e.animTimer += dt
      offsetY = Math.sin(e.animTimer * WALK_BOB_SPEED + e.bobSeed) * WALK_BOB_HEIGHT
    }

    if (e.hitTimer > 0) {
      if (!hasReal) scaleMult *= 1.08
      offsetX += (Math.random() - 0.5) * HIT_SHAKE_PX
      offsetY += (Math.random() - 0.5) * HIT_SHAKE_PX
    }

    const tex = stateFrames[Math.min(e.animFrame, stateFrames.length - 1)]
    this.applyAnimVisual(e.sprite, tex, e.spriteHeight, e.x, e.y, scaleMult, offsetX, offsetY)
    e.sprite.tint = e.hitTimer > HIT_SHAKE_DURATION - HIT_FLASH_DURATION ? 0xff5050 : e.baseTint
  }

  /** 敵人死亡：把 sprite 移交給 deathFx 播完淡出/縮小（或真的死亡幀圖）才真正釋放回物件池。 */
  startDeathFx(e: EnemyInstance) {
    const frames = this.enemyFrames[e.typeId]?.death ?? [e.sprite.texture]
    this.deathFx.push({ sprite: e.sprite, frames, targetHeight: e.spriteHeight, x: e.x, y: e.y, timer: 0 })
  }

  updateDeathFx(dt: number) {
    if (this.deathFx.length === 0) return
    for (const d of this.deathFx) {
      d.timer += dt
      const t = Math.min(1, d.timer / DEATH_FX_DURATION)
      const hasReal = d.frames.length > 1
      if (hasReal) {
        const frameDur = DEATH_FX_DURATION / d.frames.length
        const idx = Math.min(d.frames.length - 1, Math.floor(d.timer / frameDur))
        this.applyAnimVisual(d.sprite, d.frames[idx], d.targetHeight, d.x, d.y, 1, 0, 0)
      } else {
        this.applyAnimVisual(d.sprite, d.frames[0], d.targetHeight, d.x, d.y - t * 14, 1 - t * 0.4, 0, 0)
      }
      d.sprite.alpha = 1 - t
    }
    if (this.deathFx.some(d => d.timer >= DEATH_FX_DURATION)) {
      for (const d of this.deathFx) {
        if (d.timer >= DEATH_FX_DURATION) {
          d.sprite.visible = false
          d.sprite.alpha = 1
          this.enemySpritePool.release(d.sprite)
        }
      }
      this.deathFx = this.deathFx.filter(d => d.timer < DEATH_FX_DURATION)
    }
  }

  /** 背景圖鋪滿整個畫面（等同 CSS background-size:cover），置中裁切多餘部分。
   * 森林遺跡探索模式不是這樣——使用者提供的手繪地圖是橫向構圖，內容集中在
   * 畫面中段，cover-fit 會把左右兩側裁光。改成 fit-width：寬度完全對齊
   * 世界寬度（不裁切），貼在世界最上方（anchor 0,0），下面涵蓋不到的部分
   * 由 init() 先鋪好的純色 ground 負責，見那邊的說明。 */
  layoutBackground() {
    if (!this.app || !this.bgSprite) return
    const tex = this.bgSprite.texture
    if (this.exploreWorld) {
      const { width } = this.exploreWorld.world
      const scale = width / tex.width
      this.bgSprite.scale.set(scale)
      this.bgSprite.x = 0
      this.bgSprite.y = 0
      return
    }
    const { width, height } = this.app.screen
    const scale = Math.max(width / tex.width, height / tex.height)
    this.bgSprite.scale.set(scale)
    this.bgSprite.x = width / 2
    this.bgSprite.y = height / 2
  }

  /** 換區時隨機挑一張同主題的背景變化圖，換個場景感覺。 */
  randomizeBackground() {
    if (!this.bgSprite || this.bgTextures.length === 0) return
    this.bgSprite.texture = this.bgTextures[Math.floor(Math.random() * this.bgTextures.length)]
    this.layoutBackground()
  }

  getZoneNode(id: number): ArenaZoneNode | undefined {
    return this.dungeon.find(n => n.id === id)
  }

  /**
   * 森林遺跡固定關卡（2026-08）的進場邏輯，是 enterZone() 的固定版對應——
   * 差別是這裡完全不碰分區/大門/祭壇/卡牌三選一（一個 Stage 就是一場完整
   * 獨立的戰鬥，不是多區地城），敵人/Hazard/Objective 全部照 CampaignStage
   * 資料表點名生成，不用任何加權隨機。
   */
  initCampaignStage(stage: CampaignStage) {
    if (!this.app) return
    // 森林遺跡 1-1~1-5：完全不同的進場流程（不立刻生怪、不立刻放 Boss，
    // 交給 updateExploreWorld() 依玩家走到哪裡才觸發），見 exploreWorlds.ts。
    if (this.exploreWorld) { this.initExploreStage(stage, this.exploreWorld); return }
    this.currentZoneType = 'battle'
    this.enemiesEmptySec = 0
    // stage_start 的波次直接生成，其餘留給 updateCampaignWaves() 依各自的
    // WaveTrigger 條件排程（2026-08-12 V2：資料驅動，不寫死 stageId 判斷）。
    this.pendingWaves = (stage.waves ?? []).filter(w => {
      if (w.trigger.type === 'stage_start') { this.spawnCampaignWave(w); return false }
      return true
    })
    this.objectiveState = {
      objective: stage.objective,
      resolved: false,
      won: false,
      huntTargetDefeated: false,
      elapsedInObjectiveSec: 0,
      destroyRemaining: stage.objective.destroyCount ?? 0,
      collectibles: [],
      collectedCount: 0,
      escapeX: 0,
      escapeY: 0,
      escapeGfx: null,
      customStarFailed: false,
    }

    if (stage.objective.type === 'defense') {
      const { width, height } = this.app.screen
      const gfx = new Graphics()
      gfx.circle(0, 0, 30).fill({ color: 0x2a4a7a }).stroke({ color: 0x8ad4ff, width: 3 })
      gfx.circle(0, 0, 12).fill({ color: 0x8ad4ff, alpha: 0.8 })
      gfx.x = width / 2; gfx.y = height * 0.32
      this.worldLayer!.addChild(gfx)
      const maxHp = stage.objective.defenseTargetMaxHp ?? 400
      this.defenseCore = { x: width / 2, y: height * 0.32, hp: maxHp, maxHp, gfx }
    }

    if (stage.objective.type === 'collection' && this.objectiveState) {
      this.objectiveState.collectibles = spawnCollectibles(this, stage.objective.collectCount ?? 5)
    }

    if (stage.objective.type === 'escape' && this.objectiveState && stage.objective.escapeTarget) {
      const { width, height } = this.app.screen
      const x = width * stage.objective.escapeTarget.xRatio
      const y = height * stage.objective.escapeTarget.yRatio
      const gfx = new Graphics()
      gfx.rect(-26, -36, 52, 72).fill({ color: 0x6db8ff, alpha: 0.7 }).stroke({ color: 0xffffff, width: 2 })
      gfx.x = x; gfx.y = y
      this.worldLayer!.addChild(gfx)
      this.objectiveState.escapeX = x; this.objectiveState.escapeY = y; this.objectiveState.escapeGfx = gfx
    }

    for (const h of stage.hazards ?? []) {
      if ((h.triggerAtSec ?? 0) > 0) continue // 有觸發時間的交給 updateCampaignWaves() 一併排程
      for (let i = 0; i < h.count; i++) this.spawnStageHazard(h)
    }

    if (stage.boss) {
      this.bossState = 'alive'
      const bossType = ALL_CAMPAIGN_STAGE_ENEMIES[stage.boss.bossEnemyId]
      if (bossType) {
        const count = stage.boss.count ?? 1
        // 多隻同時出現時（1-18 雙獸人隊長）每隻血量打折，避免跟單人版 Boss
        // 共用同一份 hpMult 時，玩家要重複打兩份滿血 Boss，戰鬥被拖到不合理長。
        const hpOpt = count > 1 ? { hpMultOverride: 0.6 } : undefined
        // Boss 一開場就要站在場地上方中間（不是跟小怪一樣從畫面外走進來）：
        // 直接指定生成座標，蓋掉 spawnEnemyOfType() 預設的「畫面外隨機邊」邏輯。
        const { width } = this.app.screen
        const y = ARENA_TOP_MARGIN
        for (let i = 0; i < count; i++) {
          const x = count > 1 ? width * (0.35 + i * 0.3) : width / 2
          this.spawnEnemyOfType(bossType, { ...hpOpt, x, y })
        }
      }
    }
  }

  /** 依 EnemyWave 資料生成固定敵人（不是加權隨機），供開場立即波次跟 updateCampaignWaves() 共用。
   * nearZone 有值時（森林遺跡探索模式）改成從這個矩形邊緣冒出來，而不是
   * spawnEnemyOfType() 預設的「整個畫面邊緣」（那個邏輯是螢幕座標，探索
   * 模式下鏡頭會偏移，直接沿用會生到不合理的世界座標位置）。
   *
   * 探索模式下，敵人 typeId 如果對應到一個還沒被領走的 linkedEnemyId 地標
   * （見 exploreWorlds.ts），會直接生在那個地標座標上並綁定它，取代
   * pickZoneEdgeSpawn 的隨機邊緣落點——不是新內容，只是這一隻既有敵人生
   * 在哪裡改了，數量/時機/波次結構完全沒動。 */
  spawnCampaignWave(wave: EnemyWave, nearZone?: { x: number; y: number; width: number; height: number }) {
    for (const [id, count] of Object.entries(wave.enemies)) {
      const type = ALL_CAMPAIGN_STAGE_ENEMIES[id]
      if (!type) continue
      for (let i = 0; i < count; i++) {
        const bound = this.exploreWorld ? this.claimExploreLandmarkForEnemy(id) : null
        const pos = bound ? { x: bound.landmark.x, y: bound.landmark.y } : (nearZone ? this.pickZoneEdgeSpawn(nearZone) : undefined)
        const enemy = this.spawnEnemyOfType(type, pos)
        if (bound && enemy) this.exploreEnemyLandmarks.set(enemy, bound)
      }
    }
    for (const [id, count] of Object.entries(wave.eliteEnemies ?? {})) {
      const type = ALL_CAMPAIGN_STAGE_ENEMIES[id]
      if (!type) continue
      for (let i = 0; i < count; i++) {
        const bound = this.exploreWorld ? this.claimExploreLandmarkForEnemy(id) : null
        const pos = bound ? { x: bound.landmark.x, y: bound.landmark.y } : (nearZone ? this.pickZoneEdgeSpawn(nearZone) : undefined)
        const enemy = this.spawnEnemyOfType(type, { ...pos, isElite: true })
        if (bound && enemy) this.exploreEnemyLandmarks.set(enemy, bound)
      }
    }
  }

  /** 找一個還沒被領走、linkedEnemyId 對得上這個敵人 typeId 的地標，領走並
   * 回傳（一個地標只會被一隻敵人綁定一次）。 */
  claimExploreLandmarkForEnemy(typeId: string): { landmark: ExploreLandmark; gfx: Graphics; text: Text; claimed: boolean } | null {
    const entry = this.exploreLandmarkSprites.find(e => e.landmark.linkedEnemyId === typeId && !e.claimed)
    if (!entry) return null
    entry.claimed = true
    return entry
  }

  /** linkedEnemyId 綁定的敵人死亡時呼叫：地標變灰、文字加註「已清除」，
   * 讓玩家看到「這個地標對應的敵人真的死了」而不是純裝飾。 */
  markExploreLandmarkCleared(entry: { landmark: ExploreLandmark; gfx: Graphics; text: Text }) {
    entry.gfx.alpha = 0.28
    entry.text.text = `${entry.landmark.label}（已清除）`
  }

  /** 依 StageHazardConfig 資料生成一團固定 Hazard（隨機落點，避開螢幕最邊緣）。 */
  spawnStageHazard(h: NonNullable<CampaignStage['hazards']>[number]) {
    if (!this.app) return
    if (this.exploreWorld) {
      const z = this.exploreWorld.battleZone
      const x = z.x + Math.random() * z.width
      const y = z.y + Math.random() * z.height
      this.spawnHazard(x, y, h.radius, h.dps, h.duration, h.kind, h.slowMult, h.rootSec)
      return
    }
    const { width, height } = this.app.screen
    const x = width * 0.2 + Math.random() * width * 0.6
    const y = height * 0.3 + Math.random() * height * 0.5
    this.spawnHazard(x, y, h.radius, h.dps, h.duration, h.kind, h.slowMult, h.rootSec)
  }

  // ══════════════════════════════════════════════════════════════════
  // 森林遺跡 1-1~1-5：同一張地圖完成探索＋戰鬤＋結算（2026-08-17）
  // ══════════════════════════════════════════════════════════════════

  /** 探索關卡進場：跟 initCampaignStage 一樣要準備 objectiveState，但完全
   * 不立刻生怪/放 Boss——那些留給 updateExploreWorld() 依玩家走到哪裡才
   * 觸發。持續型 Hazard（不是排程觸發的那種）維持開場就存在，只是位置改
   * 落在 battleZone 附近，不是整個世界隨機。 */
  initExploreStage(stage: CampaignStage, world: ExploreWorld) {
    this.currentZoneType = 'battle'
    this.enemiesEmptySec = 0
    this.exploreState = 'roam'
    this.exploreBossTriggered = false
    this.pendingWaves = []
    this.objectiveState = {
      objective: stage.objective,
      resolved: false,
      won: false,
      huntTargetDefeated: false,
      elapsedInObjectiveSec: 0,
      destroyRemaining: stage.objective.destroyCount ?? 0,
      collectibles: [],
      collectedCount: 0,
      escapeX: 0,
      escapeY: 0,
      escapeGfx: null,
      customStarFailed: false,
    }
    for (const h of stage.hazards ?? []) {
      if ((h.triggerAtSec ?? 0) > 0) continue
      for (let i = 0; i < h.count; i++) this.spawnStageHazard(h)
    }
    for (const landmark of world.landmarks) this.spawnExploreLandmark(landmark)
    this.exploreExitGfx = this.spawnExploreExitMarker(world.exit)
    if (EXPLORE_COLLISION_DEBUG) this.spawnExploreCollisionDebug(world)

    // 鏡頭直接對準出生點，不要從世界左上角慢慢漂過去。
    const vw = this.app?.screen.width ?? 390
    const vh = this.app?.screen.height ?? 700
    this.camera = {
      x: Math.max(0, Math.min(world.world.width - vw, world.spawn.x - vw / 2)),
      y: Math.max(0, Math.min(world.world.height - vh, world.spawn.y - vh / 2)),
    }
    this.worldLayer?.position.set(-this.camera.x, -this.camera.y)
  }

  /** 開發用：URL 帶 ?collision=1 時把 colliders/battleZone 畫成半透明外框，
   * 只在這個旗標開啟時呼叫，正式玩家看不到（見 EXPLORE_COLLISION_DEBUG）。
   * 純疊加在 worldLayer 最上層，不影響任何碰撞判定本身。 */
  spawnExploreCollisionDebug(world: ExploreWorld) {
    if (!this.worldLayer) return
    for (const rect of world.colliders) {
      const gfx = new Graphics()
      gfx.rect(rect.x, rect.y, rect.width, rect.height).fill({ color: 0xff3050, alpha: 0.18 }).stroke({ color: 0xff3050, width: 3, alpha: 0.9 })
      this.worldLayer.addChild(gfx)
    }
    const z = world.battleZone
    const zoneGfx = new Graphics()
    zoneGfx.rect(z.x, z.y, z.width, z.height).stroke({ color: 0x30c0ff, width: 3, alpha: 0.8 })
    this.worldLayer.addChild(zoneGfx)
    const spawnGfx = new Graphics()
    spawnGfx.circle(world.spawn.x, world.spawn.y, EXPLORE_PLAYER_COLLIDE_RADIUS).stroke({ color: 0x30ff80, width: 3, alpha: 0.9 })
    this.worldLayer.addChild(spawnGfx)
  }

  /** 每幀推進：鏡頭跟隨、走到 battleZone 觸發既有戰鬤資料、戰鬤清空後解鎖
   * 出口、走到出口完成整關。不呼叫 isObjectiveWon() 自動判定（見
   * updateObjective 的 exploreWorld 分支），完成時機完全由這裡手動決定。 */
  updateExploreWorld(_dt: number) {
    if (!this.exploreWorld || !this.campaignStage) return
    const world = this.exploreWorld
    this.updateExploreCamera()
    this.updateExploreInteractables()

    if (this.exploreState === 'roam') {
      const z = world.battleZone
      const inZone = this.player.x >= z.x && this.player.x <= z.x + z.width
        && this.player.y >= z.y && this.player.y <= z.y + z.height
      if (inZone) this.triggerExploreEncounter(this.campaignStage, world)
    } else if (this.exploreState === 'encounter') {
      if (this.pendingWaves.length === 0 && this.enemies.length === 0) {
        this.exploreState = 'cleared'
        if (this.exploreExitGfx) this.exploreExitGfx.alpha = 1
        this.spawnFloatingText('已清空，可以前往出口', this.player.x, this.player.y - 50)
      }
    } else if (this.exploreState === 'cleared') {
      const dist = Math.hypot(this.player.x - world.exit.x, this.player.y - world.exit.y)
      if (dist <= world.exit.radius) this.finishCampaignStage(true)
    }
  }

  /** supply/chest 地標真的有狀態：走近自動觸發（跟 battleZone/exit 同一套
   * 「走進去就觸發」，不用另外按鈕），每個地標只能觸發一次（exploreInteracted
   * 記錄 id）。supply 直接回血；chest 累加 exploreBonusEnhanceStones，等
   * finishCampaignStage() 結算時併入 campaignResult，由外層（App.tsx）
   * 跟關卡固定掉落一起發放——不開一條新的「戰鬤中直接寫存檔」路徑，避免
   * 玩家中途放棄也能偷到獎勵。totem/altar/boss 地標不在這裡處理，它們是
   * 綁定敵人的死亡狀態（見 claimExploreLandmarkForEnemy/markExploreLandmarkCleared），
   * 本身不是可以「走過去」觸發的東西。 */
  updateExploreInteractables() {
    if (!this.exploreWorld) return
    for (const entry of this.exploreLandmarkSprites) {
      const { landmark } = entry
      if (landmark.kind !== 'supply' && landmark.kind !== 'chest') continue
      if (this.exploreInteracted.has(landmark.id)) continue
      const dist = Math.hypot(this.player.x - landmark.x, this.player.y - landmark.y)
      if (dist > EXPLORE_INTERACT_RADIUS) continue
      this.exploreInteracted.add(landmark.id)
      entry.gfx.alpha = 0.3
      if (landmark.kind === 'supply') {
        const heal = this.player.maxHp * ALTAR_HEAL_PCT
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal)
        this.spawnFloatingText(`+${Math.round(heal)} HP`, landmark.x, landmark.y - 40)
        this.spawnGlowBurst(landmark.x, landmark.y, 0x6adf9a, 70)
        entry.text.text = `${landmark.label}（已使用）`
      } else {
        this.exploreBonusEnhanceStones += EXPLORE_CHEST_ENHANCE_STONES
        this.spawnFloatingText(`強化石 +${EXPLORE_CHEST_ENHANCE_STONES}`, landmark.x, landmark.y - 40)
        this.spawnGlowBurst(landmark.x, landmark.y, 0xffd94a, 70)
        entry.text.text = `${landmark.label}（已開啟）`
      }
    }
  }

  /** 走進 battleZone：Boss 關（1-5）直接站在 zone 中央生成 Boss，其餘關卡
   * 觸發 stage.waves 的 stage_start 波次（其餘波次維持照既有 WaveTrigger
   * 規則自動接續，見 updateCampaignWaves——完全沒有改寫波次資料或平衡）。 */
  triggerExploreEncounter(stage: CampaignStage, world: ExploreWorld) {
    this.exploreState = 'encounter'
    this.spawnGlowBurst(this.player.x, this.player.y, 0xff6a4a, 90)
    for (const entry of this.exploreLandmarkSprites) {
      if (entry.landmark.kind === 'boss') { entry.gfx.visible = false; entry.text.visible = false }
    }

    if (stage.boss) {
      this.bossState = 'alive'
      const bossType = ALL_CAMPAIGN_STAGE_ENEMIES[stage.boss.bossEnemyId]
      if (bossType) {
        const count = stage.boss.count ?? 1
        const hpOpt = count > 1 ? { hpMultOverride: 0.6 } : undefined
        const z = world.battleZone
        // 有 boss 地標的話直接生在地標座標上（跟地標視覺完全對齊，地標
        // 本身已經在上面那個迴圈隱藏了），沒有地標才 fallback 回原本的
        // zone 相對公式。
        const bossLandmark = world.landmarks.find(l => l.kind === 'boss')
        const bossLandmarkEntry = bossLandmark ? this.exploreLandmarkSprites.find(e => e.landmark === bossLandmark) : undefined
        for (let i = 0; i < count; i++) {
          const x = bossLandmark ? bossLandmark.x + (count > 1 ? (i - (count - 1) / 2) * 90 : 0)
            : (count > 1 ? z.x + z.width * (0.35 + i * 0.3) : z.x + z.width / 2)
          const y = bossLandmark ? bossLandmark.y : z.y + z.height * 0.22
          const enemy = this.spawnEnemyOfType(bossType, { ...hpOpt, x, y })
          // boss 地標本身已經隱藏了（上面那個迴圈），這裡綁定純粹是讓
          // exploreEnemyLandmarks 語意一致（linkedEnemyId 真的有對應到綁定），
          // 不會有額外的視覺效果。
          if (bossLandmarkEntry && enemy) this.exploreEnemyLandmarks.set(enemy, bossLandmarkEntry)
        }
      }
      return
    }

    this.pendingWaves = (stage.waves ?? []).filter(w => {
      if (w.trigger.type === 'stage_start') { this.spawnCampaignWave(w, world.battleZone); return false }
      return true
    })
  }

  /** battleZone 矩形邊緣（往外擴一點 margin）隨機挑一點，取代 spawnEnemyOfType()
   * 預設的「整個螢幕邊緣」隨機點——探索模式下螢幕邊緣不等於合理的世界座標。 */
  pickZoneEdgeSpawn(zone: { x: number; y: number; width: number; height: number }): { x: number; y: number } {
    const margin = 70
    const edge = Math.floor(Math.random() * 4)
    if (edge === 0) return { x: zone.x + Math.random() * zone.width, y: zone.y - margin }
    if (edge === 1) return { x: zone.x + zone.width + margin, y: zone.y + Math.random() * zone.height }
    if (edge === 2) return { x: zone.x + Math.random() * zone.width, y: zone.y + zone.height + margin }
    return { x: zone.x - margin, y: zone.y + Math.random() * zone.height }
  }

  /** 鏡頭永遠跟隨玩家本人（不分 roam/encounter），clamp 在世界邊界內，
   * lerp 平滑移動——2026-08-18 修正：之前 encounter 狀態鏡頭目標改鎖
   * battleZone 中心，玩家一進戰鬤區鏡頭會跳去對準區域中心而不是角色，
   * 視覺上變成「角色從畫面外跑進來」，跟需求「英雄永遠在正中央」相反。 */
  updateExploreCamera() {
    if (!this.exploreWorld || !this.app || !this.worldLayer) return
    const { width, height } = this.app.screen
    const world = this.exploreWorld.world
    const targetX = this.player.x
    const targetY = this.player.y
    const camX = Math.max(0, Math.min(Math.max(0, world.width - width), targetX - width / 2))
    const camY = Math.max(0, Math.min(Math.max(0, world.height - height), targetY - height / 2))
    this.camera.x += (camX - this.camera.x) * 0.12
    this.camera.y += (camY - this.camera.y) * 0.12
    this.worldLayer.position.set(-this.camera.x, -this.camera.y)
  }

  spawnExploreLandmark(landmark: ExploreLandmark) {
    if (!this.worldLayer) return
    const color: Record<LandmarkKind, number> = {
      totem: 0xd88a4a, altar: 0x8ad4ff, shaman: 0xb06adf, chest: 0xffd94a, supply: 0x6adf9a, boss: 0xff5a5a,
    }
    const gfx = new Graphics()
    gfx.roundRect(-30, -30, 60, 60, 12).fill({ color: color[landmark.kind], alpha: 0.85 }).stroke({ color: 0xffffff, width: 2 })
    gfx.x = landmark.x; gfx.y = landmark.y
    this.worldLayer.addChild(gfx)
    const text = new Text({ text: landmark.label, style: { fontSize: 14, fontWeight: 'bold', fill: 0xffffff, stroke: { color: 0x000000, width: 3 } } })
    text.anchor.set(0.5)
    text.x = landmark.x; text.y = landmark.y + 42
    this.worldLayer.addChild(text)
    this.exploreLandmarkSprites.push({ landmark, gfx, text, claimed: false })
  }

  spawnExploreExitMarker(exit: { x: number; y: number; radius: number }): Graphics | null {
    if (!this.worldLayer) return null
    const gfx = new Graphics()
    gfx.circle(0, 0, 36).fill({ color: 0x6adf9a, alpha: 0.3 }).stroke({ color: 0x6adf9a, width: 3 })
    gfx.x = exit.x; gfx.y = exit.y
    gfx.alpha = 0.35 // 通關前半透明，表示還不能用；清空後 updateExploreWorld 會設回 1
    this.worldLayer.addChild(gfx)
    return gfx
  }

  /** 每幀檢查是否有排定的波次/Hazard 該觸發了（森林遺跡固定關卡專用）。 */
  /** WaveTrigger 判定（2026-08-12 V2）：純函式邏輯內嵌在方法裡，因為 remaining_enemy_count/previous_wave_cleared 都要讀 this.enemies/this.enemiesEmptySec 目前狀態。 */
  isWaveTriggerReady(trigger: WaveTrigger): boolean {
    switch (trigger.type) {
      case 'stage_start': return true // 正常不會留到這裡（initCampaignStage 已經即時生成），防禦性保留
      case 'elapsed_time': return this.elapsed >= trigger.sec
      case 'previous_wave_cleared': return this.enemies.length === 0 && this.enemiesEmptySec >= (trigger.delaySec ?? 0)
      case 'remaining_enemy_count': return this.enemies.filter(e => e.alive).length <= trigger.count
    }
  }

  /** 每幀檢查是否有排定的波次/Hazard 該觸發了（森林遺跡固定關卡專用）。 */
  updateCampaignWaves(dt: number) {
    if (!this.campaignStage) return
    // 一次只生成「當下」符合條件的一波，生成後立刻重新評估剩下的波次——
    // 不能一次批次評估全部再一起生成：如果連續兩波都是 previous_wave_cleared，
    // 在同一幀裡兩者都會讀到「敵人是 0」這個尚未更新的舊狀態而同時觸發，
    // 變成兩波疊在一起瞬間出現。每次只处理一波、生成後馬上讓 enemies.length
    // 反映最新狀態，下一波才會正確等到「這一波」清空才觸發。
    let spawnedThisFrame = true
    while (spawnedThisFrame && this.pendingWaves.length > 0) {
      spawnedThisFrame = false
      const idx = this.pendingWaves.findIndex(w => this.isWaveTriggerReady(w.trigger))
      if (idx >= 0) {
        const [w] = this.pendingWaves.splice(idx, 1)
        this.spawnCampaignWave(w, this.exploreWorld?.battleZone)
        spawnedThisFrame = true
      }
    }
    for (const h of this.campaignStage.hazards ?? []) {
      if (h.triggerAtSec === undefined || h.triggerAtSec <= 0) continue
      if (this.elapsed >= h.triggerAtSec && this.elapsed < h.triggerAtSec + dt) {
        for (let i = 0; i < h.count; i++) this.spawnStageHazard(h)
      }
    }
  }

  /**
   * 每幀判定森林遺跡固定關卡的 Objective 進度/勝負。玩家死亡導致的失敗走
   * triggerGameOver() → finishCampaignStage(false) 這條路（見那邊），這裡只
   * 處理其餘型別（主要是 Defense 目標被摧毀）跟正常通關判定。
   */
  updateObjective(dt: number) {
    if (!this.campaignStage || !this.objectiveState) return
    const state = this.objectiveState
    if (state.resolved) return
    updateObjectiveState(state, this, dt)

    if (this.defenseCore && this.defenseCore.hp > 0) {
      // Defense 目標刻意不進 this.enemies[]（玩家不會誤攻擊自己要保護的東西），
      // 用「附近存活敵人持續扣血」這個被動機制取代改寫每種 AI 的攻擊目標邏輯。
      for (const e of this.enemies) {
        if (!e.alive) continue
        const dist = Math.hypot(e.x - this.defenseCore.x, e.y - this.defenseCore.y)
        if (dist <= DEFENSE_CORE_DRAIN_RADIUS) {
          this.defenseCore.hp = Math.max(0, this.defenseCore.hp - DEFENSE_CORE_DRAIN_PER_SEC * dt)
        }
      }
    }

    if (isObjectiveLost(state, this)) { this.finishCampaignStage(false); return }
    // 森林遺跡探索模式（exploreWorld 有值）不用這裡的自動判定——玩家清空
    // battleZone 敵人的當下 isObjectiveWon() 可能就已經是 true 了，但關卡
    // 還沒真的結束（要等玩家走到出口），見 updateExploreWorld()。完成時機
    // 完全由那邊手動呼叫 finishCampaignStage(true)。
    if (!this.exploreWorld && isObjectiveWon(state, this)) { this.finishCampaignStage(true) }
  }

  /** 森林遺跡固定關卡結算：暫停戰鬥、算三星、把結果塞進 HUD（見 ArenaHudState.campaignResult）。跟 Arena Roguelite Run 的 triggerGameOver()/pauseForBossLoot() 完全分開，不共用語意。 */
  finishCampaignStage(won: boolean) {
    if (!this.campaignStage || !this.objectiveState || this.objectiveState.resolved) return
    this.objectiveState.resolved = true
    this.objectiveState.won = won
    this.gameOver = !won
    this.runComplete = won
    const starConditionsMet = won
      ? this.evaluateCampaignStars(this.campaignStage)
      : ([false, false, false] as [boolean, boolean, boolean])
    const stars = starConditionsMet.filter(Boolean).length as 0 | 1 | 2 | 3
    this.campaignResult = {
      won, stars, starConditionsMet,
      objectiveLabel: this.campaignStage.starConditions[0]?.description ?? this.campaignStage.name,
      bonusEnhanceStones: won && this.exploreBonusEnhanceStones > 0 ? this.exploreBonusEnhanceStones : undefined,
    }
    this.emitHud()
    this.app?.ticker.stop()
  }

  /** 依 CampaignStage.starConditions 逐條判定三星（只在通關時呼叫，見 finishCampaignStage）。部分條件依賴的統計（Boss 技能命中/反擊次數等）要等對應 Boss 在任務 #36/#37 實作技能表才會真的被寫入，目前這類條件會因為統計恆為 0 而「保守地」判定為達成或未達成，見各 case 註解。 */
  evaluateCampaignStars(stage: CampaignStage): [boolean, boolean, boolean] {
    const evalOne = (c: CampaignStage['starConditions'][number]): boolean => {
      switch (c.type) {
        case 'clear':
          return true
        case 'time_under':
          return this.elapsed <= (c.value ?? Infinity)
        case 'hp_above':
          return this.player.maxHp > 0 && (this.player.hp / this.player.maxHp) * 100 >= (c.value ?? 0)
        case 'hits_under':
          return this.campaignStats.hitsTaken <= (c.value ?? 0)
        case 'avoid_hazard': {
          const value = c.value ?? 0
          if (c.hazardId === 'any') {
            const total = Object.values(this.campaignStats.hazardHits).reduce((s, n) => s + n, 0)
            return total <= value
          }
          if (c.hazardId === 'poison_cumulative_pct') {
            return this.campaignStats.poisonDamageTaken <= this.player.maxHp * (value / 100)
          }
          return (this.campaignStats.hazardHits[c.hazardId ?? ''] ?? 0) <= value
        }
        case 'avoid_skill':
          // skillHits 由各 Boss 技能命中時寫入（見任務 #36/#37），目前尚未有任何 Boss
          // 技能會寫入這個統計，數字恆為 0——對「不被 X 命中」這類條件剛好是正確的保守值。
          return (this.campaignStats.skillHits[c.skillId ?? ''] ?? 0) <= (c.value ?? 0)
        case 'destroy_within':
          // 見 damageEnemy() 的 root_core 死亡分支：每一批 Core 全滅時都會檢查
          // 是否超過這條件的秒數限制，超過就永久標記違規（不會因為下一批清快了就洗白）。
          return !this.campaignStats.destroyWithinViolated
        case 'protect_hp':
          return !!this.defenseCore && this.defenseCore.maxHp > 0 &&
            (this.defenseCore.hp / this.defenseCore.maxHp) * 100 >= (c.value ?? 0)
        case 'heal_count_under':
          return (this.campaignStats.healCounts[c.targetId ?? ''] ?? 0) <= (c.value ?? 0)
        case 'control_count_under':
          return this.campaignStats.controlHits <= (c.value ?? 0)
        case 'counter_trigger_under':
          // counterTriggers 由黑騎士 Counter 命中時寫入（見任務 #37），尚未實作前恆為 0。
          return this.campaignStats.counterTriggers <= (c.value ?? 0)
        case 'no_death':
          return !this.campaignStats.diedDuringStage
        case 'custom':
          return this.evaluateCustomStar(stage)
      }
    }
    return [evalOne(stage.starConditions[0]), evalOne(stage.starConditions[1]), evalOne(stage.starConditions[2])]
  }

  /** custom 星星條件是逐關量身訂做的特殊情境（見資料表 1-3/1-4/1-7，2-3/2-4/2-7，
   * 3-3/3-4/3-7——2026-08-16 三篇章從 20 關砍到 10 關後，這三個 case 的
   * stage id 跟著新的關卡編號重新對應），不是通用機制，直接依 stage id 分派。
   * 雪原/魔王城兩個篇章跟森林同一序位關卡是同一套骨架換皮，直接複製三個
   * case 換敵人 id。 */
  evaluateCustomStar(stage: CampaignStage): boolean {
    switch (stage.id) {
      case 'forest_1_3': // 擊敗所有哥布林弓手
        return !this.enemies.some(e => e.typeId === 'goblin_archer' && e.alive)
      case 'snowfield_2_3':
        return !this.enemies.some(e => e.typeId === 'frost_archer' && e.alive)
      case 'castle_3_3':
        return !this.enemies.some(e => e.typeId === 'imp_archer' && e.alive)
      case 'forest_1_4': // 擊敗全部敵人（主要 Objective 只要求擊敗薩滿）
      case 'snowfield_2_4':
      case 'castle_3_4':
        return !this.enemies.some(e => e.alive) && this.pendingWaves.length === 0
      case 'forest_1_7': // 優先擊敗薩滿：其他非森林樹精敵人不能先死
      case 'snowfield_2_7':
      case 'castle_3_7':
        return !(this.objectiveState?.customStarFailed ?? false)
      default:
        return false
    }
  }

  /** 進入指定節點：依類型生怪/放祭壇/觸發三選一/發獎勵。 */
  enterZone(nodeId: number) {
    const node = this.getZoneNode(nodeId)
    if (!node || !this.app) return
    this.currentNodeId = nodeId
    this.currentZoneType = node.type
    this.zoneEnemiesRemaining = 0
    this.altarGfx = null
    this.altarPos = null
    this.altarTriggered = false
    this.randomizeBackground()

    switch (node.type) {
      case 'battle': {
        const count = Math.min(8, 4 + node.row)
        for (let i = 0; i < count; i++) this.spawnEnemyOfType(pickEnemyType(this.elapsed, this.campaign))
        this.zoneEnemiesRemaining = count
        break
      }
      case 'elite': {
        this.spawnEnemyOfType(pickEnemyType(this.elapsed, this.campaign), { isElite: true })
        this.zoneEnemiesRemaining = 1
        break
      }
      case 'rest': {
        const { width, height } = this.app.screen
        this.altarPos = { x: width / 2, y: height / 2 }
        const gfx = new Graphics()
        gfx.circle(0, 0, 34).fill({ color: 0x2a3a55 }).stroke({ color: 0x8ad4ff, width: 3 })
        gfx.circle(0, 0, 14).fill({ color: 0x8ad4ff, alpha: 0.7 })
        gfx.x = this.altarPos.x
        gfx.y = this.altarPos.y
        this.app.stage.addChild(gfx)
        this.altarGfx = gfx
        break
      }
      case 'card': {
        this.pendingZoneCardTrigger = true
        this.app.ticker.stop()
        this.onLevelUp()
        break
      }
      case 'hidden': {
        const gold = HIDDEN_GOLD_MIN + Math.floor(Math.random() * (HIDDEN_GOLD_MAX - HIDDEN_GOLD_MIN))
        this.bonusGold += gold
        this.spawnFloatingText(`發現隱藏寶藏！+${gold} 金幣`, this.player.x, this.player.y - 40)
        this.spawnGlowBurst(this.player.x, this.player.y, 0xffd94a, 70)
        this.completeZone()
        break
      }
      case 'boss': {
        this.bossState = 'alive'
        // Boss 一開場就站在場地上方中間，不用跟小怪一樣從畫面外走進來。
        const { width } = this.app.screen
        this.spawnEnemyOfType(getCampaignBoss(this.campaign), { x: width / 2, y: ARENA_TOP_MARGIN })
        break
      }
    }
  }

  /** 目前這區的條件達成（怪清光/摸到祭壇/選完卡），開門讓玩家走向下一區。 */
  completeZone() {
    this.clearDoors()
    const node = this.getZoneNode(this.currentNodeId)
    if (!node || node.connections.length === 0 || !this.app) return
    const { width } = this.app.screen
    const y = ARENA_TOP_MARGIN
    const positions = node.connections.length === 1 ? [width / 2] : [width * 0.32, width * 0.68]
    node.connections.forEach((targetId, i) => {
      const gfx = new Graphics()
      gfx.rect(-24, -34, 48, 68).fill({ color: 0x6db8ff, alpha: 0.85 }).stroke({ color: 0xffffff, width: 2 })
      gfx.x = positions[i]
      gfx.y = y
      this.app!.stage.addChild(gfx)
      this.doors.push({ gfx, x: positions[i], y, targetNodeId: targetId })
    })
  }

  clearDoors() {
    this.doors.forEach(d => d.gfx.destroy())
    this.doors = []
  }

  updateDoors() {
    if (this.doors.length === 0) return
    for (const d of this.doors) {
      const dist = Math.hypot(this.player.x - d.x, this.player.y - d.y)
      if (dist < DOOR_RADIUS) {
        const targetId = d.targetNodeId
        this.clearDoors()
        // 清掉走位過程中可能殘留的敵人/掉落物，乾淨進下一區
        this.enemies.forEach(e => { e.sprite.visible = false; this.enemySpritePool.release(e.sprite) })
        this.enemies = []
        // 還沒淡出完的死亡特效也一併收掉，不然殘影會跟著帶到下一區
        this.deathFx.forEach(d => { d.sprite.visible = false; d.sprite.alpha = 1; this.enemySpritePool.release(d.sprite) })
        this.deathFx = []
        if (!this.app) return
        this.player.x = this.app.screen.width / 2
        this.player.y = this.app.screen.height - ARENA_MARGIN - 40
        if (this.playerSprite) { this.playerSprite.x = this.player.x; this.playerSprite.y = this.player.y }
        this.enterZone(targetId)
        return
      }
    }
  }

  updateAltar() {
    if (!this.altarGfx || !this.altarPos || this.altarTriggered) return
    const dist = Math.hypot(this.player.x - this.altarPos.x, this.player.y - this.altarPos.y)
    if (dist < ALTAR_TRIGGER_RADIUS) {
      this.altarTriggered = true
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * ALTAR_HEAL_PCT)
      this.spawnFloatingText('感受到神聖之力的祝福，回復了30%生命值', this.altarPos.x, this.altarPos.y - 50)
      this.spawnGlowBurst(this.altarPos.x, this.altarPos.y, 0x8ad4ff, 60)
      this.altarGfx.destroy()
      this.altarGfx = null
      this.completeZone()
    }
  }

  spawnEnemyOfType(
    type: EnemyTypeDef,
    opts?: { isElite?: boolean; x?: number; y?: number; summonedBy?: EnemyInstance; hpMultOverride?: number },
  ) {
    if (!this.app) return
    const frames = this.enemyFrames[type.id]
    if (!frames) return
    const { width, height } = this.app.screen
    let pos: { x: number; y: number }
    if (opts?.x !== undefined && opts?.y !== undefined) {
      pos = { x: opts.x, y: opts.y }
    } else {
      const edge = Math.floor(Math.random() * 4)
      pos = edge === 0 ? { x: Math.random() * width, y: -40 }
        : edge === 1 ? { x: width + 40, y: Math.random() * height }
        : edge === 2 ? { x: Math.random() * width, y: height + 40 }
        : { x: -40, y: Math.random() * height }
    }

    const levelMult = 1 + (Math.max(1, this.level) - 1) * 0.18
    const isElite = !!opts?.isElite
    const eliteMult = isElite ? ELITE_HP_MULT : 1
    const hp = Math.round(ENEMY_BASE_HP * type.hpMult * levelMult * eliteMult * (opts?.hpMultOverride ?? 1))
    const baseTint = type.isBoss ? 0xffb0b0 : isElite ? ELITE_TINT : 0xffffff

    const sprite = this.enemySpritePool.acquire()
    sprite.texture = frames.idle[0]
    // 森林遺跡真圖（2026-08-12）：來源 20 幀共用同一個畫布、角色落地錨點不
    // 在畫布正中心，anchorRatio 有值時用那個比例，沒有的敵人（含全部舊敵人）
    // 維持原本 0.5/0.5 置中錨點，行為不變。
    sprite.anchor.set(type.anchorRatio?.x ?? 0.5, type.anchorRatio?.y ?? 0.5)
    sprite.alpha = 1
    this.setSpriteHeight(sprite, type.spriteHeight)
    sprite.tint = baseTint
    sprite.x = pos.x
    sprite.y = pos.y
    if (!sprite.parent) this.worldLayer!.addChild(sprite)

    const enemy: EnemyInstance = {
      sprite,
      x: pos.x,
      y: pos.y,
      hp,
      maxHp: hp,
      speed: ENEMY_BASE_SPEED * type.speedMult,
      damage: ENEMY_CONTACT_DAMAGE * type.damageMult * (isElite ? ELITE_DAMAGE_MULT : 1),
      isBoss: !!type.isBoss,
      isElite,
      alive: true,
      frostStacks: 0,
      frozenTimer: 0,
      armorBreakStacks: 0,
      burnStacks: 0,
      burnTimer: 0,
      holyMarkStacks: 0,
      holyMarkTimer: 0,
      shadowMarkStacks: 0,
      typeId: type.id,
      spriteHeight: type.spriteHeight,
      baseTint,
      animState: 'walk',
      animFrame: 0,
      animTimer: 0,
      hitTimer: 0,
      bobSeed: Math.random() * 10,
      aiType: type.aiType,
      state: 'seek',
      stateTimer: 0,
      attackCooldown: 0,
      targetX: pos.x,
      targetY: pos.y,
      velocityX: 0,
      velocityY: 0,
      skillCooldown: type.isBoss ? 1.5 : 0,
      bossPhase: 1,
      eliteModifier: isElite ? rollEliteModifier() : null,
      eliteModifierState: {},
      summonedCount: 0,
      isSummoned: !!opts?.summonedBy,
      summonedBy: opts?.summonedBy ?? null,
    }
    this.enemies.push(enemy)
    if (opts?.summonedBy) opts.summonedBy.summonedCount++
    return enemy
  }

  update(deltaMS: number) {
    if (!this.app || this.destroyed) return
    const dt = Math.min(deltaMS, 50) / 1000 // 夾住極端 dt（分頁切回）避免瞬移/穿牆
    this.elapsed += dt

    // FPS 估算
    this.fpsAccum += dt
    this.fpsFrames++
    if (this.fpsAccum >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsAccum)
      this.fpsAccum = 0
      this.fpsFrames = 0
    }

    // 必殺技 Cut-in：永遠推進（演出層本身不能被自己的暫停擋住），戰鬥模擬
    // 其餘系統依目前 phase 決定要不要暫停——freeze 子階段全部凍結（含玩家
    // 動畫，做出真正的定格 hitstop），cutin 子階段只暫停「戰鬥」相關系統，
    // 玩家的技能揮出動畫繼續播，跟 Cut-in 演出同步。
    this.updateUltimatePresentation(dt)
    const battlePaused = !!this.presentation?.active
    const hitstopFreeze = battlePaused && this.presentation!.phase === 'freeze'

    if (!battlePaused) this.updatePassives(dt)
    if (!battlePaused) this.updateKeystone(dt)
    if (!battlePaused) this.updateStatusEffects(dt)
    if (!battlePaused) this.updateMajorSkills(dt)
    if (!battlePaused) this.updatePlayerMovement(dt)
    if (!hitstopFreeze) this.updatePlayerAnim(dt)
    if (!battlePaused) this.updateEnemies(dt)
    if (!battlePaused) this.updateTelegraphs(dt)
    if (!battlePaused) this.updateEnemyProjectiles(dt)
    if (!battlePaused) this.updateHazards(dt)
    this.updateDeathFx(dt)
    if (!battlePaused) this.updateAutoAttack(dt)
    if (!battlePaused) this.updateProjectiles(dt)
    if (!battlePaused) this.updateGems(dt)
    if (!battlePaused) this.updateAltar()
    if (!battlePaused) this.updateDoors()
    if (!battlePaused && this.campaignStage) {
      this.enemiesEmptySec = this.enemies.length === 0 ? this.enemiesEmptySec + dt : 0
      this.updateCampaignWaves(dt)
      this.updateObjective(dt)
      if (this.exploreWorld) this.updateExploreWorld(dt)
    }
    this.updateFloatingTexts(dt)
    this.updateGlows(dt)

    this.hudEmitTimer += deltaMS
    if (this.hudEmitTimer >= HUD_EMIT_INTERVAL) {
      this.hudEmitTimer = 0
      this.emitHud()
    }
  }

  /** 遺物的持續性效果：護盾充能、生命回復。 */
  updatePassives(dt: number) {
    if (this.player.hp <= 0) return
    if (this.hpRegenPctPerSec > 0) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * this.hpRegenPctPerSec * dt)
    }
    // 神官祭司 Lv100 永晝聖域：持續期間每秒額外回血
    if (this.cfg.heroId === 'priest') {
      const heal = priestSanctuaryHealPerSec(this) * dt
      if (heal > 0) this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal)
    }
    if (this.shieldIntervalSec > 0) {
      this.shieldTimer += dt
      if (this.shieldTimer >= this.shieldIntervalSec) {
        this.shieldTimer -= this.shieldIntervalSec
        this.shieldCharges = Math.min(1, this.shieldCharges + 1)
      }
    }
    // 機關技師職業裝備：過載倒數（overloadOnKillPct 的觸發持續時間）
    if (this.overloadTimer > 0) this.overloadTimer = Math.max(0, this.overloadTimer - dt)
    // 武鬥家職業裝備：連擊層數多久沒命中就重置
    if (this.comboStacks > 0) {
      this.comboDecayTimer -= dt
      if (this.comboDecayTimer <= 0) this.comboStacks = 0
    }
  }

  /** 機關技師過載＋武鬥家連擊的臨時攻速加成乘數，消費點見攻擊冷卻計算處。 */
  getTempAtkSpeedMult(): number {
    let mult = 1
    if (this.overloadTimer > 0) mult *= 1 + this.overloadOnKillPct
    if (this.comboStacks > 0) mult *= 1 + this.comboAtkSpeedPct * this.comboStacks
    return mult
  }

  /**
   * 天賦樹職業技能（11個英雄各一種，見 src/arena/arenaTalents.ts 的
   * KEYSTONE_INFO）。只處理「週期觸發類」（聖騎士/火焰法師/神官祭司/
   * 遊俠獵人）跟 buff 倒數；機率觸發類掛在 fireProjectileAt/updateAutoAttack，
   * 疊層類掛在 damageEnemy/updateProjectiles，受擊反應類掛在 updateEnemies。
   */
  updateKeystone(dt: number) {
    if (this.keystoneBuffTimer > 0) this.keystoneBuffTimer -= dt

    if (this.player.hp <= 0) return
    const heroId = this.cfg.heroId
    if (!this.unlockedMajorSkillIds.has(`${heroId}_lv40`)) return
    const PERIODIC_INTERVAL: Record<string, number> = { knight: 20, mage: 8, priest: 10, archer: 12 }
    let interval = PERIODIC_INTERVAL[heroId]
    if (!interval) return
    if (heroId === 'mage') interval = mageMeteorInterval(this, interval) // Lv100 大招後隕星週期縮短
    this.keystoneTimer += dt
    if (this.keystoneTimer < interval) return
    this.keystoneTimer -= interval

    switch (heroId) {
      case 'knight':
        this.keystoneBuffTimer = 3
        this.spawnGlowBurst(this.player.x, this.player.y, 0x6db8ff, 140)
        this.spawnFloatingText('嘲諷！', this.player.x, this.player.y - 40)
        // Lv20 守護核心連動：施放瞬間聖印直接補滿5層
        if (this.unlockedMajorSkillIds.has('knight_lv20')) this.majorStacks = 5
        break
      case 'mage': {
        const target = this.findNearestEnemy()
        if (target) {
          this.damageEnemy(target, 60)
          this.spawnGlowBurst(target.x, target.y, 0xff6a3c, 70)
          // Lv20 燃燒連動：命中時目標燃燒層數直接封頂5層
          if (this.unlockedMajorSkillIds.has('mage_lv20') && target.burnStacks > 0) {
            target.burnStacks = 5
            target.burnTimer = Math.max(target.burnTimer, 3)
          }
        }
        break
      }
      case 'priest':
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.1)
        this.spawnGlowBurst(this.player.x, this.player.y, 0x8ad4ff, 60)
        // Lv20 聖光印記連動：施放瞬間所有帶聖印敵人立即結算回血
        if (this.unlockedMajorSkillIds.has('priest_lv20')) {
          for (const e of this.enemies) {
            if (e.alive && e.holyMarkStacks > 0) {
              this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * HOLY_MARK_HEAL_PCT_PER_STACK * e.holyMarkStacks)
              e.holyMarkStacks = 0
              e.holyMarkTimer = 0
            }
          }
        }
        break
      case 'archer':
        for (const e of this.enemies) {
          if (e.alive && Math.hypot(e.x - this.player.x, e.y - this.player.y) <= 260) {
            this.damageEnemy(e, 40)
            // Lv20 追風箭連動：命中敵人2秒內獲得「破風標記」，普攻對其傷害+15%（沿用 armorBreakStacks 同一套受傷加成邏輯太重，這裡改成短時間 hitTimer 式強化：簡化為直接補一次額外傷害）
          }
        }
        this.spawnGlowBurst(this.player.x, this.player.y, 0xffd94a, 260)
        break
    }
  }

  /**
   * 天賦系統 v2（2026-08）狀態效果 tick：燃燒（火焰法師 Lv20）持續傷害、
   * 聖印（神官祭司 Lv20）到期回血。用連續結算（乘 dt）取代逐秒 tick，
   * 跟現有 hpRegenPctPerSec 的既有寫法同一套慣例。哪個英雄的敵人身上會真的
   * 有 burnStacks/holyMarkStacks，完全由 onAttackHit() 是否寫入決定，這裡
   * 對所有英雄一視同仁地跑，沒有對應狀態的敵人自然是 no-op。
   */
  updateStatusEffects(dt: number) {
    for (const e of this.enemies) {
      if (!e.alive) continue
      if (e.burnStacks > 0) {
        this.damageEnemy(e, BURN_DAMAGE_PER_STACK_PER_SEC * e.burnStacks * dt)
        e.burnTimer -= dt
        if (e.burnTimer <= 0) { e.burnStacks = 0; e.burnTimer = 0 }
      }
      if (e.holyMarkTimer > 0) {
        e.holyMarkTimer -= dt
        if (e.holyMarkTimer <= 0) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * HOLY_MARK_HEAL_PCT_PER_STACK * e.holyMarkStacks)
          e.holyMarkStacks = 0
        }
      }
    }
  }

  /**
   * 天賦系統 v2（2026-08）Lv20/60/80 大型技能裡「非攻擊命中觸發、非擊殺觸發」
   * 的持續性/週期性行為分派點——命中觸發的邏輯留在 onAttackHit()，擊殺觸發
   * 留在 damageEnemy() 的擊殺分支，受擊觸發留在 damagePlayer()。每個 case
   * 只呼叫一行 arena/skills/{heroId}.ts 裡的函式，避免這裡塞成一個大 switch。
   */
  updateMajorSkills(dt: number) {
    if (this.player.hp <= 0) return
    switch (this.cfg.heroId) {
      case 'knight': knightMajorTick(this, dt); break
      case 'mage': mageMajorTick(this, dt); break
      case 'priest': priestMajorTick(this, dt); break
      case 'rogue': rogueMajorTick(this, dt); break
      case 'archer': archerMajorTick(this, dt); break
      case 'bard': bardMajorTick(this, dt); break
      case 'engineer': engineerMajorTick(this, dt); break
      case 'death_knight': deathKnightMajorTick(this, dt); break
    }
  }

  /** 類比搖桿輸入（-1~1 連續值，非固定8方向），取代舊的拖曳移動。由 React 端的虛擬搖桿呼叫。 */
  setMoveDir(dx: number, dy: number): void {
    this.moveDir = { x: dx, y: dy }
  }

  /**
   * 走位/輸出節奏的唯一「是否正在移動」判斷點，搖桿輸入強度需超過
   * MOVE_DEAD_ZONE 才算——濾掉手機虛擬搖桿鬆手瞬間的微小殘留輸入，避免
   * 一直被判定成移動中導致攻擊永遠打不出去。stoppedTimer/updateAutoAttack
   * 的攻擊判定、updatePlayerMovement 的實際位移都共用這個判斷，不會各自
   * 用不同標準各判各的。之後要接 Move/Idle 動畫狀態也直接讀這裡。
   */
  isPlayerMoving(): boolean {
    return Math.hypot(this.moveDir.x, this.moveDir.y) > MOVE_DEAD_ZONE
  }

  updatePlayerMovement(dt: number) {
    if (!this.app || !this.playerSprite) return
    const p = this.player
    if (p.moveSpeedDebuffTimer > 0) {
      p.moveSpeedDebuffTimer -= dt
      if (p.moveSpeedDebuffTimer <= 0) p.moveSpeedDebuffMult = 1
    }
    if (this.attackMoveLockTimer > 0) this.attackMoveLockTimer -= dt

    // 移動就立刻歸零站穩計時（不留累積值），停止就開始累積——見
    // updateAutoAttack() 的 ATTACK_READY_DELAY 判斷。用 isPlayerMoving()
    // （已套用 dead zone）而不是原本的 dx!==0||dy!==0，這樣搖桿鬆開後的
    // 微小殘留輸入不會一直卡在「移動中」，攻擊永遠打不出去。
    const moving = this.isPlayerMoving()
    if (moving) this.stoppedTimer = 0
    else this.stoppedTimer += dt

    // 攻擊硬直期間（attackMoveLockTimer > 0）完全不套用位移，但搖桿輸入
    // 本身持續被 setMoveDir() 更新、不會遺失——硬直一結束，下一幀
    // isPlayerMoving() 讀到的就是玩家「當下」的搖桿方向，立刻恢復移動，
    // 不用玩家重新推一次。
    if (moving && this.attackMoveLockTimer <= 0) {
      const { x: dx, y: dy } = this.moveDir
      const len = Math.hypot(dx, dy) || 1
      // 影刃刺客 Lv20 影襲步：命中後短暫視窗內移動速度加成
      const rogueBonus = this.cfg.heroId === 'rogue' ? rogueSpeedBonus(this) : 0
      const speed = this.cfg.moveSpeed * this.moveSpeedMult * p.moveSpeedDebuffMult * (1 + rogueBonus)
      const stepX = (dx / len) * speed * dt
      const stepY = (dy / len) * speed * dt
      this.facing = { x: dx / len, y: dy / len }

      // 森林遺跡探索模式：X/Y 分開判定地圖實體物件碰撞（大門柱/祭壇高台/
      // 圖騰基座等），卡住的那一軸不位移，另一軸照常滑動——貼著障礙物邊緣
      // 移動才不會卡死。其他 89 關/Roguelite 沒有 colliders，行為不變。
      const colliders = this.exploreWorld?.colliders
      if (colliders && colliders.length > 0) {
        const nx = p.x + stepX
        if (!this.hitsAnyExploreCollider(nx, p.y, colliders)) p.x = nx
        const ny = p.y + stepY
        if (!this.hitsAnyExploreCollider(p.x, ny, colliders)) p.y = ny
      } else {
        p.x += stepX
        p.y += stepY
      }
    }
    const bounds = this.getMovementBounds()
    p.x = Math.max(bounds.minX, Math.min(bounds.maxX, p.x))
    p.y = Math.max(bounds.minY, Math.min(bounds.maxY, p.y))
    this.playerSprite.x = p.x
    this.playerSprite.y = p.y
  }

  /** 圓形（半徑 EXPLORE_PLAYER_COLLIDE_RADIUS）對矩形碰撞判定，供
   * updatePlayerMovement() 的探索模式位移使用——不是真正的物理引擎，只是
   * 「圓心到矩形最近點的距離 < 半徑」這種常見 2D 頂點遊戲位移解法，夠用
   * 就好。 */
  hitsAnyExploreCollider(x: number, y: number, colliders: ExploreRect[]): boolean {
    const r = EXPLORE_PLAYER_COLLIDE_RADIUS
    for (const rect of colliders) {
      const closestX = Math.max(rect.x, Math.min(x, rect.x + rect.width))
      const closestY = Math.max(rect.y, Math.min(y, rect.y + rect.height))
      const dx = x - closestX
      const dy = y - closestY
      if (dx * dx + dy * dy < r * r) return true
    }
    return false
  }

  /** 移動邊界：一般關卡等同過去行為（螢幕邊界）；森林遺跡探索模式 roam 時
   * 是整張世界地圖，encounter（戰鬤中）鎖在 battleZone 範圍——這是「鎖定
   * 移動區域」的實際實作點。 */
  getMovementBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    if (this.exploreWorld) {
      if (this.exploreState === 'encounter') {
        const z = this.exploreWorld.battleZone
        const pad = 50
        return { minX: z.x - pad, maxX: z.x + z.width + pad, minY: z.y - pad, maxY: z.y + z.height + pad }
      }
      const w = this.exploreWorld.world
      return { minX: ARENA_MARGIN, maxX: w.width - ARENA_MARGIN, minY: ARENA_MARGIN, maxY: w.height - ARENA_MARGIN }
    }
    const { width, height } = this.app!.screen
    return { minX: ARENA_MARGIN, maxX: width - ARENA_MARGIN, minY: ARENA_TOP_MARGIN, maxY: height - ARENA_MARGIN }
  }

  updateEnemies(dt: number) {
    for (const e of this.enemies) {
      if (!e.alive) continue

      // 皇家公主天賦技能：凍結中的敵人原地不動、狀態機也整個暫停
      if (e.frozenTimer > 0) {
        e.frozenTimer -= dt
        this.updateEnemyVisual(e, dt)
        continue
      }

      if (e.isBoss) this.updateBossPhase(e)
      switch (e.aiType) {
        case 'chase': this.updateChaseAI(e, dt); break
        case 'charge': this.updateChargeAI(e, dt); break
        case 'ranged': this.updateRangedAI(e, dt); break
        case 'aoe': this.updateAoeAI(e, dt); break
        case 'summoner': this.updateSummonerAI(e, dt); break
        case 'heavy': this.updateHeavyAI(e, dt); break
        case 'support': this.updateSupportAI(e, dt); break
        case 'skirmisher': this.updateSkirmisherAI(e, dt); break
        case 'totem': this.updateTotemAI(e, dt); break
      }
      if (e.isElite && e.eliteModifier) this.updateEliteModifier(e, dt)
      this.updateEnemyVisual(e, dt)
      if (this.gameOver) return
    }
    if (this.enemies.some(e => !e.alive)) {
      this.enemies = this.enemies.filter(e => e.alive)
    }
  }

  triggerGameOver() {
    if (this.gameOver) return
    if (this.campaignStage) {
      this.campaignStats.diedDuringStage = true
      this.finishCampaignStage(false)
      return
    }
    this.gameOver = true
    this.emitHud()
    this.app?.ticker.stop()
  }

  findNearestEnemy(): EnemyInstance | null {
    let best: EnemyInstance | null = null
    let bestDist = Infinity
    for (const e of this.enemies) {
      if (!e.alive) continue
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y)
      if (d < bestDist) { bestDist = d; best = e }
    }
    return best
  }

  updateAutoAttack(dt: number) {
    if (this.enemies.length === 0) return
    this.player.atkTimer -= dt
    if (this.player.atkTimer > 0) return
    // 走位/輸出節奏：移動中（stoppedTimer 剛被 updatePlayerMovement() 歸零）
    // 或剛停下還沒站穩滿 ATTACK_READY_DELAY 秒，都不觸發攻擊——但 atkTimer
    // 本身持續正常倒數（上面已經扣過），不會因為移動而暫停冷卻，站穩的
    // 瞬間如果冷卻也已經跑完就會立刻開火，不會額外多等一次全長冷卻。
    if (this.stoppedTimer < ATTACK_READY_DELAY) {
      // 影刃刺客 Lv20 影襲步：命中後短暫視窗內免除這次的站穩延遲
      if (!(this.cfg.heroId === 'rogue' && rogueConsumeAttackReadySkip(this))) return
    }
    const target = this.findNearestEnemy()
    if (!target) return
    // 近戰英雄沒有飛行道具：站穩了但敵人還在 MELEE_RANGE 外，攻擊還不能出手。
    // 這裡直接 return、不設 atkTimer——冷卻本來就已經跑完，敵人一走進距離內
    // 的那一幀就會立刻出手，不會因為「站穩時沒打到」被迫多等一整輪冷卻。
    if (this.cfg.attackType === 'melee') {
      const dist = Math.hypot(target.x - this.player.x, target.y - this.player.y)
      if (dist > MELEE_RANGE) return
    }
    // 機關技師過載／武鬥家連擊：臨時攻速加成疊在裝備/天賦的 atkCooldownMult 之外。
    this.player.atkTimer = this.cfg.atkCooldown * this.atkCooldownMult / this.getTempAtkSpeedMult()

    // 有真的 attack 逐幀圖：先播動畫，實際開火延後到 updatePlayerAnim() 判斷
    // 播到觸發幀（見那邊的 triggerFrame）才發生，跟出手動作對齊。沒有逐幀圖
    // 的英雄維持原本「決定攻擊就立刻開火」，不改變手感。
    const attackFrames = this.heroFrames?.attack ?? []
    const hasRealAttack = attackFrames.length > 1
    this.playerAnim.attackTimer = hasRealAttack ? attackFrames.length / STATE_FPS.attack : ATTACK_ANIM_DURATION
    if (hasRealAttack) {
      this.pendingAttackTarget = target
      this.attackFired = false
    } else {
      this.fireNormalAttack(target)
    }

    // 影刃刺客天賦技能：20% 機率追加 2 次攻擊（近戰英雄，跟著本體攻擊型態走）
    if (this.cfg.heroId === 'rogue' && this.unlockedMajorSkillIds.has('rogue_lv40') && Math.random() < 0.2) {
      this.fireNormalAttack(target)
      this.fireNormalAttack(target)
    }
    // 機關技師天賦技能：25% 機率額外發射一枚砲彈
    if (this.cfg.heroId === 'engineer' && this.unlockedMajorSkillIds.has('engineer_lv40') && Math.random() < 0.25) {
      this.fireNormalAttack(target)
      engineerOnBonusShot(this)
    }
    // 影刃刺客 Lv80 瞬影突襲：機率瞬移背後，必定觸發追加攻擊
    if (this.cfg.heroId === 'rogue') rogueTryTeleportStrike(this, target)
  }

  /** 普通攻擊分流：遠程照舊發射 Projectile；近戰改瞬間判定命中，見 meleeAttackAt()。 */
  fireNormalAttack(target: EnemyInstance) {
    // 天賦系統 v2：攻擊真正發射瞬間觸發的職業機制（連擊追蹤/加速視窗/熱能疊層）
    if (this.cfg.heroId === 'fighter') fighterTrackCombo(this, target)
    if (this.cfg.heroId === 'rogue') rogueOnAttackFired(this)
    if (this.cfg.heroId === 'engineer') engineerOnAttackFired(this)
    if (this.cfg.attackType === 'melee') {
      this.meleeAttackAt()
    } else {
      this.fireProjectileAt(target.x, target.y)
    }
  }

  /**
   * 近戰普通攻擊：沒有飛行道具，瞬間判定命中 MELEE_RANGE 內最近的敵人。
   * 不吃呼叫端傳進來的特定 target——呼叫端已經確保有敵人在範圍內，這裡重新
   * 掃一次範圍內全部敵人是為了讓 extraProjectiles/pierceBonus 這兩個遺物
   * 加成（原本是「多發/多穿」）能延續成「一揮命中更多目標」，近戰英雄才不會
   * 吃不到這兩類遺物。
   */
  meleeAttackAt() {
    if (!this.app) return
    this.attackMoveLockTimer = ATTACK_MOVE_LOCK
    let dmgMult = 1
    if (this.keystoneNextAtkBonus) {
      dmgMult = 2
      this.keystoneNextAtkBonus = false
      this.spawnGlowBurst(this.player.x, this.player.y, 0xff4040, 50)
      if (this.cfg.heroId === 'fighter') fighterOnMomentumTrigger(this)
    }
    // 天賦系統 v2：近戰英雄各自的傷害倍率型大型技能
    if (this.cfg.heroId === 'dwarf') dmgMult *= dwarfChargedDamageMult(this)
    if (this.cfg.heroId === 'fighter') dmgMult *= fighterComboDamageMult(this)
    if (this.cfg.heroId === 'death_knight') dmgMult *= deathKnightDamageMult(this) * deathKnightFrenzyDamageMult(this)
    const damage = (this.cfg.atkDamage + this.bonusDamage) * dmgMult
    const maxTargets = 1 + this.extraProjectiles + this.pierceBonus
    const inRange = this.enemies
      .filter(e => e.alive && Math.hypot(e.x - this.player.x, e.y - this.player.y) < MELEE_RANGE)
      .sort((a, b) =>
        Math.hypot(a.x - this.player.x, a.y - this.player.y) - Math.hypot(b.x - this.player.x, b.y - this.player.y))
      .slice(0, maxTargets)
    let lifesteal = this.lifestealPct
    if (this.cfg.heroId === 'death_knight') lifesteal += deathKnightFrenzyLifesteal(this) + deathKnightDomainLifesteal(this)
    for (const e of inRange) {
      e.hitTimer = HIT_SHAKE_DURATION
      this.onAttackHit(e)
      this.damageEnemy(e, damage)
      if (lifesteal > 0) {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + damage * lifesteal)
      }
    }
    const color = HERO_ATTACK_COLOR[this.cfg.heroId] ?? 0xffd94a
    this.spawnGlowBurst(this.player.x, this.player.y, color, MELEE_RANGE)
    // 揮擊方向：優先朝實際打到的最近敵人，沒打到東西（範圍內剛好沒人，理論上
    // 呼叫端已經檢查過，這裡防禦性處理）就用玩家最後的移動朝向頂著。
    const aimTarget = inRange[0]
    const slashAngle = aimTarget
      ? Math.atan2(aimTarget.y - this.player.y, aimTarget.x - this.player.x)
      : Math.atan2(this.facing.y, this.facing.x)
    this.spawnSlashEffect(this.player.x, this.player.y, slashAngle, color, MELEE_RANGE)
  }

  fireProjectileAt(tx: number, ty: number) {
    if (!this.app) return
    // 普通攻擊真正發射的瞬間才鎖移動（不是「決定攻擊」的瞬間）——有真的
    // 攻擊逐幀圖的英雄，這一刻是動畫播到觸發幀才發生的，硬直會跟出手動作
    // 對齊。刺客/工程師的額外發數會重複呼叫到這裡，重複設定同一個值，
    // 沒有副作用。
    this.attackMoveLockTimer = ATTACK_MOVE_LOCK
    const dx = tx - this.player.x
    const dy = ty - this.player.y
    const baseAngle = Math.atan2(dy, dx)
    const shots = 1 + this.extraProjectiles
    // 武鬥家天賦技能：氣勢滿層時，下一次攻擊（含這次觸發的所有發數）造成 200% 傷害
    let dmgMult = 1
    if (this.keystoneNextAtkBonus) {
      dmgMult = 2
      this.keystoneNextAtkBonus = false
      this.spawnGlowBurst(this.player.x, this.player.y, 0xff4040, 50)
      if (this.cfg.heroId === 'fighter') fighterOnMomentumTrigger(this)
    }
    // 天賦系統 v2：遠程英雄各自的傷害倍率型大型技能
    if (this.cfg.heroId === 'fighter') dmgMult *= fighterComboDamageMult(this)
    if (this.cfg.heroId === 'bard') dmgMult *= bardEchoDamageMult(this)
    // Lv20 追風箭：天生1次基礎穿透，跟遺物穿透分開加總；Lv80 驟風連矢：無限穿透
    const basePierce = this.cfg.heroId === 'archer' ? archerBasePierce(this) : 0
    const pierceLeft = (this.cfg.heroId === 'archer' && archerUnlimitedPierce(this)) ? 999 : this.pierceBonus + basePierce
    for (let i = 0; i < shots; i++) {
      // 多發時左右扇形展開，單發時角度不變
      const spread = shots > 1 ? (i - (shots - 1) / 2) * 0.18 : 0
      const angle = baseAngle + spread
      const gfx = this.projectilePool.acquire()
      this.drawProjectileVisual(gfx, this.cfg.heroId, angle)
      gfx.x = this.player.x
      gfx.y = this.player.y
      if (!gfx.parent) this.worldLayer!.addChild(gfx)
      this.projectiles.push({
        gfx,
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle) * PROJECTILE_SPEED,
        vy: Math.sin(angle) * PROJECTILE_SPEED,
        damage: (this.cfg.atkDamage + this.bonusDamage) * dmgMult,
        pierceLeft,
        hit: new Set(),
        alive: true,
        firedAtElapsed: this.elapsed,
      })
    }
  }

  updateProjectiles(dt: number) {
    if (!this.app) return
    // 探索模式下玩家/敵人是世界座標（可以遠大於螢幕像素），彈道出界判定
    // 一定要用同一套可站立範圍（getMovementBounds），不能直接拿螢幕大小比
    // ——不然彈道一飛出螢幕尺寸的數字就被判定「出界」秒殺，攻擊動畫有播
    // 但傷害永遠沒有結算到（2026-08-18 真機回報：攻擊有動畫但敵人不損血，
    // 根源就是這裡跟下面幾個同款 this.app.screen 判斷）。
    const bounds = this.getMovementBounds()
    for (const p of this.projectiles) {
      if (!p.alive) continue
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.gfx.x = p.x
      p.gfx.y = p.y

      if (p.x < bounds.minX - 20 || p.x > bounds.maxX + 20 || p.y < bounds.minY - 20 || p.y > bounds.maxY + 20) {
        this.killProjectile(p)
        continue
      }
      for (const e of this.enemies) {
        if (!e.alive || p.hit.has(e)) continue
        const hitRadius = (e.isBoss ? ENEMY_CONTACT_RADIUS * 1.8 : ENEMY_CONTACT_RADIUS) * 0.6
        const dist = Math.hypot(e.x - p.x, e.y - p.y)
        if (dist < hitRadius) {
          e.hitTimer = HIT_SHAKE_DURATION
          this.onAttackHit(e)
          this.damageEnemy(e, p.damage, p.firedAtElapsed)
          if (this.lifestealPct > 0) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + p.damage * this.lifestealPct)
          }
          p.hit.add(e)
          if (p.pierceLeft > 0) { p.pierceLeft-- } else { this.killProjectile(p) }
          break
        }
      }
    }
    if (this.projectiles.some(p => !p.alive)) {
      this.projectiles = this.projectiles.filter(p => p.alive)
    }
  }

  killProjectile(p: Projectile) {
    p.alive = false
    p.gfx.visible = false
    this.projectilePool.release(p.gfx)
  }

  /** 矮人戰士天賦技能：破甲層數在傷害結算時生效，攻擊命中時另外呼叫 onAttackHit() 疊層。 */
  /** sourceFiredAtElapsed：這次傷害的「發動時間點」，只有近戰/瞬間命中的攻擊
   * 才會等於當下 this.elapsed；遠程 Projectile 會帶入它真正發射的時間戳
   * （見 updateProjectiles 呼叫點），黑騎士 Counter 判定要用這個而不是命中
   * 當下的時間，見下方說明。 */
  damageEnemy(e: EnemyInstance, amount: number, sourceFiredAtElapsed?: number) {
    if (!e.alive) return
    // 1-15 黑騎士先鋒 Black Steel Counter：格擋窗口內玩家的攻擊完全不生效，
    // 改觸發反擊（只在窗口內第一次命中觸發一次，見 tryCastBossSkill 的
    // guard_counter case／updateHeavyAI 的視窗倒數）。V2 修正：格擋「開始前」
    // 就已經飛在半空中的箭矢命中，不算玩家硬打的決策，直接吸收（不傷害
    // Boss 也不觸發 Counter），避免「Projectile 已經在飛導致玩家覺得
    // unfair」（近戰攻擊是瞬間命中，firedAtElapsed 預設等於當下，不受影響）。
    if (e.state === 'boss_guarding') {
      const guardStart = e.eliteModifierState.guardStartElapsed ?? 0
      if ((sourceFiredAtElapsed ?? this.elapsed) < guardStart) return
      if (!e.eliteModifierState.counterTriggered) {
        e.eliteModifierState.counterTriggered = 1
        this.campaignStats.counterTriggers++
        this.damagePlayer(e.damage * 1.4, e)
        this.spawnFloatingText('反擊！', e.x, e.y - e.spriteHeight * 0.6)
        this.spawnGlowBurst(e.x, e.y, 0xff5050, 60)
      }
      return
    }
    if (e.armorBreakStacks > 0) amount *= 1 + 0.1 * e.armorBreakStacks
    if (this.cfg.heroId === 'priest') amount *= priestSanctuaryDamageMult(this) // Lv100 永晝聖域
    // 1-10 古樹守衛：Root Core（見 summon_cores 技能）存在時 Boss 大幅減傷，
    // 逼玩家先切目標打 Core，不能只固定站樁打 Boss 本體——靠既有 summonedCount
    // 判斷還有沒有 Core 存活，不用另開一個「護盾」欄位。
    if (e.isBoss && e.typeId === 'ancient_treant_guardian' && e.summonedCount > 0) amount *= 0.4
    // ── 職業裝備專屬特效（2026-08）：純數值判定，跟裝備欄位直接對應——
    // markDamageBonusPct/executeBonusPct 一定要在 e.hp -= amount 之前判斷，
    // 判斷依據是「這一下打下去之前」的血量狀態。 ──
    if (this.markDamageBonusPct > 0 && e.hp >= e.maxHp) amount *= 1 + this.markDamageBonusPct
    if (this.executeBonusPct > 0 && e.hp / e.maxHp < EXECUTE_HP_THRESHOLD_PCT) amount *= 1 + this.executeBonusPct
    if (this.critChancePct > 0 && Math.random() < this.critChancePct) {
      amount *= CRIT_DAMAGE_MULT
      this.spawnFloatingText('暴擊！', e.x, e.y - e.spriteHeight * 0.6)
    }
    if (this.burnChancePct > 0 && Math.random() < this.burnChancePct) {
      e.burnStacks = Math.min(5, e.burnStacks + BURN_ON_HIT_STACKS)
      e.burnTimer = Math.max(e.burnTimer, 3)
    }
    if (this.freezeChancePct > 0 && Math.random() < this.freezeChancePct) {
      e.frozenTimer = Math.max(e.frozenTimer, FREEZE_ON_HIT_DURATION)
    }
    if (this.comboAtkSpeedPct > 0) {
      this.comboStacks = Math.min(COMBO_MAX_STACKS, this.comboStacks + 1)
      this.comboDecayTimer = COMBO_DECAY_WINDOW
    }
    e.hp -= amount
    if (e.hp <= 0) {
      e.alive = false
      const boundLandmark = this.exploreEnemyLandmarks.get(e)
      if (boundLandmark) { this.markExploreLandmarkCleared(boundLandmark); this.exploreEnemyLandmarks.delete(e) }
      this.startDeathFx(e)
      this.killCount++
      this.ultimateCharge = Math.min(ULTIMATE_MAX, this.ultimateCharge +
        (e.isBoss ? ULTIMATE_CHARGE_BOSS : e.isElite ? ULTIMATE_CHARGE_ELITE : ULTIMATE_CHARGE_NORMAL))
      this.spawnGem(e.x, e.y, e.isBoss ? BOSS_GEM_XP_VALUE : GEM_XP_VALUE)
      // 武鬥家天賦技能：擊殺疊氣勢，滿5層下次攻擊 200% 傷害
      if (this.cfg.heroId === 'fighter' && this.unlockedMajorSkillIds.has('fighter_lv40')) {
        this.keystoneStacks++
        if (this.keystoneStacks >= 5) { this.keystoneStacks = 0; this.keystoneNextAtkBonus = true }
      }
      // 皇家公主 Lv80 冰痕擴散／死亡騎士 Lv100 死亡領域擊殺延長
      if (this.cfg.heroId === 'princess') princessOnKill(this, e)
      if (this.cfg.heroId === 'death_knight') deathKnightOnKillExtendDomain(this)
      // 機關技師職業裝備：過載連擊，擊殺後短暫攻速大增，updatePassives() 遞減
      if (this.overloadOnKillPct > 0) this.overloadTimer = OVERLOAD_DURATION
      // Elite 詞綴 Split：死亡分裂 2~3 隻較弱的同型普通怪，血量打折避免雪球
      if (e.isElite && e.eliteModifier === 'split') {
        const type = this.findEnemyTypeById(e.typeId)
        if (type) {
          const count = SPLIT_CONFIG.minCount + Math.floor(Math.random() * (SPLIT_CONFIG.maxCount - SPLIT_CONFIG.minCount + 1))
          for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2
            const dist = Math.random() * SPLIT_CONFIG.spawnOffsetRadius
            this.spawnEnemyOfType(type, {
              x: e.x + Math.cos(angle) * dist, y: e.y + Math.sin(angle) * dist,
              hpMultOverride: SPLIT_CONFIG.hpMultOfParent,
            })
          }
        }
      }
      if (e.summonedBy) e.summonedBy.summonedCount = Math.max(0, e.summonedBy.summonedCount - 1)
      if (e.isBoss) {
        this.bossState = 'defeated'
        // 森林遺跡固定關卡沒有 Boss 戰利品三選一——Objective/Star 判定交給
        // updateObjective()（isObjectiveWon 的 'boss' case），這裡不觸發
        // pauseForBossLoot()，避免誤跳出 Roguelite Run 專屬的遺物選擇畫面。
        if (!this.campaignStage) this.pauseForBossLoot()
      } else if (!e.isSummoned && (this.currentZoneType === 'battle' || this.currentZoneType === 'elite')) {
        this.zoneEnemiesRemaining--
        if (this.zoneEnemiesRemaining <= 0) this.completeZone()
      }
      if (this.campaignStage && this.objectiveState) {
        const obj = this.objectiveState.objective
        if ((obj.type === 'elimination' || obj.type === 'hunt') && obj.huntTargetId && e.typeId === obj.huntTargetId) {
          onHuntTargetDefeated(this.objectiveState)
        }
        if (obj.type === 'destroy' && e.aiType === 'totem') onDestroyTargetDefeated(this.objectiveState)
        if (this.campaignStage.id === 'forest_1_7') {
          const shamanStillAlive = this.enemies.some(en => en.typeId === 'forest_shaman' && en.alive)
          if (shamanStillAlive) markCustomStarFailed(e, this.objectiveState, 'forest_shaman', ['forest_treant'])
        }
        if (this.campaignStage.id === 'snowfield_2_7') {
          const shamanStillAlive = this.enemies.some(en => en.typeId === 'ice_shaman' && en.alive)
          if (shamanStillAlive) markCustomStarFailed(e, this.objectiveState, 'ice_shaman', ['snow_troll'])
        }
        if (this.campaignStage.id === 'castle_3_7') {
          const shamanStillAlive = this.enemies.some(en => en.typeId === 'demon_shaman' && en.alive)
          if (shamanStillAlive) markCustomStarFailed(e, this.objectiveState, 'demon_shaman', ['demon_brute'])
        }
        // 1-10 古樹守衛「每次 Core 出現後 N 秒內全滅」星星條件：這一批 Root Core
        // 死掉這隻之後如果 Boss 身上已經沒有其他 Core 存活（summonedCount 見
        // spawnEnemyOfType/summonedBy 連動），代表這批全滅了，檢查有沒有超時。
        if (e.typeId === 'root_core' && e.summonedBy && e.summonedBy.summonedCount <= 0) {
          const cond = this.campaignStage.starConditions.find(c => c.type === 'destroy_within')
          const windowSec = cond?.value ?? 10
          const spawnedAt = e.summonedBy.eliteModifierState.coreSpawnTime ?? this.elapsed
          if (this.elapsed - spawnedAt > windowSec) this.campaignStats.destroyWithinViolated = true
        }
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Enemy AI / Attack State（2026-08 重做）
  // 玩家受傷的唯一入口，取代舊的「到處直接改 this.player.hp」寫法。
  // source 有值時才會觸發棘刺反傷/獸語者反擊/吸血詞綴，地形類無來源傷害
  // （目前只有 hazard）不觸發這幾個。
  // ══════════════════════════════════════════════════════════════════
  damagePlayer(amount: number, source?: EnemyInstance): void {
    if (this.gameOver || this.player.hp <= 0) return
    // 聖騎士 Lv80／武鬥家 Lv80 等「完全無敵」效果，直接跳過這次傷害
    if (this.majorInvulnTimer > 0) return
    // 聖騎士 Lv60 盾擊反制：格擋成功直接吃掉這次傷害
    if (this.cfg.heroId === 'knight' && source && knightOnHurt(this, source)) return
    // 聖騎士天賦技能：buff 期間內受到的傷害減半
    let incoming = this.keystoneBuffTimer > 0 ? amount * 0.5 : amount
    // 天賦樹永久減傷 + 各英雄自己的減傷型大型技能
    let dr = this.talentDamageReductionPct
    if (this.cfg.heroId === 'knight') dr += knightDamageReduction(this)
    if (this.cfg.heroId === 'dwarf') dr += dwarfRockArmorDR(this)
    if (this.cfg.heroId === 'death_knight') dr += deathKnightDomainDR(this)
    incoming *= Math.max(0, 1 - dr)
    if (this.shieldCharges > 0) {
      this.shieldCharges--
    } else {
      this.player.hp = Math.max(0, this.player.hp - incoming)
      this.playerHitTimer = PLAYER_HIT_FLASH_DURATION
    }
    if (source) {
      if (this.thornsPct > 0) this.damageEnemy(source, source.damage * this.thornsPct)
      // Elite 詞綴 Vampiric：對玩家造成傷害時回復自身一定比例 HP
      if (source.eliteModifier === 'vampiric' && source.alive) {
        source.hp = Math.min(source.maxHp, source.hp + incoming * VAMPIRIC_CONFIG.healPctOfDamage)
      }
      // 森林遺跡固定關卡「被擊中≤N次」星星條件用：只算敵人攻擊命中，不算
      // Hazard 持續傷害（那邊沒有 source，走 updateHazards() 自己的統計）。
      if (this.campaignStage) this.campaignStats.hitsTaken++
    }
    // 神官祭司 Lv80 聖光庇護：瀕死保護視窗內，HP 不會真的歸零
    if (this.player.hp <= 0 && this.cfg.heroId === 'priest' && priestDeathSaveActive(this)) {
      this.player.hp = 1
      return
    }
    // 死亡騎士 Lv80 不死契約：每場一次，致死傷害改保留 1 HP
    if (this.player.hp <= 0 && this.cfg.heroId === 'death_knight' && deathKnightTryUndyingPact(this)) return
    if (this.player.hp <= 0) this.triggerGameOver()
  }

  /** 皇家公主冰痕減速／死亡騎士死亡領域減速／吟遊詩人職業裝備減速光環，套用在敵人移動速度上。 */
  getSlowMult(e: EnemyInstance): number {
    let mult = 1
    if (this.cfg.heroId === 'princess') mult *= princessSlowMult(this, e)
    if (this.cfg.heroId === 'death_knight') mult *= deathKnightDomainSlowMult(this)
    if (this.slowAuraPct > 0 && Math.hypot(e.x - this.player.x, e.y - this.player.y) <= SLOW_AURA_RADIUS) {
      mult *= 1 - this.slowAuraPct
    }
    return mult
  }

  moveEnemyToward(e: EnemyInstance, tx: number, ty: number, dt: number) {
    const dx = tx - e.x, dy = ty - e.y
    const dist = Math.hypot(dx, dy) || 1
    const speed = e.speed * this.getEliteSpeedMult(e) * this.getSlowMult(e)
    e.x += (dx / dist) * speed * dt
    e.y += (dy / dist) * speed * dt
  }

  /** 把敵人座標夾回場地可站範圍內，跟玩家自己的移動夾同一塊區域共用同一組邊界常數。 */
  clampEnemyToArena(e: EnemyInstance) {
    if (!this.app) return
    const b = this.getMovementBounds()
    e.x = Math.max(b.minX, Math.min(b.maxX, e.x))
    e.y = Math.max(b.minY, Math.min(b.maxY, e.y))
  }

  /**
   * Ranged/Support/Summoner 這幾種 AI 用來「跟玩家拉開距離」，跟
   * moveEnemyToward 不同——那個天然會往（已經被夾在場地內的）玩家座標靠近，
   * 不會跑出界；這個方向相反，沒有終點，放著不管會一路被玩家逼退到場地
   * 外面甚至螢幕外，近戰英雄永遠追不到（回報症狀：「遠程的怪會躲出邊界，
   * 近戰攻擊不到」）。跟玩家自己的移動夾在同一個可站立範圍內，兩邊共用
   * 同一塊可達區域，近戰就一定追得到。
   *
   * 玩家把敵人逼到牆角時，「逃跑方向」會被邊界整個抵銷，敵人會整隻凍結貼
   * 在牆上不動（回報症狀：「怪物卡在邊界」）——偵測到移動量被夾掉大半時，
   * 改沿邊界切線滑動，敵人才會持續移動，不會看起來像卡死。
   */
  moveEnemyAway(e: EnemyInstance, fromX: number, fromY: number, dt: number) {
    const dx = e.x - fromX, dy = e.y - fromY
    const dist = Math.hypot(dx, dy) || 1
    const speed = e.speed * this.getEliteSpeedMult(e) * this.getSlowMult(e)
    const step = speed * dt
    let moveX = (dx / dist) * step
    let moveY = (dy / dist) * step

    if (this.app) {
      const b = this.getMovementBounds()
      const minX = b.minX, maxX = b.maxX
      const minY = b.minY, maxY = b.maxY
      const prevX = e.x, prevY = e.y
      let nextX = Math.max(minX, Math.min(maxX, e.x + moveX))
      let nextY = Math.max(minY, Math.min(maxY, e.y + moveY))
      if (Math.hypot(nextX - prevX, nextY - prevY) < step * 0.3) {
        const tangentX = -moveY, tangentY = moveX
        const tLen = Math.hypot(tangentX, tangentY) || 1
        nextX = Math.max(minX, Math.min(maxX, prevX + (tangentX / tLen) * step))
        nextY = Math.max(minY, Math.min(maxY, prevY + (tangentY / tLen) * step))
      }
      e.x = nextX
      e.y = nextY
    } else {
      e.x += moveX
      e.y += moveY
    }
  }

  isOutOfArenaBounds(x: number, y: number): boolean {
    if (!this.app) return true
    const b = this.getMovementBounds()
    return x < b.minX - 30 || x > b.maxX + 30 || y < b.minY - 30 || y > b.maxY + 30
  }

  // ── Chase：goblin/skeleton/mimic。靠近到攻擊距離才停下蓄力揮砍 ──────────
  updateChaseAI(e: EnemyInstance, dt: number) {
    const range = e.isBoss ? CHASE_CONFIG.attackRange * 1.8 : CHASE_CONFIG.attackRange
    if (e.attackCooldown > 0) e.attackCooldown -= dt
    if (e.state === 'windup' || e.state === 'attack') {
      e.stateTimer += dt
      if (e.state === 'windup' && e.stateTimer >= CHASE_CONFIG.windupSec) {
        e.state = 'attack'; e.stateTimer = 0
        const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y)
        if (dist <= range + 15) this.damagePlayer(e.damage, e)
      } else if (e.state === 'attack' && e.stateTimer >= CHASE_CONFIG.attackSec) {
        e.state = 'seek'; e.stateTimer = 0; e.attackCooldown = CHASE_CONFIG.cooldownSec * this.getEliteCooldownMult(e)
      }
      return
    }
    const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y) || 1
    if (dist > range) {
      this.moveEnemyToward(e, this.player.x, this.player.y, dt)
    } else if (e.attackCooldown <= 0) {
      e.state = 'windup'; e.stateTimer = 0
    }
  }

  // ── Charge：orc（荊棘野豬）。遠距離鎖定衝鋒，撞到才傷，衝完硬直 ─────────
  updateChargeAI(e: EnemyInstance, dt: number) {
    if (e.attackCooldown > 0) e.attackCooldown -= dt
    switch (e.state) {
      case 'dashing': {
        e.stateTimer += dt
        e.x += e.velocityX * dt
        e.y += e.velocityY * dt
        const hitDist = Math.hypot(this.player.x - e.x, this.player.y - e.y)
        if (!e.eliteModifierState.chargeHit && hitDist < CHARGE_CONFIG.hitRadius) {
          this.damagePlayer(e.damage * 1.8, e)
          e.eliteModifierState.chargeHit = 1
          // 1-13 荊棘追獵「不被荊棘狼的 Leap 命中」星星條件用：荊棘狼是一般
          // Charge AI 小怪，不是走 BOSS_SKILLS，沒有 skill.id 可以借，直接
          // 依 typeId 記。2-13 寒狼追獵／3-13 地獄獵犬追獵（2026-08-16）沿用
          // 同一招，各自記自己的 skillId，互不影響。
          if (this.campaignStage && e.typeId === 'thorn_wolf') this.recordCampaignSkillHit('thorn_wolf_leap')
          if (this.campaignStage && e.typeId === 'frost_wolf') this.recordCampaignSkillHit('frost_wolf_leap')
          if (this.campaignStage && e.typeId === 'hellhound') this.recordCampaignSkillHit('hellhound_leap')
        }
        if (this.isOutOfArenaBounds(e.x, e.y) || e.stateTimer >= CHARGE_CONFIG.dashMaxDurationSec) {
          e.state = 'stunned'; e.stateTimer = 0
          // 衝刺沒有邊界檢查，衝出場地外一段距離才會被 isOutOfArenaBounds 攔下
          // 來——不夾回可站範圍的話，怪物會頂著暈眩狀態卡在場外，玩家近戰完全
          // 打不到（回報症狀：「怪物卡在邊界」）。
          this.clampEnemyToArena(e)
        }
        return
      }
      case 'stunned':
        e.stateTimer += dt
        if (e.stateTimer >= CHARGE_CONFIG.stunSec) { e.state = 'seek'; e.stateTimer = 0; e.attackCooldown = 0.8 }
        return
      case 'telegraph':
        return // 等 telegraph resolve callback 轉場
    }
    const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y) || 1
    if (dist <= CHARGE_CONFIG.triggerRange && e.attackCooldown <= 0) {
      e.targetX = this.player.x; e.targetY = this.player.y
      const angle = Math.atan2(e.targetY - e.y, e.targetX - e.x)
      e.velocityX = Math.cos(angle) * CHARGE_CONFIG.dashSpeed
      e.velocityY = Math.sin(angle) * CHARGE_CONFIG.dashSpeed
      e.state = 'telegraph'; e.stateTimer = 0
      e.eliteModifierState.chargeHit = 0
      const windup = CHARGE_CONFIG.windupMin + Math.random() * (CHARGE_CONFIG.windupMax - CHARGE_CONFIG.windupMin)
      this.spawnTelegraph('line', e.x, e.y, { radius: 500, angle, width: 26 }, e, () => {
        if (e.alive) { e.state = 'dashing'; e.stateTimer = 0 }
      }, windup)
    } else {
      this.moveEnemyToward(e, this.player.x, this.player.y, dt)
    }
  }

  // ── Ranged：lightning_lancer（冰甲騎士）。保持距離放箭 ───────────────
  updateRangedAI(e: EnemyInstance, dt: number) {
    if (e.attackCooldown > 0) e.attackCooldown -= dt
    if (e.state === 'windup') {
      e.stateTimer += dt
      if (e.stateTimer >= RANGED_CONFIG.windupSec) {
        e.state = 'seek'; e.stateTimer = 0; e.attackCooldown = RANGED_CONFIG.cooldownSec * this.getEliteCooldownMult(e)
        this.fireEnemyProjectileAt(e, this.player.x, this.player.y, e.damage, RANGED_CONFIG.projectileSpeed, RANGED_CONFIG.projectileRadius)
      }
      return
    }
    const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y) || 1
    if (dist < RANGED_CONFIG.minRange) {
      this.moveEnemyAway(e, this.player.x, this.player.y, dt)
    } else if (dist > RANGED_CONFIG.maxRange) {
      this.moveEnemyToward(e, this.player.x, this.player.y, dt)
    } else if (e.attackCooldown <= 0) {
      e.state = 'windup'; e.stateTimer = 0
    }
  }

  // ── AoE：slimeking（史萊姆王）。鎖定玩家腳下畫圈，圈內才傷 ────────────
  updateAoeAI(e: EnemyInstance, dt: number) {
    if (e.attackCooldown > 0) e.attackCooldown -= dt
    if (e.state === 'telegraph') return
    const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y) || 1
    if (dist <= AOE_CONFIG.triggerRange && e.attackCooldown <= 0) {
      e.targetX = this.player.x; e.targetY = this.player.y
      e.state = 'telegraph'
      this.spawnTelegraph('circle', e.targetX, e.targetY, { radius: AOE_CONFIG.radius, angle: 0, width: 0 }, e, () => {
        e.state = 'seek'; e.attackCooldown = AOE_CONFIG.cooldownSec * this.getEliteCooldownMult(e)
        if (!e.alive) return
        const pd = Math.hypot(this.player.x - e.targetX, this.player.y - e.targetY)
        if (pd <= AOE_CONFIG.radius) this.damagePlayer(e.damage * 1.4, e)
      }, AOE_CONFIG.telegraphSec)
    } else {
      this.moveEnemyToward(e, this.player.x, this.player.y, dt)
    }
  }

  // ── Summoner：ice_witch（冰霜女巫）。保持距離＋定期召喚小怪 ───────────
  updateSummonerAI(e: EnemyInstance, dt: number) {
    if (e.attackCooldown > 0) e.attackCooldown -= dt
    if (e.skillCooldown > 0) e.skillCooldown -= dt
    if (e.state === 'boss_telegraph') return
    if (e.isBoss && e.skillCooldown <= 0 && e.state === 'seek') {
      if (this.tryCastBossSkill(e)) return
    }
    if (e.state === 'summon_cast') {
      e.stateTimer += dt
      if (e.stateTimer >= SUMMONER_CONFIG.summonWindupSec) {
        e.state = 'seek'; e.stateTimer = 0; e.attackCooldown = SUMMONER_CONFIG.summonIntervalSec
        this.trySummonMinions(e)
      }
      return
    }
    const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y) || 1
    if (dist < SUMMONER_CONFIG.minRange) {
      this.moveEnemyAway(e, this.player.x, this.player.y, dt)
    } else if (dist > SUMMONER_CONFIG.maxRange) {
      this.moveEnemyToward(e, this.player.x, this.player.y, dt)
    }
    const canSummon = !e.isBoss || e.bossPhase >= ICE_WITCH_SUMMON_MIN_PHASE
    if (canSummon && e.attackCooldown <= 0 && e.summonedCount < SUMMONER_CONFIG.summonCap) {
      e.state = 'summon_cast'; e.stateTimer = 0
    }
  }

  trySummonMinions(e: EnemyInstance) {
    if (!this.app) return
    const pool = getCampaignEnemyPool(this.campaign).filter(t => !t.isBoss)
    if (pool.length === 0) return
    const count = SUMMONER_CONFIG.summonMinCount + Math.floor(Math.random() * (SUMMONER_CONFIG.summonMaxCount - SUMMONER_CONFIG.summonMinCount + 1))
    for (let i = 0; i < count; i++) {
      if (e.summonedCount >= SUMMONER_CONFIG.summonCap) break
      const type = pool[Math.floor(Math.random() * pool.length)]
      const angle = Math.random() * Math.PI * 2
      const dist = 60 + Math.random() * 40
      this.spawnEnemyOfType(type, { x: e.x + Math.cos(angle) * dist, y: e.y + Math.sin(angle) * dist, summonedBy: e })
    }
    this.spawnGlowBurst(e.x, e.y, 0x8ad4ff, 60)
  }

  // ── Heavy：dark_knight（黑暗騎士）+ dragon/golem 兩隻 Boss 的基礎移動 ──
  updateHeavyAI(e: EnemyInstance, dt: number) {
    if (e.attackCooldown > 0) e.attackCooldown -= dt
    if (e.skillCooldown > 0) e.skillCooldown -= dt
    if (e.state === 'boss_telegraph') return
    if (e.state === 'boss_dashing') {
      e.x += e.velocityX * dt
      e.y += e.velocityY * dt
      const hitDist = Math.hypot(this.player.x - e.x, this.player.y - e.y)
      if (!e.eliteModifierState.chargeHit && hitDist < CHARGE_CONFIG.hitRadius) {
        this.damagePlayer(e.damage * 1.8, e)
        e.eliteModifierState.chargeHit = 1
        // 1-5/1-18 狂暴獸人隊長「不被 Charge 命中」星星條件：這隻 Boss 目前只有
        // 一種 charge 技能，直接依 typeId 記，不用另外追蹤「目前是哪個 skill.id」。
        // 2-5/2-18 霜甲騎士長、3-5/3-18 煉獄騎士（2026-08-16）沿用同一招。
        if (this.campaignStage && e.typeId === 'orc_chieftain') this.recordCampaignSkillHit('orc_chieftain_charge')
        if (this.campaignStage && e.typeId === 'frost_knight_captain') this.recordCampaignSkillHit('frost_knight_ice_charge')
        if (this.campaignStage && e.typeId === 'demon_knight') this.recordCampaignSkillHit('demon_knight_charge')
      }
      if (this.isOutOfArenaBounds(e.x, e.y)) {
        e.state = 'seek'
        this.clampEnemyToArena(e) // 同 updateChargeAI：衝刺結束沒夾回範圍會卡在場外
      }
      return
    }
    // 1-15 黑騎士先鋒 Black Steel Counter 的格擋視窗：純倒數，命中判定攔截
    // 在 damageEnemy() 開頭做，這裡只負責視窗結束後恢復正常狀態機。
    if (e.state === 'boss_guarding') {
      e.stateTimer += dt
      if (e.stateTimer >= (e.eliteModifierState.guardWindowSec ?? 1.2)) {
        e.state = 'seek'; e.stateTimer = 0
        e.eliteModifierState.counterTriggered = 0
        e.attackCooldown = 0.3 // 格擋完短暫喘息，不要立刻又出下一招
      }
      return
    }
    // 1-10 古樹守衛 Life Core「Soft Mechanic Gate」（2026-08-12 V2）：不管玩家
    // DPS 多高，70%/35% HP 一定會強制觸發一次 Life Core（不再是隨機技能池
    // 抽到才觸發），確保核心機制一定會被體驗到，同時不是長時間硬鎖血/無敵。
    if (e.typeId === 'ancient_treant_guardian' && e.state === 'seek' && e.summonedCount === 0) {
      const hpPct = e.hp / e.maxHp
      const need70 = hpPct <= 0.7 && !e.eliteModifierState.coreThreshold70Used
      const need35 = hpPct <= 0.35 && !e.eliteModifierState.coreThreshold35Used
      if (need70 || need35) {
        if (need70) e.eliteModifierState.coreThreshold70Used = 1
        if (need35) e.eliteModifierState.coreThreshold35Used = 1
        if (this.tryCastBossSkill(e, 'ancient_treant_life_core')) return
      }
    }
    if (e.isBoss && e.skillCooldown <= 0 && e.state === 'seek') {
      if (this.tryCastBossSkill(e)) return
    }
    if (e.state === 'windup' || e.state === 'slam') {
      e.stateTimer += dt
      if (e.state === 'windup' && e.stateTimer >= HEAVY_CONFIG.windupSec) {
        e.state = 'slam'; e.stateTimer = 0
        const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y)
        if (dist <= HEAVY_CONFIG.slamRadius) {
          this.damagePlayer(e.damage * 1.6, e)
          // 森林樹精（1-9 樹根迷境）：命中附加短暫定身，是攻擊效果本身而不是
          // 常駐地板 Hazard，所以直接套用跟 Hazard root 一樣的 debuff 欄位，
          // 不透過 spawnHazard()。
          if (e.typeId === 'forest_treant') this.applyRootToPlayer()
        }
        this.spawnGlowBurst(e.x, e.y, 0xff6a3c, HEAVY_CONFIG.slamRadius)
      } else if (e.state === 'slam' && e.stateTimer >= HEAVY_CONFIG.slamSec) {
        e.state = 'seek'; e.stateTimer = 0; e.attackCooldown = HEAVY_CONFIG.cooldownSec * this.getEliteCooldownMult(e)
      }
      return
    }
    const range = e.isBoss ? HEAVY_CONFIG.attackRange * 2.2 : HEAVY_CONFIG.attackRange
    const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y) || 1
    if (dist > range) {
      this.moveEnemyToward(e, this.player.x, this.player.y, dt)
    } else if (e.attackCooldown <= 0) {
      e.state = 'windup'; e.stateTimer = 0
    }
  }

  // ── Support：森林薩滿（森林遺跡固定關卡新增，2026-08）。優先治療血量不滿
  // 的友軍，保持跟玩家的距離，找不到治療目標時才考慮攻擊玩家本人。 ────────
  updateSupportAI(e: EnemyInstance, dt: number) {
    if (e.attackCooldown > 0) e.attackCooldown -= dt
    if (e.state === 'heal_windup') {
      e.stateTimer += dt
      if (e.stateTimer >= SUPPORT_CONFIG.healWindupSec) {
        e.state = 'seek'; e.stateTimer = 0; e.attackCooldown = SUPPORT_CONFIG.healCooldownSec * this.getEliteCooldownMult(e)
        // 治療目標用施法當下記錄的座標（e.targetX/Y）就近配對回去，同一幀內
        // 位置變化可忽略——不需要另外存一個唯一 id。
        const healTarget = this.enemies.find(o => o.alive && o !== e && Math.hypot(o.x - e.targetX, o.y - e.targetY) < 24)
        if (healTarget) {
          healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + SUPPORT_CONFIG.healAmount)
          this.spawnGlowBurst(healTarget.x, healTarget.y, 0x8ad4ff, 40)
          this.campaignStats.healCounts[e.typeId] = (this.campaignStats.healCounts[e.typeId] ?? 0) + 1
        }
      }
      return
    }
    let injuredAlly: EnemyInstance | null = null
    let bestDist = Infinity
    for (const other of this.enemies) {
      if (!other.alive || other === e) continue
      if (other.hp >= other.maxHp * SUPPORT_CONFIG.healAllyHpThreshold) continue
      const d = Math.hypot(other.x - e.x, other.y - e.y)
      if (d <= SUPPORT_CONFIG.healRange && d < bestDist) { bestDist = d; injuredAlly = other }
    }
    if (injuredAlly && e.attackCooldown <= 0) {
      e.targetX = injuredAlly.x; e.targetY = injuredAlly.y
      e.state = 'heal_windup'; e.stateTimer = 0
      this.spawnTelegraph('circle', injuredAlly.x, injuredAlly.y, { radius: 36, angle: 0, width: 0 }, e, () => {}, SUPPORT_CONFIG.healWindupSec)
      return
    }
    // 沒有治療目標：維持跟玩家的距離，不主動貼近進攻（薩滿的定位是保後排，不是輸出）
    const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y) || 1
    if (dist < SUPPORT_CONFIG.minRange) this.moveEnemyAway(e, this.player.x, this.player.y, dt)
    else if (dist > SUPPORT_CONFIG.maxRange) this.moveEnemyToward(e, this.player.x, this.player.y, dt)
  }

  // ── Skirmisher：骷髏斥候（森林遺跡固定關卡新增，2026-08）。比 Chase 快，
  // 攻擊後主動拉開距離重新調位，不會一直黏著玩家。 ─────────────────────
  updateSkirmisherAI(e: EnemyInstance, dt: number) {
    if (e.attackCooldown > 0) e.attackCooldown -= dt
    if (e.state === 'windup' || e.state === 'attack') {
      e.stateTimer += dt
      if (e.state === 'windup' && e.stateTimer >= SKIRMISHER_CONFIG.windupSec) {
        e.state = 'attack'; e.stateTimer = 0
        const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y)
        if (dist <= SKIRMISHER_CONFIG.attackRange + 15) this.damagePlayer(e.damage, e)
      } else if (e.state === 'attack' && e.stateTimer >= SKIRMISHER_CONFIG.attackSec) {
        e.state = 'reposition'; e.stateTimer = 0
        e.attackCooldown = SKIRMISHER_CONFIG.cooldownSec * this.getEliteCooldownMult(e)
        const angle = Math.atan2(e.y - this.player.y, e.x - this.player.x) + (Math.random() - 0.5) * 1.2
        e.targetX = e.x + Math.cos(angle) * SKIRMISHER_CONFIG.repositionDistance
        e.targetY = e.y + Math.sin(angle) * SKIRMISHER_CONFIG.repositionDistance
        if (this.app) {
          const b = this.getMovementBounds()
          e.targetX = Math.max(b.minX, Math.min(b.maxX, e.targetX))
          e.targetY = Math.max(b.minY, Math.min(b.maxY, e.targetY))
        }
      }
      return
    }
    if (e.state === 'reposition') {
      const dist = Math.hypot(e.targetX - e.x, e.targetY - e.y)
      if (dist < 8) { e.state = 'seek'; return }
      const speed = e.speed * this.getEliteSpeedMult(e) * SKIRMISHER_CONFIG.repositionSpeedMult
      const dx = e.targetX - e.x, dy = e.targetY - e.y
      const len = Math.hypot(dx, dy) || 1
      e.x += (dx / len) * speed * dt
      e.y += (dy / len) * speed * dt
      return
    }
    const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y) || 1
    if (dist > SKIRMISHER_CONFIG.attackRange) {
      this.moveEnemyToward(e, this.player.x, this.player.y, dt)
    } else if (e.attackCooldown <= 0) {
      e.state = 'windup'; e.stateTimer = 0
    }
  }

  // ── Totem：圖騰/古樹守衛 Root Core（森林遺跡固定關卡新增，2026-08）。
  // 完全靜止，沒有移動/追擊狀態機，純粹是可被鎖定/摧毀的目標——摧毀時的
  // 額外效果（例如古樹守衛失去減傷）掛在 damageEnemy() 擊殺分支判斷，這裡
  // 不用做任何事。之後若有圖騰真的需要主動召喚/治療/Buff，在這裡加週期
  // 計時器分派即可，見 enemyAI.ts 的 TOTEM_CONFIG.actionIntervalSec。
  updateTotemAI(_e: EnemyInstance, _dt: number) {
    // no-op：目前 20 關用到的圖騰（1-4 圖騰、1-10 Root Core）都只是靜態
    // 摧毀目標，沒有主動行為。
  }

  // ── Boss 三階段：依血量比例即時算出，第一次改變時給提示 ────────────────
  updateBossPhase(e: EnemyInstance) {
    const pct = e.hp / e.maxHp
    const phase: 1 | 2 | 3 = pct <= 0.35 ? 3 : pct <= 0.7 ? 2 : 1
    if (phase !== e.bossPhase) {
      e.bossPhase = phase
      this.spawnFloatingText(`第 ${phase} 階段！`, e.x, e.y - e.spriteHeight * 0.6)
      this.spawnGlowBurst(e.x, e.y, 0xffcf6b, 120)
    }
  }

  /** 森林遺跡「不被 X 技能命中」星星條件用（見 evaluateCampaignStars 的 avoid_skill case）。 */
  recordCampaignSkillHit(skillId: string) {
    if (!this.campaignStage) return
    this.campaignStats.skillHits[skillId] = (this.campaignStats.skillHits[skillId] ?? 0) + 1
  }

  /** forceSkillId 有值時強制施放指定技能（不隨機抽），供古樹守衛 Life Core 的 HP 門檻強制觸發用（見 updateHeavyAI）。 */
  tryCastBossSkill(e: EnemyInstance, forceSkillId?: string): boolean {
    let skills = BOSS_SKILLS[e.typeId]?.[e.bossPhase]
    if (!skills || skills.length === 0) return false
    // summon_cores 類技能召喚的子物件還活著時，不能重複觸發（會無限疊 Core）——
    // 靠既有的 summonedCount（見 spawnEnemyOfType/damageEnemy 的 summonedBy 連動）
    // 判斷，不用另外開一組「這個技能還沒結束」的狀態欄位。
    if (e.summonedCount > 0) {
      const filtered = skills.filter(s => s.kind !== 'summon_cores')
      if (filtered.length === 0) return false
      skills = filtered
    }
    const skill = forceSkillId ? skills.find(s => s.id === forceSkillId) : skills[Math.floor(Math.random() * skills.length)]
    if (!skill) return false
    const cdMult = e.bossPhase === 3 ? PHASE3_COOLDOWN_MULT : 1
    e.skillCooldown = skill.cooldownSec * cdMult
    switch (skill.kind) {
      case 'circle_aoe': {
        e.targetX = this.player.x; e.targetY = this.player.y
        e.state = 'boss_telegraph'
        this.spawnTelegraph('circle', e.targetX, e.targetY, { radius: skill.radius, angle: 0, width: 0 }, e, () => {
          e.state = 'seek'
          if (!e.alive) return
          const pd = Math.hypot(this.player.x - e.targetX, this.player.y - e.targetY)
          if (pd <= skill.radius) {
            this.damagePlayer(skill.damage, e)
            this.recordCampaignSkillHit(skill.id)
            // 森林巨龍 Wing Gust：純位移，不是額外傷害來源，Telegraph/命中判定
            // 完全沿用 circle_aoe 既有邏輯，只是多把玩家往外推開。
            if (skill.pushback && this.app) {
              const angle = Math.atan2(this.player.y - e.targetY, this.player.x - e.targetX)
              const b = this.getMovementBounds()
              this.player.x = Math.max(b.minX, Math.min(b.maxX, this.player.x + Math.cos(angle) * skill.pushback))
              this.player.y = Math.max(b.minY, Math.min(b.maxY, this.player.y + Math.sin(angle) * skill.pushback))
              if (this.playerSprite) { this.playerSprite.x = this.player.x; this.playerSprite.y = this.player.y }
            }
          }
        }, skill.telegraphSec)
        return true
      }
      case 'cone_breath': {
        const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x)
        e.state = 'boss_telegraph'
        this.spawnTelegraph('cone', e.x, e.y, { radius: skill.radius, angle, width: (skill.coneAngleDeg ?? 60) * Math.PI / 180 }, e, () => {
          e.state = 'seek'
          if (!e.alive) return
          const pdx = this.player.x - e.x, pdy = this.player.y - e.y
          const pd = Math.hypot(pdx, pdy)
          const pAngle = Math.atan2(pdy, pdx)
          let diff = Math.abs(pAngle - angle)
          if (diff > Math.PI) diff = Math.PI * 2 - diff
          if (pd <= skill.radius && diff <= ((skill.coneAngleDeg ?? 60) * Math.PI / 180) / 2) {
            this.damagePlayer(skill.damage, e)
            this.recordCampaignSkillHit(skill.id)
          }
        }, skill.telegraphSec)
        return true
      }
      case 'fire_floor': {
        e.targetX = this.player.x; e.targetY = this.player.y
        e.state = 'boss_telegraph'
        this.spawnTelegraph('circle', e.targetX, e.targetY, { radius: skill.radius, angle: 0, width: 0 }, e, () => {
          e.state = 'seek'
          this.spawnHazard(
            e.targetX, e.targetY, skill.radius, skill.hazardDps ?? 8, skill.hazardDurationSec ?? 4,
            skill.hazardKind ?? 'fire', skill.hazardSlowMult, skill.hazardRootSec,
          )
        }, skill.telegraphSec)
        return true
      }
      case 'cross_slam': {
        e.state = 'boss_telegraph'
        let pending = 4
        for (let i = 0; i < 4; i++) {
          const angle = (Math.PI / 2) * i
          this.spawnTelegraph('line', e.x, e.y, { radius: skill.radius, angle, width: 46 }, e, () => {
            if (e.alive) {
              const pdx = this.player.x - e.x, pdy = this.player.y - e.y
              const pd = Math.hypot(pdx, pdy)
              const pAngle = Math.atan2(pdy, pdx)
              let diff = Math.abs(pAngle - angle)
              if (diff > Math.PI) diff = Math.PI * 2 - diff
              if (pd <= skill.radius && diff <= 0.4) { this.damagePlayer(skill.damage, e); this.recordCampaignSkillHit(skill.id) }
            }
            pending--
            if (pending <= 0) e.state = 'seek'
          }, skill.telegraphSec)
        }
        return true
      }
      case 'quake': {
        e.state = 'boss_telegraph'
        const count = skill.count ?? 3
        let fired = 0
        const fireOne = () => {
          if (!e.alive) { e.state = 'seek'; return }
          const angle = Math.random() * Math.PI * 2
          const dist = Math.random() * 140
          const qx = this.player.x + Math.cos(angle) * dist
          const qy = this.player.y + Math.sin(angle) * dist
          this.spawnTelegraph('circle', qx, qy, { radius: skill.radius, angle: 0, width: 0 }, e, () => {
            if (e.alive) {
              const pd = Math.hypot(this.player.x - qx, this.player.y - qy)
              if (pd <= skill.radius) { this.damagePlayer(skill.damage, e); this.recordCampaignSkillHit(skill.id) }
            }
            fired++
            if (fired >= count) { e.state = 'seek' } else { fireOne() }
          }, skill.telegraphSec)
        }
        fireOne()
        return true
      }
      case 'charge': {
        e.targetX = this.player.x; e.targetY = this.player.y
        const angle = Math.atan2(e.targetY - e.y, e.targetX - e.x)
        e.velocityX = Math.cos(angle) * CHARGE_CONFIG.dashSpeed
        e.velocityY = Math.sin(angle) * CHARGE_CONFIG.dashSpeed
        e.state = 'boss_telegraph'
        e.eliteModifierState.chargeHit = 0
        this.spawnTelegraph('line', e.x, e.y, { radius: 500, angle, width: 30 }, e, () => {
          if (e.alive) e.state = 'boss_dashing'
        }, skill.telegraphSec)
        return true
      }
      case 'projectile': {
        this.fireEnemyProjectileAt(e, this.player.x, this.player.y, skill.damage, RANGED_CONFIG.projectileSpeed, skill.radius)
        return true
      }
      case 'summon_cores': {
        e.state = 'boss_telegraph'
        this.spawnTelegraph('circle', e.x, e.y, { radius: 60, angle: 0, width: 0 }, e, () => {
          e.state = 'seek'
          if (!e.alive) return
          const count = skill.summonCount ?? 3
          const type = skill.summonTypeId ? ALL_CAMPAIGN_STAGE_ENEMIES[skill.summonTypeId] : undefined
          if (!type) return
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count
            this.spawnEnemyOfType(type, {
              summonedBy: e, x: e.x + Math.cos(angle) * 110, y: e.y + Math.sin(angle) * 110,
            })
          }
          // 森林遺跡「每次 Core 出現後 N 秒內全滅」星星條件用（見 damageEnemy()
          // 的 root_core 死亡分支），跟 chargeHit 一樣借用 eliteModifierState
          // 這個通用 scratch dict，不是真的「Elite 詞綴」。
          e.eliteModifierState.coreSpawnTime = this.elapsed
        }, skill.telegraphSec)
        return true
      }
      case 'guard_counter': {
        // 沒有 Telegraph——格擋本身就是預警，玩家看到 Boss 舉盾就該知道先停手。
        e.state = 'boss_guarding'
        e.stateTimer = 0
        e.eliteModifierState.counterTriggered = 0
        e.eliteModifierState.guardWindowSec = skill.guardWindowSec ?? 1.2
        e.eliteModifierState.guardStartElapsed = this.elapsed
        this.spawnGlowBurst(e.x, e.y, 0x6db8ff, 70)
        return true
      }
      case 'summon': {
        e.state = 'boss_telegraph'
        this.spawnTelegraph('circle', e.x, e.y, { radius: 60, angle: 0, width: 0 }, e, () => {
          e.state = 'seek'
          if (!e.alive) return
          const type = skill.summonTypeId ? ALL_CAMPAIGN_STAGE_ENEMIES[skill.summonTypeId] : undefined
          if (!type) return
          // 跟 summon_cores 不同：這裡是純戰場壓力，不掛減傷語意，但還是要有
          // 上限，不然長時間拖戰會慢慢疊出一片怪海（見設計文件「不要塞怪海」）。
          const count = Math.min(skill.summonCount ?? 2, Math.max(0, SUMMONER_CONFIG.summonCap - e.summonedCount))
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / Math.max(1, count) + Math.random() * 0.5
            this.spawnEnemyOfType(type, {
              summonedBy: e, x: e.x + Math.cos(angle) * 130, y: e.y + Math.sin(angle) * 130,
            })
          }
        }, skill.telegraphSec)
        return true
      }
    }
    return false
  }

  findEnemyTypeById(id: string): EnemyTypeDef | null {
    const pool = getCampaignEnemyPool(this.campaign)
    const boss = getCampaignBoss(this.campaign)
    return pool.find(t => t.id === id) ?? (boss.id === id ? boss : null)
  }

  // ── Elite 詞綴：berserker 是被動讀取（見 getEliteSpeedMult/getEliteCooldownMult），
  // split 在 damageEnemy() 死亡分支處理，vampiric 在 damagePlayer() 被動判斷，
  // 這裡只處理需要自己計時觸發的 frost/lightning。──────────────────────
  updateEliteModifier(e: EnemyInstance, dt: number) {
    switch (e.eliteModifier) {
      case 'frost': {
        e.eliteModifierState.frostTimer = (e.eliteModifierState.frostTimer ?? 0) + dt
        if (e.eliteModifierState.frostTimer >= FROST_CONFIG.intervalSec) {
          e.eliteModifierState.frostTimer = 0
          const tx = this.player.x, ty = this.player.y
          this.spawnTelegraph('circle', tx, ty, { radius: FROST_CONFIG.radius, angle: 0, width: 0 }, e, () => {
            if (!e.alive) return
            const pd = Math.hypot(this.player.x - tx, this.player.y - ty)
            if (pd <= FROST_CONFIG.radius) {
              this.damagePlayer(FROST_CONFIG.damage, e)
              this.player.moveSpeedDebuffMult = FROST_CONFIG.moveSpeedDebuffMult
              this.player.moveSpeedDebuffTimer = FROST_CONFIG.moveSpeedDebuffSec
            }
          }, FROST_CONFIG.telegraphSec)
        }
        break
      }
      case 'lightning': {
        e.eliteModifierState.lightningTimer = (e.eliteModifierState.lightningTimer ?? 0) + dt
        if (e.eliteModifierState.lightningTimer >= LIGHTNING_CONFIG.intervalSec) {
          e.eliteModifierState.lightningTimer = 0
          const tx = this.player.x, ty = this.player.y
          this.spawnTelegraph('circle', tx, ty, { radius: LIGHTNING_CONFIG.radius, angle: 0, width: 0 }, e, () => {
            if (!e.alive) return
            const pd = Math.hypot(this.player.x - tx, this.player.y - ty)
            if (pd <= LIGHTNING_CONFIG.radius) this.damagePlayer(LIGHTNING_CONFIG.damage, e)
          }, LIGHTNING_CONFIG.telegraphSec)
        }
        break
      }
    }
  }

  getEliteSpeedMult(e: EnemyInstance): number {
    if (e.isElite && e.eliteModifier === 'berserker' && e.hp / e.maxHp < BERSERKER_CONFIG.hpThreshold) return BERSERKER_CONFIG.speedMult
    return 1
  }

  getEliteCooldownMult(e: EnemyInstance): number {
    if (e.isElite && e.eliteModifier === 'berserker' && e.hp / e.maxHp < BERSERKER_CONFIG.hpThreshold) return 1 / BERSERKER_CONFIG.cooldownRateMult
    return 1
  }

  // ── Telegraph：攻擊預警。line(衝鋒/雷射) / circle(AoE/隕石) / cone(吐息/重擊) ──
  spawnTelegraph(
    type: TelegraphType, x: number, y: number,
    opts: { radius: number; angle: number; width: number },
    owner: EnemyInstance, onResolve: () => void, maxTimer: number,
  ) {
    if (!this.app) return
    const gfx = this.telegraphPool.acquire()
    gfx.x = x; gfx.y = y
    if (!gfx.parent) this.worldLayer!.addChild(gfx)
    this.telegraphs.push({
      gfx, type, timer: 0, maxTimer, x, y,
      radius: opts.radius, angle: opts.angle, width: opts.width,
      owner, onResolve, resolved: false,
    })
  }

  drawTelegraph(t: TelegraphInstance) {
    const g = t.gfx
    g.clear()
    const p = Math.min(1, t.timer / t.maxTimer)
    const flashing = p > 0.8 && Math.floor(t.timer * 14) % 2 === 0
    const alpha = (0.25 + p * 0.5) * (flashing ? 1.4 : 1)
    const color = 0xff3b3b
    if (t.type === 'circle') {
      g.circle(0, 0, t.radius).fill({ color, alpha: alpha * 0.35 }).stroke({ color, width: 3, alpha: Math.min(1, alpha) })
    } else if (t.type === 'line') {
      g.rect(0, -t.width / 2, t.radius, t.width).fill({ color, alpha: alpha * 0.4 }).stroke({ color, width: 2, alpha: Math.min(1, alpha) })
      g.rotation = t.angle
    } else if (t.type === 'cone') {
      const half = t.width / 2
      g.moveTo(0, 0)
      g.arc(0, 0, t.radius, t.angle - half, t.angle + half)
      g.lineTo(0, 0)
      g.fill({ color, alpha: alpha * 0.35 })
      g.stroke({ color, width: 3, alpha: Math.min(1, alpha) })
    }
  }

  updateTelegraphs(dt: number) {
    if (this.telegraphs.length === 0) return
    for (const t of this.telegraphs) {
      if (t.resolved) continue
      if (!t.owner.alive) { t.resolved = true; continue }
      t.timer += dt
      this.drawTelegraph(t)
      if (t.timer >= t.maxTimer) {
        t.resolved = true
        t.onResolve()
      }
    }
    if (this.telegraphs.some(t => t.resolved)) {
      for (const t of this.telegraphs) {
        if (t.resolved) { t.gfx.visible = false; this.telegraphPool.release(t.gfx) }
      }
      this.telegraphs = this.telegraphs.filter(t => !t.resolved)
    }
  }

  // ── EnemyProjectile：跟玩家 Projectile 分開的敵人彈幕系統 ──────────────
  fireEnemyProjectileAt(from: EnemyInstance, tx: number, ty: number, damage: number, speed: number, radius: number) {
    if (!this.app) return
    const angle = Math.atan2(ty - from.y, tx - from.x)
    const gfx = this.enemyProjectilePool.acquire()
    gfx.circle(0, 0, Math.max(radius, 5)).fill({ color: 0xff6a3c })
    gfx.x = from.x; gfx.y = from.y
    if (!gfx.parent) this.worldLayer!.addChild(gfx)
    this.enemyProjectiles.push({
      gfx, x: from.x, y: from.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      damage, radius, lifetime: 3, alive: true,
    })
  }

  updateEnemyProjectiles(dt: number) {
    if (!this.app) return
    const bounds = this.getMovementBounds()
    for (const p of this.enemyProjectiles) {
      if (!p.alive) continue
      p.x += p.vx * dt; p.y += p.vy * dt
      p.gfx.x = p.x; p.gfx.y = p.y
      p.lifetime -= dt
      if (p.lifetime <= 0 || p.x < bounds.minX - 20 || p.x > bounds.maxX + 20 || p.y < bounds.minY - 20 || p.y > bounds.maxY + 20) {
        this.killEnemyProjectile(p); continue
      }
      const dist = Math.hypot(this.player.x - p.x, this.player.y - p.y)
      if (dist < p.radius + 14) {
        this.damagePlayer(p.damage)
        this.killEnemyProjectile(p)
      }
    }
    if (this.enemyProjectiles.some(p => !p.alive)) {
      this.enemyProjectiles = this.enemyProjectiles.filter(p => p.alive)
    }
  }

  killEnemyProjectile(p: EnemyProjectile) {
    p.alive = false
    p.gfx.visible = false
    this.enemyProjectilePool.release(p.gfx)
  }

  // ── Hazard：resolve 後才開始存在的持續傷害區域（火焰地板等），跟 telegraph
  // 是「預警前」vs「傷害中」的兩個獨立陣列，不共用同一套池/資料結構 ────────
  spawnHazard(x: number, y: number, radius: number, dps: number, duration: number, kind: HazardKind = 'fire', slowMult?: number, rootSec?: number) {
    if (!this.app) return
    const gfx = this.hazardPool.acquire()
    const c = HAZARD_COLORS[kind]
    gfx.circle(0, 0, radius).fill({ color: c.fill, alpha: 0.28 }).stroke({ color: c.stroke, width: 2, alpha: 0.6 })
    gfx.x = x; gfx.y = y
    if (!gfx.parent) this.worldLayer!.addChild(gfx)
    this.hazards.push({ gfx, x, y, radius, dps, timer: 0, duration, tickTimer: 0, kind, slowMult, rootSec, playerInside: false })
  }

  /** 森林樹精攻擊命中附加的短暫定身（1-9 專用）：跟 Hazard root 共用同一組
   * player.moveSpeedDebuffMult/Timer 欄位，但這是攻擊效果，不是常駐地板區域，
   * 所以不透過 spawnHazard()/updateHazards() 那條路。 */
  applyRootToPlayer(sec = 0.6) {
    this.player.moveSpeedDebuffMult = 0
    this.player.moveSpeedDebuffTimer = Math.max(this.player.moveSpeedDebuffTimer, sec)
    this.campaignStats.controlHits++
  }

  updateHazards(dt: number) {
    if (this.hazards.length === 0) return
    for (const h of this.hazards) {
      h.timer += dt
      const dist = Math.hypot(this.player.x - h.x, this.player.y - h.y)
      const inside = dist <= h.radius
      h.tickTimer += dt
      if (h.tickTimer >= 0.5) {
        h.tickTimer -= 0.5
        if (inside && h.dps > 0) {
          this.damagePlayer(h.dps * 0.5)
          if (h.kind === 'poison') this.campaignStats.poisonDamageTaken += h.dps * 0.5
          this.campaignStats.hazardHits[h.kind] = (this.campaignStats.hazardHits[h.kind] ?? 0) + 1
        }
      }
      // thorn/root 的減速：持續站在裡面就每幀刷新一小段 debuff，離開後在
      // moveSpeedDebuffTimer 既有的倒數機制下自然於 0.4 秒內恢復，不用另外
      // 追蹤「離開」事件。
      if (inside && h.slowMult !== undefined) {
        // 多個減速效果重疊時，取最強（乘數最小）那個，不會互相蓋掉對方
        this.player.moveSpeedDebuffMult = Math.min(this.player.moveSpeedDebuffMult, h.slowMult)
        this.player.moveSpeedDebuffTimer = Math.max(this.player.moveSpeedDebuffTimer, 0.4)
      }
      // root 的一次性短暫定身：只在「剛進入」的那一幀觸發，不是持續判定，
      // 避免玩家整場黏在裡面完全動不了。
      if (inside && !h.playerInside && h.rootSec) {
        this.player.moveSpeedDebuffMult = 0
        this.player.moveSpeedDebuffTimer = Math.max(this.player.moveSpeedDebuffTimer, h.rootSec)
        this.campaignStats.controlHits++
      }
      h.playerInside = inside
      h.gfx.alpha = h.timer > h.duration - 0.6 ? 0.28 * Math.max(0, (h.duration - h.timer) / 0.6) : 0.28
    }
    if (this.hazards.some(h => h.timer >= h.duration)) {
      for (const h of this.hazards) {
        if (h.timer >= h.duration) { h.gfx.visible = false; this.hazardPool.release(h.gfx) }
      }
      this.hazards = this.hazards.filter(h => h.timer < h.duration)
    }
  }

  /**
   * 攻擊命中（尚未結算傷害）時的職業技能疊層/機率效果：皇家公主冰痕、
   * 矮人戰士破甲、吟遊詩人命中回血。跟傷害本身（damageEnemy）分開，
   * 因為這些是「命中就觸發」，不是「造成傷害才觸發」。
   */
  onAttackHit(e: EnemyInstance) {
    // 天賦系統 v2（2026-08）：每個英雄可能同時有好幾個大型技能都是「命中觸發」
    // （Lv20起始機制+Lv40既有Keystone+Lv60進階機制常常疊在同一個觸發點），
    // 不再用單一 Lv40 旗標擋住整個函式，各自的 unlockedMajorSkillIds 判斷
    // 留給 arena/skills/{heroId}.ts 自己處理。既有 Lv40 機率制回血等「沒有
    // 獨立新機制」的部分維持原地判斷，不特地拆檔。
    switch (this.cfg.heroId) {
      case 'princess':
        princessOnHit(this, e)
        break
      case 'dwarf':
        dwarfOnHit(this, e)
        break
      case 'bard':
        if (this.unlockedMajorSkillIds.has('bard_lv20')) {
          bardOnHit(this, e)
        } else if (this.unlockedMajorSkillIds.has('bard_lv40') && Math.random() < 0.25) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 5)
        }
        break
      case 'mage':
        mageOnHit(this, e)
        break
      case 'priest':
        priestOnHit(this, e)
        break
      case 'rogue':
        rogueOnHit(this, e)
        break
      case 'death_knight':
        deathKnightOnHit(this)
        break
    }
  }

  pauseForBossLoot() {
    this.app?.ticker.stop()
    this.onBossLoot(pickRelicChoices(this.ownedRelicIds, 3, this.cfg.equippedWeaponTag))
  }

  applyRelicEffect(e: ArenaRelicEffect): void {
    if (e.pierceBonus) this.pierceBonus += e.pierceBonus
    if (e.extraProjectiles) this.extraProjectiles += e.extraProjectiles
    if (e.lifestealPct) this.lifestealPct += e.lifestealPct
    if (e.thornsPct) this.thornsPct += e.thornsPct
    if (e.hpRegenPctPerSec) this.hpRegenPctPerSec += e.hpRegenPctPerSec
    if (e.shieldIntervalSec) this.shieldIntervalSec = this.shieldIntervalSec > 0
      ? Math.min(this.shieldIntervalSec, e.shieldIntervalSec)
      : e.shieldIntervalSec
  }

  /**
   * 套用玩家在 RelicLootOverlay 選的遺物。這局當下就算選完馬上結束（Boss 永遠是
   * 最後一區）也沒關係——遺物是跨局永久收藏，效果會在下一局開局（見建構子）就套上，
   * 真正發揮作用的是未來每一局，不是這局剩下的空氣時間。
   */
  applyRelic(relic: ArenaRelic): void {
    this.applyRelicEffect(relic.effect)
    this.ownedRelicIds.push(relic.id)
    this.runComplete = true
    this.emitHud()
    // 故意不 ticker.start()：Boss 是這局最後一區，選完遺物就直接停在結算畫面。
  }

  /**
   * 必殺技：擊殺累積能量，滿了才能發動。按下當下就扣充能（避免 Cut-in 播放
   * 期間被連按），但不立刻結算——改觸發 Cut-in 演出（startUltimatePresentation），
   * 演出結束那一刻才是全系統唯一一個呼叫 applyUltimateDamage() 的地方
   * （見 finishUltimatePresentation）。
   */
  tryActivateUltimate(): void {
    if (this.gameOver || this.runComplete) return
    if (this.ultimateCharge < ULTIMATE_MAX) return
    if (this.presentation?.active) return // 防重入（正常情況下量條歸零後不會再被觸發，明確擋一下）
    this.ultimateCharge = 0
    this.emitHud()
    this.startUltimatePresentation()
  }

  applyUltimateDamage() {
    for (const e of this.enemies) {
      if (!e.alive) continue
      const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y)
      if (dist <= ULTIMATE_RADIUS) this.damageEnemy(e, ULTIMATE_DAMAGE)
    }
    this.spawnGlowBurst(this.player.x, this.player.y, 0xff8a3c, ULTIMATE_RADIUS)
    // 職業裝備（2026-08）：武器類型決定必殺技招式，裝上就換招，跟下面的
    // Lv100 天賦大師是獨立的兩層——這裡疊加的效果不受 unlockedMajorSkillIds
    // 影響，兩層互不衝突（各自在基礎 AoE 傷害之外疊加機制）。
    switch (`${this.cfg.heroId}_${this.cfg.equipWeaponType}`) {
      case 'knight_sword': knightSwordUltimate(this); break
      case 'knight_greatsword': knightGreatswordUltimate(this); break
      case 'mage_staff': mageStaffUltimate(this); break
      case 'mage_grimoire': mageGrimoireUltimate(this); break
      case 'priest_scepter': priestScepterUltimate(this); break
      case 'priest_holy_tome': priestHolyTomeUltimate(this); break
      case 'rogue_dagger': rogueDaggerUltimate(this); break
      case 'rogue_dual_daggers': rogueDualDaggersUltimate(this); break
      case 'princess_frost_scepter': princessFrostScepterUltimate(this); break
      case 'princess_ice_staff': princessIceStaffUltimate(this); break
      case 'archer_longbow': archerLongbowUltimate(this); break
      case 'archer_crossbow': archerCrossbowUltimate(this); break
      case 'dwarf_warhammer': dwarfWarhammerUltimate(this); break
      case 'dwarf_twin_axes': dwarfTwinAxesUltimate(this); break
      case 'bard_harp': bardHarpUltimate(this); break
      case 'bard_lute': bardLuteUltimate(this); break
      case 'death_knight_runeblade': deathKnightRunebladeUltimate(this); break
      case 'death_knight_scythe': deathKnightScytheUltimate(this); break
      case 'engineer_cannon': engineerCannonUltimate(this); break
      case 'engineer_gatling': engineerGatlingUltimate(this); break
      case 'fighter_gauntlets': fighterGauntletsUltimate(this); break
      case 'fighter_spirit_wraps': fighterSpiritWrapsUltimate(this); break
    }
    // 天賦系統 v2：Lv100 Mastery 把原本 Ultimate 進化成職業專屬版本，沿用同一套
    // Cut-in 演出（不另外做新視覺層），只在基礎傷害之外疊加各自的機制。
    switch (this.cfg.heroId) {
      case 'knight': knightUltimateMastery(this); break
      case 'mage': mageUltimateMastery(this); break
      case 'priest': priestUltimateMastery(this); break
      case 'rogue': rogueUltimateMastery(this); break
      case 'princess': princessUltimateMastery(this); break
      case 'archer': archerUltimateMastery(this); break
      case 'dwarf': dwarfUltimateMastery(this); break
      case 'bard': bardUltimateMastery(this); break
      case 'engineer': engineerUltimateMastery(this); break
      case 'fighter': fighterUltimateMastery(this); break
      case 'death_knight': deathKnightUltimateMastery(this); break
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 必殺技 Cut-in 演出（2026-08）。見 ultimatePresentation.ts 開頭說明。
  // 五個 Pixi 物件（overlayGfx/speedLineGfx/portraitSprite/titleText/
  // subtitleText）終身只建立一次（initUltimatePresentation，init() 呼叫），
  // 每次放必殺只是重置屬性、切換 visible，不重新 new。
  // ══════════════════════════════════════════════════════════════════
  initUltimatePresentation() {
    if (!this.app) return
    const overlayGfx = new Graphics()
    overlayGfx.rect(0, 0, this.app.screen.width, this.app.screen.height).fill({ color: ULTIMATE_CUTIN_BACKDROP_COLOR })
    overlayGfx.visible = false

    const speedLineGfx = new Graphics()
    const speedLineCount = ULTIMATE_CUTIN_SPEEDLINE_COUNT
    for (let i = 0; i < speedLineCount; i++) {
      const angle = (Math.PI * 2 * i) / speedLineCount
      const len = i % 2 === 0 ? 260 : 160
      const innerR = 40
      const x0 = Math.cos(angle) * innerR, y0 = Math.sin(angle) * innerR
      const x1 = Math.cos(angle) * (innerR + len), y1 = Math.sin(angle) * (innerR + len)
      speedLineGfx.moveTo(x0, y0).lineTo(x1, y1).stroke({ color: ULTIMATE_CUTIN_SPEEDLINE_COLOR, width: 3, alpha: 0.5 })
    }
    speedLineGfx.visible = false

    const portraitSprite = new Sprite(Texture.WHITE)
    portraitSprite.anchor.set(0.5)
    portraitSprite.visible = false

    const titleText = new Text({
      text: '', style: { fontSize: ULTIMATE_CUTIN_TITLE_SIZE, fontWeight: 'bold', fill: ULTIMATE_CUTIN_TITLE_COLOR, stroke: { color: 0x1a1000, width: 4 } },
    })
    titleText.anchor.set(0, 0.5)
    titleText.visible = false

    const subtitleText = new Text({
      text: '', style: { fontSize: ULTIMATE_CUTIN_SUBTITLE_SIZE, fontWeight: 'bold', fill: ULTIMATE_CUTIN_SUBTITLE_COLOR, stroke: { color: 0x1a1000, width: 3 } },
    })
    subtitleText.anchor.set(0, 0.5)
    subtitleText.visible = false

    for (const obj of [overlayGfx, speedLineGfx, portraitSprite, titleText, subtitleText]) this.app.stage.addChild(obj)

    this.presentation = {
      active: false, phase: 'freeze', timer: 0, heroId: '', skillName: '',
      overlayGfx, speedLineGfx, portraitSprite, portraitBaseScale: 1, titleText, subtitleText,
    }
  }

  startUltimatePresentation() {
    if (!this.app || !this.presentation) return
    const p = this.presentation

    // 玩家本體的技能揮出動畫照舊播放，跟 Cut-in 演出同步進行（cutin 子階段
    // 不會被 battlePaused 擋掉，見 update() 的 hitstopFreeze 判斷）。
    const skillFrames = this.heroFrames?.skill ?? []
    const hasRealSkill = skillFrames.length > 1
    this.playerAnim.skillTimer = hasRealSkill ? skillFrames.length / STATE_FPS.skill : SKILL_ANIM_DURATION

    p.active = true
    p.phase = 'freeze'
    p.timer = 0
    p.heroId = this.cfg.heroId
    p.skillName = this.cfg.ultimateName || this.cfg.heroName

    // 敵人/光效/飄字都是 init() 之後才動態加進 stage，重新 addChild 一次
    // 把這五個物件移到最上層，不然 Cut-in 會被蓋在後來加入的東西下面。
    for (const obj of [p.overlayGfx, p.speedLineGfx, p.portraitSprite, p.titleText, p.subtitleText]) {
      this.app.stage.addChild(obj)
    }

    p.overlayGfx.visible = true; p.overlayGfx.alpha = 0
    p.speedLineGfx.visible = true; p.speedLineGfx.alpha = 0
    p.speedLineGfx.rotation = 0
    p.titleText.visible = true; p.titleText.alpha = 0
    p.subtitleText.visible = true; p.subtitleText.alpha = 0

    const { width, height } = this.app.screen
    p.speedLineGfx.x = width / 2
    p.speedLineGfx.y = height / 2

    const portraitTex = this.portraitTextureCache.get(p.heroId)
    p.portraitSprite.visible = true
    p.portraitSprite.alpha = 0
    if (portraitTex) {
      p.portraitSprite.texture = portraitTex
      this.setSpriteHeight(p.portraitSprite, height * ULTIMATE_CUTIN_PORTRAIT_HEIGHT_RATIO)
    } else if (this.playerSprite) {
      p.portraitSprite.texture = this.playerSprite.texture
      this.setSpriteHeight(p.portraitSprite, height * ULTIMATE_CUTIN_PORTRAIT_FALLBACK_HEIGHT_RATIO)
    }
    p.portraitBaseScale = p.portraitSprite.scale.x
    p.portraitSprite.y = height * 0.5
    p.portraitSprite.x = width + p.portraitSprite.width / 2 // 滑入起點：畫面右側外

    p.titleText.text = this.cfg.heroName
    p.titleText.x = width * 0.30
    p.titleText.y = height * 0.72
    p.subtitleText.text = p.skillName
    p.subtitleText.x = width * 0.30
    p.subtitleText.y = height * 0.72 + 34
  }

  updateUltimatePresentation(dt: number) {
    const p = this.presentation
    if (!p || !p.active) return
    p.timer += dt

    if (p.phase === 'freeze') {
      if (p.timer >= ULTIMATE_FREEZE_SEC) { p.phase = 'cutin'; p.timer = 0 }
      return
    }

    // phase === 'cutin'：inT 是滑入/淡入進度（0→1），outT 是尾端淡出進度（0→1，
    // 只在最後 ULTIMATE_CUTIN_FADE_OUT_SEC 秒才 > 0）。easedAlpha 是兩者合併後
    // 「淡入→維持→淡出」的統一透明度曲線，overlay/speedline/文字/立繪共用。
    const { width } = this.app!.screen
    const inT = Math.max(0, Math.min(1, p.timer / ULTIMATE_CUTIN_SLIDE_IN_SEC))
    const outStart = ULTIMATE_CUTIN_SEC - ULTIMATE_CUTIN_FADE_OUT_SEC
    const outT = p.timer <= outStart ? 0 : Math.max(0, Math.min(1, (p.timer - outStart) / ULTIMATE_CUTIN_FADE_OUT_SEC))
    const easedAlpha = outT > 0 ? 1 - outT : inT
    const slideT = 1 - (1 - inT) ** 3 // ease-out cubic，只用在滑入/縮放彈跳，跟淡出無關

    p.overlayGfx.alpha = ULTIMATE_CUTIN_BACKDROP_ALPHA * easedAlpha
    p.speedLineGfx.alpha = 0.6 * easedAlpha
    p.speedLineGfx.rotation += dt * 0.6
    p.titleText.alpha = easedAlpha
    p.subtitleText.alpha = easedAlpha

    const restX = width * 0.62
    const startX = width + p.portraitSprite.width / 2
    p.portraitSprite.x = startX + (restX - startX) * slideT
    p.portraitSprite.alpha = easedAlpha
    const scalePop = 0.85 + 0.15 * slideT
    p.portraitSprite.scale.set(p.portraitBaseScale * scalePop)

    if (p.timer >= ULTIMATE_CUTIN_SEC) this.finishUltimatePresentation()
  }

  finishUltimatePresentation() {
    const p = this.presentation
    if (!p) return
    p.active = false
    p.overlayGfx.visible = false
    p.speedLineGfx.visible = false
    p.portraitSprite.visible = false
    p.titleText.visible = false
    p.subtitleText.visible = false
    this.applyUltimateDamage()
  }

  spawnGem(x: number, y: number, value: number) {
    if (!this.app) return
    const gfx = this.gemPool.acquire()
    gfx.circle(0, 0, GEM_RADIUS).fill({ color: 0x4ade80 })
    gfx.x = x
    gfx.y = y
    if (!gfx.parent) this.worldLayer!.addChild(gfx)
    this.gems.push({ gfx, x, y, value, alive: true })
  }

  updateGems(dt: number) {
    for (const g of this.gems) {
      if (!g.alive) continue
      const dx = this.player.x - g.x
      const dy = this.player.y - g.y
      const dist = Math.hypot(dx, dy)
      if (dist < PICKUP_RANGE * this.pickupRangeMult) {
        const step = Math.min(dist, MAGNET_SPEED * dt)
        if (dist > 1) { g.x += (dx / dist) * step; g.y += (dy / dist) * step }
        g.gfx.x = g.x
        g.gfx.y = g.y
      }
      if (dist < 16) {
        g.alive = false
        g.gfx.visible = false
        this.gemPool.release(g.gfx)
        this.gainXp(g.value)
      }
    }
    if (this.gems.some(g => !g.alive)) {
      this.gems = this.gems.filter(g => g.alive)
    }
  }

  gainXp(amount: number) {
    this.xp += amount
    // while（不是 if）：一次拿到大量 XP（例如 Boss 掉落的大寶石）要能一口氣
    // 跨過好幾個等級門檻，不能因為只檢查一次就悄悄漏掉升級。目前一次 gainXp
    // 只會跳出一次升級提示（見下方 leveledUp），多級一次疊完，不會連續跳
    // 好幾個 DiceUpgradeOverlay——那個排隊機制留給之後真的需要時再做。
    let leveledUp = false
    while (this.xp >= this.xpToNext()) {
      this.xp -= this.xpToNext()
      this.level++
      leveledUp = true
    }
    if (leveledUp) {
      this.emitHud()
      this.pauseForLevelUp()
    }
  }

  xpToNext(): number {
    return 40 + (this.level - 1) * 20
  }

  pauseForLevelUp() {
    this.app?.ticker.stop()
    this.onLevelUp()
  }

  /** 測試用：跳過等待真的吃夠 XP，直接觸發升級流程。 */
  forceLevelUp(): void {
    this.level++
    this.emitHud()
    this.pauseForLevelUp()
  }

  /** 套用玩家在 DiceUpgradeOverlay 選的卡，並恢復戰鬥。 */
  applyCard(card: ArenaCard): void {
    const e = card.effect
    if (e.flatDamage) this.bonusDamage += e.flatDamage
    if (e.atkCooldownMult) this.atkCooldownMult *= e.atkCooldownMult
    if (e.moveSpeedBonus) this.moveSpeedMult *= 1 + e.moveSpeedBonus
    if (e.pickupRangeBonus) this.pickupRangeMult *= 1 + e.pickupRangeBonus
    if (e.maxHpBonus) {
      this.player.maxHp += e.maxHpBonus
      this.player.hp += e.maxHpBonus
    }
    this.emitHud()
    if (this.pendingZoneCardTrigger) {
      // 這次升級卡是「三選一技能區」觸發的，不是吃 XP 升級——選完要開門，
      // 跟一般升級卡明確區分開來，一般升級不該觸發開門。
      this.pendingZoneCardTrigger = false
      this.completeZone()
    }
    this.app?.ticker.start()
  }

  spawnFloatingText(text: string, x: number, y: number) {
    if (!this.app) return
    const obj = this.textPool.acquire()
    obj.text = text
    obj.anchor.set(0.5)
    obj.x = x
    obj.y = y
    if (!obj.parent) this.worldLayer!.addChild(obj)
    this.floatingTexts.push({ obj, vy: -30, life: 0, maxLife: 1.6, alive: true })
  }

  updateFloatingTexts(dt: number) {
    for (const f of this.floatingTexts) {
      if (!f.alive) continue
      f.life += dt
      f.obj.y += f.vy * dt
      f.obj.alpha = Math.max(0, 1 - f.life / f.maxLife)
      if (f.life >= f.maxLife) {
        f.alive = false
        f.obj.visible = false
        this.textPool.release(f.obj)
      }
    }
    if (this.floatingTexts.some(f => !f.alive)) {
      this.floatingTexts = this.floatingTexts.filter(f => f.alive)
    }
  }

  spawnGlowBurst(x: number, y: number, color: number, radius: number) {
    if (!this.app) return
    const gfx = this.glowPool.acquire()
    gfx.circle(0, 0, radius).stroke({ color, width: 4, alpha: 0.9 })
    gfx.x = x
    gfx.y = y
    gfx.scale.set(0.4)
    if (!gfx.parent) this.worldLayer!.addChild(gfx)
    this.glows.push({ gfx, life: 0, maxLife: 0.5, alive: true })
  }

  /** 近戰普攻的「揮擊」視覺（2026-08）：跟 spawnGlowBurst 共用同一套 glow 動畫
   * （放大＋淡出），只是畫成朝目標方向展開的扇形弧線，比純圓環更有「揮出去」
   * 的方向感。跟命中判定完全無關，純視覺——近戰命中範圍還是 meleeAttackAt()
   * 的全方位半徑檢查，不會因為這個特效而漏判/誤判。 */
  spawnSlashEffect(x: number, y: number, angle: number, color: number, radius: number) {
    if (!this.app) return
    const gfx = this.glowPool.acquire()
    const arcHalfWidth = Math.PI * 0.3
    gfx.arc(0, 0, radius, angle - arcHalfWidth, angle + arcHalfWidth).stroke({ color, width: 6, alpha: 0.95 })
    gfx.x = x
    gfx.y = y
    gfx.scale.set(0.5)
    if (!gfx.parent) this.worldLayer!.addChild(gfx)
    this.glows.push({ gfx, life: 0, maxLife: 0.28, alive: true })
  }

  /** 依英雄畫出對應主題的遠程攻擊彈頭外觀（2026-08，見 HERO_ATTACK_COLOR）。沒有對應到的英雄（未來新角色）維持原本的黃色圓點，不會噴錯誤。 */
  drawProjectileVisual(gfx: Graphics, heroId: string, angle: number) {
    const color = HERO_ATTACK_COLOR[heroId] ?? 0xffd94a
    switch (heroId) {
      case 'mage': // 火球：外層橘紅、內層亮黃疊出燃燒感
        gfx.circle(0, 0, 9).fill({ color: 0xff6a1a, alpha: 0.85 })
        gfx.circle(0, 0, 5).fill({ color: 0xffe066 })
        break
      case 'princess': // 冰晶箭：菱形冰刃，朝行進方向對齊
        gfx.poly([-10, 0, -2, -4, 10, 0, -2, 4]).fill({ color: 0xeaf7ff }).stroke({ color, width: 1.5 })
        gfx.rotation = angle
        break
      case 'archer': // 弓箭：箭桿+箭頭
        gfx.moveTo(-11, 0).lineTo(7, 0).stroke({ color: 0x6b4a2a, width: 2.5 })
        gfx.poly([7, -3.5, 13, 0, 7, 3.5]).fill({ color })
        gfx.rotation = angle
        break
      case 'priest': // 聖光彈：金色光球+外圈光環
        gfx.circle(0, 0, 7).fill({ color: 0xfff2c9, alpha: 0.95 })
        gfx.circle(0, 0, 9).stroke({ color, width: 1.5, alpha: 0.8 })
        break
      case 'bard': // 音波光點：五角星形小光點
        gfx.star(0, 0, 5, 7, 3).fill({ color })
        break
      case 'engineer': // 機關彈頭：金屬灰圓+深色外框
        gfx.circle(0, 0, 6.5).fill({ color: 0xc7d0d8 }).stroke({ color: 0x50565c, width: 2 })
        break
      default:
        gfx.circle(0, 0, PROJECTILE_RADIUS).fill({ color })
    }
  }

  updateGlows(dt: number) {
    for (const g of this.glows) {
      if (!g.alive) continue
      g.life += dt
      const t = g.life / g.maxLife
      g.gfx.alpha = Math.max(0, 1 - t)
      g.gfx.scale.set(0.4 + t * 1.2)
      if (g.life >= g.maxLife) {
        g.alive = false
        g.gfx.visible = false
        this.glowPool.release(g.gfx)
      }
    }
    if (this.glows.some(g => !g.alive)) {
      this.glows = this.glows.filter(g => g.alive)
    }
  }

  emitHud() {
    const boss = this.enemies.find(e => e.isBoss && e.alive)
    const node = this.getZoneNode(this.currentNodeId)
    this.onHudChange({
      hp: Math.round(this.player.hp),
      maxHp: this.player.maxHp,
      xp: this.xp,
      xpToNext: this.xpToNext(),
      level: this.level,
      elapsed: this.elapsed,
      fps: this.fps,
      enemyCount: this.enemies.length,
      bossState: this.bossState,
      bossHp: boss?.hp ?? 0,
      bossMaxHp: boss?.maxHp ?? 0,
      killCount: this.killCount,
      gameOver: this.gameOver,
      zoneType: this.currentZoneType,
      zoneIndex: (node?.row ?? 0) + 1,
      zoneCount: this.dungeon.length > 0 ? Math.max(...this.dungeon.map(n => n.row)) + 1 : 0,
      ultimateCharge: this.ultimateCharge,
      ultimateMax: ULTIMATE_MAX,
      bonusGold: this.bonusGold,
      runComplete: this.runComplete,
      ownedRelicIds: this.ownedRelicIds,
      campaignResult: this.campaignResult,
    })
  }

  destroy(): void {
    this.destroyed = true
    if (this.app) {
      this.app.destroy(true, { children: true, texture: false })
      this.app = null
    }
  }
}
