import { Graphics } from 'pixi.js'

/** Greybox 裂牆：純色塊，隨剩餘 HP 逐漸變透明表示裂痕加深——不是正式美術。 */
export function createBreakableWallGraphic(width: number, height: number): Graphics {
  return new Graphics().rect(0, 0, width, height).fill({ color: 0x6b6558 }).stroke({ color: 0x3f3b32, width: 2 })
}

export function updateBreakableWallDamageVisual(gfx: Graphics, hpPct: number) {
  gfx.alpha = 0.5 + 0.5 * hpPct
}
