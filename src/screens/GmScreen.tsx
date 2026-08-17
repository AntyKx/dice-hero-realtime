import { useState } from 'react'
import { HEROES, getHeroSprite } from '../data'
import SpriteAnimator from '../components/SpriteAnimator'
import type { MetaState, HeroProgress } from '../types'
import { defaultHeroProgress, getHeroStarTitle } from '../talents'
import { ALL_CAMPAIGN_STAGES } from '../campaign/campaignStages'
import { CAMPAIGN_CHAPTER_ORDER } from '../campaign/campaignTypes'

const CHAPTER_LABEL: Record<string, string> = {
  forest_ruins: '森林遺跡', snowfield_wastes: '雪原', demon_king_castle: '魔王城',
}

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

  // 篇章關卡一鍵解鎖（2026-08-16）：只覆蓋 campaignStageProgress 這一個欄位，
  // 用展開運算子疊在原本的 meta 上——不會動到金幣/星塵/裝備/英雄進度等其他
  // 欄位，跟 applyAll() 同一種「安全 merge」寫法，避免直接覆蓋整份存檔。
  const unlockChapter = (campaignId: string) => {
    onUpdateMeta(m => {
      const next = { ...(m.campaignStageProgress ?? {}) }
      for (const stage of ALL_CAMPAIGN_STAGES) {
        if (stage.campaignId !== campaignId) continue
        next[stage.id] = { cleared: true, stars: 3, firstClearClaimed: true }
      }
      return { ...m, campaignStageProgress: next }
    })
  }

  const unlockAllChapters = () => {
    onUpdateMeta(m => {
      const next = { ...(m.campaignStageProgress ?? {}) }
      for (const stage of ALL_CAMPAIGN_STAGES) {
        next[stage.id] = { cleared: true, stars: 3, firstClearClaimed: true }
      }
      return { ...m, campaignStageProgress: next }
    })
  }

  const resetAllChapters = () => {
    onUpdateMeta(m => ({ ...m, campaignStageProgress: {} }))
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

      <div className="gm-campaign-section">
        <div className="gm-campaign-title">固定式主線關卡（森林遺跡／雪原／魔王城）</div>
        <div className="gm-campaign-btns">
          <button className="gm-apply-btn" onClick={unlockAllChapters}>★ 全部篇章 60 關全解鎖（三星）</button>
          <button className="gm-step-btn" onClick={resetAllChapters}>重置全部篇章進度</button>
        </div>
        <div className="gm-campaign-btns">
          {CAMPAIGN_CHAPTER_ORDER.map(id => (
            <button key={id} className="gm-step-btn" onClick={() => unlockChapter(id)}>
              只解鎖「{CHAPTER_LABEL[id] ?? id}」
            </button>
          ))}
        </div>
      </div>

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
