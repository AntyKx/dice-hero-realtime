/**
 * 死亡騎士模組重做（2026-08-18）匯入：跟 scripts/import-firemage-redo.mjs
 * 同一套做法——來源已經是乾淨透明底（sprite-info.json 標記 sourceMotherSheet
 * 為「透明母圖」，實測四角像素 alpha=0 確認），只要裁切到內容 bounding box
 * 就好，不用 process-hero-frames.mjs 那套 flood-fill 去背。
 *
 * 執行：node scripts/import-deathknight-redo.mjs
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'fs'
import { join } from 'path'

const SRC_DIR = 'D:/CLAUDE專案/三選一/英雄圖/死亡騎士/死亡騎士/individual'
const SRC_PREFIX = 'death_knight'
const OUT_DIR = 'public/assets/frames/heroes/death_knight/s0'
const STAR_COPY_TARGETS = ['s1', 's2', 's3']
const TRIM_PADDING = 2

const STATES = [
  { src: 'idle', out: 'idle', count: 6 },
  { src: 'move', out: 'walk', count: 6 },
  { src: 'attack', out: 'attack', count: 5 },
  { src: 'skill', out: 'skill', count: 3 },
]

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
console.log('開始匯入死亡騎士重做版 20 張逐幀圖...\n')
for (const state of STATES) {
  console.log(`[${state.src} -> ${state.out}]`)
  for (let i = 1; i <= state.count; i++) {
    const srcFile = join(SRC_DIR, `${SRC_PREFIX}_${state.src}_${String(i).padStart(2, '0')}.png`)
    const outFile = join(OUT_DIR, `${state.out}_${i - 1}.png`)
    const png = PNG.sync.read(readFileSync(srcFile))
    const trimmed = trimToContent(png, TRIM_PADDING)
    writeFileSync(outFile, PNG.sync.write(trimmed))
    console.log(`  ✓ ${srcFile.split('/').pop()} -> ${outFile}  (${trimmed.width}x${trimmed.height})`)
  }
}

const manifest = {}
for (const state of STATES) manifest[state.out] = state.count
writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest))
console.log('✓ manifest.json ->', manifest)

for (const star of STAR_COPY_TARGETS) {
  const dir = OUT_DIR.replace('/s0', `/${star}`)
  mkdirSync(dir, { recursive: true })
  for (const f of readdirSync(OUT_DIR)) copyFileSync(join(OUT_DIR, f), join(dir, f))
  console.log(`同步複製到 ${dir}`)
}
