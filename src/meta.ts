import type { MetaState, HeroLoadout, HeroProgress } from './types'
import type { ArenaLoadout } from './arena/equipment'
import { HEROES } from './data'
import { defaultHeroProgress } from './talents'
import { refreshLegendaryDesc, migrateEquipment } from './equipment'
import { sanitizeParty } from './party'

const META_KEY = 'dice_hero_meta_v2'

function defaultLoadouts(): Record<string, HeroLoadout> {
  return Object.fromEntries(
    HEROES.map(h => [h.id, {
      weapon: null, head: null, body: null, hands: null,
      boots: null, ring1: null, ring2: null, accessory: null,
    }])
  )
}

function defaultArenaLoadouts(): Record<string, ArenaLoadout> {
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

// Arena 天賦樹目前版本（2026-08 v2 全面重做：11 個英雄各自手寫 20 格，取代
// 舊版「共用模板 + 1 個 Lv40 Keystone」）。舊存檔的節點 id 格式（{heroId}_n{tier}）
// 剛好跟新版一樣，光看 id 存不存在無法分辨新舊語意是否相符，所以用明確的
// schema 版本號強制重置，不用不可靠的 id 比對猜測，見 loadMeta()。
export const TALENT_TREE_SCHEMA_VERSION = 2

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
    talentTreeSchemaVersion: TALENT_TREE_SCHEMA_VERSION,
    arenaInventory: [],
    arenaLoadouts: defaultArenaLoadouts(),
    arenaGachaPityCount: 0,
    party: { leaderId: HEROES[0].id, supportIds: [null, null] },
  }
}

export function loadMeta(): MetaState {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return defaultMeta()
    const parsed = JSON.parse(raw) as Partial<MetaState>
    const def = defaultMeta()

    // 死亡騎士取代訓獸師（2026-08）：舊存檔的 heroProgress/loadouts 如果還在用
    // 'beastmaster' 這個 key，先搬到 'death_knight'，下面的 merge 邏輯才會正確
    // 接手。只搬未搬過的情況（death_knight 還沒有自己的資料時才搬）。
    const rawHeroProgress: Record<string, HeroProgress> = { ...(parsed.heroProgress as Record<string, HeroProgress> ?? {}) }
    if (rawHeroProgress.beastmaster && !rawHeroProgress.death_knight) {
      rawHeroProgress.death_knight = rawHeroProgress.beastmaster
      delete rawHeroProgress.beastmaster
    }
    const rawLoadouts: Record<string, HeroLoadout> = { ...(parsed.loadouts as Record<string, HeroLoadout> ?? {}) }
    if (rawLoadouts.beastmaster && !rawLoadouts.death_knight) {
      rawLoadouts.death_knight = rawLoadouts.beastmaster
      delete rawLoadouts.beastmaster
    }

    // 舊存檔的 heroProgress[heroId] 物件本身就存在，但缺 talentPoints/
    // allocatedTalentIds 這兩個新欄位——單純 {...def.heroProgress,
    // ...parsed.heroProgress} 只會整組取代掉某個英雄的 progress，不會補
    // 到缺的欄位，所以每個英雄要各自 merge 一次。
    const mergedHeroProgress: Record<string, HeroProgress> = { ...def.heroProgress }
    for (const [heroId, prog] of Object.entries(rawHeroProgress)) {
      mergedHeroProgress[heroId] = { ...defaultHeroProgress(), ...prog }
    }

    // 天賦樹 v2 重做（2026-08）：新舊節點 id 格式剛好都是 {heroId}_n{tier}，
    // 光看 id 存不存在無法分辨語意是否相符，用明確的版本號強制重置一次——
    // 每個英雄的 allocatedTalentIds 清空，talentPoints 依目前等級用新公式
    // （每3級1點）全額重發，不會讓玩家損失已賺得的點數，只是要重新分配。
    const needsTalentReset = (parsed.talentTreeSchemaVersion ?? 0) < TALENT_TREE_SCHEMA_VERSION
    if (needsTalentReset) {
      for (const heroId of Object.keys(mergedHeroProgress)) {
        const prog = mergedHeroProgress[heroId]
        mergedHeroProgress[heroId] = {
          ...prog,
          allocatedTalentIds: [],
          talentPoints: Math.floor(prog.level / 3),
        }
      }
    }

    return {
      ...def,
      ...parsed,
      inventory: (parsed.inventory ?? []).map(it => migrateEquipment(refreshLegendaryDesc(it))),
      loadouts: { ...def.loadouts, ...rawLoadouts },
      heroProgress: mergedHeroProgress,
      fateLevel: parsed.fateLevel ?? 0,
      activeFateLevel: parsed.activeFateLevel ?? 0,
      lockedUids: parsed.lockedUids ?? [],
      items: parsed.items ?? [],
      worldCup: parsed.worldCup ?? { picks: [], successCount: 0 },
      talentTreeSchemaVersion: TALENT_TREE_SCHEMA_VERSION,
      arenaInventory: parsed.arenaInventory ?? [],
      arenaLoadouts: { ...def.arenaLoadouts, ...(parsed.arenaLoadouts ?? {}) },
      party: sanitizeParty(parsed.party, HEROES.map(h => h.id), def.party!.leaderId),
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
