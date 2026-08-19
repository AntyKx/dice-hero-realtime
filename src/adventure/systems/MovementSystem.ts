import type { AdventureGame } from '../AdventureGame'

/** px/秒，量級比照 ArenaGame.ts 的 moveSpeed（Roguelite 英雄普遍 130~170）。 */
const PLAYER_SPEED = 160

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
