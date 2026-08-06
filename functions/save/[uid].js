const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS })
}

export async function onRequestGet({ params, env }) {
  const row = await env.DB.prepare(
    'SELECT meta, inventory, run, updated_at, player_name FROM saves WHERE uid = ?'
  ).bind(params.uid).first()

  if (!row) {
    return new Response(JSON.stringify(null), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // 新格式：inventory 欄位有資料 → 合併回完整 meta 再回傳（client 無感）
  if (row.inventory) {
    try {
      const slimMeta  = row.meta      ? JSON.parse(row.meta)      : {}
      const invData   = row.inventory ? JSON.parse(row.inventory)  : {}
      const fullMeta  = JSON.stringify({ ...slimMeta, ...invData })
      return new Response(JSON.stringify({ meta: fullMeta, run: row.run, updated_at: row.updated_at, player_name: row.player_name ?? null }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    } catch {
      // fallthrough to old format if parse fails
    }
  }

  // 舊格式 fallback：直接回傳原本的 meta
  return new Response(JSON.stringify({ meta: row.meta, run: row.run, updated_at: row.updated_at, player_name: row.player_name ?? null }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

export async function onRequestPut({ params, request, env }) {
  const { meta, run, player_name } = await request.json()

  let slimMeta     = meta
  let inventoryJson = null

  if (meta) {
    try {
      const parsed = JSON.parse(meta)
      const { inventory, loadouts, lockedUids, ...rest } = parsed
      slimMeta      = JSON.stringify(rest)
      inventoryJson = JSON.stringify({ inventory: inventory ?? [], loadouts: loadouts ?? {}, lockedUids: lockedUids ?? [] })
    } catch {
      // parse 失敗就整包存進 meta，不拆
    }
  }

  const safeName = player_name ? String(player_name).trim().slice(0, 16) || null : null

  await env.DB.prepare(`
    INSERT INTO saves (uid, meta, inventory, run, updated_at, player_name)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(uid) DO UPDATE SET
      meta        = excluded.meta,
      inventory   = excluded.inventory,
      run         = excluded.run,
      updated_at  = excluded.updated_at,
      player_name = COALESCE(excluded.player_name, player_name)
  `).bind(params.uid, slimMeta ?? null, inventoryJson ?? null, run ?? null, new Date().toISOString(), safeName).run()

  return new Response('ok', { headers: CORS })
}
