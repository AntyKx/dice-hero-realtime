import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import SpriteAnimator from '../components/SpriteAnimator'
import DieFace from '../components/DieFace'
import { HEROES, ENEMIES, getHeroSprite } from '../data'
import { getEffectiveCardEffect } from '../buffCards'
import {
  rollFive, rerollDice, evaluateDice, computeHeroAction, getComboDiceIndices,
  applyCardEffects, getRerollBonus, getDefBonus, getStartShield, clamp,
} from '../gameLogic'
import {
  getRelicRerollBonus, getRelicDefBonus, getRelicStartShield,
  getRelicStartEnemyBurn, getRelicDamageBonus, getRelicHealBonus,
  getRelicBurnOnSix, getRelicGoldOnSix, getRelicGoldMult,
  getRelicHealOnSix, hasRelic, getOwnedRelicEffect,
} from '../relics'
import { getPotionById } from '../potions'
import { getCurseById } from '../curses'
import { computeEquipBonus } from '../equipment'
import { getEnemyMechanic, MECHANIC_DESC } from '../bosses'
import RelicChip from '../components/RelicChip'
import { getHeroStarTitle } from '../talents'
import type { RunState, StatusEffect, Equipment, LegendaryEffectId, TalentBonus, TalentPassiveId, EnemyAffix, EnemyAffixId, BattleMinion, CovenantEventBuff } from '../types'
import { getDiceComboScore } from '../scoring'
import { playSound, isMuted, setMuted, playBgm } from '../lib/sound'

type AnimState = 'idle' | 'attack' | 'skill' | 'hurt'

interface Props {
  run: RunState
  equipment: Equipment[]
  talentBonus: TalentBonus
  enemyId: string
  floorMult: number
  isElite: boolean
  isBoss: boolean
  isChapterBoss: boolean
  activeFateLevel: number
  enemyAffixes: EnemyAffix[]
  goldReward: number
  heroStars?: number
  forbiddenDice?: number[]
  dungeonId?: string
  dungeonDifficulty?: string
  hourglassUsed?: boolean
  equipUndyingUsed?: boolean
  covenantEventBuff?: CovenantEventBuff
  onComplete: (result: { won: boolean; goldEarned: number; newHeroHp: number; noDamage?: boolean; potionsLeft?: string[]; undyingUsed: boolean; hourglassUsed: boolean; equipUndyingUsed: boolean; turnsUsed: number; diceComboScore: number; noForbiddenTrigger?: boolean; cleanHighDmg?: boolean; noBacklash?: boolean; flamePeakHigh?: boolean; oxygenSafe?: boolean; ebbtideDmgHigh?: boolean; judgmentsThisBattle?: number; covenantLow?: boolean }) => void
}

// Add stacks to a status. mode 'add' accumulates, 'set' refreshes to the larger value. max caps the result.
function addStack(status: StatusEffect[], type: StatusEffect['type'], amount: number, mode: 'add' | 'set' = 'add', max?: number): StatusEffect[] {
  if (amount <= 0) return status
  const s = [...status]
  const idx = s.findIndex(x => x.type === type)
  if (idx >= 0) {
    const cur = s[idx].stacks
    let newVal = mode === 'add' ? cur + amount : Math.max(cur, amount)
    if (max !== undefined) newVal = Math.min(newVal, max)
    s[idx] = { ...s[idx], stacks: newVal }
  } else {
    s.push({ type, stacks: max !== undefined ? Math.min(amount, max) : amount })
  }
  return s
}

// Burn: deals stacks damage, then decays by 1.
function tickBurn(status: StatusEffect[]): { newStatus: StatusEffect[]; dmg: number } {
  let dmg = 0
  const newStatus = status
    .map(s => { if (s.type !== 'burn') return s; dmg += s.stacks; return { ...s, stacks: s.stacks - 1 } })
    .filter(s => s.stacks > 0)
  return { newStatus, dmg }
}

// Poison: deals stacks damage, does NOT decay (persists at full strength).
function tickPoison(status: StatusEffect[]): number {
  return Math.round(status.filter(s => s.type === 'poison').reduce((sum, s) => sum + s.stacks, 0) * 1.2)
}

// Decay turn-based statuses (vulnerable) by 1.
function decayTurnStatuses(status: StatusEffect[]): StatusEffect[] {
  return status
    .map(s => s.type === 'vulnerable' ? { ...s, stacks: s.stacks - 1 } : s)
    .filter(s => s.stacks > 0)
}

function applyStatusOnAttack(
  status: StatusEffect[],
  opts: { burn: number; freeze: boolean; poison: number; armorBreak: number; vulnerable: boolean },
  extras: { maxArmorBreak: number; freezeStacks: number },
): StatusEffect[] {
  let s = addStack(status, 'burn', opts.burn, 'add')
  s = addStack(s, 'poison', opts.poison, 'add', 30)           // 中毒上限 30 層
  s = addStack(s, 'armor_break', opts.armorBreak, 'add', extras.maxArmorBreak)  // 破甲上限 70% 敵方防禦
  if (opts.freeze && extras.freezeStacks > 0) s = addStack(s, 'freeze', extras.freezeStacks, 'set')
  if (opts.vulnerable) s = addStack(s, 'vulnerable', 2, 'set', 2)  // 易傷上限 2 回合
  return s
}

const VULNERABLE_MULT = 1.35

// ── 武鬥家：連續技表 ──────────────────────────────────────────────────────
type FighterChainType = 'attack' | 'defend' | 'heal' | 'break'
interface FighterChain { name: string; type: FighterChainType; dmg?: number; def?: number; healAmt?: number; armorBreak?: number; weaponOnly?: boolean }
function normChainLabel(label: string): string {
  return (label === '四條' || label === '五條') ? '四條以上' : label
}
const FIGHTER_CHAINS: Record<string, FighterChain> = {
  '一對→兩對':       { name: '流水卸勁',   type: 'defend', def: 8 },
  '兩對→三條':       { name: '虎破連拳',   type: 'attack', dmg: 18 },
  '三條→四條以上':   { name: '崩山震掌',   type: 'attack', dmg: 30 },
  '散骰→順子':       { name: '疾風步',     type: 'break',  armorBreak: 2 },
  '兩對→順子':       { name: '靜心吐納',   type: 'heal',   healAmt: 8 },
  '三條→兩對':       { name: '金鐘架式',   type: 'defend', def: 10 },
  '順子→順子':       { name: '龍翔百裂',   type: 'attack', dmg: 42, weaponOnly: true },
  '葫蘆→四條以上':   { name: '霸王震天擊', type: 'attack', dmg: 36, weaponOnly: true },
}

export default function BattleScreen({ run, equipment, talentBonus, enemyId, floorMult, isElite, isBoss, isChapterBoss, activeFateLevel, enemyAffixes, goldReward, heroStars = 0, forbiddenDice, dungeonId, dungeonDifficulty, hourglassUsed: initHourglassUsed = false, equipUndyingUsed: initEquipUndyingUsed = false, covenantEventBuff, onComplete }: Props) {
  void isChapterBoss
  const activeMember = run.party[run.activePartyIdx]
  const hero = useMemo(() => HEROES.find(h => h.id === activeMember.heroId) ?? HEROES[0], [activeMember.heroId])
  const baseEnemy = useMemo(() => ENEMIES.find(e => e.id === enemyId) ?? ENEMIES[0], [enemyId])
  const enemy = useMemo(() => ({
    ...baseEnemy,
    hp: Math.round(baseEnemy.hp * floorMult),
    atk: Math.round(baseEnemy.atk * Math.pow(floorMult, 0.75)),
  }), [baseEnemy, floorMult])

  const mechanic = useMemo(() => getEnemyMechanic(enemyId), [enemyId])
  const isScramble = mechanic?.special === 'dragon_scramble'
  const isCounter  = mechanic?.special === 'dark_knight_counter'
  const isGolem    = mechanic?.special === 'golem_armor'
  // Regular-enemy specials
  const isGoblin  = enemyId === 'goblin'
  const isOrc     = enemyId === 'orc'
  const isSkeleton = enemyId === 'skeleton'
  const isSlime   = enemyId === 'slimeking'
  const isMimic   = enemyId === 'mimic'
  const isWitch   = enemyId === 'ice_witch'
  const isLancer      = enemyId === 'lightning_lancer'
  const isWolf        = enemyId === 'ice_wolf'
  const isYeti        = enemyId === 'yeti'
  const isHound       = enemyId === 'fire_hound'
  const isBatDragon   = enemyId === 'bat_dragon'
  const isSorceress   = enemyId === 'dark_sorceress'
  // 星蝕裂隙
  const isStarEclipse    = dungeonId === 'star_eclipse'
  const isRiftImp        = enemyId === 'rift_imp'
  const isStarSandGolem  = enemyId === 'star_sand_golem'
  const isMirrorThief    = enemyId === 'mirror_thief'
  const isEclipseNun     = enemyId === 'eclipse_nun'
  const isRiftGuardian   = enemyId === 'rift_guardian'
  const isStarReaper     = enemyId === 'star_reaper'
  const isEclipseBishop  = enemyId === 'eclipse_bishop'
  // 燃燒王座敵人
  const isBurningThrone      = dungeonId === 'burning_throne'
  const isFlameImp           = enemyId === 'flame_imp'
  const isMoltenGuard        = enemyId === 'molten_guard'
  const isAshMage            = enemyId === 'ash_mage'
  const isInfernoHound       = enemyId === 'inferno_hound'
  const isBlackFlameKnight   = enemyId === 'black_flame_knight'
  const isFallenFirePriest   = enemyId === 'fallen_fire_priest'
  const isThroneDemonKing    = enemyId === 'throne_demon_king'
  // ── 深海遺城篇 ────────────────────────────────────────────────────────────
  const isDeepSea            = run.campaign === 'deep_sea'
  const isCoralCrab          = enemyId === 'coral_crab'
  const isBlueJellyfish      = enemyId === 'blue_jellyfish'
  const isTidePiranha        = enemyId === 'tide_piranha'
  const isCoralColossus      = enemyId === 'coral_colossus'
  const isAnglerfish         = enemyId === 'abyss_anglerfish'
  const isDrownedGuard       = enemyId === 'drowned_guard'
  const isDeepLancer         = enemyId === 'deep_lancer'
  const isHeavyDrowned       = enemyId === 'heavy_drowned'
  const isSeaPriestess       = enemyId === 'sea_priestess'
  const isSeaEmperorGuard    = enemyId === 'sea_emperor_guard'
  const isAbyssSiren         = enemyId === 'abyss_siren'
  const isAncientShellKnight = enemyId === 'ancient_shell_knight'
  const isLeviathanPup       = enemyId === 'leviathan_pup'
  const isSeaQueen           = enemyId === 'sea_queen'
  const isSleepingEmperor    = enemyId === 'sleeping_emperor'
  // ── 黑潮王座 ──────────────────────────────────────────────────────────────
  const isBlackTide           = dungeonId === 'black_tide'
  const isTidalShellGuard     = enemyId === 'tidal_shell_guard'
  const isAzureJellyfishEnvoy = enemyId === 'azure_jellyfish_envoy'
  const isDrownedCourtSoldier = enemyId === 'drowned_court_soldier'
  const isCoralGuardCaptain   = enemyId === 'coral_guard_captain'
  const isDeepPressureEel     = enemyId === 'deep_pressure_eel'
  const isSunkenCrownWitch    = enemyId === 'sunken_crown_witch'
  const isTideKingAusrein     = enemyId === 'tide_king_ausrein'
  // ── 灰燼聖約副本 ───────────────────────────────────────────────────────────
  const isAshCovenant         = dungeonId === 'ash_covenant'
  const isCovenantEmber       = enemyId === 'covenant_ember'
  const isRoyalBloodDisciple  = enemyId === 'royal_blood_disciple'
  const isAshJudge            = enemyId === 'ash_judge'
  const isMassResentment      = enemyId === 'mass_resentment'
  const isCovenantGuard       = enemyId === 'covenant_guard'
  const isCrownPriestSeron    = enemyId === 'crown_priest_seron'
  const isAshFallenKing       = enemyId === 'ash_fallen_king_aldrek'

  // 以等級調整後的卡牌效果（leveledCards 取代 run.cards 做數值計算）
  const leveledCards = useMemo(() =>
    run.cards.map(c => ({ ...c, effect: getEffectiveCardEffect(c, run.cardLevels?.[c.id] ?? 1) })),
    [run.cards, run.cardLevels]
  )

  // Bonus stacking: cards + relics + equipment
  const eqBonus = useMemo(() => computeEquipBonus(equipment), [equipment])
  const cursePenalty = run.curses.reduce((s, id) => s + (getCurseById(id)?.effect.rerollPenalty ?? 0), 0)
  const talP = (id: TalentPassiveId) => talentBonus.passives.filter(p => p.id === id)
  const talPFirst = (id: TalentPassiveId) => talentBonus.passives.find(p => p.id === id)
  // 霜咬 state declared here because baseMaxRerolls depends on it
  const [wolfFrostStacks, setWolfFrostStacks] = useState(0)
  // Potion combat states declared here because extraDef/etc depend on them
  const [potionDefBonus, setPotionDefBonus]         = useState(0)    // 石皮藥水
  const [potionFuryMult, setPotionFuryMult]         = useState(1.0)  // 狂怒藥水
  const [potionLifestealPct, setPotionLifestealPct] = useState(0)    // 吸血藥水

  const baseMaxRerolls = Math.max(0,
    3 + getRerollBonus(leveledCards) + getRelicRerollBonus(run.relics, run.relicLevels) +
    eqBonus.rerollBonus + talentBonus.rerollBonus - cursePenalty - wolfFrostStacks)
  const extraDef  = getDefBonus(leveledCards) + getRelicDefBonus(run.relics, run.relicLevels) + eqBonus.defBonus + talentBonus.defBonus + potionDefBonus
  const rawShield = getStartShield(leveledCards) + getRelicStartShield(run.relics, run.relicLevels) + eqBonus.startShield + talentBonus.startShield
  const startShield = eqBonus.legendaryEffects.includes('armor_fortify') ? rawShield * 2 : rawShield
  // Fate lv3: boss starts with 30 guard; lv8: scales to 60
  const bossStartShield = isBoss ? (activeFateLevel >= 8 ? 60 : activeFateLevel >= 3 ? 30 : 0) : 0

  const hasLeg = (id: LegendaryEffectId) => eqBonus.legendaryEffects.includes(id)

  // Battle-start relic damage (破碎骰冠)
  const [heroHpInit] = useState(() => {
    const dmg = run.relics.reduce((s, id) => {
      return s + (getOwnedRelicEffect(run.relics, run.relicLevels, id)?.startSelfDmg ?? 0)
    }, 0)
    return dmg
  })

  // Enemy initial status (relics + talents + fate level)
  const [enemyStatus, setEnemyStatus] = useState<StatusEffect[]>(() => {
    let s = [...run.enemyStatus]
    const burn = getRelicStartEnemyBurn(run.relics, run.relicLevels) + talentBonus.startEnemyBurn
      + (isElite ? (activeFateLevel >= 6 ? 5 : activeFateLevel >= 2 ? 3 : 0) : 0)  // fate lv2: 3 burn; lv6: 5 burn
    if (burn > 0) s = addStack(s, 'burn', burn, 'add')
    if (talentBonus.startEnemyFreeze > 0) s = addStack(s, 'freeze', talentBonus.startEnemyFreeze, 'add')
    if (talentBonus.startEnemyPoison > 0) s = addStack(s, 'poison', talentBonus.startEnemyPoison, 'add')
    return s
  })

  const [heroHp, setHeroHp]       = useState(() => Math.max(1, activeMember.hp - heroHpInit))
  const [enemyHp, setEnemyHp]     = useState(() =>
    enemyId === 'tide_king_ausrein' ? Math.round(enemy.hp / 3)
    : enemyId === 'ash_fallen_king_aldrek' ? Math.round(enemy.hp / 3)
    : enemy.hp
  )
  const [enemyShield, setEnemyShield] = useState(bossStartShield)
  const [guardBonus, setGuardBonus] = useState(startShield)
  const [heroAnim, setHeroAnim]   = useState<AnimState>('idle')
  const [enemyAnim, setEnemyAnim] = useState<AnimState>('idle')
  const [dice, setDice]           = useState<number[]>([1, 2, 3, 4, 5])
  const [rerollsLeft, setRerollsLeft] = useState(baseMaxRerolls)
  const [comboText, setComboText] = useState('等待擲骰')
  const [phase, setPhase]         = useState<'initial' | 'holding' | 'animating' | 'done'>('initial')
  const [confirmSurrender, setConfirmSurrender] = useState(false)
  const [mutedLocal, setMutedLocal] = useState(isMuted)
  const [showComboGuide, setShowComboGuide]     = useState(false)
  const [log, setLog]             = useState<string[]>([`${isElite ? '【精英】' : isBoss ? '【BOSS】' : ''}${enemy.name} 出現了！`])
  const [undyingUsed, setUndyingUsed] = useState(activeMember.undyingUsed)
  const [angerCount, setAngerCount]   = useState(activeMember.angerCount)

  const relicGoldRef = useRef((hasLeg('acc_gold_rush') ? 20 : 0) + (isMimic ? 30 : 0))

  // Legendary states
  const [isFirstAttack, setIsFirstAttack]         = useState(true)
  const [hammerCharge, setHammerCharge]             = useState(0)
  const [minDieBoost, setMinDieBoost]               = useState(0)
  const [beastBonus, setBeastBonus]                 = useState(0)
  const [rerollCharge, setRerollCharge]             = useState(0)
  const [tauntReduce, setTauntReduce]               = useState(0)   // slash 嘲諷：本回合敵人攻擊減免比例
  const [lastCombo, setLastCombo]                   = useState('')  // beast 狼群：上一回合骰型 label
  const [retaliateBonus, setRetaliateBonus]         = useState(0)   // 復仇護甲：受擊蓄積
  const [momentumBonus, setMomentumBonus]           = useState(0)   // 衝勢護符：每次出手後+8
  const [equipUndyingUsed, setEquipUndyingUsed]     = useState(initEquipUndyingUsed)
  const [battleTurn, setBattleTurn]                 = useState(0)   // 回合計數
  const diceComboScoreRef  = useRef(0)   // per-battle cumulative dice combo score
  const battleTurnCountRef = useRef(0)   // per-battle turn count (ref to avoid stale closure)
  const [vengeanceStack, setVengeanceStack]         = useState(0)   // 怒火系列：受擊累積攻擊（上限20）
  const [rebirthUsed, setRebirthUsed]               = useState(false) // 涅槃護符：本場已觸發
  const [painConvertBonus, setPainConvertBonus]     = useState(0)   // 痛苦轉化：下次攻擊+15
  const [tranceCount, setTranceCount]               = useState(0)   // 戰鬥冥想：連續出手計數（0-3）
  const [bloodPriceStack, setBloodPriceStack]       = useState(0)   // 血代之戒：永久傷害堆疊（上限30）
  const [animatingDice, setAnimatingDice]       = useState<boolean[]>([false, false, false, false, false])
  // Relic states
  const [freeRerollUsed, setFreeRerollUsed]     = useState(false)          // 命運骰杯
  const [relicReviveUsed, setRelicReviveUsed]   = useState(initHourglassUsed)
  const [songBonusUsed, setSongBonusUsed]       = useState(false)          // 古老魯特琴
  const [steamCharges, setSteamCharges]         = useState(0)              // 蒸氣核心
  const [anvHitCount, setAnvHitCount]           = useState(0)              // 山王鐵砧 hits taken this turn
  const [reversalUsed, setReversalUsed]         = useState(false)          // 逆轉護符 once-per-battle
  const [reversalAtkBonus, setReversalAtkBonus] = useState(0)              // 逆轉護符：本場永久攻擊加成
  const [covenantBurstAtkTotal, setCovenantBurstAtkTotal] = useState(0)   // 聖約審判後：本場永久攻擊加成
  const [poisonAtkStack, setPoisonAtkStack]     = useState(0)              // 毒牙之環：蓄積攻擊力
  // Potions
  const [potions, setPotions]                   = useState<string[]>(run.potions ?? [])
  const potionsRef = useRef<string[]>(run.potions ?? [])
  const [regenTurns, setRegenTurns]             = useState(0)
  const [regenAmt, setRegenAmt]                 = useState(0)
  // Enemy-mechanic states
  const [heroPoisonStacks, setHeroPoisonStacks] = useState(0)  // goblin
  const [orcRageTurn, setOrcRageTurn]           = useState(0)  // orc: 0→1→2→rage(reset)
  const [lockedDieIdx, setLockedDieIdx]         = useState(-1) // witch: -1 = no lock
  const [witchChill, setWitchChill]             = useState(0)  // witch: 寒意值 0-5
  const [turnRerolls, setTurnRerolls]           = useState(0)  // lancer: rerolls this turn
  const skeletonReviveRef = useRef(isSkeleton)                 // skeleton: revive available
  // Talent passive states
  const [tankStackBonus, setTankStackBonus]     = useState(0)
  const [sixDmgStack, setSixDmgStack]           = useState(0)
  const [uniqueAtkStack, setUniqueAtkStack]     = useState(0)
  const [healAtkBonus, setHealAtkBonus]         = useState(0)
  const [bonusRerollTurns, setBonusRerollTurns] = useState(0)
  const [bonusRerollAmt, setBonusRerollAmt]     = useState(0)
  const [attackAtkStack, setAttackAtkStack]     = useState(0)
  const [immuneNextAttack, setImmuneNextAttack] = useState(false)
  const [golemArmorLeft, setGolemArmorLeft]     = useState(isGolem ? (mechanic?.armorTurns ?? 3) : 0)
  const [freezeCount, setFreezeCount]           = useState(0)  // 本場凍結次數（遞減抗性）
  const [postHealAtkBonus, setPostHealAtkBonus] = useState(0)  // 治療後下次攻擊加成
  const [rerollChargeAtkBonus, setRerollChargeAtkBonus] = useState(0)  // 重骰蓄能攻擊
  const [cardFreeRerollUsed, setCardFreeRerollUsed] = useState(false)  // 快手：首次重骰免費
  const [overclockCharges, setOverclockCharges] = useState(0)          // 超頻機關：過熱層數
  const [lastComboRank, setLastComboRank] = useState(-1)               // 漸強樂章：上回合骰型
  const [overheatStacks, setOverheatStacks]     = useState(0)          // 過載機關炮：過熱層數
  const [disableCannonThisTurn, setDisableCannonThisTurn] = useState(false) // 過熱5層：本回合不能獲得炮彈
  const [precisionV2Pending, setPrecisionV2Pending] = useState(false)  // 精密瞄準v2：下回合調整最低2骰
  const [firstRerollNoOverheatUsed, setFirstRerollNoOverheatUsed] = useState(false) // 永動圖紙：首次重骰免過熱已用
  // 影刃刺客
  const [shadowFirstStrikeUsed, setShadowFirstStrikeUsed]           = useState(false) // 雙影連襲刃：每回合最多觸發一次
  const [shadowMarkStacks, setShadowMarkStacks]                     = useState(0)     // 暗影印記層數（0-3）
  const [shadowMarkGainedThisTurn, setShadowMarkGainedThisTurn]     = useState(false) // 影刃身法：本回合已獲得印記
  const [shadowChainExecuteReady, setShadowChainExecuteReady]       = useState(false) // 夜刃執行者：追擊就緒
  const [shadowChainExecuteUsedThisTurn, setShadowChainExecuteUsedThisTurn] = useState(false) // 本回合已觸發追擊
  const [revivalCrownUses, setRevivalCrownUses] = useState(0)          // 復甦羽冠：觸發次數
  const [holyEchoStacks, setHolyEchoStacks] = useState(0)             // 聖光回響：治療後攻擊層數
  const [fightingSpiritStacks, setFightingSpiritStacks] = useState(0) // 奮戰鬥志：受擊後攻擊蓄積
  const [gamblersRushBonus, setGamblersRushBonus] = useState(0)       // 賭徒衝勁：累計傷害加成
  const [wolfSoulStacks, setWolfSoulStacks] = useState(0)             // 狼魂累積：狼魂層數
  const [fireExplosionUsed, setFireExplosionUsed] = useState(false)   // 爆燃術：每回合觸發一次
  // ── 代價型遺物/卡牌狀態 ──────────────────────────────────────────────────
  const [tabooRerollAcc, setTabooRerollAcc]   = useState(0)  // 禁忌重骰: 本回合累計 %
  const [bloodDiceAcc, setBloodDiceAcc]       = useState(0)  // 血色骰: 本回合累計 %
  const [chaosLockedIdx, setChaosLockedIdx]   = useState(-1) // 混亂詛咒: 鎖定骰子 index
  // New enemy mechanic states (wolfFrostStacks declared above baseMaxRerolls)
  const [yetiTurn, setYetiTurn]                   = useState(0)     // yeti: turn counter for shield break
  const [houndEnrageStacks, setHoundEnrageStacks] = useState(0)     // fire_hound: ATK bonus stacks
  const [sorceressDebuff, setSorceressDebuff]     = useState(false) // dark_sorceress: next-attack penalty
  // Star ability states
  const [sixHealUsed, setSixHealUsed]             = useState(false) // priest 2★: per-turn flag
  const [burnExplosionUsed, setBurnExplosionUsed] = useState(false) // mage 3★: per-turn flag
  const [starCannonUsed, setStarCannonUsed]       = useState(false) // engineer 3★: per-turn flag
  const [starChargeStacks, setStarChargeStacks]   = useState(0)     // engineer star: reroll charges
  const [wolfSummonCount, setWolfSummonCount]     = useState(0)     // beast star: total wolf summons
  // ── 職業詞綴第二輪：狀態變數 ─────────────────────────────────────────────
  const [affixFreeRerollUsed, setAffixFreeRerollUsed] = useState(false) // 預見：每場首次重骰免費
  const [firstHitDmgUsed, setFirstHitDmgUsed]       = useState(false) // 厚甲/迴避：每場首次受攻已觸發
  const [killNextTurnDmgActive, setKillNextTurnDmgActive] = useState(false) // 追擊：擊殺後下回合觸發
  const [cleanseOnceUsed, setCleanseOnceUsed]         = useState(false) // 淨化：每場首次負面狀態免疫
  const [lifeRecoverOnceUsed, setLifeRecoverOnceUsed] = useState(false) // 回魂：HP<30%時回復，每場一次
  const [badRollRetryUsed, setBadRollRetryUsed]       = useState(false) // 命運偏轉：首次重骰差時自動重骰
  const [hammerCounterBonus, setHammerCounterBonus] = useState(0)  // 鐵砧反擊：受攻後蓄積
  const [songWarCryActive, setSongWarCryActive]     = useState(false) // 戰歌：治療後加持
  const [beastWolfEchoBonus, setBeastWolfEchoBonus] = useState(0)  // 狼群呼應：狼後攻擊加成
  const [dragonChargeBonus, setDragonChargeBonus]   = useState(0)  // 龍息蓄力：未重骰蓄力
  const [prevTurnRankLabel, setPrevTurnRankLabel]   = useState('')  // 激昂旋律：上回合骰型記錄
  // ── 武鬥家：拳勢系統 ─────────────────────────────────────────────────────
  const [fistPower, setFistPower]               = useState(0)   // 0-5 拳勢
  const [noDoubleLeft, setNoDoubleLeft]         = useState(0)   // 無雙架式剩餘回合
  const noDoubleLeftRef                         = useRef(0)     // setTimeout 中讀取的鏡像
  const [lastChainType, setLastChainType]       = useState<FighterChainType | null>(null)
  const [prevFighterCombo, setPrevFighterCombo] = useState('')  // 上回合骰型
  const missedChainRef                          = useRef(0)     // 連續未觸發次數
  const [fighterBreakImmune, setFighterBreakImmune] = useState(
    () => eqBonus.legendaryEffects.includes('fighter_set4')
  )
  const [set4FreeRerollReady, setSet4FreeRerollReady] = useState(false) // 4件套：連段失敗後下回合首次重骰免費
  const [weaponSkillBoostReady, setWeaponSkillBoostReady] = useState(false) // 武器：拳勢滿時下次奧義+30%
  const [showFighterMoves, setShowFighterMoves] = useState(false) // 招式表速覽
  const [showMechanicInfo, setShowMechanicInfo] = useState(false)
  const [showLoadout, setShowLoadout] = useState(false) // 🎒 配置（增益/裝備/遺物）收進背包，點開才看
  const [showBattleMenu, setShowBattleMenu] = useState(false) // ⚙️ 頂部欄收成齒輪，點開才看戰鬥資訊/背包/聲音/放棄
  const [showBattleLog, setShowBattleLog] = useState(false) // 📜 戰鬥LOG 改成按鈕，點開才看放大視窗

  // ── 爆炸特效觸發計數（火法引爆 / 冰痕碎冰爆發 / 機關過熱爆裂炮 / 武鬥家無雙架式）：每次 +1 觸發新的全螢幕爆閃 ───────
  const [fireExplosionFlash, setFireExplosionFlash] = useState(0)
  const [iceExplosionFlash, setIceExplosionFlash]   = useState(0)
  const [gearExplosionFlash, setGearExplosionFlash] = useState(0)
  const [fighterOverdriveFlash, setFighterOverdriveFlash] = useState(0)

  // ── 皇家公主：冰痕系統 ──────────────────────────────────────────────────────
  const [iceMark, setIceMark]                     = useState(0)     // 冰痕層數（0-5，敵人身上）
  const [barrierBonusNext, setBarrierBonusNext]   = useState(false) // 絕對護衛：下回合+20%傷害
  const [freezeBurstUsed, setFreezeBurstUsed]     = useState(false) // 凜冬女王：每回合一次
  // ── 灰燼王國篇・第二章 ────────────────────────────────────────────────────
  const isAshKingdom        = run.campaign === 'ash_kingdom'
  const isAshSoldier        = baseEnemy.id === 'ash_soldier'
  const isCharredArcher     = baseEnemy.id === 'charred_archer'
  const isMoltenShieldman   = baseEnemy.id === 'molten_shieldman'
  const isEmberCommander    = baseEnemy.id === 'ember_commander'
  const isLevok             = baseEnemy.id === 'levok'
  const isCastleRemnant     = baseEnemy.id === 'castle_remnant'
  const isAshGuard          = baseEnemy.id === 'ash_guard'
  const isBrokenKnight      = baseEnemy.id === 'broken_knight'
  const isLostCourtMage     = baseEnemy.id === 'lost_court_mage'
  const isLaon              = baseEnemy.id === 'laon'
  const isTombKeeper        = baseEnemy.id === 'tomb_keeper'
  const isSoulKnight        = baseEnemy.id === 'soul_knight'
  const isRoyalSoul         = baseEnemy.id === 'royal_soul'
  const isForbiddenPriest   = baseEnemy.id === 'forbidden_priest'
  const isElysia            = baseEnemy.id === 'elysia'
  // ── 裂隙前兆篇 enemy states ────────────────────────────────────────────────
  const isSandRat        = baseEnemy.id === 'sand_rat'
  const isRiftGoblin     = baseEnemy.id === 'rift_goblin'
  const isStarSlime      = baseEnemy.id === 'star_slime'
  const isRiftScout      = baseEnemy.id === 'rift_scout'
  const isSandBeast      = baseEnemy.id === 'sand_beast'
  const isMoonRogue      = baseEnemy.id === 'moon_rogue'
  const isRuinGuard      = baseEnemy.id === 'ruin_guard'
  const isMoonMage       = baseEnemy.id === 'moon_mage'
  const isMirrorAssassin = baseEnemy.id === 'mirror_assassin'
  const isMoonExecutor   = baseEnemy.id === 'moon_executor'
  const isDarkDevotee    = baseEnemy.id === 'dark_devotee'
  const isRiftPraying    = baseEnemy.id === 'rift_praying'
  const isBlackJudge     = baseEnemy.id === 'black_judge'
  const isDarkShaman     = baseEnemy.id === 'dark_shaman'
  const isBishopVanguard = baseEnemy.id === 'bishop_vanguard'

  const [riftOmenTurn, setRiftOmenTurn] = useState(0)
  const [riftUnstableNum, setRiftUnstableNum] = useState(0)
  // ── 灰燼王國篇・第二章 stage mechanics ────────────────────────────────────
  // Chapter 1: 餘燼 (ember stacks, +1 every 3 turns, max 4)
  const [emberStacks, setEmberStacks] = useState(0)
  // Chapter 2: 王城記憶 (cycles 0→1→2→3→0 every 3 turns)
  //   0=加冕之日, 1=戰火之夜, 2=背叛之刻, 3=王城陷落
  const [castleMemoryPhase, setCastleMemoryPhase] = useState(-1)  // -1 = not started yet
  const [castleMemoryTurn, setCastleMemoryTurn] = useState(0)      // turn within current phase
  // Chapter 3: 王血詛咒 (accumulates from using high-value dice, triggers at 3 and 5)
  const [royalBloodCurse, setRoyalBloodCurse] = useState(0)
  const [ashKingdomTurn, setAshKingdomTurn] = useState(0)
  // ── 召喚小怪系統 ─────────────────────────────────────────────────────────
  const [minions, setMinions] = useState<BattleMinion[]>([])
  const laonSpawnedRef    = useRef(false)   // Laon 護衛是否已召喚
  const laonSoloPowerRef  = useRef(false)   // Laon 孤軍狀態（小怪全滅後 ATK+20%）
  // Castle soldier: stubborn (survive first death)
  const castleRemnantStubbornRef = useRef(isCastleRemnant)
  // Royal soul: on-death buff
  const royalSoulDeadRef = useRef(false)
  // Ash guard protect: intercept flag
  const [ashGuardIntercept, setAshGuardIntercept] = useState(false)
  // Elysia: half-blood dialogue shown
  const elysiaHalfDialogueRef = useRef(false)
  // Castle memory vulnerable debuff (turns remaining on hero)
  const [heroVulnerableTurns, setHeroVulnerableTurns] = useState(0)
  const [riftBlessedNum, setRiftBlessedNum] = useState(0)
  const [riftGoblinEnraged, setRiftGoblinEnraged] = useState(false)
  const [moonRogueEvade, setMoonRogueEvade] = useState(false)
  const [moonMageDebuff, setMoonMageDebuff] = useState(false)
  const [moonMirrorLastRank, setMoonMirrorLastRank] = useState(-1)
  const [bvPhase2, setBvPhase2] = useState(false)
  const [bvRiftGate, setBvRiftGate] = useState(0)
  const [judgeRageActive, setJudgeRageActive] = useState(false)
  const [executorRevengeActive, setExecutorRevengeActive] = useState(false)

  const [forbiddenDmgDebuff, setForbiddenDmgDebuff] = useState(0)  // 傳奇難度踩禁忌：下回合傷害 -10%

  // ── 星蝕裂隙：禁忌骰面 state ─────────────────────────────────────────────
  const [forbiddenDiceState, setForbiddenDiceState] = useState<number[]>(() => {
    const fd = forbiddenDice ?? []
    // 星砂羅盤：戰鬥開始時，將禁忌骰面中最大值替換為 1（若還沒有 1）
    if (fd.length > 0 && run.relics.includes('star_sand_compass') && !fd.includes(1)) {
      const sorted = [...fd].sort((a, b) => b - a)
      return [1, ...sorted.slice(1)]
    }
    return fd
  })
  const forbiddenOnceUsedRef = useRef(false)     // forbidden_once_guard: 首次禁忌免疫
  const observerRingUsedRef  = useRef(false)     // observer_ring: 首次淨骰觸發
  // ── Per-battle challenge tracking refs ───────────────────────────────────
  const forbiddenTriggeredRef = useRef(false)    // star_eclipse: any attack hit forbidden die
  const cleanHighDmgRef       = useRef(false)    // star_eclipse: clean attack dealt 80+ damage
  const backlashTriggeredRef  = useRef(false)    // burning_throne: backlash triggered
  const flamePeakHighRef      = useRef(false)    // burning_throne: flame reached 5+
  const oxygenHitZeroRef      = useRef(false)    // black_tide: oxygen depleted to 0
  const tideDmgHighRef        = useRef(false)    // black_tide: 90+ damage in 退潮/亂流
  const judgmentCountRef      = useRef(0)        // ash_covenant: judgments triggered this battle
  const fateDieUsesRef        = useRef(0)        // fate_die: times triggered this battle (cap 2)
  const melodyAtkBonusRef     = useRef(0)        // melody_mark: total ATK bonus given this battle (cap 20)
  const healedBattleTotalRef  = useRef(0)        // holy_judgment_power: cumulative heal this battle
  const healMilestoneHitRef   = useRef(false)    // holy_judgment_power: milestone reached flag
  const [starShieldArmorDef, setStarShieldArmorDef] = useState(0)  // 星盾聖甲：累積防禦加成
  const [mirrorThiefBoosted, setMirrorThiefBoosted] = useState(false) // 鏡像盜賊：下次攻擊+40%
  const [eclipseNunTurn, setEclipseNunTurn]       = useState(0)    // 星蝕修女：回合計數
  const [starReaperCountdown, setStarReaperCountdown] = useState(4) // 星界收割者：大攻擊倒數
  const [bishopTurnCount, setBishopTurnCount]     = useState(0)    // 星蝕主教：回合計數（審判）
  const [lastAttackHadForbidden, setLastAttackHadForbidden] = useState(false) // 主教審判用
  const [bishopBar, setBishopBar]               = useState(1)    // 星蝕主教：當前血條（1或2）
  const [bishopWeakActive, setBishopWeakActive] = useState(false) // 星蝕主教：破綻（每5回合×1.5）
  const bishopBarRef                            = useRef(1)
  const tideKingBarRef                          = useRef(1)  // 黑潮潮汐王：血條同步 ref
  const starReaperBigAttackRef                  = useRef(false) // 星界收割者：大攻擊標記
  const overheatPenaltyRef                      = useRef(0)     // 過載機關炮：下回合重骰懲罰
  const cannonDisabledNextRef                   = useRef(false) // 過載機關炮：下回合禁用炮彈
  const BISHOP_BAR2_HP = isEclipseBishop ? Math.round(enemy.hp * 0.58) : 0
  const [riftCoreBonus, setRiftCoreBonus]         = useState(0)    // 裂隙核心：累積攻擊加成
  const [starHourglassUses, setStarHourglassUses] = useState(0) // 星界沙漏：已使用次數
  // 燃燒王座：魔焰系統
  const INFERNAL_FLAME_MAX = 6
  const infernalFlameStartBonus = isBurningThrone
    ? run.curses.reduce((s, id) => s + (getCurseById(id)?.effect.startFlameBonus ?? 0), 0)
      - (run.dungeonEliteFlameBonus ?? 0)
    : 0
  const [infernalFlame, setInfernalFlame] = useState(() => isBurningThrone ? Math.max(0, infernalFlameStartBonus) : 0)
  const [throneFirstBacklashNegated, setThroneFirstBacklashNegated] = useState(false) // 熄火燭台遺物已觸發
  const [throneNextAtkBonus, setThroneNextAtkBonus] = useState(0)    // 王座4件套：下次攻擊+30
  const [ashResonanceReady, setAshResonanceReady]   = useState(false) // 灰燼回響：受到燃燒後啟動
  const [backlashHealPenaltyTurns, setBacklashHealPenaltyTurns] = useState(0) // 灰燼肺詛咒：剩餘回合
  const [ashGrimoireUsed, setAshGrimoireUsed]       = useState(false) // 灰燼魔典：首次反噬已轉化
  const [demonCoreUsed, setDemonCoreUsed]           = useState(false) // 魔核引擎：首次到6已觸發
  const darkFlameDaggerKillRef                      = useRef(false)   // 黑焰短刃：下次魔焰增加跳過
  const [ashMageCursedTurn, setAshMageCursedTurn]   = useState(0)    // 灰燼術士詛咒：施加回合
  const [ashMageCurseActive, setAshMageCurseActive] = useState(false) // 灰燼術士詛咒：生效中
  const [flameImpBoostStacks, setFlameImpBoostStacks] = useState(0)  // 魔焰小鬼攻擊加成層數
  const [priestRitualCountdown, setPriestRitualCountdown] = useState(4) // 墮落炎祭司：儀式倒數
  const [throneCollapseStacks, setThroneCollapseStacks] = useState(0) // 焰獄魔王：崩壞層數
  const [throneFirstCollapseCleared, setThroneFirstCollapseCleared] = useState(false)
  // ── 深海遺城篇：氧氣 & 潮汐 ─────────────────────────────────────────────
  const [oxygenLevel, setOxygenLevel]   = useState(() => {
    if (!isDeepSea && !isBlackTide) return 0
    let base = 5
    base += run.relics.reduce((s, id) => s + (getOwnedRelicEffect(run.relics, run.relicLevels, id)?.oxygenMaxBonus ?? 0), 0)
    if (eqBonus.abyssSet2pc) base += 1
    return base
  })
  const [oxygenMax,   setOxygenMax]     = useState(() => {
    if (!isDeepSea && !isBlackTide) return 0
    let base = 5
    base += run.relics.reduce((s, id) => s + (getOwnedRelicEffect(run.relics, run.relicLevels, id)?.oxygenMaxBonus ?? 0), 0)
    if (eqBonus.abyssSet2pc) base += 1
    return base
  })
  type TideState = '退潮' | '漲潮' | '深壓' | '亂流'
  const [tideState, setTideState]       = useState<TideState>(() => {
    if (!isDeepSea && !isBlackTide) return '退潮'
    if (isDeepSea) {
      const ch = run.chapter ?? 1
      if (ch === 1) return '漲潮'
    }
    const TIDES: TideState[] = ['退潮', '漲潮', '深壓', '亂流']
    return TIDES[Math.floor(Math.random() * TIDES.length)]
  })
  // 黑潮王座：三條血條（依實際 enemy.hp 動態計算每條血量）
  const TIDE_KING_BAR_HP = isTideKingAusrein ? Math.round(enemy.hp / 3) : 700
  const [tideKingBar, setTideKingBar] = useState(1)  // 1=王座甦醒 2=深壓審判 3=沉海王權
  // ── 灰燼聖約：聖約進度 & 三條血條 ──────────────────────────────────────────
  const ASH_FALLEN_KING_BAR_HP = isAshFallenKing ? Math.round(enemy.hp / 3) : 1
  const ashFallenKingBarRef    = useRef(1)
  const [ashFallenKingBar, setAshFallenKingBar] = useState(1)  // 1=亡國之王 2=聖約之王 3=灰燼王魂
  const [covenantProgress, setCovenantProgress] = useState(() => covenantEventBuff?.covenantStartBonus ?? 0)
  const playerUsedSixDieRef    = useRef(false)   // ash_judge: player rolled ≥1 die=6 this turn
  const ashJudgePhase2Ref      = useRef(false)   // ash_judge: HP<50% summon triggered
  const ashJudgmentDiceDebuffRef = useRef(false) // judgment: random die -1 next initial roll
  const [covenantGuardShieldCD, setCovenantGuardShieldCD] = useState(0)  // 聖約守衛護盾冷卻
  const [seron2ndPhase, setSeron2ndPhase] = useState(false)  // 王冠祭司・塞羅恩 HP<50%
  // 沉冠海巫法力層數
  const [witchManaStacks, setWitchManaStacks] = useState(0)
  // 珊瑚禁衛長護盾冷卻
  const [captainShieldCooldown, setCaptainShieldCooldown] = useState(0)
  // 深壓巨鰻壓流冷卻
  const [eelShockCooldown, setEelShockCooldown] = useState(2)
  const [jellyfishLockedDie, setJellyfishLockedDie] = useState(-1)  // 幽藍水母使：鎖定骰子 index
  const [drownedBubblePending, setDrownedBubblePending] = useState(false)  // 溺亡王庭士兵：死亡泡
  const [tideTurnCount, setTideTurnCount] = useState(0) // turns since last switch
  const [anglerLureBonus, setAnglerLureBonus] = useState(0) // 深淵鮟鱇蓄積
  const [dsPhase, setDsPhase]           = useState(1) // sleeping emperor phase
  const [seaGuardPhase2, setSeaGuardPhase2] = useState(false) // sea_emperor_guard HP<50%
  const [leviathanEnrage, setLeviathanEnrage] = useState(0) // leviathan_pup enrage stacks
  const [seaPriestessDrainTurn, setSeaPriestessDrainTurn] = useState(0) // drain turn counter

  // ── Enemy affix helpers ───────────────────────────────────────────────────
  const getAffix = (id: EnemyAffixId) => enemyAffixes.find(a => a.id === id)
  const berserkRef    = useRef(false)
  const enemyImmuneRef = useRef(getAffix('immune') ? 2 : 0)
  const [affixHeroPoison, setAffixHeroPoison] = useState(0)

  // Boss phase (1=normal, 2=<60% HP, 3=<30% HP)
  const [bossPhase, setBossPhase]               = useState(1)
  // Enemy intent (telegraph next action): stores the enemy's raw attack power for the upcoming attack
  const [enemyIntent, setEnemyIntent]           = useState<number>(() => enemy.atk + Math.floor(Math.random() * 6))

  const tideTideRerollPenalty = (isDeepSea || isBlackTide) && tideState === '漲潮' ? 1 : 0
  const maxRerolls = Math.max(0, baseMaxRerolls - tideTideRerollPenalty + (bonusRerollTurns > 0 ? bonusRerollAmt : 0) + (eqBonus.earlyRerollBonus > 0 && battleTurn <= 1 ? eqBonus.earlyRerollBonus : 0))

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640 || window.innerHeight < 500)
  // Boss 戰時切換 BGM（一般戰鬥由 DungeonMapScreen 負責啟動）
  useEffect(() => {
    const BOSS_BGM: Record<string, string> = {
      star_eclipse:   '/assets/bgm/star_eclipse_boss.wav',
      burning_throne: '/assets/bgm/throne_boss.wav',
      black_tide:     '/assets/bgm/black_tide_boss.mp3',
      ash_covenant:   '/assets/bgm/ash_covenant_boss.mp3',
    }
    if (isBoss && dungeonId && BOSS_BGM[dungeonId]) playBgm(BOSS_BGM[dungeonId], 0.45)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640 || window.innerHeight < 500)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  // v9：第九輪修正——配置列收進背包後騰出空間，角色再放大一截
  const spriteScale = isMobile ? 1.05 : 3.3
  const isBossLike = isBoss || isElite

  // JRPG 戰鬥舞台：整體等比縮放成一張固定設計畫布（像 FF 那張參考圖一樣，永遠同比例）
  // 直向窄手機仍走 CSS 直排（usePortraitStack），其餘（桌機/平板/手機橫向）一律縮放整塊舞台塞進可視範圍
  // v4：畫布變寬（角色變大後左右才不會撞在一起）但變矮（高度才是真正吃掉縮放倍率的元凶，
  // 上一輪畫布長高把 sprite scale 調大的效果整個吃掉，這次反過來），縮放上限也拉高（1.3→1.6）
  const SCENE_W = 1700
  const SCENE_H = isBossLike ? 760 : 660
  // 頂部欄收成齒輪後（v1.14.0）viewport 拿到原本被 topbar 佔走的高度，畫布會跟著放大、貼齊頂端，
  // 角色因此飄離背景的地板線。這裡保留一塊跟 CSS .jrpg-scene-viewport 的 padding-top 對應的高度不拿來算縮放，
  // 畫布维持原本大小、整塊用 padding 推下去，角色才會落在跟之前一樣（甚至更低、貼地板）的位置，底部也不會被裁掉。
  const TOPBAR_OFFSET = 96
  const sceneRef = useRef<HTMLDivElement>(null)
  const [sceneScale, setSceneScale] = useState(1)
  const [usePortraitStack, setUsePortraitStack] = useState(() => window.innerWidth < 768 && window.innerWidth < window.innerHeight)
  useEffect(() => {
    const update = () => {
      setUsePortraitStack(window.innerWidth < 768 && window.innerWidth < window.innerHeight)
      const viewport = sceneRef.current?.parentElement
      if (!viewport) return
      const { width, height } = viewport.getBoundingClientRect()
      if (width <= 0 || height <= 0) return
      const s = Math.min(width / SCENE_W, (height - TOPBAR_OFFSET) / SCENE_H, 1.6)
      // 下限只是防呆，不能設太高：設太高在極矮的螢幕上反而會讓畫布比可視範圍還高，
      // 超出的部分被 overflow:hidden 裁掉（隊伍欄/log 整個消失），所以寧可字小一點也不要裁掉內容
      setSceneScale(Math.max(0.16, s))
    }
    update()
    window.addEventListener('resize', update)
    let ro: ResizeObserver | undefined
    if (sceneRef.current?.parentElement && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update)
      ro.observe(sceneRef.current.parentElement)
    }
    return () => { window.removeEventListener('resize', update); ro?.disconnect() }
  }, [SCENE_H])
  // 橫向窄手機 sceneScale 常常只剩 0.4~0.55，敵人 HUD 文字／骰子指令按鈕會縮到看不清楚、不好點。
  // 這兩塊資訊量大或是主要點擊區，比起跟著整塊舞台一起縮小，更需要保底可讀大小，
  // 用反向 scale 把「scene 縮放 × 這裡的反向倍率」鎖在保底值；sceneScale 已經夠大（桌機/平板）時倍率是 1，不影響原本大小。
  // 敵人名字/血條只是文字資訊，保底值不用跟骰子按鈕（觸控點擊區）一樣高，避免反而被放得太大。
  const ENEMY_HUD_MIN_SCALE = 0.6
  // 同樣套用在攻擊時彈出的傷害/狀態飄字（.float-text-layer），文字跟字間距會一起跟著 sceneScale 縮，
  // 不另開常數，跟敵人HUD共用同一套保底大小即可。
  const enemyHudScale = sceneScale > 0 ? Math.max(1, ENEMY_HUD_MIN_SCALE / sceneScale) : 1
  // v1.25.3 把 .jrpg-dice-command 移出縮放畫布、直接釘在可視範圍右上角（跟 party-panel/
  // log-panel 同套寫法）後，它的尺寸已經是固定 px、不再受 sceneScale 影響，這條反向放大
  // 倍率（原本是補償還在縮放畫布內時被 sceneScale 縮小）變成多乘一次，矮螢幕橫向手機上
  // 骰子＋攻擊鈕反而被放大到 1.3 倍，擠到跟旁邊面板疊在一起。固定為 1，不再額外放大。
  const diceCmdScale = 1
  const expandablePanelScale = 1
  // Hero sprite scale: normalize to same displayed height as original sprite to prevent cut-off
  const activeHeroSprite = getHeroSprite(hero, heroStars)
  const heroSpriteScale = spriteScale * hero.sprite.frameHeight / activeHeroSprite.frameHeight
  // Enemy sprite scale: constrain to bounding box on BOTH width and height
  // BOSS/精英怪再放大一截，營造壓迫感；一般小怪維持原尺寸上限
  // v9：第九輪修正——配置列收進背包後騰出空間，再放大一截
  // 橫向矮螢幕手機（isMobile 但非直向堆疊）：scene 因為高度受限被壓得很扁，敵人站位
  // 又是按 SCENE_H 的固定 top% 算，sprite+HUD 疊起來常常垂到畫面底部，跟釘死在
  // viewport 左下角的 log-panel 卡在一起，這裡單獨再縮小一截騰出空間
  const isShortLandscape = isMobile && !usePortraitStack
  const enemyMaxPx = isShortLandscape ? (isBossLike ? 300 : 220) : isMobile ? (isBossLike ? 350 : 300) : (isBossLike ? 630 : 500)
  const enemySpriteScale = Math.min(
    isBossLike ? spriteScale * 1.5 : spriteScale,
    enemyMaxPx / baseEnemy.sprite.frameWidth,
    enemyMaxPx / baseEnemy.sprite.frameHeight,
  )

  const ANIM_MS = 420
  const triggerDieAnim = (indices: number[]) => {
    setAnimatingDice(a => { const n = [...a]; indices.forEach(i => { n[i] = true }); return n })
    window.setTimeout(() => setAnimatingDice(a => { const n = [...a]; indices.forEach(i => { n[i] = false }); return n }), ANIM_MS)
  }

  const heroDeadRef = useRef(false)
  const tookDamageRef = useRef(false)
  const revivalDecisionRef = useRef<'none'|'hourglass'|'undying'|'armor'|'lifeRecover'|'rebirth'>('none')
  const revivalHpRef = useRef(0)
  const enemyRageMultRef = useRef(1)  // 禁忌 ×5 狂暴：當回合敵人 ATK 倍率
  const barrierActivatedRef = useRef(false)  // ice_barrier：本回合是否使用過
  const addLog = (msg: string) => setLog(prev => [msg, ...prev].slice(0, 10))

  /** 召喚小怪到戰場 — 可在任何時機呼叫 */
  const spawnMinions = (defs: Array<{ name: string; hp: number; atk: number; def: number; shield?: number; enemyId?: string }>) => {
    const now = Date.now()
    const newMinions: BattleMinion[] = defs.map((d, i) => ({
      uid: `m_${now}_${i}`, name: d.name,
      hp: d.hp, maxHp: d.hp, atk: d.atk, def: d.def, shield: d.shield ?? 0,
      enemyId: d.enemyId,
    }))
    setMinions(prev => [...prev, ...newMinions])
    newMinions.forEach(m => addLog(`⚔️ ${m.name} 登場！`))
  }

  type FloatKind = 'dmg' | 'heal' | 'shield' | 'burn' | 'freeze' | 'dot' | 'enemy_dmg' | 'enemy_shield' | 'chain'
  interface FloatText { id: number; text: string; kind: FloatKind; side: 'hero' | 'enemy'; xOff: number; yOff: number }
  const [floatingTexts, setFloatingTexts] = useState<FloatText[]>([])
  const floatIdRef = useRef(0)
  const heroFloatIdxRef = useRef(0)
  const enemyFloatIdxRef = useRef(0)
  const emitFloat = (text: string, kind: FloatKind, side: 'hero' | 'enemy', duration = 1300) => {
    const id = ++floatIdRef.current
    const xOff = kind === 'chain' ? 0 : Math.round((Math.random() - 0.5) * 40)
    const idxRef = side === 'hero' ? heroFloatIdxRef : enemyFloatIdxRef
    const yOff = kind === 'chain' ? 0 : idxRef.current * 30
    if (kind !== 'chain') idxRef.current++
    setFloatingTexts(prev => [...prev, { id, text, kind, side, xOff, yOff }])
    window.setTimeout(() => {
      if (kind !== 'chain') idxRef.current = Math.max(0, idxRef.current - 1)
      setFloatingTexts(prev => prev.filter(f => f.id !== id))
    }, duration)
  }

  const busy = phase === 'animating' || phase === 'done'
  const heroDead = heroHp <= 0
  const enemyDead = enemyHp <= 0

  // ── Use a carried potion (only when not animating) ──────────────────────────
  const usePotion = (idx: number) => {
    if (busy || heroDead || enemyDead) return
    const id = potions[idx]
    const potion = getPotionById(id)
    if (!potion) return
    const e = potion.effect
    if (e.healFlat) { setHeroHp(h => clamp(h + e.healFlat!, 0, activeMember.maxHp)); addLog(`${potion.icon} ${potion.name}：回復 ${e.healFlat} HP`) }
    if (e.healPct)  { const amt = Math.round(activeMember.maxHp * e.healPct); setHeroHp(h => clamp(h + amt, 0, activeMember.maxHp)); addLog(`${potion.icon} ${potion.name}：回復 ${amt} HP`) }
    if (e.shield)   { setGuardBonus(g => g + e.shield!); addLog(`${potion.icon} ${potion.name}：+${e.shield} 護盾`) }
    if (e.regenTurns) { setRegenTurns(e.regenTurns!); setRegenAmt(e.regenAmt ?? 10); addLog(`${potion.icon} ${potion.name}：${e.regenTurns} 回合再生`) }
    if (e.applyBurnStacks)      { setEnemyStatus(s => addStack(s, 'burn',       e.applyBurnStacks!,      'add'));     addLog(`${potion.icon} ${potion.name}：對敵施加 ${e.applyBurnStacks} 層燃燒`) }
    if (e.applyPoisonStacks)    { setEnemyStatus(s => addStack(s, 'poison',     e.applyPoisonStacks!,    'add', 30)); addLog(`${potion.icon} ${potion.name}：對敵施加 ${e.applyPoisonStacks} 層中毒`) }
    if (e.applyFreezeStacks)    { setEnemyStatus(s => addStack(s, 'freeze',     e.applyFreezeStacks!,    'set'));     addLog(`${potion.icon} ${potion.name}：敵人凍結 ${e.applyFreezeStacks} 回合！`) }
    if (e.applyVulnerableStacks){ setEnemyStatus(s => addStack(s, 'vulnerable', e.applyVulnerableStacks!,'set', 2)); addLog(`${potion.icon} ${potion.name}：敵人易傷 ${e.applyVulnerableStacks} 回合（受傷 +35%）`) }
    if (e.atkBonus)         { setAttackAtkStack(a => a + e.atkBonus!); addLog(`${potion.icon} ${potion.name}：本場 ATK +${e.atkBonus}`) }
    if (e.potionDefBonus)   { setPotionDefBonus(d => d + e.potionDefBonus!); addLog(`${potion.icon} ${potion.name}：本場防禦 +${e.potionDefBonus}`) }
    if (e.furyDmgMult) {
      if (e.furySelfDmg) setHeroHp(h => Math.max(1, h - e.furySelfDmg!))
      setPotionFuryMult(e.furyDmgMult)
      addLog(`${potion.icon} ${potion.name}：下次攻擊傷害 ×${e.furyDmgMult}！${e.furySelfDmg ? `（自傷 ${e.furySelfDmg} HP）` : ''}`)
    }
    if (e.lifestealOncePct) { setPotionLifestealPct(e.lifestealOncePct); addLog(`${potion.icon} ${potion.name}：下次攻擊 ${e.lifestealOncePct}% 吸血`) }
    if (e.forceSixOneDie) {
      const nonSixIdxs = dice.reduce<number[]>((acc, v, i) => v !== 6 ? [...acc, i] : acc, [])
      if (nonSixIdxs.length > 0) {
        const pick = nonSixIdxs[Math.floor(Math.random() * nonSixIdxs.length)]
        setDice(d => d.map((v, i) => i === pick ? 6 : v))
        addLog(`${potion.icon} ${potion.name}：第 ${pick + 1} 顆骰子強制變為 6！`)
      } else {
        addLog(`${potion.icon} ${potion.name}：所有骰子已是 6！`)
      }
    }
    if (e.rerollBonus) { setRerollsLeft(r => r + e.rerollBonus!); addLog(`${potion.icon} ${potion.name}：獲得 ${e.rerollBonus} 次額外重骰`) }
    const next = potions.filter((_, i) => i !== idx)
    setPotions(next); potionsRef.current = next
  }

  const applyDiceBoosts = (d: number[]) => {
    let result = [...d]
    if (hasRelic(run.relics, 'broken_crown')) result = result.map(v => v === 1 ? 6 : v)
    if (minDieBoost > 0) result = result.map(v => Math.max(v, minDieBoost + 1))
    return result
  }

  const applyLuckyDie = (d: number[]) => {
    if (!run.cards.some(c => c.id === 'lucky_die')) return d
    // 同 fate_die：挑非6的骰子下手，避免抽中已經是6的骰子變成「沒效果」
    const nonSixIdxs = d.map((_, i) => i).filter(i => d[i] !== 6)
    if (nonSixIdxs.length === 0) return d
    const next = [...d]; next[nonSixIdxs[Math.floor(Math.random() * nonSixIdxs.length)]] = 6; return next
  }
  // 命運獵骰（遊俠遺物）：每回合前 2 次重骰，若結果跟其他骰重複，自動換成目前缺少的點數
  const applyArrowFateScatter = (d: number[], idx: number) => {
    const fateHunterCount = getOwnedRelicEffect(run.relics, run.relicLevels, 'fate_hunter_dice')?.fateHunterDiceRerollCount ?? 2
    if (!hasRelic(run.relics, 'fate_hunter_dice') || turnRerolls >= fateHunterCount) return d
    const others = d.filter((_, j) => j !== idx)
    if (!others.includes(d[idx])) return d
    const missing = [1, 2, 3, 4, 5, 6].filter(v => !d.includes(v))
    if (missing.length === 0) return d
    const next = [...d]
    next[idx] = missing[Math.floor(Math.random() * missing.length)]
    addLog(`命運獵骰：補上缺少的點數 ${next[idx]}！`)
    return next
  }
  const applyFateDie = (d: number[]) => {
    if (!run.cards.some(c => c.id === 'fate_die')) return d
    if (fateDieUsesRef.current >= 1) return d
    // 挑非6的骰子下手，避免抽中已經是6的骰子變成「沒效果」浪費掉這次觸發
    const nonSixIdxs = d.map((_, i) => i).filter(i => d[i] !== 6)
    if (nonSixIdxs.length === 0) return d
    fateDieUsesRef.current++
    const pick = nonSixIdxs[Math.floor(Math.random() * nonSixIdxs.length)]
    const next = [...d]; next[pick] = 6; return next
  }

  const applyScramble = (d: number[]): number[] => {
    if (!isScramble) return d
    const next = [...d]
    const idx = Math.floor(Math.random() * 5)
    next[idx] = Math.floor(Math.random() * 6) + 1
    addLog(`龍息亂流：第 ${idx + 1} 顆骰子被打亂！`)
    return next
  }

  // Auto-roll at the start of each turn (no manual 擲骰 button)
  const doInitialRoll = () => {
    playSound('dice_roll')
    let rolled = applyScramble(applyLuckyDie(rollFive()))
    rolled = applyDiceBoosts(rolled)
    // 精密瞄準v2：下回合開始調整最低2顆骰子
    if (precisionV2Pending) {
      const indexed = [...rolled].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
      indexed.slice(0, 2).forEach(({ i }) => { rolled[i] = Math.min(5, rolled[i] + 2) })
      setPrecisionV2Pending(false)
      addLog('⚙️ 精密瞄準：最低 2 顆骰子 +2')
    }
    setDice(rolled)
    setComboText(evaluateDice(rolled).label)
    setRerollsLeft(maxRerolls)
    setTurnRerolls(0)
    // 過載機關炮：套用上回合過熱懲罰
    if (overheatPenaltyRef.current > 0) {
      const penalty = overheatPenaltyRef.current
      setRerollsLeft(r => Math.max(0, r - penalty))
      addLog(`⚙️ 過熱冷卻：本回合重骰 -${penalty}`)
      overheatPenaltyRef.current = 0
    }
    setDisableCannonThisTurn(cannonDisabledNextRef.current)
    cannonDisabledNextRef.current = false
    setFirstRerollNoOverheatUsed(false)
    setShadowFirstStrikeUsed(false)
    setShadowMarkGainedThisTurn(false)
    setShadowChainExecuteUsedThisTurn(false)
    // Reset per-turn star ability flags
    setSixHealUsed(false)
    setBurnExplosionUsed(false)
    setStarCannonUsed(false)
    setStarChargeStacks(0)
    setFreezeBurstUsed(false)
    triggerDieAnim([0, 1, 2, 3, 4])
    // 星砂鼠: 每3回合干擾一顆骰子（在初始擲骰後）
    if (isSandRat && riftOmenTurn > 0 && riftOmenTurn % 3 === 0) {
      setDice(d => {
        const nd = [...d]
        const idx = Math.floor(Math.random() * nd.length)
        const newVal = Math.floor(Math.random() * 6) + 1
        nd[idx] = newVal
        addLog(`星砂干擾：第 ${idx + 1} 顆骰子被隨機改為 ${newVal}！`)
        return nd
      })
    }
    // Witch: lock a random die each turn + 寒意 4 層削減重骰
    let witchLocked = -1
    if (isWitch) {
      witchLocked = Math.floor(Math.random() * 5)
      setLockedDieIdx(witchLocked)
      addLog(`骰子封印：第 ${witchLocked + 1} 顆骰子被封印，無法重骰！`)
      if (witchChill >= 4) {
        setRerollsLeft(r => Math.max(0, r - 1))
        addLog(`❄️ 寒意 ${witchChill} 層：本回合重骰次數 -1！`)
      }
    } else {
      setLockedDieIdx(-1)
    }
    // 混亂詛咒: lock a random die each turn
    const hasChaos = run.curses.some(id => getCurseById(id)?.effect.lockRandomDie)
    if (hasChaos) {
      const available = [0, 1, 2, 3, 4].filter(i => i !== witchLocked)
      const chaosIdx = available[Math.floor(Math.random() * available.length)]
      setChaosLockedIdx(chaosIdx)
      addLog(`💀 混亂詛咒：第 ${chaosIdx + 1} 顆骰子被鎖定，無法重骰！`)
    } else {
      setChaosLockedIdx(-1)
    }
    // Reset per-turn reroll damage accumulators
    setTabooRerollAcc(0)
    setBloodDiceAcc(0)
    // 灰燼審判：下回合隨機一顆骰子 -1
    if (ashJudgmentDiceDebuffRef.current) {
      ashJudgmentDiceDebuffRef.current = false
      setDice(d => {
        const nd = [...d]
        const idx = Math.floor(Math.random() * nd.length)
        nd[idx] = Math.max(1, nd[idx] - 1)
        addLog(`⚖️ 灰燼審判餘韻：第 ${idx + 1} 顆骰子 -1`)
        return nd
      })
    }
    playerUsedSixDieRef.current = false
    setPhase('holding')
  }

  // Click a die → reroll just that die immediately (consumes one reroll)
  const rerollDie = (i: number) => {
    if (phase !== 'holding' || rerollsLeft <= 0) return
    if (i === lockedDieIdx) { addLog('❄️ 此骰子被封印，無法重骰！'); return }
    if (i === chaosLockedIdx) { addLog('💀 此骰子被混亂詛咒鎖定，無法重骰！'); return }
    if (i === jellyfishLockedDie) { addLog('🪼 幽藍迷光：此骰子被水母鎖定，無法重骰！'); return }
    playSound('dice_roll')
    triggerDieAnim([i])
    let next = [...dice]
    next[i] = Math.floor(Math.random() * 6) + 1
    next = applyArrowFateScatter(next, i)
    next = applyScramble(applyFateDie(next))
    next = applyDiceBoosts(next)
    // 完美主義: +1 applied BEFORE combo eval so display is correct
    if (run.cards.some(c => c.effect.rerollPlusDie)) {
      const plusIdx = Math.floor(Math.random() * 5)
      next[plusIdx] = Math.min(next[plusIdx] + 1, 6)
    }
    let lastDice = next
    // 命運偏轉：每場首次重骰結果差（散骰/一對）時自動重骰一次
    if (eqBonus.badRollRetry && !badRollRetryUsed) {
      setBadRollRetryUsed(true)
      if (evaluateDice(next).rank <= 1) {
        const autoRolled = applyDiceBoosts(applyScramble(rollFive()))
        addLog(`命運偏轉：首次重骰仍是${evaluateDice(next).label}，自動重骰！→ ${evaluateDice(autoRolled).label}`)
        lastDice = autoRolled
      }
    }
    // 命運骰杯 / 快手卡 / 無極霸拳4件套: first reroll per turn free
    const hasCardFreeReroll = run.cards.some(c => c.effect.firstRerollFreeCard)
    if ((hasRelic(run.relics, 'fate_cup') && !freeRerollUsed) || (hasCardFreeReroll && !cardFreeRerollUsed)) {
      if (hasRelic(run.relics, 'fate_cup') && !freeRerollUsed) { setFreeRerollUsed(true); addLog('命運骰杯：免費重骰！') }
      else { setCardFreeRerollUsed(true); addLog('快手：首次重骰免費！') }
    } else if (set4FreeRerollReady) {
      setSet4FreeRerollReady(false); addLog('無極霸拳：連段中斷補償，本次重骰免費！')
    } else if (eqBonus.firstRerollFree && !affixFreeRerollUsed) {
      setAffixFreeRerollUsed(true); addLog('預見：每場首次重骰免費！')
    } else {
      setRerollsLeft(r => r - 1)
    }
    // 超頻機關: 每次重骰蓄熱層
    if (run.cards.some(c => c.effect.overclockCard)) setOverclockCharges(c => Math.min(c + 1, 4))
    setTurnRerolls(r => r + 1)
    // 蒸氣核心: accumulate charge per reroll
    if (hasRelic(run.relics, 'steam_core')) setSteamCharges(c => Math.min(c + 1, 3))
    // 機關詞綴：每次重骰蓄能攻擊（上限 30）
    if (eqBonus.rerollChargeAtk > 0) setRerollChargeAtkBonus(b => Math.min(b + eqBonus.rerollChargeAtk, 30))
    // 齒輪護盾：每次重骰獲得 N 護盾（職業）
    if (eqBonus.gearCogShield > 0) { setGuardBonus(g => g + eqBonus.gearCogShield); addLog(`齒輪護盾：重骰獲得 +${eqBonus.gearCogShield} 護盾`) }
    // 重骰護盾：每次重骰獲得 N 護盾（手部詞綴）
    if (eqBonus.rerollShield > 0) { setGuardBonus(g => g + eqBonus.rerollShield); addLog(`重骰護盾：+${eqBonus.rerollShield} 護盾`) }
    if (hasLeg('gear_reroll_charge')) setRerollCharge(c => c + 8)
    // 過載機關炮：過熱系統
    if (hasLeg('gear_overheat_cannon')) {
      if (!disableCannonThisTurn) {
        const hasBlueprintCooling = !!talPFirst('gear_blueprint_cooling')
        if (hasBlueprintCooling && !firstRerollNoOverheatUsed) {
          setFirstRerollNoOverheatUsed(true)
          addLog('⚙️ 永動圖紙：首次重骰不增加過熱')
        } else {
          const newOvheat = Math.min(overheatStacks + 1, 5)
          setOverheatStacks(newOvheat)
          if (newOvheat >= 5) addLog(`⚠️ 過載臨界！過熱 5/5 層，本次攻擊追加爆裂炮！`)
          else addLog(`⚙️ 過熱：${newOvheat} / 5 層`)
        }
      } else {
        addLog('⚙️ 冷卻中：本回合無法獲得炮彈')
      }
    }
    // Talent: reroll_min_boost (engineer lv60 + awakening)
    const rmbPassive = talPFirst('reroll_min_boost')
    if (rmbPassive) {
      const minBoostCapCard = leveledCards.reduce((s, c) => s + (c.effect.minBoostCapRaise ?? 0), 0)
      setMinDieBoost(b => Math.min(b + 1, rmbPassive.value + minBoostCapCard))
    }
    // Star: engineer star_reroll_charge — accumulate charges per reroll
    const starChgPas = talPFirst('star_reroll_charge')
    if (starChgPas) {
      const maxChg = talPFirst('star_reroll_charge_max')?.value2 ?? starChgPas.value2 ?? 3
      setStarChargeStacks(c => Math.min(c + 1, maxChg))
    }
    // 禁忌重骰 card: per-reroll +N% dmg (max pct*3), but lose N% max HP
    if (leveledCards.some(c => c.effect.tabooRerollDmgPct)) {
      const pct = leveledCards.reduce((s, c) => s + (c.effect.tabooRerollDmgPct ?? 0), 0)
      const tabooSelfDmgPct = leveledCards.reduce((s, c) => s + (c.effect.tabooRerollSelfDmgPct ?? 0), 0)
      const tabooSelfDmg = Math.max(1, Math.round(activeMember.maxHp * tabooSelfDmgPct / 100))
      setTabooRerollAcc(a => Math.min(a + pct, pct * 3))
      setHeroHp(h => Math.max(1, h - tabooSelfDmg))
      addLog(`禁忌重骰：蓄積 +${pct}%，失去 ${tabooSelfDmg} HP`)
    }
    // 血色骰 relic: per-reroll -N% max HP, +N% dmg (max pct*3)
    if (hasRelic(run.relics, 'blood_dice')) {
      const bloodDiceEffect = getOwnedRelicEffect(run.relics, run.relicLevels, 'blood_dice')
      const pct = bloodDiceEffect?.bloodDiceRerollDmgPct ?? 10
      const selfDmgPct = bloodDiceEffect?.bloodDiceRerollSelfDmgPct ?? 5
      const selfDmg = Math.max(1, Math.round(activeMember.maxHp * selfDmgPct / 100))
      setBloodDiceAcc(a => Math.min(a + pct, pct * 3))
      setHeroHp(h => Math.max(1, h - selfDmg))
      addLog(`血色骰：蓄積 +${pct}%，失去 ${selfDmg} HP`)
    }
    // 深淵鮟鱇：每次重骰蓄積 +15%（最多 +60%）
    if (isAnglerfish) {
      setAnglerLureBonus(b => Math.min(b + 15, 60))
      addLog(`深淵誘光：蓄積 ${Math.min(anglerLureBonus + 15, 60)}%！`)
    }
    // 深海亂流：每次重骰後隨機一顆骰子再擲一次
    if (isDeepSea && tideState === '亂流') {
      const nd = [...lastDice]
      const randIdx = Math.floor(Math.random() * 5)
      nd[randIdx] = Math.floor(Math.random() * 6) + 1
      addLog(`亂流：第 ${randIdx + 1} 顆骰子被潮流帶走，重新落點！`)
      lastDice = nd
    }
    setDice(lastDice)
    setComboText(evaluateDice(lastDice).label)
    addLog(`重骰第 ${i + 1} 顆骰子（剩 ${rerollsLeft - 1} 次）`)
  }

  // Auto-roll whenever a fresh turn begins
  useEffect(() => {
    if (phase === 'initial') doInitialRoll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const doAttack = () => {
    if (phase !== 'holding' || busy) return
    setPhase('animating')

    let iceMarkGain = 0  // 本回合冰痕增量，統一在攻擊尾端套用
    const killBoostThisTurn = eqBonus.killNextTurnDmg > 0 && killNextTurnDmgActive

    const combo    = evaluateDice(dice)
    const baseAct  = computeHeroAction(hero, combo, dice)
    // 影刃刺客：兩對以上觸發連擊，攻擊動作/傷害數字分兩段打出，比較有連擊感
    const shadowComboHit = hero.role === 'shadow' && combo.rank >= 2
    // Scoring tracking for dungeon leaderboard
    diceComboScoreRef.current  += getDiceComboScore(combo.label, baseAct.isSkill)
    battleTurnCountRef.current += 1

    // ── 灰燼聖約：聖約進度累積 ──────────────────────────────────────────────
    if (isAshCovenant) {
      const rateMult = covenantEventBuff?.covenantRateMult ?? 1.0
      let gain = 0
      dice.forEach(d => {
        if (d === 6) { gain += 6; playerUsedSixDieRef.current = true }
        else if (d === 5) gain += 4
      })
      if (combo.label === '五條')  gain += 10
      else if (combo.label === '大順') gain += 8
      else if (combo.label === '順子') gain += 4
      if (baseAct.damage > 60) gain += 8
      if (baseAct.heal > 30) gain += 6
      const finalGain = Math.round(gain * rateMult)
      if (finalGain > 0) {
        const limit = covenantEventBuff?.covenantMaxLimit ?? 100
        setCovenantProgress(p => Math.min(p + finalGain, limit))
        addLog(`🔱 聖約進度 +${finalGain}`)
      }
      // Phase 75: heal reduced by 20%
      if (covenantProgress >= 75 && baseAct.heal > 0) {
        const reduced = Math.round(baseAct.heal * 0.2)
        baseAct.heal = Math.max(0, baseAct.heal - reduced)
        addLog(`🔱 聖約重壓：治療效果 -20%（${reduced} 被削減）`)
      }
    }
    // ── 灰燼王國篇・第三章：王血詛咒累積 ─────────────────────────────────────
    if (isAshKingdom && run.chapter === 3) {
      let curseGain = 0
      const fiveCount = dice.filter(d => d === 5).length
      const sixCount  = dice.filter(d => d === 6).length
      curseGain += fiveCount       // 每顆 5 點 +1
      curseGain += sixCount * 2    // 每顆 6 點 +2
      if (combo.label === '五條') curseGain += 2    // 五條額外 +2
      if (combo.label === '大順' || combo.label === '順子') curseGain += 1  // 順子額外 +1
      if (curseGain > 0) {
        const newCurse = Math.min(royalBloodCurse + curseGain, 7)
        setRoyalBloodCurse(newCurse)
        addLog(`💀 王血詛咒：+${curseGain} 層（共 ${newCurse} 層）`)
      }
    }
    // Arrow 多樣性傷害表：順子最強，五條最弱，激勵散骰與不重複點數
    if (hero.role === 'arrow') {
      const ARROW_BASE: Record<string, number> = {
        '順子': 55, '散骰': 45, '一對': 40, '兩對': 35,
        '三條': 30, '葫蘆': 28, '四條': 24, '五條': 20,
      }
      const arrowBase = ARROW_BASE[combo.label] ?? combo.baseDamage
      const standardBase = combo.baseDamage + (combo.rank >= 4 ? 14 : 0)
      baseAct.damage = baseAct.damage - standardBase + arrowBase
      // 散骰（5種不同點數但非順子）也視為技能觸發，讓 100 級技能改動（連環箭雨/定點狙擊/毒箭浸透）能跟散骰連動
      if (combo.label === '散骰' && new Set(dice).size === 5) {
        baseAct.isSkill = true
      }
    }
    const keepAnger = hasRelic(run.relics, 'blood_rage_charm') && heroHp < activeMember.maxHp * 0.3
    const newAnger = combo.rank < 3 ? Math.min(angerCount + 1, 5) : (keepAnger ? angerCount : 0)
    setAngerCount(newAnger)

    const applied = applyCardEffects(baseAct, combo, leveledCards, heroHp, activeMember.maxHp, newAnger)

    // ── 英雄基礎技能效果（補足描述與程式的落差）────────────────────────────
    // 火焰法師：順子以上施加 2 層燃燒
    if (hero.role === 'fire' && baseAct.isSkill) {
      applied.applyBurn += 2
    }
    // 皇家公主：皇家冰晶陣 新版
    if (hero.role === 'ice' && baseAct.isSkill) {
      applied.defend += 12
      if (combo.rank >= 2) {
        iceMarkGain += 1
        addLog('皇家冰晶陣：兩對以上，施加 1 層冰痕！')
      }
      const alreadyFrozen = enemyStatus.some(s => s.type === 'freeze')
      if (alreadyFrozen) {
        applied.damage += 20
        addLog('皇家冰晶陣：敵人已凍結，追加 20 冰晶傷害！')
      } else {
        if (combo.rank >= 4) {
          applied.applyFreeze = true
          addLog('皇家冰晶陣：順子以上，凍結 1 回合！')
        }
      }
    }
    // 矮人戰士：三條以上破甲 -3
    if (hero.role === 'hammer' && combo.rank >= 3) {
      applied.applyArmorBreak += 3
    }
    // 影刃刺客：兩對以上有爆擊機率（rank≥2: 30%；rank≥4: 50%）
    if (hero.role === 'shadow' && combo.rank >= 2) {
      const critChance = combo.rank >= 4 ? 0.5 : 0.3
      if (Math.random() < critChance) {
        const critBonus = combo.rank >= 4 ? 25 : 20
        applied.damage += critBonus
        applied.extraLog.push(`暗影爆擊！+${critBonus}`)
      }
    }

    // ── 武鬥家：連續技檢測 ────────────────────────────────────────────────
    let fighterChainDmg = 0
    let newFistPower = fistPower
    let newNoDouble  = noDoubleLeft
    let chainTypeFired: FighterChainType | null = null
    if (hero.role === 'fighter') {
      const chainKey = `${normChainLabel(prevFighterCombo)}→${normChainLabel(combo.label)}`
      const chain = FIGHTER_CHAINS[chainKey]
      const weaponOK = !chain?.weaponOnly || hasLeg('fighter_weapon')
      const hasFSet4 = hasLeg('fighter_set4')
      if (chain && weaponOK) {
        chainTypeFired = chain.type
        missedChainRef.current = 0
        const fpGain = hasLeg('fighter_weapon') ? 2 : 1
        const hasQuickFist    = run.cards.some(c => c.id === 'fighter_quick_fist')
        const hasMunsouExtend = run.cards.some(c => c.id === 'fighter_munsou_extend')
        const fpExtraCard  = (hasQuickFist && noDoubleLeft === 0) ? 1 : 0
        const totalFpGain  = fpGain + fpExtraCard
        const enterNoDouble = fistPower + totalFpGain >= 5 && noDoubleLeft === 0
        newFistPower = Math.min(fistPower + totalFpGain, 5)
        if (fpExtraCard > 0) addLog(`疾拳精修：連段拳勢額外 +1（${newFistPower}/5）`)
        if (enterNoDouble) {
          const munsouRounds = 2 + (hasMunsouExtend ? 1 : 0)
          newNoDouble = munsouRounds; noDoubleLeftRef.current = munsouRounds
          setFighterOverdriveFlash(n => n + 1)
          addLog(`無雙架式！拳勢爆滿！${hasMunsouExtend ? '（無雙之魄：持續 3 回合）' : ''}`)
          if (hasLeg('fighter_weapon')) { setWeaponSkillBoostReady(true); addLog('龍皇拳套：下次奧義傷害 +30%！') }
        }
        // 無雙乘數
        const munsouBonus = (talPFirst('munsou_enhance')?.value ?? 0) + (hasMunsouExtend ? 20 : 0)
        const desperateMunsouAdd = heroHp < activeMember.maxHp * 0.3
          ? leveledCards.reduce((s, c) => s + (c.effect.lowHpMunsouBonus ?? 0), 0)
          : 0
        const munsouMult = noDoubleLeft > 0
          ? (1.5 + (munsouBonus + desperateMunsouAdd) / 100)
          : 1.0
        const rawDef  = hasFSet4 ? Math.max(chain.def  ?? 0, 12) : (chain.def  ?? 0)
        const rawHeal = hasFSet4 ? Math.max(chain.healAmt ?? 0, 12) : (chain.healAmt ?? 0)
        const set4Mult = hasFSet4 ? 1.2 : 1.0
        fighterChainDmg          = Math.round((chain.dmg ?? 0) * munsouMult * set4Mult)
        const weaponDefBonus     = (hasLeg('fighter_weapon') && chain.type === 'defend') ? 10 : 0
        const chainDef           = Math.round(rawDef  * munsouMult * set4Mult) + weaponDefBonus
        const chainHeal          = Math.round(rawHeal * munsouMult * set4Mult)
        const chainBreak         = chain.armorBreak ?? 0
        applied.damage  += fighterChainDmg
        applied.defend  += chainDef
        applied.heal    += chainHeal
        applied.applyArmorBreak += chainBreak
        // 武鬥家：拳勢 — 連續技觸發時傷害 +N
        if (eqBonus.fighterComboStrike > 0) { applied.damage += eqBonus.fighterComboStrike; addLog(`拳勢：連段加持 +${eqBonus.fighterComboStrike} 傷害`) }
        if (hasFSet4) { setGuardBonus(g => g + 8); addLog('無極霸拳：連段護盾 +8') }
        if (weaponDefBonus > 0) addLog('龍皇拳套：防守連段 +10 護盾')
        const chainABPas = talPFirst('chain_armor_break')
        if (chainABPas) applied.applyArmorBreak += chainABPas.value
        const chainParts: string[] = [`${chain.name}！`]
        if (fighterChainDmg > 0) chainParts.push(`+${fighterChainDmg}傷`)
        if (chainDef > 0) chainParts.push(`+${chainDef}盾`)
        if (chainHeal > 0) chainParts.push(`+${chainHeal}治`)
        if (chainBreak > 0) chainParts.push(`破甲+${chainBreak}`)
        if (hasFSet4) chainParts.push('(×1.2)')
        if (noDoubleLeft > 0) chainParts.push(`(無雙×${munsouMult.toFixed(1)})`)
        addLog(chainParts.join('・'))
        emitFloat((noDoubleLeft > 0 ? '⚡' : '👊') + ' ' + chain.name + '！', 'chain', 'hero', 1800)
      } else if (prevFighterCombo !== '') {
        missedChainRef.current += 1
        if (missedChainRef.current >= 2) {
          if (hasFSet4 && fighterBreakImmune) {
            setFighterBreakImmune(false); addLog('無極霸拳：首次斷連豁免，拳勢不減！')
          } else if (fistPower > 0) {
            newFistPower = fistPower - 1
            addLog(`連段中斷 ×2！拳勢 ${fistPower}→${newFistPower}`)
          }
          missedChainRef.current = 0
          if (hasFSet4) { setSet4FreeRerollReady(true); addLog('無極霸拳：連段中斷，下回合首次重骰免費！') }
        } else {
          addLog('連段未觸發')
        }
      }
      setFistPower(newFistPower)
      setNoDoubleLeft(newNoDouble)
      noDoubleLeftRef.current = newNoDouble
      setLastChainType(chainTypeFired ?? lastChainType)
    }

    // ── Numeric bonuses (equipment + relics + talents) ───────────────────
    const eqDmg  = eqBonus.flatDamage + eqBonus.damagePerRank * combo.rank
    const eqBurn   = eqBonus.burnOnAttack
    const eqPoison = eqBonus.poisonOnAttack
    const eqHeal = applied.heal > 0 ? eqBonus.healBonus : 0
    const relicDmg  = getRelicDamageBonus(run.relics, run.relicLevels)
    const relicComboDmg = combo.rank >= 3
      ? run.relics.reduce((s, id) => s + (getOwnedRelicEffect(run.relics, run.relicLevels, id)?.comboBonusDmg ?? 0), 0)
      : 0
    const relicHeal = applied.heal > 0 ? getRelicHealBonus(run.relics, run.relicLevels) : 0

    // Talent flat + per-rank + rankedDamage
    const talentDmg = talentBonus.flatDamage + talentBonus.damagePerRank * combo.rank +
      talentBonus.rankedDamages.reduce((s, rd) => s + (combo.rank >= rd.minRank ? rd.value : 0), 0) +
      attackAtkStack + tankStackBonus + sixDmgStack + uniqueAtkStack + healAtkBonus
    const talentHeal = applied.heal > 0 ? talentBonus.healBonus : 0
    const talentBurn = talentBonus.burnOnAttack

    let totalDamage = applied.damage + eqDmg + relicDmg + relicComboDmg + talentDmg
    let totalHeal   = applied.heal + eqHeal + relicHeal + talentHeal

    // ── 武鬥家：拳勢傷害乘數 ─────────────────────────────────────────────
    if (hero.role === 'fighter' && fistPower > 0) {
      const fpMult = 1 + fistPower * 0.05
      totalDamage = Math.round(totalDamage * fpMult)
      const fpFlatPas = talPFirst('fist_power_flat_dmg')
      if (fpFlatPas) totalDamage += fistPower * fpFlatPas.value
      const fjRing = hasRelic(run.relics, 'fist_jade_ring')
      const fjRingPerStack = getOwnedRelicEffect(run.relics, run.relicLevels, 'fist_jade_ring')?.fistJadeRingDmgPerStack ?? 4
      if (fjRing) totalDamage += fistPower * fjRingPerStack
      addLog(`拳勢 ${fistPower} 層：傷害 ×${fpMult.toFixed(2)}${fpFlatPas ? `+${fistPower * fpFlatPas.value}` : ''}${fjRing ? `+${fistPower * fjRingPerStack}(玉環)` : ''}`)
    }
    // ── 武鬥家：龍心碑 無雙架式追加真實傷害 ────────────────────────────
    if (hero.role === 'fighter' && noDoubleLeft > 0 && hasRelic(run.relics, 'dragon_heart_relic') && totalDamage > 0) {
      const dragonHeartDmg = getOwnedRelicEffect(run.relics, run.relicLevels, 'dragon_heart_relic')?.dragonHeartTrueDmg ?? 25
      totalDamage += dragonHeartDmg
      addLog(`龍心碑：無雙追加 +${dragonHeartDmg} 真實傷害`)
    }

    // 皇家公主：冰痕加成（每層 +4%，上限 5 層 = +20%）
    if (hero.role === 'ice' && iceMark > 0) {
      const iceMarkMult = 1 + iceMark * 0.04
      totalDamage = Math.round(totalDamage * iceMarkMult)
      addLog(`冰痕 ${iceMark} 層：傷害 +${iceMark * 4}%`)
    }
    // 皇家公主：絕對護衛蓄勢（上回合護盾存活 +20%）
    if (barrierBonusNext) {
      totalDamage = Math.round(totalDamage * 1.2)
      addLog('絕對護衛：護盾存活，本回合傷害 +20%！')
      setBarrierBonusNext(false)
    }

    // 聖騎士：五條時施加嘲諷，降低敵人本回合傷害 30%
    if (hero.role === 'slash' && combo.rank >= 6) {
      setTauntReduce(t => Math.min(t + 0.3, 0.8))
      addLog('聖盾嘲諷：敵人傷害降低 30%！')
    }

    // ── 職業詞綴（數值型，在基礎傷害確立後套用）─────────────────────────
    // 聖騎士：護盾存在時傷害 +N%
    if (eqBonus.shieldDmgPct > 0 && guardBonus > 0) {
      totalDamage = Math.round(totalDamage * (1 + eqBonus.shieldDmgPct / 100))
      addLog(`聖護：護盾加持，傷害 +${eqBonus.shieldDmgPct}%`)
    }
    // 聖騎士：每顆 6 獲得護盾（在攻擊時結算）
    if (eqBonus.sixShieldBonus > 0) {
      const sixCount = dice.filter(d => d === 6).length
      if (sixCount > 0) {
        setGuardBonus(g => g + eqBonus.sixShieldBonus * sixCount)
        addLog(`聖盾：${sixCount} 顆 6，+${eqBonus.sixShieldBonus * sixCount} 護盾`)
      }
    }
    // 火法：對燃燒敵人 +N 傷害
    if (eqBonus.burnEnemyBonus > 0 && enemyStatus.some(s => s.type === 'burn')) {
      totalDamage += eqBonus.burnEnemyBonus
      addLog(`灼熱：對燃燒敵人 +${eqBonus.burnEnemyBonus} 傷害`)
    }
    // 連擊：兩對以上追加 N 固定傷害（手部詞綴）
    if (eqBonus.twoPairFollowup > 0 && combo.rank >= 2) {
      totalDamage += eqBonus.twoPairFollowup
      addLog(`連擊：兩對追加 +${eqBonus.twoPairFollowup} 傷害`)
    }
    // 刺客：兩對以上追加 N% 傷害
    if (eqBonus.twoPairExtraPct > 0 && combo.rank >= 2) {
      const extra = Math.round(totalDamage * eqBonus.twoPairExtraPct / 100)
      totalDamage += extra
      addLog(`暗影：兩對追加 ${extra} 傷害`)
    }
    // 刺客：對中毒敵人 +N 傷害（裝備詞綴）
    if (eqBonus.poisonBonus > 0 && enemyStatus.some(s => s.type === 'poison')) {
      totalDamage += eqBonus.poisonBonus
      addLog(`毒刃：對中毒敵人 +${eqBonus.poisonBonus} 傷害`)
    }
    // 暗殺大師（天賦）：攻擊中毒敵人追加 N 暗影傷害
    const assassinatePas = talPFirst('shadow_assassinate_poisoned')
    if (assassinatePas && enemyStatus.some(s => s.type === 'poison')) {
      totalDamage += assassinatePas.value
      addLog(`暗殺大師：對中毒敵人追加 ${assassinatePas.value} 暗影傷害`)
    }
    // 暮影行者（星級）：攻擊中毒敵人額外附加 1 層中毒
    const poisonBonusPas = talPFirst('shadow_poison_bonus')
    if (poisonBonusPas && enemyStatus.some(s => s.type === 'poison')) {
      applied.applyPoison += poisonBonusPas.value
      addLog('暮影行者：目標有中毒，額外施加 1 層中毒')
    }
    // 冰法：對凍結敵人 +N 傷害
    if (eqBonus.frozenBonus > 0 && enemyStatus.some(s => s.type === 'freeze')) {
      totalDamage += eqBonus.frozenBonus
      addLog(`冰封：對凍結敵人 +${eqBonus.frozenBonus} 傷害`)
    }
    // 遊俠：每種不同點數 +N 傷害
    if (eqBonus.distinctDiceDmg > 0) {
      const distinct = new Set(dice).size
      totalDamage += distinct * eqBonus.distinctDiceDmg
      addLog(`疾風：${distinct} 種點數 +${distinct * eqBonus.distinctDiceDmg} 傷害`)
    }
    // 矮人：防禦 N% 轉化為傷害
    if (eqBonus.defToDmgPct > 0) {
      const defDmg = Math.round((hero.def + extraDef) * eqBonus.defToDmgPct / 100)
      totalDamage += defDmg
      addLog(`鐵壁：防禦轉傷害 +${defDmg}`)
    }
    // 機關：重骰蓄能攻擊（消耗）
    if (rerollChargeAtkBonus > 0) {
      totalDamage += rerollChargeAtkBonus
      addLog(`蓄能：釋放 +${rerollChargeAtkBonus} 傷害`)
      setRerollChargeAtkBonus(0)
    }
    // 神官：治療後下次攻擊 +N（消耗）
    if (postHealAtkBonus > 0) {
      totalDamage += postHealAtkBonus
      addLog(`神光：治療蓄力 +${postHealAtkBonus} 傷害`)
      setPostHealAtkBonus(0)
    }
    // ── 頭部詞綴 ─────────────────────────────────────────────────────────
    // 冷靜：本回合重骰 ≤ 2 次時傷害 +N%
    if (eqBonus.lowRerollBonus > 0 && turnRerolls <= 2) {
      totalDamage = Math.round(totalDamage * (1 + eqBonus.lowRerollBonus / 100))
      addLog(`冷靜：重骰 ${turnRerolls} 次，傷害 +${eqBonus.lowRerollBonus}%`)
    }
    // 專注：前 2 回合傷害 +N%
    if (eqBonus.focusFirstTurns > 0 && battleTurn <= 1) {
      totalDamage = Math.round(totalDamage * (1 + eqBonus.focusFirstTurns / 100))
      addLog(`專注：第 ${battleTurn + 1} 回合，傷害 +${eqBonus.focusFirstTurns}%`)
    }
    // ── 鞋子詞綴 ─────────────────────────────────────────────────────────
    // 先制：第一回合傷害 +N%
    if (eqBonus.firstTurnDmg > 0 && battleTurn === 0) {
      totalDamage = Math.round(totalDamage * (1 + eqBonus.firstTurnDmg / 100))
      addLog(`先制：第一回合，傷害 +${eqBonus.firstTurnDmg}%`)
    }
    // 靜心：本回合不重骰時傷害 +N%
    if (eqBonus.noRerollBonus > 0 && turnRerolls === 0) {
      totalDamage = Math.round(totalDamage * (1 + eqBonus.noRerollBonus / 100))
      addLog(`靜心：未重骰，傷害 +${eqBonus.noRerollBonus}%`)
    }
    // 追擊：擊殺後下回合傷害 +N%
    if (killBoostThisTurn) {
      totalDamage = Math.round(totalDamage * (1 + eqBonus.killNextTurnDmg / 100))
      addLog(`追擊：擊殺後加持，傷害 +${eqBonus.killNextTurnDmg}%`)
      setKillNextTurnDmgActive(false)
    }
    // ── 戒指詞綴 ─────────────────────────────────────────────────────────
    // 順勢攻擊：順子以上（rank≥4）時傷害 +N%
    if (eqBonus.straightDmgPct > 0 && combo.rank >= 4) {
      totalDamage = Math.round(totalDamage * (1 + eqBonus.straightDmgPct / 100))
      addLog(`順勢攻擊：${combo.label}，傷害 +${eqBonus.straightDmgPct}%`)
    }
    // 火焰共鳴：敵人燃燒≥4層時傷害 +N%
    if (eqBonus.fireResonancePct > 0) {
      const burnStacks = enemyStatus.find(s => s.type === 'burn')?.stacks ?? 0
      if (burnStacks >= 4) {
        totalDamage = Math.round(totalDamage * (1 + eqBonus.fireResonancePct / 100))
        addLog(`火焰共鳴：燃燒 ${burnStacks} 層，傷害 +${eqBonus.fireResonancePct}%`)
      }
    }
    // 冰封共鳴：攻擊凍結敵人時追加 N 傷害
    if (eqBonus.frozenResonance > 0 && enemyStatus.some(s => s.type === 'freeze')) {
      totalDamage += eqBonus.frozenResonance
      addLog(`冰封共鳴：凍結敵人追加 ${eqBonus.frozenResonance} 傷害`)
    }
    // 完美骰紋：五顆點數皆不同時追加 N 傷害
    if (eqBonus.fiveUniqueBonusDmg > 0 && new Set(dice).size === 5) {
      totalDamage += eqBonus.fiveUniqueBonusDmg
      addLog(`完美骰紋：五種點數！追加 ${eqBonus.fiveUniqueBonusDmg} 傷害`)
    }
    // 小順子祝福：順子以上獲得 N 護盾
    if (eqBonus.straightShield > 0 && combo.rank >= 4) {
      setGuardBonus(g => g + eqBonus.straightShield)
      addLog(`小順子祝福：${combo.label}，獲得 +${eqBonus.straightShield} 護盾`)
    }
    // ── 武器通用詞綴 ─────────────────────────────────────────────────────
    // 斬殺：敵人 HP < 30% 時傷害 +N%
    if (eqBonus.executeDmg > 0 && enemyHp / enemy.hp < 0.3) {
      totalDamage = Math.round(totalDamage * (1 + eqBonus.executeDmg / 100))
      addLog(`斬殺：敵人殘血，傷害 +${eqBonus.executeDmg}%`)
    }
    // 三條強擊：三條以上時傷害 +N%
    if (eqBonus.comboDmg > 0 && combo.rank >= 3) {
      totalDamage = Math.round(totalDamage * (1 + eqBonus.comboDmg / 100))
      addLog(`三條強擊：傷害 +${eqBonus.comboDmg}%`)
    }
    // 暴擊紋：順子以上（rank≥4）時額外 +N 傷害
    if (eqBonus.critOnBigCombo > 0 && combo.rank >= 4) {
      totalDamage += eqBonus.critOnBigCombo
      addLog(`暴擊紋：${combo.label}！暴擊 +${eqBonus.critOnBigCombo} 傷害`)
    }
    // ── 職業詞綴第二輪：攻擊時計算 ──────────────────────────────────────
    // 聖騎士：神罰 — 護盾 > 20 追加 N 真實傷害
    if (eqBonus.slashDivinePunish > 0 && guardBonus > 20) {
      totalDamage += eqBonus.slashDivinePunish
      addLog(`神罰：護盾充盈，追加 ${eqBonus.slashDivinePunish} 真實傷害`)
    }
    // 火法：爆燃 — 敵燃燒 ≥ 6 層追加 N 傷害
    if (eqBonus.fireConflagration > 0) {
      const burnStk = enemyStatus.find(s => s.type === 'burn')?.stacks ?? 0
      if (burnStk >= 6) { totalDamage += eqBonus.fireConflagration; addLog(`爆燃：敵燃燒 ${burnStk} 層，追加 ${eqBonus.fireConflagration} 傷害`) }
    }
    // 神官：祝福骰 — 兩對以上回復 N HP
    if (eqBonus.holyBlessedDice > 0 && combo.rank >= 2) {
      totalHeal += eqBonus.holyBlessedDice
      addLog(`祝福骰：兩對以上，回復 ${eqBonus.holyBlessedDice} HP`)
    }
    // 刺客：背刺 — 敵中毒+兩對以上傷害 +N%
    if (eqBonus.shadowBackstab > 0 && combo.rank >= 2 && enemyStatus.some(s => s.type === 'poison')) {
      const extra = Math.round(totalDamage * eqBonus.shadowBackstab / 100)
      totalDamage += extra
      addLog(`背刺：中毒+兩對，追加 ${extra} 傷害`)
    }
    // 刺客：毒爆 — 對中毒敵人追加 N 傷害
    if (eqBonus.shadowPoisonBurst > 0 && enemyStatus.some(s => s.type === 'poison')) {
      totalDamage += eqBonus.shadowPoisonBurst
      addLog(`毒爆：對中毒敵人追加 ${eqBonus.shadowPoisonBurst} 傷害`)
    }
    // 冰法：碎冰 — 攻擊凍結敵人追加 N 傷害
    if (eqBonus.iceShatter > 0 && enemyStatus.some(s => s.type === 'freeze')) {
      totalDamage += eqBonus.iceShatter
      addLog(`碎冰：凍結目標，追加 ${eqBonus.iceShatter} 傷害`)
    }
    // 冰法：冰痕 — N% 機率施加 1 層凍結
    if (eqBonus.iceFrostMark > 0 && Math.random() * 100 < eqBonus.iceFrostMark) {
      setEnemyStatus(s => addStack(s, 'freeze', 1, 'set'))
      addLog(`冰痕：觸發！施加凍結`)
    }
    // 遊俠：連珠箭 — 五顆全不同追加 N 傷害
    if (eqBonus.arrowVolley > 0 && new Set(dice).size === 5) {
      totalDamage += eqBonus.arrowVolley
      addLog(`連珠箭：五顆全不同，追加 ${eqBonus.arrowVolley} 傷害`)
    }
    // 遊俠：狙擊 — 未重骰傷害 +N%
    if (eqBonus.arrowSnipe > 0 && turnRerolls === 0) {
      totalDamage = Math.round(totalDamage * (1 + eqBonus.arrowSnipe / 100))
      addLog(`狙擊：未重骰，傷害 +${eqBonus.arrowSnipe}%`)
    }
    // 矮人：鐵砧反擊 — 消耗受攻蓄積
    if (eqBonus.hammerCounter > 0 && hammerCounterBonus > 0) {
      totalDamage += hammerCounterBonus
      addLog(`鐵砧反擊：釋放蓄積 +${hammerCounterBonus} 傷害`)
      setHammerCounterBonus(0)
    }
    // 詩人：戰歌 — 治療後傷害加持（消耗）
    if (eqBonus.songWarCry > 0 && songWarCryActive) {
      totalDamage = Math.round(totalDamage * (1 + eqBonus.songWarCry / 100))
      addLog(`戰歌：治療加持，傷害 +${eqBonus.songWarCry}%`)
      setSongWarCryActive(false)
    }
    // 詩人：激昂旋律 — 連續兩回合不同骰型時獲得 N 護盾
    if (eqBonus.songMelody > 0 && prevTurnRankLabel !== '' && prevTurnRankLabel !== combo.label) {
      setGuardBonus(g => g + eqBonus.songMelody)
      addLog(`激昂旋律：骰型變換，獲得 +${eqBonus.songMelody} 護盾`)
    }
    // 獸語：狼群呼應 — 消耗狼後蓄積
    if (eqBonus.beastWolfEcho > 0 && beastWolfEchoBonus > 0) {
      totalDamage += beastWolfEchoBonus
      addLog(`狼群呼應：狼後蓄積 +${beastWolfEchoBonus} 傷害`)
      setBeastWolfEchoBonus(0)
    }
    // 機關：超載核心 — 重骰 3 次以上追加 N
    if (eqBonus.gearOverload > 0 && turnRerolls >= 3) {
      totalDamage += eqBonus.gearOverload
      addLog(`超載核心：重骰 ${turnRerolls} 次，追加 ${eqBonus.gearOverload} 傷害`)
    }
    // 武鬥家：破綻追擊 — 易傷+兩對以上
    if (eqBonus.fighterExploit > 0 && combo.rank >= 2 && enemyStatus.some(s => s.type === 'vulnerable')) {
      totalDamage += eqBonus.fighterExploit
      addLog(`破綻追擊：易傷+兩對，追加 ${eqBonus.fighterExploit} 傷害`)
    }
    // 武鬥家：龍息蓄力 — 消耗上回合未重骰蓄力
    if (eqBonus.fighterDragonCharge > 0 && dragonChargeBonus > 0) {
      totalDamage = Math.round(totalDamage * (1 + dragonChargeBonus / 100))
      addLog(`龍息蓄力：蓄力完成，傷害 +${dragonChargeBonus}%`)
      setDragonChargeBonus(0)
    }
    // 奮戰鬥志：受擊後蓄積，攻擊時釋放
    if (fightingSpiritStacks > 0 && leveledCards.some(c => c.id === 'fighting_spirit')) {
      const lv = run.cardLevels?.['fighting_spirit'] ?? 1
      const perStack = lv >= 3 ? 12 : lv >= 2 ? 10 : 8
      const bonus = fightingSpiritStacks * perStack
      totalDamage += bonus
      addLog(`奮戰鬥志：${fightingSpiritStacks} 層蓄積 +${bonus} 傷害`)
      setFightingSpiritStacks(0)
    }
    // 賭徒衝勁：每次出手 +N 永久（先累積再用，攻擊後增加）
    if (leveledCards.some(c => c.id === 'gamblers_rush')) {
      const lv = run.cardLevels?.['gamblers_rush'] ?? 1
      const perAtk = lv >= 3 ? 4 : lv >= 2 ? 3 : 2
      const cap = lv >= 3 ? 30 : lv >= 2 ? 25 : 20
      const newBonus = Math.min(gamblersRushBonus + perAtk, cap)
      totalDamage += newBonus
      setGamblersRushBonus(newBonus)
      if (newBonus > 0) addLog(`賭徒衝勁：本場累積 +${newBonus} 傷害`)
    }
    // 毒牙之環：蓄積攻擊力
    if (poisonAtkStack > 0) {
      totalDamage += poisonAtkStack
      addLog(`毒牙之環：毒攻蓄積 +${poisonAtkStack} 傷害`)
    }
    // 逆轉護符：本場永久攻擊加成
    if (reversalAtkBonus > 0) {
      totalDamage += reversalAtkBonus
    }
    // 血怒護符：每層怒氣額外 +N 傷害
    if (hasRelic(run.relics, 'blood_rage_charm') && newAnger > 0) {
      const bonus = newAnger * (getOwnedRelicEffect(run.relics, run.relicLevels, 'blood_rage_charm')?.angerBonusDmg ?? 3)
      totalDamage += bonus
      addLog(`血怒護符：怒氣 ${newAnger} 層 +${bonus} 傷害`)
    }
    // 命運之手：本回合重骰 ≥2 次時傷害 +15%
    if (hasRelic(run.relics, 'fate_hand') && turnRerolls >= 2) {
      const pct = getOwnedRelicEffect(run.relics, run.relicLevels, 'fate_hand')?.rerollDmgPct ?? 15
      totalDamage = Math.round(totalDamage * (1 + pct / 100))
      addLog(`命運之手：重骰強化 +${pct}%`)
    }

    // ── 卡牌條件式效果（需要戰鬥狀態）──────────────────────────────────────
    // 護盾存在時傷害 +N%
    const cardShieldPct = leveledCards.reduce((s, c) => s + (c.effect.shieldBonusDmgPct ?? 0), 0)
    if (cardShieldPct > 0 && guardBonus > 0) {
      totalDamage = Math.round(totalDamage * (1 + cardShieldPct / 100))
      addLog(`護盾加持：+${cardShieldPct}% 傷害`)
    }
    // 敵人燃燒時傷害 +N%
    const cardBurnPct = leveledCards.reduce((s, c) => s + (c.effect.burnEnemyDmgPct ?? 0), 0)
    if (cardBurnPct > 0 && enemyStatus.some(s => s.type === 'burn')) {
      totalDamage = Math.round(totalDamage * (1 + cardBurnPct / 100))
      addLog(`燃燒強化：+${cardBurnPct}% 傷害`)
    }
    // 炎獄覺醒：敵人燃燒≥15 層時傷害 +N%
    const highBurnPct = leveledCards.reduce((s, c) => s + (c.effect.highBurnDmgPct ?? 0), 0)
    if (highBurnPct > 0) {
      const burnStksNow = enemyStatus.find(s => s.type === 'burn')?.stacks ?? 0
      if (burnStksNow >= 15) {
        totalDamage = Math.round(totalDamage * (1 + highBurnPct / 100))
        addLog(`炎獄覺醒：燃燒 ${burnStksNow} 層，傷害 +${highBurnPct}%`)
      }
    }
    // 獸血爆發：野性積累(attackAtkStack) ≥10 層時傷害 +N%
    const highAtkStackPct = leveledCards.reduce((s, c) => s + (c.effect.highAtkStackDmgPct ?? 0), 0)
    if (highAtkStackPct > 0 && attackAtkStack >= 10) {
      totalDamage = Math.round(totalDamage * (1 + highAtkStackPct / 100))
      addLog(`獸血爆發：野性積累 ${attackAtkStack} 層，傷害 +${highAtkStackPct}%`)
    }
    // 神罰強化：累計治療里程碑達成後傷害 +N%
    const healMilestonePct = leveledCards.reduce((s, c) => s + (c.effect.healMilestoneBonus ?? 0), 0)
    if (healMilestonePct > 0 && healMilestoneHitRef.current) {
      totalDamage = Math.round(totalDamage * (1 + healMilestonePct / 100))
      addLog(`神罰強化：傷害 +${healMilestonePct}%`)
    }
    // 每顆骰出 1 追加 N 傷害
    const cardOnesDmg = leveledCards.reduce((s, c) => s + (c.effect.onesDamage ?? 0), 0)
    if (cardOnesDmg > 0) {
      const onesCount = dice.filter(d => d === 1).length
      if (onesCount > 0) { totalDamage += onesCount * cardOnesDmg; addLog(`骰1衝勁：${onesCount} 顆 1 +${onesCount * cardOnesDmg} 傷害`) }
    }
    // 精準射擊：每種不同點數 +N 傷害
    const distinctDiceCard = leveledCards.reduce((s, c) => s + (c.effect.distinctDiceCardDmg ?? 0), 0)
    if (distinctDiceCard > 0) {
      const distinct = new Set(dice).size
      totalDamage += distinct * distinctDiceCard
      addLog(`精準：${distinct} 種點數 +${distinct * distinctDiceCard} 傷害`)
    }
    // 超頻機關：釋放過熱傷害
    if (overclockCharges > 0 && run.cards.some(c => c.effect.overclockCard)) {
      const chargeDmg = overclockCharges * 6
      totalDamage += chargeDmg
      addLog(`超頻：${overclockCharges} 層過熱 +${chargeDmg} 傷害`)
      if (overclockCharges >= 3) {
        setHeroHp(h => Math.max(1, h - 3))
        addLog('超頻過熱：自傷 3 HP')
      }
      setOverclockCharges(0)
    }
    // 影襲連擊：本回合有重骰時再 +6/+8/+10
    if (run.cards.some(c => c.id === 'shadow_combo') && combo.rank >= 2 && turnRerolls > 0) {
      const scLv = run.cardLevels?.['shadow_combo'] ?? 1
      const scBonus = scLv >= 3 ? 10 : scLv >= 2 ? 8 : 6
      totalDamage += scBonus
      addLog(`影襲連擊：重骰強化 +${scBonus} 傷害`)
    }
    // 漸強樂章：連續兩回合兩對以上再 +10/+13/+16
    if (run.cards.some(c => c.id === 'song_crescendo') && combo.rank >= 2 && lastComboRank >= 2) {
      const crLv = run.cardLevels?.['song_crescendo'] ?? 1
      const crBonus = crLv >= 3 ? 16 : crLv >= 2 ? 13 : 10
      totalDamage += crBonus
      addLog(`漸強樂章：節奏共鳴 +${crBonus} 傷害`)
    }
    // 箭雨齊射：順子以上追加 40% 傷害
    if (run.cards.some(c => c.id === 'arrow_volley') && combo.rank >= 4) {
      totalDamage += Math.round(totalDamage * 0.4)
      addLog('箭雨齊射：追加 40% 傷害')
    }
    // 烈焰噴發：引爆 20% 燃燒層數
    let burnConsumed = 0
    let gearExplosionDmg = 0  // 機關技師 爆裂炮：過熱臨界(>=5)追加的爆裂傷害
    const igniteCard = run.cards.find(c => c.effect.ignitePct)
    if (igniteCard && combo.rank >= 4) {
      const burnStk = enemyStatus.find(s => s.type === 'burn')?.stacks ?? 0
      if (burnStk > 0) {
        const igniteDmg = Math.round(burnStk * (igniteCard.effect.ignitePct! / 100))
        totalDamage += igniteDmg
        burnConsumed += igniteDmg
        addLog(`烈焰噴發：引爆燃燒 +${igniteDmg} 傷害（消耗 ${igniteDmg} 層）`)
      }
    }
    // 寒冰碎裂：順子以上敵人下回合攻擊 -N%
    const straightWeakenPct = leveledCards.reduce((s, c) => s + (c.effect.straightWeakenCard ?? 0), 0)
    if (straightWeakenPct > 0 && combo.rank >= 4) {
      setTauntReduce(Math.min(tauntReduce + straightWeakenPct / 100, 0.8))
      addLog(`寒冰碎裂：敵人下回合攻擊 −${straightWeakenPct}%`)
    }
    // 盾擊訓練：護盾值 N% 轉傷害
    const shieldToDmg = leveledCards.reduce((s, c) => s + (c.effect.shieldToDmgPct ?? 0), 0)
    if (shieldToDmg > 0 && guardBonus > 0) {
      const bonus = Math.round(guardBonus * shieldToDmg / 100)
      totalDamage += bonus
      addLog(`盾擊訓練：護盾轉 +${bonus} 傷害`)
    }
    // 護盾聖典：額外護盾轉傷 +N%；護盾≥30 追加固定傷
    const relicShieldToDmgPct = run.relics.reduce((s, id) => s + (getOwnedRelicEffect(run.relics, run.relicLevels, id)?.shieldToDmgRelicPct ?? 0), 0)
    if (relicShieldToDmgPct > 0 && guardBonus > 0) {
      const bonus = Math.round(guardBonus * relicShieldToDmgPct / 100)
      totalDamage += bonus
      addLog(`護盾聖典：護盾轉 +${bonus} 傷害`)
    }
    const relicHighShieldFlatDmg = run.relics.reduce((s, id) => s + (getOwnedRelicEffect(run.relics, run.relicLevels, id)?.highShieldFlatDmg ?? 0), 0)
    if (relicHighShieldFlatDmg > 0 && guardBonus >= 30) {
      totalDamage += relicHighShieldFlatDmg
      addLog(`護盾聖典：護盾≥30，追加 ${relicHighShieldFlatDmg} 傷害`)
    }
    // 動能超載：minDieBoost 達 +4 時追加 15 傷害
    const minBoostCardRaise = leveledCards.reduce((s, c) => s + (c.effect.minBoostCapRaise ?? 0), 0)
    if (minBoostCardRaise > 0 && minDieBoost >= 4) {
      totalDamage += 15
      addLog('動能超載：最低值已達 +4，追加 15 傷害')
    }
    // 穩定射擊：本回合未重骰時傷害 +N%
    const noRerollDmg = leveledCards.reduce((s, c) => s + (c.effect.noRerollDmgPct ?? 0), 0)
    if (noRerollDmg > 0 && turnRerolls === 0) {
      totalDamage = Math.round(totalDamage * (1 + noRerollDmg / 100))
      addLog(`穩定射擊：未重骰 +${noRerollDmg}% 傷害`)
    }
    // 過熱爆破：本回合重骰≥2 次時攻擊附加燃燒
    const rerollBurnBonus = leveledCards.reduce((s, c) => s + (c.effect.rerollBurnBonus ?? 0), 0)
    if (rerollBurnBonus > 0 && turnRerolls >= 2) {
      applied.applyBurn += rerollBurnBonus
      addLog(`過熱爆破：重骰過熱，附加 ${rerollBurnBonus} 層燃燒`)
    }
    // 爆燃術：燃燒≥threshold 時引爆 N%（每回合一次）lv1:30%/10 lv2:35%/10 lv3:40%/8
    if (run.cards.some(c => c.id === 'fire_explosion') && !fireExplosionUsed) {
      const feLv = run.cardLevels?.['fire_explosion'] ?? 1
      const feThreshold = feLv >= 3 ? 8 : 10
      const fePct = feLv >= 3 ? 0.35 : feLv >= 2 ? 0.28 : 0.22
      const burnStk = enemyStatus.find(s => s.type === 'burn')?.stacks ?? 0
      if (burnStk >= feThreshold) {
        const igniteDmg = Math.round(burnStk * fePct)
        totalDamage += igniteDmg
        burnConsumed += igniteDmg
        setFireExplosionUsed(true)
        addLog(`爆燃術：引爆 ${Math.round(fePct * 100)}% 燃燒 +${igniteDmg} 傷害！（消耗 ${igniteDmg} 層）`)
      }
    }
    // 弱點突襲：每種負面狀態 +N%（lv1:6%/24% lv2:8%/32% lv3:10%/40%）
    if (run.cards.some(c => c.id === 'shadow_weak_strike')) {
      const swLv = run.cardLevels?.['shadow_weak_strike'] ?? 1
      const swPct = swLv >= 3 ? 10 : swLv >= 2 ? 8 : 6
      const swCap = swLv >= 3 ? 40 : swLv >= 2 ? 32 : 24
      const debuffTypes = new Set(enemyStatus.map(s => s.type)).size
      const pct = Math.min(debuffTypes * swPct, swCap)
      if (pct > 0) {
        totalDamage = Math.round(totalDamage * (1 + pct / 100))
        addLog(`弱點突襲：${debuffTypes} 種負面狀態 +${pct}%`)
      }
    }
    // 碎冰追擊：攻擊凍結敵人時 +25%/+32%/+40%，但解除凍結
    if (run.cards.some(c => c.id === 'ice_shatter_strike') && enemyStatus.some(s => s.type === 'freeze')) {
      const isLv = run.cardLevels?.['ice_shatter_strike'] ?? 1
      const isMult = isLv >= 3 ? 1.40 : isLv >= 2 ? 1.32 : 1.25
      totalDamage = Math.round(totalDamage * isMult)
      addLog(`碎冰追擊：碎裂凍結！+${Math.round((isMult - 1) * 100)}% 傷害`)
      applied.applyFreeze = false
    }
    // 百步穿楊：5 種不同點數追加 50%/62%/75% 傷害
    if (run.cards.some(c => c.id === 'arrow_bullseye') && new Set(dice).size === 5) {
      const abLv = run.cardLevels?.['arrow_bullseye'] ?? 1
      const abPct = abLv >= 3 ? 0.75 : abLv >= 2 ? 0.62 : 0.50
      const bonus = Math.round(totalDamage * abPct)
      totalDamage += bonus
      addLog(`百步穿楊：全異點數！追加 ${bonus} 傷害`)
    }
    // 散形連射：散骰時 +18/23/28 傷害；若上回合也是散骰，再追加 30%/38%/46% 傷害
    if (run.cards.some(c => c.id === 'arrow_scatter_chain') && combo.label === '散骰') {
      const scLv = run.cardLevels?.['arrow_scatter_chain'] ?? 1
      const scFlat = scLv >= 3 ? 28 : scLv >= 2 ? 23 : 18
      totalDamage += scFlat
      addLog(`散形連射：散骰！+${scFlat} 傷害`)
      if (prevTurnRankLabel === '散骰') {
        const scPct = scLv >= 3 ? 0.46 : scLv >= 2 ? 0.38 : 0.30
        const chainBonus = Math.round(totalDamage * scPct)
        totalDamage += chainBonus
        addLog(`散形連射：連續散骰！追加 ${chainBonus} 傷害`)
      }
    }
    // 散形迅擊：散骰時額外 +12/15/19 傷害
    if (run.cards.some(c => c.id === 'arrow_scatter_strike') && combo.label === '散骰') {
      const ssLv = run.cardLevels?.['arrow_scatter_strike'] ?? 1
      const ssFlat = ssLv >= 3 ? 19 : ssLv >= 2 ? 15 : 12
      totalDamage += ssFlat
      addLog(`散形迅擊：散骰！+${ssFlat} 傷害`)
    }
    // 散形強擊：散骰時 +18/22/27 傷害；護盾存在時傷害 +10%/13%/16%
    if (run.cards.some(c => c.id === 'arrow_scatter_guard') && combo.label === '散骰') {
      const sgLv = run.cardLevels?.['arrow_scatter_guard'] ?? 1
      const sgFlat = sgLv >= 3 ? 27 : sgLv >= 2 ? 22 : 18
      totalDamage += sgFlat
      addLog(`散形強擊：散骰！+${sgFlat} 傷害`)
      if (guardBonus > 0) {
        const sgPct = sgLv >= 3 ? 0.16 : sgLv >= 2 ? 0.13 : 0.10
        const shieldBonus = Math.round(totalDamage * sgPct)
        totalDamage += shieldBonus
        addLog(`散形強擊：護盾加持！追加 ${shieldBonus} 傷害`)
      }
    }
    // 節奏記憶：連續兩回合 rank≥2 傷害 +25%/+32%/+40%
    if (run.cards.some(c => c.id === 'song_rhythm') && combo.rank >= 2 && lastComboRank >= 2) {
      const srLv = run.cardLevels?.['song_rhythm'] ?? 1
      const srMult = srLv >= 3 ? 1.40 : srLv >= 2 ? 1.32 : 1.25
      totalDamage = Math.round(totalDamage * srMult)
      addLog(`節奏記憶：連續節奏！傷害 +${Math.round((srMult - 1) * 100)}%`)
    }
    // 聖光回響：治療後攻擊蓄力（消耗）lv1:+10/max2 lv2:+13/max2 lv3:+16/max3
    if (holyEchoStacks > 0) {
      const heLv = run.cardLevels?.['holy_echo'] ?? 1
      const hePerStack = heLv >= 3 ? 16 : heLv >= 2 ? 13 : 10
      totalDamage += holyEchoStacks * hePerStack
      addLog(`聖光回響：治療蓄力 +${holyEchoStacks * hePerStack} 傷害`)
      setHolyEchoStacks(0)
    }
    // 粉碎打擊：破甲超出防禦時，超出部分 50%/62%/75% 轉傷害
    if (run.cards.some(c => c.id === 'hammer_smash')) {
      const hmLv = run.cardLevels?.['hammer_smash'] ?? 1
      const hmPct = hmLv >= 3 ? 0.75 : hmLv >= 2 ? 0.62 : 0.50
      const curAB = enemyStatus.find(s => s.type === 'armor_break')?.stacks ?? 0
      const excess = Math.max(0, curAB - enemy.def)
      if (excess > 0) {
        const smashDmg = Math.round(excess * hmPct)
        totalDamage += smashDmg
        addLog(`粉碎打擊：超額破甲 +${smashDmg} 傷害`)
      }
    }

    // 鏡像盜賊：玩家打出三條以上，下次攻擊+40%
    if (isMirrorThief && combo.rank >= 3) {
      setMirrorThiefBoosted(true)
      addLog('模仿骰型：鏡像記住了你的骰型！下次攻擊 +40%')
    }

    // Reset per-attack talent stacks
    setTankStackBonus(0)
    setSixDmgStack(0)
    // uniqueAtkStack intentionally NOT reset here — handled in post-attack block below
    setHealAtkBonus(0)

    // Talent: attack_atk_stack (beast lv60a)
    const aasPas = talPFirst('attack_atk_stack')
    if (aasPas) setAttackAtkStack(a => Math.min(a + aasPas.value, aasPas.value2 ?? 20))

    // ── Legendary weapon effects (damage modifiers) ───────────────────────
    // beast_atk_stack: 每次攻擊本場 ATK +3（狼群號角，或野性爆發天賦）
    if (hasLeg('beast_atk_stack') || talentBonus.skillOverrideId === 'beast_fury') {
      setBeastBonus(b => Math.min(b + 3, 30))
      totalDamage += beastBonus  // use OLD value (earned in previous attacks)
    }

    // acc_berserker (legendary accessory)
    if (hasLeg('acc_berserker') && heroHp < activeMember.maxHp * 0.3) {
      totalDamage = Math.round(totalDamage * 1.5)
      addLog('狂戰士之戒：HP 極低，傷害 ×1.5！')
    }
    // armor_last_stand: HP<30%時傷害×1.4
    if (hasLeg('armor_last_stand') && heroHp < activeMember.maxHp * 0.3) {
      totalDamage = Math.round(totalDamage * 1.4)
      addLog('絕境護甲：絕境爆發！傷害 ×1.4')
    }
    // armor_retaliate: 釋放蓄積反擊傷害
    if (hasLeg('armor_retaliate') && retaliateBonus > 0) {
      totalDamage += retaliateBonus
      addLog(`復仇護甲：釋放 +${retaliateBonus} 反擊！`)
      setRetaliateBonus(0)
    }
    // acc_momentum: 累積傷害加成
    if (hasLeg('acc_momentum') && momentumBonus > 0) {
      totalDamage += momentumBonus
      addLog(`衝勢護符：動力 +${momentumBonus}`)
    }
    // acc_combo_burst: 葫蘆/順子以上+35%傷害
    if (hasLeg('acc_combo_burst') && combo.rank >= 4) {
      totalDamage = Math.round(totalDamage * 1.35)
      addLog('爆發護符：葫蘆/順子爆發！傷害 +35%！')
    }
    // ring_executioner: 敵人HP<25%傷害×1.6
    if (hasLeg('ring_executioner') && enemyHp < enemy.hp * 0.25) {
      totalDamage = Math.round(totalDamage * 1.6)
      addLog('終結之戒：敵人瀕死，傷害 ×1.6！')
    }
    // ring_precision: 本回合不重骰直接出手+30%
    if (hasLeg('ring_precision') && turnRerolls === 0) {
      totalDamage = Math.round(totalDamage * 1.3)
      addLog('精準之環：精準一擊！傷害 +30%！')
    }
    // ring_echo: 每3回合傷害×1.5
    if (hasLeg('ring_echo') && battleTurn > 0 && battleTurn % 3 === 0) {
      totalDamage = Math.round(totalDamage * 1.5)
      addLog('迴響寶環：迴響共鳴！傷害 ×1.5！')
    }
    // ring_double_edge: 傷害×1.25
    if (hasLeg('ring_double_edge')) {
      totalDamage = Math.round(totalDamage * 1.25)
      addLog('雙刃之戒：傷害 ×1.25！')
    }
    // ring_blood_price: 永久堆疊傷害
    if (hasLeg('ring_blood_price') && bloodPriceStack > 0) {
      totalDamage += bloodPriceStack
      addLog(`血代之戒：血之力量 +${bloodPriceStack}`)
    }
    // armor_vengeance: 受擊堆疊永久攻擊
    if (hasLeg('armor_vengeance') && vengeanceStack > 0) {
      totalDamage += vengeanceStack
      addLog(`怒火護甲：憤怒之力 +${vengeanceStack}`)
    }
    // acc_pain_convert: 受擊後下次出手+15（出手後重置）
    if (hasLeg('acc_pain_convert') && painConvertBonus > 0) {
      totalDamage += painConvertBonus
      addLog(`痛苦轉化：蓄積爆發 +${painConvertBonus}！`)
      setPainConvertBonus(0)
    }
    // acc_trance: 連續出手3回合後第4回合×1.5
    if (hasLeg('acc_trance')) {
      if (tranceCount >= 3) {
        totalDamage = Math.round(totalDamage * 1.5)
        addLog('戰鬥冥想：入定爆發！傷害 ×1.5！')
        setTranceCount(0)
      } else {
        setTranceCount(c => c + 1)
      }
    }
    // acc_sacrifice: 每次攻擊傷害×1.3（HP代價在攻擊後扣除）
    if (hasLeg('acc_sacrifice')) {
      totalDamage = Math.round(totalDamage * 1.3)
      addLog('獻祭腰帶：以血為祭，傷害 ×1.3！')
    }

    // Talent: lowHpDamageMult
    if (talentBonus.lowHpDamageMult > 1 && heroHp < activeMember.maxHp * 0.3) {
      totalDamage = Math.round(totalDamage * talentBonus.lowHpDamageMult)
      addLog('天賦：低血量爆發！')
    }
    // 殺手本能（天賦）：敵人 HP 低於 N% 時追加 N% 處決傷害
    const execPas = talPFirst('shadow_execute')
    if (execPas) {
      const threshold = execPas.value / 100
      if (enemyHp < enemy.hp * threshold) {
        const execDmg = Math.round(totalDamage * execPas.value / 100)
        totalDamage += execDmg
        addLog(`殺手本能：敵人 HP 低於 ${execPas.value}%，處決追加 ${execDmg} 傷害`)
      }
    }

    // ── 武鬥家：真氣運轉（基礎技能，無Lv100覆蓋時）────────────────────────
    if (baseAct.isSkill && hero.role === 'fighter' && !talentBonus.skillOverrideId) {
      switch (lastChainType) {
        case 'attack': totalDamage += 20; addLog('真氣運轉：攻擊共鳴，追加 20 傷害！'); break
        case 'defend': applied.defend += 20; addLog('真氣運轉：防守共鳴，護盾 +20！'); break
        case 'heal':   totalHeal += 15; addLog('真氣運轉：調息共鳴，治療 +15！'); break
        case 'break':  applied.applyArmorBreak += 3; addLog('真氣運轉：破甲共鳴，破甲 +3！'); break
        default: addLog('真氣運轉：無連段共鳴'); break
      }
    }

    // ── Skill Overrides (Lv100 talent) ─────────────────────────────────
    const skillOvr = talentBonus.skillOverrideId
    if (baseAct.isSkill && skillOvr) {
      switch (skillOvr) {
        case 'slash_power':    totalDamage = Math.round(totalDamage * 2.5); applied.defend = 0; break
        case 'slash_fortress': totalDamage = 0; totalHeal += 25; applied.defend += 50; break
        case 'slash_combo':    totalDamage = Math.round(totalDamage * 1.3); break
        case 'fire_ignite':    totalDamage = 0; applied.applyBurn += 10; addLog('業火注入：施加 10 層燃燒！'); break
        case 'fire_furnace':   totalDamage = Math.round(totalDamage * 2.5); setRerollsLeft(r => Math.max(0, r - 1)); break
        case 'fire_easy':      totalDamage = Math.round(totalDamage * 0.7); break
        case 'holy_angel':     totalDamage = 0; totalHeal += 45; applied.applyBurn += 5; addLog('天使降臨！'); break
        case 'holy_judgment':  totalDamage = Math.round(totalDamage * 2); break  // ×0.5 heal deferred below
        case 'holy_resonance': break  // heal→damage conversion deferred below
        case 'shadow_burst':   totalDamage = Math.round(totalDamage * 2); applied.defend = 0; break
        case 'shadow_poison':  applied.applyPoison += 10; break
        case 'shadow_easy':    totalDamage = Math.round(totalDamage * 0.6); break
        case 'shadow_deadly_poison_blade': {
          const prePoisonStacks = enemyStatus.filter(s => s.type === 'poison').reduce((sum, s) => sum + s.stacks, 0)
          totalDamage = Math.round(totalDamage * 1.2)
          applied.applyPoison += 8
          addLog('致命毒刃：傷害 ×1.2，施加 8 層中毒')
          if (prePoisonStacks > 0) {
            const explodeDmg = prePoisonStacks * 3
            totalDamage += explodeDmg
            addLog(`致命毒刃：引爆中毒 ${prePoisonStacks} 層，追加 ${explodeDmg} 傷害！`)
          }
          break
        }
        case 'ice_permafrost': {
          totalDamage = Math.round(totalDamage * 0.8)  // 補償：×0.7 → ×0.8
          const pfStacks = Math.max(0, 2 - (isBoss ? 1 : 0) - freezeCount)
          if (enemyImmuneRef.current > 0 || pfStacks === 0) {
            // 免疫時：施加 2 層冰痕作補償
            iceMarkGain += 2
            addLog('永凍禁錮：凍結已免疫，施加 2 層冰痕！')
          } else {
            // 凍結成功：額外施加 1 層冰痕（補償）
            applied.applyFreeze = true
            iceMarkGain += 1
            addLog(`永凍禁錮：凍結 ${pfStacks} 回合，並施加 1 層冰痕！`)
          }
          break
        }
        case 'ice_cryo_burst': {
          const enemyBurn = enemyStatus.find(s => s.type === 'burn')?.stacks ?? 0
          if (enemyBurn > 0) {
            totalDamage += 35
            const convertStacks = Math.floor(enemyBurn / 2)
            if (convertStacks > 0) {
              iceMarkGain += convertStacks
              setEnemyStatus(s => s.map(x => x.type === 'burn' ? { ...x, stacks: Math.max(0, x.stacks - convertStacks) } : x).filter(x => x.stacks > 0))
              addLog(`冰火爆炸！+35 傷害，${convertStacks} 層燃燒轉為冰痕`)
            } else {
              addLog('冰火爆炸！+35 傷害')
            }
          }
          break
        }
        case 'ice_barrier': {
          applied.defend += 35
          setTauntReduce(t => Math.min(t + 0.3, 0.8))
          barrierActivatedRef.current = true
          addLog('絕對護衛：+35 護盾，本回合敵方攻擊 -30%！')
          break
        }
        case 'arrow_barrage':  break  // hitTimes handled below
        case 'arrow_snipe':    totalDamage = Math.round(totalDamage * 2.5); break
        case 'arrow_poison':   applied.applyBurn += 10; break
        case 'hammer_quake':   totalDamage = Math.round(totalDamage * 2.5); applied.defend += 30; break
        case 'hammer_crush':   totalDamage = Math.round(totalDamage * 2); break  // ignore def handled below
        case 'hammer_easy':    totalDamage = Math.round(totalDamage * 0.8); break
        case 'song_power':     totalDamage = Math.round(totalDamage * 1.5); totalHeal += 30; break
        case 'song_requiem':   totalDamage = 0; totalHeal = 50; addLog('安魂聖詠：回復 50 HP！'); break
        case 'song_inspire':   setBonusRerollTurns(2); setBonusRerollAmt(2); addLog('戰歌激勵：2 回合重骰 +2'); break
        case 'beast_fury':     setBeastBonus(b => b * 2); addLog('野性爆發：ATK 加成翻倍！'); break
        case 'beast_king':     totalDamage = Math.round(totalDamage * 2); applied.applyBurn += 5; break
        case 'beast_hold':     setMinDieBoost(5); addLog('共鳴之心：下回合骰子最低值升至 5'); break
        case 'gear_overdrive': setRerollsLeft(baseMaxRerolls); totalDamage = Math.round(totalDamage * 1.5); addLog('超頻運轉！'); break
        case 'gear_explosion': totalDamage = Math.round(totalDamage * 2.2); setRerollsLeft(0); addLog('機關大爆！'); break
        case 'gear_precision': setMinDieBoost(5); addLog('精密瞄準：下回合骰子最低值升至 5'); break
        case 'gear_precision_v2': setPrecisionV2Pending(true); addLog('⚙️ 精密瞄準：下回合最低 2 顆骰子 +2（上限 5）'); break
        case 'fighter_dragon': {
          const dragonDmg = fistPower * 12
          totalDamage += dragonDmg
          addLog(`龍霸滅世：消耗 ${fistPower} 層拳勢，+${dragonDmg} 傷害！`)
          setFistPower(0)
          break
        }
        case 'fighter_formless': {
          totalDamage += 12
          const formlessNewFp = Math.min(newFistPower + 1, 5)
          setFistPower(formlessNewFp)
          addLog('無形天罡：強制攻擊連段 +12 傷害，拳勢 +1！')
          if (formlessNewFp >= 5 && newNoDouble === 0) {
            const hasMunsouExtend = run.cards.some(c => c.id === 'fighter_munsou_extend')
            const munsouRounds = 2 + (hasMunsouExtend ? 1 : 0)
            newNoDouble = munsouRounds
            setNoDoubleLeft(munsouRounds)
            noDoubleLeftRef.current = munsouRounds
            setFighterOverdriveFlash(n => n + 1)
            addLog(`無雙架式！拳勢爆滿！${hasMunsouExtend ? '（無雙之魄：持續 3 回合）' : ''}`)
            if (hasLeg('fighter_weapon')) { setWeaponSkillBoostReady(true); addLog('龍皇拳套：下次奧義傷害 +30%！') }
          }
          break
        }
        case 'fighter_infinite': {
          const hasFSet4Inf = hasLeg('fighter_set4')
          const infDef  = hasFSet4Inf ? 12 : 8
          const infHeal = hasFSet4Inf ? 12 : 8
          totalDamage    += 12
          applied.defend += infDef
          totalHeal      += infHeal
          addLog(`武道無極：三重共鳴！+12傷/+${infDef}盾/+${infHeal}治！`)
          break
        }
      }
    }

    // 武鬥家武器：拳勢滿時下次奧義 +30%
    if (baseAct.isSkill && hero.role === 'fighter' && weaponSkillBoostReady) {
      totalDamage = Math.round(totalDamage * 1.3)
      setWeaponSkillBoostReady(false)
      addLog('龍皇拳套：拳勢爆滿蓄力，奧義傷害 +30%！')
    }

    // fire_easy: trigger skill at rank>=3
    if (skillOvr === 'fire_easy' && combo.rank >= 3 && !baseAct.isSkill) {
      baseAct.isSkill = true
    }
    // hammer_easy: trigger skill at rank>=2
    if (skillOvr === 'hammer_easy' && combo.rank >= 2 && !baseAct.isSkill) {
      baseAct.isSkill = true
    }
    // shadow_easy: always trigger skill
    if (skillOvr === 'shadow_easy') baseAct.isSkill = true

    // acc_vampire: after attack → +3 HP (handled in setTimeout below)

    // ── Build-defining legendary weapons (dice-rule effects, applied post-skill) ──
    let fireballBonusDmg = 0  // 連環火球／炎晶法核：額外火球傷害，攻擊結算時獨立顯示+小動畫
    // fire_burn_explosion → 連環隕星杖: 三條以上每超過一階追加小火球
    if (hasLeg('fire_burn_explosion') && combo.rank >= 3) {
      const balls = combo.rank - 2  // 三條1 / 葫蘆·順子2 / 四條3 / 五條4
      const ballDmg = balls * 10
      totalDamage += ballDmg
      fireballBonusDmg += ballDmg
      applied.applyBurn += balls * 2
      addLog(`連環火球 ×${balls}：+${ballDmg} 傷害、+${balls * 2} 燃燒`)
    }
    // fire_set4 → 焚天烈焰4件套: 攻擊時每層燃燒額外+2傷（上限40）
    if (hasLeg('fire_set4')) {
      const bStacks = enemyStatus.find(s => s.type === 'burn')?.stacks ?? 0
      if (bStacks > 0) {
        const burnBonus = Math.min(bStacks * 2, 40)
        totalDamage += burnBonus
        addLog(`焚天烈焰：燃燒爆發 +${burnBonus} 傷害`)
      }
    }
    // arrow_double_hit → 萬箭齊發弓: 每種不同點數各追加一箭
    if (hasLeg('arrow_double_hit')) {
      const distinct = new Set(dice).size
      totalDamage += distinct * 6
      addLog(`萬箭齊發：${distinct} 種點數 +${distinct * 6} 傷害`)
    }
    // 疾風遊俠2件套：順子傷害乘數
    if (eqBonus.straightDamageMult > 1 && combo.label === '順子') {
      totalDamage = Math.round(totalDamage * eqBonus.straightDamageMult)
      addLog(`疾風遊俠：順子傷害 ×${eqBonus.straightDamageMult}`)
    }
    // ice_freeze_aura → 凍結連鎖杖: 順子/四條以上施加冰痕；未凍結時凍結；已凍結時+24傷；Boss免疫時額外冰痕
    if (hasLeg('ice_freeze_aura') && combo.rank >= 4) {
      iceMarkGain += 1
      addLog('凍結連鎖杖：施加 1 層冰痕')
      const alreadyFrozen = enemyStatus.some(s => s.type === 'freeze')
      const freezeWouldStacks = Math.max(0, 2 - (isBoss ? 1 : 0) - freezeCount)
      const canFreeze = !alreadyFrozen && enemyImmuneRef.current === 0 && freezeWouldStacks > 0
      if (alreadyFrozen) {
        totalDamage += 24
        addLog('凍結連鎖杖：敵人已凍結，追加 24 冰晶傷害！')
      } else if (!canFreeze) {
        iceMarkGain += 1
        addLog('凍結連鎖杖：Boss 免疫凍結，額外施加 1 層冰痕！')
      } else {
        applied.applyFreeze = true
        addLog('凍結連鎖杖：凍結 1 回合！')
      }
    }
    // hammer_charge_crit → 碎甲戰錘: 三條以上破甲疊加(上限10) + 對破甲敵人增傷
    if (hasLeg('hammer_charge_crit')) {
      const ab = enemyStatus.find(s => s.type === 'armor_break')?.stacks ?? 0
      if (ab > 0) { totalDamage = Math.round(totalDamage * 1.25); addLog('碎甲：對破甲敵人 +25% 傷害') }
      if (combo.rank >= 3 && ab < 10) applied.applyArmorBreak += Math.min(5, 10 - ab)
    }
    // holy_heal_damage → 聖光迴響杖: 兩對以上治療 ×1.5，治療量 25% 轉為神聖傷害
    if (hasLeg('holy_heal_damage') && combo.rank >= 2 && totalHeal > 0) {
      totalHeal = Math.round(totalHeal * 1.5)
      addLog('聖光迴響：治療 ×1.5')
    }
    if (hasLeg('holy_heal_damage') && totalHeal > 0) {
      const holyDmg = Math.round(totalHeal * 0.25)
      if (holyDmg > 0) { totalDamage += holyDmg; addLog(`聖光迴響：+${holyDmg} 神聖傷害`) }
    }
    // slash_damage_shield → 聖盾嘲諷劍: 每顆 6 給護盾，≥2 顆 6 嘲諷減傷
    if (hasLeg('slash_damage_shield')) {
      const sc = dice.filter(d => d === 6).length
      if (sc > 0) { setGuardBonus(g => g + sc * 8); addLog(`聖盾嘲諷：+${sc * 8} 護盾`) }
      if (sc >= 2) { setTauntReduce(0.4); addLog('嘲諷！敵人本回合攻擊 −40%') }
    }
    // slash_set4 → 聖殿守護4件套: 有護盾時追加護盾值25%傷害
    if (hasLeg('slash_set4') && guardBonus > 0) {
      const shieldDmg = Math.round(guardBonus * 0.25)
      if (shieldDmg > 0) { totalDamage += shieldDmg; addLog(`聖殿守護：護盾轉傷 +${shieldDmg}`) }
    }
    // beast_atk_stack → 狼群號角: 連續同骰型召喚狼
    if (hasLeg('beast_atk_stack')) {
      if (lastCombo === combo.label) {
        totalDamage += 14 + eqBonus.wolfDmgBonus
        totalHeal += 8
        addLog(`狼群共鳴：召喚狼 +${14 + eqBonus.wolfDmgBonus} 傷害、回復 8 HP`)
      }
      setLastCombo(combo.label)
    }
    // beast_set4 → 荒野獸魂4件套: 兩對以上時，狼魂助攻傷害 +25%（隨本次傷害量縮放）+6HP
    if (hasLeg('beast_set4') && combo.rank >= 2) {
      const setDmg = Math.round(totalDamage * 0.25) + eqBonus.wolfDmgBonus
      totalDamage += setDmg
      totalHeal += 6
      addLog(`荒野獸魂：狼魂助攻 +${setDmg} 傷害（+25%）、回復 6 HP`)
    }
    // gear_reroll_charge → 過載機關炮 (舊版，向下相容)
    if (rerollCharge > 0) {
      const pairCount = Object.values(
        dice.reduce<Record<number, number>>((a, v) => { a[v] = (a[v] ?? 0) + 1; return a }, {})
      ).filter(c => c >= 2).length
      const chargeDmg = Math.min(Math.round(rerollCharge * (1 + pairCount * 0.5)), 60)
      totalDamage += chargeDmg
      addLog(`過載炮擊：+${chargeDmg} 充能傷害${pairCount > 0 ? `（${pairCount} 對強化）` : ''}`)
      setRerollCharge(0)
    }
    // gear_overheat_cannon → 過載機關炮 (新版): 過熱層數炮擊
    if (hasLeg('gear_overheat_cannon') && overheatStacks > 0) {
      const heatDmg = overheatStacks * 6
      totalDamage += heatDmg
      addLog(`⚙️ 炮擊：過熱 ${overheatStacks} 層 +${heatDmg} 傷害`)
      if (overheatStacks >= 5) {
        totalDamage += 30
        gearExplosionDmg = 30
        addLog('💥 爆裂炮：過熱臨界！追加 30 爆裂傷害！')
      }
      // 計算攻擊後懲罰
      let heatPenalty = 0
      if (overheatStacks >= 3) heatPenalty += 1
      if (overheatStacks >= 5) heatPenalty += 1
      const hasHeatCtrl = !!talPFirst('gear_heat_control')
      if (hasHeatCtrl) heatPenalty = Math.max(0, heatPenalty - 1)
      overheatPenaltyRef.current = heatPenalty
      if (overheatStacks >= 5) cannonDisabledNextRef.current = true
      // 熱能校準：過熱 3+ 層獲得 10 護盾
      if (overheatStacks >= 3 && hasHeatCtrl) {
        setGuardBonus(g => g + 10)
        addLog('⚙️ 熱能校準：過熱 3+ 層，獲得 10 護盾')
      }
      // 永動圖紙：攻擊後過熱 3+ 層獲得 12 護盾
      if (overheatStacks >= 3 && talPFirst('gear_blueprint_cooling')) {
        setGuardBonus(g => g + 12)
        addLog('⚙️ 永動圖紙：攻擊後過熱 3+ 層，獲得 12 護盾')
      }
      // 散熱反噬：過熱 3+ 層出手後自傷
      if (overheatStacks >= 3) {
        const selfDmg = overheatStacks >= 5 ? 15 : 6
        setHeroHp(hp => Math.max(0, hp - selfDmg))
        addLog(`🔥 散熱反噬：過熱 ${overheatStacks} 層，自傷 ${selfDmg} HP`)
      }
      // 過熱衰減：攻擊後 -2 層
      setOverheatStacks(s => Math.max(0, s - 2))
    }

    // ── Class-specific relic effects ─────────────────────────────────────────
    // 聖盾徽章: rank≥3 → +14護盾；rank=6 → 嘲諷
    if (hasRelic(run.relics, 'shield_badge') && combo.rank >= 3) {
      const shieldBadgeEffect = getOwnedRelicEffect(run.relics, run.relicLevels, 'shield_badge')
      const sbShield = shieldBadgeEffect?.shieldBadgeShield ?? 14
      const sbTauntPct = shieldBadgeEffect?.shieldBadgeTauntPct ?? 50
      setGuardBonus(g => g + sbShield)
      addLog(`聖盾徽章：+${sbShield} 護盾`)
      if (combo.rank === 6) { setTauntReduce(sbTauntPct / 100); addLog(`聖盾徽章：嘲諷！敵人攻擊 −${sbTauntPct}%`) }
    }
    // 炎晶法核: 順子 → 追加火球
    if (hasRelic(run.relics, 'fire_crystal') && combo.label === '順子') {
      const fireCrystalEffect = getOwnedRelicEffect(run.relics, run.relicLevels, 'fire_crystal')
      const fcDmg = fireCrystalEffect?.fireCrystalDmg ?? 14
      const fcBurn = fireCrystalEffect?.fireCrystalBurn ?? 3
      totalDamage += fcDmg; applied.applyBurn += fcBurn; fireballBonusDmg += fcDmg
      addLog(`炎晶法核：火球 +${fcDmg} 傷害、+${fcBurn} 燃燒`)
    }
    // 灼熱魔典: 施加燃燒時額外+N層（在 applyBurn 已計算後再加）
    if (hasRelic(run.relics, 'burn_codex') && applied.applyBurn > 0) {
      const burnCodexExtra = getOwnedRelicEffect(run.relics, run.relicLevels, 'burn_codex')?.burnCodexExtraBurn ?? 1
      applied.applyBurn += burnCodexExtra
      addLog(`灼熱魔典：燃燒 +${burnCodexExtra} 層`)
    }
    // 復甦羽冠: HP < 30% → 治療 +N%（每場最多 N 次）
    if (hasRelic(run.relics, 'revival_crown') && totalHeal > 0 && heroHp < activeMember.maxHp * 0.3 && revivalCrownUses < (getOwnedRelicEffect(run.relics, run.relicLevels, 'revival_crown')?.revivalCrownMaxUses ?? 2)) {
      const revivalCrownEffect = getOwnedRelicEffect(run.relics, run.relicLevels, 'revival_crown')
      const rcMult = revivalCrownEffect?.revivalCrownHealMult ?? 1.5
      const rcMaxUses = revivalCrownEffect?.revivalCrownMaxUses ?? 2
      totalHeal = Math.round(totalHeal * rcMult)
      setRevivalCrownUses(u => u + 1)
      addLog(`復甦羽冠：低血量治療 +${Math.round((rcMult - 1) * 100)}%（${revivalCrownUses + 1}/${rcMaxUses} 次）`)
    }
    // 鷹眼護符: 順子 → 傷害 ×N 暴擊
    if (hasRelic(run.relics, 'hawk_charm') && combo.label === '順子') {
      const hawkMult = getOwnedRelicEffect(run.relics, run.relicLevels, 'hawk_charm')?.hawkCharmCritMult ?? 1.6
      totalDamage = Math.round(totalDamage * hawkMult)
      addLog(`鷹眼護符：順子暴擊！傷害 ×${hawkMult}`)
    }
    // 散形箭袋: 散骰 → 獲得 N 護盾
    if (hasRelic(run.relics, 'scatter_quiver') && combo.label === '散骰') {
      const sqShield = getOwnedRelicEffect(run.relics, run.relicLevels, 'scatter_quiver')?.scatterQuiverShield ?? 10
      applied.defend += sqShield
      addLog(`散形箭袋：散骰！護盾 +${sqShield}`)
    }
    // 破甲鐵錘: 三條以上敵人破甲 -N
    if (hasRelic(run.relics, 'armor_hammer') && combo.rank >= 3) {
      const ahBreak = getOwnedRelicEffect(run.relics, run.relicLevels, 'armor_hammer')?.armorHammerBreak ?? 3
      applied.applyArmorBreak += ahBreak
      addLog(`破甲鐵錘：破甲 −${ahBreak}`)
    }
    // 冰晶碎片: 凍結時額外 +N 傷害
    if (hasRelic(run.relics, 'frost_shard') && applied.applyFreeze) {
      const fsDmg = getOwnedRelicEffect(run.relics, run.relicLevels, 'frost_shard')?.frostShardDmg ?? 16
      totalDamage += fsDmg
      addLog(`冰晶碎片：凍結強化 +${fsDmg} 傷害`)
    }
    // 古老魯特琴: 每回合首次兩對以上 → 傷害 +N%
    if (hasRelic(run.relics, 'ancient_lute') && combo.rank >= 2 && !songBonusUsed) {
      const aluteDmgPct = getOwnedRelicEffect(run.relics, run.relicLevels, 'ancient_lute')?.ancientLuteDmgPct ?? 20
      totalDamage = Math.round(totalDamage * (1 + aluteDmgPct / 100))
      setSongBonusUsed(true)
      addLog(`古老魯特琴：首次連擊 +${aluteDmgPct}% 傷害`)
    }
    // 蒸氣核心: 攻擊時釋放充能傷害
    if (hasRelic(run.relics, 'steam_core') && steamCharges > 0) {
      const steamPerCharge = getOwnedRelicEffect(run.relics, run.relicLevels, 'steam_core')?.steamCoreDmgPerCharge ?? 10
      const steamDmg = steamCharges * steamPerCharge
      totalDamage += steamDmg
      addLog(`蒸氣核心：釋放 ${steamCharges} 層充能 +${steamDmg} 傷害`)
      setSteamCharges(0)
    }
    // shadow_first_strike → 雙影連襲刃: 首次兩對以上追加暗影傷害（45% / 中毒破甲 70%，暗影印記加成）
    let hitTimes = 1
    let shadowMarksConsumedByLeg = false
    if (hasLeg('shadow_first_strike') && combo.rank >= 2 && !shadowFirstStrikeUsed) {
      const isDebuffed = enemyStatus.some(s => s.type === 'poison' || s.type === 'armor_break')
      const pct = isDebuffed ? 70 : 45
      const markMult = 1 + shadowMarkStacks * 0.1
      const shadowDmg = Math.round(totalDamage * pct / 100 * markMult)
      totalDamage += shadowDmg
      const markStr = shadowMarkStacks > 0 ? `（印記 ×${markMult.toFixed(1)}）` : ''
      const debuffStr = isDebuffed ? '目標有中毒/破甲，追加提升至 70%。' : ''
      addLog(`雙影連襲：追加 ${pct}% 暗影傷害 +${shadowDmg}${markStr}${debuffStr ? ' ' + debuffStr : ''}`)
      // 影刃爆印：傳奇消耗印記時額外傷害
      const markBurstDmgLeg = leveledCards.reduce((s, c) => s + (c.effect.shadowMarkBurstDmg ?? 0), 0)
      if (markBurstDmgLeg > 0 && shadowMarkStacks > 0) {
        totalDamage += markBurstDmgLeg * shadowMarkStacks
        addLog(`影刃爆印：+${markBurstDmgLeg * shadowMarkStacks} 傷害`)
        setShadowMarkStacks(1)
        shadowMarksConsumedByLeg = true
      } else if (shadowMarkStacks > 0) {
        setShadowMarkStacks(0)
      }
      setShadowFirstStrikeUsed(true)
    }
    // 影刃爆印：無傳奇時，攻擊獨立消耗印記
    const markBurstDmgCard = leveledCards.reduce((s, c) => s + (c.effect.shadowMarkBurstDmg ?? 0), 0)
    if (markBurstDmgCard > 0 && shadowMarkStacks > 0 && !shadowMarksConsumedByLeg) {
      totalDamage += markBurstDmgCard * shadowMarkStacks
      addLog(`影刃爆印：消耗 ${shadowMarkStacks} 層印記，+${markBurstDmgCard * shadowMarkStacks} 傷害（保留 1 層）`)
      setShadowMarkStacks(1)
    }
    // 夜行者斗篷: 兩對以上，N% 機率追加一次攻擊
    if (hasRelic(run.relics, 'night_cloak') && combo.rank >= 2) {
      const ncProcPct = getOwnedRelicEffect(run.relics, run.relicLevels, 'night_cloak')?.nightCloakProcPct ?? 50
      if (Math.random() < ncProcPct / 100) {
        hitTimes += 1
        addLog('夜行者斗篷：暗影出擊！追加一次攻擊')
      }
    }
    // arrow_scatter_free_attack → 疾風遊俠4件套: 順子傷害 +50%，散骰傷害 ×1.6
    if (hasLeg('arrow_scatter_free_attack')) {
      if (combo.label === '順子') {
        totalDamage = Math.round(totalDamage * 1.5)
        addLog('疾風遊俠：順子！傷害 +50%')
      } else if (new Set(dice).size === 5) {
        totalDamage = Math.round(totalDamage * 1.6)
        addLog('疾風遊俠：散骰！傷害 ×1.6')
      }
    }
    if (skillOvr === 'arrow_barrage' && baseAct.isSkill) {
      hitTimes = 2
      totalDamage = Math.round(totalDamage * 0.7)
      addLog('連環箭雨：雙重攻擊 ×0.7！')
    }

    // hammer_crush: ignore enemy.def
    const ignoreEnemyDef = skillOvr === 'hammer_crush' && baseAct.isSkill

    const goldOnSix = getRelicGoldOnSix(run.relics, run.relicLevels)
    const burnOnSix = getRelicBurnOnSix(run.relics, run.relicLevels)
    const sixCount  = dice.filter(d => d === 6).length
    if (goldOnSix > 0 && sixCount > 0) {
      relicGoldRef.current += goldOnSix * sixCount
      addLog(`黃金骰：額外 ${goldOnSix * sixCount} 金幣！`)
    }
    // Talent: six_dmg_stack (arrow awakening)
    talP('six_dmg_stack').forEach(p => {
      if (sixCount > 0) setSixDmgStack(s => s + p.value * sixCount)
    })
    // Talent: unique_atk_stack (arrow awakening 散矢傳說) — accumulates each consecutive 5-unique attack
    talP('unique_atk_stack').forEach(p => {
      if (new Set(dice).size === 5) {
        const newStack = uniqueAtkStack + p.value
        setUniqueAtkStack(newStack)
        addLog(`散矢傳說：5種點數！累積加成 +${newStack}（下次攻擊生效）`)
      } else {
        if (uniqueAtkStack > 0) addLog(`散矢傳說：鏈斷！+${uniqueAtkStack} 加成已歸零`)
        setUniqueAtkStack(0)
      }
    })
    // 煉獄長弓：魔焰 3+ 時追加燃燒箭（+2 燃燒）
    if (isBurningThrone && hasLeg('inferno_longbow') && infernalFlame >= 3) applied.applyBurn += 2
    // 沉沒法杖：攻擊施加 3 層中毒
    if (isBlackTide && hasLeg('drowned_staff')) applied.applyPoison += 3
    // 火矢淬燒：5 種不同點數時附加燃燒
    const fullUniqueBurnCard = leveledCards.reduce((s, c) => s + (c.effect.fullUniqueBurnBonus ?? 0), 0)
    if (fullUniqueBurnCard > 0 && new Set(dice).size === 5) {
      applied.applyBurn += fullUniqueBurnCard
      addLog(`火矢淬燒：5 種點數，附加 ${fullUniqueBurnCard} 層燃燒`)
    }
    const totalBurn   = applied.applyBurn + eqBurn + talentBurn + burnOnSix * sixCount
    const totalPoison = applied.applyPoison + eqPoison

    // ── 冰霜女巫：寒意 3+ 層傷害 -10% ────────────────────────────────────
    if (isWitch && witchChill >= 3) {
      totalDamage = Math.round(totalDamage * 0.9)
      addLog(`❄️ 寒意 ${witchChill} 層：本回合傷害 -10%`)
    }
    // ── 傳奇難度踩禁忌 debuff：下回合傷害 -10% ───────────────────────────
    if (forbiddenDmgDebuff > 0) {
      totalDamage = Math.round(totalDamage * (1 - forbiddenDmgDebuff))
      addLog(`傳奇懲罰：本回合傷害 -${Math.round(forbiddenDmgDebuff * 100)}%`)
      setForbiddenDmgDebuff(0)
    }
    // ── 代價型卡牌：禁忌重骰 + 血色骰 蓄積傷害 ────────────────────────────
    if (tabooRerollAcc > 0 || bloodDiceAcc > 0) {
      const rerollPct = tabooRerollAcc + bloodDiceAcc
      totalDamage = Math.round(totalDamage * (1 + rerollPct / 100))
      const parts: string[] = []
      if (tabooRerollAcc > 0) parts.push(`禁忌 +${tabooRerollAcc}%`)
      if (bloodDiceAcc > 0) parts.push(`血色骰 +${bloodDiceAcc}%`)
      addLog(`重骰蓄力：${parts.join('・')}`)
    }
    // ── 詛咒親和 card: per-curse +6% dmg (max +30%) ──────────────────────
    const cardCurseDmgPct = leveledCards.reduce((s, c) => s + (c.effect.curseDmgPct ?? 0), 0)
    if (cardCurseDmgPct > 0 && run.curses.length > 0) {
      const pct = Math.min(cardCurseDmgPct * run.curses.length, cardCurseDmgPct * 5)
      totalDamage = Math.round(totalDamage * (1 + pct / 100))
      addLog(`詛咒親和：${run.curses.length} 個詛咒 +${pct}% 傷害`)
    }
    // ── 詛咒王冠 relic: per-curse +12% dmg ───────────────────────────────
    if (hasRelic(run.relics, 'curse_crown') && run.curses.length > 0) {
      const pct = run.curses.length * (getOwnedRelicEffect(run.relics, run.relicLevels, 'curse_crown')?.curseDmgPct ?? 12)
      totalDamage = Math.round(totalDamage * (1 + pct / 100))
      addLog(`詛咒王冠：${run.curses.length} 個詛咒 +${pct}% 傷害`)
    }
    // ── 惡魔契約 relic: +35% dmg ─────────────────────────────────────────
    if (hasRelic(run.relics, 'demon_contract')) {
      const pct = getOwnedRelicEffect(run.relics, run.relicLevels, 'demon_contract')?.demonDmgPct ?? 35
      totalDamage = Math.round(totalDamage * (1 + pct / 100))
      addLog(`惡魔契約：+${pct}% 傷害`)
    }
    // ── 破碎信仰 card: skill shield gain ×mult ───────────────────────────
    const cardShieldGainMult = leveledCards.reduce((s, c) => s * (c.effect.shieldGainMult ?? 1), 1)
    const relicShieldGainMult = hasRelic(run.relics, 'shattered_grail')
      ? (getOwnedRelicEffect(run.relics, run.relicLevels, 'shattered_grail')?.shieldGainMult ?? 1)
      : 1
    const totalShieldGainMult = cardShieldGainMult * relicShieldGainMult
    if (totalShieldGainMult > 1 && applied.defend > 0) {
      applied.defend = Math.round(applied.defend * totalShieldGainMult)
      addLog(`護盾強化：防禦技能 ×${totalShieldGainMult.toFixed(1)}`)
    }
    // ── 治療懲罰（腐蝕詛咒 + 代價型卡/遺物）────────────────────────────
    const curseHealPenPct = run.curses.reduce((s, id) => s + (getCurseById(id)?.effect.healPenaltyPct ?? 0), 0)
    const cardHealPenPct  = leveledCards.reduce((s, c) => s + (c.effect.cardHealPenaltyPct ?? 0), 0)
    const curseCrownPenPct = hasRelic(run.relics, 'curse_crown')
      ? run.curses.length * (getOwnedRelicEffect(run.relics, run.relicLevels, 'curse_crown')?.curseHealPenaltyPct ?? 0)
      : 0
    const relicHealMultiplier = hasRelic(run.relics, 'shattered_grail')
      ? (getOwnedRelicEffect(run.relics, run.relicLevels, 'shattered_grail')?.relicHealMult ?? 0.5)
      : 1
    const ashEventHealMult = (isAshCovenant && covenantEventBuff?.heroHealMult) ? covenantEventBuff.heroHealMult : 1.0
    const backlashHealMult = (isBurningThrone && backlashHealPenaltyTurns > 0) ? 0.8 : 1.0
    const totalHealPenPct = Math.min(95, curseHealPenPct + cardHealPenPct + curseCrownPenPct)
    if (totalHeal > 0 && (totalHealPenPct > 0 || relicHealMultiplier < 1 || ashEventHealMult < 1 || backlashHealMult < 1)) {
      const before = totalHeal
      if (totalHealPenPct > 0) totalHeal = Math.round(totalHeal * (1 - totalHealPenPct / 100))
      if (relicHealMultiplier < 1) totalHeal = Math.round(totalHeal * relicHealMultiplier)
      if (ashEventHealMult < 1) { totalHeal = Math.round(totalHeal * ashEventHealMult); addLog(`🔱 怨念低語：治療 ×${ashEventHealMult}`) }
      if (backlashHealMult < 1) totalHeal = Math.round(totalHeal * backlashHealMult)
      if (before !== totalHeal) {
        const parts: string[] = []
        if (curseHealPenPct > 0) parts.push(`腐蝕 -${curseHealPenPct}%`)
        if (cardHealPenPct > 0)  parts.push(`代價卡 -${cardHealPenPct}%`)
        if (curseCrownPenPct > 0) parts.push(`詛咒王冠 -${curseCrownPenPct}%`)
        if (relicHealMultiplier < 1) parts.push(`聖杯 ×${relicHealMultiplier}`)
        if (backlashHealMult < 1) parts.push('灰燼肺 ×0.8')
        addLog(`治療衰減：${parts.join('・')}（${before}→${totalHeal}）`)
      }
    }

    // ── Star ability passives ──────────────────────────────────────────────

    // 【聖騎士 2★ 聖盾守護者】三條以上獲得護盾
    talP('shield_on_combo').forEach(p => {
      if (combo.rank >= (p.value2 ?? 3)) {
        setGuardBonus(g => g + p.value)
        addLog(`聖盾守護者：${combo.label}，獲得 ${p.value} 護盾`)
      }
    })
    // 【聖騎士 3★ 天啟聖騎士】護盾值 × 12% 轉為傷害
    talP('shield_to_dmg').forEach(p => {
      const sd = Math.round(guardBonus * p.value / 100)
      if (sd > 0) { totalDamage += sd; addLog(`天啟聖騎士：護盾 ${guardBonus} → +${sd} 傷害`) }
    })
    // 【聖騎士天賦 盾裂神罰】護盾值 × 15% 轉為傷害
    talP('shield_to_dmg_talent').forEach(p => {
      const sd = Math.round(guardBonus * p.value / 100)
      if (sd > 0) { totalDamage += sd; addLog(`盾裂神罰：護盾 ${guardBonus} → +${sd} 傷害`) }
    })
    // 【火焰法師 2★ 赤炎咒導師】順子以上追加燃燒
    talP('burn_on_high_combo').forEach(p => {
      if (combo.rank >= (p.value2 ?? 4)) applied.applyBurn += p.value
    })
    // 【火焰法師 3★ 紅蓮大賢者】燃燒 ≥10 引爆，每回合一次
    if (!burnExplosionUsed) {
      const expPas = talPFirst('burn_explosion')
      if (expPas) {
        const curBurn = enemyStatus.find(s => s.type === 'burn')?.stacks ?? 0
        if (curBurn >= 10) {
          const explodeDmg = Math.round(curBurn * expPas.value / 100)
          totalDamage += explodeDmg
          burnConsumed += explodeDmg
          setBurnExplosionUsed(true)
          addLog(`紅蓮大賢者：${curBurn} 層燃燒引爆！+${explodeDmg} 傷害（消耗 ${explodeDmg} 層）`)
        }
      }
    }
    // 【神官 1★ 聖光修士】治療量 +12%
    talP('heal_pct_bonus').forEach(p => {
      if (totalHeal > 0) totalHeal = Math.round(totalHeal * (1 + p.value / 100))
    })
    // 【神官 2★ 曙光祭司】第一顆 6 額外治療 4，每回合一次
    if (!sixHealUsed) {
      const sixHlPas = talPFirst('six_heal')
      if (sixHlPas && dice.some(d => d === 6)) {
        totalHeal += sixHlPas.value
        setSixHealUsed(true)
        addLog(`曙光祭司：骰出 6，額外治療 +${sixHlPas.value}`)
      }
    }
    // 【神官 3★ 神諭大主教】溢出治療 35% 轉護盾，上限 20
    talP('overflow_shield').forEach(p => {
      const overflow = Math.max(0, heroHp + totalHeal - activeMember.maxHp)
      if (overflow > 0) {
        const sg = Math.min(Math.round(overflow * p.value / 100), p.value2 ?? 20)
        if (sg > 0) { setGuardBonus(g => g + sg); addLog(`神諭大主教：${overflow} 溢出治療 → +${sg} 護盾`) }
      }
    })
    // 【影刃刺客 2★ 夜刃執行者】擊敗敵人後必定追擊（每回合最多一次）
    const chainExecPas = talPFirst('shadow_chain_execute')
    const enhPas = talPFirst('enhanced_proc_debuff')
    if (chainExecPas && shadowChainExecuteReady && !shadowChainExecuteUsedThisTurn) {
      const xd = Math.round(totalDamage * 45 / 100)
      totalDamage += xd
      addLog(`夜刃執行者：執行追擊 +${xd} 暗影傷害！`)
      setShadowChainExecuteReady(false)
      setShadowChainExecuteUsedThisTurn(true)
    } else if (enhPas && !shadowChainExecuteUsedThisTurn) {
      // 【3★ 血月影王】敵人有中毒/破甲時 30% 機率觸發追擊
      const isDebuffed = enemyStatus.some(s => s.type === 'poison' || s.type === 'armor_break')
      if (isDebuffed && Math.random() < enhPas.value / 100) {
        const xd = Math.round(totalDamage * 45 / 100)
        totalDamage += xd
        addLog(`血月影王：追擊中毒/破甲目標 +${xd} 暗影傷害！`)
        setShadowChainExecuteUsedThisTurn(true)
      }
    }
    // 【影刃身法天賦】重骰後達兩對以上，本回合末獲得 1 層暗影印記（下次追擊傷害 +10%/層）
    const evasionMarkPas = talPFirst('shadow_evasion_mark')
    if (evasionMarkPas && turnRerolls > 0 && combo.rank >= 2 && !shadowMarkGainedThisTurn) {
      setShadowMarkStacks(m => Math.min(m + evasionMarkPas.value, 3))
      setShadowMarkGainedThisTurn(true)
      addLog(`影刃身法：獲得暗影印記（下次追擊 +10%）`)
    }
    // 【皇家公主 1★ 霜晶公主】順子以上削弱敵方下回合攻擊；有冰痕時 +8 護盾
    talP('taunt_on_combo').forEach(p => {
      if (combo.rank >= (p.value2 ?? 4)) {
        setTauntReduce(Math.min(tauntReduce + p.value / 100, 0.8))
        addLog(`霜晶公主：下回合敵方攻擊 -${p.value}%`)
        if (iceMark > 0) {
          setGuardBonus(g => g + 8)
          addLog('霜晶公主：敵人有冰痕，額外獲得 8 護盾！')
        }
      }
    })
    // 【皇家公主 2★ 冰冠女爵】順子以上必定施加 1 層冰痕 + 30% 機率凍結
    talP('proc_freeze').forEach(p => {
      if (combo.rank >= (p.value2 ?? 4)) {
        iceMarkGain += 1
        addLog(`��冠女爵：${combo.label}，施加 1 層冰痕！`)
        if (!applied.applyFreeze && Math.random() < p.value / 100) {
          applied.applyFreeze = true
          addLog('冰冠女爵：觸發凍結！')
        }
      }
    })
    // 【皇家公主天賦 Lv40a 冰晶精通】rank≥3 時有 N% 機率凍結（無冰痕增加）
    talP('proc_freeze_chance').forEach(p => {
      if (combo.rank >= (p.value2 ?? 3)) {
        if (!applied.applyFreeze && Math.random() < p.value / 100) {
          applied.applyFreeze = true
          addLog('冰晶精通：觸發凍結！')
        }
      }
    })
    // 【皇家公主 3★ 凜冬女王】攻擊凍結敵人 +13% 傷害，不解除凍結（每回合一次）
    const freezeBurstPas = talPFirst('freeze_burst')
    if (freezeBurstPas && !freezeBurstUsed && enemyStatus.some(s => s.type === 'freeze')) {
      const fb = Math.round(totalDamage * freezeBurstPas.value / 100)
      totalDamage += fb
      setFreezeBurstUsed(true)
      addLog(`凜冬女王：對凍結敵人 +${fb} 傷害`)
    }
    // 【遊俠 1★ 森林斥候】每種不同點數 +2 傷害
    talP('unique_dice_dmg').forEach(p => {
      const dist = new Set(dice).size
      if (dist > 0) { totalDamage += dist * p.value; addLog(`森林斥候：${dist} 種點數 +${dist * p.value} 傷害`) }
    })
    // 【遊俠 2★ 鷹眼獵手】全不同點數追加 35% 傷害
    talP('full_unique_bonus').forEach(p => {
      if (new Set(dice).size === 5) {
        const xd = Math.round(totalDamage * p.value / 100)
        totalDamage += xd
        addLog(`鷹眼獵手：全不同點數！+${xd} 傷害`)
      }
    })
    // 【遊俠 3★ 風行者】未重骰 +18%；同時全不同再 +8%
    talP('no_reroll_bonus').forEach(p => {
      if (turnRerolls === 0) {
        totalDamage = Math.round(totalDamage * (1 + p.value / 100))
        addLog(`風行者：未重骰 +${p.value}% 傷害`)
        if (p.value2 && new Set(dice).size === 5) {
          const xd = Math.round(totalDamage * p.value2 / 100)
          totalDamage += xd
          addLog(`風行者：全不同加成 +${xd} 傷害`)
        }
      }
    })
    // 【遊俠天賦 蓄力之眼】未重骰 +20%
    talP('no_reroll_talent').forEach(p => {
      if (turnRerolls === 0) {
        totalDamage = Math.round(totalDamage * (1 + p.value / 100))
        addLog(`蓄力之眼：未重骰 +${p.value}% 傷害`)
      }
    })
    // 【矮人戰士天賦 震地破甲/鐵拳碎甲】每次攻擊破甲（無條件）
    talP('armor_break_on_attack').forEach(p => {
      applied.applyArmorBreak += p.value
    })
    // 【矮人戰士 1★ 鐵拳礦衛】三條以上破甲 2
    talP('armor_break_on_combo').forEach(p => {
      if (combo.rank >= (p.value2 ?? 3)) applied.applyArmorBreak += p.value
    })
    // 【矮人戰士 2★ 鍛魂戰錘】造成破甲時獲得護盾
    if (applied.applyArmorBreak > 0) {
      talP('shield_on_armor_break').forEach(p => {
        setGuardBonus(g => g + p.value)
        addLog(`鍛魂戰錘：破甲獲得 ${p.value} 護盾`)
      })
    }
    // 【矮人戰士 3★ 山王破城者】對有破甲的敵人 +15% 傷害
    const curArmorBreakStacks = enemyStatus.find(s => s.type === 'armor_break')?.stacks ?? 0
    talP('armor_break_dmg_bonus').forEach(p => {
      if (curArmorBreakStacks > 0) {
        totalDamage = Math.round(totalDamage * (1 + p.value / 100))
        addLog(`山王破城者：敵人有破甲，傷害 +${p.value}%`)
      }
    })
    // 【吟遊詩人 1★ 流浪樂者】兩對以上治療 +4
    talP('ranked_heal').forEach(p => {
      if (combo.rank >= (p.value2 ?? 2)) totalHeal += p.value
    })

    // ── 神官 Lv100 技能：延遲套用（所有治療加值計算完畢後） ─────────────────
    if (baseAct.isSkill) {
      if (skillOvr === 'holy_resonance' && totalHeal > 0) {
        totalDamage += totalHeal
        totalHeal = 0
        addLog('神聖共鳴：全量治療轉傷害！')
      }
      if (skillOvr === 'holy_judgment' && totalHeal > 0) {
        totalHeal = Math.round(totalHeal * 0.5)
      }
    }

    // 【吟遊詩人 3★ 傳世歌聖】連續兩回合高骰型 +22% 傷害
    const ccbPas = talPFirst('consecutive_combo_bonus')
    if (ccbPas && combo.rank >= (ccbPas.value2 ?? 2) && lastComboRank >= (ccbPas.value2 ?? 2)) {
      const xd = Math.round(totalDamage * ccbPas.value / 100)
      totalDamage += xd
      addLog(`傳世歌聖：連續高骰型！+${xd} 傷害`)
    }
    // 【獸語馴獸師 1★+2★+3★ 狼系召喚】＋裸裝基礎機率（不需升星也有狼伴隨）
    {
      const wolfBas = talPFirst('wolf_summon')
      const wolfCbo = talPFirst('wolf_summon_on_combo')
      if (hero.role === 'beast' || wolfBas || wolfCbo) {
        let summon = false
        let baseWolfDmg = 6
        if (wolfCbo && combo.rank >= (wolfCbo.value2 ?? 3)) summon = true
        else if (wolfBas && Math.random() < (wolfBas.value2 ?? 25) / 100) summon = true
        else if (!wolfBas && !wolfCbo && hero.role === 'beast' && Math.random() < 0.10) { summon = true; baseWolfDmg = 6 }
        if (summon) {
          const wd = wolfBas?.value ?? wolfCbo?.value ?? baseWolfDmg
          const wolfAtkPctCard = leveledCards.reduce((s, c) => s + (c.effect.wolfDmgPerAtkStack ?? 0), 0)
          const wolfAtkTiers = wolfAtkPctCard > 0 ? Math.min(Math.floor(attackAtkStack / 5), 3) : 0
          const wdBoosted = wolfAtkTiers > 0 ? Math.round(wd * (1 + wolfAtkPctCard * wolfAtkTiers / 100)) : wd
          const nc = wolfSummonCount + 1
          setWolfSummonCount(nc)
          const isSuper = !!talPFirst('wolf_super_strike') && nc % 3 === 0
          const fd = (isSuper ? Math.round(wdBoosted * 1.8) : wdBoosted) + eqBonus.wolfDmgBonus
          setEnemyHp(h => Math.max(0, h - fd))
          addLog(isSuper
            ? `🐺 萬獸君王：第 ${nc} 次，強化狼攻擊 ${fd} 傷害！`
            : (wolfBas || wolfCbo) ? `🐺 狼語使徒：召喚狼攻擊 ${fd} 傷害` : `🐺 獸魂感應：召喚狼攻擊 ${fd} 傷害`)
          // 獸語：野性庇護 — 狼攻擊時回復 N HP
          if (eqBonus.beastWildHeal > 0) { totalHeal += eqBonus.beastWildHeal; addLog(`野性庇護：狼後回復 ${eqBonus.beastWildHeal} HP`) }
          // 獸語：狼群呼應 — 召喚狼後下次攻擊 +N
          if (eqBonus.beastWolfEcho > 0) { setBeastWolfEchoBonus(b => b + eqBonus.beastWolfEcho); addLog(`狼群呼應：下次攻擊 +${eqBonus.beastWolfEcho}`) }
        }
      }
    }
    // 【機關技師 1★+2★+3★ 齒輪蓄能系統】
    {
      const scBase = talPFirst('star_reroll_charge')
      if (scBase && starChargeStacks > 0) {
        const dpg = talPFirst('star_reroll_charge_max')?.value ?? scBase.value
        const cdmg = starChargeStacks * dpg
        totalDamage += cdmg
        addLog(`⚙️ 齒輪蓄能：${starChargeStacks} 層 +${cdmg} 傷害`)
        const canPas = talPFirst('star_overclock_cannon')
        if (!starCannonUsed && canPas) {
          const maxChg = talPFirst('star_reroll_charge_max')?.value2 ?? scBase.value2 ?? 3
          if (starChargeStacks >= maxChg) {
            const extra = Math.round(totalDamage * canPas.value / 100)
            totalDamage += extra
            setStarCannonUsed(true)
            addLog(`⚙️ 超頻機神匠：蓄能全滿！砲擊追加 +${extra} 傷害！`)
          }
        }
      }
    }

    // ── Vulnerable: enemy currently vulnerable → bonus damage ─────────────
    const enemyVulnerable = enemyStatus.some(s => s.type === 'vulnerable')
    if (enemyVulnerable) {
      totalDamage = Math.round(totalDamage * VULNERABLE_MULT)
      addLog('易傷：傷害提升！')
    }

    // ── 月光術士詛咒: -15% damage this attack ─────────────────────────────
    if (moonMageDebuff && totalDamage > 0) {
      totalDamage = Math.round(totalDamage * 0.85)
      addLog('月光詛咒：傷害 -15%')
    }

    // ── 惑心詛咒: -30% damage this attack ─────────────────────────────────
    if (sorceressDebuff && totalDamage > 0) {
      totalDamage = Math.round(totalDamage * 0.7)
      setSorceressDebuff(false)
      addLog('💫 魅魔詛咒：傷害 -30%')
    }

    // ── 裂隙前兆篇 enemy reactions ────────────────────────────────────────
    // 裂縫哥布林: 玩家重骰≥3次，敵人下次攻擊+20%
    if (isRiftGoblin && turnRerolls >= 3 && !riftGoblinEnraged) {
      setRiftGoblinEnraged(true)
      addLog('裂縫哥布林：過多重骰！牠下次攻擊 +20%')
    }
    // 星塵史萊姆: rank≥4→+20%傷害; rank=0→回復15HP
    if (isStarSlime) {
      if (combo.rank >= 4) {
        totalDamage = Math.round(totalDamage * 1.2)
        addLog('星塵史萊姆：骰型觸發弱點！+20% 傷害')
      } else if (combo.rank === 0) {
        setEnemyHp(h => Math.min(h + 15, enemy.hp))
        addLog('星塵史萊姆：散骰！牠回復 15 HP')
      }
    }
    // 月影盜賊: rank≥3→獲得下回合閃避
    if (isMoonRogue && combo.rank >= 3) {
      setMoonRogueEvade(true)
      addLog('月影盜賊：高骰型觸發！牠下回合閃避')
    }
    // 廢都守衛: rank≤2→防禦提升log; rank≥4→易傷
    if (isRuinGuard) {
      if (combo.rank <= 2) {
        addLog('廢都守衛：低骰型！牠獲得 15 護盾')
        setEnemyShield(s => s + 15)
      } else if (combo.rank >= 4) {
        setEnemyStatus(s => [...s.filter(x => x.type !== 'vulnerable'), { type: 'vulnerable', stacks: 2 }])
        addLog('廢都守衛：高骰型！陷入易傷狀態')
      }
    }
    // 月光術士: 全不同點數解除詛咒debuff
    if (isMoonMage && moonMageDebuff && new Set(dice).size === 5) {
      setMoonMageDebuff(false)
      addLog('月光術士：全不同點數！解除月光詛咒')
    }
    // 鏡月刺客: 連續相同骰型追加攻擊
    if (isMirrorAssassin && moonMirrorLastRank >= 0 && combo.rank === moonMirrorLastRank && combo.rank >= 1) {
      const xd = Math.round(baseEnemy.atk * 0.8)
      const xdNet = Math.max(0, xd - (talentBonus.defBonus + getDefBonus(leveledCards)))
      if (xdNet > 0) {
        setHeroHp(h => clamp(h - xdNet, 0, activeMember.maxHp))
        tookDamageRef.current = true
      }
      addLog(`鏡月刺客：連續相同骰型！追加攻擊 ${xd}`)
    }
    setMoonMirrorLastRank(combo.rank)
    // 月影執行官: rank<2→護盾; 傷害>80→下回合反擊
    if (isMoonExecutor) {
      if (combo.rank < 2) {
        setEnemyShield(s => s + 20)
        addLog('月影執行官：低骰型！獲得 20 護盾')
      }
      if (totalDamage > 80 && !executorRevengeActive) {
        setExecutorRevengeActive(true)
        addLog('月影執行官：強力攻擊！下回合反擊')
      }
    }
    // 暗月信徒: 觸犯禁忌點數→回復10HP
    if (isDarkDevotee && riftUnstableNum > 0 && dice.includes(riftUnstableNum)) {
      setEnemyHp(h => Math.min(h + 10, enemy.hp))
      addLog(`暗月信徒：觸犯禁忌點數 ${riftUnstableNum}！牠回復 10 HP`)
    }
    // 裂隙祈禱者: 觸犯禁忌→獲得護盾
    if (isRiftPraying && riftUnstableNum > 0 && dice.includes(riftUnstableNum)) {
      setEnemyShield(s => s + 8)
      addLog(`裂隙祈禱者：禁忌點數觸發！牠獲得 8 護盾`)
    }
    // 黑月裁決者: 避開禁忌→敵人易傷; 踩到禁忌→ATK強化
    if (isBlackJudge && riftUnstableNum > 0) {
      if (!dice.includes(riftUnstableNum)) {
        setEnemyStatus(s => [...s.filter(x => x.type !== 'vulnerable'), { type: 'vulnerable', stacks: 2 }])
        addLog(`黑月裁決者：成功避開禁忌 ${riftUnstableNum}！牠陷入易傷`)
      } else {
        setJudgeRageActive(true)
        addLog(`黑月裁決者：踩到禁忌 ${riftUnstableNum}！牠憤怒強化`)
      }
    }
    // 暗月祭司/暗月主教・前哨形態: 踩禁忌→自傷; 含祝福→獲盾
    if ((isDarkShaman || isBishopVanguard) && (riftUnstableNum > 0 || riftBlessedNum > 0)) {
      if (riftUnstableNum > 0 && dice.includes(riftUnstableNum)) {
        const penalty = 10
        setHeroHp(h => clamp(h - penalty, 0, activeMember.maxHp))
        tookDamageRef.current = true
        addLog(`雙骰審判：踩到禁忌 ${riftUnstableNum}！受到 ${penalty} 傷害`)
      }
      if (riftBlessedNum > 0 && dice.includes(riftBlessedNum)) {
        setGuardBonus(g => g + 8)
        addLog(`雙骰審判：含祝福點數 ${riftBlessedNum}！獲得 8 護盾`)
      }
    }
    // 暗月主教・前哨形態: 進入第二階段
    if (isBishopVanguard && !bvPhase2 && enemyHp <= enemy.hp * 0.6) {
      setBvPhase2(true)
      addLog('⚠️ 暗月主教：進入第二階段！')
    }

    // ── 星蝕裂隙：禁忌骰面效果 ─────────────────────────────────────────────
    const forbidCount = dice.filter(d => forbiddenDiceState.includes(d)).length
    const hasForbidden = forbidCount > 0
    const isCleanAttack = forbiddenDiceState.length > 0 && !hasForbidden
    if (hasForbidden) forbiddenTriggeredRef.current = true

    // 裂隙核心遺物：避開禁忌則蓄積攻擊加成
    if (hasRelic(run.relics, 'rift_core') && isCleanAttack) {
      const riftCoreEffect = getOwnedRelicEffect(run.relics, run.relicLevels, 'rift_core')
      const rcGain = riftCoreEffect?.riftCoreStackGain ?? 10
      const rcCap = riftCoreEffect?.riftCoreCap ?? 30
      const newBonus = Math.min(riftCoreBonus + rcGain, rcCap)
      setRiftCoreBonus(newBonus)
      if (newBonus > 0) { totalDamage += newBonus; addLog(`裂隙核心：蓄積 +${newBonus} 傷害`) }
    }

    // 裝備詞綴：不含禁忌點數傷害加成
    if (eqBonus.forbiddenCleanDmgPct > 0 && isCleanAttack) {
      totalDamage = Math.round(totalDamage * (1 + eqBonus.forbiddenCleanDmgPct / 100))
      addLog(`避忌：不含禁忌傷害 +${eqBonus.forbiddenCleanDmgPct}%`)
    }
    // 裝備詞綴：月蝕追擊 兩對以上且不含禁忌
    if (eqBonus.eclipseFollowup > 0 && isCleanAttack && combo.rank >= 2) {
      totalDamage += eqBonus.eclipseFollowup
      addLog(`月蝕追擊：+${eqBonus.eclipseFollowup} 傷害`)
    }
    // 星蝕觀測者 4 件套效果：首次淨骰出手 +20 傷害 +8 護盾
    if (hasLeg('eclipse_4pc') && isCleanAttack && isFirstAttack) {
      totalDamage += 20
      setGuardBonus(g => g + 8)
      addLog('星蝕觀測者：首次淨骰 +20 傷害 +8 護盾')
    }
    // 觀測者戒指：首次淨骰回復 HP+重骰
    if (hasLeg('observer_ring') && isCleanAttack && !observerRingUsedRef.current) {
      observerRingUsedRef.current = true
      setHeroHp(h => clamp(h + 10, 0, activeMember.maxHp))
      setRerollsLeft(r => r + 1)
      addLog('觀測者戒指：首次淨骰！回復 10 HP +1 重骰')
    }
    // 星蝕王冠遺物：不含禁忌且 isBoss → 易傷
    if (hasRelic(run.relics, 'eclipse_crown') && isBoss && isCleanAttack) {
      applied.applyVulnerable = true
      addLog('星蝕王冠：淨骰！Boss 易傷')
    }
    // 審判之眼遺物：每 3 回合且本回合淨骰 → 40 真實傷害
    const judgmentEyeRelic = hasRelic(run.relics, 'judgment_eye')
    if (judgmentEyeRelic && isCleanAttack && (bishopTurnCount > 0) && (bishopTurnCount % 3 === 0)) {
      const jeDmg = getOwnedRelicEffect(run.relics, run.relicLevels, 'judgment_eye')?.judgmentEyeDmg ?? 40
      setEnemyHp(h => Math.max(0, h - jeDmg))
      addLog(`審判之眼：淨骰！${jeDmg} 真實傷害！`)
    }

    // 月紋骰杯遺物：淨骰時獲得 N 護盾
    if (hasRelic(run.relics, 'moon_dice_cup') && isCleanAttack) {
      const mdcShield = getOwnedRelicEffect(run.relics, run.relicLevels, 'moon_dice_cup')?.moonDiceCupShield ?? 5
      setGuardBonus(g => g + mdcShield)
      addLog(`月紋骰杯：淨骰 +${mdcShield} 護盾`)
    }
    // 裝備詞綴：不含禁忌點數獲得護盾
    if (eqBonus.cleanDiceShield > 0 && isCleanAttack) {
      setGuardBonus(g => g + eqBonus.cleanDiceShield)
      addLog(`星砂護盾：淨骰 +${eqBonus.cleanDiceShield} 護盾`)
    }

    if (hasForbidden) {
      // 判斷免疫：forbidden_once_guard + eclipseSet2pc
      const canImmune = eqBonus.forbiddenOnceGuard && !forbiddenOnceUsedRef.current
      if (canImmune) {
        forbiddenOnceUsedRef.current = true
        addLog('淨骰：首次禁忌副作用免疫！')
      } else {
        // 禁忌副作用 — 按命中顆數線性強化
        const FD_SHIELD = [0,  8, 14, 20, 28, 35]
        const FD_SELF   = [0,  3, 10, 18, 28, 40]
        const FD_VULN   = [false, false, false, true, true, true]
        const FD_RAGE   = [false, false, false, false, false, true]  // 5顆：敵人本回合 ATK+30%
        const idx = Math.min(forbidCount, 5)
        let shieldAdd = FD_SHIELD[idx]
        let selfDmg   = FD_SELF[idx]
        const applyVuln = FD_VULN[idx]
        const enemyRage  = FD_RAGE[idx]

        // 減傷：裂隙護符(-N%) + forbiddenSelfDmgReduce词缀 + eclipseSet2pc(-30%)
        const riftAmuletPct = hasRelic(run.relics, 'rift_amulet') ? (getOwnedRelicEffect(run.relics, run.relicLevels, 'rift_amulet')?.riftAmuletReducePct ?? 50) : 0
        const riftAmulet = hasRelic(run.relics, 'rift_amulet') ? 1 - riftAmuletPct / 100 : 1
        const reducePct = Math.min(0.95, (eqBonus.forbiddenSelfDmgReduce / 100) + (eqBonus.eclipseSet2pc ? 0.3 : 0))
        selfDmg = Math.round(selfDmg * riftAmulet * (1 - reducePct))

        // 逆位星盤：禁忌改為加成，但敵方攻擊+20%（副作用不觸發，改為傷害加成）
        if (hasRelic(run.relics, 'reversed_astrolabe')) {
          const raDmgPct = getOwnedRelicEffect(run.relics, run.relicLevels, 'reversed_astrolabe')?.reversedAstrolabeDmgPct ?? 20
          totalDamage = Math.round(totalDamage * (1 + raDmgPct / 100))
          addLog(`逆位星盤：禁忌轉加成！傷害 +${raDmgPct}%`)
        } else {
          // 禁忌契約：含禁忌時傷害 +N%，受到 N 自傷
          if (hasRelic(run.relics, 'forbidden_contract')) {
            const fcEffect = getOwnedRelicEffect(run.relics, run.relicLevels, 'forbidden_contract')
            const fcDmgPct = fcEffect?.forbiddenContractDmgPct ?? 30
            const fcSelfDmg = fcEffect?.forbiddenContractSelfDmg ?? 8
            totalDamage = Math.round(totalDamage * (1 + fcDmgPct / 100))
            selfDmg += fcSelfDmg
            addLog(`禁忌契約：+${fcDmgPct}% 傷害，額外自傷 ${fcSelfDmg}`)
          }
          // 星蝕裁決杖：含禁忌時傷害 +25%，自傷 6
          if (hasLeg('judge_staff')) {
            totalDamage = Math.round(totalDamage * 1.25)
            selfDmg += 6
            addLog('星蝕裁決杖：含禁忌 +25% 傷害，自傷 6')
          }
          if (shieldAdd > 0) {
            setEnemyShield(s => s + shieldAdd)
            addLog(`⚠ 禁忌 ×${forbidCount}：敵方 +${shieldAdd} 護盾`)
          }
          if (selfDmg > 0) {
            setHeroHp(h => Math.max(0, h - selfDmg))
            tookDamageRef.current = true
            addLog(`禁忌自傷：-${selfDmg} HP`)
          }
          if (applyVuln) { applied.applyVulnerable = true; addLog(`禁忌 ×${forbidCount}：玩家陷入易傷`) }
          if (enemyRage) { applied.enemyRageMult = 1.3; enemyRageMultRef.current = 1.3; addLog('禁忌 ×5！敵人本回合狂暴（ATK +30%）') }
          // 英雄/傳奇難度：踩禁忌額外懲罰
          if (dungeonDifficulty === 'hero' || dungeonDifficulty === 'legendary') {
            const extraShield = dungeonDifficulty === 'legendary' ? 15 : 10
            setEnemyShield(s => s + extraShield)
            addLog(`${dungeonDifficulty === 'legendary' ? '傳奇' : '英雄'}難度：禁忌懲罰！敵方 +${extraShield} 護盾`)
            if (dungeonDifficulty === 'legendary') {
              setForbiddenDmgDebuff(0.1)
              addLog('傳奇難度：下回合傷害 -10%')
            }
          }
          // 星盾聖甲：受禁忌副作用時獲得等量護盾
          if (hasLeg('star_shield_armor')) {
            const shieldGain = shieldAdd + selfDmg
            setGuardBonus(g => g + shieldGain)
            setStarShieldArmorDef(0)  // reset no-forbidden bonus
            addLog(`星盾聖甲：禁忌補盾 +${shieldGain}`)
          }
        }
        // 星砂魔偶：額外護盾疊加（在禁忌副作用之上）
        if (isStarSandGolem) {
          const golemExtra = forbidCount >= 3 ? 30 : forbidCount === 2 ? 18 : 10
          setEnemyShield(s => s + golemExtra)
          addLog(`星砂硬殼：禁忌 ×${forbidCount}，魔偶額外 +${golemExtra} 護盾！`)
        }
        // 裂隙守衛：反擊
        if (isRiftGuardian) {
          const counterDmg = forbidCount >= 3 ? 25 : forbidCount === 2 ? 16 : 8
          const counterVuln = forbidCount >= 3
          setHeroHp(h => Math.max(0, h - counterDmg))
          tookDamageRef.current = true
          addLog(`禁忌反擊：${counterDmg} 傷害！`)
          if (counterVuln) applied.applyVulnerable = true
        }
      }
      // 月影短刃：含禁忌時追加攻擊機率減半
      if (hasLeg('moon_blade') && combo.rank >= 2 && Math.random() < 0.5) {
        const extra = Math.round(totalDamage * 0.6)
        totalDamage += extra
        addLog(`月影短刃：含禁忌追加（機率）+${extra} 傷害`)
      }
    } else {
      // 淨骰效果
      // 星蝕裁決杖：淨骰施加 2 層易傷
      if (hasLeg('judge_staff') && forbiddenDiceState.length > 0) {
        applied.applyVulnerable = true
        addLog('星蝕裁決杖：淨骰！施加 2 層易傷')
      }
      // 裂隙獵弓：全不同點數且淨骰 → 5 發星箭 each +6
      if (hasLeg('rift_bow') && new Set(dice).size === 5 && forbiddenDiceState.length > 0) {
        totalDamage += 5 * 6
        addLog('裂隙獵弓：全不同淨骰！星箭 ×5 +30 傷害')
      }
      // 月影短刃：兩對以上且淨骰 → 追加 60% 傷害
      if (hasLeg('moon_blade') && combo.rank >= 2 && forbiddenDiceState.length > 0) {
        const extra = Math.round(totalDamage * 0.6)
        totalDamage += extra
        addLog(`月影短刃：淨骰追加 +${extra} 傷害`)
      }
      // 星盾聖甲：本回合無禁忌副作用，下回合防禦 +6
      if (hasLeg('star_shield_armor') && forbiddenDiceState.length > 0) {
        setStarShieldArmorDef(d => d + 6)
        addLog('星盾聖甲：淨骰，下回合防禦 +6')
      }
    }
    // 月影短刃基礎：含或不含禁忌，兩對以上都有效（無禁忌場合無效，已上面處理）
    setLastAttackHadForbidden(hasForbidden)

    // ── Apply hero-inflicted statuses (burn/freeze/poison/armorBreak/vuln) ─
    // 破甲上限：不超過敵方原防禦的 70%
    const maxArmorBreak = Math.max(0, Math.floor(enemy.def * 0.7))
    // 凍結遞減：每次凍結 -1 回合；BOSS 額外 -1（抗性）
    const freezeStacks = Math.max(0, 2 - (isBoss ? 1 : 0) - freezeCount)
    const didFreeze = applied.applyFreeze && freezeStacks > 0
    // 中毒上限提示
    if (totalPoison > 0) {
      const curPoison = enemyStatus.find(s => s.type === 'poison')?.stacks ?? 0
      if (curPoison + totalPoison > 20) addLog('中毒：已達上限（20 層）')
    }
    // 破甲上限提示
    if (applied.applyArmorBreak > 0) {
      const curAB = enemyStatus.find(s => s.type === 'armor_break')?.stacks ?? 0
      if (curAB + applied.applyArmorBreak > maxArmorBreak) addLog(`破甲：已達上限（-${maxArmorBreak} 防禦）`)
    }
    // 凍結抗性提示
    if (applied.applyFreeze) {
      if (freezeStacks === 0) addLog(`${isBoss ? '【BOSS 免疫凍結】' : '凍結抗性：已免疫！'}`)
      else if (freezeStacks < 2) addLog(`${isBoss ? 'BOSS 凍結抗性' : '連續凍結遞減'}：凍結縮短為 ${freezeStacks} 回合`)
    }
    const isEnemyImmune = enemyImmuneRef.current > 0
    if (isEnemyImmune && (totalBurn > 0 || applied.applyFreeze)) addLog(`🛡 免疫：${enemy.name} 對控制效果免疫（剩 ${enemyImmuneRef.current} 回合）`)
    // 破甲手套：每次攻擊施加 N 層破甲（手部詞綴）
    if (eqBonus.armorBreakOnAttack > 0) applied.applyArmorBreak += eqBonus.armorBreakOnAttack
    // 矮人：破甲重擊 — 三條以上施加 N 層破甲
    if (eqBonus.hammerArmorCrush > 0 && combo.rank >= 3) applied.applyArmorBreak += eqBonus.hammerArmorCrush
    // 王座斷劍：魔焰 4+ 時附加破甲
    if (isBurningThrone && hasLeg('throne_sword') && infernalFlame >= 4) applied.applyArmorBreak += 2
    // 頭盔：弱點洞察 — 順子以上施加易傷
    if (eqBonus.vulnerableOnStraight && combo.rank >= 3) applied.applyVulnerable = true
    const projStatusRaw = applyStatusOnAttack(enemyStatus, {
      burn: isEnemyImmune ? 0 : totalBurn,
      freeze: isEnemyImmune ? false : applied.applyFreeze,
      poison: totalPoison, armorBreak: applied.applyArmorBreak,
      vulnerable: applied.applyVulnerable,
    }, { maxArmorBreak, freezeStacks })
    const projStatus = burnConsumed > 0
      ? projStatusRaw.map(s => s.type === 'burn' ? { ...s, stacks: Math.max(0, s.stacks - burnConsumed) } : s).filter(s => s.stacks > 0)
      : projStatusRaw

    // ── Armor break: reduce enemy defense by current stacks ───────────────
    const armorBreakStacks = enemyStatus.find(s => s.type === 'armor_break')?.stacks ?? 0
    // 破甲石錠: 破甲≥5 時傷害 +20%
    if (hasRelic(run.relics, 'armor_break_seal') && armorBreakStacks >= 5) {
      const pct = getOwnedRelicEffect(run.relics, run.relicLevels, 'armor_break_seal')?.brokenArmorAmpPct ?? 20
      totalDamage = Math.round(totalDamage * (1 + pct / 100))
      addLog(`破甲石錠：深度破甲 +${pct}%`)
    }
    // 星蝕主教破綻：每5回合(P2)暴露弱點，攻擊傷害×1.5
    if (isEclipseBishop && bishopWeakActive) {
      totalDamage = Math.round(totalDamage * 1.5)
      setBishopWeakActive(false)
      addLog(`⚡ 破綻暴露！傷害 ×1.5！`)
    }

    // ── 燃燒王座：魔焰加成 ──────────────────────────────────────────────────
    if (isBurningThrone) {
      // 魔焰值 3-4: 傷害 +10%；5: 傷害 +15%
      const flameDmgMult = infernalFlame >= 5 ? 1.15 : infernalFlame >= 3 ? 1.10 : 1.0
      if (flameDmgMult > 1) totalDamage = Math.round(totalDamage * flameDmgMult)
      // 裝備詞綴：魔焰 3+ 時傷害 +N%
      if (eqBonus.infernalFlameDmgPct > 0 && infernalFlame >= 3)
        totalDamage = Math.round(totalDamage * (1 + eqBonus.infernalFlameDmgPct / 100))
      // 裝備詞綴：HP < 50% 時傷害 +N%（燃魂詞綴）
      if (eqBonus.burningSoulDmgPct > 0 && heroHp < activeMember.maxHp * 0.5)
        totalDamage = Math.round(totalDamage * (1 + eqBonus.burningSoulDmgPct / 100))
      // 裝備詞綴：對有護盾敵人傷害 +N
      if (eqBonus.shieldBreakerDmg > 0 && enemyShield > 0)
        totalDamage += eqBonus.shieldBreakerDmg
      // 灰燼回響：受到燃燒後次次攻擊 +N
      if (ashResonanceReady && eqBonus.ashResonanceDmg > 0) {
        totalDamage += eqBonus.ashResonanceDmg
        setAshResonanceReady(false)
      }
      // 遺物：黑焰王冠 — 魔焰 4+ 時傷害 +15%
      if (hasRelic(run.relics, 'black_flame_crown') && infernalFlame >= 4) {
        const pct = getOwnedRelicEffect(run.relics, run.relicLevels, 'black_flame_crown')?.highFlameDmgPct ?? 15
        totalDamage = Math.round(totalDamage * (1 + pct / 100))
      }
      // 遺物：燃魂契約 — 每點魔焰 +N% 傷害
      const burningContract = getOwnedRelicEffect(run.relics, run.relicLevels, 'burning_soul_relic')
      if (burningContract && infernalFlame > 0) {
        const pct = burningContract.flamePerPointDmgPct ?? 3
        totalDamage = Math.round(totalDamage * (1 + (pct * infernalFlame) / 100))
      }
      // 王座4件套：下次攻擊 +30
      if (throneNextAtkBonus > 0) {
        totalDamage += throneNextAtkBonus
        setThroneNextAtkBonus(0)
        addLog(`焰獄征服者：王座強化 +${throneNextAtkBonus} 傷害`)
      }
      // 黑焰短刃：魔焰 5+ 時傷害 +40%
      if (hasLeg('dark_flame_dagger') && infernalFlame >= 5) {
        totalDamage = Math.round(totalDamage * 1.4)
        addLog('黑焰短刃：魔焰 5+，暴擊 +40%！')
      }
      // 煉獄長弓：魔焰 3+ 時追加燃燒箭 +8 傷
      if (hasLeg('inferno_longbow') && infernalFlame >= 3) {
        totalDamage += 8
        addLog('煉獄長弓：燃燒箭 +8 傷！')
      }
      // 王座斷劍：魔焰 4+ 破甲日誌
      if (hasLeg('throne_sword') && infernalFlame >= 4) addLog('王座斷劍：魔焰 4+，附加破甲！')
    }

    // ── 深海遺城篇：潮汐傷害調整 ─────────────────────────────────────────────
    if (isDeepSea && totalDamage > 0) {
      if (tideState === '退潮') {
        totalDamage = Math.round(totalDamage * 1.1)
        addLog('退潮：玩家傷害 +10%！')
      } else if (tideState === '深壓') {
        const avgDie = dice.reduce((s, v) => s + v, 0) / dice.length
        if (avgDie <= 3) {
          totalDamage = Math.round(totalDamage * 1.15)
          addLog('深壓：低點骰型，傷害 +15%！')
        } else {
          totalDamage = Math.round(totalDamage * 0.9)
          addLog('深壓：高點骰型，傷害 -10%！')
        }
      }
    }
    // 深淵鮟鱇：誘光蓄積 — 每次重骰 +15%，最多 +60%
    if (isAnglerfish && anglerLureBonus > 0) {
      setAnglerLureBonus(0)  // consumed on attack
    }
    // ── 黑潮王座：傳奇武器 & 遺物 & 詞綴傷害調整 ─────────────────────────────
    if (isBlackTide && totalDamage > 0) {
      // 潮汐劍：退潮/亂流傷害 +20%
      if (hasLeg('tide_blade') && (tideState === '退潮' || tideState === '亂流')) {
        totalDamage = Math.round(totalDamage * 1.2)
        addLog(`潮汐劍：${tideState}，傷害 +20%！`)
      }
      // 深壓長槍：深壓中傷害 ×1.35；rank≥3 追加 +12
      if (hasLeg('depth_lance') && tideState === '深壓') {
        totalDamage = Math.round(totalDamage * 1.35)
        addLog('深壓長槍：深壓中，傷害 ×1.35！')
        if (combo.rank >= 3) { totalDamage += 12; addLog('深壓長槍：rank ≥ 3，追加 +12 傷害！') }
      }
      // 潮影短刃：消耗 1 氧氣，傷害 ×1.25
      if (hasLeg('tidal_dagger') && oxygenLevel > 0) {
        totalDamage = Math.round(totalDamage * 1.25)
        setOxygenLevel(o => Math.max(0, o - 1))
        addLog('潮影短刃：消耗 1 氧氣，傷害 ×1.25！')
      }
      // 深淵讚歌：每點氧氣 +2 傷害
      if (hasLeg('abyss_hymn') && oxygenLevel > 0) {
        const oxyDmg = oxygenLevel * 2
        totalDamage += oxyDmg
        addLog(`深淵讚歌：${oxygenLevel} 點氧氣，+${oxyDmg} 傷害！`)
      }
      // 深淵勇者4件套：退潮出手 +15 傷害
      if (hasLeg('abyss_4pc') && tideState === '退潮') {
        totalDamage += 15
        addLog('深淵勇者4件：退潮出手 +15 傷害！')
      }
      // 深壓羅盤遺物：深壓傷害 +20%
      if (tideState === '深壓' && hasRelic(run.relics, 'depth_compass')) {
        const pct = getOwnedRelicEffect(run.relics, run.relicLevels, 'depth_compass')?.deepPressDmgPct ?? 20
        totalDamage = Math.round(totalDamage * (1 + pct / 100))
        addLog(`深壓羅盤：深壓狀態傷害 +${pct}%！`)
      }
      // 裝備詞綴：退潮/亂流時傷害 +N%
      if (eqBonus.tideDmgBonus > 0 && (tideState === '退潮' || tideState === '亂流')) {
        totalDamage = Math.round(totalDamage * (1 + eqBonus.tideDmgBonus / 100))
        addLog(`潮汐共鳴：${tideState}，傷害 +${eqBonus.tideDmgBonus}%！`)
      }
      // 裝備詞綴：深壓中傷害 +N%
      if (eqBonus.deepSuppressDmg > 0 && tideState === '深壓') {
        totalDamage = Math.round(totalDamage * (1 + eqBonus.deepSuppressDmg / 100))
        addLog(`深壓重擊：深壓中傷害 +${eqBonus.deepSuppressDmg}%！`)
      }
      // 裝備詞綴：氧氣耗盡時傷害 +N%（溺水搏命）
      if (eqBonus.drownedSoul > 0 && oxygenLevel === 0) {
        totalDamage = Math.round(totalDamage * (1 + eqBonus.drownedSoul / 100))
        addLog(`溺水搏命：氧氣耗盡，傷害 +${eqBonus.drownedSoul}%！`)
      }
    }
    // ── 灰燼聖約：裝備詞綴與傳奇效果 ────────────────────────────────────────
    if (isAshCovenant) {
      // 裝備詞綴：聖約進度 < 50 時傷害 +N%
      if (eqBonus.covenantLowDmgPct > 0 && covenantProgress < 50) {
        totalDamage = Math.round(totalDamage * (1 + eqBonus.covenantLowDmgPct / 100))
        addLog(`聖約韜晦：進度 < 50，傷害 +${eqBonus.covenantLowDmgPct}%！`)
      }
      // 裝備詞綴：聖約進度 ≥ 75 時傷害 +N%
      if (eqBonus.covenantHighAtkPct > 0 && covenantProgress >= 75) {
        totalDamage = Math.round(totalDamage * (1 + eqBonus.covenantHighAtkPct / 100))
        addLog(`聖約極限：進度 ≥ 75，傷害 +${eqBonus.covenantHighAtkPct}%！`)
      }
      // 遺物：審判之眸 - 進度≥75時傷害+N%
      const relicJudgmentFocus = getOwnedRelicEffect(run.relics, run.relicLevels, 'judgment_focus')?.covenantHighDmgPct ?? 0
      if (relicJudgmentFocus > 0 && run.relics.includes('judgment_focus') && covenantProgress >= 75) {
        totalDamage = Math.round(totalDamage * (1 + relicJudgmentFocus / 100))
        addLog(`審判之眸：進度 ≥ 75，傷害 +${relicJudgmentFocus}%！`)
      }
      // 傳奇武器：誓約聖劍 - 進度≥75時追加18傷害
      if (eqBonus.legendaryEffects.includes('covenant_sword') && covenantProgress >= 75) {
        totalDamage += 18
        addLog('誓約聖劍：聖約進度高，追加 18 傷害！')
      }
      // 本場攻擊永久加成（聖約封印遺物 + 套裝4件）
      if (covenantBurstAtkTotal > 0) {
        totalDamage += covenantBurstAtkTotal
      }
    }
    // ── 深海/黑潮：氧氣補充（順子/葫蘆 +1，五條 +2）─────────────────────────────
    if (isDeepSea || isBlackTide) {
      let oxyRestore = 0
      if (combo.label === '順子' || combo.label === '葫蘆') oxyRestore = 1
      else if (combo.label === '五條') oxyRestore = 2
      if (oxyRestore > 0) {
        setOxygenLevel(o => Math.min(o + oxyRestore, oxygenMax > 0 ? oxygenMax : 5))
        addLog(`💧 ${combo.label}：氧氣恢復 +${oxyRestore}！`)
      }
      // 珊瑚食人魚：玩家氧氣降低時追加攻擊（handled in doStartNextTurn; tag it here by current level)
    }

    // ── 召喚物攔截：有小怪時攻擊先打第一隻，跳過 boss 特效 ──────────────────────
    if (minions.length > 0) {
      const target = minions.find(m => !m.dying) ?? minions[0]
      const minionDef = Math.max(0, target.def)
      const rawDmg = totalDamage <= 0 ? 0 : Math.max(1, totalDamage - minionDef) * hitTimes
      const shieldAbsorb = Math.min(target.shield, rawDmg)
      const dmgToHp = rawDmg - shieldAbsorb
      playSound(baseAct.isSkill ? 'skill' : 'swing')
      setHeroAnim(baseAct.isSkill ? 'skill' : 'attack')
      addLog(`${hero.name} 攻擊 ${target.name}（${combo.label}）：${dice.join(' / ')}`)
      window.setTimeout(() => {
        playSound('hit')
        let allGone = false
        let justDied = false
        setMinions(prev => {
          const updated = prev.map(m => {
            if (m.uid !== target.uid) return m
            const newShield = Math.max(0, m.shield - shieldAbsorb)
            const newHp = Math.max(0, m.hp - dmgToHp)
            return { ...m, shield: newShield, hp: newHp, dying: newHp <= 0 }
          })
          const newlyDead = updated.filter(m => m.uid === target.uid && m.hp <= 0)
          newlyDead.forEach(m => addLog(`💀 ${m.name} 被擊倒！`))
          justDied = newlyDead.length > 0
          const remaining = updated.filter(m => m.hp > 0)
          if (remaining.length === 0) {
            allGone = true
            if (isLaon && !laonSoloPowerRef.current) {
              laonSoloPowerRef.current = true
            }
          }
          return updated
        })
        if (justDied) {
          // 留在畫面上播放倒下動畫，動畫結束後才真正移除
          window.setTimeout(() => {
            setMinions(prev => prev.filter(m => m.hp > 0))
          }, 600)
        }
        if (allGone && isLaon) addLog('⚔️ 羅恩：孤身作戰，力量覺醒！攻擊力大幅提升！')
        if (dmgToHp > 0) emitFloat(`-${dmgToHp}`, 'enemy_dmg', 'enemy')
        if (shieldAbsorb > 0) emitFloat(`🛡-${shieldAbsorb}`, 'enemy_shield', 'enemy')
        setHeroAnim('idle')
        window.setTimeout(() => doEnemyAttack(), 400)
      }, 350)
      return
    }

    if (isStarEclipse && isCleanAttack && totalDamage >= 80) cleanHighDmgRef.current = true
    if (isBlackTide && (tideState === '退潮' || tideState === '亂流') && totalDamage >= 90) tideDmgHighRef.current = true
    // 狂怒藥水：下次攻擊傷害 ×N（一次性）
    if (potionFuryMult > 1 && totalDamage > 0) {
      totalDamage = Math.round(totalDamage * potionFuryMult)
      addLog(`😡 狂怒：傷害 ×${potionFuryMult}！`)
      setPotionFuryMult(1.0)
    }
    const baseDef = ignoreEnemyDef ? 0 : skillOvr === 'arrow_snipe' && baseAct.isSkill ? Math.round(enemy.def * 0.5) : enemy.def
    const effEnemyDef = Math.max(0, baseDef - armorBreakStacks + (getAffix('armor')?.value ?? 0))
    const rawRealDmgBase = totalDamage <= 0 ? 0 : Math.max(1, totalDamage - effEnemyDef) * hitTimes
    // 黑焰騎士：魔焰≥4 時受到傷害 -20%；打出小順子以上可破除 1 回合
    const bfkArmored = isBlackFlameKnight && infernalFlame >= 4 && combo.rank < 6
    const rawRealDmg = bfkArmored ? Math.round(rawRealDmgBase * 0.8) : rawRealDmgBase
    if (bfkArmored) addLog('燃魂鎧甲：魔焰≥4，黑焰騎士受到傷害 -20%！（打出小順子以上可破除）')
    // Golem armor: 四條以上打穿完整傷害並額外破甲；否則減傷 75%
    const golemHighCombo = isGolem && golemArmorLeft > 0 && combo.rank >= 5  // 四條以上
    // 潮殼侍衛：漲潮中受到傷害 -20%
    const tidalShieldMult = (isTidalShellGuard && tideState === '漲潮') ? 0.8 : 1.0
    // 珊瑚禁衛長：免疫 <20 傷害
    const captainImmuneRaw = isCoralGuardCaptain && rawRealDmg < 20 && rawRealDmg > 0
    const realDmg = captainImmuneRaw ? 0 : golemArmorLeft > 0
      ? (golemHighCombo ? Math.round(rawRealDmg * tidalShieldMult) : Math.round(rawRealDmg * 0.25 * tidalShieldMult))
      : Math.round(rawRealDmg * tidalShieldMult)
    if (captainImmuneRaw) addLog('珊瑚巨盾：傷害低於 20，完全格擋！（葫蘆以上可破除）')
    if (tidalShieldMult < 1) addLog('漲潮守勢：漲潮中受到傷害 -20%！')
    if (golemArmorLeft > 0) {
      if (golemHighCombo) addLog(`⚡ 石甲崩裂！四條以上打穿護甲，完整傷害！`)
      else addLog(`石甲護身：護甲削減 75% 傷害（剩餘 ${golemArmorLeft} 回合）`)
    }
    // STS 護盾：先打護盾，溢出才扣 HP
    const enemyShieldAbsorb = Math.min(enemyShield, realDmg)
    const dmgToEnemyHp = realDmg - enemyShieldAbsorb
    if (enemyShieldAbsorb > 0) addLog(`護盾吸收 ${enemyShieldAbsorb} 傷害${dmgToEnemyHp > 0 ? `，剩餘 ${dmgToEnemyHp} 傷害穿透` : '！完全格擋！'}`)
    const rawEnemyHp = Math.max(0, enemyHp - dmgToEnemyHp)
    // Skeleton revive: intercept first death
    let finalEnemyHp = rawEnemyHp
    if (rawEnemyHp <= 0 && skeletonReviveRef.current) {
      skeletonReviveRef.current = false
      finalEnemyHp = Math.round(enemy.hp * 0.3)
    }
    // 珊瑚禁衛長：葫蘆以上破盾 + 易傷（在傷害計算後執行）
    const captainShieldBreak = isCoralGuardCaptain && combo.rank >= 4 && enemyShield > 0
    // 潮殼反射：有護盾時每次受擊反彈 5 傷害
    const tidalReflectTrigger = isTidalShellGuard && enemyShieldAbsorb > 0 && realDmg > 0
    let trackedHp = finalEnemyHp
    // 影刃連擊：把命中傷害拆成兩段，第一段在攻擊動作中途先打出
    const shadowComboFirstHit  = (shadowComboHit && dmgToEnemyHp > 0) ? Math.ceil(dmgToEnemyHp / 2) : 0
    const shadowComboSecondHit = dmgToEnemyHp - shadowComboFirstHit
    // 火焰法師：本回合若有燃燒引爆（烈焰噴發/爆燃術/紅蓮大賢者），額外標出爆炸傷害數字+爆閃
    const fireExplosionDmg = (hero.role === 'fire' && burnConsumed > 0) ? Math.min(dmgToEnemyHp, burnConsumed) : 0
    // 機關技師：過熱臨界爆裂炮，額外標出爆炸傷害數字+爆閃
    const gearExplosionShown = gearExplosionDmg > 0 ? Math.min(dmgToEnemyHp, gearExplosionDmg) : 0
    // 連環火球／炎晶法核：額外火球傷害，額外標出+爆閃
    const fireballShown = fireballBonusDmg > 0 ? Math.min(dmgToEnemyHp, fireballBonusDmg) : 0

    playSound(baseAct.isSkill ? 'skill' : 'swing')
    setHeroAnim(baseAct.isSkill ? 'skill' : 'attack')
    addLog(`${hero.name} 擲出 ${combo.label}：${dice.join(' / ')}`)

    if (shadowComboFirstHit > 0) {
      // 收招再出第二刀，逼出第二次 CSS 動畫播放（同值 setState 不會重播動畫）
      window.setTimeout(() => { setHeroAnim('idle'); setEnemyAnim('idle') }, 320)
      window.setTimeout(() => {
        playSound('hit')
        setHeroAnim(baseAct.isSkill ? 'skill' : 'attack')
        setEnemyAnim('hurt')
        setEnemyHp(h => Math.max(0, h - shadowComboFirstHit))
        emitFloat(`-${shadowComboFirstHit}`, 'enemy_dmg', 'enemy')
        addLog('暗影連擊：第一刀命中！')
      }, 340)
      window.setTimeout(() => { setEnemyAnim('idle') }, 800)
    }

    window.setTimeout(() => {
      playSound('hit')
      setEnemyAnim('hurt')
      setEnemyHp(() => finalEnemyHp)
      const shownDmg = (shadowComboFirstHit > 0 ? shadowComboSecondHit : dmgToEnemyHp) - fireExplosionDmg - gearExplosionShown - fireballShown
      if (shownDmg > 0) emitFloat(`-${shownDmg}`, 'enemy_dmg', 'enemy')
      if (fireballShown > 0) {
        window.setTimeout(() => {
          emitFloat(`🔥-${fireballShown}`, 'enemy_dmg', 'enemy')
          setFireExplosionFlash(n => n + 1)
          addLog(`🔥 火球追擊！追加 ${fireballShown} 傷害`)
        }, 180)
      }
      if (fireExplosionDmg > 0) {
        window.setTimeout(() => {
          emitFloat(`💥-${fireExplosionDmg}`, 'enemy_dmg', 'enemy')
          setFireExplosionFlash(n => n + 1)
          addLog(`🔥 燃燒引爆！追加 ${fireExplosionDmg} 傷害`)
        }, fireballShown > 0 ? 360 : 180)
      }
      if (gearExplosionShown > 0) {
        window.setTimeout(() => {
          emitFloat(`💥-${gearExplosionShown}`, 'enemy_dmg', 'enemy')
          setGearExplosionFlash(n => n + 1)
        }, 180)
      }
      if (enemyShieldAbsorb > 0) { setEnemyShield(s => Math.max(0, s - enemyShieldAbsorb)); emitFloat(`🛡-${enemyShieldAbsorb}`, 'enemy_shield', 'enemy') }
      if (rawEnemyHp <= 0 && finalEnemyHp > 0) addLog(`☠ 骸骨兵士：死而復生！恢復 ${finalEnemyHp} HP！`)
      // 珊瑚禁衛長：葫蘆以上破除護盾並施加易傷
      if (captainShieldBreak) {
        setEnemyShield(0)
        setEnemyStatus(s => addStack(s, 'vulnerable', 2, 'set', 2))
        addLog('葫蘆破盾！珊瑚禁衛長護盾被擊碎，施加 易傷 2 回合！')
      }
      // 潮殼反射：有護盾時反彈 5 傷害
      if (tidalReflectTrigger) {
        setHeroHp(h => Math.max(1, h - 5))
        tookDamageRef.current = true
        addLog('潮殼反射：潮殼侍衛反彈 5 傷害！')
      }
      // 荊棘：反彈傷害給玩家
      const thornAffix = getAffix('thorns')
      if (thornAffix && dmgToEnemyHp > 0) {
        setHeroHp(h => Math.max(1, h - thornAffix.value))
        addLog(`🌵 荊棘：${enemy.name} 反彈 ${thornAffix.value} 傷害！`)
      }
      // 激怒：HP 降至 50% 以下時觸發
      const berserkAffix = getAffix('berserk')
      if (berserkAffix && trackedHp > 0 && trackedHp < enemy.hp * 0.5 && !berserkRef.current) {
        berserkRef.current = true
        addLog(`💢 激怒：${enemy.name} 進入狂暴狀態！攻擊力 ×1.5！`)
      }
      // 火法：餘燼護體 — 施加燃燒後獲得 N 護盾
      if (eqBonus.fireEmberGuard > 0 && eqBonus.burnOnAttack > 0) {
        setGuardBonus(g => g + eqBonus.fireEmberGuard)
        addLog(`餘燼護體：施加燃燒，獲得 +${eqBonus.fireEmberGuard} 護盾`)
      }
      if (totalHeal > 0) {
        // 神官：聖光回流 — 治療時 N% 轉為傷害（先計算再回血）
        if (eqBonus.holyLightReturn > 0) {
          const convertDmg = Math.round(totalHeal * eqBonus.holyLightReturn / 100)
          if (convertDmg > 0) {
            totalDamage += convertDmg
            setEnemyHp(h => Math.max(0, h - convertDmg))
            trackedHp = Math.max(0, trackedHp - convertDmg)
            addLog(`聖光回流：治療 ${totalHeal} HP → 追加 ${convertDmg} 傷害`)
          }
        }
        setHeroHp(h => clamp(h + totalHeal, 0, activeMember.maxHp))
        playSound('heal')
        emitFloat(`+${totalHeal}`, 'heal', 'hero')
        if (totalHeal > 0 && leveledCards.some(c => c.id === 'healing_touch')) {
          setGuardBonus(g => g + totalHeal)
          addLog(`治癒之觸：+${totalHeal} 護盾`)
        }
        // 神罰強化：追蹤累計治療，達到最大 HP 後傷害加成永久生效
        const healMilestoneCard = leveledCards.find(c => c.effect.healMilestoneBonus)
        if (healMilestoneCard && !healMilestoneHitRef.current) {
          healedBattleTotalRef.current += totalHeal
          if (healedBattleTotalRef.current >= activeMember.maxHp) {
            healMilestoneHitRef.current = true
            addLog(`神罰強化：累計治療超過最大 HP，傷害永久 +${healMilestoneCard.effect.healMilestoneBonus}%！`)
          }
        }
        // 旋律印記：治療超過 30 → ATK 永久 +N（上限 +20）
        const melodyRelicBonus = run.relics.reduce((s, id) => s + (getOwnedRelicEffect(run.relics, run.relicLevels, id)?.melodyHealAtkBonus ?? 0), 0)
        if (melodyRelicBonus > 0 && totalHeal > 30 && melodyAtkBonusRef.current < 20) {
          const actual = Math.min(melodyRelicBonus, 20 - melodyAtkBonusRef.current)
          melodyAtkBonusRef.current += actual
          setAttackAtkStack(s => s + actual)
          addLog(`旋律印記：+${actual} ATK（累計 +${melodyAtkBonusRef.current}/20）`)
        }
        // 詩人：戰歌 — 本回合有治療，下次攻擊傷害 +N%
        if (eqBonus.songWarCry > 0) setSongWarCryActive(true)
        // 神官：溢出治療 N% 轉護盾（裝備詞綴）
        if (eqBonus.overhealShieldPct > 0) {
          const overflow = Math.max(0, heroHp + totalHeal - activeMember.maxHp)
          const shield = Math.min(Math.round(overflow * eqBonus.overhealShieldPct / 100), 40)  // 上限 40/回合
          if (shield > 0) { setGuardBonus(g => g + shield); addLog(`聖光溢護：溢出轉 ${shield} 護盾`) }
        }
        // 溢補轉盾（卡牌）：溢出治療 40%/50%/60% 轉護盾，上限 20/25/30
        if (run.cards.some(c => c.id === 'holy_overflow_shield')) {
          const hosLv = run.cardLevels?.['holy_overflow_shield'] ?? 1
          const hosPct  = hosLv >= 3 ? 0.60 : hosLv >= 2 ? 0.50 : 0.40
          const hosCap  = hosLv >= 3 ? 30   : hosLv >= 2 ? 25   : 20
          const overflow = Math.max(0, heroHp + totalHeal - activeMember.maxHp)
          const shield = Math.min(Math.round(overflow * hosPct), hosCap)
          if (shield > 0) { setGuardBonus(g => g + shield); addLog(`溢補轉盾：+${shield} 護盾`) }
        }
        // 神官：治療後下次攻擊蓄力（裝備詞綴）
        if (eqBonus.postHealAtk > 0) setPostHealAtkBonus(b => b + eqBonus.postHealAtk)
        // 聖光回響（卡牌）：治療後蓄力，lv1/lv2 最多 2 層，lv3 最多 3 層
        if (run.cards.some(c => c.id === 'holy_echo')) {
          const heLv = run.cardLevels?.['holy_echo'] ?? 1
          const heMax = heLv >= 3 ? 3 : 2
          setHolyEchoStacks(s => Math.min(s + 1, heMax))
        }
        // 安魂曲（卡牌）：治療時敵人受到 50%/62%/75% 治療量傷害
        if (run.cards.some(c => c.id === 'song_requiem')) {
          const sqLv = run.cardLevels?.['song_requiem'] ?? 1
          const sqPct = sqLv >= 3 ? 0.75 : sqLv >= 2 ? 0.62 : 0.50
          const reqDmg = Math.round(totalHeal * sqPct)
          if (reqDmg > 0) { setEnemyHp(h => Math.max(0, h - reqDmg)); trackedHp = Math.max(0, trackedHp - reqDmg); addLog(`安魂曲：治療轉傷 ${reqDmg}`) }
        }
        // song_set4 → 樂韻共鳴4件套: 治療時對敵人造成治療量30%的旋律傷害
        if (hasLeg('song_set4')) {
          const melodDmg = Math.round(totalHeal * 0.3)
          if (melodDmg > 0) { setEnemyHp(h => Math.max(0, h - melodDmg)); trackedHp = Math.max(0, trackedHp - melodDmg); addLog(`樂韻共鳴：旋律傷害 ${melodDmg}`) }
        }
      }
      if (hasLeg('acc_vampire')) setHeroHp(h => clamp(h + 3, 0, activeMember.maxHp))
      if (hasLeg('acc_lifesteal') && realDmg > 0) {
        const leech = Math.min(20, Math.max(1, Math.round(realDmg * 0.1)))
        setHeroHp(h => clamp(h + leech, 0, activeMember.maxHp))
        addLog(`嗜血之戒：吸血 +${leech} HP`)
      }
      if (hasLeg('acc_momentum')) setMomentumBonus(b => Math.min(b + 8, 40))
      // ring_blood_price: 每次攻擊-3HP，本場攻擊+6（上限+30）
      if (hasLeg('ring_blood_price')) {
        setHeroHp(h => Math.max(1, h - 3))
        setBloodPriceStack(s => {
          const next = Math.min(s + 6, 30)
          if (next <= 30) addLog(`血代之戒：鮮血獻祭 -3 HP，攻擊 +6 → 共 +${next}`)
          return next
        })
      }
      // acc_sacrifice: 每次攻擊-5HP
      if (hasLeg('acc_sacrifice')) {
        setHeroHp(h => Math.max(1, h - 5))
        addLog('獻祭腰帶：失去 5 HP')
      }
      if (applied.defend > 0) emitFloat(`🛡+${applied.defend}`, 'shield', 'hero')
      setGuardBonus(g => g + applied.defend)
      setEnemyStatus(projStatus)
      if (didFreeze) {
        setFreezeCount(c => c + 1)
        emitFloat('❄ 凍結', 'freeze', 'enemy')
        if (hero.role === 'ice') iceMarkGain += 1
      } else if (applied.applyFreeze && hero.role === 'ice') {
        // 凍結嘗試被免疫/遞減抵擋時，補償 +1 冰痕
        iceMarkGain += 1
        addLog('凍結免疫：施加 1 層冰痕')
      }
      if (totalBurn > 0) emitFloat(`🔥×${totalBurn}`, 'burn', 'enemy')
      if (totalBurn > 0 && !isEnemyImmune && hasRelic(run.relics, 'ash_talisman')) {
        const healAmt = getOwnedRelicEffect(run.relics, run.relicLevels, 'ash_talisman')?.healOnBurnApplied ?? 3
        setHeroHp(h => Math.min(h + healAmt, activeMember.maxHp))
        addLog(`灰燼護符：施加燃燒，回復 ${healAmt} HP`)
      }

      // ── 皇家公主：冰痕應用（含碎冰爆發 & 冰霜套裝4件）─────────────────────
      if (hero.role === 'ice' && iceMarkGain > 0) {
        const prevMark = iceMark
        const rawNew = prevMark + iceMarkGain
        const burst = rawNew >= 5
        const newMark = burst ? Math.max(0, rawNew - 3) : Math.min(rawNew, 5)
        setIceMark(newMark)
        emitFloat(`❄+${iceMarkGain}`, 'freeze', 'enemy')
        if (hasLeg('ice_set4')) {
          setGuardBonus(g => g + 5 * iceMarkGain)
          addLog(`永凍冰霜：獲得 ${5 * iceMarkGain} 護盾`)
        }
        if (burst) {
          const iceBurstCardBonus = leveledCards.reduce((s, c) => s + (c.effect.iceBurstBonusDmg ?? 0), 0)
          const burstDmg = 40 + iceBurstCardBonus
          setEnemyHp(h => Math.max(0, h - burstDmg))
          trackedHp = Math.max(0, trackedHp - burstDmg)
          emitFloat(`💥-${burstDmg}`, 'enemy_dmg', 'enemy')
          setIceExplosionFlash(n => n + 1)
          if (hasLeg('ice_set4')) {
            setTauntReduce(t => Math.min(t + 0.2, 0.8))
            addLog(`碎冰爆發！造成 ${burstDmg} 傷害，清除 3 層冰痕，敵方下回合攻擊 -20%！`)
          } else {
            addLog(`碎冰爆發！造成 ${burstDmg} 傷害，清除 3 層冰痕！`)
          }
        }
      }

      // Golem: 四條以上額外破甲 -1
      if (golemHighCombo) {
        setGolemArmorLeft(a => Math.max(0, a - 1))
        addLog('石甲崩裂：高骰型加速破甲！')
      }

      // dark_knight_counter: reflect 25% of dealt damage
      if (isCounter && realDmg > 0) {
        const counterDmg = Math.max(1, Math.round(realDmg * 0.25))
        tookDamageRef.current = true
        setHeroHp(h => Math.max(0, h - counterDmg))
        addLog(`暗黑反擊：反彈 ${counterDmg} 傷害！`)
      }
      // 黑焰騎士：單回合造成超過 90 傷害時反擊
      if (isBlackFlameKnight && realDmg > 90) {
        const bfkCounterDmg = Math.max(1, Math.round(enemy.atk * 0.8) - hero.def)
        setHeroHp(h => Math.max(1, h - bfkCounterDmg))
        tookDamageRef.current = true
        addLog(`黑焰反擊：受到過高傷害，反擊 ${bfkCounterDmg} 傷害！`)
      }
      // 煉獄魔犬：魔焰反噬後立即追擊（在 flame 邏輯後觸發，這裡用 realDmg 判斷）
      if (isInfernoHound && infernalFlame >= INFERNAL_FLAME_MAX) {
        const chaseDmg = Math.max(0, Math.round(enemy.atk * 0.6) - hero.def)
        if (chaseDmg > 0) {
          setHeroHp(h => Math.max(1, h - chaseDmg))
          tookDamageRef.current = true
          addLog(`聞火追獵：反噬後立即追擊 ${chaseDmg} 傷害！`)
        }
      }

      // Talent: heal_shield passive
      talP('heal_shield').forEach(p => {
        if (totalHeal > 0) setGuardBonus(g => g + Math.min(totalHeal, p.value))
      })

      // Talent: heal_dmg passive (bard awakening)
      talP('heal_dmg').forEach(p => {
        if (totalHeal > 0) {
          const dmg = Math.min(Math.round(totalHeal * p.value / 100), 45)
          if (dmg > 0) {
            setEnemyHp(h => Math.max(0, h - dmg))
            trackedHp = Math.max(0, trackedHp - dmg)
            addLog(`旋律傷害：${dmg} 傷害`)
          }
        }
      })

      // Talent: heal_atk_bonus (heal > threshold → next attack +N)
      talP('heal_atk_bonus').forEach(p => {
        if (totalHeal > (p.value2 ?? 20)) {
          setHealAtkBonus(p.value)
          addLog(`激勵：下次攻擊 +${p.value}`)
        }
      })

      // song_dice_boost → 漸強琴弦: 造成傷害後，下回合骰子最低值 +1
      if (hasLeg('song_dice_boost') && realDmg > 0) {
        setMinDieBoost(b => Math.min(b + 1, 3))
        addLog('漸強樂章：下回合骰子最低值 +1')
      }
      // 基礎骰子續航: 每顆 6 回復 3% 最大 HP（祭司額外 +5%）
      const sixes = dice.filter(d => d === 6).length
      if (sixes > 0) {
        if (hasRelic(run.relics, 'corrupt_dice_cup')) {
          // 腐化骰杯: 6s deal 10 damage + 1 vulnerable instead of healing
          const corruptDmg = sixes * 10
          setEnemyHp(h => Math.max(0, h - corruptDmg))
          trackedHp = Math.max(0, trackedHp - corruptDmg)
          setEnemyStatus(s => addStack(s, 'vulnerable', 1, 'set', 2))
          addLog(`腐化骰杯：${sixes} 顆 6，造成 ${corruptDmg} 傷害並施加易傷！`)
        } else {
          const pct = 0.03 + (hero.role === 'holy' ? 0.02 : 0)
          const sixHealPenPct = leveledCards.reduce((s, c) => s + (c.effect.sixHealPenaltyPct ?? 0), 0)
          let dieHeal = Math.round(activeMember.maxHp * pct) * sixes
          if (sixHealPenPct > 0) dieHeal = Math.round(dieHeal * (1 - sixHealPenPct / 100))
          if (dieHeal > 0) {
            setHeroHp(h => clamp(h + dieHeal, 0, activeMember.maxHp))
            addLog(`🎲 骰子續航：${sixes} 顆 6，回復 ${dieHeal} HP${sixHealPenPct > 0 ? `（低語骰 -${sixHealPenPct}%）` : ''}`)
          }
        }
      }
      // 星泉聖杯/生命骰杯: 每顆 6 額外治療
      const healOnSixTotal = getRelicHealOnSix(run.relics, run.relicLevels) * sixes
      if (healOnSixTotal > 0) {
        setHeroHp(h => clamp(h + healOnSixTotal, 0, activeMember.maxHp))
        addLog(`聖杯：${sixes} 顆 6，額外治療 ${healOnSixTotal} HP`)
      }
      // 吸血：血月短刃(15%) + 吸血戒指(lifestealPct)
      const lifestealPct = (hasRelic(run.relics, 'blood_blade') ? (getOwnedRelicEffect(run.relics, run.relicLevels, 'blood_blade')?.bloodBladeLifestealPct ?? 0.15) : 0)
        + run.relics.reduce((s, id) => s + (getOwnedRelicEffect(run.relics, run.relicLevels, id)?.lifestealPct ?? 0), 0)
      if (lifestealPct > 0 && realDmg > 0) {
        const leech = Math.max(1, Math.round(realDmg * lifestealPct))
        setHeroHp(h => clamp(h + leech, 0, activeMember.maxHp))
        addLog(`吸血 +${leech} HP`)
      }
      // 吸血藥水：本次攻擊 N% 吸血（一次性）
      if (potionLifestealPct > 0 && realDmg > 0) {
        const leech = Math.max(1, Math.round(realDmg * potionLifestealPct / 100))
        setHeroHp(h => clamp(h + leech, 0, activeMember.maxHp))
        addLog(`🩸 吸血藥水：+${leech} HP`)
        setPotionLifestealPct(0)
      }
      // 森林斗篷: 順子 → 敵人下次攻擊 -30%
      if (hasRelic(run.relics, 'forest_cloak') && combo.label === '順子') {
        setTauntReduce(0.3)
        addLog('森林斗篷：敵人下次攻擊 −30%')
      }
      // 野性羈絆: 受到治療時對敵人造成 N 傷害
      if (hasRelic(run.relics, 'wild_bond') && totalHeal > 0) {
        const wildBondDmg = getOwnedRelicEffect(run.relics, run.relicLevels, 'wild_bond')?.wildBondDmg ?? 10
        setEnemyHp(h => Math.max(0, h - wildBondDmg))
        trackedHp = Math.max(0, trackedHp - wildBondDmg)
        addLog(`野性羈絆：狼追加 ${wildBondDmg} 傷害`)
      }
      // 鍛造反擊（卡牌）：破甲時獲得 4/5/7 護盾
      if (run.cards.some(c => c.id === 'hammer_forge_counter') && applied.applyArmorBreak > 0) {
        const hfcLv = run.cardLevels?.['hammer_forge_counter'] ?? 1
        const hfcShield = hfcLv >= 3 ? 7 : hfcLv >= 2 ? 5 : 4
        setGuardBonus(g => g + hfcShield)
        addLog(`鍛造反擊：破甲 +${hfcShield} 護盾`)
      }
      // 狼魂項鍊: 攻擊後機率觸發狼攻擊
      if (hasRelic(run.relics, 'wolf_necklace') && realDmg > 0) {
        const wnProcPct = getOwnedRelicEffect(run.relics, run.relicLevels, 'wolf_necklace')?.wolfNecklaceProcPct ?? 30
        const proc = combo.rank >= 3 ? 1.0 : wnProcPct / 100
        if (Math.random() < proc) {
          const hasHunt = run.cards.some(c => c.id === 'beast_hunt')
          const hasDebuff = enemyStatus.some(s => s.type === 'armor_break' || s.type === 'poison')
          const hasWolfSoul = run.cards.some(c => c.id === 'beast_wolf_soul')
          const isDoubleSoul = hasWolfSoul && wolfSoulStacks >= 3
          let wolfDmg = (isDoubleSoul ? 24 : 12) + eqBonus.wolfDmgBonus
          if (hasHunt && hasDebuff) wolfDmg = Math.round(wolfDmg * 1.5)
          setEnemyHp(h => Math.max(0, h - wolfDmg))
          trackedHp = Math.max(0, trackedHp - wolfDmg)
          addLog(`狼魂項鍊：狼追加 ${wolfDmg} 傷害！${isDoubleSoul ? '（狼魂爆發！）' : ''}`)
          if (hasWolfSoul) {
            if (isDoubleSoul) setWolfSoulStacks(0)
            else setWolfSoulStacks(s => s + 1)
          }
        }
      }

      const msgs = [enemyShieldAbsorb > 0
        ? `${hero.name} 造成 ${dmgToEnemyHp} HP 傷害（護盾擋 ${enemyShieldAbsorb}）`
        : `${hero.name} 造成 ${realDmg} 傷害`]
      if (totalHeal > 0) msgs.push(`回復 ${totalHeal} HP`)
      if (hasLeg('acc_vampire')) msgs.push('吸血 +3 HP')
      if (totalBurn > 0) msgs.push(`施加 ${totalBurn} 層燃燒`)
      if (totalPoison > 0) msgs.push(`施加 ${totalPoison} 層中毒`)
      if (applied.applyArmorBreak > 0) msgs.push(`破甲 -${applied.applyArmorBreak} 防禦`)
      if (applied.applyVulnerable) msgs.push('敵人陷入易傷 2 回合')
      if (didFreeze) msgs.push(`凍結敵人 ${freezeStacks} 回合`)
      applied.extraLog.forEach(m => msgs.push(m))
      addLog(msgs.join('・'))
    }, 300)

    window.setTimeout(() => {
      setHeroAnim('idle')
      setEnemyAnim('idle')
      // reset song boost AFTER attack is fully resolved
      setMinDieBoost(0)

      if (trackedHp <= 0) {
        // 星蝕主教：第一血條耗盡 → 蛻變進入第二血條
        if (isEclipseBishop && bishopBarRef.current === 1) {
          bishopBarRef.current = 2
          setBishopBar(2)
          setEnemyHp(BISHOP_BAR2_HP)
          setBossPhase(3)
          setBishopTurnCount(0)
          setForbiddenDiceState(prev => {
            if (prev.length >= 2) return prev
            let s = Math.floor(Math.random() * 6) + 1
            while (prev.includes(s)) s = (s % 6) + 1
            const next = [...prev, s]
            addLog(`⚠️ 雙重禁忌！禁忌點數：${next.join('・')}`)
            return next
          })
          addLog('🌑 星蝕主教蛻變！第二血條已解封！星蝕審判開始！')
          if (talPFirst('shadow_chain_execute')) setShadowChainExecuteReady(true)
          doStartNextTurn()
          return
        }
        // 黑潮潮汐王：血條轉換（共 3 條，每條各自從 TIDE_KING_BAR_HP 開始）
        if (isTideKingAusrein && tideKingBarRef.current < 3) {
          const nextBar = tideKingBarRef.current + 1
          tideKingBarRef.current = nextBar; setTideKingBar(nextBar)
          setEnemyHp(TIDE_KING_BAR_HP)
          const oxyMax = oxygenMax > 0 ? oxygenMax : 5
          if (nextBar === 2) {
            setTideState('深壓')
            setOxygenLevel(o => Math.min(o + 1, oxyMax))
            addLog('🌊 王座甦醒 → 深壓審判！潮汐王進入第二形態！強制深壓！氧氣 +1！')
          } else {
            setOxygenMax(o => Math.max(1, o - 1))
            setOxygenLevel(o => Math.max(0, Math.min(o, oxyMax - 1)))
            addLog('🌊 深壓審判 → 沉海王權！最大氧氣 -1！潮汐王回復部分 HP！')
          }
          if (talPFirst('shadow_chain_execute')) setShadowChainExecuteReady(true)
          doStartNextTurn()
          return
        }
        // 灰燼殘王・奧爾德雷克：三條血條轉換
        if (isAshFallenKing && ashFallenKingBarRef.current < 3) {
          const nextBar = ashFallenKingBarRef.current + 1
          ashFallenKingBarRef.current = nextBar; setAshFallenKingBar(nextBar)
          setEnemyHp(ASH_FALLEN_KING_BAR_HP)
          setCovenantProgress(p => Math.min(p + 15, covenantEventBuff?.covenantMaxLimit ?? 100))
          if (nextBar === 2) {
            setEnemyStatus(s => addStack(s, 'burn', 4, 'add'))
            addLog('🔱 亡國之王 → 聖約之王！奧爾德雷克召喚王血之火！聖約進度 +15！')
            // 第二形態：召喚王血祭徒
            spawnMinions([{ name: '王血祭徒', hp: 200, atk: 32, def: 6, enemyId: 'royal_blood_disciple' }])
            addLog('⚔️ 聖約之王：王血祭徒從虛空中現身！')
          } else {
            setEnemyStatus(s => addStack(s, 'burn', 6, 'add'))
            addLog('🔱 聖約之王 → 灰燼王魂！奧爾德雷克化為灰燼！聖約進度 +15！')
            // 第三形態：清場並召喚兩隻聖約殘焰
            setMinions([])
            spawnMinions([
              { name: '聖約殘焰', hp: 80, atk: 20, def: 3, enemyId: 'covenant_ember' },
              { name: '聖約殘焰', hp: 80, atk: 20, def: 3, enemyId: 'covenant_ember' },
            ])
            addLog('🔥 灰燼王魂：奧爾德雷克的灰燼碎裂為兩道聖約殘焰！')
          }
          if (talPFirst('shadow_chain_execute')) setShadowChainExecuteReady(true)
          doStartNextTurn()
          return
        }
        // 灰燼聖約：擊殺獎勵聖約進度
        if (isAshCovenant) {
          const isCovenantType = isCovenantEmber || isRoyalBloodDisciple || isCovenantGuard
          const deathGain = 5 + (isCovenantType ? 5 : 0)
          setCovenantProgress(p => Math.min(p + deathGain, covenantEventBuff?.covenantMaxLimit ?? 100))
          addLog(`🔱 聖約進度 +${deathGain}（擊殺獎勵）`)
          // 聖約殘焰：被擊殺時若聖約進度≥75，對玩家造成 AOE 8 傷害
          if (isCovenantEmber && covenantProgress >= 75) {
            setHeroHp(h => Math.max(1, h - 8))
            tookDamageRef.current = true
            addLog('🔥 聖約殘焰：臨死爆炸！受到 8 傷害！')
          }
        }
        const noDamage = !tookDamageRef.current
        const streakBonus = noDamage ? (run.noDamageBattleCount + 1) * 8 : 0
        if (streakBonus > 0) addLog(`無傷連勝 ×${run.noDamageBattleCount + 1}！額外 +${streakBonus} 金幣`)
        // 餘燼心臟: 擊殺帶有燃燒的敵人 → 回復
        let emberHeal = 0
        if (projStatus.some(s => s.type === 'burn')) {
          emberHeal = run.relics.reduce((s, id) => s + (getOwnedRelicEffect(run.relics, run.relicLevels, id)?.burnKillHeal ?? 0), 0)
          if (emberHeal > 0) addLog(`餘燼心臟：燃燒擊殺，回復 ${emberHeal} HP`)
        }
        // 毒牙之環: 擊殺中毒敵人 → 回復
        if (projStatus.some(s => s.type === 'poison')) {
          const pkh = run.relics.reduce((s, id) => s + (getOwnedRelicEffect(run.relics, run.relicLevels, id)?.poisonKillHeal ?? 0), 0)
          if (pkh > 0) { setHeroHp(h => clamp(h + pkh, 0, activeMember.maxHp)); addLog(`毒牙之環：毒殺回復 ${pkh} HP`) }
        }
        // 溺亡王庭士兵：死亡泡爆炸 — 擊倒後對玩家造成 15 傷害
        if (isDrownedCourtSoldier) {
          setHeroHp(h => Math.max(1, h - 15))
          tookDamageRef.current = true
          addLog('💀 溺亡氣泡爆炸：士兵死亡，受到 15 傷害！')
        }
        // 溺冠碎片遺物：擊殺後恢復 2 氧氣
        if (isBlackTide && hasRelic(run.relics, 'drowned_crown')) {
          const oxyAmt = getOwnedRelicEffect(run.relics, run.relicLevels, 'drowned_crown')?.killRestoreOxygen ?? 2
          setOxygenLevel(o => Math.min(o + oxyAmt, oxygenMax > 0 ? oxygenMax : 5))
          addLog(`溺冠碎片：擊殺！恢復 ${oxyAmt} 點氧氣！`)
        }
        // 海藻共鳴詞綴：擊殺後恢復 1 氧氣
        if (isBlackTide && eqBonus.kelpResonance > 0) {
          setOxygenLevel(o => Math.min(o + eqBonus.kelpResonance, oxygenMax > 0 ? oxygenMax : 5))
          addLog(`海藻共鳴：擊殺！恢復 ${eqBonus.kelpResonance} 點氧氣！`)
        }
        addLog(`${enemy.name} 被擊倒！獲得 ${goldReward} 金幣`)
        setPhase('done')
        window.setTimeout(() => {
          const goldMult = 1 + (eqBonus.goldPct + eqBonus.dropLuck) / 100
          const total = Math.round((goldReward + relicGoldRef.current) * getRelicGoldMult(run.relics, run.relicLevels) * goldMult) + streakBonus
          onComplete({ won: true, goldEarned: total, newHeroHp: heroHp + (totalHeal > 0 ? totalHeal : 0) + emberHeal, noDamage, potionsLeft: potionsRef.current, undyingUsed, hourglassUsed: relicReviveUsed, equipUndyingUsed, turnsUsed: battleTurnCountRef.current, diceComboScore: diceComboScoreRef.current, noForbiddenTrigger: !forbiddenTriggeredRef.current, cleanHighDmg: cleanHighDmgRef.current, noBacklash: !backlashTriggeredRef.current, flamePeakHigh: flamePeakHighRef.current, oxygenSafe: !oxygenHitZeroRef.current, ebbtideDmgHigh: tideDmgHighRef.current, judgmentsThisBattle: judgmentCountRef.current, covenantLow: covenantProgress < 50 })
        }, 800)
        return
      }

      // Freeze check
      const isFrozen = projStatus.some(s => s.type === 'freeze' && s.stacks > 0)
      if (isFrozen) {
        const freezeAboutToExpire = projStatus.some(s => s.type === 'freeze' && s.stacks === 1)
        setEnemyStatus(s => s.map(x => x.type === 'freeze' ? { ...x, stacks: x.stacks - 1 } : x).filter(x => x.stacks > 0))
        addLog(`${enemy.name} 被凍結，無法行動！`)
        // 永凍之地改版：凍結解除時造成碎冰傷害
        if (freezeAboutToExpire && hasRelic(run.relics, 'permafrost')) {
          const permafrostDmg = getOwnedRelicEffect(run.relics, run.relicLevels, 'permafrost')?.permafrostDmg ?? 20
          setEnemyHp(h => Math.max(0, h - permafrostDmg))
          trackedHp = Math.max(0, trackedHp - permafrostDmg)
          addLog(`永凍之地：冰裂碎擊！-${permafrostDmg} 傷害`)
        }
        setLastComboRank(combo.rank)
        setPrevTurnRankLabel(combo.label)
        if (eqBonus.fighterDragonCharge > 0) setDragonChargeBonus(turnRerolls === 0 ? eqBonus.fighterDragonCharge : 0)
        if (hero.role === 'fighter') {
          setPrevFighterCombo(combo.label)
          if (noDoubleLeftRef.current > 0) {
            const nd = noDoubleLeftRef.current - 1
            noDoubleLeftRef.current = nd; setNoDoubleLeft(nd)
            if (nd === 0) {
              if (talPFirst('munsou_enhance')) { setFistPower(2); addLog('霸天武聖：無雙架式結束，保留 2 層拳勢！') }
              else { setFistPower(0); addLog('無雙架式結束，拳勢歸零。') }
              if (hasRelic(run.relics, 'dragon_heart_relic')) { const dhHeal = getOwnedRelicEffect(run.relics, run.relicLevels, 'dragon_heart_relic')?.dragonHeartHealOnEnd ?? 15; setHeroHp(h => clamp(h + dhHeal, 0, activeMember.maxHp)); addLog(`龍心碑：無雙結束，回復 ${dhHeal} HP！`) }
            } else { addLog(`無雙架式：剩餘 ${nd} 回合`) }
          }
        }
        if (trackedHp <= 0) {
          if (isEclipseBishop && bishopBarRef.current === 1) {
            bishopBarRef.current = 2; setBishopBar(2); setEnemyHp(BISHOP_BAR2_HP); setBossPhase(3); setBishopTurnCount(0)
            setForbiddenDiceState(prev => { if (prev.length >= 2) return prev; let s = Math.floor(Math.random()*6)+1; while(prev.includes(s)) s=(s%6)+1; addLog(`⚠️ 雙重禁忌！${[...prev,s].join('・')}`); return [...prev,s] })
            addLog('🌑 星蝕主教蛻變！第二血條已解封！'); doStartNextTurn(); return
          }
          if (isTideKingAusrein && tideKingBarRef.current < 3) {
            const nextBar = tideKingBarRef.current + 1
            tideKingBarRef.current = nextBar; setTideKingBar(nextBar)
            const oxyMax = oxygenMax > 0 ? oxygenMax : 5
            setEnemyHp(TIDE_KING_BAR_HP)
            if (nextBar === 2) { setTideState('深壓'); setOxygenLevel(o => Math.min(o + 1, oxyMax)); addLog('🌊 王座甦醒 → 深壓審判！潮汐王進入第二形態！強制深壓！氧氣 +1！') }
            else { setOxygenMax(o => Math.max(1, o - 1)); setOxygenLevel(o => Math.max(0, Math.min(o, oxyMax - 1))); addLog('🌊 深壓審判 → 沉海王權！最大氧氣 -1！潮汐王回復部分 HP！') }
            doStartNextTurn(); return
          }
          addLog(`${enemy.name} 被擊倒！獲得 ${goldReward} 金幣`)
          setPhase('done')
          window.setTimeout(() => {
            const goldMult = 1 + eqBonus.goldPct / 100
            const total = Math.round((goldReward + relicGoldRef.current) * getRelicGoldMult(run.relics, run.relicLevels) * goldMult)
            onComplete({ won: true, goldEarned: total, newHeroHp: heroHp, noDamage: !tookDamageRef.current, potionsLeft: potionsRef.current, undyingUsed, hourglassUsed: relicReviveUsed, equipUndyingUsed, turnsUsed: battleTurnCountRef.current, diceComboScore: diceComboScoreRef.current, noForbiddenTrigger: !forbiddenTriggeredRef.current, cleanHighDmg: cleanHighDmgRef.current, noBacklash: !backlashTriggeredRef.current, flamePeakHigh: flamePeakHighRef.current, oxygenSafe: !oxygenHitZeroRef.current, ebbtideDmgHigh: tideDmgHighRef.current, judgmentsThisBattle: judgmentCountRef.current, covenantLow: covenantProgress < 50 })
          }, 800)
          return
        }
        doStartNextTurn()
        return
      }
      setLastComboRank(combo.rank)
      setPrevTurnRankLabel(combo.label)
      if (eqBonus.fighterDragonCharge > 0) setDragonChargeBonus(turnRerolls === 0 ? eqBonus.fighterDragonCharge : 0)
      if (hero.role === 'fighter') {
        setPrevFighterCombo(combo.label)
        if (noDoubleLeftRef.current > 0) {
          const nd = noDoubleLeftRef.current - 1
          noDoubleLeftRef.current = nd; setNoDoubleLeft(nd)
          if (nd === 0) {
            if (talPFirst('munsou_enhance')) { setFistPower(2); addLog('霸天武聖：無雙架式結束，保留 2 層拳勢！') }
            else { setFistPower(0); addLog('無雙架式結束，拳勢歸零。') }
            if (hasRelic(run.relics, 'dragon_heart_relic')) { setHeroHp(h => clamp(h + 15, 0, activeMember.maxHp)); addLog('龍心碑：無雙結束，回復 15 HP！') }
          } else { addLog(`無雙架式：剩餘 ${nd} 回合`) }
        }
      }

      // DoT tick before enemy attack: burn (decays) + poison (persists)
      const { newStatus: afterBurn, dmg: rawBurnDmg } = tickBurn(projStatus)
      const burnDmg = eqBonus.burnAmp > 0 && rawBurnDmg > 0
        ? Math.round(rawBurnDmg * (1 + eqBonus.burnAmp / 100))
        : rawBurnDmg
      const poisonDmgBase = tickPoison(afterBurn)
      // 沉沒法杖：氧氣 ≥ 3 時中毒傷害 +50%
      const poisonDmg = (isBlackTide && hasLeg('drowned_staff') && oxygenLevel >= 3 && poisonDmgBase > 0)
        ? Math.round(poisonDmgBase * 1.5)
        : poisonDmgBase
      // 毒蝕共鳴：中毒敵人每回合額外受到 N 傷害
      const poisonResDmg = (eqBonus.poisonResonance > 0 && afterBurn.some(s => s.type === 'poison')) ? eqBonus.poisonResonance : 0
      const dotDmg = burnDmg + poisonDmg + poisonResDmg
      setEnemyStatus(afterBurn)
      if (dotDmg > 0) {
        setEnemyHp(h => Math.max(0, h - dotDmg))
        trackedHp = Math.max(0, trackedHp - dotDmg)
        emitFloat(`-${dotDmg}`, 'dot', 'enemy')
        const parts: string[] = []
        if (burnDmg > 0) parts.push(`燃燒 ${burnDmg}`)
        if (poisonDmg > 0) parts.push(`中毒 ${poisonDmg}`)
        if (poisonResDmg > 0) parts.push(`毒蝕共鳴 ${poisonResDmg}`)
        addLog(`${parts.join('・')} 持續傷害`)
        if (trackedHp <= 0) {
          if (isEclipseBishop && bishopBarRef.current === 1) {
            bishopBarRef.current = 2; setBishopBar(2); setEnemyHp(BISHOP_BAR2_HP); setBossPhase(3); setBishopTurnCount(0)
            setForbiddenDiceState(prev => { if (prev.length >= 2) return prev; let s = Math.floor(Math.random()*6)+1; while(prev.includes(s)) s=(s%6)+1; addLog(`⚠️ 雙重禁忌！${[...prev,s].join('・')}`); return [...prev,s] })
            addLog('🌑 星蝕主教蛻變！第二血條已解封！'); doStartNextTurn(); return
          }
          if (isTideKingAusrein && tideKingBarRef.current < 3) {
            const nextBar = tideKingBarRef.current + 1
            tideKingBarRef.current = nextBar; setTideKingBar(nextBar)
            setEnemyHp(TIDE_KING_BAR_HP)
            const oxyMax = oxygenMax > 0 ? oxygenMax : 5
            if (nextBar === 2) { setTideState('深壓'); setOxygenLevel(o => Math.min(o + 1, oxyMax)); addLog('🌊 王座甦醒 → 深壓審判！潮汐王進入第二形態！強制深壓！氧氣 +1！') }
            else { setOxygenMax(o => Math.max(1, o - 1)); setOxygenLevel(o => Math.max(0, Math.min(o, oxyMax - 1))); addLog('🌊 深壓審判 → 沉海王權！最大氧氣 -1！潮汐王回復部分 HP！') }
            doStartNextTurn(); return
          }
          const noDamage = !tookDamageRef.current
          const streakBonus = noDamage ? (run.noDamageBattleCount + 1) * 8 : 0
          if (streakBonus > 0) addLog(`無傷連勝 ×${run.noDamageBattleCount + 1}！額外 +${streakBonus} 金幣`)
          addLog(`${enemy.name} 被擊倒！獲得 ${goldReward} 金幣`)
          setPhase('done')
          window.setTimeout(() => {
            const goldMult = 1 + eqBonus.goldPct / 100
            const total = Math.round((goldReward + relicGoldRef.current) * getRelicGoldMult(run.relics, run.relicLevels) * goldMult) + streakBonus
            onComplete({ won: true, goldEarned: total, newHeroHp: heroHp, noDamage, potionsLeft: potionsRef.current, undyingUsed, hourglassUsed: relicReviveUsed, equipUndyingUsed, turnsUsed: battleTurnCountRef.current, diceComboScore: diceComboScoreRef.current, noForbiddenTrigger: !forbiddenTriggeredRef.current, cleanHighDmg: cleanHighDmgRef.current, noBacklash: !backlashTriggeredRef.current, flamePeakHigh: flamePeakHighRef.current, oxygenSafe: !oxygenHitZeroRef.current, ebbtideDmgHigh: tideDmgHighRef.current, judgmentsThisBattle: judgmentCountRef.current, covenantLow: covenantProgress < 50 })
          }, 800)
          return
        }
      }

      // ── 燃燒王座：魔焰累積 ────────────────────────────────────────────────
      if (isBurningThrone) {
        let flameGain = 0
        if (realDmg > 70) flameGain++
        if (turnRerolls > 2) flameGain++
        if (combo.rank >= 3) flameGain++  // 三條以上
        // 詛咒：魔焰失控 — 25% 機率每次增加多 +1
        const flameSurgeChance = run.curses.reduce((s, id) => s + (getCurseById(id)?.effect.flameExtraChance ?? 0), 0) / 100
        if (flameGain > 0 && flameSurgeChance > 0 && Math.random() < flameSurgeChance) flameGain++
        // 黑焰短刃：擊殺後跳過本次魔焰增加
        if (flameGain > 0 && darkFlameDaggerKillRef.current) {
          darkFlameDaggerKillRef.current = false
          addLog('黑焰短刃：擊殺抵消魔焰增加！')
          flameGain = 0
        }
        // 魔焰小鬼：每次魔焰增加時攻擊加成
        if (isFlameImp && flameGain > 0) setFlameImpBoostStacks(s => s + flameGain)
        if (flameGain > 0) {
          const newFlame = Math.min(infernalFlame + flameGain, INFERNAL_FLAME_MAX)
          setInfernalFlame(newFlame)
          if (newFlame >= 5) flamePeakHighRef.current = true
          if (newFlame >= INFERNAL_FLAME_MAX) {
            // 反噬
            const snuffedCandle = hasRelic(run.relics, 'snuffed_candlestick')
            const hasNotNegated = !throneFirstBacklashNegated
            if (hasLeg('ash_grimoire') && !ashGrimoireUsed) {
              // 灰燼魔典：首次反噬→對敵 40 真實傷害
              setAshGrimoireUsed(true)
              setEnemyHp(h => Math.max(0, h - 40))
              trackedHp = Math.max(0, trackedHp - 40)
              setInfernalFlame(2)
              if (eqBonus.ashResonanceDmg > 0) setAshResonanceReady(true)
              addLog('灰燼魔典：魔焰反噬轉化！對敵造成 40 真實傷害，魔焰歸 2')
            } else if (hasLeg('demon_core_engine') && !demonCoreUsed) {
              // 魔核引擎：首次到6不觸發反噬，改為免費重骰+護盾
              setDemonCoreUsed(true)
              setBonusRerollTurns(1)
              setBonusRerollAmt(1)
              setGuardBonus(g => g + 20)
              setInfernalFlame(2)
              addLog('魔核引擎：首次魔焰到 6！獲得免費重骰 1 次 + 20 護盾，魔焰歸 2')
            } else if (snuffedCandle && hasNotNegated) {
              setThroneFirstBacklashNegated(true)
              addLog('🕯️ 熄火燭台：第一次魔焰反噬被無效化！')
              setInfernalFlame(2)
            } else {
              backlashTriggeredRef.current = true
              // 計算反噬傷害
              const contract = getOwnedRelicEffect(run.relics, run.relicLevels, 'burning_soul_relic')
              const backlashExtra = contract ? (contract.flameBacklashExtra ?? 0) : 0
              let backlashDmg = 18 + backlashExtra
              // 魔焰反噬傷害 -N%（詞綴 + 套裝）
              const suppressPct = eqBonus.flameSuppressorPct + (eqBonus.throneSet2pc ? 30 : 0)
              if (suppressPct > 0) backlashDmg = Math.round(backlashDmg * (1 - suppressPct / 100))
              setHeroHp(h => Math.max(1, h - backlashDmg))
              tookDamageRef.current = true
              emitFloat(`-${backlashDmg}🔥`, 'enemy_dmg', 'hero')
              addLog(`🔥 魔焰反噬！受到 ${backlashDmg} 傷害，敵人獲得 15 護盾，魔焰歸 2`)
              setEnemyShield(s => s + 15)
              setInfernalFlame(2)
              // 灰燼回響：受到反噬後啟動下次攻擊加成
              if (eqBonus.ashResonanceDmg > 0) setAshResonanceReady(true)
              // 王座斷劍：反噬後獲得 15 護盾
              if (hasLeg('throne_sword')) {
                setGuardBonus(g => g + 15)
                addLog('王座斷劍：反噬觸發，獲得 15 護盾！')
              }
              // 4件套：下次攻擊 +30 傷害 +10 護盾
              if (eqBonus.throneSet2pc && eqBonus.legendaryEffects.includes('throne_4pc')) {
                setThroneNextAtkBonus(30)
                setGuardBonus(g => g + 10)
                addLog('焰獄征服者 4 件套：下次攻擊 +30 傷害，+10 護盾')
              }
              // 灰燼肺詛咒：反噬後治療 -20% 持續 2 回合
              const ashLungCurse = getCurseById('ash_lung')
              if (ashLungCurse && run.curses.includes('ash_lung')) {
                setBacklashHealPenaltyTurns(2)
                addLog('灰燼肺：反噬後治療 -20%，持續 2 回合')
              }
            }
            addLog(`魔焰值：${newFlame} → 2`)
          } else {
            addLog(`🔥 魔焰值 +${flameGain} → ${newFlame}`)
          }
        }
        // 煉獄長弓：未重骰時魔焰 -1（魔焰 > 0 才觸發）
        if (hasLeg('inferno_longbow') && turnRerolls === 0 && infernalFlame > 0) {
          setInfernalFlame(f => Math.max(0, f - 1))
          addLog('煉獄長弓：未重骰，魔焰 -1')
        }
        // 詛咒：燃魂代價 — 造成 >100 傷害時自傷 5
        const burnPriceCurse = getCurseById('burning_price')
        if (burnPriceCurse && run.curses.includes('burning_price') && realDmg > 100) {
          setHeroHp(h => Math.max(1, h - 5))
          tookDamageRef.current = true
          addLog('燃魂代價：高傷自傷 5 HP')
        }
        // 裝備：擊殺後獲得 N 護盾
        if (trackedHp <= 0 && eqBonus.emberShieldBonus > 0) {
          setGuardBonus(g => g + eqBonus.emberShieldBonus)
          addLog(`餘火護盾：擊殺獲得 ${eqBonus.emberShieldBonus} 護盾`)
        }
        // 追擊：擊殺後下回合傷害 +N%（多段 Boss 繼續有效）
        if (trackedHp <= 0 && eqBonus.killNextTurnDmg > 0) {
          setKillNextTurnDmgActive(true)
        }
        // 黑焰短刃：擊殺後下一次魔焰增加跳過
        if (trackedHp <= 0 && hasLeg('dark_flame_dagger')) {
          darkFlameDaggerKillRef.current = true
          addLog('黑焰短刃：擊殺！下一次魔焰增加被抵消')
        }
        // 焰獄魔王：王座崩壞移除（指定骰型）
        if (isThroneDemonKing && bossPhase >= 3 && throneCollapseStacks > 0) {
          let removeStacks = 0
          let collapseLog = ''
          if (combo.rank >= 7) {
            // 大順子：移除全部崩壞，魔焰歸 0
            removeStacks = throneCollapseStacks
            setInfernalFlame(0)
            collapseLog = '大順子！全部崩壞移除，魔焰歸 0！'
          } else if (combo.rank >= 6) {
            // 小順子：移除 2 層
            removeStacks = Math.min(2, throneCollapseStacks)
            collapseLog = `小順子！移除 ${removeStacks} 層崩壞`
          } else if (combo.rank >= 3) {
            // 三條：移除 1 層 + 易傷 1 層
            removeStacks = 1
            setEnemyStatus(s => addStack(s, 'vulnerable', 1, 'set', 2))
            collapseLog = '三條！移除 1 層崩壞，Boss 陷入易傷！'
          } else if (combo.rank >= 2) {
            // 兩對：移除 1 層
            removeStacks = 1
            collapseLog = '兩對！移除 1 層崩壞'
          }
          if (removeStacks > 0) {
            const newStacks = Math.max(0, throneCollapseStacks - removeStacks)
            setThroneCollapseStacks(newStacks)
            addLog(`⚔️ 崩壞壓制：${collapseLog}（剩餘 ${newStacks} 層）`)
            // 遺物：破碎魔核 — 第一次全清崩壞時 Boss 受到 60 真實傷害
            if (newStacks === 0 && !throneFirstCollapseCleared) {
              const coreRelic = getOwnedRelicEffect(run.relics, run.relicLevels, 'shattered_demon_core')
              if (coreRelic) {
                const trueDmg = coreRelic.throneCollapseNullifyDmg ?? 60
                setEnemyHp(h => Math.max(0, h - trueDmg))
                trackedHp = Math.max(0, trackedHp - trueDmg)
                setThroneFirstCollapseCleared(true)
                addLog(`💎 破碎魔核：崩壞全清！Boss 受到 ${trueDmg} 真實傷害！`)
              }
            }
          }
        }
        // 遺物：王座餘燼 — 擊殺精英後下場初始魔焰 -1 （透過 run.pendingFlameReduction 傳遞，這裡僅記錄）
        // 魔焰值到達 6 時擊殺：魔焰增加計入
        if (trackedHp <= 0) {
          const gainedKillFlame = !isFlameImp  // 魔焰小鬼免疫擊殺加魔焰
          if (gainedKillFlame) {
            let kf = Math.min(infernalFlame + 1, INFERNAL_FLAME_MAX)
            if (flameSurgeChance > 0 && Math.random() < flameSurgeChance) kf = Math.min(kf + 1, INFERNAL_FLAME_MAX)
            setInfernalFlame(kf)
          }
        }
      }

      doEnemyAttack()
    }, 1000)
  }

  const doEnemyAttack = () => {
    // 星界收割者：終末大攻擊宣告（intent 已在 doStartNextTurn 翻倍）
    if (isStarReaper && starReaperBigAttackRef.current) {
      starReaperBigAttackRef.current = false
      addLog('💀 終末收割！星界收割者發動大攻擊！')
    }
    if (immuneNextAttack) {
      setImmuneNextAttack(false)
      addLog(`護衛之冰：免疫此次攻擊！`)
      doStartNextTurn()
      return
    }
    // 獵人陷阱: N% 機率敵人被束縛跳過攻擊
    if (hasRelic(run.relics, 'hunter_trap') && Math.random() < (getOwnedRelicEffect(run.relics, run.relicLevels, 'hunter_trap')?.hunterTrapProcPct ?? 30) / 100) {
      addLog('獵人陷阱：敵人被束縛，跳過攻擊！')
      doStartNextTurn()
      return
    }
    // 月影盜賊：閃避減傷70%
    const moonRogueEvadeActive = isMoonRogue && moonRogueEvade
    if (moonRogueEvadeActive) {
      setMoonRogueEvade(false)
      addLog('月影閃避：盜賊閃避！此次攻擊傷害 -70%')
    }
    // Boss phase damage bonus
    const phaseMult = isBoss ? (bossPhase === 3 ? 1.5 : bossPhase === 2 ? 1.25 : 1.0) : 1.0
    // 深海：潮汐敵人修正 & 漲潮護盾（每次攻擊前刷新）
    if (isDeepSea && tideState === '漲潮') {
      setEnemyShield(s => s + 8)
    }
    // 破綻詛咒: 敵人攻擊力 +N%
    const curseAtkMult = 1 + run.curses.reduce((s, id) => s + (getCurseById(id)?.effect.enemyAtkMult ?? 0), 0) / 100
    // 嗜血燃焰: fire_hound ATK multiplier from enrage stacks
    const houndMult = isHound ? (1 + houndEnrageStacks * 0.08) : 1
    // 裂縫哥布林激怒: 重骰≥3次時+20%
    const riftGoblinMult = (isRiftGoblin && riftGoblinEnraged) ? 1.2 : 1.0
    // 月影執行官反擊: +50%
    const executorRevengeMult = (isMoonExecutor && executorRevengeActive) ? 1.5 : 1.0
    // 黑月裁決者憤怒: +20%
    const judgeRageMult = (isBlackJudge && judgeRageActive) ? 1.2 : 1.0
    // 暗月主教：裂隙門爆發時攻擊×2
    const bvRiftGateMult = (isBishopVanguard && bvRiftGate === 0 && bvPhase2) ? 2.0 : 1.0
    // 激怒詞墜: HP < 50% 後攻擊 ×1.5
    const berserkMult = berserkRef.current ? 1.5 : 1.0
    // Orc rage: every 3 turns deal double damage
    const isOrcRage = isOrc && orcRageTurn === 2
    const rageMult = enemyRageMultRef.current; enemyRageMultRef.current = 1
    // 燃燒王座：魔焰加成敵人攻擊
    const infernalEnemyMult = isBurningThrone
      ? (infernalFlame >= 5 ? 1.20 : infernalFlame >= 3 ? 1.10 : 1.0)
      : 1.0
    // 王座凝視詛咒：Boss 戰中魔焰值 4+ 時，Boss 攻擊 +10%
    const throneGazeMult = (isBurningThrone && isBoss && infernalFlame >= 4 && run.curses.includes('throne_gaze'))
      ? 1.10 : 1.0
    // 魔焰小鬼：每魔焰增加蓄積攻擊加成
    const flameImpMult = isFlameImp ? (1 + flameImpBoostStacks * 0.10) : 1.0
    // 煉獄魔犬：魔焰越高攻擊越強
    const houndFlameMult = isInfernoHound
      ? (infernalFlame >= 5 ? 1.35 : infernalFlame >= 3 ? 1.15 : 1.0)
      : 1.0
    // 焰獄魔王：崩壞層 - 每層 +8% 傷害
    const throneCollapseMult = isThroneDemonKing ? (1 + throneCollapseStacks * 0.08) : 1.0
    // 深海：退潮時敵人ATK+5%；深海槍兵退潮+30%
    const deepSeaTideMult = isDeepSea
      ? (tideState === '退潮' ? (isDeepLancer ? 1.30 : 1.05) : 1.0)
      : 1.0
    // 黑潮：退潮+5%；深壓+15%；亂流+10%；漲潮-5%（受攻保護）
    const blackTideMult = isBlackTide
      ? (tideState === '退潮' ? 1.05 : tideState === '深壓' ? 1.15 : tideState === '亂流' ? 1.10 : 0.95)
      : 1.0
    // 深壓巨鰻：深壓中速攻 +20%
    const eelDepthMult = (isDeepPressureEel && tideState === '深壓') ? 1.20 : 1.0
    // 沉冠海巫：法力蓄滿時 ×2 大攻擊
    const witchFullMult = (isSunkenCrownWitch && witchManaStacks >= 3) ? 2.0 : 1.0
    // 深淵鮟鱇：誘光蓄積
    const anglerMult = isAnglerfish ? (1 + anglerLureBonus / 100) : 1.0
    // 利維坦幼獸：狂化層
    const levMult = isLeviathanPup ? (1 + leviathanEnrage * 0.10) : 1.0
    // 羅恩孤身覺醒：小怪全滅後 ×1.5
    const laonSoloMult = laonSoloPowerRef.current ? 1.5 : 1.0
    // 灰燼聖約：聖約進度 50/75 增強敵人攻擊；事件buff削弱敵人
    const ashCovenantPhaseMult = isAshCovenant
      ? (covenantProgress >= 75 ? 1.20 : covenantProgress >= 50 ? 1.10 : 1.0)
      : 1.0
    const ashEventAtkMult = (isAshCovenant && covenantEventBuff?.enemyAtkMult) ? covenantEventBuff.enemyAtkMult : 1.0
    // 灰燼審判者：玩家出現6點骰子則下回合攻擊+25%
    const ashJudgeMult = (isAshJudge && playerUsedSixDieRef.current) ? 1.25 : 1.0
    const baseIntent = Math.round((isOrcRage ? enemyIntent * 2 : enemyIntent) * phaseMult * curseAtkMult * houndMult * berserkMult * rageMult * riftGoblinMult * executorRevengeMult * judgeRageMult * bvRiftGateMult * infernalEnemyMult * throneGazeMult * flameImpMult * houndFlameMult * throneCollapseMult * deepSeaTideMult * blackTideMult * eelDepthMult * witchFullMult * anglerMult * levMult * laonSoloMult * ashCovenantPhaseMult * ashEventAtkMult * ashJudgeMult)
    if (berserkRef.current) addLog(`💢 激怒：攻擊力 ×1.5！`)
    if (curseAtkMult > 1) addLog(`💀 破綻詛咒：敵人攻擊 ×${curseAtkMult.toFixed(2)}`)
    if (riftGoblinMult > 1) { addLog('裂縫哥布林：激怒！攻擊 +20%'); setRiftGoblinEnraged(false) }
    if (executorRevengeMult > 1) { addLog('月影執行官：反擊！攻擊 +50%'); setExecutorRevengeActive(false) }
    if (judgeRageMult > 1) { addLog('黑月裁決者：憤怒強化！攻擊 +20%'); setJudgeRageActive(false) }
    if (isOrcRage) addLog('💢 獸人狂暴蓄力釋放！傷害翻倍！')
    if (!isEclipseBishop && isBoss && bossPhase >= 2 && phaseMult > 1) addLog(`💢 激怒強化：傷害 ×${phaseMult}`)
    if (isHound && houndEnrageStacks > 0) addLog(`🔥 嗜血燃焰：攻擊力 ×${houndMult.toFixed(2)}（${houndEnrageStacks} 層）`)
    // 俯衝追擊: bat_dragon extra damage per player reroll this turn
    const batCounterDmg = isBatDragon ? Math.round(enemy.atk * 0.15 * turnRerolls) : 0
    const intentAfterTaunt = tauntReduce > 0 ? Math.round(baseIntent * (1 - tauntReduce)) : baseIntent
    const intentWithCounter = intentAfterTaunt + batCounterDmg
    if (batCounterDmg > 0) addLog(`🦇 俯衝追擊：${turnRerolls} 次重骰，額外追加 +${batCounterDmg} 傷害！`)
    const burnCodexMult = hasRelic(run.relics, 'burn_codex') ? 1 + (getOwnedRelicEffect(run.relics, run.relicLevels, 'burn_codex')?.burnCodexSelfDmgPct ?? 10) / 100 : 1
    const koadDef = hasRelic(run.relics, 'kingdom_oath') && guardBonus > 0 ? 6 : 0
    // 冰震衝擊: yeti ignores all shield every 3 turns
    const yetiShieldBreak = isYeti && yetiTurn % 3 === 2
    const moonEvadeMult = moonRogueEvadeActive ? 0.3 : 1.0
    const slashSet4Mult = hasLeg('slash_set4') && guardBonus > 0 ? 0.8 : 1.0
    const fighterDefMult = (hero.role === 'fighter' && fistPower > 0) ? (1 - fistPower * 0.02) : 1.0
    const wardenReduce = (hasLeg('armor_warden') && guardBonus > 0) ? 3 : 0
    const secondSkinMult = (hasLeg('armor_second_skin') && battleTurn >= 3) ? 0.8 : 1.0
    // 堅壁：護盾存在時受傷害 -N%
    const shieldGuardMult = (eqBonus.shieldGuard > 0 && guardBonus > 0) ? (1 - eqBonus.shieldGuard / 100) : 1.0
    // 厚甲（身體）+ 迴避（鞋子）：每場首次受攻減傷
    const firstHitTotalPct = !firstHitDmgUsed ? eqBonus.firstHitReduce + eqBonus.dodgeOnce : 0
    const firstHitMult = firstHitTotalPct > 0 ? Math.max(0.1, 1 - firstHitTotalPct / 100) : 1.0
    if (!firstHitDmgUsed && firstHitTotalPct > 0) setFirstHitDmgUsed(true)
    // 深淵勇者2件套：漲潮時防禦 +8
    const abyssSet2pcDef = (isBlackTide && eqBonus.abyssSet2pc && tideState === '漲潮') ? 8 : 0
    // 潮殼護符遺物：漲潮時受傷害 -15%
    const tidalDeflectorMult = (isBlackTide && tideState === '漲潮' && hasRelic(run.relics, 'tidal_deflector'))
      ? (1 - (getOwnedRelicEffect(run.relics, run.relicLevels, 'tidal_deflector')?.tidalDmgReduce ?? 15) / 100)
      : 1.0
    // 潮影短刃詞綴：漲潮受傷害 -N%
    const tidalBarrierMult = (isBlackTide && tideState === '漲潮' && eqBonus.tidalBarrier > 0) ? (1 - eqBonus.tidalBarrier / 100) : 1.0
    // 灰燼王國・第二章：餘燼 4 層 +15% 敵人傷害；王血詛咒 3+ 層 +15% 敵人傷害；背叛易傷 +20%
    const ashEmberDmgMult   = (isAshKingdom && run.chapter === 1 && emberStacks >= 4) ? 1.15 : 1.0
    const royalCurseDmgMult = (isAshKingdom && run.chapter === 3 && royalBloodCurse >= 3) ? 1.15 : 1.0
    const heroVulnMult      = (isAshKingdom && heroVulnerableTurns > 0) ? 1.20 : 1.0
    // 王城陷落：敵人攻擊+20% 但防禦-3（防禦削減在 def 計算，這裡只做攻擊）
    const castleFallDmgMult = (isAshKingdom && run.chapter === 2 && castleMemoryPhase === 3) ? 1.20 : 1.0
    const rawBeforeShield = Math.max(0, Math.round((intentWithCounter - hero.def - extraDef - koadDef - wardenReduce - abyssSet2pcDef) * burnCodexMult * moonEvadeMult * slashSet4Mult * fighterDefMult * secondSkinMult * shieldGuardMult * firstHitMult * tidalDeflectorMult * tidalBarrierMult * ashEmberDmgMult * royalCurseDmgMult * heroVulnMult * castleFallDmgMult))
    const shieldAbsorb = yetiShieldBreak ? 0 : Math.min(guardBonus, rawBeforeShield)
    // 護盾保留：護盾吸收時只消耗 (1-N%) 護盾
    const shieldConsumed = (eqBonus.shieldRetain > 0 && shieldAbsorb > 0)
      ? Math.max(0, Math.round(shieldAbsorb * (1 - eqBonus.shieldRetain / 100)))
      : shieldAbsorb
    const raw = rawBeforeShield - shieldAbsorb
    if (yetiShieldBreak) addLog('🏔️ 冰震衝擊：完全無視護盾！直接傷害 HP！')
    if (firstHitMult < 1) {
      const fhParts = [eqBonus.firstHitReduce > 0 && `厚甲 ${eqBonus.firstHitReduce}%`, eqBonus.dodgeOnce > 0 && `迴避 ${eqBonus.dodgeOnce}%`].filter(Boolean).join('+')
      addLog(`${fhParts}：首次受攻擊減傷 ${firstHitTotalPct}%`)
    }
    if (shieldGuardMult < 1) addLog(`堅壁：護盾守護，傷害 -${eqBonus.shieldGuard}%`)
    if (abyssSet2pcDef > 0) addLog(`深淵勇者2件：漲潮防禦 +${abyssSet2pcDef}`)
    if (tidalDeflectorMult < 1) addLog(`潮殼護符：漲潮受傷害 -${getOwnedRelicEffect(run.relics, run.relicLevels, 'tidal_deflector')?.tidalDmgReduce ?? 15}%`)
    if (tidalBarrierMult < 1) addLog(`潮汐護符：漲潮受傷害 -${eqBonus.tidalBarrier}%`)
    if (ashEmberDmgMult > 1) addLog('🔥 餘燼 4 層：敵人傷害 +15%！')
    if (royalCurseDmgMult > 1) addLog(`💀 王血詛咒 ${royalBloodCurse} 層：受傷害 +15%！`)
    if (heroVulnMult > 1) addLog(`⚠️ 背叛易傷（${heroVulnerableTurns} 回）：受傷 +20%！`)
    if (castleFallDmgMult > 1) addLog('⚔️ 王城陷落：敵人傷害 +20%！')
    // 餘燼 2+ 層：攻擊附加燃燒（40% 機率）
    if (isAshKingdom && run.chapter === 1 && emberStacks >= 2 && Math.random() < 0.4) {
      setHeroHp(h => Math.max(1, h - 3))
      addLog('🔥 餘燼共鳴：攻擊附帶餘燼 -3 HP！')
    }
    // 王血詛咒 5 層：觸發反噬
    if (isAshKingdom && run.chapter === 3 && royalBloodCurse >= 5) {
      const backlash = 30
      setHeroHp(h => Math.max(1, h - backlash))
      setRoyalBloodCurse(0)
      if (isElysia) setEnemyShield(s => s + 20)
      addLog(`💀 王血反噬：5 層詛咒爆發！受 ${backlash} 傷害，詛咒歸零！${isElysia ? '（艾莉西亞獲得 20 護盾！）' : ''}`)
    }
    // 背叛易傷計數遞減
    if (heroVulnerableTurns > 0) setHeroVulnerableTurns(t => t - 1)
    playSound('enemy_swing')
    setEnemyAnim('attack')
    if (shieldAbsorb > 0 && raw === 0) {
      addLog(`${enemy.name} 發動 ${baseEnemy.skill}！護盾完全格擋 ${shieldAbsorb} 傷害！`)
    } else if (shieldAbsorb > 0) {
      addLog(`${enemy.name} 發動 ${baseEnemy.skill}！護盾吸收 ${shieldAbsorb}，造成 ${raw} HP 傷害`)
    } else {
      addLog(`${enemy.name} 發動 ${baseEnemy.skill}，造成 ${raw} 傷害`)
    }
    if (shieldConsumed < shieldAbsorb && shieldAbsorb > 0) {
      addLog(`護盾保留：護盾僅消耗 ${shieldConsumed}（保留 ${shieldAbsorb - shieldConsumed}）`)
    }

    window.setTimeout(() => {
      playSound('hurt')
      setHeroAnim('hurt')
      if (shieldAbsorb > 0) { setGuardBonus(g => Math.max(0, g - shieldConsumed)); emitFloat(`🛡-${shieldConsumed}`, 'shield', 'hero') }
      if (raw > 0) { tookDamageRef.current = true; emitFloat(`-${raw}`, 'enemy_dmg', 'hero') }
      revivalDecisionRef.current = 'none'
      setHeroHp(h => {
        const next = Math.max(0, h - raw)
        if (next <= 0 && hasRelic(run.relics, 'hourglass') && !relicReviveUsed) {
          const reviveHp = Math.max(1, Math.round(activeMember.maxHp * 0.3))
          revivalDecisionRef.current = 'hourglass'
          revivalHpRef.current = reviveHp
          return reviveHp
        }
        const hasUndying = run.cards.some(c => c.id === 'undying')
        if (next <= 0 && hasUndying && !undyingUsed) {
          revivalDecisionRef.current = 'undying'
          revivalHpRef.current = 1
          return 1
        }
        if (next <= 0 && hasLeg('armor_undying') && !equipUndyingUsed) {
          const reviveHp = Math.max(1, Math.round(activeMember.maxHp * 0.2))
          revivalDecisionRef.current = 'armor'
          revivalHpRef.current = reviveHp
          return reviveHp
        }
        // 回魂：首次 HP 跌破 30% 時回復 N HP
        if (eqBonus.lifeRecoverOnce > 0 && !lifeRecoverOnceUsed && h > activeMember.maxHp * 0.3 && next < activeMember.maxHp * 0.3) {
          const healed = Math.min(activeMember.maxHp, next + eqBonus.lifeRecoverOnce)
          const finalHp = Math.max(next > 0 ? 1 : 0, healed)
          revivalDecisionRef.current = 'lifeRecover'
          revivalHpRef.current = finalHp
          if (healed > 0 && next <= 0) heroDeadRef.current = false
          return finalHp
        }
        // acc_rebirth: 首次HP≤20%時回復40HP（可防止瀕死）
        if (hasLeg('acc_rebirth') && !rebirthUsed && h > activeMember.maxHp * 0.2 && next <= activeMember.maxHp * 0.2) {
          const healed = Math.min(activeMember.maxHp, next + 40)
          const finalHp = Math.max(1, healed)
          revivalDecisionRef.current = 'rebirth'
          revivalHpRef.current = finalHp
          if (healed > 0 && next <= 0) heroDeadRef.current = false
          return finalHp
        }
        if (next <= 0) heroDeadRef.current = true
        return next
      })
      // 奮戰鬥志：受到攻擊後蓄積層數
      if (leveledCards.some(c => c.id === 'fighting_spirit') && raw > 0) {
        const lv = run.cardLevels?.['fighting_spirit'] ?? 1
        const maxStacks = lv >= 3 ? 3 : 2
        setFightingSpiritStacks(s => Math.min(s + 1, maxStacks))
      }
      // 山王鐵砧: 受到攻擊後獲得護盾（每回合最多3次）
      if (hasRelic(run.relics, 'anvil_king') && anvHitCount < 3) {
        const anvilShield = getOwnedRelicEffect(run.relics, run.relicLevels, 'anvil_king')?.anvilKingShield ?? 6
        setGuardBonus(g => g + anvilShield)
        setAnvHitCount(c => c + 1)
        addLog(`山王鐵砧：受擊護盾 +${anvilShield}`)
      }
      if (hasLeg('armor_thorns')) {
        const thorns = Math.round(raw * 0.3)
        setEnemyHp(h => Math.max(0, h - thorns))
        addLog(`荊棘之甲：反彈 ${thorns} 傷害`)
      }
      // 反震：受到攻擊時反彈 N 固定傷害
      if (eqBonus.thornsDmg > 0 && rawBeforeShield > 0) {
        setEnemyHp(h => Math.max(0, h - eqBonus.thornsDmg))
        addLog(`反震：反彈 ${eqBonus.thornsDmg} 傷害`)
      }
      if (hasLeg('armor_retaliate') && raw > 0) {
        setRetaliateBonus(b => b + 18)
        addLog('復仇護甲：受擊蓄積 +18 反擊')
      }
      if (hasLeg('armor_vengeance') && raw > 0) {
        setVengeanceStack(s => Math.min(s + 4, 20))
        addLog('怒火護甲：受擊蓄怒，攻擊 +4（永久）')
      }
      if (hasLeg('acc_pain_convert') && raw > 0) {
        setPainConvertBonus(15)
        addLog('痛苦轉化：下次出手 +15！')
      }
      // 矮人：鐵砧反擊 — 受攻後蓄積下次攻擊 +N
      if (eqBonus.hammerCounter > 0 && raw > 0) {
        setHammerCounterBonus(b => b + eqBonus.hammerCounter)
        addLog(`鐵砧反擊：蓄積反擊 +${eqBonus.hammerCounter}`)
      }
      // Talent: tank_stack (hammer awakening)
      talP('tank_stack').forEach(p => {
        const cap = p.value * 8
        setTankStackBonus(b => Math.min(b + p.value, cap))
      })
      // 淨化：每場首次負面狀態免疫（本次 callback 只阻擋一次）
      let cleanseAvail = eqBonus.cleanseOnce && !cleanseOnceUsed
      const consumeCleanse = (statusName: string) => {
        cleanseAvail = false
        setCleanseOnceUsed(true)
        addLog(`✨ 淨化：${statusName}被免疫！`)
      }
      // Goblin: apply poison to hero on each attack (min 1HP, non-lethal)
      if (isGoblin) {
        if (cleanseAvail) { consumeCleanse('哥布林毒刃') }
        else { setHeroPoisonStacks(s => Math.min(s + 2, 8)); addLog('🐸 哥布林毒刃：你中毒 +2 層！') }
      }
      // 霜咬: apply frost stacks on every attack (even if shielded)
      if (isWolf) {
        if (cleanseAvail) { consumeCleanse('霜咬') }
        else { const newStacks = Math.min(wolfFrostStacks + 1, 2); setWolfFrostStacks(newStacks); addLog(`❄️ 霜咬：${newStacks} 層霜凍，重骰上限 -${newStacks}`) }
      }
      // 嗜血燃焰: gain ATK stack only on successful damage
      if (isHound && raw > 0 && houndEnrageStacks < 3) {
        setHoundEnrageStacks(s => Math.min(s + 1, 3))
        addLog(`🔥 嗜血燃焰：炎獄魔犬蓄勢！攻擊力 +8%（${Math.min(houndEnrageStacks + 1, 3)} 層）`)
      }
      // 惑心詛咒: 40% chance to debuff player's next attack
      if (isSorceress && Math.random() < 0.4) {
        if (cleanseAvail) { consumeCleanse('惑心詛咒') }
        else { setSorceressDebuff(true); addLog('💫 惑心詛咒：你下次出手傷害 -30%！') }
      }
      // 毒刺詞墜：攻擊時附加中毒
      const poisonStingAffix = getAffix('poison_sting')
      if (poisonStingAffix) {
        if (cleanseAvail) { consumeCleanse('毒刺') }
        else { setAffixHeroPoison(s => s + poisonStingAffix.value); addLog(`☠ 毒刺：你中毒 +${poisonStingAffix.value} 層！`) }
      }
      // ── 黑潮王座：攻擊後特殊效果 ─────────────────────────────────────────
      if (isBlackTide) {
        // 溺亡王庭士兵：每次攻擊消耗玩家 1 點氧氣
        if (isDrownedCourtSoldier) {
          setOxygenLevel(o => Math.max(0, o - 1))
          addLog('溺水詛咒：士兵的攻擊消耗你 1 點氧氣！')
        }
        // 沉冠海巫：每次攻擊蓄積 1 法力（滿 3 時下回合全力攻擊，已在 witchFullMult 處理）
        if (isSunkenCrownWitch) {
          setWitchManaStacks(s => {
            const next = s >= 3 ? 0 : s + 1  // reset after full attack consumed
            if (s >= 3) addLog('破冠回響：海巫法力耗盡，回到蓄積狀態！')
            else if (next === 3) addLog(`⚠️ 海巫蓄力滿！下回合發動全力攻擊！（法力 ${next}/3）`)
            else addLog(`🌊 海巫蓄力：法力 ${next}/3`)
            return next
          })
        }
        // 潮汐王：每次攻擊根據當前血條施加特效
        if (isTideKingAusrein) {
          if (tideKingBarRef.current === 1 && raw > 0) {
            // 海王凝視：隨機鎖定一顆骰子
            const lockIdx = Math.floor(Math.random() * 5)
            setLockedDieIdx(lockIdx)
            addLog(`海王凝視：潮汐王鎖定骰子 ${lockIdx + 1}！`)
          }
          if (tideKingBarRef.current === 3) {
            // 王之殘響：每次攻擊後回復 20 HP
            setEnemyHp(h => Math.min(h + 20, TIDE_KING_BAR_HP))
            addLog('王之殘響：潮汐王回復 20 HP！')
          }
        }
      }
    }, 300)

    window.setTimeout(() => {
      // Apply revival side effects after updater has run
      switch (revivalDecisionRef.current) {
        case 'hourglass':
          setRelicReviveUsed(true)
          addLog(`逆轉沙漏：死而復生！回復 ${revivalHpRef.current} HP`)
          break
        case 'undying':
          setUndyingUsed(true)
          addLog('不死之魂觸發！HP 回復至 1')
          break
        case 'armor':
          setEquipUndyingUsed(true)
          addLog(`不死之甲：逆境重生！回復 ${revivalHpRef.current} HP`)
          break
        case 'lifeRecover':
          setLifeRecoverOnceUsed(true)
          addLog(`回魂：HP 跌破 30%，回復 ${eqBonus.lifeRecoverOnce} HP！`)
          break
        case 'rebirth':
          setRebirthUsed(true)
          addLog('涅槃護符：瀕危逆轉！回復 40 HP！')
          break
      }
      setHeroAnim('idle')
      setEnemyAnim('idle')

      if (heroDeadRef.current) {
        playSound('defeat')
        addLog('你被擊倒了...')
        setPhase('done')
        window.setTimeout(() => onComplete({ won: false, goldEarned: 0, newHeroHp: 0, potionsLeft: potionsRef.current, undyingUsed, hourglassUsed: relicReviveUsed, equipUndyingUsed, turnsUsed: battleTurnCountRef.current, diceComboScore: diceComboScoreRef.current }), 800)
        return
      }
      // ── 灰燼聖約：敵人特殊效果（攻擊後觸發，raw 在此可用）──────────────────
      if (isAshCovenant && raw > 0) {
        // 聖約殘焰：攻擊後附帶餘燼灼燒
        if (isCovenantEmber) {
          setHeroHp(h => Math.max(1, h - 3))
          addLog('🔥 餘火撲擊：聖約殘焰附帶餘燼灼燒 -3 HP！')
        }
        // 王血祭徒：施加王血烙印（聖約進度+5）
        if (isRoyalBloodDisciple) {
          setCovenantProgress(p => Math.min(p + 5, covenantEventBuff?.covenantMaxLimit ?? 100))
          addLog('💀 王血烙印：聖約進度 +5！')
        }
        // 萬民怨魂：使一顆骰子下回合 -1
        if (isMassResentment) {
          ashJudgmentDiceDebuffRef.current = true
          addLog('👻 怨火低語：你的骰子在怨恨中顫抖！下回合一顆骰子 -1！')
        }
        // 王冠祭司・塞羅恩：第二形態攻擊後聖約進度 +15 + 召喚小怪
        if (isCrownPriestSeron && seron2ndPhase && Math.random() < 0.5) {
          setCovenantProgress(p => Math.min(p + 15, covenantEventBuff?.covenantMaxLimit ?? 100))
          addLog('🔱 祭火召喚：塞羅恩強化聖約！進度 +15！')
          if (minions.length === 0) {
            spawnMinions([{ name: '聖約殘焰', hp: 80, atk: 20, def: 3, enemyId: 'covenant_ember' }])
          }
        }
      }
      // ── 小怪攻擊：每隻小怪各自攻擊玩家 ───────────────────────────────────────
      if (minions.length > 0) {
        minions.filter(m => !m.dying).forEach(m => {
          const mAtk = laonSoloPowerRef.current ? Math.round(m.atk * 1.5) : m.atk
          const dmg = Math.max(0, mAtk - hero.def - extraDef)
          if (dmg > 0) {
            setHeroHp(h => Math.max(1, h - dmg))
            tookDamageRef.current = true
            addLog(`⚔️ ${m.name} 攻擊：造成 ${dmg} 傷害`)
          } else {
            addLog(`⚔️ ${m.name} 攻擊：被格擋！`)
          }
        })
      }
      doStartNextTurn()
    }, 900)
  }

  const doStartNextTurn = () => {
    fateDieUsesRef.current = 0  // 命運骰每回合重置
    // ── 皇家公主：絕對護衛 護盾存活判定 ─────────────────────────────────
    if (barrierActivatedRef.current) {
      barrierActivatedRef.current = false
      if (guardBonus > 0) {
        setBarrierBonusNext(true)
        addLog('絕對護衛：護盾存活，下回合傷害 +20%！')
      }
    }
    // ── Per-enemy turn-start effects ─────────────────────────────────────
    // 再生詞墜：敵人每回合回復 HP
    const regenAffix = getAffix('regen')
    if (regenAffix) {
      setEnemyHp(h => Math.min(h + regenAffix.value, enemy.hp))
      addLog(`🔄 再生：${enemy.name} 回復 ${regenAffix.value} HP`)
    }
    // 免疫詞墜：倒數
    if (enemyImmuneRef.current > 0) {
      enemyImmuneRef.current = Math.max(0, enemyImmuneRef.current - 1)
      if (enemyImmuneRef.current === 0) addLog(`🛡 免疫解除：${enemy.name} 現在可被燃燒/凍結！`)
    }
    // 毒刺詞墜：玩家中毒tick
    if (affixHeroPoison > 0) {
      setHeroHp(h => Math.max(1, h - affixHeroPoison))
      addLog(`☠ 毒刺餘毒：受到 ${affixHeroPoison} 中毒傷害`)
    }
    // Goblin: hero poison tick (non-lethal, minimum 1 HP)
    if (isGoblin && heroPoisonStacks > 0) {
      setHeroHp(h => Math.max(1, h - heroPoisonStacks))
      setHeroPoisonStacks(s => Math.max(0, s - 1))
      addLog(`🐸 毒刃餘毒：受到 ${heroPoisonStacks} 中毒傷害（剩 ${Math.max(0, heroPoisonStacks - 1)} 層）`)
    }
    // Orc: increment rage counter (cycles 0→1→2→rage→0)
    if (isOrc) setOrcRageTurn(t => (t + 1) % 3)
    // Slime King: regenerate HP
    if (isSlime) {
      setEnemyHp(h => Math.min(h + 12, enemy.hp))
      addLog('🟢 史萊姆王：黏液再生 +12 HP')
    }
    // Lightning Lancer: if player rerolled too much, boost enemy intent next turn
    if (isLancer && turnRerolls >= 3) {
      const bonus = (turnRerolls - 2) * 15
      setEnemyIntent(i => i + bonus)
      addLog(`⚡ 落雷追蹤：玩家重骰 ${turnRerolls} 次，追加 +${bonus} 雷擊！`)
    }
    // 霜咬: decay frost stacks each turn
    if (isWolf && wolfFrostStacks > 0) {
      const nextFrost = Math.max(0, wolfFrostStacks - 1)
      setWolfFrostStacks(nextFrost)
      if (nextFrost > 0) addLog(`❄️ 霜凍消退：剩餘 ${nextFrost} 層`)
      else addLog('❄️ 霜凍解除：重骰上限恢復正常')
    }
    // 冰震衝擊: increment turn counter, warn one turn before shield break
    if (isYeti) {
      const newYetiTurn = yetiTurn + 1
      setYetiTurn(newYetiTurn)
      if (newYetiTurn % 3 === 2) addLog('⚠️ 雪原巨怪蓄勢！下回合攻擊完全無視護盾！')
    }

    // ── 灰燼聖約：聖約進度觸發 ──────────────────────────────────────────────
    if (isAshCovenant) {
      // 殘王敕令事件buff：開場召喚聖約殘焰
      if (covenantEventBuff?.startCovenantEmber && battleTurn === 0 && minions.length === 0) {
        spawnMinions([{ name: '聖約殘焰', hp: 80, atk: 20, def: 3, enemyId: 'covenant_ember' }])
        addLog('🔱 殘王敕令：戰鬥開始，聖約殘焰現身！')
      }
      // 灰燼殘王：第二/三形態每 4 回合定期召喚聖約殘焰
      if (isAshFallenKing && ashFallenKingBar >= 2 && battleTurn > 0 && battleTurn % 4 === 0 && minions.length === 0) {
        spawnMinions([{ name: '聖約殘焰', hp: 80, atk: 20, def: 3, enemyId: 'covenant_ember' }])
        addLog('🔥 王魂召喚：灰燼殘王引燃聖約之火，殘焰現身！')
      }
      const limit = covenantEventBuff?.covenantMaxLimit ?? 100
      if (covenantProgress >= limit) {
        judgmentCountRef.current++
        // 灰燼審判觸發
        const judgeDmgMult = covenantEventBuff?.ashJudgmentDmgMult ?? 1.0
        let judgeDmg = Math.round(30 * judgeDmgMult)
        // 遺物/裝備：審判傷害減免
        const vowStonePct = getOwnedRelicEffect(run.relics, run.relicLevels, 'vow_stone')?.covenantBurstDmgReduce ?? 0
        const equipSuppressPct = eqBonus.covenantSuppressPct ?? 0
        const set4SuppressPct = eqBonus.covenantSet2pc ? 0 : (eqBonus.legendaryEffects.includes('covenant_4pc') ? 25 : 0)
        const totalSuppressPct = Math.min(90, vowStonePct + equipSuppressPct + set4SuppressPct)
        // 傳奇：灰燼審判杖 — 審判傷害對分：敵方受20真傷，英雄承受15傷害（可被抑制詞綴減免）
        if (eqBonus.legendaryEffects.includes('ash_judgment_reversal')) {
          setEnemyHp(h => Math.max(0, h - 20))
          const reversalHeroDmg = Math.round(15 * (1 - totalSuppressPct / 100))
          if (reversalHeroDmg > 0) setHeroHp(h => Math.max(1, h - reversalHeroDmg))
          if (totalSuppressPct > 0) addLog(`🛡️ 審判護盾：傷害 -${totalSuppressPct}%（15→${reversalHeroDmg}）`)
          judgeDmg = reversalHeroDmg
          addLog(`灰燼審判杖：聖約審判能量對分！敵方受 20 真實傷害${reversalHeroDmg > 0 ? `，英雄受 ${reversalHeroDmg} 傷害` : '，英雄免受傷'}！`)
        } else {
          const reducedDmg = totalSuppressPct > 0 ? Math.round(judgeDmg * (1 - totalSuppressPct / 100)) : judgeDmg
          setHeroHp(h => Math.max(1, h - reducedDmg))
          if (totalSuppressPct > 0) addLog(`🛡️ 審判護盾：傷害 -${totalSuppressPct}%（${judgeDmg}→${reducedDmg}）`)
          judgeDmg = reducedDmg
        }
        setEnemyStatus(s => addStack(s, 'burn', 2, 'add'))
        setEnemyShield(s => s + 20)
        const postJudgmentReset = (isAshFallenKing && ashFallenKingBarRef.current >= 3) ? 40 : 30
        setCovenantProgress(postJudgmentReset)
        ashJudgmentDiceDebuffRef.current = true
        if (judgeDmg > 0) addLog(`⚖️ 灰燼審判：聖約進度滿溢！受 ${judgeDmg} 傷害，敵方 +2 燃燒 +20 護盾，下回合骰子 -1！`)
        else addLog('⚖️ 灰燼審判：聖約進度滿溢！敵方 +2 燃燒 +20 護盾，下回合骰子 -1！')
        // 遺物後效：回復HP
        const relicAshPendantHeal = getOwnedRelicEffect(run.relics, run.relicLevels, 'ash_pendant')?.covenantBurstHeal ?? 0
        const legendarySwordHeal = eqBonus.legendaryEffects.includes('covenant_sword') ? 15 : 0
        const totalBurstHeal = relicAshPendantHeal + legendarySwordHeal
        if (totalBurstHeal > 0) {
          setHeroHp(h => Math.min(h + totalBurstHeal, activeMember.maxHp))
          addLog(`💚 審判後回復：+${totalBurstHeal} HP`)
        }
        // 遺物後效：護盾
        const relicKingsShield = getOwnedRelicEffect(run.relics, run.relicLevels, 'ashen_kings_trophy')?.covenantBurstShieldBonus ?? 0
        const equipBurstShield = eqBonus.covenantBurstShield ?? 0
        const totalBurstShield = relicKingsShield + equipBurstShield
        if (totalBurstShield > 0) {
          setGuardBonus(s => s + totalBurstShield)
          addLog(`🛡️ 審判護盾：+${totalBurstShield} 護盾`)
        }
        // 遺物後效：永久攻擊加成（聖約封印 + 套裝4件）
        const relicSealBonus = getOwnedRelicEffect(run.relics, run.relicLevels, 'covenant_seal')?.covenantBurstAtkBonus ?? 0
        const set4AtkBonus = eqBonus.legendaryEffects.includes('covenant_4pc') ? 8 : 0
        const burstAtkGain = relicSealBonus + set4AtkBonus
        if (burstAtkGain > 0) {
          setCovenantBurstAtkTotal(prev => {
            const next = Math.min(prev + burstAtkGain, 32)
            if (next > prev) addLog(`⚡ 審判強化：本場攻擊永久 +${next - prev}（總計 +${next}）`)
            return next
          })
        }
      } else if (covenantProgress >= 75) {
        addLog(`⚖️ 聖約重壓（${covenantProgress}）：危險！治療效果降低！`)
      } else if (covenantProgress >= 50) {
        addLog(`🔱 聖約蓄力（${covenantProgress}）：敵方攻擊增強！`)
      }
      // 聖約守衛：每 3 回合獲得護盾
      if (isCovenantGuard) {
        const newCD = covenantGuardShieldCD > 0 ? covenantGuardShieldCD - 1 : 0
        setCovenantGuardShieldCD(newCD)
        if (newCD === 0) {
          setEnemyShield(s => s + 25)
          setCovenantGuardShieldCD(3)
          addLog('🛡 聖約守衛：祝聖護盾 +25！')
        }
      }
      // 王冠祭司・塞羅恩 HP<50%：進入第二形態
      if (isCrownPriestSeron && !seron2ndPhase && enemyHp <= Math.round(enemy.hp * 0.5)) {
        setSeron2ndPhase(true)
        setEnemyShield(s => s + 30)
        setCovenantProgress(p => Math.min(p + 20, limit))
        addLog('🔱 塞羅恩進入第二形態！護盾 +30，聖約進度 +20！')
      }
      // 灰燼審判者 HP<50%：召喚萬民怨魂＋聖約進度 +10
      if (isAshJudge && !ashJudgePhase2Ref.current && enemyHp <= Math.round(enemy.hp * 0.5)) {
        ashJudgePhase2Ref.current = true
        setCovenantProgress(p => Math.min(p + 10, limit))
        spawnMinions([{ name: '萬民怨魂', hp: 120, atk: 24, def: 2, enemyId: 'mass_resentment' }])
        addLog('👻 灰燼審判者：聖約最終審判！死靈現身！聖約進度 +10！')
      }
    }

    // 【機關技師 3★ 超頻機神匠】本回合重骰 3 次以上，過熱失去 3 HP
    if (talPFirst('star_overclock_cannon') && turnRerolls >= 3) {
      setHeroHp(h => Math.max(1, h - 3))
      addLog('⚙️ 超頻過熱：重骰過多，失去 3 HP')
    }

    // ── Relic turn-start effects ──────────────────────────────────────────
    // 毒牙之環: 敵人中毒時每回合蓄積攻擊力
    if (hasRelic(run.relics, 'poison_fang_ring') && enemyStatus.some(s => s.type === 'poison')) {
      const gain = getOwnedRelicEffect(run.relics, run.relicLevels, 'poison_fang_ring')?.poisonAtkPerTurn ?? 4
      setPoisonAtkStack(s => Math.min(s + gain, 15))
    }
    // 自動砲台: 每回合 N 傷害；上回合順子以上時雙倍
    if (hasRelic(run.relics, 'auto_turret')) {
      const turretBaseDmg = getOwnedRelicEffect(run.relics, run.relicLevels, 'auto_turret')?.autoTurretDmg ?? 8
      const isBoosted = lastCombo === '順子' || ['四條','葫蘆','五條'].includes(lastCombo)
      const turretDmg = isBoosted ? turretBaseDmg * 2 : turretBaseDmg
      setEnemyHp(h => Math.max(0, h - turretDmg))
      addLog(`自動砲台：${turretDmg} 傷害${isBoosted ? '（雙倍！）' : ''}`)
    }
    // Reset per-turn relic/card states
    setSongBonusUsed(false)
    setAnvHitCount(0)
    setFireExplosionUsed(false)
    // 聖騎士：聖盾迴響 — 護盾存在時每回合對敵 N 傷害
    if (eqBonus.slashShieldEcho > 0 && guardBonus > 0) {
      setEnemyHp(h => Math.max(0, h - eqBonus.slashShieldEcho))
      addLog(`聖盾迴響：護盾反射 ${eqBonus.slashShieldEcho} 傷害`)
    }
    // 安全閥：本回合未重骰時獲得護盾（turnRerolls 還沒重置前檢查）
    const noRerollShieldAmt = run.cards.reduce((s, c) => s + (c.effect.noRerollShield ?? 0), 0)
    if (noRerollShieldAmt > 0 && turnRerolls === 0) {
      setGuardBonus(g => g + noRerollShieldAmt)
      addLog(`安全閥：未重骰，+${noRerollShieldAmt} 護盾`)
    }

    // ── Curse: bleeding — 每回合開始失去當前 HP 的 1% ───────────────────
    const selfDmgPct = run.curses.reduce((s, id) => s + (getCurseById(id)?.effect.selfDmgPct ?? 0), 0)
    if (selfDmgPct > 0) {
      setHeroHp(h => {
        const dmg = Math.max(1, Math.round(h * selfDmgPct / 100))
        const next = Math.max(0, h - dmg)
        if (next <= 0) heroDeadRef.current = true
        return next
      })
      addLog(`🩸 流血詛咒：失去當前 HP 的 ${selfDmgPct}%`)
    }
    if (heroDeadRef.current) {
      addLog('你被擊倒了...')
      setPhase('done')
      window.setTimeout(() => onComplete({ won: false, goldEarned: 0, newHeroHp: 0, potionsLeft: potionsRef.current, undyingUsed, hourglassUsed: relicReviveUsed, equipUndyingUsed, turnsUsed: battleTurnCountRef.current, diceComboScore: diceComboScoreRef.current }), 800)
      return
    }

    setPhase('initial')   // useEffect will auto-roll for the new turn
    // Boss 每回合重新生成護盾（STS 機制：部分敵人每回合都有護甲值）
    if (bossStartShield > 0) {
      setEnemyShield(bossStartShield)
      addLog(`${enemy.name} 重新獲得 ${bossStartShield} 護盾！`)
    }
    setIsFirstAttack(true)
    setTauntReduce(0)   // 嘲諷僅持續一回合
    // Refresh enemy intent for the upcoming attack (lancer bonus already applied above)
    if (!isLancer || turnRerolls < 3) setEnemyIntent(enemy.atk + Math.floor(Math.random() * 6))
    // Decay turn-based statuses (vulnerable)
    setEnemyStatus(s => decayTurnStatuses(s))
    if (bonusRerollTurns > 0) setBonusRerollTurns(t => t - 1)
    if (golemArmorLeft > 0) {
      setGolemArmorLeft(a => a - 1)
      if (golemArmorLeft === 1) addLog('石甲崩裂！護甲消失，石巨人現出破綻！')
    }

    // ── Boss phase transitions ────────────────────────────────────────────
    if (isBoss) {
      const hpPct = enemyHp / (isEclipseBishop ? (bishopBarRef.current === 2 ? BISHOP_BAR2_HP : enemy.hp) : enemy.hp)
      const newPhase = isEclipseBishop
        ? (bishopBarRef.current === 2 ? 3 : (hpPct < 0.60 ? 2 : 1))
        : (hpPct < 0.30 ? 3 : hpPct < 0.60 ? 2 : 1)
      if (newPhase > bossPhase) {
        setBossPhase(newPhase)
        if (!isEclipseBishop) {
          if (newPhase === 2) addLog(`💢 ${enemy.name} 激怒！攻擊力提升 ×1.25！`)
          if (newPhase === 3) addLog(`💀 ${enemy.name} 瀕死狂化！攻擊力大幅提升 ×1.5！`)
        }
      }
      // Phase 2: dragon starts applying burn each turn
      if (isScramble && newPhase >= 2) {
        setEnemyStatus(s => addStack(s, 'burn', 0, 'add'))  // placeholder; burn on hero not supported
        setEnemyHp(h => h)  // no-op placeholder
        // Dragon phase 2: enemy intent +20%
      }
      // Phase 3: dark knight counter increases

      // ── 星蝕主教三階段 ──────────────────────────────────────────────────
      if (isEclipseBishop) {
        setBishopTurnCount(t => t + 1)
        if (newPhase === 2 && bossPhase < 2) {
          // 第二階段：新增第二個禁忌點數
          setForbiddenDiceState(prev => {
            if (prev.length >= 2) return prev
            let second = Math.floor(Math.random() * 6) + 1
            while (prev.includes(second)) second = (second % 6) + 1
            const next = [...prev, second]
            addLog(`⚠️ 雙重禁忌：禁忌點數變為 ${next.join('・')}！`)
            return next
          })
        }
        if (newPhase === 3 && bossPhase < 3) {
          addLog('💀 星蝕審判：每 3 回合審判！')
        }
        // 第二血條：每 5 回合暴露破綻（玩家下次攻擊 ×1.5）
        if (bossPhase >= 3 && bishopTurnCount > 0 && bishopTurnCount % 5 === 0) {
          setBishopWeakActive(true)
          addLog('⚡ 星蝕主教暴露破綻！下次攻擊傷害 ×1.5！')
        }
        // 第三階段審判（每 3 回合）
        if (bossPhase >= 3 && bishopTurnCount > 0 && bishopTurnCount % 3 === 0) {
          if (lastAttackHadForbidden) {
            // 簡化：含禁忌就重傷（不區分 3 顆，因為 forbidCount 在 doAttack 作用域）
            setHeroHp(h => Math.max(0, h - 20))
            tookDamageRef.current = true
            addLog(`審判！含禁忌點數：受到 20 傷害`)
          } else {
            setEnemyHp(h => Math.max(0, h - 30))
            addLog('審判！淨骰！主教受到 30 真實傷害！')
          }
        }
        // 第一階段宣告（每 2 回合更換禁忌）
        if (bossPhase === 1 && bishopTurnCount > 0 && bishopTurnCount % 2 === 0) {
          const newForbidden = Math.floor(Math.random() * 6) + 1
          setForbiddenDiceState([newForbidden])
          addLog(`禁忌宣告：新禁忌點數為 ${newForbidden}！`)
        }
      }
    }

    // ── 星蝕裂隙普通/精英敵人特殊邏輯 ──────────────────────────────────────
    // 裂隙小鬼：每回合 30% 機率改變禁忌點數
    if (isRiftImp && forbiddenDiceState.length > 0 && Math.random() < 0.3) {
      const newNum = Math.floor(Math.random() * 6) + 1
      setForbiddenDiceState([newNum])
      addLog(`裂隙干擾：禁忌點數突然改變為 ${newNum}！`)
    }
    // 星蝕修女：每 2 回合回復
    if (isEclipseNun) {
      const newNunTurn = eclipseNunTurn + 1
      setEclipseNunTurn(newNunTurn)
      if (newNunTurn % 2 === 0) {
        const nunHeal = 25 + (lastAttackHadForbidden ? 15 : 0)
        setEnemyHp(h => Math.min(h + nunHeal, enemy.hp))
        addLog(`暗月禱告：星蝕修女回復 ${nunHeal} HP${lastAttackHadForbidden ? '（禁忌加成）' : ''}`)
      }
    }
    // ── 冰霜女巫：寒意值累積 ────────────────────────────────────────────────
    if (isWitch) {
      const newChill = witchChill + 1
      if (newChill >= 5) {
        const iceDmg = Math.round(enemy.atk * 2)
        setHeroHp(h => Math.max(0, h - iceDmg))
        tookDamageRef.current = true
        addLog(`❄️❄️ 冰封！寒意爆發，受到 ${iceDmg} 傷害！寒意歸零`)
        setWitchChill(0)
      } else {
        setWitchChill(newChill)
        const hint = newChill >= 4 ? '（傷害 -10%、重骰 -1）'
                   : newChill >= 3 ? '（傷害 -10%）' : ''
        addLog(`❄️ 寒意：${newChill} 層${hint}`)
      }
    }
    // ── 裂隙前兆篇 周期機制 ──────────────────────────────────────────────────
    {
      const nextTurn = riftOmenTurn + 1
      setRiftOmenTurn(nextTurn)
      // 裂隙巡哨/星砂巨獸: 每2回合設定不穩定點數
      if ((isRiftScout || isSandBeast) && nextTurn % 2 === 0) {
        const num = Math.floor(Math.random() * 6) + 1
        setRiftUnstableNum(num)
        addLog(`不穩定骰紋：指定不穩定點數 ${num}`)
      }
      // 月光術士: 每3回合施加-15%詛咒
      if (isMoonMage && nextTurn % 3 === 0) {
        setMoonMageDebuff(true)
        addLog('月光術士：月光詛咒！下回合攻擊 -15%')
      }
      // 暗月信徒/裂隙祈禱者/黑月裁決者: 每2回合指定禁忌點數
      if ((isDarkDevotee || isRiftPraying || isBlackJudge) && nextTurn % 2 === 0) {
        const num = Math.floor(Math.random() * 6) + 1
        setRiftUnstableNum(num)
        addLog(`禁忌宣告：指定禁忌點數 ${num}`)
      }
      // 暗月祭司: 每2回合指定禁忌+祝福點數
      if (isDarkShaman && nextTurn % 2 === 0) {
        const forbidden = Math.floor(Math.random() * 6) + 1
        let blessed = Math.floor(Math.random() * 6) + 1
        while (blessed === forbidden) blessed = (blessed % 6) + 1
        setRiftUnstableNum(forbidden)
        setRiftBlessedNum(blessed)
        addLog(`雙骰審判：禁忌 ${forbidden}，祝福 ${blessed}`)
      }
      // 星砂巨獸: 每3回合獲得20護盾
      if (isSandBeast && nextTurn % 3 === 0) {
        setEnemyShield(s => s + 20)
        addLog('星砂外殼：星砂巨獸獲得 20 護盾！')
      }
      // 暗月主教・前哨形態: 第一階段每2回合禁忌宣告
      if (isBishopVanguard && !bvPhase2 && nextTurn % 2 === 0) {
        const num = Math.floor(Math.random() * 6) + 1
        setRiftUnstableNum(num)
        addLog(`暗月宣告：禁忌點數 ${num}`)
      }
      // 暗月主教・前哨形態: 第二階段每2回合禁忌+祝福
      if (isBishopVanguard && bvPhase2 && nextTurn % 2 === 0) {
        const forbidden = Math.floor(Math.random() * 6) + 1
        const blessed = (forbidden % 6) + 1
        setRiftUnstableNum(forbidden)
        setRiftBlessedNum(blessed)
        addLog(`雙骰審判：禁忌 ${forbidden}，祝福 ${blessed}`)
      }
      // 暗月主教・前哨形態: HP<20%→裂隙門倒數
      if (isBishopVanguard && enemyHp <= enemy.hp * 0.2 && bvRiftGate === 0) {
        setBvRiftGate(3)
        addLog('⚠️ 裂隙門扉：裂隙門開啟！3 回合後強化攻擊！')
      }
      if (isBishopVanguard && bvRiftGate > 0) {
        setBvRiftGate(g => {
          const next = g - 1
          if (next <= 0) addLog('⚠️ 裂隙門扉：裂隙門爆發！攻擊大幅強化！')
          else addLog(`裂隙門扉：${next} 回合後爆發`)
          return next
        })
      }
    }

    // 星界收割者：每 4 回合大攻擊倒數
    if (isStarReaper) {
      const newCountdown = starReaperCountdown - 1
      setStarReaperCountdown(newCountdown)
      if (newCountdown <= 0) {
        // 預設下回合 intent 翻倍，供 intent 顯示警示；實際 log 在 doEnemyAttack 觸發
        setEnemyIntent(i => i * 2)
        starReaperBigAttackRef.current = true
        setStarReaperCountdown(4)
        addLog('⚠️ 收割倒數：下回合星界收割者發動終末大攻擊！')
      }
    }

    // ── 燃燒王座敵人特殊邏輯 ─────────────────────────────────────────────────
    if (isBurningThrone) {
      const btTurn = riftOmenTurn  // reuse riftOmenTurn as general turn counter
      // 熔甲衛兵：魔焰≥3 獲得護盾；魔焰≥5 護盾加倍
      if (isMoltenGuard && infernalFlame >= 3) {
        const shieldGain = infernalFlame >= 5 ? 28 : 14
        setEnemyShield(s => s + shieldGain)
        addLog(`熔甲：熔甲衛兵獲得 ${shieldGain} 護盾${infernalFlame >= 5 ? '（加倍！）' : ''}`)
      }
      // 灰燼術士：每 3 回合施加灰燼詛咒
      if (isAshMage && btTurn > 0 && btTurn % 3 === 0) {
        setAshMageCurseActive(true)
        setAshMageCursedTurn(btTurn)
        addLog(`灰燼詛咒：下一次治療效果${infernalFlame >= 5 ? '完全無效（魔焰 5+）' : '降低 50%'}！`)
      }
      // 煉獄魔犬：魔焰≥5 追加一次小攻擊
      if (isInfernoHound && infernalFlame >= 5) {
        const extraDmg = Math.max(0, Math.round(enemy.atk * 0.4) - hero.def)
        if (extraDmg > 0) {
          setHeroHp(h => Math.max(1, h - extraDmg))
          tookDamageRef.current = true
          addLog(`聞火追獵：追加小攻擊 ${extraDmg} 傷害！`)
        }
      }
      // 黑焰騎士：燃魂鎧甲 — 魔焰≥4 受到傷害 -20%（在 doEnemyAttack 已透過 flameCollapseMult 處理，這裡標記狀態）
      // 墮落炎祭司：每 4 回合火祭儀式
      if (isFallenFirePriest && btTurn > 0 && btTurn % 4 === 0) {
        if (infernalFlame >= 4) {
          const ritualDmg = Math.max(0, Math.round(enemy.atk * 1.5) - hero.def)
          setHeroHp(h => Math.max(1, h - ritualDmg))
          tookDamageRef.current = true
          setEnemyShield(s => s + 20)
          addLog(`🔥 火祭儀式！造成 ${ritualDmg} 火焰傷害，敵人獲得 20 護盾！`)
        } else {
          setPriestRitualCountdown(4)
          addLog('⚠️ 火祭儀式準備中…（魔焰 4+ 才會觸發）')
        }
      }
      if (isFallenFirePriest && btTurn > 0 && btTurn % 4 === 3) {
        addLog('⚠️ 墮落炎祭司：下回合火祭儀式！打出兩對以上可延後！')
      }
      // 焰獄魔王：第一階段每回合魔焰 +1；第三階段每回合崩壞 +1
      if (isThroneDemonKing) {
        if (bossPhase === 1) {
          setInfernalFlame(f => Math.min(f + 1, INFERNAL_FLAME_MAX))
          addLog('王座餘火：魔焰 +1！')
        }
        if (bossPhase >= 3) {
          const newStacks = Math.min(throneCollapseStacks + 1, 5)
          setThroneCollapseStacks(newStacks)
          addLog(`王座崩壞：累積 ${newStacks} 層（每層傷害 +8%，最多 5 層）`)
        }
        // 第二階段：燃魂契約 — 玩家高傷時 +10% 傷害但魔焰 +1（在 doAttack 已處理）
        if (bossPhase === 2 && bossPhase > 1) addLog('燃魂契約：高傷觸發魔焰 +1...')
      }
      // 灰燼肺詛咒計數
      if (backlashHealPenaltyTurns > 0) setBacklashHealPenaltyTurns(t => t - 1)
    }

    // ── 深海遺城篇：氧氣消耗 & 潮汐切換 & 深海敵人特殊邏輯 ──────────────────
    if (isDeepSea) {
      // ── 氧氣 -1 per turn
      const nextOxy = Math.max(0, oxygenLevel - 1)
      setOxygenLevel(nextOxy)
      if (nextOxy === 0) {
        oxygenHitZeroRef.current = true
        const drowningDmg = Math.max(1, Math.round(activeMember.maxHp * 0.08))
        setHeroHp(h => Math.max(0, h - drowningDmg))
        tookDamageRef.current = true
        addLog(`🫧 溺水傷害：氧氣耗盡！受到 ${drowningDmg} 傷害！`)
      } else if (nextOxy === 1) {
        addLog('⚠️ 氧氣：僅剩 1 格！下回合將溺水！')
      }
      // 深淵鮟鱇：每回合氧氣額外 -1
      if (isAnglerfish) {
        setOxygenLevel(o => Math.max(0, o - 1))
        addLog('深淵誘光：鮟鱇消耗額外 1 點氧氣！')
      }
      // 海淵女祭司：每 2 回合扣 1 氧氣
      const nextPriestTurn = seaPriestessDrainTurn + 1
      setSeaPriestessDrainTurn(nextPriestTurn)
      if (isSeaPriestess && nextPriestTurn % 2 === 0) {
        setOxygenLevel(o => Math.max(0, o - 1))
        addLog('溺亡詛咒：祭司奪走 1 點氧氣！')
      }
      // 深淵歌姬：每 2 回合扣 1 氧氣
      if (isAbyssSiren && nextPriestTurn % 2 === 0) {
        setOxygenLevel(o => Math.max(0, o - 1))
        addLog('海妖之歌：歌聲耗盡 1 點氧氣！')
      }
      // 潮汐食人魚：玩家氧氣降低時追加小攻擊
      if (isTidePiranha && nextOxy < oxygenLevel) {
        const biteDmg = Math.max(0, Math.round(baseEnemy.atk * 0.4) - hero.def)
        if (biteDmg > 0) {
          setHeroHp(h => Math.max(1, h - biteDmg))
          tookDamageRef.current = true
          addLog(`迅猛撕咬：食人魚趁虛而入！追加 ${biteDmg} 傷害！`)
        }
      }
      // 海皇王后：玩家氧氣歸零時回復 40 HP
      if (isSeaQueen && nextOxy === 0) {
        setEnemyHp(h => Math.min(h + 40, enemy.hp))
        addLog('海皇賜福：玩家溺水！王后回復 40 HP！')
      }

      // ── 潮汐切換邏輯 ──────────────────────────────────────────────────
      const nextTideTurn = tideTurnCount + 1
      setTideTurnCount(nextTideTurn)
      const ch = run.chapter ?? 1
      // Ch1 固定漲潮（教學），無切換
      const tideFreq = (isSleepingEmperor && dsPhase >= 3) ? 1
        : (isSeaEmperorGuard || isSleepingEmperor) ? 2
        : ch >= 2 ? 3 : 0  // Ch1 no switching
      if (ch >= 2 && tideFreq > 0 && nextTideTurn % tideFreq === 0) {
        const TIDES: TideState[] = ['退潮', '漲潮', '深壓', '亂流']
        const curIdx = TIDES.indexOf(tideState)
        const nextIdx = (curIdx + 1) % TIDES.length
        const newTide = TIDES[nextIdx]
        setTideState(newTide)
        addLog(`🌊 潮汐切換：${tideState} → ${newTide}！`)
        // 漲潮切入時：敵人獲得護盾
        if (newTide === '漲潮') {
          const shieldAmt = isSeaEmperorGuard ? 15 : 10
          setEnemyShield(s => s + shieldAmt)
          addLog(`漲潮：${enemy.name} 獲得 ${shieldAmt} 護盾！`)
        }
        // 退潮切入：海皇禁衛 ATK+20%（handled via deepSeaTideMult in doEnemyAttack）
        if (newTide === '退潮' && isSeaEmperorGuard) addLog('退潮：海皇禁衛攻擊強化！')
      }

      // ── 沉眠海皇：三階段 ──────────────────────────────────────────────
      if (isSleepingEmperor) {
        const hpPct = enemyHp / enemy.hp
        const newDsPhase = hpPct < 0.30 ? 3 : hpPct < 0.60 ? 2 : 1
        if (newDsPhase > dsPhase) {
          setDsPhase(newDsPhase)
          if (newDsPhase === 2) {
            setTideState('深壓')
            addLog('💀 沉眠甦醒！第二階段：深壓+退潮複合效果！')
          }
          if (newDsPhase === 3) {
            addLog('💀 沉眠海皇狂化！第三階段：潮汐每回合切換，龍王波蓄勢！')
          }
        }
      }

      // ── 海皇禁衛：HP<50% 進入強化潮汐反制 ────────────────────────────
      if (isSeaEmperorGuard && !seaGuardPhase2 && enemyHp < enemy.hp * 0.5) {
        setSeaGuardPhase2(true)
        addLog('潮汐審判：海皇禁衛進入強化狀態！潮汐反制啟動！')
      }

      // ── 利維坦幼獸：HP<30% 狂化每回合+10% ATK ────────────────────────
      if (isLeviathanPup && enemyHp < enemy.hp * 0.3) {
        const newLev = Math.min(leviathanEnrage + 1, 4)
        setLeviathanEnrage(newLev)
        if (newLev <= 4) addLog(`深淵衝撞：利維坦狂化 ${newLev} 層！攻擊 +${newLev * 10}%！`)
      }

      // ── 珊瑚巨像：每 3 回合獲得護盾（覆用 riftOmenTurn 計數）
      if (isCoralColossus && riftOmenTurn > 0 && riftOmenTurn % 3 === 0) {
        setEnemyShield(s => s + 20)
        addLog('珊瑚護盾：珊瑚巨像獲得 20 護盾！（葫蘆以上可破除）')
      }

      // ── 深海槍兵：每 2 回合護盾減半
      if (isDeepLancer && riftOmenTurn > 0 && riftOmenTurn % 2 === 0 && guardBonus > 0) {
        setGuardBonus(g => Math.floor(g / 2))
        addLog('退潮長刺：深海槍兵斬裂護盾！護盾減半！')
      }
    }

    // ── 黑潮王座：氧氣消耗 & 潮汐切換 & 特殊敵人邏輯 ─────────────────────────
    if (isBlackTide) {
      // 氧氣 -1 per turn（潮汐王印：不自然消耗）
      const oxyNoDecay = hasRelic(run.relics, 'tidal_king_seal')
      const nextOxy = oxyNoDecay ? oxygenLevel : Math.max(0, oxygenLevel - 1)
      if (!oxyNoDecay) setOxygenLevel(nextOxy)
      const curOxyMax = oxygenMax > 0 ? oxygenMax : 5
      // 深淵窒息詛咒：額外 -1 氧氣
      const oxyExtraDecay = run.curses.reduce((s, id) => {
        const c = getCurseById(id); return s + (c?.effect.oxygenExtraDecay ?? 0)
      }, 0)
      if (oxyExtraDecay > 0) {
        setOxygenLevel(o => Math.max(0, o - oxyExtraDecay))
        addLog(`深淵窒息：額外消耗 ${oxyExtraDecay} 點氧氣！`)
      }
      const effectiveOxy = Math.max(0, nextOxy - oxyExtraDecay)
      if (effectiveOxy === 0) {
        oxygenHitZeroRef.current = true
        const drownCursePct = run.curses.reduce((s, id) => {
          const c = getCurseById(id); return Math.max(s, c?.effect.drownDmgPct ?? 0)
        }, 0)
        const drownPct = (drownCursePct > 0 ? drownCursePct : 10) / 100
        const drowningDmg = Math.max(1, Math.round(activeMember.maxHp * drownPct))
        setHeroHp(h => Math.max(0, h - drowningDmg))
        tookDamageRef.current = true
        addLog(`🫧 溺水傷害：氧氣耗盡！受到 ${drowningDmg} 傷害！`)
      } else if (effectiveOxy === 1) {
        addLog('⚠️ 氧氣：僅剩 1 格！下回合將溺水！')
      }
      // 氧氣護盾詞綴：每點氧氣獲得 N 護盾
      if (eqBonus.oxygenShield > 0 && nextOxy > 0) {
        const shieldGain = Math.min(nextOxy, curOxyMax) * eqBonus.oxygenShield
        setGuardBonus(g => g + shieldGain)
        addLog(`氧氣護盾：${nextOxy} 點氧氣，獲得 ${shieldGain} 護盾！`)
      }
      // 潮汐劍：漲潮時每回合獲得 8 護盾
      if (hasLeg('tide_blade') && tideState === '漲潮') {
        setGuardBonus(g => g + 8)
        addLog('潮汐劍：漲潮護盾 +8！')
      }

      // 潮汐切換：每 3 回合輪轉（黑潮無章節限制）；沉冠海巫與潮汐王有自己的切換邏輯
      const nextBTTurn = riftOmenTurn  // riftOmenTurn already incremented above
      if (!isSunkenCrownWitch && nextBTTurn > 0 && nextBTTurn % 3 === 0) {
        const TIDES: TideState[] = ['退潮', '漲潮', '深壓', '亂流']
        if (isTideKingAusrein && tideKingBar === 2) {
          // 潮汐王第二形態：亂流王令，隨機切換
          const curIdx = TIDES.indexOf(tideState)
          let nextIdx: number
          do { nextIdx = Math.floor(Math.random() * 4) } while (nextIdx === curIdx)
          const newTide = TIDES[nextIdx]
          setTideState(newTide)
          addLog(`🌊 亂流王令：強制切換 → ${newTide}！`)
        } else if (!isTideKingAusrein) {
          const curIdx = TIDES.indexOf(tideState)
          const nextTide = TIDES[(curIdx + 1) % 4]
          setTideState(nextTide)
          addLog(`🌊 潮汐切換：${tideState} → ${nextTide}！`)
          if (nextTide === '漲潮') {
            const tidalSurgeBonus = run.curses.reduce((s, id) => s + (getCurseById(id)?.effect.tidalSurgeShield ?? 0), 0)
            const shieldAmt = 10 + tidalSurgeBonus
            setEnemyShield(s => s + shieldAmt)
            addLog(`漲潮：${enemy.name} 獲得 ${shieldAmt} 護盾${tidalSurgeBonus > 0 ? `（怒潮洶湧 +${tidalSurgeBonus}）` : ''}！`)
          }
          // 潮汐珍珠遺物：潮汐切換回復 5 HP
          if (hasRelic(run.relics, 'tide_pearl')) {
            const healAmt = getOwnedRelicEffect(run.relics, run.relicLevels, 'tide_pearl')?.tideHealOnChange ?? 5
            setHeroHp(h => Math.min(h + healAmt, activeMember.maxHp))
            addLog(`潮汐珍珠：潮汐切換，回復 ${healAmt} HP！`)
          }
          // 深淵讚歌傳奇：潮汐切換 +12 HP
          if (hasLeg('abyss_hymn')) {
            setHeroHp(h => Math.min(h + 12, activeMember.maxHp))
            addLog('深淵讚歌：潮汐切換，+12 HP！')
          }
          // 深淵勇者4件套：潮汐切換 +12 護盾
          if (hasLeg('abyss_4pc')) {
            setGuardBonus(g => g + 12)
            addLog('深淵勇者4件：潮汐切換，+12 護盾！')
          }
        }
      }

      // 幽藍水母使：每 2 回合鎖定一顆骰子；亂流時再隨機換骰
      if (isAzureJellyfishEnvoy && riftOmenTurn > 0 && riftOmenTurn % 2 === 0) {
        const lockIdx = Math.floor(Math.random() * 5)
        setJellyfishLockedDie(lockIdx)
        addLog(`🪼 幽藍迷光：水母鎖定骰子 ${lockIdx + 1}！下回合無法重骰該骰！`)
        if (tideState === '亂流') {
          let extraIdx: number
          do { extraIdx = Math.floor(Math.random() * 5) } while (extraIdx === lockIdx)
          addLog(`亂流：額外干擾骰子 ${extraIdx + 1}！`)
        }
      } else if (isAzureJellyfishEnvoy) {
        setJellyfishLockedDie(-1)  // 非觸發回合解除鎖定
      }

      // 珊瑚禁衛長：每 3 回合獲得 25 護盾；冷卻倒計時
      if (isCoralGuardCaptain) {
        const newCooldown = Math.max(0, captainShieldCooldown - 1)
        setCaptainShieldCooldown(newCooldown)
        if (riftOmenTurn > 0 && riftOmenTurn % 3 === 0 && newCooldown === 0) {
          setEnemyShield(s => s + 25)
          addLog('珊瑚巨盾：珊瑚禁衛長獲得 25 護盾！（葫蘆以上可破除）')
          setCaptainShieldCooldown(3)
        }
      }

      // 深壓巨鰻：每 2 回合壓流電擊（鎖定一顆骰 + 額外 15 真實傷害）
      if (isDeepPressureEel) {
        const nextEelCd = eelShockCooldown - 1
        setEelShockCooldown(nextEelCd)
        if (nextEelCd <= 0) {
          const lockIdx = Math.floor(Math.random() * 5)
          setJellyfishLockedDie(lockIdx)  // 複用 jellyfish 鎖定機制
          const shockDmg = Math.max(0, 15 - guardBonus)
          setHeroHp(h => Math.max(1, h - shockDmg))
          tookDamageRef.current = true
          addLog(`⚡ 壓流電擊：巨鰻電擊骰子 ${lockIdx + 1}，造成 ${shockDmg} 傷害！`)
          setEelShockCooldown(2)
        }
      }

      // 沉冠海巫：每 2 回合強制切換潮汐（使用 riftOmenTurn % 2）
      if (isSunkenCrownWitch && riftOmenTurn > 0 && riftOmenTurn % 2 === 0) {
        const TIDES: TideState[] = ['退潮', '漲潮', '深壓', '亂流']
        const curIdx = TIDES.indexOf(tideState)
        let nextIdx: number
        do { nextIdx = Math.floor(Math.random() * 4) } while (nextIdx === curIdx)
        const newTide = TIDES[nextIdx]
        setTideState(newTide)
        addLog(`🌊 破冠回響：海巫強制潮汐切換 → ${newTide}！`)
      }

      // 潮汐王第三血條：王之殘響 — 每回合回復約 4% bar HP
      if (isTideKingAusrein && tideKingBarRef.current === 3) {
        const regenAmt = Math.max(5, Math.round(TIDE_KING_BAR_HP * 0.04))
        setEnemyHp(h => Math.min(h + regenAmt, TIDE_KING_BAR_HP))
        addLog(`王之殘響：潮汐王回復 ${regenAmt} HP！`)
      }
    }

    // 逆轉護符: 首次低於 30% HP → 護盾 + 本場永久攻擊
    if (!reversalUsed && heroHp > 0 && heroHp < activeMember.maxHp * 0.3) {
      const g = run.relics.reduce((s, id) => s + (getOwnedRelicEffect(run.relics, run.relicLevels, id)?.lowHpGuard ?? 0), 0)
      const permAtk = run.relics.reduce((s, id) => s + (getOwnedRelicEffect(run.relics, run.relicLevels, id)?.lowHpPermanentAtk ?? 0), 0)
      if (g > 0 || permAtk > 0) {
        setReversalUsed(true)
        if (g > 0) { setGuardBonus(gb => gb + g); addLog(`逆轉護符：危機觸發，+${g} 護盾`) }
        if (permAtk > 0) { setReversalAtkBonus(b => b + permAtk); addLog(`逆轉護符：本場傷害永久 +${permAtk}`) }
      }
    }

    // Potion regen tick
    if (regenTurns > 0) {
      setHeroHp(h => clamp(h + regenAmt, 0, activeMember.maxHp))
      setRegenTurns(t => t - 1)
      addLog(`🌿 再生：回復 ${regenAmt} HP（剩 ${regenTurns - 1} 回合）`)
    }

    // ── 灰燼王國篇・第二章：關卡機制 ─────────────────────────────────────────
    if (isAshKingdom) {
      const ak = ashKingdomTurn + 1
      setAshKingdomTurn(ak)

      // 第一章・王城餘燼：餘燼層數（每 3 回合 +1，上限 4）
      if (run.chapter === 1) {
        if (ak % 3 === 0 && emberStacks < 4) {
          const newEmber = Math.min(emberStacks + 1, 4)
          setEmberStacks(newEmber)
          addLog(`🔥 餘燼未熄：餘燼升至 ${newEmber} 層！`)
          if (newEmber >= 4 && isBoss) {
            setEnemyShield(s => s + 15)
            addLog('🔥 餘燼 4 層：BOSS 憤怒強化！獲得 15 護盾！')
          }
        }
        // 餘燼持續灼燒（每回合）：層數越高傷害越大
        if (emberStacks >= 1) {
          const emberDmg = emberStacks >= 3 ? 5 : emberStacks >= 2 ? 3 : 2
          setHeroHp(h => Math.max(1, h - emberDmg))
          addLog(`🔥 餘燼灼燒 ${emberStacks} 層：受 ${emberDmg} 傷害`)
        }
      }

      // 第二章・亡國迴廊：王城記憶（每 3 回合切換）
      if (run.chapter === 2) {
        const newMemTurn = castleMemoryTurn + 1
        setCastleMemoryTurn(newMemTurn)
        if (castleMemoryPhase === -1 || newMemTurn % 3 === 1) {
          const nextPhase = castleMemoryPhase === -1 ? 0 : (castleMemoryPhase + 1) % 4
          setCastleMemoryPhase(nextPhase)
          const MEMORY_NAMES = ['加冕之日', '戰火之夜', '背叛之刻', '王城陷落']
          addLog(`👑 王城記憶：${MEMORY_NAMES[nextPhase]}`)
          if (nextPhase === 0) {
            // 加冕之日：敵方獲得護盾
            setEnemyShield(s => s + 12)
            addLog('👑 加冕之日：敵方獲得 12 護盾')
          } else if (nextPhase === 1) {
            // 戰火之夜：雙方受到燃燒傷害
            setHeroHp(h => Math.max(1, h - 5))
            setEnemyStatus(s => addStack(s, 'burn', 3, 'add'))
            addLog('🔥 戰火之夜：雙方燃燒！你受 5 傷害，敵人 +3 燃燒')
          } else if (nextPhase === 2) {
            // 背叛之刻：玩家陷入易傷（3 回合內受傷 +20%）
            setHeroVulnerableTurns(3)
            addLog('⚠️ 背叛之刻：你遭受背叛，陷入易傷 3 回合（受傷 +20%）！')
          } else if (nextPhase === 3) {
            // 王城陷落：敵人攻擊提升（透過 enemyIntent 調整），防禦下降
            setEnemyIntent(i => Math.round(i * 1.2))
            addLog('⚔️ 王城陷落：敵人攻擊 +20%，但防禦 -3！')
          }
        }
        // 羅恩：第 1 回合召喚兩名王城殘兵護衛
        if (isLaon && !laonSpawnedRef.current && ak === 1) {
          laonSpawnedRef.current = true
          spawnMinions([
            { name: '王城殘兵', hp: 120, atk: 28, def: 5, enemyId: 'castle_remnant' },
            { name: '王城殘兵', hp: 120, atk: 28, def: 5, enemyId: 'castle_remnant' },
          ])
        }
      }

      // 第三章・靈王詛咒：由 doAttack 累積；這裡只做 turn-start check
      // 王血詛咒 3 層：玩家受傷 +15%（在 doEnemyAttack 判斷）
      if (run.chapter === 3) {
        // 王陵守墓人：每 3 回合施加封墓標記（以燃燒模擬治療降低，log 說明）
        if (isTombKeeper && ak % 3 === 0) {
          addLog('⚠️ 封墓灰塵：你的治療效果本回合降低 50%！')
        }
        // 鎖魂騎士：每 3 回合鎖骰
        if (isSoulKnight && ak % 3 === 0) {
          const lockIdx = Math.floor(Math.random() * 5)
          setLockedDieIdx(lockIdx)
          addLog(`⛓ 鎖魂牽引：第 ${lockIdx + 1} 顆骰子被鎖住，無法重骰！`)
        }
        // 禁咒祭司：王血詛咒 5 層觸發
        if (isForbiddenPriest && royalBloodCurse >= 5) {
          const healAmt = Math.round(enemy.hp * 0.15)
          setEnemyHp(h => Math.min(h + healAmt, Math.round(enemy.hp)))
          setRoyalBloodCurse(0)
          addLog(`⚠️ 逆誓祈禱：王血詛咒 5 層！敵方回復 ${healAmt} HP，詛咒歸零！`)
        }
        // 艾莉西亞：HP<50% 後縮短攻擊間隔的邏輯（每 3 回合釋放王血反轉）
        if (isElysia && ak % (enemyHp <= enemy.hp * 0.5 ? 3 : 5) === 0) {
          const backlashDmg = royalBloodCurse * 8
          if (backlashDmg > 0) {
            setHeroHp(h => Math.max(1, h - backlashDmg))
            addLog(`💀 王血反轉：艾莉西亞將詛咒 ${royalBloodCurse} 層轉化！受 ${backlashDmg} 傷害！`)
          } else {
            addLog('👑 王妃凝視：艾莉西亞蓄力王血反轉…')
          }
        }
        // 艾莉西亞：HP<50% 台詞
        if (isElysia && !elysiaHalfDialogueRef.current && enemyHp <= enemy.hp * 0.5) {
          elysiaHalfDialogueRef.current = true
          addLog('艾莉西亞：「你們打敗的，不過是盤踞王城的幻影……真正焚毀王國的火，來自王座之下。」')
        }
      }
    }

    // 回合計數（用於 barrier/echo/second_skin）
    const nextTurn = battleTurn + 1
    setBattleTurn(nextTurn)

    // Legendary: armor_regen
    if (hasLeg('armor_regen')) {
      setHeroHp(h => clamp(h + 5, 0, activeMember.maxHp))
      addLog('神聖胸甲：回復 5 HP')
    }
    // armor_barrier: 每2回合+10護盾
    if (hasLeg('armor_barrier') && nextTurn % 2 === 0) {
      setGuardBonus(g => g + 10)
      addLog('壁壘護甲：循環護盾 +10！')
    }
    // 鐵壁：每3回合獲得 N 護盾
    if (eqBonus.turnShield > 0 && nextTurn % 3 === 0) {
      setGuardBonus(g => g + eqBonus.turnShield)
      addLog(`鐵壁：每 3 回合護盾 +${eqBonus.turnShield}`)
    }
    // 聖約護符：聖約進度 < 50 時每回合 +N 護盾
    if (isAshCovenant && run.relics.includes('covenant_charm')) {
      const charmShield = getOwnedRelicEffect(run.relics, run.relicLevels, 'covenant_charm')?.covenantLowShield ?? 0
      if (charmShield > 0 && covenantProgress < 50) {
        setGuardBonus(g => g + charmShield)
        addLog(`聖約護符：進度 < 50，護盾 +${charmShield}`)
      }
    }
    // ring_soul_drain: 每回合真實傷害5
    if (hasLeg('ring_soul_drain')) {
      setEnemyHp(h => Math.max(0, h - 5))
      addLog('汲魂之環：汲取生命 5 真實傷害')
    }
    // ring_double_edge: 每回合多受2傷害
    if (hasLeg('ring_double_edge')) {
      setHeroHp(h => Math.max(1, h - 2))
      addLog('雙刃之戒：代價 -2 HP')
    }
    // acc_shield_battery: 每回合+7護盾
    if (hasLeg('acc_shield_battery')) {
      setGuardBonus(g => g + 7)
      addLog('鋼鐵意志：護盾 +7')
    }
    // Talent: regen
    const regenTotal = talP('regen').reduce((s, p) => s + p.value, 0)
    if (regenTotal > 0) {
      setHeroHp(h => clamp(h + regenTotal, 0, activeMember.maxHp))
      addLog(`天賦回復：+${regenTotal} HP`)
    }
    // Talent: shield_per_turn
    const sptTotal = talP('shield_per_turn').reduce((s, p) => s + p.value, 0)
    if (sptTotal > 0) setGuardBonus(g => g + sptTotal)
    // Talent: burn_per_turn
    const bptTotal = talP('burn_per_turn').reduce((s, p) => s + p.value, 0)
    if (bptTotal > 0) setEnemyStatus(s => addStack(s, 'burn', bptTotal, 'add'))
    // Talent: freeze_per_turn → 寒冰腐蝕 (ice lv60c): 每回合 iceMark × value 傷害
    const fptTotal = talP('freeze_per_turn').reduce((s, p) => s + p.value, 0)
    if (fptTotal > 0 && iceMark > 0) {
      const corrosionDmg = fptTotal * iceMark
      setEnemyHp(h => Math.max(0, h - corrosionDmg))
      addLog(`寒冰腐蝕：${iceMark} 層冰痕，造成 ${corrosionDmg} 傷害`)
    }
    // 鐵壁持久：每回合回復 N HP
    const cardRegenPerTurn = leveledCards.reduce((s, c) => s + (c.effect.regenPerTurn ?? 0), 0)
    if (cardRegenPerTurn > 0) {
      setHeroHp(h => clamp(h + cardRegenPerTurn, 0, activeMember.maxHp))
      addLog(`鐵壁持久：+${cardRegenPerTurn} HP`)
    }
    // 霜晶爆裂：每層冰痕每回合造成 N 傷害
    const cardIceMarkDmgPerTurn = leveledCards.reduce((s, c) => s + (c.effect.iceMarkDmgPerTurn ?? 0), 0)
    if (cardIceMarkDmgPerTurn > 0 && iceMark > 0) {
      const iceTickDmg = cardIceMarkDmgPerTurn * iceMark
      setEnemyHp(h => Math.max(0, h - iceTickDmg))
      addLog(`霜晶爆裂：${iceMark} 層冰痕，造成 ${iceTickDmg} 傷害`)
    }
    // 破釜沉舟：HP<50% 時每回合自動獲得 1 層拳勢
    if (hero.role === 'fighter' && leveledCards.some(c => c.effect.lowHpFistGain) &&
        heroHp < activeMember.maxHp * 0.5 && fistPower < 5) {
      const newFp = Math.min(fistPower + 1, 5)
      setFistPower(newFp)
      addLog('破釜沉舟：HP<50%，自動獲得 1 層拳勢')
      // 拳勢被動疊滿時，補上跟連段觸發一致的無雙架式進場（修正：原本只有連段觸發才會進入無雙）
      if (newFp >= 5 && noDoubleLeft === 0) {
        const hasMunsouExtend = run.cards.some(c => c.id === 'fighter_munsou_extend')
        const munsouRounds = 2 + (hasMunsouExtend ? 1 : 0)
        setNoDoubleLeft(munsouRounds)
        noDoubleLeftRef.current = munsouRounds
        setFighterOverdriveFlash(n => n + 1)
        addLog(`無雙架式！拳勢爆滿！${hasMunsouExtend ? '（無雙之魄：持續 3 回合）' : ''}`)
        if (hasLeg('fighter_weapon')) { setWeaponSkillBoostReady(true); addLog('龍皇拳套：下次奧義傷害 +30%！') }
      }
    }
  }

  const isFrozen     = enemyStatus.some(s => s.type === 'freeze')
  const burnStacks   = enemyStatus.find(s => s.type === 'burn')?.stacks ?? 0
  const poisonStacks = enemyStatus.find(s => s.type === 'poison')?.stacks ?? 0
  const vulnTurns    = enemyStatus.find(s => s.type === 'vulnerable')?.stacks ?? 0
  const armorBreak   = enemyStatus.find(s => s.type === 'armor_break')?.stacks ?? 0

  // Live enemy intent: mitigated incoming damage given current guard (+嘲諷減免/獸人狂暴/嗜血燃焰/俯衝追擊)
  const isOrcRageThisTurn = isOrc && orcRageTurn === 2
  const houndLiveMult = isHound ? (1 + houndEnrageStacks * 0.08) : 1
  const batLiveCounter = isBatDragon ? Math.round(enemy.atk * 0.15 * turnRerolls) : 0
  const liveBaseIntent = Math.round((isOrcRageThisTurn ? enemyIntent * 2 : enemyIntent) * houndLiveMult) + batLiveCounter
  const liveIntent = tauntReduce > 0 ? Math.round(liveBaseIntent * (1 - tauntReduce)) : liveBaseIntent
  const liveKoadDef = hasRelic(run.relics, 'kingdom_oath') && guardBonus > 0 ? 6 : 0
  const rawIntentAfterDef = Math.max(0, Math.round(liveIntent - hero.def - extraDef - liveKoadDef))
  const intentDmg = Math.max(0, rawIntentAfterDef - guardBonus)
  const willEnemyAct = !isFrozen

  // ── 骰型速覽：技能門檻 & 職業特效 ──────────────────────────────────────
  const skillRankThreshold = (hero.role === 'holy' || hero.role === 'song') ? 2 : 4
  const comboRows: { label: string; rank: number }[] = [
    { label: '散骰', rank: 0 }, { label: '一對', rank: 1 }, { label: '兩對', rank: 2 },
    { label: '三條', rank: 3 }, { label: '葫蘆', rank: 4 }, { label: '順子', rank: 4 },
    { label: '四條', rank: 5 }, { label: '五條', rank: 6 },
  ]
  const skillNotes: string[] = (() => {
    const ovr = talentBonus.skillOverrideId
    if (ovr) {
      const OVR_DESC: Record<string, string> = {
        slash_power: '傷害 ×2.5，無護盾加成', slash_fortress: '傷害歸零，治療+25，護盾+50',
        slash_combo: '傷害 ×1.3', fire_ignite: '傷害歸零，施加 10 層燃燒',
        fire_furnace: '傷害 ×2.5，重骰 -1', fire_easy: '傷害 ×0.7',
        holy_angel: '無傷害，治療+45，施加 5 層燃燒', holy_judgment: '傷害 ×2，治療 ×0.5',
        holy_resonance: '治療量全部轉為神聖傷害', shadow_burst: '傷害 ×2，無護盾',
        shadow_poison: '施加 10 層中毒', shadow_easy: '傷害 ×0.6',
        shadow_deadly_poison_blade: '傷害 ×1.2，施加 8 層中毒；敵人已中毒時引爆（每層 +3 傷害）',
        ice_permafrost: '傷害 ×0.8；凍結遞減正常計算；凍結成功額外 +1 冰痕；免疫時改施加 2 層冰痕',
        ice_cryo_burst: '敵人有燃燒：+35 傷害，一半燃燒層數轉為冰痕',
        ice_barrier: '+35 護盾，本回合敵方攻擊 -30%；護盾存活則下回合傷害 +20%',
        arrow_barrage: '攻擊兩次（各 ×0.7）', arrow_snipe: '傷害 ×2.5，無視 50% 防禦',
        arrow_poison: '正常傷害 + 施加 10 層燃燒',
        hammer_quake: '傷害 ×2.5，護盾 +30', hammer_crush: '傷害 ×2，無視防禦',
        hammer_easy: '傷害 ×0.8',
        song_power: '傷害 ×1.5，治療 +30', song_requiem: '無傷害，治療 50 HP',
        song_inspire: '2 回合每回合重骰 +2',
        beast_fury: '野獸 ATK 加成翻倍', beast_king: '傷害 ×2，施加 5 層燃燒',
        beast_hold: '下回合骰子最低值升至 5',
        gear_overdrive: '重骰次數恢復最大值，傷害 ×1.5', gear_explosion: '傷害 ×2.2，重骰歸零',
        gear_precision: '下回合骰子最低值升至 5',
        gear_precision_v2: '下回合最低 2 顆骰子 +2（上限 5）',
        fighter_dragon: '消耗全部拳勢，每層+12傷害', fighter_formless: '強制攻擊連段+12傷，拳勢+1',
        fighter_infinite: '同時觸發攻擊+防守+調息連段效果',
      }
      return [`Lv100 覆蓋：${OVR_DESC[ovr] ?? ovr}`]
    }
    const ROLE_NOTES: Record<string, string[]> = {
      slash:  ['三條以上：+10 傷害', '五條：護盾+6，嘲諷 -30%'],
      fire:   ['葫蘆以上：+18 傷害', '四條以上：再+6 傷害', '技能：施加 2 層燃燒'],
      holy:   ['技能：治療量依骰heal計算，每顆6點額外 +5HP', '傷害略低，以治療為主'],
      shadow: ['兩對以上：+12 傷害', '葫蘆以上：再+8 傷害', '技能：30-50% 暗影爆擊'],
      ice:    ['技能：護盾+12', '兩對以上：施加 1 層冰痕', '順子以上：凍結 1 回合', '已凍結：追加 20 冰晶傷害'],
      arrow:  ['葫蘆以上：+14 傷害', '散形順子(5種不同點數)：傷害 ×1.6', '散骰(5種不同點數)：追加一次攻擊'],
      hammer: ['一對以下：+5 傷害', '三條以上：+11 傷害', '技能：破甲 -3'],
      song:   ['技能：治療 = 10 + 骰heal×2', '傷害略低，治療與輔助為主'],
      beast:  ['傷害 +8 + 骰型階×2', '葫蘆以上：護盾+3', '技能：召喚野狼助攻（兩對以上）'],
      gear:    ['兩對以上：+10 傷害', '葫蘆以上：再+6', '重骰蓄能每次 +8，出手一次性釋放'],
      fighter: ['觸發連段：獲得 1 層拳勢（最多5）', '拳勢每層：傷害+5%・受傷-2%', '拳勢滿→無雙架式 2 回合：連段效果×1.5', '技能：依最近連段類型強化（攻/防/調息/破甲）', '連段範例：一對→兩對（流水卸勁）、兩對→三條（虎破連拳）'],
    }
    return ROLE_NOTES[hero.role] ?? []
  })()

  // JRPG 戰鬥背景：依副本/章節挑圖，圖不存在時 CSS 有 fallback gradient 不會壞畫面
  const battleBg =
    dungeonId === 'star_eclipse' ? '/assets/dungeons/star_eclipse_battle.png'
    : dungeonId === 'burning_throne' ? '/assets/dungeons/burning_throne_battle.png'
    : dungeonId === 'black_tide' ? '/assets/dungeons/black_tide_battle.png'
    : isAshCovenant ? '/assets/dungeons/ash_covenant_battle.png'
    : isAshKingdom && run.chapter === 1 ? '/assets/dungeons/ash_kingdom_ch1.png'
    : isAshKingdom && run.chapter === 2 ? '/assets/dungeons/ash_kingdom_ch2.png'
    : isAshKingdom && run.chapter === 3 ? '/assets/dungeons/ash_kingdom_ch3.png'
    : run.campaign === 'rift_omen' && run.chapter === 1 ? '/assets/dungeons/rift_omen_ch1.png'
    : run.campaign === 'rift_omen' && run.chapter === 2 ? '/assets/dungeons/rift_omen_ch2.png'
    : run.campaign === 'rift_omen' && run.chapter === 3 ? '/assets/dungeons/rift_omen_ch3.png'
    : isDeepSea && run.chapter === 1 ? '/assets/dungeons/deep_sea_ch1.png'
    : isDeepSea && run.chapter === 2 ? '/assets/dungeons/deep_sea_ch2.png'
    : isDeepSea && run.chapter === 3 ? '/assets/dungeons/deep_sea_ch3.png'
    : run.chapter === 1 ? '/assets/dungeons/battle_forest.png'
    : run.chapter === 2 ? '/assets/dungeons/battle_snowfield.png'
    : run.chapter === 3 ? '/assets/dungeons/battle_castle.png'
    : '/assets/dungeons/star_eclipse.png'
  // 主線章節背景沒有副本圖那麼花，遮罩不用壓那麼暗
  const isCampaignBg = !dungeonId
  // 每張主線背景圖的透視/地平線深度都不一樣（開闊廣場 vs 狹長迴廊/甬道），
  // 同一個地板 top% 套用到所有圖會有些圖站位準、有些圖飄空中。這裡依圖個別微調，
  // 沒列到的圖用 60%/62%（跟原本共用值一樣）當預設。數值是肉眼比對每張圖地板線估的，
  // 之後若使用者回報哪張圖角色還是沒站穩，調整這裡對應那張圖的數字即可，不影響其他圖。
  const CAMPAIGN_FLOOR_TOP: Record<string, { enemy: number; hero: number }> = {
    '/assets/dungeons/battle_forest.png':       { enemy: 60, hero: 62 },
    '/assets/dungeons/battle_snowfield.png':    { enemy: 62, hero: 64 },
    '/assets/dungeons/battle_castle.png':       { enemy: 62, hero: 64 },
    '/assets/dungeons/ash_kingdom_ch1.png':     { enemy: 62, hero: 64 },
    '/assets/dungeons/ash_kingdom_ch2.png':     { enemy: 78, hero: 80 },
    '/assets/dungeons/ash_kingdom_ch3.png':     { enemy: 62, hero: 64 },
    '/assets/dungeons/rift_omen_ch1.png':       { enemy: 74, hero: 76 },
    '/assets/dungeons/rift_omen_ch2.png':       { enemy: 66, hero: 68 },
    '/assets/dungeons/rift_omen_ch3.png':       { enemy: 70, hero: 72 },
    '/assets/dungeons/deep_sea_ch1.png':        { enemy: 60, hero: 62 },
    '/assets/dungeons/deep_sea_ch2.png':        { enemy: 62, hero: 64 },
    '/assets/dungeons/deep_sea_ch3.png':        { enemy: 68, hero: 70 },
  }
  // 橫向矮螢幕手機：scene 被壓得很扁，敵人（含下方 HUD 名牌/血條）站位若還是按原本
  // 桌機調好的 top% 算，疊起來的高度容易垂到 viewport 底部，跟釘死在左下角的 log-panel
  // 重疊。這裡只把敵人錢往上提，英雄站位（hero）維持不變，不影響其他版面。
  const mobileEnemyTopShift = isShortLandscape ? 12 : 0
  const campaignFloorTopRaw = CAMPAIGN_FLOOR_TOP[battleBg] ?? { enemy: 60, hero: 62 }
  const campaignFloorTop = { ...campaignFloorTopRaw, enemy: Math.max(30, campaignFloorTopRaw.enemy - mobileEnemyTopShift) }
  // 4 個副本共用 top:42%/62%（CSS .jrpg-enemy-zone/.jrpg-hero-zone 預設值）調好的地板線，
  // 但 star_eclipse / black_tide 換成獨立戰鬥圖後地板線比較低，角色會飄在空中，這裡個別下修。
  const DUNGEON_FLOOR_TOP: Record<string, { enemy: number; hero: number }> = {
    star_eclipse:   { enemy: 56, hero: 76 },
    black_tide:     { enemy: 56, hero: 76 },
    burning_throne: { enemy: 47, hero: 67 },
  }
  const dungeonFloorTopRaw = dungeonId ? DUNGEON_FLOOR_TOP[dungeonId] : undefined
  const dungeonFloorTop = dungeonFloorTopRaw
    ? { ...dungeonFloorTopRaw, enemy: Math.max(30, dungeonFloorTopRaw.enemy - mobileEnemyTopShift) }
    : undefined

  return (
    <div
      className={`battle-screen jrpg-battle ${phase === 'animating' ? 'is-animating' : ''} ${isCampaignBg ? 'jrpg-battle-campaign-bg' : ''}`}
      style={{
        '--battle-bg': `url(${battleBg})`,
        ...(isCampaignBg ? {
          '--campaign-enemy-top': `${campaignFloorTop.enemy}%`,
          '--campaign-hero-top': `${campaignFloorTop.hero}%`,
        } : {}),
        ...(dungeonFloorTop ? {
          '--dungeon-enemy-top': `${dungeonFloorTop.enemy}%`,
          '--dungeon-hero-top': `${dungeonFloorTop.hero}%`,
        } : {}),
      } as CSSProperties}
    >
      <div className="jrpg-bg-overlay" />
      <div className="jrpg-battle-menu-fab-wrap">
        <button
          className="jrpg-battle-menu-fab"
          onClick={() => setShowBattleMenu(v => !v)}
          title="戰鬥選單"
        >⚙️</button>
        {showBattleMenu && (
          <div className="jrpg-battle-menu-panel">
            <div className="jrpg-battle-menu-label">
              <span>{isBoss ? '⚔️ BOSS' : isElite ? '💀 精英' : '⚔️ 戰鬥'}</span>
              {goldReward > 0 && <span className="floor-gold">金幣獎勵 {goldReward}</span>}
            </div>
            {(isStarEclipse || isBurningThrone || isDeepSea || isBlackTide || isAshKingdom || isAshCovenant) && (
              <button
                className="jrpg-battle-menu-item"
                onClick={() => { setShowMechanicInfo(true); setShowBattleMenu(false) }}
              >📖 機制說明</button>
            )}
            <button
              className="jrpg-battle-menu-item"
              onClick={() => { setShowLoadout(true); setShowBattleMenu(false) }}
            >🎒 配置（增益/裝備/遺物）</button>
            <button
              className="jrpg-battle-menu-item"
              onClick={() => { const next = !mutedLocal; setMuted(next); setMutedLocal(next) }}
            >{mutedLocal ? '🔇 開啟音效' : '🔊 靜音'}</button>
            {!confirmSurrender ? (
              <button
                className="jrpg-battle-menu-item jrpg-battle-menu-item-danger"
                disabled={phase === 'animating'}
                onClick={() => setConfirmSurrender(true)}
              >🏳 放棄</button>
            ) : (
              <div className="battle-surrender-confirm">
                <span>確定放棄？</span>
                <button className="btn-danger-sm" onClick={() => onComplete({ won: false, goldEarned: 0, newHeroHp: 0, undyingUsed, hourglassUsed: relicReviveUsed, equipUndyingUsed, turnsUsed: battleTurnCountRef.current, diceComboScore: diceComboScoreRef.current })}>確定</button>
                <button className="ghost-sm" onClick={() => setConfirmSurrender(false)}>取消</button>
              </div>
            )}
          </div>
        )}
      </div>

      {heroAnim === 'skill' && <div className="ba-skill-flash" />}
      {fireExplosionFlash > 0 && <div key={`fire-explosion-${fireExplosionFlash}`} className="ba-fire-explosion-flash" />}
      {iceExplosionFlash > 0 && <div key={`ice-explosion-${iceExplosionFlash}`} className="ba-ice-explosion-flash" />}
      {gearExplosionFlash > 0 && <div key={`gear-explosion-${gearExplosionFlash}`} className="ba-gear-explosion-flash" />}
      {fighterOverdriveFlash > 0 && <div key={`fighter-overdrive-${fighterOverdriveFlash}`} className="ba-fighter-overdrive-flash" />}

      <div className={`jrpg-scene-viewport ${usePortraitStack ? 'is-portrait-stack' : ''}`}>
      <div
        ref={sceneRef}
        className="jrpg-scene"
        style={usePortraitStack ? undefined : { width: SCENE_W, height: SCENE_H, marginLeft: -SCENE_W / 2, transform: `scale(${sceneScale})` }}
      >

      <div className="jrpg-stage">
        <div className="jrpg-enemy-zone">
          <div className="ba-combat-row jrpg-enemy-sprite-wrap">
            <div className="ba-main-enemy-col">
              <div className={enemyAnim !== 'idle' ? `ba-enemy ba-enemy-${enemyAnim}` : 'ba-enemy'}>
                <SpriteAnimator sprite={baseEnemy.sprite} state={enemyAnim} scale={enemySpriteScale} flip glow />
              </div>
              {/* 下回合攻擊預告：移到頭部右側當小徽章，不再佔 HUD 一整列 */}
              <div
                className="enemy-intent"
                style={usePortraitStack ? undefined : { transform: `scale(${enemyHudScale})`, transformOrigin: 'top right' }}
              >
                {willEnemyAct
                  ? isOrcRageThisTurn
                    ? <>💢 <b>狂暴重擊！~{intentDmg} HP{intentDmg === 0 && rawIntentAfterDef > 0 ? ' 🛡(護盾全擋)' : guardBonus > 0 ? ` 🛡-${Math.min(guardBonus, rawIntentAfterDef)}` : ''}</b></>
                    : <>🗡 下回合攻擊 <b>~{intentDmg} HP{intentDmg === 0 && rawIntentAfterDef > 0 ? ' 🛡(護盾全擋！)' : guardBonus > 0 && rawIntentAfterDef > 0 ? ` 🛡擋${Math.min(guardBonus, rawIntentAfterDef)}` : ''}</b></>
                  : <>❄️ 凍結中，無法行動</>}
              </div>
            </div>
            {minions.map(m => {
              const mEnemy = m.enemyId ? ENEMIES.find(e => e.id === m.enemyId) : undefined
              const mScale = mEnemy ? (100 / mEnemy.sprite.frameHeight) : 0
              return (
                <div key={m.uid} className={`ba-minion-col${m.dying ? ' ba-minion-dying' : ''}`}>
                  {mEnemy && (
                    <div className="ba-minion-sprite">
                      <SpriteAnimator sprite={mEnemy.sprite} state={m.dying ? 'hurt' : 'idle'} scale={mScale} flip />
                    </div>
                  )}
                  <div className="bmc-name">{m.dying ? `${m.name} 💀` : m.name}</div>
                  <div className="bmc-hp-bar">
                    <div className="bmc-hp-fill" style={{ width: `${Math.round(m.hp / m.maxHp * 100)}%` }} />
                  </div>
                  <div className="bmc-stats">HP {m.hp}/{m.maxHp}{m.shield > 0 ? ` 🛡${m.shield}` : ''}</div>
                </div>
              )
            })}
          </div>

          <div
            className="jrpg-enemy-hud"
            style={usePortraitStack ? undefined : { transform: `scale(${enemyHudScale})`, transformOrigin: 'top center' }}
          >
            <div className="unit-name">
              {enemy.name}
              {isFrozen && <span className="status-badge freeze">凍結</span>}
              {burnStacks > 0 && <span className="status-badge burn">燃燒×{burnStacks}</span>}
              {poisonStacks > 0 && <span className="status-badge poison">中毒×{poisonStacks}</span>}
              {vulnTurns > 0 && <span className="status-badge vulnerable">易傷 {vulnTurns}</span>}
              {armorBreak > 0 && <span className="status-badge armorbreak">破甲 -{armorBreak}</span>}
              {iceMark > 0 && hero.role === 'ice' && (
                <span className="status-badge freeze" style={{ background: '#1a3a6a', color: '#a0d8ff' }}
                  title={`冰痕 ${iceMark} 層：皇家公主對其傷害 +${iceMark * 4}%${iceMark >= 5 ? '，下次施加冰痕觸發碎冰爆發！' : ''}`}>
                  ❄ 冰痕×{iceMark}
                </span>
              )}
            </div>
            {/* 禁忌骰說明 — 顯示在敵人旁便於辨識 */}
            {forbiddenDiceState.length > 0 && (() => {
              const FD_SHIELD = [0, 8, 14, 20, 28, 35]
              const FD_SELF   = [0, 3, 10, 18, 28, 40]
              const FD_VULN   = [false, false, false, true, true, true]
              const cnt = phase === 'holding' ? Math.min(dice.filter(d => forbiddenDiceState.includes(d)).length, 5) : 0
              return (
                <div className="enemy-forbidden-info">
                  <div className="efi-top">
                    <span className="efi-label">⛔ 禁忌點數</span>
                    {forbiddenDiceState.map((n, i) => (
                      <span key={i} className={`efi-num${cnt > 0 && dice.includes(n) && phase === 'holding' ? ' efi-hit' : ''}`}>{n}</span>
                    ))}
                  </div>
                  {cnt > 0
                    ? <div className="efi-warn">⚠ {cnt} 顆命中 → 自傷 {FD_SELF[cnt]} HP · 敵方 +{FD_SHIELD[cnt]} 護盾{FD_VULN[cnt] ? ' · 易傷' : ''}</div>
                    : <div className="efi-hint">命中每顆：自傷 HP ＋ 給敵護盾（越多越重）</div>
                  }
                </div>
              )
            })()}
            {isEclipseBishop && bossPhase > 1 && (
              <div className="boss-phase-badge">
                {bossPhase === 2
                  ? '⚠️ 第二階段：雙重禁忌啟動，禁忌點數增為 2 個'
                  : '💀 第三階段・星蝕審判：每 3 回合判定 — 含禁忌自傷 20 HP，淨骰 Boss 受 30 真傷'}
              </div>
            )}
            {isEclipseBishop && bishopWeakActive && (
              <div className="boss-phase-badge bishop-weak-badge">⚡ 破綻！下次攻擊 ×1.5</div>
            )}
            {mechanic && (
              <div className={`mechanic-badge mechanic-${mechanic.special}`}>
                {mechanic.special === 'golem_armor' && golemArmorLeft > 0
                  ? `🛡 石甲護身 ${golemArmorLeft}回合`
                  : mechanic.special === 'dragon_scramble' ? '🐉 龍息亂流'
                  : mechanic.special === 'dark_knight_counter' ? '⚔️ 暗黑反擊'
                  : mechanic.special === 'goblin_poison' ? '🐸 毒刃騷擾'
                  : mechanic.special === 'orc_rage' ? `💢 蓄力 ${orcRageTurn}/2`
                  : mechanic.special === 'skeleton_revive' ? (skeletonReviveRef.current ? '☠ 不死之身' : '☠ 已復活')
                  : mechanic.special === 'slime_regen' ? '🟢 黏液再生'
                  : mechanic.special === 'mimic_treasure' ? '💰 奪命寶藏'
                  : mechanic.special === 'witch_lock_die' ? '❄️ 骰子封印'
                  : mechanic.special === 'lancer_thunder' ? `⚡ 落雷追蹤（本回合重骰 ${turnRerolls}）`
                  : mechanic.special === 'wolf_frost' ? `❄️ 霜咬${wolfFrostStacks > 0 ? `（${wolfFrostStacks} 層）` : ''}`
                  : mechanic.special === 'yeti_shield_break' ? `🏔️ 冰震衝擊（第 ${yetiTurn % 3 + 1}/3 回）`
                  : mechanic.special === 'hound_enrage' ? `🔥 嗜血燃焰${houndEnrageStacks > 0 ? `（${houndEnrageStacks} 層 +${houndEnrageStacks * 8}%）` : ''}`
                  : mechanic.special === 'bat_reroll_counter' ? `🦇 俯衝追擊${batLiveCounter > 0 ? `（追加 +${batLiveCounter}）` : ''}`
                  : mechanic.special === 'sorceress_curse' ? `💫 惑心詛咒`
                  : mechanic.chargeName}
              </div>
            )}
            {isEclipseBishop && bishopBar === 2 && (
              <div className="bishop-bar1-depleted">第一血條 耗盡</div>
            )}
            {isTideKingAusrein ? (() => {
              const barColor = tideKingBar === 1 ? '#806040' : tideKingBar === 2 ? '#4060c0' : '#c04080'
              return (
                <div className="hp-box enemy-hp">
                  <div className="hp-fill" style={{ width: `${Math.min(100, (enemyHp / TIDE_KING_BAR_HP) * 100)}%`, background: barColor }} />
                  <span>{Math.max(0, enemyHp)} / {TIDE_KING_BAR_HP} ⬡{tideKingBar}/3</span>
                </div>
              )
            })() : isAshFallenKing ? (() => {
              const barColor = ashFallenKingBar === 1 ? '#806040' : ashFallenKingBar === 2 ? '#c04020' : '#a020c0'
              return (
                <div className="hp-box enemy-hp">
                  <div className="hp-fill" style={{ width: `${Math.min(100, (enemyHp / ASH_FALLEN_KING_BAR_HP) * 100)}%`, background: barColor }} />
                  <span>{Math.max(0, enemyHp)} / {ASH_FALLEN_KING_BAR_HP} 🔱{ashFallenKingBar}/3</span>
                </div>
              )
            })() : (
              <div className={`hp-box enemy-hp${isEclipseBishop && bishopBar === 2 ? ' bishop-bar2' : ''}`}>
                <div className="hp-fill" style={{ width: `${(enemyHp / (bishopBar === 2 ? BISHOP_BAR2_HP : enemy.hp)) * 100}%` }} />
                <span>{enemyHp} / {bishopBar === 2 ? BISHOP_BAR2_HP : enemy.hp}{isEclipseBishop ? ` ⬡${bishopBar}` : ''}</span>
              </div>
            )}
            {enemyShield > 0 && (
              <div className="shield-bar-row">
                <div className="shield-bar">
                  <div className="shield-bar-fill" style={{ width: `${Math.min(100, (enemyShield / enemy.hp) * 100)}%` }} />
                </div>
                <span className="shield-val">🛡 {enemyShield}</span>
              </div>
            )}
            {mechanic && !(mechanic.special === 'golem_armor' && golemArmorLeft > 0) && (
              <div className="mechanic-desc">{MECHANIC_DESC[mechanic.special]}</div>
            )}
            {enemyAffixes.length > 0 && (
              <div className="enemy-affixes">
                {enemyAffixes.map(a => (
                  <span key={a.id} className={`ea-badge ea-${a.id} ${a.id === 'berserk' && berserkRef.current ? 'active' : ''} ${a.id === 'immune' && enemyImmuneRef.current > 0 ? 'active' : ''}`}>
                    {a.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div
            className="float-text-layer"
            style={usePortraitStack ? undefined : { transform: `scale(${enemyHudScale})`, transformOrigin: '50% 60%' }}
          >
            {floatingTexts.filter(f => f.side === 'enemy').map(f => (
              <div key={f.id} className={`float-text ft-${f.kind}`} style={{ left: `calc(50% + ${f.xOff}px)`, bottom: `calc(60% + ${f.yOff}px)` }}>{f.text}</div>
            ))}
          </div>
        </div>

        <div className="jrpg-hero-zone">
          <div className="jrpg-hero-sprite-wrap">
            <div className={heroAnim !== 'idle' ? `ba-hero ba-hero-${heroAnim}` : 'ba-hero'}>
              <SpriteAnimator sprite={activeHeroSprite} state={heroAnim} scale={heroSpriteScale} glow />
            </div>
          </div>
          <div
            className="float-text-layer"
            style={usePortraitStack ? undefined : { transform: `scale(${enemyHudScale})`, transformOrigin: '50% 60%' }}
          >
            {floatingTexts.filter(f => f.side === 'hero').map(f => (
              <div key={f.id} className={`float-text ft-${f.kind}`} style={{ left: `calc(50% + ${f.xOff}px)`, bottom: `calc(60% + ${f.yOff}px)` }}>{f.text}</div>
            ))}
          </div>
        </div>
      </div>
      </div>

      <div className="jrpg-mechanic-strip">
            {isWitch && witchChill > 0 && (
              <div className={`guard-badge ${witchChill >= 4 ? 'tier-danger' : witchChill >= 3 ? 'tier-warn' : 'tier-neutral'}`}
                title={witchChill >= 5 ? '冰封爆發！' : witchChill >= 4 ? '傷害-10%・重骰-1' : witchChill >= 3 ? '傷害-10%' : '寒意積累中'}>
                ❄️ 寒意 {witchChill}/5{witchChill >= 3 ? (witchChill >= 4 ? ' ⚠' : ' ↓') : ''}
              </div>
            )}
            {run.curses.map((id, i) => { const c = getCurseById(id); return c ? <div key={i} className="guard-badge tier-danger" title={c.desc}>💀 {c.name}</div> : null })}
            {throneCollapseStacks > 0 && isThroneDemonKing && (
              <div className="guard-badge tier-danger">
                💀 崩壞 ×{throneCollapseStacks}（傷害+{throneCollapseStacks * 8}%）
              </div>
            )}
            {(isDeepSea || isBlackTide) && (
              <div className="guard-badge tier-special">
                {tideState === '退潮' ? '🌊' : tideState === '漲潮' ? '🌊' : tideState === '深壓' ? '🌀' : '💨'} {tideState}
                {tideState === '退潮' && ' (+10%↑ 敵ATK+5%)'}
                {tideState === '漲潮' && ' (敵護盾↑ 重骰-1)'}
                {tideState === '深壓' && ' (低骰+15% 高骰-10%)'}
                {tideState === '亂流' && ' (重骰後隨機骰再轉)'}
              </div>
            )}
            {(isDeepSea || isBlackTide) && isTideKingAusrein && (
              <div className="guard-badge tier-special">
                👑 第 {tideKingBar} 條血：{tideKingBar === 1 ? '王座甦醒' : tideKingBar === 2 ? '深壓審判' : '沉海王權'}
              </div>
            )}
            {(isDeepSea || isBlackTide) && isAshFallenKing && (
              <div className="guard-badge tier-special">
                🔱 第 {ashFallenKingBar} 條血：{ashFallenKingBar === 1 ? '亡國之王' : ashFallenKingBar === 2 ? '聖約之王' : '灰燼王魂'}
              </div>
            )}
            {isAshKingdom && run.chapter === 2 && castleMemoryPhase >= 0 && (() => {
              const MEMORY_NAMES = ['加冕之日', '戰火之夜', '背叛之刻', '王城陷落']
              const MEMORY_ICONS = ['👑', '🔥', '⚠️', '⚔️']
              return (
                <div className="guard-badge tier-special">
                  {MEMORY_ICONS[castleMemoryPhase]} 王城記憶：{MEMORY_NAMES[castleMemoryPhase]}
                  {castleMemoryPhase === 0 && ' (敵護盾↑)'}
                  {castleMemoryPhase === 1 && ' (燃燒)'}
                  {castleMemoryPhase === 2 && heroVulnerableTurns > 0 && ` (易傷${heroVulnerableTurns}T)`}
                  {castleMemoryPhase === 3 && ' (敵ATK+20%)'}
                </div>
              )
            })()}
            {hero.role === 'fighter' && fistPower > 0 && (
              <div className={`guard-badge ${noDoubleLeft > 0 ? 'tier-special' : 'tier-warn'}`}
                title={`拳勢 ${fistPower}/5：傷害+${fistPower*5}%・受傷-${fistPower*2}%`}>
                {noDoubleLeft > 0 ? `⚡無雙 (${noDoubleLeft}T) 拳${fistPower}` : `👊 拳勢 ${fistPower}/5`}
              </div>
            )}
            {beastBonus > 0 && <div className="guard-badge tier-neutral">野性 ATK +{beastBonus}</div>}
            {rerollCharge > 0 && <div className="guard-badge tier-neutral">充能 +{rerollCharge}</div>}
            {hasLeg('gear_overheat_cannon') && overheatStacks > 0 && (
              <div className={`guard-badge ${overheatStacks >= 5 ? 'tier-danger' : overheatStacks >= 3 ? 'tier-warn' : 'tier-neutral'}`}>
                ⚙️ 過熱 {overheatStacks}/5{overheatStacks >= 5 ? ' ⚠️' : ''}
              </div>
            )}
            {disableCannonThisTurn && <div className="guard-badge tier-danger">⚙️ 炮彈冷卻中</div>}
            {heroPoisonStacks > 0 && <div className="guard-badge tier-danger">🐸 中毒 ×{heroPoisonStacks}</div>}
            {wolfFrostStacks > 0 && <div className="guard-badge tier-danger">❄️ 霜凍 ×{wolfFrostStacks}（重骰-{wolfFrostStacks}）</div>}
            {sorceressDebuff && <div className="guard-badge tier-danger">💫 詛咒（下次傷害-30%）</div>}
            {starChargeStacks > 0 && <div className="guard-badge tier-neutral">⚙️ 蓄能 ×{starChargeStacks}</div>}
            {wolfSummonCount > 0 && !!talPFirst('wolf_super_strike') && <div className="guard-badge tier-neutral">🐺 {wolfSummonCount % 3}/3 強化蓄積</div>}
            {talP('unique_atk_stack').length > 0 && (
              <div className={`guard-badge ${uniqueAtkStack > 0 ? 'tier-buff' : 'tier-neutral'}`}>
                🏹 散矢 {uniqueAtkStack > 0 ? `+${uniqueAtkStack}` : '待機'}
              </div>
            )}
          {isBurningThrone && (
            <>
              <div className={`infernal-flame-meter${infernalFlame >= 5 ? ' flame-warning' : ''}`}>
                <span className="flame-label">🔥 魔焰</span>
                <div className="flame-pips">
                  {Array.from({ length: INFERNAL_FLAME_MAX }, (_, i) => (
                    <div key={i} className={`flame-pip${i < infernalFlame ? ' flame-pip-active' : ''}${infernalFlame >= 5 && i < infernalFlame ? ' flame-pip-danger' : ''}`} />
                  ))}
                </div>
                <span className="flame-value">{infernalFlame}/{INFERNAL_FLAME_MAX}</span>
              </div>
              <div className="mechanic-hint">
                <div>3格→攻+10%</div>
                <div>5格→攻+15%</div>
                <div>敵攻也隨格數提升</div>
              </div>
            </>
          )}
          {(isDeepSea || isBlackTide) && (
            <>
              <div className="infernal-flame-meter" style={{ borderColor: oxygenLevel <= 1 ? '#ff4444' : '#2080c0' }}>
                <span className="flame-label" style={{ color: '#60b8ff' }}>🫧 氧氣</span>
                <div className="flame-pips">
                  {Array.from({ length: oxygenMax > 0 ? oxygenMax : 5 }, (_, i) => (
                    <div key={i} className={`flame-pip${i < oxygenLevel ? ' flame-pip-active' : ''}${oxygenLevel <= 1 && i < oxygenLevel ? ' flame-pip-danger' : ''}`}
                      style={{ background: i < oxygenLevel ? (oxygenLevel <= 1 ? '#ff4444' : '#2080e0') : '#1a2a3a' }} />
                  ))}
                </div>
                <span className="flame-value" style={{ color: oxygenLevel <= 1 ? '#ff8888' : '#80d0ff' }}>{oxygenLevel}/{oxygenMax > 0 ? oxygenMax : 5}</span>
              </div>
              <div className="mechanic-hint">
                <div>每回合-1</div>
                <div>歸零受深壓傷害</div>
              </div>
            </>
          )}
          {/* ── 灰燼王國篇・第二章：關卡機制 UI ── */}
          {isAshKingdom && run.chapter === 1 && (
            <>
              <div className="infernal-flame-meter" style={{ borderColor: emberStacks >= 3 ? '#d06020' : '#806040' }}>
                <span className="flame-label" style={{ color: '#e07030' }}>🔥 餘燼</span>
                <div className="flame-pips">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className={`flame-pip${i < emberStacks ? ' flame-pip-active' : ''}${emberStacks >= 4 && i < emberStacks ? ' flame-pip-danger' : ''}`}
                      style={{ background: i < emberStacks ? (emberStacks >= 4 ? '#d04010' : '#c06020') : '#2a1a0a' }} />
                  ))}
                </div>
                <span className="flame-value" style={{ color: emberStacks >= 3 ? '#ff8040' : '#e07030' }}>{emberStacks}/4</span>
              </div>
              <div className="mechanic-hint">
                <div>每3回合+1</div>
                <div>每層灼傷</div>
                <div>滿格受傷+15%</div>
              </div>
            </>
          )}
          {isAshKingdom && run.chapter === 3 && (
            <>
              <div className={`infernal-flame-meter${royalBloodCurse >= 3 ? ' flame-warning' : ''}`}
                style={{ borderColor: royalBloodCurse >= 4 ? '#aa0033' : royalBloodCurse >= 2 ? '#770022' : '#440011' }}>
                <span className="flame-label" style={{ color: royalBloodCurse >= 3 ? '#ff4466' : '#cc3355' }}>💀 王血詛咒</span>
                <div className="flame-pips">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className={`flame-pip${i < royalBloodCurse ? ' flame-pip-active' : ''}${royalBloodCurse >= 5 && i < royalBloodCurse ? ' flame-pip-danger' : ''}`}
                      style={{ background: i < royalBloodCurse ? (royalBloodCurse >= 4 ? '#cc0033' : '#880022') : '#1a0a0e' }} />
                  ))}
                </div>
                <span className="flame-value" style={{ color: royalBloodCurse >= 3 ? '#ff6688' : '#cc3355' }}>{royalBloodCurse}/5</span>
              </div>
              <div className="mechanic-hint">
                <div>3層→受傷+15%</div>
                <div>滿5層觸發爆發（層×8傷害）</div>
              </div>
            </>
          )}
          {/* ── 灰燼聖約：聖約進度條 ── */}
          {isAshCovenant && (
            <div className="covenant-progress-wrap">
              <div className="cp-header">
                <span className="cp-label">🔱 聖約進度</span>
                <span className="cp-value" style={{ color: covenantProgress >= 75 ? '#ff4444' : covenantProgress >= 50 ? '#ff8800' : '#c0a060' }}>
                  {covenantProgress} / {covenantEventBuff?.covenantMaxLimit ?? 100}
                </span>
              </div>
              <div className="cp-bar-track">
                <div className="cp-bar-fill" style={{
                  width: `${Math.min(100, (covenantProgress / (covenantEventBuff?.covenantMaxLimit ?? 100)) * 100)}%`,
                  background: covenantProgress >= 75 ? '#cc2020' : covenantProgress >= 50 ? '#c06010' : '#806020',
                }} />
                <div className="cp-bar-mark" style={{ left: '50%' }} title="50%：敵方攻擊+10%" />
                <div className="cp-bar-mark" style={{ left: '75%' }} title="75%：治療-20% / 敵方攻擊+20%" />
              </div>
              <div className="mechanic-hint">
                <div>50%→敵攻+10%</div>
                <div>75%→敵攻+20%・治療-20%</div>
                <div>滿→灰燼審判</div>
              </div>
              {isAshFallenKing && (
                <div className="cp-boss-bar">
                  {['亡國之王', '聖約之王', '灰燼王魂'].map((name, i) => (
                    <span key={i} className={`cp-boss-phase${ashFallenKingBar === i + 1 ? ' active' : ''}`}>
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {angerCount > 0 && <div className="anger-badge">憤怒 {angerCount}/5</div>}
          {minDieBoost > 0 && <div className="anger-badge" style={{ background: '#2a5a3a' }}>骰子最低值 +{minDieBoost}</div>}
      </div>

      <div
        className="jrpg-dice-command"
        style={usePortraitStack ? undefined : { transform: `scale(${diceCmdScale})`, transformOrigin: 'top right' }}
      >
        {forbiddenDiceState.length > 0 && (
          <div className="forbidden-dice-banner fdb-column">
            <div className="fdb-top-row">
              <span className="fdb-label">禁忌點數</span>
              {forbiddenDiceState.map((n, i) => (
                <span key={i} className="fdb-num">{n}</span>
              ))}
              {isStarReaper && starReaperCountdown > 0 && (
                <span className="fdb-label" style={{ marginLeft: 8 }}>收割倒數 {starReaperCountdown}</span>
              )}
              {hasRelic(run.relics, 'star_hourglass') && starHourglassUses < (getOwnedRelicEffect(run.relics, run.relicLevels, 'star_hourglass')?.starHourglassMaxUses ?? 1) && phase === 'holding' && (
                <button
                  className="fdb-hourglass-btn"
                  title="星界沙漏：將所有禁忌點數改為隨機其他點數"
                  onClick={() => {
                    const newFd = forbiddenDiceState.map(() => {
                      const available = [1,2,3,4,5,6].filter(n => !forbiddenDiceState.includes(n))
                      return available.length > 0 ? available[Math.floor(Math.random() * available.length)] : Math.floor(Math.random() * 6) + 1
                    })
                    setForbiddenDiceState(newFd)
                    setStarHourglassUses(u => u + 1)
                    addLog(`星界沙漏：禁忌點數改為 ${newFd.join('、')}`)
                  }}
                >⏳ 沙漏</button>
              )}
            </div>
            <div className="fdb-penalty-hint">
              命中禁忌骰懲罰：1顆(-3HP +8護) · 2顆(-10HP +14護) · 3顆(-18HP +20護 +易傷) · 4顆以上更重
            </div>
            {phase === 'holding' && (() => {
              const FD_SHIELD = [0, 8, 14, 20, 28, 35]
              const FD_SELF   = [0, 3, 10, 18, 28, 40]
              const FD_VULN   = [false, false, false, true, true, true]
              const cnt = Math.min(dice.filter(d => forbiddenDiceState.includes(d)).length, 5)
              if (cnt === 0) return <div className="fdb-live-clean">✓ 目前無禁忌骰，可安全出手</div>
              return (
                <div className="fdb-live-warn">
                  ⚠ {cnt} 顆禁忌 → 自身 -{FD_SELF[cnt]} HP · 敵方 +{FD_SHIELD[cnt]} 護盾{FD_VULN[cnt] ? ' · 施加易傷' : ''}
                </div>
              )
            })()}
          </div>
        )}
        {riftUnstableNum > 0 && (
          <div className="forbidden-dice-banner fdb-column" style={{ background: 'rgba(160,80,0,0.25)', borderColor: '#c06020' }}>
            <div className="fdb-top-row">
              <span className="fdb-label" style={{ color: '#e08040' }}>禁忌/不穩定</span>
              <span className="fdb-num" style={{ color: '#ff8040' }}>{riftUnstableNum}</span>
              {riftBlessedNum > 0 && <>
                <span className="fdb-label" style={{ color: '#80c0ff', marginLeft: 8 }}>祝福</span>
                <span className="fdb-num" style={{ color: '#80c0ff' }}>{riftBlessedNum}</span>
              </>}
            </div>
            <div className="mechanic-hint" style={{ marginTop: 2 }}>
              <div>不穩定→觸發敵人特效</div>
              <div>祝福→英雄獲護盾8</div>
            </div>
          </div>
        )}
        <div className="combo-display">{comboText}</div>
        <div className="battle-command-panel">
          <div className="dice-strip">
            {(() => {
              const comboIdx = phase === 'holding' ? getComboDiceIndices(dice) : []
              return dice.map((v, i) => {
                const canReroll = phase === 'holding' && rerollsLeft > 0
                const isWitchLocked = i === lockedDieIdx
                const isChaosLocked = i === chaosLockedIdx
                const isJellyfishLocked = i === jellyfishLockedDie
                const isLocked = isWitchLocked || isChaosLocked || isJellyfishLocked
                const isForbiddenDie = forbiddenDiceState.includes(v)
                const isComboDie = comboIdx.includes(i)
                return (
                  <div
                    key={i}
                    className={`die ${canReroll && !isLocked ? 'die-rerollable' : ''} ${phase !== 'holding' ? 'die-inactive' : ''} ${isLocked ? 'die-locked' : ''} ${animatingDice[i] ? 'die-throwing' : ''} ${isForbiddenDie && phase === 'holding' ? 'die-forbidden' : ''} ${isComboDie ? 'die-combo' : ''}`}
                    onClick={() => rerollDie(i)}
                    title={isWitchLocked ? '❄️ 封印中' : isChaosLocked ? '💀 混亂詛咒' : isForbiddenDie ? '⚠ 禁忌點數！' : isComboDie ? '✅ 已湊成骰型' : undefined}
                  >
                    {isLocked ? <span style={{ fontSize: 20, lineHeight: 1 }}>{isWitchLocked ? '🔒' : '💀'}</span> : <DieFace value={v} />}
                  </div>
                )
              })
            })()}
          </div>

          {phase === 'holding' && (
            <div className="action-group">
              <div className="reroll-counter">重骰機會 {rerollsLeft}/{maxRerolls}</div>
              <button className="primary action-btn" onClick={doAttack}>攻擊！</button>
            </div>
          )}
          {(phase === 'animating' || phase === 'initial') && <button className="primary action-btn" disabled>戰鬥中…</button>}
        </div>

        <div className="battle-hint">點擊骰子即可重骰（共 {maxRerolls} 次），決定後按「攻擊」</div>

        {/* 骰型速覽：次要資訊，不跟著骰子指令面板放大，避免展開時卡到英雄站位 */}
        <div
          className="combo-guide-wrap"
          style={usePortraitStack ? undefined : { transform: `scale(${expandablePanelScale})`, transformOrigin: 'top right' }}
        >
          <button className="combo-guide-toggle" onClick={() => setShowComboGuide(v => !v)}>
            骰型速覽 {showComboGuide ? '▲' : '▼'}
          </button>
          {showComboGuide && (
            <div className="combo-guide">
              <div className="combo-guide-rows">
                {comboRows.map(row => {
                  const isSkillCombo = row.rank >= skillRankThreshold ||
                    (hero.role === 'arrow' && row.label === '散骰')
                  return (
                    <div key={row.label} className={`cg-row ${isSkillCombo ? 'cg-skill' : 'cg-normal'}`}>
                      <span className="cg-label">{row.label}</span>
                      <span className="cg-type">{isSkillCombo ? `技能` : '普攻'}</span>
                    </div>
                  )
                })}
              </div>
              <div className="combo-guide-skill-title">
                ✦ {hero.skill}
              </div>
              {skillNotes.map((note, i) => (
                <div key={i} className="combo-guide-note">· {note}</div>
              ))}
            </div>
          )}
        </div>

        {hero.role === 'fighter' && (
          <div
            style={usePortraitStack ? { marginTop: 2 } : { marginTop: 2, transform: `scale(${expandablePanelScale})`, transformOrigin: 'top right' }}
          >
            <button
              onClick={() => setShowFighterMoves(v => !v)}
              style={{ width: '100%', background: '#1e1230', border: '1px solid #5a3a80', borderRadius: 4, color: '#a080c0', fontSize: '9px', padding: '3px 5px', cursor: 'pointer', textAlign: 'left' }}
            >
              📋 招式表 {showFighterMoves ? '▲' : '▼'}
            </button>
            {showFighterMoves && (
              // v1.25.10：加 max-height+捲動，避免展開後一路長到蓋住右下角的英雄血條面板
              <div style={{ background: '#130d1e', border: '1px solid #4a2a70', borderRadius: 6, padding: '4px 6px', fontSize: '8px', marginTop: 2, lineHeight: 1.3, maxHeight: 130, overflowY: 'auto' }}>
                {prevFighterCombo ? (
                  <div style={{ color: '#c0a040', marginBottom: 2, borderBottom: '1px solid #3a2060', paddingBottom: 2 }}>
                    上回合：<strong style={{ color: '#ffcc60' }}>{prevFighterCombo}</strong> → 可接連段 ↓
                  </div>
                ) : (
                  <div style={{ color: '#7060a0', marginBottom: 2, borderBottom: '1px solid #3a2060', paddingBottom: 2 }}>
                    上回合骰型 → 本回合骰型 ＝ 連段觸發
                  </div>
                )}
                {(Object.entries(FIGHTER_CHAINS) as [string, FighterChain][]).map(([key, chain]) => {
                  if (chain.weaponOnly && !hasLeg('fighter_weapon')) return null
                  const [from, to] = key.split('→')
                  const isReachable = prevFighterCombo !== '' && normChainLabel(prevFighterCombo) === from
                  const isActive = isReachable && normChainLabel(comboText) === to
                  const typeColor = chain.type === 'attack' ? '#ff9060' : chain.type === 'defend' ? '#60a8ff' : chain.type === 'heal' ? '#60c870' : '#ffd060'
                  const eff = chain.dmg ? `+${chain.dmg}傷` : chain.def ? `+${chain.def}盾` : chain.healAmt ? `+${chain.healAmt}治` : chain.armorBreak ? `破甲+${chain.armorBreak}` : ''
                  return (
                    <div key={key} style={{
                      display: 'flex', alignItems: 'center', gap: 2, marginBottom: 1,
                      background: isActive ? '#2a1e08' : isReachable ? '#1c1238' : 'transparent',
                      border: isActive ? '1px solid #ffd36e' : isReachable ? '1px solid #7040c0' : '1px solid transparent',
                      borderRadius: 4, padding: '1px 3px',
                      opacity: prevFighterCombo !== '' && !isReachable ? 0.35 : 1,
                      transition: 'opacity 0.2s, border-color 0.2s',
                    }}>
                      <span style={{ color: isReachable ? '#b0c0d8' : '#5060a0', minWidth: 70 }}>{from} → {to}</span>
                      <span style={{ color: typeColor, minWidth: 46, fontWeight: isReachable ? 700 : 400 }}>{chain.name}</span>
                      <span style={{ color: isActive ? '#ffd36e' : '#c8b8e0' }}>{eff}</span>
                      {chain.weaponOnly && <span style={{ color: '#ffd36e', marginLeft: 2 }}>⚔武</span>}
                      {isActive && <span style={{ color: '#ffd36e', marginLeft: 'auto', fontWeight: 700 }}>✓ 就位！</span>}
                    </div>
                  )
                })}
                <div style={{ borderTop: '1px solid #3a2060', marginTop: 3, paddingTop: 3, color: '#7060a0' }}>
                  <div>拳勢每層：傷害 +5% · 受傷 -2%</div>
                  <div>滿 5 層 → 無雙架式 2T（連段效果 ×1.5）</div>
                  <div>技能：依<span style={{ color: '#ff9060' }}>攻</span>/<span style={{ color: '#60a8ff' }}>防</span>/<span style={{ color: '#60c870' }}>息</span>/<span style={{ color: '#ffd060' }}>破</span>連段類型強化</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className="jrpg-party-panel"
        style={usePortraitStack ? undefined : { transform: `scale(${sceneScale})`, transformOrigin: 'bottom right' }}
      >
        {run.party.map((member, idx) => {
          const isActiveMember = idx === run.activePartyIdx
          const memberHero = HEROES.find(h => h.id === member.heroId)
          const curHp = isActiveMember ? heroHp : member.hp
          const displayName = isActiveMember && heroStars > 0
            ? (getHeroStarTitle(member.heroId, heroStars) ?? memberHero?.name ?? member.heroId)
            : (memberHero?.name ?? member.heroId)
          return (
            <div
              key={`${member.heroId}-${idx}`}
              className={`jrpg-party-card ${isActiveMember ? 'active' : ''} ${curHp <= 0 ? 'dead' : ''}`}
            >
              <div className="jpc-name">
                {isActiveMember ? '▶ ' : ''}
                {displayName}
                {isActiveMember && potions.length > 0 && (
                  <span className="jpc-potion-belt">
                    {potions.map((id, i) => {
                      const p = getPotionById(id)
                      if (!p) return null
                      return (
                        <button
                          key={i}
                          className="jpc-potion-btn"
                          disabled={busy}
                          title={`${p.name}：${p.desc}`}
                          onClick={() => usePotion(i)}
                        >
                          <span className="jpc-potion-icon">{p.icon}</span>
                        </button>
                      )
                    })}
                  </span>
                )}
              </div>
              <div className="jpc-hp-text">
                HP {curHp} / {member.maxHp}
                {isActiveMember && guardBonus > 0 && (
                  <span className="jpc-shield-badge">🛡 {guardBonus}</span>
                )}
              </div>
              <div className="jpc-hp-bar">
                <div
                  className="jpc-hp-fill"
                  style={{ width: `${Math.max(0, Math.min(100, (curHp / member.maxHp) * 100))}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <button className="jrpg-log-btn" onClick={() => setShowBattleLog(true)}>
        📜 戰鬥紀錄{log[0] ? `：${log[0]}` : ''}
      </button>
      </div>

      {showBattleLog && (
        <div className="mechanic-info-overlay" onClick={() => setShowBattleLog(false)}>
          <div className="mechanic-info-modal" onClick={e => e.stopPropagation()}>
            <div className="mim-header">
              <span className="mim-title">📜 戰鬥紀錄</span>
              <button className="mim-close" onClick={() => setShowBattleLog(false)}>✕</button>
            </div>
            <div className="mim-body">
              <ul className="battle-log-modal-list">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
            </div>
          </div>
        </div>
      )}

      {showLoadout && (
        <div className="mechanic-info-overlay" onClick={() => setShowLoadout(false)}>
          <div className="mechanic-info-modal" onClick={e => e.stopPropagation()}>
            <div className="mim-header">
              <span className="mim-title">🎒 配置</span>
              <button className="mim-close" onClick={() => setShowLoadout(false)}>✕</button>
            </div>
            <div className="mim-body">
              <div className="battle-loadout-list">
                {run.cards.map(c => <span key={c.id} className={`card-chip rarity-${c.rarity}`}>{c.name}</span>)}
                {equipment.map(e => <span key={e.uid} className={`card-chip rarity-${e.rarity}`}>{e.name}</span>)}
                {run.relics.map(id => <RelicChip key={id} relicId={id} small />)}
              </div>
            </div>
          </div>
        </div>
      )}

      {showMechanicInfo && (
        <div className="mechanic-info-overlay" onClick={() => setShowMechanicInfo(false)}>
          <div className="mechanic-info-modal" onClick={e => e.stopPropagation()}>
            <div className="mim-header">
              <span className="mim-title">📖 機制說明</span>
              <button className="mim-close" onClick={() => setShowMechanicInfo(false)}>✕</button>
            </div>
            <div className="mim-body">
              {isStarEclipse && (
                <div className="mim-section">
                  <div className="mim-section-title">⛔ 禁忌點數</div>
                  <div className="mim-line">部分敵人會設定禁忌骰面（顯示於敵方面板）</div>
                  <div className="mim-line">· 出手含 1 顆禁忌：自傷 3 HP，敵方護盾 +8</div>
                  <div className="mim-line">· 含 2 顆：自傷 10，護盾 +14</div>
                  <div className="mim-line">· 含 3 顆：自傷 18，護盾 +20，施加易傷</div>
                  <div className="mim-line">· 含 4 顆：自傷 28，護盾 +28，施加易傷</div>
                  <div className="mim-line">✓ 完全避開禁忌點數出手可獲得獎勵</div>
                  <div className="mim-section-title" style={{ marginTop: 8 }}>🔱 不穩定骰 ／ ✨ 祝福骰</div>
                  <div className="mim-line">部分裂隙敵人會指定特殊骰面</div>
                  <div className="mim-line">· 不穩定數字：骰出時觸發敵人強化或懲罰</div>
                  <div className="mim-line">· 祝福數字：骰出時英雄獲得 8 護盾</div>
                </div>
              )}
              {isBurningThrone && (
                <div className="mim-section">
                  <div className="mim-section-title">🔥 魔焰</div>
                  <div className="mim-line">魔焰隨敵人攻擊與特殊事件累積（最多 6 格）</div>
                  <div className="mim-line">· 3 格以上：英雄傷害 +10%，敵方攻擊力 +10%</div>
                  <div className="mim-line">· 5 格以上：英雄傷害 +15%，敵方攻擊力 +20%</div>
                  <div className="mim-line">· 6 格（滿）：部分敵人觸發特殊增幅技</div>
                </div>
              )}
              {(isDeepSea || isBlackTide) && (
                <div className="mim-section">
                  <div className="mim-section-title">🫧 氧氣</div>
                  <div className="mim-line">每回合結束自動消耗 1 格氧氣</div>
                  <div className="mim-line">· 歸零：受到深壓傷害</div>
                  <div className="mim-section-title" style={{ marginTop: 8 }}>🌊 潮汐狀態（每幾回合輪換）</div>
                  <div className="mim-line">· 退潮：英雄攻擊 +10%，敵方攻擊 +5%</div>
                  <div className="mim-line">· 漲潮：敵方獲得護盾，英雄重骰次數 -1</div>
                  <div className="mim-line">· 深壓：低骰傷害 +15%，高骰傷害 -10%</div>
                  <div className="mim-line">· 亂流：每次重骰後骰子隨機再轉一次</div>
                </div>
              )}
              {isAshKingdom && run.chapter === 1 && (
                <div className="mim-section">
                  <div className="mim-section-title">🔥 餘燼</div>
                  <div className="mim-line">每 3 回合自動積累 1 格（最多 4 格）</div>
                  <div className="mim-line">· 每格在英雄回合後造成灼傷：1層→2, 2層→3, 3層以上→5</div>
                  <div className="mim-line">· 2 層以上：40% 機率觸發額外燃燒效果</div>
                  <div className="mim-line">· 4 格（滿）：英雄受到的傷害 +15%</div>
                </div>
              )}
              {isAshKingdom && run.chapter === 2 && (
                <div className="mim-section">
                  <div className="mim-section-title">👑 王城記憶</div>
                  <div className="mim-line">· 加冕之日：敵方回合護盾上升</div>
                  <div className="mim-line">· 戰火之夜：對英雄施加燃燒效果</div>
                  <div className="mim-line">· 背叛之刻：英雄進入易傷狀態</div>
                  <div className="mim-line">· 王城陷落：敵方攻擊力 +20%</div>
                </div>
              )}
              {isAshKingdom && run.chapter === 3 && (
                <div className="mim-section">
                  <div className="mim-section-title">💀 王血詛咒</div>
                  <div className="mim-line">受傷或技能被反制時積累詛咒層數</div>
                  <div className="mim-line">· 3 層：英雄受到的傷害 +15%</div>
                  <div className="mim-line">· 5 層：觸發王血爆發——受到「層數 × 8」的傷害，詛咒清除</div>
                </div>
              )}
              {isAshCovenant && (
                <div className="mim-section">
                  <div className="mim-section-title">🔱 聖約進度</div>
                  <div className="mim-line">出手含高點骰子時自動累積，無法降低</div>
                  <div className="mim-line">· 每顆骰出 6 → +6；每顆骰出 5 → +4</div>
                  <div className="mim-line">· 五條 → 額外 +10；大順 → 額外 +8；順子 → 額外 +4</div>
                  <div className="mim-line">· 本次傷害 &gt; 60 → +8；治療 &gt; 30 → +6</div>
                  <div className="mim-line" style={{ marginTop: 6 }}>⚠️ 階段效果</div>
                  <div className="mim-line">· 50%：敵方攻擊力 +10%</div>
                  <div className="mim-line">· 75%：敵方攻擊力 +20%，英雄治療 -20%</div>
                  <div className="mim-line">· 滿格：灰燼審判——受到 30 傷害，進度重置為 30，下回合骰子 -1</div>
                </div>
              )}
              {isAshCovenant && isAshFallenKing && (
                <div className="mim-section">
                  <div className="mim-section-title">💀 最終 BOSS：灰燼殘王 奧爾德雷克（三階段）</div>
                  <div className="mim-line">總 HP 分為三條血條，每次打空血條進入下一階段</div>
                  <div className="mim-line">・ 第一階段【亡國之王】：正常戰鬥</div>
                  <div className="mim-line">　→ 血條打空：召喚王血之火（+4 燃燒），聖約進度 +15</div>
                  <div className="mim-line">・ 第二階段【聖約之王】：攻擊模式增強</div>
                  <div className="mim-line">　→ 血條打空：化為灰燼（+6 燃燒），聖約進度 +15</div>
                  <div className="mim-line">・ 第三階段【灰燼王魂】：真正的最終形態，擊殺後戰鬥結束</div>
                  <div className="mim-line">　⚠️ 第三階段：灰燼審判後聖約進度不低於 40，壓迫更強烈</div>
                  <div className="mim-line">⚠️ 每次階段轉換都會推高聖約進度，小心審判觸發時機</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
