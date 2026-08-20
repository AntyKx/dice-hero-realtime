import { useEffect, useRef, useState } from 'react'
import { AdventureGame, type AdventureConfig } from './AdventureGame'
import type { AdventureHudState, AdventureStageResult } from './adventureTypes'
import AsterVowIcon from '../components/AsterVowIcon'
import { versionedAsset } from '../data'

interface Props {
  config: AdventureConfig
  onExit: () => void
  onAdventureStageEnd?: (result: AdventureStageResult) => void
}

const INITIAL_HUD: AdventureHudState = {
  state: 'explore',
  purpleCoinCount: 0, purpleCoinTotal: 0,
  starPieceCount: 0, starPieceTotal: 0,
  activeDialogue: null, interactionPrompt: null, stageExitPrompt: null, activeQuestTitle: null, toast: null,
  debugScreenText: null,
  stageResult: null,
  minimap: null,
  heroId: '', heroName: '', heroLevel: 1, partyHeroIds: [],
  playerHp: 0, playerMaxHp: 0,
}

const JOYSTICK_RADIUS = 50

// 迷你地圖節點連線圖的格子尺寸（svg 座標系，跟畫面 px 無關，靠 svg 的
// width/height 屬性縮放到實際顯示大小）。
const MINIMAP_CELL = 16
const MINIMAP_GAP = 10
const MINIMAP_PAD = 8
function minimapNodeCenter(gridX: number, gridY: number) {
  return {
    x: MINIMAP_PAD + gridX * (MINIMAP_CELL + MINIMAP_GAP) + MINIMAP_CELL / 2,
    y: MINIMAP_PAD + gridY * (MINIMAP_CELL + MINIMAP_GAP) + MINIMAP_CELL / 2,
  }
}

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

  const minimapCols = hud.minimap ? Math.max(...hud.minimap.rooms.map(r => r.gridX)) + 1 : 0
  const minimapRows = hud.minimap ? Math.max(...hud.minimap.rooms.map(r => r.gridY)) + 1 : 0
  const minimapW = MINIMAP_PAD * 2 + minimapCols * MINIMAP_CELL + Math.max(0, minimapCols - 1) * MINIMAP_GAP
  const minimapH = MINIMAP_PAD * 2 + minimapRows * MINIMAP_CELL + Math.max(0, minimapRows - 1) * MINIMAP_GAP
  const minimapRoomById = hud.minimap ? new Map(hud.minimap.rooms.map(r => [r.id, r])) : null
  const hpPct = hud.playerMaxHp > 0 ? Math.max(0, Math.min(100, (hud.playerHp / hud.playerMaxHp) * 100)) : 0
  const partyOthers = hud.partyHeroIds.filter(id => id !== hud.heroId)

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
        {/* 2026-08-20：迷你地圖畫成節點連線圖（像參考圖那種走廊連線+目前
            位置標記），不是單純一格一格的方塊。只有走過的房間才會出現節點
            （hud.minimap.rooms[].discovered），連線只有在兩端房間都探索過
            時才畫出來（edges 已經在 AdventureGame.ts 端過濾好），完全沒探
            索過的房間連一個點都不會顯示，不會提前爆雷地圖長怎樣。 */}
        {hud.minimap && minimapRoomById && (
          <svg className="adv-minimap" width={minimapW} height={minimapH} viewBox={`0 0 ${minimapW} ${minimapH}`}>
            {hud.minimap.edges.map(e => {
              const ra = minimapRoomById.get(e.a)
              const rb = minimapRoomById.get(e.b)
              if (!ra || !rb) return null
              const pa = minimapNodeCenter(ra.gridX, ra.gridY)
              const pb = minimapNodeCenter(rb.gridX, rb.gridY)
              return <line key={`${e.a}-${e.b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} className="adv-minimap-edge" />
            })}
            {hud.minimap.rooms.filter(r => r.discovered).map(r => {
              const p = minimapNodeCenter(r.gridX, r.gridY)
              const active = r.id === hud.minimap!.activeRoomId
              return (
                <circle
                  key={r.id}
                  cx={p.x} cy={p.y} r={active ? 5 : 4}
                  className={`adv-minimap-node${active ? ' active' : ''}`}
                />
              )
            })}
          </svg>
        )}

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

        {hud.stageExitPrompt && hud.state === 'explore' && (
          <div className="adv-stage-exit-prompt" role="status">
            <span className="adv-stage-exit-arrow">✦</span>
            <span>{hud.stageExitPrompt}</span>
          </div>
        )}

        {canInteract && (
          <button className="adv-interact-btn" onClick={() => gameRef.current?.tryInteract()}>
            {hud.interactionPrompt}
          </button>
        )}

        {/* 2026-08-20：底下英雄資訊列——之前的探索畫面完全沒地方看自己的
            HP，只有死掉那一刻才知道血空了。比照 ArenaScreen.tsx 右下角
            頭像+血條那套排版，隊伍其他成員縮小顯示在旁邊。 */}
        {hud.heroId && (
          <div className="adv-hero-info-bar">
            <div className="adv-hero-portrait-wrap">
              <img className="adv-hero-portrait" src={versionedAsset(`/assets/avatars/${hud.heroId}.jpg`)} alt={hud.heroName} />
              <div className="adv-hero-level-badge">Lv.{hud.heroLevel}</div>
            </div>
            <div className="adv-hero-info-main">
              <div className="adv-hero-name">{hud.heroName}</div>
              <div className="adv-hero-hp-bar"><div className="adv-hero-hp-fill" style={{ width: `${hpPct}%` }} /></div>
            </div>
            {partyOthers.length > 0 && (
              <div className="adv-party-icons">
                {partyOthers.map(id => (
                  <img key={id} className="adv-party-icon" src={versionedAsset(`/assets/avatars/${id}.jpg`)} alt={id} />
                ))}
              </div>
            )}
          </div>
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
            {hud.stageResult.pendingGold > 0 && <div className="adv-result-row"><span>探索金幣</span><strong>+{hud.stageResult.pendingGold}</strong></div>}
            {hud.stageResult.pendingEnhanceStones > 0 && <div className="adv-result-row"><span>強化石</span><strong>+{hud.stageResult.pendingEnhanceStones}</strong></div>}
            {hud.stageResult.pendingHeroExp > 0 && <div className="adv-result-row"><span>英雄經驗</span><strong>+{hud.stageResult.pendingHeroExp}</strong></div>}
          </div>
          <button className="adv-result-btn" onClick={onExit}>返回關卡地圖</button>
        </div>
      )}
    </div>
  )
}
