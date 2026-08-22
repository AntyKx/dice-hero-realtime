import { Graphics } from 'pixi.js'
import type { AdventureGame } from '../AdventureGame'
import type { AdventureRect, HazardZoneDef } from '../adventureTypes'
import { dist, pointInRect } from '../geometry'

const ICICLE_IMPACT_RADIUS = 55
const ICICLE_DAMAGE = 10
const FROST_LINE_DAMAGE = 14
const FROST_TOWER_RANGE = 750
const FROST_TOWER_DAMAGE = 16
const WARN_COLOR = 0xff5050
const WHITEOUT_COLOR = 0x0a1622
const WHITEOUT_ALPHA = 0.82
const WHITEOUT_OVERLAY_HALF_SIZE = 3000

interface IcicleWarning { x: number; y: number; timer: number; warningSec: number; graphic: Graphics }
interface LineWarning { rect: AdventureRect; timer: number; warningSec: number; graphic: Graphics }
interface ConeWarning {
  originX: number; originY: number; angleCenter: number; halfAngleRad: number; range: number
  timer: number; warningSec: number; graphic: Graphics
}

/**
 * 2026-08-21（雪原篇 2-2 東側塔起）：主動型環境危害——跟 ice_floor／
 * frozen_zone／snow_gust／thin_ice（純移動修正，寫在 MovementSystem.ts）
 * 不同，這裡管理的 kind 本身有獨立的計時器／Pixi 視覺物件，需要每幀 tick：
 * - falling_icicle：區域內隨機一點的圓形預警
 * - frost_line：整條 lane（矩形）的預警帶
 * - frost_tower：固定點朝玩家目前位置的扇形預警
 * 三者都是同一套「倒數→預警→判定→清除」節奏，只有形狀不同，共用同一份
 * cooldowns 記帳（用 hazard id 當 key）。whiteout 是純視覺效果（拉暗畫面＋
 * 玩家周圍留一圈可視範圍），沒有傷害/判定，獨立一組計時器。
 */
export class HazardSystem {
  private cooldowns = new Map<string, number>()
  private warnings: IcicleWarning[] = []
  private lineWarnings: LineWarning[] = []
  private coneWarnings: ConeWarning[] = []

  private whiteoutTimer = 0
  private whiteoutActiveRemaining = 0
  private whiteoutOverlay: { top: Graphics; bottom: Graphics; left: Graphics; right: Graphics } | null = null

  constructor(private game: AdventureGame) {}

  update(dt: number) {
    const g = this.game
    const room = g.roomSystem.activeRoom
    let whiteoutHazard: HazardZoneDef | null = null
    for (const hz of g.stage.hazards ?? []) {
      if (hz.roomId !== room.id) continue
      if (hz.kind === 'falling_icicle') this.tickIcicleHazard(hz, room.atlasOrigin, dt)
      else if (hz.kind === 'frost_line') this.tickFrostLineHazard(hz, room.atlasOrigin, dt)
      else if (hz.kind === 'frost_tower') this.tickFrostTowerHazard(hz, room.atlasOrigin, dt)
      else if (hz.kind === 'whiteout') whiteoutHazard = hz
    }
    this.updateWarnings(dt)
    this.updateLineWarnings(dt)
    this.updateConeWarnings(dt)
    this.tickWhiteout(whiteoutHazard, dt)
  }

  private nextCooldown(hz: HazardZoneDef, intervalSec: number): number {
    const cd = this.cooldowns.get(hz.id)
    // 第一次進房間隨機一個較短的起始延遲（0.3~0.7 倍間隔），避免每次進房
    // 間都在同一瞬間看到預警，手感太機械。
    return cd ?? intervalSec * (0.3 + Math.random() * 0.4)
  }

  private tickIcicleHazard(hz: HazardZoneDef, atlasOrigin: { x: number; y: number }, dt: number) {
    const g = this.game
    const intervalSec = Number(hz.params.intervalSec ?? 3)
    const warningSec = Number(hz.params.warningSec ?? 0.8)
    let cd = this.nextCooldown(hz, intervalSec) - dt
    if (cd <= 0) {
      cd = intervalSec
      const x = atlasOrigin.x + hz.area.x + Math.random() * hz.area.width
      const y = atlasOrigin.y + hz.area.y + Math.random() * hz.area.height
      const graphic = new Graphics()
        .circle(0, 0, ICICLE_IMPACT_RADIUS).fill({ color: WARN_COLOR, alpha: 0.24 }).stroke({ color: WARN_COLOR, width: 2 })
      graphic.x = x; graphic.y = y; graphic.zIndex = y + 2
      g.worldLayer.addChild(graphic)
      this.warnings.push({ x, y, timer: warningSec, warningSec, graphic })
    }
    this.cooldowns.set(hz.id, cd)
  }

