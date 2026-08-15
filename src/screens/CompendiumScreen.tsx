import { useEffect, useState } from 'react'
import { ALL_BUFF_CARDS } from '../buffCards'
import { ALL_POTIONS } from '../potions'
import { ENEMIES, HEROES } from '../data'
import { getEnemyMechanic, MECHANIC_DESC } from '../bosses'
import { ARENA_RELICS, ARENA_WEAPON_RELICS, type ArenaRelic } from '../arena/relics'
import SpriteAnimator from '../components/SpriteAnimator'
import AsterVowIcon from '../components/AsterVowIcon'
import type { Role } from '../types'

const ROLE_LABEL: Record<string, string> = {
  slash: '聖騎士', fire: '火焰法師', holy: '神官祭司',
  shadow: '影刃刺客', ice: '皇家公主', arrow: '遊俠獵人',
  hammer: '矮人戰士', song: '吟遊詩人', beast: '獸語馴獸師', gear: '機關技師',
  fighter: '武鬥家', death: '死靈騎士',
}
const ROLE_COLOR: Record<string, string> = {
  slash: '#6090ff', fire: '#ff6030', holy: '#ffd36e', shadow: '#a060ff',
  ice: '#60d0ff', arrow: '#80e060', hammer: '#c09050', song: '#ff90c0',
  beast: '#a0703a', gear: '#80a0c0', fighter: '#e07830', death: '#9a78c8',
}
const RARITY_LABEL: Record<string, string> = { common: '普通', rare: '稀有', epic: '史詩' }
const RARITY_COLOR: Record<string, string> = { common: '#8090a8', rare: '#6db8ff', epic: '#d080ff' }
const CHAPTER_TAG: Record<number, { label: string; color: string }> = {
  1: { label: '🌲 森林遺跡', color: '#80e090' },
  2: { label: '❄️ 雪原地城', color: '#80c8ff' },
  3: { label: '🔥 魔王城',   color: '#ff8060' },
}

// ── 副本怪物定義 ──────────────────────────────────────────────────────────
const STAR_ECLIPSE_ENEMY_IDS = new Set([
  'rift_imp', 'star_sand_golem', 'mirror_thief',
  'eclipse_nun', 'rift_guardian', 'star_reaper', 'eclipse_bishop',
])
const BURNING_THRONE_ENEMY_IDS = new Set([
  'flame_imp', 'molten_guard', 'ash_mage', 'inferno_hound',
  'black_flame_knight', 'fallen_fire_priest', 'throne_demon_king',
])
const BLACK_TIDE_ENEMY_IDS = new Set([
  'tidal_shell_guard', 'azure_jellyfish_envoy', 'drowned_court_soldier',
  'coral_guard_captain', 'deep_pressure_eel', 'sunken_crown_witch', 'tide_king_ausrein',
])
const ASH_COVENANT_ENEMY_IDS = new Set([
  'covenant_ember', 'royal_blood_disciple', 'ash_judge',
  'mass_resentment', 'covenant_guard', 'crown_priest_seron', 'ash_fallen_king_aldrek',
])
const DUNGEON_ENEMY_IDS = new Set([...STAR_ECLIPSE_ENEMY_IDS, ...BURNING_THRONE_ENEMY_IDS, ...BLACK_TIDE_ENEMY_IDS, ...ASH_COVENANT_ENEMY_IDS])

