import { useState, useEffect } from 'react'
import type { Equipment, EquipmentSlot, EquipmentRarity } from '../types'
import type { ChestType } from '../chests'
import { CHEST_DEFS } from '../chests'
import { RARITY_LABEL, SLOT_LABEL, ROLE_LABEL, SET_DEFS } from '../equipment'
import AsterVowIcon from './AsterVowIcon'
import { EQUIPMENT_SLOT_ICON } from '../equipmentIconMeta'

interface Props {
  chestType: ChestType
  result: { equipment: Equipment[]; stardust: number }
  onClose: () => void
}

type AnimPhase = 'appear' | 'bubble' | 'burst' | 'reveal'

export default function ChestOpenModal({ chestType, result, onClose }: Props) {
  const [phase, setPhase] = useState<AnimPhase>('appear')
  const def = CHEST_DEFS[chestType]

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('bubble'), 500)
    const t2 = setTimeout(() => setPhase('burst'),  1800)
    const t3 = setTimeout(() => setPhase('reveal'), 2150)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const cauldronClass =
    phase === 'appear' ? 'anim-cauldron-appear' :
    phase === 'bubble' ? 'anim-cauldron-bubble' :
    phase === 'burst'  ? 'anim-cauldron-burst'  : ''

  return (
    <div className="chest-modal-overlay">
      <div className="chest-open-stage">
        <div className="chest-open-title" style={{ color: def.color }}>{def.name}</div>
        <div className="chest-open-subtitle">
          {chestType === 'chest_role_legendary' ? '你指定的職業套裝傳奇裝備！' : '任何職業都可能出現！'}
        </div>

        {phase !== 'reveal' && (
          <div
            className={`cauldron-wrap ${cauldronClass}`}
            style={{ '--cauldron-glow': def.color } as React.CSSProperties}
          >
            {/* Pot body */}
            <div className="cauldron-body">
              <div className="cauldron-rim" />
              {/* Bubbles — only visible during bubble phase */}
              {phase === 'bubble' && <>
                <div className="cauldron-bubble cb1" style={{ background: def.color }} />
                <div className="cauldron-bubble cb2" style={{ background: def.color }} />
                <div className="cauldron-bubble cb3" style={{ background: def.color }} />
                <div className="cauldron-bubble cb4" style={{ background: def.color }} />
              </>}
              {/* Steam */}
              {(phase === 'appear' || phase === 'bubble') && (
                <div className="cauldron-steam">
                  <span className="steam s1">~</span>
                  <span className="steam s2">~</span>
                  <span className="steam s3">~</span>
                </div>
              )}
            </div>
            <div className="cauldron-legs">
              <div className="cauldron-leg" />
              <div className="cauldron-leg" />
              <div className="cauldron-leg" />
            </div>
          </div>
        )}

        {phase === 'reveal' && (
          <div className="chest-result anim-item-reveal">
            <div className="chest-result-items">
              {result.equipment.map((eq, i) => {
                const setName = eq.setId ? SET_DEFS[eq.setId]?.name : null
                return (
                  <div
                    key={eq.uid}
                    className={`chest-item-card rarity-${eq.rarity}`}
                    style={{ animationDelay: `${i * 0.12}s` }}
                  >
                    <div className="dic-slot-row">
                      <span className="dic-slot-icon"><AsterVowIcon name={EQUIPMENT_SLOT_ICON[eq.slot as EquipmentSlot]} size={22} /></span>
                      <span className="dic-slot-label">{SLOT_LABEL[eq.slot as EquipmentSlot]}</span>
                      <span className="dic-rarity">{RARITY_LABEL[eq.rarity as EquipmentRarity]}</span>
                    </div>
                    <div className="dic-name">{eq.name}</div>
                    {eq.requiredRole && (
                      <div className="dic-role">
                        <AsterVowIcon name={eq.setId ? 'equip-set' : 'equip-weapon'} size={15} /> {ROLE_LABEL[eq.requiredRole]} {eq.setId ? `套裝（${setName}）` : '職業專屬'}
                      </div>
                    )}
                    {!eq.requiredRole && setName && (
                      <div className="dic-role"><AsterVowIcon name="equip-set" size={15} /> {setName}</div>
                    )}
                    {eq.legendaryDesc && (
                      <div className="dic-legendary">✦ {eq.legendaryDesc}</div>
                    )}
                    <ul className="dic-affixes">
                      {eq.affixes.map((a, j) => <li key={j}>{a.label}</li>)}
                    </ul>
                  </div>
                )
              })}
            </div>
            {result.stardust > 0 && <div className="chest-stardust-reward"><AsterVowIcon name="system-stardust" size={17} /> +{result.stardust} 星塵</div>}
            <button className="secondary chest-confirm-btn" onClick={onClose}>
              確認入庫
            </button>
          </div>
        )}

        {phase !== 'reveal' && (
          <div className="chest-open-hint">
            {phase === 'appear' ? '神秘大黑鍋正在準備…' :
             phase === 'bubble' ? '咕嘟咕嘟…' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
