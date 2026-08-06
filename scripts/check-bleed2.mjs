/**
 * check-bleed2.mjs
 * 用「是否有空白間隔」判斷頂部/底部的內容是孤立碎片（真 bleed）
 * 還是角色身體本身連到邊緣（正常內容）
 */
import { PNG } from 'pngjs'
import { readFileSync } from 'fs'

const ENEMIES = [
  'coral_crab','blue_jellyfish','tide_piranha','coral_colossus','abyss_anglerfish',
  'drowned_guard','deep_lancer','heavy_drowned','sea_priestess','sea_emperor_guard',
  'abyss_siren','ancient_shell_knight','leviathan_pup','sea_queen','sleeping_emperor',
]

const DST_DIR = 'public/assets/spritesheets/enemies'
const OUT_FRAMES = 6
const ALPHA_MIN = 40

// 掃描一欄，回傳每一行是否有不透明像素
function rowHasContent(data, W, x0, x1, y) {
  for (let x = x0; x < x1; x++) {
    if (data[(y * W + x) * 4 + 3] >= ALPHA_MIN) return true
  }
  return false
}

for (const id of ENEMIES) {
  const buf = readFileSync(`${DST_DIR}/${id}.png`)
  const png = PNG.sync.read(buf)
  const { width: W, height: H } = png
  const frameW = W / OUT_FRAMES

  let hasBleed = false
  const lines = []

  for (let fi = 0; fi < OUT_FRAMES; fi++) {
    const x0 = Math.round(fi * frameW)
    const x1 = Math.round((fi + 1) * frameW)

    // 找第一個有內容的行
    let firstContent = -1
    for (let y = 0; y < H && firstContent < 0; y++)
      if (rowHasContent(png.data, W, x0, x1, y)) firstContent = y

    if (firstContent < 0) continue  // 完全空

    // 往下找第一個空白行（gap 開始）
    let gapStart = -1
    for (let y = firstContent + 1; y < H; y++) {
      if (!rowHasContent(png.data, W, x0, x1, y)) { gapStart = y; break }
    }

    if (gapStart < 0) continue  // 內容連到底，無 gap

    // gap 之後再往下找下一個有內容的行
    let bodyStart = -1
    for (let y = gapStart + 1; y < H; y++) {
      if (rowHasContent(png.data, W, x0, x1, y)) { bodyStart = y; break }
    }

    if (bodyStart < 0) continue  // gap 後面沒有主體

    // → 頂部有孤立碎片（firstContent..gapStart-1），gap，然後主體（bodyStart+）
    const bleedH = gapStart - firstContent
    const gapH   = bodyStart - gapStart
    lines.push(`  frame${fi} 頂部孤立碎片: y=${firstContent}..${gapStart-1} (${bleedH}px)  gap ${gapH}px  主體始 y=${bodyStart}`)
    hasBleed = true
  }

  // 底部類似檢查（略，可根據需要加）

  if (hasBleed) {
    console.log(`\n⚠ ${id}`)
    lines.forEach(l => console.log(l))
  } else {
    console.log(`✓ ${id}  — 無孤立頂部碎片`)
  }
}
