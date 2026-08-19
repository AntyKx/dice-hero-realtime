import type { AdventureGame } from '../AdventureGame'
import { getForest01CameraScale } from '../art/forestRuins01VisualTuning'

// 目前只有 forest_1_1 這個 Adventure Stage，所以直接用它專用的 scale 曲線；
// 之後如果加第二個 Adventure Stage，這裡要改成依 stageId 查對應 tuning，
// 跟 AdventureGame.ts 的 collectForest01ArtPaths() 是同一種「先寫死、
// 之後再泛化」的取捨（見該函式開頭註解）。
export class CameraSystem {
  constructor(private game: AdventureGame) {}

  update() {
    const g = this.game
    if (!g.app) return
    const screenW = g.app.screen.width
    const screenH = g.app.screen.height
    const scale = getForest01CameraScale(screenW, screenH)

    // Clamp 一定要用「邏輯可視範圍」（screen / scale），不能繼續用原始
    // screenW/screenH，不然 worldLayer 縮放後畫面邊界會算錯，見這次美術
    // V2 修正的根因 B。
    const visibleW = screenW / scale
    const visibleH = screenH / scale
    const { world } = g.stage
    const maxX = Math.max(0, world.width - visibleW)
    const maxY = Math.max(0, world.height - visibleH)

    g.camera.x = Math.max(0, Math.min(g.player.x - visibleW / 2, maxX))
    g.camera.y = Math.max(0, Math.min(g.player.y - visibleH / 2, maxY))

    g.worldLayer.scale.set(scale)
    g.worldLayer.position.set(-g.camera.x * scale, -g.camera.y * scale)
  }
}
