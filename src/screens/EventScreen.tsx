import { useMemo } from 'react'
import { getEventById } from '../events'
import type { EventOutcome } from '../types'

interface Props {
  eventId: string
  onComplete: (outcome: EventOutcome) => void
}

export default function EventScreen({ eventId, onComplete }: Props) {
  const event = useMemo(() => getEventById(eventId), [eventId])

  if (!event) return <div className="rest-screen"><h2>未知事件</h2></div>

  return (
    <div className="rest-screen event-screen">
      <div className="event-header">
        <span className="event-icon">{event.icon}</span>
        <h2>{event.name}</h2>
      </div>
      <p className="rest-desc">{event.desc}</p>
      <div className="event-choices">
        {event.choices.map((choice, i) => (
          <button
            key={i}
            className="event-choice primary"
            onClick={() => onComplete(choice.outcome)}
          >
            <div className="ec-label">{choice.label}</div>
            <div className="ec-desc">{choice.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
