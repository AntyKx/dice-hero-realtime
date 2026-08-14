import type { ArenaRelic } from './relics'
import AsterVowIcon from '../components/AsterVowIcon'

interface Props {
  choices: ArenaRelic[]
  onComplete: (relic: ArenaRelic) => void
}

export default function RelicLootOverlay({ choices, onComplete }: Props) {
  return (
    <div className="arena-levelup-overlay">
      <div className="arena-levelup-title"><AsterVowIcon name="stage-boss" size={22} /> Boss 戰利品</div>
      <div className="reward-cards">
        {choices.map(relic => (
          <button
            key={relic.id}
            className="reward-card arena-relic-card"
            onClick={() => onComplete(relic)}
          >
            <div className="rc-rarity arena-relic-tag">遺物</div>
            <div className="rc-name">{relic.name}</div>
            <div className="rc-desc">{relic.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
