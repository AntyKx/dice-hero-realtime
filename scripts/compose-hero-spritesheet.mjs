/**
 * 通用版：把 Arena 逐幀圖（public/assets/frames/heroes/{heroId}/s0/）裡挑 6 張，
 * 組成回合制系統（SpriteAnimator + BattleScreen/EquipmentScreen/
 * AdventureReadyScreen/DungeonSelectScreen/GmScreen 共用）需要的「單列 6 幀
 * 等寬高 sprite sheet」格式：idle_0/idle_1/attack_0/attack_1/skill_0/hurt_0。
 * 從 compose-fire-mage-spritesheet.mjs 抽出來的可重用版本。
 *
 * 執行：node scripts/compose-hero-spritesheet.mjs <heroKey>
 * 例如：node scripts/compose-hero-spritesheet.mjs knight
 *
 * 6 張來源要挑「裁切後尺寸最接近的」，不要混進差異很大的（例如 skill 的
 * 特效大爆發幀），不然角色在不同幀之間會忽大忽小——SpriteAnimator 對整張
 * sheet 只認一組 frameWidth/frameHeight，不像 Arena 那樣每幀各自獨立縮放。
 *
 * 重要：BattleScreen.tsx 的英雄戰鬥圖顯示大小是
 *   heroSpriteScale = spriteScale * hero.sprite.frameHeight / activeHeroSprite.frameHeight
 * 化簡後「顯示高度 = spriteScale * hero.sprite.frameHeight」——只跟 hero.sprite
 * （0★ 基準，即 {heroId}.png）的宣告高度有關，跟實際套用的星等 sprite
 * （{heroId}_s0~s3）解析度無關，這是刻意設計成「不同星等圖源解析度不同，但
 * 畫面顯示大小要一致」。所以 {heroId}.png 的 frameHeight 必須維持跟其他英雄
 * 同一量級（~170~190），不能跟著新素材的實際裁切尺寸（700+ px）走，不然
 * 戰鬥畫面角色會大到爆版（火焰法師上線時踩過這個坑）。
 * {heroId}_s0~s3（星等圖）則不受這個限制，用原始解析度即可，畫質最好。
 */

import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const HEROES = {
  fire_mage: {
    heroId: 'mage',
    frameSources: ['idle_0', 'idle_1', 'attack_0', 'attack_4', 'skill_2', 'idle_4'],
  },
  knight: {
    heroId: 'knight',
    frameSources: ['idle_0', 'idle_1', 'attack_0', 'attack_4', 'skill_0', 'idle_2'],
  },
  priest: {
    heroId: 'priest',
    frameSources: ['idle_0', 'idle_1', 'attack_0', 'attack_4', 'skill_2', 'idle_2'],
  },
  rogue: {
    heroId: 'rogue',
    frameSources: ['idle_0', 'idle_1', 'attack_0', 'attack_4', 'skill_2', 'idle_2'],
  },
  princess: {
    heroId: 'princess',
    frameSources: ['idle_0', 'idle_1', 'attack_0', 'attack_4', 'skill_2', 'idle_2'],
  },
  archer: {
    heroId: 'archer',
    frameSources: ['idle_0', 'idle_1', 'attack_0', 'attack_4', 'skill_2', 'idle_2'],
  },
  dwarf: {
    heroId: 'dwarf',
    // attack_0（198高）比其他幀矮一截，縮放後角色明顯變小，改用尺寸更接近
    // idle 的 attack_1/attack_4。
    frameSources: ['idle_0', 'idle_1', 'attack_1', 'attack_4', 'skill_2', 'idle_2'],
  },
  bard: {
    heroId: 'bard',
    frameSources: ['idle_0', 'idle_1', 'attack_0', 'attack_4', 'skill_2', 'idle_2'],
  },
  fighter: {
    heroId: 'fighter',
    // 2026-08-12 換第二批素材，尺寸/裁切框跟第一批完全不同，重新挑最接近
    // idle 高度（~164-168）的攻擊幀：attack_0(176)/attack_2(184)。
    frameSources: ['idle_0', 'idle_1', 'attack_0', 'attack_2', 'skill_2', 'idle_2'],
  },
  death_knight: {
    heroId: 'death_knight',
    // 2026-08-12 修正：原本 skill_2(450x263) 比 idle(~230x155) 大快兩倍，
    // 導致共用格子被撐到 482x279，idle 實際只填滿格高的 59%——這個 sheet
    // 在英雄裝備畫面固定顯示 idle 姿勢（SpriteAnimator state="idle"），從沒
    // 用到 skill 那格，卻讓角色顯示比其他英雄明顯小一圈。三個 skill 幀全部
    // 都跟 idle 差太多（263~332 高），沒有一個夠接近，改成 skill/hurt 兩格
    // 都用尺寸相近的 idle/attack 幀頂替，格子縮到 291x184，idle 填滿 95%。
    frameSources: ['idle_0', 'idle_1', 'attack_0', 'attack_4', 'idle_2', 'idle_3'],
  },
  engineer: {
    heroId: 'engineer',
    // 2026-08-18 新增：機關技師 20 格逐幀圖裡 skill_0/skill_1（260/255 高）
    // 明顯比 idle（~208-212 高）高很多，skill_2（206 高）最接近；沒有真的
    // hurt 幀，跟 death_knight 一樣用尺寸相近的 idle 幀頂替。
    frameSources: ['idle_0', 'idle_1', 'attack_0', 'attack_4', 'skill_2', 'idle_2'],
  },
}

