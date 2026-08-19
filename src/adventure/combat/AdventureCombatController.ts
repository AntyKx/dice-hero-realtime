import { Graphics, Sprite } from 'pixi.js'
import type { AdventureGame } from '../AdventureGame'
import type { CombatZoneDef } from '../adventureTypes'
import { setSpriteHeight } from '../../arena/heroSpriteRig'
import { dist, pointInRect } from '../geometry'

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
const ENEMY_ATTACK_RANGE = 32
const ENEMY_ATTACK_COOLDOWN = 1.1
const PLAYER_ATTACK_RANGE = 46
const PLAYER_ATTACK_COOLDOWN = 0.55

export interface AdventureEnemyInstance {
  id: string
  typeId: string
  x: number
  y: number
  hp: number
  maxHp: number
  alive: boolean
  atkTimer: number
  sprite: Sprite
  hpBarBg: Graphics
  hpBarFill: Graphics
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

  constructor(private game: AdventureGame) {}

  /** 每幀檢查玩家是否走進尚未觸發的戰鬤區域（跟舊 exploreWorld 的
   * battleZone 判定同款手感：走進去才開打，不是一進關卡就打）。 */
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
      return
    }
    this.updateEnemies(dt)
    this.updatePlayerAttack(dt)
    this.checkWaveProgress()
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
        this.spawnHostileEnemy(w.enemyId, x, y)
      }
    }
  }

  /** 任務擊殺目標（QuestSystem）跟正式戰鬤區共用同一套敵人生成/AI/傷害，
   * 不需要另外走一套機制——差別只在誰呼叫、生完之後不進 combat 狀態機。 */
  spawnHostileEnemy(enemyId: string, x: number, y: number) {
    const g = this.game
    const type = g.enemyTypeDefs[enemyId]
    if (!type) return
    // 花圃小怪這類有正式靜態立繪的敵人優先用那張圖（單張插畫，沒有逐幀
    // 動畫）；其餘敵人維持原本的 frameLoader 逐幀動畫。
    const staticTex = g.getEnemyStaticTexture(type.id)
    const frames = g.enemyFrames[type.placeholderSpriteId ?? type.id]
    const tex = staticTex ?? frames?.idle[0]
    const sprite = tex ? new Sprite(tex) : new Sprite()
    sprite.anchor.set(0.5, 1)
    if (tex) setSpriteHeight(sprite, staticTex ? Math.round(type.spriteHeight * 0.6) : type.spriteHeight)
    sprite.x = x
    sprite.y = y
    sprite.zIndex = y
    g.worldLayer.addChild(sprite)

    const hpBarBg = new Graphics().rect(-16, -type.spriteHeight - 10, 32, 4).fill({ color: 0x1a1a1a, alpha: 0.8 })
    const hpBarFill = new Graphics().rect(-16, -type.spriteHeight - 10, 32, 4).fill({ color: 0xe05050 })
    hpBarBg.x = x; hpBarBg.y = y
    hpBarFill.x = x; hpBarFill.y = y
    g.worldLayer.addChild(hpBarBg)
    g.worldLayer.addChild(hpBarFill)

    const maxHp = Math.round(BASE_ENEMY_HP * type.hpMult)
    this.enemies.push({
      id: `ae_${nextEnemyInstanceId++}`, typeId: type.id, x, y, hp: maxHp, maxHp,
      alive: true, atkTimer: Math.random() * ENEMY_ATTACK_COOLDOWN, sprite, hpBarBg, hpBarFill,
    })
  }

  private updateEnemies(dt: number) {
    const g = this.game
    for (const e of this.enemies) {
      if (!e.alive) continue
      const type = g.enemyTypeDefs[e.typeId]
      const d = dist(e.x, e.y, g.player.x, g.player.y)
      if (d > ENEMY_ATTACK_RANGE) {
        const speed = ENEMY_SPEED * (type?.speedMult ?? 1)
        const dx = (g.player.x - e.x) / (d || 1)
        const dy = (g.player.y - e.y) / (d || 1)
        e.x += dx * speed * dt
        e.y += dy * speed * dt
      } else {
        e.atkTimer -= dt
        if (e.atkTimer <= 0) {
          e.atkTimer = ENEMY_ATTACK_COOLDOWN
          g.damagePlayer(Math.round(BASE_ENEMY_DAMAGE * (type?.damageMult ?? 1)))
        }
      }
      e.sprite.x = e.x; e.sprite.y = e.y; e.sprite.zIndex = e.y
      e.hpBarBg.x = e.x; e.hpBarBg.y = e.y; e.hpBarBg.zIndex = e.y
      e.hpBarFill.x = e.x; e.hpBarFill.y = e.y; e.hpBarFill.zIndex = e.y + 0.1
      const pct = Math.max(0, e.hp / e.maxHp)
      e.hpBarFill.scale.x = pct
    }
  }

  private updatePlayerAttack(dt: number) {
    if (this.playerAtkTimer > 0) this.playerAtkTimer -= dt
    if (this.playerAtkTimer > 0) return
    const g = this.game
    let nearest: AdventureEnemyInstance | null = null
    let nearestDist = PLAYER_ATTACK_RANGE
    for (const e of this.enemies) {
      if (!e.alive) continue
      const d = dist(e.x, e.y, g.player.x, g.player.y)
      if (d <= nearestDist) { nearest = e; nearestDist = d }
    }
    if (!nearest) return
    this.playerAtkTimer = PLAYER_ATTACK_COOLDOWN
    this.damageEnemy(nearest, g.heroAtk)
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
    g.clearedCombatZones.add(zone.id)
    for (const id of zone.gateColliderIds) g.setColliderActive(id, false)
    g.pendingGold += zone.rewardGold
    g.pendingHeroExp += zone.rewardExp
    g.state = 'explore'
    g.showToast('戰鬥勝利！')
  }
}
