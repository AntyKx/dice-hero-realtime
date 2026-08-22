import type { DialogueDef } from '../adventureTypes'

/**
 * 2-2《失聯哨站》主線劇情台詞，來源：官方 V5.1 設計配置包
 * `snowfield_2_2/story_triggers.json`（id 對齊 t01~t06；一開始只有主線
 * 摘要文件時手推成 t01/t03/t04a/t05/t06/t07，拿到官方 JSON 後改過來，文字
 * 內容本來就一致，純粹編號同步）。全部是 protagonist（主角本人）獨白，
 * 不綁英雄（跟 snowfield21Dialogues.ts 同一套規則）。room_07 的
 * boss_enter 觸發跟 2-1 的 combat_start（t05）語意一致——StoryTriggerSystem
 * 沒有另外分 type，都是「進這個房間就播」。
 */
export const SNOWFIELD_22_DIALOGUES: DialogueDef[] = [
  {
    id: 'snowfield_2_2_t01',
    variants: [{ lines: [{ speaker: 'protagonist', text: '前面就是北境哨站……沒有燈，也沒有守衛。' }] }],
  },
  {
    id: 'snowfield_2_2_t02',
    variants: [{ lines: [{ speaker: 'protagonist', text: '門沒有被破壞。他們是自己離開的。' }] }],
  },
  {
    id: 'snowfield_2_2_t03',
    variants: [{ lines: [{ speaker: 'protagonist', text: '補給還在，撤離一定非常倉促。' }] }],
  },
  {
    id: 'snowfield_2_2_t04',
    variants: [{ lines: [{ speaker: 'protagonist', text: '上方的冰層不穩，小心掉落的冰柱。' }] }],
  },
  {
    id: 'snowfield_2_2_t05',
    variants: [{ lines: [{ speaker: 'protagonist', text: '這把武器是從內部開始結冰的。' }] }],
  },
  {
    id: 'snowfield_2_2_t06',
    variants: [{ lines: [{ speaker: 'protagonist', text: '有東西在守著出口。看來我們接近答案了。' }] }],
  },
]
