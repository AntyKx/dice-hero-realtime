import type { AsterVowIconName } from '../components/AsterVowIcon'

export interface ChapterCardMeta {
  label: string
  sub: string
  iconName: AsterVowIconName
  /** CampaignChapterSelectScreen 章節選擇卡用的封面——九章統一用各自的地圖
   * 總覽圖（*_map_full.jpg），森林遺跡也不例外（2026-08-17 改回來：先前
   * 誤把大廳專屬美術也套用在這裡，使用者要求兩處分開，這裡只認地圖截圖）。 */
  cover: string
  /** AdventureReadyScreen 大廳頂部預覽卡用的封面——森林遺跡沿用 2026-08-14
   * 就有的專屬大廳預覽美術（唯一一張真正為大廳畫的圖），其餘 8 篇沒有專屬
   * 大廳美術，跟 cover 共用同一張地圖總覽圖。 */
  lobbyCover: string
  color: string
}

/**
 * 九個固定式主線篇章的展示中繼資料（2026-08-17 從 CampaignChapterSelectScreen.tsx
 * 抽出來共用）——AdventureReadyScreen.tsx 的大廳預覽卡跟 CampaignChapterSelectScreen.tsx
 * 的章節選擇卡都需要同一份 label/icon/color，抽共用表避免兩處各自維護一份、
 * 改一邊忘了改另一邊。cover/lobbyCover 刻意分開兩個欄位，因為兩個畫面對
 * 森林遺跡要顯示不同的圖（見上面欄位註解），其餘 8 篇兩個欄位當前指向
 * 同一張圖，但保留分開的欄位是為了以後任一篇補了專屬大廳美術時只需要改
 * lobbyCover，不會牽動章節選擇卡。
 */
export const CAMPAIGN_CHAPTER_META: Record<string, ChapterCardMeta> = {
  forest_ruins: {
    label: '森林遺跡', sub: '第一章 · 荊棘與遠古樹靈',
    iconName: 'chapter-forest', cover: '/assets/campaign/forest_ruins_map_full.jpg',
    lobbyCover: '/assets/backgrounds/lobby_preview_2026_08/forest_ruins.jpg', color: '#7fbf6a',
  },
  snowfield_wastes: {
    label: '雪原', sub: '第二章 · 冰封哨站與霜狼',
    iconName: 'chapter-snow', cover: '/assets/campaign/snowfield_map_full.jpg', lobbyCover: '/assets/campaign/snowfield_map_full.jpg', color: '#7ec6e8',
  },
  demon_king_castle: {
    label: '魔王城', sub: '第三章 · 熔岩與深淵王座',
    iconName: 'chapter-castle', cover: '/assets/campaign/demon_castle_map_full.jpg', lobbyCover: '/assets/campaign/demon_castle_map_full.jpg', color: '#e2705a',
  },
  rift_omen_broken_sky: {
    label: '破碎天幕', sub: '第一章 · 星裂邊境與墜星之坑',
    iconName: 'chapter-rift', cover: '/assets/campaign/rift_omen_broken_sky_map_full.jpg', lobbyCover: '/assets/campaign/rift_omen_broken_sky_map_full.jpg', color: '#8a7fe0',
  },
  rift_omen_void_chasm: {
    label: '虛空裂谷', sub: '第二章 · 異空間與重力迷城',
    iconName: 'chapter-rift', cover: '/assets/campaign/rift_omen_void_chasm_map_full.jpg', lobbyCover: '/assets/campaign/rift_omen_void_chasm_map_full.jpg', color: '#8a7fe0',
  },
  rift_omen_eclipse_core: {
    label: '星蝕核心', sub: '第三章 · 黑日觀測站與裂界使徒',
    iconName: 'chapter-rift', cover: '/assets/campaign/rift_omen_eclipse_core_map_full.jpg', lobbyCover: '/assets/campaign/rift_omen_eclipse_core_map_full.jpg', color: '#8a7fe0',
  },
  deep_sea_coral_shallows: {
    label: '珊瑚淺灘', sub: '第一章 · 潮光礁盤與沉沒漁村',
    iconName: 'chapter-deep-sea', cover: '/assets/campaign/deep_sea_coral_shallows_map_full.jpg', lobbyCover: '/assets/campaign/deep_sea_coral_shallows_map_full.jpg', color: '#4fb3c9',
  },
  deep_sea_sunken_capital: {
    label: '沉沒王城', sub: '第二章 · 失落首都與王座長堤',
    iconName: 'chapter-deep-sea', cover: '/assets/campaign/deep_sea_sunken_capital_map_full.jpg', lobbyCover: '/assets/campaign/deep_sea_sunken_capital_map_full.jpg', color: '#4fb3c9',
  },
  deep_sea_emperor_abyss: {
    label: '海皇深淵', sub: '第三章 · 無光海溝與潮汐王座',
    iconName: 'chapter-deep-sea', cover: '/assets/campaign/deep_sea_emperor_abyss_map_full.jpg', lobbyCover: '/assets/campaign/deep_sea_emperor_abyss_map_full.jpg', color: '#4fb3c9',
  },
}
