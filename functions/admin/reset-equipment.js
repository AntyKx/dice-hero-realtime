const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const ADMIN_SECRET = 'DiceHeroAdmin!2026June'

export async function onRequestOptions() {
  return new Response(null, { headers: CORS })
}

/**
 * 裝備系統重整（2026-08）：即時制要換成跟回合制完全分開的獨立裝備結構
 * （通用裝備 + 職業武器，沒有骰子詞綴），舊的 inventory 欄位（回合制跟
 * 即時制過去共用同一份）格式不相容，所以連同回合制的裝備一起清空重來。
 *
 * 先把每個帳號現有的 inventory 備份進 equipment_backup_2026 表（保留完整
 * JSON + 備份時間，可以照 uid 復原），再把 saves.inventory 清成 NULL。
 * meta/run/player_name 完全不動，只動 inventory 這一欄。
 */
export async function onRequestPost({ request, env }) {
  let secret
  try { secret = (await request.json()).secret } catch {
    return new Response('Bad request', { status: 400, headers: CORS })
  }
  if (secret !== ADMIN_SECRET) {
    return new Response('Unauthorized', { status: 401, headers: CORS })
  }

  await env.DB.exec(
    'CREATE TABLE IF NOT EXISTS equipment_backup_2026 (uid TEXT PRIMARY KEY, inventory TEXT, backed_up_at TEXT)'
  )

  const { results } = await env.DB.prepare(
    'SELECT uid, inventory FROM saves WHERE inventory IS NOT NULL'
  ).all()

  let backedUp = 0
  let cleared = 0
  const report = []

  for (const row of results) {
    try {
      await env.DB.prepare(`
        INSERT INTO equipment_backup_2026 (uid, inventory, backed_up_at)
        VALUES (?, ?, ?)
        ON CONFLICT(uid) DO UPDATE SET inventory = excluded.inventory, backed_up_at = excluded.backed_up_at
      `).bind(row.uid, row.inventory, new Date().toISOString()).run()
      backedUp++

      await env.DB.prepare('UPDATE saves SET inventory = NULL WHERE uid = ?').bind(row.uid).run()
      cleared++
      report.push({ uid: row.uid })
    } catch (e) {
      report.push({ uid: row.uid, error: String(e) })
    }
  }

  return new Response(
    JSON.stringify({ ok: true, totalRowsWithInventory: results.length, backedUp, cleared, report }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } }
  )
}
