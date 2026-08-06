/**
 * 從原始 PNG 重建 CH1/CH2/CH3：去背 + 偵測真實列/欄邊界 + 重排到 1300×1300
 *
 * 關鍵改進：X 方向不用理論邊界，而是掃描每一列的透明欄間隙，
 * 讓每個 frame 的真實右邊界被完整捕捉，不會被理論邊界截斷。
 *
 * 執行：node scripts/fix-sheets.mjs
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const TARGET  = 280   // 每格 280px（INNER=276，容納最大 ~276px 內容無需縮放）
const COLS    = 5
const ROWS    = 5
const MARGIN  = 2
const INNER   = TARGET - MARGIN * 2   // 276

// ── 去背（同 remove-bg.mjs）──────────────────────────────────────────────
const CLUSTER_DIST = 22, BG_TOLERANCE = 32, SAMPLE_RADIUS = 6

function clusterColors(samples) {
  const clusters = []
  for (const [r, g, b] of samples) {
    let best = null, bestD = Infinity
    for (const c of clusters) {
      const d = Math.sqrt((r-c.r)**2+(g-c.g)**2+(b-c.b)**2)
      if (d < bestD) { bestD = d; best = c }
    }
    if (best && bestD <= CLUSTER_DIST) {
      const n = best.n
      best.r=(best.r*n+r)/(n+1); best.g=(best.g*n+g)/(n+1); best.b=(best.b*n+b)/(n+1); best.n=n+1
    } else clusters.push({ r, g, b, n: 1 })
  }
  return clusters.filter(c => c.r>150 && c.g>150 && c.b>150)
}

function detectBgColors(data, width, height) {
  const positions = []
  for (let dy=0;dy<SAMPLE_RADIUS;dy++) for (let dx=0;dx<SAMPLE_RADIUS;dx++)
    positions.push([dx,dy],[width-1-dx,dy],[dx,height-1-dy],[width-1-dx,height-1-dy])
  const mx=(width/2)|0, my=(height/2)|0
  for (let d=-SAMPLE_RADIUS;d<=SAMPLE_RADIUS;d++) positions.push([mx+d,0],[mx+d,height-1],[0,my+d],[width-1,my+d])

  const edgeSamples=[]
  for (const [x,y] of positions) {
    if (x<0||x>=width||y<0||y>=height) continue
    const p=(y*width+x)*4; if(data[p+3]<128) continue
    const r=data[p],g=data[p+1],b=data[p+2]
    if (r>150&&g>150&&b>150) edgeSamples.push([r,g,b])
  }
  const fromEdge=clusterColors(edgeSamples)
  if (fromEdge.length>0) return fromEdge

  const counts=new Map()
  for (let i=0;i<width*height;i++) {
    const p=i*4; if(data[p+3]<200) continue
    const r=data[p],g=data[p+1],b=data[p+2]
    if (r<150||g<150||b<150||Math.abs(r-g)>25||Math.abs(g-b)>25) continue
    const key=((r>>3)<<14)|((g>>3)<<7)|(b>>3)
    counts.set(key,(counts.get(key)||0)+1)
  }
  if (!counts.size) return [{r:255,g:255,b:255}]
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>({
    r:((k>>14)&0x7F)*8+4, g:((k>>7)&0x7F)*8+4, b:(k&0x7F)*8+4
  }))
}

function bgDist(r,g,b,bg) { return Math.min(...bg.map(c=>Math.sqrt((r-c.r)**2+(g-c.g)**2+(b-c.b)**2))) }

function removeBg(data, w, h) {
  const total=w*h, bg=detectBgColors(data,w,h)
  console.log(`    背景色: ${bg.map(c=>`rgb(${c.r|0},${c.g|0},${c.b|0})`).join(' + ')}`)
  const oR=new Uint8Array(total),oG=new Uint8Array(total),oB=new Uint8Array(total)
  for(let i=0;i<total;i++){oR[i]=data[i*4];oG[i]=data[i*4+1];oB[i]=data[i*4+2]}

  for(let i=0;i<total;i++){
    if(data[i*4+3]===0) continue
    if(bgDist(data[i*4],data[i*4+1],data[i*4+2],bg)<=BG_TOLERANCE) data[i*4+3]=0
  }
  // 門檻：跳過 > 950px 的大洞（翅膀/手臂下背景），保留 < 950px 的細節（眼睛、甲板等）
  const MAX_HOLE=950
  const tV=new Uint8Array(total),tQ=[]
  const sT=(i)=>{if(!tV[i]&&data[i*4+3]===0){tV[i]=1;tQ.push(i)}}
  for(let x=0;x<w;x++){sT(x);sT((h-1)*w+x)}
  for(let y=1;y<h-1;y++){sT(y*w);sT(y*w+w-1)}
  for(let i=0;i<tQ.length;i++){
    const idx=tQ[i],x=idx%w,y=(idx/w)|0
    for(const n of[y>0?idx-w:-1,y<h-1?idx+w:-1,x>0?idx-1:-1,x<w-1?idx+1:-1])
      if(n>=0&&!tV[n]&&data[n*4+3]===0){tV[n]=1;tQ.push(n)}
  }
  // 連通元件分析：只還原小面積封閉洞（細節），大面積（翅膀/手臂下方背景）保持透明
  const cL=new Int32Array(total).fill(-1); const cS=[]
  for(let i=0;i<total;i++){
    if(data[i*4+3]!==0||tV[i]||cL[i]!==-1) continue
    const cid=cS.length; cS.push(0); const q=[i]; cL[i]=cid; let qi=0
    while(qi<q.length){
      const idx=q[qi++]; cS[cid]++; const x=idx%w,y=(idx/w)|0
      for(const n of[y>0?idx-w:-1,y<h-1?idx+w:-1,x>0?idx-1:-1,x<w-1?idx+1:-1])
        if(n>=0&&cL[n]===-1&&data[n*4+3]===0&&!tV[n]){cL[n]=cid;q.push(n)}
    }
  }
  for(let i=0;i<total;i++){
    const cid=cL[i]; if(cid===-1) continue
    if(cS[cid]<=MAX_HOLE){data[i*4]=oR[i];data[i*4+1]=oG[i];data[i*4+2]=oB[i];data[i*4+3]=255}
  }
  for(let i=0;i<total;i++){
    const p=i*4; if(data[p+3]===0) continue
    const x=i%w,y=(i/w)|0
    const nb=(y>0&&data[(i-w)*4+3]===0)||(y<h-1&&data[(i+w)*4+3]===0)||
             (x>0&&data[(i-1)*4+3]===0)||(x<w-1&&data[(i+1)*4+3]===0)
    if(!nb) continue
    const r=data[p],g=data[p+1],b=data[p+2]
    if(bgDist(r,g,b,bg)<=BG_TOLERANCE*1.5) data[p+3]=0
    else if(r>195&&g>195&&b>195){const br=(r+g+b)/3;if(br>218)data[p+3]=Math.round(data[p+3]*(1-(br-218)/37))}
  }
}

// ── 工具 ─────────────────────────────────────────────────────────────────
function getContentBBox(data, imgW, x0, y0, x1, y1) {
  let minX=x1,maxX=x0-1,minY=y1,maxY=y0-1
  for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++) if(data[(y*imgW+x)*4+3]>0){
    if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y
  }
  return minX>maxX?null:{minX,maxX,minY,maxY}
}

function placeContent(srcData, srcW, srcBB, dstData, dstW, dstCellX, dstCellY) {
  if(!srcBB) return
  const cw=srcBB.maxX-srcBB.minX+1, ch=srcBB.maxY-srcBB.minY+1
  const scale=Math.min(1, INNER/cw, INNER/ch)
  const drawW=Math.round(cw*scale), drawH=Math.round(ch*scale)
  const dx0=dstCellX+MARGIN+Math.floor((INNER-drawW)/2)
  const dy0=dstCellY+MARGIN+Math.floor((INNER-drawH)/2)
  if(scale===1){
    for(let dy=0;dy<ch;dy++) for(let dx=0;dx<cw;dx++){
      const sp=((srcBB.minY+dy)*srcW+(srcBB.minX+dx))*4
      const dp=((dy0+dy)*dstW+(dx0+dx))*4
      dstData[dp]=srcData[sp];dstData[dp+1]=srcData[sp+1];dstData[dp+2]=srcData[sp+2];dstData[dp+3]=srcData[sp+3]
    }
  } else {
    for(let dy=0;dy<drawH;dy++) for(let dx=0;dx<drawW;dx++){
      const fx=srcBB.minX+dx/scale, fy=srcBB.minY+dy/scale
      const sx0=Math.floor(fx),sy0=Math.floor(fy),fxf=fx-sx0,fyf=fy-sy0
      const sx1=Math.min(sx0+1,srcW-1),sy1=Math.min(sy0+1,srcW-1)
      const p00=(sy0*srcW+sx0)*4,p10=(sy0*srcW+sx1)*4,p01=(sy1*srcW+sx0)*4,p11=(sy1*srcW+sx1)*4
      const dp=((dy0+dy)*dstW+(dx0+dx))*4
      for(let c=0;c<4;c++) dstData[dp+c]=Math.round(
        srcData[p00+c]*(1-fxf)*(1-fyf)+srcData[p10+c]*fxf*(1-fyf)+
        srcData[p01+c]*(1-fxf)*fyf+srcData[p11+c]*fxf*fyf)
    }
  }
}

/**
 * 在 y=[y0,y1] 範圍內掃描 X 方向透明欄間隙，找出 targetCols 個 frame 的邊界。
 * 逐步提高合併門檻（minGap 2→80）直到恰好有 targetCols 段；失敗回傳 null。
 */
