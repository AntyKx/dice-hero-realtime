const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const ADMIN_SECRET = 'DiceHeroAdmin!2026June'

const GRANTS = {
  stardust: 10000,
  items: [
    { id: 'chest_legendary', count: 2 },
    { id: 'chest_hero',      count: 1 },
  ],
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS })
}

export async function onRequestPost({ request, env }) {
  let secret
  try {
    const body = await request.json()
    secret = body.secret
  } catch {
    return new Response('Bad request', { status: 400, headers: CORS })
  }

  if (secret !== ADMIN_SECRET) {
    return new Response('Unauthorized', { status: 401, headers: CORS })
  }

  const { results } = await env.DB.prepare('SELECT uid, meta FROM saves').all()

  let updated = 0
  let skipped = 0

  for (const row of results) {
    try {
      const meta = row.meta ? JSON.parse(row.meta) : {}

      // 星塵
      meta.stardust = (meta.stardust ?? 0) + GRANTS.stardust

      // 寶箱
      const items = Array.isArray(meta.items) ? meta.items : []
      for (const grant of GRANTS.items) {
        const existing = items.find(i => i.id === grant.id)
        if (existing) {
          existing.count += grant.count
        } else {
          items.push({ id: grant.id, count: grant.count })
        }
      }
      meta.items = items

      await env.DB.prepare('UPDATE saves SET meta = ? WHERE uid = ?')
        .bind(JSON.stringify(meta), row.uid)
        .run()

      updated++
    } catch {
      skipped++
    }
  }

  return new Response(
    JSON.stringify({ ok: true, total: results.length, updated, skipped }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } }
  )
}
