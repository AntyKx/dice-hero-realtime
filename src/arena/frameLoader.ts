import { Assets, type Texture } from 'pixi.js'

/**
 * Arena（即時制）逐幀動畫狀態。美術產能計畫見 REALTIME_PIVOT_PLAN.md §6.1：
 * idle/walk/attack/hit/death/skill 六組。目前只有火焰法師（mage/s0）齊全
 * idle/walk/attack/skill 四組，其餘角色仍在製作中。
 */
export type AnimState = 'idle' | 'walk' | 'attack' | 'hit' | 'death' | 'skill'

export const ANIM_STATES: AnimState[] = ['idle', 'walk', 'attack', 'hit', 'death', 'skill']

// 各狀態最多探測到第幾格（對應美術產能規劃的目標張數），實際幀數以資料夾裡
// 真的存在的檔案為準——找不到就在那裡截止，缺的狀態整組 fallback 回 idle。
const STATE_MAX_PROBE: Record<AnimState, number> = {
  idle: 6, walk: 6, attack: 6, hit: 3, death: 6, skill: 3,
}

export const STATE_FPS: Record<AnimState, number> = {
  idle: 7, walk: 10, attack: 12, hit: 10, death: 8, skill: 8,
}

/** 同一個路徑同一個分頁只探測一次（跨場次/換區重進不重打一樣的 HEAD 請求）。 */
const existsCache = new Map<string, Promise<boolean>>()

/**
 * manifest.json 快取（2026-08-11 補上，繞開一個踩到的 CDN 快取坑）：Cloudflare
 * 對 /assets/ 底下的靜態檔案套用長天期 edge cache（沒在 _headers 特別設定的
 * 路徑，觀察到 s-maxage=604800，7 天），而且這層快取只認「這個 URL 有沒有
 * 命中過」，跟目前部署版本實際有哪些檔案完全無關——如果某個角色改版把
 * idle_5.png 這種幀砍掉（例如幀數從 6 減到 5），Cloudflare edge 只要先前
 * 快取過這個 URL 的 200 回應，之後不管重新部署幾次都會繼續回傳那份舊圖，
 * HEAD 探測會誤判成「這張還在」，把已經刪除的舊幀重新拼回新的動畫循環
 * 裡（症狀：動畫播到某一格突然變成上一版的角色圖）。這層 CDN 快取沒有
 * purge 權限可以清（pages.dev 是 Cloudflare 自己的共用網域，一般帳號拿不到
 * zone 層級的快取清除權限），只能靠「換一個新的 URL」繞過，而不是硬碰硬
 * 跟快取比對存在與否。
 *
 * 解法：處理腳本（process-hero-frames.mjs / slice-grid-hero.mjs）現在都會
 * 在輸出資料夾寫一份 manifest.json 記錄各狀態實際張數，這裡改成優先讀那份
 * manifest（URL 帶 ?v=APP_VERSION，版號一變 URL 就變，不會撞到舊的 CDN
 * 快取條目），有 manifest 就直接照上面寫的張數載入，完全不用對每一幀做
 * HEAD 探測——不會再被「舊幀的 URL 曾經 200 過」這件事誤導。沒有 manifest
 * 的資料夾（例如敵人幀圖，還沒補上產生腳本）維持原本的探測邏輯當 fallback。
 */
interface FrameManifest {
  idle?: number; walk?: number; attack?: number; hit?: number; death?: number; skill?: number
}
const manifestCache = new Map<string, Promise<FrameManifest | null>>()
function fetchManifest(basePath: string): Promise<FrameManifest | null> {
  let p = manifestCache.get(basePath)
  if (!p) {
    p = fetch(`${basePath}/manifest.json?v=${__APP_VERSION__}`)
      .then(r => (r.ok ? r.json() as Promise<FrameManifest> : null))
      .catch(() => null)
    manifestCache.set(basePath, p)
  }
  return p
}

/**
 * 逐幀 PNG 本身的請求一定要帶版號 query string，跟 manifest.json 同一招——
 * Cloudflare 對 /assets/ 底下的靜態檔案套用長天期 edge cache，只認「這個
 * URL 有沒有命中過」，換掉圖片內容但沿用同一個檔名（角色動畫模組重做時
 * 就是這樣）不會讓這層快取失效。2026-08-18 真的踩到：重新裁切死亡騎士的
 * idle_0.png 部署後，正式站量到的還是舊尺寸，直接用部署別名網址（跳過
 * apex 網域這層快取）量到的才是新尺寸，兩者唯一差異就是有沒有經過這層
 * edge cache。之前只有 manifest.json 加了版號，沒有想到單張逐幀圖本身也
 * 一樣會被這層快取咬住。
 */