type DungeonEnemyInfo = { label: string; color: string; area: string; dungeon: 'star_eclipse' | 'burning_throne' | 'black_tide' | 'ash_covenant' }
const DUNGEON_ENEMY_TYPE: Record<string, DungeonEnemyInfo> = {
  rift_imp:           { label: '普通',   color: '#8090a8', area: '裂隙入口', dungeon: 'star_eclipse' },
  star_sand_golem:    { label: '普通',   color: '#8090a8', area: '裂隙入口', dungeon: 'star_eclipse' },
  mirror_thief:       { label: '普通',   color: '#8090a8', area: '星蝕迴廊', dungeon: 'star_eclipse' },
  eclipse_nun:        { label: '區首領', color: '#c070ff', area: '裂隙入口', dungeon: 'star_eclipse' },
  rift_guardian:      { label: '精英',   color: '#6db8ff', area: '星蝕迴廊', dungeon: 'star_eclipse' },
  star_reaper:        { label: '精英',   color: '#6db8ff', area: '星蝕迴廊', dungeon: 'star_eclipse' },
  eclipse_bishop:     { label: 'BOSS',   color: '#ffd36e', area: '主教寢宮', dungeon: 'star_eclipse' },
  flame_imp:          { label: '普通',   color: '#8090a8', area: '焰獄前廳', dungeon: 'burning_throne' },
  molten_guard:       { label: '普通',   color: '#8090a8', area: '焰獄前廳', dungeon: 'burning_throne' },
  ash_mage:           { label: '普通',   color: '#8090a8', area: '熔岩走廊', dungeon: 'burning_throne' },
  inferno_hound:      { label: '普通',   color: '#8090a8', area: '熔岩走廊', dungeon: 'burning_throne' },
  black_flame_knight: { label: '精英',   color: '#6db8ff', area: '熔岩走廊', dungeon: 'burning_throne' },
  fallen_fire_priest: { label: '精英',   color: '#6db8ff', area: '王座廳',   dungeon: 'burning_throne' },
  throne_demon_king:  { label: 'BOSS',   color: '#ffd36e', area: '王座廳',   dungeon: 'burning_throne' },
  tidal_shell_guard:    { label: '普通',   color: '#8090a8', area: '潮汐前廳', dungeon: 'black_tide' },
  azure_jellyfish_envoy:{ label: '普通',   color: '#8090a8', area: '潮汐前廳', dungeon: 'black_tide' },
  drowned_court_soldier:{ label: '普通',   color: '#8090a8', area: '深壓廊道', dungeon: 'black_tide' },
  coral_guard_captain:  { label: '精英',   color: '#6db8ff', area: '深壓廊道', dungeon: 'black_tide' },
  deep_pressure_eel:    { label: '精英',   color: '#6db8ff', area: '深壓廊道', dungeon: 'black_tide' },
  sunken_crown_witch:   { label: '小頭目', color: '#c070ff', area: '深壓廊道', dungeon: 'black_tide' },
  tide_king_ausrein:    { label: 'BOSS',   color: '#ffd36e', area: '沉海王座', dungeon: 'black_tide' },
  covenant_ember:          { label: '普通',   color: '#8090a8', area: '聖約前廳', dungeon: 'ash_covenant' },
  royal_blood_disciple:    { label: '普通',   color: '#8090a8', area: '聖約前廳', dungeon: 'ash_covenant' },
  ash_judge:               { label: '精英',   color: '#6db8ff', area: '灰燼迴廊', dungeon: 'ash_covenant' },
  mass_resentment:         { label: '普通',   color: '#8090a8', area: '灰燼迴廊', dungeon: 'ash_covenant' },
  covenant_guard:          { label: '精英',   color: '#6db8ff', area: '灰燼迴廊', dungeon: 'ash_covenant' },
  crown_priest_seron:      { label: '小頭目', color: '#c070ff', area: '祭火聖堂', dungeon: 'ash_covenant' },
  ash_fallen_king_aldrek:  { label: 'BOSS',   color: '#ffd36e', area: '王座廢墟', dungeon: 'ash_covenant' },
}

const STAR_ECLIPSE_AREA_ORDER   = ['裂隙入口', '星蝕迴廊', '主教寢宮']
const BURNING_THRONE_AREA_ORDER = ['焰獄前廳', '熔岩走廊', '王座廳']
const BLACK_TIDE_AREA_ORDER     = ['潮汐前廳', '深壓廊道', '沉海王座']
const ASH_COVENANT_AREA_ORDER   = ['聖約前廳', '灰燼迴廊', '祭火聖堂', '王座廢墟']

type MainTab = 'relics' | 'cards' | 'potions' | 'monsters' | 'dungeon_monsters'

const ALL_ROLES = Object.keys(ROLE_LABEL) as Role[]

const ENEMY_CHAPTER: Record<string, number> = {
  goblin: 1, skeleton: 1, orc: 1, mimic: 1, golem: 1,
  ice_wolf: 2, slimeking: 2, lightning_lancer: 2, yeti: 2, ice_witch: 2,
  fire_hound: 3, bat_dragon: 3, dark_sorceress: 3, dark_knight: 3, dragon: 3,
}

