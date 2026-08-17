import { useState } from 'react'
import type { RouteType, MetaState } from '../types'
import { HEROES, getHeroSprite, type Hero } from '../data'
import SpriteAnimator from '../components/SpriteAnimator'
import HeroPortraitModal from '../components/HeroPortraitModal'
import { DUNGEON_DEFS, DIFFICULTY_CONFIG, type DungeonDifficulty, type DungeonDef } from '../dungeon'
import { getHeroStarTitle, computeTalentBonus, defaultHeroProgress } from '../talents'
import { computeEquipBonus, getEquippedItems } from '../equipment'
import type { Equipment } from '../types'
import { FEATURE_FLAGS } from '../featureFlags'
import { generateHeroTalentTree, isTalentNodeAvailable, pointCostForKind, requiredLevelForTier, type ArenaTalentNode } from '../arena/arenaTalents'
import { CAMPAIGN_ID_FOREST_RUINS, type StageObjectiveType } from '../campaign/campaignTypes'
import { getPlayerName } from '../scoring'
import CompendiumScreen from './CompendiumScreen'
import type { User } from '../lib/firebase'
import { sanitizeParty, replacePartySlot, getPartyHeroIds } from '../party'
import { getChapterStages, getCampaignStage } from '../campaign/campaignStages'
import { getStageProgress, isStageUnlocked } from '../campaign/campaignProgress'
import { CAMPAIGN_CHAPTER_META } from '../campaign/campaignChapterMeta'
import { StarRow } from './CampaignMapScreen'
import AsterVowIcon, { type AsterVowIconName } from '../components/AsterVowIcon'
import { CHAPTER_ICON, getDungeonIcon, ROLE_ICON_META } from '../iconMeta'
import { EQUIPMENT_SLOT_ICON, EQUIPMENT_SLOT_ICON_COLOR } from '../equipmentIconMeta'

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
  /** 森林遺跡固定式主線關卡（2026-08）入口——選好出戰英雄後導向 SagaSelectScreen，跟 onStart（Roguelite/副本）分開。 */
  onOpenCampaignMap: (heroId: string) => void
  /** 大廳關卡預覽卡「出發」直接開打目前預覽中的那一關（2026-08-17），不用先繞去選篇/選章/點地圖節點。 */
  onStartCampaignStage: (heroId: string, stageId: string) => void
  /** 大廳版面（2026-08 ASTERVOW 改版）「英雄與裝備」磚塊入口，導向 EquipmentScreen。 */
  onOpenEquipment: () => void
  /** 倉庫（2026-08，取代底部導覽的「英雄」）入口，導向 WarehouseScreen。 */
  onOpenWarehouse: () => void
  /** 出戰陣容編成（2026-08，見 src/party.ts）：點 3-slot 隊伍列的格子時開全頁編成畫面。 */
  onOpenPartySetup: (slot: 0 | 1 | 2) => void
  /** 星界商城（2026-08-14，見 AstralShopScreen.tsx）入口，UI 原型，沒有真實商城後端。 */
  onOpenShop: () => void
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

/** 大廳章節輪播（2026-08，2026-08-17 補上 sagaLabel/defaultChapterName）：
 * 三個輪播位置其實對應 CAMPAIGN_SAGAS 的三篇（灰燼王國篇/裂隙前兆篇/深海
 * 遺城篇）——sagaLabel 給 CHAPTER N 標籤帶出篇名（「CHAPTER 2 · 裂隙前兆篇」
 * 這種格式），defaultChapterName 是還沒有逐關資料可追蹤時要顯示的「代表
 * 章節」（裂隙前兆篇/深海遺城篇目前仍是即時制 Roguelite 隨機章節，沒有
 * 像森林遺跡那樣的 lastPlayedStageId 可用，固定顯示各篇第一章）。bgImage
 * 是 2026-08-14 補的大廳關卡預覽圖（16:9），只有 main 這個位置會被
 * previewCampaignMeta.lobbyCover 動態蓋掉，rift_omen/deep_sea 維持固定圖。 */
const LOBBY_CHAPTERS: { pick: CampaignPick; icon: AsterVowIconName; name: string; sagaLabel: string; defaultChapterName: string; color: string; sub: string; bgImage: string }[] = [
  { pick: 'main',       icon: CHAPTER_ICON.main,      name: '森林遺跡',   sagaLabel: '灰燼王國篇',   defaultChapterName: '森林遺跡', color: '#e9b85c', sub: '灰燼王國篇・固定式主線', bgImage: '/assets/backgrounds/lobby_preview_2026_08/forest_ruins.jpg' },
  { pick: 'rift_omen',  icon: CHAPTER_ICON.rift_omen, name: '裂隙前兆篇', sagaLabel: '裂隙前兆篇',   defaultChapterName: '破碎天幕', color: '#8fa6e6', sub: '星蝕・空間裂隙・異界侵略', bgImage: '/assets/backgrounds/lobby_preview_2026_08/rift_omen.jpg' },
  { pick: 'deep_sea',   icon: CHAPTER_ICON.deep_sea,  name: '深海遺城篇', sagaLabel: '深海遺城篇',   defaultChapterName: '珊瑚淺灘', color: '#6fc0d8', sub: '氧氣・潮汐・深壓・亂流', bgImage: '/assets/backgrounds/lobby_preview_2026_08/deep_sea.jpg' },
]

