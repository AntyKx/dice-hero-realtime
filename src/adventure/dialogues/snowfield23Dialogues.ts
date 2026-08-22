import type { DialogueDef } from '../adventureTypes'

/**
 * 2-3《白樺獵場》主線劇情台詞，來源：官方 V5.1 設計配置包
 * `snowfield_2_3/story_triggers.json`。
 */
export const SNOWFIELD_23_DIALOGUES: DialogueDef[] = [
  {
    id: 'snowfield_2_3_t01',
    variants: [{ lines: [{ speaker: 'protagonist', text: '狼群的足跡往白樺林深處去了。' }] }],
  },
  {
    id: 'snowfield_2_3_t02',
    variants: [{ lines: [{ speaker: 'protagonist', text: '高地繞遠但安全，低谷更快卻風雪更強。' }] }],
  },
  {
    id: 'snowfield_2_3_t03',
    variants: [{ lines: [{ speaker: 'protagonist', text: '風向變了！別正面頂著走。' }] }],
  },
  {
    id: 'snowfield_2_3_t04',
    variants: [{ lines: [{ speaker: 'protagonist', text: '所有腳印都在這裡被打亂了。' }] }],
  },
  {
    id: 'snowfield_2_3_t05',
    variants: [{ lines: [{ speaker: 'protagonist', text: '找到把狼群趕散的傢伙了。' }] }],
  },
  {
    id: 'snowfield_2_3_t06',
    variants: [{ lines: [{ speaker: 'protagonist', text: '冰晶上的符號不是傷痕……像是某種控制印記。' }] }],
  },
]
