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

/** 2026-08 首頁微動態：使用者要求尊重 prefers-reduced-motion，這裡用
 * JS 判斷（不只是 CSS 隱藏）直接不掛載 <video>，避免降級使用者仍下載/
 * 播放影片。 */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** 首頁背景影片只有 8 秒、~1.8MB，原本用 <source src="..."> 直接串流播放
 * 時，瀏覽器在迴圈接點常常要重新跟網路要資料，造成使用者反映的「循環時
 * 短暫延遲/卡頓」。改成先用 fetch 把整支影片抓成 Blob 存進記憶體，完全
 * 載入完才掛載 <video src={blobUrl}>——迴圈時是從本地記憶體重播，不會再
 * 卡在網路緩衝。載入完成前畫面維持顯示 poster 靜態圖（跟影片首幀同一張
 * 圖），不會有明顯切換閃爍。 */
function useVideoBlobUrl(src: string, enabled: boolean) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!enabled) { setBlobUrl(null); return }
    let cancelled = false
    let objectUrl: string | null = null
    fetch(src)
      .then(res => res.blob())
      .then(blob => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src, enabled])
  return blobUrl
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
  const prefersReducedMotion               = usePrefersReducedMotion()
  const homeMotionBlobUrl = useVideoBlobUrl('/assets/astervow-home-motion.mp4', !prefersReducedMotion)
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

      {/* ASTERVOW 主視覺（2026-08 品牌重製）：圖片本身已經包含 logo/星環/
          職業角色，用原生比例的 <img> 而不是 background-size:cover，確保
          任何裝置寬高比都不會裁掉角色或 logo——寧可留白，不要裁切。
          2026-08 微動態版：同一張構圖的 8 秒無聲循環影片（星塵漂移/星環
          呼吸/角色髮絲披風微動）。整支影片先用 fetch 抓成 Blob 存進記憶體
          （useVideoBlobUrl）才掛載 <video>，迴圈時從本地重播不會卡在網路
          緩衝；載入完成前 / 載入失敗 / 瀏覽器不支援 / prefers-reduced-motion
          時都維持顯示原本的靜態 <img>，兩者是同一張圖，切換不會閃爍。 */}
      {!prefersReducedMotion && homeMotionBlobUrl ? (
        <video
          className="av-home-art"
          autoPlay
          loop
          muted
          playsInline
          poster="/assets/astervow-home-bg.png"
          aria-label="ASTERVOW"
          style={{ pointerEvents: 'none' }}
          src={homeMotionBlobUrl}
        />
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
