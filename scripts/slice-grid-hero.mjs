/**
 * 通用版：把「已經去背完成的網格 sprite sheet」（不是 process-hero-frames.mjs
 * 那種 20 張各自獨立、未裁切、不透明漸層背景的原圖）切成 Arena 用逐幀圖。
 * 從 slice-knight-grid.mjs 抽出來的可重用版本，之後每個新英雄只要在
 * HEROES 表加一筆設定就好。網格本來就是透明的，不套用 BFS 去背（跑了只會
 * 破壞邊緣），只做切格+裁切內容框。
 *
 * 分類依畫面判斷（沒有明確命名，兩張圖各自然分成兩排）：
 *   圖一 第一列 → idle　第二列 → walk
 *   圖二 第一列 → attack　第二列 → skill
 * 幾欄幾列、每張出幾幀，全部由來源圖片尺寸/COLS/ROWS 自動算，不強制湊成
 * 舊素材的 6/6/5/3——動畫系統本來就是自動探測幀數。
 *
 * 執行：node scripts/slice-grid-hero.mjs <heroKey>
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'fs'
import { join } from 'path'

const HEROES = {
  knight: {
    srcDir: 'D:/CLAUDE專案/三選一/英雄圖/騎士',
    sheets: [
      { file: '騎士動作_01-10_大間距.png', rowStates: ['idle', 'walk'] },
      { file: '騎士動作_11-20_大間距.png', rowStates: ['attack', 'skill'] },
    ],
    cols: 5, rows: 2,
    outDir: 'public/assets/frames/heroes/knight/s0',
  },
  fire_mage: {
    srcDir: 'D:/CLAUDE專案/三選一/英雄圖/火焰法師',
    sheets: [
      { file: '火焰法師新圖_動作_01-10_大間距.png', rowStates: ['idle', 'walk'] },
      { file: '火焰法師新圖_動作_11-20_大間距.png', rowStates: ['attack', 'skill'] },
    ],
    cols: 5, rows: 2,
    outDir: 'public/assets/frames/heroes/mage/s0',
  },
}

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

const heroKey = process.argv[2]
const hero = HEROES[heroKey]
if (!hero) {
  console.error(`未知英雄 key: ${heroKey}，可用：${Object.keys(HEROES).join(', ')}`)
  process.exit(1)
}

mkdirSync(hero.outDir, { recursive: true })
console.log(`開始切分 ${heroKey} 新素材（網格 sheet，已透明）...\n`)

for (const sheet of hero.sheets) {
  const png = PNG.sync.read(readFileSync(join(hero.srcDir, sheet.file)))
  const cellW = png.width / hero.cols
  const cellH = png.height / hero.rows
  console.log(`[${sheet.file}] ${png.width}x${png.height}，每格 ${cellW}x${cellH}`)

  for (let row = 0; row < hero.rows; row++) {
    const state = sheet.rowStates[row]
    for (let col = 0; col < hero.cols; col++) {
      const cell = new PNG({ width: cellW, height: cellH })
      PNG.bitblt(png, cell, col * cellW, row * cellH, cellW, cellH, 0, 0)
      const trimmed = trimToContent(cell, TRIM_PADDING)
      const outFile = join(hero.outDir, `${state}_${col}.png`)
      writeFileSync(outFile, PNG.sync.write(trimmed))
      console.log(`  ✓ row${row} col${col} -> ${outFile}  (${trimmed.width}x${trimmed.height})`)
    }
  }
}

// manifest.json：記錄各狀態實際幀數，讓 frameLoader.ts 直接照數字載入，不用
// HEAD 探測每一幀存不存在——探測法會被 Cloudflare edge cache 對「已刪除
// 檔案的舊 URL」的長天期快取騙到，見 frameLoader.ts 開頭的完整說明。
const manifest = {}
for (const sheet of hero.sheets) {
  for (const state of sheet.rowStates) manifest[state] = hero.cols
}
writeFileSync(join(hero.outDir, 'manifest.json'), JSON.stringify(manifest))
console.log(`✓ manifest.json ->`, manifest)

for (const star of STAR_COPY_TARGETS) {
  const dir = hero.outDir.replace('/s0', `/${star}`)
  mkdirSync(dir, { recursive: true })
  for (const f of readdirSync(hero.outDir)) copyFileSync(join(hero.outDir, f), join(dir, f))
  console.log(`同步複製到 ${dir}`)
}

console.log('\n完成！')
