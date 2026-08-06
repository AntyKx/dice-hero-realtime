/**
 * import-deep-sea-sprites.mjs  v2
 *
 * 修正：
 *   1. 格子邊界改用 Math.floor(col*W/N)..Math.floor((col+1)*W/N)，不超出圖片
 *   2. 不做水平裁切（直接用完整格子寬），避免左右截斷
 *   3. 孔洞還原排除原本就是綠色的像素（解決中間綠底問題）
 *   4. 綠色判斷閾值更嚴格（避免誤刪海洋色彩）
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const SOURCES = [
  {
    src: 'C:/Users/Anty/Desktop/圖檔/主線怪物/深海遺城篇/CH1.png',
    enemies: ['coral_crab', 'blue_jellyfish', 'tide_piranha', 'coral_colossus', 'abyss_anglerfish'],
  },
  {
    src: 'C:/Users/Anty/Desktop/圖檔/主線怪物/深海遺城篇/CH2.png',
    enemies: ['drowned_guard', 'deep_lancer', 'heavy_drowned', 'sea_priestess', 'sea_emperor_guard'],
  },
  {
    src: 'C:/Users/Anty/Desktop/圖檔/主線怪物/深海遺城篇/CH3.png',
    enemies: ['abyss_siren', 'ancient_shell_knight', 'leviathan_pup', 'sea_queen', 'sleeping_emperor'],
  },
]

const DST_DIR      = 'public/assets/spritesheets/enemies'
const SRC_COLS     = 5
const OUT_COLS     = 6
const FRAME_MAP    = [0, 1, 2, 2, 3, 4]  // 5→6 frames：複製 attack
const ALPHA_THRESH = 40
const PAD_Y        = 22   // top/bottom padding after tight vertical crop
const MAX_HOLE     = 4000 // enclosed-hole threshold (larger for bigger sprites)

// ── 綠幕判斷 ─────────────────────────────────────────────────────────────────
// g > r*1.8 && g > b*1.8 可捕捉反鋸齒綠邊（如 120,240,120）
// 同時保護藍色能量、藍綠色海洋色（g/b < 1.8）
function isGreen(r, g, b) {
  return g > 100 && g > r * 1.8 && g > b * 1.8
}

// ── 3-pass BFS 去背 ──────────────────────────────────────────────────────────
function removeBg(data, width, height) {
  const total = width * height

  // 保存原始色值（孔洞還原用）
  const origR = new Uint8Array(total)
  const origG = new Uint8Array(total)
  const origB = new Uint8Array(total)
  for (let i = 0; i < total; i++) {
    origR[i] = data[i*4]; origG[i] = data[i*4+1]; origB[i] = data[i*4+2]
  }

  // Pass 1：標記綠色像素為透明
  for (let i = 0; i < total; i++) {
    const p = i * 4
    if (isGreen(data[p], data[p+1], data[p+2])) data[p+3] = 0
  }

  // Pass 2：從邊緣 BFS 找所有可達透明區域
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

  // Pass 2b：標記封閉孔洞（連通分量分析）
  const label = new Int32Array(total).fill(-1)
  const size = []
  for (let i = 0; i < total; i++) {
    if (data[i*4+3]!==0 || visited[i] || label[i]!==-1) continue
    const cid = size.length; size.push(0)
    const q=[i]; label[i]=cid; let qi=0
    while (qi<q.length) {
      const idx=q[qi++]; size[cid]++
      const x=idx%width, y=(idx/width)|0
      for (const n of [y>0?idx-width:-1, y<height-1?idx+width:-1, x>0?idx-1:-1, x<width-1?idx+1:-1])
        if (n>=0 && label[n]===-1 && data[n*4+3]===0 && !visited[n]) { label[n]=cid; q.push(n) }
    }
  }
  // 還原封閉孔洞（但排除原本就是綠色的像素）
  for (let i = 0; i < total; i++) {
    const cid = label[i]
    if (cid===-1) continue
    if (size[cid] > MAX_HOLE) continue
    if (isGreen(origR[i], origG[i], origB[i])) continue  // 原本綠色 → 保持透明
    data[i*4]=origR[i]; data[i*4+1]=origG[i]; data[i*4+2]=origB[i]; data[i*4+3]=255
  }

  // Pass 3：邊緣淡出（去除殘留綠邊）
  for (let i = 0; i < total; i++) {
    const p = i*4
    if (data[p+3]===0) continue
    const x=i%width, y=(i/width)|0
    const nearBg = (y>0&&data[(i-width)*4+3]===0)||(y<height-1&&data[(i+width)*4+3]===0)||
                   (x>0&&data[(i-1)*4+3]===0)||(x<width-1&&data[(i+1)*4+3]===0)
    if (!nearBg) continue
    if (isGreen(data[p], data[p+1], data[p+2])) { data[p+3]=0; continue }
    const br=(data[p]+data[p+1]+data[p+2])/3
    if (br>200) data[p+3]=Math.round(data[p+3]*(1-(br-200)/55))
  }
}

// ── 刪除邊緣孤立碎片（相鄰 row 技能效果溢出）───────────────────────────────
// 找出所有不透明像素的連通分量；若某分量完全落在頂部或底部 zoneH 行內，視為
// 鄰 row 的溢出碎片予以刪除。角色身體延伸至邊緣的部分因為與主體相連，不會
// 被誤刪。
function removeEdgeBleed(data, width, height, zoneH = 40) {
  const ALPHA_MIN = 50
  const label = new Int32Array(width * height).fill(-1)
  const minY = [], maxY = []

  for (let i = 0; i < width * height; i++) {
    if (data[i*4+3] < ALPHA_MIN || label[i] !== -1) continue
    const cid = minY.length
    minY.push(Infinity); maxY.push(-Infinity)
    const q = [i]; label[i] = cid
    for (let qi = 0; qi < q.length; qi++) {
      const idx = q[qi]
      const y = (idx / width) | 0, x = idx % width
      if (y < minY[cid]) minY[cid] = y
      if (y > maxY[cid]) maxY[cid] = y
      for (const n of [y>0?idx-width:-1, y<height-1?idx+width:-1, x>0?idx-1:-1, x<width-1?idx+1:-1])
        if (n >= 0 && label[n] === -1 && data[n*4+3] >= ALPHA_MIN) { label[n] = cid; q.push(n) }
    }
  }

  for (let i = 0; i < width * height; i++) {
    const cid = label[i]
    if (cid === -1) continue
    if (maxY[cid] < zoneH || minY[cid] > height - 1 - zoneH)
      data[i*4+3] = 0
  }
}

// ── 取內容邊界（minY/maxY）──────────────────────────────────────────────────
function getContentBounds(data, width, height) {
  let minY=height, maxY=0
  for (let y=0; y<height; y++) {
    for (let x=0; x<width; x++) {
      if (data[(y*width+x)*4+3] >= ALPHA_THRESH) {
        if (y<minY) minY=y; if (y>maxY) maxY=y
      }
    }
  }
  return { minY, maxY }
}

// ── 安全 blit（不超出來源邊界）──────────────────────────────────────────────
function blit(srcData, srcW, srcH, sx, sy, sw, sh, dstData, dx, dy, dstW) {
  for (let row=0; row<sh; row++) {
    const srcY = sy + row
    if (srcY < 0 || srcY >= srcH) continue
    for (let col=0; col<sw; col++) {
      const srcX = sx + col
      if (srcX < 0 || srcX >= srcW) continue
      const si = (srcY * srcW + srcX) * 4
      const di = ((dy+row) * dstW + (dx+col)) * 4
      dstData[di]   = srcData[si]
      dstData[di+1] = srcData[si+1]
      dstData[di+2] = srcData[si+2]
      dstData[di+3] = srcData[si+3]
    }
  }
}

// ── 格子邊界（正確整數切分，不超出圖片）─────────────────────────────────────
function cellBound(total, count, idx) {
  const x0 = Math.floor(idx * total / count)
  const x1 = Math.floor((idx + 1) * total / count)
  return { x0, w: x1 - x0 }
}

// ── Main ──────────────────────────────────────────────────────────────────────
mkdirSync(DST_DIR, { recursive: true })

console.log('=== 深海遺城篇 Sprite 匯入 v2 ===\n')

const results = []

for (const { src, enemies } of SOURCES) {
  const buf = readFileSync(src)
  const sheet = PNG.sync.read(buf)
  const { width: W, height: H } = sheet
  const rowCount = enemies.length

  console.log(`來源: ${src.split('/').pop()} → ${W}×${H}`)

  for (let row = 0; row < rowCount; row++) {
    const id = enemies[row]
    const { x0: rowY, w: rowH } = cellBound(H, rowCount, row)

    // ── 1. 把這一行 5 格組成 strip，分格去背 ─────────────────────────────
    // 先算各格寬度，取最大寬度作為統一 cellW（讓 strip 等寬）
    const cellWidths = Array.from({ length: SRC_COLS }, (_, c) => cellBound(W, SRC_COLS, c).w)
    const frameW = Math.max(...cellWidths)   // 統一輸出 frame 寬
    const stripW = frameW * SRC_COLS

    const strip = new PNG({ width: stripW, height: rowH, filterType: -1 })
    strip.data.fill(0)

    for (let col = 0; col < SRC_COLS; col++) {
      const { x0: cellX, w: cellW } = cellBound(W, SRC_COLS, col)
      const dstX = col * frameW + Math.floor((frameW - cellW) / 2)  // 水平置中
      blit(sheet.data, W, H, cellX, rowY, cellW, rowH, strip.data, dstX, 0, stripW)
    }

    // ── 2. 去背 ───────────────────────────────────────────────────────────
    removeBg(strip.data, stripW, rowH)

    // ── 2b. 刪除相鄰 row 溢出碎片（孤立在頂/底 40px 內的不透明區域）────────
    removeEdgeBleed(strip.data, stripW, rowH, 40)

    // ── 3. 垂直裁切（所有幀中最緊內容邊界）─────────────────────────────────
    const { minY, maxY } = getContentBounds(strip.data, stripW, rowH)
    if (minY > maxY) { console.log(`  ⚠ ${id}: no content, skip`); continue }

    const cropY0 = Math.max(0, minY - PAD_Y)
    const cropH  = Math.min(rowH - cropY0, (maxY - minY + 1) + PAD_Y * 2)

    // ── 4. 組合 6-frame 輸出（FRAME_MAP 補第 6 幀）────────────────────────
    const outW = frameW * OUT_COLS
    const out  = new PNG({ width: outW, height: cropH, filterType: -1 })
    out.data.fill(0)

    for (let fi = 0; fi < OUT_COLS; fi++) {
      const srcCol = FRAME_MAP[fi]
      blit(strip.data, stripW, rowH, srcCol * frameW, cropY0, frameW, cropH, out.data, fi * frameW, 0, outW)
    }

    // ── 5. 輸出 ────────────────────────────────────────────────────────────
    const dst = `${DST_DIR}/${id}.png`
    writeFileSync(dst, PNG.sync.write(out))
    console.log(`  ${id}: frameWidth=${frameW}, frameHeight=${cropH}  → ${dst}`)
    results.push({ id, frameWidth: frameW, frameHeight: cropH })
  }
  console.log()
}

console.log('=== data.ts 更新參考 ===')
for (const { id, frameWidth, frameHeight } of results) {
  console.log(`  { id: '${id}', ... sprite: E('${id}', ${frameWidth}, ${frameHeight}) },`)
}
