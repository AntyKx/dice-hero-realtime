import { useMemo, useState, type CSSProperties } from 'react'
import { HEROES } from '../data'
import type { MetaState } from '../types'
import {
  type ArenaEquipment, type ArenaEquipSlot, type ArenaEquipRarity,
  ARENA_EQUIP_SLOTS, ARENA_RARITY_LABEL, ARENA_RARITY_COLOR,
  ENHANCE_MAX_LEVEL, enhanceCost, applyEnhance, getEffectiveBonus,
  salvageArenaEquipment, SYNTHESIS_COST, synthesizeUpgrade,
} from '../arena/equipment'
import { ARENA_RELICS, ARENA_WEAPON_RELICS, type ArenaRelic } from '../arena/relics'
import { ROLE_ICON_META } from '../iconMeta'
import AsterVowIcon from '../components/AsterVowIcon'
import { getEquipmentSlotIcon, getEquipmentSlotIconColor } from '../equipmentIconMeta'

/**
 * 倉庫（2026-08，取代大廳底部導覽的「英雄」）：帳號共用的全部家當總覽，
 * 裝備／遺物／道具三分頁。外層 chrome（頂部貨幣列/breadcrumb）沿用
 * AstralShopScreen.tsx 的 .shop-shell 系列 class；格狀列表/篩選列/詳情
 * 彈窗沿用 CompendiumScreen.tsx 的 .astral-codex-grid/-filter/-detail 系列
 * class（兩者都不依賴各自原本的外層容器，純視覺 class，可以直接混用）。
 *
 * 裝備／遺物本身的資料完全沒有另外複製一份——直接讀 meta.arenaInventory／
 * meta.heroProgress[heroId].ownedRelicIds，這裡只負責篩選/顯示/操作。
 */

type WarehouseTab = 'equip' | 'relic' | 'material'

const EQUIP_SLOT_LABEL: Record<ArenaEquipSlot, string> = {
  weapon: '武器', head: '頭盔', body: '護甲', hands: '手套', boots: '靴子', ring: '戒指', accessory: '飾品',
}
const RARITY_RANK: Record<ArenaEquipRarity, number> = { normal: 0, magic: 1, rare: 2, legendary: 3 }

const BONUS_LABEL: Record<string, string> = {
  hpBonus: 'HP', defBonus: '防禦', moveSpeedPct: '移速', atkSpeedPct: '攻速',
  lifestealPct: '生命偷取', extraProjectiles: '額外彈道', pierceBonus: '穿透',
  thornsPct: '荊棘反傷', burnChancePct: '灼燒觸發', shieldRegenPct: '護盾回復',
  critChancePct: '暴擊率', freezeChancePct: '凍結觸發', markDamageBonusPct: '首擊加成',
  extraDamageReductionPct: '額外減傷', slowAuraPct: '減速光環', executeBonusPct: '處決加成',
  overloadOnKillPct: '過載連擊', comboAtkSpeedPct: '連擊蓄力',
}
const PCT_BONUS_KEYS = new Set([
  'lifestealPct', 'thornsPct', 'burnChancePct', 'shieldRegenPct', 'critChancePct',
  'freezeChancePct', 'markDamageBonusPct', 'extraDamageReductionPct', 'slowAuraPct',
  'executeBonusPct', 'overloadOnKillPct', 'comboAtkSpeedPct',
])
function formatBonus(bonus: ArenaEquipment['bonus']): string {
  const parts = Object.entries(bonus).filter(([, v]) => (v ?? 0) > 0).map(([k, v]) => {
    const label = BONUS_LABEL[k] ?? k
    if (PCT_BONUS_KEYS.has(k)) return `${label} +${Math.round((v ?? 0) * 100)}%`
    if (k === 'moveSpeedPct' || k === 'atkSpeedPct') return `${label} +${v}%`
    return `${label} +${v}`
  })
  return parts.length > 0 ? parts.join('・') : '無額外詞綴'
}

interface RelicEntry { key: string; heroId: string; relic: ArenaRelic }

