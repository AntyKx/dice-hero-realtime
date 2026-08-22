import type { DialogueDef } from '../adventureTypes'

/**
 * 2-1《雪線之外》主線劇情台詞，來源：交付包 story_triggers.json。全部是
 * protagonist（主角本人）的獨白，不綁 classId／英雄名字（IMPLEMENT_THIS_STAGE.md
 * 規則 7），跟 StoryTriggerSystem.ts 的 StoryTriggerDef（id 相同）配對播放。
 * room_01 的 t01/t02 是同一次進房間連續兩句，合併成一個 DialogueDef 兩行，
 * 不拆兩個各自的 trigger——避免同一幀兩個 room_enter trigger 互搶播放。
 */
export const SNOWFIELD_21_DIALOGUES: DialogueDef[] = [
  {
    id: 'snowfield_2_1_t01',
    variants: [{ lines: [
      { speaker: 'protagonist', text: '雪線比紀錄中往南移了很多。' },
      { speaker: 'protagonist', text: '這股寒氣不像自然形成的。' },
    ] }],
  },
  {
    id: 'snowfield_2_1_t03',
    variants: [{ lines: [{ speaker: 'protagonist', text: '地面結冰了……踩上去會繼續滑。' }] }],
  },
  {
    id: 'snowfield_2_1_t04',
    variants: [{ lines: [{ speaker: 'protagonist', text: '營火才熄滅沒多久，但這裡沒有打鬥痕跡。' }] }],
  },
  {
    id: 'snowfield_2_1_t05',
    variants: [{ lines: [{ speaker: 'protagonist', text: '牠身上的冰晶不自然。先制服牠！' }] }],
  },
  {
    id: 'snowfield_2_1_t06',
    variants: [{ lines: [{ speaker: 'protagonist', text: '牠們不是來獵食的……是在逃離北方的東西。' }] }],
  },
]
