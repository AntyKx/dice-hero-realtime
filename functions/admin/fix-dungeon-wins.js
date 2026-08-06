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

      // 計算這個玩家當初被加了多少副本通關
      const dp = meta.dungeonProgress ?? {}
      let dungeonWins = 0
      for (const dungeon of Object.values(dp)) {
        dungeonWins += (dungeon.clearedDifficulties ?? (dungeon.cleared ? ['normal'] : [])).length
      }

      if (dungeonWins === 0) continue

      const heroProgress = meta.heroProgress ?? {}
      let changed = false
      const updatedProgress = {}

      for (const [heroId, prog] of Object.entries(heroProgress)) {
        const neverPlayed =
          prog.level === 1 &&
          (prog.exp ?? 0) === 0 &&
          Object.keys(prog.selectedTalents ?? {}).length === 0 &&
          (prog.runsWon ?? 0) === dungeonWins &&
          (prog.runsCompleted ?? 0) === dungeonWins

        if (neverPlayed) {
          updatedProgress[heroId] = { ...prog, runsWon: 0, runsCompleted: 0, stars: 0 }
          changed = true
          report.push({ uid: row.uid, heroId, action: 'reset' })
        } else {
          // 已有真實進度：保留，但重新算星等
          const newStars = Math.max(prog.stars ?? 0, checkStarConditions(prog))
          updatedProgress[heroId] = { ...prog, stars: newStars }
        }
      }

      if (changed) {
        meta.heroProgress = updatedProgress
        await env.DB.prepare('UPDATE saves SET meta = ? WHERE uid = ?')
          .bind(JSON.stringify(meta), row.uid)
          .run()
        updated++
      }
    } catch {
      // skip
    }
  }

  return new Response(
    JSON.stringify({ ok: true, updated, report }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } }
  )
}
