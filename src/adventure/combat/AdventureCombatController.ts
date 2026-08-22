import { Graphics, Sprite } from 'pixi.js'
import type { AdventureGame } from '../AdventureGame'
import type { CombatZoneDef } from '../adventureTypes'
import { setSpriteHeight } from '../../arena/heroSpriteRig'
import { dist, pointInRect } from '../geometry'
import { getAdventureEnemyRenderHeight, getAdventureEnemyHitboxRadius } from '../art/forestRuins01VisualTuning'

/**
 * Adventure Stage 原生輕量戰鬥系統——不是掛一個 ArenaGame 進來（那樣等於在
 * 同一個畫面疊第二個完整模擬引擎，會變成使用者明確反對過的「另開一個
 * 視窗」的手感），是直接在 AdventureGame 既有的 worldLayer/camera 裡生成
 * 敵人，複用 src/arena/enemies.ts 的 EnemyTypeDef 數值資料跟角色動畫載入
 * 管線（frameLoader.ts + heroSpriteRig.ts），但敵人 AI／傷害判定是這個檔案
 * 自己的簡化版本——森林小範圍遭遇戰（3~5 隻雜兵的小房間戰鬥），不需要
 * ArenaGame.ts 整套子彈地獄/爆擊/破甲/精英詞綴/Boss 三階段機制，硬套用
 * 反而是過度工程。目前所有敵人一律簡化成「靠近即近戰攻擊」，不重現
 * enemyAI.ts 的 ranged/support/aoe 等行為分支（森林薩滿等支援型敵人在這裡
 * 一樣會近戰接觸傷害，屬於已知的 Greybox 簡化，见任務最終報告）。
 */

const BASE_ENEMY_HP = 30
const BASE_ENEMY_DAMAGE = 6
const ENEMY_SPEED = 70
// 2026-08-20：接觸／攻擊距離改成「雙方 hitbox 半徑相加再加一點餘裕」，不
// 再是寫死的 32/46——這輪把玩家跟敵人的 hitbox 都改成依實際顯示尺寸算，
// 固定距離會跟新尺寸對不上（角色變大了，接觸判定卻還是舊的小範圍）。
const ENEMY_ATTACK_REACH = 8
const ENEMY_ATTACK_COOLDOWN = 1.1
const PLAYER_ATTACK_REACH = 14
const PLAYER_ATTACK_COOLDOWN = 0.55

// 2026-08-21（雪原篇 2-1 霜狼伏擊）：精英詞綴的體型/血量加成，跟金色 tint
// 一起讓玩家一眼認出「這隻不一樣」，不用另外做專屬立繪。
const ELITE_HP_MULT = 1.85
const ELITE_SIZE_MULT = 1.16
const ELITE_TINT = 0xffcf6b

// 精英專屬技能——2026-08-21 一開始只有 frost_wolf 的 leap（雪原篇 2-1
// 霜狼伏擊），後續幾關陸續加了幾個 typeId 不同、節奏相同或相近的技能，
// 全部用 typeId→{skillId,kind} 查表分派，不為每個 Boss 重寫一份狀態機：
// - 'charge'：cooldown（一般追逐）→ telegraph（原地蓄力，紅光預警）→
//   lunge（高速衝刺，命中才算數）。frost_wolf 的 leap／frost_knight_captain
//   的 ice_charge。
// - 'aoe'／'cone'：原地不動版本，一樣 cooldown→telegraph，蓄力完直接原地
//   判定（'aoe' 不分方向、'cone' 只判定蓄力當下瞄準的扇形方向）——
//   snow_troll 的重砸（aoe）、ice_dragon 的冰息（cone，範圍更大更像吐息）。
type EliteSkillKind = 'charge' | 'aoe' | 'cone'
const ELITE_SKILL_CONFIG: Record<string, { skillId: string; kind: EliteSkillKind }> = {
  frost_wolf: { skillId: 'frost_wolf_leap', kind: 'charge' },
  frost_knight_captain: { skillId: 'frost_knight_ice_charge', kind: 'charge' },
  snow_troll: { skillId: 'snow_troll_heavy_slam', kind: 'aoe' },
  ice_dragon: { skillId: 'ice_dragon_breath', kind: 'cone' },
}
const ELITE_LEAP_COOLDOWN_SEC = 3.4
const ELITE_LEAP_TELEGRAPH_SEC = 0.45
const ELITE_LEAP_DASH_SEC = 0.24
const ELITE_LEAP_SPEED = 900
const ELITE_LEAP_MIN_RANGE = 90
const ELITE_LEAP_MAX_RANGE = 320
const ELITE_LEAP_DAMAGE_MULT = 1.9
const ELITE_LEAP_RETRY_SEC = 0.35
const ELITE_LEAP_TINT = 0xff5a5a

