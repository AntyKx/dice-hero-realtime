/**
 * 通用版：把角色逐幀原圖（不透明漸層背景，未裁切）處理成 Arena 用的透明底
 * 逐幀圖。從火焰法師那組（scripts/process-fire-mage-frames.mjs）抽出來的
 * 可重用版本，之後每個新英雄只要在 HEROES 表加一筆設定就好。
 *
 * 執行：node scripts/process-hero-frames.mjs <heroKey>
 * 例如：node scripts/process-hero-frames.mjs knight
 *
 * 演算法（詳細原理見 process-fire-mage-frames.mjs 開頭註解，這裡不重複）：
 *  1. 全部用同一個極低容差（沿相鄰像素色差 chain 的 BFS）去背，低到不會咬穿
 *     角色本體（黑色系服裝在暗部背景色差可能趨近 0，容差必須抓得非常保守）。
 *  2. 連通元件分析，把不夠大、跟角色本體不相連的雜訊色塊強制清透明。
 *  3. 裁切到內容 bounding box，腳底置中對齊。
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'fs'
import { join } from 'path'

const HEROES = {
  fire_mage: {
    srcDir: 'D:/CLAUDE專案/三選一/英雄圖/火焰法師/fire_mage_20_frames',
    srcPrefix: 'fire_mage',
    outDir: 'public/assets/frames/heroes/mage/s0',
  },
  knight: {
    srcDir: 'D:/CLAUDE專案/三選一/英雄圖/騎士',
    srcPrefix: 'holy_knight',
    outDir: 'public/assets/frames/heroes/knight/s0',
  },
}

const STATES = [
  { src: 'idle',   out: 'idle',   count: 6 },
  { src: 'move',   out: 'walk',   count: 6 },
  { src: 'attack', out: 'attack', count: 5 },
  { src: 'skill',  out: 'skill',  count: 3 },
]

const STAR_COPY_TARGETS = ['s1', 's2', 's3']
const BG_TOLERANCE = 3       // 保守低容差，見上方說明；個別角色若仍有破圖再降更低
const FEATHER_TOLERANCE = 14
const TRIM_PADDING = 2
const MIN_COMPONENT_SIZE = 40

function colorDist(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

function floodFillBgMask(data, width, height, tolerance) {
  const total = width * height
  const bg = new Uint8Array(total)
  const queue = new Int32Array(total)
  let qHead = 0, qTail = 0
  const enqueue = (idx) => { if (!bg[idx]) { bg[idx] = 1; queue[qTail++] = idx } }
  for (let x = 0; x < width; x++) { enqueue(x); enqueue((height - 1) * width + x) }
  for (let y = 0; y < height; y++) { enqueue(y * width); enqueue(y * width + width - 1) }
  while (qHead < qTail) {
    const idx = queue[qHead++]
    const x = idx % width, y = (idx / width) | 0
    const p = idx * 4
    const r = data[p], g = data[p + 1], b = data[p + 2]
    const cands = []
    if (x > 0) cands.push(idx - 1)
    if (x < width - 1) cands.push(idx + 1)
    if (y > 0) cands.push(idx - width)
    if (y < height - 1) cands.push(idx + width)
    for (const n of cands) {
      if (bg[n]) continue
      const np = n * 4
      if (colorDist(r, g, b, data[np], data[np + 1], data[np + 2]) <= tolerance) {
        bg[n] = 1
        queue[qTail++] = n
      }
    }
  }
  return bg
}

/**
 * 第三種踩過的坑（火焰法師像素風新圖，2026-08-09）：角色腳下有一圈跟局部
 * 背景色差不夠大的落地陰影，flood fill 從邊緣沿色差鏈走不進去，殘留成好幾
 * 塊跟角色本體「真的不相連」的色塊（實測 600~12000+ px，比雜訊droppings
 * 大很多，單純用像素數門檻分不出來跟角色本體真正斷開的手/袖口/披風——這些
 * 部位常因為線稿/漸層在關節處色差夠大，也會被 flood fill 誤判成獨立區塊，
 * 但缺口通常只有幾像素寬（實測 5~11px），陰影殘留的缺口則遠得多（實測
 * 26~61px）。用「膨脹 RADIUS px 後再判斷連通」取代單純像素數門檻：缺口在
 * RADIUS 以內的元件視為角色本體的一部分保留，缺口更遠的（不管多大塊）視為
 * 陰影/雜訊清除。膨脹只用來判斷連通性，不會真的放大保留下來的像素本身。
 */
