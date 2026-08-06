/**
 * import-star-sprites.mjs
 *
 * 支援兩種來源格式：
 *   A) 4 張獨立圖（每張 5 frame，各代表一個星等）→ SRC_MODE = 'separate'
 *   B) 1 張整合圖（4 行 × 5 格，行 = 星等）      → SRC_MODE = 'grid'
 *
 * 輸出：6-frame spritesheet × 4 星等（attack frame 複製補齊）
 * 每個星等使用自己的 frame 尺寸，保證各星等顯示大小一致。
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync } from 'fs'

// ── 設定區 ────────────────────────────────────────────────────────────────────
const SRC_MODE = 'frames'  // 'separate' | 'grid' | 'frames'
const BG_TYPE  = 'green'   // 'green' | 'pink'

// grid 模式：單一來源圖
const GRID_SRC = 'C:/Users/Anty/Desktop/圖檔/職業升星圖/武鬥家/武鬥家.png'

// separate 模式：4 張來源圖（每張含 5 frames 橫排）
const SEP_SRC_FILES = [
  'C:/Users/Anty/Desktop/圖檔/職業升星圖/祭司/祭司0.png',
  'C:/Users/Anty/Desktop/圖檔/職業升星圖/祭司/祭司1.png',
  'C:/Users/Anty/Desktop/圖檔/職業升星圖/祭司/祭司2.png',
  'C:/Users/Anty/Desktop/圖檔/職業升星圖/祭司/祭司3.png',
]

// frames 模式：每個星等各 5 張獨立圖
const SRC_BASE = 'C:/Users/Anty/Desktop/圖檔/職業升星圖/祭司/祭司重匯'
const SEP_FRAMES_FILES = [
  [1,2,3,4,5].map(n => `${SRC_BASE}/祭司0星${n}.png`),
  [1,2,3,4,5].map(n => `${SRC_BASE}/祭司1星${n}.png`),
  [1,2,3,4,5].map(n => `${SRC_BASE}/祭司2星${n}.png`),
  [1,2,3,4,5].map(n => `${SRC_BASE}/祭司3星${n}.png`),
]

const DST_FILES = [
  'public/assets/spritesheets/heroes/priest_s0.png',
  'public/assets/spritesheets/heroes/priest_s1.png',
  'public/assets/spritesheets/heroes/priest_s2.png',
  'public/assets/spritesheets/heroes/priest_s3.png',
]

const SRC_ROW_COUNT   = 4   // 星等數
const SRC_FRAME_COUNT = 5   // 每星等 5 個 frame
const OUT_FRAME_COUNT = 6
const FRAME_MAP = [0, 1, 2, 2, 3, 4]   // attack 複製為 attack0/attack1

// 只用這些 source frame index 來決定每星等的 frame 尺寸
// 排除 skill/attack 的特效不讓它撐大 frame 尺寸（null = 全部參與）
const SIZE_REF_FRAMES = null   // null = 全部 frame 參與，確保攻擊/技能特效不被裁切

const ALPHA_THRESH  = 40
const PAD_X         = 24
const PAD_Y_TOP     = 20
const PAD_Y_BOT     = 20
// frames 模式專用：輸出 frame 高度上限（0 = 不限制）
const TARGET_FRAME_H = 320
// ─────────────────────────────────────────────────────────────────────────────

function isBg(r, g, b) {
  if (BG_TYPE === 'pink') return r > 150 && b > 150 && r > g * 1.4 && b > g * 1.4
  return g > 80 && g > r * 1.5 && g > b * 1.5  // green (default)
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

function detectRuns(density, total, densityThresh, mergeGap) {
  const runs = []
  let inRun = false, runStart = 0
  for (let i = 0; i < total; i++) {
    if (!inRun && density[i] > densityThresh) { inRun=true; runStart=i }
    else if (inRun && density[i] <= densityThresh) { inRun=false; runs.push([runStart, i-1]) }
  }
  if (inRun) runs.push([runStart, total-1])
  if (!runs.length) return runs
  const merged = [runs[0]]
  for (let i = 1; i < runs.length; i++) {
    const prev = merged[merged.length-1]
    if (runs[i][0] - prev[1] <= mergeGap) prev[1] = runs[i][1]
    else merged.push([...runs[i]])
  }
  return merged
}

function detectRows(data, width, height) {
  const rowDensity = new Array(height).fill(0)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const idx = (y*width+x)*4
      if (isContent(data[idx], data[idx+1], data[idx+2], data[idx+3])) rowDensity[y]++
    }
  return detectRuns(rowDensity, height, 5, 30)
}

function detectCols(data, width, y1, y2) {
  const density = new Array(width).fill(0)
  for (let x = 0; x < width; x++)
    for (let y = y1; y <= y2; y++) {
      const idx = (y*width+x)*4
      if (isContent(data[idx], data[idx+1], data[idx+2], data[idx+3])) density[x]++
    }
  // grid 模式：先以 gap=0 偵測出靠左的窄標籤（≤80px），把密度歸零
  // 避免標籤與相鄰角色在 gap=40 時合併進同一 frame
  if (SRC_MODE === 'grid') {
    const raw0 = detectRuns(density, width, 3, 0)
    for (const r of raw0) {
      if (r[0] > 200) break
      if ((r[1] - r[0] + 1) <= 80) {
        for (let x = r[0]; x <= r[1]; x++) density[x] = 0
      }
    }
  }
  // 逐步縮小 mergeGap，直到偵測到足夠的 frame 數
  let runs
  for (const gap of [40, 20, 10, 5, 0]) {
    runs = detectRuns(density, width, 3, gap)
      .filter(r => (r[1] - r[0]) > 50)
    if (runs.length >= SRC_FRAME_COUNT) return runs
  }
  // 仍然不夠：強制等分最寬的區塊，直到達到 SRC_FRAME_COUNT
  if (runs.length < SRC_FRAME_COUNT) {
    runs = [...runs]
    while (runs.length < SRC_FRAME_COUNT) {
      let maxIdx = 0
      for (let i = 1; i < runs.length; i++) {
        if ((runs[i][1] - runs[i][0]) > (runs[maxIdx][1] - runs[maxIdx][0])) maxIdx = i
      }
      const [r1, r2] = runs[maxIdx]
      const mid = Math.round((r1 + r2) / 2)
      runs.splice(maxIdx, 1, [r1, mid], [mid + 1, r2])
    }
    console.log(`    (列偵測: 強制切分至 ${SRC_FRAME_COUNT} 格)`)
  }
  return runs
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

// frameWs / frameHs：每個 row 自己的 frame 尺寸陣列
function renderOutput(srcData, width, srcBoxesByRow, frameWs, frameHs) {
  const results = []
  for (let ri = 0; ri < srcBoxesByRow.length; ri++) {
    const boxes = srcBoxesByRow[ri]
    const fW = frameWs[ri], fH = frameHs[ri]
    const outW = fW * OUT_FRAME_COUNT, outH = fH
    const outData = Buffer.alloc(outW * outH * 4, 0)
    FRAME_MAP.forEach((srcFi, outFi) => {
      const b = boxes[srcFi]
      if (!b || b.w <= 0 || b.h <= 0) return
      const destX = outFi * fW + Math.round((fW - b.w) / 2)
      const destY = fH - PAD_Y_BOT - b.h
      for (let py = b.y1; py <= b.y2; py++)
        for (let px = b.x1; px <= b.x2; px++) {
          const srcIdx = (py * width + px) * 4
          if (srcData[srcIdx+3] < ALPHA_THRESH) continue
          const dx = destX + (px - b.x1), dy = destY + (py - b.y1)
          if (dx < 0 || dx >= outW || dy < 0 || dy >= outH) continue
          const dstIdx = (dy * outW + dx) * 4
          outData[dstIdx]   = srcData[srcIdx]
          outData[dstIdx+1] = srcData[srcIdx+1]
          outData[dstIdx+2] = srcData[srcIdx+2]
          outData[dstIdx+3] = srcData[srcIdx+3]
        }
    })
    results.push({ outData, outW, outH, fW, fH })
  }
  return results
}

function calcFrameSize(boxes) {
  const refIdxSet = SIZE_REF_FRAMES ? new Set(SIZE_REF_FRAMES) : null
  const refBoxes = refIdxSet ? boxes.filter((_, i) => refIdxSet.has(i)) : boxes
  const maxW = Math.max(...refBoxes.map(b => b.w))
  const maxH = Math.max(...refBoxes.map(b => b.h))
  return {
    fW: Math.ceil((maxW + PAD_X * 2) / 2) * 2,
    fH: Math.ceil((maxH + PAD_Y_TOP + PAD_Y_BOT) / 2) * 2,
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
let allBoxesByRow = []   // [rowIdx][frameIdx] = bounds
const frameWs = [], frameHs = []

if (SRC_MODE === 'grid') {
  console.log(`\n[grid 模式] ${GRID_SRC}`)
  const src = PNG.sync.read(readFileSync(GRID_SRC))
  const { width, height } = src
  console.log(`  原始尺寸: ${width}x${height}`)
  removeGreenBg(src.data, width, height)

  const rows = detectRows(src.data, width, height)
  console.log(`  偵測到 ${rows.length} 個行區塊: ${rows.map(r=>r[0]+'-'+r[1]).join(', ')}`)
  if (rows.length !== SRC_ROW_COUNT) console.warn(`  ⚠ 預期 ${SRC_ROW_COUNT} 行`)

  for (let ri = 0; ri < rows.length; ri++) {
    const [ry1, ry2] = rows[ri]
    const cols = detectCols(src.data, width, ry1, ry2)
    console.log(`  Row ${ri}★: ${cols.length} frames → ${cols.map(c=>c[0]+'-'+c[1]).join(', ')}`)
    if (cols.length !== SRC_FRAME_COUNT) console.warn(`    ⚠ 預期 5 格`)
    const boxes = cols.map(([cx1,cx2]) => getBounds(src.data, width, cx1, cx2, ry1, ry2))
    boxes.forEach((b,i) => console.log(`    Frame ${i}: ${b.w}x${b.h}`))
    allBoxesByRow.push(boxes)
    const { fW, fH } = calcFrameSize(boxes)
    frameWs.push(fW); frameHs.push(fH)
  }

  console.log(`\n各星等 frame 尺寸:`)
  frameWs.forEach((fW, ri) => console.log(`  ${ri}★: ${fW}x${frameHs[ri]}`))

  const outputs = renderOutput(src.data, width, allBoxesByRow, frameWs, frameHs)
  for (let ri = 0; ri < outputs.length; ri++) {
    const { outData, outW, outH } = outputs[ri]
    const outPng = new PNG({ width: outW, height: outH })
    outData.copy(outPng.data)
    writeFileSync(DST_FILES[ri], PNG.sync.write(outPng))
    console.log(`  ✓ [${ri}★] → ${DST_FILES[ri]} (${outW}x${outH})`)
  }

} else if (SRC_MODE === 'frames') {
  // frames 模式：每個星等各 5 張獨立 PNG
  console.log(`\n[frames 模式]`)
  const starDataCache = []

  for (let si = 0; si < SEP_FRAMES_FILES.length; si++) {
    console.log(`\n[${si}★]`)
    const pngs = SEP_FRAMES_FILES[si].map(p => {
      const src = PNG.sync.read(readFileSync(p))
      removeGreenBg(src.data, src.width, src.height)
      return src
    })
    // 跨所有 frame 取全域 content bounds
    let gMinX = Infinity, gMaxX = 0, gMinY = Infinity, gMaxY = 0
    pngs.forEach(src => {
      const b = getBounds(src.data, src.width, 0, src.width-1, 0, src.height-1)
      if (b.x1 < gMinX) gMinX = b.x1; if (b.x2 > gMaxX) gMaxX = b.x2
      if (b.y1 < gMinY) gMinY = b.y1; if (b.y2 > gMaxY) gMaxY = b.y2
    })
    // 各 frame 的 box 均用全域 Y 範圍，X 用每張自己的內容邊界
    const boxes = pngs.map(src => {
      const b = getBounds(src.data, src.width, 0, src.width-1, gMinY, gMaxY)
      return { ...b, y1: gMinY, y2: gMaxY, h: gMaxY - gMinY + 1 }
    })
    boxes.forEach((b,i) => console.log(`  Frame ${i}: ${b.w}x${b.h}`))
    allBoxesByRow.push(boxes)
    const { fW, fH } = calcFrameSize(boxes)
    frameWs.push(fW); frameHs.push(fH)
    starDataCache.push(pngs)
  }

  console.log(`\n各星等 frame 尺寸:`)
  frameWs.forEach((fW, si) => console.log(`  ${si}★: ${fW}x${frameHs[si]}`))

  for (let si = 0; si < SEP_FRAMES_FILES.length; si++) {
    const pngs = starDataCache[si]
    const boxes = allBoxesByRow[si]
    let fW = frameWs[si], fH = frameHs[si]
    // 縮放：若 TARGET_FRAME_H > 0 且超出上限，等比例縮小
    let scale = 1
    if (TARGET_FRAME_H > 0 && fH > TARGET_FRAME_H) {
      scale = TARGET_FRAME_H / fH
      fW = Math.round(fW * scale)
      fH = TARGET_FRAME_H
    }
    const outW = fW * OUT_FRAME_COUNT, outH = fH
    const outData = Buffer.alloc(outW * outH * 4, 0)
    FRAME_MAP.forEach((srcFi, outFi) => {
      const src = pngs[srcFi]
      const b = boxes[srcFi]
      if (!b || b.w <= 0 || b.h <= 0) return
      const scaledW = Math.round(b.w * scale)
      const scaledH = Math.round(b.h * scale)
      const destX = outFi * fW + Math.round((fW - scaledW) / 2)
      const destY = fH - Math.round(PAD_Y_BOT * scale) - scaledH
      for (let dy = 0; dy < scaledH; dy++) {
        const sy = b.y1 + Math.floor(dy / scale)
        if (sy > b.y2) continue
        for (let dx = 0; dx < scaledW; dx++) {
          const sx = b.x1 + Math.floor(dx / scale)
          if (sx > b.x2) continue
          const si2 = (sy * src.width + sx) * 4
          if (src.data[si2+3] < ALPHA_THRESH) continue
          const ox = destX + dx, oy = destY + dy
          if (ox < 0 || ox >= outW || oy < 0 || oy >= outH) continue
          const di = (oy * outW + ox) * 4
          outData[di]   = src.data[si2]
          outData[di+1] = src.data[si2+1]
          outData[di+2] = src.data[si2+2]
          outData[di+3] = src.data[si2+3]
        }
      }
    })
    const outPng = new PNG({ width: outW, height: outH })
    outData.copy(outPng.data)
    writeFileSync(DST_FILES[si], PNG.sync.write(outPng))
    console.log(`  ✓ [${si}★] → ${DST_FILES[si]} (${outW}x${outH})${scale < 1 ? ` [縮放 ${(scale*100).toFixed(0)}%]` : ''}`)
  }

} else {
  // separate 模式：第一遍計算各星等 frame 尺寸，第二遍渲染
  console.log(`\n[separate 模式]`)
  const srcDataCache = []

  for (let si = 0; si < SEP_SRC_FILES.length; si++) {
    console.log(`\n[${si}★] ${SEP_SRC_FILES[si]}`)
    const src = PNG.sync.read(readFileSync(SEP_SRC_FILES[si]))
    const { width, height } = src
    removeGreenBg(src.data, width, height)
    const cols = detectCols(src.data, width, 0, height-1)
    const boxes = cols.map(([cx1,cx2]) => getBounds(src.data, width, cx1, cx2, 0, height-1))
    boxes.forEach((b,i) => console.log(`  Frame ${i}: ${b.w}x${b.h}`))
    allBoxesByRow.push(boxes)
    const { fW, fH } = calcFrameSize(boxes)
    frameWs.push(fW); frameHs.push(fH)
    srcDataCache.push({ data: src.data, width, height })
  }

  console.log(`\n各星等 frame 尺寸:`)
  frameWs.forEach((fW, si) => console.log(`  ${si}★: ${fW}x${frameHs[si]}`))
  if (SIZE_REF_FRAMES) console.log(`  (frame 尺寸參考自 SIZE_REF_FRAMES: [${SIZE_REF_FRAMES}])`)

  for (let si = 0; si < SEP_SRC_FILES.length; si++) {
    const { data, width } = srcDataCache[si]
    const [{ outData, outW, outH }] = renderOutput(data, width, [allBoxesByRow[si]], [frameWs[si]], [frameHs[si]])
    const outPng = new PNG({ width: outW, height: outH })
    outData.copy(outPng.data)
    writeFileSync(DST_FILES[si], PNG.sync.write(outPng))
    console.log(`  ✓ [${si}★] → ${DST_FILES[si]} (${outW}x${outH})`)
  }
}

console.log('\n全部完成！請用以下尺寸更新 data.ts:')
frameWs.forEach((fW, i) => {
  const dstName = DST_FILES[i].replace(/.*\/(\w+)\.png$/, '$1')
  let w = fW, h = frameHs[i]
  if (SRC_MODE === 'frames' && TARGET_FRAME_H > 0 && h > TARGET_FRAME_H) {
    const sc = TARGET_FRAME_H / h
    w = Math.round(w * sc); h = TARGET_FRAME_H
  }
  console.log(`  H('${dstName}', ${w}, ${h}),`)
})
