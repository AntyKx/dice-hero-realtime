import type { MetaState } from '../types'
import { CAMPAIGN_SAGAS } from '../campaign/campaignTypes'
import { isSagaUnlocked, getSagaTotalStars, getSagaMaxStars } from '../campaign/campaignProgress'
import AsterVowIcon, { type AsterVowIconName } from '../components/AsterVowIcon'

interface Props {
  meta: MetaState
  onSelectSaga: (sagaId: string) => void
  onBack: () => void
}

interface SagaCardMeta {
  iconName: AsterVowIconName
  cover: string
  color: string
}

// 篇選擇畫面（2026-08-16 補上）：CampaignChapterSelectScreen.tsx 原本直接
// 攤平列出九個章節，現在改成先選「篇」（灰燼王國篇/裂隙前兆篇/深海遺城篇，
// 見 campaignTypes.ts 的 CAMPAIGN_SAGAS），再進去選篇底下的 3 個章節。
//
// 2026-08-18：封面原本借用每篇第一個章節的地圖圖（跟 CampaignChapterSelectScreen
// 裡面那個章節卡片用的是同一張圖），外層（篇）跟內層（章）視覺完全重複，
// 玩家分不出兩層差在哪。改用專門畫的篇級跨章節全景圖（涵蓋該篇全部
// 3 個章節的場景元素，例如灰燼王國篇一張圖橫跨森林→雪原→魔王城），
// 只用在這個外層畫面，內層章節卡片維持原本各自的單一地圖封面不變。
const SAGA_CARD_META: Record<string, SagaCardMeta> = {
  ash_kingdom_saga: {
    iconName: 'chapter-castle', cover: '/assets/campaign/ash_kingdom_saga_cover.jpg', color: '#d8a24a',
  },
  rift_omen_saga: {
    iconName: 'chapter-rift', cover: '/assets/campaign/rift_omen_saga_cover.jpg', color: '#8a7fe0',
  },
  deep_sea_saga: {
    iconName: 'chapter-deep-sea', cover: '/assets/campaign/deep_sea_saga_cover.jpg', color: '#4fb3c9',
  },
}

export default function SagaSelectScreen({ meta, onSelectSaga, onBack }: Props) {
  return (
    <div className="page ccs-screen">
      <header className="topbar">
        <div>
          <div className="eyebrow">ASTERVOW // ASTRAL NAVIGATION</div>
          <h1>星界遠征</h1>
          <p>選擇一篇展開固定式主線關卡，通關篇內最終戰即可解鎖下一篇。</p>
        </div>
        <button className="ghost" onClick={onBack}>← 返回</button>
      </header>

      <div className="ccs-list">
        {CAMPAIGN_SAGAS.map((saga, i) => {
          const cardMeta = SAGA_CARD_META[saga.id]
          const unlocked = isSagaUnlocked(meta, saga)
          const totalStars = getSagaTotalStars(meta, saga)
          const maxStars = getSagaMaxStars(saga)
          const prevLabel = i > 0 ? CAMPAIGN_SAGAS[i - 1]?.label : null
          return (
            <button
              key={saga.id}
              className={`ccs-card${unlocked ? '' : ' locked'}`}
              style={{ '--ccs-color': cardMeta.color } as React.CSSProperties}
              disabled={!unlocked}
              onClick={() => unlocked && onSelectSaga(saga.id)}
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
                <div className="ccs-title"><AsterVowIcon name={cardMeta.iconName} size={22} /> {saga.label}</div>
                <div className="ccs-sub">{saga.sub}</div>
                <div className="ccs-meta-row">
                  <span>共 {saga.chapters.length} 章 · {saga.chapters.length * 10} 關</span>
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
