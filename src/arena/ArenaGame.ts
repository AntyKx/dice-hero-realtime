import { Application, Assets, Graphics, Sprite, Text, Texture } from 'pixi.js'
import { Pool } from './Pool'
import type { ArenaCard } from './cards'
import { getCampaignEnemyPool, getCampaignBoss, pickEnemyType, type EnemyTypeDef } from './enemies'
import { pickRelicChoices, type ArenaRelic } from './relics'
import { generateArenaDungeon, type ArenaZoneNode, type ArenaZoneType } from './dungeonZones'

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
}

export interface ArenaConfig {
  heroId: string
  heroName: string
  maxHp: number
  atkDamage: number
  atkCooldown: number // 秒/次
  moveSpeed: number    // px/秒
  pickupRangeMult?: number  // 天賦帶來的起始拾取範圍倍率，預設 1（PICKUP_RANGE 是內部常數，只能靠這個 config 種初始值）
  keystoneUnlocked?: boolean // 天賦樹的職業技能節點是否已點亮，決定 updateKeystone() 是否生效
  campaign?: string // 篇章（main/ash_kingdom/rift_omen/deep_sea），決定敵人池/Boss，預設 main
  stars?: number // 英雄星等（0-3），決定要載入 frames/heroes/{heroId}/s{stars}/ 底下哪一套貼圖，預設 0
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
}

interface Gem {
  gfx: Graphics
  x: number
  y: number
  value: number
  alive: boolean
}

interface EnemyInstance {
  sprite: Sprite
  x: number
  y: number
  hp: number
  maxHp: number
  speed: number
  damage: number
  contactTimer: number
  isBoss: boolean
  isElite: boolean
  alive: boolean
  // 職業技能專用的每敵人狀態（只有對應英雄的技能會用到，其他英雄永遠是 0）
  frostStacks: number   // 皇家公主：冰痕層數，滿5層觸發凍結
  frozenTimer: number   // 皇家公主：凍結剩餘秒數，>0 時敵人不移動
  armorBreakStacks: number // 矮人戰士：破甲層數（最多3），damageEnemy() 依此加傷
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
const ENEMY_CONTACT_RADIUS = 34
const ENEMY_CONTACT_DAMAGE = 8
const ENEMY_CONTACT_COOLDOWN = 0.7
const ENEMY_BASE_HP = 30
const ENEMY_BASE_SPEED = 90
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

const ELITE_HP_MULT = 2.2
const ELITE_DAMAGE_MULT = 1.6
const ELITE_TINT = 0xd080ff

const ULTIMATE_MAX = 100
const ULTIMATE_RADIUS = 220
const ULTIMATE_DAMAGE = 80
const ULTIMATE_CHARGE_NORMAL = 8
const ULTIMATE_CHARGE_ELITE = 20
const ULTIMATE_CHARGE_BOSS = 40

const ALTAR_TRIGGER_RADIUS = 55
const ALTAR_HEAL_PCT = 0.3
const DOOR_RADIUS = 42
const HIDDEN_GOLD_MIN = 50
const HIDDEN_GOLD_MAX = 120

// 戰鬥場景背景圖（2026-08 加入）：依篇章對應美術主題，每個主題 3 張變化，
// 每次換區隨機挑一張。裂隙前兆/深海遺城目前沒有專屬美術，先借用雪原場景。
const CAMPAIGN_BG_THEME: Record<string, string> = {
  main: 'forest', ash_kingdom: 'castle', rift_omen: 'snowfield', deep_sea: 'snowfield',
}
const BG_VARIANTS_PER_THEME = 3

export class ArenaGame {
  private app: Application | null = null
  private destroyed = false

  private playerSprite: Sprite | null = null
  private enemyTextures: Record<string, Texture> = {}
  private bgSprite: Sprite | null = null
  private bgTextures: Texture[] = []

  private player = { x: 0, y: 0, hp: 0, maxHp: 0, atkTimer: 0 }
  private moveDir = { x: 0, y: 0 } // -1~1 連續值，類比搖桿輸入，取代舊的拖曳移動
  private facing = { x: 0, y: 1 }  // 最後移動方向，先只記錄，鋪路給之後的方向性走路動畫

