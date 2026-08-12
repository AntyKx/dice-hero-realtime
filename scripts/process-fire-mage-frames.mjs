/**
 * 一次性腳本：把使用者提供的火焰法師 20 張逐幀原圖（不透明漸層/特效背景，
 * 未裁切、未對齊）處理成可以直接餵給 ArenaGame 的透明底逐幀圖。
 * 執行：node scripts/process-fire-mage-frames.mjs
 *
 * 跟 scripts/remove-bg.mjs 的差異：remove-bg.mjs 是「跟邊角採樣的背景色比
 * 色差」的全域去除，只適合近白色/低漸層背景。這批素材背景是連續漸層，且
 * 角色是黑色系服裝——漸層暗部常常跟黑色服裝色差趨近於 0（尤其雙腿之間
 * 露出背景的那個縫隙，會直接把背景「橋接」進褲子），單一容差無論調多低
 * 都可能在某張圖上遇到這種零色差邊界，容差調高會咬穿角色，調低背景角落
 * 又去不乾淨、留下 JPEG 壓縮雜訊造成的小色塊。
 *
 * 解法分兩階段：
 *  1. 用全部 20 張圖都安全的極低容差（沿相鄰像素色差 chain 的 BFS）去背——
 *     低到「就算某張圖零色差邊界也不太可能整條路徑都低於容差」，角色本體
 *     幾乎不會被咬到，代價是背景角落會殘留破碎的雜訊色塊（沒連成一片、
 *     容差不夠沒被 BFS 吃到的雜訊像素）。
 *  2. 對去背後的不透明像素做連通元件分析，只留下夠大的區塊（角色本體 +
 *     稍大的裝飾物如火焰特效），太小的雜訊色塊一律強制清成透明——這些
 *     雜訊色塊在幾何上跟角色本體不相連，用連通元件天生就分得開，不需要
 *     再猜顏色。
 *
 * 去背後再裁切到內容 bounding box（+padding），讓每張圖的角色都貼齊自己
 * 的畫布邊界。遊戲端用 targetHeight/texture.height 統一縮放 + anchor(0.5,1)
 * 腳底置中，就不會因為原圖角色大小/位置不一致而動畫抖動。
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'fs'
import { join } from 'path'

const SRC_DIR = 'D:/CLAUDE專案/三選一/英雄圖/火焰法師/fire_mage_20_frames'
const OUT_DIR = 'public/assets/frames/heroes/mage/s0'
// ArenaConfig.stars 會依玩家存檔的星等去讀 s0~s3 對應資料夾；目前只有這一套
// 動畫素材，不是四套星等專屬版本，所以處理完 s0 後直接複製到 s1~s3，不然
// 星等 >0 的玩家（含 GM 模式全星等測試）進 Arena 還是會看到舊的單張星等圖。
// 之後如果畫了星等專屬動畫，把對應 sN 從這個複製清單移除即可。
const STAR_COPY_TARGETS = ['s1', 's2', 's3']

// 來源命名 -> 專案既有 AnimState 命名（move 對應現有系統的 walk）
const STATES = [
  { src: 'idle',   out: 'idle',   count: 6 },
  { src: 'move',   out: 'walk',   count: 6 },
  { src: 'attack', out: 'attack', count: 5 },
  { src: 'skill',  out: 'skill',  count: 3 },
]

// 20 張圖裡最難的一張（idle_04，雙腿之間背景色差幾乎是 0）實測到容差 5 就
// 會咬穿褲子，容差 1~3 才安全，這裡統一用 3（留一點點餘裕，交給 Step 2
// 的連通元件清理殘留雜訊）。
const BG_TOLERANCE = 3
const FEATHER_TOLERANCE = 14
const TRIM_PADDING = 2
// Step 2：小於這個像素數的不透明連通元件視為背景雜訊，強制清透明。
// 角色本體/主要裝飾物實測都遠大於這個數字（幾百到上萬 px），雜訊色塊
// 通常只有個位數到幾十 px。
const MIN_COMPONENT_SIZE = 40

function colorDist(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

/** 從四邊做多源 BFS，沿相鄰像素局部色差鏈式擴散——能跟著漸層背景一路吃到中心。 */
function floodFillBgMask(data, width, height, tolerance) {
  const total = width * height
  const bg = new Uint8Array(total)
  const queue = new Int32Array(total)
  let qHead = 0, qTail = 0

  const enqueue = (idx) => {
    if (!bg[idx]) { bg[idx] = 1; queue[qTail++] = idx }
  }
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

/** Step 2：把太小、跟角色本體不相連的不透明雜訊色塊清成透明。 */
function removeSmallOpaqueIslands(data, width, height, minSize) {
  const total = width * height
  const label = new Int32Array(total).fill(-1)
  const sizes = []
  for (let start = 0; start < total; start++) {
    if (data[start * 4 + 3] === 0 || label[start] !== -1) continue
    const cid = sizes.length
    sizes.push(0)
    const queue = [start]
    label[start] = cid
    let qi = 0
    while (qi < queue.length) {
      const idx = queue[qi++]
      sizes[cid]++
      const x = idx % width, y = (idx / width) | 0
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
  for (let idx = 0; idx < total; idx++) {
    const cid = label[idx]
    if (cid !== -1 && sizes[cid] < minSize) data[idx * 4 + 3] = 0
  }
}

function removeBackground(png) {
  const { data, width, height } = png
  const bg = floodFillBgMask(data, width, height, BG_TOLERANCE)
  const total = width * height

  for (let idx = 0; idx < total; idx++) {
    if (bg[idx]) { data[idx * 4 + 3] = 0 }
  }

  // 邊緣羽化：background 旁邊、色差還沒到容差但也不遠的殘邊，依色差比例
  // 做半透明，避免鋸齒硬邊。
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
      const t = nearestBgDist / FEATHER_TOLERANCE // 0(貼近背景)~1(遠離背景)
      data[p + 3] = Math.round(data[p + 3] * t)
    }
  }

  removeSmallOpaqueIslands(data, width, height, MIN_COMPONENT_SIZE)
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
  if (maxX < 0) return png // 全透明（不應該發生），原圖回傳保底

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

mkdirSync(OUT_DIR, { recursive: true })

console.log('開始處理火焰法師 20 張逐幀圖...\n')
for (const state of STATES) {
  console.log(`[${state.src} -> ${state.out}]`)
  for (let i = 1; i <= state.count; i++) {
    const outName = `${state.out}_${i - 1}`
    const srcFile = join(SRC_DIR, `fire_mage_${state.src}_${String(i).padStart(2, '0')}.png`)
    const outFile = join(OUT_DIR, `${outName}.png`)
    const png = PNG.sync.read(readFileSync(srcFile))
    removeBackground(png)
    const trimmed = trimToContent(png, TRIM_PADDING)
    writeFileSync(outFile, PNG.sync.write(trimmed))
    console.log(`  ✓ ${srcFile.split('/').pop()} -> ${outFile}  (${trimmed.width}x${trimmed.height})`)
  }
}
for (const star of STAR_COPY_TARGETS) {
  const dir = OUT_DIR.replace('/s0', `/${star}`)
  mkdirSync(dir, { recursive: true })
  for (const f of readdirSync(OUT_DIR)) copyFileSync(join(OUT_DIR, f), join(dir, f))
  console.log(`同步複製到 ${dir}`)
}

console.log('\n完成！')
