import { PNG } from 'pngjs'
import { readFileSync } from 'fs'

const files = [
  'public/assets/spritesheets/enemies/CH2.png',
  'public/assets/spritesheets/enemies/CH3.png',
]

for (const f of files) {
  const png = PNG.sync.read(readFileSync(f))
  const { data: d, width: w, height: h } = png
  const px = (x, y) => {
    const p = (y * w + x) * 4
    return `rgba(${d[p]},${d[p+1]},${d[p+2]},${d[p+3]})`
  }
  console.log(`\n${f}  ${w}x${h}`)
  console.log('TL 2x2:', px(0,0), px(1,0), '/', px(0,1), px(1,1))
  console.log('TR 2x2:', px(w-1,0), px(w-2,0), '/', px(w-1,1), px(w-2,1))
  console.log('BL 2x2:', px(0,h-1), px(1,h-1), '/', px(0,h-2), px(1,h-2))
  console.log('BR 2x2:', px(w-1,h-1), px(w-2,h-1), '/', px(w-1,h-2), px(w-2,h-2))
}
