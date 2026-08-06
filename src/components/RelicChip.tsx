import { useState } from 'react'
import { getRelicById } from '../relics'

const TIER_CLASS = { common: 'common', rare: 'rare', boss: 'epic' } as const

interface Props {
  relicId: string
  small?: boolean
}

export default function RelicChip({ relicId, small }: Props) {
  const [open, setOpen] = useState(false)
  const relic = getRelicById(relicId)
  if (!relic) return null

  return (
    <span
      className={`relic-chip rarity-${TIER_CLASS[relic.tier]}${small ? ' relic-chip-small' : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      💎 {relic.name}
      {open && (
        <span className="relic-tooltip">
          <span className="rt-tier">{relic.tier === 'boss' ? '傳說' : relic.tier === 'rare' ? '稀有' : '普通'}</span>
          <span className="rt-name">{relic.name}</span>
          <span className="rt-desc">{relic.desc}</span>
        </span>
      )}
    </span>
  )
}
