/**
 * import-chapter-sprites.mjs
 *
 * 從 1254×1254 來源圖（5×5 grid，每格 ~250px）
 * 輸出 1400×1400 PNG（5×5 grid，每格 280×280）
 * 每格去綠背景後置中貼入 280×280，留 ~15px 透明安全邊界
 *
 * 輸出路徑：public/assets/spritesheets/enemies/CH1.png  CH2.png  CH3.png
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const SOURCES = [
  { src: 'C:/Users/Anty/Desktop/圖檔/主線怪物/深海遺城篇/CH1.png', out: 'CH1' },
  { src: 'C:/Users/Anty/Desktop/圖檔/主線怪物/深海遺城篇/CH2.png', out: 'CH2' },
  { src: 'C:/Users/Anty/Desktop/圖檔/主線怪物/深海遺城篇/CH3.png', out: 'CH3' },
]

const DST_DIR   = 'public/assets/spritesheets/enemies'
const OUT_CELL  = 280          // 輸出每格固定 280×280
const OUT_SIZE  = OUT_CELL * 5 // 1400×1400
const GRID_N    = 5            // 5×5 grid

function isGreen(r, g, b) {
  return g > 100 && g > r * 1.8 && g > b * 1.8
}

function cellBound(total, n, idx) {
  const x0 = Math.floor(idx * total / n)
  const x1 = Math.floor((idx + 1) * total / n)
  return { x0, w: x1 - x0 }
}

// 3-pass BFS 去背（同 import-deep-sea-sprites.mjs）
function removeBg(data, W, H) {
  const N = W * H
  const origR = new Uint8Array(N), origG = new Uint8Array(N), origB = new Uint8Array(N)
  for (let i = 0; i < N; i++) { origR[i]=data[i*4]; origG[i]=data[i*4+1]; origB[i]=data[i*4+2] }

  for (let i = 0; i < N; i++)
    if (isGreen(data[i*4],data[i*4+1],data[i*4+2])) data[i*4+3]=0

  const visited = new Uint8Array(N)
  const queue = []
  const seed = idx => { if (!visited[idx] && data[idx*4+3]===0) { visited[idx]=1; queue.push(idx) } }
  for (let x=0;x<W;x++){seed(x);seed((H-1)*W+x)}
  for (let y=1;y<H-1;y++){seed(y*W);seed(y*W+W-1)}
  for (let qi=0;qi<queue.length;qi++){
    const idx=queue[qi],x=idx%W,y=(idx/W)|0
    for (const n of [y>0?idx-W:-1,y<H-1?idx+W:-1,x>0?idx-1:-1,x<W-1?idx+1:-1])
      if (n>=0&&!visited[n]&&data[n*4+3]===0){visited[n]=1;queue.push(n)}
  }

  const label=new Int32Array(N).fill(-1); const size=[]
  for (let i=0;i<N;i++){
    if(data[i*4+3]!==0||visited[i]||label[i]!==-1)continue
    const cid=size.length;size.push(0);const q=[i];label[i]=cid;let qi=0
    while(qi<q.length){
      const idx=q[qi++];size[cid]++;const x=idx%W,y=(idx/W)|0
      for(const n of[y>0?idx-W:-1,y<H-1?idx+W:-1,x>0?idx-1:-1,x<W-1?idx+1:-1])
        if(n>=0&&label[n]===-1&&data[n*4+3]===0&&!visited[n]){label[n]=cid;q.push(n)}
    }
  }
  for (let i=0;i<N;i++){
    const cid=label[i];if(cid===-1)continue
    if(size[cid]>4000)continue
    if(isGreen(origR[i],origG[i],origB[i]))continue
    data[i*4]=origR[i];data[i*4+1]=origG[i];data[i*4+2]=origB[i];data[i*4+3]=255
  }
  for (let i=0;i<N;i++){
    const p=i*4;if(data[p+3]===0)continue
    const x=i%W,y=(i/W)|0
    const near=(y>0&&data[(i-W)*4+3]===0)||(y<H-1&&data[(i+W)*4+3]===0)||
               (x>0&&data[(i-1)*4+3]===0)||(x<W-1&&data[(i+1)*4+3]===0)
    if(!near)continue
    if(isGreen(data[p],data[p+1],data[p+2])){data[p+3]=0;continue}
    const br=(data[p]+data[p+1]+data[p+2])/3
    if(br>200)data[p+3]=Math.round(data[p+3]*(1-(br-200)/55))
  }
}

mkdirSync(DST_DIR, { recursive: true })
console.log('=== Chapter Sprite Grid (1400×1400, 280×280/cell) ===\n')

for (const { src, out } of SOURCES) {
  const sheet = PNG.sync.read(readFileSync(src))
  const { width: W, height: H } = sheet
  console.log(`${out}: source ${W}×${H}`)

  const outPng = new PNG({ width: OUT_SIZE, height: OUT_SIZE, filterType: -1 })
  outPng.data.fill(0)

  for (let row = 0; row < GRID_N; row++) {
    const { x0: rowY, w: rowH } = cellBound(H, GRID_N, row)
    for (let col = 0; col < GRID_N; col++) {
      const { x0: colX, w: colW } = cellBound(W, GRID_N, col)

      // 1. 把這格像素複製到臨時 buffer
      const cell = new PNG({ width: colW, height: rowH, filterType: -1 })
      for (let y = 0; y < rowH; y++) {
        for (let x = 0; x < colW; x++) {
          const si = ((rowY + y) * W + (colX + x)) * 4
          const di = (y * colW + x) * 4
          cell.data[di]   = sheet.data[si]
          cell.data[di+1] = sheet.data[si+1]
          cell.data[di+2] = sheet.data[si+2]
          cell.data[di+3] = sheet.data[si+3]
        }
      }

      // 2. 去背
      removeBg(cell.data, colW, rowH)

      // 3. 置中貼入 280×280（~15px 安全邊界）
      const offX = Math.floor((OUT_CELL - colW) / 2)
      const offY = Math.floor((OUT_CELL - rowH) / 2)
      const destX = col * OUT_CELL + offX
      const destY = row * OUT_CELL + offY

      for (let y = 0; y < rowH; y++) {
        for (let x = 0; x < colW; x++) {
          if (destY+y < 0 || destY+y >= OUT_SIZE) continue
          if (destX+x < 0 || destX+x >= OUT_SIZE) continue
          const si = (y * colW + x) * 4
          if (cell.data[si+3] < 10) continue  // 跳過透明像素
          const di = ((destY+y) * OUT_SIZE + (destX+x)) * 4
          outPng.data[di]   = cell.data[si]
          outPng.data[di+1] = cell.data[si+1]
          outPng.data[di+2] = cell.data[si+2]
          outPng.data[di+3] = cell.data[si+3]
        }
      }
    }
    process.stdout.write(`  row ${row} ✓\n`)
  }

  const dstPath = `${DST_DIR}/${out}.png`
  writeFileSync(dstPath, PNG.sync.write(outPng))
  console.log(`  → ${dstPath}\n`)
}

console.log('完成。data.ts 請使用 EC("CH1",0)..EC("CH3",4) 參照。')
