import type { Role, EquipmentSlot, EquipmentRarity, Equipment } from './types'
import { generateEquipment, generateSetPiece } from './equipment'

export type ChestType = 'chest_normal' | 'chest_hero' | 'chest_legendary' | 'chest_role_legendary'

export interface ChestDef {
  id: ChestType
  name: string
  color: string
  icon: string
  desc: string
}

export const CHEST_DEFS: Record<ChestType, ChestDef> = {
  chest_normal: {
    id: 'chest_normal', name: '一般寶箱', color: '#60b8e0', icon: '📦',
    desc: '副本一般難度通關獎勵',
  },
  chest_hero: {
    id: 'chest_hero', name: '英雄寶箱', color: '#b060ff', icon: '🎁',
    desc: '副本英雄難度通關獎勵',
  },
  chest_legendary: {
    id: 'chest_legendary', name: '傳奇寶箱', color: '#ffd36e', icon: '👑',
    desc: '副本傳奇難度通關獎勵',
  },
  chest_role_legendary: {
    id: 'chest_role_legendary', name: '自選套裝寶箱', color: '#ff6fa8', icon: '🏆',
    desc: '世界盃競猜累積5次成功獎勵：開啟前自選1個職業，獲得該職業套裝的1件傳奇裝備',
  },
}

export interface ChestLootResult {
  equipment: Equipment[]
  stardust: number
}

const ALL_ROLES: Role[] = ['slash','fire','holy','shadow','ice','arrow','hammer','song','beast','gear','fighter']
const ALL_SLOTS: EquipmentSlot[] = ['weapon','head','body','hands','boots','ring','accessory']
const rndRole = (): Role => ALL_ROLES[Math.floor(Math.random() * ALL_ROLES.length)]
const rndSlot = (): EquipmentSlot => ALL_SLOTS[Math.floor(Math.random() * ALL_SLOTS.length)]
const genEq  = (slot: EquipmentSlot, rarity: EquipmentRarity, role?: Role) =>
  generateEquipment(slot, rarity, role)
const genSet = (rarity: EquipmentRarity) => generateSetPiece(rndRole(), rarity)

export function openChest(type: ChestType): ChestLootResult {
  const r = Math.random() * 100

  // ── Normal Chest ──────────────────────────────────────────────────────────
  // 80% magic generic, 20% rare generic
  if (type === 'chest_normal') {
    const rarity: EquipmentRarity = r < 80 ? 'magic' : 'rare'
    return { equipment: [genEq(rndSlot(), rarity)], stardust: 15 }
  }

  // ── Hero Chest ────────────────────────────────────────────────────────────
  // 55% rare generic, 33% rare random-class set, 12% legendary generic
  if (type === 'chest_hero') {
    if (r < 55) return { equipment: [genEq(rndSlot(), 'rare')], stardust: 35 }
    if (r < 88) return { equipment: [genSet('rare')], stardust: 35 }
    return { equipment: [genEq(rndSlot(), 'legendary')], stardust: 50 }
  }

  // ── Legendary Chest ───────────────────────────────────────────────────────
  // 38% rare random-class set, 22% rare generic, 12% legendary generic,
  // 15% legendary random-class set, 8% legendary random-class weapon,
  // 5% legendary random-class set + rare random-class set bonus
  if (r < 38)  return { equipment: [genSet('rare')], stardust: 70 }
  if (r < 60)  return { equipment: [genEq(rndSlot(), 'rare')], stardust: 70 }
  if (r < 72)  return { equipment: [genEq(rndSlot(), 'legendary')], stardust: 90 }
  if (r < 87)  return { equipment: [genSet('legendary')], stardust: 90 }
  if (r < 95)  return { equipment: [genEq('weapon', 'legendary', rndRole())], stardust: 90 }
  return {
    equipment: [genSet('legendary'), genSet('rare')],
    stardust: 100,
  }
}

// 自選套裝寶箱：玩家指定職業，直接開出該職業套裝的 1 件傳奇裝備
export function openRoleLegendaryChest(role: Role): ChestLootResult {
  return { equipment: [generateSetPiece(role, 'legendary')], stardust: 0 }
}
