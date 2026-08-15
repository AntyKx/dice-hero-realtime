import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { HEROES, getHeroSprite, type Hero } from '../data'
import { ALL_BUFF_CARDS } from '../buffCards'
import { ALL_POTIONS } from '../potions'
import { ARENA_RELICS, ARENA_WEAPON_RELICS, type ArenaRelic } from '../arena/relics'
import { getExpForLevel, getHeroStarTitle } from '../talents'
import { computeArenaEquipBonus, getEquippedArenaItems } from '../arena/equipment'
import { computeArenaTalentBonus } from '../arena/arenaTalents'
import SpriteAnimator from '../components/SpriteAnimator'
import AsterVowIcon, { type AsterVowIconName } from '../components/AsterVowIcon'
import type { MetaState } from '../types'

/**
 * 星界圖鑑（2026-08 重做）：英雄／道具／遺物三分類的航行檔案庫。
 * 「遺物」分類接的是即時制遺物（arena/relics.ts，跨局永久持有、打 Arena
 * Boss 真的會拿到的 17 個），不是回合制的 relics.ts——那套現在打不到
 * （FEATURE_FLAGS.turnBasedMainline=false），列出來玩家永遠遇不到。
 *
 * 舊版另外有「主線怪物」「副本怪物」兩個分頁，這次重做時使用者確認一併
 * 拿掉，不用保留怪物圖鑑。
 */

type CodexCategory = 'heroes' | 'items' | 'relics'
type ItemKind = 'card' | 'potion'

interface CodexBadge {
  label: string
  color?: string
}

interface CodexEntry {
  id: string
  category: CodexCategory
  kind?: ItemKind
  role?: string
  heroId?: string
  name: string
  subtitle: string
  summary: string
  icon: AsterVowIconName
  accent: string
  image?: string
  badges: CodexBadge[]
  details: { label: string; value: string }[]
}

const ROLE_LABEL: Record<string, string> = {
  slash: '聖騎士', fire: '火焰法師', holy: '神官祭司', shadow: '影刃刺客',
  ice: '皇家公主', arrow: '遊俠獵人', hammer: '矮人戰士', song: '吟遊詩人',
  beast: '獸語馴獸師', gear: '機關技師', fighter: '武鬥家', death: '死靈騎士',
}
const ROLE_COLOR: Record<string, string> = {
  slash: '#78a7ff', fire: '#ff7a54', holy: '#ffe08a', shadow: '#c595ff',
  ice: '#78d8ff', arrow: '#91e39a', hammer: '#d3a466', song: '#f1a3cb',
  beast: '#c89562', gear: '#a1bed8', fighter: '#ef9b56', death: '#b596ff',
}
/** 英雄資訊「屬性」欄位的配色（跟 role 的職業配色分開，是另一組世界觀設定）。 */
const ELEMENT_COLOR: Record<string, string> = {
  火: '#ff5a44', 冰: '#6ad4ff', 暗: '#a060ff', 光: '#ffd36e',
  風: '#7ee089', 土: '#c08040', 機械: '#8fa8c0', 氣: '#ff9a4a',
}
const ROLE_ICON: Record<string, AsterVowIconName> = {
  slash: 'role-slash', fire: 'role-fire', holy: 'role-holy', shadow: 'role-shadow',
  ice: 'role-ice', arrow: 'role-arrow', hammer: 'role-hammer', song: 'role-song',
  beast: 'role-beast', gear: 'role-gear', fighter: 'role-fighter', death: 'role-death',
}
const RARITY_LABEL: Record<string, string> = { common: '普通', rare: '稀有', epic: '史詩' }
const RARITY_COLOR: Record<string, string> = { common: '#9aacc6', rare: '#7cbcff', epic: '#d29cff' }

const CATEGORY_META: { id: CodexCategory; title: string; note: string; icon: AsterVowIconName }[] = [
  { id: 'heroes', title: '英雄名冊', note: '現行可編成英雄與核心技藝記錄', icon: 'nav-heroes' },
  { id: 'items', title: '道具收藏', note: '增益卡與遠征補給檔案', icon: 'shop-scroll' },
  { id: 'relics', title: '星界遺物', note: 'Arena 即時制戰利品與武器共鳴記錄', icon: 'equip-set' },
]

