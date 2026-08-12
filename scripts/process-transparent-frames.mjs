/**
 * 通用版：處理「已經去背完成、each frame 各自一張獨立檔案、命名已經照
 * {prefix}_{state}_{01,02,...} 慣例」的素材（第三種來源格式，繼
 * process-hero-frames.mjs 的「20張未裁切+不透明漸層背景」、
 * slice-grid-hero.mjs 的「2張已透明網格 sheet」之後）。不用 BFS 去背
 * （本來就透明，跑了只會破壞邊緣），也不用切格（本來就是分開的檔案），
 * 只需要裁切內容框（去掉每張圖周圍的大量留白）。
 *
 * 執行：node scripts/process-transparent-frames.mjs <heroKey>
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'fs'
import { join } from 'path'

const HEROES = {
  priest: {
    srcDir: 'D:/CLAUDE專案/三選一/英雄圖/祭司/神聖祭司_20動作_完整素材/individual',
    srcPrefix: 'holy_priest',
    outDir: 'public/assets/frames/heroes/priest/s0',
    states: [
      { src: 'idle', out: 'idle', count: 6 },
      { src: 'move', out: 'walk', count: 6 },
      { src: 'attack', out: 'attack', count: 5 },
      { src: 'skill', out: 'skill', count: 3 },
    ],
    // attack 幾幀有飄動的羽毛裝飾，跟角色本體距離不一（量過缺口 5~12px 是
    // 貼在角色/法杖旁的光點，38~75px 是飄遠的裝飾羽毛），飄遠的那些會讓
    // 裁切框大小忽大忽小（跟之前火焰法師踩過的坑同一類，見 pipeline 備忘），
    // 15px 抓在兩者中間，保留貼身光點、丟掉飄遠的雜點。
    proximityMergeRadius: 15,
  },
  rogue: {
    srcDir: 'D:/CLAUDE專案/三選一/英雄圖/暗影刺客/individual',
    srcPrefix: 'shadow_assassin',
    outDir: 'public/assets/frames/heroes/rogue/s0',
    states: [
      { src: 'idle', out: 'idle', count: 6 },
      { src: 'move', out: 'walk', count: 6 },
      { src: 'attack', out: 'attack', count: 5 },
      { src: 'skill', out: 'skill', count: 3 },
    ],
    // attack_4 有一顆飄遠的暗影碎片（缺口 66px），其餘裝飾（暗霧/刀光殘影）
    // 貼身在 5~20px 內，22px 抓在中間，保留貼身效果、丟掉飄遠的雜點。
    proximityMergeRadius: 22,
  },
  princess: {
    srcDir: 'D:/CLAUDE專案/三選一/英雄圖/皇家公主/individual',
    srcPrefix: 'frost_queen',
    outDir: 'public/assets/frames/heroes/princess/s0',
    states: [
      { src: 'idle', out: 'idle', count: 6 },
      { src: 'move', out: 'walk', count: 6 },
      { src: 'attack', out: 'attack', count: 5 },
      { src: 'skill', out: 'skill', count: 3 },
    ],
    // 攻擊/走路幾幀有飄雪/冰晶碎片，貼身效果量到最遠 27px，飄遠的雪花從
    // 43px 起跳，35px 抓在中間。
    proximityMergeRadius: 35,
  },
  archer: {
    srcDir: 'D:/CLAUDE專案/三選一/英雄圖/遊俠/individual',
    srcPrefix: 'forest_ranger',
    outDir: 'public/assets/frames/heroes/archer/s0',
    states: [
      { src: 'idle', out: 'idle', count: 6 },
      { src: 'move', out: 'walk', count: 6 },
      { src: 'attack', out: 'attack', count: 5 },
      { src: 'skill', out: 'skill', count: 3 },
    ],
    // 攻擊/走路幾幀有飄落的葉片，包括掉在地上明顯脫離角色本體的單片葉子
    // （量到 27~28px），跟真正貼身的效果（5px）差很多，20px 抓在中間，
    // 兩者都會被丟掉，只留真正貼身的裝飾。
    proximityMergeRadius: 20,
  },
  dwarf: {
    srcDir: 'D:/CLAUDE專案/三選一/英雄圖/矮人戰士/individual',
    srcPrefix: 'mine_dwarf_warrior',
    outDir: 'public/assets/frames/heroes/dwarf/s0',
    states: [
      { src: 'idle', out: 'idle', count: 6 },
      { src: 'move', out: 'walk', count: 6 },
      { src: 'attack', out: 'attack', count: 5 },
      { src: 'skill', out: 'skill', count: 3 },
    ],
    // 攻擊/走路幾幀有大範圍的落石/塵爆特效（土屬性主題），這些是真的攻擊
    // 特效不是雜訊，大部分碎塊彼此距離都在 10px 內連成一片；只有少數幾顆
    // 單獨飛遠的落石距離破百，50px 抓在中間，把爆炸特效整體留住，只丟掉
    // 真正飛遠脫離的孤立碎片。
    proximityMergeRadius: 50,
  },
  bard: {
    srcDir: 'D:/CLAUDE專案/三選一/英雄圖/吟遊詩人/individual',
    srcPrefix: 'water_bard',
    outDir: 'public/assets/frames/heroes/bard/s0',
    states: [
      { src: 'idle', out: 'idle', count: 6 },
      { src: 'move', out: 'walk', count: 6 },
      { src: 'attack', out: 'attack', count: 5 },
      { src: 'skill', out: 'skill', count: 3 },
    ],
  },
  fighter: {
    // 2026-08-12：使用者換了第二批武鬥家素材（新的來源資料夾同一個路徑，
    // 檔名前綴從 flame_brawler 換成 fighter，畫布尺寸也從 900x650 變
    // 850x600），取代前一批。
    srcDir: 'D:/CLAUDE專案/三選一/英雄圖/武鬥家/individual',
    srcPrefix: 'fighter',
    outDir: 'public/assets/frames/heroes/fighter/s0',
    states: [
      { src: 'idle', out: 'idle', count: 6 },
      { src: 'move', out: 'walk', count: 6 },
      { src: 'attack', out: 'attack', count: 5 },
      { src: 'skill', out: 'skill', count: 3 },
    ],
  },
  death_knight: {
    // 2026-08-12：死亡騎士取代訓獸師的新素材。bottom-gap 一致性檢查抓到兩幀
    // 異常：attack_0 有揮擊軌跡碎塊（距主體13~19px）、walk_4 有疑似邁步時
    // 大腿/披風下擺被細頸切斷的碎塊（距主體7~8px，尺寸不小），20px 抓在
    // 兩者之間，兩幀都能重新連回主體。
    srcDir: 'D:/CLAUDE專案/三選一/英雄圖/死亡騎士/individual',
    srcPrefix: 'death_knight',
    outDir: 'public/assets/frames/heroes/death_knight/s0',
    states: [
      { src: 'idle', out: 'idle', count: 6 },
      { src: 'move', out: 'walk', count: 6 },
      { src: 'attack', out: 'attack', count: 5 },
      { src: 'skill', out: 'skill', count: 3 },
    ],
    proximityMergeRadius: 20,
  },
}

const STAR_COPY_TARGETS = ['s1', 's2', 's3']
const TRIM_PADDING = 2

/**
 * 見 process-hero-frames.mjs 同名函式的完整說明：只從「原始不透明遮罩上
 * 找出的角色本體」往外膨脹 radius px 判斷連通，不能從全部不透明像素出發
 * （那樣會被密集的小碎塊連環搭橋connect到很遠的雜訊）。
 */
