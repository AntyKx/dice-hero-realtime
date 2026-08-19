import type { AdventureGame } from '../AdventureGame'

export class CameraSystem {
  constructor(private game: AdventureGame) {}

  update() {
    const g = this.game
    if (!g.app) return
    const screenW = g.app.screen.width
    const screenH = g.app.screen.height
    const { world } = g.stage
    const maxX = Math.max(0, world.width - screenW)
    const maxY = Math.max(0, world.height - screenH)
    g.camera.x = Math.max(0, Math.min(g.player.x - screenW / 2, maxX))
    g.camera.y = Math.max(0, Math.min(g.player.y - screenH / 2, maxY))
    g.worldLayer.position.set(-g.camera.x, -g.camera.y)
  }
}