function findColRanges(data, imgW, y0, y1, targetCols) {
  const hasContent = new Uint8Array(imgW)
  for(let x=0;x<imgW;x++)
    for(let y=y0;y<y1;y++) if(data[(y*imgW+x)*4+3]>0){hasContent[x]=1;break}

  function extractSegs(){
    const segs=[]; let s=null
    for(let x=0;x<=imgW;x++){
      if(x<imgW&&hasContent[x]&&s===null) s=x
      if((x===imgW||!hasContent[x])&&s!==null){if(x-s>=3)segs.push({x0:s,x1:x-1});s=null}
    }
    return segs
  }
  function merge(segs, gap){
    if(!segs.length) return segs
    const r=[{...segs[0]}]
    for(let i=1;i<segs.length;i++){
      if(segs[i].x0-r[r.length-1].x1-1<=gap) r[r.length-1].x1=segs[i].x1
      else r.push({...segs[i]})
    }
    return r
  }

  const segs=extractSegs()
  if(segs.length===targetCols) return segs
  for(let gap=2;gap<=100;gap+=2){
    const m=merge(segs,gap)
    if(m.length===targetCols) return m
    if(m.length<targetCols) break
  }
  return null
}

// ── 主流程 ────────────────────────────────────────────────────────────────
function rebuildFromOriginal(id) {
  const srcPath=`C:\\Users\\Anty\\Desktop\\圖檔\\${id}.png`
  const outPath=`public/assets/spritesheets/enemies/${id}.png`
  if(!existsSync(srcPath)){console.log(`  找不到 ${srcPath}`);return}

  const src=PNG.sync.read(readFileSync(srcPath))
  const {data:sd,width:sw,height:sh}=src
  console.log(`  原始: ${sw}×${sh}`)
  removeBg(sd,sw,sh)

  // Y 方向：掃描全寬透明行段 → 取得每列的 [y0,y1]
  const fullGaps=[], yGapStart={}
  let gy=null
  for(let y=0;y<sh;y++){
    let all=true
    for(let x=0;x<sw;x++) if(sd[(y*sw+x)*4+3]>0){all=false;break}
    if(all&&gy===null) gy=y
    if(!all&&gy!==null){fullGaps.push({start:gy,end:y-1});gy=null}
  }
  if(gy!==null) fullGaps.push({start:gy,end:sh-1})
  const rowGaps=fullGaps.filter(g=>g.end-g.start+1>=5)
  console.log(`  列間隙: ${rowGaps.map(g=>`[${g.start}-${g.end}]`).join(' ')}`)

  const rowRanges=[]
  let rPrev=0
  for(const g of rowGaps){if(g.start>rPrev)rowRanges.push({y0:rPrev,y1:g.start});rPrev=g.end+1}
  if(rPrev<sh) rowRanges.push({y0:rPrev,y1:sh})
  const contentRows=rowRanges.filter(r=>r.y1-r.y0>10).slice(0,ROWS)
  console.log(`  列範圍: ${contentRows.map(r=>`[${r.y0}-${r.y1}]`).join(' ')}`)

  const outW=TARGET*COLS, outH=TARGET*ROWS
  const dst=new PNG({width:outW,height:outH}); dst.data.fill(0)

  for(let row=0;row<Math.min(ROWS,contentRows.length);row++){
    const {y0,y1}=contentRows[row]
    const centerY=Math.floor((y0+y1)/2)

    // X 方向：先掃全高，失敗時逐步縮小 Y 切片到中心尋找欄間隙
    let colSegs=findColRanges(sd,sw,y0,y1,COLS)
    let method='gap-full'
    if(!colSegs){
      for(const half of[40,25,15,8]){
        const sy0=Math.max(y0,centerY-half), sy1=Math.min(y1,centerY+half)
        colSegs=findColRanges(sd,sw,sy0,sy1,COLS)
        if(colSegs){method=`gap-slice${half*2}`;break}
      }
    }
    if(!colSegs) method='fallback'
    process.stdout.write(`  r${row}[${method}]:`)

    for(let col=0;col<COLS;col++){
      let x0,x1
      if(colSegs){
        // 用偵測到的欄邊界，但向外擴 4px 確保不遺漏邊緣抗鋸齒
        x0=Math.max(0,colSegs[col].x0-4)
        x1=Math.min(sw,colSegs[col].x1+5)
      } else {
        // fallback：理論邊界 ±20px
        const cw=sw/COLS
        x0=Math.max(0,Math.floor(col*cw)-20)
        x1=Math.min(sw,Math.ceil((col+1)*cw)+20)
      }
      const bb=getContentBBox(sd,sw,x0,y0,x1,y1)
      placeContent(sd,sw,bb,dst.data,outW,col*TARGET,row*TARGET)
      if(bb) process.stdout.write(` c${col}:${bb.maxX-bb.minX+1}x${bb.maxY-bb.minY+1}`)
    }
    console.log()
  }
  writeFileSync(outPath,PNG.sync.write(dst))
  console.log(`  ✓ ${id}.png 完成 (${outW}×${outH})\n`)
}

for(const id of['CH1','CH2','CH3']){
  console.log(`\n=== ${id} ===`)
  rebuildFromOriginal(id)
}
console.log('全部完成！')
