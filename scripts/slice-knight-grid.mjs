/**
 * 騎士新素材（2026-08-11）專用：跟 process-hero-frames.mjs 的來源格式不同——
 * 不是 20 張各自獨立、未裁切、不透明漸層背景的原圖，而是 2 張已經去背完成
 * 的網格 sprite sheet（5 欄 x 2 列，每格 480x480，大量留白間距），不需要
 * 也不能套用 BFS 去背（本來就是透明的，跑去背只會破壞邊緣）。
 *
 * 分類依畫面判斷（沒有明確命名，兩張各 10 格自然分成兩排）：
 *   圖一（01-10）第一列 1-5 → idle　　第二列 6-10 → walk
 *   圖二（11-20）第一列 11-15 → attack　第二列 16-20 → skill
 * 5/5/5/5，不是舊騎士素材的 6/6/5/3——動畫系統本來就是自動探測幀數，
 * 不要求固定張數，這裡不用湊成舊格式。
 *
 * 執行：node scripts/slice-knight-grid.mjs
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'fs'
import { join } from 'path'

const SRC_DIR = 'D:/CLAUDE專案/三選一/英雄圖/騎士'
const SHEETS = [
  { file: '騎士動作_01-10_大間距.png', rowStates: ['idle', 'walk'] },
  { file: '騎士動作_11-20_大間距.png', rowStates: ['attack', 'skill'] },
]
const COLS = 5
const ROWS = 2
const OUT_DIR = 'public/assets/frames/heroes/knight/s0'
const STAR_COPY_TARGETS = ['s1', 's2', 's3']
const TRIM_PADDING = 2

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

mkdirSync(OUT_DIR, { recursive: true })
console.log('開始切分騎士新素材（網格 sheet，已透明）...\n')

for (const sheet of SHEETS) {
  const png = PNG.sync.read(readFileSync(join(SRC_DIR, sheet.file)))
  const cellW = png.width / COLS
  const cellH = png.height / ROWS
  console.log(`[${sheet.file}] ${png.width}x${png.height}，每格 ${cellW}x${cellH}`)

  for (let row = 0; row < ROWS; row++) {
    const state = sheet.rowStates[row]
    for (let col = 0; col < COLS; col++) {
      const cell = new PNG({ width: cellW, height: cellH })
      PNG.bitblt(png, cell, col * cellW, row * cellH, cellW, cellH, 0, 0)
      const trimmed = trimToContent(cell, TRIM_PADDING)
      const outFile = join(OUT_DIR, `${state}_${col}.png`)
      writeFileSync(outFile, PNG.sync.write(trimmed))
      console.log(`  ✓ row${row} col${col} -> ${outFile}  (${trimmed.width}x${trimmed.height})`)
    }
  }
}

for (const star of STAR_COPY_TARGETS) {
  const dir = OUT_DIR.replace('/s0', `/${star}`)
  mkdirSync(dir, { recursive: true })
  for (const f of readdirSync(OUT_DIR)) copyFileSync(join(OUT_DIR, f), join(dir, f))
  console.log(`同步複製到 ${dir}`)
}

console.log('\n完成！')
