import { useEffect, useState } from 'react'
import { HEROES } from '../data'
import { DUNGEON_DEFS } from '../dungeon'
import type { MetaState } from '../types'
import type { RunSave } from '../save'
import { relativeTime } from '../save'
import type { User } from '../lib/firebase'
import { getPlayerName } from '../scoring'
import WorldCupModal from '../components/WorldCupModal'
import { type WcMatch, fetchWorldCupMatches, findResolvable, findNextPredictable } from '../worldCup'
import { FEATURE_FLAGS } from '../featureFlags'

const BUILD_VERSION = __APP_BUILD__

type NavigatorWithConnection = Navigator & {
  connection?: { effectiveType?: string; saveData?: boolean }
}

/** 2026-08 首頁微動態，同月改用「前進／倒放」16 秒 pingpong 版影片（取代
 * 原本 8 秒版）——原本 8 秒版每次循環都要硬切回第一幀，即使已經用 Blob
 * 預先載入避免了網路緩衝造成的頓感，硬切本身的視覺跳動還是在；pingpong
 * 版播到底之後直接倒放回去，循環點完全無感。掛載條件跟隨美術方提供的
 * 移植手冊：尊重 prefers-reduced-motion、避免在省流量模式／2G-slow-2g
 * 網路下硬塞一支 ~3MB 的影片，延遲 900ms 才掛載避免搶首屏繪製資源。 */
function shouldLoadHomeMotion() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const connection = (navigator as NavigatorWithConnection).connection
  const constrainedNetwork = connection?.saveData === true || ['slow-2g', '2g'].includes(connection?.effectiveType ?? '')
  return !prefersReducedMotion && !constrainedNetwork
}

function useHomeMotionEnabled() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    if (!shouldLoadHomeMotion()) return
    const timer = window.setTimeout(() => setEnabled(true), 900)
    return () => window.clearTimeout(timer)
  }, [])
  return enabled
}

interface Props {
  meta: MetaState
  savedRun: RunSave | null
  onStartAdventure: () => void
  onContinue: (saved: RunSave) => void
  user: User | null
  onSetFateLevel: (lv: number) => void
  onGmMode: () => void
  onMetaUpdate: (fn: (prev: MetaState) => MetaState) => void
}

function SavedRunInfo({ saved }: { saved: RunSave }) {
  const member = saved.run.party[saved.run.activePartyIdx]
  const hero   = HEROES.find(h => h.id === member.heroId)
  const floor  = saved.run.nodes.reduce((max, n) => n.cleared ? Math.max(max, n.floor) : max, 0)
  const phaseLabel: Partial<Record<string, string>> = {
    map: '地圖', battle: '戰鬥中', reward: '選卡', relic_reward: '選遺物',
    shop: '商店', rest: '休息點', event: '事件', equipment_drop: '裝備掉落',
  }
  return (
    <div className="mm-save-info">
      <span className="msi-hero">{hero?.name ?? '英雄'}</span>
      <span className="msi-sep">·</span>
      <span>第 {floor} 層</span>
      <span className="msi-sep">·</span>
      <span>❤️ {member.hp}/{member.maxHp}</span>
      <span className="msi-sep">·</span>
      <span>🃏 {saved.run.cards.length}</span>
      {saved.run.relics.length > 0 && <><span className="msi-sep">·</span><span>💎 {saved.run.relics.length}</span></>}
      <span className="msi-sep">·</span>
      <span className="msi-phase">{phaseLabel[saved.phase.type] ?? saved.phase.type}</span>
      <span className="msi-time">{relativeTime(saved.savedAt)}</span>
    </div>
  )
}

