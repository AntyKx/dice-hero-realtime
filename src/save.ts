import type { RunState, GamePhase, BuffCard, Equipment } from './types'
import type { Relic } from './types'

const SAVE_KEY = 'dice_hero_run_v1'

export type RunSave = {
  run: RunState
  phase: GamePhase
  rewardCards: BuffCard[]
  rewardRelics: Relic[]
  pendingDrop: Equipment | null
  pendingPhaseAfterDrop: GamePhase
  savedAt: string   // ISO timestamp
}

export function saveRun(data: Omit<RunSave, 'savedAt'>): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, savedAt: new Date().toISOString() }))
  } catch { /* quota exceeded etc. */ }
}

export function loadSavedRun(): RunSave | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? (JSON.parse(raw) as RunSave) : null
  } catch {
    return null
  }
}

export function clearSavedRun(): void {
  try { localStorage.removeItem(SAVE_KEY) } catch { /* ignore */ }
}

export function hasSavedRun(): boolean {
  return !!localStorage.getItem(SAVE_KEY)
}

export function relativeTime(isoStr: string): string {
  const mins = Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000)
  if (mins < 1) return '剛才'
  if (mins < 60) return `${mins} 分鐘前`
  const h = Math.floor(mins / 60)
  return h < 24 ? `${h} 小時前` : `${Math.floor(h / 24)} 天前`
}
