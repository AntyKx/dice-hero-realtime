import type { AdventureGame } from '../AdventureGame'
import type { CollectibleDef } from '../adventureTypes'
import { dist } from '../geometry'

/** 走過去自動撿取（跟 src/arena/objectives.ts 的 Collectible 同款距離判定），
 * 不需要按互動鍵——紫幣/星星碎片/寶箱/任務道具數量夠多，逐一按鍵撿太煩。 */
const PICKUP_DIST = 26

export class CollectibleSystem {
  constructor(private game: AdventureGame) {}

  update() {
    const g = this.game
    for (const c of g.stage.collectibles) {
      if (c.locked) continue
      if (c.hidden && !this.isRevealed(c.id)) continue
      if (g.isCollected(c.id)) continue
      if (dist(c.x, c.y, g.player.x, g.player.y) > PICKUP_DIST) continue
      this.collect(c)
    }
  }

  private isRevealed(collectibleId: string): boolean {
    return this.game.revealedCollectibles.has(collectibleId)
  }

  private collect(c: CollectibleDef) {
    const g = this.game
    g.markCollected(c)
    if (c.kind === 'purple_coin') g.showToast('+1 紫幣')
    else if (c.kind === 'star_piece') g.showToast('找到星星碎片！')
    else if (c.kind === 'treasure') {
      g.showToast('打開寶箱')
      if (c.reward?.gold) g.pendingGold += c.reward.gold
      if (c.reward?.enhanceStones) g.pendingEnhanceStones += c.reward.enhanceStones
    } else if (c.kind === 'quest_item') {
      g.showToast('取得：遺失的小熊')
      g.quest.onQuestItemCollected(c.id)
    }
  }
}