function roleName(role?: string) {
  return role ? (ROLE_LABEL[role] ?? role) : '通用'
}
function roleColor(role?: string) {
  return role ? (ROLE_COLOR[role] ?? '#9aacc6') : '#9aacc6'
}
function heroIdFromWeaponTag(tag?: string) {
  return tag?.replace(/_weapon$/, '')
}

const ARENA_ARCHIVE_RELICS: (ArenaRelic & { heroId?: string })[] = [
  ...ARENA_RELICS,
  ...ARENA_WEAPON_RELICS.map(relic => ({ ...relic, heroId: heroIdFromWeaponTag(relic.weaponTag) })),
]

interface Props {
  meta: MetaState
  onClose: () => void
  /** 查看天賦／查看裝備：交給外層（AdventureReadyScreen）決定要開哪個既有畫面，
   *  圖鑑本身不重造那兩套 UI。沒傳（功能旗標關閉時）就不顯示對應按鈕。 */
  onViewTalent?: (hero: Hero) => void
  onViewEquip?: (hero: Hero) => void
}

export default function CompendiumScreen({ meta, onClose, onViewTalent, onViewEquip }: Props) {
  const [category, setCategory] = useState<CodexCategory>('heroes')
  const [heroRole, setHeroRole] = useState('all')
  const [itemKind, setItemKind] = useState<'all' | ItemKind>('all')
  const [relicRole, setRelicRole] = useState('all')
  const [activeEntry, setActiveEntry] = useState<CodexEntry | null>(null)
  const [activeHero, setActiveHero] = useState<Hero | null>(null)
  const [heroDetailTab, setHeroDetailTab] = useState<'story' | 'abilities'>('story')

  // 鎖住背景頁面捲動：手機上拖到列表底/頂端時，觸控滑動會「穿透」到背景頁面造成卡頓感
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [])

  const heroEntries = useMemo<CodexEntry[]>(() => HEROES.map(hero => ({
    id: `hero-${hero.id}`,
    category: 'heroes',
    role: hero.role,
    heroId: hero.id,
    name: hero.name,
    subtitle: `${roleName(hero.role)} · ${hero.title}`,
    summary: hero.desc,
    icon: ROLE_ICON[hero.role] ?? 'nav-heroes',
    accent: roleColor(hero.role),
    image: hero.avatar ?? hero.portrait,
    badges: [
      { label: roleName(hero.role), color: roleColor(hero.role) },
      { label: hero.school === 'magic' ? '星術學派' : '武技學派' },
    ],
    details: [
      { label: '核心技藝', value: hero.skill },
      { label: '基礎數值', value: `生命 ${hero.hp} · 攻擊 ${hero.atk} · 防禦 ${hero.def}` },
      { label: '戰鬥定位', value: hero.title },
      { label: '學派', value: hero.school === 'magic' ? '星術學派' : '武技學派' },
    ],
  })), [])

  const itemEntries = useMemo<CodexEntry[]>(() => [
    ...ALL_BUFF_CARDS.map(card => ({
      id: `card-${card.id}`,
      category: 'items' as const,
      kind: 'card' as const,
      role: card.role,
      name: card.name,
      subtitle: '遠征增益卡',
      summary: card.desc,
      icon: 'shop-scroll' as AsterVowIconName,
      accent: RARITY_COLOR[card.rarity] ?? '#9aacc6',
      badges: [
        { label: RARITY_LABEL[card.rarity] ?? card.rarity, color: RARITY_COLOR[card.rarity] },
        { label: roleName(card.role), color: roleColor(card.role) },
      ],
      details: [
        { label: '檔案類型', value: '遠征增益卡' },
        { label: '適用職業', value: roleName(card.role) },
        { label: '稀有度', value: RARITY_LABEL[card.rarity] ?? card.rarity },
        { label: '可強化上限', value: `Lv.${card.maxLevel ?? 1}` },
      ],
    })),
    ...ALL_POTIONS.map(potion => ({
      id: `potion-${potion.id}`,
      category: 'items' as const,
      kind: 'potion' as const,
      name: potion.name,
      subtitle: '遠征補給',
      summary: potion.desc,
      icon: 'shop-gift' as AsterVowIconName,
      accent: '#76d6ff',
      badges: [{ label: '補給道具', color: '#76d6ff' }],
      details: [
        { label: '檔案類型', value: '遠征補給' },
        { label: '使用時機', value: '遠征途中' },
        { label: '效果記錄', value: potion.desc },
        { label: '資料狀態', value: '現行遊戲資料可查閱' },
      ],
    })),
  ], [])

  const relicEntries = useMemo<CodexEntry[]>(() => ARENA_ARCHIVE_RELICS.map(relic => {
    const hero = relic.heroId ? HEROES.find(h => h.id === relic.heroId) : undefined
    return {
      id: `relic-${relic.id}`,
      category: 'relics',
      role: hero?.role ?? 'universal',
      name: relic.name,
      subtitle: hero ? `${hero.name}武器共鳴` : '通用戰利品',
      summary: relic.desc,
      icon: 'equip-set' as AsterVowIconName,
      accent: hero ? roleColor(hero.role) : '#f0c96d',
      badges: [
        { label: hero ? `${hero.name}專屬` : '通用', color: hero ? roleColor(hero.role) : '#f0c96d' },
        { label: 'Arena 即時制', color: '#76d6ff' },
      ],
      details: [
        { label: '遺物類型', value: hero ? '武器共鳴遺物' : '通用戰利品' },
        { label: '共鳴職業', value: hero ? roleName(hero.role) : '全職業通用' },
        { label: '適用模式', value: 'Arena 即時制' },
        { label: '資料狀態', value: '現行戰利品資料可查閱' },
      ],
    }
  }), [])

  const visibleEntries = useMemo(() => {
    if (category === 'heroes') return heroEntries.filter(entry => heroRole === 'all' || entry.role === heroRole)
    if (category === 'items') return itemEntries.filter(entry => itemKind === 'all' || entry.kind === itemKind)
    return relicEntries.filter(entry => relicRole === 'all' || entry.role === relicRole)
  }, [category, heroEntries, heroRole, itemEntries, itemKind, relicEntries, relicRole])

  const currentMeta = CATEGORY_META.find(item => item.id === category) ?? CATEGORY_META[0]
  const totalEntries = category === 'heroes' ? heroEntries.length : category === 'items' ? itemEntries.length : relicEntries.length
  const roleOptions = HEROES.map(hero => hero.role).filter((role, index, roles) => roles.indexOf(role) === index)

  const switchCategory = (next: CodexCategory) => {
    setCategory(next)
    setActiveEntry(null)
    setActiveHero(null)
  }

  const openHero = (hero: Hero) => {
    setActiveHero(hero)
    setHeroDetailTab('story')
  }

  return (
    <div className="modal-overlay astral-codex-overlay" onClick={onClose}>
      <section className="astral-codex" role="dialog" aria-modal="true" aria-label="星界圖鑑" onClick={e => e.stopPropagation()}>
        <header className="astral-codex-header">
          <div className="astral-codex-title">
            <span className="astral-codex-seal"><AsterVowIcon name="nav-compendium" size={24} /></span>
            <div>
              <p>ASTRAL ARCHIVE · ARENA INDEX</p>
              <h2>星界圖鑑</h2>
            </div>
          </div>
          <button className="astral-codex-close" onClick={onClose} aria-label="返回星界大廳">✕</button>
        </header>

        <div className="astral-codex-tabs" role="tablist" aria-label="圖鑑分類">
          {CATEGORY_META.map(item => (
            <button
              key={item.id}
              className={`astral-codex-tab${category === item.id ? ' active' : ''}`}
              role="tab" aria-selected={category === item.id}
              onClick={() => switchCategory(item.id)}
            >
              <AsterVowIcon name={item.icon} size={19} />
              <span>{item.title}</span>
            </button>
          ))}
        </div>

        <div className="astral-codex-meta">
          <div>
            <span className="astral-codex-kicker"><AsterVowIcon name={currentMeta.icon} size={15} /> {currentMeta.title}</span>
            <p>{currentMeta.note}</p>
          </div>
          <div className="astral-codex-progress" aria-label={`${currentMeta.title}可查閱條目 ${totalEntries}`}>
            <div className="astral-codex-progress-copy"><span>可查閱條目</span><b>{totalEntries} / {totalEntries}</b></div>
            <div className="astral-codex-progress-track"><i style={{ width: '100%' }} /></div>
          </div>
        </div>

        <div className="astral-codex-filter" aria-label="圖鑑篩選">
          {category === 'heroes' && (
            <>
              <button className={heroRole === 'all' ? 'active' : ''} onClick={() => setHeroRole('all')}>全名冊</button>
              {roleOptions.map(role => (
                <button key={role} className={heroRole === role ? 'active' : ''} onClick={() => setHeroRole(role)}>{roleName(role)}</button>
              ))}
            </>
          )}
          {category === 'items' && (
            <>
              <button className={itemKind === 'all' ? 'active' : ''} onClick={() => setItemKind('all')}>全部檔案</button>
              <button className={itemKind === 'card' ? 'active' : ''} onClick={() => setItemKind('card')}>增益卡</button>
              <button className={itemKind === 'potion' ? 'active' : ''} onClick={() => setItemKind('potion')}>遠征補給</button>
            </>
          )}
          {category === 'relics' && (
            <>
              <button className={relicRole === 'all' ? 'active' : ''} onClick={() => setRelicRole('all')}>全部遺物</button>
              <button className={relicRole === 'universal' ? 'active' : ''} onClick={() => setRelicRole('universal')}>通用</button>
              {roleOptions.map(role => (
                <button key={role} className={relicRole === role ? 'active' : ''} onClick={() => setRelicRole(role)}>{roleName(role)}</button>
              ))}
            </>
          )}
        </div>

        {category === 'heroes' ? (
          <div className="astral-codex-hero-grid">
            {visibleEntries.map(entry => {
              const hero = HEROES.find(h => h.id === entry.heroId)
              if (!hero) return null
              const stars = meta.heroProgress[hero.id]?.stars ?? 0
              return (
                <button
                  key={entry.id}
                  className="astral-codex-hero-card"
                  style={{ '--entry-accent': entry.accent } as CSSProperties}
                  onClick={() => openHero(hero)}
                >
                  <span className="astral-codex-hero-avatar">
                    <span className="astral-codex-hero-avatar-clip">
                      {entry.image ? <img src={entry.image} alt="" /> : <AsterVowIcon name={entry.icon} size={26} />}
                    </span>
                    <span className="astral-codex-hero-role-badge"><AsterVowIcon name={entry.icon} size={13} /></span>
                  </span>
                  <span className="astral-codex-hero-name">{hero.name}</span>
                  <span className="astral-codex-hero-stars" aria-label={`${stars} 星`}>
                    {[0, 1, 2].map(i => (
                      <AsterVowIcon key={i} name="system-stardust" size={11} color={i < stars ? '#f2c56e' : 'rgba(255,255,255,.18)'} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="astral-codex-grid">
            {visibleEntries.map(entry => (
              <button
                key={entry.id}
                className="astral-codex-card"
                style={{ '--entry-accent': entry.accent } as CSSProperties}
                onClick={() => setActiveEntry(entry)}
              >
                <span className="astral-codex-card-orbit" />
                <div className="astral-codex-card-top">
                  <span className="astral-codex-card-icon"><AsterVowIcon name={entry.icon} size={20} /></span>
                  <span className="astral-codex-card-mark">公開檔案</span>
                </div>
                {entry.image && <img className="astral-codex-card-portrait" src={entry.image} alt="" />}
                <div className="astral-codex-card-content">
                  <div className="astral-codex-card-badges">
                    {entry.badges.slice(0, 2).map(badge => (
                      <span key={badge.label} style={badge.color ? { color: badge.color } : undefined}>{badge.label}</span>
                    ))}
                  </div>
                  <strong>{entry.name}</strong>
                  <small>{entry.subtitle}</small>
                  <p>{entry.summary}</p>
                </div>
                <span className="astral-codex-card-open">檢閱檔案 <b>›</b></span>
              </button>
            ))}
          </div>
        )}

        {activeEntry && (
          <div className="astral-codex-detail-scrim" onClick={() => setActiveEntry(null)}>
            <article
              className="astral-codex-detail"
              onClick={e => e.stopPropagation()}
              style={{ '--entry-accent': activeEntry.accent } as CSSProperties}
            >
              <div className="astral-codex-detail-glow" />
              <button className="astral-codex-detail-close" onClick={() => setActiveEntry(null)} aria-label="關閉檔案">✕</button>
              <div className="astral-codex-detail-crest"><AsterVowIcon name={activeEntry.icon} size={29} /></div>
              <div className="astral-codex-detail-heading">
                <span>ASTRAL RECORD · 星界檔案</span>
                <h3>{activeEntry.name}</h3>
                <p>{activeEntry.subtitle}</p>
              </div>
              <p className="astral-codex-detail-summary">{activeEntry.summary}</p>
              <div className="astral-codex-detail-data">
                {activeEntry.details.map(detail => (
                  <div key={detail.label}><span>{detail.label}</span><b>{detail.value}</b></div>
                ))}
              </div>
              <button className="astral-codex-detail-return" onClick={() => setActiveEntry(null)}>返回圖鑑</button>
            </article>
          </div>
        )}

        {activeHero && (() => {
          const prog = meta.heroProgress[activeHero.id]
          const stars = prog?.stars ?? 0
          const level = prog?.level ?? 1
          const expNeeded = getExpForLevel(level)
          const levelPct = Math.min(100, Math.round(((prog?.exp ?? 0) / expNeeded) * 100))
          const starTitle = stars > 0 ? getHeroStarTitle(activeHero.id, stars) : null
          const displayName = starTitle ?? activeHero.name

          // 「目前為止的能力值」：基礎值疊加真實的裝備/天賦加成（跟英雄立繪 Modal
          // 同一套算法），不是只顯示 Hero 表裡的靜態基礎數字。
          const equipItems = getEquippedArenaItems(meta.arenaInventory ?? [], meta.arenaLoadouts?.[activeHero.id])
          const equipBonus = computeArenaEquipBonus(equipItems)
          const talentBonus = computeArenaTalentBonus(activeHero.id, prog?.allocatedTalentIds ?? [])
          const totalHp = activeHero.hp + equipBonus.hpBonus + talentBonus.hpBonus
          const totalDef = activeHero.def + equipBonus.defBonus
          const totalAtk = activeHero.atk + talentBonus.flatDamage

          return (
            <div className="astral-codex-hero-detail-scrim" onClick={() => setActiveHero(null)}>
              <article className="astral-codex-hero-detail" onClick={e => e.stopPropagation()} style={{ '--entry-accent': roleColor(activeHero.role) } as CSSProperties}>
                <button className="astral-codex-hero-detail-back" onClick={() => setActiveHero(null)} aria-label="返回圖鑑列表">
                  ‹ 返回
                </button>
                <button className="astral-codex-detail-close" onClick={() => setActiveHero(null)} aria-label="關閉檔案">✕</button>
                <div className="astral-codex-hero-detail-art">
                  {activeHero.portrait && <img src={activeHero.portrait} alt="" />}
                  <div className="astral-codex-hero-detail-art-scrim" />
                  <div className="astral-codex-hero-detail-art-caption">
                    <div className="astral-codex-hero-detail-level">
                      <div className="astral-codex-hero-detail-level-track"><i style={{ width: `${levelPct}%` }} /></div>
                      <span>Lv.{level}</span>
                    </div>
                    <p>{roleName(activeHero.role)} · {activeHero.title}</p>
                    <h3>{displayName}</h3>
                    {stars > 0 && <span className="astral-codex-hero-detail-stars">{'✦'.repeat(stars)}</span>}
                  </div>
                </div>
                <div className="astral-codex-hero-detail-info">
                  <div className="astral-codex-hero-detail-tabs" role="tablist" aria-label="英雄檔案分類">
                    {([['story', '檔案'], ['abilities', '能力']] as const).map(([id, label]) => (
                      <button key={id} className={heroDetailTab === id ? 'active' : ''} role="tab" aria-selected={heroDetailTab === id} onClick={() => setHeroDetailTab(id)}>{label}</button>
                    ))}
                  </div>

                  {heroDetailTab === 'story' && (
                    <div className="astral-codex-hero-detail-body">
                      <div className="astral-codex-hero-info-title">進化階段</div>
                      <div className="astral-codex-hero-evo-row">
                        {[0, 1, 2, 3].map(tier => {
                          const tierSprite = getHeroSprite(activeHero, tier)
                          const tierScale = 56 / tierSprite.frameHeight
                          return (
                            <div key={tier} className={`astral-codex-hero-evo-figure${tier <= stars ? ' unlocked' : ''}${tier === stars ? ' current' : ''}`}>
                              <div className="astral-codex-hero-evo-figure-sprite">
                                <SpriteAnimator sprite={tierSprite} state="idle" scale={tierScale} idleFrame={0} />
                              </div>
                              <span>{tier === 0 ? '0★' : '★'.repeat(tier)}</span>
                            </div>
                          )
                        })}
                      </div>

                      <div className="astral-codex-hero-info-title">英雄資訊</div>
                      <div className="astral-codex-hero-info-grid">
                        <div><span>身高</span><b>{activeHero.heightCm ? `${activeHero.heightCm} 公分` : '?'}</b></div>
                        <div><span>年齡</span><b>{activeHero.age ?? '?'}</b></div>
                        <div><span>體重</span><b>{activeHero.weightKg ? `${activeHero.weightKg} 公斤` : '?'}</b></div>
                        <div><span>種族</span><b>{activeHero.race ?? '?'}</b></div>
                        <div><span>角色</span><b><AsterVowIcon name={ROLE_ICON[activeHero.role] ?? 'nav-heroes'} size={13} /> {roleName(activeHero.role)}</b></div>
                        <div><span>屬性</span><b style={activeHero.element ? { color: ELEMENT_COLOR[activeHero.element] ?? undefined } : undefined}>{activeHero.element ?? '?'}</b></div>
                      </div>

                      <div className="astral-codex-hero-info-title">故事</div>
                      <p className="astral-codex-hero-story">{activeHero.story ?? '這位英雄的檔案仍在整理中。'}</p>
                    </div>
                  )}
                  {heroDetailTab === 'abilities' && (
                    <div className="astral-codex-hero-detail-body">
                      <div className="astral-codex-detail-data">
                        <div><span>生命</span><b>{totalHp}{totalHp !== activeHero.hp && <small> (基礎 {activeHero.hp})</small>}</b></div>
                        <div><span>攻擊</span><b>{totalAtk}{totalAtk !== activeHero.atk && <small> (基礎 {activeHero.atk})</small>}</b></div>
                        <div><span>防禦</span><b>{totalDef}{totalDef !== activeHero.def && <small> (基礎 {activeHero.def})</small>}</b></div>
                        <div><span>目前等級</span><b>Lv.{level}</b></div>
                      </div>
                      <p className="astral-codex-hero-skill">
                        <b>{activeHero.skill}</b>
                        <span>{activeHero.desc}</span>
                      </p>
                      <div className="astral-codex-hero-detail-links">
                        {onViewTalent && (
                          <button onClick={() => onViewTalent(activeHero)}>
                            <AsterVowIcon name="system-talent" size={15} /> 查看天賦
                          </button>
                        )}
                        {onViewEquip && (
                          <button onClick={() => onViewEquip(activeHero)}>
                            <AsterVowIcon name="nav-equipment" size={15} /> 查看裝備
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            </div>
          )
        })()}
      </section>
    </div>
  )
}
