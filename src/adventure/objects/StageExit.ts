import { Graphics } from 'pixi.js'
import type { AdventureGame } from '../AdventureGame'
import { dist } from '../geometry'

export function createExitGraphic(radius: number): Graphics {
  return new Graphics()
    .circle(0, 0, radius).fill({ color: 0xffe089, alpha: 0.32 })
    .circle(0, 0, radius).stroke({ color: 0xffe089, width: 2 })
}

/** 出口不需要按互動鍵，走進半徑內就直接觸發結算——跟舊 exploreWorld 的
 * exit 判定同款手感。只有 explore 狀態才檢查（對話/戰鬥/謎題中途走過出口
 * 座標不該誤觸發）。 */
export function updateExitCheck(game: AdventureGame) {
  if (game.state !== 'explore') return
  const { exit } = game.stage
  if (dist(game.player.x, game.player.y, exit.x, exit.y) > exit.radius) return
  game.finishStage(true)
}
