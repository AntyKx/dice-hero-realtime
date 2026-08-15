import { useState } from 'react'
import type { DungeonClearRecord } from '../types'
import type { RankPositions } from '../scoring'
import { getDungeonChallenges, setPlayerName, getPlayerName, saveLeaderboardRecordCloud } from '../scoring'
import type { DungeonDef } from '../dungeon'
import type { Equipment } from '../types'
import { ROLE_LABEL as ROLE_LABEL_MAP } from '../equipment'
import AsterVowIcon from '../components/AsterVowIcon'
import { EQUIPMENT_SLOT_ICON, CHEST_ICON, EQUIPMENT_SLOT_ICON_COLOR } from '../equipmentIconMeta'
import { getDungeonIcon } from '../iconMeta'
const ROLE_LABEL = ROLE_LABEL_MAP as Record<string, string>

const GRADE_COLOR: Record<string, string> = {
  A: '#60c0ff', S: '#ffd36e', SS: '#ff9020', SSS: '#ff4060',
}
const GRADE_GLOW: Record<string, string> = {
  A: '0 0 18px #60c0ff88', S: '0 0 22px #ffd36e88', SS: '0 0 28px #ff902088', SSS: '0 0 34px #ff406099',
}

interface Props {
  dungeon: DungeonDef
  heroId: string
  clearRecord: DungeonClearRecord
  rankings: RankPositions
  goldEarned: number
  expEarned: number
  droppedItem: Equipment | null
  onBack: () => void
  onLeaderboard: () => void
}

