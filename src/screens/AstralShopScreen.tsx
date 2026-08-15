import { useState } from 'react'
import type { MetaState } from '../types'
import { HEROES } from '../data'
import AsterVowIcon, { type AsterVowIconName } from '../components/AsterVowIcon'
import {
  type ArenaEquipment, ARENA_RARITY_COLOR, ARENA_RARITY_LABEL,
  SUMMON_SINGLE_COST_STARDUST, SUMMON_TEN_COST_STARDUST, SUMMON_PITY_THRESHOLD,
  summonSingle, summonTen, getEquippedWeapon,
} from '../arena/equipment'
import {
  type ArenaRelic, RELIC_SUMMON_SINGLE_COST, RELIC_SUMMON_TEN_COST, RELIC_SUMMON_PITY_THRESHOLD,
  summonRelicSingle, summonRelicTen,
} from '../arena/relics'
import { getEquipmentSlotIcon, getEquipmentSlotIconColor } from '../equipmentIconMeta'

/**
 * 星界商城（2026-08-14）：UI 原型，移植自 ASTERVOW WebDev 商城原型包
 * （見 D:\CLAUDE專案\三選一\商城）。目前遊戲沒有真實商城後端／庫存／
 * 支付系統，商品資料是展示用原型內容，不代表真實可購買商品；「查看詳情」
 * 面板的購買按鈕只顯示原型提示，不觸發任何真實交易。錢包顯示的金幣/星塵
 * 是遊戲既有真實資料（meta.gold/meta.stardust），不是假數字。
 *
 * 命名為 AstralShopScreen（不是 ShopScreen）：專案裡已經有一個
 * src/screens/ShopScreen.tsx，是 Roguelite 主線/副本地圖節點的「商店」
 * （治療/升級增益卡/買遺物），跟這個大廳「星界商城」入口完全是兩回事，
 * 撞名會互相覆蓋，故意取不同檔名/元件名區分。
 *
 * 2026-08-15：新增「星塵補給」與「夜航補給｜體力」兩個分類，先刻出真實
 * 購買流程（星塵計價商品會真的檢查並扣 meta.stardust；台幣計價商品點擊
 * 購買會進入付款畫面，但金流本身尚未串接，只是流程佔位）。其餘既有分類
 * （遠征補給/星界遺物/外觀典藏）維持原本純預覽、不觸發真實交易的原型
 * 行為，沒有 currency 欄位的商品都走這條舊路徑。
 */

type ShopCategory = 'featured' | 'stardust_pack' | 'stamina' | 'supplies' | 'relics' | 'cosmetics'
type ShopTone = 'gold' | 'blue' | 'ember' | 'violet'
type Currency = 'ntd' | 'stardust'

/**
 * 商品卡片圖示一律照 tone 上色（跟 .shop-product-art/.shop-detail-emblem 的
 * CSS 配色對齊），不要吃 AsterVowIcon 的 name 預設色——商品圖示常常借用
 * stage-* 或 system-* 等圖示純粹當裝飾符號用（例如「遠征者封印」借 stage-defense
 * 表示防禦感），沒有要表達那個圖示原本的語意，硬吃預設色會讓圖示顏色跟卡片
 * 底色/光暈對不上。
 */
const TONE_ICON_COLOR: Record<ShopTone, string> = {
  gold: '#e9b85c',
  blue: '#a6c9ff',
  ember: '#ffad73',
  violet: '#c8b5ff',
}

interface ShopProduct {
  id: string
  category: ShopCategory
  featured: boolean
  eyebrow: string
  name: string
  description: string
  price: string
  icon: AsterVowIconName
  tone: ShopTone
  /** 有這個欄位代表走「真實購買流程」，沒有則維持舊版純預覽原型行為。 */
  currency?: Currency
  costNTD?: number
  costStardust?: number
  /** 商品卡片上的小標籤，如「首購加碼」「主推低價」。 */
  tag?: string
  /** 星塵計價商品每日限購次數（目前僅顯示提示文字，尚未接入真實每日計數）。 */
  dailyLimit?: number
  /** 購買成功後要顯示的到帳內容文字。 */
  grantLabel: string
  /** 有這個欄位代表這張卡是抽卡入口，點下去開召喚面板而不是通用詳情彈窗。 */
  summonType?: 'equipment' | 'relic'
}

