import type { DungeonClearRecord } from './types'

// ── Dice combo scores ──────────────────────────────────────────────────────
export const DICE_SCORE_MAP: Record<string, number> = {
  '散骰': 0,
  '一對': 10,
  '兩對': 25,
  '三條': 60,
  '葫蘆': 120,
  '四條': 180,
  '五條': 300,
  '順子': 200,
}
const CLASS_ULTIMATE_SCORE = 250  // classUltimatePattern: isSkill + rank >= 5

const COMBO_RANK: Record<string, number> = {
  '散骰': 0, '一對': 1, '兩對': 2, '三條': 3, '葫蘆': 4, '順子': 4, '四條': 5, '五條': 6,
}

export function getDiceComboScore(label: string, isSkill: boolean): number {
  const base = DICE_SCORE_MAP[label] ?? 0
  const ultimate = isSkill && (COMBO_RANK[label] ?? 0) >= 5 ? CLASS_ULTIMATE_SCORE : 0
  return base + ultimate
}

// ── Challenge bonus ────────────────────────────────────────────────────────
export type DungeonChallenge = { id: string; name: string; desc: string }

const GENERIC_CHALLENGES: DungeonChallenge[] = [
  { id: 'speed_kill', name: '速殺高手', desc: '5 場戰鬥在 3 回合內獲勝' },
  { id: 'no_damage',  name: '無傷達人', desc: '3 場戰鬥未受到任何傷害' },
  { id: 'elite_hunt', name: '精英獵手', desc: '擊敗 4 個精英或小Boss節點' },
]

export const DUNGEON_CHALLENGE_SETS: Record<string, DungeonChallenge[]> = {
  star_eclipse: [
    ...GENERIC_CHALLENGES,
    { id: 'clean_attack', name: '禁忌免疫', desc: '5 場出手完全未觸發禁忌效果' },
    { id: 'clean_burst',  name: '淨骰爆發', desc: '3 場以無禁忌出手造成 80+ 傷害' },
  ],
  burning_throne: [
    ...GENERIC_CHALLENGES,
    { id: 'no_backlash', name: '無噬之道', desc: '5 場戰鬥未觸發魔焰反噬' },
    { id: 'flame_peak',  name: '焰獄領主', desc: '4 場戰鬥魔焰峰值達到 5 格以上' },
  ],
  black_tide: [
    ...GENERIC_CHALLENGES,
    { id: 'oxygen_safe', name: '深淵之肺', desc: '5 場戰鬥氧氣未完全耗盡' },
    { id: 'tide_burst',  name: '退潮爆發', desc: '3 場退潮/亂流狀態造成 90+ 傷害' },
  ],
  ash_covenant: [
    ...GENERIC_CHALLENGES,
    { id: 'judgment_surv', name: '審判倖存者', desc: '整趟觸發 5 次以上灰燼審判' },
    { id: 'covenant_low',  name: '聖約克制',   desc: '3 場結束時聖約進度低於 50' },
  ],
}

export function getDungeonChallenges(dungeonId: string): DungeonChallenge[] {
  return DUNGEON_CHALLENGE_SETS[dungeonId] ?? GENERIC_CHALLENGES
}

// backward compat
export const DUNGEON_CHALLENGES = GENERIC_CHALLENGES

export function computeChallengesCompleted(
  dungeonId: string,
  tracking: {
    speedKillCount: number
    noDamageWins: number
    eliteNodesCleared: number
    cleanAttackWins: number
    cleanHighDmgWins: number
    noBacklashWins: number
    highFlamePeakWins: number
    oxygenSafeWins: number
    tideDmgWins: number
    totalJudgments: number
    lowCovenantWins: number
  }
): number {
  let n = 0
  if (tracking.speedKillCount >= 5)    n++
  if (tracking.noDamageWins >= 3)      n++
  if (tracking.eliteNodesCleared >= 4) n++
  if (dungeonId === 'star_eclipse') {
    if (tracking.cleanAttackWins >= 5)  n++
    if (tracking.cleanHighDmgWins >= 3) n++
  } else if (dungeonId === 'burning_throne') {
    if (tracking.noBacklashWins >= 5)    n++
    if (tracking.highFlamePeakWins >= 4) n++
  } else if (dungeonId === 'black_tide') {
    if (tracking.oxygenSafeWins >= 5) n++
    if (tracking.tideDmgWins >= 3)    n++
  } else if (dungeonId === 'ash_covenant') {
    if (tracking.totalJudgments >= 5)  n++
    if (tracking.lowCovenantWins >= 3) n++
  }
  return n
}

export function getChallengeBonusScore(count: number): number {
  if (count >= 5) return 1300
  if (count >= 4) return 900
  if (count >= 3) return 600
  if (count >= 2) return 350
  if (count >= 1) return 150
  return 0
}

// ── Rank grade ─────────────────────────────────────────────────────────────
export type RankGrade = 'A' | 'S' | 'SS' | 'SSS'

