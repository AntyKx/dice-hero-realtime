import { useState } from 'react'
import type { MetaState } from '../types'
import { HEROES, versionedAsset, getHeroSprite } from '../data'
import { sanitizeParty, getPartyHeroIds } from '../party'
import type { StageObjectiveType } from '../campaign/campaignTypes'
import {
  CAMPAIGN_ID_FOREST_RUINS, CAMPAIGN_ID_SNOWFIELD, CAMPAIGN_ID_DEMON_CASTLE,
  CAMPAIGN_ID_RIFT_BROKEN_SKY, CAMPAIGN_ID_RIFT_VOID_CHASM, CAMPAIGN_ID_RIFT_ECLIPSE_CORE,
  CAMPAIGN_ID_DEEP_CORAL_SHALLOWS, CAMPAIGN_ID_DEEP_SUNKEN_CAPITAL, CAMPAIGN_ID_DEEP_EMPEROR_ABYSS,
  CHAPTER_STAR_MILESTONES,
} from '../campaign/campaignTypes'
import { getChapterStages } from '../campaign/campaignStages'
import { getStageProgress, getChapterTotalStars, getChapterMaxStars, isStageUnlocked } from '../campaign/campaignProgress'
import { CAMPAIGN_STAGE_BG_PATH } from '../campaign/campaignStageBg'
import AsterVowIcon, { type AsterVowIconName } from '../components/AsterVowIcon'
import SpriteAnimator from '../components/SpriteAnimator'

interface Props {
  meta: MetaState
  heroId: string
  campaignId: string
  onSelectStage: (stageId: string) => void
  onBack: () => void
}

const OBJECTIVE_ICON: Record<StageObjectiveType, AsterVowIconName> = {
  elimination: 'stage-elimination', survival: 'stage-survival', defense: 'stage-defense', hunt: 'stage-hunt',
  destroy: 'stage-destroy', collection: 'stage-collection', escape: 'stage-escape', boss: 'stage-boss',
}

interface ChapterMapConfig {
  chapterLabel: string
  iconName: AsterVowIconName
  mapImage: string
  imageWidth: number
  imageHeight: number
  nodePositions: Record<number, { x: number; y: number }>
}

