/**
 * import-throne-enemies.mjs
 * 將魔王城章節 5 張獨立 frame PNG 組合成 6-frame spritesheet
 * 命名格式：前綴_01_描述.png … 前綴_05_描述.png
 * 用法: node scripts/import-throne-enemies.mjs
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, readdirSync } from 'fs'

// ── 設定區 ────────────────────────────────────────────────────────────────────
const SRC_DIR = 'C:/Users/Anty/Desktop/圖檔/主線怪物/灰燼王城篇/魔王城'
const DST_DIR = 'public/assets/spritesheets/enemies'

const ENEMIES = [
  { prefix: '炎獄魔犬', out: 'fire_hound'    },
  { prefix: '翼魔飛龍', out: 'bat_dragon'    },
  { prefix: '魅魔女王', out: 'dark_sorceress' },
  { prefix: '焰獄騎士', out: 'dark_knight'   },
  { prefix: '烈焰巨龍', out: 'dragon'        },
]

const SRC_FRAME_COUNT = 5
const OUT_FRAME_COUNT  = 6
const FRAME_MAP        = [0, 1, 2, 2, 3, 4]   // attack frame 複製

const ALPHA_THRESH   = 40
const PAD_X          = 24
const PAD_Y_TOP      = 20
const PAD_Y_BOT      = 20
const TARGET_FRAME_H = 300   // 縮放上限；0 = 不限
// ─────────────────────────────────────────────────────────────────────────────

/** 從檔名取出第一段數字（作為排序 key） */
function extractNum(name) {
  const m = name.match(/\d+/)
  return m ? parseInt(m[0], 10) : 0
}

function isBg(r, g, b) {
  return g > 80 && g > r * 1.5 && g > b * 1.5
}
function isContent(r, g, b, a) { return a >= ALPHA_THRESH && !isBg(r, g, b) }

function removeGreenBg(data, width, height) {
  const total = width * height
  for (let i = 0; i < total; i++) {
    if (isBg(data[i*4], data[i*4+1], data[i*4+2])) data[i*4+3] = 0
  }
  const visited = new Uint8Array(total)
  const queue = []
  const seed = idx => { if (!visited[idx] && data[idx*4+3] === 0) { visited[idx]=1; queue.push(idx) } }
  for (let x = 0; x < width; x++) { seed(x); seed((height-1)*width+x) }
  for (let y = 1; y < height-1; y++) { seed(y*width); seed(y*width+width-1) }
  for (let qi = 0; qi < queue.length; qi++) {
    const idx = queue[qi], x = idx%width, y = (idx/width)|0
    for (const n of [y>0?idx-width:-1, y<height-1?idx+width:-1, x>0?idx-1:-1, x<width-1?idx+1:-1])
      if (n>=0 && !visited[n] && data[n*4+3]===0) { visited[n]=1; queue.push(n) }
  }
  const label = new Int32Array(total).fill(-1), size = []
  for (let i = 0; i < total; i++) {
    if (data[i*4+3]!==0 || visited[i] || label[i]!==-1) continue
    const cid = size.length; size.push(0)
    const q=[i]; label[i]=cid; let qi=0
    while (qi<q.length) {
      const idx=q[qi++]; size[cid]++
      const x=idx%width, y=(idx/width)|0
      for (const n of [y>0?idx-width:-1,y<height-1?idx+width:-1,x>0?idx-1:-1,x<width-1?idx+1:-1])
        if (n>=0&&label[n]===-1&&data[n*4+3]===0&&!visited[n]) { label[n]=cid; q.push(n) }
    }
  }
  for (let i = 0; i < total; i++) {
    const cid = label[i]; if (cid===-1) continue
    if (size[cid] <= 100) data[i*4+3] = 255
  }
}

function getBounds(data, width, x1, x2, y1, y2) {
  let minX=x2, maxX=x1, minY=y2, maxY=y1-1
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++) {
      const idx=(y*width+x)*4
      if (isContent(data[idx],data[idx+1],data[idx+2],data[idx+3])) {
        if (x<minX) minX=x; if (x>maxX) maxX=x
        if (y<minY) minY=y; if (y>maxY) maxY=y
      }
    }
  return { x1:minX, x2:maxX, y1:minY, y2:maxY, w:maxX-minX+1, h:maxY-minY+1 }
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
console.log('\n=== 魔王城怪物 Sprite 匯入 ===\n')
const allFiles = readdirSync(SRC_DIR)
const summary  = []

