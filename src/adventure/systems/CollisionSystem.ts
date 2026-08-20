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

  private circleRect(x: number, y: number, radius: number): AdventureRect {
    return { x: x - radius, y: y - radius, width: radius * 2, height: radius * 2 }
  }

  private fitsInside(rect: AdventureRect, bounds: AdventureRect): boolean {
    return rect.x >= bounds.x && rect.y >= bounds.y &&
      rect.x + rect.width <= bounds.x + bounds.width && rect.y + rect.height <= bounds.y + bounds.height
  }

  /** 2026-08-20：出口 zone 原本要求整個 hitbox「完整塞進」zone 才算數
   * （fitsInside）——這一輪把玩家 hitbox 從 14 放大到 22 之後，窄一點的
   * 出口 zone 會變成必須站得很精準才能觸發，手機搖桿很難對準。改成只要
   * hitbox 跟 zone 有重疊（rectsOverlap）就算——出口本來就是可以走過去的
   * 通道，不是需要完全站進去的判定點。walkableBoundsLocal 本身仍用
   * fitsInside，那個是房間本體範圍，不是通道，不用跟著放寬。敵人不走這條
   * （allowTransitionOverlap=false），不然敵人會被玩家沒站穩的出口通道
   * 誤導出房間範圍。 */
  private inRoomWalkableArea(rect: AdventureRect, allowTransitionOverlap = true): boolean {
    const g = this.game
    if (!g.stage.rooms) return true // 沒有房間資料的關卡（舊架構）維持不限制
    const room = g.roomSystem.activeRoom
    const wb = room.walkableBoundsLocal
    const walkableWorld: AdventureRect = { x: room.atlasOrigin.x + wb.x, y: room.atlasOrigin.y + wb.y, width: wb.width, height: wb.height }
    if (this.fitsInside(rect, walkableWorld)) return true
    if (!allowTransitionOverlap) return false
    for (const t of room.transitions) {
      const zoneWorld: AdventureRect = { x: room.atlasOrigin.x + t.zone.x, y: room.atlasOrigin.y + t.zone.y, width: t.zone.width, height: t.zone.height }
      if (rectsOverlap(rect, zoneWorld)) return true
    }
    return false
  }

  /** 2026-08-20：只檢查目前房間自己的 terrainCollidersLocal，local 轉
   * world 只在這裡加一次 atlasOrigin——資料端（forestRuins01.ts）不用再
   * 手動換算，避免重演 room_05 手算 atlasOrigin 算錯的 bug。 */
  private blockedByRoomTerrain(rect: AdventureRect): boolean {
    const g = this.game
    const room = g.roomSystem.activeRoom
    for (const c of room.terrainCollidersLocal ?? []) {
      const worldRect: AdventureRect = {
        x: room.atlasOrigin.x + c.rect.x,
        y: room.atlasOrigin.y + c.rect.y,
        width: c.rect.width,
        height: c.rect.height,
      }
      if (rectsOverlap(rect, worldRect)) return true
    }
    return false
  }

  /** radius/allowTransitionOverlap 選填，預設沿用玩家自己的半徑跟「出口可
   * 通過」規則——敵人呼叫時帶自己的 hitRadius 跟 allowTransitionOverlap=false。 */
  private blockedAt(x: number, y: number, radius = this.game.player.radius, allowTransitionOverlap = true): boolean {
    const g = this.game
    const rect = this.circleRect(x, y, radius)
    const { world } = g.stage
    if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > world.width || rect.y + rect.height > world.height) return true
    if (!this.inRoomWalkableArea(rect, allowTransitionOverlap)) return true
    if (this.blockedByRoomTerrain(rect)) return true
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
    this.moveCircleWithCollision(p.x, p.y, p.radius, dx, dy, true, (x, y) => { p.x = x; p.y = y })
  }

  /** 2026-08-20：敵人追逐玩家原本完全不檢查碰撞（AdventureCombatController
   * 直接 e.x += dx*speed*dt），可以直接穿牆穿水穿帳篷追過來。改成跟玩家
   * 共用同一套 moveCircleWithCollision，但 allowTransitionOverlap=false——
   * 敵人不需要、也不該把出口 zone 當成可以站的地方，只在房間本體範圍內
   * 活動，不然戰鬤中敵人可能被玩家沒站穩的出口通道引導出房間範圍。 */
  moveEnemyWithCollision(x: number, y: number, radius: number, dx: number, dy: number): { x: number; y: number } {
    let nextX = x
    let nextY = y
    this.moveCircleWithCollision(x, y, radius, dx, dy, false, (nx, ny) => { nextX = nx; nextY = ny })
    return { x: nextX, y: nextY }
  }

  /** 2026-08-20：原本的分軸滑動一次移動整段 dx/dy，高速或低幀率時可能一步
   * 跨過薄 collider（水面/帳篷這種窄邊界）直接穿過去。改成依移動距離切成
   * 每段最多 6 世界單位的子步進，每一步先試對角線整體位移（讓角色沿斜向
   * 牆角自然滑行，不是卡死），對角線被擋住才退回分軸各自嘗試。 */
  private moveCircleWithCollision(
    x: number,
    y: number,
    radius: number,
    dx: number,
    dy: number,
    allowTransitionOverlap: boolean,
    commit: (x: number, y: number) => void,
  ) {
    const distance = Math.hypot(dx, dy)
    const steps = Math.max(1, Math.ceil(distance / 6))
    const stepX = dx / steps
    const stepY = dy / steps
    let currentX = x
    let currentY = y

    for (let i = 0; i < steps; i++) {
      const diagonalX = currentX + stepX
      const diagonalY = currentY + stepY
      if (!this.blockedAt(diagonalX, diagonalY, radius, allowTransitionOverlap)) {
        currentX = diagonalX
        currentY = diagonalY
        continue
      }
      if (!this.blockedAt(diagonalX, currentY, radius, allowTransitionOverlap)) currentX = diagonalX
      if (!this.blockedAt(currentX, diagonalY, radius, allowTransitionOverlap)) currentY = diagonalY
    }
    commit(currentX, currentY)
  }
}
