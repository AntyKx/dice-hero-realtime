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
// 森林遺跡節點對位地圖（2026-08）：4 張手繪地圖，每張對應 5 關，直接當
// 背景鋪滿，節點座標是拿 10×15 網格逐張比對圖上空地中心讀出來的百分比，
// 不是憑感覺排的——地圖本身的石板小徑已經把 20 個空地連成一條蜿蜒路徑，
// 不需要再疊一層 CSS 畫的連接線。
const MAP_SEGMENT_IMAGES = [
  '/assets/campaign/forest_ruins_map_1.jpg',
  '/assets/campaign/forest_ruins_map_2.jpg',
  '/assets/campaign/forest_ruins_map_3.jpg',
  '/assets/campaign/forest_ruins_map_4.jpg',
]
const STAGE_MAP_POS: Record<number, { x: number; y: number }> = {
  1: { x: 43, y: 16 }, 2: { x: 70, y: 27 }, 3: { x: 27, y: 35 }, 4: { x: 72, y: 57 }, 5: { x: 28, y: 75 },
  6: { x: 40, y: 9 }, 7: { x: 37, y: 30 }, 8: { x: 72, y: 45 }, 9: { x: 27, y: 58 }, 10: { x: 62, y: 83 },
  11: { x: 32, y: 8 }, 12: { x: 57, y: 28 }, 13: { x: 38, y: 47 }, 14: { x: 68, y: 65 }, 15: { x: 30, y: 85 },
  16: { x: 27, y: 20 }, 17: { x: 68, y: 16 }, 18: { x: 50, y: 43 }, 19: { x: 27, y: 65 }, 20: { x: 70, y: 83 },
}

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

      {/* 關卡地圖 2026-08 節點對位重做：4 張手繪地圖直接當每段背景，取代
          先前純 CSS 畫的蜿蜒路徑。解鎖／三星進度資料完全沒動，只是節點改成
          貼著地圖上量好的空地座標，路徑本身就是圖裡畫好的石板小徑。 */}
      <div className="cms-map">
        {MAP_SEGMENT_IMAGES.map((imgSrc, seg) => {
          const segStages = stages.slice(seg * 5, seg * 5 + 5)
          if (segStages.length === 0) return null
          return (
            <div key={seg} className="cms-map-segment" style={{ backgroundImage: `url(${imgSrc})` }}>
              {segStages.map((stage, localI) => {
                const i = seg * 5 + localI
                const prog = getStageProgress(meta, stage.id)
                const unlocked = isStageUnlocked(meta, stage.id)
                const isBoss = !!stage.boss
                const isFinal = i === stages.length - 1
                const pos = STAGE_MAP_POS[stage.stageNumber] ?? { x: 50, y: 50 }
                return (
                  <button
                    key={stage.id}
                    className={`cms-map-node${isFinal ? ' final' : isBoss ? ' boss' : ''}${unlocked ? '' : ' locked'}${prog.cleared ? ' cleared' : ''}`}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
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
                )
              })}
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