/** 地城副本瀏覽順序（2026-08-14）：跟舊版清單式 UI 的 DG_GROUPS 分組順序
 * 一致（灰燼王國篇→裂隙前兆篇→深海遺城篇），只是攤平成一個線性陣列，
 * 供大廳統一卡片版面左右切換用，不再用可展開/收合的分組清單。 */
const DUNGEON_BROWSE_ORDER: string[] = ['burning_throne', 'ash_covenant', 'star_eclipse', 'black_tide']

/** 地城副本大廳預覽圖（2026-08-14，16:9），跟上面 LOBBY_CHAPTERS.bgImage
 * 同一批素材，取代純 CSS 漸層色塊當背景。 */
const DUNGEON_BG_IMAGE: Record<string, string> = {
  burning_throne: '/assets/backgrounds/lobby_preview_2026_08/burning_throne.jpg',
  ash_covenant: '/assets/backgrounds/lobby_preview_2026_08/ash_covenant.jpg',
  star_eclipse: '/assets/backgrounds/lobby_preview_2026_08/star_eclipse.jpg',
  black_tide: '/assets/backgrounds/lobby_preview_2026_08/black_tide.jpg',
}

/** 森林遺跡關卡預覽卡（2026-08）：目標類型的文字/icon 對照，跟
 * CampaignMapScreen.tsx 的 OBJECTIVE_LABEL 同一份資料，但 icon 換成
 * AsterVowIcon（大廳明確要求不用 emoji）。 */
const OBJECTIVE_LABEL: Record<StageObjectiveType, string> = {
  elimination: '殲滅', survival: '生存', defense: '防守', hunt: '狩獵',
  destroy: '破壞', collection: '收集', escape: '逃脫', boss: 'BOSS',
}
const OBJECTIVE_ICON_NAME: Record<StageObjectiveType, AsterVowIconName> = {
  elimination: 'stage-elimination', survival: 'stage-survival', defense: 'stage-defense', hunt: 'stage-hunt',
  destroy: 'stage-destroy', collection: 'stage-collection', escape: 'stage-escape', boss: 'stage-boss',
}