  /** 危害區依 laneCount 切成等寬直條，每次隨機亮一條、預警完判定——跟
   * falling_icicle 同一套節奏，只是形狀是矩形不是圓點。 */
  private tickFrostLineHazard(hz: HazardZoneDef, atlasOrigin: { x: number; y: number }, dt: number) {
    const g = this.game
    const intervalSec = Number(hz.params.intervalSec ?? 4)
    const warningSec = Number(hz.params.warningSec ?? 1)
    const laneCount = Math.max(1, Math.round(Number(hz.params.laneCount ?? 2)))
    let cd = this.nextCooldown(hz, intervalSec) - dt
    if (cd <= 0) {
      cd = intervalSec
      const laneIndex = Math.floor(Math.random() * laneCount)
      const laneWidth = hz.area.width / laneCount
      const x = atlasOrigin.x + hz.area.x + laneIndex * laneWidth
      const y = atlasOrigin.y + hz.area.y
      const rect: AdventureRect = { x, y, width: laneWidth, height: hz.area.height }
      const graphic = new Graphics()
        .rect(0, 0, rect.width, rect.height).fill({ color: WARN_COLOR, alpha: 0.2 }).stroke({ color: WARN_COLOR, width: 2 })
      graphic.x = rect.x; graphic.y = rect.y; graphic.zIndex = rect.y + 2
      g.worldLayer.addChild(graphic)
      this.lineWarnings.push({ rect, timer: warningSec, warningSec, graphic })
    }
    this.cooldowns.set(hz.id, cd)
  }

  /** 固定點（危害區中心，模擬「塔」的位置）朝玩家「當下」位置算一個扇形
   * 方向，預警 warningSec 秒後判定（角度/方向不會重新瞄準，站在扇形外
   * 就能閃過）。 */
  private tickFrostTowerHazard(hz: HazardZoneDef, atlasOrigin: { x: number; y: number }, dt: number) {
    const g = this.game
    const intervalSec = Number(hz.params.intervalSec ?? 4)
    const warningSec = Number(hz.params.warningSec ?? 1)
    const coneDeg = Number(hz.params.coneDeg ?? 50)
    let cd = this.nextCooldown(hz, intervalSec) - dt
    if (cd <= 0) {
      cd = intervalSec
      const originX = atlasOrigin.x + hz.area.x + hz.area.width / 2
      const originY = atlasOrigin.y + hz.area.y + hz.area.height / 2
      this.spawnConeWarning(originX, originY, coneDeg, warningSec)
    }
    this.cooldowns.set(hz.id, cd)
  }

  private spawnConeWarning(originX: number, originY: number, coneDeg: number, warningSec: number) {
    const g = this.game
    const angleCenter = Math.atan2(g.player.y - originY, g.player.x - originX)
    const halfAngleRad = (coneDeg * Math.PI / 180) / 2
    const range = FROST_TOWER_RANGE
    const steps = 14
    const graphic = new Graphics()
    graphic.moveTo(0, 0)
    for (let i = 0; i <= steps; i++) {
      const a = angleCenter - halfAngleRad + (2 * halfAngleRad) * (i / steps)
      graphic.lineTo(Math.cos(a) * range, Math.sin(a) * range)
    }
    graphic.closePath().fill({ color: WARN_COLOR, alpha: 0.2 }).stroke({ color: WARN_COLOR, width: 2 })
    graphic.x = originX; graphic.y = originY; graphic.zIndex = originY + 2
    g.worldLayer.addChild(graphic)
    this.coneWarnings.push({ originX, originY, angleCenter, halfAngleRad, range, timer: warningSec, warningSec, graphic })
  }

  private updateWarnings(dt: number) {
    const g = this.game
    for (let i = this.warnings.length - 1; i >= 0; i--) {
      const w = this.warnings[i]
      w.timer -= dt
      // 越接近落地警示圈越明顯（alpha 隨時間往上爬），給玩家一個「快了」的視覺提示。
      w.graphic.alpha = 0.24 + (1 - Math.max(0, w.timer) / w.warningSec) * 0.5
      if (w.timer <= 0) {
        if (dist(g.player.x, g.player.y, w.x, w.y) <= ICICLE_IMPACT_RADIUS) g.damagePlayer(ICICLE_DAMAGE)
        w.graphic.destroy()
        this.warnings.splice(i, 1)
      }
    }
  }

