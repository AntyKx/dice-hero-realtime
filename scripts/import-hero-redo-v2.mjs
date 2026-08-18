/**
 * 英雄逐幀圖匯入 v2（2026-08-18 修正版）：修正 import-firemage-redo.mjs／
 * import-deathknight-redo.mjs／import-engineer-redo.mjs 三支腳本共同的問題
 * ——那三支都是「每一幀各自獨立裁切到自己的內容 bounding box」，但來源的
 * 20 張圖裡頭髮/披風/武器的擺動幅度差很多（例如死亡騎士 idle_1 的頭髮甩得
 * 比 idle_2 遠很多，實測 idle 6 幀的內容框高度從 166 到 216 都有），各自裁切
 * 會讓每一幀的裁切框大小不一樣；套用同一個 targetHeight 縮放時，裁切框比較
 * 高的那幀（頭髮佔比例多）反而會把「角色本體」壓縮得更小，動畫循環起來就是
 * 「忽大忽小」——這正是「動畫建議.txt」明確警告過的「不得因Frame尺寸不同
 * 造成腳底抖動、位置跳動或大小閃爍」。
 *
 * 修正做法：同一個「狀態」（idle/walk/attack/skill）內的幾張圖先各自算出
 * 內容 bounding box，取「聯集」（涵蓋這個狀態全部幀內容的最小矩形）當成這
 * 個狀態唯一的共用裁切框，同一狀態的幾張圖全部裁同一個框——狀態內的每一幀
 * 裁切後畫布大小完全相同、角色腳底在畫布裡的相對位置也完全相同，
 * anchor(0.5,1) 縮放出來的角色大小在同一個動作循環裡就不會再閃爍了。
 * （刻意只在「狀態內」統一，不是四個狀態全部共用同一個框——skill 的法術
 * 特效範圍比 idle 大非常多，硬要四狀態共用同一個框會把 idle/walk 平常最
 * 常看到的畫面因為要遷就 skill 特效而整體縮小一大截，划不來；狀態切換時
 * 大小有落差是可以接受的，同一個狀態內部持續閃爍才是真正的問題。實測腳底
 * 位置（bounding box 的 maxY）在全部 20 幀裡幾乎完全一致（誤差 1px 內），
 * 代表來源圖本來就有畫在同一條腳底線上，這裡的裁切只是把「頭頂還留了多少
 * 空間」的差異吸收掉。）
 *
 * 執行：node scripts/import-hero-redo-v2.mjs <heroKey>
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'fs'
import { join } from 'path'

const HEROES = {
  fire_mage: {
    srcDir: 'D:/CLAUDE專案/三選一/英雄圖/火焰法師/火焰法師/individual',
    srcPrefix: 'fire_mage',
    outDir: 'public/assets/frames/heroes/mage/s0',
  },
  death_knight: {
    srcDir: 'D:/CLAUDE專案/三選一/英雄圖/死亡騎士/死亡騎士/individual',
    srcPrefix: 'death_knight',
    outDir: 'public/assets/frames/heroes/death_knight/s0',
  },
  mechanic_engineer: {
    srcDir: 'D:/CLAUDE專案/三選一/英雄圖/機關技師/機關技師/individual',
    srcPrefix: 'mechanic_engineer',
    outDir: 'public/assets/frames/heroes/engineer/s0',
  },
}

const STAR_COPY_TARGETS = ['s1', 's2', 's3']
const PADDING = 4

const STATES = [
  { src: 'idle', out: 'idle', count: 6 },
  { src: 'move', out: 'walk', count: 6 },
  { src: 'attack', out: 'attack', count: 5 },
  { src: 'skill', out: 'skill', count: 3 },
]

function contentBounds(png) {
  const { width, height, data } = png
  let minX = width, minY = height, maxX = -1, maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY }
}

const heroKey = process.argv[2]
const hero = HEROES[heroKey]
if (!hero) {
  console.error(`未知英雄 key: ${heroKey}，可用：${Object.keys(HEROES).join(', ')}`)
  process.exit(1)
}

mkdirSync(hero.outDir, { recursive: true })

console.log(`[${heroKey}] 逐狀態計算共用裁切框（狀態內統一，狀態之間不強迫共用）...`)
for (const state of STATES) {
  const frames = []
  let uMinX = Infinity, uMinY = Infinity, uMaxX = -Infinity, uMaxY = -Infinity
  for (let i = 1; i <= state.count; i++) {
    const srcFile = join(hero.srcDir, `${hero.srcPrefix}_${state.src}_${String(i).padStart(2, '0')}.png`)
    const png = PNG.sync.read(readFileSync(srcFile))
    const b = contentBounds(png)
    if (!b) { console.warn(`  ! ${srcFile} 整張透明，略過`); continue }
    frames.push({ i, png })
    uMinX = Math.min(uMinX, b.minX)
    uMinY = Math.min(uMinY, b.minY)
    uMaxX = Math.max(uMaxX, b.maxX)
    uMaxY = Math.max(uMaxY, b.maxY)
  }
  const { width: canvasW, height: canvasH } = frames[0].png
  const cropMinX = Math.max(0, uMinX - PADDING)
  const cropMinY = Math.max(0, uMinY - PADDING)
  const cropMaxX = Math.min(canvasW - 1, uMaxX + PADDING)
  const cropMaxY = Math.min(canvasH - 1, uMaxY + PADDING)
  const cropW = cropMaxX - cropMinX + 1
  const cropH = cropMaxY - cropMinY + 1
  console.log(`[${state.src}] 共用裁切框：x=${cropMinX} y=${cropMinY} ${cropW}x${cropH}`)

  for (const { i, png } of frames) {
    const out = new PNG({ width: cropW, height: cropH })
    PNG.bitblt(png, out, cropMinX, cropMinY, cropW, cropH, 0, 0)
    const outFile = join(hero.outDir, `${state.out}_${i - 1}.png`)
    writeFileSync(outFile, PNG.sync.write(out))
    console.log(`  ✓ ${state.src}_${String(i).padStart(2, '0')} -> ${outFile}`)
  }
}

const manifest = {}
for (const state of STATES) manifest[state.out] = state.count
writeFileSync(join(hero.outDir, 'manifest.json'), JSON.stringify(manifest))
console.log('✓ manifest.json ->', manifest)

for (const star of STAR_COPY_TARGETS) {
  const dir = hero.outDir.replace('/s0', `/${star}`)
  mkdirSync(dir, { recursive: true })
  for (const f of readdirSync(hero.outDir)) copyFileSync(join(hero.outDir, f), join(dir, f))
  console.log(`同步複製到 ${dir}`)
}
