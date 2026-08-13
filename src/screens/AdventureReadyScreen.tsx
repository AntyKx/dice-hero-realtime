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
import { getChapterTotalStars, getChapterMaxStars } from '../campaign/campaignProgress'
import { CAMPAIGN_ID_FOREST_RUINS } from '../campaign/campaignTypes'
import { getPlayerName } from '../scoring'
import CompendiumScreen from './CompendiumScreen'
import type { User } from '../lib/firebase'

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
  /** 大廳版面（2026-08 ASTERVOW 改版）「英雄與裝備」磚塊入口，導向 EquipmentScreen。 */
  onOpenEquipment: () => void
  /** 大廳右上抽屜選單（2026-08）的雲端存檔入口，跟原本 MainMenuScreen 用同一組 Firebase 帳號狀態。 */
  user: User | null
  cloudMsg: string
  onSignIn: () => void
  onSignOut: () => void
  onCloudSave: () => void
  onCloudLoad: () => void
}

type ModeTab = 'main' | 'dungeon'
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

/** 大廳章節輪播（2026-08）：森林遺跡有真實的固定關卡星數進度，
 * 裂隙前兆篇/深海遺城篇目前仍是即時制 Roguelite 隨機章節，沒有逐關進度
 * 可顯示，卡片上只給類型說明，不能假造星數/進度條。 */
const LOBBY_CHAPTERS: { pick: CampaignPick; icon: string; name: string; color: string; sub: string }[] = [
  { pick: 'main',       icon: '🌲', name: '森林遺跡',   color: '#e9b85c', sub: '灰燼王國篇・20 關固定式主線' },
  { pick: 'rift_omen',  icon: '🌌', name: '裂隙前兆篇', color: '#8fa6e6', sub: '星蝕・空間裂隙・異界侵略' },
  { pick: 'deep_sea',   icon: '🌊', name: '深海遺城篇', color: '#6fc0d8', sub: '氧氣・潮汐・深壓・亂流' },
]

