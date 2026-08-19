import type { AdventureGame } from '../AdventureGame'
import type { AdventureGameState, DialogueLine } from '../adventureTypes'

/** 支援 Party Conditional Dialogue（文件第十節祭壇需求）：DialogueDef 底下
 * 依序檢查 variants，第一個 condition 命中目前隊伍的分支優先顯示，沒有
 * condition 的最後一筆當 fallback。播放中的對話是純線性的一句一句往下，
 * 沒有分支選項（第一版不需要）。 */
export class DialogueController {
  private lines: DialogueLine[] = []
  private index = 0
  private onDone: (() => void) | null = null
  private previousState: AdventureGameState = 'explore'

  constructor(private game: AdventureGame) {}

  /** stateOverride='cutscene' 讓祭壇劇情跟一般 NPC 對話共用同一套播放/HUD
   * 機制（都是「一句一句往下、按互動鍵推進」），只差 AdventureGameState 標記
   * 不同，不用另外寫一個 CutsceneController。 */
  start(dialogueId: string, onDone: (() => void) | null = null, stateOverride: 'dialogue' | 'cutscene' = 'dialogue') {
    const g = this.game
    const def = g.stage.dialogues.find(d => d.id === dialogueId)
    if (!def || def.variants.length === 0) return
    const variant = def.variants.find(v => !v.condition || g.partyHeroIds.includes(v.condition.partyHasHeroId))
      ?? def.variants[def.variants.length - 1]
    this.lines = variant.lines
    this.index = 0
    this.onDone = onDone
    if (g.state !== 'dialogue' && g.state !== 'cutscene') this.previousState = g.state
    g.state = stateOverride
    g.emitHud()
  }

  get active(): boolean { return this.game.state === 'dialogue' || this.game.state === 'cutscene' }

  current(): { speaker: string; text: string; hasMore: boolean } | null {
    if (!this.active || this.index >= this.lines.length) return null
    const line = this.lines[this.index]
    return { speaker: line.speaker, text: line.text, hasMore: this.index < this.lines.length - 1 }
  }

  /** 按互動鍵推進到下一句；播完最後一句時關閉對話框、還原成進場前的狀態
   * （通常是 explore），並執行 onDone（例如接任務/交任務）。 */
  advance() {
    if (!this.active) return
    this.index++
    if (this.index >= this.lines.length) {
      this.game.state = this.previousState
      const cb = this.onDone
      this.onDone = null
      cb?.()
    }
    this.game.emitHud()
  }
}
