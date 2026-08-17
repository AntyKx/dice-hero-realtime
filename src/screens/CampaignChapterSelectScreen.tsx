import type { MetaState } from '../types'
import { CAMPAIGN_CHAPTER_ORDER, CAMPAIGN_SAGAS } from '../campaign/campaignTypes'
import { getChapterStages } from '../campaign/campaignStages'
import { getChapterTotalStars, getChapterMaxStars, isChapterUnlocked } from '../campaign/campaignProgress'
import { CAMPAIGN_CHAPTER_META } from '../campaign/campaignChapterMeta'
import AsterVowIcon from '../components/AsterVowIcon'

interface Props {
  meta: MetaState
  sagaId: string
  onSelectChapter: (campaignId: string) => void
  onBack: () => void
}

// 章節選擇畫面（2026-08-16 新增，稍晚改成篇底下的第二層）：SagaSelectScreen
// 選好篇之後進來這裡，只列出該篇底下的 3 個章節（見 campaignTypes.ts 的
// CAMPAIGN_SAGAS）。跟 CampaignMapScreen.tsx 的 CHAPTER_MAP_CONFIG 分開放
// （那邊是地圖底圖+節點座標，這邊只是選擇卡片），避免互相牽動。展示用的
// label/icon/color/cover 集中在 campaignChapterMeta.ts（2026-08-17 抽出來
// 跟 AdventureReadyScreen.tsx 大廳預覽卡共用，不要各自維護一份）。
const CHAPTER_CARD_META = CAMPAIGN_CHAPTER_META

export default function CampaignChapterSelectScreen({ meta, sagaId, onSelectChapter, onBack }: Props) {
  const saga = CAMPAIGN_SAGAS.find(s => s.id === sagaId) ?? CAMPAIGN_SAGAS[0]
  return (
    <div className="page ccs-screen">
      <header className="topbar">
        <div>
          <div className="eyebrow">ASTERVOW // ASTRAL NAVIGATION</div>
          <h1>{saga.label}</h1>
          <p>選擇一個章節展開固定式主線關卡，通關章節最終戰即可解鎖下一章。</p>
        </div>
        <button className="ghost" onClick={onBack}>← 返回</button>
      </header>

      <div className="ccs-list">
        {saga.chapters.map(campaignId => {
          const cardMeta = CHAPTER_CARD_META[campaignId]
          const unlocked = isChapterUnlocked(meta, campaignId)
          const totalStars = getChapterTotalStars(meta, campaignId)
          const maxStars = getChapterMaxStars(campaignId)
          const stageCount = getChapterStages(campaignId).length
          // 鎖定提示要看「全域」上一個章節（可能是別篇的最後一章，例如深海遺城篇
          // 第一章的上一關其實是裂隙前兆篇最後一章），不是這篇自己的陣列上一個。
          const globalIdx = CAMPAIGN_CHAPTER_ORDER.indexOf(campaignId as (typeof CAMPAIGN_CHAPTER_ORDER)[number])
          const prevCampaignId = globalIdx > 0 ? CAMPAIGN_CHAPTER_ORDER[globalIdx - 1] : null
          const prevLabel = prevCampaignId ? CHAPTER_CARD_META[prevCampaignId]?.label : null
          return (
            <button
              key={campaignId}
              className={`ccs-card${unlocked ? '' : ' locked'}`}
              style={{ '--ccs-color': cardMeta.color } as React.CSSProperties}
              disabled={!unlocked}
              onClick={() => unlocked && onSelectChapter(campaignId)}
            >
              <div className="ccs-cover" style={{ backgroundImage: `url(${cardMeta.cover})` }}>
                {!unlocked && (
                  <div className="ccs-lock-overlay">
                    <AsterVowIcon name="system-lock" size={28} />
                    <span>需先通關「{prevLabel}」最終戰</span>
                  </div>
                )}
              </div>
              <div className="ccs-body">
                <div className="ccs-title"><AsterVowIcon name={cardMeta.iconName} size={22} /> {cardMeta.label}</div>
                <div className="ccs-sub">{cardMeta.sub}</div>
                <div className="ccs-meta-row">
                  <span>共 {stageCount} 關</span>
                  {unlocked && <span>{totalStars} / {maxStars} ★</span>}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