for (const { prefix, out } of ENEMIES) {
  const files = allFiles
    .filter(f => f.startsWith(prefix) && f.endsWith('.png'))
    .sort((a, b) => extractNum(a) - extractNum(b))

  if (files.length !== SRC_FRAME_COUNT) {
    console.warn(`[${prefix}] 警告：找到 ${files.length} 個檔案，預期 ${SRC_FRAME_COUNT}`)
    files.forEach(f => console.warn('  ', f))
  }

  console.log(`[${prefix}] → ${out}.png`)
  files.forEach((f, i) => console.log(`  frame ${i+1}: ${f}`))

  const pngs = files.map(f => {
    const src = PNG.sync.read(readFileSync(`${SRC_DIR}/${f}`))
    removeGreenBg(src.data, src.width, src.height)
    return src
  })

  let gMinY = Infinity, gMaxY = 0
  for (const src of pngs) {
    const b = getBounds(src.data, src.width, 0, src.width-1, 0, src.height-1)
    if (b.y1 < gMinY) gMinY = b.y1
    if (b.y2 > gMaxY) gMaxY = b.y2
  }

  const boxes = pngs.map(src => {
    const b = getBounds(src.data, src.width, 0, src.width-1, gMinY, gMaxY)
    return { ...b, y1: gMinY, y2: gMaxY, h: gMaxY - gMinY + 1 }
  })
  boxes.forEach((b, i) => console.log(`  frame ${i+1}: content ${b.w}x${b.h}`))

  const maxW = Math.max(...boxes.map(b => b.w))
  const maxH = Math.max(...boxes.map(b => b.h))
  let fW = Math.ceil((maxW + PAD_X * 2) / 2) * 2
  let fH = Math.ceil((maxH + PAD_Y_TOP + PAD_Y_BOT) / 2) * 2

  let scale = 1
  if (TARGET_FRAME_H > 0 && fH > TARGET_FRAME_H) {
    scale = TARGET_FRAME_H / fH
    fW = Math.round(fW * scale)
    fH = TARGET_FRAME_H
  }

  const outW = fW * OUT_FRAME_COUNT
  const outH = fH
  const outData = Buffer.alloc(outW * outH * 4, 0)

  FRAME_MAP.forEach((srcFi, outFi) => {
    const src     = pngs[srcFi]
    const b       = boxes[srcFi]
    const scaledW = Math.round(b.w * scale)
    const scaledH = Math.round(b.h * scale)
    const destX   = outFi * fW + Math.round((fW - scaledW) / 2)
    const destY   = fH - Math.round(PAD_Y_BOT * scale) - scaledH
    for (let dy = 0; dy < scaledH; dy++) {
      const sy = b.y1 + Math.floor(dy / scale)
      if (sy > b.y2) continue
      for (let dx = 0; dx < scaledW; dx++) {
        const sx = b.x1 + Math.floor(dx / scale)
        if (sx > b.x2) continue
        const si = (sy * src.width + sx) * 4
        if (src.data[si+3] < ALPHA_THRESH) continue
        const ox = destX + dx, oy = destY + dy
        if (ox < 0 || ox >= outW || oy < 0 || oy >= outH) continue
        const di = (oy * outW + ox) * 4
        outData[di]   = src.data[si]
        outData[di+1] = src.data[si+1]
        outData[di+2] = src.data[si+2]
        outData[di+3] = src.data[si+3]
      }
    }
  })

  const outPng = new PNG({ width: outW, height: outH })
  outData.copy(outPng.data)
  const dstPath = `${DST_DIR}/${out}.png`
  writeFileSync(dstPath, PNG.sync.write(outPng))
  console.log(`  ✓ ${dstPath}  frameWidth=${fW}  frameHeight=${fH}${scale < 1 ? ` [縮放 ${(scale*100).toFixed(0)}%]` : ''}\n`)
  summary.push({ out, fW, fH })
}

console.log('=== data.ts 更新參考 ===')
for (const { out, fW, fH } of summary) {
  console.log(`  E('${out}', ${fW}, ${fH})`)
}
