import type { AdventureGame } from '../AdventureGame'
import type { PuzzleDef } from '../adventureTypes'
import { heroHasExplorationAbility } from '../adventureTypes'

export class PuzzleSystem {
  /** puzzleId -> 已點燃的 brazierId 集合。 */
  private lit = new Map<string, Set<string>>()
  /** `${puzzleId}:${brazierId}` -> 目前累積攻擊次數。 */
  private hits = new Map<string, number>()

  constructor(private game: AdventureGame) {}

  isBrazierLit(puzzleId: string, brazierId: string): boolean {
    return this.lit.get(puzzleId)?.has(brazierId) ?? false
  }

  hitBrazier(puzzleId: string, brazierId: string) {
    const g = this.game
    const puzzle = g.stage.puzzles.find(p => p.id === puzzleId)
    const brazier = puzzle?.braziers.find(b => b.id === brazierId)
    if (!puzzle || !brazier || this.isBrazierLit(puzzleId, brazierId)) return

    // 文件第七節：具備 ignite 類探索能力的英雄可以加速點燃（第一版接口永遠
    // 回 false，所以目前一律照 hitsRequired 走）。
    const required = heroHasExplorationAbility(g.heroId, 'ignite') ? 1 : brazier.hitsRequired
    const key = `${puzzleId}:${brazierId}`
    const n = (this.hits.get(key) ?? 0) + 1
    this.hits.set(key, n)

    if (n >= required) {
      if (!this.lit.has(puzzleId)) this.lit.set(puzzleId, new Set())
      this.lit.get(puzzleId)!.add(brazierId)
      g.setBrazierLit(puzzleId, brazierId)
      g.showToast('火盆點燃！')
      this.checkComplete(puzzle)
    } else {
      g.showToast(`火盆點燃中… (${n}/${required})`)
    }
  }

  private checkComplete(puzzle: PuzzleDef) {
    const g = this.game
    const litSet = this.lit.get(puzzle.id)
    if (!litSet || litSet.size < puzzle.braziers.length) return
    g.puzzlesCompleted.add(puzzle.id)
    g.flags[puzzle.completeFlag] = true
    g.setColliderActive(puzzle.gateColliderId, false)
    g.showToast('藤蔓門開啟了！')
  }
}
