import type { CovenantEventBuff } from '../types'

type EventChoice = {
  label: string
  desc: string
  hpChange: number
  goldGain?: number
  nextBattleBuff?: CovenantEventBuff
}

type EventDef = {
  id: string
  title: string
  desc: string
  choices: EventChoice[]
}

const EVENT_DEFS: EventDef[] = [
  {
    id: 'ash_altar',
    title: '王血祭壇',
    desc: '你發現一座以王血啟動的灰燼祭壇，古老的符文在黑暗中微微燃燒。',
    choices: [
      { label: '破壞祭壇',   desc: '獲得 80 金幣，但下一場戰鬥聖約進度開場 +20。', hpChange: 0,  goldGain: 80, nextBattleBuff: { covenantStartBonus: 20 } },
      { label: '淨化祭壇',   desc: '失去 15 HP，移除 1 點潛在詛咒，下一場聖約增加量 -10%。', hpChange: -15, nextBattleBuff: { covenantRateMult: 0.9 } },
      { label: '無視祭壇',   desc: '靜靜離去，不留痕跡。',  hpChange: 0 },
    ],
  },
  {
    id: 'mass_whisper',
    title: '萬民低語',
    desc: '無數灰燼怨魂在你耳邊低語，訴說著王城覆滅前夜的哀嚎。',
    choices: [
      { label: '聆聽怨念',   desc: '獲得 60 金幣，但下一場治療效果 -20%。', hpChange: 0, goldGain: 60, nextBattleBuff: { heroHealMult: 0.8 } },
      { label: '安撫怨魂',   desc: '失去 12 HP，但下一場聖約進度增加量 -20%。', hpChange: -12, nextBattleBuff: { covenantRateMult: 0.8 } },
      { label: '快速離開',   desc: '掩耳疾行，不予理會。', hpChange: 0 },
    ],
  },
  {
    id: 'fallen_edict',
    title: '殘王敕令',
    desc: '灰燼中仍燃燒著一道王令，王城最後的旨意尚未熄滅。',
    choices: [
      { label: '撕毀王令',   desc: '下一場敵方攻擊 -15%，但開場出現 1 隻聖約殘焰。', hpChange: 0, nextBattleBuff: { enemyAtkMult: 0.85, startCovenantEmber: true } },
      { label: '接受王令',   desc: '獲得 40 金幣與 15 HP 護盾效果（以 HP 回復代替）。', hpChange: 15, goldGain: 40 },
      { label: '不碰王令',   desc: '王令繼續燃燒，你悄然離去。', hpChange: 0 },
    ],
  },
  {
    id: 'covenant_stele',
    title: '灰燼聖約碑',
    desc: '碑文記載著國王與聖約締結的瞬間，字字皆是鮮血寫就的誓言。',
    choices: [
      { label: '閱讀碑文',   desc: '獲得 100 金幣，但下一場聖約進度上限暫時降至 80。', hpChange: 0, goldGain: 100, nextBattleBuff: { covenantMaxLimit: 80 } },
      { label: '擦去碑文',   desc: '下一場灰燼審判傷害 -30%。', hpChange: 0, nextBattleBuff: { ashJudgmentDmgMult: 0.7 } },
      { label: '離開',       desc: '碑文不屬於你，你轉身離去。', hpChange: 0 },
    ],
  },
]

interface Props {
  eventId: string
  nodeId: string
  heroHp: number
  heroMaxHp: number
  onComplete: (result: { hpChange: number; goldGain?: number; nextBattleBuff?: CovenantEventBuff }) => void
}

export default function AshCovenantEventScreen({ eventId, heroHp, heroMaxHp, onComplete }: Props) {
  const ev = EVENT_DEFS.find(e => e.id === eventId) ?? EVENT_DEFS[0]
  const hpPct = heroHp / heroMaxHp
  const hpColor = hpPct > 0.5 ? '#40c060' : hpPct > 0.25 ? '#e0a020' : '#e04040'

  return (
    <div className="ace-wrap">
      <div className="ace-modal">
        <div className="ace-badge">📜 聖約事件</div>
        <div className="ace-title">{ev.title}</div>
        <p className="ace-desc">{ev.desc}</p>

        <div className="ace-hero-status">
          <span style={{ color: hpColor }}>❤️ {heroHp} / {heroMaxHp}</span>
        </div>

        <div className="ace-choices">
          {ev.choices.map((c, i) => (
            <button
              key={i}
              className="ace-choice-btn"
              onClick={() => onComplete({ hpChange: c.hpChange, goldGain: c.goldGain, nextBattleBuff: c.nextBattleBuff })}
            >
              <div className="ace-choice-label">{c.label}</div>
              <div className="ace-choice-desc">{c.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
