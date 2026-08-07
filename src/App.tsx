import { useEffect, useRef, useState } from 'react'
import { stopBgm, playSound } from './lib/sound'
import {
  auth, googleProvider, cloudSave, cloudLoad,
  signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, onAuthStateChanged,
} from './lib/firebase'
import type { User } from './lib/firebase'
import { HEROES, getHeroSprite } from './data'
import SpriteAnimator from './components/SpriteAnimator'
import {
  generateMap, advanceMap, getEnemyForNode, getFloorMult, getGoldReward, rollEnemyAffixes,
  FLOOR_COUNT, FLOORS_PER_CHAPTER, CHAPTER_COUNT,
  getChapter, isChapterBossFloor, isFinalBossFloor, countFloorsCleared,
  CHAPTER_NAMES, RIFT_OMEN_CHAPTER_NAMES,
} from './mapGen'
import { getRandomCards, getEffectiveCardEffect, ALL_BUFF_CARDS } from './buffCards'
import { getRandomRelics, getRelicById, getRelicHealOnWin, getRelicHealOnWinPct, getOwnedRelicEffect } from './relics'
import { getRandomPotion } from './potions'
import { getRandomEvent } from './events'
import { getRandomCurse } from './curses'
import { loadMeta, saveMeta, calcRunStardust } from './meta'
import { saveRun, loadSavedRun, clearSavedRun, type RunSave } from './save'
import { tryGenerateDrop, getEquippedItems, computeEquipBonus, SALVAGE_VALUE, generateEquipment, tryGenerateEclipseDrop, tryGenerateThroneDrops, tryGenerateBlackTideDrop, tryGenerateCovenantDrop } from './equipment'
import {
  computeTalentBonus, addHeroExp, checkStarConditions, calcRunExp, defaultHeroProgress,
  getHeroStarTitle, HERO_TALENT_TREES,
} from './talents'
import type { GamePhase, RunState, MapNode, BuffCard, EventOutcome, MetaState, Equipment, RouteType } from './types'
import type { Relic } from './types'
import { MAX_POTIONS } from './types'

import { getDungeon, generateDungeonMap, generateBurningThroneMap, generateBlackTideMap, generateAshCovenantMap, advanceDungeonMap, getDungeonForbiddenCount, DIFFICULTY_CONFIG, rollDungeonAffixes } from './dungeon'
import type { DungeonNode, DungeonDifficulty } from './dungeon'
import {
  getSeasonId, getPlayerId, getPlayerName, setPlayerName,
  calculateDungeonScore, getRankGrade, getChallengeBonusScore,
  computeChallengesCompleted, saveLeaderboardRecord, saveLeaderboardRecordCloud,
} from './scoring'
import type { RankPositions } from './scoring'
import { FEATURE_FLAGS } from './featureFlags'
import BattleScreen from './screens/BattleScreen'
import MapScreen from './screens/MapScreen'
import DungeonSelectScreen from './screens/DungeonSelectScreen'
import DungeonResultScreen from './screens/DungeonResultScreen'
import DungeonClearScreen from './screens/DungeonClearScreen'
import LeaderboardScreen from './screens/LeaderboardScreen'
import DungeonMapScreen from './screens/DungeonMapScreen'
import AshCovenantEventScreen from './screens/AshCovenantEventScreen'
import RewardScreen from './screens/RewardScreen'
import RelicRewardScreen from './screens/RelicRewardScreen'
import EventScreen from './screens/EventScreen'
import ShopScreen from './screens/ShopScreen'
import RestScreen from './screens/RestScreen'
import GameOverScreen from './screens/GameOverScreen'
import RouteSelectScreen from './screens/RouteSelectScreen'
import AdventureReadyScreen from './screens/AdventureReadyScreen'
import type { AdventureStartConfig } from './screens/AdventureReadyScreen'
import ChapterClearScreen from './screens/ChapterClearScreen'
import VictoryScreen from './screens/VictoryScreen'
import MainMenuScreen from './screens/MainMenuScreen'
import EquipmentScreen from './screens/EquipmentScreen'
import EquipmentDropScreen from './screens/EquipmentDropScreen'

import HeroPortraitModal from './components/HeroPortraitModal'
import PlayerNameModal from './components/PlayerNameModal'
import GmScreen from './screens/GmScreen'
import ArenaScreen from './arena/ArenaScreen'
import { computeArenaTalentBonus, generateHeroTalentTree } from './arena/arenaTalents'

const APP_VERSION = __APP_BUILD__

function getMaxLevelCardIds(run: RunState): string[] {
  return run.cards
    .filter(c => (run.cardLevels[c.id] ?? 1) >= (c.maxLevel ?? 1))
    .map(c => c.id)
}

function getMaxLevelRelicIds(run: RunState): string[] {
  return run.relics.filter(id => {
    const relic = getRelicById(id)
    if (!relic) return true
    return (run.relicLevels?.[id] ?? 1) >= (relic.maxLevel ?? 1)
  })
}

const ROLE_META: Record<string, { icon: string; color: string; label: string }> = {
  slash:  { icon: '⚔️', color: '#6090ff', label: '戰士' },
  fire:   { icon: '🔥', color: '#ff6040', label: '法師' },
  holy:   { icon: '✨', color: '#ffd36e', label: '祭司' },
  shadow: { icon: '🗡️', color: '#a060ff', label: '刺客' },
  ice:    { icon: '❄️', color: '#60c8ff', label: '支援' },
  arrow:  { icon: '🏹', color: '#60d080', label: '射手' },
  hammer: { icon: '🔨', color: '#c08040', label: '坦克' },
  song:   { icon: '🎵', color: '#ff80c0', label: '詩人' },
  beast:  { icon: '🐾', color: '#d08040', label: '獸師' },
  gear:   { icon: '⚙️', color: '#90a0b0', label: '工程' },
}

function createRun(heroId: string, hpBonus: number, routeType: RouteType = 'risk', campaign: 'main' | 'rift_omen' | 'deep_sea' | 'ash_kingdom' = 'main'): RunState {
  const hero = HEROES.find(h => h.id === heroId) ?? HEROES[0]
  const maxHp = hero.hp + hpBonus
  return {
    party: [{ heroId, hp: maxHp, maxHp, angerCount: 0, undyingUsed: false }],
    activePartyIdx: 0,
    gold: 0,
    cards: [],
    relics: [],
    curses: [],
    enemyStatus: [],
    heroStatus: [],
    nodes: generateMap(routeType),
    currentNodeId: null,
    noDamageBattleCount: 0,
    chapter: 1,
    routeType,
    potions: ['heal_small'],
    cardLevels: {},
    relicLevels: {},
    campaign,
    hourglassUsed: false,
    equipUndyingUsed: false,
  }
}

// Phases during which we persist the run to localStorage
const SAVE_PHASES: Array<GamePhase['type']> = [
  'map', 'battle', 'reward', 'relic_reward', 'event', 'shop', 'rest', 'equipment_drop', 'chapter_clear',
]