function versioned(url: string): string {
  return `${url}?v=${__APP_VERSION__}`
}

async function loadStateFramesByCount(basePath: string, state: AnimState, count: number): Promise<Texture[]> {
  if (count <= 0) return []
  const frames: Texture[] = []
  for (let i = 0; i < count; i++) {
    try {
      frames.push(await Assets.load<Texture>(versioned(`${basePath}/${state}_${i}.png`)))
    } catch {
      break
    }
  }
  return frames
}

/**
 * 不能只看 HTTP 狀態碼：Cloudflare Pages 的 `_redirects` 有 SPA 通配規則
 * （`/* /index.html 200`），不存在的路徑不會 404，而是回傳 index.html 但
 * 狀態碼仍是 200。所以要另外檢查 Content-Type 是不是圖片，不然還沒畫的
 * 幀圖路徑會被誤判成「存在」，抓到 HTML 當貼圖載入直接炸掉整個 init()。
 */
function checkExists(url: string): Promise<boolean> {
  let p = existsCache.get(url)
  if (!p) {
    p = fetch(versioned(url), { method: 'HEAD' })
      .then(r => r.ok && (r.headers.get('content-type') ?? '').startsWith('image/'))
      .catch(() => false)
    existsCache.set(url, p)
  }
  return p
}

/**
 * 探測 {basePath}/{state}_0.png、_1.png... 找出「從 0 開始存在」的幀數，
 * 中間斷掉就在那裡截止（不會跳格拼接），一張都沒有就回傳空陣列。
 */
async function probeStateFrames(basePath: string, state: AnimState): Promise<Texture[]> {
  const max = STATE_MAX_PROBE[state]
  const urls = Array.from({ length: max }, (_, i) => `${basePath}/${state}_${i}.png`)
  const exist = await Promise.all(urls.map(checkExists))
  let count = 0
  while (count < max && exist[count]) count++
  if (count === 0) return []
  // 保險：就算 checkExists 誤判（例如未來 hosting 規則又變），單張貼圖真的
  // 載入失敗也不該讓整個 init() 炸掉——遇到失敗就在那裡截斷，不吞掉整組。
  const frames: Texture[] = []
  for (const url of urls.slice(0, count)) {
    try {
      frames.push(await Assets.load<Texture>(versioned(url)))
    } catch {
      break
    }
  }
  return frames
}

/**
 * 載入一個角色（英雄某星等 / 某種敵人）底下所有狀態的逐幀圖。idle 一定要有
 * 至少一幀；其餘狀態如果美術還沒畫完，直接沿用 idle 幀陣列，讓呼叫端的動畫
 * 邏輯不用個別判斷「這狀態有沒有美術」——程式化特效（攻擊頓感/受擊震動/
 * 死亡淡出縮小）疊在 idle 圖上一樣能動，等真的幀圖到位就自動換成真的逐幀
 * 動畫，不用再改 code。
 */
export async function loadCharacterFrames(basePath: string): Promise<Record<AnimState, Texture[]>> {
  const manifest = await fetchManifest(basePath)

  let idle: Texture[]
  let walk: Texture[], attack: Texture[], hit: Texture[], death: Texture[], skill: Texture[]
  if (manifest) {
    ;[idle, walk, attack, hit, death, skill] = await Promise.all([
      loadStateFramesByCount(basePath, 'idle', manifest.idle ?? 0),
      loadStateFramesByCount(basePath, 'walk', manifest.walk ?? 0),
      loadStateFramesByCount(basePath, 'attack', manifest.attack ?? 0),
      loadStateFramesByCount(basePath, 'hit', manifest.hit ?? 0),
      loadStateFramesByCount(basePath, 'death', manifest.death ?? 0),
      loadStateFramesByCount(basePath, 'skill', manifest.skill ?? 0),
    ])
    if (idle.length === 0) idle = [await Assets.load<Texture>(versioned(`${basePath}/idle_0.png`))]
  } else {
    idle = await probeStateFrames(basePath, 'idle')
    if (idle.length === 0) idle = [await Assets.load<Texture>(versioned(`${basePath}/idle_0.png`))]
    ;[walk, attack, hit, death, skill] = await Promise.all([
      probeStateFrames(basePath, 'walk'),
      probeStateFrames(basePath, 'attack'),
      probeStateFrames(basePath, 'hit'),
      probeStateFrames(basePath, 'death'),
      probeStateFrames(basePath, 'skill'),
    ])
  }

  return {
    idle,
    walk: walk.length > 0 ? walk : idle,
    attack: attack.length > 0 ? attack : idle,
    hit: hit.length > 0 ? hit : idle,
    death: death.length > 0 ? death : idle,
    skill: skill.length > 0 ? skill : idle,
  }
}
