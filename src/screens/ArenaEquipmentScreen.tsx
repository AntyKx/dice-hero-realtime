import { useState } from 'react'
import { HEROES } from '../data'
import type { MetaState } from '../types'
import {
  type ArenaEquipment, type ArenaLoadoutSlot,
  ARENA_LOADOUT_SLOTS, ARENA_RARITY_COLOR,
  getEquippedArenaItems,
} from '../arena/equipment'
import AsterVowIcon from '../components/AsterVowIcon'
import { getEquipmentSlotIcon, getEquipmentSlotIconColor } from '../equipmentIconMeta'

interface Props {
  meta: MetaState
  heroId: string
  onMetaUpdate: (fn: (prev: MetaState) => MetaState) => void
}

const SLOT_LABEL: Record<ArenaLoadoutSlot, string> = {
  weapon: '武器', head: '頭盔', body: '護甲', hands: '手套',
  boots: '靴子', ring1: '戒指', ring2: '戒指', accessory: '飾品',
}
const BONUS_LABEL: Record<string, string> = {
  hpBonus: 'HP', defBonus: '防禦', moveSpeedPct: '移速', atkSpeedPct: '攻速',
  lifestealPct: '生命偷取', extraProjectiles: '額外彈道', pierceBonus: '穿透',
}
function formatBonus(bonus: ArenaEquipment['bonus']): string {
  return Object.entries(bonus).filter(([, v]) => (v ?? 0) > 0).map(([k, v]) => {
    const label = BONUS_LABEL[k] ?? k
    if (k === 'lifestealPct') return `${label} +${Math.round((v ?? 0) * 100)}%`
    if (k === 'moveSpeedPct' || k === 'atkSpeedPct') return `${label} +${v}%`
    return `${label} +${v}`
  }).join('・')
}

function ItemRow({ item, onClick, tag }: { item: ArenaEquipment; onClick?: () => void; tag?: string }) {
  return (
    <button className={`aeq-item rarity-${item.rarity}`} onClick={onClick} disabled={!onClick}
      style={{ borderColor: `${ARENA_RARITY_COLOR[item.rarity]}66` }}>
      <span className="aeq-item-name" style={{ color: ARENA_RARITY_COLOR[item.rarity] }}>
        {item.name}{tag && <span className="aeq-item-tag"> {tag}</span>}
      </span>
      <span className="aeq-item-bonus">{formatBonus(item.bonus)}</span>
    </button>
  )
}

/** 裝備（2026-08 裝備系統重整）：內嵌在既有「英雄 & 裝備」畫面
 *  （EquipmentScreen.tsx）的一個分頁，不再是獨立頁面——英雄選擇沿用外層
 *  畫面左側的英雄清單，這裡只負責裝備欄位/倉庫本身；金幣抽獎（2026-08）
 *  已移除，改成星界商城的「命運者遺贈」星塵召喚，見 AstralShopScreen.tsx。 */
export default function ArenaEquipmentScreen({ meta, heroId, onMetaUpdate }: Props) {
  const [pickingSlot, setPickingSlot] = useState<ArenaLoadoutSlot | null>(null)

  const hero = HEROES.find(h => h.id === heroId) ?? HEROES[0]
  const inventory = meta.arenaInventory ?? []
  const loadout = meta.arenaLoadouts?.[heroId] ?? {}
  const equippedItems = getEquippedArenaItems(inventory, loadout)
  const equippedIds = new Set(equippedItems.map(i => i.id))

  function equip(item: ArenaEquipment, slot: ArenaLoadoutSlot) {
    onMetaUpdate(m => ({
      ...m,
      arenaLoadouts: {
        ...m.arenaLoadouts,
        [heroId]: { ...(m.arenaLoadouts?.[heroId] ?? {}), [slot]: item.id },
      },
    }))
    setPickingSlot(null)
  }

  function unequip(slot: ArenaLoadoutSlot) {
    onMetaUpdate(m => ({
      ...m,
      arenaLoadouts: {
        ...m.arenaLoadouts,
        [heroId]: { ...(m.arenaLoadouts?.[heroId] ?? {}), [slot]: null },
      },
    }))
  }

  function pickerCandidates(slot: ArenaLoadoutSlot): ArenaEquipment[] {
    const itemSlot = slot === 'ring1' || slot === 'ring2' ? 'ring' : slot
    return inventory.filter(i => i.slot === itemSlot && (i.slot !== 'weapon' || i.heroRole === hero.role))
  }

  return (
    <div className="aeq-panel">
      <div className="aeq-loadout-grid">
        {ARENA_LOADOUT_SLOTS.map(slot => {
          const itemId = loadout[slot]
          const item = itemId ? inventory.find(i => i.id === itemId) : undefined
          return (
            <button
              key={slot}
              className={`aeq-slot${item ? ` rarity-${item.rarity}` : ''}`}
              style={item ? { borderColor: `${ARENA_RARITY_COLOR[item.rarity]}88` } : undefined}
              onClick={() => item ? unequip(slot) : setPickingSlot(slot)}
            >
              <span className="aeq-slot-icon"><AsterVowIcon name={getEquipmentSlotIcon(slot)} size={21} color={getEquipmentSlotIconColor(slot)} /></span>
              <span className="aeq-slot-label">{SLOT_LABEL[slot]}</span>
              {item ? (
                <>
                  <span className="aeq-slot-item-name" style={{ color: ARENA_RARITY_COLOR[item.rarity] }}>{item.name}</span>
                  <span className="aeq-slot-item-bonus">{formatBonus(item.bonus)}</span>
                  <span className="aeq-slot-unequip">卸下</span>
                </>
              ) : (
                <span className="aeq-slot-empty">點擊裝備</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="aeq-inventory">
        <div className="aeq-inventory-title">倉庫（{inventory.length}）</div>
        <div className="aeq-inventory-list">
          {inventory.length === 0 && <p className="aeq-empty-hint">還沒有任何裝備——通關森林遺跡關卡，或到星界商城的「命運者遺贈」召喚取得。</p>}
          {inventory.map(item => (
            <ItemRow key={item.id} item={item} tag={equippedIds.has(item.id) ? '（裝備中）' : undefined} />
          ))}
        </div>
      </div>

      {pickingSlot && (
        <div className="aeq-picker-overlay" onClick={() => setPickingSlot(null)}>
          <div className="aeq-picker-modal" onClick={e => e.stopPropagation()}>
            <div className="aeq-picker-title">選擇裝備到「{SLOT_LABEL[pickingSlot]}」</div>
            <div className="aeq-picker-list">
              {pickerCandidates(pickingSlot).length === 0 && <p className="aeq-empty-hint">這個部位還沒有可用的裝備。</p>}
              {pickerCandidates(pickingSlot).map(item => (
                <ItemRow key={item.id} item={item} onClick={() => equip(item, pickingSlot)} />
              ))}
            </div>
            <button className="ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => setPickingSlot(null)}>取消</button>
          </div>
        </div>
      )}

    </div>
  )
}
