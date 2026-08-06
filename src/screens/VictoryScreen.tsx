import type { RunState } from '../types'

interface Props { run: RunState; onRestart: () => void }

export default function VictoryScreen({ run, onRestart }: Props) {
  const isRiftOmen   = run.campaign === 'rift_omen'
  const isAshKingdom = run.campaign === 'ash_kingdom'
  const isDeepSea    = run.campaign === 'deep_sea'
  return (
    <div className="endscreen victory">
      <h1>🏆 勝利！</h1>
      {isAshKingdom
        ? <p>你擊敗了殘王妃・艾莉西亞，揭開了灰燼王座封印的秘密。「若你們仍要前往王座……就去見證陛下最後的罪吧。」</p>
        : isRiftOmen
          ? <p>你擊倒了暗月主教・前哨形態，封印了裂隙的入口！</p>
          : isDeepSea
            ? <p>你擊敗了沉眠海皇，深海遺城的詛咒終於解除！</p>
            : <p>你擊倒了烈焰巨龍，拯救了世界！</p>
      }
      <div className="end-stats">
        <div>剩餘 HP：{run.party[run.activePartyIdx].hp} / {run.party[run.activePartyIdx].maxHp}</div>
        <div>累積金幣：{run.gold}</div>
        <div>增益卡：{run.cards.length} 張</div>
        <div className="card-list">{run.cards.map(c => <span key={c.id} className={`card-chip rarity-${c.rarity}`}>{c.name}</span>)}</div>
      </div>
      <button className="primary" onClick={onRestart}>再挑戰一次</button>
    </div>
  )
}
