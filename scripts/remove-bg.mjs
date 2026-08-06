/**
 * 批次移除 sprite sheet 背景，轉存為透明 PNG。
 * 執行：node scripts/remove-bg.mjs
 *
 * 演算法：
 *   Step 0 — 偵測背景色：先取四角 + 四邊中點；若邊緣已全透明（圖已處理過），
 *            改掃全圖找「最常見的中性淺色」作為背景色
 *   Pass 1 — 全域移除：整張圖凡是與背景色色差 ≤ BG_TOLERANCE 的像素全部變透明
 *   Pass 2 — 封閉洞還原：從四邊 BFS 找邊緣可達透明區；透明但邊緣不可達 = 角色本體細節 → 還原
 *   Pass 3 — 邊緣淡出：對靠近透明的淺色殘邊依色差消除
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const BG_TOLERANCE  = 32   // 背景色差容差（歐幾里得距離）
const CLUSTER_DIST  = 22
const SAMPLE_RADIUS = 6

// ── Step 0: 偵測背景色 ────────────────────────────────────────────────────
function clusterColors(samples) {
  const clusters = []
  for (const [r, g, b] of samples) {
    let best = null, bestD = Infinity
    for (const c of clusters) {
      const d = Math.sqrt((r-c.r)**2 + (g-c.g)**2 + (b-c.b)**2)
      if (d < bestD) { bestD = d; best = c }
    }
    if (best && bestD <= CLUSTER_DIST) {
      const n = best.n
      best.r = (best.r * n + r) / (n + 1)
      best.g = (best.g * n + g) / (n + 1)
      best.b = (best.b * n + b) / (n + 1)
      best.n = n + 1
    } else {
      clusters.push({ r, g, b, n: 1 })
    }
  }
  return clusters.filter(c => c.r > 150 && c.g > 150 && c.b > 150)
}

function detectBgColors(data, width, height) {
  // ① 先取四角 + 四邊中點
  const positions = []
  for (let dy = 0; dy < SAMPLE_RADIUS; dy++) {
    for (let dx = 0; dx < SAMPLE_RADIUS; dx++) {
      positions.push([dx, dy], [width-1-dx, dy], [dx, height-1-dy], [width-1-dx, height-1-dy])
    }
  }
  const mx = (width/2)|0, my = (height/2)|0
  for (let d = -SAMPLE_RADIUS; d <= SAMPLE_RADIUS; d++) {
    positions.push([mx+d, 0], [mx+d, height-1], [0, my+d], [width-1, my+d])
  }

  const edgeSamples = []
  for (const [x, y] of positions) {
    if (x < 0 || x >= width || y < 0 || y >= height) continue
    const p = (y * width + x) * 4
    if (data[p+3] < 128) continue
    const r = data[p], g = data[p+1], b = data[p+2]
    if (r > 150 && g > 150 && b > 150) edgeSamples.push([r, g, b])
  }

  const fromEdge = clusterColors(edgeSamples)
  if (fromEdge.length > 0) return fromEdge

  // ② 邊緣全透明（圖已處理過）→ 掃全圖找最常見的中性淺色
  console.log('    (邊緣全透明，改掃全圖偵測背景色)')
  const counts = new Map()
  for (let i = 0; i < width * height; i++) {
    const p = i * 4
    if (data[p+3] < 200) continue
    const r = data[p], g = data[p+1], b = data[p+2]
    if (r < 150 || g < 150 || b < 150) continue             // 太深，是角色
    if (Math.abs(r-g) > 25 || Math.abs(g-b) > 25) continue  // 有飽和度，是角色
    // 量化到 8 階（每格 8 灰階）
    const key = ((r >> 3) << 14) | ((g >> 3) << 7) | (b >> 3)
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  if (counts.size === 0) return [{ r: 255, g: 255, b: 255 }]

  // 取出現最多的前 3 色（通常就是棋盤的白+灰）
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => ({
      r: ((key >> 14) & 0x7F) * 8 + 4,
      g: ((key >> 7)  & 0x7F) * 8 + 4,
      b:  (key        & 0x7F) * 8 + 4,
    }))
  return top
}

function bgDist(r, g, b, bgColors) {
  return Math.min(...bgColors.map(c => Math.sqrt((r-c.r)**2 + (g-c.g)**2 + (b-c.b)**2)))
}

function removeBackground(data, width, height) {
  const total = width * height
  const bgColors = detectBgColors(data, width, height)
  console.log('    背景色:', bgColors.map(c => `rgb(${c.r|0},${c.g|0},${c.b|0})`).join(' + '))

  // 儲存原始 RGB（Pass 2 還原時需要）
  const origR = new Uint8Array(total)
  const origG = new Uint8Array(total)
  const origB = new Uint8Array(total)
  for (let i = 0; i < total; i++) {
    origR[i] = data[i*4]; origG[i] = data[i*4+1]; origB[i] = data[i*4+2]
  }

  // ── Pass 1: 全域移除背景色 ─────────────────────────────────────────────
  let removed = 0
  for (let idx = 0; idx < total; idx++) {
    if (data[idx*4+3] === 0) continue
    const r = data[idx*4], g = data[idx*4+1], b = data[idx*4+2]
    if (bgDist(r, g, b, bgColors) <= BG_TOLERANCE) {
      data[idx*4+3] = 0
      removed++
    }
  }
  console.log(`    Pass1 移除: ${removed} 像素`)

  // ── Pass 2: 封閉洞還原（只還原小面積細節，大面積=翅膀底下等背景保持透明） ──
  // 面積門檻：圖片總像素的 1%（英雄小圖 ~200px，章節大圖 ~15000px）
  // 跳過 > 800px 的大洞（手臂/翅膀下背景），保留小細節（眼睛、甲板紋路等）
  const MAX_HOLE = 800

  // BFS 從邊緣標記「邊緣可達透明」
  const tVisited = new Uint8Array(total)
  const tQueue = []
  const seedT = (idx) => {
    if (!tVisited[idx] && data[idx*4+3] === 0) { tVisited[idx] = 1; tQueue.push(idx) }
  }
  for (let x = 0; x < width; x++) {
    seedT(x); seedT((height-1)*width + x)
  }
  for (let y = 1; y < height-1; y++) {
    seedT(y*width); seedT(y*width + width-1)
  }
  for (let i = 0; i < tQueue.length; i++) {
    const idx = tQueue[i], x = idx % width, y = (idx/width)|0
    for (const n of [
      y > 0          ? idx - width : -1,
      y < height - 1 ? idx + width : -1,
      x > 0          ? idx - 1     : -1,
      x < width - 1  ? idx + 1     : -1,
    ]) {
      if (n >= 0 && !tVisited[n] && data[n*4+3] === 0) { tVisited[n] = 1; tQueue.push(n) }
    }
  }

  // 連通元件分析：標記每個封閉透明區的面積
  const compLabel = new Int32Array(total).fill(-1)
  const compSize  = []
  for (let idx = 0; idx < total; idx++) {
    if (data[idx*4+3] !== 0 || tVisited[idx] || compLabel[idx] !== -1) continue
    const cid = compSize.length; compSize.push(0)
    const q = [idx]; compLabel[idx] = cid; let qi = 0
    while (qi < q.length) {
      const i = q[qi++]; compSize[cid]++
      const x = i % width, y = (i/width)|0
      for (const n of [y>0?i-width:-1, y<height-1?i+width:-1, x>0?i-1:-1, x<width-1?i+1:-1]) {
        if (n >= 0 && compLabel[n] === -1 && data[n*4+3] === 0 && !tVisited[n]) {
          compLabel[n] = cid; q.push(n)
        }
      }
    }
  }

  // 只還原面積 < MAX_HOLE 的小封閉洞（衣服細節、眼睛等）
  let restored = 0, skipped = 0
  for (let idx = 0; idx < total; idx++) {
    const cid = compLabel[idx]; if (cid === -1) continue
    if (compSize[cid] <= MAX_HOLE) {
      data[idx*4] = origR[idx]; data[idx*4+1] = origG[idx]
      data[idx*4+2] = origB[idx]; data[idx*4+3] = 255
      restored++
    } else { skipped++ }
  }
  console.log(`    Pass2 還原細節: ${restored}px  跳過大洞: ${skipped}px (門檻 ${MAX_HOLE}px)`)

  // ── Pass 3: 邊緣淡出 ─────────────────────────────────────────────────
  for (let idx = 0; idx < total; idx++) {
    const p = idx * 4
    if (data[p+3] === 0) continue
    const x = idx % width, y = (idx/width)|0
    const hasBgNeighbor =
      (y > 0          && data[(idx-width)*4+3] === 0) ||
      (y < height - 1 && data[(idx+width)*4+3] === 0) ||
      (x > 0          && data[(idx-1)*4+3]     === 0) ||
      (x < width - 1  && data[(idx+1)*4+3]     === 0)
    if (!hasBgNeighbor) continue

    const r = data[p], g = data[p+1], b = data[p+2]
    const dist = bgDist(r, g, b, bgColors)
    if (dist <= BG_TOLERANCE * 1.5) {
      data[p+3] = 0   // 仍接近背景色 → 直接移除
    } else if (r > 195 && g > 195 && b > 195) {
      const brightness = (r + g + b) / 3
      if (brightness > 218) {
        data[p+3] = Math.round(data[p+3] * (1 - (brightness - 218) / 37))
      }
    }
  }
}

function processFile(filePath) {
  const png = PNG.sync.read(readFileSync(filePath))
  removeBackground(png.data, png.width, png.height)
  writeFileSync(filePath, PNG.sync.write(png))
  console.log(`  ✓ ${filePath}`)
}

const dirs = [
  'public/assets/spritesheets/heroes',
  'public/assets/spritesheets/enemies',
]

// CH1/CH2/CH3 由 fix-sheets.mjs 負責，這裡跳過以免重複處理破壞正規化成果
const SKIP_FILES = new Set(['CH1.png', 'CH2.png', 'CH3.png'])

console.log('開始移除背景（全域去色 + 封閉洞還原）...\n')
for (const dir of dirs) {
  console.log(`[${dir}]`)
  for (const file of readdirSync(dir)) {
    if (file.endsWith('.png') && !SKIP_FILES.has(file) && !file.startsWith('_')) processFile(join(dir, file))
  }
}
console.log('\n完成！')
