import type { RunState } from '../types'

interface Props { run: RunState; onRestart: () => void }

export default function GameOverScreen({ run, onRestart }: Props) {
  return (
    <div className="endscreen gameover">
      <h1>勇者倒下了</h1>
      <p>在冒險途中，英雄力竭而亡。</p>
      <div className="end-stats">
        <div>累積金幣：{run.gold}</div>
        <div>獲得增益卡：{run.cards.length} 張</div>
        <div className="card-list">{run.cards.map(c => <span key={c.id} className={`card-chip rarity-${c.rarity}`}>{c.name}</span>)}</div>
      </div>
      <button className="primary" onClick={onRestart}>再來一次</button>
    </div>
  )
}
