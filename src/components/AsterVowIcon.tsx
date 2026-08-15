/**
 * ASTERVOW 統一圖示系統。
 *
 * 所有圖示都是 24×24、currentColor 的雙層 SVG：小尺寸仍清楚，大尺寸章節徽記
 * 會多一層低透明度的星界菱框。呼叫端只需要控制 color / size，不再依賴作業系統
 * 的 emoji 字型與外觀。日後若改用美術輸出的 SVG，也只需替換這個元件內部。
 *
 * shop-* 系列（2026-08-14）是星界商城 AstralShopScreen.tsx 專用的商品圖示，
 * 不在 2026-08-14 icon 移植包內，這裡額外補上避免商城畫面的圖示壞掉。
 */

export type AsterVowIconName =
  | 'stage-elimination' | 'stage-survival' | 'stage-defense' | 'stage-hunt'
  | 'stage-destroy' | 'stage-collection' | 'stage-escape' | 'stage-boss'
  | 'nav-lobby' | 'nav-dungeon' | 'nav-heroes' | 'nav-equipment' | 'nav-menu' | 'nav-compendium'
  | 'nav-campaign' | 'nav-shop'
  | 'chapter-forest' | 'chapter-rift' | 'chapter-deep-sea'
  | 'dungeon-burning-throne' | 'dungeon-ash-covenant' | 'dungeon-star-eclipse' | 'dungeon-black-tide'
  | 'role-slash' | 'role-fire' | 'role-holy' | 'role-shadow' | 'role-ice' | 'role-arrow'
  | 'role-hammer' | 'role-song' | 'role-beast' | 'role-gear' | 'role-fighter' | 'role-death'
  | 'equip-weapon' | 'equip-head' | 'equip-body' | 'equip-hands' | 'equip-boots' | 'equip-ring'
  | 'equip-accessory' | 'equip-set'
  | 'action-equip' | 'action-unequip' | 'action-salvage' | 'action-forge'
  | 'action-reroll' | 'action-upgrade' | 'action-enhance'
  | 'system-player' | 'system-gold' | 'system-stardust' | 'system-lock' | 'system-unlock' | 'system-leaderboard'
  | 'system-gift' | 'system-cloud' | 'system-settings' | 'system-warning'
  | 'system-clock' | 'system-talent'
  | 'shop-gift' | 'shop-scroll' | 'shop-flame' | 'shop-zap' | 'shop-coin' | 'shop-gem' | 'shop-close'

interface Props {
  name: AsterVowIconName
  size?: number
  className?: string
  /** 覆蓋 currentColor，例如裝備部位圖示依部位上色（見 equipmentIconMeta.ts）。 */
  color?: string
}

const STROKE_PROPS = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.65,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const EMBLEM_NAMES = new Set<AsterVowIconName>([
  'chapter-forest', 'chapter-rift', 'chapter-deep-sea',
  'dungeon-burning-throne', 'dungeon-ash-covenant', 'dungeon-star-eclipse', 'dungeon-black-tide',
])

/**
 * 各圖示的預設配色，取自第一批圖示匯入包的官方預覽圖（ASTERVOW_圖示預覽.png，
 * 2026-08）。呼叫端沒有另外傳 color 時套用這裡的值；有傳 color 就以呼叫端為準
 * （例如裝備部位圖示走 equipmentIconMeta.ts 自己的配色表）。nav-*／role-* 不在
 * 這裡設定：nav-* 目前靠 CSS class（active/inactive）決定顏色，硬套 inline
 * style 會蓋掉那個狀態色；role-* 已經在 iconMeta.ts 的 ROLE_ICON_META 用相同
 * 色碼由呼叫端包一層 currentColor 容器套用，不用重複設定；chapter-*／dungeon-*
 * 也不在這裡設定——大廳章節卡/地城卡本來就各自有自己的主題色
 * （LOBBY_CHAPTERS[].color／DUNGEON_DEFS[].color），靠外層 wrapper 的
 * `color:` style 動態染色（同一個 icon name 依目前選中的章節/地城換色），
 * 這裡若硬套固定色會蓋掉那個既有機制，讓圖示變成跟主題色不同步的死色。
 *
 * 同理排除 stage-boss／system-stardust／system-gift／system-cloud／
 * system-settings：這幾個名字被多處既有 UI 重複借用，而且各自已經有
 * 明確、彼此不一致的既定配色（例如 stage-boss 在 Arena 擊敗 Boss 橫幅
 * 是亮金 #ffd94a、在關卡資訊列又是橙色 #ffb090；system-stardust 全遊戲
 * 幾乎都跟金幣共用同一組金色文字；system-gift/cloud/settings 在抽屜選單
 * 靠 `.av-drawer-item > svg { color: var(--av-gold) }` 統一套金色）。硬套
 * 預覽圖給的單一顏色會蓋掉這些既有樣式，造成規模不小的視覺回歸，所以
 * 這幾個先不給預設色，維持原本靠外層 context 決定顏色的行為。
 */
