export type RestChoice = 'rest' | 'pray' | 'train'

interface Props {
  heroHp: number
  heroMaxHp: number
  curseCount: number
  onChoose: (choice: RestChoice) => void
}

export default function RestScreen({ heroHp, heroMaxHp, curseCount, onChoose }: Props) {
  const healAmount = Math.min(Math.round(heroMaxHp * 0.4), heroMaxHp - heroHp)
  const full = heroHp >= heroMaxHp

  return (
    <div className="rest-screen">
      <h2>🏕️ 休息點</h2>
      <p className="rest-desc">營火旁稍作停留，選擇一項行動。</p>

      <div className="rest-options">
        {/* 休息 */}
        <button className="rest-option" onClick={() => onChoose('rest')} disabled={full}>
          <div className="ro-icon">💤</div>
          <div className="ro-title">休息</div>
          <div className="ro-desc">
            回復最大 HP 的 40%
            <br />
            <span className="ro-detail">
              {full ? 'HP 已滿' : `+${healAmount} HP（${heroHp} → ${Math.min(heroHp + healAmount, heroMaxHp)}）`}
            </span>
          </div>
        </button>

        {/* 祈禱 */}
        <button className="rest-option" onClick={() => onChoose('pray')} disabled={curseCount === 0}>
          <div className="ro-icon">🙏</div>
          <div className="ro-title">祈禱</div>
          <div className="ro-desc">
            移除一個詛咒
            <br />
            <span className="ro-detail">
              {curseCount === 0 ? '目前沒有詛咒' : `目前有 ${curseCount} 個詛咒`}
            </span>
          </div>
        </button>

        {/* 訓練 */}
        <button className="rest-option" onClick={() => onChoose('train')}>
          <div className="ro-icon">📖</div>
          <div className="ro-title">訓練</div>
          <div className="ro-desc">
            獲得 150 經驗值
            <br />
            <span className="ro-detail">提升英雄等級</span>
          </div>
        </button>
      </div>
    </div>
  )
}
