import { useEffect, useRef, useState } from 'react'
import { AdventureGame, type AdventureConfig } from './AdventureGame'
import type { AdventureHudState, AdventureStageResult } from './adventureTypes'
import AsterVowIcon from '../components/AsterVowIcon'

interface Props {
  config: AdventureConfig
  onExit: () => void
  onAdventureStageEnd?: (result: AdventureStageResult) => void
}

const INITIAL_HUD: AdventureHudState = {
  state: 'explore',
  purpleCoinCount: 0, purpleCoinTotal: 0,
  starPieceCount: 0, starPieceTotal: 0,
  activeDialogue: null, interactionPrompt: null, activeQuestTitle: null, toast: null,
  debugScreenText: null,
  stageResult: null,
}

const JOYSTICK_RADIUS = 50

/** Adventure Stage 探索畫面：跟 ArenaScreen.tsx 同款「canvas + React HUD 疊層」
 * 架構——canvas 掛 AdventureGame 的 Pixi Application，HUD 純讀
 * AdventureGame 節流丟出來的狀態，不碰 canvas 內部。 */
export default function AdventureStageScreen({ config, onExit, onAdventureStageEnd }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<AdventureGame | null>(null)
  const joystickRef = useRef<HTMLDivElement | null>(null)
  const knobRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ active: boolean; pointerId: number; centerX: number; centerY: number }>({ active: false, pointerId: -1, centerX: 0, centerY: 0 })
  const stageEndFiredRef = useRef(false)
  const [hud, setHud] = useState<AdventureHudState>(INITIAL_HUD)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const game = new AdventureGame(config, setHud)
    gameRef.current = game
    game.init(el)
    ;(window as unknown as { __adventure?: AdventureGame }).__adventure = game
    return () => { gameRef.current = null; game.destroy() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (stageEndFiredRef.current) return
    if (!hud.stageResult) return
    const result = gameRef.current?.buildStageResult()
    if (!result) return
    stageEndFiredRef.current = true
    onAdventureStageEnd?.(result)
  }, [hud.stageResult, onAdventureStageEnd])

  const updateKnob = (dx: number, dy: number) => {
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`
    gameRef.current?.setMoveDir(dx / JOYSTICK_RADIUS, dy / JOYSTICK_RADIUS)
  }

  const handleFieldPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.active) return
    dragRef.current = { active: true, pointerId: e.pointerId, centerX: e.clientX, centerY: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
    if (joystickRef.current) {
      joystickRef.current.style.left = `${e.clientX}px`
      joystickRef.current.style.top = `${e.clientY}px`
      joystickRef.current.style.opacity = '1'
    }
    updateKnob(0, 0)
  }

  const handleFieldPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || e.pointerId !== dragRef.current.pointerId) return
    let dx = e.clientX - dragRef.current.centerX
    let dy = e.clientY - dragRef.current.centerY
    const dist = Math.hypot(dx, dy)
    if (dist > JOYSTICK_RADIUS) { dx = (dx / dist) * JOYSTICK_RADIUS; dy = (dy / dist) * JOYSTICK_RADIUS }
    updateKnob(dx, dy)
  }

  const handleFieldRelease = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== dragRef.current.pointerId) return
    dragRef.current.active = false
    updateKnob(0, 0)
    if (joystickRef.current) joystickRef.current.style.opacity = '0'
  }

  const showJoystick = hud.state === 'explore' || hud.state === 'combat'
  const canInteract = hud.state === 'explore' && !!hud.interactionPrompt
  const showDialogueBox = hud.state === 'dialogue' || hud.state === 'cutscene'

  return (
    <div className="adv-screen">
      {/* 2026-08-20：pointermove/up/cancel 故意不跟著 showJoystick 一起關掉——
          如果玩家走進對話/劇情 trigger 時手指還按著搖桿，state 會在 drag
          進行中切離 explore/combat，showJoystick 變 false；只有 pointerdown
          需要看 showJoystick（不能在非探索狀態開新的 drag），move/up/cancel
          一定要留著，才能正確收掉那個還在進行中的 drag，不然 dragRef 會卡在
          active=true，回到 explore 後新的觸控會被 handleFieldPointerDown
          開頭的 guard 直接吃掉，變成搖桿完全沒反應。 */}
      <div
        className="adv-canvas-wrap"
        ref={containerRef}
        onPointerDown={showJoystick ? handleFieldPointerDown : undefined}
        onPointerMove={handleFieldPointerMove}
        onPointerUp={handleFieldRelease}
        onPointerCancel={handleFieldRelease}
      />

      {showJoystick && (
        <div className="adv-joystick" ref={joystickRef}>
          <div className="adv-joystick-knob" ref={knobRef} />
        </div>
      )}

      <div className="adv-hud">
        <button className="adv-exit-btn" onClick={onExit}>✕ 返回</button>
        {/* Debug Art Mode（文件第四節）：手機沒有 F2，改成常駐小按鈕，疊出
            collider/trigger/combatZone/secret/NPC互動範圍/謎題/收集品半徑
            的除錯外框，方便核對美術跟玩法座標有沒有對齊。 */}
        <button className="adv-debug-btn" onClick={() => gameRef.current?.toggleDebugArtMode()}>🐞</button>
        {hud.debugScreenText && <div className="adv-debug-screen-text">{hud.debugScreenText}</div>}

        <div className="adv-counters">
          <span className="adv-counter"><AsterVowIcon name="system-gold" size={14} />{hud.purpleCoinCount}/{hud.purpleCoinTotal}</span>
          <span className="adv-counter"><AsterVowIcon name="system-stardust" size={14} />{hud.starPieceCount}/{hud.starPieceTotal}</span>
        </div>

        {hud.activeQuestTitle && <div className="adv-quest-badge">📜 {hud.activeQuestTitle}</div>}

        {hud.toast && <div className="adv-toast">{hud.toast}</div>}

        {canInteract && (
          <button className="adv-interact-btn" onClick={() => gameRef.current?.tryInteract()}>
            {hud.interactionPrompt}
          </button>
        )}
      </div>

      {showDialogueBox && hud.activeDialogue && (
        <div className="adv-dialogue-box" onClick={() => gameRef.current?.tryInteract()}>
          <div className="adv-dialogue-speaker">{hud.activeDialogue.speaker}</div>
          <div className="adv-dialogue-text">{hud.activeDialogue.text}</div>
          <div className="adv-dialogue-hint">{hud.activeDialogue.hasMore ? '點擊繼續 ▸' : '點擊關閉'}</div>
        </div>
      )}

      {hud.stageResult && (
        <div className="adv-result-overlay">
          <div className={`adv-result-title${hud.stageResult.won ? ' won' : ''}`}>
            {hud.stageResult.won ? '關卡完成！' : '挑戰失敗'}
          </div>
          {hud.stageResult.won && (
            <div className="adv-result-stars">
              {[0, 1, 2].map(i => (
                <span key={i} className={`cms-star${i < hud.stageResult!.stars ? ' filled' : ''}`}>★</span>
              ))}
            </div>
          )}
          <div className="adv-result-stats">
            <div className="adv-result-row"><span>紫幣</span><strong>{hud.stageResult.purpleCoinCount} / {hud.purpleCoinTotal}</strong></div>
            <div className="adv-result-row"><span>星星碎片</span><strong>{hud.stageResult.starPieceCount} / {hud.starPieceTotal}</strong></div>
            <div className="adv-result-row"><span>支線任務</span><strong>{hud.stageResult.questCompleted ? '已完成' : '未完成'}</strong></div>
          </div>
          <button className="adv-result-btn" onClick={onExit}>返回關卡地圖</button>
        </div>
      )}
    </div>
  )
}
