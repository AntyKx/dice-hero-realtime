/**
 * import-enemy-sprites.mjs
 *
 * 處理副本怪物 sprite：
 *   1. 移除綠幕背景（3-pass BFS）
 *   2. 偵測 6 格內容邊界，裁切高度
 *   3. 輸出到 public/assets/spritesheets/enemies/
 *   4. 印出每個怪物的 frameWidth / frameHeight
 *
 * 執行：node scripts/import-enemy-sprites.mjs
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const FRAME_COUNT = 6
const PAD_Y = 16   // top/bottom padding after tight crop

const SOURCES = [
  { src: 'C:/Users/Anty/Desktop/圖檔/副本怪物/裂隙小鬼.png',   id: 'rift_imp' },
  { src: 'C:/Users/Anty/Desktop/圖檔/副本怪物/裂隙守衛.png',   id: 'rift_guardian' },
  { src: 'C:/Users/Anty/Desktop/圖檔/副本怪物/星砂魔偶.png',   id: 'star_sand_golem' },
  { src: 'C:/Users/Anty/Desktop/圖檔/副本怪物/鏡像盜賊.png',   id: 'mirror_thief' },
  { src: 'C:/Users/Anty/Desktop/圖檔/副本怪物/星蝕修女.png',   id: 'eclipse_nun' },
  { src: 'C:/Users/Anty/Desktop/圖檔/副本怪物/暗月主教.png',   id: 'eclipse_bishop' },
  { src: 'C:/Users/Anty/Desktop/圖檔/副本怪物/星界收割者.png', id: 'star_reaper' },
  // ── 裂隙前兆篇 ──────────────────────────────────────────────────────────────
  { src: 'C:/Users/Anty/Desktop/圖檔/dicehero_裂隙前兆篇_前兩區_命名版/01_星砂鼠.png',               id: 'sand_rat' },
  { src: 'C:/Users/Anty/Desktop/圖檔/dicehero_裂隙前兆篇_前兩區_命名版/02_裂縫哥布林.png',           id: 'rift_goblin' },
  { src: 'C:/Users/Anty/Desktop/圖檔/dicehero_裂隙前兆篇_前兩區_命名版/03_星塵史萊姆.png',           id: 'star_slime' },
  { src: 'C:/Users/Anty/Desktop/圖檔/dicehero_裂隙前兆篇_前兩區_命名版/04_裂隙巡哨.png',             id: 'rift_scout' },
  { src: 'C:/Users/Anty/Desktop/圖檔/dicehero_裂隙前兆篇_前兩區_命名版/05_星砂巨獸_BOSS.png',        id: 'sand_beast' },
  { src: 'C:/Users/Anty/Desktop/圖檔/dicehero_裂隙前兆篇_前兩區_命名版/06_月影盜賊.png',             id: 'moon_rogue' },
  { src: 'C:/Users/Anty/Desktop/圖檔/dicehero_裂隙前兆篇_前兩區_命名版/07_廢都守衛.png',             id: 'ruin_guard' },
  { src: 'C:/Users/Anty/Desktop/圖檔/dicehero_裂隙前兆篇_前兩區_命名版/08_月光術士.png',             id: 'moon_mage' },
  { src: 'C:/Users/Anty/Desktop/圖檔/dicehero_裂隙前兆篇_前兩區_命名版/09_鏡月刺客_精英.png',        id: 'mirror_assassin' },
  { src: 'C:/Users/Anty/Desktop/圖檔/dicehero_裂隙前兆篇_前兩區_命名版/10_月影執行官_BOSS.png',      id: 'moon_executor' },
  { src: 'C:/Users/Anty/Desktop/圖檔/dicehero_裂隙前兆篇_前兩區_命名版/11_暗月信徒.png',             id: 'dark_devotee' },
  { src: 'C:/Users/Anty/Desktop/圖檔/dicehero_裂隙前兆篇_前兩區_命名版/12_裂隙祈禱者.png',           id: 'rift_praying' },
  { src: 'C:/Users/Anty/Desktop/圖檔/dicehero_裂隙前兆篇_前兩區_命名版/13_黑月裁決者.png',           id: 'black_judge' },
  { src: 'C:/Users/Anty/Desktop/圖檔/dicehero_裂隙前兆篇_前兩區_命名版/14_暗月祭司_精英.png',        id: 'dark_shaman' },
  { src: 'C:/Users/Anty/Desktop/圖檔/dicehero_裂隙前兆篇_前兩區_命名版/15_暗月主教_前哨形態_BOSS.png', id: 'bishop_vanguard' },
]

const DST_DIR = 'public/assets/spritesheets/enemies'

// ── Green background detection ───────────────────────────────────────────
function isGreen(r, g, b) {
  return g > 80 && g > r * 1.5 && g > b * 1.5
}

// ── 3-pass BFS background removal (same as remove-bg.mjs) ────────────────
const MAX_HOLE = 800

function removeBg(png) {
  const { data, width, height } = png
  const total = width * height

  const origR = new Uint8Array(total)
  const origG = new Uint8Array(total)
  const origB = new Uint8Array(total)
  for (let i = 0; i < total; i++) {
    origR[i] = data[i*4]; origG[i] = data[i*4+1]; origB[i] = data[i*4+2]
  }

  // Pass 1: remove green
  let removed = 0
  for (let idx = 0; idx < total; idx++) {
    const p = idx * 4
    if (isGreen(data[p], data[p+1], data[p+2])) { data[p+3] = 0; removed++ }
  }

  // Pass 2: BFS from edges to mark reachable transparent pixels
  const tVis = new Uint8Array(total)
  const queue = []
  const seed = (idx) => { if (!tVis[idx] && data[idx*4+3] === 0) { tVis[idx] = 1; queue.push(idx) } }
  for (let x = 0; x < width; x++) { seed(x); seed((height-1)*width+x) }
  for (let y = 1; y < height-1; y++) { seed(y*width); seed(y*width+width-1) }
  for (let qi = 0; qi < queue.length; qi++) {
    const i = queue[qi], x = i%width, y = (i/width)|0
    const ns = [y>0?i-width:-1, y<height-1?i+width:-1, x>0?i-1:-1, x<width-1?i+1:-1]
    for (const n of ns) if (n>=0 && !tVis[n] && data[n*4+3]===0) { tVis[n]=1; queue.push(n) }
  }

  // Connected component analysis: restore small enclosed holes
  const label = new Int32Array(total).fill(-1)
  const sizes = []
  for (let idx = 0; idx < total; idx++) {
    if (data[idx*4+3]!==0 || tVis[idx] || label[idx]!==-1) continue
    const cid = sizes.length; sizes.push(0)
    const q = [idx]; label[idx] = cid; let qi = 0
    while (qi < q.length) {
      const i = q[qi++]; sizes[cid]++
      const x=i%width, y=(i/width)|0
      const ns = [y>0?i-width:-1, y<height-1?i+width:-1, x>0?i-1:-1, x<width-1?i+1:-1]
      for (const n of ns) if (n>=0 && label[n]===-1 && data[n*4+3]===0 && !tVis[n]) { label[n]=cid; q.push(n) }
    }
  }
  for (let idx = 0; idx < total; idx++) {
    const cid = label[idx]; if (cid===-1) continue
    if (sizes[cid] <= MAX_HOLE) {
      data[idx*4]=origR[idx]; data[idx*4+1]=origG[idx]; data[idx*4+2]=origB[idx]; data[idx*4+3]=255
    }
  }

  // Pass 3: edge fade
  for (let idx = 0; idx < total; idx++) {
    const p = idx*4
    if (data[p+3]===0) continue
    const x=idx%width, y=(idx/width)|0
    const nearBg = (y>0&&data[(idx-width)*4+3]===0)||(y<height-1&&data[(idx+width)*4+3]===0)||
                   (x>0&&data[(idx-1)*4+3]===0)||(x<width-1&&data[(idx+1)*4+3]===0)
    if (!nearBg) continue
    const r=data[p],g=data[p+1],b=data[p+2]
    if (isGreen(r,g,b)) { data[p+3]=0; continue }
    if (r>195&&g>195&&b>195) {
      const br=(r+g+b)/3
      if (br>218) data[p+3]=Math.round(data[p+3]*(1-(br-218)/37))
    }
  }

  console.log(`  Pass1 removed: ${removed}px`)
}

// ── Find bounding box of non-transparent pixels ───────────────────────────
function getBoundingBox(png) {
  const { data, width, height } = png
  let minY=height, maxY=0, minX=width, maxX=0
  for (let y=0; y<height; y++) {
    for (let x=0; x<width; x++) {
      if (data[(y*width+x)*4+3] > 10) {
        if (y<minY) minY=y; if (y>maxY) maxY=y
        if (x<minX) minX=x; if (x>maxX) maxX=x
      }
    }
  }
  return { minX, maxX, minY, maxY }
}

// ── Crop PNG to given rect ─────────────────────────────────────────────────
function cropPng(src, x0, y0, w, h) {
  const out = new PNG({ width: w, height: h, filterType: -1 })
  for (let dy=0; dy<h; dy++) {
    for (let dx=0; dx<w; dx++) {
      const si = ((y0+dy)*src.width + (x0+dx))*4
      const di = (dy*w+dx)*4
      out.data[di]   = src.data[si]
      out.data[di+1] = src.data[si+1]
      out.data[di+2] = src.data[si+2]
      out.data[di+3] = src.data[si+3]
    }
  }
  return out
}

// ── Main ──────────────────────────────────────────────────────────────────
mkdirSync(DST_DIR, { recursive: true })

console.log('=== 副本怪物 Sprite 匯入 ===\n')

const results = []

for (const { src, id } of SOURCES) {
  console.log(`處理 ${id} (${src.split('/').pop()})`)
  const buf = readFileSync(src)
  const png = PNG.sync.read(buf)
  console.log(`  原始尺寸: ${png.width}×${png.height}`)

  removeBg(png)

  const { minY, maxY } = getBoundingBox(png)
  const contentH = maxY - minY + 1
  const cropY0 = Math.max(0, minY - PAD_Y)
  const cropH  = Math.min(png.height - cropY0, contentH + PAD_Y * 2)
  const cropW  = png.width  // keep full width (6 frames × frameW)

  const cropped = cropPng(png, 0, cropY0, cropW, cropH)

  const frameW = Math.round(cropW / FRAME_COUNT)
  const frameH = cropH

  const dst = `${DST_DIR}/${id}.png`
  writeFileSync(dst, PNG.sync.write(cropped))

  console.log(`  → ${dst}`)
  console.log(`  frameWidth: ${frameW}, frameHeight: ${frameH}`)
  console.log()

  results.push({ id, frameW, frameH })
}

console.log('=== data.ts 更新參考 ===')
for (const { id, frameW, frameH } of results) {
  console.log(`E('${id}', ${frameW}, ${frameH})`)
}
