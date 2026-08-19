/**
 * Forest 01 Art V2：將目前 1024x1536 的 Ground / Foreground 在「建置階段」
 * 轉成 2400x3600 的高品質 runtime master，而不是讓 Pixi 在 runtime 每次硬拉 2.34375 倍。
 *
 * 需要：sharp（專案目前已安裝）
 */
import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { join } from 'path'

const SRC = 'assets-source/forest_1_1'
const OUT = 'public/assets/adventure/forest_1_1/v2'
const WIDTH = 2400
const HEIGHT = 3600

mkdirSync(join(OUT, 'ground', 'tiles'), { recursive: true })
mkdirSync(join(OUT, 'foreground', 'tiles'), { recursive: true })
mkdirSync(join(OUT, 'fx'), { recursive: true })

async function buildMaster(src, out, alpha = false) {
  let pipe = sharp(src)
    .resize(WIDTH, HEIGHT, { kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 1.0 })
  if (alpha) pipe = pipe.ensureAlpha()
  await pipe.webp({ quality: 96, alphaQuality: 100, smartSubsample: true }).toFile(out)
}

async function buildTiles(master, prefix, subdir) {
  const coords = [
    ['00', 0, 0], ['01', 1200, 0],
    ['10', 0, 1800], ['11', 1200, 1800],
  ]
  for (const [code, left, top] of coords) {
    await sharp(master)
      .extract({ left, top, width: 1200, height: 1800 })
      .webp({ quality: 96, alphaQuality: 100, smartSubsample: true })
      .toFile(join(OUT, subdir, 'tiles', `${prefix}_${code}.webp`))
  }
}

async function main() {
  const ground = join(OUT, 'ground', 'forest_1_1_ground_v2.webp')
  const foreground = join(OUT, 'foreground', 'forest_1_1_foreground_v2.webp')
  await buildMaster(join(SRC, '森林遺跡與瀑布秘境.png'), ground)
  await buildMaster(join(SRC, '奇幻森林遺跡邊框.png'), foreground, true)
  await buildTiles(ground, 'forest_1_1_ground_v2', 'ground')
  await buildTiles(foreground, 'forest_1_1_foreground_v2', 'foreground')
  console.log('Forest 01 Art V2 built.')
}

main().catch(err => { console.error(err); process.exit(1) })
