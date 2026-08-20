import type { AdventureGame } from '../AdventureGame'

/** px/秒。2026-08-20：房間背景在手機上約 0.455 倍縮放，160 換算螢幕上只有
 * 約 73px/秒，實測偏慢；提高到 220 螢幕約 100px/秒，跟即時制 RPG 手感更
 * 接近，邊界仍完全交給 CollisionSystem 限制，不影響碰撞判定。 */
const PLAYER_SPEED = 220

export class MovementSystem {
  constructor(private game: AdventureGame) {}

  update(dt: number) {
    const g = this.game
    if (g.state !== 'explore' && g.state !== 'combat') return
    const { x: dx, y: dy } = g.moveDir
    if (dx === 0 && dy === 0) return
    const len = Math.hypot(dx, dy) || 1
    const vx = (dx / len) * PLAYER_SPEED * dt
    const vy = (dy / len) * PLAYER_SPEED * dt
    g.collision.moveWithCollision(vx, vy)
    if (dx !== 0) g.facing = dx > 0 ? 'right' : 'left'
  }
}
