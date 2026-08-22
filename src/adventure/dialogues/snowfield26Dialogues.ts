import type { DialogueDef } from '../adventureTypes'

/**
 * 2-6《碎冰之湖》主線劇情台詞，來源：官方 V5.1 設計配置包
 * `snowfield_2_6/story_triggers.json`。
 */
export const SNOWFIELD_26_DIALOGUES: DialogueDef[] = [
  {
    id: 'snowfield_2_6_t01',
    variants: [{ lines: [{ speaker: 'protagonist', text: '整片湖都結冰了……但下面還有東西在動。' }] }],
  },
  {
    id: 'snowfield_2_6_t02',
    variants: [{ lines: [{ speaker: 'protagonist', text: '冰層在裂！別停在同一塊冰面。' }] }],
  },
  {
    id: 'snowfield_2_6_t03',
    variants: [{ lines: [{ speaker: 'protagonist', text: '湖底有建築。這裡以前可能是一座城市。' }] }],
  },
  {
    id: 'snowfield_2_6_t04',
    variants: [{ lines: [{ speaker: 'protagonist', text: '冰下的門正對著王城深處。' }] }],
  },
  {
    id: 'snowfield_2_6_t05',
    variants: [{ lines: [{ speaker: 'protagonist', text: '牠一直守著湖中心。那下面一定有我們要找的東西。' }] }],
  },
  {
    id: 'snowfield_2_6_t06',
    variants: [{ lines: [{ speaker: 'protagonist', text: '這些遺跡比王城本身還古老。' }] }],
  },
]