const OUT_DIR = 'public/assets/spritesheets/heroes'
const BASE_TARGET_HEIGHT = 184 // 跟其他英雄 hero.sprite 慣例同量級，見上方說明
const CELL_PADDING = 16

function loadPngs(srcDir, names) {
  return names.map(name => PNG.sync.read(readFileSync(join(srcDir, `${name}.png`))))
}

function composeSheet(frames) {
  const cellW = Math.max(...frames.map(f => f.width)) + CELL_PADDING * 2
  const cellH = Math.max(...frames.map(f => f.height)) + CELL_PADDING
  const sheet = new PNG({ width: cellW * frames.length, height: cellH })
  frames.forEach((frame, i) => {
    // 腳底置中對齊：水平置中、底部貼齊（跟 Arena 的 anchor(0.5,1) 邏輯一致）。
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

const heroKey = process.argv[2]
const hero = HEROES[heroKey]
if (!hero) {
  console.error(`未知英雄 key: ${heroKey}，可用：${Object.keys(HEROES).join(', ')}`)
  process.exit(1)
}

const srcDir = `public/assets/frames/heroes/${hero.heroId}/s0`
mkdirSync(OUT_DIR, { recursive: true })

const frames = loadPngs(srcDir, hero.frameSources)
const { sheet, cellW, cellH } = composeSheet(frames)

const starNames = ['s0', 's1', 's2', 's3'].map(s => `${hero.heroId}_${s}`)
for (const name of starNames) {
  writeFileSync(join(OUT_DIR, `${name}.png`), PNG.sync.write(sheet))
}

const baseCellW = Math.round(cellW * BASE_TARGET_HEIGHT / cellH)
const baseSheet = downscale(sheet, baseCellW * frames.length, BASE_TARGET_HEIGHT)
writeFileSync(join(OUT_DIR, `${hero.heroId}.png`), PNG.sync.write(baseSheet))

console.log(`星等圖格子尺寸：${cellW}x${cellH}（data.ts 的 H('${hero.heroId}_sN', ${cellW}, ${cellH})）`)
console.log(`基準圖格子尺寸：${baseCellW}x${BASE_TARGET_HEIGHT}（data.ts 的 H('${hero.heroId}', ${baseCellW}, ${BASE_TARGET_HEIGHT})）`)
console.log(`輸出：${hero.heroId}.png, ${starNames.map(n => `${n}.png`).join(', ')} -> ${OUT_DIR}`)
