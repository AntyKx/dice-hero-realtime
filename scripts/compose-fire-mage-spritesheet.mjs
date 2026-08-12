/**
 * 一次性腳本：把火焰法師 Arena 逐幀圖（public/assets/frames/heroes/mage/s0/）
 * 裡挑 6 張，組成回合制系統（SpriteAnimator + BattleScreen/EquipmentScreen/
 * AdventureReadyScreen/DungeonSelectScreen/GmScreen 共用）需要的「單列 6 幀
 * 等寬高 sprite sheet」格式：idle_0/idle_1/attack_0/attack_1/skill_0/hurt_0。
 *
 * 執行：node scripts/compose-fire-mage-spritesheet.mjs
 *
 * SpriteAnimator 對整張 sheet 只認一組 frameWidth/frameHeight（見
 * src/components/SpriteAnimator.tsx），不像 Arena 那樣每幀各自獨立縮放，
 * 所以 6 張來源必須先各自置中裁切成同一個「格子」尺寸，不能直接把裁切
 * 尺寸差異很大的幀（例如 skill 的火焰漩渦特效幀）硬塞進來，不然角色在
 * 不同幀之間會忽大忽小。挑的 6 張刻意選了裁切後尺寸最接近的（沒有用
 * 火焰漩渦大特效那幾張），格子內腳底對齊置中，跟 anchor(0.5,1) 邏輯一致。
 *
 * 沒有專門畫「受擊 hurt」姿勢（原始 20 張只有 idle/move/attack/skill 四組），
 * 先借用一張 idle 幀頂著，之後有專門的受擊幀圖再換。
 *
 * 重要：BattleScreen.tsx 的英雄戰鬥圖顯示大小是
 *   heroSpriteScale = spriteScale * hero.sprite.frameHeight / activeHeroSprite.frameHeight
 * 化簡後「顯示高度 = spriteScale * hero.sprite.frameHeight」——只跟 hero.sprite
 * （0★ 基準，即 mage.png）的宣告高度有關，跟實際套用的星等 sprite
 * （mage_s0~s3）解析度無關，這是刻意設計成「不同星等圖源解析度不同，但
 * 畫面顯示大小要一致」。所以 mage.png 的 frameHeight 必須維持跟其他英雄
 * 同一量級（~170~190，例如 knight 是 178、priest 是 184），不能跟著新
 * 素材的實際裁切尺寸（900+ px）走，不然戰鬥畫面角色會大到爆版。
 * mage_s0~s3（星等圖）則不受這個限制，用原始解析度即可，畫質最好。
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const SRC_DIR = 'public/assets/frames/heroes/mage/s0'
const OUT_DIR = 'public/assets/spritesheets/heroes'

// 輸出格子：idle_0/idle_1/attack_0/attack_1/skill_0/hurt_0（跟舊版 mage.png
// 的幀語意一一對應），來源選裁切後尺寸最接近的 6 張，避免格子內縮放比例
// 不一致造成角色忽大忽小。
const FRAME_SOURCES = ['idle_0', 'idle_1', 'attack_0', 'attack_4', 'skill_2', 'idle_4']
// mage 0★ 跟 1~3★ 目前共用同一套新動畫（跟 Arena 的處理方式一致），
// 之後如果畫了星等專屬版本，把對應輸出檔名從這個清單移除即可。
const STAR_OUTPUT_NAMES = ['mage_s0', 'mage_s1', 'mage_s2', 'mage_s3']
const BASE_TARGET_HEIGHT = 184 // 跟其他英雄 hero.sprite 慣例同量級，見上方說明

const CELL_PADDING = 16

function loadPngs(names) {
  return names.map(name => PNG.sync.read(readFileSync(join(SRC_DIR, `${name}.png`))))
}

function composeSheet(frames) {
  const cellW = Math.max(...frames.map(f => f.width)) + CELL_PADDING * 2
  const cellH = Math.max(...frames.map(f => f.height)) + CELL_PADDING
  const sheet = new PNG({ width: cellW * frames.length, height: cellH })

  frames.forEach((frame, i) => {
    // 腳底置中對齊：水平置中、底部貼齊（跟 Arena 的 anchor(0.5,1) 邏輯一致），
    // 這樣不同幀之間角色腳底位置固定，切換時不會有上下跳動感。
    const dx = i * cellW + Math.round((cellW - frame.width) / 2)
    const dy = cellH - frame.height
    PNG.bitblt(frame, sheet, 0, 0, frame.width, frame.height, dx, dy)
  })
  return { sheet, cellW, cellH }
}

/** 最近鄰縮小（素材是乾淨線稿上色，不需要雙線性內插），保留 alpha。 */
function downscale(png, targetWidth, targetHeight) {
  const out = new PNG({ width: targetWidth, height: targetHeight })
  for (let y = 0; y < targetHeight; y++) {
    const sy = Math.min(png.height - 1, Math.floor(y * png.height / targetHeight))
    for (let x = 0; x < targetWidth; x++) {
      const sx = Math.min(png.width - 1, Math.floor(x * png.width / targetWidth))
      const sp = (sy * png.width + sx) * 4
      const dp = (y * targetWidth + x) * 4
      out.data[dp] = png.data[sp]; out.data[dp + 1] = png.data[sp + 1]
      out.data[dp + 2] = png.data[sp + 2]; out.data[dp + 3] = png.data[sp + 3]
    }
  }
  return out
}

mkdirSync(OUT_DIR, { recursive: true })

const frames = loadPngs(FRAME_SOURCES)
const { sheet, cellW, cellH } = composeSheet(frames)

for (const name of STAR_OUTPUT_NAMES) {
  writeFileSync(join(OUT_DIR, `${name}.png`), PNG.sync.write(sheet))
}

const baseCellW = Math.round(cellW * BASE_TARGET_HEIGHT / cellH)
const baseSheet = downscale(sheet, baseCellW * frames.length, BASE_TARGET_HEIGHT)
writeFileSync(join(OUT_DIR, 'mage.png'), PNG.sync.write(baseSheet))

console.log(`星等圖格子尺寸：${cellW}x${cellH}（data.ts 的 H('mage_sN', ${cellW}, ${cellH})）`)
console.log(`基準圖格子尺寸：${baseCellW}x${BASE_TARGET_HEIGHT}（data.ts 的 H('mage', ${baseCellW}, ${BASE_TARGET_HEIGHT})）`)
console.log(`輸出：mage.png, ${STAR_OUTPUT_NAMES.map(n => `${n}.png`).join(', ')} -> ${OUT_DIR}`)