const SHOP_CATEGORIES: { id: ShopCategory; label: string; kicker: string }[] = [
  { id: 'featured', label: '推薦', kicker: 'FEATURED' },
  { id: 'stardust_pack', label: '星塵補給', kicker: 'STARDUST' },
  { id: 'stamina', label: '夜航補給', kicker: 'STAMINA' },
  { id: 'supplies', label: '遠征補給', kicker: 'SUPPLIES' },
  { id: 'relics', label: '星界遺物', kicker: 'RELICS' },
  { id: 'cosmetics', label: '外觀典藏', kicker: 'COSMETICS' },
]

/** 首次購買星塵補給加贈比例：+50%（不是雙倍，因為免費星塵產量已經不低）。 */
const STARDUST_FIRST_BONUS_PCT = 50

const STARDUST_PACKS: ShopProduct[] = [
  {
    id: 'stardust-pack-1', category: 'stardust_pack', featured: false,
    eyebrow: 'FIRST LIGHT', name: '星塵微光',
    description: '第一縷星塵之光，照亮遠征前的準備。',
    price: 'NT$33', icon: 'shop-gem', tone: 'blue',
    currency: 'ntd', costNTD: 33, tag: '首次小額', grantLabel: '400 星塵',
  },
  {
    id: 'stardust-pack-2', category: 'stardust_pack', featured: false,
    eyebrow: 'STARTER CACHE', name: '星軌小匣',
    description: '沿著星軌捎來的補給小匣，剛好夠展開下一段旅程。',
    price: 'NT$100', icon: 'shop-gem', tone: 'gold',
    currency: 'ntd', costNTD: 100, tag: '入門包', grantLabel: '1,200 星塵',
  },
  {
    id: 'stardust-pack-3', category: 'stardust_pack', featured: true,
    eyebrow: 'VOYAGE PACK', name: '遠征星匣',
    description: '為長途遠征準備的標準星匣，星塵含量最實惠。',
    price: 'NT$170', icon: 'shop-gem', tone: 'blue',
    currency: 'ntd', costNTD: 170, tag: '主推低價', grantLabel: '2,000 星塵',
  },
  {
    id: 'stardust-pack-4', category: 'stardust_pack', featured: true,
    eyebrow: 'CELESTIAL VAULT', name: '星穹寶庫',
    description: '封存整片星穹光輝的寶庫，遠征物資一次備足。',
    price: 'NT$330', icon: 'shop-gem', tone: 'gold',
    currency: 'ntd', costNTD: 330, tag: '主力商品', grantLabel: '4,000 星塵',
  },
  {
    id: 'stardust-pack-5', category: 'stardust_pack', featured: false,
    eyebrow: 'VOW VAULT', name: '誓約星庫',
    description: '與星界立下誓約後開啟的高階星庫，儲量遠超以往。',
    price: 'NT$670', icon: 'shop-gem', tone: 'violet',
    currency: 'ntd', costNTD: 670, tag: '高價包', grantLabel: '8,500 星塵',
  },
  {
    id: 'stardust-pack-6', category: 'stardust_pack', featured: false,
    eyebrow: 'REALMSEA', name: '諸界星海',
    description: '匯聚諸界星海之力的至高寶藏，首發限定的最大容量。',
    price: 'NT$1,690', icon: 'shop-gem', tone: 'ember',
    currency: 'ntd', costNTD: 1690, tag: '首發最高價', grantLabel: '23,000 星塵',
  },
]

