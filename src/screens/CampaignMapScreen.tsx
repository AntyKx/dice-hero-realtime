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

// 三個篇章的地圖總覽圖 + 10 個節點座標（畫面百分比）。2026-08-16 從 20 關
// 砍到 10 關，改用使用者提供的「森林雪原魔王城_10關自然冒險地圖包」全新
// 美術——這次素材包附的座標表本身就是依真實地標手動標定的（跟更早一版
// 20 關素材包附的「其實是套用生成模板」座標不同，這次有先用戰鬥區域標記
// 圖逐一肉眼核對過，比對結果吻合），直接採用，沒有重新量測。三張地圖美術
// 都是 864×1821 無接縫長圖，node 座標用百分比定位，縮放後仍對齊；用
// pairwise 像素距離腳本複驗過，任兩關的圖標不會互相框到。
const CHAPTER_MAP_CONFIG: Record<string, ChapterMapConfig> = {
  [CAMPAIGN_ID_FOREST_RUINS]: {
    eyebrow: 'ASTERVOW // ASTRAL NAVIGATION',
    title: '第一航道 · 森林遺跡',
    chapterLabel: '森林遺跡',
    iconName: 'chapter-forest',
    mapImage: '/assets/campaign/forest_ruins_map_full.jpg',
    nodePositions: {
      1: { x: 38.2, y: 6.6 }, 2: { x: 78.7, y: 16.5 }, 3: { x: 20.8, y: 18.1 }, 4: { x: 46.3, y: 30.8 }, 5: { x: 22.0, y: 41.7 },
      6: { x: 75.2, y: 40.4 }, 7: { x: 25.5, y: 58.2 }, 8: { x: 75.2, y: 68.1 }, 9: { x: 33.0, y: 76.3 }, 10: { x: 49.8, y: 91.2 },
    },
  },
  [CAMPAIGN_ID_SNOWFIELD]: {
    eyebrow: 'ASTERVOW // ASTRAL NAVIGATION',
    title: '第二航道 · 雪原',
    chapterLabel: '雪原',
    iconName: 'chapter-snow',
    mapImage: '/assets/campaign/snowfield_map_full.jpg',
    nodePositions: {
      1: { x: 45.1, y: 8.0 }, 2: { x: 23.1, y: 18.7 }, 3: { x: 78.7, y: 22.2 }, 4: { x: 48.6, y: 32.1 }, 5: { x: 19.7, y: 38.7 },
      6: { x: 78.1, y: 44.2 }, 7: { x: 49.8, y: 57.7 }, 8: { x: 75.2, y: 68.1 }, 9: { x: 22.0, y: 70.6 }, 10: { x: 49.8, y: 93.4 },
    },
  },
  [CAMPAIGN_ID_DEMON_CASTLE]: {
    eyebrow: 'ASTERVOW // ASTRAL NAVIGATION',
    title: '第三航道 · 魔王城',
    chapterLabel: '魔王城',
    iconName: 'chapter-castle',
    mapImage: '/assets/campaign/demon_castle_map_full.jpg',
    nodePositions: {
      1: { x: 49.8, y: 8.0 }, 2: { x: 23.1, y: 18.4 }, 3: { x: 70.6, y: 25.0 }, 4: { x: 76.4, y: 35.1 }, 5: { x: 20.8, y: 39.0 },
      6: { x: 76.4, y: 49.4 }, 7: { x: 40.5, y: 57.1 }, 8: { x: 22.0, y: 69.7 }, 9: { x: 60.2, y: 78.0 }, 10: { x: 49.8, y: 93.4 },
    },
  },
  // 裂隙前兆／深海遺城（2026-08-16 稍晚新增）：各自 3 個子章節，每個子章節
  // 都是獨立 campaignId + 獨立 10 關地圖，座標直接採用「裂隙前兆與深海遺城_
  // 六章10關自然冒險地圖包」附的手動標定座標（已用戰鬥區域標記圖核對過）。
  [CAMPAIGN_ID_RIFT_BROKEN_SKY]: {
    eyebrow: 'ASTERVOW // ASTRAL NAVIGATION',
    title: '裂隙前兆 · 第一章 · 破碎天幕',
    chapterLabel: '破碎天幕',
    iconName: 'chapter-rift',
    mapImage: '/assets/campaign/rift_omen_broken_sky_map_full.jpg',
    nodePositions: {
      1: { x: 43.4, y: 6.6 }, 2: { x: 22.6, y: 17.6 }, 3: { x: 81.0, y: 16.5 }, 4: { x: 49.8, y: 30.2 }, 5: { x: 75.2, y: 34.6 },
      6: { x: 78.1, y: 50.5 }, 7: { x: 20.8, y: 57.7 }, 8: { x: 77.0, y: 68.1 }, 9: { x: 30.1, y: 78.0 }, 10: { x: 49.8, y: 92.9 },
    },
  },
  [CAMPAIGN_ID_RIFT_VOID_CHASM]: {
    eyebrow: 'ASTERVOW // ASTRAL NAVIGATION',
    title: '裂隙前兆 · 第二章 · 虛空裂谷',
    chapterLabel: '虛空裂谷',
    iconName: 'chapter-rift',
    mapImage: '/assets/campaign/rift_omen_void_chasm_map_full.jpg',
    nodePositions: {
      1: { x: 47.5, y: 5.2 }, 2: { x: 24.3, y: 14.3 }, 3: { x: 75.2, y: 15.4 }, 4: { x: 49.8, y: 32.4 }, 5: { x: 25.5, y: 39.3 },
      6: { x: 49.8, y: 46.7 }, 7: { x: 75.2, y: 49.4 }, 8: { x: 22.0, y: 61.0 }, 9: { x: 57.9, y: 79.6 }, 10: { x: 49.8, y: 92.8 },
    },
  },
  [CAMPAIGN_ID_RIFT_ECLIPSE_CORE]: {
    eyebrow: 'ASTERVOW // ASTRAL NAVIGATION',
    title: '裂隙前兆 · 第三章 · 星蝕核心',
    chapterLabel: '星蝕核心',
    iconName: 'chapter-rift',
    mapImage: '/assets/campaign/rift_omen_eclipse_core_map_full.jpg',
    nodePositions: {
      1: { x: 40.5, y: 6.6 }, 2: { x: 75.1, y: 9.3 }, 3: { x: 23.1, y: 22.0 }, 4: { x: 49.7, y: 33.0 }, 5: { x: 75.1, y: 42.9 },
      6: { x: 28.9, y: 53.9 }, 7: { x: 75.1, y: 64.9 }, 8: { x: 25.4, y: 70.4 }, 9: { x: 49.7, y: 79.7 }, 10: { x: 49.7, y: 92.9 },
    },
  },
  [CAMPAIGN_ID_DEEP_CORAL_SHALLOWS]: {
    eyebrow: 'ASTERVOW // ASTRAL NAVIGATION',
    title: '深海遺城 · 第一章 · 珊瑚淺灘',
    chapterLabel: '珊瑚淺灘',
    iconName: 'chapter-deep-sea',
    mapImage: '/assets/campaign/deep_sea_coral_shallows_map_full.jpg',
    nodePositions: {
      1: { x: 48.6, y: 6.6 }, 2: { x: 23.1, y: 18.1 }, 3: { x: 75.2, y: 21.4 }, 4: { x: 49.8, y: 34.0 }, 5: { x: 23.1, y: 41.7 },
      6: { x: 77.5, y: 41.2 }, 7: { x: 72.9, y: 56.6 }, 8: { x: 23.1, y: 60.4 }, 9: { x: 66.0, y: 73.0 }, 10: { x: 49.8, y: 92.8 },
    },
  },
  [CAMPAIGN_ID_DEEP_SUNKEN_CAPITAL]: {
    eyebrow: 'ASTERVOW // ASTRAL NAVIGATION',
    title: '深海遺城 · 第二章 · 沉沒王城',
    chapterLabel: '沉沒王城',
    iconName: 'chapter-deep-sea',
    mapImage: '/assets/campaign/deep_sea_sunken_capital_map_full.jpg',
    nodePositions: {
      1: { x: 28.9, y: 7.7 }, 2: { x: 75.2, y: 18.7 }, 3: { x: 23.1, y: 23.6 }, 4: { x: 23.1, y: 37.3 }, 5: { x: 75.2, y: 41.2 },
      6: { x: 22.0, y: 54.9 }, 7: { x: 75.2, y: 57.7 }, 8: { x: 54.4, y: 69.2 }, 9: { x: 30.1, y: 80.2 }, 10: { x: 49.8, y: 93.4 },
    },
  },
  [CAMPAIGN_ID_DEEP_EMPEROR_ABYSS]: {
    eyebrow: 'ASTERVOW // ASTRAL NAVIGATION',
    title: '深海遺城 · 第三章 · 海皇深淵',
    chapterLabel: '海皇深淵',
    iconName: 'chapter-deep-sea',
    mapImage: '/assets/campaign/deep_sea_emperor_abyss_map_full.jpg',
    nodePositions: {
      1: { x: 75.2, y: 7.1 }, 2: { x: 25.5, y: 17.6 }, 3: { x: 20.8, y: 30.8 }, 4: { x: 75.2, y: 30.8 }, 5: { x: 71.8, y: 43.9 },
      6: { x: 20.8, y: 49.4 }, 7: { x: 28.9, y: 61.5 }, 8: { x: 75.2, y: 64.8 }, 9: { x: 49.8, y: 78.5 }, 10: { x: 49.8, y: 92.8 },
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
      </div>

      <p className="cms-hint">目前出戰英雄：{heroName}｜通關（不需三星）即可解鎖下一關，三星是額外的精通目標</p>
    </div>
  )
}
