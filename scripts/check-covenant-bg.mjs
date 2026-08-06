import { PNG } from 'pngjs'
import { readFileSync } from 'fs'

const FILES = [
  'public/assets/spritesheets/enemies/covenant_ember.png',
  'public/assets/spritesheets/enemies/royal_blood_disciple.png',
  'public/assets/spritesheets/enemies/ash_judge.png',
  'public/assets/spritesheets/enemies/mass_resentment.png',
  'public/assets/spritesheets/enemies/covenant_guard.png',
  'public/assets/spritesheets/enemies/crown_priest_seron.png',
  'public/assets/spritesheets/enemies/ash_fallen_king_aldrek.png',
]

for (const f of FILES) {
  const png = PNG.sync.read(readFileSync(f))
  const { data, width, height } = png
  const N = width * height
  let green18 = 0, green16 = 0, transparent = 0, opaque = 0
  for (let i = 0; i < N; i++) {
    const r = data[i*4], g = data[i*4+1], b = data[i*4+2], a = data[i*4+3]
    if (a === 0) { transparent++; continue }
    opaque++
    if (g > 80 && g > r * 1.6 && g > b * 1.6) green16++
    if (g > 100 && g > r * 1.8 && g > b * 1.8) green18++
  }
  const name = f.split('/').pop()
  console.log(`${name}  ${width}x${height}`)
  console.log(`  opaque=${opaque}  transparent=${transparent}`)
  console.log(`  green(×1.6)=${green16}  green(×1.8)=${green18}`)
  if (green16 > 0) console.log(`  ⚠ 有殘留綠背！`)
  else console.log(`  ✓ 無綠背`)
  console.log()
}
