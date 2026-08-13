import { useState } from 'react'
import type { MetaState } from '../types'
import { HEROES } from '../data'
import type { StageObjectiveType } from '../campaign/campaignTypes'
import { CAMPAIGN_ID_FOREST_RUINS, CHAPTER_STAR_MILESTONES } from '../campaign/campaignTypes'
import { getChapterStages } from '../campaign/campaignStages'
import { getStageProgress, getChapterTotalStars, getChapterMaxStars, isStageUnlocked } from '../campaign/campaignProgress'
import { hasTravelSegments, getTravelSegmentsForStage } from '../campaign/chapterTravelData'
import CampaignTravelPreview from '../components/CampaignTravelPreview'

interface Props {
  meta: MetaState
  heroId: string
  onSelectStage: (stageId: string) => void
  onBack: () => void
}

const OBJECTIVE_LABEL: Record<StageObjectiveType, string> = {
  elimination: '殲滅', survival: '生存', defense: '防守', hunt: '狩獵',
  destroy: '破壞', collection: '收集', escape: '逃脫', boss: 'BOSS',
}
const OBJECTIVE_ICON: Record<StageObjectiveType, string> = {
  elimination: '⚔️', survival: '⏱️', defense: '🛡️', hunt: '🎯',
  destroy: '💥', collection: '✨', escape: '🚪', boss: '👑',
}

function StarRow({ stars }: { stars: number }) {
  return (
    <span className="cms-stars">
      {[0, 1, 2].map(i => (
        <span key={i} className={`cms-star${i < stars ? ' filled' : ''}`}>★</span>
      ))}
    </span>
  )
}

export default function CampaignMapScreen({ meta, heroId, onSelectStage, onBack }: Props) {
  const stages = getChapterStages(CAMPAIGN_ID_FOREST_RUINS)
  const totalStars = getChapterTotalStars(meta, CAMPAIGN_ID_FOREST_RUINS)
  const maxStars = getChapterMaxStars(CAMPAIGN_ID_FOREST_RUINS)
  const heroName = HEROES.find(h => h.id === heroId)?.name ?? heroId

  // 篇章 I 旅程預覽：點選有旅程資料的關卡時先攔截，播完/略過才真正呼叫
  // onSelectStage；沒有旅程資料的關卡（6~20）維持原本直接跳轉的行為。
  const [travelStageId, setTravelStageId] = useState<string | null>(null)

  function handleSelectStage(stageId: string) {
    if (hasTravelSegments(stageId)) {
      setTravelStageId(stageId)
    } else {
      onSelectStage(stageId)
    }
  }

  return (
    <div className="page cms-screen">
      <header className="topbar">
        <div>
          <div className="eyebrow">DICE HERO RPG</div>
          <h1>森林遺跡</h1>
        </div>
        <button className="ghost" onClick={onBack}>← 返回</button>
      </header>

      <div className="cms-summary">
        <div className="cms-summary-title">🌲 森林遺跡　{totalStars} / {maxStars} ★</div>
        <div className="cms-milestones">
          {CHAPTER_STAR_MILESTONES.map(m => (
            <div key={m} className={`cms-milestone${totalStars >= m ? ' reached' : ''}`}>
              <div className="cms-milestone-dot">{totalStars >= m ? '✓' : m}</div>
              <div className="cms-milestone-label">{m}★</div>
            </div>
          ))}
        </div>
      </div>

      <div className="cms-list">
        {stages.map(stage => {
          const prog = getStageProgress(meta, stage.id)
          const unlocked = isStageUnlocked(meta, stage.id)
          const isBoss = !!stage.boss
          return (
            <button
              key={stage.id}
              className={`cms-node${isBoss ? ' boss' : ''}${unlocked ? '' : ' locked'}${prog.cleared ? ' cleared' : ''}`}
              disabled={!unlocked}
              onClick={() => unlocked && handleSelectStage(stage.id)}
            >
              <div className="cms-node-num">{stage.stageNumber}</div>
              <div className="cms-node-body">
                <div className="cms-node-name">
                  {isBoss && '👑 '}{stage.name}
                  {!unlocked && <span className="cms-node-lock"> 🔒</span>}
                </div>
                <div className="cms-node-meta">
                  <span className="cms-node-objective">{OBJECTIVE_ICON[stage.objective.type]} {OBJECTIVE_LABEL[stage.objective.type]}</span>
                  <span className="cms-node-duration">⏱ {stage.estimatedDurationSec[0]}–{stage.estimatedDurationSec[1]}秒</span>
                </div>
              </div>
              <div className="cms-node-side">
                {unlocked ? <StarRow stars={prog.stars} /> : <span className="cms-node-lock-icon">🔒</span>}
              </div>
            </button>
          )
        })}
      </div>

      <p className="cms-hint">目前出戰英雄：{heroName}｜通關（不需三星）即可解鎖下一關，三星是額外的精通目標</p>

      {travelStageId && (
        <CampaignTravelPreview
          segments={getTravelSegmentsForStage(travelStageId)}
          heroId={heroId}
          onFinish={() => {
            const stageId = travelStageId
            setTravelStageId(null)
            onSelectStage(stageId)
          }}
        />
      )}
    </div>
  )
}
