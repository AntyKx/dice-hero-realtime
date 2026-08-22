import type { DialogueDef } from '../adventureTypes'

/**
 * 2-7《巨獸雪谷》主線劇情台詞，來源：官方 V5.1 設計配置包
 * `snowfield_2_7/story_triggers.json`。
 */
export const SNOWFIELD_27_DIALOGUES: DialogueDef[] = [
  {
    id: 'snowfield_2_7_t01',
    variants: [{ lines: [{ speaker: 'protagonist', text: '這些腳印……尺寸大得不像普通雪怪。' }] }],
  },
  {
    id: 'snowfield_2_7_t02',
    variants: [{ lines: [{ speaker: 'protagonist', text: '高路繞遠但穩，低路比較快卻全是落冰。' }] }],
  },
  {
    id: 'snowfield_2_7_t03',
    variants: [{ lines: [{ speaker: 'protagonist', text: '頭頂有裂紋，別停在警示區。' }] }],
  },
  {
    id: 'snowfield_2_7_t04',
    variants: [{ lines: [{ speaker: 'protagonist', text: '腳印越來越新，牠就在谷底。' }] }],
  },
  {
    id: 'snowfield_2_7_t05',
    variants: [{ lines: [{ speaker: 'protagonist', text: '找到腳印的主人了。' }] }],
  },
  {
    id: 'snowfield_2_7_t06',
    variants: [{ lines: [{ speaker: 'protagonist', text: '越靠近王城核心，魔力越不像單純的冰。' }] }],
  },
]
