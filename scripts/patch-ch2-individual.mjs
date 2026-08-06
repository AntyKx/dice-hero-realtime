/**
 * patch-ch2-individual.mjs
 * 用個別 frame 圖替換 CH2.png 中指定怪物的整排
 * deep_lancer  → CH2 row 1 (y: 280~559)
 * heavy_drowned → CH2 row 2 (y: 560~839)
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync } from 'fs'

const OUT_CELL = 280
const OUT_SIZE = OUT_CELL * 5   // 1400
const CH2_PATH = 'public/assets/spritesheets/enemies/CH2.png'

function isGreen(r, g, b) {
  return g > 100 && g > r * 1.8 && g > b * 1.8
}

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

// 去背後找角色內容邊界
function getContentBounds(data, W, H) {
  let minX=W, maxX=0, minY=H, maxY=0
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    if (data[(y*W+x)*4+3] >= 20) {
      if (x<minX) minX=x; if (x>maxX) maxX=x
      if (y<minY) minY=y; if (y>maxY) maxY=y
    }
  }
  return { minX, maxX, minY, maxY }
}

// 替換 CH2.png 中某一 row 的所有格
function patchRow(ch2, rowIdx, framePaths) {
  const rowY = rowIdx * OUT_CELL
  // 先清除該 row
  for (let y = rowY; y < rowY + OUT_CELL; y++)
    for (let x = 0; x < OUT_SIZE; x++)
      ch2.data[(y * OUT_SIZE + x) * 4 + 3] = 0

  const SAFE = 240  // 角色內容最大尺寸（在 280 格中留 20px 邊界）

  for (let col = 0; col < 5; col++) {
    const src = PNG.sync.read(readFileSync(framePaths[col]))
    const { width: W, height: H } = src
    removeBg(src.data, W, H)

    // 找角色內容邊界
    const { minX, maxX, minY, maxY } = getContentBounds(src.data, W, H)
    if (minX > maxX || minY > maxY) {
      console.log(`  col ${col}: ${framePaths[col].split('/').pop()} → 空白，跳過`)
      continue
    }

    const cW = maxX - minX + 1
    const cH = maxY - minY + 1

    // 縮放至 SAFE 內（等比例，只在超出時縮）
    const scale = Math.min(1, SAFE / Math.max(cW, cH))
    const dW = Math.round(cW * scale)
    const dH = Math.round(cH * scale)

    // 置中於 280×280
    const offX = Math.floor((OUT_CELL - dW) / 2)
    const offY = Math.floor((OUT_CELL - dH) / 2)
    const destBaseX = col * OUT_CELL + offX
    const destBaseY = rowY + offY

    for (let dy = 0; dy < dH; dy++) {
      for (let dx = 0; dx < dW; dx++) {
        const sx = minX + Math.floor(dx / scale)
        const sy = minY + Math.floor(dy / scale)
        if (sx >= W || sy >= H) continue
        const si = (sy * W + sx) * 4
        if (src.data[si+3] < 10) continue
        const tdx = destBaseX + dx
        const tdy = destBaseY + dy
        if (tdx < 0 || tdx >= OUT_SIZE || tdy < 0 || tdy >= OUT_SIZE) continue
        const di = (tdy * OUT_SIZE + tdx) * 4
        ch2.data[di]   = src.data[si]
        ch2.data[di+1] = src.data[si+1]
        ch2.data[di+2] = src.data[si+2]
        ch2.data[di+3] = src.data[si+3]
      }
    }
    console.log(`  col ${col}: ${framePaths[col].split('/').pop()} 內容${cW}×${cH} scale=${scale.toFixed(3)} → ${dW}×${dH} at (${destBaseX},${destBaseY})`)
  }
}

const BASE = 'C:/Users/Anty/Desktop/圖檔/主線怪物/深海遺城篇'

const ch2 = PNG.sync.read(readFileSync(CH2_PATH))
console.log(`載入 CH2.png ${ch2.width}×${ch2.height}\n`)

console.log('── deep_lancer (row 1) ──')
patchRow(ch2, 1, [
  `${BASE}/深海槍兵/深海槍兵1.png`,
  `${BASE}/深海槍兵/深海槍兵2.png`,
  `${BASE}/深海槍兵/深海槍兵3.png`,
  `${BASE}/深海槍兵/深海槍兵4.png`,
  `${BASE}/深海槍兵/深海槍兵5.png`,
])

console.log('\n── heavy_drowned (row 2) ──')
patchRow(ch2, 2, [
  `${BASE}/重甲溺兵/重甲溺兵1.png`,
  `${BASE}/重甲溺兵/重甲溺兵2.png`,
  `${BASE}/重甲溺兵/重甲溺兵3.png`,
  `${BASE}/重甲溺兵/重甲溺兵4.png`,
  `${BASE}/重甲溺兵/重甲溺兵5.png`,
])

writeFileSync(CH2_PATH, PNG.sync.write(ch2))
console.log('\n✓ CH2.png 已更新')
