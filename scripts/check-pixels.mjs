import { PNG } from 'pngjs'
import { readFileSync } from 'fs'

const png = PNG.sync.read(readFileSync('public/assets/spritesheets/heroes/priest.png'))
console.log(`尺寸: ${png.width}x${png.height}`)

// 統計整張圖的透明/不透明比例
let transparent = 0, opaque = 0
for (let i = 3; i < png.data.length; i += 4) {
  if (png.data[i] === 0) transparent++
  else opaque++
}
const total = png.width * png.height
console.log(`透明像素: ${transparent} (${(transparent/total*100).toFixed(1)}%)`)
console.log(`不透明像素: ${opaque} (${(opaque/total*100).toFixed(1)}%)`)

// 掃描第 2 格 (frame index 1) 的中央橫排，確認背景已透明
const frameW = png.width / 6
const scanY = 10  // 靠近頂部，應該是背景
console.log(`\n第2格頂部 y=${scanY} 的 10 個像素 (應該全透明):`)
for (let x = 0; x < 10; x++) {
  const px = Math.floor(frameW) + x
  const i = (scanY * png.width + px) * 4
  console.log(`  x=${px}: alpha=${png.data[i+3]}`)
}

// 掃描圖片中央最多的不透明像素，看看是什麼顏色
const centerX = Math.floor(png.width / 2)
const centerY = Math.floor(png.height / 2)
const i = (centerY * png.width + centerX) * 4
console.log(`\n圖片中央像素 (${centerX},${centerY}): RGBA=[${png.data[i]},${png.data[i+1]},${png.data[i+2]},${png.data[i+3]}]`)