  private enemies: EnemyInstance[] = []
  private enemySpritePool: Pool<Sprite>
  private campaign = 'main' // 決定敵人池/Boss，見 src/arena/enemies.ts 的 CAMPAIGN_ENEMY_POOLS
  private bossState: 'none' | 'alive' | 'defeated' = 'none'
  private killCount = 0
  private gameOver = false

  private projectiles: Projectile[] = []
  private projectilePool: Pool<Graphics>
  private gems: Gem[] = []
  private gemPool: Pool<Graphics>

  private xp = 0
  private level = 1
  private elapsed = 0
  private fpsAccum = 0
  private fpsFrames = 0
  private fps = 0
  private hudEmitTimer = 0

  private cfg: ArenaConfig

  // 升級卡疊加的即時屬性加成，套用點見 applyCard()
  private bonusDamage = 0
  private atkCooldownMult = 1
  private moveSpeedMult = 1
  private pickupRangeMult = 1

  // Boss 戰利品（遺物）疊加的機制，套用點見 applyRelic()
  private ownedRelicIds: string[] = []
  private pierceBonus = 0
  private extraProjectiles = 0
  private lifestealPct = 0
  private thornsPct = 0
  private hpRegenPctPerSec = 0
  private shieldIntervalSec = 0
  private shieldTimer = 0
  private shieldCharges = 0

  // ── 關卡分區（M3.6）──────────────────────────────────────────────────
  private dungeon: ArenaZoneNode[] = []
  private currentNodeId = 0
  private currentZoneType: ArenaZoneType = 'battle'
  private zoneEnemiesRemaining = 0
  private pendingZoneCardTrigger = false
  private doors: Door[] = []
  private altarGfx: Graphics | null = null
  private altarPos: { x: number; y: number } | null = null
  private altarTriggered = false
  private bonusGold = 0
  private runComplete = false

  // ── 必殺技（擊殺充能）────────────────────────────────────────────────
  private ultimateCharge = 0

  // ── 天賦樹職業技能（11個英雄各自一種，依 cfg.heroId 分派見 updateKeystone）──
  private keystoneUnlocked = false
  private keystoneTimer = 0     // 週期觸發類共用（聖騎士/火焰法師/神官祭司/遊俠獵人）
  private keystoneBuffTimer = 0 // 聖騎士：減傷buff剩餘時間
  private keystoneStacks = 0    // 武鬥家：擊殺氣勢層數
  private keystoneNextAtkBonus = false // 武鬥家：氣勢滿了，下次攻擊加成待觸發

  // ── 飄字/光效（祭壇、必殺技、隱藏獎勵共用）──────────────────────────
  private floatingTexts: FloatingText[] = []
  private textPool: Pool<Text>
  private glows: GlowBurst[] = []
  private glowPool: Pool<Graphics>

  constructor(
    cfg: ArenaConfig,
    private onHudChange: (s: ArenaHudState) => void,
    private onLevelUp: () => void,
    private onBossLoot: (choices: ArenaRelic[]) => void,
  ) {
    this.cfg = cfg
    this.pickupRangeMult = cfg.pickupRangeMult ?? 1
    this.keystoneUnlocked = !!cfg.keystoneUnlocked
    this.campaign = cfg.campaign ?? 'main'
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

    const allEnemyTypes = [...getCampaignEnemyPool(this.campaign), getCampaignBoss(this.campaign)]
    const bgTheme = CAMPAIGN_BG_THEME[this.campaign] ?? 'forest'
    const bgPaths = Array.from({ length: BG_VARIANTS_PER_THEME }, (_, i) => `/assets/backgrounds/${bgTheme}_${i + 1}.jpg`)
    const heroStars = Math.min(3, Math.max(0, this.cfg.stars ?? 0))
    const [heroTex, bgTexList, ...enemyTexList] = await Promise.all([
      Assets.load(`/assets/frames/heroes/${this.cfg.heroId}/s${heroStars}/idle_0.png`),
      Promise.all(bgPaths.map(p => Assets.load(p))),
      ...allEnemyTypes.map(t => Assets.load(`/assets/frames/enemies/${t.id}/idle_0.png`)),
    ])
    if (this.destroyed) return
    allEnemyTypes.forEach((t, i) => { this.enemyTextures[t.id] = enemyTexList[i] })
    this.bgTextures = bgTexList

    const bgSprite = new Sprite(this.bgTextures[0])
    bgSprite.anchor.set(0.5)
    app.stage.addChild(bgSprite)
    this.bgSprite = bgSprite
    this.layoutBackground()

    this.player = { x: app.screen.width / 2, y: app.screen.height - ARENA_MARGIN - 40, hp: this.cfg.maxHp, maxHp: this.cfg.maxHp, atkTimer: 0 }

    const playerSprite = new Sprite(heroTex)
    playerSprite.anchor.set(0.5)
    this.setSpriteHeight(playerSprite, 76)
    playerSprite.x = this.player.x
    playerSprite.y = this.player.y
    app.stage.addChild(playerSprite)
    this.playerSprite = playerSprite

    this.dungeon = generateArenaDungeon()
    this.enterZone(this.dungeon[0].id)

    app.ticker.add(ticker => this.update(ticker.deltaMS))
  }

