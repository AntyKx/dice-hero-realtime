/**
 * import-star-sprites-partial.mjs
 * 只重新處理指定星等的圖片，其他星等保持不動。
 * 輸出 frame 尺寸至少等於目前版本（394×432），確保 data.ts 不需修改。
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync } from 'fs'

// ── 只更新這兩個 ──────────────────────────────────────────────────────────────
const TARGETS = [
  {
    src: 'C:/Users/Anty/Desktop/圖檔/職業升星圖/祭司/祭司1.png',
    dst: 'public/assets/spritesheets/heroes/priest_s1.png',
    label: '1★',
  },
  {
    src: 'C:/Users/Anty/Desktop/圖檔/職業升星圖/祭司/祭司2.png',
    dst: 'public/assets/spritesheets/heroes/priest_s2.png',
    label: '2★',
  },
]

// 現有 sprite 的 frame 尺寸，輸出不得小於此值（確保 data.ts 不需修改）
const MIN_FRAME_W = 394
const MIN_FRAME_H = 432

const SRC_FRAME_COUNT = 5
const OUT_FRAME_COUNT = 6
const FRAME_MAP = [0, 1, 2, 2, 3, 4]

const ALPHA_THRESH = 40
const PAD_X = 24
const PAD_Y_TOP = 20
const PAD_Y_BOT = 20

function isGreen(r, g, b) {
  return g > 80 && g > r * 1.5 && g > b * 1.5
}
function isContent(r, g, b, a) {
  return a >= ALPHA_THRESH && !isGreen(r, g, b)
}

function removeGreenBg(data, width, height) {
  const total = width * height
  for (let i = 0; i < total; i++) {
    const [r,g,b] = [data[i*4], data[i*4+1], data[i*4+2]]
    if (isGreen(r, g, b)) data[i*4+3] = 0
  }
  const visited = new Uint8Array(total)
  const queue = []
  const seed = idx => { if (!visited[idx] && data[idx*4+3] === 0) { visited[idx]=1; queue.push(idx) } }
  for (let x = 0; x < width; x++) { seed(x); seed((height-1)*width+x) }
  for (let y = 1; y < height-1; y++) { seed(y*width); seed(y*width+width-1) }
  for (let qi = 0; qi < queue.length; qi++) {
    const idx = queue[qi], x = idx%width, y = (idx/width)|0
    for (const n of [y>0?idx-width:-1, y<height-1?idx+width:-1, x>0?idx-1:-1, x<width-1?idx+1:-1]) {
      if (n>=0 && !visited[n] && data[n*4+3]===0) { visited[n]=1; queue.push(n) }
    }
  }
  const label = new Int32Array(total).fill(-1)
  const size  = []
  for (let i = 0; i < total; i++) {
    if (data[i*4+3]!==0 || visited[i] || label[i]!==-1) continue
    const cid = size.length; size.push(0)
    const q=[i]; label[i]=cid; let qi=0
    while (qi<q.length) {
      const idx=q[qi++]; size[cid]++
      const x=idx%width, y=(idx/width)|0
      for (const n of [y>0?idx-width:-1,y<height-1?idx+width:-1,x>0?idx-1:-1,x<width-1?idx+1:-1]) {
        if (n>=0&&label[n]===-1&&data[n*4+3]===0&&!visited[n]) { label[n]=cid; q.push(n) }
      }
    }
  }
  for (let i = 0; i < total; i++) {
    const cid = label[i]; if (cid===-1) continue
    if (size[cid] <= 1200) data[i*4+3] = 255
  }
}

function detectRegions(data, width, height) {
  const density = new Array(width).fill(0)
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const idx = (y*width+x)*4
      if (isContent(data[idx], data[idx+1], data[idx+2], data[idx+3])) density[x]++
    }
  }
  const THRESH = 3
  const runs = []
  let inRun = false, runStart = 0
  for (let x = 0; x < width; x++) {
    if (!inRun && density[x] > THRESH) { inRun=true; runStart=x }
    else if (inRun && density[x] <= THRESH) { inRun=false; runs.push([runStart, x-1]) }
  }
  if (inRun) runs.push([runStart, width-1])
  const MERGE_GAP = 60
  const merged = [runs[0]]
  for (let i = 1; i < runs.length; i++) {
    const prev = merged[merged.length-1]
    if (runs[i][0] - prev[1] <= MERGE_GAP) prev[1] = runs[i][1]
    else merged.push([...runs[i]])
  }
  if (merged.length !== SRC_FRAME_COUNT) {
    console.warn(`  ⚠ 偵測到 ${merged.length} 個區塊，預期 ${SRC_FRAME_COUNT}`)
  }
  return merged
}

function getBounds(data, width, height, x1, x2) {
  let minX=x2, maxX=x1, minY=height, maxY=-1
  for (let y = 0; y < height; y++) {
    for (let x = x1; x <= x2; x++) {
      const idx=(y*width+x)*4
      if (isContent(data[idx],data[idx+1],data[idx+2],data[idx+3])) {
        if (x<minX) minX=x; if (x>maxX) maxX=x
        if (y<minY) minY=y; if (y>maxY) maxY=y
      }
    }
  }
  return { x1:minX, x2:maxX, y1:minY, y2:maxY,
           w: maxX-minX+1, h: maxY-minY+1 }
}

// ── Pass 1: 決定 frame 尺寸（掃描所有新圖，取最大，再和現有最小值比較）────────
let globalFrameW = MIN_FRAME_W
let globalFrameH = MIN_FRAME_H

for (const t of TARGETS) {
  console.log(`\n[掃描] ${t.label} ${t.src}`)
  const src = PNG.sync.read(readFileSync(t.src))
  const { width, height } = src
  console.log(`  原始尺寸: ${width}x${height}`)
  removeGreenBg(src.data, width, height)
  const regions = detectRegions(src.data, width, height)
  const boxes = regions.map(([x1,x2]) => getBounds(src.data, width, height, x1, x2))
  boxes.forEach((b,i) => console.log(`  Frame ${i}: w=${b.w} h=${b.h}`))
  const maxW = Math.max(...boxes.map(b=>b.w))
  const maxH = Math.max(...boxes.map(b=>b.h))
  globalFrameW = Math.max(globalFrameW, maxW + PAD_X*2)
  globalFrameH = Math.max(globalFrameH, maxH + PAD_Y_TOP + PAD_Y_BOT)
}

globalFrameW = Math.ceil(globalFrameW / 2) * 2
globalFrameH = Math.ceil(globalFrameH / 2) * 2
console.log(`\n統一 frame 尺寸: ${globalFrameW}x${globalFrameH}`)

if (globalFrameW !== MIN_FRAME_W || globalFrameH !== MIN_FRAME_H) {
  console.warn(`⚠ 新尺寸和現有不同！請同步更新 data.ts 和重新跑所有 4 張圖！`)
  console.warn(`  舊: ${MIN_FRAME_W}x${MIN_FRAME_H}  新: ${globalFrameW}x${globalFrameH}`)
} else {
  console.log(`✓ 尺寸和現有一致，data.ts 無需修改`)
}

// ── Pass 2: 輸出 1★ 和 2★ ────────────────────────────────────────────────────
for (const t of TARGETS) {
  console.log(`\n[輸出] ${t.label} → ${t.dst}`)
  const src = PNG.sync.read(readFileSync(t.src))
  const { width, height } = src
  removeGreenBg(src.data, width, height)
  const regions = detectRegions(src.data, width, height)
  const boxes   = regions.map(([x1,x2]) => getBounds(src.data, width, height, x1, x2))

  const outW = globalFrameW * OUT_FRAME_COUNT
  const outH = globalFrameH
  const outData = Buffer.alloc(outW * outH * 4, 0)

  FRAME_MAP.forEach((srcFi, outFi) => {
    const b = boxes[srcFi]
    if (!b || b.x1 > b.x2 || b.y1 > b.y2) return

    const destX = outFi * globalFrameW + Math.round((globalFrameW - b.w) / 2)
    const destY = globalFrameH - PAD_Y_BOT - b.h

    for (let py = b.y1; py <= b.y2; py++) {
      for (let px = b.x1; px <= b.x2; px++) {
        const srcIdx = (py * width + px) * 4
        if (src.data[srcIdx+3] < ALPHA_THRESH) continue
        const dx = destX + (px - b.x1)
        const dy = destY + (py - b.y1)
        if (dx < 0 || dx >= outW || dy < 0 || dy >= outH) continue
        const dstIdx = (dy * outW + dx) * 4
        outData[dstIdx]   = src.data[srcIdx]
        outData[dstIdx+1] = src.data[srcIdx+1]
        outData[dstIdx+2] = src.data[srcIdx+2]
        outData[dstIdx+3] = src.data[srcIdx+3]
      }
    }
  })

  const outPng = new PNG({ width: outW, height: outH })
  outData.copy(outPng.data)
  writeFileSync(t.dst, PNG.sync.write(outPng))
  console.log(`  ✓ 完成 (${outW}x${outH})`)
}

console.log('\n全部完成！')
