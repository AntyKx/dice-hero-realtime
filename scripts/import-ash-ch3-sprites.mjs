/**
 * import-ash-ch3-sprites.mjs
 * 灰燼王陵 5 隻怪物（王陵守墓人/鎖魂騎士/灰燼王族魂/禁咒祭司/殘王妃・艾莉西亞）
 * 每隻 5 張個別 PNG（綠幕背景）→ 6-frame strip 輸出
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync } from 'fs'

const SRC_DIR        = 'C:/Users/Anty/Desktop/圖檔/主線怪物/灰燼王城篇/灰燼王陵'
const DST_DIR        = 'public/assets/spritesheets/enemies'
const PAD_Y          = 22
const ALPHA_MIN      = 40
const MAX_HOLE       = 4000
const FRAME_MAP      = [0, 1, 2, 2, 3, 4]
const TARGET_FRAME_W = 300

const TARGETS = [
  { id: 'tomb_keeper',      name: '王陵守墓人' },
  { id: 'soul_knight',      name: '鎖魂騎士' },
  { id: 'royal_soul',       name: '灰燼王族魂' },
  { id: 'forbidden_priest', name: '禁咒祭司' },
  { id: 'elysia',           name: '殘王妃・艾莉西亞' },
]

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
    if(size[cid]>MAX_HOLE)continue
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

function getContentBounds(data, W, H) {
  let minX=W, maxX=0, minY=H, maxY=0
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    if (data[(y*W+x)*4+3] >= ALPHA_MIN) {
      if (x<minX) minX=x; if (x>maxX) maxX=x
      if (y<minY) minY=y; if (y>maxY) maxY=y
    }
  }
  return { minX, maxX, minY, maxY }
}

console.log('=== import-ash-ch3-sprites ===\n')

for (const { id, name } of TARGETS) {
  const frames = [1,2,3,4,5].map(n => `${SRC_DIR}/${name}-${n}.png`)

  const pngs = frames.map(p => {
    const png = PNG.sync.read(readFileSync(p))
    removeBg(png.data, png.width, png.height)
    return png
  })

  let globalMinX=Infinity, globalMaxX=0, globalMinY=Infinity, globalMaxY=0
  pngs.forEach(png => {
    const b = getContentBounds(png.data, png.width, png.height)
    if (b.minX < globalMinX) globalMinX = b.minX
    if (b.maxX > globalMaxX) globalMaxX = b.maxX
    if (b.minY < globalMinY) globalMinY = b.minY
    if (b.maxY > globalMaxY) globalMaxY = b.maxY
  })

  const srcContentW = globalMaxX - globalMinX + 1
  const srcCropY0   = Math.max(0, globalMinY - PAD_Y)
  const srcCropY1   = Math.min(pngs[0].height - 1, globalMaxY + PAD_Y)
  const srcCropH    = srcCropY1 - srcCropY0 + 1

  const scale  = TARGET_FRAME_W / srcContentW
  const frameW = TARGET_FRAME_W
  const frameH = Math.round(srcCropH * scale)

  const outCols = FRAME_MAP.length
  const outW    = frameW * outCols

  const out = new PNG({ width: outW, height: frameH, filterType: -1 })
  out.data.fill(0)

  for (let fi = 0; fi < outCols; fi++) {
    const srcIdx = FRAME_MAP[fi]
    const src    = pngs[srcIdx]
    const dstX0  = fi * frameW

    for (let dy = 0; dy < frameH; dy++) {
      const sy = srcCropY0 + Math.floor(dy / scale)
      if (sy < 0 || sy >= src.height) continue
      for (let dx = 0; dx < frameW; dx++) {
        const sx = globalMinX + Math.floor(dx / scale)
        if (sx >= src.width) continue
        const si = (sy * src.width + sx) * 4
        if (src.data[si+3] < ALPHA_MIN) continue
        const di = (dy * outW + dstX0 + dx) * 4
        out.data[di]   = src.data[si]
        out.data[di+1] = src.data[si+1]
        out.data[di+2] = src.data[si+2]
        out.data[di+3] = src.data[si+3]
      }
    }
  }

  const dst = `${DST_DIR}/${id}.png`
  writeFileSync(dst, PNG.sync.write(out))
  console.log(`${id} (${name})`)
  console.log(`  內容寬 ${srcContentW}px → scale=${scale.toFixed(3)} → ${frameW}×${frameH}`)
  console.log(`  sprite: E('${id}', ${frameW}, ${frameH})`)
  console.log(`  → ${dst}\n`)
}
