/**
 * 英雄逐幀圖匯入 v2（2026-08-18 修正版，同日內第二次修正）：修正
 * import-firemage-redo.mjs／import-deathknight-redo.mjs／import-engineer-redo.mjs
 * 三支腳本共同的問題——那三支都是「每一幀各自獨立裁切到自己的內容
 * bounding box」，但來源的 20 張圖裡頭髮/披風/武器的擺動幅度差很多（例如
 * 死亡騎士 idle_1 的頭髮甩得比 idle_2 遠很多，實測 idle 6 幀的內容框高度從
 * 166 到 216 都有），各自裁切會讓每一幀的裁切框大小不一樣；套用同一個
 * targetHeight 縮放時，裁切框比較高的那幀（頭髮佔比例多）反而會把「角色
 * 本體」壓縮得更小，動畫循環起來就是「忽大忽小」——這正是「動畫建議.txt」
 * 明確警告過的「不得因Frame尺寸不同造成腳底抖動、位置跳動或大小閃爍」。
 *
 * 第一版修正（同日稍早）只在「同一個狀態」內取聯集，四個狀態各自獨立——
 * 這樣是修掉了「同一個動作循環內」的閃爍，但四個狀態的聯集框高度彼此差很
 * 多（死亡騎士 idle 聯集 h224、walk 聯集只有 h159，落差 41%），玩家一移動
 * 就是 idle/walk 兩個狀態頻繁切換，角色顯示大小跟著兩個不同的框高度跳動，
 * 看起來就是「移動時忽大忽小」——使用者實測回報過，而且明確要求要跟其他
 * 職業一樣穩定。
 *
 * 這一版改成「整個角色（全部 4 個狀態、20 張圖）共用同一個聯集裁切框」，
 * 不再分狀態——idle/walk/attack/skill 全部幀裁完之後畫布大小完全相同，
 * 不管在哪個狀態、哪一幀，角色顯示大小都是同一個縮放係數，不會再有任何
 * 「切換狀態時跳動」或「同一狀態內閃爍」的問題。代價是 idle/walk 的角色會
 * 因為要遷就 skill 法術特效的最大範圍而顯示得比之前小一些（法術特效通常
 * 比站立/走路的範圍大 2-3 倍），但「畫面小一點」比「角色一直忽大忽小」對
 * 玩家體感好得多，這是刻意接受的取捨。實測腳底位置（bounding box 的
 * maxY）在全部 20 幀裡幾乎完全一致（誤差 1px 內)，代表來源圖本來就畫在
 * 同一條腳底線上，這裡的裁切只是把「頭頂/法術特效還留了多少空間」的差異
 * 吸收掉，不會讓腳底位置跟著跑掉。
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

console.log(`[${heroKey}] 計算全角色（4 個狀態、20 張圖）共用裁切框...`)
const allFrames = []
let uMinX = Infinity, uMinY = Infinity, uMaxX = -Infinity, uMaxY = -Infinity
for (const state of STATES) {
  for (let i = 1; i <= state.count; i++) {
    const srcFile = join(hero.srcDir, `${hero.srcPrefix}_${state.src}_${String(i).padStart(2, '0')}.png`)
    const png = PNG.sync.read(readFileSync(srcFile))
    const b = contentBounds(png)
    if (!b) { console.warn(`  ! ${srcFile} 整張透明，略過`); continue }
    allFrames.push({ state, i, png })
    uMinX = Math.min(uMinX, b.minX)
    uMinY = Math.min(uMinY, b.minY)
    uMaxX = Math.max(uMaxX, b.maxX)
    uMaxY = Math.max(uMaxY, b.maxY)
  }
}
const { width: canvasW, height: canvasH } = allFrames[0].png
const cropMinX = Math.max(0, uMinX - PADDING)
const cropMinY = Math.max(0, uMinY - PADDING)
const cropMaxX = Math.min(canvasW - 1, uMaxX + PADDING)
const cropMaxY = Math.min(canvasH - 1, uMaxY + PADDING)
const cropW = cropMaxX - cropMinX + 1
const cropH = cropMaxY - cropMinY + 1
console.log(`共用裁切框：x=${cropMinX} y=${cropMinY} ${cropW}x${cropH}（原始畫布 ${canvasW}x${canvasH}）`)

for (const { state, i, png } of allFrames) {
  const out = new PNG({ width: cropW, height: cropH })
  PNG.bitblt(png, out, cropMinX, cropMinY, cropW, cropH, 0, 0)
  const outFile = join(hero.outDir, `${state.out}_${i - 1}.png`)
  writeFileSync(outFile, PNG.sync.write(out))
  console.log(`  ✓ ${state.src}_${String(i).padStart(2, '0')} -> ${outFile}`)
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
