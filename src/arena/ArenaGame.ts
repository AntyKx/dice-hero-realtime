import { Application, Assets, Graphics, Sprite, Texture } from 'pixi.js'
import { Pool } from './Pool'

export interface ArenaHudState {
  hp: number
  maxHp: number
  xp: number
  xpToNext: number
  level: number
  elapsed: number
  fps: number
}

export interface ArenaConfig {
  heroId: string
  heroName: string
  maxHp: number
  atkDamage: number
  atkCooldown: number // 秒/次
  moveSpeed: number    // px/秒
  enemyId: string
  enemyName: string
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

const PROJECTILE_SPEED = 620
const PROJECTILE_RADIUS = 6
const ENEMY_CONTACT_RADIUS = 34
const ENEMY_CONTACT_DAMAGE = 8
const ENEMY_CONTACT_COOLDOWN = 0.7
const ENEMY_BASE_HP = 30
const ENEMY_BASE_SPEED = 90
const ENEMY_RESPAWN_DELAY = 1.2
const PICKUP_RANGE = 90
const MAGNET_SPEED = 380
const GEM_RADIUS = 7
const GEM_XP_VALUE = 10
const POINTER_DEADZONE = 6
const ARENA_MARGIN = 40
const HUD_EMIT_INTERVAL = 150 // ms，HUD 不用每 frame 更新

export class ArenaGame {
  private app: Application | null = null
  private destroyed = false

  private playerSprite: Sprite | null = null
  private enemySprite: Sprite | null = null
  private enemyTexture: Texture | null = null

  private player = { x: 0, y: 0, hp: 0, maxHp: 0, atkTimer: 0 }
  private enemy: { x: number; y: number; hp: number; maxHp: number; speed: number; contactTimer: number } | null = null
  private respawnTimer = 0

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

  constructor(cfg: ArenaConfig, private onHudChange: (s: ArenaHudState) => void) {
    this.cfg = cfg
    this.projectilePool = new Pool<Graphics>(
      () => new Graphics(),
      g => { g.clear(); g.visible = true },
    )
    this.gemPool = new Pool<Graphics>(
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

    const [heroTex, enemyTex] = await Promise.all([
      Assets.load(`/assets/frames/heroes/${this.cfg.heroId}/idle_0.png`),
      Assets.load(`/assets/frames/enemies/${this.cfg.enemyId}/idle_0.png`),
    ])
    if (this.destroyed) return
    this.enemyTexture = enemyTex

    this.player = { x: app.screen.width / 2, y: app.screen.height / 2, hp: this.cfg.maxHp, maxHp: this.cfg.maxHp, atkTimer: 0 }
    this.pointerTarget = { x: this.player.x, y: this.player.y }

    const playerSprite = new Sprite(heroTex)
    playerSprite.anchor.set(0.5)
    this.setSpriteHeight(playerSprite, 76)
    playerSprite.x = this.player.x
    playerSprite.y = this.player.y
    app.stage.addChild(playerSprite)
    this.playerSprite = playerSprite

    this.spawnEnemy()

    app.ticker.add(ticker => this.update(ticker.deltaMS))
  }

  private setSpriteHeight(sprite: Sprite, targetHeight: number) {
    const scale = targetHeight / sprite.texture.height
    sprite.scale.set(scale)
  }

  private spawnEnemy() {
    if (!this.app || !this.enemyTexture) return
    const { width, height } = this.app.screen
    const edge = Math.floor(Math.random() * 4)
    const pos = edge === 0 ? { x: Math.random() * width, y: -40 }
      : edge === 1 ? { x: width + 40, y: Math.random() * height }
      : edge === 2 ? { x: Math.random() * width, y: height + 40 }
      : { x: -40, y: Math.random() * height }

    const level = Math.max(1, this.level)
    const hp = Math.round(ENEMY_BASE_HP * (1 + (level - 1) * 0.18))
    this.enemy = { x: pos.x, y: pos.y, hp, maxHp: hp, speed: ENEMY_BASE_SPEED, contactTimer: 0 }

    if (!this.enemySprite) {
      const sprite = new Sprite(this.enemyTexture)
      sprite.anchor.set(0.5)
      this.setSpriteHeight(sprite, 70)
      this.app.stage.addChild(sprite)
      this.enemySprite = sprite
    }
    this.enemySprite.visible = true
    this.enemySprite.x = pos.x
    this.enemySprite.y = pos.y
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
    this.updateEnemy(dt)
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
      const step = Math.min(dist, this.cfg.moveSpeed * dt)
      p.x += (dx / dist) * step
      p.y += (dy / dist) * step
    }
    const { width, height } = this.app.screen
    p.x = Math.max(ARENA_MARGIN, Math.min(width - ARENA_MARGIN, p.x))
    p.y = Math.max(ARENA_MARGIN, Math.min(height - ARENA_MARGIN, p.y))
    this.playerSprite.x = p.x
    this.playerSprite.y = p.y
  }