export default function AdventureReadyScreen({
  meta, onStart, onSetFateLevel, onMetaUpdate, onBack, onLeaderboard, onOpenCampaignMap, onOpenEquipment,
  user, cloudMsg, onSignIn, onSignOut, onCloudSave, onCloudLoad,
}: Props) {
  const [modeTab, setModeTab]           = useState<ModeTab>('main')
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [showCloud, setShowCloud]       = useState(false)
  const [showCompendium, setShowCompendium] = useState(false)
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
    // 灰燼王國篇（campaignPick === 'main'）2026-08 改為森林遺跡固定式主線
    // 關卡入口，不再是即時制 Roguelite 隨機章節，所以走 onOpenCampaignMap
    // 而不是 onStart；裂隙前兆篇/深海遺城篇維持原本的 Roguelite 流程。
    if (modeTab === 'main' && campaignPick === 'main') {
      onOpenCampaignMap(heroId)
    } else if (modeTab === 'main') {
      onStart({ campaign: campaignPick, heroId, routeType: selectedRoute })
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

  // 大廳英雄站台（2026-08）：預設顯示第一位英雄當背景預覽，實際「出戰選擇」
  // 仍然是 selectedHeroId（未選擇時出發按鈕維持 disabled，行為不變）。
  const stageHero = HEROES.find(h => h.id === selectedHeroId) ?? HEROES[0]
  const stageProg = meta.heroProgress[stageHero.id]
  const stageStars = stageProg?.stars ?? 0
  const stageDisplayName = stageStars > 0 ? (getHeroStarTitle(stageHero.id, stageStars) ?? stageHero.name) : stageHero.name
  const stageRm = ROLE_META[stageHero.role]

  const chapterIdx = LOBBY_CHAPTERS.findIndex(c => c.pick === campaignPick)
  const activeChapter = LOBBY_CHAPTERS[chapterIdx] ?? LOBBY_CHAPTERS[0]
  const cycleChapter = (dir: 1 | -1) => {
    const next = (chapterIdx + dir + LOBBY_CHAPTERS.length) % LOBBY_CHAPTERS.length
    setCampaignPick(LOBBY_CHAPTERS[next].pick)
  }
  const chapterStars = activeChapter.pick === 'main' ? getChapterTotalStars(meta, CAMPAIGN_ID_FOREST_RUINS) : null
  const chapterMaxStars = activeChapter.pick === 'main' ? getChapterMaxStars(CAMPAIGN_ID_FOREST_RUINS) : null
  const chapterEnterLabel = activeChapter.pick === 'main' ? '查看關卡地圖' : '出發！'

  // 玩家資訊列/抽屜的「等級」用真實的全英雄總星數代替（沒有帳號等級系統，
  // 不能為了配 mockup 的 "LV.12" 造一個假數字），總星數本來就是遊戲內
  // 既有的英雄星級概念，跟星等稱號/星塵拿法同一套邏輯，是真實資料。
  const totalStars = Object.values(meta.heroProgress).reduce((sum, p) => sum + (p?.stars ?? 0), 0)

  return (
    <div className="ar-screen">
      {/* 主線冒險分頁：改成大廳版面的玩家資訊列（左上頭像+暱稱+總星數／
          右上資源+選單），取代原本的品牌列+返回鍵——回首頁改放進右側抽屜
          選單（見下方 av-drawer），跟使用者提供的 mockup 版面一致。地城
          副本分頁維持原本的品牌列+返回鍵不變。 */}
      {modeTab === 'main' ? (
        <header className="av-lobby-topbar">
          <button className="av-lobby-player-chip" onClick={() => setDrawerOpen(true)} aria-label="開啟玩家選單">
            <span className="av-lobby-player-avatar" aria-hidden="true">👤</span>
            <span className="av-lobby-player-info">
              <b>{getPlayerName()}</b>
              <small>★ {totalStars} 總星數</small>
            </span>
          </button>
          <div className="av-lobby-toolbar">
            {meta.gold > 0 && <span className="mm-gold-badge">💰 {meta.gold}</span>}
            {meta.stardust > 0 && <span className="mm-stardust-badge">⭐ {meta.stardust}</span>}
            <button className="av-glass-btn av-lobby-menu-btn" onClick={() => setDrawerOpen(true)} aria-label="開啟選單">☰</button>
          </div>
        </header>
      ) : (
        <header className="topbar">
          <div>
            <div className="eyebrow av-wordmark" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="av-sigil" style={{ width: 16, height: 16 }} aria-hidden="true"><span /><i /></span>
              ASTER<b>VOW</b>
            </div>
            <h1>遠征準備</h1>
          </div>
          <button className="ghost" onClick={onBack}>← 返回</button>
        </header>
      )}

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
        </div>
      )}

      {/* ── 主線冒險：大廳版面（2026-08 ASTERVOW 改版）── 英雄站台＋章節輪播
          ＋功能磚，取代原本的左右兩欄選項清單。地城副本分頁維持原本的清單式
          版面（見下方 modeTab === 'dungeon' 分支），兩者邏輯完全共用既有的
          selectedHeroId/canStart/fireStart，只有主線這邊改了呈現方式。 */}
      {modeTab === 'main' && (
        <div className="av-lobby">
          {/* 英雄站台：用現有的長方形立繪重新排版，取代 mockup 原本要求的
              去背全身立繪（本專案沒有這類素材，見任務討論）。 */}
          <div className="av-lobby-stage">
            <button
              className="av-lobby-stage-art"
              style={stageRm ? { boxShadow: `0 0 32px ${stageRm.color}33` } : undefined}
              onClick={() => handleHeroClick(stageHero)}
              aria-label={`查看 ${stageHero.name} 詳情`}
            >
              {stageHero.portrait
                ? <img src={stageHero.portrait} alt={stageHero.name} />
                : <SpriteAnimator sprite={getHeroSprite(stageHero, stageStars)} state="idle" scale={2} />}
              <div className="av-lobby-stage-scrim" />
              <div className="av-lobby-stage-caption">
                <div className="av-lobby-stage-name">
                  {stageDisplayName}
                  {stageStars > 0 && <span className="av-lobby-stage-star">{'★'.repeat(stageStars)}</span>}
                </div>
                <div className="av-lobby-stage-sub">
                  {stageHero.title}{stageProg && stageProg.level > 1 ? ` · Lv${stageProg.level}` : ''}
                </div>
              </div>
            </button>

            <div className="av-lobby-stage-switcher" role="tablist" aria-label="選擇出戰英雄">
              {HEROES.map(hero => {
                const prog = meta.heroProgress[hero.id]
                const stars = prog?.stars ?? 0
                const sprite = getHeroSprite(hero, stars)
                const scale = 40 / sprite.frameHeight
                const active = stageHero.id === hero.id
                const rm = ROLE_META[hero.role]
                return (
                  <button
                    key={hero.id}
                    className={`av-lobby-switch-btn${active ? ' active' : ''}`}
                    style={active && rm ? { borderColor: rm.color, boxShadow: `0 0 10px ${rm.color}55` } : undefined}
                    onClick={() => setSelectedHeroId(hero.id)}
                    aria-label={hero.name}
                    aria-selected={active}
                  >
                    <SpriteAnimator sprite={sprite} state="idle" scale={scale} />
                  </button>
                )
              })}
            </div>
            {!selectedHeroId && <p className="ar-hero-hint">點選下方頭像出戰；點擊立繪可預覽完整詳情</p>}
          </div>

          {/* 章節輪播：森林遺跡有真實固定關卡星數進度，其餘兩篇仍是即時制
              Roguelite 隨機章節，卡片不假造進度，只給類型說明。 */}
          <div className="av-lobby-chapter">
            <button className="av-lobby-chapter-nav" onClick={() => cycleChapter(-1)} aria-label="上一篇章">‹</button>
            <div className="av-lobby-chapter-card" style={{ borderColor: activeChapter.color + '55' }}>
              <div className="av-lobby-chapter-icon">{activeChapter.icon}</div>
              <div className="av-lobby-chapter-name">{activeChapter.name}</div>
              <div className="av-lobby-chapter-sub">{activeChapter.sub}</div>
              {chapterStars !== null ? (
                <div className="av-lobby-chapter-progress">
                  <div className="av-lobby-chapter-progress-bar">
                    <div className="av-lobby-chapter-progress-fill" style={{ width: `${Math.min(100, (chapterStars / (chapterMaxStars || 1)) * 100)}%`, background: activeChapter.color }} />
                  </div>
                  <span>⭐ {chapterStars}/{chapterMaxStars}</span>
                </div>
              ) : (
                <div className="av-lobby-chapter-progress-note">隨機生成關卡・無固定進度</div>
              )}
              <button
                className="av-cta-btn av-lobby-chapter-enter"
                disabled={!selectedHeroId}
                onClick={() => selectedHeroId && fireStart(selectedHeroId)}
              >
                {selectedHeroId ? chapterEnterLabel : '請先選擇英雄'}
              </button>
            </div>
            <button className="av-lobby-chapter-nav" onClick={() => cycleChapter(1)} aria-label="下一篇章">›</button>
          </div>

        </div>
      )}

      {/* ── 底部導覽（僅主線冒險分頁）：跟 mockup 一致的固定式底部導覽，
          是大廳唯一的跨功能導覽入口（原本另外有一列功能磚，跟這裡的
          地城/英雄/裝備重複，使用者反映「入口重複」後拿掉了，避免同一個
          功能兩個地方都能點）。排行榜是每個地城副本各自的榜單，本來就
          跟地城資料綁在一起，改成只留在地城副本分頁裡原有的排行榜按鈕。 ── */}
      {modeTab === 'main' && (
        <nav className="av-lobby-dock" aria-label="大廳導覽">
          <button className="av-lobby-dock-btn active" aria-label="大廳">
            <span aria-hidden="true">🧭</span>
            <span>大廳</span>
          </button>
          {FEATURE_FLAGS.dungeons && (
            <button className="av-lobby-dock-btn" onClick={() => setModeTab('dungeon')} aria-label="地城副本">
              <span aria-hidden="true">🏰</span>
              <span>地城</span>
            </button>
          )}
          <button
            className="av-lobby-dock-btn av-lobby-dock-primary"
            disabled={!selectedHeroId}
            onClick={() => selectedHeroId && fireStart(selectedHeroId)}
            aria-label="開始"
          >
            <span aria-hidden="true">✨</span>
            <span>開始</span>
          </button>
          <button className="av-lobby-dock-btn" onClick={() => handleHeroClick(stageHero)} aria-label="英雄">
            <span aria-hidden="true">👥</span>
            <span>英雄</span>
          </button>
          {FEATURE_FLAGS.equipment && (
            <button className="av-lobby-dock-btn" onClick={onOpenEquipment} aria-label="英雄與裝備">
              <span aria-hidden="true">🛡️</span>
              <span>裝備</span>
            </button>
          )}
        </nav>
      )}

      {/* ── 地城副本：維持原本的清單式版面（左：地城清單／右：英雄選擇） ── */}
      {modeTab === 'dungeon' && (
        <div className="ar-body">
          <div className="ar-options">
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
      )}

      {/* ── 出發按鈕（僅地城副本分頁——主線冒險的出發入口在章節卡片內） ── */}
      {modeTab === 'dungeon' && (
        <div className="ar-footer">
          <button
            className="primary ar-start-btn"
            disabled={!canStart}
            onClick={handleStart}
          >
            {!selectedHeroId
              ? '請先在右側選擇英雄'
              : !selectedDungeonId
              ? '請選擇地城'
              : '出發！'}
          </button>
        </div>
      )}

      {/* ── 右側抽屜選單（2026-08，僅主線冒險分頁會開啟）：品牌列+關閉、
          玩家資訊、禮物與郵件／星界圖鑑／雲端存檔／遊戲設定、回到首頁。
          禮物與郵件、遊戲設定目前沒有對應的真實系統，比照 MainMenuScreen
          既有的「成就（即將推出）」慣例標示即將推出，不假造內容；星界
          圖鑑／雲端存檔／回到首頁都是真實功能。 ── */}
      {drawerOpen && (
        <div className="av-drawer-overlay" role="dialog" aria-modal="true">
          <button className="av-drawer-scrim" aria-label="關閉選單" onClick={() => setDrawerOpen(false)} />
          <aside className="av-drawer">
            <div className="av-drawer-header">
              <div className="av-wordmark" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' }}>
                <span className="av-sigil" style={{ width: 16, height: 16 }} aria-hidden="true"><span /><i /></span>
                ASTER<b>VOW</b>
              </div>
              <button className="ghost av-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="關閉">✕</button>
            </div>

            <div className="av-drawer-profile">
              <span className="av-lobby-player-avatar" aria-hidden="true">👤</span>
              <span className="av-lobby-player-info">
                <b>{getPlayerName()}</b>
                <small>★ {totalStars} 總星數</small>
              </span>
            </div>

            <div className="av-drawer-list">
              <button className="av-drawer-item" disabled aria-label="禮物與郵件（即將推出）">
                <span aria-hidden="true">🎁</span>
                <span>禮物與郵件</span>
                <span className="av-drawer-item-tag">即將推出</span>
              </button>
              <button className="av-drawer-item" onClick={() => { setDrawerOpen(false); setShowCompendium(true) }}>
                <span aria-hidden="true">📖</span>
                <span>星界圖鑑</span>
                <span className="av-drawer-item-arrow">›</span>
              </button>
              <button className="av-drawer-item" onClick={() => { setDrawerOpen(false); setShowCloud(true) }}>
                <span aria-hidden="true">☁️</span>
                <span>雲端存檔</span>
                <span className="av-drawer-item-arrow">›</span>
              </button>
              <button className="av-drawer-item" disabled aria-label="遊戲設定（即將推出）">
                <span aria-hidden="true">⚙️</span>
                <span>遊戲設定</span>
                <span className="av-drawer-item-tag">即將推出</span>
              </button>
            </div>

            <div className="av-drawer-footer">
              <button className="ghost" onClick={() => { setDrawerOpen(false); onBack() }}>↩ 回到首頁</button>
            </div>
          </aside>
        </div>
      )}

      {/* ── 雲端存檔面板（從抽屜選單開啟，跟 MainMenuScreen 共用同一組
          Firebase 帳號狀態/callback，UI 沿用相同的 .cloud-panel 樣式） ── */}
      {showCloud && (
        <div className="mm-panel-overlay" onClick={() => setShowCloud(false)}>
          <div className="cloud-panel" onClick={e => e.stopPropagation()}>
            {!user ? (
              <button className="cloud-google-btn" onClick={onSignIn}>
                <img src="https://www.google.com/favicon.ico" width={18} height={18} alt="" />
                使用 Google 帳號登入
              </button>
            ) : (
              <>
                <div className="cloud-user-row">
                  {user.photoURL && <img src={user.photoURL} width={28} height={28} className="cloud-avatar" alt="" />}
                  <span className="cloud-username">{user.displayName}</span>
                  <button className="cloud-signout" onClick={onSignOut}>登出</button>
                </div>
                <div className="cloud-uid" title="點擊複製" onClick={() => navigator.clipboard?.writeText(user.uid)}>
                  UID: {user.uid}
                </div>
                <div className="cloud-actions">
                  <button className="primary cloud-btn" onClick={onCloudSave}>⬆ 上傳存檔</button>
                  <button className="ghost cloud-btn" onClick={onCloudLoad}>⬇ 下載存檔</button>
                </div>
                {cloudMsg && <div className="cloud-msg">{cloudMsg}</div>}
                <button className="ghost" style={{ marginTop: 8, width: '100%', fontSize: '0.85rem' }} onClick={() => setShowCloud(false)}>關閉</button>
              </>
            )}
          </div>
        </div>
      )}

      {showCompendium && <CompendiumScreen onClose={() => setShowCompendium(false)} />}

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
