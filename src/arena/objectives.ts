/**
 * 森林遺跡固定關卡的 8 種 Objective 執行期邏輯（2026-08，見 src/campaign/）。
 * 純函式集中在這裡，實際狀態放在 ArenaGame.objectiveState，呼叫端是
 * ArenaGame.updateObjective()，每幀依 `stage.objective.type` 分派到這裡對應
 * 的 update 函式。單一檔案（不拆 8 檔）：每種型別邏輯都很短，拆檔案是過度
 * 工程化。
 */
import { Graphics } from 'pixi.js'
import type { ArenaGame, EnemyInstance } from './ArenaGame'
import type { StageObjective } from '../campaign/campaignTypes'

export interface Collectible {
  gfx: Graphics
  x: number
  y: number
  alive: boolean
}

export interface ObjectiveState {
  objective: StageObjective
  resolved: boolean
  won: boolean
  // elimination/hunt 共用
  huntTargetDefeated: boolean
  // survival/defense 共用
  elapsedInObjectiveSec: number
  // defense 專用（見 ArenaGame.defenseCore，不放這裡是因為要牽動 Pixi 物件生命週期）
  // destroy 專用
  destroyRemaining: number
  // collection 專用
  collectibles: Collectible[]
  collectedCount: number
  // escape 專用
  escapeX: number
  escapeY: number
  escapeGfx: Graphics | null
  // custom（例如 1-9「優先擊敗 Shaman」）：只影響三星判定，不影響主要 Objective 輸贏
  customStarFailed: boolean
}

const COLLECTIBLE_RADIUS = 10
const COLLECTIBLE_PICKUP_DIST = 24
const ESCAPE_TRIGGER_DIST = 40

export function isObjectiveWon(state: ObjectiveState, game: ArenaGame): boolean {
  switch (state.objective.type) {
    case 'elimination':
      return game.pendingWaves.length === 0 && game.enemies.length === 0
    case 'survival':
      return state.elapsedInObjectiveSec >= (state.objective.durationSec ?? 60)
    case 'defense':
      return state.elapsedInObjectiveSec >= (state.objective.durationSec ?? 60) && (game.defenseCore?.hp ?? 0) > 0
    case 'hunt':
      return state.huntTargetDefeated
    case 'destroy':
      return state.destroyRemaining <= 0
    case 'collection':
      return state.collectedCount >= (state.objective.collectCount ?? 0)
    case 'escape': {
      const dist = Math.hypot(game.player.x - state.escapeX, game.player.y - state.escapeY)
      return dist < ESCAPE_TRIGGER_DIST
    }
    case 'boss':
      return game.enemies.filter(e => e.isBoss).every(e => !e.alive) && game.bossState !== 'none'
  }
}

export function isObjectiveLost(state: ObjectiveState, game: ArenaGame): boolean {
  if (game.player.hp <= 0) return true
  if (state.objective.type === 'defense') return (game.defenseCore?.hp ?? 1) <= 0
  return false
}

/** 每幀更新 Objective 專屬的持續性內容（計時、拾取物磁吸、逃脫點視覺）。勝負判定交給上面兩個函式，這裡只管狀態推進。 */
export function updateObjectiveState(state: ObjectiveState, game: ArenaGame, dt: number): void {
  if (state.objective.type === 'survival' || state.objective.type === 'defense') {
    state.elapsedInObjectiveSec += dt
  }
  if (state.objective.type === 'collection') {
    for (const c of state.collectibles) {
      if (!c.alive) continue
      const dist = Math.hypot(game.player.x - c.x, game.player.y - c.y)
      if (dist < COLLECTIBLE_PICKUP_DIST) {
        c.alive = false
        c.gfx.visible = false
        state.collectedCount++
        game.spawnGlowBurst(c.x, c.y, 0xffe9a8, 30)
        game.spawnFloatingText(`${state.collectedCount}/${state.objective.collectCount ?? 0}`, c.x, c.y - 20)
      }
    }
  }
}

/** 生成 Collection 目標的拾取物（開場一次性灑在場上，位置隨機但避開螢幕邊緣）。 */
export function spawnCollectibles(game: ArenaGame, count: number): Collectible[] {
  if (!game.app) return []
  const { width, height } = game.app.screen
  const list: Collectible[] = []
  for (let i = 0; i < count; i++) {
    const x = width * 0.15 + Math.random() * width * 0.7
    const y = height * 0.25 + Math.random() * height * 0.5
    const gfx = new Graphics()
    gfx.star(0, 0, 5, COLLECTIBLE_RADIUS, COLLECTIBLE_RADIUS * 0.5).fill({ color: 0xffe9a8 }).stroke({ color: 0xffffff, width: 1.5 })
    gfx.x = x; gfx.y = y
    game.app.stage.addChild(gfx)
    list.push({ gfx, x, y, alive: true })
  }
  return list
}

/** Hunt 目標死亡時呼叫（由 ArenaGame 擊殺分支判斷 e.typeId 是否符合 huntTargetId 後呼叫）。 */
export function onHuntTargetDefeated(state: ObjectiveState): void {
  state.huntTargetDefeated = true
}

/** Destroy 目標（圖騰）死亡時呼叫。 */
export function onDestroyTargetDefeated(state: ObjectiveState): void {
  state.destroyRemaining = Math.max(0, state.destroyRemaining - 1)
}

/** 1-9「優先擊敗 Shaman」這類 custom 星星條件：其他非核心敵人先於指定目標死亡時呼叫，標記這次挑戰的 custom 星星失敗（不影響主要 Objective 輸贏，只影響三星判定）。exemptTypeIds 是不列入「非核心敵人」判定的類型（例如 1-9 的森林樹精血太厚，不算違規）。 */
export function markCustomStarFailed(
  e: EnemyInstance, state: ObjectiveState, protectedTargetTypeId: string, exemptTypeIds: string[] = [],
): void {
  if (e.typeId !== protectedTargetTypeId && !exemptTypeIds.includes(e.typeId)) state.customStarFailed = true
}
