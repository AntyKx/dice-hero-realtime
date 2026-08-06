import type { RouteType, MetaState } from '../types'
import { DUNGEON_DEFS } from '../dungeon'
import { HEROES } from '../data'

const ROUTES: { type: RouteType; icon: string; name: string; desc: string; tags: string[] }[] = [
  {
    type: 'safe',
    icon: '🛡️',
    name: '安全路線',
    desc: '多休息、多普通戰鬥，精英較少。適合穩健推進或低 HP 時。',
    tags: ['休息 +2', '普通戰 +3', '精英 −2', '寶箱 −'],
  },
  {
    type: 'risk',
    icon: '⚔️',
    name: '風險路線',
    desc: '多精英、多事件，休息較少。高風險高報酬，適合想快速強化的玩家。',
    tags: ['精英 +2', '事件 +2', '休息 −2'],
  },
]

const FATE_DESCS: Record<number, string> = {
  0: '標準難度',
  1: '敵人 HP +8%',
  2: '精英戰開場自燃 3 層',
  3: 'Boss 開場獲得 30 護盾',
  4: '每局開始附加一個詛咒',
  5: '休息回復量 −50%',
  6: '精英戰開場燃燒提升至 5 層',
  7: '所有怪物附加 3 個詞綴',
  8: 'Boss 護盾提升至 60，並獲得 2 個隨機詞綴',
  9: '每局開始附加 2 個詛咒',
  10: '敵人詞綴數量再 +1（普通 3、精英 4、Boss 4）',
}

const RARITY_ZH: Record<string, string> = { magic: '魔法', rare: '稀有', legendary: '傳奇' }

interface Props {
  meta: MetaState
  onSelect: (route: RouteType) => void
  onSelectRiftOmen: (route: RouteType) => void
  onEnterDungeon: (dungeonId: string) => void
  onSetFateLevel: (lv: number) => void
  onBack: () => void
}

export default function RouteSelectScreen({ meta, onSelect, onSelectRiftOmen, onEnterDungeon, onSetFateLevel, onBack }: Props) {
  const isUnlocked = (minLevel?: number) => {
    if (!minLevel) return true
    return HEROES.some(h => (meta.heroProgress[h.id]?.level ?? 1) >= minLevel)
  }

  return (
    <div className="route-select-screen">
      <div className="rs-header">
        <button className="ghost rs-back-btn" onClick={onBack}>← 重選英雄</button>
        <div className="rs-eyebrow">開始冒險</div>
        <h2 className="rs-title">選擇冒險地圖</h2>
        <p className="rs-sub">選擇目的地，開始這次骰子冒險。</p>
      </div>

      <div className="rs-section">
        <div className="rs-section-label">⚔️ 主線冒險</div>

        {meta.fateLevel > 0 && (
          <div className="fate-level-panel" style={{ marginBottom: 14 }}>
            <div className="flp-header">
              <span className="flp-title">⚡ 命運等級</span>
              <span className="flp-unlocked">已解鎖 Lv{meta.fateLevel}</span>
            </div>
            <p className="flp-desc">{FATE_DESCS[meta.activeFateLevel]}</p>
            <div className="flp-btns">
              {Array.from({ length: meta.fateLevel + 1 }, (_, i) => (
                <button
                  key={i}
                  className={`flp-btn ${meta.activeFateLevel === i ? 'active' : ''}`}
                  onClick={() => onSetFateLevel(i)}
                >
                  {i === 0 ? '標準' : `Lv${i}`}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rs-cards">
          {ROUTES.map(r => (
            <button key={r.type} className={`rs-card rs-${r.type}`} onClick={() => onSelect(r.type)}>
              <div className="rs-icon">{r.icon}</div>
              <div className="rs-name">{r.name}</div>
              <p className="rs-desc">{r.desc}</p>
              <div className="rs-tags">
                {r.tags.map(t => (
                  <span key={t} className="rs-tag">{t}</span>
                ))}
              </div>
              <div className="rs-start-hint">點擊選擇 →</div>
            </button>
          ))}
        </div>
      </div>

      <div className="rs-section">
        <div className="rs-section-label">🌌 裂隙前兆篇</div>
        <p style={{ color: '#b0c8e8', fontSize: '0.85rem', marginBottom: 12 }}>
          裂隙污染世界邊境，探索三個全新區域，了解骰子規則如何被裂隙力量扭曲。
        </p>
        <div className="rs-cards">
          {ROUTES.map(r => (
            <button key={r.type} className={`rs-card rs-${r.type}`} onClick={() => onSelectRiftOmen(r.type)}>
              <div className="rs-icon">{r.icon}</div>
              <div className="rs-name">{r.name}</div>
              <p className="rs-desc">{r.desc}</p>
              <div className="rs-tags">
                {r.tags.map(t => <span key={t} className="rs-tag">{t}</span>)}
              </div>
              <div className="rs-start-hint">點擊選擇 →</div>
            </button>
          ))}
        </div>
      </div>

      <div className="rs-section">
        <div className="rs-section-label">🏰 地城副本</div>
        <div className="rs-dungeon-row">
          {DUNGEON_DEFS.map(d => {
            const unlocked = isUnlocked(d.minLevel)
            const prog = meta.dungeonProgress?.[d.id]
            return (
              <button
                key={d.id}
                className={`rs-dg-card${unlocked ? '' : ' locked'}`}
                style={{ '--dungeon-color': d.color } as React.CSSProperties}
                disabled={!unlocked}
                onClick={() => onEnterDungeon(d.id)}
              >
                <div className="rs-dg-head">
                  <span className="rs-dg-icon">{d.icon}</span>
                  <div className="rs-dg-info">
                    <div className="rs-dg-name">{d.name}</div>
                    <div className="rs-dg-sub">{d.subtitle}</div>
                  </div>
                  {prog?.cleared && <span className="rs-dg-cleared">✓ 通關</span>}
                </div>
                <p className="rs-dg-desc">{d.desc}</p>
                <div className="rs-dg-rewards">
                  <span>💰 {d.goldReward} 金幣</span>
                  <span className={`rarity-${d.equipRarity}`}>{RARITY_ZH[d.equipRarity]}裝備</span>
                  <span>✨ {d.expReward} EXP</span>
                </div>
                {!unlocked
                  ? <div className="rs-dg-lock">🔒 需英雄達到 Lv{d.minLevel}</div>
                  : <div className="rs-start-hint">點擊進入 →</div>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
