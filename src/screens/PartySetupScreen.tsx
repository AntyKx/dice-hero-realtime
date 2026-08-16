import { useState } from 'react'
import { HEROES, getHeroSprite, type Hero } from '../data'
import SpriteAnimator from '../components/SpriteAnimator'
import AsterVowIcon from '../components/AsterVowIcon'
import { getHeroStarTitle, computeTalentBonus } from '../talents'
import { computeEquipBonus, getEquippedItems } from '../equipment'
import type { MetaState } from '../types'
import { sanitizeParty, replacePartySlot, type PartyState } from '../party'
import { ROLE_ICON_META } from '../iconMeta'

interface Props {
  meta: MetaState
  editingSlot: 0 | 1 | 2
  onMetaUpdate: (fn: (prev: MetaState) => MetaState) => void
  onBack: () => void
}

const SLOT_LABEL = ['隊長', '夥伴 1', '夥伴 2'] as const

function slotHeroId(party: PartyState, slot: 0 | 1 | 2): string | null {
  return slot === 0 ? party.leaderId : party.supportIds[slot - 1]
}

export default function PartySetupScreen({ meta, editingSlot, onMetaUpdate, onBack }: Props) {
  const allHeroIds = HEROES.map(h => h.id)
  const [draft, setDraft] = useState<PartyState>(() => sanitizeParty(meta.party, allHeroIds, HEROES[0].id))
  const [activeSlot, setActiveSlot] = useState<0 | 1 | 2>(editingSlot)

  const activeHeroId = slotHeroId(draft, activeSlot)
  const activeHero = HEROES.find(h => h.id === activeHeroId) ?? null

  const prog = activeHero ? meta.heroProgress[activeHero.id] : undefined
  const equip = activeHero ? getEquippedItems(meta.inventory, meta.loadouts?.[activeHero.id]) : []
  const eqBonus = computeEquipBonus(equip)
  const talBonus = activeHero
    ? computeTalentBonus(activeHero.id, meta.heroProgress[activeHero.id] ?? { level: 1, exp: 0, wins: 0, stars: 0, selectedTalents: {} })
    : { hpBonus: 0, defBonus: 0 }
  const stars = prog?.stars ?? 0
  const displayName = activeHero ? (stars > 0 ? (getHeroStarTitle(activeHero.id, stars) ?? activeHero.name) : activeHero.name) : ''
  const rm = activeHero ? ROLE_ICON_META[activeHero.role] : null

  const handlePick = (hero: Hero) => {
    setDraft(prev => replacePartySlot(prev, activeSlot, hero.id))
  }

  const handleClearSlot = () => {
    if (activeSlot === 0) return // 隊長不可清空
    setDraft(prev => replacePartySlot(prev, activeSlot, null))
  }

  const handleConfirm = () => {
    onMetaUpdate(m => ({ ...m, party: draft }))
    onBack()
  }

  return (
    <div className="pss-screen">
      <header className="pss-header">
        <button className="ghost" onClick={onBack}>← 返回</button>
        <div className="pss-header-title">
          <h1>選擇出戰英雄</h1>
          <div className="pss-header-slot">正在編輯：{SLOT_LABEL[activeSlot]}</div>
        </div>
        <div style={{ width: 60 }} aria-hidden="true" />
      </header>

      <div className="pss-preview" style={rm ? { borderColor: rm.color + '55' } : undefined}>
        {activeHero ? (
          <>
            <div className="pss-preview-art">
              {activeHero.portrait
                ? <img src={activeHero.portrait} alt={activeHero.name} />
                : (() => {
                    const previewSprite = getHeroSprite(activeHero, stars)
                    return <SpriteAnimator sprite={previewSprite} state="idle" scale={64 / previewSprite.frameHeight} />
                  })()}
            </div>
            <div className="pss-preview-info">
              <div className="pss-preview-role" style={rm ? { color: rm.color, borderColor: rm.color + '55', background: rm.color + '18' } : undefined}>
                {rm && <AsterVowIcon name={rm.icon} size={12} />} {rm?.label}
              </div>
              <div className="pss-preview-name">
                {displayName}{stars > 0 && <span className="pss-preview-stars">{'★'.repeat(stars)}</span>}
              </div>
              <div className="pss-preview-title">{activeHero.title} · Lv{prog?.level ?? 1}</div>
              <div className="pss-preview-stats">
                <span>HP <strong>{activeHero.hp + eqBonus.hpBonus + talBonus.hpBonus}</strong></span>
                <span>ATK <strong>{activeHero.atk}</strong></span>
                <span>DEF <strong>{activeHero.def + eqBonus.defBonus + talBonus.defBonus}</strong></span>
              </div>
              <div className="pss-preview-skill">{activeHero.skill}</div>
            </div>
          </>
        ) : (
          <div className="pss-preview-empty">
            <p>這個位置還沒有英雄</p>
            <p className="pss-preview-empty-hint">從下方名冊點選一位加入夥伴</p>
          </div>
        )}
      </div>

      <div className="pss-slots">
        {([0, 1, 2] as const).map(slot => {
          const heroId = slotHeroId(draft, slot)
          const hero = HEROES.find(h => h.id === heroId)
          const active = slot === activeSlot
          // 固定 scale={0.9} 沒有依 sprite 原始 frameHeight 正規化，某些高
          // frameHeight 的英雄（例如影刃刺客）會把這顆格子撐到接近全螢幕，
          // 把下面的夥伴格/名冊都擠出畫面。跟大廳地圖 picon 同一套修法：
          // 依 frameHeight 反推 scale，固定縮到目標高度。
          const slotSprite = hero ? getHeroSprite(hero, meta.heroProgress[hero.id]?.stars ?? 0) : null
          const slotScale = slotSprite ? 48 / slotSprite.frameHeight : 1
          return (
            <button key={slot} className={`pss-slot${active ? ' active' : ''}`} onClick={() => setActiveSlot(slot)}>
              {hero && slotSprite ? (
                <SpriteAnimator sprite={slotSprite} state="idle" scale={slotScale} idleFrame={0} />
              ) : (
                <span className="pss-slot-empty">＋</span>
              )}
              <span className="pss-slot-label">{SLOT_LABEL[slot]}</span>
            </button>
          )
        })}
        {activeSlot !== 0 && activeHeroId && (
          <button className="ghost pss-slot-clear" onClick={handleClearSlot}>清空此格</button>
        )}
      </div>

      <div className="pss-roster">
        {HEROES.map(hero => {
          const hp = meta.heroProgress[hero.id]
          const hStars = hp?.stars ?? 0
          const sprite = getHeroSprite(hero, hStars)
          const scale = 52 / sprite.frameHeight
          const heroDisplayName = hStars > 0 ? (getHeroStarTitle(hero.id, hStars) ?? hero.name) : hero.name
          const occupiedSlot = ([0, 1, 2] as const).find(s => slotHeroId(draft, s) === hero.id)
          const heroRm = ROLE_ICON_META[hero.role]
          return (
            <button
              key={hero.id}
              className={`ar-hero-btn${occupiedSlot !== undefined ? ' active' : ''}`}
              style={occupiedSlot !== undefined && heroRm ? { borderColor: heroRm.color, boxShadow: `0 0 12px ${heroRm.color}44` } : undefined}
              onClick={() => handlePick(hero)}
            >
              <div className="dhm-sprite">
                <SpriteAnimator sprite={sprite} state="idle" scale={scale} />
              </div>
              <div className="dhm-hero-name">{heroDisplayName}</div>
              {hp && hp.level > 1 && (
                <div className="dhm-hero-level">Lv{hp.level}{hStars > 0 ? ' ' + '★'.repeat(hStars) : ''}</div>
              )}
              {occupiedSlot !== undefined && <div className="pss-roster-slot-tag">{SLOT_LABEL[occupiedSlot]}</div>}
            </button>
          )
        })}
      </div>

      <div className="pss-footer">
        <button className="ghost" onClick={onBack}>取消</button>
        <button className="primary" onClick={handleConfirm}>確定編成</button>
      </div>
    </div>
  )
}
