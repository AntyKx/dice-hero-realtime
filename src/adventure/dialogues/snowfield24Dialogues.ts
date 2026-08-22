import type { DialogueDef } from '../adventureTypes'

/**
 * 2-4《冰窟低語》主線劇情台詞，來源：官方 V5.1 設計配置包
 * `snowfield_2_4/story_triggers.json`。room_07 三句是主角跟冰霜薩滿
 * （speaker: npc_ice_shaman）Boss 戰前的對話交鋒，DialogueController 的
 * resolveSpeaker() 會把 npc_ice_shaman 換成 enemies.ts 裡 ice_shaman 的
 * 中文名字「冰霜薩滿」顯示，不用在這裡手動存顯示名稱。
 */
export const SNOWFIELD_24_DIALOGUES: DialogueDef[] = [
  {
    id: 'snowfield_2_4_t01',
    variants: [{ lines: [{ speaker: 'protagonist', text: '這些冰柱排列得太整齊，不像天然形成。' }] }],
  },
  {
    id: 'snowfield_2_4_t02',
    variants: [{ lines: [{ speaker: 'protagonist', text: '別在寒氣裡停太久，身體會直接被凍住。' }] }],
  },
  {
    id: 'snowfield_2_4_t03',
    variants: [{ lines: [{ speaker: 'protagonist', text: '這些圖案比北境哨站還古老……雪原以前可能不是冰原。' }] }],
  },
  {
    id: 'snowfield_2_4_t04',
    variants: [{ lines: [{ speaker: 'npc_ice_shaman', text: '外來者……不要再往北走。' }] }],
  },
  {
    id: 'snowfield_2_4_t05',
    variants: [{ lines: [{ speaker: 'protagonist', text: '你知道永冬是怎麼發生的？' }] }],
  },
  {
    id: 'snowfield_2_4_t06',
    variants: [{ lines: [{ speaker: 'npc_ice_shaman', text: '永冬已經甦醒了。' }] }],
  },
  {
    id: 'snowfield_2_4_t07',
    variants: [{ lines: [{ speaker: 'protagonist', text: '他不像在製造寒氣……更像是在壓制它。' }] }],
  },
]
