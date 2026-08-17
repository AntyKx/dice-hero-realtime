import type { MetaState } from '../types'
import { HEROES } from '../data'
import type { StageObjectiveType } from '../campaign/campaignTypes'
import {
  CAMPAIGN_ID_FOREST_RUINS, CAMPAIGN_ID_SNOWFIELD, CAMPAIGN_ID_DEMON_CASTLE,
  CAMPAIGN_ID_RIFT_BROKEN_SKY, CAMPAIGN_ID_RIFT_VOID_CHASM, CAMPAIGN_ID_RIFT_ECLIPSE_CORE,
  CAMPAIGN_ID_DEEP_CORAL_SHALLOWS, CAMPAIGN_ID_DEEP_SUNKEN_CAPITAL, CAMPAIGN_ID_DEEP_EMPEROR_ABYSS,
  CHAPTER_STAR_MILESTONES,
} from '../campaign/campaignTypes'
import { getChapterStages } from '../campaign/campaignStages'
import { getStageProgress, getChapterTotalStars, getChapterMaxStars, isStageUnlocked } from '../campaign/campaignProgress'
import AsterVowIcon, { type AsterVowIconName } from '../components/AsterVowIcon'

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
  eyebrow: string
  title: string
  chapterLabel: string
  iconName: AsterVowIconName
  mapImage: string
  nodePositions: Record<number, { x: number; y: number }>
}

