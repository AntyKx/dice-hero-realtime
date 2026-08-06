/**
 * 綠幕去背（適用 chroma-key 純綠背景）
 * 執行：node scripts/remove-bg-greenscreen.mjs
 *
 * 演算法：
 *   Pass 1 — 移除綠幕像素（g 明顯大於 r 與 b）
 *   Pass 2 — 封閉洞還原：角色內部被誤刪的細節（< MAX_HOLE 像素）還原
 *   Pass 3 — 邊緣淡出：殘邊半透明處理
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'

// 綠幕判定：g 遠大於 r/b，且 g 夠亮
function isGreen(r, g, b) {
  return g > 80 && g > r * 1.6 && g > b * 1.6
}

// 邊緣殘留淡出：稍微偏綠的邊緣像素半透明
function greenness(r, g, b) {
  if (g <= 60) return 0
  const excess = g - Math.max(r, b)
  return excess > 0 ? Math.min(1, excess / 120) : 0
}

const MAX_HOLE = 800

function removeGreenScreen(data, width, height) {
  const total = width * height
  const origR = new Uint8Array(total)
  const origG = new Uint8Array(total)
  const origB = new Uint8Array(total)
  for (let i = 0; i < total; i++) {
    origR[i] = data[i*4]; origG[i] = data[i*4+1]; origB[i] = data[i*4+2]
  }

  // ── Pass 1: 移除綠幕像素 ────────────────────────────────────────────────
  let removed = 0
  for (let idx = 0; idx < total; idx++) {
    if (data[idx*4+3] === 0) continue
    const r = data[idx*4], g = data[idx*4+1], b = data[idx*4+2]
    if (isGreen(r, g, b)) {
      data[idx*4+3] = 0
      removed++
    }
  }
  console.log(`    Pass1 移除: ${removed} 像素`)

  // ── Pass 2: 封閉洞還原 ──────────────────────────────────────────────────
  const tVisited = new Uint8Array(total)
  const tQueue = []
  const seedT = (idx) => {
    if (!tVisited[idx] && data[idx*4+3] === 0) { tVisited[idx] = 1; tQueue.push(idx) }
  }
  for (let x = 0; x < width; x++) { seedT(x); seedT((height-1)*width + x) }
  for (let y = 1; y < height-1; y++) { seedT(y*width); seedT(y*width + width-1) }
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

  let restored = 0
  for (let idx = 0; idx < total; idx++) {
    const cid = compLabel[idx]; if (cid === -1) continue
    if (compSize[cid] <= MAX_HOLE) {
      data[idx*4] = origR[idx]; data[idx*4+1] = origG[idx]
      data[idx*4+2] = origB[idx]; data[idx*4+3] = 255
      restored++
    }
  }
  console.log(`    Pass2 還原細節: ${restored}px`)

  // ── Pass 3: 邊緣淡出 ────────────────────────────────────────────────────
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
    const gn = greenness(r, g, b)
    if (gn > 0.15) {
      data[p+3] = Math.max(0, Math.round(data[p+3] * (1 - gn)))
    }
  }
}

const FILES = [
  'public/assets/spritesheets/heroes/priest_s0.png',
  'public/assets/spritesheets/heroes/priest_s1.png',
  'public/assets/spritesheets/heroes/priest_s2.png',
  'public/assets/spritesheets/heroes/priest_s3.png',
]

console.log('開始綠幕去背...\n')
for (const filePath of FILES) {
  if (!existsSync(filePath)) { console.log(`  ⚠ 找不到 ${filePath}`); continue }
  console.log(`處理: ${filePath}`)
  const png = PNG.sync.read(readFileSync(filePath))
  removeGreenScreen(png.data, png.width, png.height)
  writeFileSync(filePath, PNG.sync.write(png))
  console.log(`  ✓ 完成\n`)
}
console.log('全部完成！')
