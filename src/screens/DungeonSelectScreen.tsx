import { useState } from 'react'
import { HEROES, ENEMIES, getHeroSprite } from '../data'
import SpriteAnimator from '../components/SpriteAnimator'
import { DUNGEON_DEFS, DIFFICULTY_CONFIG, type DungeonDef, type DungeonDifficulty } from '../dungeon'
import type { MetaState } from '../types'
import { getHeroStarTitle } from '../talents'

// Group definition: id → dungeon IDs it contains
const DUNGEON_GROUPS: { groupId: string; label: string; color: string; dungeonIds: string[] }[] = [
  { groupId: 'ash_kingdom_group', label: '🔥 灰燼王國篇', color: '#c07030', dungeonIds: ['burning_throne', 'ash_covenant'] },
]
const GROUPED_IDS = new Set(DUNGEON_GROUPS.flatMap(g => g.dungeonIds))

interface Props {
  meta: MetaState
  preSelectedId?: string
  onEnterDungeon: (dungeonId: string, heroId: string, difficulty: DungeonDifficulty) => void
  onBack: () => void
  onLeaderboard: (dungeonId?: string) => void
}

const RARITY_ZH: Record<string, string> = { magic: '魔法', rare: '稀有', legendary: '傳奇' }

const DUNGEON_IMAGES: Record<string, string> = {
  star_eclipse:   '/assets/dungeons/star_eclipse.png',
  burning_throne: '/assets/dungeons/burning_throne.png',
  black_tide:     '/assets/dungeons/black_tide.png',
  ash_covenant:   '/assets/dungeons/ash_covenant.png',
}

