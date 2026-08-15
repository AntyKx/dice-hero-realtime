import { useState } from 'react'
import type { Equipment, MetaState } from '../types'
import { RARITY_LABEL, SLOT_LABEL, SALVAGE_VALUE, ROLE_LABEL, SET_DEFS } from '../equipment'
import { INVENTORY_MAX } from '../types'
import AsterVowIcon from '../components/AsterVowIcon'
import { EQUIPMENT_SLOT_ICON, EQUIPMENT_SLOT_ICON_COLOR, EQUIP_SET_ICON_COLOR } from '../equipmentIconMeta'

interface Props {
  item: Equipment
  meta: MetaState
  onKeep: () => void
  onSalvage: () => void
  onReplace: (uid: string) => void
}

function ItemCard({ eq, selected, onClick }: { eq: Equipment; selected: boolean; onClick?: () => void }) {
  const setName = eq.setId ? SET_DEFS[eq.setId]?.name : null
  return (
    <div
      className={`drop-item-card rarity-${eq.rarity}${selected ? ' drop-item-selected' : ''}${onClick ? ' drop-item-clickable' : ''}`}
      onClick={onClick}
    >
      <div className="dic-slot-row">
        <span className="dic-slot-icon"><AsterVowIcon name={EQUIPMENT_SLOT_ICON[eq.slot]} size={22} color={EQUIPMENT_SLOT_ICON_COLOR[eq.slot]} /></span>
        <span className="dic-slot-label">{SLOT_LABEL[eq.slot as keyof typeof SLOT_LABEL]}</span>
        <span className="dic-rarity">{RARITY_LABEL[eq.rarity]}</span>
      </div>
      <div className="dic-name">{eq.name}</div>
      {eq.requiredRole && (
        <div className="dic-role">
          <AsterVowIcon name={eq.setId ? 'equip-set' : 'equip-weapon'} size={15} color={eq.setId ? EQUIP_SET_ICON_COLOR : EQUIPMENT_SLOT_ICON_COLOR.weapon} />
          {' '}{ROLE_LABEL[eq.requiredRole]} {eq.setId ? `套裝（${setName}）` : '職業專屬'}
        </div>
      )}
      {!eq.requiredRole && setName && (
        <div className="dic-role"><AsterVowIcon name="equip-set" size={15} /> {setName}</div>
      )}
      {eq.legendaryDesc && <div className="dic-legendary">✦ {eq.legendaryDesc}</div>}
      <ul className="dic-affixes">
        {eq.affixes.map((a, i) => <li key={i}>{a.label}</li>)}
      </ul>
    </div>
  )
}

export default function EquipmentDropScreen({ item, meta, onKeep, onSalvage, onReplace }: Props) {
  const isFull = meta.inventory.length >= INVENTORY_MAX
  const [replaceMode, setReplaceMode] = useState(false)
  const [selectedUid, setSelectedUid] = useState<string | null>(null)

  if (replaceMode) {
    return (
      <div className="drop-screen">
        <div className="drop-header">
          <div className="drop-banner">選擇要替換的裝備</div>
          <div className="drop-warning">點擊背包中的裝備來替換，被替換的裝備會自動分解</div>
        </div>
        <div className="drop-new-item">
          <div className="drop-new-label">新裝備</div>
          <ItemCard eq={item} selected={false} />
        </div>
        <div className="drop-inventory-grid">
          {meta.inventory.map(eq => (
            <ItemCard
              key={eq.uid}
              eq={eq}
              selected={selectedUid === eq.uid}
              onClick={() => setSelectedUid(uid => uid === eq.uid ? null : eq.uid)}
            />
          ))}
        </div>
        <div className="drop-actions">
          <button
            className="primary drop-btn"
            disabled={!selectedUid}
            onClick={() => selectedUid && onReplace(selectedUid)}
          >
            替換裝備
            <span className="drop-btn-sub">被替換者自動分解</span>
          </button>
          <button className="secondary drop-btn" onClick={() => setReplaceMode(false)}>
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="drop-screen">
      <div className="drop-header">
        <div className="drop-banner">裝備掉落！</div>
        {isFull && (
          <div className="drop-warning">背包已滿（{meta.inventory.length}/{INVENTORY_MAX}），取得需替換現有裝備</div>
        )}
      </div>

      <ItemCard eq={item} selected={false} />

      <div className="drop-actions">
        {!isFull ? (
          <button className="primary drop-btn" onClick={onKeep}>
            取得裝備
            <span className="drop-btn-sub">{meta.inventory.length}/{INVENTORY_MAX} 背包</span>
          </button>
        ) : (
          <button className="primary drop-btn" onClick={() => setReplaceMode(true)}>
            替換裝備
            <span className="drop-btn-sub">選擇替換背包中的裝備</span>
          </button>
        )}
        <button
          className={isFull ? 'secondary drop-btn' : 'secondary drop-btn'}
          onClick={onSalvage}
        >
          分解
          <span className="drop-btn-sub">+{SALVAGE_VALUE[item.rarity]} <AsterVowIcon name="system-stardust" size={13} /> 星塵</span>
        </button>
      </div>
    </div>
  )
}
