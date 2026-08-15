import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { HEROES, getHeroSprite } from '../data'
import SpriteAnimator from '../components/SpriteAnimator'
import type { Equipment, EquipmentSlot, MetaState, HeroLoadout, LoadoutSlot, Role } from '../types'
import { INVENTORY_MAX } from '../types'
import { type ChestType, CHEST_DEFS, openChest, openRoleLegendaryChest } from '../chests'
import ChestOpenModal from '../components/ChestOpenModal'
import {
  RARITY_LABEL, SLOT_LABEL, SALVAGE_VALUE, ROLE_LABEL,
  getEquippedItems, computeEquipBonus, computeSetBonus,
  LOADOUT_SLOTS, LOADOUT_SLOT_META, loadoutSlotsForItem,
  removeUidFromLoadout, effectiveSlot, SET_DEFS, autoEquipBest,
  forgeReroll, forgeRerollPartial, forgeUpgrade, REROLL_COST, UPGRADE_COST, RARITY_NEXT,
  getEnhanceDuplicates, enhanceItem, ENHANCE_COST, getAffixLabel,
  getAffixTier, rerollCostWithLocks,
} from '../equipment'
import {
  getExpForLevel,
  defaultHeroProgress, STAR_CONDITIONS, getHeroStarTitle, HERO_STAR_PASSIVES,
} from '../talents'
import { generateHeroTalentTree, computeArenaTalentBonus, isTalentNodeAvailable, pointCostForKind, requiredLevelForTier, type ArenaTalentNode } from '../arena/arenaTalents'
import ArenaEquipmentScreen from './ArenaEquipmentScreen'
import AsterVowIcon from '../components/AsterVowIcon'
import { CHEST_ICON, EQUIPMENT_SLOT_ICON, LOADOUT_SLOT_ICON, EQUIPMENT_SLOT_ICON_COLOR, LOADOUT_SLOT_ICON_COLOR, EQUIP_SET_ICON_COLOR } from '../equipmentIconMeta'

interface Props {
  meta: MetaState
  onMetaUpdate: (fn: (prev: MetaState) => MetaState) => void
  onBack: () => void
  onSilentCloudSave?: () => void
}

type SlotFilter = EquipmentSlot | 'all'

const ItemCard = memo(function ItemCard({
  item,
  selected,
  equipped,
  locked,
  onSelect,
  onToggle,
  selectMode = false,
  checked = false,
}: {
  item: Equipment
  selected: boolean
  equipped: boolean
  locked: boolean
  onSelect: (uid: string) => void
  onToggle: (uid: string) => void
  selectMode?: boolean
  checked?: boolean
}) {
  const handleClick = () => {
    if (selectMode) {
      if (!equipped && !locked) onToggle(item.uid)
    } else {
      onSelect(item.uid)
    }
  }
  return (
    <button
      className={`eq-item-row rarity-${item.rarity} ${selected ? 'selected' : ''} ${equipped ? 'equipped' : ''} ${locked ? 'locked' : ''} ${selectMode ? 'select-mode' : ''} ${checked ? 'checked' : ''}`}
      onClick={handleClick}
    >
      {selectMode && !locked && <span className="eir-check">{checked ? '☑' : '☐'}</span>}
      <span className="eir-slot"><AsterVowIcon name={EQUIPMENT_SLOT_ICON[item.slot]} size={18} color={EQUIPMENT_SLOT_ICON_COLOR[item.slot]} /></span>
      <span className="eir-name">
        {item.name}
        {(item.enhanceLevel ?? 0) > 0 && <span className="eir-enhance">+{item.enhanceLevel}</span>}
      </span>
      <span className="eir-badges">
        {item.legendaryEffectId && <span className="eir-tag eir-leg"><AsterVowIcon name="system-stardust" size={13} /></span>}
        {item.setId && <span className="eir-tag eir-set">套</span>}
      </span>
      {item.requiredRole && <span className="eir-role">{ROLE_LABEL[item.requiredRole]}</span>}
      <span className="eir-rarity">{RARITY_LABEL[item.rarity]}</span>
      {equipped && <span className="eir-equipped">裝備中</span>}
      {locked && !selectMode && <span className="eir-locked"><AsterVowIcon name="system-lock" size={14} /></span>}
    </button>
  )
})

