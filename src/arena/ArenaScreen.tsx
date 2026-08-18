import { useEffect, useRef, useState } from 'react'
import { ArenaGame, type ArenaConfig, type ArenaHudState } from './ArenaGame'
import DiceUpgradeOverlay from './DiceUpgradeOverlay'
import RelicLootOverlay from './RelicLootOverlay'
import type { ArenaCard } from './cards'
import type { ArenaRelic } from './relics'
import type { ArenaZoneType } from './dungeonZones'
import { getCampaignStage } from '../campaign/campaignStages'
import { FOREST_CAMPAIGN_ENEMIES } from './enemies'
import AsterVowIcon from '../components/AsterVowIcon'
import { versionedAsset } from '../data'

interface Props {
  config: ArenaConfig
  onExit: () => void
  /**
   * 一局結束（陣亡或過關）時觸發一次，讓外層把這局戰果寫回持久化的英雄等級/金幣。
   * ownedRelicIds 是這個英雄目前為止永久擁有的遺物清單（含這局新選到的那一個，
   * 若有）——外層要整份覆蓋寫回 heroProgress，不是增量 append。只有 Arena
   * Roguelite Run（沒有 config.campaignStageId）才會觸發這個；森林遺跡固定
   * 關卡走 onCampaignStageEnd，兩條路徑不會同時觸發。
   */
  onRunEnd?: (won: boolean, floorsCleared: number, goldEarned: number, ownedRelicIds: string[]) => void
  /** 森林遺跡固定關卡（2026-08）結算時觸發一次，帶上星星判定結果，外層負責寫回 campaignStageProgress + 首通獎勵。 */
  onCampaignStageEnd?: (result: NonNullable<ArenaHudState['campaignResult']>) => void
}

const INITIAL_HUD: ArenaHudState = {
  hp: 0, maxHp: 0, xp: 0, xpToNext: 1, level: 1, elapsed: 0, fps: 0,
  enemyCount: 0, bossState: 'none', bossHp: 0, bossMaxHp: 0,
  killCount: 0, gameOver: false,
  zoneType: 'battle', zoneIndex: 1, zoneCount: 7,
  ultimateCharge: 0, ultimateMax: 100, bonusGold: 0, runComplete: false, ownedRelicIds: [],
}

const ZONE_LABEL: Record<ArenaZoneType, string> = {
  battle: '戰鬥', elite: '菁英', rest: '補給', card: '祝福', hidden: '秘境', boss: 'BOSS',
}

