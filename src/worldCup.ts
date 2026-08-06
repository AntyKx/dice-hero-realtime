import type { WorldCupPick, WorldCupPickChoice } from './types'

// 2026 世界盃資料來源：Wikipedia 官方 API（合法、免金鑰、支援 CORS）。
// 比賽進行中時，各分組/淘汰賽頁面的 footballbox 模板（schema.org SportsEvent 結構化標記）
// 會被編輯者即時更新比分，資料完整度遠勝一般免費體育 API。
const WIKI_API = 'https://en.wikipedia.org/w/api.php'
const WC_PAGES = [
  '2026_FIFA_World_Cup_Group_A', '2026_FIFA_World_Cup_Group_B', '2026_FIFA_World_Cup_Group_C',
  '2026_FIFA_World_Cup_Group_D', '2026_FIFA_World_Cup_Group_E', '2026_FIFA_World_Cup_Group_F',
  '2026_FIFA_World_Cup_Group_G', '2026_FIFA_World_Cup_Group_H', '2026_FIFA_World_Cup_Group_I',
  '2026_FIFA_World_Cup_Group_J', '2026_FIFA_World_Cup_Group_K', '2026_FIFA_World_Cup_Group_L',
  '2026_FIFA_World_Cup_knockout_stage',
]

const CACHE_KEY = 'dice_hero_worldcup_cache_v5'
const CACHE_TTL_MS = 30 * 60 * 1000  // 30 分鐘，兼顧即時性與避免每次進主畫面都打 API

export interface WcMatch {
  id: string
  date: string  // YYYY-MM-DD
  home: string
  away: string
  status: string  // 'FT' | 'NS'
  homeScore: number | null
  awayScore: number | null
  group: string  // 'A'..'L' | 'knockout'
}

export const GROUP_LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L']

function groupFromPageKey(pageKey: string): string {
  const m = pageKey.match(/Group_([A-L])$/)
  return m ? m[1] : 'knockout'
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
}

