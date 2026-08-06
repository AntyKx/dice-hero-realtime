/**
 * 批次給所有玩家發放獎勵
 * 執行: node scripts/grant-rewards.mjs
 */
import { execSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB = 'DB'
const SQL_FILE = join(__dirname, '_grant_temp.sql')

function wranglerJson(sql) {
  const raw = execSync(
    `npx wrangler d1 execute ${DB} --remote --command ${JSON.stringify(sql)} --json`,
    { encoding: 'utf8' }
  )
  return JSON.parse(raw)
}

// 1. 讀取所有存檔（含 inventory 欄位，判斷是否為新格式）
console.log('📋 讀取所有玩家存檔...')
const result = wranglerJson('SELECT uid, meta, inventory FROM saves')
const rows = result[0]?.results ?? []
console.log(`  找到 ${rows.length} 名玩家`)

if (rows.length === 0) {
  console.log('沒有玩家資料，結束。')
  process.exit(0)
}

// 2. 處理每個玩家，生成 SQL UPDATE
const sqlLines = []

for (const row of rows) {
  const uid = row.uid

  if (!row.meta) {
    console.warn(`  ⚠ 跳過 ${uid}：meta 為空`)
    continue
  }

  let meta
  try {
    meta = JSON.parse(row.meta)
    if (!meta || typeof meta !== 'object') throw new Error()
  } catch {
    console.warn(`  ⚠ 跳過 ${uid}：meta 解析失敗`)
    continue
  }

  // +10000 星塵
  meta.stardust = (meta.stardust ?? 0) + 10000

  // 加寶箱
  if (!Array.isArray(meta.items)) meta.items = []
  const addItem = (id, count) => {
    const existing = meta.items.find(i => i.id === id)
    if (existing) existing.count += count
    else meta.items.push({ id, count })
  }
  addItem('chest_hero', 2)
  addItem('chest_legendary', 1)

  // 新格式：inventory 欄位有資料 → meta 是 slim（沒有 inventory/loadouts/lockedUids）
  // 不動 inventory 欄位，只更新 meta 欄位
  // 老格式：meta 可能包含完整 inventory → 同樣只更新 meta 欄位即可（inventory 欄維持 null）
  const newMeta = JSON.stringify(meta).replace(/'/g, "''")
  sqlLines.push(`UPDATE saves SET meta = '${newMeta}' WHERE uid = '${uid.replace(/'/g, "''")}';`)
}

// 3. 寫入 SQL 檔
console.log(`\n📝 生成 SQL 檔案（${sqlLines.length} 條 UPDATE）...`)
writeFileSync(SQL_FILE, sqlLines.join('\n'), 'utf8')

// 4. 執行 SQL 檔
console.log('🚀 執行中...')
try {
  const out = execSync(
    `npx wrangler d1 execute ${DB} --remote --file ${JSON.stringify(SQL_FILE)}`,
    { encoding: 'utf8' }
  )
  console.log(out)
} catch (e) {
  console.error('執行失敗：', e.message)
  process.exit(1)
} finally {
  try { unlinkSync(SQL_FILE) } catch {}
}

console.log(`\n✅ 完成！${sqlLines.length} 名玩家已獲得：`)
console.log('   ⭐ +10,000 星塵')
console.log('   🎁 英雄寶箱 ×2')
console.log('   👑 傳奇寶箱 ×1')
