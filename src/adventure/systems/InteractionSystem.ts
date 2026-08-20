import type { AdventureGame } from '../AdventureGame'
import { dist, rectCenter } from '../geometry'

// 2026-08-20：這輪角色跟互動物件的顯示尺寸都放大了，手機搖桿容錯距離跟著
// 放寬——原本 46/46/50 是舊的小尺寸時代調的，放大後貼太近才觸發反而變得
// 不好操作。
const NPC_RANGE = 56
const BRAZIER_RANGE = 64
const WALL_RANGE = 60

export type InteractionTarget =
  | { kind: 'npc'; id: string; prompt: string }
  | { kind: 'brazier'; puzzleId: string; brazierId: string; prompt: string }
  | { kind: 'breakable_wall'; secretId: string; prompt: string }

/** 找出玩家目前腳邊最近、可以按互動鍵處理的目標（NPC 對話／點火盆／打裂牆）。
 * 收集品/秘密假牆/戰鬥區/出口都是走過去自動觸發，不算在這裡——按鍵互動只
 * 留給「需要玩家主動決定要不要做」的行為。 */
export class InteractionSystem {
  constructor(private game: AdventureGame) {}

  findNearest(): InteractionTarget | null {
    const g = this.game
    const px = g.player.x, py = g.player.y

    for (const npc of g.stage.npcs) {
      if (dist(npc.x, npc.y, px, py) <= (npc.interactRadius ?? NPC_RANGE)) {
        return { kind: 'npc', id: npc.id, prompt: `跟${npc.name}說話` }
      }
    }
    for (const puzzle of g.stage.puzzles) {
      if (puzzle.kind !== 'brazier_gate') continue
      for (const b of puzzle.braziers) {
        if (g.puzzle.isBrazierLit(puzzle.id, b.id)) continue
        if (dist(b.x, b.y, px, py) <= BRAZIER_RANGE) {
          return { kind: 'brazier', puzzleId: puzzle.id, brazierId: b.id, prompt: '點燃火盆' }
        }
      }
    }
    for (const secret of g.stage.secrets) {
      if (secret.kind !== 'breakable_wall' || g.secret.isDiscovered(secret.id)) continue
      const c = rectCenter(secret.area)
      const r = WALL_RANGE + Math.max(secret.area.width, secret.area.height) / 2
      if (dist(c.x, c.y, px, py) <= r) {
        return { kind: 'breakable_wall', secretId: secret.id, prompt: '攻擊裂牆' }
      }
    }
    return null
  }
}