// 2026-08-19 換成使用者提供的「道路式編號節點包 v2」：1~10 的石製節點與數字
// 已經直接畫進圖片本身，程式不再疊加節點底板/編號（見
// src/styles/bakedCampaignNodes.css），座標只用於透明點擊區、動態星星、鎖定
// 圖示與目前關卡光圈。魔王城圖片比例是 902×1744，其餘八張都是 941×1672。
const CHAPTER_MAP_CONFIG: Record<string, ChapterMapConfig> = {
  [CAMPAIGN_ID_FOREST_RUINS]: {
    chapterLabel: '森林遺跡',
    iconName: 'chapter-forest',
    mapImage: '/assets/campaign-numbered/forest_ruins_numbered.webp',
    imageWidth: 941, imageHeight: 1672,
    nodePositions: {
      1: { x: 49, y: 92 }, 2: { x: 39, y: 81 }, 3: { x: 80, y: 70 }, 4: { x: 15, y: 66 }, 5: { x: 47, y: 59 },
      6: { x: 76, y: 55 }, 7: { x: 16, y: 36 }, 8: { x: 51, y: 34 }, 9: { x: 35, y: 18 }, 10: { x: 66, y: 9 },
    },
  },
  [CAMPAIGN_ID_SNOWFIELD]: {
    chapterLabel: '雪原',
    iconName: 'chapter-snow',
    mapImage: '/assets/campaign-numbered/snowfield_numbered.webp',
    imageWidth: 941, imageHeight: 1672,
    nodePositions: {
      1: { x: 50, y: 94 }, 2: { x: 34, y: 85 }, 3: { x: 50, y: 72 }, 4: { x: 70, y: 65 }, 5: { x: 75, y: 54 },
      6: { x: 73, y: 44 }, 7: { x: 70, y: 36 }, 8: { x: 58, y: 29 }, 9: { x: 49, y: 19 }, 10: { x: 50, y: 12 },
    },
  },
  [CAMPAIGN_ID_DEMON_CASTLE]: {
    chapterLabel: '魔王城',
    iconName: 'chapter-castle',
    mapImage: '/assets/campaign-numbered/demon_castle_numbered.webp',
    imageWidth: 902, imageHeight: 1744,
    nodePositions: {
      1: { x: 49, y: 94 }, 2: { x: 39, y: 85 }, 3: { x: 54, y: 76 }, 4: { x: 47, y: 67 }, 5: { x: 53, y: 59 },
      6: { x: 45, y: 52 }, 7: { x: 58, y: 44 }, 8: { x: 64, y: 34 }, 9: { x: 58, y: 23 }, 10: { x: 64, y: 12 },
    },
  },
  [CAMPAIGN_ID_RIFT_BROKEN_SKY]: {
    chapterLabel: '破碎天幕',
    iconName: 'chapter-rift',
    mapImage: '/assets/campaign-numbered/rift_broken_sky_numbered.webp',
    imageWidth: 941, imageHeight: 1672,
    nodePositions: {
      1: { x: 18, y: 93 }, 2: { x: 23, y: 84 }, 3: { x: 42, y: 75 }, 4: { x: 50, y: 66 }, 5: { x: 30, y: 57 },
      6: { x: 69, y: 57 }, 7: { x: 54, y: 47 }, 8: { x: 34, y: 36 }, 9: { x: 50, y: 24 }, 10: { x: 72, y: 13 },
    },
  },
  [CAMPAIGN_ID_RIFT_VOID_CHASM]: {
    chapterLabel: '虛空裂谷',
    iconName: 'chapter-rift',
    mapImage: '/assets/campaign-numbered/rift_void_chasm_numbered.webp',
    imageWidth: 941, imageHeight: 1672,
    nodePositions: {
      1: { x: 19, y: 10 }, 2: { x: 25, y: 20 }, 3: { x: 26, y: 31 }, 4: { x: 29, y: 43 }, 5: { x: 44, y: 49 },
      6: { x: 68, y: 52 }, 7: { x: 76, y: 62 }, 8: { x: 75, y: 73 }, 9: { x: 64, y: 84 }, 10: { x: 50, y: 93 },
    },
  },
  [CAMPAIGN_ID_RIFT_ECLIPSE_CORE]: {
    chapterLabel: '星蝕核心',
    iconName: 'chapter-rift',
    mapImage: '/assets/campaign-numbered/rift_eclipse_core_numbered.webp',
    imageWidth: 941, imageHeight: 1672,
    nodePositions: {
      1: { x: 50, y: 91 }, 2: { x: 78, y: 82 }, 3: { x: 77, y: 69 }, 4: { x: 72, y: 58 }, 5: { x: 50, y: 56 },
      6: { x: 21, y: 53 }, 7: { x: 17, y: 42 }, 8: { x: 34, y: 38 }, 9: { x: 50, y: 34 }, 10: { x: 52, y: 27 },
    },
  },
  [CAMPAIGN_ID_DEEP_CORAL_SHALLOWS]: {
    chapterLabel: '珊瑚淺灘',
    iconName: 'chapter-deep-sea',
    mapImage: '/assets/campaign-numbered/deep_coral_shallows_numbered.webp',
    imageWidth: 941, imageHeight: 1672,
    nodePositions: {
      1: { x: 50, y: 93 }, 2: { x: 58, y: 85 }, 3: { x: 35, y: 78 }, 4: { x: 18, y: 68 }, 5: { x: 18, y: 54 },
      6: { x: 47, y: 65 }, 7: { x: 80, y: 55 }, 8: { x: 82, y: 38 }, 9: { x: 73, y: 24 }, 10: { x: 22, y: 12 },
    },
  },
  [CAMPAIGN_ID_DEEP_SUNKEN_CAPITAL]: {
    chapterLabel: '沉沒王城',
    iconName: 'chapter-deep-sea',
    mapImage: '/assets/campaign-numbered/deep_sunken_capital_numbered.webp',
    imageWidth: 941, imageHeight: 1672,
    nodePositions: {
      1: { x: 50, y: 93 }, 2: { x: 50, y: 82 }, 3: { x: 33, y: 72 }, 4: { x: 67, y: 72 }, 5: { x: 50, y: 60 },
      6: { x: 34, y: 50 }, 7: { x: 66, y: 50 }, 8: { x: 50, y: 40 }, 9: { x: 50, y: 27 }, 10: { x: 50, y: 11 },
    },
  },
  [CAMPAIGN_ID_DEEP_EMPEROR_ABYSS]: {
    chapterLabel: '海皇深淵',
    iconName: 'chapter-deep-sea',
    mapImage: '/assets/campaign-numbered/deep_emperor_abyss_numbered.webp',
    imageWidth: 941, imageHeight: 1672,
    nodePositions: {
      1: { x: 52, y: 8 }, 2: { x: 36, y: 17 }, 3: { x: 27, y: 28 }, 4: { x: 25, y: 40 }, 5: { x: 62, y: 34 },
      6: { x: 70, y: 55 }, 7: { x: 58, y: 65 }, 8: { x: 70, y: 75 }, 9: { x: 58, y: 84 }, 10: { x: 50, y: 89 },
    },
  },
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

// 體力槽純粹是示意用的裝飾條，遊戲目前沒有任何消耗/回復體力的機制，不綁定
// 真實數值（使用者 2026-08-19 明確選擇「先放一條純裝飾的進度條」）。
const DECORATIVE_STAMINA = { current: 8, max: 10 }

export default function CampaignMapScreen({ meta, heroId, campaignId, onSelectStage, onBack }: Props) {
  const config = CHAPTER_MAP_CONFIG[campaignId] ?? CHAPTER_MAP_CONFIG[CAMPAIGN_ID_FOREST_RUINS]
  const stages = getChapterStages(campaignId)
  const totalStars = getChapterTotalStars(meta, campaignId)
  const maxStars = getChapterMaxStars(campaignId)
  const hero = HEROES.find(h => h.id === heroId)
  const heroLevel = meta.heroProgress[heroId]?.level ?? 1
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null)

  const selectedStage = selectedStageId ? stages.find(s => s.id === selectedStageId) ?? null : null
  const selectedProgress = selectedStage ? getStageProgress(meta, selectedStage.id) : null

  // 點選關卡時，在該節點上站著顯示目前編成的出戰隊伍（隊長+最多2位夥伴）
  // 小人模組，跟大廳關卡預覽卡右下角同一套 SpriteAnimator 站立呈現方式。
  const party = sanitizeParty(meta.party, HEROES.map(h => h.id), heroId)
  const partyHeroIds = getPartyHeroIds(party)

  return (
    <div className="page cms-screen cms-screen-baked">
      <div className="cms-hud">
        <div className="cms-hud-toprow">
          <button className="cms-hud-back" onClick={onBack} aria-label="返回">←</button>
          <div className="cms-hud-pills">
            <span className="cms-hud-pill cms-hud-pill-stamina">
              <AsterVowIcon name="shop-zap" size={14} />
              <span className="cms-hud-pill-bar"><span style={{ width: `${(DECORATIVE_STAMINA.current / DECORATIVE_STAMINA.max) * 100}%` }} /></span>
              {DECORATIVE_STAMINA.current}/{DECORATIVE_STAMINA.max}
            </span>
            <span className="cms-hud-pill cms-hud-pill-gold"><AsterVowIcon name="system-gold" size={14} />{meta.gold}</span>
            <span className="cms-hud-pill cms-hud-pill-level">
              {hero?.avatar && <img className="cms-hud-pill-avatar" src={versionedAsset(hero.avatar)} alt="" />}
              Lv.{heroLevel}
            </span>
            <span className="cms-hud-pill cms-hud-pill-stardust"><AsterVowIcon name="system-stardust" size={14} />{meta.stardust}</span>
          </div>
        </div>

        <div className="cms-hud-progress">
          <div className="cms-hud-progress-label"><AsterVowIcon name={config.iconName} size={16} /> {config.chapterLabel}　{totalStars}/{maxStars}★</div>
          <div className="cms-milestones">
            {CHAPTER_STAR_MILESTONES.map(m => (
              <div key={m} className={`cms-milestone${totalStars >= m ? ' reached' : ''}`}>
                <div className="cms-milestone-dot">{totalStars >= m ? '✓' : m}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cms-map">
        <div
          className="cms-map-forest"
          style={{
            backgroundImage: `url(${config.mapImage})`,
            ['--campaign-map-width' as string]: config.imageWidth,
            ['--campaign-map-height' as string]: config.imageHeight,
          }}
        >
          {stages.map((stage, i) => {
            const prog = getStageProgress(meta, stage.id)
            const unlocked = isStageUnlocked(meta, stage.id)
            const isBoss = !!stage.boss
            const isFinal = i === stages.length - 1
            const pos = config.nodePositions[stage.stageNumber] ?? { x: 50, y: 50 }
            const isSelected = stage.id === selectedStageId
            return (
              <button
                key={stage.id}
                className={`cms-map-node${isFinal ? ' final' : isBoss ? ' boss' : ''}${unlocked ? '' : ' locked'}${prog.cleared ? ' cleared' : ''}${isSelected ? ' selected' : ''}`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                disabled={!unlocked}
                aria-label={`${stage.stageNumber}. ${stage.name}`}
                onClick={() => unlocked && setSelectedStageId(prev => (prev === stage.id ? null : stage.id))}
              >
                {isSelected && (
                  <div className="cms-map-party-stand" aria-hidden="true">
                    {partyHeroIds.map((pid, pi) => {
                      const partyHero = HEROES.find(h => h.id === pid)
                      if (!partyHero) return null
                      const sprite = getHeroSprite(partyHero, meta.heroProgress[pid]?.stars ?? 0)
                      const scale = 26 / sprite.frameHeight
                      return (
                        <div key={pid} className={`cms-map-stand-unit slot-${pi}`}>
                          <SpriteAnimator sprite={sprite} state="idle" scale={scale} />
                        </div>
                      )
                    })}
                  </div>
                )}
                <span className="cms-map-badge">
                  {unlocked
                    ? <AsterVowIcon name={isBoss ? 'stage-boss' : OBJECTIVE_ICON[stage.objective.type]} size={isFinal ? 22 : isBoss ? 17 : 13} />
                    : <AsterVowIcon name="system-lock" size={13} />}
                  {!isFinal && <span className="cms-map-num">{stage.stageNumber}</span>}
                </span>
                {unlocked && <StarRow stars={prog.stars} />}
              </button>
            )
          })}
        </div>
      </div>

      {selectedStage && selectedProgress && (
        <>
          {/* 純點擊捕捉層，不加暗化/模糊——地圖背景維持清晰可見，跟彈出面板
              同一個視覺層次，只用來接住「點空白處關掉面板」的手勢。 */}
          <div className="cms-sheet-tapcatch" onClick={() => setSelectedStageId(null)} />
          <div className="cms-sheet">
            <div className="cms-sheet-handle" />
            <div className="cms-sheet-body">
              <div className="cms-sheet-thumb" style={{ backgroundImage: `url(${CAMPAIGN_STAGE_BG_PATH[selectedStage.bgTheme]})` }}>
                <span className="cms-sheet-num">{selectedStage.stageNumber}</span>
              </div>
              <div className="cms-sheet-info">
                <div className="cms-sheet-title">
                  {selectedStage.boss && <AsterVowIcon name="stage-boss" size={16} />}
                  {selectedStage.name}
                </div>
                <StarRow stars={selectedProgress.stars} />
                <div className="cms-sheet-conditions">
                  {selectedStage.starConditions.map((c, i) => (
                    <div key={i} className={`cms-sheet-condition${selectedProgress.stars > i ? ' done' : ''}`}>
                      <span className={`cms-star${selectedProgress.stars > i ? ' filled' : ''}`}>★</span>
                      {c.description}
                    </div>
                  ))}
                </div>
                <div className="cms-sheet-drops">
                  <span className="cms-sheet-drop"><AsterVowIcon name="equip-weapon" size={15} />裝備</span>
                  <span className="cms-sheet-drop"><AsterVowIcon name="system-enhance-stone" size={15} />強化石</span>
                  {!selectedProgress.firstClearClaimed && (
                    <>
                      <span className="cms-sheet-drop cms-sheet-drop-first"><AsterVowIcon name="system-gold" size={15} />+{selectedStage.firstClearReward.gold}</span>
                      <span className="cms-sheet-drop cms-sheet-drop-first"><AsterVowIcon name="system-talent" size={15} />+{selectedStage.firstClearReward.heroExp} EXP</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button className="cms-sheet-start" onClick={() => onSelectStage(selectedStage.id)}>出發！</button>
          </div>
        </>
      )}
    </div>
  )
}