function pruneDisconnectedByProximity(data, width, height, radius) {
  const total = width * height
  const opaque = new Uint8Array(total)
  for (let idx = 0; idx < total; idx++) opaque[idx] = data[idx * 4 + 3] !== 0 ? 1 : 0

  const rawLabel = new Int32Array(total).fill(-1)
  const rawSizes = []
  for (let start = 0; start < total; start++) {
    if (!opaque[start] || rawLabel[start] !== -1) continue
    const cid = rawSizes.length
    rawSizes.push(0)
    const queue = [start]
    rawLabel[start] = cid
    let qi = 0
    while (qi < queue.length) {
      const idx = queue[qi++]
      rawSizes[cid]++
      const x = idx % width, y = (idx / width) | 0
      const cands = []
      if (x > 0) cands.push(idx - 1)
      if (x < width - 1) cands.push(idx + 1)
      if (y > 0) cands.push(idx - width)
      if (y < height - 1) cands.push(idx + width)
      for (const n of cands) { if (opaque[n] && rawLabel[n] === -1) { rawLabel[n] = cid; queue.push(n) } }
    }
  }
  let mainCid = -1, mainSize = -1
  for (let cid = 0; cid < rawSizes.length; cid++) {
    if (rawSizes[cid] > mainSize) { mainSize = rawSizes[cid]; mainCid = cid }
  }

  const reachable = new Uint8Array(total)
  let frontier = []
  for (let idx = 0; idx < total; idx++) { if (rawLabel[idx] === mainCid) { reachable[idx] = 1; frontier.push(idx) } }
  for (let step = 0; step < radius && frontier.length > 0; step++) {
    const next = []
    for (const idx of frontier) {
      const x = idx % width, y = (idx / width) | 0
      const cands = []
      if (x > 0) cands.push(idx - 1)
      if (x < width - 1) cands.push(idx + 1)
      if (y > 0) cands.push(idx - width)
      if (y < height - 1) cands.push(idx + width)
      for (const n of cands) { if (!reachable[n]) { reachable[n] = 1; next.push(n) } }
    }
    frontier = next
  }

  for (let idx = 0; idx < total; idx++) {
    if (opaque[idx] && !reachable[idx]) data[idx * 4 + 3] = 0
  }
}