function pruneDisconnectedByProximity(data, width, height, radius) {
  const total = width * height
  const opaque = new Uint8Array(total)
  for (let idx = 0; idx < total; idx++) opaque[idx] = data[idx * 4 + 3] !== 0 ? 1 : 0

  // 先在「原始、沒有膨脹」的不透明遮罩上做連通元件分析，找出角色本體
  // （像素數最多的元件）。膨脹的種子只能是本體，不能是任何其他碎塊——
  // 否則碎塊會透過彼此之間的小縫隙一路串接到本體（例如 A 離本體 4px、B
  // 離 A 5px、C 離 B 3px……單一步距都在 radius 內，串起來卻能連到很遠的
  // 雜訊），radius 再怎麼調都擋不住這種「連環搭橋」。
  const rawLabel = new Int32Array(total).fill(-1)
  const rawSizes = []
  for (let start = 0; start < total; start++) {
    if (!opaque[start] || rawLabel[start] !== -1) continue
    const cid = rawSizes.length
    rawSizes.push(0)
    const queue = [start]
    rawLabel[start] = cid
    let qi = 0
    while (qi < queue.length) {
      const idx = queue[qi++]
      rawSizes[cid]++
      const x = idx % width, y = (idx / width) | 0
      const cands = []
      if (x > 0) cands.push(idx - 1)
      if (x < width - 1) cands.push(idx + 1)
      if (y > 0) cands.push(idx - width)
      if (y < height - 1) cands.push(idx + width)
      for (const n of cands) { if (opaque[n] && rawLabel[n] === -1) { rawLabel[n] = cid; queue.push(n) } }
    }
  }
  let mainCid = -1, mainSize = -1
  for (let cid = 0; cid < rawSizes.length; cid++) {
    if (rawSizes[cid] > mainSize) { mainSize = rawSizes[cid]; mainCid = cid }
  }

  // 只從本體像素出發（不是全部不透明像素）膨脹 radius 步，得到「本體周圍
  // radius px 內」的純幾何範圍——跟畫面上實際有什麼像素無關，純粹是距離。
  const reachable = new Uint8Array(total)
  let frontier = []
  for (let idx = 0; idx < total; idx++) { if (rawLabel[idx] === mainCid) { reachable[idx] = 1; frontier.push(idx) } }
  for (let step = 0; step < radius && frontier.length > 0; step++) {
    const next = []
    for (const idx of frontier) {
      const x = idx % width, y = (idx / width) | 0
      const cands = []
      if (x > 0) cands.push(idx - 1)
      if (x < width - 1) cands.push(idx + 1)
      if (y > 0) cands.push(idx - width)
      if (y < height - 1) cands.push(idx + width)
      for (const n of cands) { if (!reachable[n]) { reachable[n] = 1; next.push(n) } }
    }
    frontier = next
  }

  // 原始不透明像素只要落在這個範圍內就保留（不管它原本屬於哪個元件），
  // 範圍外的一律清除，不會有連環搭橋的問題。
  for (let idx = 0; idx < total; idx++) {
    if (opaque[idx] && !reachable[idx]) data[idx * 4 + 3] = 0
  }
}

/**
 * 清掉不夠大、跟角色本體不相連的雜訊色塊——以及另一種踩過的坑：細長的
 * 1px 殘留線（例如壓縮/漸層接縫留下的一條貫穿整張圖的細線），肉眼幾乎
 * 看不到，但因為貫穿整張圖，累積像素數超過 minSize 存活下來，導致
 * trimToContent() 誤把它當內容，裁切框比角色實際大一大截——外面套用
 * targetHeight/實際高度統一縮放時，這張圖的角色就會顯得特別小，動畫
 * 循環到這幀時看起來像「角色突然變小」（或切回其他幀時像「突然變大」）。
 * 用「元件的 bounding box 有沒有貫穿畫面大半」抓這種細長殘留：正常的
 * 次要元素（技能光效、飄動的小碎片）bounding box 不會佔滿整張圖，只有
 * 角色本體跟這種細線殘留才會，所以額外保留「像素數最大的那個元件」
 * （一定是角色本體）不受這條規則影響。
 */
function removeSmallOpaqueIslands(data, width, height, minSize) {
  const total = width * height
  const label = new Int32Array(total).fill(-1)
  const sizes = []
  const bounds = [] // { minX, maxX, minY, maxY }
  for (let start = 0; start < total; start++) {
    if (data[start * 4 + 3] === 0 || label[start] !== -1) continue
    const cid = sizes.length
    sizes.push(0)
    bounds.push({ minX: width, maxX: -1, minY: height, maxY: -1 })
    const queue = [start]
    label[start] = cid
    let qi = 0
    while (qi < queue.length) {
      const idx = queue[qi++]
      sizes[cid]++
      const x = idx % width, y = (idx / width) | 0
      const b = bounds[cid]
      if (x < b.minX) b.minX = x
      if (x > b.maxX) b.maxX = x
      if (y < b.minY) b.minY = y
      if (y > b.maxY) b.maxY = y
      const cands = []
      if (x > 0) cands.push(idx - 1)
      if (x < width - 1) cands.push(idx + 1)
      if (y > 0) cands.push(idx - width)
      if (y < height - 1) cands.push(idx + width)
      for (const n of cands) {
        if (label[n] === -1 && data[n * 4 + 3] !== 0) { label[n] = cid; queue.push(n) }
      }
    }
  }

  let mainCid = -1, mainSize = -1
  for (let cid = 0; cid < sizes.length; cid++) {
    if (sizes[cid] > mainSize) { mainSize = sizes[cid]; mainCid = cid }
  }

  const SPAN_RATIO_LIMIT = 0.5 // 元件 bounding box 佔畫面寬或高超過這個比例，視為可疑貫穿線
  const drop = sizes.map((size, cid) => {
    if (cid === mainCid) return false
    if (size < minSize) return true
    const b = bounds[cid]
    const spanW = (b.maxX - b.minX + 1) / width
    const spanH = (b.maxY - b.minY + 1) / height
    return spanW > SPAN_RATIO_LIMIT || spanH > SPAN_RATIO_LIMIT
  })

  for (let idx = 0; idx < total; idx++) {
    const cid = label[idx]
    if (cid !== -1 && drop[cid]) data[idx * 4 + 3] = 0
  }
}

