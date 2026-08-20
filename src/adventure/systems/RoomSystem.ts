import type { AdventureGame } from '../AdventureGame'
import type { RoomDef } from '../adventureTypes'
import { pointInRect } from '../geometry'

const FADE_SEC = 0.18

/**
 * Room Transition 引擎（2026-08-19，取代連續世界 + area-aware camera）。
 * 玩家踩到目前房間的某個 transition zone（room local 座標）就鎖輸入、
 * fade out、把玩家傳送到下一個房間的 targetSpawnLocal、fade in、解鎖輸入。
 * CollisionSystem／CameraSystem 都靠 activeRoom 決定目前的碰撞範圍/鏡頭
 * 範圍，這三個系統是這次架構唯一互相依賴的地方。
 */
export class RoomSystem {
  activeRoomId: string
  private fadeState: 'idle' | 'out' | 'in' = 'idle'
  private fadeTimer = 0
  private pendingRoomId: string | null = null
  private pendingSpawn: { x: number; y: number } | null = null

  constructor(private game: AdventureGame, initialRoomId: string) {
    this.activeRoomId = initialRoomId
  }

  get activeRoom(): RoomDef {
    const rooms = this.game.stage.rooms
    const room = rooms?.find(r => r.id === this.activeRoomId)
    if (room) return room
    // 防呆：這裡如果直接 throw，會讓每幀都跑的 ticker callback 整個中斷
    // （移動/鏡頭/碰撞全部失效，畫面看起來像「卡死不會動」）。抓不到目前
    // 房間就退回第一個房間，同時在 console 留一個明顯錯誤，好過整個引擎
    // 靜默掛掉。
    console.error(`[RoomSystem] 找不到房間 ${this.activeRoomId}，退回第一個房間`)
    if (!rooms || rooms.length === 0) throw new Error('Room Transition：stage.rooms 是空的')
    this.activeRoomId = rooms[0].id
    return rooms[0]
  }

  get fading(): boolean {
    return this.fadeState !== 'idle'
  }

  /** 0=完全看得到畫面，1=全黑。fade out 期間 0→1，fade in 期間 1→0。 */
  get fadeAlpha(): number {
    if (this.fadeState === 'idle') return 0
    const t = Math.min(1, this.fadeTimer / FADE_SEC)
    return this.fadeState === 'out' ? t : 1 - t
  }

  update(dt: number) {
    const g = this.game
    if (this.fadeState !== 'idle') {
      this.fadeTimer += dt
      if (this.fadeState === 'out' && this.fadeTimer >= FADE_SEC) {
        if (this.pendingRoomId && this.pendingSpawn) {
          this.activeRoomId = this.pendingRoomId
          const room = this.activeRoom
          g.player.x = room.atlasOrigin.x + this.pendingSpawn.x
          g.player.y = room.atlasOrigin.y + this.pendingSpawn.y
          g.onRoomEntered(room)
        }
        this.pendingRoomId = null
        this.pendingSpawn = null
        this.fadeState = 'in'
        this.fadeTimer = 0
      } else if (this.fadeState === 'in' && this.fadeTimer >= FADE_SEC) {
        this.fadeState = 'idle'
        this.fadeTimer = 0
      }
      return
    }

    if (g.state !== 'explore') return // 戰鬤中不檢查換房，房間邊界自然鎖住玩家
    const room = this.activeRoom
    const localX = g.player.x - room.atlasOrigin.x
    const localY = g.player.y - room.atlasOrigin.y
    for (const t of room.transitions) {
      if (!pointInRect(localX, localY, t.zone)) continue
      if (t.lockedByFlag && !g.flags[t.lockedByFlag]) continue // 條件沒達成，站在 zone 裡也不會換房
      this.pendingRoomId = t.targetRoomId
      this.pendingSpawn = t.targetSpawnLocal
      this.fadeState = 'out'
      this.fadeTimer = 0
      break
    }
  }
}