export default function AdventureReadyScreen({
  meta, onStart, onSetFateLevel, onMetaUpdate, onBack, onOpenCampaignMap, onStartCampaignStage, onOpenEquipment, onOpenWarehouse, onOpenPartySetup, onOpenShop,
  user, cloudMsg, onSignIn, onSignOut, onCloudSave, onCloudLoad,
}: Props) {
  const [modeTab, setModeTab]           = useState<ModeTab>('main')
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [showCloud, setShowCloud]       = useState(false)
  const [showCompendium, setShowCompendium] = useState(false)
  const [campaignPick, setCampaignPick] = useState<CampaignPick>('main')
  const [selectedRoute, setSelectedRoute] = useState<RouteType>('risk')
  const [selectedDifficulty, setSelectedDifficulty] = useState<DungeonDifficulty>('normal')
  const [portraitHero, setPortraitHero]     = useState<Hero | null>(null)
  const [talentViewHero, setTalentViewHero] = useState<Hero | null>(null)
  const [equipViewHero, setEquipViewHero]   = useState<Hero | null>(null)
  const [talentPendingNode, setTalentPendingNode] = useState<ArenaTalentNode | null>(null) // 點了還沒確認花費的節點

  // 出戰陣容（2026-08，見 src/party.ts）：隊長＝目前實際出戰的英雄，跟原本
  // 「選英雄」是同一件事（使用者確認過要合一，不要拆成兩套機制）——
  // selectedHeroId 現在直接從 meta.party.leaderId 衍生，恆有值（預設
  // HEROES[0]），不再是 null，大廳一進來就有預設出戰英雄，不用每次手動選。
  const allHeroIds = HEROES.map(h => h.id)
  const party = sanitizeParty(meta.party, allHeroIds, HEROES[0].id)
  const selectedHeroId = party.leaderId
  const setLeaderId = (heroId: string) => {
    onMetaUpdate(m => ({ ...m, party: replacePartySlot(sanitizeParty(m.party, allHeroIds, heroId), 0, heroId) }))
  }

  // 固定式主線關卡預覽卡（2026-08，2026-08-17 改成跨九個篇章通用）：大廳
  // 章節輪播的「森林遺跡」分支換成單關卡預覽，預設顯示「最後一次打的那一
  // 關」（見 meta.lastPlayedStageId，不管陣亡或過關都會更新），完全沒玩過
  // 時 fallback 回森林遺跡第一個「已解鎖但尚未通關」的關卡。左右切換只在
  // 目前這個篇章的關卡陣列範圍內移動，不會跨篇章、不循環繞回；鎖定中的
  // 關卡仍可預覽（顯示鎖頭+解鎖條件），只是不能真正進入。
  const lastPlayedStage = meta.lastPlayedStageId ? getCampaignStage(meta.lastPlayedStageId) : undefined
  const previewCampaignId = lastPlayedStage?.campaignId ?? CAMPAIGN_ID_FOREST_RUINS
  const previewCampaignStages = getChapterStages(previewCampaignId)
  const previewCampaignMeta = CAMPAIGN_CHAPTER_META[previewCampaignId]
  const [previewStageId, setPreviewStageId] = useState<string>(() => {
    if (lastPlayedStage) return lastPlayedStage.id
    const firstOpen = previewCampaignStages.find(s => isStageUnlocked(meta, s.id) && !getStageProgress(meta, s.id).cleared)
    return (firstOpen ?? previewCampaignStages[previewCampaignStages.length - 1]).id
  })
  const previewStageIdx = Math.max(0, previewCampaignStages.findIndex(s => s.id === previewStageId))
  const previewStage = previewCampaignStages[previewStageIdx] ?? previewCampaignStages[0]
  const previewProg = getStageProgress(meta, previewStage.id)
  const previewUnlocked = isStageUnlocked(meta, previewStage.id)
  const cyclePreviewStage = (dir: 1 | -1) => {
    const next = previewStageIdx + dir
    if (next < 0 || next >= previewCampaignStages.length) return
    setPreviewStageId(previewCampaignStages[next].id)
  }

  const isDungeonUnlocked = (d: { minLevel?: number; requireCampaign?: string }) => {
    if (d.requireCampaign && !meta.campaignCleared?.[d.requireCampaign]) return false
    if (!d.minLevel) return true
    return HEROES.some(h => (meta.heroProgress[h.id]?.level ?? 1) >= d.minLevel!)
  }

  // 地城副本預覽（2026-08-14）：跟森林遺跡關卡預覽同一套模式——大廳統一用
  // 卡片版面瀏覽，不再切到另一個清單畫面。預設停在第一個已解鎖的地城，
  // 全部鎖定時停在第一個（讓玩家看到鎖定條件）。
  const browseDungeons = DUNGEON_BROWSE_ORDER.map(id => DUNGEON_DEFS.find(d => d.id === id)).filter((d): d is DungeonDef => !!d)
  const [selectedDungeonId, setSelectedDungeonId] = useState<string>(() => {
    const firstUnlocked = browseDungeons.find(isDungeonUnlocked)
    return (firstUnlocked ?? browseDungeons[0]).id
  })
  const dungeonIdx = Math.max(0, browseDungeons.findIndex(d => d.id === selectedDungeonId))
  const currentDungeon = browseDungeons[dungeonIdx] ?? browseDungeons[0]
  const currentDungeonUnlocked = isDungeonUnlocked(currentDungeon)
  const cyclePreviewDungeon = (dir: 1 | -1) => {
    const next = dungeonIdx + dir
    if (next < 0 || next >= browseDungeons.length) return
    setSelectedDungeonId(browseDungeons[next].id)
  }

  const canStart = modeTab !== 'dungeon' || currentDungeonUnlocked

  const handleHeroClick = (hero: Hero) => {
    if (hero.portrait) {
      setPortraitHero(hero)
    } else {
      setLeaderId(hero.id)
    }
  }

  const handlePortraitSelect = (heroId: string) => {
    setLeaderId(heroId)
    setPortraitHero(null)
  }

  const handlePortraitStart = (heroId: string) => {
    setLeaderId(heroId)
    setPortraitHero(null)
    // auto-start if ready
    if (modeTab !== 'dungeon' || currentDungeonUnlocked) {
      fireStart(heroId)
    }
  }

  const fireStart = (heroId: string) => {
    // 灰燼王國篇（campaignPick === 'main'）2026-08 改為固定式主線關卡入口，
    // 不再是即時制 Roguelite 隨機章節；2026-08-17 起「出發」直接開打目前
    // 預覽中的那一關（跟地城副本 CTA 同樣語意），查看完整地圖改成點 CHAPTER
    // 標籤（見 onOpenCampaignMap 呼叫點）。裂隙前兆篇/深海遺城篇（舊
    // LOBBY_CHAPTERS 分支）維持原本的 Roguelite 流程不變。
    if (modeTab === 'main' && campaignPick === 'main') {
      if (previewUnlocked) onStartCampaignStage(heroId, previewStage.id)
    } else if (modeTab === 'main') {
      onStart({ campaign: campaignPick, heroId, routeType: selectedRoute })
    } else if (currentDungeonUnlocked) {
      onStart({ campaign: 'dungeon', heroId, dungeonId: currentDungeon.id, difficulty: selectedDifficulty })
    }
  }

  const handleStart = () => {
    if (!canStart) return
    fireStart(selectedHeroId)
  }

  const portraitHeroId = portraitHero?.id
  const portraitProg   = portraitHeroId ? meta.heroProgress[portraitHeroId] : undefined
  const portraitEquip  = portraitHeroId ? getEquippedItems(meta.inventory, meta.loadouts?.[portraitHeroId]) : []
  const portraitEqB    = computeEquipBonus(portraitEquip)
  const portraitTalB   = portraitHeroId ? computeTalentBonus(portraitHeroId, meta.heroProgress[portraitHeroId] ?? { level: 1, exp: 0, wins: 0, stars: 0, selectedTalents: {} }) : { hpBonus: 0, defBonus: 0 }

  // 大廳底部導覽「英雄」按鈕沿用既有立繪 Modal 入口，指向目前出戰隊長。
  const stageHero = HEROES.find(h => h.id === selectedHeroId) ?? HEROES[0]

  const chapterIdx = LOBBY_CHAPTERS.findIndex(c => c.pick === campaignPick)
  const activeChapter = LOBBY_CHAPTERS[chapterIdx] ?? LOBBY_CHAPTERS[0]
  const cycleChapter = (dir: 1 | -1) => {
    const next = (chapterIdx + dir + LOBBY_CHAPTERS.length) % LOBBY_CHAPTERS.length
    setCampaignPick(LOBBY_CHAPTERS[next].pick)
  }
  const chapterEnterLabel = activeChapter.pick === 'main' ? '查看關卡地圖' : '出發！'

  // 玩家資訊列/抽屜的「等級」用真實的全英雄總星數代替（沒有帳號等級系統，
  // 不能為了配 mockup 的 "LV.12" 造一個假數字），總星數本來就是遊戲內
  // 既有的英雄星級概念，跟星等稱號/星塵拿法同一套邏輯，是真實資料。
  const totalStars = Object.values(meta.heroProgress).reduce((sum, p) => sum + (p?.stars ?? 0), 0)

  return (
    <div className="ar-screen">
      {/* 玩家資訊列（左上頭像+暱稱+總星數／右上資源+選單），主線冒險／地城
          副本兩個分頁共用同一條，不再各自有一條分頁切換列——切換模式統一
          走下面的四宮格捷徑磚＋底部導覽，「返回」永遠只有兩種明確語意：
          抽屜選單「↩ 回到首頁」（離開大廳）跟四宮格/底部導覽的「大廳」
          （回到主線冒險），不會再有分頁自己的返回鍵跳過大廳直接回首頁。 */}
      <header className="av-lobby-topbar">
        <button className="av-lobby-player-chip" onClick={() => setDrawerOpen(true)} aria-label="開啟玩家選單">
          <span className="av-lobby-player-avatar" aria-hidden="true"><AsterVowIcon name="system-player" size={22} /></span>
          <span className="av-lobby-player-info">
            <b>{getPlayerName()}</b>
            <small>★ {totalStars} 總星數</small>
          </span>
        </button>
        <div className="av-lobby-toolbar">
          {meta.gold > 0 && <span className="mm-gold-badge"><AsterVowIcon name="system-gold" size={15} /> {meta.gold}</span>}
          <span className="mm-stardust-badge"><AsterVowIcon name="system-stardust" size={15} /> {meta.stardust}</span>
          <button className="av-glass-btn av-lobby-menu-btn" onClick={() => setDrawerOpen(true)} aria-label="開啟選單"><AsterVowIcon name="nav-menu" size={20} /></button>
        </div>
      </header>

      {/* ── 大廳統一版面（2026-08-14 v4）：主線冒險／地城副本共用同一套
          「大圖預覽卡＋章節切換卡＋資訊列＋CTA＋四宮格」版面，只有卡片
          內容依 modeTab 換掉，不再各自有獨立的畫面（使用者反饋：地城
          副本點進去也要用主線那套呈現方式，都在大廳完成，不要切到另一個
          入口）。舊版地城副本清單式版面（.ar-body 兩欄式）已整個移除。 */}
      <div className="av-lobby">
          {/* 大廳首屏核心 v3（2026-08-14）：大圖預覽卡（先留素面背景，真實
              關卡插畫之後補）＋右上角出戰陣容小圓鈕＋地圖上緩慢走動的英雄
              小模組；下方另外是章節切換卡（含分頁圓點）、關卡資訊列、CTA、
              最後是四宮格捷徑磚，整段版面依序把首屏空間都用上，取代 v2
              把所有資訊硬疊在同一張卡片上的做法。 */}
          <div
            className="av-lobby-map-card"
            style={
              {
                // 主線分頁（campaignPick === 'main'）背景改成「最後打的那個篇章」
                // 的專屬預覽圖（2026-08-17，見 CAMPAIGN_CHAPTER_META）——不是逐關
                // 換圖（試過改成逐關戰鬥場景圖，畫面太素被打回票），是跟著
                // lastPlayedStageId 換成對應篇章（森林遺跡/雪原/魔王城/…）的那
                // 一張圖，同篇章內左右切換關卡時背景不變。裂隙前兆篇/深海遺城篇
                // 這兩個「舊 Roguelite 分頁」（LOBBY_CHAPTERS 的另外兩張卡）沒有
                // 逐關資料，維持原本整篇通用的 bgImage。
                backgroundImage: `linear-gradient(180deg, rgba(8,15,36,.25) 0%, rgba(8,15,36,.4) 55%, rgba(6,11,28,.9) 100%), url(${
                  modeTab === 'dungeon' ? DUNGEON_BG_IMAGE[currentDungeon.id]
                    : activeChapter.pick === 'main' ? previewCampaignMeta.lobbyCover
                    : activeChapter.bgImage
                })`,
              }
            }
          >
            {/* 出戰陣容（2026-08，見 src/party.ts）：右上角小圓鈕，點格子開
                全頁編成畫面；跟下面純裝飾的走動模組分開，是唯一的編成入口。 */}
            <div className="av-lobby-map-picons" role="group" aria-label="出戰陣容">
              {([0, 1, 2] as const).map(slot => {
                const heroId = slot === 0 ? party.leaderId : party.supportIds[slot - 1]
                const hero = HEROES.find(h => h.id === heroId)
                const rm = hero ? ROLE_ICON_META[hero.role] : null
                const label = slot === 0 ? '隊長' : `夥伴 ${slot}`
                const sprite = hero ? getHeroSprite(hero, meta.heroProgress[hero.id]?.stars ?? 0) : null
                const scale = sprite ? 34 / sprite.frameHeight : 1
                return (
                  <button
                    key={slot}
                    className={`av-lobby-map-picon${!hero ? ' empty' : ''}`}
                    style={hero && rm ? { borderColor: rm.color, boxShadow: `0 0 8px ${rm.color}66` } : undefined}
                    onClick={() => onOpenPartySetup(slot)}
                    aria-label={`編成－${label}`}
                  >
                    {hero && sprite ? (
                      <SpriteAnimator sprite={sprite} state="idle" scale={scale} idleFrame={0} />
                    ) : (
                      <span className="av-lobby-map-picon-plus" aria-hidden="true">＋</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* 純裝飾：地圖右下角站立的英雄小模組，跟右上角編成入口分開，不可
                點擊。原本是走動動畫＋分散在左下角，改成站立不動＋統一大小
                （使用者反饋：走動會互相穿越很醜、大小不一致）。 */}
            <div className="av-lobby-map-party-stand" aria-hidden="true">
              {getPartyHeroIds(party).map((heroId, i) => {
                const hero = HEROES.find(h => h.id === heroId)
                if (!hero) return null
                const sprite = getHeroSprite(hero, meta.heroProgress[hero.id]?.stars ?? 0)
                const scale = 50 / sprite.frameHeight
                return (
                  <div key={heroId} className={`av-lobby-map-stand-unit slot-${i}`}>
                    <SpriteAnimator sprite={sprite} state="idle" scale={scale} />
                  </div>
                )
              })}
            </div>

            <div className="av-lobby-map-caption">
              {modeTab === 'dungeon' ? (
                <span><AsterVowIcon name={getDungeonIcon(currentDungeon.id)} size={19} /> {currentDungeon.name}</span>
              ) : activeChapter.pick === 'main' ? (
                <span><AsterVowIcon name={previewCampaignMeta.iconName} size={19} /> {previewCampaignMeta.label}・第 {previewStage.stageNumber} 關</span>
              ) : (
                <span><AsterVowIcon name={activeChapter.icon} size={19} /> {activeChapter.name}</span>
              )}
            </div>
          </div>

          {/* 章節/地城切換卡＋分頁圓點：跟大圖預覽分開的獨立區塊，主線冒險
              左右切換 3 個篇章，地城副本左右切換 4 座地城，兩者共用同一套
              卡片＋圓點樣式，只是資料來源不同。 */}
          {modeTab === 'dungeon' ? (
            <>
              <div className="av-lobby-chaptercard">
                <button className="av-lobby-chaptercard-nav" disabled={dungeonIdx <= 0} onClick={() => cyclePreviewDungeon(-1)} aria-label="上一座地城">‹</button>
                <div className="av-lobby-chaptercard-body">
                  <div className="av-lobby-chaptercard-thumb" style={{ borderColor: currentDungeon.color + '66', background: currentDungeon.color + '18', color: currentDungeon.color }}>
                    <AsterVowIcon name={getDungeonIcon(currentDungeon.id)} size={32} />
                  </div>
                  <div className="av-lobby-chaptercard-text">
                    <div className="av-lobby-chaptercard-label">地城副本</div>
                    <div className="av-lobby-chaptercard-name">{currentDungeon.name}</div>
                    <div className="av-lobby-chaptercard-sub">{currentDungeon.subtitle}</div>
                  </div>
                </div>
                <button className="av-lobby-chaptercard-nav" disabled={dungeonIdx >= browseDungeons.length - 1} onClick={() => cyclePreviewDungeon(1)} aria-label="下一座地城">›</button>
              </div>
              <div className="av-lobby-chapterdots" role="tablist" aria-label="切換地城">
                {browseDungeons.map((d, i) => (
                  <button key={d.id} className={`av-lobby-chapterdot${i === dungeonIdx ? ' active' : ''}`}
                    onClick={() => setSelectedDungeonId(d.id)} aria-label={d.name} aria-selected={i === dungeonIdx} />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="av-lobby-chaptercard">
                <button className="av-lobby-chaptercard-nav" onClick={() => cycleChapter(-1)} aria-label="上一篇章">‹</button>
                {/* CHAPTER 標籤區塊本身變成入口（2026-08-17）：點它才會開「查看
                    關卡地圖」的完整篇/章/關三層選單，取代原本長在金色 CTA 按鈕
                    上的行為——CTA 按鈕現在永遠是直接開打目前預覽關卡的「出發」。
                    只有主線（campaignPick==='main'）有真正的地圖可看，裂隙前兆篇/
                    深海遺城篇（舊 Roguelite 隨機關卡）維持原樣不可點。 */}
                <div
                  className={`av-lobby-chaptercard-body${activeChapter.pick === 'main' ? ' clickable' : ''}`}
                  onClick={activeChapter.pick === 'main' ? () => onOpenCampaignMap(selectedHeroId) : undefined}
                  role={activeChapter.pick === 'main' ? 'button' : undefined}
                  aria-label={activeChapter.pick === 'main' ? '查看關卡地圖' : undefined}
                >
                  <div
                    className="av-lobby-chaptercard-thumb"
                    style={
                      activeChapter.pick === 'main'
                        ? { borderColor: previewCampaignMeta.color + '66', background: previewCampaignMeta.color + '18', color: previewCampaignMeta.color }
                        : { borderColor: activeChapter.color + '66', background: activeChapter.color + '18', color: activeChapter.color }
                    }
                  >
                    <AsterVowIcon name={activeChapter.pick === 'main' ? previewCampaignMeta.iconName : activeChapter.icon} size={32} />
                  </div>
                  <div className="av-lobby-chaptercard-text">
                    {/* CHAPTER 標籤帶出篇名（2026-08-17）：CHAPTER 1 · 灰燼王國篇／
                        CHAPTER 2 · 裂隙前兆篇／CHAPTER 3 · 深海遺城篇，三個位置統一
                        格式，不是只有主線才有篇名。 */}
                    <div className="av-lobby-chaptercard-label">CHAPTER {chapterIdx + 1} · {activeChapter.sagaLabel}{activeChapter.pick === 'main' && <span className="av-lobby-chaptercard-maphint"> · 查看地圖 ›</span>}</div>
                    <div className="av-lobby-chaptercard-name">{activeChapter.pick === 'main' ? previewCampaignMeta.label : activeChapter.defaultChapterName}</div>
                    <div className="av-lobby-chaptercard-sub">
                      {activeChapter.pick === 'main' ? previewStage.name : activeChapter.sub}
                    </div>
                  </div>
                </div>
                <button className="av-lobby-chaptercard-nav" onClick={() => cycleChapter(1)} aria-label="下一篇章">›</button>
              </div>
              <div className="av-lobby-chapterdots" role="tablist" aria-label="切換篇章">
                {LOBBY_CHAPTERS.map((c, i) => (
                  <button key={c.pick} className={`av-lobby-chapterdot${i === chapterIdx ? ' active' : ''}`}
                    onClick={() => setCampaignPick(c.pick)} aria-label={c.name} aria-selected={i === chapterIdx} />
                ))}
              </div>
            </>
          )}

          {/* 資訊列：地城副本顯示難度選擇＋獎勵預覽＋鎖定條件＋排行榜；森林
              遺跡分支顯示真實逐關資料（目標/時長/獎勵/星數/鎖定）；裂隙
              前兆篇/深海遺城篇沒有逐關資料，不假造。 */}
          {modeTab === 'dungeon' ? (
            <div className="av-lobby-stageinfo">
              {!currentDungeonUnlocked ? (
                <div className="av-lobby-stageinfo-row">
                  <span className="av-lobby-stageinfo-lock">
                    <AsterVowIcon name="system-lock" size={15} /> {currentDungeon.requireCampaign ? '需先通關灰燼王國篇' : `等級需求 Lv.${currentDungeon.minLevel}`}
                  </span>
                </div>
              ) : (
                <>
                  <div className="av-lobby-stageinfo-nav">
                    {(['normal', 'hero', 'legendary'] as DungeonDifficulty[]).map(dif => {
                      const cfg = DIFFICULTY_CONFIG[dif]
                      const isActive = selectedDifficulty === dif
                      return (
                        <button key={dif} className={isActive ? 'active' : ''}
                          style={isActive ? { color: cfg.color } : undefined}
                          onClick={() => setSelectedDifficulty(dif)}>
                          {cfg.label}
                        </button>
                      )
                    })}
                  </div>
                  {(() => {
                    const cfg = DIFFICULTY_CONFIG[selectedDifficulty]
                    const gold = Math.floor(currentDungeon.goldReward * cfg.goldMult)
                    const exp = Math.floor(currentDungeon.expReward * cfg.expMult)
                    const rarityZH = currentDungeon.equipRarity === 'magic' ? '魔法' : currentDungeon.equipRarity === 'rare' ? '稀有' : '傳奇'
                    return (
                      <div className="av-lobby-stageinfo-row">
                        <span className="av-lobby-stageinfo-reward"><AsterVowIcon name="system-gold" size={14} />{gold}　<AsterVowIcon name="system-stardust" size={14} />{exp}　<AsterVowIcon name="nav-equipment" size={14} /> {rarityZH}裝備</span>
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
          ) : activeChapter.pick === 'main' ? (
            <div className="av-lobby-stageinfo">
              <div className="av-lobby-stageinfo-nav">
                <button disabled={previewStageIdx <= 0} onClick={() => cyclePreviewStage(-1)} aria-label="上一關">‹ 上一關</button>
                <button disabled={previewStageIdx >= previewCampaignStages.length - 1} onClick={() => cyclePreviewStage(1)} aria-label="下一關">下一關 ›</button>
              </div>
              <div className="av-lobby-stageinfo-row">
                <span className="av-lobby-stageinfo-objective">
                  <AsterVowIcon name={OBJECTIVE_ICON_NAME[previewStage.objective.type]} size={15} /> {OBJECTIVE_LABEL[previewStage.objective.type]}
                </span>
                <span><AsterVowIcon name="system-clock" size={15} /> {previewStage.estimatedDurationSec[0]}–{previewStage.estimatedDurationSec[1]}秒</span>
                {previewStage.boss && <span className="av-lobby-stageinfo-boss"><AsterVowIcon name="stage-boss" size={14} /> BOSS</span>}
              </div>
              <div className="av-lobby-stageinfo-row">
                {previewUnlocked ? (
                  <>
                    <StarRow stars={previewProg.stars} />
                    <span className="av-lobby-stageinfo-reward"><AsterVowIcon name="system-gold" size={14} />{previewStage.firstClearReward.gold}　<AsterVowIcon name="system-stardust" size={14} />{previewStage.firstClearReward.heroExp}</span>
                  </>
                ) : (
                  <span className="av-lobby-stageinfo-lock"><AsterVowIcon name="system-lock" size={15} /> 通關上一關解鎖</span>
                )}
              </div>
            </div>
          ) : (
            <div className="av-lobby-stageinfo">
              <div className="av-lobby-stageinfo-row"><span>{activeChapter.sub}・隨機生成關卡，無固定進度</span></div>
            </div>
          )}

          <div className="av-lobby-cta-row">
            <button className="ghost" onClick={() => onOpenPartySetup(0)}>隊伍編成</button>
            {modeTab === 'dungeon' ? (
              <button className="av-cta-btn" disabled={!canStart} onClick={handleStart}>
                {currentDungeonUnlocked ? '出發！' : '尚未解鎖'}
              </button>
            ) : activeChapter.pick === 'main' ? (
              // 主線 CTA（2026-08-17）：跟地城副本一樣直接「出發」，開打目前
              // 預覽中的那一關，不再繞去關卡地圖——地圖改成點 CHAPTER 標籤進去看。
              <button className="av-cta-btn" disabled={!previewUnlocked} onClick={() => onStartCampaignStage(selectedHeroId, previewStage.id)}>
                {previewUnlocked ? '出發！' : '尚未解鎖'}
              </button>
            ) : (
              <button className="av-cta-btn" onClick={() => fireStart(selectedHeroId)}>
                {chapterEnterLabel}
              </button>
            )}
          </div>

          {/* 四宮格捷徑磚：跟底部導覽的入口部分重疊是刻意設計（很多手機遊戲
              大廳首頁捷徑跟底部導覽本來就會重複），全部指向真實既有功能。 */}
          <div className="av-lobby-tiles">
            <button className={`av-lobby-tile${modeTab === 'main' ? ' active' : ''}`} onClick={() => setModeTab('main')}>
              <AsterVowIcon name="nav-campaign" size={22} />
              <span>主線冒險</span>
            </button>
            {FEATURE_FLAGS.dungeons && (
              <button className={`av-lobby-tile${modeTab === 'dungeon' ? ' active' : ''}`} onClick={() => setModeTab('dungeon')}>
                <AsterVowIcon name="nav-dungeon" size={22} />
                <span>地城副本</span>
              </button>
            )}
            {/* 星界商城（2026-08-14，見 AstralShopScreen.tsx）：UI 原型，商品/
                貨幣系統還沒真的接後端，但頁面本身可以逛，不再是純佔位。 */}
            <button className="av-lobby-tile" onClick={onOpenShop}>
              <AsterVowIcon name="nav-shop" size={22} />
              <span>星界商城</span>
            </button>
            <button className="av-lobby-tile" onClick={() => setShowCompendium(true)}>
              <AsterVowIcon name="nav-compendium" size={22} />
              <span>星界圖鑑</span>
            </button>
          </div>
        </div>

      {/* ── 底部導覽：2026-08 改版拿掉中間的「開始」主按鈕（出發 CTA 併入
          上方關卡預覽卡），固定 5 格：大廳／地城／英雄／裝備／選單，主線
          冒險／地城副本兩個模式共用同一條（原本只在主線分頁顯示，2026-
          08-14 起兩個模式統一版面後不再需要分開）。「選單」跟頂部工具列的
          選單按鈕功能重複，是刻意的設計（很多手機遊戲大廳選單入口本來就
          不只一個）。 ── */}
      <nav className="av-lobby-dock" aria-label="大廳導覽">
          <button className={`av-lobby-dock-btn${modeTab === 'main' ? ' active' : ''}`} onClick={() => setModeTab('main')} aria-label="大廳">
            <AsterVowIcon name="nav-lobby" />
            <span>大廳</span>
          </button>
          {FEATURE_FLAGS.dungeons && (
            <button className={`av-lobby-dock-btn${modeTab === 'dungeon' ? ' active' : ''}`} onClick={() => setModeTab('dungeon')} aria-label="地城副本">
              <AsterVowIcon name="nav-dungeon" />
              <span>地城</span>
            </button>
          )}
          <button className="av-lobby-dock-btn" onClick={onOpenWarehouse} aria-label="倉庫">
            <AsterVowIcon name="nav-warehouse" />
            <span>倉庫</span>
          </button>
          {FEATURE_FLAGS.equipment && (
            <button className="av-lobby-dock-btn" onClick={onOpenEquipment} aria-label="英雄與裝備">
              <AsterVowIcon name="nav-equipment" />
              <span>裝備</span>
            </button>
          )}
          <button className="av-lobby-dock-btn" onClick={() => setDrawerOpen(true)} aria-label="選單">
            <AsterVowIcon name="nav-menu" />
            <span>選單</span>
          </button>
        </nav>

      {/* ── 右側抽屜選單（2026-08，僅主線冒險分頁會開啟）：品牌列+關閉、
          玩家資訊、禮物與郵件／星界商城／星界圖鑑／雲端存檔／遊戲設定、
          回到首頁。禮物與郵件、遊戲設定目前沒有對應的真實系統，比照
          MainMenuScreen 既有的「成就（即將推出）」慣例標示即將推出，不
          假造內容；星界商城／星界圖鑑／雲端存檔／回到首頁都是真實功能。 ── */}
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
              <span className="av-lobby-player-avatar" aria-hidden="true"><AsterVowIcon name="system-player" size={22} /></span>
              <span className="av-lobby-player-info">
                <b>{getPlayerName()}</b>
                <small>★ {totalStars} 總星數</small>
              </span>
            </div>

            <div className="av-drawer-list">
              <button className="av-drawer-item" disabled aria-label="禮物與郵件（即將推出）">
                <AsterVowIcon name="system-gift" size={19} />
                <span>禮物與郵件</span>
                <span className="av-drawer-item-tag">即將推出</span>
              </button>
              <button className="av-drawer-item" onClick={() => { setDrawerOpen(false); onOpenShop() }}>
                <AsterVowIcon name="nav-shop" size={19} />
                <span>星界商城</span>
                <span className="av-drawer-item-tag av-drawer-item-tag--new">NEW</span>
              </button>
              <button className="av-drawer-item" onClick={() => { setDrawerOpen(false); setShowCompendium(true) }}>
                <AsterVowIcon name="nav-compendium" size={19} />
                <span>星界圖鑑</span>
                <span className="av-drawer-item-arrow">›</span>
              </button>
              <button className="av-drawer-item" onClick={() => { setDrawerOpen(false); setShowCloud(true) }}>
                <AsterVowIcon name="system-cloud" size={19} />
                <span>雲端存檔</span>
                <span className="av-drawer-item-arrow">›</span>
              </button>
              <button className="av-drawer-item" disabled aria-label="遊戲設定（即將推出）">
                <AsterVowIcon name="system-settings" size={19} />
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

      {showCompendium && (
        <CompendiumScreen
          meta={meta}
          onClose={() => setShowCompendium(false)}
          // 故意不關閉圖鑑（不 setShowCompendium(false)）：天賦/裝備 Modal 疊在
          // 圖鑑上面顯示（z-index 比圖鑑高），關掉天賦/裝備後圖鑑本來就還在
          // 底下，會自然「回到圖鑑」而不是掉回大廳。
          onViewTalent={FEATURE_FLAGS.talents ? hero => { setTalentViewHero(hero); setTalentPendingNode(null) } : undefined}
          onViewEquip={FEATURE_FLAGS.equipment ? hero => { setEquipViewHero(hero) } : undefined}
        />
      )}

      {/* ── 立繪 Modal ── */}
      {portraitHero && (
        <HeroPortraitModal
          hero={portraitHero}
          roleMeta={ROLE_ICON_META[portraitHero.role]}
          prog={portraitProg}
          eqBonus={portraitEqB}
          talBon={portraitTalB}
          equip={portraitEquip}
          startLabel={
            (modeTab !== 'dungeon' || currentDungeonUnlocked)
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
        const rm = ROLE_ICON_META[equipViewHero.role]
        const SLOT_ORDER = ['weapon', 'head', 'body', 'hands', 'boots', 'ring', 'accessory'] as const
        const SLOT_LABEL: Record<string, string> = {
          weapon: '武器', head: '頭盔', body: '護甲', hands: '手套',
          boots: '靴子', ring: '戒指', accessory: '飾品',
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
                <AsterVowIcon name={rm.icon} size={20} /> {equipViewHero.name} — 裝備配置
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
                          <span style={{ fontSize: '0.7rem', color: '#5070a0', display: 'inline-flex', alignItems: 'center', gap: 4 }}><AsterVowIcon name={EQUIPMENT_SLOT_ICON[slot]} size={14} color={EQUIPMENT_SLOT_ICON_COLOR[slot]} /> {SLOT_LABEL[slot]}</span>
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
        const rm   = ROLE_ICON_META[talentViewHero.role]
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
                <AsterVowIcon name={rm.icon} size={20} /> {talentViewHero.name} — 天賦樹
              </div>
              <div className="tvm-points-badge"><AsterVowIcon name="system-talent" size={16} /> 剩餘天賦點數：{prog.talentPoints}</div>

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
                        <div className="tvm-node-name">
                          {node.kind === 'mastery'
                            ? <AsterVowIcon name="system-leaderboard" size={15} />
                            : isMajor ? <AsterVowIcon name="system-talent" size={15} /> : null}
                          {node.name}
                        </div>
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
