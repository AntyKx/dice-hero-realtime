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
}

export function getCampaignStageBgPath(bgTheme: CampaignStage['bgTheme']): string {
  return CAMPAIGN_STAGE_BG_PATH[bgTheme]
}
