/**
 * Forest 01（forest_1_1「迷途的林間入口」）正式美術匯入腳本。
 *
 * 來源：public/assets/adventure/forest_1_1/source/ 的 5 張素材（見
 * ASTERVOW_Forest01_Claude_ArtPack 的 README）。
 * - Ground／Foreground 兩張整圖直接轉 WebP，不切。
 * - 三張 Sprite Sheet（營地/祭壇/精靈）用 alpha connected-components +
 *   bounding box 自動切成獨立貼圖，不假設等距 grid、不整張貼進遊戲。
 *
 * 保留原始像素與 Alpha，不做任何 AI 重繪／單一 sprite 拉伸。
 */
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

// 原始素材放在 public/ 之外（assets-source/），避免沒切過的大檔（單張 1~4MB）
// 被 vite 原封不動複製進 dist/ 一起部署到正式站——正式站只需要切好的 WebP。
const SRC_DIR = 'assets-source/forest_1_1'
const OUT_DIR = 'public/assets/adventure/forest_1_1'

const ALPHA_THRESHOLD = 12   // alpha > 12 視為不透明像素
const MIN_BLOB_AREA = 100    // 過濾掉反鋸齒殘留的極小雜點
const MERGE_GAP_PX = 0       // 兩個 blob 的 padded bbox 間距 <= 這個值就合併成同一個 sprite（同一物件常有分開的部件，例如旗桿跟帳篷本體）
const SAFE_PADDING = 6

mkdirSync(join(OUT_DIR, 'ground'), { recursive: true })
mkdirSync(join(OUT_DIR, 'foreground'), { recursive: true })
mkdirSync(join(OUT_DIR, 'props'), { recursive: true })
mkdirSync(join(OUT_DIR, 'interactive'), { recursive: true })
mkdirSync(join(OUT_DIR, 'entities'), { recursive: true })

async function convertWhole(srcName, outRelPath) {
  const src = join(SRC_DIR, srcName)
  const meta = await sharp(src).metadata()
  await sharp(src).webp({ quality: 92 }).toFile(join(OUT_DIR, outRelPath))
  console.log(`[whole] ${srcName} (${meta.width}x${meta.height}) -> ${outRelPath}`)
}

/** Chebyshev 風格的矩形間距：重疊時回傳 0，否則回傳兩矩形最短間距。 */
function rectGap(a, b) {
  const dx = Math.max(a.minX - b.maxX, b.minX - a.maxX, 0)
  const dy = Math.max(a.minY - b.maxY, b.minY - a.maxY, 0)
  return Math.max(dx, dy)
}

function findConnectedComponents(opaque, width, height) {
  const visited = new Uint8Array(width * height)
  const stackX = new Int32Array(width * height)
  const stackY = new Int32Array(width * height)
  const blobs = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (!opaque[idx] || visited[idx]) continue
      let sp = 0
      stackX[sp] = x; stackY[sp] = y; sp++
      visited[idx] = 1
      let minX = x, maxX = x, minY = y, maxY = y, area = 0
      while (sp > 0) {
        sp--
        const cx = stackX[sp], cy = stackY[sp]
        area++
        if (cx < minX) minX = cx
        if (cx > maxX) maxX = cx
        if (cy < minY) minY = cy
        if (cy > maxY) maxY = cy
        const nbrs = [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]
        for (const [nx, ny] of nbrs) {
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          const nidx = ny * width + nx
          if (!opaque[nidx] || visited[nidx]) continue
          visited[nidx] = 1
          stackX[sp] = nx; stackY[sp] = ny; sp++
        }
      }
      if (area >= MIN_BLOB_AREA) blobs.push({ minX, minY, maxX, maxY, area })
    }
  }
  return blobs
}

function mergeCloseBlobs(blobs) {
  let merged = true
  while (merged) {
    merged = false
    outer:
    for (let i = 0; i < blobs.length; i++) {
      for (let j = i + 1; j < blobs.length; j++) {
        if (rectGap(blobs[i], blobs[j]) <= MERGE_GAP_PX) {
          const a = blobs[i], b = blobs[j]
          blobs[i] = {
            minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY),
            maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY),
            area: a.area + b.area,
          }
          blobs.splice(j, 1)
          merged = true
          break outer
        }
      }
    }
  }
  return blobs
}

async function sliceSheet(srcName, outSubdir, namePrefix) {
  const src = join(SRC_DIR, srcName)
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info

  const opaque = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    opaque[i] = data[i * channels + 3] > ALPHA_THRESHOLD ? 1 : 0
  }

  let blobs = findConnectedComponents(opaque, width, height)
  blobs = mergeCloseBlobs(blobs)
  // 閱讀順序排序：先由上到下，同一列再由左到右，方便人工比對。
  blobs.sort((a, b) => (a.minY - b.minY) || (a.minX - b.minX))

  const manifest = []
  let i = 1
  for (const blob of blobs) {
    const left = Math.max(0, blob.minX - SAFE_PADDING)
    const top = Math.max(0, blob.minY - SAFE_PADDING)
    const right = Math.min(width, blob.maxX + 1 + SAFE_PADDING)
    const bottom = Math.min(height, blob.maxY + 1 + SAFE_PADDING)
    const w = right - left, h = bottom - top
    const outName = `${namePrefix}_${String(i).padStart(2, '0')}.webp`
    await sharp(src).extract({ left, top, width: w, height: h }).webp({ quality: 92 }).toFile(join(OUT_DIR, outSubdir, outName))
    manifest.push({ file: outName, x: left, y: top, width: w, height: h, area: blob.area })
    i++
  }
  writeFileSync(join(OUT_DIR, outSubdir, `_slice_manifest.json`), JSON.stringify(manifest, null, 2))
  console.log(`[slice] ${srcName} -> ${blobs.length} sprites in ${outSubdir}/`)
  return manifest
}

async function main() {
  await convertWhole('森林遺跡與瀑布秘境.png', 'ground/forest_1_1_ground.webp')
  await convertWhole('奇幻森林遺跡邊框.png', 'foreground/forest_1_1_foreground.webp')
  await sliceSheet('森林遺跡奇幻營地素材圖集.png', 'props', 'props')
  await sliceSheet('奇幻森林遺跡祭壇素材圖集.png', 'interactive', 'interactive')
  await sliceSheet('奇幻森林遺跡精靈素材表.png', 'entities', 'entities')
  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
