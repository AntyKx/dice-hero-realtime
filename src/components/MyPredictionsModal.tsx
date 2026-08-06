import type { WorldCupPick } from '../types'
import { PICK_LABEL } from '../worldCup'
import Flag from './Flag'

interface Props {
  picks: WorldCupPick[]
  successCount: number
  onClose: () => void
}

export default function MyPredictionsModal({ picks, successCount, onClose }: Props) {
  const sorted = picks.slice().reverse()
  const wins = picks.filter(p => p.resolved && p.won).length
  const losses = picks.filter(p => p.resolved && !p.won).length
  const pending = picks.filter(p => !p.resolved).length

  return (
    <div className="chest-modal-overlay wc-modal-overlay" onClick={onClose}>
      <div className="wc-modal" onClick={e => e.stopPropagation()}>
        <div className="wc-modal-title gs-title-row">
          <img src="/assets/worldcup-logo.webp" alt="2026 World Cup" className="wc-cup-logo" />
          📜 我的競猜紀錄
        </div>

        <div className="wc-progress">
          <div className="wc-progress-label">累積成功次數：{successCount} / 5（滿5次可開自選套裝寶箱）</div>
          <div className="wc-progress-bar"><div className="wc-progress-fill" style={{ width: `${successCount / 5 * 100}%` }} /></div>
        </div>

        <div className="wc-mystats">
          <span className="wc-mystat win">✅ 猜中 {wins}</span>
          <span className="wc-mystat lose">❌ 猜錯 {losses}</span>
          <span className="wc-mystat pending">⏳ 未開賽 {pending}</span>
        </div>

        <div className="wc-history">
          <div className="wc-history-title">全部競猜歷程</div>
          {sorted.length === 0 ? (
            <div className="wc-empty">還沒有任何競猜紀錄</div>
          ) : (
            sorted.map((p, i) => (
              <div key={i} className={`wc-history-row ${p.resolved ? (p.won ? 'win' : 'lose') : 'pending'}`}>
                <span><Flag team={p.home} />{p.home} vs <Flag team={p.away} />{p.away}</span>
                <span>{PICK_LABEL[p.pick]}</span>
                <span>{p.resolved ? (p.won ? '✅ 猜中' : '❌ 猜錯') : '⏳ 未開賽'}</span>
              </div>
            ))
          )}
        </div>

        <button className="ghost wc-close-btn" onClick={onClose}>關閉</button>
      </div>
    </div>
  )
}