function removeBackground(png, minComponentSize, proximityMergeRadius) {
  const { data, width, height } = png
  const bg = floodFillBgMask(data, width, height, BG_TOLERANCE)
  const total = width * height
  for (let idx = 0; idx < total; idx++) if (bg[idx]) data[idx * 4 + 3] = 0

  for (let idx = 0; idx < total; idx++) {
    if (bg[idx]) continue
    const x = idx % width, y = (idx / width) | 0
    const p = idx * 4
    const r = data[p], g = data[p + 1], b = data[p + 2]
    let nearestBgDist = Infinity
    const cands = []
    if (x > 0) cands.push(idx - 1)
    if (x < width - 1) cands.push(idx + 1)
    if (y > 0) cands.push(idx - width)
    if (y < height - 1) cands.push(idx + width)
    let hasBgNeighbor = false
    for (const n of cands) {
      if (!bg[n]) continue
      hasBgNeighbor = true
      const np = n * 4
      const d = colorDist(r, g, b, data[np], data[np + 1], data[np + 2])
      if (d < nearestBgDist) nearestBgDist = d
    }
    if (!hasBgNeighbor) continue
    if (nearestBgDist <= FEATHER_TOLERANCE) {
      const t = nearestBgDist / FEATHER_TOLERANCE
      data[p + 3] = Math.round(data[p + 3] * t)
    }
  }

  if (proximityMergeRadius > 0) pruneDisconnectedByProximity(data, width, height, proximityMergeRadius)
  removeSmallOpaqueIslands(data, width, height, minComponentSize)
}

function trimToContent(png, padding) {
  const { width, height, data } = png
  let minX = width, minY = height, maxX = -1, maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return png
  minX = Math.max(0, minX - padding)
  minY = Math.max(0, minY - padding)
  maxX = Math.min(width - 1, maxX + padding)
  maxY = Math.min(height - 1, maxY + padding)
  const newW = maxX - minX + 1
  const newH = maxY - minY + 1
  const out = new PNG({ width: newW, height: newH })
  PNG.bitblt(png, out, minX, minY, newW, newH, 0, 0)
  return out
}

const heroKey = process.argv[2]
const hero = HEROES[heroKey]
if (!hero) {
  console.error(`未知英雄 key: ${heroKey}，可用：${Object.keys(HEROES).join(', ')}`)
  process.exit(1)
}

mkdirSync(hero.outDir, { recursive: true })
console.log(`開始處理 ${heroKey} 20 張逐幀圖...\n`)
for (const state of STATES) {
  console.log(`[${state.src} -> ${state.out}]`)
  for (let i = 1; i <= state.count; i++) {
    const srcFile = join(hero.srcDir, `${hero.srcPrefix}_${state.src}_${String(i).padStart(2, '0')}.png`)
    const outFile = join(hero.outDir, `${state.out}_${i - 1}.png`)
    const png = PNG.sync.read(readFileSync(srcFile))
    removeBackground(png, hero.minComponentSize ?? MIN_COMPONENT_SIZE, hero.proximityMergeRadius ?? 0)
    const trimmed = trimToContent(png, TRIM_PADDING)
    writeFileSync(outFile, PNG.sync.write(trimmed))
    console.log(`  ✓ ${srcFile.split('/').pop()} -> ${outFile}  (${trimmed.width}x${trimmed.height})`)
  }
}
// manifest.json：記錄各狀態實際幀數，讓 frameLoader.ts 直接照數字載入，不用
// HEAD 探測每一幀存不存在——探測法會被 Cloudflare edge cache 對「已刪除
// 檔案的舊 URL」的長天期快取騙到，見 frameLoader.ts 開頭的完整說明。
const manifest = {}
for (const state of STATES) manifest[state.out] = state.count
writeFileSync(join(hero.outDir, 'manifest.json'), JSON.stringify(manifest))
console.log(`✓ manifest.json ->`, manifest)

for (const star of STAR_COPY_TARGETS) {
  const dir = hero.outDir.replace('/s0', `/${star}`)
  mkdirSync(dir, { recursive: true })
  for (const f of readdirSync(hero.outDir)) copyFileSync(join(hero.outDir, f), join(dir, f))
  console.log(`同步複製到 ${dir}`)
}
console.log('\n完成！')
