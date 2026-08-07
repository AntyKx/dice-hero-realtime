import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const SHEET_DIR = 'public/assets/spritesheets/enemies'
const OUT_DIR = 'public/assets/frames/enemies'

// 只裁 idle_0——arena 引擎目前只用單一靜態幀，沒有逐幀動畫（跟
// gen-star-frames.mjs 的英雄版同樣道理）
const ENEMIES = [
  ['goblin', 364, 300],
  ['orc', 261, 300],
  ['skeleton', 339, 300],
  ['mimic', 347, 300],
  ['golem', 315, 300],
  ['slimeking', 358, 300],
  ['lightning_lancer', 366, 300],
  ['ice_witch', 341, 300],
  ['dark_knight', 321, 300],
  ['dragon', 342, 300],
]

for (const [id, frameW, frameH] of ENEMIES) {
  const src = PNG.sync.read(readFileSync(`${SHEET_DIR}/${id}.png`))
  const expectedW = frameW * 6
  if (src.width !== expectedW || src.height !== frameH) {
    console.error(`DIM MISMATCH ${id}: sheet is ${src.width}x${src.height}, expected ${expectedW}x${frameH}`)
    continue
  }
  const outDir = `${OUT_DIR}/${id}`
  mkdirSync(outDir, { recursive: true })
  const out = new PNG({ width: frameW, height: frameH })
  for (let y = 0; y < frameH; y++) {
    for (let x = 0; x < frameW; x++) {
      const si = (y * src.width + x) * 4 // frame 0 = 最左邊那格
      const di = (y * frameW + x) * 4
      out.data[di] = src.data[si]
      out.data[di+1] = src.data[si+1]
      out.data[di+2] = src.data[si+2]
      out.data[di+3] = src.data[si+3]
    }
  }
  writeFileSync(`${outDir}/idle_0.png`, PNG.sync.write(out))
  console.log(`OK ${id} <- ${id}.png (${frameW}x${frameH})`)
}