// 原地技能（aoe/cone）共用參數。
const STATIONARY_COOLDOWN_SEC = 4.2
const STATIONARY_TELEGRAPH_SEC = 0.6
const STATIONARY_RANGE = 260
const STATIONARY_CONE_HALF_RAD = (45 * Math.PI) / 180
const STATIONARY_DAMAGE_MULT = 2.2

// ice_shaman（2-4 冰霜祭台）：支援型精英每隔 SUPPORT_HEAL_INTERVAL_SEC 秒
// 自我治療一次（簡化版——Greybox 輕量戰鬤系統沒有敵人互相治療的機制，見
// 檔案開頭註解，這裡只做「未滿血就補自己」），命中 heal_count_under 星星
// 條件用同一份 skillHitCounts 記帳。
const SUPPORT_HEAL_INTERVAL_SEC = 4
const SUPPORT_HEAL_PCT = 0.15

interface EliteLeapState {
  phase: 'cooldown' | 'telegraph' | 'lunge'
  timer: number
  dirX: number
  dirY: number
}

interface EliteStationaryState {
  phase: 'cooldown' | 'telegraph'
  timer: number
  angleCenter: number
}

export interface AdventureEnemyInstance {
  id: string
  typeId: string
  x: number
  y: number
  /** 腳底中心周圍的 world-space 接觸半徑，不等同整張立繪寬度。 */
  hitRadius: number
  hp: number
  maxHp: number
  alive: boolean
  atkTimer: number
  sprite: Sprite
  hpBarBg: Graphics
  hpBarFill: Graphics
  /** 2026-08-21：精英詞綴，目前只有 frost_wolf 額外解鎖 leap 技能狀態機
   * （見 updateEliteLeap），其餘敵人掛這個純粹只是變大變硬。 */
  isElite: boolean
}

interface ActiveZoneState {
  zone: CombatZoneDef
  waveIndex: number
}

let nextEnemyInstanceId = 1

export class AdventureCombatController {
  enemies: AdventureEnemyInstance[] = []
  private activeZone: ActiveZoneState | null = null
  private playerAtkTimer = 0
  private eliteLeap = new Map<string, EliteLeapState>()
  private eliteStationary = new Map<string, EliteStationaryState>()
  private supportHealTimers = new Map<string, number>()

  constructor(private game: AdventureGame) {}

  /** 每幀檢查玩家是否走進尚未觸發的戰鬤區域（跟舊 exploreWorld 的
   * battleZone 判定同款手感：走進去才開打，不是一進關卡就打）。
   *
   * 2026-08-20 修正：原本這段判斷「沒有 activeZone 就直接 return」，結果
   * 任務擊殺目標（QuestSystem.spawnHostileEnemy 生的怪，不走 startZone，
   * 不會設 activeZone）生出來以後永遠不會被 tick 到——敵人不會移動、玩家
   * 也打不到（updateEnemies/updatePlayerAttack 整段被跳過），任務卡死在
   * 「已接受」湊不齊擊殺數。改成「有沒有 enemies 存在」才是 AI／攻擊要不
   * 要 tick 的條件，activeZone 只用來判斷波次推進／戰鬤結算（checkWaveProgress）
   * 要不要跑，兩件事分開判斷。 */
  update(dt: number) {
    const g = this.game
    if (!this.activeZone) {
      for (const zone of g.stage.combatZones) {
        if (g.clearedCombatZones.has(zone.id)) continue
        if (pointInRect(g.player.x, g.player.y, zone.area)) {
          this.startZone(zone)
          break
        }
      }
    }
    if (this.enemies.length === 0) return
    this.updateEnemies(dt)
    this.updatePlayerAttack(dt)
    if (this.activeZone) this.checkWaveProgress()
  }

