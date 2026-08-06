import React, { useEffect } from 'react'
import { Hero } from '../data'
import { HeroProgress, Equipment } from '../types'
import { getHeroStarTitle } from '../talents'

interface RoleMeta { icon: string; color: string; label: string }

const SLOT_LABEL: Record<string, string> = {
  weapon: '武器', head: '頭盔', body: '護甲', hands: '手套',
  boots: '靴子', ring: '戒指', ring1: '戒指', ring2: '戒指', accessory: '飾品', armor: '護甲',
}
const RARITY_COLOR: Record<string, string> = {
  normal: '#8090a8', magic: '#6db8ff', rare: '#c79bff', legendary: '#ff9a3c',
}

interface Props {
  hero: Hero
  roleMeta: RoleMeta
  prog?: HeroProgress
  eqBonus?: { hpBonus: number; defBonus: number }
  talBon?: { hpBonus: number; defBonus: number }
  equip?: Equipment[]
  onStart: () => void
  onClose: () => void
  onViewTalent?: () => void
  onViewEquip?: () => void
  startLabel?: string
}

export default function HeroPortraitModal({ hero, roleMeta, prog, eqBonus, talBon, equip, onStart, onClose, onViewTalent, onViewEquip, startLabel }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const stars = prog?.stars ?? 0
  const level = prog?.level ?? 1
  const displayName = stars > 0 ? (getHeroStarTitle(hero.id, stars) ?? hero.name) : hero.name

  const hpTotal = hero.hp + (eqBonus?.hpBonus ?? 0) + (talBon?.hpBonus ?? 0)
  const defTotal = hero.def + (eqBonus?.defBonus ?? 0) + (talBon?.defBonus ?? 0)
  const hpBonus = (eqBonus?.hpBonus ?? 0) + (talBon?.hpBonus ?? 0)
  const defBonus = (eqBonus?.defBonus ?? 0) + (talBon?.defBonus ?? 0)

  return (
    <div className="portrait-overlay" onClick={onClose}>
      <div className="portrait-modal" onClick={e => e.stopPropagation()}>
        <button className="portrait-close" onClick={onClose}>✕</button>

        <div className="portrait-layout">
          <div className="portrait-img-wrap">
            <img src={hero.portrait} alt={hero.name} className="portrait-img" />
            <div className="portrait-img-glow" style={{ background: `radial-gradient(ellipse at center, ${roleMeta.color}44 0%, transparent 70%)` }} />
          </div>

          <div className="portrait-info">
            <div className="portrait-role-badge" style={{ background: `${roleMeta.color}22`, color: roleMeta.color, border: `1px solid ${roleMeta.color}55` }}>
              {roleMeta.icon} {roleMeta.label}
            </div>
            <div className="portrait-name">
              {displayName}
              {stars > 0 && <span className="portrait-star-badge">{'★'.repeat(stars)}</span>}
            </div>
            <div className="portrait-title">
              {hero.title} · Lv{level}
            </div>

            <div className="portrait-stats">
              <span>
                HP <strong>{hpTotal}</strong>
                {hpBonus > 0 && <span className="portrait-stat-bonus">+{hpBonus}</span>}
              </span>
              <span>ATK <strong>{hero.atk}</strong></span>
              <span>
                DEF <strong>{defTotal}</strong>
                {defBonus > 0 && <span className="portrait-stat-bonus">+{defBonus}</span>}
              </span>
            </div>

            <div className="portrait-skill-label">技能</div>
            <div className="portrait-skill-name">{hero.skill}</div>
            <div className="portrait-skill-desc">{hero.desc}</div>

            {(onViewTalent || onViewEquip) && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {onViewTalent && (
                  <button className="ghost" style={{ flex: 1, padding: '7px 12px', fontSize: '0.85rem' }} onClick={onViewTalent}>
                    🌟 天賦樹
                  </button>
                )}
                {onViewEquip && (
                  <button className="ghost" style={{ flex: 1, padding: '7px 12px', fontSize: '0.85rem' }} onClick={onViewEquip}>
                    ⚔️ 裝備{equip && equip.length > 0 ? ` (${equip.length})` : ''}
                  </button>
                )}
              </div>
            )}
            <button
              className="portrait-start-btn"
              style={{ width: '100%', marginTop: 8, background: `linear-gradient(135deg, ${roleMeta.color}cc, ${roleMeta.color}88)` }}
              onClick={onStart}
            >
              {startLabel ?? '選擇此英雄，出發！'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
