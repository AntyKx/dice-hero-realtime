import { useState } from 'react'
import type { Equipment, EquipmentSlot, EquipmentRarity, MetaState } from '../types'
import { INVENTORY_MAX } from '../types'
import {
  RARITY_LABEL, SALVAGE_VALUE, ROLE_LABEL,
  REROLL_COST, UPGRADE_COST,
  forgeReroll, forgeUpgrade,
} from '../equipment'
import AsterVowIcon from '../components/AsterVowIcon'
import { EQUIPMENT_SLOT_ICON, EQUIPMENT_SLOT_ICON_COLOR } from '../equipmentIconMeta'

interface Props {
  meta: MetaState
  onMetaUpdate: (fn: (prev: MetaState) => MetaState) => void
  onBack: () => void
}

type FilterSlot = EquipmentSlot | 'all'

const RARITY_ORDER: EquipmentRarity[] = ['normal', 'magic', 'rare', 'legendary']

function ItemMini({ item, selected, onClick }: {
  item: Equipment; selected: boolean; onClick: () => void
}) {
  return (
    <button
      className={`forge-item rarity-${item.rarity} ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <span className="fi-slot"><AsterVowIcon name={EQUIPMENT_SLOT_ICON[item.slot]} size={19} color={EQUIPMENT_SLOT_ICON_COLOR[item.slot]} /></span>
      <div className="fi-info">
        <div className="fi-name">{item.name}</div>
        <div className="fi-rarity">{RARITY_LABEL[item.rarity]}</div>
      </div>
      {item.legendaryEffectId && <span className="fi-leg"><AsterVowIcon name="system-stardust" size={14} /></span>}
    </button>
  )
}

export default function ForgeScreen({ meta, onMetaUpdate, onBack }: Props) {
  const [filterSlot, setFilterSlot] = useState<FilterSlot>('all')
  const [selected, setSelected] = useState<Equipment | null>(null)
  const [forgeResult, setForgeResult] = useState<Equipment | null>(null)
  const [confirmOp, setConfirmOp] = useState<'reroll' | 'upgrade' | null>(null)

  const inventory = meta.inventory.filter(
    item => filterSlot === 'all' || item.slot === filterSlot
  )

  const stardust = meta.stardust
  const canReroll  = selected ? stardust >= REROLL_COST[selected.rarity] : false
  const nextRarity: EquipmentRarity | undefined = selected
    ? RARITY_ORDER[RARITY_ORDER.indexOf(selected.rarity) + 1]
    : undefined
  const upgradeCost = selected ? UPGRADE_COST[selected.rarity] : undefined
  const canUpgrade = !!nextRarity && !!upgradeCost && stardust >= upgradeCost

  function applyOp(op: 'reroll' | 'upgrade') {
    if (!selected) return
    const cost = op === 'reroll' ? REROLL_COST[selected.rarity] : (UPGRADE_COST[selected.rarity] ?? 0)
    const newItem = op === 'reroll' ? forgeReroll(selected) : forgeUpgrade(selected)

    onMetaUpdate(m => ({
      ...m,
      stardust: m.stardust - cost,
      inventory: m.inventory.map(e => e.uid === newItem.uid ? newItem : e),
    }))

    setForgeResult(newItem)
    setSelected(newItem)
    setConfirmOp(null)
  }

  return (
    <div className="forge-screen">
      <div className="forge-header">
        <div>
          <h2>鍛造台</h2>
          <p className="forge-sub">花費星塵重鑄詞墜或晉升裝備品質</p>
        </div>
        <div className="forge-header-right">
          <span className="forge-stardust"><AsterVowIcon name="system-stardust" size={15} /> {stardust} 星塵</span>
          <span className="eq-inv-count">{meta.inventory.length}/{INVENTORY_MAX}</span>
          <button className="ghost" onClick={onBack}>← 返回</button>
        </div>
      </div>

      <div className="forge-body">
        {/* Inventory list */}
        <div className="forge-left">
          <div className="forge-filter-tabs">
            {(['all', 'weapon', 'head', 'body', 'hands', 'boots', 'ring', 'accessory'] as const).map(f => (
              <button
                key={f}
                className={`eq-filter-tab ${filterSlot === f ? 'active' : ''}`}
                onClick={() => setFilterSlot(f)}
              >
                {f === 'all' ? '全部' : <AsterVowIcon name={EQUIPMENT_SLOT_ICON[f]} size={16} color={EQUIPMENT_SLOT_ICON_COLOR[f]} />}
              </button>
            ))}
          </div>
          <div className="forge-item-list">
            {inventory.length === 0 && (
              <div className="eq-inv-empty">
                {meta.inventory.length === 0 ? '背包是空的' : '此類型無裝備'}
              </div>
            )}
            {inventory.map(item => (
              <ItemMini
                key={item.uid}
                item={item}
                selected={selected?.uid === item.uid}
                onClick={() => { setSelected(item); setForgeResult(null); setConfirmOp(null) }}
              />
            ))}
          </div>
        </div>

        {/* Forge panel */}
        <div className="forge-right">
          {!selected && (
            <div className="forge-placeholder">
              <div className="fp-icon"><AsterVowIcon name="action-forge" size={34} /></div>
              <div>從左側選擇一件裝備開始鍛造</div>
            </div>
          )}

          {selected && (
            <>
              {/* Item detail */}
              <div className={`forge-detail rarity-${selected.rarity}`}>
                <div className="fd-header">
                  <span className="fd-slot"><AsterVowIcon name={EQUIPMENT_SLOT_ICON[selected.slot]} size={28} color={EQUIPMENT_SLOT_ICON_COLOR[selected.slot]} /></span>
                  <div>
                    <div className="fd-name">{selected.name}</div>
                    <div className="fd-meta">{RARITY_LABEL[selected.rarity]}{selected.requiredRole && <> · <AsterVowIcon name="equip-set" size={13} /> {ROLE_LABEL[selected.requiredRole]}套裝</>}</div>
                  </div>
                </div>
                {selected.legendaryDesc && (
                  <div className="fd-legendary"><AsterVowIcon name="system-stardust" size={15} /> {selected.legendaryDesc}</div>
                )}
                <ul className="fd-affixes">
                  {selected.affixes.length === 0 && <li className="id-no-affix">無詞墜</li>}
                  {selected.affixes.map((a, i) => <li key={i}>{a.label}</li>)}
                </ul>
              </div>

              {/* Result banner */}
              {forgeResult && (
                <div className="forge-result-banner">
                  <AsterVowIcon name="action-forge" size={17} /> 鍛造完成！
                </div>
              )}

              {/* Operations */}
              {!confirmOp && (
                <div className="forge-ops">
                  <div className="forge-op-card">
                    <div className="foc-title"><AsterVowIcon name="action-reroll" size={16} /> 重鑄詞墜</div>
                    <div className="foc-desc">
                      重新隨機所有詞墜，品質與部位不變。
                      {selected.rarity === 'legendary' && selected.slot === 'weapon'
                        ? '傳奇武器效果保留。'
                        : selected.rarity === 'legendary'
                          ? '傳奇效果也會重新隨機。'
                          : ''}
                    </div>
                    <div className="foc-cost"><AsterVowIcon name="system-stardust" size={14} /> {REROLL_COST[selected.rarity]} 星塵</div>
                    <button
                      className="primary foc-btn"
                      disabled={!canReroll}
                      onClick={() => setConfirmOp('reroll')}
                    >
                      {canReroll ? '重鑄' : `星塵不足（需 ${REROLL_COST[selected.rarity]}）`}
                    </button>
                  </div>

                  {nextRarity && upgradeCost && (
                    <div className="forge-op-card">
                      <div className="foc-title"><AsterVowIcon name="action-upgrade" size={16} /> 晉升品質</div>
                      <div className="foc-desc">
                        {RARITY_LABEL[selected.rarity]} → {RARITY_LABEL[nextRarity]}
                        ，重新生成詞墜與效果（品質更高）。
                      </div>
                      <div className="foc-cost"><AsterVowIcon name="system-stardust" size={14} /> {upgradeCost} 星塵</div>
                      <button
                        className="primary foc-btn"
                        disabled={!canUpgrade}
                        onClick={() => setConfirmOp('upgrade')}
                      >
                        {canUpgrade ? '晉升' : `星塵不足（需 ${upgradeCost}）`}
                      </button>
                    </div>
                  )}

                  {!nextRarity && (
                    <div className="forge-op-card forge-op-disabled">
                      <div className="foc-title"><AsterVowIcon name="action-upgrade" size={16} /> 晉升品質</div>
                      <div className="foc-desc">傳奇裝備已是最高品質，無法繼續晉升。</div>
                    </div>
                  )}
                </div>
              )}

              {/* Confirmation */}
              {confirmOp && (
                <div className="forge-confirm">
                  <div className="fc-title">
                    確認{confirmOp === 'reroll' ? '重鑄' : '晉升'}？
                  </div>
                  <div className="fc-cost">
                    消耗 <AsterVowIcon name="system-stardust" size={14} /> {confirmOp === 'reroll' ? REROLL_COST[selected.rarity] : upgradeCost} 星塵
                  </div>
                  {confirmOp === 'upgrade' && (
                    <div className="fc-warn">晉升後詞墜將完全重置，無法還原</div>
                  )}
                  <div className="fc-btns">
                    <button className="primary" onClick={() => applyOp(confirmOp)}>確認</button>
                    <button className="ghost" onClick={() => setConfirmOp(null)}>取消</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
