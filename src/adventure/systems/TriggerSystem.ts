import type { AdventureGame } from '../AdventureGame'
import type { TriggerAction } from '../adventureTypes'
import { pointInRect } from '../geometry'

export class TriggerSystem {
  private firedOnce = new Set<string>()
  constructor(private game: AdventureGame) {}

  update() {
    const g = this.game
    for (const t of g.stage.triggers) {
      if (t.mode === 'once' && this.firedOnce.has(t.id)) continue
      if (!pointInRect(g.player.x, g.player.y, t.area)) continue
      if (t.mode === 'once') this.firedOnce.add(t.id)
      this.fire(t.action)
    }
  }

  private fire(action: TriggerAction) {
    const g = this.game
    if (action.type === 'discover_area') {
      if (!g.areasDiscovered.has(action.areaId)) {
        g.areasDiscovered.add(action.areaId)
        g.showToast(`發現：${action.areaName}`)
      }
    } else if (action.type === 'start_cutscene') {
      g.startCutscene(action.cutsceneId)
      if (action.setsFlag) g.flags[action.setsFlag] = true
    }
  }
}