// Wikipedia 的國家代表隊條目常以「XX national football/soccer team」命名，顯示時去掉這個尾巴
function cleanTeamName(raw: string): string {
  return decodeEntities(raw).replace(/ (men's )?national (football|soccer) team$/i, '').trim()
}

// 48 強參賽隊伍英文名 → 中文翻譯（找不到對應時 fallback 顯示英文，不會壞掉）
const TEAM_NAME_ZH: Record<string, string> = {
  Algeria: '阿爾及利亞', Argentina: '阿根廷', Australia: '澳洲', Austria: '奧地利',
  Belgium: '比利時', 'Bosnia and Herzegovina': '波士尼亞', Brazil: '巴西',
  Canada: '加拿大', 'Cape Verde': '維德角', Colombia: '哥倫比亞', Croatia: '克羅埃西亞',
  'Curaçao': '庫拉索', 'Czech Republic': '捷克', 'DR Congo': '剛果(金)',
  Ecuador: '厄瓜多', Egypt: '埃及', England: '英格蘭', France: '法國', Germany: '德國',
  Ghana: '迦納', Haiti: '海地', Iran: '伊朗', Iraq: '伊拉克', 'Ivory Coast': '象牙海岸',
  Japan: '日本', Jordan: '約旦', Mexico: '墨西哥', Morocco: '摩洛哥', Netherlands: '荷蘭',
  'New Zealand': '紐西蘭', Norway: '挪威', Panama: '巴拿馬', Paraguay: '巴拉圭',
  Portugal: '葡萄牙', Qatar: '卡達', 'Saudi Arabia': '沙烏地阿拉伯', Scotland: '蘇格蘭',
  Senegal: '塞內加爾', 'South Africa': '南非', 'South Korea': '南韓', Spain: '西班牙',
  Sweden: '瑞典', Switzerland: '瑞士', Tunisia: '突尼西亞', Turkey: '土耳其',
  'United States': '美國', Uruguay: '烏拉圭', Uzbekistan: '烏茲別克',
}

function translateTeam(name: string): string {
  return TEAM_NAME_ZH[name] ?? name
}

// 中文隊名 → ISO 3166-1 國碼（用來組 flagcdn.com 的國旗小圖網址）
// 註：Windows 的 emoji 字型不畫真的國旗圖案（只顯示兩個字母代碼），所以這裡改用小圖檔，
// 確保所有平台（含桌機 Windows）都能看到正常的國旗。英格蘭／蘇格蘭沒有獨立 ISO 國碼，先以英國國旗代替。
const TEAM_ISO: Record<string, string> = {
  阿爾及利亞: 'dz', 阿根廷: 'ar', 澳洲: 'au', 奧地利: 'at',
  比利時: 'be', 波士尼亞: 'ba', 巴西: 'br',
  加拿大: 'ca', 維德角: 'cv', 哥倫比亞: 'co', 克羅埃西亞: 'hr',
  庫拉索: 'cw', 捷克: 'cz', '剛果(金)': 'cd',
  厄瓜多: 'ec', 埃及: 'eg', 英格蘭: 'gb', 法國: 'fr', 德國: 'de',
  迦納: 'gh', 海地: 'ht', 伊朗: 'ir', 伊拉克: 'iq', 象牙海岸: 'ci',
  日本: 'jp', 約旦: 'jo', 墨西哥: 'mx', 摩洛哥: 'ma', 荷蘭: 'nl',
  紐西蘭: 'nz', 挪威: 'no', 巴拿馬: 'pa', 巴拉圭: 'py',
  葡萄牙: 'pt', 卡達: 'qa', 沙烏地阿拉伯: 'sa', 蘇格蘭: 'gb',
  塞內加爾: 'sn', 南非: 'za', 南韓: 'kr', 西班牙: 'es',
  瑞典: 'se', 瑞士: 'ch', 突尼西亞: 'tn', 土耳其: 'tr',
  美國: 'us', 烏拉圭: 'uy', 烏茲別克: 'uz',
}

// 找不到對應的隊伍（如尚未翻譯的英文 fallback）回傳 null，UI 端就不顯示國旗
export function teamFlagUrl(name: string): string | null {
  const code = TEAM_ISO[name]
  return code ? `https://flagcdn.com/24x18/${code}.png` : null
}

// 從 fhome/faway 區塊取隊名：只在該 <th>...</th> 範圍內找 <a title="...">，
// 找不到代表隊伍尚未確定（如淘汰賽還沒打完小組賽的「Winner Group C」佔位文字），整場比賽先跳過
function extractTeamName(chunk: string, marker: 'fhome' | 'faway'): string | null {
  const start = chunk.indexOf(`class="${marker}"`)
  if (start === -1) return null
  const end = chunk.indexOf('</th>', start)
  const field = end === -1 ? chunk.slice(start) : chunk.slice(start, end)
  const a = field.match(/<a[^>]*title="([^"]+)"/)
  return a ? translateTeam(cleanTeamName(a[1])) : null
}

// 每場比賽在頁面 HTML 裡是一個 class="footballbox" 區塊，內含：
// - class="bday ...">YYYY-MM-DD<  → 比賽日期
// - class="fhome"/"faway"         → 主/客隊名稱
// - class="fscore">N–M<            → 已賽的比分（未開賽則是賽事編號等其他文字）
function parsePageMatches(html: string, pageKey: string): WcMatch[] {
  const out: WcMatch[] = []
  const group = groupFromPageKey(pageKey)
  const chunks = html.split('class="footballbox"').slice(1)
  chunks.forEach((c, i) => {
    const dateM  = c.match(/class="bday[^"]*">(\d{4}-\d{2}-\d{2})</)
    const home = extractTeamName(c, 'fhome')
    const away = extractTeamName(c, 'faway')
    const scoreM = c.match(/class="fscore">([^<]*)</)
    if (!dateM || !home || !away) return
    const scoreText = scoreM?.[1] ?? ''
    const sm = scoreText.match(/^(\d+)–(\d+)$/)
    out.push({
      id: `${pageKey}#${i}`,
      date: dateM[1],
      home, away,
      status: sm ? 'FT' : 'NS',
      homeScore: sm ? Number(sm[1]) : null,
      awayScore: sm ? Number(sm[2]) : null,
      group,
    })
  })
  return out
}

async function fetchPageMatches(pageKey: string): Promise<WcMatch[]> {
  const url = `${WIKI_API}?action=parse&page=${pageKey}&prop=text&format=json&origin=*`
  const res = await fetch(url)
  const data = await res.json() as { parse?: { text?: { '*': string } } }
  const html = data.parse?.text?.['*']
  return html ? parsePageMatches(html, pageKey) : []
}

export async function fetchWorldCupMatches(force = false): Promise<WcMatch[]> {
  if (!force) {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached) as { ts: number; matches: WcMatch[] }
        if (Date.now() - parsed.ts < CACHE_TTL_MS) return parsed.matches
      }
    } catch { /* ignore */ }
  }

  try {
    const results = await Promise.all(WC_PAGES.map(p => fetchPageMatches(p).catch(() => [] as WcMatch[])))
    const matches = results.flat().sort((a, b) => a.date.localeCompare(b.date))
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), matches })) } catch { /* ignore */ }
    return matches
  } catch {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) return (JSON.parse(cached) as { matches: WcMatch[] }).matches
    } catch { /* ignore */ }
    return []
  }
}