// 裂隙前兆篇出現區域
const RIFT_ENEMY_CHAPTER: Record<string, number> = {
  sand_rat: 1, rift_goblin: 1, star_slime: 1, rift_scout: 1, sand_beast: 1,
  moon_rogue: 2, ruin_guard: 2, moon_mage: 2, mirror_assassin: 2, moon_executor: 2,
  dark_devotee: 3, rift_praying: 3, black_judge: 3, dark_shaman: 3, bishop_vanguard: 3,
}
const RIFT_CHAPTER_TAG: Record<number, { label: string; color: string }> = {
  1: { label: '🏜️ 星砂邊境', color: '#c8a060' },
  2: { label: '🌙 月影廢都', color: '#9080cc' },
  3: { label: '⛪ 暗月聖堂', color: '#6070cc' },
}

// 深海遺城篇
const DEEP_SEA_ENEMY_IDS = new Set([
  'coral_crab', 'blue_jellyfish', 'tide_piranha', 'coral_colossus', 'abyss_anglerfish',
  'drowned_guard', 'deep_lancer', 'heavy_drowned', 'sea_priestess', 'sea_emperor_guard',
  'abyss_siren', 'ancient_shell_knight', 'leviathan_pup', 'sea_queen', 'sleeping_emperor',
])
const DEEP_SEA_ENEMY_CHAPTER: Record<string, number> = {
  coral_crab: 1, blue_jellyfish: 1, tide_piranha: 1, coral_colossus: 1, abyss_anglerfish: 1,
  drowned_guard: 2, deep_lancer: 2, heavy_drowned: 2, sea_priestess: 2, sea_emperor_guard: 2,
  abyss_siren: 3, ancient_shell_knight: 3, leviathan_pup: 3, sea_queen: 3, sleeping_emperor: 3,
}
const DEEP_SEA_CHAPTER_TAG: Record<number, { label: string; color: string }> = {
  1: { label: '🪸 珊瑚淺灘', color: '#60d0c0' },
  2: { label: '🏚️ 沉沒王城', color: '#6090c0' },
  3: { label: '🌀 海皇深淵', color: '#8060e0' },
}

// 灰燼王國篇
const ASH_KINGDOM_ENEMY_CHAPTER: Record<string, number> = {
  ash_soldier: 1, charred_archer: 1, molten_shieldman: 1, ember_commander: 1, levok: 1,
  castle_remnant: 2, ash_guard: 2, broken_knight: 2, lost_court_mage: 2, laon: 2,
  tomb_keeper: 3, soul_knight: 3, royal_soul: 3, forbidden_priest: 3, elysia: 3,
}
const ASH_KINGDOM_CHAPTER_TAG: Record<number, { label: string; color: string }> = {
  1: { label: '🏚️ 王城餘燼', color: '#d07830' },
  2: { label: '👑 亡國迴廊', color: '#b06020' },
  3: { label: '💀 灰燼王陵', color: '#9a8070' },
}

const MAIN_ENEMIES = ENEMIES.filter(e => !DUNGEON_ENEMY_IDS.has(e.id))
const STAR_ECLIPSE_ENEMIES = ENEMIES.filter(e => STAR_ECLIPSE_ENEMY_IDS.has(e.id))
  .sort((a, b) => STAR_ECLIPSE_AREA_ORDER.indexOf(DUNGEON_ENEMY_TYPE[a.id]?.area ?? '') - STAR_ECLIPSE_AREA_ORDER.indexOf(DUNGEON_ENEMY_TYPE[b.id]?.area ?? ''))
const BURNING_THRONE_ENEMIES = ENEMIES.filter(e => BURNING_THRONE_ENEMY_IDS.has(e.id))
  .sort((a, b) => BURNING_THRONE_AREA_ORDER.indexOf(DUNGEON_ENEMY_TYPE[a.id]?.area ?? '') - BURNING_THRONE_AREA_ORDER.indexOf(DUNGEON_ENEMY_TYPE[b.id]?.area ?? ''))
const BLACK_TIDE_ENEMIES = ENEMIES.filter(e => BLACK_TIDE_ENEMY_IDS.has(e.id))
  .sort((a, b) => BLACK_TIDE_AREA_ORDER.indexOf(DUNGEON_ENEMY_TYPE[a.id]?.area ?? '') - BLACK_TIDE_AREA_ORDER.indexOf(DUNGEON_ENEMY_TYPE[b.id]?.area ?? ''))