export default function DungeonClearScreen({
  dungeon, clearRecord, rankings, goldEarned, expEarned, droppedItem, onBack, onLeaderboard,
}: Props) {
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(clearRecord.playerName)

  const grade = clearRecord.rankGrade
  const isLegendary = clearRecord.difficulty === 'legendary'

  const challenges = getDungeonChallenges(dungeon.id)
  const challengeCount =
    clearRecord.challengeBonus === 1300 ? 5 :
    clearRecord.challengeBonus === 900  ? 4 :
    clearRecord.challengeBonus === 600  ? 3 :
    clearRecord.challengeBonus === 350  ? 2 :
    clearRecord.challengeBonus === 150  ? 1 : 0

  const rankLine = (label: string, rank: number) => {
    if (rank <= 0) return null
    const color = rank === 1 ? '#ffd36e' : rank <= 3 ? '#c0c0ff' : '#aaa'
    return (
      <div className="dcs-rank-row" key={label}>
        <span className="dcs-rank-label">{label}</span>
        <span className="dcs-rank-val" style={{ color }}>
          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''} #{rank}
        </span>
      </div>
    )
  }

  const saveName = () => {
    setPlayerName(nameInput)
    setEditingName(false)
    if (clearRecord.isValidForRanking) {
      saveLeaderboardRecordCloud({ ...clearRecord, playerName: nameInput.trim() || '勇者' })
    }
  }

  return (
    <div className="dcs-wrap">
      <div className="dcs-card" style={{ '--dungeon-color': dungeon.color } as React.CSSProperties}>
        {/* Header */}
        <div className="dcs-dungeon-name" style={{ color: dungeon.color }}>
          <AsterVowIcon name={getDungeonIcon(dungeon.id)} size={20} /> {dungeon.name}
        </div>
        <div className="dcs-difficulty">
          <AsterVowIcon name={isLegendary ? 'system-leaderboard' : clearRecord.difficulty === 'hero' ? 'system-talent' : 'equip-weapon'} size={15} /> {isLegendary ? '傳奇' : clearRecord.difficulty === 'hero' ? '英雄' : '一般'} 難度
        </div>
        <div className="dcs-status" style={{ color: clearRecord.clearSuccess ? '#40ff88' : '#ff6060' }}>
          {clearRecord.clearSuccess ? '副本通關！' : '挑戰失敗'}
        </div>

        {/* Class */}
        <div className="dcs-hero-class">
          使用職業：{ROLE_LABEL[clearRecord.heroClass] ?? clearRecord.heroClass}
        </div>

        {/* ── Legendary: score section ── */}
        {isLegendary && clearRecord.clearSuccess && grade && (
          <>
            <div className="dcs-grade-wrap">
              <div
                className="dcs-grade"
                style={{ color: GRADE_COLOR[grade] ?? '#fff', boxShadow: GRADE_GLOW[grade] }}
              >
                {grade}
              </div>
              <div className="dcs-score-total">{clearRecord.score?.toLocaleString() ?? '—'} 分</div>
            </div>

            {/* Score breakdown */}
            <div className="dcs-breakdown">
              <div className="dcs-breakdown-title">分數明細</div>
              <div className="dcs-bd-row">
                <span>基礎分</span><span>1,000</span>
              </div>
              <div className="dcs-bd-row">
                <span>速度加分（{clearRecord.totalTurns} 回合）</span>
                <span>+{Math.max(0, 1200 - clearRecord.totalTurns * 45)}</span>
              </div>
              <div className="dcs-bd-row">
                <span>剩餘血量（{Math.round((clearRecord.remainingHpPercent ?? 0) * 100)}%）</span>
                <span>+{Math.round((clearRecord.remainingHpPercent ?? 0) * 900)}</span>
              </div>
              <div className="dcs-bd-row">
                <span>骰型分（累積 {clearRecord.diceScore}，上限 700）</span>
                <span>+{Math.min(clearRecord.diceScore ?? 0, 700)}</span>
              </div>
              <div className="dcs-bd-row">
                <span>挑戰完成（{challengeCount}/{challenges.length}）</span>
                <span>+{clearRecord.challengeBonus ?? 0}</span>
              </div>
            </div>

            {/* Challenge status */}
            <div className="dcs-challenges">
              <div className="dcs-challenges-title">挑戰任務</div>
              {challenges.map((ch, i) => {
                const done = i < challengeCount
                return (
                  <div key={ch.id} className={`dcs-challenge-row ${done ? 'done' : ''}`}>
                    <span className="dcs-ch-icon">{done ? '✓' : '✗'}</span>
                    <span className="dcs-ch-name">{ch.name}</span>
                    <span className="dcs-ch-desc">{ch.desc}</span>
                  </div>
                )
              })}
            </div>

            {/* Rankings */}
            {clearRecord.isValidForRanking && (
              <div className="dcs-rankings">
                <div className="dcs-rankings-title">本次排名</div>
                {rankLine('本週全服榜', rankings.weeklyAllRank)}
                {rankLine('本週職業榜', rankings.weeklyClassRank)}
                {rankLine('歷史全服榜', rankings.historyAllRank)}
                {rankLine('歷史職業榜', rankings.historyClassRank)}
              </div>
            )}
            {!clearRecord.isValidForRanking && clearRecord.clearSuccess && (
              <div className="dcs-no-rank-hint">
                本次使用復活效果，不計入排行榜。
              </div>
            )}

            {/* Player name */}
            <div className="dcs-player-name-row">
              <span className="dcs-player-label">玩家名稱：</span>
              {editingName ? (
                <>
                  <input
                    className="dcs-name-input"
                    value={nameInput}
                    maxLength={12}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveName()}
                    autoFocus
                  />
                  <button className="ghost dcs-name-btn" onClick={saveName}>確認</button>
                </>
              ) : (
                <>
                  <span className="dcs-player-val">{getPlayerName()}</span>
                  <button className="ghost dcs-name-btn" onClick={() => setEditingName(true)}>修改</button>
                </>
              )}
            </div>
          </>
        )}

        {/* ── Rewards ── */}
        {clearRecord.clearSuccess && (
          <div className="dcs-rewards">
            <div className="dcs-rewards-title">獲得獎勵</div>
            {droppedItem && (
              <div className={`dr-reward-equip rarity-${droppedItem.rarity}`}>
                <div className="dr-equip-name">
                  <AsterVowIcon name={EQUIPMENT_SLOT_ICON[droppedItem.slot]} size={17} color={EQUIPMENT_SLOT_ICON_COLOR[droppedItem.slot]} /> {droppedItem.name}
                  {droppedItem.requiredRole && (
                    <span className="eir-role" style={{ marginLeft: 6 }}>{ROLE_LABEL[droppedItem.requiredRole]}</span>
                  )}
                </div>
                <div className="dr-affixes">
                  {droppedItem.affixes.map(a => <span key={a.id} className="dr-affix">{a.label}</span>)}
                  {droppedItem.legendaryDesc && (
                    <span className="dr-affix dr-leg">✦ {droppedItem.legendaryDesc}</span>
                  )}
                </div>
              </div>
            )}
            <div className="dcs-reward-row"><AsterVowIcon name="system-gold" size={15} /> {goldEarned} 金幣 → <AsterVowIcon name="system-stardust" size={15} /> {goldEarned} 星塵</div>
            <div className="dcs-reward-row"><AsterVowIcon name="system-talent" size={15} /> {expEarned} 英雄經驗值</div>
            <div className="dcs-reward-row"><AsterVowIcon name={CHEST_ICON.chest_legendary} size={16} /> 傳奇寶箱 ×1（已入庫）</div>
          </div>
        )}

        {/* ── Normal / Hero hint ── */}
        {!isLegendary && (
          <div className="dcs-legend-hint">
            通關「傳奇」難度後可挑戰全服排行榜
          </div>
        )}

        {/* Buttons */}
        <div className="dcs-buttons">
          {isLegendary && (
            <button className="ghost" onClick={onLeaderboard}>查看排行榜</button>
          )}
          <button className="primary" onClick={onBack}>返回關卡選擇</button>
        </div>
      </div>
    </div>
  )
}
