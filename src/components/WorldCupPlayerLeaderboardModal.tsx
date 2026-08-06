import { useEffect, useState } from 'react'
import { type WorldCupPlayerStat, fetchWorldCupPlayerStats } from '../worldCup'

interface Props {
  onClose: () => void
}

export default function WorldCupPlayerLeaderboardModal({ onClose }: Props) {
  const [stats, setStats] = useState<WorldCupPlayerStat[] | null>(null)

  useEffect(() => { fetchWorldCupPlayerStats().then(setStats) }, [])

  return (
    <div className="chest-modal-overlay wc-modal-overlay" onClick={onClose}>
      <div className="wc-modal" onClick={e => e.stopPropagation()}>
        <div className="wc-modal-title">👥 玩家競猜排行</div>
        <div className="wc-schedule-hint">僅統計已使用雲端存檔（Google 登入）的玩家</div>

        {stats === null ? (
          <div className="wc-empty">載入中…</div>
        ) : stats.length === 0 ? (
          <div className="wc-empty">目前還沒有玩家的競猜紀錄</div>
        ) : (
          <table className="gs-table">
            <thead>
              <tr>
                <th className="gs-team-col">玩家</th>
                <th>猜中</th><th>猜錯</th><th>未開賽</th><th>累積成功</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => (
                <tr key={s.playerName + i} className={i === 0 ? 'gs-qualify' : ''}>
                  <td className="gs-team-col">{i === 0 ? '👑 ' : ''}{s.playerName}</td>
                  <td>{s.wins}</td>
                  <td>{s.losses}</td>
                  <td>{s.pending}</td>
                  <td>{s.successCount} / 5</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button className="ghost wc-close-btn" onClick={onClose}>關閉</button>
      </div>
    </div>
  )
}
