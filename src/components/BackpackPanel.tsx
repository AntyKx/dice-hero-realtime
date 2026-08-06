import { useState } from 'react'

export interface BackpackItem {
  id: string
  name: string
  desc: string
  tierLabel: string
  tierColor: string
}

interface Props {
  title: string
  items: BackpackItem[]
  onClose: () => void
}

export default function BackpackPanel({ title, items, onClose }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="mm-panel-overlay" onClick={onClose}>
      <div className="backpack-panel" onClick={e => e.stopPropagation()}>
        <div className="backpack-title">🎒 {title}（{items.length}）</div>
        <div className="backpack-list">
          {items.length === 0 ? (
            <div className="backpack-empty">目前還沒有任何收藏</div>
          ) : (
            items.map(it => (
              <div key={it.id} className="backpack-row">
                <button
                  className="backpack-name-btn"
                  onClick={() => setExpandedId(id => id === it.id ? null : it.id)}
                >
                  <span className="backpack-tier" style={{ color: it.tierColor }}>{it.tierLabel}</span>
                  <span className="backpack-name">{it.name}</span>
                  <span className="backpack-chevron">{expandedId === it.id ? '▾' : '▸'}</span>
                </button>
                {expandedId === it.id && <div className="backpack-desc">{it.desc}</div>}
              </div>
            ))
          )}
        </div>
        <button className="ghost backpack-close" onClick={onClose}>關閉</button>
      </div>
    </div>
  )
}
