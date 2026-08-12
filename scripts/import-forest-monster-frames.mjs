/**
 * import-forest-monster-frames.mjs
 * 把森林遺跡怪物逐幀圖（已經去背，同一隻怪物 20 幀共用同一個畫布尺寸+錨點
 * 像素，見 D:\CLAUDE專案\三選一\怪物圖\森林篇\圖片檔\{id}\info\sprite-info.json）
 * 匯入成 frameLoader.ts 要吃的格式：
 *   public/assets/frames/enemies/{monsterId}/{idle|walk|attack|skill|hit|death}_{0-based}.png
 * 並產生 manifest.json（見 frameLoader.ts 開頭關於 Cloudflare edge cache 的
 * 說明，一定要有 manifest 才能繞開對舊幀 URL 的長天期快取）。
 *
 * 跟 process-hero-frames.mjs 不同：來源圖已經是乾淨透明背景、20 幀共用同一個
 * 畫布尺寸+錨點，不需要任何去背/裁切運算，純粹複製改名即可，所以這支腳本
 * 不依賴 pngjs。
 *
 * 用法：node scripts/import-forest-monster-frames.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'

const SRC_ROOT = 'D:/CLAUDE專案/三選一/怪物圖/森林篇/圖片檔'
const OUT_ROOT = 'public/assets/frames/enemies'

// sprite-info.json 的狀態名 → 引擎 AnimState 名稱（見 frameLoader.ts 的 AnimState）
const STATE_MAP = { idle: 'idle', move: 'walk', attack: 'attack', skill: 'skill', hurt: 'hit', death: 'death' }

const anchorSummary = []

for (const dirName of readdirSync(SRC_ROOT)) {
  const monsterDir = join(SRC_ROOT, dirName)
  const infoPath = join(monsterDir, 'info', 'sprite-info.json')
  if (!existsSync(infoPath)) { console.log(`[跳過] ${dirName}：找不到 sprite-info.json`); continue }

  const info = JSON.parse(readFileSync(infoPath, 'utf8'))
  const id = info.monsterId
  const srcIndividualDir = join(monsterDir, 'individual')
  const outDir = join(OUT_ROOT, id)
  mkdirSync(outDir, { recursive: true })

  console.log(`\n[${id}] (${info.monsterName})`)
  const manifest = {}

  for (const [srcState, group] of Object.entries(info.animationGroups)) {
    const dstState = STATE_MAP[srcState]
    if (!dstState) { console.warn(`  ! 未知狀態名 ${srcState}，跳過`); continue }
    const count = group.frames.length
    for (let i = 0; i < count; i++) {
      const frameNum = String(i + 1).padStart(2, '0')
      const srcFile = join(srcIndividualDir, `${id}_${srcState}_${frameNum}.png`)
      const dstFile = join(outDir, `${dstState}_${i}.png`)
      if (!existsSync(srcFile)) { console.warn(`  ! 缺檔：${srcFile}`); continue }
      copyFileSync(srcFile, dstFile)
    }
    manifest[dstState] = count
    console.log(`  ${srcState} -> ${dstState} x${count}`)
  }

  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest))
  console.log(`  ✓ manifest.json`, manifest)

  // 錨點：sprite-info.json 有兩種寫法（1-10 用 pixelX/pixelY，11-12 直接用 x/y
  // 當像素值），統一取像素座標後換算成 0~1 比例，供 enemies.ts 的
  // anchorRatio 使用（見 ArenaGame.ts spawnEnemyOfType 的 anchor.set 調整）。
  const px = info.anchor.pixelX ?? info.anchor.x
  const py = info.anchor.pixelY ?? info.anchor.y
  const ax = Math.round((px / info.cellWidth) * 1000) / 1000
  const ay = Math.round((py / info.cellHeight) * 1000) / 1000
  anchorSummary.push({ id, ax, ay })
}

console.log('\n=== enemies.ts anchorRatio 參考（依此手動填入） ===')
for (const { id, ax, ay } of anchorSummary) {
  console.log(`  ${id}: { x: ${ax}, y: ${ay} },`)
}
console.log('\n完成！')
