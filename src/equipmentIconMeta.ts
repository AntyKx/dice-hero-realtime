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

/** 部位圖示配色，取自第二批裝備 ICON 匯入包的官方預覽圖（04_預覽/ASTERVOW_裝備圖示預覽.png）。 */
export const EQUIPMENT_SLOT_ICON_COLOR: Record<EquipmentSlot, string> = {
  weapon: '#e9b85c',
  head: '#8db7ff',
  body: '#8db7ff',
  hands: '#db8cff',
  boots: '#69c9aa',
  ring: '#ffd36e',
  accessory: '#c394ff',
  armor: '#8db7ff',
}

export const LOADOUT_SLOT_ICON_COLOR: Record<LoadoutSlot, string> = {
  weapon: '#e9b85c',
  head: '#8db7ff',
  body: '#8db7ff',
  hands: '#db8cff',
  boots: '#69c9aa',
  ring1: '#ffd36e',
  ring2: '#ffd36e',
  accessory: '#c394ff',
}

/** equip-set（套裝/傳說寶箱）沿用武器/戒指同一組金色。 */
export const EQUIP_SET_ICON_COLOR = '#e9b85c'

export function getEquipmentSlotIconColor(slot: string): string {
  if (slot === 'ring1' || slot === 'ring2') return '#ffd36e'
  return EQUIPMENT_SLOT_ICON_COLOR[slot as EquipmentSlot] ?? '#8fb8e8'
}