  private startZone(zone: CombatZoneDef) {
    const g = this.game
    this.activeZone = { zone, waveIndex: 0 }
    g.state = 'combat'
    for (const id of zone.gateColliderIds) g.setColliderActive(id, true)
    g.showToast('戰鬥開始！')
    this.spawnWave(zone.waves[0])
  }

  private spawnWave(wave: CombatZoneDef['waves'][number]) {
    const g = this.game
    const { area } = this.activeZone!.zone
    for (const w of wave) {
      for (let i = 0; i < w.count; i++) {
        const x = area.x + Math.random() * area.width
        const y = area.y + Math.random() * area.height
        this.spawnHostileEnemy(w.enemyId, x, y, w.isElite ?? false)
      }
    }
  }

  /** 任務擊殺目標（QuestSystem）跟正式戰鬤區共用同一套敵人生成/AI/傷害，
   * 不需要另外走一套機制——差別只在誰呼叫、生完之後不進 combat 狀態機。 */
  spawnHostileEnemy(enemyId: string, x: number, y: number, isElite = false) {
    const g = this.game
    const type = g.enemyTypeDefs[enemyId]
    if (!type) return
    // 花圃小怪這類有正式靜態立繪的敵人優先用那張圖（單張插畫，沒有逐幀
    // 動畫）；其餘敵人維持原本的 frameLoader 逐幀動畫。
    const staticTex = g.getEnemyStaticTexture(type.id)
    const frames = g.enemyFrames[type.placeholderSpriteId ?? type.id]
    const tex = staticTex ?? frames?.idle[0]
    const sprite = tex ? new Sprite(tex) : new Sprite()
    // 2026-08-22 修正：這裡原本寫死 anchor.set(0.5,1)，完全沒讀
    // type.anchorRatio——森林遺跡 12 隻真圖敵人跟雪原篇這批新怪都是靠
    // anchorRatio 記錄畫布上實際的腳底落地比例（跟 ArenaGame.ts
    // spawnEnemyOfType() 已經在用的邏輯一致，見 enemies.ts 的
    // anchorRatio 註解），沒有這行的敵人會整隻明顯偏移/浮空。沒有
    // anchorRatio 的敵人（totem 類靜止物件、舊版置中裁切素材）維持原本
    // (0.5,1) 底部置中，行為不變。
    sprite.anchor.set(type.anchorRatio?.x ?? 0.5, type.anchorRatio?.y ?? 1)
    // 靜態立繪 (staticTex) 不再另外乘 0.6——getAdventureEnemyRenderHeight
    // 統一依 EnemyTypeDef.spriteHeight 換算，跟逐幀動畫敵人共用同一套
    // Map-Native 比例基準，不需要靜態圖再單獨縮小一次。
    const renderHeight = Math.round(getAdventureEnemyRenderHeight(type.spriteHeight) * (isElite ? ELITE_SIZE_MULT : 1))
    const hitRadius = getAdventureEnemyHitboxRadius(renderHeight)
    if (tex) setSpriteHeight(sprite, renderHeight)
    if (isElite) sprite.tint = ELITE_TINT
    sprite.x = x
    sprite.y = y
    sprite.zIndex = y
    g.worldLayer.addChild(sprite)

    const hpBarBg = new Graphics().rect(-20, -renderHeight - 12, 40, 5).fill({ color: 0x1a1a1a, alpha: 0.82 })
    const hpBarFill = new Graphics().rect(-20, -renderHeight - 12, 40, 5).fill({ color: isElite ? 0xffcf6b : 0xe05050 })
    hpBarBg.x = x; hpBarBg.y = y
    hpBarFill.x = x; hpBarFill.y = y
    g.worldLayer.addChild(hpBarBg)
    g.worldLayer.addChild(hpBarFill)

    const maxHp = Math.round(BASE_ENEMY_HP * type.hpMult * (isElite ? ELITE_HP_MULT : 1))
    this.enemies.push({
      id: `ae_${nextEnemyInstanceId++}`, typeId: type.id, x, y, hitRadius, hp: maxHp, maxHp,
      alive: true, atkTimer: Math.random() * ENEMY_ATTACK_COOLDOWN, sprite, hpBarBg, hpBarFill, isElite,
    })
  }

