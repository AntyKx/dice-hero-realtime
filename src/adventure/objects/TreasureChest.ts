import { Graphics } from 'pixi.js'

/** Greybox 寶箱：色塊拼出的箱子造型，不是正式美術——見任務最終報告的
 * Greybox 清單。 */
export function createTreasureChestGraphic(): Graphics {
  const g = new Graphics()
  g.rect(-14, -10, 28, 20).fill({ color: 0x8a5a2b }).stroke({ color: 0xffd76a, width: 2 })
  g.rect(-14, -14, 28, 8).fill({ color: 0x6a4420 }).stroke({ color: 0xffd76a, width: 2 })
  return g
}

export function markChestOpened(gfx: Graphics) {
  gfx.alpha = 0.4
}
