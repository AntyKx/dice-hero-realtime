import type { GameEvent } from './types'

export const ALL_EVENTS: GameEvent[] = [
  {
    id: 'spring',
    name: '神秘泉水',
    icon: '⛲',
    desc: '你發現一座散發著微光的神秘泉水，傳說飲用後能夠治癒任何傷口...',
    choices: [
      { label: '飲用泉水', desc: '回復 30% 最大 HP', outcome: { type: 'heal', value: 30 } },
      { label: '完全沐浴', desc: 'HP 全滿回復', outcome: { type: 'full_heal' } },
      { label: '繼續前進', desc: '不做任何事', outcome: { type: 'nothing' } },
    ],
  },
  {
    id: 'merchant',
    name: '神秘商旅',
    icon: '🧙',
    desc: '一位戴著兜帽的神秘商人向你搭話，他手裡握著一些稀罕的東西...',
    choices: [
      { label: '購買增益卡', desc: '花費 50 金幣，獲得一張稀有增益卡', outcome: { type: 'rare_card', goldBonus: -50 } },
      { label: '只是聊聊', desc: '獲得 35 金幣的情報費', outcome: { type: 'gold', value: 35 } },
      { label: '拒絕他', desc: '繼續前進', outcome: { type: 'nothing' } },
    ],
  },
  {
    id: 'temple',
    name: '廢棄神殿',
    icon: '🗿',
    desc: '你走進一座古老的廢棄神殿，正中央台座上擺放著一件散發著神秘光芒的遺物...',
    choices: [
      { label: '拿取遺物', desc: '獲得一件隨機遺物', outcome: { type: 'relic' } },
      { label: '祈禱後離開', desc: '獲得 20 金幣的平安感', outcome: { type: 'gold', value: 20 } },
      { label: '離開', desc: '繼續前進', outcome: { type: 'nothing' } },
    ],
  },
  {
    id: 'trap',
    name: '機關陷阱',
    icon: '⚠️',
    desc: '你不小心踏入一間充滿機關的密室！岩石快速落下，必須做出選擇...',
    choices: [
      { label: '硬闖穿越', desc: '受到 20% 最大 HP 的傷害，但找到 40 金幣', outcome: { type: 'damage', value: 20, goldBonus: 40 } },
      { label: '小心退後', desc: '受到 8% 最大 HP 的小傷害', outcome: { type: 'damage', value: 8 } },
      { label: '呼叫幫助', desc: '略過陷阱但消耗精力，損失 15 金幣', outcome: { type: 'gold', value: -15 } },
    ],
  },
  {
    id: 'library',
    name: '古老圖書館',
    icon: '📚',
    desc: '你發現了一座被塵封已久的魔法圖書館，書架上堆滿了珍貴的魔法典籍...',
    choices: [
      { label: '研讀魔典', desc: '獲得一張增益卡選擇', outcome: { type: 'rare_card' } },
      { label: '搜刮金幣', desc: '獲得 30 金幣', outcome: { type: 'gold', value: 30 } },
      { label: '離開', desc: '繼續前進', outcome: { type: 'nothing' } },
    ],
  },
  {
    id: 'curse_shrine',
    name: '詛咒祭壇',
    icon: '💀',
    desc: '一座黑暗的祭壇散發著不祥的氣息。上面刻著：「以苦難換取力量...」',
    choices: [
      { label: '接受詛咒', desc: '受到一個詛咒，但獲得一件遺物', outcome: { type: 'relic', withCurse: true } },
      { label: '摧毀祭壇', desc: '受到 15% HP 傷害，阻止詛咒散播', outcome: { type: 'damage', value: 15 } },
      { label: '快速離開', desc: '不做任何事', outcome: { type: 'nothing' } },
    ],
  },
]

export function getRandomEvent(): GameEvent {
  return ALL_EVENTS[Math.floor(Math.random() * ALL_EVENTS.length)]
}

export function getEventById(id: string): GameEvent | undefined {
  return ALL_EVENTS.find(e => e.id === id)
}
