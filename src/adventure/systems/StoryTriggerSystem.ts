import type { AdventureGame } from '../AdventureGame'
import { pointInRect } from '../geometry'

/**
 * 2026-08-21（雪原篇 2-1 起）：房間 local 座標版的劇情觸發——只檢查目前
 * activeRoom 底下的 StoryTriggerDef，room.atlasOrigin 只在這裡加一次，跟
 * CollisionSystem.blockedByRoomTerrain() 同一套「資料端不用手算世界座標」
 * 的原則。實際對話內容沿用既有 stage.dialogues（id 跟 StoryTriggerDef.id
 * 相同）＋ DialogueController，不重新發明播放機制。
 */
export class StoryTriggerSystem {
  private firedOnce = new Set<string>()
  constructor(private game: AdventureGame) {}

  update() {
    const g = this.game
    if (g.dialogue.active) return // 對話播放中不重複觸發
    const room = g.roomSystem.activeRoom
    for (const t of g.stage.storyTriggers ?? []) {
      if (t.roomId !== room.id) continue
      if (t.mode === 'once' && this.firedOnce.has(t.id)) continue
      if (t.requiresCombatCleared && !g.clearedCombatZones.has(t.requiresCombatCleared)) continue
      if (t.area) {
        const worldArea = {
          x: room.atlasOrigin.x + t.area.x, y: room.atlasOrigin.y + t.area.y,
          width: t.area.width, height: t.area.height,
        }
        if (!pointInRect(g.player.x, g.player.y, worldArea)) continue
      }
      if (t.mode === 'once') this.firedOnce.add(t.id)
      g.dialogue.start(t.id, null, 'cutscene')
      break // 一幀只觸發一個，避免同房間多個 room_enter 觸發互相搶播放
    }
  }
}
