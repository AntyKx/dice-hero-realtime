import { useState } from 'react'
import { type WcMatch, GROUP_LETTERS, computeGroupStandings } from '../worldCup'
import Flag from './Flag'

interface Props {
  matches: WcMatch[]
  onClose: () => void
  onRefresh: () => void
  refreshing: boolean
}

export default function GroupStandingsModal({ matches, onClose, onRefresh, refreshing }: Props) {
  const [group, setGroup] = useState('A')
  const standings = computeGroupStandings(matches, group)
  const groupMatches = matches.filter(m => m.group === group)

  return (
    <div className="chest-modal-overlay wc-modal-overlay" onClick={onClose}>
      <div className="wc-modal" onClick={e => e.stopPropagation()}>
        <div className="wc-modal-title gs-title-row">
          <img src="/assets/worldcup-logo.webp" alt="2026 World Cup" className="wc-cup-logo" />
          📊 各組戰績
          <button className="wc-refresh-btn" onClick={onRefresh} disabled={refreshing} title="重新抓取最新賽果">
            {refreshing ? '⏳' : '🔄'}
          </button>
        </div>

        <div className="gs-tabs">
          {GROUP_LETTERS.map(g => (
            <button
              key={g}
              className={`gs-tab ${group === g ? 'active' : ''}`}
              onClick={() => setGroup(g)}
            >
              {g}
            </button>
          ))}
        </div>

        {standings.length === 0 ? (
          <div className="wc-empty">尚無資料</div>
        ) : (
          <table className="gs-table">
            <thead>
              <tr>
                <th className="gs-team-col">隊伍</th>
                <th>賽</th><th>勝</th><th>和</th><th>負</th><th>淨勝</th><th>積分</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.team} className={i < 2 ? 'gs-qualify' : ''}>
                  <td className="gs-team-col"><Flag team={s.team} />{s.team}</td>
                  <td>{s.played}</td>
                  <td>{s.win}</td>
                  <td>{s.draw}</td>
                  <td>{s.loss}</td>
                  <td>{s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}</td>
                  <td className="gs-pts">{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="gs-hint">綠色為小組前 2 名（晉級線，僅供參考，最終名次以官方公告為準）</div>

        {groupMatches.length > 0 && (
          <div className="wc-history">
            <div className="wc-history-title">{group} 組賽程</div>
            {groupMatches.map(m => (
              <div key={m.id} className="wc-history-row">
                <span><Flag team={m.home} />{m.home} vs <Flag team={m.away} />{m.away}</span>
                <span>{m.date}</span>
                <span>{m.homeScore !== null ? `${m.homeScore}–${m.awayScore}` : '未開賽'}</span>
              </div>
            ))}
          </div>
        )}

        <button className="ghost wc-close-btn" onClick={onClose}>關閉</button>
      </div>
    </div>
  )
}