const STAMINA_PACKS: ShopProduct[] = [
  {
    id: 'stamina-1', category: 'stamina', featured: false,
    eyebrow: 'NIGHT ROUTE', name: '夜航小補給',
    description: '一次性補滿夜航前的體力缺口。',
    price: 'NT$33', icon: 'shop-zap', tone: 'blue',
    currency: 'ntd', costNTD: 33, grantLabel: '100 體力',
  },
  {
    id: 'stamina-2', category: 'stamina', featured: false,
    eyebrow: '7-DAY PASS', name: '七日航行證',
    description: '七天航行通行證，每天自動撥入體力，適合穩定遠征的旅人。',
    price: 'NT$170', icon: 'shop-zap', tone: 'gold',
    currency: 'ntd', costNTD: 170, grantLabel: '立即 200 ＋ 每日 100 ×7，共 900 體力',
  },
  {
    id: 'stamina-3', category: 'stamina', featured: false,
    eyebrow: '30-DAY PASS', name: '月夜補給證',
    description: '整月的補給承諾，星舟不斷航，體力也不斷航。',
    price: 'NT$390', icon: 'shop-zap', tone: 'violet',
    currency: 'ntd', costNTD: 390, grantLabel: '立即 500 ＋ 每日 100 ×30，共 3,500 體力',
  },
  {
    id: 'stamina-4', category: 'stamina', featured: true,
    eyebrow: 'EMERGENCY KIT', name: '深夜應急箱',
    description: '深夜臨時徵用的應急箱，用星塵換來立即可用的體力。',
    price: '300 星塵', icon: 'shop-zap', tone: 'ember',
    currency: 'stardust', costStardust: 300, dailyLimit: 2, grantLabel: '100 體力',
  },
]

const SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: 'stardust-cache', category: 'supplies', featured: true,
    eyebrow: 'EXPEDITION SUPPLY', name: '星塵補給匣',
    description: '為下一段遠征備妥可立即使用的星塵與航道燃料。',
    price: '320 星塵', icon: 'shop-gift', tone: 'gold', grantLabel: '展示用內容',
  },
  {
    id: 'astral-chart', category: 'relics', featured: true,
    eyebrow: "FATE'S BEQUEST", name: '命運者遺贈',
    description: '命運者留下的餽贈，接下之時，裝備的歸屬已然註定。',
    price: '200 星塵起', icon: 'shop-scroll', tone: 'blue', grantLabel: '召喚裝備',
    summonType: 'equipment',
  },
  {
    id: 'ember-crest', category: 'cosmetics', featured: true,
    eyebrow: 'HERO COSMETIC', name: '熾焰徽記',
    description: '為英雄徽章加上熔金邊線，讓火光在星門前留下記號。',
    price: '240 星塵', icon: 'shop-flame', tone: 'ember', grantLabel: '展示用內容',
  },
  {
    id: 'wayfarer-seal', category: 'relics', featured: false,
    eyebrow: 'VOYAGER RELIC', name: '遠征者封印',
    description: '尚未鑑定的星界遺物，等待真正的持有者喚醒。',
    price: '400 星塵起', icon: 'stage-defense', tone: 'violet', grantLabel: '召喚遺物',
    summonType: 'relic',
  },
  {
    id: 'night-supply', category: 'supplies', featured: false,
    eyebrow: 'NIGHT ROUTE KIT', name: '夜航補給包',
    description: '為長時間 Arena 航程準備的實用補給展示組。',
    price: '120 星塵', icon: 'shop-zap', tone: 'blue', grantLabel: '展示用內容',
  },
  {
    id: 'astral-cloak', category: 'cosmetics', featured: false,
    eyebrow: 'HERO COSMETIC', name: '星環披風',
    description: '以星環光澤描邊的外觀樣式，適合站上星界舞台。',
    price: '380 星塵', icon: 'stage-collection', tone: 'gold', grantLabel: '展示用內容',
  },
  ...STARDUST_PACKS,
  ...STAMINA_PACKS,
]

interface Props {
  meta: MetaState
  onMetaUpdate: (fn: (prev: MetaState) => MetaState) => void
  onBack: () => void
}

type SummonResult =
  | { kind: 'equipment'; items: ArenaEquipment[] }
  | { kind: 'relic'; relics: ArenaRelic[]; ownedIdsBefore: string[] }

