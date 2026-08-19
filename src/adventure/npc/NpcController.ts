import type { AdventureGame } from '../AdventureGame'

/** 決定跟某個 NPC 互動時該播哪句對話。目前 forest_1_1 只有一個 NPC（迷途
 * 女孩）綁一個支線任務，這裡用「這個 NPC 名下的 QuestDef」（若有）決定台詞
 * ——接任務前/任務進行中/可交任務/已完成，四種狀態各自對到不同 dialogueId。
 * 沒有任務的 NPC（之後其他關卡可能會有）直接退回顯示 dialogueIds[0]。 */
export class NpcController {
  constructor(private game: AdventureGame) {}

  interact(npcId: string) {
    const g = this.game
    const npc = g.stage.npcs.find(n => n.id === npcId)
    if (!npc) return
    const quest = g.stage.quests.find(q => q.npcId === npcId)

    let dialogueId = npc.dialogueIds[0]
    let onDone: (() => void) | null = null

    if (quest) {
      const state = g.quest.getState(quest.id)
      if (state === 'not_started') {
        dialogueId = quest.acceptDialogueId
        onDone = () => g.quest.accept(quest.id)
      } else if (state === 'accepted') {
        dialogueId = quest.inProgressDialogueId
      } else if (state === 'ready_to_complete') {
        dialogueId = quest.completeDialogueId
        onDone = () => g.quest.complete(quest.id)
      } else {
        dialogueId = quest.inProgressDialogueId // completed 之後沿用同一句閒聊台詞
      }
    }
    g.dialogue.start(dialogueId, onDone)
  }
}
