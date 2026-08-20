import type { AdventureGame } from '../AdventureGame'
import type { SecretDef } from '../adventureTypes'
import { pointInRect } from '../geometry'

export class SecretSystem {
  /** breakable_wall 專用：secretId -> 剩餘 HP。 */
  private wallHp = new Map<string, number>()

  constructor(private game: AdventureGame) {}

  isDiscovered(secretId: string): boolean {
    return this.game.secretsDiscovered.has(secretId)
  }

  /** illusory_wall 是走進去就發現，不用按互動鍵——每幀檢查玩家是否進入區域。 */
  update() {
    const g = this.game
    for (const s of g.stage.secrets) {
      if (s.kind !== 'illusory_wall' || this.isDiscovered(s.id)) continue
      if (pointInRect(g.player.x, g.player.y, s.area)) this.reveal(s)
    }
  }

  hitBreakableWall(secretId: string) {
    const g = this.game
    const secret = g.stage.secrets.find(s => s.id === secretId && s.kind === 'breakable_wall')
    if (!secret || this.isDiscovered(secretId)) return
    const maxHp = secret.hp ?? 3
    const hp = (this.wallHp.get(secretId) ?? maxHp) - 1
    this.wallHp.set(secretId, hp)
    if (hp <= 0) this.reveal(secret)
    else {
      g.updateBreakableWallVisual(secretId, hp / maxHp)
      g.showToast(`裂牆出現裂痕… (剩 ${hp})`)
    }
  }

  private reveal(secret: SecretDef) {
    const g = this.game
    g.secretsDiscovered.add(secret.id)
    // 用秘密自己的 id 當 flag 名——RoomTransitionDef.lockedByFlag 可以直接
    // 用 secret.id（例如 secret02_wall）湊出「牆打穿才能過」，不用另外定義
    // 一個 flag 名稱。
    g.flags[secret.id] = true
    g.showToast('發現秘密區域！')
    for (const cid of secret.revealsCollectibleIds) g.revealCollectible(cid)
    if (secret.kind === 'breakable_wall') g.setColliderActive(secret.id, false)
  }
}
