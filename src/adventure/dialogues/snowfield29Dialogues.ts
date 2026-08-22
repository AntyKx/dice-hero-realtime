import type { DialogueDef } from '../adventureTypes'

/**
 * 2-9《永冬祭壇》主線劇情台詞，來源：官方 V5.1 設計配置包
 * `snowfield_2_9/story_triggers.json`。boss_frost_queen 交給
 * DialogueController.resolveSpeaker() 解析（enemies.ts 的 frost_queen 中文
 * 名「冰霜女王」）。room_08 t07 是 boss_clear（打完才播，見 stage 檔案的
 * requiresCombatCleared）。
 */
export const SNOWFIELD_29_DIALOGUES: DialogueDef[] = [
  {
    id: 'snowfield_2_9_t01',
    variants: [{ lines: [{ speaker: 'protagonist', text: '這裡的寒氣比外面強得太多。源頭就在附近。' }] }],
  },
  {
    id: 'snowfield_2_9_t02',
    variants: [{ lines: [{ speaker: 'protagonist', text: '霜狼身上的符文不是標記……是控制術式。' }] }],
  },
  {
    id: 'snowfield_2_9_t03',
    variants: [{ lines: [{ speaker: 'protagonist', text: '視野被暴風雪遮住了，別離開太遠。' }] }],
  },
  {
    id: 'snowfield_2_9_t04',
    variants: [{ lines: [{ speaker: 'boss_frost_queen', text: '你們走得比我預想得更遠。' }] }],
  },
  {
    id: 'snowfield_2_9_t05',
    variants: [{ lines: [{ speaker: 'protagonist', text: '永冬是妳造成的？' }] }],
  },
  {
    id: 'snowfield_2_9_t06',
    variants: [{ lines: [{ speaker: 'boss_frost_queen', text: '如果真是我，事情反而簡單得多。' }] }],
  },
  {
    id: 'snowfield_2_9_t07',
    variants: [{ lines: [{ speaker: 'boss_frost_queen', text: '我一直在阻止它醒來。' }] }],
  },
  {
    id: 'snowfield_2_9_t08',
    variants: [{ lines: [{ speaker: 'protagonist', text: '『它』是什麼？' }] }],
  },
  {
    id: 'snowfield_2_9_t09',
    variants: [{ lines: [{ speaker: 'boss_frost_queen', text: '……龍。' }] }],
  },
]