const ASH_COVENANT_ENEMIES = ENEMIES.filter(e => ASH_COVENANT_ENEMY_IDS.has(e.id))
  .sort((a, b) => ASH_COVENANT_AREA_ORDER.indexOf(DUNGEON_ENEMY_TYPE[a.id]?.area ?? '') - ASH_COVENANT_AREA_ORDER.indexOf(DUNGEON_ENEMY_TYPE[b.id]?.area ?? ''))
const DUNGEON_ENEMIES = [...STAR_ECLIPSE_ENEMIES, ...BURNING_THRONE_ENEMIES, ...BLACK_TIDE_ENEMIES, ...ASH_COVENANT_ENEMIES]

const MONSTER_SPRITE_TARGET_H        = 88
const DUNGEON_SPRITE_TARGET_H        = 110
const THRONE_SPRITE_TARGET_H         = 140
const BLACK_TIDE_SPRITE_TARGET_H     = 130
const ASH_COVENANT_SPRITE_TARGET_H   = 140

/** 即時制武器專屬遺物的 weaponTag 是 `{heroId}_weapon`，反推回 heroId 用來顯示英雄名稱/篩選。 */
function heroIdFromWeaponTag(tag?: string): string | undefined {
  return tag?.replace(/_weapon$/, '')
}

