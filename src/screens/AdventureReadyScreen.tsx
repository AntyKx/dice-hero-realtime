import { useState } from 'react'
import type { RouteType, MetaState } from '../types'
import { HEROES, getHeroSprite, type Hero } from '../data'
import SpriteAnimator from '../components/SpriteAnimator'
import HeroPortraitModal from '../components/HeroPortraitModal'
import { DUNGEON_DEFS, DIFFICULTY_CONFIG, type DungeonDifficulty } from '../dungeon'
import { getHeroStarTitle, computeTalentBonus, defaultHeroProgress } from '../talents'
import { computeEquipBonus, getEquippedItems } from '../equipment'
import type { Equipment } from '../types'
import { FEATURE_FLAGS } from '../featureFlags'
import { generateHeroTalentTree, isTalentNodeAvailable, pointCostForKind, requiredLevelForTier, type ArenaTalentNode } from '../arena/arenaTalents'

export type AdventureStartConfig =
  | { campaign: 'main';        heroId: string; routeType: RouteType }
  | { campaign: 'rift_omen';   heroId: string; routeType: RouteType }
  | { campaign: 'deep_sea';    heroId: string; routeType: RouteType }
  | { campaign: 'ash_kingdom'; heroId: string; routeType: RouteType }
  | { campaign: 'dungeon';     heroId: string; dungeonId: string; difficulty: DungeonDifficulty }

interface Props {
  meta: MetaState
  onStart: (config: AdventureStartConfig) => void
  onSetFateLevel: (lv: number) => void
  onMetaUpdate: (fn: (prev: MetaState) => MetaState) => void
  onBack: () => void
  onLeaderboard: () => void
  /** 森林遺跡固定式主線關卡（2026-08）入口——選好出戰英雄後導向 CampaignMapScreen，跟 onStart（Roguelite/副本）分開。 */
  onOpenCampaignMap: (heroId: string) => void
}

type ModeTab = 'main' | 'dungeon' | 'campaign'
type CampaignPick = 'main' | 'rift_omen' | 'deep_sea' | 'ash_kingdom'

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

const ROUTES: { type: RouteType; icon: string; name: string; desc: string }[] = [
  { type: 'safe', icon: '🛡️', name: '安全路線', desc: '多休息，精英較少，穩健推進。' },
  { type: 'risk', icon: '⚔️', name: '風險路線', desc: '多精英、多事件，高風險高報酬。' },
]

const ROLE_META: Record<string, { icon: string; color: string }> = {
  slash:  { icon: '⚔️',  color: '#6090ff' },
  fire:   { icon: '🔥',  color: '#ff6040' },
  holy:   { icon: '✨',  color: '#ffd36e' },
  shadow: { icon: '🗡️', color: '#a060ff' },
  ice:    { icon: '❄️',  color: '#60c8ff' },
  arrow:  { icon: '🏹',  color: '#60d080' },
  hammer: { icon: '🔨',  color: '#c08040' },
  song:   { icon: '🎵',  color: '#ff80c0' },
  beast:  { icon: '🐾',  color: '#d08040' },
  gear:   { icon: '⚙️',  color: '#90a0b0' },
}

