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
// 見 campaignTypes.ts 的 CAMPAIGN_SAGAS），再進去選篇底下的 3 個章節——
// 封面借每篇第一個章節的地圖圖，跟 CampaignChapterSelectScreen 的卡片
// 視覺語彙保持一致。
const SAGA_CARD_META: Record<string, SagaCardMeta> = {
  ash_kingdom_saga: {
    iconName: 'chapter-castle', cover: '/assets/campaign/forest_ruins_map_full.jpg', color: '#d8a24a',
  },
  rift_omen_saga: {
    iconName: 'chapter-rift', cover: '/assets/campaign/rift_omen_broken_sky_map_full.jpg', color: '#8a7fe0',
  },
  deep_sea_saga: {
    iconName: 'chapter-deep-sea', cover: '/assets/campaign/deep_sea_coral_shallows_map_full.jpg', color: '#4fb3c9',
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
