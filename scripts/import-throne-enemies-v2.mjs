/**
 * import-throne-enemies-v2.mjs
 * 燃燒王座副本 7 隻怪物置換版 — 演算法完全同 import-ash-covenant-sprites.mjs
 * 來源：每隻 5 張個別 PNG（綠幕背景）
 * 用法: node scripts/import-throne-enemies-v2.mjs
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, readdirSync } from 'fs'

const SRC_DIR        = 'C:/Users/Anty/Desktop/圖檔/副本怪物/燃燒王座'
const DST_DIR        = 'public/assets/spritesheets/enemies'

const ENEMIES = [
  { prefix: '魔焰小鬼',   out: 'flame_imp'          },
  { prefix: '熔甲衛兵',   out: 'molten_guard'       },
  { prefix: '灰燼術士',   out: 'ash_mage'           },
  { prefix: '煉獄魔犬',   out: 'inferno_hound'      },
  { prefix: '黑焰騎士',   out: 'black_flame_knight' },
  { prefix: '墮落炎祭司', out: 'fallen_fire_priest' },
  { prefix: '魔王殘影',   out: 'throne_demon_king'  },
]

const SRC_FRAME_COUNT = 5
const OUT_FRAME_COUNT  = 6
const FRAME_MAP        = [0, 1, 2, 2, 3, 4]   // 複製 attack frame

const ALPHA_THRESH   = 40
const PAD_X          = 24
const PAD_Y_TOP      = 20
const PAD_Y_BOT      = 20
const TARGET_FRAME_H = 320

// ── 綠幕判定 ────────────────────────────────────────────────────────────────
function isBg(r, g, b) {
  return g > 80 && g > r * 1.5 && g > b * 1.5
}
function isContent(r, g, b, a) { return a >= ALPHA_THRESH && !isBg(r, g, b) }

function removeGreenBg(data, width, height) {
  const total = width * height

  // Pass 1: 全域標記背景
  for (let i = 0; i < total; i++) {
    if (isBg(data[i*4], data[i*4+1], data[i*4+2])) data[i*4+3] = 0
  }

  // Pass 2: BFS 從邊緣確認可達透明區（真正背景）
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

  // Pass 2b: 封閉洞（edge不可達透明區）≤100 像素 → 還原為不透明
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

  // Pass 3: 邊緣淡出殘留亮色邊
  for (let i = 0; i < total; i++) {
    const p=i*4; if (data[p+3]===0) continue
    const x=i%width, y=(i/width)|0
    const near=(y>0&&data[(i-width)*4+3]===0)||(y<height-1&&data[(i+width)*4+3]===0)||
               (x>0&&data[(i-1)*4+3]===0)||(x<width-1&&data[(i+1)*4+3]===0)
    if (!near) continue
    if (isBg(data[p],data[p+1],data[p+2])){data[p+3]=0;continue}
    const br=(data[p]+data[p+1]+data[p+2])/3
    if (br>200) data[p+3]=Math.round(data[p+3]*(1-(br-200)/55))
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
console.log('\n=== 燃燒王座怪物 Sprite 置換匯入 ===\n')
const allFiles = readdirSync(SRC_DIR)
const summary  = []

for (const { prefix, out } of ENEMIES) {
  const files = allFiles
    .filter(f => f.startsWith(prefix) && f.endsWith('.png'))
    .sort((a, b) => {
      const na = parseInt(a.match(/(\d+)\.png$/)?.[1] ?? '0', 10)
      const nb = parseInt(b.match(/(\d+)\.png$/)?.[1] ?? '0', 10)
      return na - nb
    })

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

  // 取所有 frame 的統一 Y 範圍（讓所有 frame 底部對齊）
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

  // 組合後做第二次輕量清理：純邊緣淡出，不做 hole restore
  // 處理縮放引入的邊緣混合綠像素
  for (let pass = 0; pass < 3; pass++) {
    // Pass A: 移除仍通過門檻的綠像素
    for (let i = 0; i < outW * outH; i++) {
      const p = i * 4; if (outData[p+3] === 0) continue
      if (isBg(outData[p], outData[p+1], outData[p+2])) outData[p+3] = 0
    }
    // Pass B: 邊緣綠色比例淡出（不依賴門檻，按綠超出量比例消除）
    for (let i = 0; i < outW * outH; i++) {
      const p = i * 4; if (outData[p+3] === 0) continue
      const x = i % outW, y = (i / outW) | 0
      const near = (y>0&&outData[(i-outW)*4+3]===0)||(y<outH-1&&outData[(i+outW)*4+3]===0)||
                   (x>0&&outData[(i-1)*4+3]===0)||(x<outW-1&&outData[(i+1)*4+3]===0)
      if (!near) continue
      const g = outData[p+1]
      if (g > 60) {
        const excess = g - Math.max(outData[p], outData[p+2])
        if (excess > 0) {
          const fade = Math.min(1, excess / 80)
          if (fade > 0.08) outData[p+3] = Math.max(0, Math.round(outData[p+3] * (1 - fade)))
        }
      }
    }
  }

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