function trimToContent(png, padding) {
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
  if (maxX < 0) return png
  minX = Math.max(0, minX - padding)
  minY = Math.max(0, minY - padding)
  maxX = Math.min(width - 1, maxX + padding)
  maxY = Math.min(height - 1, maxY + padding)
  const newW = maxX - minX + 1
  const newH = maxY - minY + 1
  const out = new PNG({ width: newW, height: newH })
  PNG.bitblt(png, out, minX, minY, newW, newH, 0, 0)
  return out
}

const heroKey = process.argv[2]
const hero = HEROES[heroKey]
if (!hero) {
  console.error(`未知英雄 key: ${heroKey}，可用：${Object.keys(HEROES).join(', ')}`)
  process.exit(1)
}

mkdirSync(hero.outDir, { recursive: true })
console.log(`開始處理 ${heroKey}（已透明、各自獨立檔案）...\n`)

const manifest = {}
for (const state of hero.states) {
  console.log(`[${state.src} -> ${state.out}]`)
  manifest[state.out] = state.count
  for (let i = 1; i <= state.count; i++) {
    const srcFile = join(hero.srcDir, `${hero.srcPrefix}_${state.src}_${String(i).padStart(2, '0')}.png`)
    const outFile = join(hero.outDir, `${state.out}_${i - 1}.png`)
    const png = PNG.sync.read(readFileSync(srcFile))
    if (hero.proximityMergeRadius > 0) pruneDisconnectedByProximity(png.data, png.width, png.height, hero.proximityMergeRadius)
    const trimmed = trimToContent(png, TRIM_PADDING)
    writeFileSync(outFile, PNG.sync.write(trimmed))
    console.log(`  ✓ ${srcFile.split('/').pop()} -> ${outFile}  (${trimmed.width}x${trimmed.height})`)
  }
}

writeFileSync(join(hero.outDir, 'manifest.json'), JSON.stringify(manifest))
console.log(`✓ manifest.json ->`, manifest)

for (const star of STAR_COPY_TARGETS) {
  const dir = hero.outDir.replace('/s0', `/${star}`)
  mkdirSync(dir, { recursive: true })
  for (const f of readdirSync(hero.outDir)) copyFileSync(join(hero.outDir, f), join(dir, f))
  console.log(`同步複製到 ${dir}`)
}

console.log('\n完成！')