  private updateEnemies(dt: number) {
    const g = this.game
    for (const e of this.enemies) {
      if (!e.alive) continue
      const skillCfg = e.isElite ? ELITE_SKILL_CONFIG[e.typeId] : undefined
      if (skillCfg?.kind === 'charge') {
        this.updateEliteChargeSkill(e, dt, skillCfg.skillId)
      } else if (skillCfg?.kind === 'aoe' || skillCfg?.kind === 'cone') {
        this.updateEliteStationarySkill(e, dt, skillCfg.skillId, skillCfg.kind)
      } else {
        const type = g.enemyTypeDefs[e.typeId]
        const d = dist(e.x, e.y, g.player.x, g.player.y)
        const contactDistance = g.player.radius + e.hitRadius + ENEMY_ATTACK_REACH
        if (d > contactDistance) {
          this.chaseTowardsPlayer(e, dt, type?.speedMult ?? 1)
        } else {
          e.atkTimer -= dt
          if (e.atkTimer <= 0) {
            e.atkTimer = ENEMY_ATTACK_COOLDOWN
            g.damagePlayer(Math.round(BASE_ENEMY_DAMAGE * (type?.damageMult ?? 1)))
          }
        }
        if (e.typeId === 'ice_shaman') this.updateSupportHeal(e, dt)
      }
      e.sprite.x = e.x; e.sprite.y = e.y; e.sprite.zIndex = e.y
      e.hpBarBg.x = e.x; e.hpBarBg.y = e.y; e.hpBarBg.zIndex = e.y
      e.hpBarFill.x = e.x; e.hpBarFill.y = e.y; e.hpBarFill.zIndex = e.y + 0.1
      const pct = Math.max(0, e.hp / e.maxHp)
      e.hpBarFill.scale.x = pct
    }
  }

  /** 一般追逐移動，抽成獨立方法給普通敵人跟精英 leap 冷卻期間共用。 */
  private chaseTowardsPlayer(e: AdventureEnemyInstance, dt: number, speedMult: number) {
    const g = this.game
    const d = dist(e.x, e.y, g.player.x, g.player.y) || 1
    const speed = ENEMY_SPEED * speedMult
    const dx = (g.player.x - e.x) / d
    const dy = (g.player.y - e.y) / d
    // 2026-08-20：敵人追逐這輪開始真的走房間碰撞——之前完全沒有這段，
    // 敵人可以直接穿牆/穿水/穿帳篷貼臉，現在跟玩家共用同一套
    // moveCircleWithCollision（allowTransitionOverlap=false，見
    // CollisionSystem.ts 註解）。
    const moved = g.collision.moveEnemyWithCollision(e.x, e.y, e.hitRadius, dx * speed * dt, dy * speed * dt)
    e.x = moved.x
    e.y = moved.y
  }