export function getRankGrade(score: number): RankGrade {
  if (score >= 4500) return 'SSS'
  if (score >= 3700) return 'SS'
  if (score >= 3000) return 'S'
  return 'A'
}

// ── Score formula ──────────────────────────────────────────────────────────
export function calculateDungeonScore(params: {
  totalTurns: number
  remainingHpPercent: number
  diceScore: number
  challengeBonus: number
}): number {
  const { totalTurns, remainingHpPercent, diceScore, challengeBonus } = params
  return Math.max(0, Math.round(
    1000
    + Math.max(0, 1200 - totalTurns * 45)
    + remainingHpPercent * 900
    + Math.min(diceScore, 700)
    + challengeBonus
  ))
}

// ── Season ID (year + ISO week) ────────────────────────────────────────────
export function getSeasonId(): string {
  const now = new Date()
  const jan1 = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`
}

// ── Player identity (localStorage) ────────────────────────────────────────
export function getPlayerId(): string {
  let id = localStorage.getItem('dh_player_id')
  if (!id) {
    id = `p_${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem('dh_player_id', id)
  }
  return id
}

export function getPlayerName(): string {
  return localStorage.getItem('dh_player_name') ?? '勇者'
}

export function setPlayerName(name: string): void {
  localStorage.setItem('dh_player_name', (name.trim() || '勇者').slice(0, 12))
}

// ── Leaderboard (localStorage) ─────────────────────────────────────────────
const MAX_LB_ENTRIES = 100

function lbKey(dungeonId: string, heroClass: string | null, seasonId: string | null): string {
  const parts = ['dh_lb', dungeonId]
  if (heroClass) parts.push(heroClass)
  if (seasonId)  parts.push(seasonId)
  return parts.join('_')
}

function loadBoard(key: string): DungeonClearRecord[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') } catch { return [] }
}

function saveBoard(key: string, records: DungeonClearRecord[]): void {
  try { localStorage.setItem(key, JSON.stringify(records)) } catch { /* quota exceeded */ }
}

function sortBoard(records: DungeonClearRecord[]): DungeonClearRecord[] {
  return [...records].sort((a, b) => {
    if ((b.score ?? 0) !== (a.score ?? 0))                       return (b.score ?? 0) - (a.score ?? 0)
    if (a.totalTurns !== b.totalTurns)                           return a.totalTurns - b.totalTurns
    if ((b.remainingHpPercent ?? 0) !== (a.remainingHpPercent ?? 0)) return (b.remainingHpPercent ?? 0) - (a.remainingHpPercent ?? 0)
    return a.clearTime.localeCompare(b.clearTime)
  })
}

export type RankPositions = {
  weeklyAllRank: number
  weeklyClassRank: number
  historyAllRank: number
  historyClassRank: number
}

export function saveLeaderboardRecord(record: DungeonClearRecord): RankPositions {
  const seasonId  = record.seasonId ?? getSeasonId()
  const heroClass = record.heroClass
  const dungeonId = record.dungeonId

  const keyMap = {
    weeklyAllRank:    lbKey(dungeonId, null,      seasonId),
    weeklyClassRank:  lbKey(dungeonId, heroClass,  seasonId),
    historyAllRank:   lbKey(dungeonId, null,       null),
    historyClassRank: lbKey(dungeonId, heroClass,  null),
  }

  const result = {} as RankPositions
  for (const [field, key] of Object.entries(keyMap) as [keyof RankPositions, string][]) {
    const board  = loadBoard(key)
    board.push(record)
    const sorted = sortBoard(board).slice(0, MAX_LB_ENTRIES)
    saveBoard(key, sorted)
    result[field] = sorted.findIndex(r => r.id === record.id) + 1
  }
  return result
}

export function getLeaderboard(
  dungeonId: string,
  heroClass: string | null,
  seasonId:  string | null,
): DungeonClearRecord[] {
  return loadBoard(lbKey(dungeonId, heroClass, seasonId))
}

// ── Cloud leaderboard API ──────────────────────────────────────────────────
const LEADERBOARD_API = '/leaderboard'

export async function saveLeaderboardRecordCloud(record: DungeonClearRecord): Promise<RankPositions | null> {
  try {
    const res = await fetch(LEADERBOARD_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    })
    if (!res.ok) return null
    const data = await res.json() as { ok: boolean; ranks?: RankPositions }
    return data.ranks ?? null
  } catch {
    return null
  }
}

export async function getLeaderboardCloud(
  dungeonId: string,
  heroClass: string | null,
  seasonId:  string | null,
  limit = 50,
): Promise<DungeonClearRecord[]> {
  try {
    const params = new URLSearchParams({ dungeonId, limit: String(limit) })
    if (heroClass) params.set('heroClass', heroClass)
    // seasonId null = history (query with '' = all-time rows)
    params.set('seasonId', seasonId ?? '')
    const res = await fetch(`${LEADERBOARD_API}?${params}`)
    if (!res.ok) return []
    return (await res.json()) as DungeonClearRecord[]
  } catch {
    return []
  }
}