const ICON_DEFAULT_COLOR: Partial<Record<AsterVowIconName, string>> = {
  'stage-elimination': '#f2c56e',
  'stage-survival': '#8fd5ff',
  'stage-defense': '#79b2ff',
  'stage-hunt': '#77db9a',
  'stage-destroy': '#ff8468',
  'stage-collection': '#e4c3fe',
  'stage-escape': '#73d7d0',
  'system-player': '#b9cce8',
  'system-gold': '#ffd36e',
  'system-lock': '#ff9a68',
  'system-leaderboard': '#f2c56e',
  'system-warning': '#ff8b68',
  'system-clock': '#80d1cf',
  'system-talent': '#d3abff',
}

const ICON_PATHS: Record<AsterVowIconName, JSX.Element> = {
  'stage-elimination': <g {...STROKE_PROPS}><path d="M5 3l6.5 6.5M19 3l-6.5 6.5M9.5 11.5L4 17l3 3 5.5-5.5M14.5 11.5L20 17l-3 3-5.5-5.5"/><path d="M4 17l-1 3 3-1M20 17l1 3-3-1"/></g>,
  'stage-survival': <g {...STROKE_PROPS}><path d="M6 3h12M6 21h12M7 3c0 4.8 3.3 5.2 5 7 1.7-1.8 5-2.2 5-7M7 21c0-4.8 3.3-5.2 5-7 1.7 1.8 5 2.2 5 7"/><path d="M9 18h6"/></g>,
  'stage-defense': <g {...STROKE_PROPS}><path d="M12 2.5l7 3.2v5.8c0 4.8-2.9 7.8-7 10-4.1-2.2-7-5.2-7-10V5.7z"/><path d="M8.5 11.8l2.2 2.2 4.8-5"/></g>,
  'stage-hunt': <g {...STROKE_PROPS}><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.4"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/></g>,
  'stage-destroy': <g {...STROKE_PROPS}><path d="M12 2l1.8 6 5.7-2.3-3.4 5.2 5.8 2.1-6.1 1.1.7 6.1-4.5-4.3-4.5 4.3.7-6.1L2.1 13l5.8-2.1-3.4-5.2L10.2 8z"/><path d="M10 10l4 4M14 10l-4 4"/></g>,
  'stage-collection': <g {...STROKE_PROPS}><path d="M12 2.5l1.8 6 5.7 1.8-5.7 1.8-1.8 6-1.8-6-5.7-1.8 5.7-1.8z"/><path d="M18.5 15l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z"/></g>,
  'stage-escape': <g {...STROKE_PROPS}><path d="M5 3h9v18H5M10 12h11M17 8l4 4-4 4"/><circle cx="10.5" cy="12" r=".6" fill="currentColor" stroke="none"/></g>,
  'stage-boss': <g {...STROKE_PROPS}><path d="M3 7l5 4 4-7 4 7 5-4-1.5 11h-15z"/><path d="M5 18h14M8 14h8"/><circle cx="12" cy="10.5" r="1"/></g>,

  'nav-lobby': <g {...STROKE_PROPS}><circle cx="12" cy="12" r="9"/><path d="M15.8 8.2l-2.3 5.3-5.3 2.3 2.3-5.3z"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></g>,
  'nav-dungeon': <g {...STROKE_PROPS}><path d="M4 21V8l3-2V3h3v3h4V3h3v3l3 2v13z"/><path d="M4 9h16M9 21v-6h6v6M8 12h.1M16 12h.1"/></g>,
  'nav-heroes': <g {...STROKE_PROPS}><circle cx="9" cy="8" r="3"/><circle cx="16.5" cy="9.2" r="2.3"/><path d="M3 20c0-3.8 2.7-6.5 6-6.5s6 2.7 6 6.5M14.2 14.3c3.2-.4 6.3 1.8 6.3 5.7"/></g>,
  'nav-equipment': <g {...STROKE_PROPS}><path d="M8 3l4 1.8L16 3l2 3-2.5 2v8.3c0 2-1.6 3.3-3.5 4.7-1.9-1.4-3.5-2.7-3.5-4.7V8L6 6z"/><path d="M8.5 9h7M12 5v15"/></g>,
  'nav-menu': <g {...STROKE_PROPS}><path d="M7 6h14M7 12h14M7 18h14"/><path d="M3 6h.1M3 12h.1M3 18h.1" strokeWidth="2.4"/></g>,
  'nav-compendium': <g {...STROKE_PROPS}><path d="M12 6.5C10.2 5 8 4.3 5 4.3v13.4c3 0 5.2.8 7 2.3 1.8-1.5 4-2.3 7-2.3V4.3c-3 0-5.2.7-7 2.2z"/><path d="M12 6.5V20M8 8h1.5M14.5 8H16"/></g>,
  'nav-campaign': <g {...STROKE_PROPS}><path d="M5 21V3M5 4l13 3.3-4.5 3.4L18 14 5 17.2"/><path d="M8 20h8"/></g>,
  'nav-shop': <g {...STROKE_PROPS}><path d="M3.5 9l1.8-5h13.4l1.8 5M4 9v11h16V9M4 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3"/><path d="M9 20v-5h6v5"/></g>,

  'chapter-forest': <g {...STROKE_PROPS}><path d="M12 3v18M12 6C9 4.5 6.5 5.2 5 7.5c3 .2 5.2 1.2 7 3M12 9c3-2.4 5.7-2.2 7.5-.2-3 .7-5.3 2-7.5 4.2M12 13c-2.7-1.5-5.2-1-7 1.3 2.8.1 5.1 1 7 3"/><path d="M8.5 21h7"/></g>,
  'chapter-rift': <g {...STROKE_PROPS}><path d="M13 2.5l-3 6 3 2-4 4 3 2.5-2 4.5"/><path d="M6 5l2 1M17 5l-2 2M17.5 12l3 .5M5.5 18l2-1"/><circle cx="17.5" cy="18" r="1.2"/></g>,
  'chapter-deep-sea': <g {...STROKE_PROPS}><path d="M3 10c2.2-2 4.2-2 6.4 0s4.2 2 6.4 0 4.2-2 5.2-.8M3 15c2.2-2 4.2-2 6.4 0s4.2 2 6.4 0 4.2-2 5.2-.8M8 6c1.2-1.8 2.5-3 4-3s2.8 1.2 4 3"/><path d="M12 4v17"/></g>,
  'dungeon-burning-throne': <g {...STROKE_PROPS}><path d="M12 2.5c1 4-2 5.3-.3 8.2 1.5-1.4 2.3-2.8 2.4-4.2 3.3 2.5 4.9 5.3 4.1 8.7-.8 3.4-3.1 5.8-6.2 6.3-3.1-.5-5.4-2.9-6.2-6.3C5 11.8 7 8.6 9.6 6.8c-.3 2.2.4 3.7 1.1 4.6"/><path d="M9.3 19c-1.1-2.6.7-4.5 2.7-6.4 2 1.9 3.8 3.8 2.7 6.4"/></g>,
  'dungeon-ash-covenant': <g {...STROKE_PROPS}><path d="M12 2.5l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"/><path d="M8.5 21h7M12 15.2V21"/></g>,
  'dungeon-star-eclipse': <g {...STROKE_PROPS}><path d="M16.8 4.2A8.5 8.5 0 1110 20.3 7.4 7.4 0 0016.8 4.2z"/><path d="M17.5 11l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/></g>,
  'dungeon-black-tide': <g {...STROKE_PROPS}><path d="M3 15c2-3.7 4.5-4.2 7.4-1.4 3.2 3.1 6 2.8 10.6-1.8-.8 5.8-4.2 9.2-9.3 9.2C7 21 4.2 19 3 15z"/><path d="M5 9c2-2 4-2 6 0s4 2 6 0 3-2 4-1.2"/></g>,

  'role-slash': <g {...STROKE_PROPS}><path d="M5 3l14 14-2 4L3 7zM19 3L9 13M13 9l4 4"/><path d="M3 21l5-5"/></g>,
  'role-fire': <g {...STROKE_PROPS}><path d="M12.5 2.5c1.2 4.2-2.7 5.7-.5 9 1.8-1.7 2.6-3.5 2.3-5.4 3.5 2.9 5.3 6.4 3.8 10.1-1 2.6-3.1 4.4-6.1 5.3-3-.9-5.1-2.7-6.1-5.3-1.2-3.1.2-6.3 3.2-8.7-.4 2 .2 3.6 1.3 4.8"/></g>,
  'role-holy': <g {...STROKE_PROPS}><path d="M12 2v20M5 8h14"/><path d="M7 4l-2 2M17 4l2 2M7 20l-2-2M17 20l2-2"/><circle cx="12" cy="12" r="8.5" opacity=".45"/></g>,
  'role-shadow': <g {...STROKE_PROPS}><path d="M17.5 3.5L9 12l3 3 8.5-8.5zM8 13l3 3-5.5 5.5-3-3z"/><path d="M13 6l5 5M5 16l3 3"/></g>,
  'role-ice': <g {...STROKE_PROPS}><path d="M12 2v20M3.3 7l17.4 10M3.3 17l17.4-10M12 2l-2 2M12 2l2 2M12 22l-2-2M12 22l2-2M3.3 7l2.7-.7M3.3 7l.7 2.7M20.7 17l-2.7.7M20.7 17l-.7-2.7"/></g>,
  'role-arrow': <g {...STROKE_PROPS}><path d="M5 20C1.5 13 4 5.5 11 3c2.5 7-1 14-6 17zM6 18L19 5"/><path d="M15 5h4v4M10 12l2 2"/></g>,
  'role-hammer': <g {...STROKE_PROPS}><path d="M4 5l5-3 5 5-3 5zM10 11l9 9M15 18l3-3M5 16l3 3M3 20h8"/></g>,
  'role-song': <g {...STROKE_PROPS}><path d="M10 18V5l9-2v13M10 8l9-2"/><ellipse cx="7" cy="18" rx="3" ry="2"/><ellipse cx="16" cy="16" rx="3" ry="2"/></g>,
  'role-beast': <g {...STROKE_PROPS}><path d="M8.5 20c-3.5 0-4.5-3.4-2.3-5.4C8 13 9 11.2 12 11.2s4 1.8 5.8 3.4c2.2 2 .9 5.4-2.3 5.4-1.4 0-2.2-.8-3.5-.8s-2.1.8-3.5.8z"/><circle cx="6" cy="8" r="2"/><circle cx="11" cy="5" r="2"/><circle cx="18" cy="8" r="2"/></g>,
  'role-gear': <g {...STROKE_PROPS}><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5l1.2 2.4 2.6.7 2.2-1.4 1.8 1.8-1.4 2.2.7 2.6 2.4 1.2-2.4 1.2-.7 2.6 1.4 2.2-1.8 1.8-2.2-1.4-2.6.7L12 21.5l-1.2-2.4-2.6-.7L6 19.8 4.2 18l1.4-2.2-.7-2.6L2.5 12l2.4-1.2.7-2.6L4.2 6 6 4.2l2.2 1.4 2.6-.7z"/></g>,
  'role-fighter': <g {...STROKE_PROPS}><path d="M7.5 11V6.5a1.5 1.5 0 013 0V4.8a1.5 1.5 0 013 0v1.1a1.5 1.5 0 013 0v2a1.5 1.5 0 013 0v5.6c0 4.7-3 7.5-7.5 7.5S5 18.2 5 14.5V11a1.25 1.25 0 012.5 0z"/><path d="M7.5 11v3M10.5 6v5M13.5 6v5M16.5 8v4"/></g>,
  'role-death': <g {...STROKE_PROPS}><path d="M5 11a7 7 0 1114 0c0 3-1.4 4.6-3.5 6V21h-7v-4C6.4 15.6 5 14 5 11z"/><circle cx="9" cy="11.5" r="1.4"/><circle cx="15" cy="11.5" r="1.4"/><path d="M12 14l-1 2h2zM9 21v-3M12 21v-3M15 21v-3"/></g>,

  'equip-weapon': <g {...STROKE_PROPS}><path d="M18.5 2.5l3 3L10 17l-4 1 1-4z"/><path d="M14.5 6.5l3 3M5 16l3 3M3 21l3-3"/></g>,
  'equip-head': <g {...STROKE_PROPS}><path d="M5 20V10a7 7 0 0114 0v10h-5v-6H9v6z"/><path d="M5 11h14M12 3v5M9 14h6"/></g>,
  'equip-body': <g {...STROKE_PROPS}><path d="M8 3l4 2 4-2 4 4-3 3v10H7V10L4 7z"/><path d="M8 3l1 5h6l1-5M12 8v12M7 14h10"/></g>,
  'equip-hands': <g {...STROKE_PROPS}><path d="M6 12V6.5a1.5 1.5 0 013 0V5a1.5 1.5 0 013 0v1a1.5 1.5 0 013 0v1.5a1.5 1.5 0 013 0V14c0 4-2.5 7-6 7s-6-2.7-6-6v-3a1.5 1.5 0 013 0z"/><path d="M9 7v5M12 6v6M15 8v4M6 12v3"/></g>,
  'equip-boots': <g {...STROKE_PROPS}><path d="M8 3h7v10l5 3v4H4v-5l4-2z"/><path d="M8 7h7M5 16h6M15 13l-3 3"/></g>,
  'equip-ring': <g {...STROKE_PROPS}><path d="M8 7l2-4h4l2 4-4 4z"/><circle cx="12" cy="14" r="7"/><path d="M7 8h10"/></g>,
  'equip-accessory': <g {...STROKE_PROPS}><path d="M6 3c0 4 2.5 6 6 6s6-2 6-6"/><path d="M12 9l4 4-4 7-4-7z"/><circle cx="12" cy="13" r="1.3"/></g>,
  'equip-set': <g {...STROKE_PROPS}><path d="M8 3l4 1.8L16 3l2 3-2.5 2v8.5L12 21l-3.5-4.5V8L6 6z"/><path d="M12 8l1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4z"/></g>,
  'action-equip': <g {...STROKE_PROPS}><path d="M7 3l3 1.5L13 3l1.5 2.5-2 1.5v8l-2.5 3-2.5-3V7l-2-1.5z"/><path d="M13 17l2.5 2.5L21 14"/></g>,
  'action-unequip': <g {...STROKE_PROPS}><path d="M6 3l3 1.5L12 3l1.5 2.5-2 1.5v10L9 20l-2.5-3V7l-2-1.5z"/><path d="M13 12h8M18 9l3 3-3 3"/></g>,
  'action-salvage': <g {...STROKE_PROPS}><path d="M5 7h11M8 7V4h5v3M7 7l1 13h6l1-13"/><path d="M18 10l.8 2.2 2.2.8-2.2.8L18 16l-.8-2.2L15 13l2.2-.8z"/></g>,
  'action-forge': <g {...STROKE_PROPS}><path d="M3 19h13M5 15h9l2-3H3zM14 3l7 7-3 3-7-7z"/><path d="M13 8l-5 5"/></g>,
  'action-reroll': <g {...STROKE_PROPS}><path d="M5 8a8 8 0 0113-2l2 2M20 4v4h-4M19 16a8 8 0 01-13 2l-2-2M4 20v-4h4"/><path d="M12 8l3 4-3 4-3-4z"/></g>,
  'action-upgrade': <g {...STROKE_PROPS}><path d="M12 21V7M7 12l5-5 5 5"/><path d="M12 2l1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4z"/></g>,
  'action-enhance': <g {...STROKE_PROPS}><path d="M4 5l5-3 5 5-3 5zM10 11l7 7M14 21l6-6"/><path d="M18 2l.8 2.2L21 5l-2.2.8L18 8l-.8-2.2L15 5l2.2-.8z"/></g>,

  'system-player': <g {...STROKE_PROPS}><circle cx="12" cy="7.5" r="4"/><path d="M4 21c0-5 3.5-8 8-8s8 3 8 8"/><path d="M8 18l4 3 4-3"/></g>,
  'system-gold': <g {...STROKE_PROPS}><circle cx="12" cy="12" r="9"/><path d="M14.8 8.5c-.8-.7-1.7-1-2.8-1-1.7 0-3 .8-3 2s1.1 1.8 3 2.3c1.9.5 3 1 3 2.5s-1.3 2.2-3 2.2c-1.2 0-2.4-.4-3.2-1.2M12 5.5v13"/></g>,
  'system-stardust': <g {...STROKE_PROPS}><path d="M12 2.5l2.1 6.1 6.4 1.9-6.4 2.1-2.1 6.2-2.1-6.2-6.4-2.1 6.4-1.9z"/><path d="M18.5 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/></g>,
  'system-lock': <g {...STROKE_PROPS}><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3M12 14v3"/></g>,
  'system-unlock': <g {...STROKE_PROPS}><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M9 10V7a4 4 0 017.5-2M12 14v3"/></g>,
  'system-leaderboard': <g {...STROKE_PROPS}><path d="M3 6l5 4 4-7 4 7 5-4-1.5 10h-15zM5 20h14M6 16h12"/></g>,
  'system-gift': <g {...STROKE_PROPS}><path d="M3 9h18v4H3zM5 13h14v8H5zM12 9v12"/><path d="M12 9H8.5C5 9 5 4 8 4c2 0 3 2.5 4 5zm0 0h3.5C19 9 19 4 16 4c-2 0-3 2.5-4 5z"/></g>,
  'system-cloud': <g {...STROKE_PROPS}><path d="M6.5 19a4.5 4.5 0 01-.4-9A6 6 0 0117.7 9a5 5 0 01.3 10z"/><path d="M12 10v7M9.5 12.5L12 10l2.5 2.5"/></g>,
  'system-settings': <g {...STROKE_PROPS}><circle cx="12" cy="12" r="3"/><path d="M12 2.5l1.3 2.3 2.6.7 2.3-1.3 1.6 1.6-1.3 2.3.7 2.6 2.3 1.3-2.3 1.3-.7 2.6 1.3 2.3-1.6 1.6-2.3-1.3-2.6.7-1.3 2.3-1.3-2.3-2.6-.7-2.3 1.3-1.6-1.6 1.3-2.3-.7-2.6L2.5 12l2.3-1.3.7-2.6-1.3-2.3 1.6-1.6 2.3 1.3 2.6-.7z"/></g>,
  'system-warning': <g {...STROKE_PROPS}><path d="M12 3l10 18H2z"/><path d="M12 9v5M12 17.5h.1" strokeWidth="2"/></g>,
  'system-clock': <g {...STROKE_PROPS}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></g>,
  'system-talent': <g {...STROKE_PROPS}><path d="M12 2l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"/><circle cx="12" cy="12" r="2"/></g>,

  // 禮物盒：補給類商品
  'shop-gift': <g {...STROKE_PROPS}><path d="M4 9h16v11H4z"/><path d="M4 9l1-3h14l1 3M12 6V20M12 6c-1-2.5-3-3.5-4.5-3S6 5 8 6h4zM12 6c1-2.5 3-3.5 4.5-3S18 5 16 6h-4z"/></g>,
  // 卷軸：遺物/星圖類商品
  'shop-scroll': <g {...STROKE_PROPS}><path d="M6 4a2 2 0 0 0 0 4h12M6 4a2 2 0 0 1 2 2v13a2 2 0 0 1-4 0M6 4v15"/><path d="M18 8v11a2 2 0 0 1-2 2H6"/><path d="M9 10h6M9 13h6"/></g>,
  // 火焰：外觀/徽記類商品
  'shop-flame': <g {...STROKE_PROPS}><path d="M12 2c1 3-3 4-3 7.5a3 3 0 0 0 6 0c1 1.2 1.5 2.6 1.5 4a4.5 4.5 0 0 1-9 0C7.5 9 9.5 6 12 2z"/></g>,
  // 閃電：補給/加速類商品
  'shop-zap': <g {...STROKE_PROPS}><path d="M13 2 5 14h6l-1 8 8-12h-6z" strokeLinejoin="round"/></g>,
  // 星幣：金幣類貨幣
  'shop-coin': <g {...STROKE_PROPS}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M9.3 9.5c0-1.2 1.2-2 2.7-2s2.7.8 2.7 2c0 2.7-5.4 1.3-5.4 4 0 1.2 1.2 2 2.7 2s2.7-.8 2.7-2"/></g>,
  // 星晶：星塵類貨幣
  'shop-gem': <g {...STROKE_PROPS}><path d="M7 3h10l4 6-11 12L2 9z" strokeLinejoin="round"/><path d="M2 9h20M9 3l-2 6 5 12 5-12-2-6"/></g>,
  // 叉：關閉
  'shop-close': <g {...STROKE_PROPS}><path d="M5 5l14 14M19 5L5 19"/></g>,
}

export default function AsterVowIcon({ name, size = 20, className, color }: Props) {
  const isEmblem = EMBLEM_NAMES.has(name)
  const resolvedColor = color ?? ICON_DEFAULT_COLOR[name]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={resolvedColor ? { color: resolvedColor } : undefined}
      aria-hidden="true"
      focusable="false"
    >
      {isEmblem && (
        <g aria-hidden="true">
          <path d="M12 1.2L22.8 12 12 22.8 1.2 12z" fill="currentColor" opacity=".07" />
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth=".55" opacity=".28" />
        </g>
      )}
      {ICON_PATHS[name]}
    </svg>
  )
}