export default function MainMenuScreen({
  meta, savedRun,
  onStartAdventure, onContinue,
  user,
  onGmMode, onMetaUpdate,
}: Props) {
  const homeMotionEnabled                  = useHomeMotionEnabled()
  const [confirmNew, setConfirmNew]         = useState(false)
  const [showWorldCup, setShowWorldCup]     = useState(false)
  const [wcMatches, setWcMatches]           = useState<WcMatch[]>([])
  const [wcRefreshing, setWcRefreshing]     = useState(false)

  useEffect(() => {
    if (!FEATURE_FLAGS.worldCup) return
    fetchWorldCupMatches().then(setWcMatches)
    // 主畫面常常開著不關，定期檢查一次（內部仍依 30 分快取 TTL 判斷要不要真的打 API）
    const interval = window.setInterval(() => { fetchWorldCupMatches().then(setWcMatches) }, 5 * 60 * 1000)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchWorldCupMatches().then(setWcMatches) }
    document.addEventListener('visibilitychange', onVisible)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  const refreshWorldCup = async () => {
    setWcRefreshing(true)
    try { setWcMatches(await fetchWorldCupMatches(true)) } finally { setWcRefreshing(false) }
  }

  const openWorldCup = () => {
    setShowWorldCup(true)
    refreshWorldCup()
  }

  const wcPicks = meta.worldCup?.picks ?? []
  const wcHasNew = findResolvable(wcMatches, wcPicks).length > 0 ||
    (!!findNextPredictable(wcMatches, wcPicks) && !wcPicks.some(p => !p.resolved))

  return (
    <div className="main-menu av-home">
      {FEATURE_FLAGS.worldCup && showWorldCup && (
        <WorldCupModal
          meta={meta} matches={wcMatches} onMetaUpdate={onMetaUpdate} onClose={() => setShowWorldCup(false)}
          onRefresh={refreshWorldCup} refreshing={wcRefreshing}
        />
      )}

      {user && (
        <div className="mm-player-chip">
          <span className="mm-player-icon">👤</span>
          <span className="mm-player-label">{getPlayerName()}</span>
        </div>
      )}

      {/* ASTERVOW 主視覺（2026-08 品牌重製，同月數次調整）：中間繞了一圈
          「不裁切正片＋模糊底圖延伸」的做法（避免裁到 ASTERVOW 文字），
          但使用者真機比對後明確選擇：滿版優先，文字被裁一點點可以接受，
          改回 object-fit:cover 直接鋪滿整個 .main-menu.av-home（不再需要
          .av-home-backdrop／.av-home-stage 這層疊加，直接單層滿版）。
          object-position:top 讓裁切集中在圖片下緣（角色腳下的地面/倒影，
          內容最不重要的區域），CTA 疊在清晰圖下緣的地面反光區，避免壓到
          角色本體（.av-home-safe 的 bottom 用 max()，同時保留跟角色的
          安全距離與 safe-area）。
          2026-08 微動態版：同一張構圖的 16 秒無聲前進／倒放循環影片；
          homeMotionEnabled 為 false 時（尊重 prefers-reduced-motion /
          省流量模式 / 2G 網路，或還沒過 900ms 延遲）維持顯示原本的靜態
          <img>，兩者是同一張圖，切換不會閃爍。 */}
      {homeMotionEnabled ? (
        <video
          className="av-home-art"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="/assets/astervow-home-bg.png"
          aria-label="ASTERVOW"
          style={{ pointerEvents: 'none' }}
        >
          <source src="/assets/astervow-home-motion-pingpong.mp4" type="video/mp4" />
        </video>
      ) : (
        <img src="/assets/astervow-home-bg.png" alt="ASTERVOW" className="av-home-art" />
      )}

      <div className="av-home-safe">
        {/* 繼續冒險：有存檔才顯示，出現在主 CTA 上方的次要提示列 */}
        {savedRun && (
          <button className="av-glass-btn av-home-continue" onClick={() => onContinue(savedRun)}>
            <span>▶ 繼續冒險</span>
            <SavedRunInfo saved={savedRun} />
          </button>
        )}

        {/* 唯一主要 CTA：進入星界大廳 */}
        <button
          className="av-cta-btn av-home-cta"
          onClick={() => savedRun ? setConfirmNew(true) : onStartAdventure()}
        >
          <span>{savedRun ? '開始新遠征' : '進入星界大廳'}</span>
          <span className="av-home-cta-sub">CONTINUE YOUR EXPEDITION</span>
        </button>
        {savedRun && <div className="av-home-warn">⚠️ 將覆蓋目前的存檔進度</div>}

        {/* 2026-08：英雄與裝備/雲端存檔/圖鑑/成就的入口移到大廳（見
            AdventureReadyScreen 的左上玩家資訊列＋右上抽屜選單），首頁不
            再重複放一份。世界盃目前仍是 FEATURE_FLAGS.worldCup 關閉狀態，
            邏輯保留、UI 入口留在原地待之後開放。 */}
        {FEATURE_FLAGS.worldCup && (
          <div className="av-home-utility">
            <button className="av-glass-btn av-home-icon-btn" onClick={openWorldCup} aria-label="世界盃競猜">
              <span aria-hidden="true">🏆</span>
              <span className="av-home-icon-label">競猜</span>
              {wcHasNew && <span className="av-home-icon-badge" aria-hidden="true" />}
            </button>
          </div>
        )}
      </div>

      {/* 確認覆蓋 */}
      {confirmNew && (
        <div className="mm-panel-overlay" onClick={() => setConfirmNew(false)}>
          <div className="mm-confirm" onClick={e => e.stopPropagation()}>
            <div className="mm-confirm-text">
              開始新冒險會<strong>永久覆蓋</strong>目前「繼續冒險」的存檔進度，確定要開始嗎？
            </div>
            <div className="mm-confirm-btns">
              <button className="mm-confirm-cancel" onClick={() => setConfirmNew(false)}>取消</button>
              <button className="mm-confirm-ok" onClick={() => { setConfirmNew(false); onStartAdventure() }}>覆蓋並開始</button>
            </div>
          </div>
        </div>
      )}

      <div className="mm-version" onClick={onGmMode}>{BUILD_VERSION}</div>
    </div>
  )
}
