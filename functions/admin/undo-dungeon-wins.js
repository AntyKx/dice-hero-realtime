const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const ADMIN_SECRET = 'DiceHeroAdmin!2026June'

function checkStarConditions(p) {
  if (p.runsWon >= 10 && p.level >= 60) return 3
  if (p.runsWon >= 5) return 2
  if (p.runsWon >= 1) return 1
  return 0
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS })
}

export async function onRequestPost({ request, env }) {
  let secret
  try { secret = (await request.json()).secret } catch {
    return new Response('Bad request', { status: 400, headers: CORS })
  }
  if (secret !== ADMIN_SECRET) {
    return new Response('Unauthorized', { status: 401, headers: CORS })
  }

  const { results } = await env.DB.prepare('SELECT uid, meta FROM saves').all()

  let updated = 0
  const report = []

  for (const row of results) {
    try {
      const meta = row.meta ? JSON.parse(row.meta) : {}

      const dp = meta.dungeonProgress ?? {}
      let dungeonWins = 0
      for (const dungeon of Object.values(dp)) {
        dungeonWins += (dungeon.clearedDifficulties ?? (dungeon.cleared ? ['normal'] : [])).length
      }

      if (dungeonWins === 0) continue

      const heroProgress = meta.heroProgress ?? {}
      const updatedProgress = {}

      for (const [heroId, prog] of Object.entries(heroProgress)) {
        const newRunsWon      = Math.max(0, (prog.runsWon      ?? 0) - dungeonWins)
        const newRunsCompleted = Math.max(0, (prog.runsCompleted ?? 0) - dungeonWins)
        const patched = { ...prog, runsWon: newRunsWon, runsCompleted: newRunsCompleted }
        const newStars = Math.max(0, checkStarConditions(patched))
        updatedProgress[heroId] = { ...patched, stars: newStars }
        if (newRunsWon !== (prog.runsWon ?? 0)) {
          report.push({ uid: row.uid, heroId, before: prog.runsWon ?? 0, after: newRunsWon })
        }
      }

      meta.heroProgress = updatedProgress
      await env.DB.prepare('UPDATE saves SET meta = ? WHERE uid = ?')
        .bind(JSON.stringify(meta), row.uid)
        .run()
      updated++
    } catch {
      // skip
    }
  }

  return new Response(
    JSON.stringify({ ok: true, updated, report }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } }
  )
}
