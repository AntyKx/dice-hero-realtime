import { CHAPTER_NAMES, CHAPTER_COUNT, RIFT_OMEN_CHAPTER_NAMES, DEEP_SEA_CHAPTER_NAMES, ASH_KINGDOM_CHAPTER_NAMES } from '../mapGen'

interface Props {
  chapter: number
  goldBonus: number
  campaign?: 'main' | 'rift_omen' | 'deep_sea' | 'ash_kingdom'
  onContinue: () => void
}

const CHAPTER_CLEAR_FLAVOR: Record<number, string> = {
  1: '穿越了古老的森林遺跡，下一段旅途更加危險…',
  2: '走出了寒冷的雪原地城，魔王城就在眼前。',
}

const RIFT_OMEN_CLEAR_FLAVOR: Record<number, string> = {
  1: '星砂邊境的裂隙已被壓制，但污染正向古城蔓延…',
  2: '月影廢都的黑暗已稍退，暗月聖堂的入口就在眼前。',
}

const DEEP_SEA_CLEAR_FLAVOR: Record<number, string> = {
  1: '穿越了珊瑚淺灘的試煉，沉沒王城的大門在深海中緩緩開啟…',
  2: '沉沒王城的禁衛已被擊敗，海皇深淵的黑暗在前方召喚…',
}

const ASH_KINGDOM_CLEAR_FLAVOR: Record<number, string> = {
  1: '王城外區的餘燼逐漸熄滅，長廊深處傳來昔日王國的殘影…',
  2: '亡國迴廊的幻影消散，王族陵墓的禁咒在地底深處等待…',
}

export default function ChapterClearScreen({ chapter, goldBonus, campaign = 'main', onContinue }: Props) {
  const isLast = chapter >= CHAPTER_COUNT
  const nextChapter = chapter + 1
  const isRiftOmen   = campaign === 'rift_omen'
  const isDeepSea    = campaign === 'deep_sea'
  const isAshKingdom = campaign === 'ash_kingdom'
  const chapterNames = isAshKingdom ? ASH_KINGDOM_CHAPTER_NAMES : isDeepSea ? DEEP_SEA_CHAPTER_NAMES : isRiftOmen ? RIFT_OMEN_CHAPTER_NAMES : CHAPTER_NAMES
  const flavor = isAshKingdom ? ASH_KINGDOM_CLEAR_FLAVOR[chapter] : isDeepSea ? DEEP_SEA_CLEAR_FLAVOR[chapter] : isRiftOmen ? RIFT_OMEN_CLEAR_FLAVOR[chapter] : CHAPTER_CLEAR_FLAVOR[chapter]

  return (
    <div className="chapter-clear-screen">
      <div className="cc-glow" />
      <div className="cc-content">
        <div className="cc-badge">⚔️ 區域通關</div>
        <h2 className="cc-title">{chapterNames[chapter]}</h2>
        <p className="cc-flavor">{flavor}</p>

        <div className="cc-rewards">
          <div className="cc-reward-item">
            <span className="cc-reward-icon">💰</span>
            <span>額外獲得 {goldBonus} 金幣</span>
          </div>
          <div className="cc-reward-item">
            <span className="cc-reward-icon">💎</span>
            <span>章節遺物獎勵（即將選擇）</span>
          </div>
          <div className="cc-reward-item">
            <span className="cc-reward-icon">❤️</span>
            <span>回復 20% 最大 HP</span>
          </div>
        </div>

        <div className="cc-next-hint">
          前往 {chapterNames[nextChapter] ?? (isAshKingdom ? '灰燼王陵最終決戰' : isDeepSea ? '海皇深淵最終決戰' : isRiftOmen ? '暗月聖堂最終決戰' : '最終決戰')}
        </div>

        <button className="primary cc-continue-btn" onClick={onContinue}>
          {isLast ? '最終決戰！' : '繼續冒險 →'}
        </button>
      </div>
    </div>
  )
}
