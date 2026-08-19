import type { AdventureGame } from '../AdventureGame'
import type { QuestDef } from '../adventureTypes'
import { dist, rectCenter } from '../geometry'

export type QuestState = 'not_started' | 'accepted' | 'ready_to_complete' | 'completed'

export class QuestSystem {
  private state = new Map<string, QuestState>()
  private killCount = new Map<string, number>()
  private itemCollected = new Set<string>()
  private spawnedFor = new Set<string>()

  constructor(private game: AdventureGame) {}

  getState(questId: string): QuestState {
    return this.state.get(questId) ?? 'not_started'
  }

  /** 重玩已完成任務時呼叫，讓 NpcController 直接顯示完成後的閒聊台詞，
   * 不會又跳出接受/交任務的對話。 */
  markAlreadyCompleted(questId: string) {
    this.state.set(questId, 'completed')
  }

  accept(questId: string) {
    if (this.getState(questId) !== 'not_started') return
    this.state.set(questId, 'accepted')
    this.killCount.set(questId, 0)
  }

  /** 接受任務後玩家走近 killTarget.spawnArea 才生成敵人，不是一進關卡就有。 */
  update() {
    const g = this.game
    for (const q of g.stage.quests) {
      if (this.getState(q.id) !== 'accepted' || this.spawnedFor.has(q.id)) continue
      const center = rectCenter(q.killTarget.spawnArea)
      const r = Math.max(q.killTarget.spawnArea.width, q.killTarget.spawnArea.height) / 2 + 40
      if (dist(g.player.x, g.player.y, center.x, center.y) > r) continue
      this.spawnedFor.add(q.id)
      const { x, y, width, height } = q.killTarget.spawnArea
      for (let i = 0; i < q.killTarget.count; i++) {
        g.combat.spawnHostileEnemy(q.killTarget.enemyId, x + Math.random() * width, y + Math.random() * height)
      }
    }
  }

  onEnemyKilled(enemyTypeId: string) {
    for (const q of this.game.stage.quests) {
      if (this.getState(q.id) !== 'accepted' || q.killTarget.enemyId !== enemyTypeId) continue
      this.killCount.set(q.id, (this.killCount.get(q.id) ?? 0) + 1)
      this.checkReady(q)
    }
  }

  onQuestItemCollected(collectibleId: string) {
    for (const q of this.game.stage.quests) {
      if (q.requiredCollectibleId !== collectibleId) continue
      this.itemCollected.add(q.id)
      if (this.getState(q.id) === 'accepted') this.checkReady(q)
    }
  }

  private checkReady(q: QuestDef) {
    const killedEnough = (this.killCount.get(q.id) ?? 0) >= q.killTarget.count
    if (killedEnough && this.itemCollected.has(q.id)) this.state.set(q.id, 'ready_to_complete')
  }

  complete(questId: string) {
    const g = this.game
    const q = g.stage.quests.find(x => x.id === questId)
    if (!q || this.getState(questId) !== 'ready_to_complete') return
    this.state.set(questId, 'completed')
    g.questsCompleted.add(questId)
    g.flags[q.completeFlag] = true
    g.pendingGold += q.reward.gold
    g.pendingPurpleCoinBonus += q.reward.purpleCoins
    g.showToast(`任務完成：${q.title}`)
  }
}