export default function App() {
  const [phase, setPhase] = useState<GamePhase>({ type: 'main_menu' })
  const [run, setRun] = useState<RunState>(createRun(HEROES[0].id, 0))
  const [meta, setMeta] = useState<MetaState>(() => loadMeta())
  const [portraitHero, setPortraitHero] = useState<typeof HEROES[0] | null>(null)
  const [talentViewHero, setTalentViewHero] = useState<typeof HEROES[0] | null>(null)
  const [gmDialogOpen, setGmDialogOpen] = useState(false)
  const [gmPassword, setGmPassword] = useState('')
  const [gmPasswordError, setGmPasswordError] = useState(false)
  const [rewardCards, setRewardCards] = useState<BuffCard[]>([])
  const [rewardRelics, setRewardRelics] = useState<Relic[]>([])
  const [pendingDrop, setPendingDrop] = useState<Equipment | null>(null)
  const [pendingPhaseAfterDrop, setPendingPhaseAfterDrop] = useState<GamePhase>({ type: 'map' })
  const [lastBattleContext, setLastBattleContext] = useState<{ isElite: boolean; isBoss: boolean }>({ isElite: false, isBoss: false })

  // ── Dungeon state ─────────────────────────────────────────────────────────
  const [dungeonRun, setDungeonRun] = useState<{
    dungeonId: string; heroId: string; maxHp: number; forbiddenDice: number[]
    nodes: DungeonNode[]; currentNodeId: string | null
    difficulty: DungeonDifficulty
    // scoring tracking
    totalTurns: number
    diceScore: number
    retryCount: number
    speedKillCount: number
    noDamageWins: number
    eliteNodesCleared: number
    // dungeon-specific challenge tracking
    cleanAttackWins: number       // star_eclipse
    cleanHighDmgWins: number      // star_eclipse
    noBacklashWins: number        // burning_throne
    highFlamePeakWins: number     // burning_throne
    oxygenSafeWins: number        // black_tide
    tideDmgWins: number           // black_tide
    totalJudgments: number        // ash_covenant
    lowCovenantWins: number       // ash_covenant
    // ash_covenant: carry-over event buff for next battle
    covenantEventBuff?: import('./types').CovenantEventBuff
  } | null>(null)
  const [dungeonDroppedItem, setDungeonDroppedItem] = useState<Equipment | null>(null)
  const [dungeonChestGold, setDungeonChestGold] = useState<number | null>(null)

  // ── Firebase auth ────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null)
  const [cloudMsg, setCloudMsg] = useState('')
  const [showNameModal, setShowNameModal] = useState(false)
  const cloudMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  // 處理 redirect 登入回傳（iOS Safari / in-app 瀏覽器使用 redirect 流程）
  useEffect(() => {
    getRedirectResult(auth).catch((err: { code?: string }) => {
      const code = err?.code ?? ''
      if (code && code !== 'auth/null' && !code.includes('cancelled') && !code.includes('popup-closed')) {
        showMsg(`登入失敗：${code}`)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const showMsg = (msg: string) => {
    setCloudMsg(msg)
    if (cloudMsgTimer.current) clearTimeout(cloudMsgTimer.current)
    cloudMsgTimer.current = setTimeout(() => setCloudMsg(''), 3000)
  }

  const handleSignIn = () => {
    const ua = navigator.userAgent
    // PWA standalone 模式：用 popup（redirect 會跳出 PWA 且回不來）
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true
    // in-app 瀏覽器（LINE/FB/IG）：只能用 redirect
    const isInApp = /FBAN|FBAV|Line\/|Instagram/i.test(ua)
    // iOS Safari 非 standalone、非 in-app：用 redirect（popup 被系統封鎖）
    const needsRedirect = !isStandalone && !isInApp && /iPhone|iPad|iPod/i.test(ua)

    if (isInApp || needsRedirect) {
      signInWithRedirect(auth, googleProvider)
      return
    }
    // standalone PWA 或桌面：用 popup
    signInWithPopup(auth, googleProvider).catch((err: { code?: string }) => {
      const code = err?.code ?? ''
      if (code === 'auth/popup-blocked' ||
          code === 'auth/operation-not-supported-in-this-environment' ||
          code === 'auth/web-storage-unsupported') {
        signInWithRedirect(auth, googleProvider)
      } else if (code !== 'auth/popup-closed-by-user' &&
                 code !== 'auth/cancelled-popup-request') {
        showMsg(`登入失敗：${code}`)
      }
    })
  }
  const handleSignOut = () => signOut(auth)

  const handleCloudSave = async () => {
    if (!user) return
    try { await cloudSave(user.uid); showMsg('✓ 已上傳至雲端') }
    catch  { showMsg('上傳失敗，請確認網路') }
  }

  const handleCloudLoad = async () => {
    if (!user) return
    try {
      const data = await cloudLoad(user.uid)
      if (!data) { showMsg('雲端無存檔'); return }
      if (data.meta) localStorage.setItem('dice_hero_meta_v2', data.meta)
      if (data.run)  localStorage.setItem('dice_hero_run_v1',  data.run)
      else           localStorage.removeItem('dice_hero_run_v1')
      showMsg('✓ 已還原，重新載入中…')
      setTimeout(() => window.location.reload(), 1000)
    } catch { showMsg('下載失敗，請確認網路') }
  }

  // ── Auto-save (local + cloud) ─────────────────────────────────────────────
  const userRef = useRef<User | null>(null)
  userRef.current = user
  const metaSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (SAVE_PHASES.includes(phase.type)) {
      saveRun({ run, phase, rewardCards, rewardRelics, pendingDrop, pendingPhaseAfterDrop })
      // Silent cloud sync whenever local save happens
      if (userRef.current) cloudSave(userRef.current.uid).catch(() => {})
    } else if (phase.type === 'game_over' || phase.type === 'victory' || phase.type === 'dungeon_result' || phase.type === 'dungeon_score') {
      clearSavedRun()
      if (userRef.current) cloudSave(userRef.current.uid).catch(() => {})
    }
  }, [phase])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto cloud-load when user signs in ────────────────────────────────────
  const prevUserRef = useRef<User | null>(null)
  useEffect(() => {
    if (!user || prevUserRef.current?.uid === user.uid) { prevUserRef.current = user; return }
    prevUserRef.current = user

    cloudLoad(user.uid).then(data => {
      if (!data) return
      const localRunStr = localStorage.getItem('dice_hero_run_v1')

      // meta: always take cloud as source of truth (stardust, inventory, etc.)
      const metaChanged = data.meta && data.meta !== localStorage.getItem('dice_hero_meta_v2')
      if (data.meta) localStorage.setItem('dice_hero_meta_v2', data.meta)

      // run: only restore if cloud run is newer than local run
      const cloudRunTime = data.run
        ? (JSON.parse(data.run) as { savedAt?: string }).savedAt ?? ''
        : ''
      const localRunTime = localRunStr
        ? (JSON.parse(localRunStr) as { savedAt?: string }).savedAt ?? ''
        : ''
      const runChanged = cloudRunTime && cloudRunTime > localRunTime

      if (runChanged) {
        if (data.run) localStorage.setItem('dice_hero_run_v1', data.run)
        else          localStorage.removeItem('dice_hero_run_v1')
      }

      // Sync player name from cloud
      if (data.player_name) {
        setPlayerName(data.player_name)
      } else {
        // No name set in cloud → prompt the user
        setShowNameModal(true)
      }

      if (metaChanged || runChanged) {
        showMsg(runChanged ? '發現較新的雲端存檔，自動還原中…' : '✓ 已從雲端同步')
        setTimeout(() => window.location.reload(), 1500)
      }
    }).catch(() => {})
  }, [user])  // eslint-disable-line react-hooks/exhaustive-deps

  const handleContinueRun = (saved: RunSave) => {
    // Dungeon battles can't be properly restored (dungeonRun state isn't saved)
    if (saved.phase.type === 'battle' && saved.phase.dungeonId) {
      clearSavedRun()
      return
    }
    setRun({ ...saved.run, relicLevels: saved.run.relicLevels ?? {} })
    setPhase(saved.phase)
    setRewardCards(saved.rewardCards)
    setRewardRelics(saved.rewardRelics)
    setPendingDrop(saved.pendingDrop)
    setPendingPhaseAfterDrop(saved.pendingPhaseAfterDrop)
  }

  const updateMeta = (fn: (prev: MetaState) => MetaState) => {
    setMeta(prev => {
      const next = fn(prev)
      saveMeta(next)
      return next
    })
    // Debounced cloud sync: fires 2s after the last meta update in a burst
    if (userRef.current) {
      if (metaSyncTimer.current) clearTimeout(metaSyncTimer.current)
      metaSyncTimer.current = setTimeout(() => {
        if (userRef.current) cloudSave(userRef.current.uid).catch(() => {})
      }, 2000)
    }
  }

  const activeMember = run.party[run.activePartyIdx]
  const activeRole = HEROES.find(h => h.id === activeMember.heroId)?.role

  const getActiveEquipment = (heroId: string) =>
    getEquippedItems(meta.inventory, meta.loadouts[heroId])

  const getActiveTalentBonus = (heroId: string) =>
    computeTalentBonus(heroId, meta.heroProgress[heroId] ?? defaultHeroProgress())

  // Award EXP + update stars at end of run
  const awardRunExp = (heroId: string, won: boolean, floorsCleared: number) => {
    const exp = calcRunExp(won, floorsCleared)
    updateMeta(m => {
      const prev = m.heroProgress[heroId] ?? defaultHeroProgress()
      const updated = addHeroExp(
        { ...prev, runsCompleted: prev.runsCompleted + (won ? 1 : 0), runsWon: prev.runsWon + (won ? 1 : 0) },
        exp,
      )
      const newStars = Math.max(updated.stars, checkStarConditions(updated))
      return {
        ...m,
        heroProgress: { ...m.heroProgress, [heroId]: { ...updated, stars: newStars } },
      }
    })
  }

  // Compute floors cleared from nodes
  const countFloorsCleared = (nodes: typeof run.nodes) => {
    let max = 0
    for (const n of nodes) { if (n.cleared && n.floor > max) max = n.floor }
    return max
  }

  const [pendingDungeonId, setPendingDungeonId] = useState<string>('')

  const handleAdventureStart = (config: AdventureStartConfig) => {
    if (config.campaign === 'dungeon') {
      startDungeon(config.dungeonId, config.heroId, config.difficulty)
      return
    }
    // 主線拉回來（2026-08-07）：FEATURE_FLAGS.turnBasedMainline 開的時候，
    // 主線走回原本的回合制 map/battle 流程，不是 arena_run。這條路徑跟
    // startDungeon 一樣，底層 createRun/generateMap/MapScreen/BattleScreen
    // 全部沒被轉向動過，只是入口曾經被跳過。
    if (FEATURE_FLAGS.turnBasedMainline) {
      startMainCampaign(config.heroId, config.routeType, config.campaign)
      return
    }
    // 即時制轉向：主線一律進 arena_run，不用 RunState/map/battle 那套回合制流程。
    // 篇章/路線選擇目前對即時制內容沒有實質影響（內容還沒依篇章分化），先忽略，
    // 只留 AdventureReadyScreen 的英雄選擇這部分。見 REALTIME_PIVOT_PLAN.md M3。
    setPhase({ type: 'arena_run', heroId: config.heroId })
  }

  const startMainCampaign = (heroId: string, routeType: RouteType, campaign: 'main' | 'rift_omen' | 'deep_sea' | 'ash_kingdom') => {
    const equip = getActiveEquipment(heroId)
    const eqBonus = computeEquipBonus(equip)
    const talentBon = getActiveTalentBonus(heroId)
    const hpBonus = eqBonus.hpBonus + talentBon.hpBonus
    setRun(createRun(heroId, hpBonus, routeType, campaign))
    setPhase({ type: 'map' })
  }

  // kept for compatibility — only used internally now
  const startRun = (heroId: string) => {
    setPhase({ type: 'adventure_ready' })
    void heroId
  }

  // ── Dungeon logic ─────────────────────────────────────────────────────────
  const startDungeon = (dungeonId: string, heroId: string, difficulty: DungeonDifficulty = 'normal') => {
    const dungeon = getDungeon(dungeonId)
    if (!dungeon) return
    const hero = HEROES.find(h => h.id === heroId) ?? HEROES[0]
    const equip = getActiveEquipment(heroId)
    const eqBonus = computeEquipBonus(equip)
    const talentBon = getActiveTalentBonus(heroId)
    const maxHp = hero.hp + eqBonus.hpBonus + talentBon.hpBonus
    const dungeonRunState: RunState = {
      party: [{ heroId, hp: maxHp, maxHp, angerCount: 0, undyingUsed: false }],
      activePartyIdx: 0, gold: 0, cards: [], relics: [], curses: [], enemyStatus: [],
      heroStatus: [], nodes: [], currentNodeId: null, noDamageBattleCount: 0,
      chapter: 1, routeType: 'risk', potions: ['heal_small'], cardLevels: {}, relicLevels: {},
      hourglassUsed: false, equipUndyingUsed: false,
    }
    setRun(dungeonRunState)
    const dungeonNodes = dungeonId === 'burning_throne' ? generateBurningThroneMap()
      : dungeonId === 'black_tide' ? generateBlackTideMap()
      : dungeonId === 'ash_covenant' ? generateAshCovenantMap()
      : generateDungeonMap()
    setDungeonRun({
      dungeonId, heroId, maxHp, forbiddenDice: [], nodes: dungeonNodes, currentNodeId: null, difficulty,
      totalTurns: 0, diceScore: 0, retryCount: 0, speedKillCount: 0, noDamageWins: 0, eliteNodesCleared: 0,
      cleanAttackWins: 0, cleanHighDmgWins: 0, noBacklashWins: 0, highFlamePeakWins: 0,
      oxygenSafeWins: 0, tideDmgWins: 0, totalJudgments: 0, lowCovenantWins: 0,
    })
    setDungeonDroppedItem(null)
    setDungeonChestGold(null)
    setPhase({ type: 'dungeon_map', dungeonId, heroId })
  }

  const handleDungeonNodeSelect = (node: DungeonNode) => {
    if (!dungeonRun) return

    if (node.type === 'rest') {
      const restHealPct = dungeonRun.difficulty === 'legendary' ? 0.12 : 0.20
      const healAmt = Math.round(dungeonRun.maxHp * restHealPct)
      setRun(r => ({
        ...r,
        party: r.party.map((m, i) => i === r.activePartyIdx
          ? { ...m, hp: Math.min(m.hp + healAmt, dungeonRun.maxHp) }
          : m),
      }))
      const newNodes = advanceDungeonMap(dungeonRun.nodes, node.id)
      setDungeonRun(d => d ? { ...d, nodes: newNodes } : null)
      return
    }

    if (node.type === 'event') {
      setDungeonRun(d => d ? { ...d, currentNodeId: node.id } : null)
      setPhase({ type: 'dungeon_event', eventId: node.eventId ?? 'ash_altar', nodeId: node.id })
      return
    }

    if (node.type === 'chest') {
      // 50% free reward（金幣+藥水，直接過關）；50% 寶箱怪戰鬥（同主線寶箱機制）
      const goldAmt = dungeonRun.difficulty === 'legendary' ? 120 : dungeonRun.difficulty === 'hero' ? 90 : 60
      if (Math.random() < 0.5) {
        const gotPotion = Math.random() < 0.5
        setRun(r => {
          const cur = r.potions ?? []
          const addPotion = gotPotion && cur.length < MAX_POTIONS ? [getRandomPotion().id] : []
          return { ...r, gold: r.gold + goldAmt, potions: [...cur, ...addPotion] }
        })
        const newNodes = advanceDungeonMap(dungeonRun.nodes, node.id)
        setDungeonRun(d => d ? { ...d, nodes: newNodes } : null)
        setDungeonChestGold(goldAmt)
      } else {
        const fdCount = dungeonRun.dungeonId === 'star_eclipse'
          ? getDungeonForbiddenCount(dungeonRun.difficulty, node.layer)
          : 0
        const forbiddenDice: number[] = []
        while (forbiddenDice.length < fdCount) {
          const n = Math.floor(Math.random() * 6) + 1
          if (!forbiddenDice.includes(n)) forbiddenDice.push(n)
        }
        const ceb = dungeonRun.covenantEventBuff
        setDungeonRun(d => d ? { ...d, currentNodeId: node.id, forbiddenDice, covenantEventBuff: undefined } : null)
        setRun(r => ({ ...r, enemyStatus: [], heroStatus: [] }))
        setPhase({
          type: 'battle',
          isElite: false,
          isBoss: false,
          isChapterBoss: false,
          floorMult: Math.round(node.floorMult * DIFFICULTY_CONFIG[dungeonRun.difficulty].floorMultMod * 1.2 * 100) / 100,
          goldReward: 0,
          enemyId: 'mimic',
          enemyAffixes: rollDungeonAffixes(dungeonRun.difficulty, false, false),
          forbiddenDice,
          dungeonId: dungeonRun.dungeonId,
          dungeonDifficulty: dungeonRun.difficulty,
          covenantEventBuff: ceb,
        })
      }
      return
    }

    const fdCount = dungeonRun.dungeonId === 'star_eclipse'
      ? getDungeonForbiddenCount(dungeonRun.difficulty, node.layer)
      : 0
    const forbiddenDice: number[] = []
    while (forbiddenDice.length < fdCount) {
      const n = Math.floor(Math.random() * 6) + 1
      if (!forbiddenDice.includes(n)) forbiddenDice.push(n)
    }
    const isEliteNode = node.type === 'elite' || node.type === 'mini_boss'
    const isBossNode  = node.type === 'boss'
    const ceb = dungeonRun.covenantEventBuff
    setDungeonRun(d => d ? { ...d, currentNodeId: node.id, forbiddenDice, covenantEventBuff: undefined } : null)
    setRun(r => ({ ...r, enemyStatus: [], heroStatus: [] }))
    setPhase({
      type: 'battle',
      isElite: isEliteNode,
      isBoss: isBossNode,
      isChapterBoss: false,
      floorMult: Math.round(node.floorMult * DIFFICULTY_CONFIG[dungeonRun.difficulty].floorMultMod * 100) / 100,
      goldReward: 0,
      enemyId: node.enemyId ?? 'rift_imp',
      enemyAffixes: rollDungeonAffixes(dungeonRun.difficulty, isEliteNode, isBossNode),
      forbiddenDice,
      dungeonId: dungeonRun.dungeonId,
      dungeonDifficulty: dungeonRun.difficulty,
      covenantEventBuff: ceb,
    })
  }

  const handleDungeonBattleComplete = async (result: { won: boolean; goldEarned: number; newHeroHp: number; noDamage?: boolean; potionsLeft?: string[]; undyingUsed: boolean; hourglassUsed: boolean; equipUndyingUsed: boolean; turnsUsed: number; diceComboScore: number; noForbiddenTrigger?: boolean; cleanHighDmg?: boolean; noBacklash?: boolean; flamePeakHigh?: boolean; oxygenSafe?: boolean; ebbtideDmgHigh?: boolean; judgmentsThisBattle?: number; covenantLow?: boolean }) => {
    if (!dungeonRun) return
    const dungeon = getDungeon(dungeonRun.dungeonId)!
    const heroId = dungeonRun.heroId
    const heroRole = HEROES.find(h => h.id === heroId)?.role

    // Accumulate per-battle tracking into dungeonRun
    const newRevives =
      (result.undyingUsed && !run.party[run.activePartyIdx].undyingUsed ? 1 : 0) +
      (result.hourglassUsed && !run.hourglassUsed ? 1 : 0) +
      (result.equipUndyingUsed && !run.equipUndyingUsed ? 1 : 0)
    const trackingNode = dungeonRun.currentNodeId
      ? dungeonRun.nodes.find(n => n.id === dungeonRun.currentNodeId)
      : null
    const isEliteNode = trackingNode?.type === 'elite' || trackingNode?.type === 'mini_boss'
    const wonFast = result.won && result.turnsUsed <= 3

    setDungeonRun(d => d ? {
      ...d,
      totalTurns:        d.totalTurns + result.turnsUsed,
      diceScore:         d.diceScore + result.diceComboScore,
      retryCount:        d.retryCount + newRevives,
      speedKillCount:    d.speedKillCount + (wonFast ? 1 : 0),
      noDamageWins:      d.noDamageWins + (result.won && result.noDamage ? 1 : 0),
      eliteNodesCleared: d.eliteNodesCleared + (result.won && isEliteNode ? 1 : 0),
      cleanAttackWins:   d.cleanAttackWins + (result.won && result.noForbiddenTrigger ? 1 : 0),
      cleanHighDmgWins:  d.cleanHighDmgWins + (result.won && result.cleanHighDmg ? 1 : 0),
      noBacklashWins:    d.noBacklashWins + (result.won && result.noBacklash ? 1 : 0),
      highFlamePeakWins: d.highFlamePeakWins + (result.won && result.flamePeakHigh ? 1 : 0),
      oxygenSafeWins:    d.oxygenSafeWins + (result.won && result.oxygenSafe ? 1 : 0),
      tideDmgWins:       d.tideDmgWins + (result.won && result.ebbtideDmgHigh ? 1 : 0),
      totalJudgments:    d.totalJudgments + (result.judgmentsThisBattle ?? 0),
      lowCovenantWins:   d.lowCovenantWins + (result.won && result.covenantLow ? 1 : 0),
    } : null)

    if (!result.won) {
      stopBgm()
      const nodesCleared = dungeonRun.nodes.filter(n => n.cleared).length
      const totalBattleNodes = dungeonRun.nodes.filter(n => n.type !== 'rest').length
      const diffConf = DIFFICULTY_CONFIG[dungeonRun.difficulty]
      const expEarned = totalBattleNodes > 0
        ? Math.round(dungeon.expReward * diffConf.expMult * nodesCleared / totalBattleNodes)
        : 0
      updateMeta(m => {
        const prev = m.heroProgress[heroId] ?? defaultHeroProgress()
        return { ...m, heroProgress: { ...m.heroProgress, [heroId]: addHeroExp(prev, expEarned) } }
      })
      setDungeonRun(null)
      setDungeonDroppedItem(null)
      setPhase({ type: 'dungeon_result', dungeonId: dungeonRun.dungeonId, heroId, cleared: false, floorsCleared: nodesCleared, difficulty: dungeonRun.difficulty, expEarned })
      return
    }

    const currentNodeId = dungeonRun.currentNodeId!
    const currentNode = dungeonRun.nodes.find(n => n.id === currentNodeId)!

    const diffConf = DIFFICULTY_CONFIG[dungeonRun.difficulty]

    if (currentNode.type === 'boss') {
      const isEclipse = dungeonRun.dungeonId === 'star_eclipse'
      const isThrone = dungeonRun.dungeonId === 'burning_throne'
      const isBlackTide = dungeonRun.dungeonId === 'black_tide'
      const isAshCovenant = dungeonRun.dungeonId === 'ash_covenant'
      const DROP_SLOTS = ['weapon','head','body','hands','boots','ring','accessory'] as const
      const drop = isEclipse
        ? (tryGenerateEclipseDrop(false, true, heroRole) ?? generateEquipment(DROP_SLOTS[Math.floor(Math.random() * DROP_SLOTS.length)], dungeon.equipRarity, heroRole))
        : isThrone
          ? (tryGenerateThroneDrops(false, true, heroRole) ?? generateEquipment(DROP_SLOTS[Math.floor(Math.random() * DROP_SLOTS.length)], dungeon.equipRarity, heroRole))
          : isBlackTide
            ? (tryGenerateBlackTideDrop(false, true, heroRole) ?? generateEquipment(DROP_SLOTS[Math.floor(Math.random() * DROP_SLOTS.length)], dungeon.equipRarity, heroRole))
            : isAshCovenant
              ? (tryGenerateCovenantDrop(false, true, heroRole) ?? generateEquipment(DROP_SLOTS[Math.floor(Math.random() * DROP_SLOTS.length)], dungeon.equipRarity, heroRole))
              : generateEquipment(DROP_SLOTS[Math.floor(Math.random() * DROP_SLOTS.length)], dungeon.equipRarity, heroRole)
      const nodesCleared = dungeonRun.nodes.filter(n => n.cleared).length + 1
      const chestId = `chest_${dungeonRun.difficulty}` as const
      updateMeta(m => {
        const prev = m.heroProgress[heroId] ?? defaultHeroProgress()
        const withWin = { ...prev, runsWon: prev.runsWon + 1, runsCompleted: prev.runsCompleted + 1 }
        const withExp = addHeroExp(withWin, Math.round(dungeon.expReward * diffConf.expMult))
        const updated = { ...withExp, stars: Math.max(withExp.stars, checkStarConditions(withExp)) }
        const items = m.items ?? []
        const existIdx = items.findIndex(s => s.id === chestId)
        const newItems = existIdx >= 0
          ? items.map((s, i) => i === existIdx ? { ...s, count: s.count + 1 } : s)
          : [...items, { id: chestId, count: 1 }]
        return {
          ...m,
          stardust: m.stardust + Math.round(dungeon.goldReward * diffConf.goldMult),
          inventory: [...m.inventory, drop],
          heroProgress: { ...m.heroProgress, [heroId]: updated },
          dungeonProgress: {
            ...m.dungeonProgress,
            [dungeonRun.dungeonId]: {
              cleared: true,
              bestFloor: nodesCleared,
              clearedDifficulties: [
                ...(m.dungeonProgress?.[dungeonRun.dungeonId]?.clearedDifficulties ?? []),
                dungeonRun.difficulty,
              ].filter((v, i, a) => a.indexOf(v) === i),
            },
          },
          items: newItems,
        }
      })
      setDungeonDroppedItem(drop)

      // ── Legendary: scoring & leaderboard ──
      if (dungeonRun.difficulty === 'legendary') {
        const finalTotalTurns      = dungeonRun.totalTurns + result.turnsUsed
        const finalDiceScore       = dungeonRun.diceScore  + result.diceComboScore
        const finalRetryCount      = dungeonRun.retryCount + newRevives
        const finalSpeedKillCount  = dungeonRun.speedKillCount + (wonFast ? 1 : 0)
        const finalNoDamageWins    = dungeonRun.noDamageWins   + (result.noDamage ? 1 : 0)
        const finalEliteCleared    = dungeonRun.eliteNodesCleared  // boss is not elite
        const finalCleanAttack     = dungeonRun.cleanAttackWins  + (result.noForbiddenTrigger ? 1 : 0)
        const finalCleanHighDmg    = dungeonRun.cleanHighDmgWins + (result.cleanHighDmg ? 1 : 0)
        const finalNoBacklash      = dungeonRun.noBacklashWins   + (result.noBacklash ? 1 : 0)
        const finalFlamePeak       = dungeonRun.highFlamePeakWins+ (result.flamePeakHigh ? 1 : 0)
        const finalOxygenSafe      = dungeonRun.oxygenSafeWins   + (result.oxygenSafe ? 1 : 0)
        const finalTideDmg         = dungeonRun.tideDmgWins      + (result.ebbtideDmgHigh ? 1 : 0)
        const finalJudgments       = dungeonRun.totalJudgments   + (result.judgmentsThisBattle ?? 0)
        const finalCovenantLow     = dungeonRun.lowCovenantWins  + (result.covenantLow ? 1 : 0)

        const challengesCompleted  = computeChallengesCompleted(dungeonRun.dungeonId, {
          speedKillCount:    finalSpeedKillCount,
          noDamageWins:      finalNoDamageWins,
          eliteNodesCleared: finalEliteCleared,
          cleanAttackWins:   finalCleanAttack,
          cleanHighDmgWins:  finalCleanHighDmg,
          noBacklashWins:    finalNoBacklash,
          highFlamePeakWins: finalFlamePeak,
          oxygenSafeWins:    finalOxygenSafe,
          tideDmgWins:       finalTideDmg,
          totalJudgments:    finalJudgments,
          lowCovenantWins:   finalCovenantLow,
        })
        const challengeBonus = getChallengeBonusScore(challengesCompleted)
        const currentMaxHp   = run.party[run.activePartyIdx].maxHp
        const remainHpPct    = Math.min(1, result.newHeroHp / currentMaxHp)

        const finalScore = calculateDungeonScore({
          totalTurns:         finalTotalTurns,
          remainingHpPercent: remainHpPct,
          diceScore:          finalDiceScore,
          challengeBonus,
        })
        const rankGrade    = getRankGrade(finalScore)
        const isValid      = true
        const seasonId     = getSeasonId()
        const recordId     = `${heroId}_${dungeonRun.dungeonId}_${Date.now()}`

        const clearRecord = {
          id: recordId,
          playerId:    user?.uid ?? getPlayerId(),
          playerName:  getPlayerName(),
          dungeonId:   dungeonRun.dungeonId,
          dungeonName: dungeon.name,
          difficulty:  dungeonRun.difficulty,
          heroClass:   heroRole ?? 'slash',
          score:       finalScore,
          rankGrade,
          totalTurns:         finalTotalTurns,
          remainingHpPercent: remainHpPct,
          diceScore:          finalDiceScore,
          challengeBonus,
          retryCount:     finalRetryCount,
          clearSuccess:   true,
          clearTime:      new Date().toISOString(),
          seasonId,
          isValidForRanking: isValid,
        }
        const localRankings: RankPositions = saveLeaderboardRecord(clearRecord)
        let rankings = localRankings
        const cloudRanks = await Promise.race([
          saveLeaderboardRecordCloud(clearRecord),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
        ])
        if (cloudRanks) rankings = cloudRanks

        playSound('victory')
        stopBgm()
        setDungeonRun(null)
        const goldEarned = Math.round(dungeon.goldReward * diffConf.goldMult)
        const expEarned  = Math.round(dungeon.expReward  * diffConf.expMult)
        setPhase({ type: 'dungeon_score', dungeonId: dungeonRun.dungeonId, heroId, clearRecord, rankings, goldEarned, expEarned })
        return
      }

      playSound('victory')
      stopBgm()
      setDungeonRun(null)
      setPhase({ type: 'dungeon_result', dungeonId: dungeonRun.dungeonId, heroId, cleared: true, floorsCleared: nodesCleared, difficulty: dungeonRun.difficulty })
      return
    }

    // Non-boss win: advance map, small heal, then give rewards
    const newNodes = advanceDungeonMap(dungeonRun.nodes, currentNodeId)
    const healAmt = Math.round(dungeonRun.maxHp * (dungeonRun.difficulty === 'legendary' ? 0.05 : 0.10))
    const nextHp = Math.min(result.newHeroHp + healAmt, dungeonRun.maxHp)
    const isEliteKill = currentNode.type === 'elite' || currentNode.type === 'mini_boss'
    const throneEmberReduction = (isEliteKill && dungeonRun.dungeonId === 'burning_throne' && run.relics.includes('throne_ember'))
      ? (getOwnedRelicEffect(run.relics, run.relicLevels, 'throne_ember')?.eliteKillFlameReduction ?? 1)
      : 0
    setRun(r => ({
      ...r,
      party: r.party.map((m, i) => i === r.activePartyIdx ? { ...m, hp: nextHp, undyingUsed: result.undyingUsed } : m),
      enemyStatus: [],
      potions: result.potionsLeft ?? r.potions,
      hourglassUsed: result.hourglassUsed,
      equipUndyingUsed: result.equipUndyingUsed,
      ...(throneEmberReduction > 0 ? { dungeonEliteFlameBonus: (r.dungeonEliteFlameBonus ?? 0) + throneEmberReduction } : {}),
    }))
    setDungeonRun(d => d ? { ...d, nodes: newNodes, currentNodeId: null } : null)

    if (currentNode.type === 'elite' || currentNode.type === 'mini_boss') {
      const isEclipse  = dungeonRun.dungeonId === 'star_eclipse'
      const isThrone   = dungeonRun.dungeonId === 'burning_throne'
      const isBlackTideElite = dungeonRun.dungeonId === 'black_tide'
      const isAshCovenantElite = dungeonRun.dungeonId === 'ash_covenant'
      const diff = dungeonRun.difficulty
      const eliteDrop = isEclipse
        ? tryGenerateEclipseDrop(true, false, heroRole, diff)
        : isThrone
          ? tryGenerateThroneDrops(true, false, heroRole, diff)
          : isBlackTideElite
            ? tryGenerateBlackTideDrop(true, false, heroRole, diff)
            : isAshCovenantElite
              ? tryGenerateCovenantDrop(true, false, heroRole, diff)
              : tryGenerateDrop(true, false, heroRole, getEffFateLevel())
      const activeMemberD = run.party[run.activePartyIdx]
      const hasUnusedRevival = (run.cards.some(c => c.id === 'undying') && !result.undyingUsed) || (run.relics.includes('hourglass') && !result.hourglassUsed)
      const relicExcludeD = hasUnusedRevival ? [...getMaxLevelRelicIds(run), 'hourglass'] : getMaxLevelRelicIds(run)
      setRewardRelics(getRandomRelics(diffConf.rewardCount, relicExcludeD, undefined, heroRole, dungeonRun.dungeonId))
      if (eliteDrop) {
        setPendingDrop(eliteDrop)
        setPendingPhaseAfterDrop({ type: 'relic_reward' })
        setPhase({ type: 'equipment_drop' })
      } else {
        setPhase({ type: 'relic_reward' })
      }
    } else {
      const activeMemberD2 = run.party[run.activePartyIdx]
      const hasUnusedRevivalD2 = (run.cards.some(c => c.id === 'undying') && !result.undyingUsed) || (run.relics.includes('hourglass') && !result.hourglassUsed)
      const cardExcludeD2 = hasUnusedRevivalD2 ? [...getMaxLevelCardIds(run), 'undying'] : getMaxLevelCardIds(run)
      setRewardCards(getRandomCards(diffConf.rewardCount, activeRole, cardExcludeD2, dungeonRun?.dungeonId))
      setPhase({ type: 'reward' })
    }
  }

  const getEffFateLevel = () => meta.activeFateLevel
  const getFateMult = () => 1 + getEffFateLevel() * 0.08  // +8% enemy HP per fate level

  const handleNodeSelect = (node: MapNode) => {
    setRun(r => ({ ...r, currentNodeId: node.id, enemyStatus: [], heroStatus: [] }))
    const isElite = node.type === 'elite'
    const isBoss  = node.type === 'boss'
    const isChapterBoss = isBoss && !isFinalBossFloor(node.floor)

    if (node.type === 'battle' || node.type === 'elite' || node.type === 'boss') {
      setLastBattleContext({ isElite, isBoss })
      const enemyId    = getEnemyForNode(node.floor, isElite, isBoss, run.campaign ?? 'main')
      const floorMult  = getFloorMult(node.floor, isElite, isBoss, getFateMult(), run.campaign ?? 'main')
      const goldReward = Math.round(getGoldReward(node.floor, isElite, isBoss) * (1 + getEffFateLevel() * 0.15))
      const enemyAffixes = rollEnemyAffixes(getEffFateLevel(), isBoss)
      setPhase({ type: 'battle', isElite, isBoss, isChapterBoss, floorMult, goldReward, enemyId, enemyAffixes })
    } else if (node.type === 'rest') {
      setPhase({ type: 'rest' })
    } else if (node.type === 'shop') {
      setPhase({ type: 'shop' })
    } else if (node.type === 'event') {
      const event = getRandomEvent()
      setPhase({ type: 'event', eventId: event.id })
    } else if (node.type === 'chest') {
      // 50% free reward, 50% mimic fight
      if (Math.random() < 0.5) {
        const chestGold = 20 + Math.floor(Math.random() * 20)
        const gotPotion = Math.random() < 0.5
        setRun(r => {
          const cur = r.potions ?? []
          const addPotion = gotPotion && cur.length < MAX_POTIONS ? [getRandomPotion().id] : []
          return { ...r, gold: r.gold + chestGold, nodes: advanceMap(r.nodes, node.id), potions: [...cur, ...addPotion] }
        })
        const cards = getRandomCards(3, activeRole, getMaxLevelCardIds(run))
        setRewardCards(cards)
        setPhase({ type: 'reward' })
      } else {
        // Mimic fight
        setLastBattleContext({ isElite: false, isBoss: false })
        const floorMult  = getFloorMult(node.floor, false, false, getFateMult(), run.campaign ?? 'main')
        const goldReward = Math.round((getGoldReward(node.floor, false, false) + 30) * (1 + getEffFateLevel() * 0.15))
        setPhase({ type: 'battle', isElite: false, isBoss: false, isChapterBoss: false, floorMult: floorMult * 1.2, goldReward, enemyId: 'mimic', enemyAffixes: rollEnemyAffixes(getEffFateLevel(), false) })
      }
    }
  }

  const transitionWithDrop = (nextPhase: GamePhase, isElite: boolean, isBoss: boolean, heroId: string) => {
    if (!FEATURE_FLAGS.equipment) { setPhase(nextPhase); return }
    const heroRole = HEROES.find(h => h.id === heroId)?.role
    const drop = tryGenerateDrop(isElite, isBoss, heroRole, getEffFateLevel())
    if (drop) {
      setPendingDrop(drop)
      setPendingPhaseAfterDrop(nextPhase)
      setPhase({ type: 'equipment_drop' })
    } else {
      setPhase(nextPhase)
    }
  }

  const handleBattleComplete = (result: { won: boolean; goldEarned: number; newHeroHp: number; noDamage?: boolean; potionsLeft?: string[]; undyingUsed: boolean; hourglassUsed: boolean; equipUndyingUsed: boolean; turnsUsed: number; diceComboScore: number }) => {
    const heroId = run.party[run.activePartyIdx].heroId
    if (!result.won) {
      const floors = countFloorsCleared(run.nodes)
      const stardust = calcRunStardust(false, floors, getEffFateLevel())
      awardRunExp(heroId, false, floors)
      updateMeta(m => ({ ...m, totalRuns: m.totalRuns + 1, stardust: m.stardust + stardust }))
      setRun(r => ({
        ...r,
        party: r.party.map((m, i) => i === r.activePartyIdx ? { ...m, hp: 0 } : m),
      }))
      setPhase({ type: 'game_over' })
      return
    }

    const currentNodeId = run.currentNodeId!
    const node = run.nodes.find(n => n.id === currentNodeId)!
    const isElite = node.type === 'elite'
    const isBoss = node.type === 'boss'

    const heroRole = HEROES.find(h => h.id === heroId)?.role

    // Post-battle base heal: normal 15% / elite 8% / boss 25% of max HP
    const baseHealPct = isBoss ? 0.25 : isElite ? 0.08 : 0.15

    setRun(r => {
      const member = r.party[r.activePartyIdx]
      const relicHeal = getRelicHealOnWin(r.relics, r.relicLevels) + Math.round(member.maxHp * getRelicHealOnWinPct(r.relics, r.relicLevels))
      const baseHeal = Math.round(member.maxHp * baseHealPct)
      const newHp = Math.min(result.newHeroHp + baseHeal + relicHeal, member.maxHp)
      return {
        ...r,
        party: r.party.map((m, i) => i === r.activePartyIdx ? { ...m, hp: newHp, angerCount: 0, undyingUsed: result.undyingUsed } : m),
        gold: r.gold + result.goldEarned,
        nodes: advanceMap(r.nodes, currentNodeId),
        enemyStatus: [],
        noDamageBattleCount: result.noDamage ? r.noDamageBattleCount + 1 : 0,
        potions: result.potionsLeft ?? r.potions,
        hourglassUsed: result.hourglassUsed,
        equipUndyingUsed: result.equipUndyingUsed,
      }
    })

    const hasUnusedRevival = (run.cards.some(c => c.id === 'undying') && !result.undyingUsed) || (run.relics.includes('hourglass') && !result.hourglassUsed)

    if (isBoss) {
      const currentFloor = node.floor
      const isFinal = isFinalBossFloor(currentFloor)
      const chapter = getChapter(currentFloor)

      if (isFinal) {
        // True victory
        const floorsCleared = FLOOR_COUNT
        const stardust = calcRunStardust(true, floorsCleared, getEffFateLevel())
        awardRunExp(heroId, true, floorsCleared)
        const activeCampaign = run.campaign ?? 'main'
        updateMeta(m => ({
          ...m,
          totalRuns: m.totalRuns + 1,
          totalWins: m.totalWins + 1,
          stardust: m.stardust + stardust,
          fateLevel: Math.min(m.fateLevel + 1, 10),
          campaignCleared: { ...m.campaignCleared, [activeCampaign]: true },
        }))
        playSound('victory')
        const victoryPhase: GamePhase = { type: 'victory', result: { won: true, floorsCleared } }
        transitionWithDrop(victoryPhase, isElite, isBoss, heroId)
      } else {
        // Chapter boss cleared → chapter reward
        const chapterGoldBonus = 30 + chapter * 10
        setRun(r => ({ ...r, gold: r.gold + chapterGoldBonus, chapter: chapter + 1 }))
        // Give chapter relic reward after chapter_clear screen
        const heroRole = HEROES.find(h => h.id === heroId)?.role
        const chapterRelicExclude = hasUnusedRevival ? [...getMaxLevelRelicIds(run), 'hourglass'] : getMaxLevelRelicIds(run)
        setRewardRelics(getRandomRelics(3, chapterRelicExclude, 'rare', heroRole))
        setPhase({ type: 'chapter_clear', chapter })
      }
      return
    }

    if (isElite) {
      const relicExclude = hasUnusedRevival ? [...getMaxLevelRelicIds(run), 'hourglass'] : getMaxLevelRelicIds(run)
      const relics = getRandomRelics(3, relicExclude, undefined, heroRole)
      setRewardRelics(relics)
      transitionWithDrop({ type: 'relic_reward' }, isElite, isBoss, heroId)
      return
    }

    const cardExclude = hasUnusedRevival ? [...getMaxLevelCardIds(run), 'undying'] : getMaxLevelCardIds(run)
    const cards = getRandomCards(3, activeRole, cardExclude)
    setRewardCards(cards)
    // Normal battles don't drop equipment
    setPhase({ type: 'reward' })
  }

  const handleDropKeep = () => {
    if (!pendingDrop) { setPhase(pendingPhaseAfterDrop); return }
    updateMeta(m => ({ ...m, inventory: [...m.inventory, pendingDrop] }))
    setPendingDrop(null)
    setPhase(pendingPhaseAfterDrop)
  }

  const handleDropSalvage = () => {
    if (!pendingDrop) { setPhase(pendingPhaseAfterDrop); return }
    updateMeta(m => ({ ...m, stardust: m.stardust + SALVAGE_VALUE[pendingDrop.rarity] }))
    setPendingDrop(null)
    setPhase(pendingPhaseAfterDrop)
  }

  const handleDropReplace = (uid: string) => {
    if (!pendingDrop) { setPhase(pendingPhaseAfterDrop); return }
    const replaced = meta.inventory.find(e => e.uid === uid)
    if (replaced) {
      updateMeta(m => ({
        ...m,
        inventory: [...m.inventory.filter(e => e.uid !== uid), pendingDrop],
        stardust: m.stardust + SALVAGE_VALUE[replaced.rarity],
      }))
    }
    setPendingDrop(null)
    setPhase(pendingPhaseAfterDrop)
  }

  const handleCardSelect = (card: BuffCard) => {
    setRun(r => {
      const currentLevel = r.cardLevels[card.id] ?? 0
      const isOwned = currentLevel > 0
      const maxLevel = card.maxLevel ?? 1

      if (isOwned && maxLevel > 1 && currentLevel < maxLevel) {
        // 升級既有卡
        const newLevel = currentLevel + 1
        const prevEffect = getEffectiveCardEffect(card, currentLevel)
        const newEffect = getEffectiveCardEffect(card, newLevel)
        const hpDiff = (newEffect.maxHpBonus ?? 0) - (prevEffect.maxHpBonus ?? 0)
        return {
          ...r,
          cardLevels: { ...r.cardLevels, [card.id]: newLevel },
          party: hpDiff > 0 ? r.party.map((m, i) => i === r.activePartyIdx
            ? { ...m, maxHp: m.maxHp + hpDiff, hp: Math.min(m.hp + hpDiff, m.maxHp + hpDiff) }
            : m) : r.party,
        }
      }

      // 首次取得
      const maxHpBonus = card.effect.maxHpBonus ?? 0
      return {
        ...r,
        cards: [...r.cards, card],
        cardLevels: { ...r.cardLevels, [card.id]: 1 },
        party: r.party.map((m, i) => i === r.activePartyIdx
          ? { ...m, maxHp: m.maxHp + maxHpBonus, hp: Math.min(m.hp + maxHpBonus, m.maxHp + maxHpBonus) }
          : m),
      }
    })
    if (dungeonRun) {
      setPhase({ type: 'dungeon_map', dungeonId: dungeonRun.dungeonId, heroId: dungeonRun.heroId })
    } else {
      setPhase({ type: 'map' })
    }
  }

  const handleRelicSelect = (relic: Relic) => {
    setRun(r => {
      const currentLevel = r.relicLevels?.[relic.id] ?? 0
      const isOwned = currentLevel > 0
      const maxLevel = relic.maxLevel ?? 1

      if (isOwned && maxLevel > 1 && currentLevel < maxLevel) {
        // 升級既有遺物
        return { ...r, relicLevels: { ...r.relicLevels, [relic.id]: currentLevel + 1 } }
      }

      // 首次取得
      const newRelics = [...r.relics, relic.id]
      const newRelicLevels = { ...r.relicLevels, [relic.id]: 1 }
      // 惡魔契約: permanently reduce maxHP at pickup (like 易碎詛咒)
      const maxHpMult = relic.effect.relicMaxHpMult
      if (maxHpMult !== undefined) {
        const m = r.party[r.activePartyIdx]
        const newMaxHp = Math.max(10, Math.round(m.maxHp * maxHpMult))
        return {
          ...r,
          relics: newRelics,
          relicLevels: newRelicLevels,
          party: r.party.map((mem, i) => i === r.activePartyIdx
            ? { ...mem, maxHp: newMaxHp, hp: Math.min(mem.hp, newMaxHp) }
            : mem),
        }
      }
      return { ...r, relics: newRelics, relicLevels: newRelicLevels }
    })
    // After relic reward → show card reward for elite battles
    const cards = getRandomCards(3, activeRole, getMaxLevelCardIds(run))
    setRewardCards(cards)
    setPhase({ type: 'reward' })
  }

  const handleEventComplete = (outcome: EventOutcome) => {
    const nodeId = run.currentNodeId!
    const advance = (r: RunState) => ({ ...r, nodes: advanceMap(r.nodes, nodeId) })

    const applySideEffects = (r: RunState): RunState => {
      let res = r
      if (outcome.withCurse) {
        const curse = getRandomCurse()
        const m = res.party[res.activePartyIdx]
        const mult = curse.effect.maxHpMult ?? 1
        const newMaxHp = Math.max(10, Math.round(m.maxHp * mult))
        res = { ...res, curses: [...res.curses, curse.id], party: res.party.map((mem, i) => i === res.activePartyIdx ? { ...mem, maxHp: newMaxHp, hp: Math.min(mem.hp, newMaxHp) } : mem) }
      }
      if (outcome.goldBonus) {
        res = { ...res, gold: Math.max(0, res.gold + outcome.goldBonus) }
      }
      return res
    }

    switch (outcome.type) {
      case 'heal': {
        const pct = (outcome.value ?? 25) / 100
        setRun(r => {
          const m = r.party[r.activePartyIdx]
          const healAmt = Math.round(m.maxHp * pct)
          return applySideEffects({ ...advance(r), party: r.party.map((mem, i) => i === r.activePartyIdx ? { ...mem, hp: Math.min(mem.hp + healAmt, mem.maxHp) } : mem) })
        })
        setPhase({ type: 'map' }); break
      }
      case 'full_heal': {
        setRun(r => applySideEffects({ ...advance(r), party: r.party.map((m, i) => i === r.activePartyIdx ? { ...m, hp: m.maxHp } : m) }))
        setPhase({ type: 'map' }); break
      }
      case 'gold': {
        setRun(r => applySideEffects({ ...advance(r), gold: Math.max(0, r.gold + (outcome.value ?? 0)) }))
        setPhase({ type: 'map' }); break
      }
      case 'damage': {
        const pct = (outcome.value ?? 10) / 100
        setRun(r => {
          const m = r.party[r.activePartyIdx]
          const dmg = Math.round(m.maxHp * pct)
          return applySideEffects({ ...advance(r), party: r.party.map((mem, i) => i === r.activePartyIdx ? { ...mem, hp: Math.max(1, mem.hp - dmg) } : mem) })
        })
        setPhase({ type: 'map' }); break
      }
      case 'relic': {
        const eHeroRole = HEROES.find(h => h.id === run.party[run.activePartyIdx].heroId)?.role
        setRun(r => applySideEffects(advance(r)))
        setRewardRelics(getRandomRelics(3, getMaxLevelRelicIds(run), undefined, eHeroRole))
        setPhase({ type: 'relic_reward' }); break
      }
      case 'curse': {
        const curse = getRandomCurse()
        setRun(r => {
          const m = r.party[r.activePartyIdx]
          const mult = curse.effect.maxHpMult ?? 1
          const newMaxHp = Math.max(10, Math.round(m.maxHp * mult))
          return applySideEffects({
            ...advance(r), curses: [...r.curses, curse.id],
            party: r.party.map((mem, i) => i === r.activePartyIdx ? { ...mem, maxHp: newMaxHp, hp: Math.min(mem.hp, newMaxHp) } : mem),
          })
        })
        setPhase({ type: 'map' }); break
      }
      case 'rare_card': {
        setRun(r => applySideEffects(advance(r)))
        setRewardCards(getRandomCards(3, activeRole, getMaxLevelCardIds(run)))
        setPhase({ type: 'reward' }); break
      }
      default:
        setRun(r => applySideEffects(advance(r)))
        setPhase({ type: 'map' })
    }
  }

  const handleShopLeave = (result: {
    goldSpent: number
    hpGained: number
    newCard: BuffCard | null
    potions?: string[]
    upgradedCardIds?: string[]
    newRelicId?: string | null
    copiedCardId?: string | null
    upgradedRarityCardId?: string | null
    newRarity?: 'rare' | 'epic' | null
  }) => {
    const nodeId = run.currentNodeId!
    setRun(r => {
      let base = {
        ...r,
        gold: r.gold - result.goldSpent,
        party: r.party.map((mem, i) => i === r.activePartyIdx ? { ...mem, hp: Math.min(mem.hp + result.hpGained, mem.maxHp) } : mem),
        nodes: advanceMap(r.nodes, nodeId),
        potions: result.potions ?? r.potions,
      }

      // New card acquisition
      if (result.newCard) {
        const maxHpBonus = result.newCard.effect.maxHpBonus ?? 0
        base = {
          ...base,
          cards: [...base.cards, result.newCard],
          cardLevels: { ...base.cardLevels, [result.newCard.id]: 1 },
          party: base.party.map((mem, i) => i === base.activePartyIdx
            ? { ...mem, maxHp: mem.maxHp + maxHpBonus, hp: Math.min(mem.hp + maxHpBonus, mem.maxHp + maxHpBonus) }
            : mem),
        }
      }

      // Card upgrades
      for (const cardId of (result.upgradedCardIds ?? [])) {
        const card = base.cards.find(c => c.id === cardId)
        if (!card) continue
        const currentLevel = base.cardLevels[cardId] ?? 1
        const newLevel = currentLevel + 1
        const prevEffect = getEffectiveCardEffect(card, currentLevel)
        const newEffect = getEffectiveCardEffect(card, newLevel)
        const hpDiff = (newEffect.maxHpBonus ?? 0) - (prevEffect.maxHpBonus ?? 0)
        base = {
          ...base,
          cardLevels: { ...base.cardLevels, [cardId]: newLevel },
          party: hpDiff > 0
            ? base.party.map((m, i) => i === base.activePartyIdx
                ? { ...m, maxHp: m.maxHp + hpDiff, hp: Math.min(m.hp + hpDiff, m.maxHp + hpDiff) }
                : m)
            : base.party,
        }
      }

      // Relic purchase
      if (result.newRelicId) {
        const relic = getRelicById(result.newRelicId)
        if (relic) {
          const newRelics = [...base.relics, relic.id]
          const newRelicLevels = { ...base.relicLevels, [relic.id]: 1 }
          const maxHpMult = relic.effect.relicMaxHpMult
          if (maxHpMult !== undefined) {
            const m = base.party[base.activePartyIdx]
            const newMaxHp = Math.max(10, Math.round(m.maxHp * maxHpMult))
            base = {
              ...base,
              relics: newRelics,
              relicLevels: newRelicLevels,
              party: base.party.map((mem, i) => i === base.activePartyIdx
                ? { ...mem, maxHp: newMaxHp, hp: Math.min(mem.hp, newMaxHp) }
                : mem),
            }
          } else {
            base = { ...base, relics: newRelics, relicLevels: newRelicLevels }
          }
        }
      }

      // Card copy
      if (result.copiedCardId) {
        const original = base.cards.find(c => c.id === result.copiedCardId)
        if (original) {
          base = { ...base, cards: [...base.cards, original] }
        }
      }

      // Rarity upgrade
      if (result.upgradedRarityCardId && result.newRarity) {
        const newRar = result.newRarity
        base = {
          ...base,
          cards: base.cards.map(c => c.id === result.upgradedRarityCardId ? { ...c, rarity: newRar } : c),
        }
      }

      return base
    })
    setPhase({ type: 'map' })
  }

  const handleRestChoice = (choice: 'rest' | 'pray' | 'train') => {
    const nodeId = run.currentNodeId!
    const member = run.party[run.activePartyIdx]
    if (choice === 'rest') {
      let heal = Math.round(member.maxHp * 0.4)
      if (getEffFateLevel() >= 5) heal = Math.round(heal * 0.5)  // fate lv5
      setRun(r => ({
        ...r,
        party: r.party.map((m, i) => i === r.activePartyIdx ? { ...m, hp: Math.min(m.hp + heal, m.maxHp) } : m),
        nodes: advanceMap(r.nodes, nodeId),
      }))
    } else if (choice === 'pray') {
      setRun(r => ({ ...r, curses: r.curses.slice(1), nodes: advanceMap(r.nodes, nodeId) }))
    } else { // train
      updateMeta(m => {
        const prog = m.heroProgress[member.heroId] ?? defaultHeroProgress()
        return { ...m, heroProgress: { ...m.heroProgress, [member.heroId]: addHeroExp(prog, 150) } }
      })
      setRun(r => ({ ...r, nodes: advanceMap(r.nodes, nodeId) }))
    }
    setPhase({ type: 'map' })
  }

  const restart = () => setPhase({ type: 'main_menu' })

  const isGmMode = HEROES.every(h => (meta.heroProgress[h.id]?.level ?? 1) >= 100)

  const applyGmToggle = () => {
    updateMeta(m => {
      const heroProgress = { ...m.heroProgress }
      if (isGmMode) {
        for (const h of HEROES) heroProgress[h.id] = defaultHeroProgress()
      } else {
        for (const h of HEROES) {
          heroProgress[h.id] = {
            level: 100, exp: 0, stars: 3,
            runsCompleted: 20, runsWon: 20,
            selectedTalents: { 20: '20a', 40: '40a', 60: '60a', 80: '80a', 100: '100a' },
            talentPoints: 99, allocatedTalentIds: generateHeroTalentTree(h.id).map(n => n.id),
          }
        }
      }
      return { ...m, heroProgress }
    })
  }

  const handleGmConfirm = () => {
    if (gmPassword === '151128') {
      applyGmToggle()
      setGmDialogOpen(false)
      setGmPassword('')
      setGmPasswordError(false)
    } else {
      setGmPasswordError(true)
      setGmPassword('')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (showNameModal) {
    const handleNameConfirm = (name: string) => {
      setPlayerName(name)
      setShowNameModal(false)
      if (user) cloudSave(user.uid).catch(() => {})
    }
    return <PlayerNameModal onConfirm={handleNameConfirm} />
  }

  if (phase.type === 'main_menu') {
    return (
      <MainMenuScreen
        meta={meta}
        savedRun={FEATURE_FLAGS.turnBasedMainline ? (() => { const s = loadSavedRun(); return (s?.phase.type === 'battle' && s.phase.dungeonId) ? null : s })() : null}
        onStartAdventure={() => setPhase({ type: 'adventure_ready' })}
        onEquipment={() => setPhase({ type: 'equipment_manage' })}

        onContinue={handleContinueRun}
        user={user}
        cloudMsg={cloudMsg}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onCloudSave={handleCloudSave}
        onCloudLoad={handleCloudLoad}
        onSetFateLevel={lv => updateMeta(m => ({ ...m, activeFateLevel: Math.min(lv, m.fateLevel) }))}
        onGmMode={() => setPhase({ type: 'gm' })}
        onMetaUpdate={updateMeta}
      />
    )
  }

  if (phase.type === 'gm') {
    return <GmScreen meta={meta} onUpdateMeta={updateMeta} onBack={() => setPhase({ type: 'main_menu' })} onArenaTest={() => setPhase({ type: 'arena_test' })} />
  }

  if (phase.type === 'arena_test') {
    const hero = HEROES.find(h => h.id === 'knight') ?? HEROES[0]
    return (
      <ArenaScreen
        config={{
          heroId: hero.id,
          heroName: hero.name,
          maxHp: hero.hp,
          atkDamage: Math.round(hero.atk * 0.6),
          atkCooldown: 0.45,
          moveSpeed: 260,
        }}
        onExit={() => setPhase({ type: 'gm' })}
      />
    )
  }

  if (phase.type === 'arena_run') {
    const hero = HEROES.find(h => h.id === phase.heroId) ?? HEROES[0]
    // 天賦樹重做（2026-08-07）：不再用舊 computeTalentBonus()（5選1、免費），
    // 改用 arenaTalents.ts 的新系統——大量小節點都要花天賦點數點亮，沿路一個
    // 由角色等級控制的職業技能（keystoneUnlocked 影響 ArenaGame 的
    // updateKeystone 行為）。
    const heroProgress = meta.heroProgress[hero.id] ?? defaultHeroProgress()
    const talentBonus = computeArenaTalentBonus(hero.id, heroProgress.allocatedTalentIds)
    return (
      <ArenaScreen
        config={{
          heroId: hero.id,
          heroName: hero.name,
          maxHp: hero.hp + talentBonus.hpBonus,
          atkDamage: Math.round(hero.atk * 0.6) + talentBonus.flatDamage,
          atkCooldown: 0.45 * talentBonus.atkCooldownMult,
          moveSpeed: 260 * talentBonus.moveSpeedMult,
          pickupRangeMult: talentBonus.pickupRangeMult,
          keystoneUnlocked: talentBonus.keystoneUnlocked,
        }}
        onExit={() => setPhase({ type: 'main_menu' })}
        onRunEnd={(won, floorsCleared, goldEarned) => {
          awardRunExp(hero.id, won, floorsCleared)
          if (goldEarned > 0) updateMeta(m => ({ ...m, gold: m.gold + goldEarned }))
        }}
      />
    )
  }

  if (phase.type === 'equipment_manage') {
    const silentCloudSave = () => { if (userRef.current) cloudSave(userRef.current.uid).catch(() => {}) }
    return <EquipmentScreen meta={meta} onMetaUpdate={updateMeta} onBack={() => setPhase({ type: 'main_menu' })} onSilentCloudSave={silentCloudSave} />
  }

  if (phase.type === 'adventure_ready' || phase.type === 'hero_select' || phase.type === 'route_select') {
    return (
      <div className="page">
        <AdventureReadyScreen
          meta={meta}
          onStart={handleAdventureStart}
          onSetFateLevel={lv => updateMeta(m => ({ ...m, activeFateLevel: Math.min(lv, m.fateLevel) }))}
          onMetaUpdate={updateMeta}
          onBack={() => setPhase({ type: 'main_menu' })}
          onLeaderboard={() => setPhase({ type: 'leaderboard' })}
        />
      </div>
    )
  }

  if (phase.type === 'chapter_clear') {
    const handleChapterContinue = () => {
      const nextChapter = phase.chapter + 1
      // Heal 20% HP, generate the next chapter's fresh map, then show relic reward
      setRun(r => {
        const m = r.party[r.activePartyIdx]
        const healAmt = Math.round(m.maxHp * 0.2)
        return {
          ...r,
          chapter: nextChapter,
          nodes: generateMap(r.routeType, nextChapter),
          currentNodeId: null,
          enemyStatus: [],
          party: r.party.map((mem, i) => i === r.activePartyIdx ? { ...mem, hp: Math.min(mem.hp + healAmt, mem.maxHp) } : mem),
        }
      })
      setPhase({ type: 'relic_reward' })
    }
    return (
      <div className="page">
        <ChapterClearScreen
          chapter={phase.chapter}
          goldBonus={30 + phase.chapter * 10}
          campaign={run.campaign ?? 'main'}
          onContinue={handleChapterContinue}
        />
      </div>
    )
  }

  if (phase.type === 'dungeon_event' && dungeonRun) {
    return (
      <div className="page">
        <AshCovenantEventScreen
          eventId={phase.eventId}
          nodeId={phase.nodeId}
          heroHp={run.party[run.activePartyIdx].hp}
          heroMaxHp={dungeonRun.maxHp}
          onComplete={(result) => {
            // Apply immediate effects
            if (result.hpChange !== 0) {
              setRun(r => ({
                ...r,
                party: r.party.map((m, i) => i === r.activePartyIdx
                  ? { ...m, hp: Math.max(1, Math.min(m.hp + result.hpChange, dungeonRun.maxHp)) }
                  : m),
              }))
            }
            if ((result.goldGain ?? 0) > 0) {
              setRun(r => ({ ...r, gold: r.gold + (result.goldGain ?? 0) }))
            }
            // Store event buff for next battle
            const newNodes = advanceDungeonMap(dungeonRun.nodes, phase.nodeId)
            setDungeonRun(d => d ? { ...d, nodes: newNodes, covenantEventBuff: result.nextBattleBuff } : null)
            setPhase({ type: 'dungeon_map', dungeonId: dungeonRun.dungeonId, heroId: dungeonRun.heroId })
          }}
        />
      </div>
    )
  }

  if (phase.type === 'dungeon_select') {
    return (
      <div className="page">
        <DungeonSelectScreen
          meta={meta}
          preSelectedId={pendingDungeonId || undefined}
          onEnterDungeon={startDungeon}
          onBack={() => setPhase({ type: 'adventure_ready' })}
          onLeaderboard={(dungeonId) => setPhase({ type: 'leaderboard', dungeonId })}
        />
      </div>
    )
  }

  if (phase.type === 'dungeon_map' && dungeonRun) {
    const dMapMember = run.party[run.activePartyIdx]
    return (
      <div className="page">
        <DungeonMapScreen
          nodes={dungeonRun.nodes}
          heroHp={dMapMember.hp}
          heroMaxHp={dMapMember.maxHp}
          dungeonId={dungeonRun.dungeonId}
          onSelectNode={handleDungeonNodeSelect}
          onExit={() => { stopBgm(); setDungeonRun(null); setDungeonChestGold(null); setPhase({ type: 'main_menu' }) }}
        />
        {dungeonChestGold !== null && (
          <div className="mm-panel-overlay" onClick={() => setDungeonChestGold(null)}>
            <div className="chest-gold-popup" onClick={e => e.stopPropagation()}>
              <div className="chest-gold-popup-icon">📦</div>
              <div className="chest-gold-popup-title">寶箱開啟！</div>
              <div className="chest-gold-popup-amt">💰 +{dungeonChestGold} 金幣</div>
              <button className="secondary" onClick={() => setDungeonChestGold(null)}>確認</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (phase.type === 'dungeon_result') {
    const dungeon = getDungeon(phase.dungeonId)!
    const diffConf = DIFFICULTY_CONFIG[(phase.difficulty ?? 'normal') as DungeonDifficulty]
    const goldEarned = phase.cleared ? Math.round(dungeon.goldReward * diffConf.goldMult) : 0
    const expEarned  = phase.cleared ? Math.round(dungeon.expReward * diffConf.expMult) : (phase.expEarned ?? 0)
    return (
      <div className="page">
        <DungeonResultScreen
          dungeon={dungeon}
          cleared={phase.cleared}
          floorsCleared={phase.floorsCleared}
          goldEarned={goldEarned}
          expEarned={expEarned}
          difficulty={(phase.difficulty ?? 'normal') as DungeonDifficulty}
          droppedItem={dungeonDroppedItem}
          onRetry={() => setPhase({ type: 'adventure_ready' })}
          onBack={() => setPhase({ type: 'adventure_ready' })}
        />
      </div>
    )
  }

  if (phase.type === 'dungeon_score') {
    const dungeon = getDungeon(phase.dungeonId)!
    return (
      <div className="page">
        <DungeonClearScreen
          dungeon={dungeon}
          heroId={phase.heroId}
          clearRecord={phase.clearRecord}
          rankings={phase.rankings}
          goldEarned={phase.goldEarned}
          expEarned={phase.expEarned}
          droppedItem={dungeonDroppedItem}
          onBack={() => setPhase({ type: 'adventure_ready' })}
          onLeaderboard={() => setPhase({ type: 'leaderboard', dungeonId: phase.dungeonId })}
        />
      </div>
    )
  }

  if (phase.type === 'leaderboard') {
    return (
      <div className="page">
        <LeaderboardScreen
          initialDungeonId={phase.dungeonId}
          onBack={() => setPhase({ type: 'adventure_ready' })}
        />
      </div>
    )
  }


  const activeEquipment = getActiveEquipment(activeMember.heroId)
  const activeTalentBonus = getActiveTalentBonus(activeMember.heroId)

  return (
    <div className={phase.type === 'battle' ? 'page page-battle' : 'page'}>
      <header className="topbar small">
        <div>
          <div className="eyebrow">DICE HERO RPG</div>
          {user && <div className="topbar-player-name">{getPlayerName()}</div>}
        </div>
        <div className="topbar-right">
          {phase.type !== 'game_over' && phase.type !== 'victory' && (
            <>
              <span className="stat-chip">❤️ {activeMember.hp}/{activeMember.maxHp}</span>
              <span className="stat-chip">💰 {run.gold}</span>
              <span className="stat-chip">🃏 {run.cards.length}</span>
              {run.relics.length > 0 && <span className="stat-chip">💎 {run.relics.length}</span>}
              {run.curses.length > 0 && <span className="stat-chip" style={{ color: '#c080ff' }}>💀 {run.curses.length}</span>}
            </>
          )}
          <span className="version-tag">{APP_VERSION}</span>
        </div>
      </header>

      <main className="main-content">
        {phase.type === 'map' && <MapScreen run={run} onSelectNode={handleNodeSelect} onExit={() => { stopBgm(); setPhase({ type: 'main_menu' }) }} />}

        {phase.type === 'battle' && (
          <BattleScreen
            run={run}
            equipment={activeEquipment}
            talentBonus={activeTalentBonus}
            enemyId={phase.enemyId}
            floorMult={phase.floorMult}
            isElite={phase.isElite}
            isBoss={phase.isBoss}
            isChapterBoss={phase.isChapterBoss}
            activeFateLevel={getEffFateLevel()}
            enemyAffixes={phase.enemyAffixes}
            goldReward={phase.goldReward}
            heroStars={meta.heroProgress[activeMember.heroId]?.stars ?? 0}
            forbiddenDice={phase.forbiddenDice}
            dungeonId={phase.dungeonId}
            dungeonDifficulty={phase.dungeonDifficulty}
            hourglassUsed={run.hourglassUsed ?? false}
            equipUndyingUsed={run.equipUndyingUsed ?? false}
            onComplete={dungeonRun ? handleDungeonBattleComplete : handleBattleComplete}
          />
        )}

        {phase.type === 'reward' && (
          <RewardScreen cards={rewardCards} ownedCards={run.cards} cardLevels={run.cardLevels} onSelect={handleCardSelect} onSkip={() => dungeonRun ? setPhase({ type: 'dungeon_map', dungeonId: dungeonRun.dungeonId, heroId: dungeonRun.heroId }) : setPhase({ type: 'map' })} />
        )}

        {phase.type === 'relic_reward' && (
          <RelicRewardScreen relics={rewardRelics} ownedRelicIds={run.relics} relicLevels={run.relicLevels} onSelect={handleRelicSelect} onSkip={() => dungeonRun ? setPhase({ type: 'dungeon_map', dungeonId: dungeonRun.dungeonId, heroId: dungeonRun.heroId }) : setPhase({ type: 'map' })} />
        )}

        {phase.type === 'event' && (
          <EventScreen eventId={phase.eventId} onComplete={handleEventComplete} />
        )}

        {phase.type === 'equipment_drop' && pendingDrop && (
          <EquipmentDropScreen
            item={pendingDrop}
            meta={meta}
            onKeep={handleDropKeep}
            onSalvage={handleDropSalvage}
            onReplace={handleDropReplace}
          />
        )}

        {phase.type === 'shop' && <ShopScreen run={run} onLeave={handleShopLeave} />}

        {phase.type === 'rest' && (
          <RestScreen heroHp={activeMember.hp} heroMaxHp={activeMember.maxHp} curseCount={run.curses.length} onChoose={handleRestChoice} />
        )}

        {phase.type === 'game_over' && <GameOverScreen run={run} onRestart={restart} />}

        {phase.type === 'victory' && <VictoryScreen run={run} onRestart={restart} />}
      </main>
    </div>
  )
}