export function isMatchFinished(m: WcMatch): boolean {
  return m.status === 'FT' && m.homeScore !== null && m.awayScore !== null
}

export function matchOutcome(m: WcMatch): WorldCupPickChoice | null {
  if (!isMatchFinished(m)) return null
  if (m.homeScore! > m.awayScore!) return 'home'
  if (m.homeScore! < m.awayScore!) return 'away'
  return 'draw'
}

// 找出尚未預測、也還沒開賽的下一場比賽
export function findNextPredictable(matches: WcMatch[], picks: WorldCupPick[]): WcMatch | null {
  const pickedIds = new Set(picks.map(p => p.matchId))
  return matches.find(m => !isMatchFinished(m) && !pickedIds.has(m.id)) ?? null
}

// 找出已預測、比賽已結束但尚未核實獎勵的猜測
export function findResolvable(matches: WcMatch[], picks: WorldCupPick[]): { pick: WorldCupPick; won: boolean }[] {
  const byId = new Map(matches.map(m => [m.id, m]))
  const out: { pick: WorldCupPick; won: boolean }[] = []
  for (const p of picks) {
    if (p.resolved) continue
    const m = byId.get(p.matchId)
    if (!m || !isMatchFinished(m)) continue
    out.push({ pick: p, won: matchOutcome(m) === p.pick })
  }
  return out
}

export const PICK_LABEL: Record<WorldCupPickChoice, string> = {
  home: '主隊勝', away: '客隊勝', draw: '和局',
}

export interface WorldCupPlayerStat {
  playerName: string
  wins: number
  losses: number
  pending: number
  successCount: number
}

// 從伺服端彙整所有玩家（雲端存檔）的世界盃競猜勝負統計
export async function fetchWorldCupPlayerStats(): Promise<WorldCupPlayerStat[]> {
  try {
    const res = await fetch('/worldcup-leaderboard')
    if (!res.ok) return []
    return await res.json() as WorldCupPlayerStat[]
  } catch {
    return []
  }
}

export interface GroupStanding {
  team: string
  played: number
  win: number
  draw: number
  loss: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

// 由已抓到的比賽結果自行算戰績（不依賴 Wikipedia 的排名表模板，較不受模板格式變動影響）
export function computeGroupStandings(matches: WcMatch[], group: string): GroupStanding[] {
  const groupMatches = matches.filter(m => m.group === group)
  const table = new Map<string, GroupStanding>()
  const ensure = (team: string) => {
    let s = table.get(team)
    if (!s) {
      s = { team, played: 0, win: 0, draw: 0, loss: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 }
      table.set(team, s)
    }
    return s
  }
  for (const m of groupMatches) {
    ensure(m.home)
    ensure(m.away)
  }
  for (const m of groupMatches) {
    if (!isMatchFinished(m)) continue
    const home = ensure(m.home)
    const away = ensure(m.away)
    home.played++; away.played++
    home.goalsFor += m.homeScore!; home.goalsAgainst += m.awayScore!
    away.goalsFor += m.awayScore!; away.goalsAgainst += m.homeScore!
    if (m.homeScore! > m.awayScore!) { home.win++; home.points += 3; away.loss++ }
    else if (m.homeScore! < m.awayScore!) { away.win++; away.points += 3; home.loss++ }
    else { home.draw++; away.draw++; home.points += 1; away.points += 1 }
  }
  for (const s of table.values()) s.goalDiff = s.goalsFor - s.goalsAgainst
  return Array.from(table.values()).sort((a, b) =>
    b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.team.localeCompare(b.team)
  )
}
