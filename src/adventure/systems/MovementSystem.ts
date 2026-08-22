import type { AdventureGame } from '../AdventureGame'

/** px/秒。2026-08-20：房間背景在手機上約 0.455 倍縮放，160 換算螢幕上只有
 * 約 73px/秒，實測偏慢；提高到 220 螢幕約 100px/秒，跟即時制 RPG 手感更
 * 接近，邊界仍完全交給 CollisionSystem 限制，不影響碰撞判定。 */
const PLAYER_SPEED = 220
/** ice_floor 沒有踩到危害區時，速度瞬間貼齊輸入方向（跟改版前行為一致）；
 * 踩到時改成用這個基礎值 + (1-slideStrength) 的回應速度緩慢趨近目標速度，
 * 數字越小滑越久。slideStrength=1（設計文件 2-1 唯一用到的值）大約需要
 * 0.4~0.5 秒才會貼近新方向，體感上是「放開搖桿還會滑一小段」。 */
const ICE_EASE_BASE = 2.2
const ICE_EASE_RESPONSIVE_RANGE = 6
/** frozen_zone（2-4 冰柱廳）：連續停留 freezeAfterSec 秒後定身
 * FREEZE_LOCK_SEC 秒（完全不能動，呼應「身體會直接被凍住」）。 */
const FREEZE_LOCK_SEC = 1.0
/** snow_gust（2-3 風雪低谷）：每隔 intervalSec 秒吹一次陣風，持續
 * GUST_ACTIVE_SEC 秒——逆風（跟 direction 反方向）移動時套用
 * slowAgainstWind 減速，順風不受影響。 */
const GUST_ACTIVE_SEC = 1.6
const GUST_DIRECTION_VEC: Record<string, { x: number; y: number }> = {
  north: { x: 0, y: -1 }, south: { x: 0, y: 1 }, west: { x: -1, y: 0 }, east: { x: 1, y: 0 },
}
/** frozen_zone 定身／snow_gust 陣風都算「被環境危害控制/干擾」一次，共用
 * 這個計數 key——control_count_under 星星條件（2-3「被暴風干擾」、2-4
 * 「Frozen」）語意上都是同一種「玩家行動被外力打斷」，不用為每個 hazard
 * kind 各自開一個 key。 */
const HAZARD_CONTROL_KEY = 'hazard_control_count'

export class MovementSystem {
  private vx = 0
  private vy = 0
  private frozenZoneStaySec = 0
  private freezeLockRemaining = 0
  private gustTimer = 0
  private gustActiveRemaining = 0
  private thinIceStaySec = 0

  constructor(private game: AdventureGame) {}

  update(dt: number) {
    const g = this.game
    if (g.state !== 'explore' && g.state !== 'combat') return

    if (this.freezeLockRemaining > 0) {
      this.freezeLockRemaining -= dt
      this.vx = 0; this.vy = 0
      return // 定身中，完全不能移動
    }

    const { x: dx, y: dy } = g.moveDir
    const len = Math.hypot(dx, dy)
    const inputX = len > 0 ? dx / len : 0
    const inputY = len > 0 ? dy / len : 0
    let speed = PLAYER_SPEED * g.moveSpeedMult

    const iceFloor = g.getActiveHazardZone('ice_floor')
    const frozenZone = g.getActiveHazardZone('frozen_zone')
    const snowGust = g.getActiveHazardZone('snow_gust')
    const thinIce = g.getActiveHazardZone('thin_ice')

    if (thinIce) {
      this.thinIceStaySec += dt
      const crackTime = Number(thinIce.params.crackTimeSec ?? Infinity)
      if (this.thinIceStaySec >= crackTime) {
        this.thinIceStaySec = 0
        const pct = Number(thinIce.params.breakDamagePct ?? 0)
        g.damagePlayer(Math.round(g.player.maxHp * pct / 100))
        g.recordSkillHit('thin_ice_hazard_hit')
      }
    } else {
      this.thinIceStaySec = 0
    }

    if (frozenZone) {
      this.frozenZoneStaySec += dt
      const freezeAfter = Number(frozenZone.params.freezeAfterSec ?? Infinity)
      if (this.frozenZoneStaySec >= freezeAfter) {
        this.frozenZoneStaySec = 0
        this.freezeLockRemaining = FREEZE_LOCK_SEC
        g.recordSkillHit(HAZARD_CONTROL_KEY)
        this.vx = 0; this.vy = 0
        return
      }
      speed *= Number(frozenZone.params.slowMult ?? 1)
    } else {
      this.frozenZoneStaySec = 0
    }

    if (snowGust) {
      const intervalSec = Number(snowGust.params.intervalSec ?? 4)
      this.gustTimer += dt
      if (this.gustTimer >= intervalSec) {
        this.gustTimer = 0
        this.gustActiveRemaining = GUST_ACTIVE_SEC
        g.recordSkillHit(HAZARD_CONTROL_KEY) // 這次陣風吹到了站在危害區裡的玩家，算一次干擾
      }
      if (this.gustActiveRemaining > 0) {
        this.gustActiveRemaining -= dt
        const windVec = GUST_DIRECTION_VEC[String(snowGust.params.direction ?? 'west')] ?? GUST_DIRECTION_VEC.west
        const against = inputX * windVec.x + inputY * windVec.y
        if (against < -0.3) speed *= Number(snowGust.params.slowAgainstWind ?? 0.65) // 逆風走
      }
    } else {
      this.gustTimer = 0
      this.gustActiveRemaining = 0
    }

    if (iceFloor) {
      const slide = Math.max(0, Math.min(1, Number(iceFloor.params.slideStrength ?? 1)))
      const ease = ICE_EASE_BASE + (1 - slide) * ICE_EASE_RESPONSIVE_RANGE
      const targetX = inputX * speed
      const targetY = inputY * speed
      const t = Math.min(1, ease * dt)
      this.vx += (targetX - this.vx) * t
      this.vy += (targetY - this.vy) * t
    } else {
      this.vx = inputX * speed
      this.vy = inputY * speed
    }

    if (this.vx === 0 && this.vy === 0) return
    g.collision.moveWithCollision(this.vx * dt, this.vy * dt)
    if (Math.abs(this.vx) > 1) g.facing = this.vx > 0 ? 'right' : 'left'
  }
}
