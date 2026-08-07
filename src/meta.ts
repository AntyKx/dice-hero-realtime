import type { MetaState, HeroLoadout, HeroProgress } from './types'
import { HEROES } from './data'
import { defaultHeroProgress } from './talents'
import { refreshLegendaryDesc, migrateEquipment } from './equipment'

const META_KEY = 'dice_hero_meta_v2'

function defaultLoadouts(): Record<string, HeroLoadout> {
  return Object.fromEntries(
    HEROES.map(h => [h.id, {
      weapon: null, head: null, body: null, hands: null,
      boots: null, ring1: null, ring2: null, accessory: null,
    }])
  )
}

function defaultHeroProgressMap(): Record<string, HeroProgress> {
  return Object.fromEntries(HEROES.map(h => [h.id, defaultHeroProgress()]))
}

export function defaultMeta(): MetaState {
  return {
    gold: 0,
    stardust: 0,
    totalRuns: 0,
    totalWins: 0,
    unlockedCardIds: [],
    unlockedRelicIds: [],
    inventory: [],
    loadouts: defaultLoadouts(),
    heroProgress: defaultHeroProgressMap(),
    fateLevel: 0,
    activeFateLevel: 0,
    lockedUids: [],
    items: [],
    worldCup: { picks: [], successCount: 0 },
  }
}

export function loadMeta(): MetaState {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return defaultMeta()
    const parsed = JSON.parse(raw) as Partial<MetaState>
    const def = defaultMeta()
    return {
      ...def,
      ...parsed,
      inventory: (parsed.inventory ?? []).map(it => migrateEquipment(refreshLegendaryDesc(it))),
      loadouts: { ...def.loadouts, ...(parsed.loadouts ?? {}) },
      heroProgress: { ...def.heroProgress, ...(parsed.heroProgress ?? {}) },
      fateLevel: parsed.fateLevel ?? 0,
      activeFateLevel: parsed.activeFateLevel ?? 0,
      lockedUids: parsed.lockedUids ?? [],
      items: parsed.items ?? [],
      worldCup: parsed.worldCup ?? { picks: [], successCount: 0 },
    }
  } catch {
    return defaultMeta()
  }
}

export function saveMeta(meta: MetaState): void {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)) } catch { /* ignore */ }
}

export function calcRunStardust(won: boolean, floorsCleared: number, fateLevel = 0): number {
  const base = (won ? 20 : 5) + floorsCleared * 3
  const bonus = won ? fateLevel * 60 : fateLevel * 15
  return base + bonus
}
