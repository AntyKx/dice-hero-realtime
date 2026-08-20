import type { AdventureGame } from '../AdventureGame'
import type { AdventureRect } from '../adventureTypes'
import { rectsOverlap } from '../geometry'

// 2026-08-19：Room Transition 架構——地形碰撞從「連續世界的多邊形/走廊」
// 簡化成「目前房間的一個矩形（∪ 房間自己的 transition zone）」。矩形版的
// 好處是我可以直接驗證「walkableBounds 有沒有跟每個 transition zone 重疊」
// 這種簡單幾何關係（跑腳本一次全部驗完），不像連續世界的手繪多邊形+走廊
// 銜接那樣容易留下我肉眼/座標數學都抓不到的縫隙（上一版兩輪實測都還是
// 卡手）。用 OR 而不是要求 walkableBounds 本身延伸到 zone 邊界，是因為就算
// 兩者間留了幾個單位的縫隙，OR 判定下玩家一樣走得過去，不用逐一對齊每個
// 房間的邊界數字。
export class CollisionSystem {
  constructor(private game: AdventureGame) {}

  private playerRect(x: number, y: number): AdventureRect {
    const r = this.game.player.radius
    return { x: x - r, y: y - r, width: r * 2, height: r * 2 }
  }

  private fitsInside(rect: AdventureRect, bounds: AdventureRect): boolean {
    return rect.x >= bounds.x && rect.y >= bounds.y &&
      rect.x + rect.width <= bounds.x + bounds.width && rect.y + rect.height <= bounds.y + bounds.height
  }

  private inRoomWalkableArea(rect: AdventureRect): boolean {
    const g = this.game
    if (!g.stage.rooms) return true // 沒有房間資料的關卡（舊架構）維持不限制
    const room = g.roomSystem.activeRoom
    const wb = room.walkableBoundsLocal
    const walkableWorld: AdventureRect = { x: room.atlasOrigin.x + wb.x, y: room.atlasOrigin.y + wb.y, width: wb.width, height: wb.height }
    if (this.fitsInside(rect, walkableWorld)) return true
    for (const t of room.transitions) {
      const zoneWorld: AdventureRect = { x: room.atlasOrigin.x + t.zone.x, y: room.atlasOrigin.y + t.zone.y, width: t.zone.width, height: t.zone.height }
      if (this.fitsInside(rect, zoneWorld)) return true
    }
    return false
  }

  private blockedAt(x: number, y: number): boolean {
    const g = this.game
    const rect = this.playerRect(x, y)
    const { world } = g.stage
    if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > world.width || rect.y + rect.height > world.height) return true
    if (!this.inRoomWalkableArea(rect)) return true
    for (const c of g.stage.colliders) {
      if (c.blocksMovement === false) continue // 純視覺 collider（藤蔓門/裂牆），實際能不能過看 lockedByFlag
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