function ItemDetail({
  item,
  compareItem,
  heroRole,
  isEquipped,
  isLocked,
  stardust,
  forgeDiscount,
  onEquip,
  onUnequip,
  onSalvage,
  onToggleLock,
  onForgeReroll,
  onForgeUpgrade,
  onForgeEnhance,
  duplicateCount,
  onClose,
}: {
  item: Equipment
  compareItem?: Equipment | null
  heroRole: Role
  isEquipped: boolean
  isLocked: boolean
  stardust: number
  forgeDiscount: number
  onEquip: () => void
  onUnequip: () => void
  onSalvage: () => void
  onToggleLock: () => void
  onForgeReroll: (lockedIndices: Set<number>) => void
  onForgeUpgrade: () => void
  onForgeEnhance: () => void
  duplicateCount: number
  onClose: () => void
}) {
  const [confirmSalvage, setConfirmSalvage] = useState(false)
  const [confirmForge, setConfirmForge] = useState<'reroll' | 'upgrade' | 'enhance' | null>(null)
  const [lockedAffixIndices, setLockedAffixIndices] = useState<Set<number>>(new Set())

  useEffect(() => { setLockedAffixIndices(new Set()) }, [item.uid, item.affixes])

  const oldAffixMap = useMemo((): Record<string, number> => {
    if (!compareItem) return {}
    const m: Record<string, number> = {}
    for (const a of compareItem.affixes) m[a.id] = a.value
    return m
  }, [compareItem])

  const newAffixIds = useMemo(() => new Set(item.affixes.map(a => a.id)), [item.affixes])

  const lostAffixes = useMemo(
    () => compareItem ? compareItem.affixes.filter(a => !newAffixIds.has(a.id)) : [],
    [compareItem, newAffixIds]
  )

  return (
    <div className={`item-detail rarity-${item.rarity}`}>
      <div className="id-header">
        <span className="id-slot-icon"><AsterVowIcon name={EQUIPMENT_SLOT_ICON[item.slot]} size={26} color={EQUIPMENT_SLOT_ICON_COLOR[item.slot]} /></span>
        <div style={{ flex: 1 }}>
          <div className="id-name">
            {item.name}
            {(item.enhanceLevel ?? 0) > 0 && (
              <span className="id-enhance-badge">+{item.enhanceLevel}</span>
            )}
            {item.requiredRole && item.requiredRole !== heroRole && (
              <span className="id-cannot-equip-badge"><AsterVowIcon name="system-warning" size={13} /> 僅限{ROLE_LABEL[item.requiredRole]}</span>
            )}
          </div>
          <div className="id-meta">
            {SLOT_LABEL[item.slot]} · {RARITY_LABEL[item.rarity]}
            {item.requiredRole && <>{' · '}<AsterVowIcon name={item.setId ? 'equip-set' : 'equip-weapon'} size={13} color={item.setId ? EQUIP_SET_ICON_COLOR : EQUIPMENT_SLOT_ICON_COLOR.weapon} /> {ROLE_LABEL[item.requiredRole]}{item.setId ? '套裝' : '專屬武器'}</>}
          </div>
        </div>
        <button className="id-close" onClick={onClose}>✕</button>
      </div>

      {item.legendaryDesc && (
        <div className="id-legendary"><AsterVowIcon name="system-stardust" size={15} /> {item.legendaryDesc}</div>
      )}

      {item.setId && (
        <div className="id-set">
          <div className="id-set-name"><AsterVowIcon name="equip-set" size={16} /> {SET_DEFS[item.setId].name} 套裝</div>
          <div className="id-set-line">(2) {SET_DEFS[item.setId].desc2}</div>
          <div className="id-set-line">(4) {SET_DEFS[item.setId].desc4}</div>
        </div>
      )}

      <ul className="id-affixes">
        {item.affixes.length === 0 && <li className="id-no-affix">無詞墜</li>}
        {item.affixes.map((a, i) => {
          const enhLv = item.enhanceLevel ?? 0
          const label = getAffixLabel(a, enhLv)
          const enhBonus = (enhLv > 0 && a.id !== 'forbidden_once_guard')
            ? Math.round(a.value * (1 + enhLv * 0.1)) - a.value
            : 0
          const tier = (item.rarity !== 'normal')
            ? getAffixTier(a.id, a.value, item.rarity as 'magic' | 'rare' | 'legendary')
            : null
          const affixLocked = lockedAffixIndices.has(i)
          const toggleLock = () => setLockedAffixIndices(prev => {
            const next = new Set(prev)
            if (next.has(i)) next.delete(i); else next.add(i)
            return next
          })
          if (!compareItem) return (
            <li key={i} className={affixLocked ? 'affix-locked' : ''}>
              {tier && <span className={`affix-tier affix-tier-${tier}`}>{tier}</span>}
              {label}
              {enhBonus > 0 && <span className="affix-enhance-bonus"> (+{enhBonus})</span>}
              {item.rarity !== 'normal' && (
                <button className={`affix-lock-btn ${affixLocked ? 'active' : ''}`} onClick={toggleLock} title={affixLocked ? '解鎖（重鑄時重新隨機）' : '鎖定（重鑄時保留此詞墜）'}>
                  <AsterVowIcon name={affixLocked ? 'system-lock' : 'system-unlock'} size={14} />
                </button>
              )}
            </li>
          )
          const ov = oldAffixMap[a.id] ?? 0
          const delta = a.value - ov
          const isNew = !(a.id in oldAffixMap)
          return (
            <li key={i} className={[isNew ? 'affix-new' : delta > 0 ? 'affix-better' : delta < 0 ? 'affix-worse' : '', affixLocked ? 'affix-locked' : ''].filter(Boolean).join(' ')}>
              {tier && <span className={`affix-tier affix-tier-${tier}`}>{tier}</span>}
              {label}
              {enhBonus > 0 && <span className="affix-enhance-bonus"> (+{enhBonus})</span>}
              {isNew && <span className="affix-tag"> ✦新增</span>}
              {!isNew && delta > 0 && <span className="affix-delta up"> ▲+{delta}</span>}
              {!isNew && delta < 0 && <span className="affix-delta down"> ▼{delta}</span>}
              {item.rarity !== 'normal' && (
                <button className={`affix-lock-btn ${affixLocked ? 'active' : ''}`} onClick={toggleLock} title={affixLocked ? '解鎖' : '鎖定'}>
                  <AsterVowIcon name={affixLocked ? 'system-lock' : 'system-unlock'} size={14} />
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {(item.enhanceLevel ?? 0) > 0 && (
        <div className="id-enhance-info">
          <AsterVowIcon name="action-enhance" size={15} /> 強化 +{item.enhanceLevel}（詞綴數值已乘以 ×{(1 + (item.enhanceLevel ?? 0) * 0.1).toFixed(1)}）
        </div>
      )}

      {!(item.requiredRole && item.requiredRole !== heroRole) && compareItem && (
          <div className="id-compare">
            <div className="id-compare-header">對比「{compareItem.name}」</div>
            {lostAffixes.length > 0
              ? lostAffixes.map((a, i) => (
                  <div key={i} className="id-compare-loss">✕ 失去：{a.label}</div>
                ))
              : <div className="id-compare-same">— 無失去詞綴 —</div>
            }
          </div>
        )
      }

      <div className="id-actions">
        {item.requiredRole && item.requiredRole !== heroRole
          ? <button className="ghost" disabled>無法裝備</button>
          : isEquipped
          ? <button className="secondary" onClick={onUnequip}>卸下</button>
          : <button className="primary" onClick={onEquip}>裝備</button>
        }
        <button
          className={`ghost id-lock-btn ${isLocked ? 'locked' : ''}`}
          onClick={onToggleLock}
          title={isLocked ? '點擊解除鎖定' : '鎖定防止誤分解'}
        >
          <AsterVowIcon name={isLocked ? 'system-lock' : 'system-unlock'} size={15} /> {isLocked ? '已鎖定' : '鎖定'}
        </button>
        {isLocked
          ? (
            <button className="ghost" disabled title="請先解鎖才能分解">
              <AsterVowIcon name="action-salvage" size={15} /> 分解 (+{SALVAGE_VALUE[item.rarity]} <AsterVowIcon name="system-stardust" size={13} />)
            </button>
          )
          : confirmSalvage
          ? (
            <div className="id-confirm">
              <span>確定分解？</span>
              <button className="ghost" onClick={() => setConfirmSalvage(false)}>取消</button>
              <button className="secondary" onClick={onSalvage}>確認</button>
            </div>
          )
          : (
            <button className="ghost" onClick={() => setConfirmSalvage(true)}>
              <AsterVowIcon name="action-salvage" size={15} /> 分解 (+{SALVAGE_VALUE[item.rarity]} <AsterVowIcon name="system-stardust" size={13} />)
            </button>
          )
        }
      </div>

      {item.rarity !== 'normal' && (
        <div className="id-forge-section">
          <div className="id-forge-title"><AsterVowIcon name="action-forge" size={15} /> 鍛造</div>
          <div className="id-forge-row">
            {confirmForge === 'reroll' ? (
              <div className="id-confirm">
                <span>確定重鑄？{lockedAffixIndices.size > 0 ? `${lockedAffixIndices.size} 條詞墜保留` : '詞綴將全部重置'}</span>
                <button className="ghost" onClick={() => setConfirmForge(null)}>取消</button>
                <button className="secondary" onClick={() => { onForgeReroll(lockedAffixIndices); setConfirmForge(null) }}>確認</button>
              </div>
            ) : (
              (() => {
                const baseCost = rerollCostWithLocks(item.rarity, lockedAffixIndices.size)
                const rerollCost = forgeDiscount > 0 ? Math.max(1, Math.round(baseCost * (1 - forgeDiscount / 100))) : baseCost
                const discountNote = forgeDiscount > 0 ? `（重鑄折扣 -${forgeDiscount}%）` : ''
                return (
                  <button
                    className="ghost id-forge-btn"
                    disabled={stardust < rerollCost}
                    title={`重鑄詞綴，費用 ${rerollCost} 星塵${lockedAffixIndices.size > 0 ? `（含 ${lockedAffixIndices.size} 條鎖定加成）` : ''}${discountNote}`}
                    onClick={() => setConfirmForge('reroll')}
                  >
                    <AsterVowIcon name="action-reroll" size={15} /> 重鑄詞綴
                    <span className="id-forge-cost"> -{rerollCost} <AsterVowIcon name="system-stardust" size={13} /></span>
                    {lockedAffixIndices.size > 0 && <span className="id-forge-cost"> <AsterVowIcon name="system-lock" size={13} />{lockedAffixIndices.size}</span>}
                    {forgeDiscount > 0 && <span className="id-forge-cost"> -{forgeDiscount}%折</span>}
                    {stardust < rerollCost && <span className="id-forge-lack"> (不足)</span>}
                  </button>
                )
              })()
            )}
            {RARITY_NEXT[item.rarity] && confirmForge !== 'reroll' && (
              confirmForge === 'upgrade' ? (
                <div className="id-confirm">
                  <span>晉升 →{RARITY_LABEL[RARITY_NEXT[item.rarity]!]}？</span>
                  <button className="ghost" onClick={() => setConfirmForge(null)}>取消</button>
                  <button className="secondary" onClick={() => { onForgeUpgrade(); setConfirmForge(null) }}>確認</button>
                </div>
              ) : (
                <button
                  className="ghost id-forge-btn id-upgrade-btn"
                  disabled={stardust < (UPGRADE_COST[item.rarity] ?? Infinity)}
                  title={`晉升品質為${RARITY_LABEL[RARITY_NEXT[item.rarity]!]}，費用 ${UPGRADE_COST[item.rarity]} 星塵`}
                  onClick={() => setConfirmForge('upgrade')}
                >
                  <AsterVowIcon name="action-upgrade" size={15} /> 晉升 →{RARITY_LABEL[RARITY_NEXT[item.rarity]!]}
                  <span className="id-forge-cost"> -{UPGRADE_COST[item.rarity]} <AsterVowIcon name="system-stardust" size={13} /></span>
                  {stardust < (UPGRADE_COST[item.rarity] ?? Infinity) && <span className="id-forge-lack"> (不足)</span>}
                </button>
              )
            )}
          </div>

          {/* 強化：同名同品質重複件吃掉升等 */}
          {(item.enhanceLevel ?? 0) < 3 && confirmForge !== 'reroll' && confirmForge !== 'upgrade' && (() => {
            const nextLv = (item.enhanceLevel ?? 0) + 1
            const need = ENHANCE_COST[nextLv]
            return confirmForge === 'enhance' ? (
              <div className="id-confirm">
                <span>消耗 {need} 件同名同品質裝備 → +{nextLv}？</span>
                <button className="ghost" onClick={() => setConfirmForge(null)}>取消</button>
                <button className="secondary" onClick={() => { onForgeEnhance(); setConfirmForge(null) }}>確認</button>
              </div>
            ) : (
              <button
                className="ghost id-forge-btn id-enhance-btn"
                disabled={duplicateCount < need}
                title={`消耗 ${need} 件同名同品質裝備，強化詞綴 +${nextLv * 10}%`}
                onClick={() => setConfirmForge('enhance')}
              >
                <AsterVowIcon name="action-enhance" size={15} /> 強化 +{nextLv}
                <span className="id-forge-cost"> ×{need} 重複件</span>
                <span className={duplicateCount >= need ? 'id-forge-have' : 'id-forge-lack'}>
                  {' '}（庫存 {duplicateCount} 件）
                </span>
              </button>
            )
          })()}
        </div>
      )}
    </div>
  )
}

function TalentTab({ heroId, meta, onMetaUpdate }: { heroId: string; meta: MetaState; onMetaUpdate: (fn: (prev: MetaState) => MetaState) => void }) {
  const hero = HEROES.find(h => h.id === heroId)
  const progress = meta.heroProgress[heroId] ?? defaultHeroProgress()
  const tree = generateHeroTalentTree(heroId)
  const talBonus = computeArenaTalentBonus(heroId, progress.allocatedTalentIds)
  const expNeeded = progress.level < 100 ? getExpForLevel(progress.level) : 0
  const expPct = expNeeded > 0 ? Math.round((progress.exp / expNeeded) * 100) : 100
  const [pendingNode, setPendingNode] = useState<ArenaTalentNode | null>(null)

  if (!hero) return <div className="talent-empty">此英雄尚無天賦樹</div>

  const allocated = progress.allocatedTalentIds ?? []

  function confirmAllocate(node: ArenaTalentNode) {
    onMetaUpdate(m => {
      const cur = m.heroProgress[heroId] ?? defaultHeroProgress()
      const cost = pointCostForKind(node.kind)
      if (cur.allocatedTalentIds.includes(node.id) || cur.talentPoints < cost) return m
      if (!isTalentNodeAvailable(tree, node, cur.allocatedTalentIds, cur.level)) return m
      return {
        ...m,
        heroProgress: {
          ...m.heroProgress,
          [heroId]: {
            ...cur,
            talentPoints: cur.talentPoints - cost,
            allocatedTalentIds: [...cur.allocatedTalentIds, node.id],
          },
        },
      }
    })
    setPendingNode(null)
  }

  const heroSprite = getHeroSprite(hero, progress.stars)
  const headerScale = 110 / heroSprite.frameHeight

  return (
    <div className="talent-tab">
      {/* Hero banner */}
      <div className="talent-hero-banner">
        <div className="thb-sprite">
          <SpriteAnimator sprite={heroSprite} state="idle" scale={headerScale} glow />
        </div>
        <div className="thb-info">
          <div className="thb-name">
            {progress.stars > 0 ? (getHeroStarTitle(hero.id, progress.stars) ?? hero.name) : hero.name}
            <span className="thb-stars">{'★'.repeat(progress.stars)}</span>
          </div>
          <div className="thb-role">{hero.title} · {hero.skill}</div>
          <div className="thb-stats">HP {hero.hp} · ATK {hero.atk} · DEF {hero.def}</div>
        </div>
      </div>
      {/* Level & EXP */}
      <div className="talent-header">
        <div className="th-level">Lv {progress.level}</div>
        <div className="th-exp-bar">
          <div className="th-exp-fill" style={{ width: `${expPct}%` }} />
          <span>{progress.level < 100 ? `${progress.exp} / ${expNeeded} EXP` : 'MAX'}</span>
        </div>
        <div className="th-stars">
          {[1, 2, 3].map(s => (
            <span key={s} className={`th-star ${progress.stars >= s ? 'filled' : ''}`}>★</span>
          ))}
        </div>
      </div>

      {/* Star conditions */}
      <div className="talent-star-conditions">
        <div className="tsc-item tsc-runs">
          <AsterVowIcon name="system-leaderboard" size={15} /> 通關次數（主線＋副本）<strong>{progress.runsWon ?? 0}</strong> 次
        </div>
        {STAR_CONDITIONS.map(sc => (
          <div key={sc.stars} className={`tsc-item ${progress.stars >= sc.stars ? 'done' : ''}`}>
            {'★'.repeat(sc.stars)} {sc.desc}
            {progress.stars >= sc.stars && <span className="tsc-check">✓</span>}
          </div>
        ))}
      </div>

      {/* 天賦點數 */}
      <div className="tvm-points-badge">🔷 剩餘天賦點數：{progress.talentPoints}</div>

      {/* 天賦節點（2026-08 重做：花點數點亮，沿路一個由等級控制的職業技能） */}
      <div className="talent-nodes tvm-tree">
        {tree.map((node, i) => {
          const isAllocated = allocated.includes(node.id)
          const isAvailable = !isAllocated && isTalentNodeAvailable(tree, node, allocated, progress.level)
          const isMajor = node.kind === 'major' || node.kind === 'mastery'
          const requiredLevel = requiredLevelForTier(node.tier)
          return (
            <div key={node.id} className="tvm-node-row">
              {i > 0 && <div className={`tvm-node-connector${isAllocated ? ' lit' : ''}`} />}
              <button
                className={`tvm-node${isMajor ? ' tvm-node-keystone' : ''}${isAllocated ? ' allocated' : ''}${isAvailable ? ' available' : ' locked'}`}
                onClick={() => (isAvailable ? setPendingNode(node) : undefined)}
                disabled={!isAvailable}
              >
                <div className="tvm-node-name">
                  {node.kind === 'mastery'
                    ? <AsterVowIcon name="system-leaderboard" size={15} />
                    : isMajor ? <AsterVowIcon name="system-talent" size={15} /> : null}
                  {node.name}
                </div>
                <div className="tvm-node-desc">{node.desc}</div>
                {progress.level < requiredLevel && (
                  <div className="tvm-node-lockhint">需角色等級 {requiredLevel}</div>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {pendingNode && (
        <div className="tvm-confirm">
          <div className="tvm-confirm-text">花費 {pointCostForKind(pendingNode.kind)} 點天賦點數點亮「{pendingNode.name}」？</div>
          <div className="tvm-confirm-btns">
            <button className="ghost" onClick={() => setPendingNode(null)}>取消</button>
            <button className="primary" onClick={() => confirmAllocate(pendingNode)}>確認</button>
          </div>
        </div>
      )}

      {/* Active abilities summary */}
      <div className="talent-summary">
        <div className="ts-title">✦ 已啟動能力</div>

        {/* Star abilities */}
        {progress.stars > 0 && (
          <>
            <div className="ts-section-divider">— 升星能力 —</div>
            {HERO_STAR_PASSIVES[heroId]?.slice(0, progress.stars).map((entry, i) => (
              <div key={i} className="ts-ability-row ts-ar-star">
                <div className="ts-ar-source">{'★'.repeat(i + 1)}</div>
                <div className="ts-ar-body">
                  <span className="ts-ar-name">{entry.name}</span>
                  <span className="ts-ar-desc">{entry.desc}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Numeric totals */}
        {(talBonus.flatDamage > 0 || talBonus.hpBonus > 0 || talBonus.moveSpeedMult > 1 ||
          talBonus.pickupRangeMult > 1 || talBonus.atkCooldownMult < 1 || talBonus.damageReductionPct > 0 ||
          talBonus.startShieldCharges > 0 || talBonus.lifestealPct > 0 || talBonus.unlockedMajorSkillIds.length > 0) && (
          <>
            <div className="ts-section-divider">— 數值總覽 —</div>
            <div className="ts-stats">
              {talBonus.flatDamage > 0 && <span>攻擊力 +{talBonus.flatDamage}</span>}
              {talBonus.hpBonus > 0 && <span>HP +{talBonus.hpBonus}</span>}
              {talBonus.moveSpeedMult > 1 && <span>移速 +{Math.round((talBonus.moveSpeedMult - 1) * 100)}%</span>}
              {talBonus.pickupRangeMult > 1 && <span>拾取範圍 +{Math.round((talBonus.pickupRangeMult - 1) * 100)}%</span>}
              {talBonus.atkCooldownMult < 1 && <span>攻速 +{Math.round((1 - talBonus.atkCooldownMult) * 100)}%</span>}
              {talBonus.damageReductionPct > 0 && <span>減傷 +{Math.round(talBonus.damageReductionPct * 100)}%</span>}
              {talBonus.startShieldCharges > 0 && <span>起始護盾 +{talBonus.startShieldCharges}</span>}
              {talBonus.lifestealPct > 0 && <span>吸血 +{Math.round(talBonus.lifestealPct * 100)}%</span>}
              {talBonus.unlockedMajorSkillIds.length > 0 && <span>職業技能已解鎖 ×{talBonus.unlockedMajorSkillIds.length}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function EquipmentScreen({ meta, onMetaUpdate, onBack, onSilentCloudSave }: Props) {
  const [selectedHeroId, setSelectedHeroId] = useState(HEROES[0].id)
  const [selectedItemUid, setSelectedItemUid] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  const [filterSlot, setFilterSlot] = useState<EquipmentSlot | 'all'>('all')
  const [filterRole, setFilterRole] = useState<Role | 'all'>('all')
  const [activeTab, setActiveTab] = useState<'equip' | 'talent' | 'items'>('equip')
  const [openingChest, setOpeningChest] = useState<ChestType | null>(null)
  const [chestModalResult, setChestModalResult] = useState<{ equipment: Equipment[]; stardust: number } | null>(null)
  const [chestModalType, setChestModalType] = useState<ChestType | null>(null)
  const [roleChestPickRole, setRoleChestPickRole] = useState<Role | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set())
  type SortBy = 'rarity' | 'slot' | 'name'
  const [sortBy, setSortBy] = useState<SortBy>('rarity')

  const hero = HEROES.find(h => h.id === selectedHeroId) ?? HEROES[0]
  const loadout: HeroLoadout = meta.loadouts[selectedHeroId] ?? {}

  const equippedItems = useMemo(() => getEquippedItems(meta.inventory, loadout), [meta.inventory, loadout])
  const eqBonus = useMemo(() => computeEquipBonus(equippedItems), [equippedItems])
  const setStatus = useMemo(() => computeSetBonus(equippedItems).status, [equippedItems])

  const equippedUids = useMemo(() => new Set(
    LOADOUT_SLOTS.map(s => loadout[s]).concat(loadout.armor).filter(Boolean) as string[]
  ), [loadout])

  const allEquippedUids = useMemo(() => new Set(
    Object.values(meta.loadouts).flatMap(lo =>
      [...LOADOUT_SLOTS.map(s => lo[s]), lo.armor]
    ).filter(Boolean) as string[]
  ), [meta.loadouts])

  const filteredInventory = useMemo(() =>
    meta.inventory.filter(item => {
      const slotOk = filterSlot === 'all' || effectiveSlot(item.slot) === filterSlot
      const roleOk = filterRole === 'all' || item.requiredRole === filterRole
      return slotOk && roleOk
    }),
    [meta.inventory, filterSlot, filterRole]
  )

  const RARITY_ORDER: Record<string, number> = { legendary: 0, rare: 1, magic: 2, normal: 3 }
  const SLOT_ORDER: Record<string, number> = { weapon: 0, head: 1, body: 2, hands: 3, boots: 4, ring: 5, accessory: 6, armor: 7 }
  const sortedInventory = useMemo(() => {
    const arr = [...filteredInventory]
    if (sortBy === 'rarity')
      arr.sort((a, b) => (RARITY_ORDER[a.rarity] ?? 9) - (RARITY_ORDER[b.rarity] ?? 9) || (SLOT_ORDER[effectiveSlot(a.slot)] ?? 9) - (SLOT_ORDER[effectiveSlot(b.slot)] ?? 9))
    else if (sortBy === 'slot')
      arr.sort((a, b) => (SLOT_ORDER[effectiveSlot(a.slot)] ?? 9) - (SLOT_ORDER[effectiveSlot(b.slot)] ?? 9) || (RARITY_ORDER[a.rarity] ?? 9) - (RARITY_ORDER[b.rarity] ?? 9))
    else
      arr.sort((a, b) => a.name.localeCompare(b.name, 'zh'))
    return arr
  }, [filteredInventory, sortBy])

  const selectedItem = useMemo(
    () => selectedItemUid ? (meta.inventory.find(e => e.uid === selectedItemUid) ?? null) : null,
    [selectedItemUid, meta.inventory]
  )

  const compareItem = useMemo((): Equipment | null => {
    if (!selectedItem || equippedUids.has(selectedItem.uid)) return null
    const candidates = loadoutSlotsForItem(selectedItem)
    for (const s of candidates) {
      const uid = loadout[s]
      if (uid) return meta.inventory.find(e => e.uid === uid) ?? null
    }
    return null
  }, [selectedItem, equippedUids, loadout, meta.inventory])

  const selectedSalvageValueMemo = useMemo(() =>
    meta.inventory.filter(it => selectedUids.has(it.uid)).reduce((s, it) => s + SALVAGE_VALUE[it.rarity], 0),
    [meta.inventory, selectedUids]
  )

  const isItemEquipped = useCallback((item: Equipment) => equippedUids.has(item.uid), [equippedUids])

  const lockedUidSet = useMemo(() => new Set(meta.lockedUids ?? []), [meta.lockedUids])
  const isItemLocked = useCallback((item: Equipment) => lockedUidSet.has(item.uid), [lockedUidSet])

  const toggleLock = useCallback((uid: string) => {
    onMetaUpdate(prev => {
      const locked = prev.lockedUids ?? []
      return {
        ...prev,
        lockedUids: locked.includes(uid) ? locked.filter(id => id !== uid) : [...locked, uid],
      }
    })
  }, [onMetaUpdate])

  // 找出某 uid 目前佔用的 loadout 欄位
  const findEquippedSlot = (uid: string): LoadoutSlot | 'armor' | null => {
    for (const s of LOADOUT_SLOTS) if (loadout[s] === uid) return s
    if (loadout.armor === uid) return 'armor'
    return null
  }

  const equipItem = useCallback((item: Equipment) => {
    if (item.requiredRole && item.requiredRole !== hero.role) {
      alert(`此裝備只能由【${item.requiredRole}】職業裝備`)
      return
    }
    const candidates = loadoutSlotsForItem(item)
    const target = candidates.find(s => !loadout[s]) ?? candidates[0]
    onMetaUpdate(prev => {
      const lo = prev.loadouts[selectedHeroId] ?? {}
      return { ...prev, loadouts: { ...prev.loadouts, [selectedHeroId]: { ...lo, [target]: item.uid } } }
    })
    setSelectedItemUid(null)
  }, [hero.role, loadout, onMetaUpdate, selectedHeroId])

  const unequipItem = useCallback((item: Equipment) => {
    const slot = findEquippedSlot(item.uid)
    if (!slot) return
    onMetaUpdate(prev => {
      const lo = prev.loadouts[selectedHeroId] ?? {}
      return { ...prev, loadouts: { ...prev.loadouts, [selectedHeroId]: { ...lo, [slot]: null } } }
    })
    setSelectedItemUid(null)
  }, [findEquippedSlot, onMetaUpdate, selectedHeroId])

  const handleOpenChest = useCallback((type: ChestType) => {
    const result = openChest(type)
    // Commit immediately before animation (anti-SL)
    onMetaUpdate(prev => ({
      ...prev,
      stardust: prev.stardust + result.stardust,
      inventory: [...prev.inventory, ...result.equipment],
      items: (prev.items ?? [])
        .map(s => s.id === type ? { ...s, count: s.count - 1 } : s)
        .filter(s => s.count > 0),
    }))
    onSilentCloudSave?.()
    setChestModalType(type)
    setChestModalResult(result)
    setOpeningChest(null)
  }, [selectedHeroId, onMetaUpdate, onSilentCloudSave])

  const handleOpenRoleChest = useCallback((role: Role) => {
    const result = openRoleLegendaryChest(role)
    onMetaUpdate(prev => ({
      ...prev,
      inventory: [...prev.inventory, ...result.equipment],
      items: (prev.items ?? [])
        .map(s => s.id === 'chest_role_legendary' ? { ...s, count: s.count - 1 } : s)
        .filter(s => s.count > 0),
    }))
    onSilentCloudSave?.()
    setChestModalType('chest_role_legendary')
    setChestModalResult(result)
    setOpeningChest(null)
    setRoleChestPickRole(null)
  }, [onMetaUpdate, onSilentCloudSave])

  const salvageItem = useCallback((item: Equipment) => {
    if (lockedUidSet.has(item.uid)) return
    const salvageAmt = Math.round(SALVAGE_VALUE[item.rarity] * (1 + eqBonus.salvageBonus / 100))
    onMetaUpdate(prev => ({
      ...prev,
      stardust: prev.stardust + salvageAmt,
      inventory: prev.inventory.filter(e => e.uid !== item.uid),
      loadouts: Object.fromEntries(
        Object.entries(prev.loadouts).map(([hid, lo]) => [hid, removeUidFromLoadout(lo, item.uid)])
      ),
    }))
    setSelectedItemUid(null)
  }, [onMetaUpdate, lockedUidSet])

  const handleForgeReroll = useCallback((item: Equipment, lockedIndices?: Set<number>) => {
    const lockedCount = lockedIndices?.size ?? 0
    const baseCost = rerollCostWithLocks(item.rarity, lockedCount)
    const cost = eqBonus.forgeDiscount > 0 ? Math.max(1, Math.round(baseCost * (1 - eqBonus.forgeDiscount / 100))) : baseCost
    onMetaUpdate(prev => {
      if (prev.stardust < cost) return prev
      const newItem = lockedCount > 0
        ? forgeRerollPartial(item, lockedIndices!)
        : forgeReroll(item)
      return {
        ...prev,
        stardust: prev.stardust - cost,
        inventory: prev.inventory.map(e => e.uid === item.uid ? newItem : e),
      }
    })
  }, [onMetaUpdate])

  const handleForgeUpgrade = useCallback((item: Equipment) => {
    const cost = UPGRADE_COST[item.rarity]
    if (!cost) return
    onMetaUpdate(prev => {
      if (prev.stardust < cost) return prev
      const newItem = forgeUpgrade(item)
      return {
        ...prev,
        stardust: prev.stardust - cost,
        inventory: prev.inventory.map(e => e.uid === item.uid ? newItem : e),
      }
    })
  }, [onMetaUpdate])

  const handleForgeEnhance = useCallback((item: Equipment) => {
    onMetaUpdate(prev => {
      const result = enhanceItem(item, prev.inventory)
      if (!result) return prev
      return { ...prev, inventory: result.updatedInventory }
    })
  }, [onMetaUpdate])

  const autoEquipAll = useCallback(() => {
    onMetaUpdate(prev => {
      const lo = prev.loadouts[selectedHeroId] ?? {}
      const best = autoEquipBest(prev.inventory, hero.role, lo)
      return { ...prev, loadouts: { ...prev.loadouts, [selectedHeroId]: best } }
    })
    setSelectedItemUid(null)
  }, [hero.role, onMetaUpdate, selectedHeroId])

  // ── 批次分解 ──
  const toggleSelectMode = useCallback(() => {
    setSelectMode(m => !m)
    setSelectedUids(new Set())
    setSelectedItemUid(null)
  }, [])

  const toggleSelectUid = useCallback((uid: string) => {
    setSelectedUids(prev => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid); else next.add(uid)
      return next
    })
  }, [])

  const handleSelectItem = useCallback((uid: string) => {
    setSelectedItemUid(prev => prev === uid ? null : uid)
  }, [])

  const salvageableInFilter = useCallback(() =>
    filteredInventory.filter(it => !allEquippedUids.has(it.uid) && !lockedUidSet.has(it.uid)),
    [filteredInventory, allEquippedUids, lockedUidSet]
  )

  const selectAllSalvageable = useCallback(() => {
    setSelectedUids(new Set(salvageableInFilter().map(it => it.uid)))
  }, [salvageableInFilter])

  function batchSalvage() {
    if (selectedUids.size === 0) return
    onMetaUpdate(prev => {
      const removed = prev.inventory.filter(it => selectedUids.has(it.uid) && !lockedUidSet.has(it.uid))
      const gain = removed.reduce((s, it) => s + SALVAGE_VALUE[it.rarity], 0)
      let loadouts = prev.loadouts
      for (const it of removed) {
        loadouts = Object.fromEntries(
          Object.entries(loadouts).map(([hid, lo]) => [hid, removeUidFromLoadout(lo, it.uid)])
        )
      }
      return {
        ...prev,
        stardust: prev.stardust + gain,
        inventory: prev.inventory.filter(it => !selectedUids.has(it.uid)),
        loadouts,
      }
    })
    setSelectedUids(new Set())
    setSelectMode(false)
  }

  return (
    <div className="eq-screen">
      {chestModalResult && chestModalType && (
        <ChestOpenModal
          chestType={chestModalType}
          result={chestModalResult}
          onClose={() => { setChestModalResult(null); setChestModalType(null) }}
        />
      )}
      {/* Header */}
      <div className="eq-header">
        <h2>英雄 &amp; 裝備</h2>
      </div>

      <div className="eq-body">
        {/* Left: Hero list */}
        <div className="eq-hero-list">
          {HEROES.map(h => {
            // 高度優先縮放（維持原本大小觀感）：格子（.ehb-sprite）本身已經
            // 加寬到能放下目前全部英雄裡「寬高比第二寬」的角色（死亡騎士，
            // 1.58）而不裁切；只有武鬥家（1.79，本來就是全隊寬高比最誇張的
            // 一個）還會裁到左右一點點邊緣，其餘英雄完全不裁切、高度也跟以前
            // 完全一樣。之後若新英雄的寬高比又更誇張，把 .ehb-sprite 的
            // width 跟著加大即可，不用再改這裡的縮放邏輯。
            const listTargetH = isMobile ? 62 : 83
            const prog = meta.heroProgress[h.id]
            const listSprite = getHeroSprite(h, prog?.stars ?? 0)
            const listScale = listTargetH / listSprite.frameHeight
            return (
              <button
                key={h.id}
                className={`eq-hero-btn ${selectedHeroId === h.id ? 'active' : ''}`}
                onClick={() => { setSelectedHeroId(h.id); setSelectedItemUid(null) }}
              >
                <div className="ehb-sprite">
                  <SpriteAnimator sprite={listSprite} state="idle" scale={listScale} />
                </div>
                <div className="ehb-text">
                  <div className="ehb-name">
                    {(prog?.stars ?? 0) > 0 ? (getHeroStarTitle(h.id, prog!.stars) ?? h.name) : h.name}
                    {(prog?.stars ?? 0) > 0 && <span className="ehb-star-badge">{'★'.repeat(prog!.stars)}</span>}
                  </div>
                  <div className="ehb-role">{h.title} · Lv{prog?.level ?? 1}</div>
                  <div className="ehb-equipped">
                    {(() => {
                      const lo = meta.loadouts[h.id]
                      const n = lo ? LOADOUT_SLOTS.filter(s => lo[s]).length + (lo.armor ? 1 : 0) : 0
                      return n > 0 ? <span><AsterVowIcon name="nav-equipment" size={14} /> {n}/8</span> : null
                    })()}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Right panel */}
        <div className="eq-right">
          <div className="eq-tabs">
            <button className={`eq-tab ${activeTab === 'equip' ? 'active' : ''}`} onClick={() => setActiveTab('equip')}>裝備</button>
            <button className={`eq-tab ${activeTab === 'talent' ? 'active' : ''}`} onClick={() => setActiveTab('talent')}>天賦 & 成長</button>
            <button className={`eq-tab ${activeTab === 'items' ? 'active' : ''}`} onClick={() => setActiveTab('items')}>
              道具
              {(meta.items ?? []).reduce((n, s) => n + s.count, 0) > 0 && (
                <span style={{ marginLeft: 4, background: '#e07030', borderRadius: 8, padding: '1px 5px', fontSize: '0.7rem', color: '#fff' }}>
                  {(meta.items ?? []).reduce((n, s) => n + s.count, 0)}
                </span>
              )}
            </button>
            <button className="eq-tab eq-tab-back" onClick={onBack}>← 返回</button>
          </div>
          {activeTab === 'talent' && (
            <div className="eq-talent-container">
              <TalentTab heroId={selectedHeroId} meta={meta} onMetaUpdate={onMetaUpdate} />
            </div>
          )}
          {activeTab === 'items' && (
            <div className="eq-items-panel">
              {(meta.items ?? []).length === 0 ? (
                <div className="eq-items-empty">
                  <div style={{ marginBottom: 8 }}><AsterVowIcon name="system-gift" size={32} /></div>
                  <div>目前沒有道具</div>
                  <div style={{ fontSize: '0.8rem', color: '#4a6080', marginTop: 6 }}>完成副本即可獲得寶箱！</div>
                </div>
              ) : (
                <>
                  <div className="chest-grid">
                    {(meta.items ?? []).map(stack => {
                      const def = CHEST_DEFS[stack.id as ChestType]
                      if (!def) return null
                      return (
                        <button
                          key={stack.id}
                          className={`chest-stack-btn ${openingChest === stack.id ? 'active' : ''}`}
                          onClick={() => setOpeningChest(openingChest === stack.id ? null : stack.id as ChestType)}
                        >
                          <span className="csb-icon" style={{ color: def.color }}><AsterVowIcon name={CHEST_ICON[def.id]} size={28} /></span>
                          <span className="csb-name" style={{ color: def.color }}>{def.name}</span>
                          <span className="csb-desc" style={{ fontSize: '0.7rem', color: '#5878a0' }}>{def.desc}</span>
                          <span className="csb-count">×{stack.count}</span>
                        </button>
                      )
                    })}
                  </div>
                  {openingChest && (() => {
                    const def = CHEST_DEFS[openingChest]
                    if (openingChest === 'chest_role_legendary') {
                      return (
                        <div className="chest-open-panel">
                          <div className="cop-title" style={{ color: def.color }}>
                            <AsterVowIcon name={CHEST_ICON[def.id]} size={19} /> {def.name}
                          </div>
                          <div className="cop-desc">
                            請先選擇 1 個職業，將獲得該職業套裝的 1 件傳奇裝備：
                          </div>
                          <div className="cop-role-grid">
                            {(Object.keys(ROLE_LABEL) as Role[]).map(role => (
                              <button
                                key={role}
                                className={`cop-role-btn ${roleChestPickRole === role ? 'active' : ''}`}
                                onClick={() => setRoleChestPickRole(role)}
                              >
                                {ROLE_LABEL[role]}
                              </button>
                            ))}
                          </div>
                          <div className="cop-actions">
                            <button
                              className="secondary"
                              disabled={!roleChestPickRole}
                              onClick={() => roleChestPickRole && handleOpenRoleChest(roleChestPickRole)}
                            >
                              開啟！
                            </button>
                            <button className="ghost" onClick={() => { setOpeningChest(null); setRoleChestPickRole(null) }}>取消</button>
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div className="chest-open-panel">
                        <div className="cop-title" style={{ color: def.color }}>
                          <AsterVowIcon name={CHEST_ICON[def.id]} size={19} /> {def.name}
                        </div>
                        <div className="cop-desc">
                          隨機職業套裝，任何英雄都可能出現！
                        </div>
                        <div className="cop-actions">
                          <button className="secondary" onClick={() => handleOpenChest(openingChest)}>
                            開啟！
                          </button>
                          <button className="ghost" onClick={() => setOpeningChest(null)}>取消</button>
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
          )}
          {activeTab === 'equip' && (
            <ArenaEquipmentScreen heroId={selectedHeroId} meta={meta} onMetaUpdate={onMetaUpdate} />
          )}
        </div>
      </div>
    </div>
  )
}
