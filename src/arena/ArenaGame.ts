import { Application, Assets, Graphics, Sprite, Texture } from 'pixi.js'
import { Pool } from './Pool'
import type { ArenaCard } from './cards'
import { ENEMY_TYPES, BOSS_TYPE, BOSS_SPAWN_SEC, pickEnemyType, spawnIntervalSec, maxConcurrentEnemies, type EnemyTypeDef } from './enemies'

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
}

export interface ArenaConfig {
  heroId: string
  heroName: string
  maxHp: number
  atkDamage: number
  atkCooldown: number // 秒/次
  moveSpeed: number    // px/秒
}

interface Projectile {
  gfx: Graphics
  x: number
  y: number
  vx: number
  vy: number
  damage: number
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
const POINTER_DEADZONE = 6
const ARENA_MARGIN = 40
const HUD_EMIT_INTERVAL = 150 // ms，HUD 不用每 frame 更新

export class ArenaGame {
  private app: Application | null = null
  private destroyed = false

  private playerSprite: Sprite | null = null
  private enemyTextures: Record<string, Texture> = {}

  private player = { x: 0, y: 0, hp: 0, maxHp: 0, atkTimer: 0 }
  private enemies: EnemyInstance[] = []
  private enemySpritePool: Pool<Sprite>
  private spawnTimer = 0
  private bossSpawned = false
  private bossState: 'none' | 'alive' | 'defeated' = 'none'
  private killCount = 0
  private gameOver = false

  private pointerActive = false
  private pointerTarget = { x: 0, y: 0 }

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

  constructor(
    cfg: ArenaConfig,
    private onHudChange: (s: ArenaHudState) => void,
    private onLevelUp: () => void,
  ) {
    this.cfg = cfg
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

    app.stage.eventMode = 'static'
    app.stage.hitArea = app.screen
    app.stage.on('pointerdown', e => {
      this.pointerActive = true
      this.pointerTarget = { x: e.global.x, y: e.global.y }
    })
    app.stage.on('pointermove', e => {
      if (this.pointerActive) this.pointerTarget = { x: e.global.x, y: e.global.y }
    })
    app.stage.on('pointerup', () => { this.pointerActive = false })
    app.stage.on('pointerupoutside', () => { this.pointerActive = false })

    const allEnemyTypes = [...ENEMY_TYPES, BOSS_TYPE]
    const [heroTex, ...enemyTexList] = await Promise.all([
      Assets.load(`/assets/frames/heroes/${this.cfg.heroId}/idle_0.png`),
      ...allEnemyTypes.map(t => Assets.load(`/assets/frames/enemies/${t.id}/idle_0.png`)),
    ])
    if (this.destroyed) return
    allEnemyTypes.forEach((t, i) => { this.enemyTextures[t.id] = enemyTexList[i] })

    this.player = { x: app.screen.width / 2, y: app.screen.height / 2, hp: this.cfg.maxHp, maxHp: this.cfg.maxHp, atkTimer: 0 }
    this.pointerTarget = { x: this.player.x, y: this.player.y }

    const playerSprite = new Sprite(heroTex)
    playerSprite.anchor.set(0.5)
    this.setSpriteHeight(playerSprite, 76)
    playerSprite.x = this.player.x
    playerSprite.y = this.player.y
    app.stage.addChild(playerSprite)
    this.playerSprite = playerSprite

    app.ticker.add(ticker => this.update(ticker.deltaMS))
  }

  private setSpriteHeight(sprite: Sprite, targetHeight: number) {
    const scale = targetHeight / sprite.texture.height
    sprite.scale.set(scale)
  }

  private updateSpawning(dt: number) {
    if (!this.app) return

    if (!this.bossSpawned && this.elapsed >= BOSS_SPAWN_SEC) {
      this.bossSpawned = true
      this.bossState = 'alive'
      this.spawnEnemyOfType(BOSS_TYPE)
    }

    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      this.spawnTimer = spawnIntervalSec(this.elapsed)
      if (this.enemies.length < maxConcurrentEnemies(this.elapsed)) {
        this.spawnEnemyOfType(pickEnemyType(this.elapsed))
      }
    }
  }