export default function CompendiumScreen({ onClose }: { onClose: () => void }) {
  const [tab, setTab]                = useState<MainTab>('relics')
  const [relicHeroFilter, setRelicHeroFilter] = useState<'all' | 'universal' | string>('all')
  const [rarityFilter, setRarityFilter] = useState<'all' | 'common' | 'rare' | 'epic'>('all')
  const [cardRoleFilter, setCardRoleFilter] = useState<'all' | 'universal' | Role>('all')

  // 鎖住背景頁面捲動：手機上拖到列表底/頂端時，觸控滑動會「穿透」到背景頁面造成卡頓感
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [])

  // 遺物圖鑑改接即時制遺物（arena/relics.ts，2026-08）：回合制 relics.ts 那套
  // 現在打不到（FEATURE_FLAGS.turnBasedMainline=false），圖鑑列出的東西玩家
  // 永遠不會真的拿到，改成列出打 Arena Boss 真的會掉的 17 個（6 通用 + 11
  // 英雄武器專屬）。
  const allArenaRelics: (ArenaRelic & { heroId?: string })[] = [
    ...ARENA_RELICS,
    ...ARENA_WEAPON_RELICS.map(r => ({ ...r, heroId: heroIdFromWeaponTag(r.weaponTag) })),
  ]
  const filteredRelics = allArenaRelics.filter(r => {
    if (relicHeroFilter === 'all') return true
    if (relicHeroFilter === 'universal') return !r.weaponTag
    return r.heroId === relicHeroFilter
  })
  const filteredCards = ALL_BUFF_CARDS.filter(c => {
    const rarityOK = rarityFilter === 'all' || c.rarity === rarityFilter
    const roleOK = cardRoleFilter === 'all' || (cardRoleFilter === 'universal' ? !c.role : c.role === cardRoleFilter)
    return rarityOK && roleOK
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="compendium-box" onClick={e => e.stopPropagation()}>

        <div className="compendium-header">
          <h2>📖 圖鑑</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs compendium-tabs">
          <button className={`modal-tab ${tab === 'relics'  ? 'active' : ''}`} onClick={() => setTab('relics')}>💎 遺物</button>
          <button className={`modal-tab ${tab === 'cards'   ? 'active' : ''}`} onClick={() => setTab('cards')}>🃏 增益卡</button>
          <button className={`modal-tab ${tab === 'potions' ? 'active' : ''}`} onClick={() => setTab('potions')}>🧪 藥水</button>
          <button className={`modal-tab ${tab === 'monsters' ? 'active' : ''}`} onClick={() => setTab('monsters')}>👹 主線怪物</button>
          <button className={`modal-tab ${tab === 'dungeon_monsters' ? 'active' : ''}`} onClick={() => setTab('dungeon_monsters')}>🏰 副本怪物</button>
        </div>

        {/* Relics（即時制 arena/relics.ts，2026-08 改接） */}
        {tab === 'relics' && (
          <>
            <div className="compendium-filters">
              <button className={`cf-btn ${relicHeroFilter === 'all' ? 'active' : ''}`}       onClick={() => setRelicHeroFilter('all')}>全部</button>
              <button className={`cf-btn ${relicHeroFilter === 'universal' ? 'active' : ''}`} onClick={() => setRelicHeroFilter('universal')}>通用</button>
              {HEROES.map(hero => (
                <button key={hero.id} className={`cf-btn ${relicHeroFilter === hero.id ? 'active' : ''}`}
                  style={relicHeroFilter === hero.id ? { borderColor: ROLE_COLOR[hero.role], color: ROLE_COLOR[hero.role] } : {}}
                  onClick={() => setRelicHeroFilter(hero.id)}>{hero.name}</button>
              ))}
            </div>
            <div className="compendium-grid">
              {filteredRelics.map(relic => {
                const hero = relic.heroId ? HEROES.find(h => h.id === relic.heroId) : undefined
                const badgeColor = hero ? ROLE_COLOR[hero.role] : '#8090a8'
                return (
                  <div key={relic.id} className="compendium-card">
                    <div className="cc-top-row">
                      <span className="cc-tier-badge" style={{ color: badgeColor, borderColor: badgeColor + '60' }}>
                        {hero ? `${hero.name}專屬` : '通用'}
                      </span>
                    </div>
                    <div className="cc-name"><AsterVowIcon name="equip-set" size={14} /> {relic.name}</div>
                    <div className="cc-desc">{relic.desc}</div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Cards */}
        {tab === 'cards' && (
          <>
            <div className="compendium-filters">
              {(['all', 'common', 'rare', 'epic'] as const).map(r => (
                <button key={r} className={`cf-btn ${rarityFilter === r ? 'active' : ''}`}
                  style={r !== 'all' && rarityFilter === r ? { borderColor: RARITY_COLOR[r], color: RARITY_COLOR[r] } : {}}
                  onClick={() => setRarityFilter(r)}>{r === 'all' ? '全部' : RARITY_LABEL[r]}</button>
              ))}
            </div>
            <div className="compendium-filters" style={{ marginTop: 4 }}>
              <button className={`cf-btn ${cardRoleFilter === 'all' ? 'active' : ''}`}       onClick={() => setCardRoleFilter('all')}>全職業</button>
              <button className={`cf-btn ${cardRoleFilter === 'universal' ? 'active' : ''}`} onClick={() => setCardRoleFilter('universal')}>通用</button>
              {ALL_ROLES.map(r => (
                <button key={r} className={`cf-btn ${cardRoleFilter === r ? 'active' : ''}`}
                  style={cardRoleFilter === r ? { borderColor: ROLE_COLOR[r], color: ROLE_COLOR[r] } : {}}
                  onClick={() => setCardRoleFilter(r)}>{ROLE_LABEL[r]}</button>
              ))}
            </div>
            <div className="compendium-grid">
              {filteredCards.map(card => (
                <div key={card.id} className="compendium-card">
                  <div className="cc-top-row">
                    <span className="cc-tier-badge" style={{ color: RARITY_COLOR[card.rarity], borderColor: RARITY_COLOR[card.rarity] + '60' }}>{RARITY_LABEL[card.rarity]}</span>
                    {card.role && (
                      <span className="cc-tier-badge" style={{ color: ROLE_COLOR[card.role], borderColor: ROLE_COLOR[card.role] + '60' }}>{ROLE_LABEL[card.role]}</span>
                    )}
                  </div>
                  <div className="cc-name">🃏 {card.name}</div>
                  <div className="cc-desc">{card.desc}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Potions */}
        {tab === 'potions' && (
          <div className="compendium-grid">
            {ALL_POTIONS.map(p => (
              <div key={p.id} className="compendium-card">
                <div className="cc-name">{p.icon} {p.name}</div>
                <div className="cc-desc">{p.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* Main-game Monsters */}
        {tab === 'monsters' && (
          <div className="compendium-grid monster-grid">
            {[...MAIN_ENEMIES].sort((a, b) => {
              const key = (e: typeof a) =>
                ENEMY_CHAPTER[e.id]            != null ? ENEMY_CHAPTER[e.id]
                : RIFT_ENEMY_CHAPTER[e.id]     != null ? 10 + RIFT_ENEMY_CHAPTER[e.id]
                : DEEP_SEA_ENEMY_CHAPTER[e.id] != null ? 20 + DEEP_SEA_ENEMY_CHAPTER[e.id]
                : ASH_KINGDOM_ENEMY_CHAPTER[e.id] != null ? 30 + ASH_KINGDOM_ENEMY_CHAPTER[e.id]
                : 99
              return key(a) - key(b)
            }).map(enemy => {
              const riftCh    = RIFT_ENEMY_CHAPTER[enemy.id]
              const deepSeaCh = DEEP_SEA_ENEMY_CHAPTER[enemy.id]
              const ashCh     = ASH_KINGDOM_ENEMY_CHAPTER[enemy.id]
              const tag = ashCh     ? ASH_KINGDOM_CHAPTER_TAG[ashCh]
                        : deepSeaCh ? DEEP_SEA_CHAPTER_TAG[deepSeaCh]
                        : riftCh    ? RIFT_CHAPTER_TAG[riftCh]
                        : (CHAPTER_TAG[ENEMY_CHAPTER[enemy.id] ?? 1])
              const mech = getEnemyMechanic(enemy.id)
              const spriteScale = MONSTER_SPRITE_TARGET_H / enemy.sprite.frameHeight
              return (
                <div key={enemy.id} className="compendium-card monster-card">
                  <div className="cc-top-row">
                    <span className="cc-tier-badge" style={{ color: tag.color, borderColor: tag.color + '60' }}>{tag.label}</span>
                  </div>
                  <div className="monster-sprite">
                    <SpriteAnimator sprite={enemy.sprite} state="idle" scale={spriteScale} />
                  </div>
                  <div className="cc-name">{enemy.name}</div>
                  <div className="monster-stats">❤️ {enemy.hp} · ⚔️ {enemy.atk} · 🛡️ {enemy.def}</div>
                  <div className="cc-desc"><b>{enemy.skill}</b></div>
                  {mech && <div className="cc-desc monster-mech">⚙️ {MECHANIC_DESC[mech.special]}</div>}
                </div>
              )
            })}
          </div>
        )}

        {/* Dungeon Monsters */}
        {tab === 'dungeon_monsters' && (
          <div className="dungeon-monsters-wrapper">
            <div className="dungeon-section-header dungeon-eclipse">🌙 星蝕裂隙</div>
            <div className="compendium-grid monster-grid">
              {STAR_ECLIPSE_ENEMIES.map(enemy => {
                const info = DUNGEON_ENEMY_TYPE[enemy.id]
                const mech = getEnemyMechanic(enemy.id)
                const spriteScale = DUNGEON_SPRITE_TARGET_H / enemy.sprite.frameHeight
                return (
                  <div key={enemy.id} className="compendium-card monster-card dungeon-monster-card">
                    <div className="cc-top-row">
                      <span className="cc-tier-badge" style={{ color: info.color, borderColor: info.color + '60' }}>{info.label}</span>
                      <span className="cc-tier-badge" style={{ color: '#9080c0', borderColor: '#9080c060', fontSize: 10 }}>🌙 {info.area}</span>
                    </div>
                    <div className="monster-sprite dungeon-monster-sprite">
                      <SpriteAnimator sprite={enemy.sprite} state="idle" scale={spriteScale} />
                    </div>
                    <div className="cc-name">{enemy.name}</div>
                    <div className="monster-stats">❤️ {enemy.hp} · ⚔️ {enemy.atk} · 🛡️ {enemy.def}</div>
                    <div className="cc-desc"><b>{enemy.skill}</b></div>
                    {mech && <div className="cc-desc monster-mech">⚙️ {MECHANIC_DESC[mech.special]}</div>}
                  </div>
                )
              })}
            </div>
            <div className="dungeon-section-header dungeon-throne">🔥 燃燒王座</div>
            <div className="compendium-grid monster-grid">
              {BURNING_THRONE_ENEMIES.map(enemy => {
                const info = DUNGEON_ENEMY_TYPE[enemy.id]
                const mech = getEnemyMechanic(enemy.id)
                const spriteScale = THRONE_SPRITE_TARGET_H / enemy.sprite.frameHeight
                return (
                  <div key={enemy.id} className="compendium-card monster-card dungeon-monster-card">
                    <div className="cc-top-row">
                      <span className="cc-tier-badge" style={{ color: info.color, borderColor: info.color + '60' }}>{info.label}</span>
                      <span className="cc-tier-badge" style={{ color: '#ff8040', borderColor: '#ff804060', fontSize: 10 }}>🔥 {info.area}</span>
                    </div>
                    <div className="monster-sprite throne-monster-sprite">
                      <SpriteAnimator sprite={enemy.sprite} state="idle" scale={spriteScale} />
                    </div>
                    <div className="cc-name">{enemy.name}</div>
                    <div className="monster-stats">❤️ {enemy.hp} · ⚔️ {enemy.atk} · 🛡️ {enemy.def}</div>
                    <div className="cc-desc"><b>{enemy.skill}</b></div>
                    {mech && <div className="cc-desc monster-mech">⚙️ {MECHANIC_DESC[mech.special]}</div>}
                  </div>
                )
              })}
            </div>
            <div className="dungeon-section-header" style={{ background: 'linear-gradient(90deg, #0a1a40, #1060c0)', borderColor: '#2080e0' }}>🌊 黑潮深淵</div>
            <div className="compendium-grid monster-grid">
              {BLACK_TIDE_ENEMIES.map(enemy => {
                const info = DUNGEON_ENEMY_TYPE[enemy.id]
                const mech = getEnemyMechanic(enemy.id)
                const spriteScale = BLACK_TIDE_SPRITE_TARGET_H / enemy.sprite.frameHeight
                return (
                  <div key={enemy.id} className="compendium-card monster-card dungeon-monster-card">
                    <div className="cc-top-row">
                      <span className="cc-tier-badge" style={{ color: info.color, borderColor: info.color + '60' }}>{info.label}</span>
                      <span className="cc-tier-badge" style={{ color: '#40a0e0', borderColor: '#40a0e060', fontSize: 10 }}>🌊 {info.area}</span>
                    </div>
                    <div className="monster-sprite" style={{ minHeight: BLACK_TIDE_SPRITE_TARGET_H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <SpriteAnimator sprite={enemy.sprite} state="idle" scale={spriteScale} />
                    </div>
                    <div className="cc-name">{enemy.name}</div>
                    <div className="monster-stats">❤️ {enemy.hp} · ⚔️ {enemy.atk} · 🛡️ {enemy.def}</div>
                    <div className="cc-desc"><b>{enemy.skill}</b></div>
                    {mech && <div className="cc-desc monster-mech">⚙️ {MECHANIC_DESC[mech.special]}</div>}
                  </div>
                )
              })}
            </div>
            <div className="dungeon-section-header" style={{ background: 'linear-gradient(90deg, #2a0a00, #8a3010)', borderColor: '#c06020' }}>🔥 灰燼聖約</div>
            <div className="compendium-grid monster-grid">
              {ASH_COVENANT_ENEMIES.map(enemy => {
                const info = DUNGEON_ENEMY_TYPE[enemy.id]
                const mech = getEnemyMechanic(enemy.id)
                const spriteScale = ASH_COVENANT_SPRITE_TARGET_H / enemy.sprite.frameHeight
                return (
                  <div key={enemy.id} className="compendium-card monster-card dungeon-monster-card">
                    <div className="cc-top-row">
                      <span className="cc-tier-badge" style={{ color: info.color, borderColor: info.color + '60' }}>{info.label}</span>
                      <span className="cc-tier-badge" style={{ color: '#c07030', borderColor: '#c0703060', fontSize: 10 }}>🔥 {info.area}</span>
                    </div>
                    <div className="monster-sprite" style={{ minHeight: ASH_COVENANT_SPRITE_TARGET_H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <SpriteAnimator sprite={enemy.sprite} state="idle" scale={spriteScale} />
                    </div>
                    <div className="cc-name">{enemy.name}</div>
                    <div className="monster-stats">❤️ {enemy.hp} · ⚔️ {enemy.atk} · 🛡️ {enemy.def}</div>
                    <div className="cc-desc"><b>{enemy.skill}</b></div>
                    {mech && <div className="cc-desc monster-mech">⚙️ {MECHANIC_DESC[mech.special]}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
