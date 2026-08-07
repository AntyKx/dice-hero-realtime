import { useEffect, useState } from 'react'
import { HEROES } from '../data'
import { DUNGEON_DEFS } from '../dungeon'
import type { MetaState } from '../types'
import type { RunSave } from '../save'
import { relativeTime } from '../save'
import type { User } from '../lib/firebase'
import CompendiumScreen from './CompendiumScreen'
import { getPlayerName } from '../scoring'
import WorldCupModal from '../components/WorldCupModal'
import { type WcMatch, fetchWorldCupMatches, findResolvable, findNextPredictable } from '../worldCup'
import { FEATURE_FLAGS } from '../featureFlags'

const BUILD_VERSION = __APP_BUILD__

interface Props {
  meta: MetaState
  savedRun: RunSave | null
  onStartAdventure: () => void
  onEquipment: () => void
  onContinue: (saved: RunSave) => void
  user: User | null
  cloudMsg: string
  onSignIn: () => void
  onSignOut: () => void
  onCloudSave: () => void
  onCloudLoad: () => void
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
  onStartAdventure, onEquipment, onContinue,
  user, cloudMsg, onSignIn, onSignOut, onCloudSave, onCloudLoad,
  onGmMode, onMetaUpdate,
}: Props) {
  const [showCloud, setShowCloud]           = useState(false)
  const [showCompendium, setShowCompendium] = useState(false)
  const [confirmNew, setConfirmNew]         = useState(false)
  const [showWorldCup, setShowWorldCup]     = useState(false)
  const [wcMatches, setWcMatches]           = useState<WcMatch[]>([])
  const [wcRefreshing, setWcRefreshing]     = useState(false)

  useEffect(() => {
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
    <div className="main-menu">
      {showCompendium && <CompendiumScreen onClose={() => setShowCompendium(false)} />}
      {showWorldCup && (
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

      <nav className="mm-nav">

        {/* 繼續冒險：有存檔才顯示 */}
        {savedRun && (
          <button className="mm-btn mm-btn-continue" onClick={() => onContinue(savedRun)}>
            <span className="mm-btn-icon">▶</span>
            <div className="mm-btn-body">
              <div className="mm-btn-title">繼續冒險</div>
              <SavedRunInfo saved={savedRun} />
            </div>
            <span className="mm-btn-chevron">›</span>
          </button>
        )}

        {/* 開始冒險 */}
        <button
          className="mm-btn mm-btn-primary"
          onClick={() => savedRun ? setConfirmNew(true) : onStartAdventure()}
        >
          <span className="mm-btn-icon">⚔️</span>
          <div className="mm-btn-body">
            <div className="mm-btn-title">{savedRun ? '開始新冒險' : '開始冒險'}</div>
            <div className="mm-btn-sub">
              {savedRun
                ? '⚠️ 將覆蓋目前的存檔進度'
                : `選擇英雄，踏上骰子旅途 · 副本 ${Object.values(meta.dungeonProgress ?? {}).filter(p => p.cleared).length}/${DUNGEON_DEFS.length} 通關`}
            </div>
          </div>
          <span className="mm-btn-chevron">›</span>
        </button>

        {/* 英雄 & 裝備（v1 即時制範圍先隱藏，見 FEATURE_FLAGS） */}
        {FEATURE_FLAGS.equipment && (
          <button className="mm-btn mm-btn-secondary" onClick={onEquipment}>
            <span className="mm-btn-icon">🛡️</span>
            <div className="mm-btn-body">
              <div className="mm-btn-title">英雄 &amp; 裝備</div>
              <div className="mm-btn-sub">管理裝備配置，強化你的英雄</div>
            </div>
            <div className="mm-badge-group">
              <span className="mm-gold-badge">💰 {meta.gold}</span>
              <span className="mm-stardust-badge">⭐ {meta.stardust}</span>
            </div>
          </button>
        )}

        {/* 世界盃競猜 */}
        <button className="mm-btn mm-btn-secondary" onClick={openWorldCup}>
          <span className="mm-btn-icon mm-btn-icon-cup">
            <img src="/assets/worldcup-logo.webp" alt="" className="mm-cup-icon-img" />
          </span>
          <div className="mm-btn-body">
            <div className="mm-btn-title">世界盃競猜</div>
            <div className="mm-btn-sub">猜中勝/負/和局，獲得傳奇寶箱與星塵</div>
          </div>
          {wcHasNew && <span className="mm-stardust-badge" style={{ background: '#e07030' }}>NEW</span>}
        </button>

        {/* 雲端存檔 */}
        <button className="mm-btn mm-btn-secondary" onClick={() => setShowCloud(true)}>
          <span className="mm-btn-icon">☁️</span>
          <div className="mm-btn-body">
            <div className="mm-btn-title">雲端存檔</div>
            <div className="mm-btn-sub">
              {user ? `已登入：${user.displayName}` : '使用 Google 帳號跨裝置同步進度'}
            </div>
          </div>
          <span className="mm-btn-chevron">›</span>
        </button>

        {/* 圖鑑 */}
        <button className="mm-btn mm-btn-secondary" onClick={() => setShowCompendium(true)}>
          <span className="mm-btn-icon">📖</span>
          <div className="mm-btn-body">
            <div className="mm-btn-title">圖鑑</div>
            <div className="mm-btn-sub">查看所有遺物與增益卡效果</div>
          </div>
          <span className="mm-btn-chevron">›</span>
        </button>

        {/* 成就（鎖定） */}
        <button className="mm-btn mm-btn-ghost" disabled>
          <span className="mm-btn-icon">🏆</span>
          <div className="mm-btn-body">
            <div className="mm-btn-title">成就</div>
            <div className="mm-btn-sub">即將推出</div>
          </div>
          <span className="mm-btn-chevron" style={{ opacity: .35 }}>🔒</span>
        </button>

      </nav>

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

      {/* 雲端面板 */}
      {showCloud && (
        <div className="mm-panel-overlay" onClick={() => setShowCloud(false)}>
          <div className="cloud-panel" onClick={e => e.stopPropagation()}>
            {!user ? (
              <button className="cloud-google-btn" onClick={onSignIn}>
                <img src="https://www.google.com/favicon.ico" width={18} height={18} alt="" />
                使用 Google 帳號登入
              </button>
            ) : (
              <>
                <div className="cloud-user-row">
                  {user.photoURL && <img src={user.photoURL} width={28} height={28} className="cloud-avatar" alt="" />}
                  <span className="cloud-username">{user.displayName}</span>
                  <button className="cloud-signout" onClick={onSignOut}>登出</button>
                </div>
                <div className="cloud-uid" title="點擊複製" onClick={() => navigator.clipboard?.writeText(user.uid)}>
                  UID: {user.uid}
                </div>
                <div className="cloud-actions">
                  <button className="primary cloud-btn" onClick={onCloudSave}>⬆ 上傳存檔</button>
                  <button className="ghost cloud-btn" onClick={onCloudLoad}>⬇ 下載存檔</button>
                </div>
                {cloudMsg && <div className="cloud-msg">{cloudMsg}</div>}
                <button className="ghost" style={{ marginTop: 8, width: '100%', fontSize: '0.85rem' }} onClick={() => setShowCloud(false)}>關閉</button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mm-version" onClick={onGmMode}>{BUILD_VERSION}</div>
    </div>
  )
}