const JOYSTICK_RADIUS = 50 // px，搖桿可拖曳的最大半徑——浮動搖桿沒有固定底座圖形限制手指移動範圍，比舊版固定搖桿（30px）給多一點空間，手感更鬆

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ArenaScreen({ config, onExit, onRunEnd, onCampaignStageEnd }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<ArenaGame | null>(null)
  const joystickRef = useRef<HTMLDivElement | null>(null)
  const knobRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ active: boolean; pointerId: number; centerX: number; centerY: number }>({ active: false, pointerId: -1, centerX: 0, centerY: 0 })
  const runEndFiredRef = useRef(false)
  const campaignEndFiredRef = useRef(false)
  const [hud, setHud] = useState<ArenaHudState>(INITIAL_HUD)
  const [levelUpOpen, setLevelUpOpen] = useState(false)
  const [bossLootChoices, setBossLootChoices] = useState<ArenaRelic[] | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const game = new ArenaGame(config, setHud, () => setLevelUpOpen(true), choices => setBossLootChoices(choices))
    gameRef.current = game
    game.init(el)
    ;(window as unknown as { __arena?: ArenaGame }).__arena = game
    return () => { gameRef.current = null; game.destroy() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 一局只結算一次（死亡或過關其中一種會把對應旗標設 true，之後 HUD 還會再更新，
  // 用 ref 擋掉重複觸發）。floorsCleared 沿用舊回合制的「已清關卡數」語意：
  // 過關 = 全部 7 區都算清完；死亡 = 目前所在區之前的都已清完（zoneIndex 是目前區,
  // 1-based，所以已清完的是 zoneIndex-1）。
  useEffect(() => {
    if (config.campaignStageId) return // 森林遺跡固定關卡走下面那個 effect，不觸發 onRunEnd
    if (runEndFiredRef.current) return
    if (hud.runComplete) {
      runEndFiredRef.current = true
      onRunEnd?.(true, hud.zoneCount, hud.bonusGold, hud.ownedRelicIds)
    } else if (hud.gameOver) {
      runEndFiredRef.current = true
      onRunEnd?.(false, Math.max(0, hud.zoneIndex - 1), hud.bonusGold, hud.ownedRelicIds)
    }
  }, [config.campaignStageId, hud.runComplete, hud.gameOver, hud.zoneCount, hud.zoneIndex, hud.bonusGold, hud.ownedRelicIds, onRunEnd])

  useEffect(() => {
    if (campaignEndFiredRef.current) return
    if (hud.campaignResult) {
      campaignEndFiredRef.current = true
      onCampaignStageEnd?.(hud.campaignResult)
    }
  }, [hud.campaignResult, onCampaignStageEnd])

  const handleCardChosen = (card: ArenaCard) => {
    gameRef.current?.applyCard(card)
    setLevelUpOpen(false)
  }

  const handleRelicChosen = (relic: ArenaRelic) => {
    gameRef.current?.applyRelic(relic)
    setBossLootChoices(null)
  }

  // 浮動搖桿（2026-08）：取代固定底座圖形，改成「地圖任何地方按下就是搖桿
  // 中心」，省掉常駐佔位的搖桿圖案，手指落點就是虛擬搖桿的錨點，拖曳方向/
  // 距離連續變化，天然支援 8 方向以上。按下瞬間才顯示一個半透明底座+搖桿鈕
  // 在手指位置（純視覺回饋，不佔用平常的畫面空間），放開就消失。
  const updateKnob = (dx: number, dy: number) => {
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`
    gameRef.current?.setMoveDir(dx / JOYSTICK_RADIUS, dy / JOYSTICK_RADIUS)
  }

  const handleFieldPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.active) return // 已經有一根手指在控制搖桿，忽略其他手指（例如另一手扶著平板）
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

  const campaignStage = config.campaignStageId ? getCampaignStage(config.campaignStageId) : undefined
  const bossName = campaignStage?.boss
    ? (FOREST_CAMPAIGN_ENEMIES[campaignStage.boss.bossEnemyId]?.name ?? 'BOSS')
    : '巨龍'

  const xpPct = hud.xpToNext > 0 ? Math.max(0, Math.min(100, (hud.xp / hud.xpToNext) * 100)) : 0
  const hpPct = hud.maxHp > 0 ? Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100)) : 0
  const bossPct = hud.bossMaxHp > 0 ? Math.max(0, Math.min(100, (hud.bossHp / hud.bossMaxHp) * 100)) : 0
  const ultPct = hud.ultimateMax > 0 ? Math.max(0, Math.min(100, (hud.ultimateCharge / hud.ultimateMax) * 100)) : 0
  const ultReady = hud.ultimateCharge >= hud.ultimateMax

  return (
    <div className="arena-screen">
      {/* 浮動搖桿的觸控範圍就是整個畫面——.arena-hud 對非按鈕區域是 pointer-events:none
          穿透的，所以按在血條/計時器等純顯示區域上一樣會落到這裡；按在按鈕/彈窗上則會被
          那些元素自己（pointer-events:auto）先接住，不會誤觸發移動。 */}
      <div
        className="arena-canvas-wrap"
        ref={containerRef}
        onPointerDown={handleFieldPointerDown}
        onPointerMove={handleFieldPointerMove}
        onPointerUp={handleFieldRelease}
        onPointerCancel={handleFieldRelease}
      />

      {/* 浮動搖桿視覺回饋：平常完全不佔畫面空間，手指按下瞬間才在觸點位置浮現一個
          半透明底座+搖桿鈕，放開就淡出——純視覺，pointer-events:none 不攔截觸控。 */}
      <div className="arena-joystick" ref={joystickRef}>
        <div className="arena-joystick-knob" ref={knobRef} />
      </div>

      {/* HUD 疊層：純 React，只讀 ArenaGame 節流丟出來的狀態，不碰 canvas 內部 */}
      <div className="arena-hud">
        <div className="arena-hud-top">
          <div className="arena-timer">{formatTime(hud.elapsed)}</div>
        </div>

        <div className="arena-zone-badge">
          {campaignStage ? `${campaignStage.stageNumber}　${campaignStage.name}` : `${ZONE_LABEL[hud.zoneType]}　${hud.zoneIndex} / ${hud.zoneCount}`}
        </div>

        {hud.bossState === 'alive' && (
          <div className="arena-boss-bar">
            <div className="arena-boss-fill" style={{ width: `${bossPct}%` }} />
            <span className="arena-boss-text">{bossName}　{hud.bossHp} / {hud.bossMaxHp}</span>
          </div>
        )}
        {hud.bossState === 'defeated' && (
          <div className="arena-boss-defeated"><AsterVowIcon name="stage-boss" size={18} /> Boss 擊敗！</div>
        )}

        <div className="arena-fps">FPS {hud.fps} ｜ 敵 {hud.enemyCount}</div>
        {!hud.gameOver && !hud.runComplete && <button className="arena-exit-btn" onClick={onExit}>✕ 返回</button>}

        {/* ── 右下：頭像+HP+必殺技能量條，仿主流手遊 HUD 排版 ── */}
        <div className="arena-ultimate-cluster">
          <div className="arena-ultimate-info">
            <div className="arena-portrait-wrap">
              <img className="arena-portrait" src={versionedAsset(`/assets/avatars/${config.heroId}.jpg`)} alt={config.heroName} />
              <div className="arena-level-badge">Lv.{hud.level}</div>
            </div>
            <div className="arena-ultimate-bars">
              <div className="arena-mini-hp-bar"><div className="arena-mini-hp-fill" style={{ width: `${hpPct}%` }} /></div>
              <div className="arena-mini-xp-bar"><div className="arena-mini-xp-fill" style={{ width: `${xpPct}%` }} /></div>
              <div className="arena-ultimate-bar"><div className="arena-ultimate-fill" style={{ width: `${ultPct}%` }} /></div>
            </div>
          </div>
          <button
            className={`arena-ultimate-btn${ultReady ? ' ready' : ''}`}
            disabled={!ultReady}
            onClick={() => gameRef.current?.tryActivateUltimate()}
          >
            必殺技
          </button>
        </div>
      </div>

      {levelUpOpen && !hud.gameOver && <DiceUpgradeOverlay onComplete={handleCardChosen} />}
      {bossLootChoices && !hud.gameOver && <RelicLootOverlay choices={bossLootChoices} onComplete={handleRelicChosen} />}

      {/* 森林遺跡固定關卡結算：跟下面兩個泛用 Roguelite 結算畫面互斥
          （finishCampaignStage() 會同時把 gameOver/runComplete 其中一個設成
          true，但只要 campaignResult 有值就一律顯示這個星星結算變體）。 */}
      {hud.campaignResult && (
        <div className="arena-gameover-overlay">
          <div className={`arena-gameover-title${hud.campaignResult.won ? ' arena-runcomplete-title' : ''}`}>
            {hud.campaignResult.won ? '關卡完成！' : '挑戰失敗'}
          </div>
          {hud.campaignResult.won && (
            <div className="arena-campaign-result-stars">
              {[0, 1, 2].map(i => (
                <span key={i} className={`cms-star${i < hud.campaignResult!.stars ? ' filled' : ''}`}>★</span>
              ))}
            </div>
          )}
          <div className="arena-gameover-stats">
            <div className="arena-gameover-row"><span>存活時間</span><strong>{formatTime(hud.elapsed)}</strong></div>
            <div className="arena-gameover-row"><span>等級</span><strong>Lv.{hud.level}</strong></div>
            <div className="arena-gameover-row"><span>擊殺數</span><strong>{hud.killCount}</strong></div>
            {!!hud.campaignResult.bonusEnhanceStones && (
              <div className="arena-gameover-row"><span>探索額外強化石</span><strong>+{hud.campaignResult.bonusEnhanceStones}</strong></div>
            )}
          </div>
          {hud.campaignResult.won && campaignStage && (
            <div className="arena-campaign-result-conditions">
              {campaignStage.starConditions.map((c, i) => (
                <div key={i} className="arena-campaign-result-condition">
                  <span className={hud.campaignResult!.starConditionsMet[i] ? 'met' : 'unmet'}>
                    {hud.campaignResult!.starConditionsMet[i] ? '★' : '☆'}
                  </span>
                  <span>{c.description}</span>
                </div>
              ))}
            </div>
          )}
          <button className="arena-gameover-btn" onClick={onExit}>返回關卡地圖</button>
        </div>
      )}

      {hud.gameOver && !hud.campaignResult && (
        <div className="arena-gameover-overlay">
          <div className="arena-gameover-title">陣亡</div>
          <div className="arena-gameover-stats">
            <div className="arena-gameover-row"><span>存活時間</span><strong>{formatTime(hud.elapsed)}</strong></div>
            <div className="arena-gameover-row"><span>等級</span><strong>Lv.{hud.level}</strong></div>
            <div className="arena-gameover-row"><span>擊殺數</span><strong>{hud.killCount}</strong></div>
            {hud.bossState === 'defeated' && <div className="arena-gameover-boss"><AsterVowIcon name="stage-boss" size={18} /> 擊敗了 Boss</div>}
          </div>
          <button className="arena-gameover-btn" onClick={onExit}>返回主選單</button>
        </div>
      )}

      {hud.runComplete && !hud.gameOver && !hud.campaignResult && (
        <div className="arena-gameover-overlay">
          <div className="arena-gameover-title arena-runcomplete-title">關卡完成！</div>
          <div className="arena-gameover-stats">
            <div className="arena-gameover-row"><span>存活時間</span><strong>{formatTime(hud.elapsed)}</strong></div>
            <div className="arena-gameover-row"><span>等級</span><strong>Lv.{hud.level}</strong></div>
            <div className="arena-gameover-row"><span>擊殺數</span><strong>{hud.killCount}</strong></div>
            <div className="arena-gameover-row"><span>賺得金幣</span><strong>{hud.bonusGold}</strong></div>
            <div className="arena-gameover-boss"><AsterVowIcon name="stage-boss" size={18} /> 擊敗了 Boss</div>
          </div>
          <button className="arena-gameover-btn" onClick={onExit}>返回主選單</button>
        </div>
      )}
    </div>
  )
}
