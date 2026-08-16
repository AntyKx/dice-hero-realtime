import { useState } from 'react'
import type { MetaState } from '../types'
import { HEROES } from '../data'
import type { StageObjectiveType } from '../campaign/campaignTypes'
import { CAMPAIGN_ID_FOREST_RUINS, CHAPTER_STAR_MILESTONES } from '../campaign/campaignTypes'
import { getChapterStages } from '../campaign/campaignStages'
import { getStageProgress, getChapterTotalStars, getChapterMaxStars, isStageUnlocked } from '../campaign/campaignProgress'
import { hasTravelSegments, getTravelSegmentsForStage } from '../campaign/chapterTravelData'
import CampaignTravelPreview from '../components/CampaignTravelPreview'
import AsterVowIcon, { type AsterVowIconName } from '../components/AsterVowIcon'

interface Props {
  meta: MetaState
  heroId: string
  onSelectStage: (stageId: string) => void
  onBack: () => void
}

const OBJECTIVE_ICON: Record<StageObjectiveType, AsterVowIconName> = {
  elimination: 'stage-elimination', survival: 'stage-survival', defense: 'stage-defense', hunt: 'stage-hunt',
  destroy: 'stage-destroy', collection: 'stage-collection', escape: 'stage-escape', boss: 'stage-boss',
}
// 蜿蜒路徑左右交錯的位置循環，跟星界圖鑑預覽用的排法一致
const MAP_POSITIONS = ['center', 'right', 'left', 'right', 'left', 'center'] as const
// 節點實際貼齊的橫向位置粗略換算成 0-100 座標，連接線斜著畫過去對到節點，
// 不能寫死在正中央——上一版連線固定在 50%，節點改成貼邊之後線就對不上了。
const MAP_POS_X: Record<(typeof MAP_POSITIONS)[number], number> = { left: 15, center: 50, right: 85 }

/** 大廳關卡預覽卡（2026-08）共用這個星數列，見 AdventureReadyScreen.tsx。 */
export function StarRow({ stars }: { stars: number }) {
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
          <div className="eyebrow">ASTERVOW // ASTRAL NAVIGATION</div>
          <h1>第一航道 · 森林遺跡</h1>
        </div>
        <button className="ghost" onClick={onBack}>← 返回</button>
      </header>

      <div className="cms-summary">
        <div className="cms-summary-title"><AsterVowIcon name="chapter-forest" size={20} /> 森林遺跡　{totalStars} / {maxStars} ★</div>
        <div className="cms-milestones">
          {CHAPTER_STAR_MILESTONES.map(m => (
            <div key={m} className={`cms-milestone${totalStars >= m ? ' reached' : ''}`}>
              <div className="cms-milestone-dot">{totalStars >= m ? '✓' : m}</div>
              <div className="cms-milestone-label">{m}★</div>
            </div>
          ))}
        </div>
      </div>

      {/* 關卡地圖 2026-08 視覺重做：左右交錯往上爬的蜿蜒路徑（取代直式/
          雙欄清單），最後一關（篇章最終王）額外套一層最大徽章樣式。解鎖／
          三星進度資料完全沒動，只是排列方式改了。 */}
      <div className="cms-map">
        {stages.map((stage, i) => {
          const prog = getStageProgress(meta, stage.id)
          const unlocked = isStageUnlocked(meta, stage.id)
          const prevCleared = i === 0 || getStageProgress(meta, stages[i - 1].id).cleared
          const isBoss = !!stage.boss
          const isFinal = i === stages.length - 1
          const pos = MAP_POSITIONS[i % MAP_POSITIONS.length]
          const prevPos = i > 0 ? MAP_POSITIONS[(i - 1) % MAP_POSITIONS.length] : pos
          return (
            <div key={stage.id} className={`cms-map-stage ${pos}`}>
              {i > 0 && (
                <svg className={`cms-map-connector${prevCleared ? ' lit' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none">
                  <line x1={MAP_POS_X[prevPos]} y1="0" x2={MAP_POS_X[pos]} y2="100" />
                </svg>
              )}
              <button
                className={`cms-map-node${isFinal ? ' final' : isBoss ? ' boss' : ''}${unlocked ? '' : ' locked'}${prog.cleared ? ' cleared' : ''}`}
                disabled={!unlocked}
                onClick={() => unlocked && handleSelectStage(stage.id)}
              >
                <span className="cms-map-badge">
                  {unlocked
                    ? <AsterVowIcon name={isBoss ? 'stage-boss' : OBJECTIVE_ICON[stage.objective.type]} size={isFinal ? 30 : isBoss ? 24 : 18} />
                    : <AsterVowIcon name="system-lock" size={18} />}
                  {!isFinal && <span className="cms-map-num">{stage.stageNumber}</span>}
                </span>
                <span className="cms-map-name">{stage.name}</span>
                {unlocked && <StarRow stars={prog.stars} />}
              </button>
            </div>
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