export default function AstralShopScreen({ meta, onMetaUpdate, onBack }: Props) {
  const [category, setCategory] = useState<ShopCategory>('featured')
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null)
  const [previewMsg, setPreviewMsg] = useState<string | null>(null)
  const [paymentProduct, setPaymentProduct] = useState<ShopProduct | null>(null)
  const [summonType, setSummonType] = useState<'equipment' | 'relic' | null>(null)
  const [summonResult, setSummonResult] = useState<SummonResult | null>(null)
  const [insufficientMsg, setInsufficientMsg] = useState<string | null>(null)
  const products = category === 'featured'
    ? SHOP_PRODUCTS.filter(p => p.featured)
    : SHOP_PRODUCTS.filter(p => p.category === category)

  const closeDetail = () => { setSelectedProduct(null); setPreviewMsg(null) }
  const closeSummon = () => { setSummonType(null) }
  const isUnaffordable = (cost: number) => meta.stardust < cost

  /** 星塵不夠時共用的處理：關掉目前開著的任何面板，跳轉到「星塵補給」分類，
   *  並在分類上方留一則提示訊息（手動切分類會清掉，不用額外的關閉按鈕）。 */
  const goBuyStardust = (cost: number) => {
    setInsufficientMsg(`星塵不足，還差 ${cost - meta.stardust} 星塵，已經幫你切到「星塵補給」分類。`)
    setCategory('stardust_pack')
    closeDetail()
    closeSummon()
    setPaymentProduct(null)
    setSummonResult(null)
  }

  // 遺物召喚是分英雄的（跟 HeroProgress.ownedRelicIds/武器專屬遺物池一致），
  // 用目前出戰的隊長當召喚對象（跟大廳選英雄是同一個人）。
  const summonHeroId = meta.party?.leaderId ?? HEROES[0].id
  const summonHero = HEROES.find(h => h.id === summonHeroId) ?? HEROES[0]
  const summonHeroProg = meta.heroProgress[summonHeroId]
  const relicOwnedIds = summonHeroProg?.ownedRelicIds ?? []
  const relicWeaponTag = getEquippedWeapon(meta.arenaInventory ?? [], meta.arenaLoadouts?.[summonHeroId])?.weaponTag
  const relicPity = summonHeroProg?.relicSummonPityCount ?? 0
  const relicDupStreak = summonHeroProg?.relicSummonDupStreak ?? 0
  const equipPity = meta.arenaGachaPityCount ?? 0

  const doEquipmentSummon = (count: 1 | 10) => {
    const cost = count === 1 ? SUMMON_SINGLE_COST_STARDUST : SUMMON_TEN_COST_STARDUST
    if (meta.stardust < cost) {
      goBuyStardust(cost)
      return
    }
    const { items, pityCountAfter } = count === 1
      ? (() => { const r = summonSingle(equipPity); return { items: [r.item], pityCountAfter: r.pityCountAfter } })()
      : summonTen(equipPity)
    onMetaUpdate(m => ({
      ...m,
      stardust: m.stardust - cost,
      arenaInventory: [...(m.arenaInventory ?? []), ...items],
      arenaGachaPityCount: pityCountAfter,
    }))
    setSummonResult({ kind: 'equipment', items })
  }

  const doRelicSummon = (count: 1 | 10) => {
    const cost = count === 1 ? RELIC_SUMMON_SINGLE_COST : RELIC_SUMMON_TEN_COST
    if (meta.stardust < cost) {
      goBuyStardust(cost)
      return
    }
    const { relics, pityCountAfter, dupStreakAfter } = count === 1
      ? (() => { const r = summonRelicSingle(relicOwnedIds, relicWeaponTag, relicPity, relicDupStreak); return { relics: [r.relic], pityCountAfter: r.pityCountAfter, dupStreakAfter: r.dupStreakAfter } })()
      : summonRelicTen(relicOwnedIds, relicWeaponTag, relicPity, relicDupStreak)
    const newOwnedIds = Array.from(new Set([...relicOwnedIds, ...relics.map(r => r.id)]))
    onMetaUpdate(m => ({
      ...m,
      stardust: m.stardust - cost,
      heroProgress: {
        ...m.heroProgress,
        [summonHeroId]: {
          ...m.heroProgress[summonHeroId],
          ownedRelicIds: newOwnedIds,
          relicSummonPityCount: pityCountAfter,
          relicSummonDupStreak: dupStreakAfter,
        },
      },
    }))
    setSummonResult({ kind: 'relic', relics, ownedIdsBefore: relicOwnedIds })
  }

  const handleBuy = (product: ShopProduct) => {
    if (!product.currency) {
      setPreviewMsg('商城原型：購買流程尚未連接，這裡只展示互動回饋。')
      return
    }
    if (product.currency === 'stardust') {
      const cost = product.costStardust ?? 0
      if (meta.stardust < cost) {
        goBuyStardust(cost)
        return
      }
      onMetaUpdate(m => ({ ...m, stardust: m.stardust - cost }))
      setPreviewMsg(`已使用 ${cost} 星塵兌換「${product.name}」，${product.grantLabel}已到帳（體力系統尚未正式上線，這裡先扣真實星塵示範流程）。`)
      return
    }
    // currency === 'ntd'：導向付款畫面（金流尚未串接，先刻流程）
    closeDetail()
    setPaymentProduct(product)
  }

  return (
    <div className="shop-shell">
      <header className="shop-header-row">
        <div className="shop-breadcrumb">
          <button type="button" onClick={onBack}>大廳</button>
          <span className="shop-breadcrumb-sep">›</span>
          <span>星界商城</span>
        </div>
        <button type="button" className="shop-back-button" onClick={onBack}>‹ 返回</button>
      </header>

      <section className="shop-hero-block">
        <div className="shop-heading">
          <span className="shop-heading-line" />
          <div>
            <p>ASTRAL EXCHANGE</p>
            <h2>星界商城</h2>
            <span>把下一段遠征需要的光，帶回你的星舟。</span>
          </div>
        </div>
        <div className="shop-wallet" aria-label="目前持有的貨幣">
          <small>目前持有</small>
          <b><AsterVowIcon name="shop-coin" size={14} /> {meta.gold}</b>
          <b className="shop-wallet-gem"><AsterVowIcon name="shop-gem" size={14} /> {meta.stardust}</b>
        </div>
      </section>

      <div className="shop-notice">
        <AsterVowIcon name="stage-collection" size={14} color={TONE_ICON_COLOR.gold} />
        <span><b>原型展示</b>　「星塵補給」「夜航補給」「命運者遺贈」「遠征者封印」以外的商品庫存、支付與帳戶資料尚未接入，「查看詳情」內的按鈕只會預覽流程，不會真的購買或扣款。</span>
      </div>

      <div className="shop-tabs" role="tablist" aria-label="商城分類">
        {SHOP_CATEGORIES.map(c => (
          <button key={c.id} type="button" role="tab" aria-selected={category === c.id}
            className={category === c.id ? 'is-active' : ''} onClick={() => { setCategory(c.id); setInsufficientMsg(null) }}>
            <span>{c.kicker}</span>
            <b>{c.label}</b>
          </button>
        ))}
      </div>

      {insufficientMsg && <p className="shop-insufficient-banner">{insufficientMsg}</p>}

      <div className="shop-grid">
        {products.map(product => (
          <button
            type="button"
            key={product.id}
            className={`shop-product-card shop-product-card--${product.tone}`}
            onClick={() => product.summonType ? setSummonType(product.summonType) : setSelectedProduct(product)}
            aria-label={product.summonType ? `開啟${product.name}召喚` : product.currency ? `確認購買${product.name}` : `查看${product.name}詳情`}
          >
            <div className="shop-product-art">
              <span className="shop-product-art-orbit" aria-hidden="true" />
              <AsterVowIcon name={product.icon} size={29} color={TONE_ICON_COLOR[product.tone]} />
              <span className="shop-product-badge">{product.tag ?? (product.featured ? '推薦' : '典藏')}</span>
            </div>
            <div className="shop-product-copy">
              <span className="shop-product-eyebrow">{product.eyebrow}</span>
              <h3>{product.name}</h3>
              {(product.currency || product.summonType) && <p className="shop-product-grant">{product.grantLabel}</p>}
              <p>{product.description}</p>
            </div>
            <div className="shop-product-footer">
              <span><small>{product.summonType ? '起始售價' : product.currency ? '售價' : '展示價格'}</small>
                <b className={isUnaffordable(
                  product.summonType === 'equipment' ? SUMMON_SINGLE_COST_STARDUST
                    : product.summonType === 'relic' ? RELIC_SUMMON_SINGLE_COST
                    : product.currency === 'stardust' ? (product.costStardust ?? 0) : 0
                ) && (product.summonType || product.currency === 'stardust') ? 'shop-cost-unaffordable' : undefined}>{product.price}</b>
              </span>
              <span className="shop-product-open">{product.summonType ? '召喚 ›' : product.currency ? '確認購買 ›' : '查看詳情 ›'}</span>
            </div>
          </button>
        ))}
      </div>

      {selectedProduct && (
        <div className="shop-detail-overlay" role="dialog" aria-modal="true" aria-labelledby="shop-detail-title">
          <button type="button" className="shop-detail-scrim" aria-label="關閉商品詳情" onClick={closeDetail} />
          <section className="shop-detail-panel">
            <button type="button" className="shop-detail-close" aria-label="關閉商品詳情" onClick={closeDetail}>
              <AsterVowIcon name="shop-close" size={16} />
            </button>
            <div className={`shop-detail-emblem shop-detail-emblem--${selectedProduct.tone}`}>
              <AsterVowIcon name={selectedProduct.icon} size={38} color={TONE_ICON_COLOR[selectedProduct.tone]} />
            </div>
            <span className="shop-product-eyebrow">{selectedProduct.eyebrow}</span>
            <h3 id="shop-detail-title">{selectedProduct.name}</h3>
            <p>{selectedProduct.description}</p>
            <p className="shop-detail-grant">內容：{selectedProduct.grantLabel}</p>
            {selectedProduct.currency === 'ntd' && selectedProduct.category === 'stardust_pack' && (
              <p className="shop-detail-bonus">首次購買加碼 +{STARDUST_FIRST_BONUS_PCT}%</p>
            )}
            {selectedProduct.dailyLimit && (
              <p className="shop-detail-limit">每日限購 {selectedProduct.dailyLimit} 次</p>
            )}
            <div className="shop-detail-price">
              <small>{selectedProduct.currency ? '售價' : '展示價格'}</small>
              <b className={selectedProduct.currency === 'stardust' && isUnaffordable(selectedProduct.costStardust ?? 0) ? 'shop-cost-unaffordable' : undefined}>{selectedProduct.price}</b>
            </div>
            <button type="button" className="shop-buy-button" onClick={() => handleBuy(selectedProduct)}>
              <AsterVowIcon name="nav-shop" size={16} />
              {selectedProduct.currency === 'ntd' ? '前往付款' : selectedProduct.currency === 'stardust' ? '使用星塵購買' : '預覽購買流程'}
            </button>
            {previewMsg && <p className="shop-preview-msg">{previewMsg}</p>}
          </section>
        </div>
      )}

      {paymentProduct && (
        <div className="shop-payment-overlay" role="dialog" aria-modal="true" aria-labelledby="shop-payment-title">
          <button type="button" className="shop-detail-scrim" aria-label="關閉付款畫面" onClick={() => setPaymentProduct(null)} />
          <section className="shop-payment-panel">
            <button type="button" className="shop-detail-close" aria-label="關閉付款畫面" onClick={() => setPaymentProduct(null)}>
              <AsterVowIcon name="shop-close" size={16} />
            </button>
            <span className="shop-product-eyebrow">{paymentProduct.eyebrow}</span>
            <h3 id="shop-payment-title">付款確認</h3>
            <div className="shop-payment-row">
              <span>{paymentProduct.name}</span>
              <b>{paymentProduct.price}</b>
            </div>
            <p className="shop-detail-grant">內容：{paymentProduct.grantLabel}</p>
            {paymentProduct.category === 'stardust_pack' && (
              <p className="shop-detail-bonus">首次購買加碼 +{STARDUST_FIRST_BONUS_PCT}%</p>
            )}
            <div className="shop-payment-stub">
              <AsterVowIcon name="system-lock" size={16} />
              <span>金流尚未串接，這裡先預留付款畫面的流程位置，之後會接上真實金流服務（信用卡／Apple/Google Pay 等）。</span>
            </div>
            <button type="button" className="shop-buy-button" disabled>
              <AsterVowIcon name="nav-shop" size={16} /> 確認付款（尚未開放）
            </button>
          </section>
        </div>
      )}

      {summonType && (
        <div className="shop-summon-overlay" role="dialog" aria-modal="true" aria-labelledby="shop-summon-title">
          <button type="button" className="shop-detail-scrim" aria-label="關閉召喚面板" onClick={closeSummon} />
          <section className="shop-summon-panel">
            <button type="button" className="shop-detail-close" aria-label="關閉召喚面板" onClick={closeSummon}>
              <AsterVowIcon name="shop-close" size={16} />
            </button>
            {summonType === 'equipment' ? (
              <>
                <span className="shop-product-eyebrow">FATE'S BEQUEST</span>
                <h3 id="shop-summon-title">裝備召喚</h3>
                <p className="shop-summon-desc">召喚池涵蓋全部英雄的武器與通用裝備。十連保證至少一件稀有以上；累積 {SUMMON_PITY_THRESHOLD} 抽必出傳說。</p>
                <p className="shop-summon-pity">距離保底傳說裝備還差 {Math.max(0, SUMMON_PITY_THRESHOLD - equipPity)} 抽</p>
                <div className="shop-summon-btns">
                  <button type="button" className="shop-buy-button" onClick={() => doEquipmentSummon(1)}>
                    <AsterVowIcon name="shop-gem" size={16} /> 單抽 <span className={isUnaffordable(SUMMON_SINGLE_COST_STARDUST) ? 'shop-cost-unaffordable' : undefined}>{SUMMON_SINGLE_COST_STARDUST}</span>
                  </button>
                  <button type="button" className="shop-buy-button" onClick={() => doEquipmentSummon(10)}>
                    <AsterVowIcon name="shop-gem" size={16} /> 十連 <span className={isUnaffordable(SUMMON_TEN_COST_STARDUST) ? 'shop-cost-unaffordable' : undefined}>{SUMMON_TEN_COST_STARDUST}</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="shop-product-eyebrow">VOYAGER RELIC</span>
                <h3 id="shop-summon-title">遺物召喚</h3>
                <p className="shop-summon-desc">為目前出戰的「{summonHero.name}」召喚遺物，跨局永久持有。十連保證至少一件未持有的新遺物；累積 {RELIC_SUMMON_PITY_THRESHOLD} 抽必出新遺物；連續兩次抽到已持有品項後，下一抽必為未持有（重複品項本身仍會疊加生效，不是廢料）。</p>
                <p className="shop-summon-pity">距離保底新遺物還差 {Math.max(0, RELIC_SUMMON_PITY_THRESHOLD - relicPity)} 抽</p>
                <div className="shop-summon-btns">
                  <button type="button" className="shop-buy-button" onClick={() => doRelicSummon(1)}>
                    <AsterVowIcon name="shop-gem" size={16} /> 單抽 <span className={isUnaffordable(RELIC_SUMMON_SINGLE_COST) ? 'shop-cost-unaffordable' : undefined}>{RELIC_SUMMON_SINGLE_COST}</span>
                  </button>
                  <button type="button" className="shop-buy-button" onClick={() => doRelicSummon(10)}>
                    <AsterVowIcon name="shop-gem" size={16} /> 十連 <span className={isUnaffordable(RELIC_SUMMON_TEN_COST) ? 'shop-cost-unaffordable' : undefined}>{RELIC_SUMMON_TEN_COST}</span>
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {summonResult && (
        <div className="shop-detail-overlay" role="dialog" aria-modal="true" aria-labelledby="shop-summon-result-title">
          <button type="button" className="shop-detail-scrim" aria-label="關閉召喚結果" onClick={() => setSummonResult(null)} />
          <section className="shop-detail-panel">
            <button type="button" className="shop-detail-close" aria-label="關閉召喚結果" onClick={() => setSummonResult(null)}>
              <AsterVowIcon name="shop-close" size={16} />
            </button>
            <h3 id="shop-summon-result-title">召喚結果</h3>
            <div className="shop-summon-result-list">
              {summonResult.kind === 'equipment'
                ? summonResult.items.map((item, i) => (
                  <div key={item.id + i} className="shop-summon-result-row" style={{ borderColor: `${ARENA_RARITY_COLOR[item.rarity]}66` }}>
                    <AsterVowIcon name={getEquipmentSlotIcon(item.slot)} size={16} color={getEquipmentSlotIconColor(item.slot)} />
                    <span style={{ color: ARENA_RARITY_COLOR[item.rarity] }}>{item.name}</span>
                    <small>{ARENA_RARITY_LABEL[item.rarity]}</small>
                  </div>
                ))
                : summonResult.relics.map((relic, i) => (
                  <div key={relic.id + i} className="shop-summon-result-row">
                    <AsterVowIcon name="system-stardust" size={16} />
                    <span>{relic.name}</span>
                    <small>{summonResult.ownedIdsBefore.includes(relic.id) ? '重複（疊加生效）' : '新遺物'}</small>
                  </div>
                ))}
            </div>
            <button type="button" className="shop-buy-button" onClick={() => setSummonResult(null)}>關閉</button>
          </section>
        </div>
      )}
    </div>
  )
}