  /** 2026-08-21（雪原篇 2-1 霜狼伏擊起）：精英衝刺技能狀態機（frost_wolf
   * 的 leap／frost_knight_captain 的 ice_charge 共用同一套）——cooldown
   * 期間沿用一般追逐，進 telegraph 原地蓄力紅光預警，蓄力完進 lunge 高速
   * 衝刺，命中玩家才算數（呼應 star_conditions.json 的 avoid_skill，
   * skillId 由呼叫端傳入）。沒命中／衝刺時間到都會回到 cooldown，不會卡在
   * lunge 出不來。 */
  private updateEliteChargeSkill(e: AdventureEnemyInstance, dt: number, skillId: string) {
    const g = this.game
    let st = this.eliteLeap.get(e.id)
    if (!st) { st = { phase: 'cooldown', timer: 1.0, dirX: 0, dirY: 0 }; this.eliteLeap.set(e.id, st) }
    st.timer -= dt

    if (st.phase === 'cooldown') {
      const d = dist(e.x, e.y, g.player.x, g.player.y)
      if (st.timer <= 0 && d >= ELITE_LEAP_MIN_RANGE && d <= ELITE_LEAP_MAX_RANGE) {
        st.phase = 'telegraph'
        st.timer = ELITE_LEAP_TELEGRAPH_SEC
        e.sprite.tint = ELITE_LEAP_TINT
      } else {
        if (st.timer <= 0) st.timer = ELITE_LEAP_RETRY_SEC // 距離不對，短暫重試冷卻，避免每幀重算
        const type = g.enemyTypeDefs[e.typeId]
        const contactDistance = g.player.radius + e.hitRadius + ENEMY_ATTACK_REACH
        if (d > contactDistance) {
          this.chaseTowardsPlayer(e, dt, type?.speedMult ?? 1)
        } else {
          e.atkTimer -= dt
          if (e.atkTimer <= 0) {
            e.atkTimer = ENEMY_ATTACK_COOLDOWN
            g.damagePlayer(Math.round(BASE_ENEMY_DAMAGE * (type?.damageMult ?? 1)))
          }
        }
      }
      return
    }

    if (st.phase === 'telegraph') {
      if (st.timer <= 0) {
        st.phase = 'lunge'
        st.timer = ELITE_LEAP_DASH_SEC
        const d = dist(e.x, e.y, g.player.x, g.player.y) || 1
        st.dirX = (g.player.x - e.x) / d
        st.dirY = (g.player.y - e.y) / d
      }
      return // 蓄力中原地不動
    }

    // lunge
    const moved = g.collision.moveEnemyWithCollision(e.x, e.y, e.hitRadius, st.dirX * ELITE_LEAP_SPEED * dt, st.dirY * ELITE_LEAP_SPEED * dt)
    e.x = moved.x; e.y = moved.y
    const type = g.enemyTypeDefs[e.typeId]
    const contactDistance = g.player.radius + e.hitRadius + ENEMY_ATTACK_REACH
    if (dist(e.x, e.y, g.player.x, g.player.y) <= contactDistance) {
      g.damagePlayer(Math.round(BASE_ENEMY_DAMAGE * (type?.damageMult ?? 1) * ELITE_LEAP_DAMAGE_MULT))
      g.recordSkillHit(skillId)
      st.phase = 'cooldown'; st.timer = ELITE_LEAP_COOLDOWN_SEC; e.sprite.tint = ELITE_TINT
      return
    }
    if (st.timer <= 0) { st.phase = 'cooldown'; st.timer = ELITE_LEAP_COOLDOWN_SEC; e.sprite.tint = ELITE_TINT }
  }

  /** 2026-08-21（雪原篇 2-7/2-10）：原地技能狀態機（snow_troll 的重砸＝
   * 'aoe'、ice_dragon 的冰息＝'cone'）——跟 updateEliteChargeSkill 的差異
   * 是蓄力完不衝刺，直接原地判定範圍內有沒有玩家。cooldown 期間維持正常
   * 追逐/接觸攻擊，不會因為在等技能冷卻就站著不動。 */
  private updateEliteStationarySkill(e: AdventureEnemyInstance, dt: number, skillId: string, kind: 'aoe' | 'cone') {
    const g = this.game
    let st = this.eliteStationary.get(e.id)
    if (!st) { st = { phase: 'cooldown', timer: 1.2, angleCenter: 0 }; this.eliteStationary.set(e.id, st) }
    st.timer -= dt
    const type = g.enemyTypeDefs[e.typeId]

    if (st.phase === 'cooldown') {
      if (st.timer <= 0) {
        st.phase = 'telegraph'
        st.timer = STATIONARY_TELEGRAPH_SEC
        st.angleCenter = Math.atan2(g.player.y - e.y, g.player.x - e.x)
        e.sprite.tint = ELITE_LEAP_TINT
      } else {
        const d = dist(e.x, e.y, g.player.x, g.player.y)
        const contactDistance = g.player.radius + e.hitRadius + ENEMY_ATTACK_REACH
        if (d > contactDistance) {
          this.chaseTowardsPlayer(e, dt, type?.speedMult ?? 1)
        } else {
          e.atkTimer -= dt
          if (e.atkTimer <= 0) {
            e.atkTimer = ENEMY_ATTACK_COOLDOWN
            g.damagePlayer(Math.round(BASE_ENEMY_DAMAGE * (type?.damageMult ?? 1)))
          }
        }
      }
      return
    }

    // telegraph：原地蓄力，時間到才判定一次
    if (st.timer <= 0) {
      const d = dist(e.x, e.y, g.player.x, g.player.y)
      let hit = false
      if (d <= STATIONARY_RANGE) {
        if (kind === 'aoe') {
          hit = true
        } else {
          const angle = Math.atan2(g.player.y - e.y, g.player.x - e.x)
          const diff = Math.atan2(Math.sin(angle - st.angleCenter), Math.cos(angle - st.angleCenter))
          hit = Math.abs(diff) <= STATIONARY_CONE_HALF_RAD
        }
      }
      if (hit) {
        g.damagePlayer(Math.round(BASE_ENEMY_DAMAGE * (type?.damageMult ?? 1) * STATIONARY_DAMAGE_MULT))
        g.recordSkillHit(skillId)
      }
      st.phase = 'cooldown'
      st.timer = STATIONARY_COOLDOWN_SEC
      e.sprite.tint = ELITE_TINT
    }
  }

