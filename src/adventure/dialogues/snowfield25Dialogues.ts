import type { DialogueDef } from '../adventureTypes'

/**
 * 2-5《霜甲關門》主線劇情台詞，來源：官方 V5.1 設計配置包
 * `snowfield_2_5/story_triggers.json`。room_06 三句是主角跟霜甲騎士長
 * （speaker: boss_frost_knight_captain）中王戰前的對話交鋒，
 * DialogueController.resolveSpeaker() 會換成 enemies.ts 裡
 * frost_knight_captain 的中文名字「霜甲騎士長」顯示。
 */
export const SNOWFIELD_25_DIALOGUES: DialogueDef[] = [
  {
    id: 'snowfield_2_5_t01',
    variants: [{ lines: [{ speaker: 'protagonist', text: '整座北境舊城……都被凍住了。' }] }],
  },
  {
    id: 'snowfield_2_5_t02',
    variants: [{ lines: [{ speaker: 'protagonist', text: '武器全都還在。災難來得比戰爭更快。' }] }],
  },
  {
    id: 'snowfield_2_5_t03',
    variants: [{ lines: [{ speaker: 'protagonist', text: '前面的寒氣像是在主動阻止我們靠近。' }] }],
  },
  {
    id: 'snowfield_2_5_t04',
    variants: [{ lines: [{ speaker: 'boss_frost_knight_captain', text: '……不得進入。' }] }],
  },
  {
    id: 'snowfield_2_5_t05',
    variants: [{ lines: [{ speaker: 'protagonist', text: '我們不是敵人。讓開。' }] }],
  },
  {
    id: 'snowfield_2_5_t06',
    variants: [{ lines: [{ speaker: 'boss_frost_knight_captain', text: '王命……封鎖……永冬……' }] }],
  },
  {
    id: 'snowfield_2_5_t07',
    variants: [{ lines: [{ speaker: 'protagonist', text: '他不是在阻止外面的人進去……是阻止裡面的東西出來。' }] }],
  },
]
