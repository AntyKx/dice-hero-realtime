import { useState } from 'react'
import { HEROES, getHeroSprite } from '../data'
import SpriteAnimator from '../components/SpriteAnimator'
import type { MetaState, HeroProgress } from '../types'
import { defaultHeroProgress, getHeroStarTitle } from '../talents'

const GM_PASSWORD = 'dice9999'

interface Props {
  meta: MetaState
  onUpdateMeta: (fn: (m: MetaState) => MetaState) => void
  onBack: () => void
  onArenaTest: () => void
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export default function GmScreen({ meta, onUpdateMeta, onBack, onArenaTest }: Props) {
  const [password, setPassword] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState(false)

  // local draft: heroId → { level, stars }
  const [draft, setDraft] = useState<Record<string, { level: number; stars: number }>>(() => {
    const d: Record<string, { level: number; stars: number }> = {}
    for (const h of HEROES) {
      const p = meta.heroProgress[h.id] ?? defaultHeroProgress()
      d[h.id] = { level: p.level, stars: p.stars }
    }
    return d
  })

  const tryUnlock = () => {
    if (password === GM_PASSWORD) { setUnlocked(true); setError(false) }
    else { setError(true) }
  }

  const setHeroLevel = (heroId: string, level: number) => {
    setDraft(d => ({ ...d, [heroId]: { ...d[heroId], level: clamp(level, 1, 100) } }))
  }

  const setHeroStars = (heroId: string, stars: number) => {
    setDraft(d => ({ ...d, [heroId]: { ...d[heroId], stars } }))
  }

  const applyAll = () => {
    onUpdateMeta(m => {
      const next = { ...m.heroProgress }
      for (const [heroId, { level, stars }] of Object.entries(draft)) {
        const prev: HeroProgress = next[heroId] ?? defaultHeroProgress()
        next[heroId] = { ...prev, level, stars, exp: 0 }
      }
      return { ...m, heroProgress: next }
    })
  }

  if (!unlocked) {
    return (
      <div className="gm-gate">
        <div className="gm-gate-card">
          <div className="gm-gate-title">🛠 GM 模式</div>
          <input
            className="gm-gate-input"
            type="password"
            placeholder="輸入密碼"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false) }}
            onKeyDown={e => e.key === 'Enter' && tryUnlock()}
            autoFocus
          />
          {error && <div className="gm-gate-error">密碼錯誤</div>}
          <div className="gm-gate-btns">
            <button className="gm-btn-unlock" onClick={tryUnlock}>解鎖</button>
            <button className="ghost" onClick={onBack}>取消</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="gm-wrap">
      <header className="gm-header">
        <button className="ghost" onClick={onBack}>← 返回</button>
        <div className="gm-title">🛠 GM 模式</div>
        <button className="gm-apply-btn" onClick={applyAll}>✓ 套用所有變更</button>
      </header>

      <div className="gm-warning">⚠ 測試用，變更會直接寫入存檔</div>

      <button className="gm-apply-btn" style={{ marginBottom: 12 }} onClick={onArenaTest}>
        🕹 即時戰鬥測試（M1 垂直切片，knight vs goblin）
      </button>

      <div className="gm-hero-list">
        {HEROES.map(hero => {
          const d = draft[hero.id] ?? { level: 1, stars: 0 }
          const sprite = getHeroSprite(hero, d.stars)
          const scale = 56 / sprite.frameHeight
          const starTitle = d.stars > 0 ? (getHeroStarTitle(hero.id, d.stars) ?? null) : null
          const saved = meta.heroProgress[hero.id] ?? defaultHeroProgress()
          const dirty = saved.level !== d.level || saved.stars !== d.stars

          return (
            <div key={hero.id} className={`gm-hero-card${dirty ? ' gm-dirty' : ''}`}>
              {/* Sprite */}
              <div className="gm-sprite">
                <SpriteAnimator sprite={sprite} state="idle" scale={scale} />
              </div>

              {/* Name */}
              <div className="gm-hero-name">
                {hero.name}
                {starTitle && <span className="gm-star-title">（{starTitle}）</span>}
              </div>

              {/* Level control */}
              <div className="gm-control-row">
                <span className="gm-label">等級</span>
                <button className="gm-step-btn" onClick={() => setHeroLevel(hero.id, d.level - 10)}>−10</button>
                <button className="gm-step-btn" onClick={() => setHeroLevel(hero.id, d.level - 1)}>−1</button>
                <input
                  className="gm-level-input"
                  type="number"
                  min={1} max={100}
                  value={d.level}
                  onChange={e => setHeroLevel(hero.id, parseInt(e.target.value) || 1)}
                />
                <button className="gm-step-btn" onClick={() => setHeroLevel(hero.id, d.level + 1)}>+1</button>
                <button className="gm-step-btn" onClick={() => setHeroLevel(hero.id, d.level + 10)}>+10</button>
              </div>

              {/* Star control */}
              <div className="gm-control-row">
                <span className="gm-label">星等</span>
                <div className="gm-star-btns">
                  {[0, 1, 2, 3].map(s => (
                    <button
                      key={s}
                      className={`gm-star-btn${d.stars === s ? ' active' : ''}`}
                      onClick={() => setHeroStars(hero.id, s)}
                    >
                      {s === 0 ? '無星' : '★'.repeat(s)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dirty indicator */}
              {dirty && <div className="gm-changed-badge">已變更</div>}
            </div>
          )
        })}
      </div>

      <div style={{ padding: '16px', textAlign: 'center' }}>
        <button className="gm-apply-btn" style={{ width: '100%', maxWidth: 400 }} onClick={applyAll}>
          ✓ 套用所有變更
        </button>
      </div>
    </div>
  )
}