  private updateEnemy(dt: number) {
    const e = this.enemy
    if (!e) {
      this.respawnTimer -= dt
      if (this.respawnTimer <= 0) this.spawnEnemy()
      return
    }
    const dx = this.player.x - e.x
    const dy = this.player.y - e.y
    const dist = Math.hypot(dx, dy) || 1
    e.x += (dx / dist) * e.speed * dt
    e.y += (dy / dist) * e.speed * dt
    if (this.enemySprite) { this.enemySprite.x = e.x; this.enemySprite.y = e.y }

    e.contactTimer -= dt
    if (dist < ENEMY_CONTACT_RADIUS && e.contactTimer <= 0) {
      e.contactTimer = ENEMY_CONTACT_COOLDOWN
      this.player.hp = Math.max(0, this.player.hp - ENEMY_CONTACT_DAMAGE)
    }
  }

  private updateAutoAttack(dt: number) {
    if (!this.enemy) return
    this.player.atkTimer -= dt
    if (this.player.atkTimer > 0) return
    this.player.atkTimer = this.cfg.atkCooldown
    this.fireProjectileAt(this.enemy.x, this.enemy.y)
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
      damage: this.cfg.atkDamage,
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
      if (this.enemy) {
        const dist = Math.hypot(this.enemy.x - p.x, this.enemy.y - p.y)
        if (dist < ENEMY_CONTACT_RADIUS * 0.6) {
          this.damageEnemy(p.damage)
          this.killProjectile(p)
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

  private damageEnemy(amount: number) {
    const e = this.enemy
    if (!e) return
    e.hp -= amount
    if (e.hp <= 0) {
      this.spawnGem(e.x, e.y)
      this.enemy = null
      if (this.enemySprite) this.enemySprite.visible = false
      this.respawnTimer = ENEMY_RESPAWN_DELAY
    }
  }

  private spawnGem(x: number, y: number) {
    if (!this.app) return
    const gfx = this.gemPool.acquire()
    gfx.circle(0, 0, GEM_RADIUS).fill({ color: 0x4ade80 })
    gfx.x = x
    gfx.y = y
    if (!gfx.parent) this.app.stage.addChild(gfx)
    this.gems.push({ gfx, x, y, value: GEM_XP_VALUE, alive: true })
  }

  private updateGems(dt: number) {
    for (const g of this.gems) {
      if (!g.alive) continue
      const dx = this.player.x - g.x
      const dy = this.player.y - g.y
      const dist = Math.hypot(dx, dy)
      if (dist < PICKUP_RANGE) {
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
    const needed = this.xpToNext()
    if (this.xp >= needed) {
      this.xp -= needed
      this.level++
    }
  }

  private xpToNext(): number {
    return 40 + (this.level - 1) * 20
  }

  private emitHud() {
    this.onHudChange({
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      xp: this.xp,
      xpToNext: this.xpToNext(),
      level: this.level,
      elapsed: this.elapsed,
      fps: this.fps,
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