export default function DungeonSelectScreen({ meta, preSelectedId, onEnterDungeon, onBack, onLeaderboard }: Props) {
  const preSelected = preSelectedId ? (DUNGEON_DEFS.find(d => d.id === preSelectedId) ?? null) : null
  const [selected, setSelected]       = useState<DungeonDef | null>(preSelected)
  const [difficulty, setDifficulty]   = useState<DungeonDifficulty>('normal')
  const [groupOpen, setGroupOpen]     = useState<Record<string, boolean>>({ ash_kingdom_group: false })

  const isUnlocked = (d: DungeonDef) => {
    if (d.requireCampaign && !meta.campaignCleared?.[d.requireCampaign]) return false
    if (!d.minLevel) return true
    return HEROES.some(h => (meta.heroProgress[h.id]?.level ?? 1) >= d.minLevel!)
  }

  const heroCanEnter = (d: DungeonDef, heroId: string) => {
    if (d.requireCampaign && !meta.campaignCleared?.[d.requireCampaign]) return false
    if (!d.minLevel) return true
    return (meta.heroProgress[heroId]?.level ?? 1) >= d.minLevel
  }

  const renderDungeonCard = (d: DungeonDef) => {
    const unlocked = isUnlocked(d)
    const prog = meta.dungeonProgress?.[d.id]
    const lockMsg = d.requireCampaign ? `需先通關灰燼王國篇主線` : `需要至少一個英雄達到 Lv${d.minLevel}`
    return (
      <div
        key={d.id}
        className={`dungeon-card${unlocked ? '' : ' locked'}`}
        style={{ '--dungeon-color': d.color } as React.CSSProperties}
      >
        {DUNGEON_IMAGES[d.id] && (
          <div className="dc-cover">
            <img src={DUNGEON_IMAGES[d.id]} className="dc-cover-img" alt={d.name} />
            {prog?.cleared && <span className="dc-cleared">✓ 已通關</span>}
          </div>
        )}
        <div className="dc-header">
          {!DUNGEON_IMAGES[d.id] && <span className="dc-icon">{d.icon}</span>}
          <div className="dc-header-text">
            <div className="dc-name">{d.name}</div>
            <div className="dc-subtitle">{d.subtitle}</div>
          </div>
          {!DUNGEON_IMAGES[d.id] && prog?.cleared && <span className="dc-cleared">✓ 已通關</span>}
        </div>
        <div className="dc-desc">{d.desc}</div>
        <div className="dc-floors">
          <span className="dc-floor-chip">🗺 節點地圖 · 隨機路徑</span>
          {Array.from(new Set(d.floors.map(f => f.enemyId))).map(enemyId => {
            const enemy = ENEMIES.find(e => e.id === enemyId)
            const floorDef = d.floors.find(f => f.enemyId === enemyId)
            const cls = `dc-floor-chip${floorDef?.isBoss ? ' boss' : floorDef?.isElite ? ' elite' : ''}`
            return (<span key={enemyId} className={cls}>{floorDef?.isBoss ? '👑 ' : floorDef?.isElite ? '⚡ ' : ''}{enemy?.name ?? enemyId}</span>)
          })}
        </div>
        <div className="dc-rewards">
          <span>💰 {d.goldReward}～{Math.floor(d.goldReward * 2.5)} 金幣</span>
          <span className={`rarity-${d.equipRarity}`}>裝備一件（{RARITY_ZH[d.equipRarity]}）</span>
          <span>✨ {d.expReward}～{Math.floor(d.expReward * 2.5)} 經驗</span>
          <span>🎁 通關寶箱（依難度）</span>
        </div>
        {unlocked ? (
          <button className="dc-enter-btn" style={{ background: d.color + '22', borderColor: d.color + '88', color: d.color }}
            onClick={() => { setSelected(d); setDifficulty('normal') }}>進入地城</button>
        ) : (
          <div className="dc-lock">🔒 {lockMsg}</div>
        )}
      </div>
    )
  }

  return (
    <div className="dungeon-select-wrap">
      <header className="topbar">
        <div>
          <div className="eyebrow">DICE HERO RPG</div>
          <h1>地城副本</h1>
          <p>挑戰固定地城，獲得專屬裝備獎勵。HP 在層與層之間保留，無卡牌與遺物加成。每場戰鬥將指定禁忌點數，踩中將引發副作用。</p>
        </div>
        <button className="ghost" onClick={onBack}>← 返回</button>
      </header>

      <div className="ds-leaderboard-bar">
        <button className="ds-lb-btn" onClick={() => onLeaderboard()}>👑 傳奇排行榜</button>
      </div>

      <div className="dungeon-list">
        {/* Top-level (non-grouped) dungeons */}
        <div className="dungeon-grid">
          {DUNGEON_DEFS.filter(d => !GROUPED_IDS.has(d.id)).map(d => renderDungeonCard(d))}
        </div>

        {/* Grouped dungeon sections */}
        {DUNGEON_GROUPS.map(grp => {
          const open = groupOpen[grp.groupId] ?? false
          return (
            <div key={grp.groupId} className="ds-group-section">
              <div
                className="ds-group-header"
                style={{ borderColor: grp.color, color: grp.color }}
                onClick={() => setGroupOpen(s => ({ ...s, [grp.groupId]: !s[grp.groupId] }))}
              >
                <span className="ds-group-label">{grp.label}</span>
                <span className="ds-group-arrow">{open ? '▲' : '▼'}</span>
              </div>
              {open && (
                <div className="dungeon-grid">
                  {DUNGEON_DEFS.filter(d => grp.dungeonIds.includes(d.id)).map(d => renderDungeonCard(d))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selected && (
        <div className="dungeon-hero-overlay" onClick={() => setSelected(null)}>
          <div className="dungeon-hero-modal" onClick={e => e.stopPropagation()}>
            <div className="dhm-title" style={{ color: selected.color }}>
              {DUNGEON_IMAGES[selected.id]
                ? <img src={DUNGEON_IMAGES[selected.id]} className="dc-icon-img-sm" alt={selected.name} />
                : selected.icon
              } {selected.name} — 選擇難度與英雄
            </div>

            <div className="dhm-difficulty-row">
              {(['normal', 'hero', 'legendary'] as DungeonDifficulty[]).map(d => {
                const cfg = DIFFICULTY_CONFIG[d]
                const active = difficulty === d
                const cleared = meta.dungeonProgress?.[selected.id]?.clearedDifficulties ?? []
                const diffLocked = (d === 'hero' && !cleared.includes('normal')) ||
                                   (d === 'legendary' && !cleared.includes('hero'))
                const lockHint = d === 'hero' ? '先通關一般難度' : '先通關英雄難度'
                return (
                  <button
                    key={d}
                    className={`dhm-diff-btn${active ? ' active' : ''}${diffLocked ? ' diff-locked' : ''}`}
                    style={active ? { borderColor: cfg.color, color: cfg.color, background: cfg.color + '18' } : {}}
                    disabled={diffLocked}
                    onClick={() => !diffLocked && setDifficulty(d)}
                    title={diffLocked ? lockHint : ''}
                  >
                    <div className="dhm-diff-label">{diffLocked ? '🔒 ' : ''}{cfg.label}</div>
                    <div className="dhm-diff-desc">{diffLocked ? lockHint : cfg.desc}</div>
                    {cleared.includes(d) && <div className="dhm-diff-cleared">✓ 已通關</div>}
                  </button>
                )
              })}
            </div>

            <div className="dhm-modal-body">
              {(() => {
                const cfg = DIFFICULTY_CONFIG[difficulty]
                const gold = Math.floor(selected.goldReward * cfg.goldMult)
                const exp  = Math.floor(selected.expReward  * cfg.expMult)
                const chestName = difficulty === 'normal' ? '一般寶箱 📦' : difficulty === 'hero' ? '英雄寶箱 🎁' : '傳奇寶箱 👑'
                const chestDesc = difficulty === 'normal'
                  ? '藍裝 80% / 紫裝 20% + 15星塵'
                  : difficulty === 'hero'
                  ? '紫裝通用 55% / 紫職業套裝 33% / 橙裝 12% + 35~50星塵'
                  : '紫職業套裝 38% / 紫通用 22% / 橙通用 12% / 橙職業套裝 15% / 橙職業武器 8% / 雙件 5% + 70~100星塵'
                return (
                  <div className="dhm-reward-preview" style={{ borderColor: cfg.color + '55' }}>
                    <div className="dhm-rp-title" style={{ color: cfg.color }}>通關獎勵預覽</div>
                    <div className="dhm-rp-row"><span>💰 金幣</span><strong>{gold}</strong></div>
                    <div className="dhm-rp-row"><span>✨ 經驗</span><strong>{exp}</strong></div>
                    <div className="dhm-rp-row"><span>⚔ 裝備</span><strong>傳奇裝備 ×1</strong></div>
                    <div className="dhm-rp-row"><span>🎁 寶箱</span><strong>{chestName}</strong></div>
                    <div className="dhm-rp-chest-desc">{chestDesc}</div>
                  </div>
                )
              })()}
              <div className="dhm-hint" style={{ marginBottom: 12 }}>地城內不帶卡牌與遺物，裝備效果正常生效</div>
              <div className="dhm-heroes">
                {HEROES.map(hero => {
                  const prog = meta.heroProgress[hero.id]
                  const level = prog?.level ?? 1
                  const stars = prog?.stars ?? 0
                  const eligible = heroCanEnter(selected, hero.id)
                  const sprite = getHeroSprite(hero, stars)
                  // 高度優先縮放（維持原本大小觀感），.dhm-sprite 格子已加寬，
                  // 詳見 styles.css 該 class 註解。
                  const scale = 60 / sprite.frameHeight
                  const displayName = stars > 0 ? (getHeroStarTitle(hero.id, stars) ?? hero.name) : hero.name
                  return (
                    <button
                      key={hero.id}
                      className={`dhm-hero-btn${eligible ? '' : ' ineligible'}`}
                      disabled={!eligible}
                      onClick={() => { setSelected(null); onEnterDungeon(selected.id, hero.id, difficulty) }}
                      title={eligible ? '' : `需要 Lv${selected.minLevel}`}
                    >
                      <div className="dhm-sprite">
                        <SpriteAnimator sprite={sprite} state="idle" scale={scale} />
                      </div>
                      <div className="dhm-hero-name">{displayName}</div>
                      <div className="dhm-hero-level">
                        Lv{level}{stars > 0 ? ' ' + '★'.repeat(stars) : ''}
                      </div>
                      {!eligible && <div className="dhm-lock-tag">Lv{selected.minLevel}+</div>}
                    </button>
                  )
                })}
              </div>

              <button className="ghost" style={{ marginTop: 16, width: '100%' }} onClick={() => setSelected(null)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
