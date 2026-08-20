import { Graphics } from 'pixi.js'
import type { AdventureGame } from '../AdventureGame'
import { dist } from '../geometry'

/** Stage exit 的視覺提示圈；正式背景已有出口圖案，這個圖形只在 debug art mode 顯示。 */
export function createExitGraphic(radius: number): Graphics {
  return new Graphics()
    .circle(0, 0, radius).fill({ color: 0xffe089, alpha: 0.32 })
    .circle(0, 0, radius).stroke({ color: 0xffe089, width: 2 })
}

const FINAL_ROOM_ID = 'room_09'
// room_09 上方門框需要提前提示，避免手機搖桿難以對準實際結算圈。
const PROMPT_RADIUS_PADDING = 120

/**
 * 2026-08-20：room_09 的 stage exit 改成兩段式 proximity 流程（原本是走進
 * exit.radius 立刻無過場跳去結算，畫面上一格一格移動時忽然瞬間切換結算
 * 畫面，體感很突兀）：
 * 1. 進入「提示半徑」（結算半徑 + 120）時，HUD 顯示「終點出口｜再靠近即可
 *    結算」，讓玩家知道快到了，不用手機搖桿精準對準那個小圈。
 * 2. 真的進入 exit.radius 才呼叫 AdventureGame.finishStage(true)——
 *    finishStage 現在只負責「鎖住輸入＋開始淡出」，實際建立結算結果延後到
 *    淡出播完（見 AdventureGame.ts 的 pendingFinishWon/commitStageFinish）。
 *
 * 只允許 active room 為 room_09，避免 atlas 世界座標上跟其他房間靠太近時
 * 誤觸發。死亡／對話／戰鬤／換房淡出／結算淡出期間都不檢查。
 */
export function updateExitCheck(game: AdventureGame): string | null {
  if (game.state !== 'explore') return null
  if (game.roomSystem.activeRoomId !== FINAL_ROOM_ID) return null
  if (game.isFinalizingStage) return null

  const { exit } = game.stage
  const distance = dist(game.player.x, game.player.y, exit.x, exit.y)
  if (distance <= exit.radius) {
    game.finishStage(true)
    return 'triggered'
  }
  if (distance <= exit.radius + PROMPT_RADIUS_PADDING) return 'near'
  return null
}

export function getStageExitPrompt(game: AdventureGame): string | null {
  if (game.roomSystem.activeRoomId !== FINAL_ROOM_ID || game.state !== 'explore') return null
  const { exit } = game.stage
  const distance = dist(game.player.x, game.player.y, exit.x, exit.y)
  return distance <= exit.radius + PROMPT_RADIUS_PADDING ? '終點出口｜再靠近即可結算' : null
}