export default function AdventureReadyScreen({ meta, onStart, onSetFateLevel, onMetaUpdate, onBack, onLeaderboard, onOpenCampaignMap }: Props) {
  const [modeTab, setModeTab]           = useState<ModeTab>('main')
  const [campaignPick, setCampaignPick] = useState<CampaignPick>('main')
  const [ashGroupOpen, setAshGroupOpen]         = useState(false)
  const [riftGroupOpen, setRiftGroupOpen]       = useState(false)
  const [deepSeaGroupOpen, setDeepSeaGroupOpen] = useState(false)
  const [dungeonAshOpen, setDungeonAshOpen]     = useState(false)
  const [dungeonRiftOpen, setDungeonRiftOpen]   = useState(false)
  const [dungeonDeepOpen, setDungeonDeepOpen]   = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<RouteType>('risk')
  const [selectedDungeonId, setSelectedDungeonId] = useState<string | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<DungeonDifficulty>('normal')
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null)
  const [portraitHero, setPortraitHero]     = useState<Hero | null>(null)
  const [talentViewHero, setTalentViewHero] = useState<Hero | null>(null)
  const [equipViewHero, setEquipViewHero]   = useState<Hero | null>(null)
  const [talentPendingNode, setTalentPendingNode] = useState<ArenaTalentNode | null>(null) // 點了還沒確認花費的節點

  const canStart =
    selectedHeroId !== null &&
    (modeTab !== 'dungeon' || selectedDungeonId !== null)

  const handleHeroClick = (hero: Hero) => {
    if (hero.portrait) {
      setPortraitHero(hero)
    } else {
      setSelectedHeroId(hero.id)
    }
  }

  const handlePortraitSelect = (heroId: string) => {
    setSelectedHeroId(heroId)
    setPortraitHero(null)
  }

  const handlePortraitStart = (heroId: string) => {
    setSelectedHeroId(heroId)
    setPortraitHero(null)
    // auto-start if ready
    if (modeTab !== 'dungeon' || selectedDungeonId !== null) {
      fireStart(heroId)
    }
  }

  const fireStart = (heroId: string) => {
    if (modeTab === 'main') {
      onStart({ campaign: campaignPick, heroId, routeType: selectedRoute })
    } else if (modeTab === 'campaign') {
      onOpenCampaignMap(heroId)
    } else if (selectedDungeonId) {
      onStart({ campaign: 'dungeon', heroId, dungeonId: selectedDungeonId, difficulty: selectedDifficulty })
    }
  }

  const handleStart = () => {
    if (!selectedHeroId || !canStart) return
    fireStart(selectedHeroId)
  }

  const isDungeonUnlocked = (d: { minLevel?: number; requireCampaign?: string }) => {
    if (d.requireCampaign && !meta.campaignCleared?.[d.requireCampaign]) return false
    if (!d.minLevel) return true
    return HEROES.some(h => (meta.heroProgress[h.id]?.level ?? 1) >= d.minLevel!)
  }
  const isUnlocked = (minLevel?: number) =>
    !minLevel || HEROES.some(h => (meta.heroProgress[h.id]?.level ?? 1) >= minLevel)

  const portraitHeroId = portraitHero?.id
  const portraitProg   = portraitHeroId ? meta.heroProgress[portraitHeroId] : undefined
  const portraitEquip  = portraitHeroId ? getEquippedItems(meta.inventory, meta.loadouts?.[portraitHeroId]) : []
  const portraitEqB    = computeEquipBonus(portraitEquip)
  const portraitTalB   = portraitHeroId ? computeTalentBonus(portraitHeroId, meta.heroProgress[portraitHeroId] ?? { level: 1, exp: 0, wins: 0, stars: 0, selectedTalents: {} }) : { hpBonus: 0, defBonus: 0 }

  return (
    <div className="ar-screen">
      <header className="topbar">
        <div>
          <div className="eyebrow">DICE HERO RPG</div>
          <h1>出發準備</h1>
        </div>
        <button className="ghost" onClick={onBack}>← 返回</button>
      </header>

      {/* ── 主標籤（v1 即時制範圍先隱藏地城副本，見 FEATURE_FLAGS） ── */}
      {FEATURE_FLAGS.dungeons && (
        <div className="ar-mode-tabs">
          <button className={`ar-tab${modeTab === 'main' ? ' active' : ''}`}
            onClick={() => setModeTab('main')}>
            ⚔️ 主線冒險
          </button>
          <button className={`ar-tab${modeTab === 'dungeon' ? ' active' : ''}`}
            onClick={() => setModeTab('dungeon')}>
            🏰 地城副本
          </button>
          <button className={`ar-tab${modeTab === 'campaign' ? ' active' : ''}`}
            onClick={() => setModeTab('campaign')}>
            🌲 森林遺跡
          </button>
        </div>
      )}

      <div className="ar-body">
        {/* ── 左欄：模式選項 ── */}
        <div className="ar-options">

          {modeTab === 'main' && !FEATURE_FLAGS.turnBasedMainline && (
            <div className="ar-arena-info">
              <div className="ar-label">即時戰鬥</div>
              <p className="ar-arena-info-desc">
                拖曳角色走位閃避怪物，攻擊會自動鎖定最近的敵人。升級與擊敗
                Boss 時戰鬥會暫停，讓你選擇強化。撐得越久、殺得越多，
                獎勵越豐厚。
              </p>
            </div>
          )}

          {modeTab === 'campaign' && (
            <div className="ar-arena-info">
              <div className="ar-label">🌲 森林遺跡</div>
              <p className="ar-arena-info-desc">
                20 關固定式主線關卡，每關都有手工設計的敵人配置、機制與三星
                挑戰條件，跟左邊的即時戰鬥主線/地城副本是完全獨立的第三種
                模式。選好出戰英雄後即可進入關卡地圖。
              </p>
            </div>
          )}

          {/* 篇章選擇（2026-08 拉回來）：即時制現在會依篇章對應不同敵人池
              （見 src/arena/enemies.ts），灰燼王國篇美術齊全，其餘三篇暫時
              重用現有素材頂著，等新美術再換。 */}
          {modeTab === 'main' && (
            <>
              <div className="ar-label" style={{ marginTop: FEATURE_FLAGS.turnBasedMainline ? 0 : 14 }}>選擇篇章</div>
              <div className="ar-campaign-col">

                {/* ── 灰燼王國篇（群組） ── */}
                <button
                  className={`ar-campaign-btn ar-campaign-group${(campaignPick === 'main' || campaignPick === 'ash_kingdom') ? ' active' : ''}`}
                  onClick={() => setAshGroupOpen(o => !o)}
                >
                  <div className="ar-cb-icon">🔥</div>
                  <div className="ar-cb-body">
                    <div className="ar-cb-name">灰燼王國篇</div>
                    <div className="ar-cb-sub" style={{ fontSize: '0.7em', color: '#c07030' }}>
                      {campaignPick === 'main' ? '第一章進行中' : campaignPick === 'ash_kingdom' ? '第二章進行中' : '選擇章節'}
                    </div>
                  </div>
                  <span className="ar-campaign-group-arrow">{ashGroupOpen ? '▲' : '▼'}</span>
                </button>

                {ashGroupOpen && (
                  <div className="ar-campaign-sub">
                    {/* 第一章 */}
                    <button
                      className={`ar-campaign-btn ar-campaign-sub-btn${campaignPick === 'main' ? ' active' : ''}`}
                      onClick={() => setCampaignPick('main')}
                    >
                      <div className="ar-cb-icon">⚔️</div>
                      <div className="ar-cb-body">
                        <div className="ar-cb-name">第一章：冒險者的試煉</div>
                        <div className="ar-cb-sub" style={{ fontSize: '0.7em', color: '#8090b0' }}>三關標準主線</div>
                      </div>
                      {campaignPick === 'main' && <span className="ar-check">✓</span>}
                    </button>

                    {/* 第二章 */}
                    {(() => {
                      const ak2Unlocked = meta.campaignCleared?.['main'] || meta.totalWins > 0
                      return (
                        <button
                          className={`ar-campaign-btn ar-campaign-sub-btn${campaignPick === 'ash_kingdom' ? ' active' : ''}${!ak2Unlocked ? ' locked' : ''}`}
                          onClick={() => ak2Unlocked && setCampaignPick('ash_kingdom')}
                          style={!ak2Unlocked ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                        >
                          <div className="ar-cb-icon">{ak2Unlocked ? '🏚️' : '🔒'}</div>
                          <div className="ar-cb-body">
                            <div className="ar-cb-name">第二章：王城餘燼</div>
                            <div className="ar-cb-sub" style={{ fontSize: '0.7em', color: ak2Unlocked ? '#c07030' : '#5060a0' }}>
                              {ak2Unlocked ? '餘燼・記憶・王血詛咒' : '通關第一章後解鎖'}
                            </div>
                          </div>
                          {campaignPick === 'ash_kingdom' && <span className="ar-check">✓</span>}
                        </button>
                      )
                    })()}
                  </div>
                )}

                {/* 裂隙前兆篇（群組） */}
                <button
                  className={`ar-campaign-btn ar-campaign-group${campaignPick === 'rift_omen' ? ' active' : ''}`}
                  onClick={() => setRiftGroupOpen(o => !o)}
                >
                  <div className="ar-cb-icon">🌌</div>
                  <div className="ar-cb-body">
                    <div className="ar-cb-name">裂隙前兆篇</div>
                    <div className="ar-cb-sub" style={{ fontSize: '0.7em', color: '#6080c0' }}>
                      {campaignPick === 'rift_omen' ? '進行中' : '選擇章節'}
                    </div>
                  </div>
                  <span className="ar-campaign-group-arrow">{riftGroupOpen ? '▲' : '▼'}</span>
                </button>
                {riftGroupOpen && (
                  <div className="ar-campaign-sub">
                    <button
                      className={`ar-campaign-btn ar-campaign-sub-btn${campaignPick === 'rift_omen' ? ' active' : ''}`}
                      onClick={() => setCampaignPick('rift_omen')}
                    >
                      <div className="ar-cb-icon">🌌</div>
                      <div className="ar-cb-body">
                        <div className="ar-cb-name">裂隙前兆篇</div>
                        <div className="ar-cb-sub" style={{ fontSize: '0.7em', color: '#6080c0' }}>星蝕・空間裂隙・異界侵略</div>
                      </div>
                      {campaignPick === 'rift_omen' && <span className="ar-check">✓</span>}
                    </button>
                  </div>
                )}

                {/* 深海遺城篇（群組） */}
                <button
                  className={`ar-campaign-btn ar-campaign-group${campaignPick === 'deep_sea' ? ' active' : ''}`}
                  onClick={() => setDeepSeaGroupOpen(o => !o)}
                >
                  <div className="ar-cb-icon">🌊</div>
                  <div className="ar-cb-body">
                    <div className="ar-cb-name">深海遺城篇</div>
                    <div className="ar-cb-sub" style={{ fontSize: '0.7em', color: '#5090b0' }}>
                      {campaignPick === 'deep_sea' ? '進行中' : '選擇章節'}
                    </div>
                  </div>
                  <span className="ar-campaign-group-arrow">{deepSeaGroupOpen ? '▲' : '▼'}</span>
                </button>
                {deepSeaGroupOpen && (
                  <div className="ar-campaign-sub">
                    <button
                      className={`ar-campaign-btn ar-campaign-sub-btn${campaignPick === 'deep_sea' ? ' active' : ''}`}
                      onClick={() => setCampaignPick('deep_sea')}
                    >
                      <div className="ar-cb-icon">🌊</div>
                      <div className="ar-cb-body">
                        <div className="ar-cb-name">深海遺城篇</div>
                        <div className="ar-cb-sub" style={{ fontSize: '0.7em', color: '#5090b0' }}>氧氣・潮汐・深壓・亂流</div>
                      </div>
                      {campaignPick === 'deep_sea' && <span className="ar-check">✓</span>}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 路線/命運等級：即時制目前不使用（沒有安全/風險路線分佈或難度
              量表的概念），繼續藏著，邏輯畫面都保留。 */}
          {modeTab === 'main' && FEATURE_FLAGS.turnBasedMainline && (
            <>
              {/* 路線 */}
              <div className="ar-label" style={{ marginTop: 14 }}>路線</div>
              <div className="ar-route-col">
                {ROUTES.map(r => (
                  <button
                    key={r.type}
                    className={`ar-route-btn${selectedRoute === r.type ? ' active' : ''}`}
                    onClick={() => setSelectedRoute(r.type)}
                  >
                    <span className="ar-route-icon">{r.icon}</span>
                    <div>
                      <div className="ar-route-name">{r.name}</div>
                      <div className="ar-route-desc">{r.desc}</div>
                    </div>
                    {selectedRoute === r.type && <span className="ar-check">✓</span>}
                  </button>
                ))}
              </div>

              {/* 命運等級 */}
              {meta.fateLevel > 0 && (
                <>
                  <div className="ar-label" style={{ marginTop: 14 }}>⚡ 命運等級</div>
                  <p className="ar-fate-desc">{FATE_DESCS[meta.activeFateLevel]}</p>
                  <div className="ar-fate-row">
                    {Array.from({ length: meta.fateLevel + 1 }, (_, i) => (
                      <button
                        key={i}
                        className={`ar-fate-btn${meta.activeFateLevel === i ? ' active' : ''}`}
                        onClick={() => onSetFateLevel(i)}
                      >
                        {i === 0 ? '標準' : `Lv${i}`}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {modeTab === 'dungeon' && (
            <>
              <div className="ar-dungeon-header">
                <div className="ar-label" style={{ margin: 0 }}>選擇地城</div>
                <button className="ar-lb-btn" onClick={onLeaderboard}>👑 排行榜</button>
              </div>
              <div className="ar-dungeon-list">
                {(() => {
                  const DG_GROUPS = [
                    { key: 'ash',     label: '🔥 灰燼王國篇', color: '#c07030', ids: ['burning_throne', 'ash_covenant'], open: dungeonAshOpen,  setOpen: setDungeonAshOpen },
                    { key: 'rift',    label: '🌌 裂隙前兆篇', color: '#5070d0', ids: ['star_eclipse'],                  open: dungeonRiftOpen, setOpen: setDungeonRiftOpen },
                    { key: 'deepsea', label: '🌊 深海遺城篇', color: '#3090b0', ids: ['black_tide'],                    open: dungeonDeepOpen, setOpen: setDungeonDeepOpen },
                  ]
                  const GROUPED = new Set(DG_GROUPS.flatMap(g => g.ids))
                  const renderBtn = (d: typeof DUNGEON_DEFS[0]) => {
                    const unlocked = isDungeonUnlocked(d)
                    const prog = meta.dungeonProgress?.[d.id]
                    const active = selectedDungeonId === d.id
                    const lockMsg = d.requireCampaign ? '需先通關灰燼王國篇' : `🔒 Lv${d.minLevel}`
                    return (
                      <button
                        key={d.id}
                        className={`ar-dg-btn${active ? ' active' : ''}${unlocked ? '' : ' locked'}`}
                        style={{ '--dungeon-color': d.color } as React.CSSProperties}
                        disabled={!unlocked}
                        onClick={() => setSelectedDungeonId(d.id)}
                      >
                        <span className="ar-dg-icon">{d.icon}</span>
                        <div className="ar-dg-info">
                          <div className="ar-dg-name">{d.name}</div>
                          <div className="ar-dg-sub">{d.subtitle}</div>
                        </div>
                        {prog?.cleared && <span className="ar-dg-cleared">✓ 通關</span>}
                        {!unlocked && <span className="ar-dg-lock">{lockMsg}</span>}
                      </button>
                    )
                  }
                  return (
                    <>
                      {DG_GROUPS.map(grp => (
                        <div key={grp.key} className="ar-dg-group">
                          <button
                            className="ar-dg-group-header"
                            style={{ color: grp.color, borderColor: grp.color }}
                            onClick={() => grp.setOpen((o: boolean) => !o)}
                          >
                            <span className="ar-dg-group-label">{grp.label}</span>
                            <span className="ar-campaign-group-arrow">{grp.open ? '▲' : '▼'}</span>
                          </button>
                          {grp.open && DUNGEON_DEFS.filter(d => grp.ids.includes(d.id)).map(renderBtn)}
                        </div>
                      ))}
                      {DUNGEON_DEFS.filter(d => !GROUPED.has(d.id)).map(renderBtn)}
                    </>
                  )
                })()}
              </div>

              {selectedDungeonId && (() => {
                const d = DUNGEON_DEFS.find(x => x.id === selectedDungeonId)!
                return (
                  <>
                    <div className="ar-label" style={{ marginTop: 14 }}>難度</div>
                    <div className="ar-diff-row">
                      {(['normal', 'hero', 'legendary'] as DungeonDifficulty[]).map(dif => {
                        const cfg = DIFFICULTY_CONFIG[dif]
                        const isActive = selectedDifficulty === dif
                        return (
                          <button
                            key={dif}
                            className={`ar-diff-btn${isActive ? ' active' : ''}`}
                            style={isActive ? { borderColor: cfg.color, color: cfg.color, background: cfg.color + '18' } : {}}
                            onClick={() => setSelectedDifficulty(dif)}
                          >
                            <div className="ar-diff-label">{cfg.label}</div>
                            <div className="ar-diff-desc">{cfg.desc}</div>
                          </button>
                        )
                      })}
                    </div>
                    {(() => {
                      const cfg = DIFFICULTY_CONFIG[selectedDifficulty]
                      const gold = Math.floor(d.goldReward * cfg.goldMult)
                      const exp  = Math.floor(d.expReward  * cfg.expMult)
                      const chestName = selectedDifficulty === 'normal' ? '一般寶箱 📦' : selectedDifficulty === 'hero' ? '英雄寶箱 🎁' : '傳奇寶箱 👑'
                      const chestDesc = selectedDifficulty === 'normal'
                        ? '藍裝 80% / 紫裝 20% + 15星塵'
                        : selectedDifficulty === 'hero'
                        ? '紫裝通用 55% / 紫職業套裝 33% / 橙裝 12% + 35~50星塵'
                        : '紫職業套裝 38% / 紫通用 22% / 橙通用 12% / 橙職業套裝 15% / 橙職業武器 8% / 雙件 5% + 70~100星塵'
                      const rarityZH = d.equipRarity === 'magic' ? '魔法' : d.equipRarity === 'rare' ? '稀有' : '傳奇'
                      return (
                        <div className="ar-dg-reward-preview" style={{ borderColor: cfg.color + '55' }}>
                          <div className="ar-dg-rp-title" style={{ color: cfg.color }}>通關獎勵預覽</div>
                          <div className="ar-dg-rp-row"><span>💰 金幣</span><strong>{gold}</strong></div>
                          <div className="ar-dg-rp-row"><span>✨ 經驗</span><strong>{exp}</strong></div>
                          <div className="ar-dg-rp-row"><span>⚔ 裝備</span><strong><span className={`rarity-${d.equipRarity}`}>{rarityZH}裝備</span> ×1</strong></div>
                          <div className="ar-dg-rp-row"><span>🎁 寶箱</span><strong>{chestName}</strong></div>
                          <div className="ar-dg-rp-chest">{chestDesc}</div>
                        </div>
                      )
                    })()}
                  </>
                )
              })()}
            </>
          )}
        </div>

        {/* ── 右欄：英雄選擇 ── */}
        <div className="ar-hero-panel">
          <div className="ar-label">選擇英雄</div>
          <div className="ar-hero-grid">
            {HEROES.map(hero => {
              const prog  = meta.heroProgress[hero.id]
              const stars = prog?.stars ?? 0
              const sprite = getHeroSprite(hero, stars)
              // 高度優先縮放（維持原本大小觀感），.dhm-sprite 格子已加寬，
              // 詳見 styles.css 該 class 註解。
              const scale  = 52 / sprite.frameHeight
              const displayName = stars > 0 ? (getHeroStarTitle(hero.id, stars) ?? hero.name) : hero.name
              const active = selectedHeroId === hero.id
              const rm = ROLE_META[hero.role]
              return (
                <button
                  key={hero.id}
                  className={`ar-hero-btn${active ? ' active' : ''}`}
                  style={active && rm ? { borderColor: rm.color, boxShadow: `0 0 12px ${rm.color}44` } : {}}
                  onClick={() => handleHeroClick(hero)}
                >
                  <div className="dhm-sprite">
                    <SpriteAnimator sprite={sprite} state="idle" scale={scale} />
                  </div>
                  <div className="dhm-hero-name">{displayName}</div>
                  {prog && prog.level > 1 && (
                    <div className="dhm-hero-level">
                      Lv{prog.level}{stars > 0 ? ' ' + '★'.repeat(stars) : ''}
                    </div>
                  )}
                  {hero.portrait && <div className="ar-hero-portrait-dot" title="有立繪" />}
                </button>
              )
            })}
          </div>
          <p className="ar-hero-hint">點擊英雄選擇；有立繪的英雄點擊後可預覽詳情</p>
        </div>
      </div>

      {/* ── 出發按鈕 ── */}
      <div className="ar-footer">
        <button
          className="primary ar-start-btn"
          disabled={!canStart}
          onClick={handleStart}
        >
          {!selectedHeroId
            ? '請先在右側選擇英雄'
            : modeTab === 'dungeon' && !selectedDungeonId
            ? '請選擇地城'
            : modeTab === 'campaign'
            ? '查看森林遺跡關卡地圖'
            : '出發！'}
        </button>
      </div>

      {/* ── 立繪 Modal ── */}
      {portraitHero && (
        <HeroPortraitModal
          hero={portraitHero}
          roleMeta={{
            icon: ROLE_META[portraitHero.role]?.icon ?? '⚔️',
            color: ROLE_META[portraitHero.role]?.color ?? '#6090ff',
            label: portraitHero.role,
          }}
          prog={portraitProg}
          eqBonus={portraitEqB}
          talBon={portraitTalB}
          equip={portraitEquip}
          startLabel={
            (modeTab !== 'dungeon' || selectedDungeonId !== null)
              ? '選擇此英雄，出發！'
              : '確認選擇'
          }
          onStart={() => handlePortraitStart(portraitHero.id)}
          onClose={() => setPortraitHero(null)}
          onViewTalent={FEATURE_FLAGS.talents ? () => { setPortraitHero(null); setTalentViewHero(portraitHero); setTalentPendingNode(null) } : undefined}
          onViewEquip={FEATURE_FLAGS.equipment ? () => { setPortraitHero(null); setEquipViewHero(portraitHero) } : undefined}
        />
      )}

      {/* ── 裝備 Modal ── */}
      {equipViewHero && (() => {
        const equipHeroId = equipViewHero.id
        const equip = getEquippedItems(meta.inventory, meta.loadouts?.[equipHeroId])
        const rm = ROLE_META[equipViewHero.role] ?? { icon: '⚔️', color: '#6090ff' }
        const SLOT_ORDER = ['weapon', 'head', 'body', 'hands', 'boots', 'ring', 'accessory'] as const
        const SLOT_LABEL: Record<string, string> = {
          weapon: '⚔️ 武器', head: '🪖 頭盔', body: '🛡 護甲', hands: '🧤 手套',
          boots: '👢 靴子', ring: '💍 戒指', accessory: '🔮 飾品',
        }
        const RARITY_COLOR: Record<string, string> = {
          normal: '#8090a8', magic: '#6db8ff', rare: '#c79bff', legendary: '#ff9a3c',
        }
        const RARITY_LABEL: Record<string, string> = {
          normal: '普通', magic: '魔法', rare: '稀有', legendary: '傳奇',
        }
        return (
          <div className="talent-view-overlay" onClick={() => setEquipViewHero(null)}>
            <div className="talent-view-modal" onClick={e => e.stopPropagation()}>
              <div className="tvm-header" style={{ color: rm.color }}>
                {rm.icon} {equipViewHero.name} — 裝備配置
              </div>

              {equip.length === 0 ? (
                <p style={{ color: '#6888a8', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>
                  尚未配備任何裝備
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {SLOT_ORDER.map(slot => {
                    const item = equip.find(e => e.slot === slot || (slot === 'ring' && ((e.slot as string) === 'ring1' || (e.slot as string) === 'ring2')))
                    if (!item) return null
                    return (
                      <div key={item.uid} style={{
                        background: 'rgba(255,255,255,.04)', border: `1px solid ${RARITY_COLOR[item.rarity]}44`,
                        borderRadius: 10, padding: '10px 12px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.7rem', color: '#5070a0' }}>{SLOT_LABEL[slot]}</span>
                          <span style={{ fontSize: '0.68rem', color: RARITY_COLOR[item.rarity], fontWeight: 700 }}>
                            {RARITY_LABEL[item.rarity]}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: RARITY_COLOR[item.rarity], marginBottom: 5 }}>
                          {item.name}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {item.affixes.map(a => (
                            <span key={a.id} style={{
                              fontSize: '0.72rem', color: '#8aadcc',
                              background: 'rgba(100,160,255,.1)', border: '1px solid rgba(100,160,255,.2)',
                              borderRadius: 4, padding: '1px 6px',
                            }}>{a.label}</span>
                          ))}
                          {item.legendaryDesc && (
                            <span style={{
                              fontSize: '0.72rem', color: '#ff9a3c',
                              background: 'rgba(255,150,50,.12)', border: '1px solid rgba(255,150,50,.35)',
                              borderRadius: 4, padding: '1px 6px',
                            }}>{item.legendaryDesc}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <button className="ghost" style={{ marginTop: 8, width: '100%' }}
                onClick={() => setEquipViewHero(null)}>關閉</button>
            </div>
          </div>
        )
      })()}

      {/* ── 天賦樹 Modal（2026-08 重做：大量小節點+花點數點亮+沿路一個職業技能） ── */}
      {talentViewHero && (() => {
        const heroId = talentViewHero.id
        const tree = generateHeroTalentTree(heroId)
        const prog = meta.heroProgress[heroId] ?? defaultHeroProgress()
        const rm   = ROLE_META[talentViewHero.role] ?? { icon: '⚔️', color: '#6090ff' }
        const allocated = prog.allocatedTalentIds ?? []

        const confirmAllocate = (node: ArenaTalentNode) => {
          onMetaUpdate(m => {
            const cur = m.heroProgress[heroId] ?? defaultHeroProgress()
            const cost = pointCostForKind(node.kind)
            if (cur.allocatedTalentIds.includes(node.id) || cur.talentPoints < cost) return m
            if (!isTalentNodeAvailable(tree, node, cur.allocatedTalentIds, cur.level)) return m
            return {
              ...m,
              heroProgress: {
                ...m.heroProgress,
                [heroId]: {
                  ...cur,
                  talentPoints: cur.talentPoints - cost,
                  allocatedTalentIds: [...cur.allocatedTalentIds, node.id],
                },
              },
            }
          })
          setTalentPendingNode(null)
        }

        return (
          <div className="talent-view-overlay" onClick={() => { setTalentViewHero(null); setTalentPendingNode(null) }}>
            <div className="talent-view-modal" onClick={e => e.stopPropagation()}>
              <div className="tvm-header" style={{ color: rm.color }}>
                {rm.icon} {talentViewHero.name} — 天賦樹
              </div>
              <div className="tvm-points-badge">🔷 剩餘天賦點數：{prog.talentPoints}</div>

              <div className="tvm-tree">
                {tree.map((node, i) => {
                  const isAllocated = allocated.includes(node.id)
                  const isAvailable = !isAllocated && isTalentNodeAvailable(tree, node, allocated, prog.level)
                  const isMajor = node.kind === 'major' || node.kind === 'mastery'
                  const requiredLevel = requiredLevelForTier(node.tier)
                  return (
                    <div key={node.id} className="tvm-node-row">
                      {i > 0 && <div className={`tvm-node-connector${isAllocated ? ' lit' : ''}`} />}
                      <button
                        className={`tvm-node${isMajor ? ' tvm-node-keystone' : ''}${isAllocated ? ' allocated' : ''}${isAvailable ? ' available' : ' locked'}`}
                        onClick={() => (isAvailable ? setTalentPendingNode(node) : undefined)}
                        disabled={!isAvailable}
                      >
                        <div className="tvm-node-name">{node.kind === 'mastery' ? '👑 ' : isMajor ? '⭐ ' : ''}{node.name}</div>
                        <div className="tvm-node-desc">{node.desc}</div>
                        {prog.level < requiredLevel && (
                          <div className="tvm-node-lockhint">需角色等級 {requiredLevel}</div>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>

              {talentPendingNode && (
                <div className="tvm-confirm">
                  <div className="tvm-confirm-text">花費 {pointCostForKind(talentPendingNode.kind)} 點天賦點數點亮「{talentPendingNode.name}」？</div>
                  <div className="tvm-confirm-btns">
                    <button className="ghost" onClick={() => setTalentPendingNode(null)}>取消</button>
                    <button className="primary" onClick={() => confirmAllocate(talentPendingNode)}>確認</button>
                  </div>
                </div>
              )}

              <button className="ghost" style={{ marginTop: 8, width: '100%' }}
                onClick={() => { setTalentViewHero(null); setTalentPendingNode(null) }}>關閉</button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
