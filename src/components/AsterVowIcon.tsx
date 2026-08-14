/**
 * ASTERVOW 圖示元件（2026-08）：B＋C 美術素材尚未進工作區（確認過
 * public/assets/icons/astervow-v2/ 不存在），這裡先用簡單幾何線條 SVG
 * 頂著，不用 emoji（大廳/關卡預覽明確要求不能用 emoji 當正式圖示）。
 * 之後真的美術素材進來時，只要把下面 ICONS 內部實作換成
 * <img src={`/assets/icons/astervow-v2/${state}/${name}.svg`}>，
 * 呼叫端的 <AsterVowIcon name="..." /> 完全不用改。
 */

export type AsterVowIconName =
  | 'stage-elimination' | 'stage-survival' | 'stage-defense' | 'stage-hunt'
  | 'stage-destroy' | 'stage-collection' | 'stage-escape' | 'stage-boss'
  | 'nav-lobby' | 'nav-dungeon' | 'nav-heroes' | 'nav-equipment' | 'nav-menu' | 'nav-compendium'
  | 'nav-campaign' | 'nav-shop'

interface Props {
  name: AsterVowIconName
  size?: number
  className?: string
}

const STROKE_PROPS = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const ICON_PATHS: Record<AsterVowIconName, JSX.Element> = {
  // 交叉劍：殲滅
  'stage-elimination': (
    <g {...STROKE_PROPS}>
      <path d="M4 4l16 16M20 4L4 20" />
      <path d="M4 4l3 0.5M20 4l-3 0.5M4 20l3-0.5M20 20l-3-0.5" />
    </g>
  ),
  // 沙漏：生存
  'stage-survival': (
    <g {...STROKE_PROPS}>
      <path d="M6 3h12M6 21h12M6 3c0 5 12 5 12 9s-12 4-12 9M18 3c0 5-12 5-12 9s12 4 12 9" />
    </g>
  ),
  // 盾：防守
  'stage-defense': (
    <g {...STROKE_PROPS}>
      <path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3z" />
    </g>
  ),
  // 準星：狩獵
  'stage-hunt': (
    <g {...STROKE_PROPS}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </g>
  ),
  // 爆裂：摧毀
  'stage-destroy': (
    <g {...STROKE_PROPS}>
      <path d="M12 2l2 6 6-2-4 5 5 4-6 1 1 6-4-4-4 4 1-6-6-1 5-4-4-5 6 2z" />
    </g>
  ),
  // 星火：收集
  'stage-collection': (
    <g {...STROKE_PROPS}>
      <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" />
    </g>
  ),
  // 門+箭頭：逃脫
  'stage-escape': (
    <g {...STROKE_PROPS}>
      <path d="M6 3h7v18H6" />
      <path d="M11 12h9M16 8l4 4-4 4" />
    </g>
  ),
  // 皇冠：Boss
  'stage-boss': (
    <g {...STROKE_PROPS}>
      <path d="M4 18h16M4 18l-1-9 5 4 4-7 4 7 5-4-1 9" />
    </g>
  ),
  // 羅盤：大廳
  'nav-lobby': (
    <g {...STROKE_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2.2 5.2-5.2 2.2 2.2-5.2z" strokeLinejoin="round" />
    </g>
  ),
  // 城塔：地城
  'nav-dungeon': (
    <g {...STROKE_PROPS}>
      <path d="M5 21V9l3-3V4h2v2h4V4h2v2l3 3v12z" />
      <path d="M5 9h14M10 21v-6h4v6" />
    </g>
  ),
  // 人群：英雄
  'nav-heroes': (
    <g {...STROKE_PROPS}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="16" cy="9.5" r="2.3" />
      <path d="M3.5 20c0-3.5 2.5-6 5.5-6s5.5 2.5 5.5 6M14.5 14.5c2.5 0 5 1.8 5 5.5" />
    </g>
  ),
  // 護甲：裝備
  'nav-equipment': (
    <g {...STROKE_PROPS}>
      <path d="M8 3l4 1.6L16 3l1 3-1.6 1v9.5c0 2-1.6 3-3.4 4.5-1.8-1.5-3.4-2.5-3.4-4.5V7L7 6z" />
    </g>
  ),
  // 漢堡選單線：選單
  'nav-menu': (
    <g {...STROKE_PROPS}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </g>
  ),
  // 攤開的書：星界圖鑑
  'nav-compendium': (
    <g {...STROKE_PROPS}>
      <path d="M12 6.5c-1.6-1.3-3.6-2-6-2v13c2.4 0 4.4.7 6 2 1.6-1.3 3.6-2 6-2v-13c-2.4 0-4.4.7-6 2z" />
      <path d="M12 6.5v13" />
    </g>
  ),
  // 旗幟＋路徑：主線冒險
  'nav-campaign': (
    <g {...STROKE_PROPS}>
      <path d="M6 21V4" />
      <path d="M6 4l11 3.2-4 3.4 4 3.4-11 3.2" strokeLinejoin="round" />
    </g>
  ),
  // 商店招牌：商店
  'nav-shop': (
    <g {...STROKE_PROPS}>
      <path d="M4 9l1.4-4.5h13.2L20 9" />
      <path d="M4 9v10h16V9M4 9c0 1.7 1.3 3 3 3s3-1.3 3-3 1.3 3 3 3 3-1.3 3-3 1.3 3 3 3 3-1.3 3-3" />
      <path d="M9.5 19v-5h5v5" />
    </g>
  ),
}

export default function AsterVowIcon({ name, size = 20, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {ICON_PATHS[name]}
    </svg>
  )
}