  private setSpriteHeight(sprite: Sprite, targetHeight: number) {
    const scale = targetHeight / sprite.texture.height
    sprite.scale.set(scale)
  }

  /** 背景圖鋪滿整個畫面（等同 CSS background-size:cover），置中裁切多餘部分。 */
  private layoutBackground() {
    if (!this.app || !this.bgSprite) return
    const { width, height } = this.app.screen
    const tex = this.bgSprite.texture
    const scale = Math.max(width / tex.width, height / tex.height)
    this.bgSprite.scale.set(scale)
    this.bgSprite.x = width / 2
    this.bgSprite.y = height / 2
  }

  /** 換區時隨機挑一張同主題的背景變化圖，換個場景感覺。 */
  private randomizeBackground() {
    if (!this.bgSprite || this.bgTextures.length === 0) return
    this.bgSprite.texture = this.bgTextures[Math.floor(Math.random() * this.bgTextures.length)]
    this.layoutBackground()
  }

  private getZoneNode(id: number): ArenaZoneNode | undefined {
    return this.dungeon.find(n => n.id === id)
  }

  /** 進入指定節點：依類型生怪/放祭壇/觸發三選一/發獎勵。 */
  private enterZone(nodeId: number) {
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
        this.spawnEnemyOfType(getCampaignBoss(this.campaign))
        break
      }
    }
  }

  /** 目前這區的條件達成（怪清光/摸到祭壇/選完卡），開門讓玩家走向下一區。 */
  private completeZone() {
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

  private clearDoors() {
    this.doors.forEach(d => d.gfx.destroy())
    this.doors = []
  }

  private updateDoors() {
    if (this.doors.length === 0) return
    for (const d of this.doors) {
      const dist = Math.hypot(this.player.x - d.x, this.player.y - d.y)
      if (dist < DOOR_RADIUS) {
        const targetId = d.targetNodeId
        this.clearDoors()
        // 清掉走位過程中可能殘留的敵人/掉落物，乾淨進下一區
        this.enemies.forEach(e => { e.sprite.visible = false; this.enemySpritePool.release(e.sprite) })
        this.enemies = []
        if (!this.app) return
        this.player.x = this.app.screen.width / 2
        this.player.y = this.app.screen.height - ARENA_MARGIN - 40
        if (this.playerSprite) { this.playerSprite.x = this.player.x; this.playerSprite.y = this.player.y }
        this.enterZone(targetId)
        return
      }
    }
  }

  private updateAltar() {
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

  private spawnEnemyOfType(type: EnemyTypeDef, opts?: { isElite?: boolean }) {
    if (!this.app) return
    const tex = this.enemyTextures[type.id]
    if (!tex) return
    const { width, height } = this.app.screen
    const edge = Math.floor(Math.random() * 4)
    const pos = edge === 0 ? { x: Math.random() * width, y: -40 }
      : edge === 1 ? { x: width + 40, y: Math.random() * height }
      : edge === 2 ? { x: Math.random() * width, y: height + 40 }
      : { x: -40, y: Math.random() * height }

    const levelMult = 1 + (Math.max(1, this.level) - 1) * 0.18
    const isElite = !!opts?.isElite
    const eliteMult = isElite ? ELITE_HP_MULT : 1
    const hp = Math.round(ENEMY_BASE_HP * type.hpMult * levelMult * eliteMult)

    const sprite = this.enemySpritePool.acquire()
    sprite.texture = tex
    sprite.anchor.set(0.5)
    this.setSpriteHeight(sprite, type.spriteHeight)
    if (type.isBoss) sprite.tint = 0xffb0b0
    else if (isElite) sprite.tint = ELITE_TINT
    sprite.x = pos.x
    sprite.y = pos.y
    if (!sprite.parent) this.app.stage.addChild(sprite)

    this.enemies.push({
      sprite,
      x: pos.x,
      y: pos.y,
      hp,
      maxHp: hp,
      speed: ENEMY_BASE_SPEED * type.speedMult,
      damage: ENEMY_CONTACT_DAMAGE * type.damageMult * (isElite ? ELITE_DAMAGE_MULT : 1),
      contactTimer: 0,
      isBoss: !!type.isBoss,
      isElite,
      alive: true,
      frostStacks: 0,
      frozenTimer: 0,
      armorBreakStacks: 0,
    })
  }

  private update(deltaMS: number) {
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

    this.updatePassives(dt)
    this.updateKeystone(dt)
    this.updatePlayerMovement(dt)
    this.updateEnemies(dt)
    this.updateAutoAttack(dt)
    this.updateProjectiles(dt)
    this.updateGems(dt)
    this.updateAltar()
    this.updateDoors()
    this.updateFloatingTexts(dt)
    this.updateGlows(dt)

    this.hudEmitTimer += deltaMS
    if (this.hudEmitTimer >= HUD_EMIT_INTERVAL) {
      this.hudEmitTimer = 0
      this.emitHud()
    }
  }

  /** 遺物的持續性效果：護盾充能、生命回復。 */
  private updatePassives(dt: number) {
    if (this.player.hp <= 0) return
    if (this.hpRegenPctPerSec > 0) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * this.hpRegenPctPerSec * dt)
    }
    if (this.shieldIntervalSec > 0) {
      this.shieldTimer += dt
      if (this.shieldTimer >= this.shieldIntervalSec) {
        this.shieldTimer -= this.shieldIntervalSec
        this.shieldCharges = Math.min(1, this.shieldCharges + 1)
      }
    }
  }

  /**
   * 天賦樹職業技能（11個英雄各一種，見 src/arena/arenaTalents.ts 的
   * KEYSTONE_INFO）。只處理「週期觸發類」（聖騎士/火焰法師/神官祭司/
   * 遊俠獵人）跟 buff 倒數；機率觸發類掛在 fireProjectileAt/updateAutoAttack，
   * 疊層類掛在 damageEnemy/updateProjectiles，受擊反應類掛在 updateEnemies。
   */
  private updateKeystone(dt: number) {
    if (this.keystoneBuffTimer > 0) this.keystoneBuffTimer -= dt

    if (!this.keystoneUnlocked || this.player.hp <= 0) return
    const heroId = this.cfg.heroId
    const PERIODIC_INTERVAL: Record<string, number> = { knight: 20, mage: 8, priest: 10, archer: 12 }
    const interval = PERIODIC_INTERVAL[heroId]
    if (!interval) return
    this.keystoneTimer += dt
    if (this.keystoneTimer < interval) return
    this.keystoneTimer -= interval

    switch (heroId) {
      case 'knight':
        this.keystoneBuffTimer = 3
        this.spawnGlowBurst(this.player.x, this.player.y, 0x6db8ff, 140)
        this.spawnFloatingText('嘲諷！', this.player.x, this.player.y - 40)
        break
      case 'mage': {
        const target = this.findNearestEnemy()
        if (target) {
          this.damageEnemy(target, 60)
          this.spawnGlowBurst(target.x, target.y, 0xff6a3c, 70)
        }
        break
      }
      case 'priest':
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.1)
        this.spawnGlowBurst(this.player.x, this.player.y, 0x8ad4ff, 60)
        break
      case 'archer':
        for (const e of this.enemies) {
          if (e.alive && Math.hypot(e.x - this.player.x, e.y - this.player.y) <= 260) this.damageEnemy(e, 40)
        }
        this.spawnGlowBurst(this.player.x, this.player.y, 0xffd94a, 260)
        break
    }
  }

  /** 類比搖桿輸入（-1~1 連續值，非固定8方向），取代舊的拖曳移動。由 React 端的虛擬搖桿呼叫。 */
  setMoveDir(dx: number, dy: number): void {
    this.moveDir = { x: dx, y: dy }
  }

  private updatePlayerMovement(dt: number) {
    if (!this.app || !this.playerSprite) return
    const p = this.player
    const { x: dx, y: dy } = this.moveDir
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy) || 1
      const speed = this.cfg.moveSpeed * this.moveSpeedMult
      p.x += (dx / len) * speed * dt
      p.y += (dy / len) * speed * dt
      this.facing = { x: dx / len, y: dy / len }
    }
    const { width, height } = this.app.screen
    p.x = Math.max(ARENA_MARGIN, Math.min(width - ARENA_MARGIN, p.x))
    p.y = Math.max(ARENA_TOP_MARGIN, Math.min(height - ARENA_MARGIN, p.y))
    this.playerSprite.x = p.x
    this.playerSprite.y = p.y
  }

  private updateEnemies(dt: number) {
    const isBeastmaster = this.keystoneUnlocked && this.cfg.heroId === 'beastmaster'
    for (const e of this.enemies) {
      if (!e.alive) continue

      // 皇家公主天賦技能：凍結中的敵人原地不動、不計時解除
      if (e.frozenTimer > 0) {
        e.frozenTimer -= dt
      } else {
        const dx = this.player.x - e.x
        const dy = this.player.y - e.y
        const dist = Math.hypot(dx, dy) || 1
        e.x += (dx / dist) * e.speed * dt
        e.y += (dy / dist) * e.speed * dt
      }
      e.sprite.x = e.x
      e.sprite.y = e.y

      const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y)
      const contactRadius = e.isBoss ? ENEMY_CONTACT_RADIUS * 1.8 : ENEMY_CONTACT_RADIUS
      e.contactTimer -= dt
      if (dist < contactRadius && e.contactTimer <= 0) {
        e.contactTimer = ENEMY_CONTACT_COOLDOWN
        // 聖騎士天賦技能：buff 期間內受到的接觸傷害減半
        const incoming = this.keystoneBuffTimer > 0 ? e.damage * 0.5 : e.damage
        if (this.shieldCharges > 0) {
          this.shieldCharges--
        } else {
          this.player.hp = Math.max(0, this.player.hp - incoming)
        }
        if (this.thornsPct > 0) this.damageEnemy(e, e.damage * this.thornsPct)
        // 獸語馴獸師天賦技能：受擊 30% 機率反擊
        if (isBeastmaster && Math.random() < 0.3) this.damageEnemy(e, this.cfg.atkDamage + this.bonusDamage)
        if (this.player.hp <= 0) { this.triggerGameOver(); return }
      }
    }
    if (this.enemies.some(e => !e.alive)) {
      this.enemies = this.enemies.filter(e => e.alive)
    }
  }

  private triggerGameOver() {
    if (this.gameOver) return
    this.gameOver = true
    this.emitHud()
    this.app?.ticker.stop()
  }

  private findNearestEnemy(): EnemyInstance | null {
    let best: EnemyInstance | null = null
    let bestDist = Infinity
    for (const e of this.enemies) {
      if (!e.alive) continue
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y)
      if (d < bestDist) { bestDist = d; best = e }
    }
    return best
  }

  private updateAutoAttack(dt: number) {
    if (this.enemies.length === 0) return
    this.player.atkTimer -= dt
    if (this.player.atkTimer > 0) return
    const target = this.findNearestEnemy()
    if (!target) return
    this.player.atkTimer = this.cfg.atkCooldown * this.atkCooldownMult
    this.fireProjectileAt(target.x, target.y)

    if (this.keystoneUnlocked) {
      // 影刃刺客天賦技能：20% 機率追加 2 次攻擊
      if (this.cfg.heroId === 'rogue' && Math.random() < 0.2) {
        this.fireProjectileAt(target.x, target.y)
        this.fireProjectileAt(target.x, target.y)
      }
      // 機關技師天賦技能：25% 機率額外發射一枚砲彈
      if (this.cfg.heroId === 'engineer' && Math.random() < 0.25) {
        this.fireProjectileAt(target.x, target.y)
      }
    }
  }

  private fireProjectileAt(tx: number, ty: number) {
    if (!this.app) return
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
    }
    for (let i = 0; i < shots; i++) {
      // 多發時左右扇形展開，單發時角度不變
      const spread = shots > 1 ? (i - (shots - 1) / 2) * 0.18 : 0
      const angle = baseAngle + spread
      const gfx = this.projectilePool.acquire()
      gfx.circle(0, 0, PROJECTILE_RADIUS).fill({ color: 0xffd94a })
      gfx.x = this.player.x
      gfx.y = this.player.y
      if (!gfx.parent) this.app.stage.addChild(gfx)
      this.projectiles.push({
        gfx,
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle) * PROJECTILE_SPEED,
        vy: Math.sin(angle) * PROJECTILE_SPEED,
        damage: (this.cfg.atkDamage + this.bonusDamage) * dmgMult,
        pierceLeft: this.pierceBonus,
        hit: new Set(),
        alive: true,
      })
    }
  }

  private updateProjectiles(dt: number) {
    if (!this.app) return
    const { width, height } = this.app.screen
    for (const p of this.projectiles) {
      if (!p.alive) continue
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.gfx.x = p.x
      p.gfx.y = p.y

      if (p.x < -20 || p.x > width + 20 || p.y < -20 || p.y > height + 20) {
        this.killProjectile(p)
        continue
      }
      for (const e of this.enemies) {
        if (!e.alive || p.hit.has(e)) continue
        const hitRadius = (e.isBoss ? ENEMY_CONTACT_RADIUS * 1.8 : ENEMY_CONTACT_RADIUS) * 0.6
        const dist = Math.hypot(e.x - p.x, e.y - p.y)
        if (dist < hitRadius) {
          this.onAttackHit(e)
          this.damageEnemy(e, p.damage)
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

  private killProjectile(p: Projectile) {
    p.alive = false
    p.gfx.visible = false
    this.projectilePool.release(p.gfx)
  }

  /** 矮人戰士天賦技能：破甲層數在傷害結算時生效，攻擊命中時另外呼叫 onAttackHit() 疊層。 */
  private damageEnemy(e: EnemyInstance, amount: number) {
    if (!e.alive) return
    if (e.armorBreakStacks > 0) amount *= 1 + 0.1 * e.armorBreakStacks
    e.hp -= amount
    if (e.hp <= 0) {
      e.alive = false
      e.sprite.visible = false
      this.enemySpritePool.release(e.sprite)
      this.killCount++
      this.ultimateCharge = Math.min(ULTIMATE_MAX, this.ultimateCharge +
        (e.isBoss ? ULTIMATE_CHARGE_BOSS : e.isElite ? ULTIMATE_CHARGE_ELITE : ULTIMATE_CHARGE_NORMAL))
      this.spawnGem(e.x, e.y, e.isBoss ? BOSS_GEM_XP_VALUE : GEM_XP_VALUE)
      // 武鬥家天賦技能：擊殺疊氣勢，滿5層下次攻擊 200% 傷害
      if (this.keystoneUnlocked && this.cfg.heroId === 'fighter') {
        this.keystoneStacks++
        if (this.keystoneStacks >= 5) { this.keystoneStacks = 0; this.keystoneNextAtkBonus = true }
      }
      if (e.isBoss) {
        this.bossState = 'defeated'
        this.pauseForBossLoot()
      } else if (this.currentZoneType === 'battle' || this.currentZoneType === 'elite') {
        this.zoneEnemiesRemaining--
        if (this.zoneEnemiesRemaining <= 0) this.completeZone()
      }
    }
  }

  /**
   * 攻擊命中（尚未結算傷害）時的職業技能疊層/機率效果：皇家公主冰痕、
   * 矮人戰士破甲、吟遊詩人命中回血。跟傷害本身（damageEnemy）分開，
   * 因為這些是「命中就觸發」，不是「造成傷害才觸發」。
   */
  private onAttackHit(e: EnemyInstance) {
    if (!this.keystoneUnlocked) return
    switch (this.cfg.heroId) {
      case 'princess':
        e.frostStacks++
        if (e.frostStacks >= 5) { e.frostStacks = 0; e.frozenTimer = 2 }
        break
      case 'dwarf':
        e.armorBreakStacks = Math.min(3, e.armorBreakStacks + 1)
        break
      case 'bard':
        if (Math.random() < 0.25) this.player.hp = Math.min(this.player.maxHp, this.player.hp + 5)
        break
    }
  }

  private pauseForBossLoot() {
    this.app?.ticker.stop()
    this.onBossLoot(pickRelicChoices(this.ownedRelicIds, 3))
  }

  /** 套用玩家在 RelicLootOverlay 選的遺物。Boss 永遠是最後一區，選完就代表整局結束。 */
  applyRelic(relic: ArenaRelic): void {
    const e = relic.effect
    if (e.pierceBonus) this.pierceBonus += e.pierceBonus
    if (e.extraProjectiles) this.extraProjectiles += e.extraProjectiles
    if (e.lifestealPct) this.lifestealPct += e.lifestealPct
    if (e.thornsPct) this.thornsPct += e.thornsPct
    if (e.hpRegenPctPerSec) this.hpRegenPctPerSec += e.hpRegenPctPerSec
    if (e.shieldIntervalSec) this.shieldIntervalSec = this.shieldIntervalSec > 0
      ? Math.min(this.shieldIntervalSec, e.shieldIntervalSec)
      : e.shieldIntervalSec
    this.ownedRelicIds.push(relic.id)
    this.runComplete = true
    this.emitHud()
    // 故意不 ticker.start()：Boss 是這局最後一區，選完遺物就直接停在結算畫面。
  }

  /** 必殺技：擊殺累積能量，滿了才能發動。v1 先做簡單雛型——範圍爆炸傷害。 */
  tryActivateUltimate(): void {
    if (this.gameOver || this.runComplete) return
    if (this.ultimateCharge < ULTIMATE_MAX) return
    for (const e of this.enemies) {
      if (!e.alive) continue
      const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y)
      if (dist <= ULTIMATE_RADIUS) this.damageEnemy(e, ULTIMATE_DAMAGE)
    }
    this.ultimateCharge = 0
    this.spawnGlowBurst(this.player.x, this.player.y, 0xff8a3c, ULTIMATE_RADIUS)
    this.emitHud()
  }

  private spawnGem(x: number, y: number, value: number) {
    if (!this.app) return
    const gfx = this.gemPool.acquire()
    gfx.circle(0, 0, GEM_RADIUS).fill({ color: 0x4ade80 })
    gfx.x = x
    gfx.y = y
    if (!gfx.parent) this.app.stage.addChild(gfx)
    this.gems.push({ gfx, x, y, value, alive: true })
  }

  private updateGems(dt: number) {
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

  private gainXp(amount: number) {
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

  private xpToNext(): number {
    return 40 + (this.level - 1) * 20
  }

  private pauseForLevelUp() {
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

  private spawnFloatingText(text: string, x: number, y: number) {
    if (!this.app) return
    const obj = this.textPool.acquire()
    obj.text = text
    obj.anchor.set(0.5)
    obj.x = x
    obj.y = y
    if (!obj.parent) this.app.stage.addChild(obj)
    this.floatingTexts.push({ obj, vy: -30, life: 0, maxLife: 1.6, alive: true })
  }

  private updateFloatingTexts(dt: number) {
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

  private spawnGlowBurst(x: number, y: number, color: number, radius: number) {
    if (!this.app) return
    const gfx = this.glowPool.acquire()
    gfx.circle(0, 0, radius).stroke({ color, width: 4, alpha: 0.9 })
    gfx.x = x
    gfx.y = y
    gfx.scale.set(0.4)
    if (!gfx.parent) this.app.stage.addChild(gfx)
    this.glows.push({ gfx, life: 0, maxLife: 0.5, alive: true })
  }

  private updateGlows(dt: number) {
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

  private emitHud() {
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
