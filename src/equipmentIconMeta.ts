import type { EquipmentSlot, LoadoutSlot } from './types'
import type { AsterVowIconName } from './components/AsterVowIcon'
import type { ChestType } from './chests'

/** 裝備頁、掉落、鍛造與即時制裝備共用的正式圖示對照。 */
export const EQUIPMENT_SLOT_ICON: Record<EquipmentSlot, AsterVowIconName> = {
  weapon: 'equip-weapon',
  head: 'equip-head',
  body: 'equip-body',
  hands: 'equip-hands',
  boots: 'equip-boots',
  ring: 'equip-ring',
  accessory: 'equip-accessory',
  armor: 'equip-body',
}

export const LOADOUT_SLOT_ICON: Record<LoadoutSlot, AsterVowIconName> = {
  weapon: 'equip-weapon',
  head: 'equip-head',
  body: 'equip-body',
  hands: 'equip-hands',
  boots: 'equip-boots',
  ring1: 'equip-ring',
  ring2: 'equip-ring',
  accessory: 'equip-accessory',
}

export const CHEST_ICON: Record<ChestType, AsterVowIconName> = {
  chest_normal: 'system-gift',
  chest_hero: 'system-gift',
  chest_legendary: 'system-leaderboard',
  chest_role_legendary: 'equip-set',
}

export function getEquipmentSlotIcon(slot: string): AsterVowIconName {
  if (slot === 'ring1' || slot === 'ring2') return 'equip-ring'
  return EQUIPMENT_SLOT_ICON[slot as EquipmentSlot] ?? 'nav-equipment'
}