interface Props {
  meta: MetaState
  onMetaUpdate: (fn: (prev: MetaState) => MetaState) => void
  onBack: () => void
}

export default function WarehouseScreen({ meta, onMetaUpdate, onBack }: Props) {
  const [tab, setTab] = useState<WarehouseTab>('equip')
  const [equipSlotFilter, setEquipSlotFilter] = useState<'all' | ArenaEquipSlot>('all')
  const [equipRoleFilter, setEquipRoleFilter] = useState('all')
  const [relicRoleFilter, setRelicRoleFilter] = useState('all')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectedRelicKey, setSelectedRelicKey] = useState<string | null>(null)
  const [pendingSalvageId, setPendingSalvageId] = useState<string | null>(null)

  const inventory = meta.arenaInventory ?? []
  const roleOptions = HEROES.map(h => h.role).filter((r, i, arr) => arr.indexOf(r) === i)

  function findEquippedHeroId(itemId: string): string | null {
    for (const [heroId, lo] of Object.entries(meta.arenaLoadouts ?? {})) {
      if (Object.values(lo ?? {}).includes(itemId)) return heroId
    }
    return null
  }

  const equipList = useMemo(() => inventory
    .filter(i => equipSlotFilter === 'all' || i.slot === equipSlotFilter)
    .filter(i => equipRoleFilter === 'all' || (equipRoleFilter === 'universal' ? i.kind === 'universal' : i.heroRole === equipRoleFilter))
    .sort((a, b) => RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity]),
  [inventory, equipSlotFilter, equipRoleFilter])

  const relicById = useMemo(() => {
    const map = new Map<string, ArenaRelic>()
    for (const r of [...ARENA_RELICS, ...ARENA_WEAPON_RELICS]) map.set(r.id, r)
    return map
  }, [])

  const relicEntries = useMemo(() => {
    const list: RelicEntry[] = []
    for (const [heroId, prog] of Object.entries(meta.heroProgress ?? {})) {
      for (const relicId of prog.ownedRelicIds ?? []) {
        const relic = relicById.get(relicId)
        if (!relic) continue
        list.push({ key: `${heroId}:${relicId}:${list.length}`, heroId, relic })
      }
    }
    return list
  }, [meta.heroProgress, relicById])

  const filteredRelics = relicEntries.filter(e =>
    relicRoleFilter === 'all' || HEROES.find(h => h.id === e.heroId)?.role === relicRoleFilter)

  const selectedItem = selectedItemId ? inventory.find(i => i.id === selectedItemId) ?? null : null
  const selectedRelic = selectedRelicKey ? relicEntries.find(e => e.key === selectedRelicKey) ?? null : null

  function switchTab(next: WarehouseTab) {
    setTab(next)
    setSelectedItemId(null)
    setSelectedRelicKey(null)
    setPendingSalvageId(null)
  }

  function handleEnhance(item: ArenaEquipment) {
    const level = item.enhanceLevel ?? 0
    if (level >= ENHANCE_MAX_LEVEL) return
    const cost = enhanceCost(level)
    if (meta.enhanceStoneCount < cost.stones || meta.gold < cost.gold) return
    onMetaUpdate(m => ({
      ...m,
      enhanceStoneCount: m.enhanceStoneCount - cost.stones,
      gold: m.gold - cost.gold,
      arenaInventory: (m.arenaInventory ?? []).map(i => i.id === item.id ? applyEnhance(i) : i),
    }))
  }

  function handleSynthesize(item: ArenaEquipment) {
    const cost = SYNTHESIS_COST[item.rarity]
    if (!cost) return
    if (meta.synthesisMaterialCount < cost.material || meta.gold < cost.gold) return
    const upgraded = synthesizeUpgrade(item)
    if (!upgraded) return
    onMetaUpdate(m => ({
      ...m,
      synthesisMaterialCount: m.synthesisMaterialCount - cost.material,
      gold: m.gold - cost.gold,
      arenaInventory: (m.arenaInventory ?? []).map(i => i.id === item.id ? upgraded : i),
    }))
  }

  function handleSalvage(item: ArenaEquipment) {
    const equipped = !!findEquippedHeroId(item.id)
    if (equipped && pendingSalvageId !== item.id) {
      setPendingSalvageId(item.id)
      return
    }
    const { enhanceStones, synthesisMaterial } = salvageArenaEquipment(item)
    onMetaUpdate(m => ({
      ...m,
      enhanceStoneCount: m.enhanceStoneCount + enhanceStones,
      synthesisMaterialCount: m.synthesisMaterialCount + synthesisMaterial,
      arenaInventory: (m.arenaInventory ?? []).filter(i => i.id !== item.id),
      // 分解裝備中的物品要順便清掉所有英雄 loadout 對它的引用，不留孤兒 id。
      arenaLoadouts: Object.fromEntries(Object.entries(m.arenaLoadouts ?? {}).map(([heroId, lo]) => [
        heroId, Object.fromEntries(Object.entries(lo ?? {}).map(([slot, id]) => [slot, id === item.id ? null : id])),
      ])),
    }))
    setPendingSalvageId(null)
    setSelectedItemId(null)
  }

  return (
    <div className="shop-shell wh-shell">
      <header className="shop-header-row">
        <div className="shop-breadcrumb">
          <button type="button" onClick={onBack}>大廳</button>
          <span className="shop-breadcrumb-sep">›</span>
          <span>倉庫</span>
        </div>
        <button type="button" className="shop-back-button" onClick={onBack}>‹ 返回</button>
      </header>

      <section className="shop-hero-block">
        <div className="shop-heading">
          <span className="shop-heading-line" />
          <div>
            <p>ASTRAL VAULT</p>
            <h2>倉庫</h2>
            <span>你身上所有的裝備、遺物與素材，都收在這裡。</span>
          </div>
        </div>
        <div className="shop-wallet" aria-label="目前持有的資源">
          <small>目前持有</small>
          <b><AsterVowIcon name="shop-coin" size={14} /> {meta.gold}</b>
          <b className="shop-wallet-gem"><AsterVowIcon name="system-stardust" size={14} /> {meta.stardust}</b>
          <b><AsterVowIcon name="system-enhance-stone" size={14} /> {meta.enhanceStoneCount}</b>
          <b><AsterVowIcon name="system-synthesis-material" size={14} /> {meta.synthesisMaterialCount}</b>
        </div>
      </section>

      <div className="shop-tabs" role="tablist" aria-label="倉庫分類">
        {([['equip', '裝備'], ['relic', '遺物'], ['material', '道具']] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id}
            className={tab === id ? 'is-active' : ''} onClick={() => switchTab(id)}>
            <b>{label}</b>
          </button>
        ))}
      </div>

      {tab === 'equip' && (
        <>
          <div className="astral-codex-filter" aria-label="部位篩選">
            <button className={equipSlotFilter === 'all' ? 'active' : ''} onClick={() => setEquipSlotFilter('all')}>全部部位</button>
            {ARENA_EQUIP_SLOTS.map(slot => (
              <button key={slot} className={equipSlotFilter === slot ? 'active' : ''} onClick={() => setEquipSlotFilter(slot)}>{EQUIP_SLOT_LABEL[slot]}</button>
            ))}
          </div>
          <div className="astral-codex-filter" aria-label="職業篩選">
            <button className={equipRoleFilter === 'all' ? 'active' : ''} onClick={() => setEquipRoleFilter('all')}>全部裝備</button>
            <button className={equipRoleFilter === 'universal' ? 'active' : ''} onClick={() => setEquipRoleFilter('universal')}>通用</button>
            {roleOptions.map(role => (
              <button key={role} className={equipRoleFilter === role ? 'active' : ''} onClick={() => setEquipRoleFilter(role)}>{ROLE_ICON_META[role].label}</button>
            ))}
          </div>
          <div className="astral-codex-grid">
            {equipList.length === 0 && <p className="astral-codex-empty">這個篩選條件下沒有裝備。</p>}
            {equipList.map(item => {
              const equippedHeroId = findEquippedHeroId(item.id)
              const accent = item.kind === 'class' && item.heroRole ? ROLE_ICON_META[item.heroRole].color : ARENA_RARITY_COLOR[item.rarity]
              return (
                <button key={item.id} className="astral-codex-card" style={{ '--entry-accent': accent } as CSSProperties}
                  onClick={() => setSelectedItemId(item.id)}>
                  <div className="astral-codex-card-top">
                    <span className="astral-codex-card-icon"><AsterVowIcon name={getEquipmentSlotIcon(item.slot)} size={16} color={getEquipmentSlotIconColor(item.slot)} /></span>
                    {equippedHeroId && <span className="astral-codex-card-mark">裝備中</span>}
                  </div>
                  <div className="astral-codex-card-content">
                    <div className="astral-codex-card-badges">
                      <span style={{ color: ARENA_RARITY_COLOR[item.rarity] }}>{ARENA_RARITY_LABEL[item.rarity]}</span>
                      {(item.enhanceLevel ?? 0) > 0 && <span style={{ color: '#ffd94a' }}>+{item.enhanceLevel}</span>}
                    </div>
                    <strong>{item.name}</strong>
                    <p>{formatBonus(getEffectiveBonus(item))}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {tab === 'relic' && (
        <>
          <div className="astral-codex-filter" aria-label="遺物職業篩選">
            <button className={relicRoleFilter === 'all' ? 'active' : ''} onClick={() => setRelicRoleFilter('all')}>全部遺物</button>
            {roleOptions.map(role => (
              <button key={role} className={relicRoleFilter === role ? 'active' : ''} onClick={() => setRelicRoleFilter(role)}>{ROLE_ICON_META[role].label}</button>
            ))}
          </div>
          <div className="astral-codex-grid">
            {filteredRelics.length === 0 && <p className="astral-codex-empty">還沒有任何英雄持有這個職業的遺物。</p>}
            {filteredRelics.map(entry => {
              const hero = HEROES.find(h => h.id === entry.heroId)
              const accent = hero ? ROLE_ICON_META[hero.role].color : '#f0c96d'
              return (
                <button key={entry.key} className="astral-codex-card" style={{ '--entry-accent': accent } as CSSProperties}
                  onClick={() => setSelectedRelicKey(entry.key)}>
                  <div className="astral-codex-card-top">
                    <span className="astral-codex-card-icon"><AsterVowIcon name="equip-set" size={16} /></span>
                  </div>
                  <div className="astral-codex-card-content">
                    <div className="astral-codex-card-badges">
                      <span style={{ color: accent }}>{hero?.name ?? '未知英雄'}持有</span>
                    </div>
                    <strong>{entry.relic.name}</strong>
                    <p>{entry.relic.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {tab === 'material' && (
        <div className="astral-codex-grid">
          <div className="astral-codex-card wh-material-card" style={{ '--entry-accent': '#6ad4ff' } as CSSProperties}>
            <div className="astral-codex-card-top">
              <span className="astral-codex-card-icon"><AsterVowIcon name="system-enhance-stone" size={16} /></span>
            </div>
            <div className="astral-codex-card-content">
              <strong>強化石</strong>
              <small>持有 {meta.enhanceStoneCount} 個</small>
              <p>強化裝備等級</p>
            </div>
          </div>
          <div className="astral-codex-card wh-material-card" style={{ '--entry-accent': '#c79bff' } as CSSProperties}>
            <div className="astral-codex-card-top">
              <span className="astral-codex-card-icon"><AsterVowIcon name="system-synthesis-material" size={16} /></span>
            </div>
            <div className="astral-codex-card-content">
              <strong>合成材料</strong>
              <small>持有 {meta.synthesisMaterialCount} 個</small>
              <p>強化裝備稀有度</p>
            </div>
          </div>
        </div>
      )}

      {selectedItem && (() => {
        const item = selectedItem
        const level = item.enhanceLevel ?? 0
        const eCost = enhanceCost(level)
        const sCost = SYNTHESIS_COST[item.rarity]
        const equippedHeroId = findEquippedHeroId(item.id)
        const equippedHeroName = equippedHeroId ? HEROES.find(h => h.id === equippedHeroId)?.name : null
        const accent = item.kind === 'class' && item.heroRole ? ROLE_ICON_META[item.heroRole].color : ARENA_RARITY_COLOR[item.rarity]
        return (
          <div className="astral-codex-detail-scrim" onClick={() => { setSelectedItemId(null); setPendingSalvageId(null) }}>
            <article className="astral-codex-detail" onClick={e => e.stopPropagation()} style={{ '--entry-accent': accent } as CSSProperties}>
              <div className="astral-codex-detail-glow" />
              <button className="astral-codex-detail-close" onClick={() => setSelectedItemId(null)} aria-label="關閉">✕</button>
              <div className="astral-codex-detail-crest"><AsterVowIcon name={getEquipmentSlotIcon(item.slot)} size={26} color={getEquipmentSlotIconColor(item.slot)} /></div>
              <div className="astral-codex-detail-heading">
                <span>{ARENA_RARITY_LABEL[item.rarity]}・{EQUIP_SLOT_LABEL[item.slot]}{level > 0 ? `・強化 +${level}` : ''}</span>
                <h3>{item.name}</h3>
                <p>{equippedHeroName ? `${equippedHeroName}裝備中` : '目前未裝備'}</p>
              </div>
              <p className="astral-codex-detail-summary">{formatBonus(getEffectiveBonus(item))}</p>
              <div className="wh-actions">
                <button className="ghost" disabled={level >= ENHANCE_MAX_LEVEL || meta.enhanceStoneCount < eCost.stones || meta.gold < eCost.gold}
                  onClick={() => handleEnhance(item)}>
                  <AsterVowIcon name="system-enhance-stone" size={14} />
                  {level >= ENHANCE_MAX_LEVEL ? '已達強化上限' : `強化（石×${eCost.stones}／金×${eCost.gold}）`}
                </button>
                {sCost && (
                  <button className="ghost" disabled={meta.synthesisMaterialCount < sCost.material || meta.gold < sCost.gold}
                    onClick={() => handleSynthesize(item)}>
                    <AsterVowIcon name="system-synthesis-material" size={14} />
                    合成（材料×{sCost.material}／金×{sCost.gold}）
                  </button>
                )}
                <button className="ghost wh-danger" onClick={() => handleSalvage(item)}>
                  <AsterVowIcon name="action-salvage" size={14} />
                  {pendingSalvageId === item.id ? '確定分解？再點一次' : '分解'}
                </button>
              </div>
              <button className="astral-codex-detail-return" onClick={() => setSelectedItemId(null)}>返回倉庫</button>
            </article>
          </div>
        )
      })()}

      {selectedRelic && (() => {
        const hero = HEROES.find(h => h.id === selectedRelic.heroId)
        const accent = hero ? ROLE_ICON_META[hero.role].color : '#f0c96d'
        return (
          <div className="astral-codex-detail-scrim" onClick={() => setSelectedRelicKey(null)}>
            <article className="astral-codex-detail" onClick={e => e.stopPropagation()} style={{ '--entry-accent': accent } as CSSProperties}>
              <div className="astral-codex-detail-glow" />
              <button className="astral-codex-detail-close" onClick={() => setSelectedRelicKey(null)} aria-label="關閉">✕</button>
              <div className="astral-codex-detail-crest"><AsterVowIcon name="equip-set" size={26} /></div>
              <div className="astral-codex-detail-heading">
                <span>{hero?.name ?? '未知英雄'}持有</span>
                <h3>{selectedRelic.relic.name}</h3>
              </div>
              <p className="astral-codex-detail-summary">{selectedRelic.relic.desc}</p>
              <button className="astral-codex-detail-return" onClick={() => setSelectedRelicKey(null)}>返回倉庫</button>
            </article>
          </div>
        )
      })()}
    </div>
  )
}
