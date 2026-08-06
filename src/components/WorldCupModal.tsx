import { useEffect, useRef, useState } from 'react'
import type { MetaState, WorldCupPick, WorldCupPickChoice } from '../types'
import { type WcMatch, findResolvable, isMatchFinished, PICK_LABEL } from '../worldCup'
import GroupStandingsModal from './GroupStandingsModal'
import WorldCupPlayerLeaderboardModal from './WorldCupPlayerLeaderboardModal'
import MyPredictionsModal from './MyPredictionsModal'
import Flag from './Flag'

interface Props {
  meta: MetaState
  matches: WcMatch[]
  onMetaUpdate: (fn: (prev: MetaState) => MetaState) => void
  onClose: () => void
  onRefresh: () => void
  refreshing: boolean
}

export default function WorldCupModal({ meta, matches, onMetaUpdate, onClose, onRefresh, refreshing }: Props) {
  const resolvedOnceRef = useRef(false)
  const [justResolved, setJustResolved] = useState<{ home: string; away: string; won: boolean }[]>([])
  const [justUnlocked, setJustUnlocked] = useState(false)
  const [showStandings, setShowStandings] = useState(false)
  const [showPlayerBoard, setShowPlayerBoard] = useState(false)
  const [showMyPredictions, setShowMyPredictions] = useState(false)

  useEffect(() => {
    if (resolvedOnceRef.current) return
    const picks = meta.worldCup?.picks ?? []
    const resolvable = findResolvable(matches, picks)
    if (resolvable.length === 0) return
    resolvedOnceRef.current = true

    let unlockedChest = false
    const resolvedIds = new Set(resolvable.map(r => r.pick.matchId))
    const wonById = new Map(resolvable.map(r => [r.pick.matchId, r.won]))

    onMetaUpdate(prev => {
      const prevWc = prev.worldCup ?? { picks: [], successCount: 0 }
      let stardust = prev.stardust
      let successCount = prevWc.successCount
      const items = [...(prev.items ?? [])]
      const addItem = (id: string, count: number) => {
        const existing = items.find(i => i.id === id)
        if (existing) existing.count += count
        else items.push({ id, count })
      }

      for (const r of resolvable) {
        if (r.won) {
          stardust += 500
          addItem('chest_legendary', 1)
          successCount += 1
          if (successCount >= 5) {
            successCount -= 5
            addItem('chest_role_legendary', 1)
            unlockedChest = true
          }
        }
      }

      const newPicks = prevWc.picks.map(p =>
        resolvedIds.has(p.matchId) ? { ...p, resolved: true, won: wonById.get(p.matchId) } : p
      )

      return { ...prev, stardust, items, worldCup: { picks: newPicks, successCount } }
    })

    setJustResolved(resolvable.map(r => ({ home: r.pick.home, away: r.pick.away, won: r.won })))
    setJustUnlocked(unlockedChest)
  }, [matches, meta.worldCup, onMetaUpdate])

  const picks = meta.worldCup?.picks ?? []
  const successCount = meta.worldCup?.successCount ?? 0
  const pickByMatchId = new Map(picks.map(p => [p.matchId, p]))

  // 今日賽程；若今天沒比賽，往後找最近有比賽的那一天
  const todayStr = new Date().toISOString().slice(0, 10)
  const upcomingDates = Array.from(new Set(matches.filter(m => m.date >= todayStr).map(m => m.date))).sort()
  const scheduleDate = upcomingDates[0] ?? todayStr
  const scheduleMatches = matches.filter(m => m.date === scheduleDate)

  const makePick = (m: WcMatch, choice: WorldCupPickChoice) => {
    onMetaUpdate(prev => {
      const prevWc = prev.worldCup ?? { picks: [], successCount: 0 }
      const newPick: WorldCupPick = { matchId: m.id, home: m.home, away: m.away, date: m.date, pick: choice, resolved: false }
      return { ...prev, worldCup: { ...prevWc, picks: [...prevWc.picks, newPick] } }
    })
  }

  if (showStandings) return (
    <GroupStandingsModal matches={matches} onClose={() => setShowStandings(false)} onRefresh={onRefresh} refreshing={refreshing} />
  )
  if (showPlayerBoard) return <WorldCupPlayerLeaderboardModal onClose={() => setShowPlayerBoard(false)} />
  if (showMyPredictions) return (
    <MyPredictionsModal picks={picks} successCount={successCount} onClose={() => setShowMyPredictions(false)} />
  )

  return (
    <div className="chest-modal-overlay wc-modal-overlay" onClick={onClose}>
      <div className="wc-modal" onClick={e => e.stopPropagation()}>
        <div className="wc-modal-title gs-title-row">
          <img src="/assets/worldcup-logo.webp" alt="2026 World Cup" className="wc-cup-logo" />
          🌍 世界盃競猜
          <button className="wc-refresh-btn" onClick={onRefresh} disabled={refreshing} title="重新抓取最新賽果">
            {refreshing ? '⏳' : '🔄'}
          </button>
        </div>
        <div className="wc-refresh-hint">資料每 30 分鐘自動更新；剛結束的比賽如未顯示，可點 🔄 立即重新抓取</div>

        <div className="wc-nav-btns">
          <button className="wc-nav-btn" onClick={() => setShowStandings(true)}>📊 各組戰績</button>
          <button className="wc-nav-btn" onClick={() => setShowPlayerBoard(true)}>👥 玩家排行</button>
          <button className="wc-nav-btn" onClick={() => setShowMyPredictions(true)}>📜 我的紀錄</button>
        </div>

        {justResolved.length > 0 && (
          <div className="wc-resolved-list">
            {justResolved.map((r, i) => (
              <div key={i} className={`wc-resolved-row ${r.won ? 'win' : 'lose'}`}>
                {r.won ? '✅' : '❌'} <Flag team={r.home} />{r.home} vs <Flag team={r.away} />{r.away}：{r.won ? '猜中了！👑傳奇寶箱 +1、⭐星塵 +500' : '猜錯了，再接再厲！'}
              </div>
            ))}
            {justUnlocked && (
              <div className="wc-resolved-row unlock">🎉 累積成功滿 5 次！獲得「自選套裝寶箱」一個！</div>
            )}
          </div>
        )}

        <div className="wc-schedule">
          <div className="wc-schedule-title">
            📅 {scheduleDate === todayStr ? '今日賽程' : `賽程（${scheduleDate}）`}
          </div>
          <div className="wc-schedule-hint">猜中勝/負/和局，獲得 👑傳奇寶箱 + ⭐500 星塵</div>
          {scheduleMatches.length === 0 ? (
            <div className="wc-empty">目前沒有可供競猜的比賽，請稍後再來查看</div>
          ) : (
            scheduleMatches.map(m => {
              const pick = pickByMatchId.get(m.id)
              return (
                <div key={m.id} className="wc-sched-row">
                  <div className="wc-sched-teams"><Flag team={m.home} />{m.home} <span className="wc-vs">vs</span> <Flag team={m.away} />{m.away}</div>
                  {pick ? (
                    <div className={`wc-sched-status ${pick.resolved ? (pick.won ? 'win' : 'lose') : 'pending'}`}>
                      你猜：{PICK_LABEL[pick.pick]}　{pick.resolved ? (pick.won ? '✅ 猜中' : '❌ 猜錯') : '⏳ 未開賽'}
                    </div>
                  ) : isMatchFinished(m) ? (
                    <div className="wc-sched-status">比賽已結束，未下注</div>
                  ) : (
                    <div className="wc-pick-btns">
                      <button className="wc-pick-btn" onClick={() => makePick(m, 'home')}><Flag team={m.home} />{m.home} 勝</button>
                      <button className="wc-pick-btn" onClick={() => makePick(m, 'draw')}>和局</button>
                      <button className="wc-pick-btn" onClick={() => makePick(m, 'away')}><Flag team={m.away} />{m.away} 勝</button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <button className="ghost wc-close-btn" onClick={onClose}>關閉</button>
      </div>
    </div>
  )
}
