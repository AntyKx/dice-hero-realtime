import { useState, useEffect } from 'react'
import { getLeaderboardCloud, getSeasonId } from '../scoring'
import type { DungeonClearRecord } from '../types'
import { DUNGEON_DEFS } from '../dungeon'
import { ROLE_LABEL as ROLE_LABEL_MAP } from '../equipment'
const ROLE_LABEL = ROLE_LABEL_MAP as Record<string, string>

const GRADE_COLOR: Record<string, string> = {
  A: '#60c0ff', S: '#ffd36e', SS: '#ff9020', SSS: '#ff4060',
}

const ROLES = [
  { value: 'slash',  label: '聖騎士' },
  { value: 'fire',   label: '火焰法師' },
  { value: 'holy',   label: '神官祭司' },
  { value: 'shadow', label: '影刃刺客' },
  { value: 'ice',    label: '皇家公主' },
  { value: 'arrow',  label: '遊俠獵人' },
  { value: 'hammer', label: '矮人戰士' },
  { value: 'song',   label: '吟遊詩人' },
  { value: 'beast',  label: '獸語馴獸師' },
  { value: 'gear',   label: '機關技師' },
  { value: 'fighter',label: '武鬥家' },
]

interface Props {
  initialDungeonId?: string
  onBack: () => void
}

export default function LeaderboardScreen({ initialDungeonId, onBack }: Props) {
  const dungeons = DUNGEON_DEFS
  const [dungeonId, setDungeonId] = useState(initialDungeonId ?? dungeons[0].id)
  const [season, setSeason] = useState<'weekly' | 'history'>('weekly')
  const [boardType, setBoardType] = useState<'all' | 'class'>('all')
  const [heroClass, setHeroClass] = useState(ROLES[0].value)
  const [records, setRecords] = useState<DungeonClearRecord[]>([])
  const [loading, setLoading] = useState(true)

  const seasonId = season === 'weekly' ? getSeasonId() : null
  const classFilter = boardType === 'class' ? heroClass : null

  useEffect(() => {
    setLoading(true)
    setRecords([])
    getLeaderboardCloud(dungeonId, classFilter, seasonId).then(data => {
      setRecords(data)
      setLoading(false)
    })
  }, [dungeonId, classFilter, seasonId])

  const dungeon = dungeons.find(d => d.id === dungeonId)

  const formatHpPct = (pct?: number) => pct != null ? `${Math.round(pct * 100)}%` : '—'
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso)
      return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
    } catch { return iso }
  }

  return (
    <div className="lb-wrap">
      <header className="lb-header">
        <button className="ghost lb-back-btn" onClick={onBack}>← 返回</button>
        <div className="lb-title">👑 傳奇排行榜</div>
      </header>

      {/* Filters */}
      <div className="lb-filters">
        {/* Dungeon */}
        <div className="lb-filter-group">
          <div className="lb-filter-label">副本</div>
          <div className="lb-tabs">
            {dungeons.map(d => (
              <button
                key={d.id}
                className={`lb-tab ${dungeonId === d.id ? 'active' : ''}`}
                onClick={() => setDungeonId(d.id)}
              >
                {d.icon} {d.name}
              </button>
            ))}
          </div>
        </div>

        {/* Season */}
        <div className="lb-filter-group">
          <div className="lb-filter-label">榜單類型</div>
          <div className="lb-tabs">
            <button className={`lb-tab ${season === 'weekly' ? 'active' : ''}`} onClick={() => setSeason('weekly')}>本週榜</button>
            <button className={`lb-tab ${season === 'history' ? 'active' : ''}`} onClick={() => setSeason('history')}>歷史榜</button>
          </div>
        </div>

        {/* Board type */}
        <div className="lb-filter-group">
          <div className="lb-filter-label">排名類型</div>
          <div className="lb-tabs">
            <button className={`lb-tab ${boardType === 'all' ? 'active' : ''}`} onClick={() => setBoardType('all')}>全服總榜</button>
            <button className={`lb-tab ${boardType === 'class' ? 'active' : ''}`} onClick={() => setBoardType('class')}>職業榜</button>
          </div>
        </div>

        {/* Class picker (only for class board) */}
        {boardType === 'class' && (
          <div className="lb-filter-group">
            <div className="lb-filter-label">職業</div>
            <select
              className="lb-class-select"
              value={heroClass}
              onChange={e => setHeroClass(e.target.value)}
            >
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Board subtitle */}
      <div className="lb-subtitle">
        {dungeon?.icon} {dungeon?.name} ·{' '}
        {season === 'weekly' ? '本週' : '歷史'}{boardType === 'all' ? '全服榜' : `${ROLE_LABEL[heroClass] ?? heroClass}職業榜`}
        <span className="lb-count">（{records.length} 筆）</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="lb-empty">載入中...</div>
      ) : records.length === 0 ? (
        <div className="lb-empty">尚無傳奇通關紀錄</div>
      ) : (
        <div className="lb-table-wrap">
          <table className="lb-table">
            <thead>
              <tr>
                <th className="lb-th-rank">#</th>
                <th className="lb-th-name">玩家</th>
                <th className="lb-th-class">職業</th>
                <th className="lb-th-score">分數</th>
                <th className="lb-th-grade">評價</th>
                <th className="lb-th-turns">回合</th>
                <th className="lb-th-hp">剩餘HP</th>
                <th className="lb-th-time">通關時間</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec: DungeonClearRecord, idx: number) => {
                const rank = idx + 1
                const rankColor = rank === 1 ? '#ffd36e' : rank <= 3 ? '#c0d0ff' : '#aaa'
                const gradeColor = GRADE_COLOR[rec.rankGrade ?? ''] ?? '#aaa'
                return (
                  <tr key={rec.id} className={rank <= 3 ? 'lb-top3' : ''}>
                    <td className="lb-td-rank" style={{ color: rankColor }}>
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                    </td>
                    <td className="lb-td-name">{rec.playerName}</td>
                    <td className="lb-td-class">{ROLE_LABEL[rec.heroClass] ?? rec.heroClass}</td>
                    <td className="lb-td-score">{rec.score?.toLocaleString() ?? '—'}</td>
                    <td className="lb-td-grade" style={{ color: gradeColor, fontWeight: 700 }}>
                      {rec.rankGrade ?? '—'}
                    </td>
                    <td className="lb-td-turns">{rec.totalTurns}</td>
                    <td className="lb-td-hp">{formatHpPct(rec.remainingHpPercent)}</td>
                    <td className="lb-td-time">{formatTime(rec.clearTime)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