  private updateLineWarnings(dt: number) {
    const g = this.game
    for (let i = this.lineWarnings.length - 1; i >= 0; i--) {
      const w = this.lineWarnings[i]
      w.timer -= dt
      w.graphic.alpha = 0.2 + (1 - Math.max(0, w.timer) / w.warningSec) * 0.55
      if (w.timer <= 0) {
        if (pointInRect(g.player.x, g.player.y, w.rect)) g.damagePlayer(FROST_LINE_DAMAGE)
        w.graphic.destroy()
        this.lineWarnings.splice(i, 1)
      }
    }
  }

  private updateConeWarnings(dt: number) {
    const g = this.game
    for (let i = this.coneWarnings.length - 1; i >= 0; i--) {
      const w = this.coneWarnings[i]
      w.timer -= dt
      w.graphic.alpha = 0.2 + (1 - Math.max(0, w.timer) / w.warningSec) * 0.55
      if (w.timer <= 0) {
        const dx = g.player.x - w.originX
        const dy = g.player.y - w.originY
        const d = Math.hypot(dx, dy)
        if (d <= w.range) {
          const angle = Math.atan2(dy, dx)
          const diff = Math.atan2(Math.sin(angle - w.angleCenter), Math.cos(angle - w.angleCenter))
          if (Math.abs(diff) <= w.halfAngleRad) {
            g.damagePlayer(FROST_TOWER_DAMAGE)
            g.recordSkillHit('frost_tower_hazard_hit')
          }
        }
        w.graphic.destroy()
        this.coneWarnings.splice(i, 1)
      }
    }
  }

  /** 2026-08-21（雪原篇 2-9 白霧戰區）：純視覺效果，沒有任何星星條件依賴
   * 它——每隔 intervalSec 秒進入 durationSec 秒的「拉暗畫面」狀態，玩家
   * 周圍留一個方形可視窗口（半徑 visibilityRadius，世界單位，換算成螢幕
   * 像素時乘上 worldLayer.scale——鏡頭縮放越小，畫面上看起來的可視窗口
   * 也越小，跟房間內容維持一致比例）。疊層加在 app.stage（跟
   * AdventureGame 的換房淡出黑幕同一層，不受 worldLayer 的 camera 平移/
   * 縮放影響），每幀跟著玩家位置重畫。 */
  private tickWhiteout(hz: HazardZoneDef | null, dt: number) {
    if (!hz) {
      this.whiteoutActiveRemaining = 0
      this.whiteoutTimer = 0
      this.hideWhiteoutOverlay()
      return
    }
    const intervalSec = Number(hz.params.intervalSec ?? 10)
    const durationSec = Number(hz.params.durationSec ?? 5)
    if (this.whiteoutActiveRemaining > 0) {
      this.whiteoutActiveRemaining -= dt
      if (this.whiteoutActiveRemaining <= 0) { this.hideWhiteoutOverlay(); return }
      this.renderWhiteoutOverlay(Number(hz.params.visibilityRadius ?? 300))
    } else {
      this.whiteoutTimer += dt
      if (this.whiteoutTimer >= intervalSec) {
        this.whiteoutTimer = 0
        this.whiteoutActiveRemaining = durationSec
      }
    }
  }

  private renderWhiteoutOverlay(radiusWorld: number) {
    const g = this.game
    if (!g.app) return
    if (!this.whiteoutOverlay) {
      const mk = () => { const gfx = new Graphics(); gfx.eventMode = 'none'; g.app!.stage.addChild(gfx); return gfx }
      this.whiteoutOverlay = { top: mk(), bottom: mk(), left: mk(), right: mk() }
    }
    const screenPos = g.worldLayer.toGlobal({ x: g.player.x, y: g.player.y })
    const r = Math.max(24, radiusWorld * g.worldLayer.scale.x)
    const S = WHITEOUT_OVERLAY_HALF_SIZE
    const { top, bottom, left, right } = this.whiteoutOverlay
    top.clear().rect(screenPos.x - S, screenPos.y - S, S * 2, S - r).fill({ color: WHITEOUT_COLOR, alpha: WHITEOUT_ALPHA })
    bottom.clear().rect(screenPos.x - S, screenPos.y + r, S * 2, S - r).fill({ color: WHITEOUT_COLOR, alpha: WHITEOUT_ALPHA })
    left.clear().rect(screenPos.x - S, screenPos.y - r, S - r, r * 2).fill({ color: WHITEOUT_COLOR, alpha: WHITEOUT_ALPHA })
    right.clear().rect(screenPos.x + r, screenPos.y - r, S - r, r * 2).fill({ color: WHITEOUT_COLOR, alpha: WHITEOUT_ALPHA })
  }

  private hideWhiteoutOverlay() {
    if (!this.whiteoutOverlay) return
    const { top, bottom, left, right } = this.whiteoutOverlay
    top.destroy(); bottom.destroy(); left.destroy(); right.destroy()
    this.whiteoutOverlay = null
  }
}
