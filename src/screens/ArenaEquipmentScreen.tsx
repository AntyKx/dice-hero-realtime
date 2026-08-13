import { useState } from 'react'
import { HEROES } from '../data'
import type { MetaState } from '../types'
import {
  type ArenaEquipment, type ArenaLoadoutSlot,
  ARENA_LOADOUT_SLOTS, ARENA_RARITY_COLOR,
  getEquippedArenaItems,
  gachaPull, gachaPullTen, GACHA_SINGLE_COST, GACHA_TEN_COST,
} from '../arena/equipment'

interface Props {
  meta: MetaState
  heroId: string
  onMetaUpdate: (fn: (prev: MetaState) => MetaState) => void
}

const SLOT_ICON: Record<ArenaLoadoutSlot, string> = {
  weapon: '⚔️', head: '⛑️', body: '🛡️', hands: '🧤',
  boots: '🥾', ring1: '💍', ring2: '💍', accessory: '📿',
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

/** 即時制裝備（2026-08 裝備系統重整）：內嵌在既有「英雄 & 裝備」畫面
 *  （EquipmentScreen.tsx）的一個分頁，不再是獨立頁面——英雄選擇沿用外層
 *  畫面左側的英雄清單，這裡只負責裝備欄位/倉庫/抽獎本身。 */
export default function ArenaEquipmentScreen({ meta, heroId, onMetaUpdate }: Props) {
  const [pickingSlot, setPickingSlot] = useState<ArenaLoadoutSlot | null>(null)
  const [gachaResult, setGachaResult] = useState<ArenaEquipment[] | null>(null)

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

  function doGacha(count: 1 | 10) {
    const cost = count === 1 ? GACHA_SINGLE_COST : GACHA_TEN_COST
    if (meta.gold < cost) return
    const pulled = count === 1 ? [gachaPull()] : gachaPullTen()
    onMetaUpdate(m => ({
      ...m,
      gold: m.gold - cost,
      arenaInventory: [...(m.arenaInventory ?? []), ...pulled],
    }))
    setGachaResult(pulled)
  }

  return (
    <div className="aeq-panel">
      <div className="aeq-gacha-panel">
        <div className="aeq-gacha-title">🎰 裝備抽獎 <span className="aeq-gacha-hint">特殊裝備（魔法／稀有／傳說）幾乎都要靠抽獎，關卡掉落只會是普通品質；抽獎不限職業，11 位英雄的武器都可能抽到</span></div>
        <div className="aeq-gacha-btns">
          <button className="ghost" onClick={() => doGacha(1)} disabled={meta.gold < GACHA_SINGLE_COST}>
            單抽 💰{GACHA_SINGLE_COST}
          </button>
          <button className="ghost" onClick={() => doGacha(10)} disabled={meta.gold < GACHA_TEN_COST}>
            十連抽 💰{GACHA_TEN_COST}
          </button>
        </div>
      </div>

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
              <span className="aeq-slot-icon">{SLOT_ICON[slot]}</span>
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
          {inventory.length === 0 && <p className="aeq-empty-hint">還沒有任何即時制裝備——通關森林遺跡關卡或使用上方抽獎取得。</p>}
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

      {gachaResult && (
        <div className="aeq-picker-overlay" onClick={() => setGachaResult(null)}>
          <div className="aeq-picker-modal" onClick={e => e.stopPropagation()}>
            <div className="aeq-picker-title">抽獎結果</div>
            <div className="aeq-picker-list">
              {gachaResult.map((item, i) => <ItemRow key={item.id + i} item={item} />)}
            </div>
            <button className="ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => setGachaResult(null)}>關閉</button>
          </div>
        </div>
      )}
    </div>
  )
}
