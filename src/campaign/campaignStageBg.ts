import type { CampaignStage } from './campaignTypes'

/**
 * 森林遺跡固定關卡場景美術路徑，跟 ArenaGame.ts 戰鬥時使用的背景圖同一份
 * 素材（原本只在 ArenaGame.ts 內部定義，這裡抽出來共用，供大廳關卡預覽卡
 * 使用真實背景圖，不用另外造一份 CSS 佔位色塊）。目前每個主題只有 1 張。
 */
export const CAMPAIGN_STAGE_BG_PATH: Record<CampaignStage['bgTheme'], string> = {
  forest_entrance: '/assets/backgrounds/forest_ruins_2026_08/arena_ready_941x1672/forest_entrance_1.jpg',
  poison_forest: '/assets/backgrounds/forest_ruins_2026_08/arena_ready_941x1672/poison_forest_1.jpg',
  ancient_ruins: '/assets/backgrounds/forest_ruins_2026_08/arena_ready_941x1672/ancient_ruins_1.jpg',
  ancient_altar: '/assets/backgrounds/forest_ruins_2026_08/arena_ready_941x1672/ancient_altar_1.jpg',
  dragon_nest: '/assets/backgrounds/forest_ruins_2026_08/arena_ready_941x1672/dragon_nest_1.jpg',
  // 雪原/魔王城（2026-08-16）：這兩篇章的素材包只給了地圖總覽圖，沒有逐關
  // 戰鬥場景圖——但專案已經有 舊 Roguelite 系統（ash_kingdom/rift_omen 等）
  // 借用的 snowfield_{1,2,3}.jpg／castle_{1,2,3}.jpg 三張真正的 941×1672
  // 戰鬥背景（見 ArenaGame.ts 的 CAMPAIGN_BG_THEME），直接重用這 6 張，比
  // 從地圖總覽圖裁切放大的畫質好非常多，5 個主題各自對應畫面裡最貼近的
  // 一張，不足 5 張不同圖時允許重複。
  snow_foothills: '/assets/backgrounds/snowfield_2.jpg',
  frozen_keep: '/assets/backgrounds/snowfield_1.jpg',
  glacier_cavern: '/assets/backgrounds/snowfield_3.jpg',
  frost_shrine: '/assets/backgrounds/snowfield_1.jpg',
  ice_dragon_lair: '/assets/backgrounds/snowfield_3.jpg',
  demon_gate: '/assets/backgrounds/castle_1.jpg',
  crimson_hollow: '/assets/backgrounds/castle_3.jpg',
  shadow_keep: '/assets/backgrounds/castle_1.jpg',
  blood_altar: '/assets/backgrounds/castle_3.jpg',
  throne_of_ash: '/assets/backgrounds/castle_2.jpg',
  // 裂隙前兆／深海遺城（2026-08-16）：這兩個篇章沒有舊 Roguelite 系統可借
  // 的專屬戰鬥背景（CAMPAIGN_BG_THEME 只把它們借去用 snowfield 頂著），
  // 直接從各子章節自己的地圖總覽圖裁切一段代表性區域當背景，6 個子章節
  // 各自只有 1 張（不像森林/雪原/魔王城每篇 5 張），10 關共用同一張。
  rift_broken_sky: '/assets/backgrounds/rift_broken_sky.jpg',
  rift_void_chasm: '/assets/backgrounds/rift_void_chasm.jpg',
  rift_eclipse_core: '/assets/backgrounds/rift_eclipse_core.jpg',
  deep_coral_shallows: '/assets/backgrounds/deep_coral_shallows.jpg',
  deep_sunken_capital: '/assets/backgrounds/deep_sunken_capital.jpg',
  deep_emperor_abyss: '/assets/backgrounds/deep_emperor_abyss.jpg',
}

export function getCampaignStageBgPath(bgTheme: CampaignStage['bgTheme']): string {
  return CAMPAIGN_STAGE_BG_PATH[bgTheme]
}
