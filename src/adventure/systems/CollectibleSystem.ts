import type { AdventureGame } from '../AdventureGame'
import type { CollectibleDef } from '../adventureTypes'
import { dist } from '../geometry'

/** 走過去自動撿取，不需要按互動鍵——紫幣/星星碎片/寶箱/任務道具數量夠多，
 * 逐一按鍵撿太煩。2026-08-20：改成依物件種類分開設定容錯距離，不再統一用
 * 26——這輪把收集品的顯示尺寸放大了 2~3 倍（紫幣 20→65、寶箱 40→130），
 * 圖已經變大很多，拾取半徑卻還是舊的小數字，看起來明明碰到了卻撿不到。 */
const PICKUP_DIST_BY_KIND: Record<CollectibleDef['kind'], number> = {
  purple_coin: 32,
  star_piece: 48,
  treasure: 72,
  quest_item: 48,
}

export class CollectibleSystem {
  constructor(private game: AdventureGame) {}

  update() {
    const g = this.game
    for (const c of g.stage.collectibles) {
      if (c.locked) continue
      if (c.hidden && !this.isRevealed(c.id)) continue
      if (g.isCollected(c.id)) continue
      if (dist(c.x, c.y, g.player.x, g.player.y) > PICKUP_DIST_BY_KIND[c.kind]) continue
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