// 九張地圖的地圖總覽圖 + 10 個節點座標（畫面百分比）。2026-08-17 全面換成
// 使用者提供的「ASTERVOW_九場景」Q版美術包，取代前一版寫實風地圖——這次
// 座標直接取自素材包附的 JSON（`xPercent`/`yPercent`，圖片固定尺寸
// 941×1672），JSON 本身就同時附百分比與像素座標且彼此吻合，比對過節點
// 標示參考圖也一致，直接採用沒有重新量測。用 pairwise 像素距離腳本複驗過
// （115px 一般節點／150px Boss或終點節點的門檻），9 張地圖裡只有雪原地城
// 的 9-10 號有一組 134px（低於門檻但仍在安全範圍，手動核對過不會互相框
// 到），其餘全部 clear。
const CHAPTER_MAP_CONFIG: Record<string, ChapterMapConfig> = {
  [CAMPAIGN_ID_FOREST_RUINS]: {
    eyebrow: 'ASTERVOW // ASTRAL NAVIGATION',
    title: '第一航道 · 森林遺跡',
    chapterLabel: '森林遺跡',
    iconName: 'chapter-forest',
    mapImage: '/assets/campaign/forest_ruins_map_full.jpg',
    nodePositions: {
      1: { x: 49, y: 92 }, 2: { x: 39, y: 81 }, 3: { x: 80, y: 70 }, 4: { x: 15, y: 66 }, 5: { x: 47, y: 59 },
      6: { x: 76, y: 55 }, 7: { x: 16, y: 36 }, 8: { x: 51, y: 34 }, 9: { x: 35, y: 18 }, 10: { x: 70, y: 14 },
    },
  },
  [CAMPAIGN_ID_SNOWFIELD]: {
    eyebrow: 'ASTERVOW // ASTRAL NAVIGATION',
    title: '第二航道 · 雪原',
    chapterLabel: '雪原',
    iconName: 'chapter-snow',
    mapImage: '/assets/campaign/snowfield_map_full.jpg',
    nodePositions: {
      1: { x: 50, y: 94 }, 2: { x: 22, y: 82 }, 3: { x: 50, y: 72 }, 4: { x: 70, y: 65 }, 5: { x: 75, y: 54 },
      6: { x: 73, y: 44 }, 7: { x: 70, y: 36 }, 8: { x: 58, y: 29 }, 9: { x: 40, y: 21 }, 10: { x: 50, y: 13 },
    },
  },
  [CAMPAIGN_ID_DEMON_CASTLE]: {
    eyebrow: 'ASTERVOW // ASTRAL NAVIGATION',
    title: '第三航道 · 魔王城',
    chapterLabel: '魔王城',
    iconName: 'chapter-castle',
    mapImage: '/assets/campaign/demon_castle_map_full.jpg',
    nodePositions: {
      1: { x: 50, y: 92 }, 2: { x: 50, y: 82 }, 3: { x: 27, y: 72 }, 4: { x: 77, y: 70 }, 5: { x: 47, y: 64 },
      6: { x: 18, y: 54 }, 7: { x: 23, y: 32 }, 8: { x: 18, y: 20 }, 9: { x: 52, y: 26 }, 10: { x: 72, y: 12 },
    },
  },
  // 裂隙前兆／深海遺城：各自 3 個子章節，每個子章節都是獨立 campaignId +
  // 獨立 10 關地圖，座標同樣來自上面「ASTERVOW_九場景」JSON。
  [CAMPAIGN_ID_RIFT_BROKEN_SKY]: {
    eyebrow: 'ASTERVOW // ASTRAL NAVIGATION',
    title: '裂隙前兆 · 第一章 · 破碎天幕',
    chapterLabel: '破碎天幕',
    iconName: 'chapter-rift',
    mapImage: '/assets/campaign/rift_omen_broken_sky_map_full.jpg',
    nodePositions: {
      1: { x: 13, y: 92 }, 2: { x: 20, y: 83 }, 3: { x: 44, y: 75 }, 4: { x: 55, y: 66 }, 5: { x: 27, y: 57 },
      6: { x: 69, y: 57 }, 7: { x: 53, y: 45 }, 8: { x: 38, y: 36 }, 9: { x: 56, y: 26 }, 10: { x: 74, y: 15 },
    },
  },
  [CAMPAIGN_ID_RIFT_VOID_CHASM]: {
    eyebrow: 'ASTERVOW // ASTRAL NAVIGATION',
    title: '裂隙前兆 · 第二章 · 虛空裂谷',
    chapterLabel: '虛空裂谷',
    iconName: 'chapter-rift',
    mapImage: '/assets/campaign/rift_omen_void_chasm_map_full.jpg',
    nodePositions: {
      1: { x: 18, y: 8 }, 2: { x: 24, y: 19 }, 3: { x: 30, y: 32 }, 4: { x: 28, y: 45 }, 5: { x: 42, y: 49 },
      6: { x: 60, y: 49 }, 7: { x: 72, y: 62 }, 8: { x: 75, y: 75 }, 9: { x: 63, y: 87 }, 10: { x: 50, y: 94 },
    },
  },
  [CAMPAIGN_ID_RIFT_ECLIPSE_CORE]: {
    eyebrow: 'ASTERVOW // ASTRAL NAVIGATION',
    title: '裂隙前兆 · 第三章 · 星蝕核心',
    chapterLabel: '星蝕核心',
    iconName: 'chapter-rift',
    mapImage: '/assets/campaign/rift_omen_eclipse_core_map_full.jpg',
    nodePositions: {
      1: { x: 52, y: 91 }, 2: { x: 77, y: 84 }, 3: { x: 78, y: 68 }, 4: { x: 65, y: 57 }, 5: { x: 36, y: 60 },
      6: { x: 17, y: 51 }, 7: { x: 15, y: 37 }, 8: { x: 39, y: 43 }, 9: { x: 52, y: 34 }, 10: { x: 53, y: 20 },
    },
  },
  [CAMPAIGN_ID_DEEP_CORAL_SHALLOWS]: {
    eyebrow: 'ASTERVOW // ASTRAL NAVIGATION',
    title: '深海遺城 · 第一章 · 珊瑚淺灘',
    chapterLabel: '珊瑚淺灘',
    iconName: 'chapter-deep-sea',
    mapImage: '/assets/campaign/deep_sea_coral_shallows_map_full.jpg',
    nodePositions: {
      1: { x: 72, y: 86 }, 2: { x: 50, y: 91 }, 3: { x: 25, y: 79 }, 4: { x: 17, y: 63 }, 5: { x: 20, y: 48 },
      6: { x: 50, y: 65 }, 7: { x: 80, y: 54 }, 8: { x: 82, y: 35 }, 9: { x: 72, y: 22 }, 10: { x: 25, y: 14 },
    },
  },
  [CAMPAIGN_ID_DEEP_SUNKEN_CAPITAL]: {
    eyebrow: 'ASTERVOW // ASTRAL NAVIGATION',
    title: '深海遺城 · 第二章 · 沉沒王城',
    chapterLabel: '沉沒王城',
    iconName: 'chapter-deep-sea',
    mapImage: '/assets/campaign/deep_sea_sunken_capital_map_full.jpg',
    nodePositions: {
      1: { x: 50, y: 93 }, 2: { x: 50, y: 82 }, 3: { x: 25, y: 72 }, 4: { x: 75, y: 72 }, 5: { x: 50, y: 60 },
      6: { x: 25, y: 50 }, 7: { x: 75, y: 50 }, 8: { x: 50, y: 40 }, 9: { x: 50, y: 27 }, 10: { x: 50, y: 14 },
    },
  },
  [CAMPAIGN_ID_DEEP_EMPEROR_ABYSS]: {
    eyebrow: 'ASTERVOW // ASTRAL NAVIGATION',
    title: '深海遺城 · 第三章 · 海皇深淵',
    chapterLabel: '海皇深淵',
    iconName: 'chapter-deep-sea',
    mapImage: '/assets/campaign/deep_sea_emperor_abyss_map_full.jpg',
    nodePositions: {
      1: { x: 52, y: 8 }, 2: { x: 36, y: 17 }, 3: { x: 27, y: 28 }, 4: { x: 25, y: 40 }, 5: { x: 66, y: 33 },
      6: { x: 52, y: 55 }, 7: { x: 66, y: 65 }, 8: { x: 72, y: 75 }, 9: { x: 58, y: 84 }, 10: { x: 50, y: 92 },
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

export default function CampaignMapScreen({ meta, heroId, campaignId, onSelectStage, onBack }: Props) {
  const config = CHAPTER_MAP_CONFIG[campaignId] ?? CHAPTER_MAP_CONFIG[CAMPAIGN_ID_FOREST_RUINS]
  const stages = getChapterStages(campaignId)
  const totalStars = getChapterTotalStars(meta, campaignId)
  const maxStars = getChapterMaxStars(campaignId)
  const heroName = HEROES.find(h => h.id === heroId)?.name ?? heroId

  return (
    <div className="page cms-screen">
      <header className="topbar">
        <div>
          <div className="eyebrow">{config.eyebrow}</div>
          <h1>{config.title}</h1>
        </div>
        <button className="ghost" onClick={onBack}>← 返回</button>
      </header>

      <div className="cms-summary">
        <div className="cms-summary-title"><AsterVowIcon name={config.iconName} size={20} /> {config.chapterLabel}　{totalStars} / {maxStars} ★</div>
        <div className="cms-milestones">
          {CHAPTER_STAR_MILESTONES.map(m => (
            <div key={m} className={`cms-milestone${totalStars >= m ? ' reached' : ''}`}>
              <div className="cms-milestone-dot">{totalStars >= m ? '✓' : m}</div>
              <div className="cms-milestone-label">{m}★</div>
            </div>
          ))}
        </div>
      </div>

      {/* 關卡地圖：一張無接縫長圖直接當背景，路徑本身就是圖裡畫好的小徑，
          刻意不疊加額外的連接線。 */}
      <div className="cms-map">
        <div className="cms-map-forest" style={{ backgroundImage: `url(${config.mapImage})` }}>
          {stages.map((stage, i) => {
            const prog = getStageProgress(meta, stage.id)
            const unlocked = isStageUnlocked(meta, stage.id)
            const isBoss = !!stage.boss
            const isFinal = i === stages.length - 1
            const pos = config.nodePositions[stage.stageNumber] ?? { x: 50, y: 50 }
            return (
              <button
                key={stage.id}
                className={`cms-map-node${isFinal ? ' final' : isBoss ? ' boss' : ''}${unlocked ? '' : ' locked'}${prog.cleared ? ' cleared' : ''}`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                disabled={!unlocked}
                onClick={() => unlocked && onSelectStage(stage.id)}
              >
                <span className="cms-map-badge">
                  {unlocked
                    ? <AsterVowIcon name={isBoss ? 'stage-boss' : OBJECTIVE_ICON[stage.objective.type]} size={isFinal ? 22 : isBoss ? 17 : 13} />
                    : <AsterVowIcon name="system-lock" size={13} />}
                  {!isFinal && <span className="cms-map-num">{stage.stageNumber}</span>}
                </span>
                <span className="cms-map-name">{stage.name}</span>
                {unlocked && <StarRow stars={prog.stars} />}
              </button>
            )
          })}
        </div>
      </div>

      <p className="cms-hint">目前出戰英雄：{heroName}｜通關（不需三星）即可解鎖下一關，三星是額外的精通目標</p>
    </div>
  )
}
