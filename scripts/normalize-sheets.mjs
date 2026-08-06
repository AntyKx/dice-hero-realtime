/**
 * 將章節 sprite sheet (1254×1254) 重新打包成精確 1250×1250 (5×250 格).
 * 每個格子的內容自動偵測 bounding box 後置中放入 250×250 的槽位.
 * 執行：node scripts/normalize-sheets.mjs
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync } from 'fs'

const TARGET = 250   // 目標每格尺寸
const COLS   = 5
const ROWS   = 5
const MARGIN = 2     // 每格留 2px 空白邊（防止 CSS 渲染時邊緣滲色）

function getContentBBox(data, imgW, x0, y0, x1, y1) {
  let minX = x1, maxX = x0 - 1, minY = y1, maxY = y0 - 1
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (data[(y * imgW + x) * 4 + 3] > 0) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  return minX > maxX ? null : { minX, maxX, minY, maxY }
}

function normalizeSheet(inPath, outPath) {
  const src = PNG.sync.read(readFileSync(inPath))
  const { data: sd, width: sw, height: sh } = src
  const cellW = sw / COLS   // 1254/5 = 250.8
  const cellH = sh / ROWS

  const outW = TARGET * COLS   // 1250
  const outH = TARGET * ROWS
  const dst  = new PNG({ width: outW, height: outH })
  dst.data.fill(0)             // 全透明底

  const inner = TARGET - MARGIN * 2   // 246px 可用內容區

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      // 來源格範圍（多取 4px 以防內容緊貼邊界）
      const x0 = Math.max(0,  Math.floor(col * cellW)       - 4)
      const y0 = Math.max(0,  Math.floor(row * cellH)       - 4)
      const x1 = Math.min(sw, Math.ceil((col + 1) * cellW)  + 4)
      const y1 = Math.min(sh, Math.ceil((row + 1) * cellH)  + 4)

      const bb = getContentBBox(sd, sw, x0, y0, x1, y1)
      if (!bb) continue

      const cw = bb.maxX - bb.minX + 1
      const ch = bb.maxY - bb.minY + 1

      // 若內容超過可用區 → 等比縮放（像素藝術很少發生，保險處理）
      const scale   = Math.min(1, inner / cw, inner / ch)
      const drawW   = Math.round(cw * scale)
      const drawH   = Math.round(ch * scale)

      if (scale < 1) {
        console.warn(`  ⚠ row${row} col${col}: 內容 ${cw}x${ch} 超出 ${inner}px，等比縮放至 ${drawW}x${drawH}`)
      }

      // 置中到目標槽位
      const dstX = col * TARGET + MARGIN + Math.floor((inner - drawW) / 2)
      const dstY = row * TARGET + MARGIN + Math.floor((inner - drawH) / 2)

      if (scale === 1) {
        // 直接複製（無縮放）
        for (let dy = 0; dy < ch; dy++) {
          for (let dx = 0; dx < cw; dx++) {
            const sp = ((bb.minY + dy) * sw + (bb.minX + dx)) * 4
            const dp = ((dstY + dy)    * outW + (dstX + dx))  * 4
            dst.data[dp]   = sd[sp]
            dst.data[dp+1] = sd[sp+1]
            dst.data[dp+2] = sd[sp+2]
            dst.data[dp+3] = sd[sp+3]
          }
        }
      } else {
        // 雙線性縮放
        for (let dy = 0; dy < drawH; dy++) {
          for (let dx = 0; dx < drawW; dx++) {
            const srcFx = bb.minX + (dx / scale)
            const srcFy = bb.minY + (dy / scale)
            const sx0 = Math.floor(srcFx), sy0 = Math.floor(srcFy)
            const fx = srcFx - sx0, fy = srcFy - sy0
            const sx1 = Math.min(sx0 + 1, sw - 1)
            const sy1 = Math.min(sy0 + 1, sh - 1)
            const p00 = (sy0 * sw + sx0) * 4
            const p10 = (sy0 * sw + sx1) * 4
            const p01 = (sy1 * sw + sx0) * 4
            const p11 = (sy1 * sw + sx1) * 4
            const dp  = ((dstY + dy) * outW + (dstX + dx)) * 4
            for (let c = 0; c < 4; c++) {
              dst.data[dp + c] = Math.round(
                sd[p00+c] * (1-fx)*(1-fy) +
                sd[p10+c] * fx*(1-fy) +
                sd[p01+c] * (1-fx)*fy +
                sd[p11+c] * fx*fy
              )
            }
          }
        }
      }

      console.log(`  row${row} col${col}: 內容 ${cw}x${ch}  → 置中於 (${dstX},${dstY})`)
    }
  }

  writeFileSync(outPath, PNG.sync.write(dst))
  console.log(`  ✓ 儲存 ${outPath}  (${outW}×${outH})\n`)
}

for (const id of ['CH1', 'CH2', 'CH3']) {
  const p = `public/assets/spritesheets/enemies/${id}.png`
  console.log(`\n[${id}]`)
  normalizeSheet(p, p)
}
console.log('完成！')