  /** 2026-08-21（雪原篇 2-4 冰霜祭台）：ice_shaman 未滿血時每隔
   * SUPPORT_HEAL_INTERVAL_SEC 秒自我治療一次，命中 heal_count_under 星星
   * 條件（`${typeId}_heal_cast` key，見 AdventureGame.checkStarCondition）。
   * 跟 updateEliteChargeSkill 不同，這個不取代一般追逐/攻擊，是額外疊加
   * 的行為（ice_shaman 該追還是追、該打還是打，只是多一個定期自癒）。 */
  private updateSupportHeal(e: AdventureEnemyInstance, dt: number) {
    let t = this.supportHealTimers.get(e.id)
    if (t === undefined) t = SUPPORT_HEAL_INTERVAL_SEC
    t -= dt
    if (t <= 0) {
      t = SUPPORT_HEAL_INTERVAL_SEC
      if (e.hp < e.maxHp) {
        e.hp = Math.min(e.maxHp, e.hp + Math.round(e.maxHp * SUPPORT_HEAL_PCT))
        this.game.recordSkillHit(`${e.typeId}_heal_cast`)
      }
    }
    this.supportHealTimers.set(e.id, t)
  }

  private updatePlayerAttack(dt: number) {
    if (this.playerAtkTimer > 0) this.playerAtkTimer -= dt
    if (this.playerAtkTimer > 0) return
    const g = this.game
    let nearest: AdventureEnemyInstance | null = null
    let nearestDist = Number.POSITIVE_INFINITY
    for (const e of this.enemies) {
      if (!e.alive) continue
      const d = dist(e.x, e.y, g.player.x, g.player.y)
      const attackDistance = g.player.radius + e.hitRadius + PLAYER_ATTACK_REACH
      if (d <= attackDistance && d <= nearestDist) { nearest = e; nearestDist = d }
    }
    if (!nearest) return
    this.playerAtkTimer = PLAYER_ATTACK_COOLDOWN * g.atkCooldownMult
    g.triggerPlayerAttackAnim()
    this.damageEnemy(nearest, g.heroAtk + g.bonusDamage)
  }

  private damageEnemy(e: AdventureEnemyInstance, amount: number) {
    if (!e.alive) return
    e.hp -= amount
    if (e.hp <= 0) {
      e.alive = false
      e.sprite.destroy()
      e.hpBarBg.destroy()
      e.hpBarFill.destroy()
      this.game.onEnemyKilled(e.typeId)
    }
  }

  private checkWaveProgress() {
    if (!this.activeZone) return
    if (this.enemies.some(e => e.alive)) return
    const { zone, waveIndex } = this.activeZone
    const nextIndex = waveIndex + 1
    if (nextIndex < zone.waves.length) {
      this.activeZone.waveIndex = nextIndex
      this.enemies = []
      this.spawnWave(zone.waves[nextIndex])
      return
    }
    this.finishZone(zone)
  }

  private finishZone(zone: CombatZoneDef) {
    const g = this.game
    this.enemies = []
    this.activeZone = null
    this.eliteLeap.clear()
    this.eliteStationary.clear()
    this.supportHealTimers.clear()
    g.clearedCombatZones.add(zone.id)
    for (const id of zone.gateColliderIds) g.setColliderActive(id, false)
    if (zone.setsFlag) g.flags[zone.setsFlag] = true
    g.pendingGold += zone.rewardGold
    g.pendingHeroExp += zone.rewardExp
    g.state = 'explore'
    g.showToast('戰鬥勝利！')
  }
}
