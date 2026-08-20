import type { DialogueDef } from '../adventureTypes'

export const FOREST_RUINS_01_DIALOGUES: DialogueDef[] = [
  {
    id: 'girl_greet_before_quest',
    variants: [{ lines: [
      { speaker: '迷途女孩', text: '嗚…我把小熊弄丟了，牠一定還在花圃附近…' },
      { speaker: '迷途女孩', text: '花圃裡好像有史萊姆出沒，我不敢自己去找。可以幫我找找看嗎？' },
    ] }],
  },
  {
    id: 'girl_quest_in_progress',
    variants: [{ lines: [
      { speaker: '迷途女孩', text: '拜託了…小熊還在花圃那邊，牠一定很害怕。' },
    ] }],
  },
  {
    id: 'girl_quest_complete',
    variants: [{ lines: [
      { speaker: '迷途女孩', text: '小熊！太好了，謝謝你！' },
      { speaker: '迷途女孩', text: '這個給你，一點小小的謝禮。' },
    ] }],
  },
  // 任務完成後回頭再找她的固定閒聊台詞，不會再重複交任務那句「這個給你」。
  {
    id: 'girl_quest_done',
    variants: [{ lines: [
      { speaker: '迷途女孩', text: '謝謝你，小熊已經被我抱在懷裡了，再也不會弄丟牠了。' },
    ] }],
  },
  // 古老祭壇劇情（文件第十節）：Party Conditional Dialogue 接口示範——皇家
  // 公主/死亡騎士在隊伍裡時顯示各自專屬的一句，其餘情況顯示無角色差異的
  // 通用旁白。
  {
    id: 'altar_cutscene',
    variants: [
      {
        condition: { partyHasHeroId: 'princess' },
        lines: [
          { speaker: '皇家公主', text: '這道裂痕…跟王城地下的封印紋路很像。' },
          { speaker: '皇家公主', text: '森林深處恐怕不只是迷路這麼簡單。' },
        ],
      },
      {
        condition: { partyHasHeroId: 'death_knight' },
        lines: [
          { speaker: '死亡騎士', text: '（沉默地盯著裂痕）……這股氣息，我曾經很熟悉。' },
        ],
      },
      {
        lines: [
          { speaker: '???', text: '祭壇石面上爬滿了紫黑色的裂痕，隱隱透出不祥的光。' },
          { speaker: '???', text: '森林深處，似乎正在發生某種異變……' },
        ],
      },
    ],
  },
]
