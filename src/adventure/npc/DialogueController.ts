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
    // 2026-08-20 修正：對話/劇情開始時玩家常常還在移動（走進 NPC/劇情
    // trigger 當下手指還按著搖桿），MovementSystem 因為 state 不是
    // explore/combat 而停止套用，但 g.moveDir 這個「目前按住的方向」本身
    // 沒有被清掉——如果放開手指的那次 pointerup 又剛好在對話/劇情播放期間
    // 發生（AdventureStageScreen.tsx 的搖桿事件只在 explore/combat 才會綁
    // 上，dialogue/cutscene 期間放開手指不會觸發 release），moveDir 就會維持
    // 對話開始前那個非零方向，對話結束、state 切回 explore 的那一刻
    // MovementSystem 立刻讀到這個殘留方向，變成「講完話自動往前走」。這裡
    // 對話/劇情一開始就直接歸零，之後要嘛玩家真的重新操作搖桿給新方向，
    // 要嘛就是 0，不會再有殘留輸入。
    g.moveDir = { x: 0, y: 0 }
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
