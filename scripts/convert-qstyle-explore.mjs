import sharp from 'sharp'
import fs from 'fs'

const SRC_DIR = 'C:/Users/Anty/AppData/Local/Temp/fmz_qstyle/森林遺跡_Q版戰鬥場景_5張'
const DST_DIR = 'D:/CLAUDE專案/三選一/骰子英雄-即時制/public/assets/campaign/explore'

const files = [
  ['1-1_森林入口_Q版戰鬥背景.png', 'forest_1_1.jpg'],
  ['1-2_荊棘之地_Q版戰鬥背景.png', 'forest_1_2.jpg'],
  ['1-3_哥布林營地_Q版戰鬥背景.png', 'forest_1_3.jpg'],
  ['1-4_薩滿祭壇_Q版戰鬥背景.png', 'forest_1_4.jpg'],
  ['1-5_狂暴獸人隊長_Q版Boss戰背景.png', 'forest_1_5.jpg'],
]

for (const [srcName, dstName] of files) {
  const srcPath = `${SRC_DIR}/${srcName}`
  const dstPath = `${DST_DIR}/${dstName}`
  if (!fs.existsSync(srcPath)) {
    console.log('MISSING', srcPath)
    continue
  }
  const img = sharp(srcPath)
  const meta = await img.metadata()
  await img.jpeg({ quality: 88 }).toFile(dstPath)

  const stripH = 20
  const { data, info } = await sharp(srcPath)
    .extract({ left: 0, top: meta.height - stripH, width: meta.width, height: stripH })
    .raw()
    .toBuffer({ resolveWithObject: true })
  let r = 0, g = 0, b = 0
  const n = info.width * info.height
  for (let i = 0; i < n; i++) {
    r += data[i * info.channels]
    g += data[i * info.channels + 1]
    b += data[i * info.channels + 2]
  }
  r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n)
  const hex = '0x' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
  console.log(dstName, meta.width, meta.height, 'bottomColor=', hex)
}
