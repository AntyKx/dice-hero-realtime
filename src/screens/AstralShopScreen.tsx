import { useState } from 'react'
import type { MetaState } from '../types'
import AsterVowIcon, { type AsterVowIconName } from '../components/AsterVowIcon'

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
 */

type ShopCategory = 'featured' | 'supplies' | 'relics' | 'cosmetics'
type ShopTone = 'gold' | 'blue' | 'ember' | 'violet'

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
}

const SHOP_CATEGORIES: { id: ShopCategory; label: string; kicker: string }[] = [
  { id: 'featured', label: '推薦', kicker: 'FEATURED' },
  { id: 'supplies', label: '遠征補給', kicker: 'SUPPLIES' },
  { id: 'relics', label: '星界遺物', kicker: 'RELICS' },
  { id: 'cosmetics', label: '外觀典藏', kicker: 'COSMETICS' },
]

const SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: 'stardust-cache', category: 'supplies', featured: true,
    eyebrow: 'EXPEDITION SUPPLY', name: '星塵補給匣',
    description: '為下一段遠征備妥可立即使用的星塵與航道燃料。',
    price: '320 星塵', icon: 'shop-gift', tone: 'gold',
  },
  {
    id: 'astral-chart', category: 'relics', featured: true,
    eyebrow: 'RELIC ARCHIVE', name: '古金星圖頁',
    description: '一頁仍在發光的古代航圖，記錄森林遺跡之外的路線。',
    price: '180 星塵', icon: 'shop-scroll', tone: 'blue',
  },
  {
    id: 'ember-crest', category: 'cosmetics', featured: true,
    eyebrow: 'HERO COSMETIC', name: '熾焰徽記',
    description: '為英雄徽章加上熔金邊線，讓火光在星門前留下記號。',
    price: '240 星塵', icon: 'shop-flame', tone: 'ember',
  },
  {
    id: 'wayfarer-seal', category: 'relics', featured: false,
    eyebrow: 'VOYAGER RELIC', name: '遠征者封印',
    description: '尚未鑑定的星界遺物，等待真正的持有者喚醒。',
    price: '460 星塵', icon: 'stage-defense', tone: 'violet',
  },
  {
    id: 'night-supply', category: 'supplies', featured: false,
    eyebrow: 'NIGHT ROUTE KIT', name: '夜航補給包',
    description: '為長時間 Arena 航程準備的實用補給展示組。',
    price: '120 星塵', icon: 'shop-zap', tone: 'blue',
  },
  {
    id: 'astral-cloak', category: 'cosmetics', featured: false,
    eyebrow: 'HERO COSMETIC', name: '星環披風',
    description: '以星環光澤描邊的外觀樣式，適合站上星界舞台。',
    price: '380 星塵', icon: 'stage-collection', tone: 'gold',
  },
]

interface Props {
  meta: MetaState
  onBack: () => void
}

export default function AstralShopScreen({ meta, onBack }: Props) {
  const [category, setCategory] = useState<ShopCategory>('featured')
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null)
  const [previewMsg, setPreviewMsg] = useState<string | null>(null)
  const products = category === 'featured'
    ? SHOP_PRODUCTS.filter(p => p.featured)
    : SHOP_PRODUCTS.filter(p => p.category === category)

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
        <AsterVowIcon name="stage-collection" size={14} />
        <span><b>原型展示</b>　商品庫存、支付與帳戶資料尚未接入，「查看詳情」內的按鈕只會預覽流程，不會真的購買或扣款。</span>
      </div>

      <div className="shop-tabs" role="tablist" aria-label="商城分類">
        {SHOP_CATEGORIES.map(c => (
          <button key={c.id} type="button" role="tab" aria-selected={category === c.id}
            className={category === c.id ? 'is-active' : ''} onClick={() => setCategory(c.id)}>
            <span>{c.kicker}</span>
            <b>{c.label}</b>
          </button>
        ))}
      </div>

      <div className="shop-grid">
        {products.map(product => (
          <button
            type="button"
            key={product.id}
            className={`shop-product-card shop-product-card--${product.tone}`}
            onClick={() => setSelectedProduct(product)}
            aria-label={`查看${product.name}詳情`}
          >
            <div className="shop-product-art">
              <span className="shop-product-art-orbit" aria-hidden="true" />
              <AsterVowIcon name={product.icon} size={29} />
              <span className="shop-product-badge">{product.featured ? '推薦' : '典藏'}</span>
            </div>
            <div className="shop-product-copy">
              <span className="shop-product-eyebrow">{product.eyebrow}</span>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
            </div>
            <div className="shop-product-footer">
              <span><small>展示價格</small><b>{product.price}</b></span>
              <span className="shop-product-open">查看詳情 ›</span>
            </div>
          </button>
        ))}
      </div>

      {selectedProduct && (
        <div className="shop-detail-overlay" role="dialog" aria-modal="true" aria-labelledby="shop-detail-title">
          <button type="button" className="shop-detail-scrim" aria-label="關閉商品詳情"
            onClick={() => { setSelectedProduct(null); setPreviewMsg(null) }} />
          <section className="shop-detail-panel">
            <button type="button" className="shop-detail-close" aria-label="關閉商品詳情"
              onClick={() => { setSelectedProduct(null); setPreviewMsg(null) }}>
              <AsterVowIcon name="shop-close" size={16} />
            </button>
            <div className={`shop-detail-emblem shop-detail-emblem--${selectedProduct.tone}`}>
              <AsterVowIcon name={selectedProduct.icon} size={38} />
            </div>
            <span className="shop-product-eyebrow">{selectedProduct.eyebrow}</span>
            <h3 id="shop-detail-title">{selectedProduct.name}</h3>
            <p>{selectedProduct.description}</p>
            <div className="shop-detail-price">
              <small>展示價格</small>
              <b>{selectedProduct.price}</b>
            </div>
            <button type="button" className="shop-buy-button"
              onClick={() => setPreviewMsg('商城原型：購買流程尚未連接，這裡只展示互動回饋。')}>
              <AsterVowIcon name="nav-shop" size={16} /> 預覽購買流程
            </button>
            {previewMsg && <p className="shop-preview-msg">{previewMsg}</p>}
          </section>
        </div>
      )}
    </div>
  )
}
