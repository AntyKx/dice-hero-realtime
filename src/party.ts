/**
 * 出戰陣容（2026-08）：大廳 3-slot 隊伍系統的純函式層，不碰 React state、
 * 不直接寫 localStorage——寫入走 App.tsx 既有的 updateMeta() 模式，這裡
 * 只回傳新的 PartyState。隊長（slot 0）＝目前實際出戰、傳給 ArenaConfig
 * 的英雄，跟大廳頭像列/立繪 Modal 選英雄是同一件事，不是兩套獨立機制；
 * 支援（slot 1/2）只提供 computePartyBonus() 算出的設定化加成，不生成
 * 戰鬥 AI，不進入 ArenaGame。
 */

export interface PartyState {
  leaderId: string
  supportIds: [string | null, string | null]
}

/** 每位有效支援提供 +4% 最大生命／+4% 傷害，2 位上限 +8%/+8%。 */
export const PARTY_SUPPORT_BONUS_PER_HERO = 0.04

/**
 * 清理/驗證任意來源（舊存檔、雲端存檔、localStorage）的 party 資料：
 * - leaderId 不在 ownedHeroIds 時退回 fallbackHeroId
 * - supportIds 每格獨立驗證，無效或跟其他格重複（含跟隊長重複）一律變 null
 * - 輸入 undefined（舊存檔沒有這個欄位）等同全空
 */
export function sanitizeParty(
  raw: Partial<PartyState> | null | undefined,
  ownedHeroIds: string[],
  fallbackHeroId: string,
): PartyState {
  const owned = new Set(ownedHeroIds)
  const leaderId = raw?.leaderId && owned.has(raw.leaderId) ? raw.leaderId : fallbackHeroId

  const seen = new Set<string>([leaderId])
  const rawSupports = Array.isArray(raw?.supportIds) ? raw!.supportIds : [null, null]
  const supportIds = [0, 1].map(i => {
    const id = rawSupports[i]
    if (!id || !owned.has(id) || seen.has(id)) return null
    seen.add(id)
    return id
  }) as [string | null, string | null]

  return { leaderId, supportIds }
}

/**
 * 替換指定 slot 的英雄。slot 0＝隊長（永遠不可清空，傳 null 視為 no-op）；
 * slot 1/2＝支援（可傳 null 清空）。若 nextHeroId 已存在於「別的」slot，
 * 執行交換（原本佔用的 slot 拿走被替換掉的舊值），保證不會產生重複 heroId。
 */
export function replacePartySlot(
  party: PartyState,
  slotIndex: 0 | 1 | 2,
  nextHeroId: string | null,
): PartyState {
  if (slotIndex === 0 && nextHeroId === null) return party // 隊長不可清空，no-op

  const getSlot = (p: PartyState, i: 0 | 1 | 2) => (i === 0 ? p.leaderId : p.supportIds[i - 1])
  const setSlot = (p: PartyState, i: 0 | 1 | 2, id: string | null): PartyState => {
    if (i === 0) return { ...p, leaderId: id as string }
    const supportIds = [...p.supportIds] as [string | null, string | null]
    supportIds[i - 1] = id
    return { ...p, supportIds }
  }

  const prevValueAtTarget = getSlot(party, slotIndex)
  if (nextHeroId === null) return setSlot(party, slotIndex, null)

  // 找 nextHeroId 目前是否佔用「別的」slot
  const otherSlotIndex = ([0, 1, 2] as const).find(i => i !== slotIndex && getSlot(party, i) === nextHeroId)

  let next = setSlot(party, slotIndex, nextHeroId)
  if (otherSlotIndex !== undefined) {
    // 交換：原本佔用 nextHeroId 的那個 slot，拿走 target slot 原本的值
    // （隊長 slot 不能被清空，若對方是隊長且 target 原本是空的支援格，退回 null 給隊長是不允許的——
    // 這種狀況下 prevValueAtTarget 必定不是 null，因為隊長恆有值，交換永遠安全）
    next = setSlot(next, otherSlotIndex, prevValueAtTarget)
  }
  return next
}

/** 隊伍裡實際有人的 heroId 清單（隊長 + 非 null 支援），供渲染小模組用。 */
export function getPartyHeroIds(party: PartyState): string[] {
  return [party.leaderId, ...party.supportIds.filter((id): id is string => id !== null)]
}

/**
 * 隊長＝目前出戰英雄（合一），所以這裡不需要「activeHeroId 是否等於
 * leaderId」的判斷——只要算「有幾位有效支援」即可，恆對應到目前出戰的
 * 隊長身上。
 */
export function computePartyBonus(party: PartyState): { hpBonusPct: number; dmgBonusPct: number } {
  const supportCount = party.supportIds.filter(id => id !== null).length
  const bonus = supportCount * PARTY_SUPPORT_BONUS_PER_HERO
  return { hpBonusPct: bonus, dmgBonusPct: bonus }
}
