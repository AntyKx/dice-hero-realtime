import type { AdventureGame } from '../AdventureGame'
import type { AdventureRect } from '../adventureTypes'
import { rectsOverlap } from '../geometry'

export class CollisionSystem {
  constructor(private game: AdventureGame) {}

  private playerRect(x: number, y: number): AdventureRect {
    const r = this.game.player.radius
    return { x: x - r, y: y - r, width: r * 2, height: r * 2 }
  }

  private blockedAt(x: number, y: number): boolean {
    const g = this.game
    const rect = this.playerRect(x, y)
    const { world } = g.stage
    if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > world.width || rect.y + rect.height > world.height) return true
    for (const c of g.stage.colliders) {
      if (g.colliderActive.get(c.id) === false) continue
      if (rectsOverlap(rect, c.rect)) return true
    }
    return false
  }

  /** 分軸移動：x/y 各自檢查碰撞，卡住一軸另一軸還能滑動，避免卡在牆角出不去。 */
  moveWithCollision(dx: number, dy: number) {
    const p = this.game.player
    if (dx !== 0) {
      const nx = p.x + dx
      if (!this.blockedAt(nx, p.y)) p.x = nx
    }
    if (dy !== 0) {
      const ny = p.y + dy
      if (!this.blockedAt(p.x, ny)) p.y = ny
    }
  }
}