  private spawnEnemyOfType(type: EnemyTypeDef) {
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
    const hp = Math.round(ENEMY_BASE_HP * type.hpMult * levelMult)

    const sprite = this.enemySpritePool.acquire()
    sprite.texture = tex
    sprite.anchor.set(0.5)
    this.setSpriteHeight(sprite, type.spriteHeight)
    if (type.isBoss) sprite.tint = 0xffb0b0
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
      damage: ENEMY_CONTACT_DAMAGE * type.damageMult,
      contactTimer: 0,
      isBoss: !!type.isBoss,
      alive: true,
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

    this.updatePlayerMovement(dt)
    this.updateSpawning(dt)
    this.updateEnemies(dt)
    this.updateAutoAttack(dt)
    this.updateProjectiles(dt)
    this.updateGems(dt)

    this.hudEmitTimer += deltaMS
    if (this.hudEmitTimer >= HUD_EMIT_INTERVAL) {
      this.hudEmitTimer = 0
      this.emitHud()
    }
  }

  private updatePlayerMovement(dt: number) {
    if (!this.app || !this.playerSprite) return
    const p = this.player
    const dx = this.pointerTarget.x - p.x
    const dy = this.pointerTarget.y - p.y
    const dist = Math.hypot(dx, dy)
    if (this.pointerActive && dist > POINTER_DEADZONE) {
      const step = Math.min(dist, this.cfg.moveSpeed * this.moveSpeedMult * dt)
      p.x += (dx / dist) * step
      p.y += (dy / dist) * step
    }
    const { width, height } = this.app.screen
    p.x = Math.max(ARENA_MARGIN, Math.min(width - ARENA_MARGIN, p.x))
    p.y = Math.max(ARENA_MARGIN, Math.min(height - ARENA_MARGIN, p.y))
    this.playerSprite.x = p.x
    this.playerSprite.y = p.y
  }

  private updateEnemies(dt: number) {
    for (const e of this.enemies) {
      if (!e.alive) continue
      const dx = this.player.x - e.x
      const dy = this.player.y - e.y
      const dist = Math.hypot(dx, dy) || 1
      e.x += (dx / dist) * e.speed * dt
      e.y += (dy / dist) * e.speed * dt
      e.sprite.x = e.x
      e.sprite.y = e.y

      const contactRadius = e.isBoss ? ENEMY_CONTACT_RADIUS * 1.8 : ENEMY_CONTACT_RADIUS
      e.contactTimer -= dt
      if (dist < contactRadius && e.contactTimer <= 0) {
        e.contactTimer = ENEMY_CONTACT_COOLDOWN
        this.player.hp = Math.max(0, this.player.hp - e.damage)
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
  }

  private fireProjectileAt(tx: number, ty: number) {
    if (!this.app) return
    const dx = tx - this.player.x
    const dy = ty - this.player.y
    const dist = Math.hypot(dx, dy) || 1
    const gfx = this.projectilePool.acquire()
    gfx.circle(0, 0, PROJECTILE_RADIUS).fill({ color: 0xffd94a })
    gfx.x = this.player.x
    gfx.y = this.player.y
    if (!gfx.parent) this.app.stage.addChild(gfx)
    this.projectiles.push({
      gfx,
      x: this.player.x,
      y: this.player.y,
      vx: (dx / dist) * PROJECTILE_SPEED,
      vy: (dy / dist) * PROJECTILE_SPEED,
      damage: this.cfg.atkDamage + this.bonusDamage,
      alive: true,
    })
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
        if (!e.alive) continue
        const hitRadius = (e.isBoss ? ENEMY_CONTACT_RADIUS * 1.8 : ENEMY_CONTACT_RADIUS) * 0.6
        const dist = Math.hypot(e.x - p.x, e.y - p.y)
        if (dist < hitRadius) {
          this.damageEnemy(e, p.damage)
          this.killProjectile(p)
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

  private damageEnemy(e: EnemyInstance, amount: number) {
    if (!e.alive) return
    e.hp -= amount
    if (e.hp <= 0) {
      e.alive = false
      e.sprite.visible = false
      this.enemySpritePool.release(e.sprite)
      this.killCount++
      this.spawnGem(e.x, e.y, e.isBoss ? BOSS_GEM_XP_VALUE : GEM_XP_VALUE)
      if (e.isBoss) this.bossState = 'defeated'
    }
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
    this.app?.ticker.start()
  }

  private emitHud() {
    const boss = this.enemies.find(e => e.isBoss && e.alive)
    this.onHudChange({
      hp: this.player.hp,
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
