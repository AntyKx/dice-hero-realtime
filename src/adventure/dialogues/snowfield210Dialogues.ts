import type { DialogueDef } from '../adventureTypes'

/**
 * 2-10《極寒王座》主線劇情台詞，來源：官方 V5.1 設計配置包
 * `snowfield_2_10/story_triggers.json`。冰霜女王（frost_queen，2-9 之後
 * 加入同行）在 room_07 補一句話，room_08 t06 是 boss_clear（見
 * requiresCombatCleared）。
 */
export const SNOWFIELD_210_DIALOGUES: DialogueDef[] = [
  {
    id: 'snowfield_2_10_t01',
    variants: [{ lines: [{ speaker: 'protagonist', text: '到了。永冬的中心。' }] }],
  },
  {
    id: 'snowfield_2_10_t02',
    variants: [{ lines: [{ speaker: 'protagonist', text: '兩條路都通往王座，選一條還能站穩腳步的。' }] }],
  },
  {
    id: 'snowfield_2_10_t03',
    variants: [{ lines: [{ speaker: 'protagonist', text: '那就是冰霜巨龍……' }] }],
  },
  {
    id: 'snowfield_2_10_t04',
    variants: [{ lines: [{ speaker: 'boss_frost_queen', text: '別誤會。它也只是被利用的載體。' }] }],
  },
  {
    id: 'snowfield_2_10_t05',
    variants: [{ lines: [{ speaker: 'protagonist', text: '先讓牠停下來！' }] }],
  },
  {
    id: 'snowfield_2_10_t06',
    variants: [{ lines: [{ speaker: 'protagonist', text: '核心在崩裂……這不是冰系魔力。' }] }],
  },
  {
    id: 'snowfield_2_10_t07',
    variants: [{ lines: [{ speaker: 'boss_frost_queen', text: '裂隙已經開始蔓延。' }] }],
  },
  {
    id: 'snowfield_2_10_t08',
    variants: [{ lines: [{ speaker: 'protagonist', text: '那下一站就很清楚了。' }] }],
  },
]
