import { PNG } from 'pngjs'
import { readFileSync } from 'fs'

const png = PNG.sync.read(readFileSync('public/assets/spritesheets/enemies/CH2.png'))
const { data: d, width: w, height: h } = png

const px = (x, y) => {
  const p = (y * w + x) * 4
  return `a${d[p+3].toString().padStart(3)} rgb(${d[p]},${d[p+1]},${d[p+2]})`
}

// 找第一個仍然不透明的灰色像素，看看它周圍長什麼樣子
let found = null
outer:
for (let y = 10; y < h - 10; y++) {
  for (let x = 10; x < w - 10; x++) {
    const p = (y * w + x) * 4
    if (d[p+3] > 0) {
      const r = d[p], g = d[p+1], b = d[p+2]
      if (r > 200 && g > 200 && b > 200 && Math.abs(r-g) < 20 && Math.abs(g-b) < 20) {
        found = { x, y }
        break outer
      }
    }
  }
}

if (found) {
  console.log(`第一個殘留灰色像素位置: (${found.x}, ${found.y})`)
  console.log('\n周圍 8x8 像素 (alpha / rgb):')
  for (let y = found.y - 3; y <= found.y + 4; y++) {
    let row = `y=${y}: `
    for (let x = found.x - 3; x <= found.x + 4; x++) {
      row += px(x, y) + '  '
    }
    console.log(row)
  }
} else {
  console.log('找不到殘留灰色像素')
}

// 檢查是否呈棋盤格規律 (奇偶像素交替透明/不透明)
console.log('\n=== 分析 100x100 區塊的棋盤規律 ===')
const cx = (w / 2) | 0, cy = (h / 4) | 0
let checker = 0, nonChecker = 0
for (let y = cy; y < cy + 100; y++) {
  for (let x = cx; x < cx + 100; x++) {
    const p = (y * w + x) * 4
    const a = d[p+3]
    const isOdd = (x + y) % 2 === 1
    if (a > 0 && isOdd) checker++
    if (a > 0 && !isOdd) nonChecker++
  }
}
console.log(`奇數格 (x+y)%2=1 不透明: ${checker}`)
console.log(`偶數格 (x+y)%2=0 不透明: ${nonChecker}`)
