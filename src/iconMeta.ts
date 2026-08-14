import type { Role } from './types'
import { ROLE_LABEL } from './equipment'
import type { AsterVowIconName } from './components/AsterVowIcon'

export interface RoleIconMeta {
  icon: AsterVowIconName
  color: string
  label: string
}

/** 大廳、英雄編成與角色立繪共用；新增職業時由 TypeScript 強制補齊。 */
export const ROLE_ICON_META: Record<Role, RoleIconMeta> = {
  slash:   { icon: 'role-slash',   color: '#6090ff', label: ROLE_LABEL.slash },
  fire:    { icon: 'role-fire',    color: '#ff6040', label: ROLE_LABEL.fire },
  holy:    { icon: 'role-holy',    color: '#ffd36e', label: ROLE_LABEL.holy },
  shadow:  { icon: 'role-shadow',  color: '#a060ff', label: ROLE_LABEL.shadow },
  ice:     { icon: 'role-ice',     color: '#60c8ff', label: ROLE_LABEL.ice },
  arrow:   { icon: 'role-arrow',   color: '#60d080', label: ROLE_LABEL.arrow },
  hammer:  { icon: 'role-hammer',  color: '#c08040', label: ROLE_LABEL.hammer },
  song:    { icon: 'role-song',    color: '#ff80c0', label: ROLE_LABEL.song },
  beast:   { icon: 'role-beast',   color: '#d08040', label: ROLE_LABEL.beast },
  gear:    { icon: 'role-gear',    color: '#90a0b0', label: ROLE_LABEL.gear },
  fighter: { icon: 'role-fighter', color: '#e07050', label: ROLE_LABEL.fighter },
  death:   { icon: 'role-death',   color: '#9a78c8', label: ROLE_LABEL.death },
}

export const CHAPTER_ICON: Record<'main' | 'rift_omen' | 'deep_sea', AsterVowIconName> = {
  main: 'chapter-forest',
  rift_omen: 'chapter-rift',
  deep_sea: 'chapter-deep-sea',
}

export const DUNGEON_ICON: Record<string, AsterVowIconName> = {
  burning_throne: 'dungeon-burning-throne',
  ash_covenant: 'dungeon-ash-covenant',
  star_eclipse: 'dungeon-star-eclipse',
  black_tide: 'dungeon-black-tide',
}

export function getDungeonIcon(id: string): AsterVowIconName {
  return DUNGEON_ICON[id] ?? 'nav-dungeon'
}
