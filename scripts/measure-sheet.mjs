import { PNG } from 'pngjs'
import { readFileSync } from 'fs'

for (const file of ['CH1', 'CH2', 'CH3']) {
  const png = PNG.sync.read(readFileSync(`public/assets/spritesheets/enemies/${file}.png`))
  const { data: d, width: w, height: h } = png
  console.log(`\n${file}.png  ${w} x ${h}`)
  console.log(`  理論格寬: ${w}/5 = ${(w/5).toFixed(2)}   格高: ${h}/5 = ${(h/5).toFixed(2)}`)

  // 掃中央橫線 (y = h/2) 找「全透明欄」(每格之間若有間隔)
  const midY = (h / 2) | 0
  const transparentCols = []
  for (let x = 0; x < w; x++) {
    const p = (midY * w + x) * 4
    if (d[p + 3] === 0) transparentCols.push(x)
  }
  // 找連續透明區段
  const gaps = []
  let start = null
  for (let i = 0; i < transparentCols.length; i++) {
    if (start === null) start = transparentCols[i]
    if (transparentCols[i + 1] !== transparentCols[i] + 1) {
      gaps.push({ start, end: transparentCols[i], width: transparentCols[i] - start + 1 })
      start = null
    }
  }
  const bigGaps = gaps.filter(g => g.width > 5)
  console.log(`  y=${midY} 大透明區段(>5px): `, bigGaps.length > 0 ? bigGaps.map(g => `[${g.start}-${g.end}](${g.width}px)`).join('  ') : '無（可能角色佔滿）')

  // 掃中央直線 (x = w/2) 找「全透明行」
  const midX = (w / 2) | 0
  const transparentRows = []
  for (let y = 0; y < h; y++) {
    const p = (y * w + midX) * 4
    if (d[p + 3] === 0) transparentRows.push(y)
  }
  const rowGaps = []
  let rStart = null
  for (let i = 0; i < transparentRows.length; i++) {
    if (rStart === null) rStart = transparentRows[i]
    if (transparentRows[i + 1] !== transparentRows[i] + 1) {
      rowGaps.push({ start: rStart, end: transparentRows[i], width: transparentRows[i] - rStart + 1 })
      rStart = null
    }
  }
  const bigRowGaps = rowGaps.filter(g => g.width > 5)
  console.log(`  x=${midX} 大透明區段(>5px): `, bigRowGaps.length > 0 ? bigRowGaps.map(g => `[${g.start}-${g.end}](${g.width}px)`).join('  ') : '無')

  // 掃每一行找「整行都透明」
  const fullTransparentRows = []
  for (let y = 0; y < h; y++) {
    let allTransparent = true
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 0) { allTransparent = false; break }
    }
    if (allTransparent) fullTransparentRows.push(y)
  }
  // 找連續全透明行段
  const fullRowGaps = []
  let frStart = null
  for (let i = 0; i < fullTransparentRows.length; i++) {
    if (frStart === null) frStart = fullTransparentRows[i]
    if (fullTransparentRows[i + 1] !== fullTransparentRows[i] + 1) {
      fullRowGaps.push({ start: frStart, end: fullTransparentRows[i] })
      frStart = null
    }
  }
  const bigFullRowGaps = fullRowGaps.filter(g => g.end - g.start + 1 > 3)
  console.log(`  全透明橫列區段(>3px):`, bigFullRowGaps.length > 0 ? bigFullRowGaps.map(g => `[${g.start}-${g.end}](${g.end-g.start+1}px)`).join('  ') : '無')
}
