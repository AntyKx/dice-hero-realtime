import type { DialogueDef } from '../adventureTypes'

/**
 * 2-8《冰封王城》主線劇情台詞，來源：官方 V5.1 設計配置包
 * `snowfield_2_8/story_triggers.json`。room_10 的 boss_frozen_general
 * speaker 官方寫的 id 跟 enemies.ts 的實際 enemyId（frost_knight_captain）
 * 對不上（DialogueController.resolveSpeaker() 找不到 npc_/boss_ 前綴後的
 * enemyId 會直接顯示原始字串），這裡直接寫死中文「冰封將軍」顯示，不用
 * 依賴 speaker 前綴解析。
 */
export const SNOWFIELD_28_DIALOGUES: DialogueDef[] = [
  {
    id: 'snowfield_2_8_t01',
    variants: [{ lines: [{ speaker: 'protagonist', text: '沒有任何人逃出去……整座城像在一瞬間停住。' }] }],
  },
  {
    id: 'snowfield_2_8_t02',
    variants: [{ lines: [{ speaker: 'protagonist', text: '所有被冰封的人都朝同一個方向。王宮。' }] }],
  },
  {
    id: 'snowfield_2_8_t03',
    variants: [{ lines: [{ speaker: 'protagonist', text: '王室寶庫沒有被搬空，災難根本沒給他們準備時間。' }] }],
  },
  {
    id: 'snowfield_2_8_t04',
    variants: [{ lines: [{ speaker: 'protagonist', text: '塔在啟動！那是自動防禦裝置。' }] }],
  },
  {
    id: 'snowfield_2_8_t05',
    variants: [{ lines: [{ speaker: 'protagonist', text: '越接近王宮，冰晶中的符文越密集。' }] }],
  },
  {
    id: 'snowfield_2_8_t06',
    variants: [{ lines: [{ speaker: '冰封將軍', text: '王城……禁止通行。' }] }],
  },
  {
    id: 'snowfield_2_8_t07',
    variants: [{ lines: [{ speaker: 'protagonist', text: '你們到底在保護什麼？' }] }],
  },
  {
    id: 'snowfield_2_8_t08',
    variants: [{ lines: [{ speaker: '冰封將軍', text: '……王座。' }] }],
  },
  {
    id: 'snowfield_2_8_t09',
    variants: [{ lines: [{ speaker: 'protagonist', text: '所有線索都指向王座。那就去看看永冬真正的中心。' }] }],
  },
]
