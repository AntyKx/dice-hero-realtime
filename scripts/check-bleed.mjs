/**
 * check-bleed.mjs
 * 檢查每個深海怪物 sprite 的每個 frame，
 * 頂部 40px 和底部 40px 有沒有非透明像素（bleed 殘留）
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
const ZONE = 40
const ALPHA_MIN = 40

for (const id of ENEMIES) {
  const buf = readFileSync(`${DST_DIR}/${id}.png`)
  const png = PNG.sync.read(buf)
  const { width: W, height: H } = png
  const frameW = W / OUT_FRAMES

  const issues = []

  for (let fi = 0; fi < OUT_FRAMES; fi++) {
    const x0 = Math.round(fi * frameW)
    const x1 = Math.round((fi + 1) * frameW)

    // 找這個 frame 頂部 ZONE 行和底部 ZONE 行有無不透明像素
    let topMax = -1, botMin = H

    for (let y = 0; y < H; y++) {
      for (let x = x0; x < x1; x++) {
        const a = png.data[(y * W + x) * 4 + 3]
        if (a >= ALPHA_MIN) {
          if (y < ZONE && y > topMax) topMax = y
          if (y >= H - ZONE && y < botMin) botMin = y
        }
      }
    }

    // 也找這個 frame 主體內容的最小 y
    let bodyStart = H
    for (let y = ZONE; y < H - ZONE; y++) {
      for (let x = x0; x < x1; x++) {
        if (png.data[(y * W + x) * 4 + 3] >= ALPHA_MIN) { bodyStart = y; break }
      }
      if (bodyStart < H) break
    }

    if (topMax >= 0) {
      issues.push(`  frame${fi} 頂部 bleed: y=0..${topMax}  (主體始於 y=${bodyStart}, 距離 ${bodyStart - topMax - 1}px)`)
    }
    if (botMin < H) {
      issues.push(`  frame${fi} 底部 bleed: y=${botMin}..${H-1}`)
    }
  }

  if (issues.length) {
    console.log(`\n⚠ ${id} (${W}×${H}, frameW=${frameW.toFixed(1)})`)
    issues.forEach(l => console.log(l))
  } else {
    console.log(`✓ ${id}`)
  }
}
