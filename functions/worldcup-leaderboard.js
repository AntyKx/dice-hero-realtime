const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS })
}

// GET /worldcup-leaderboard
// 掃描所有雲端存檔的 meta.worldCup，彙整出每位玩家的競猜勝負統計
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare('SELECT player_name, meta FROM saves WHERE player_name IS NOT NULL').all()

  const rows = []
  for (const row of results) {
    if (!row.meta) continue
    let meta
    try { meta = JSON.parse(row.meta) } catch { continue }
    const wc = meta.worldCup
    if (!wc || !Array.isArray(wc.picks) || wc.picks.length === 0) continue

    const resolved = wc.picks.filter(p => p.resolved)
    const wins = resolved.filter(p => p.won).length
    const losses = resolved.length - wins

    rows.push({
      playerName: row.player_name,
      wins,
      losses,
      pending: wc.picks.length - resolved.length,
      successCount: wc.successCount ?? 0,
    })
  }

  rows.sort((a, b) => b.wins - a.wins || a.losses - b.losses || b.successCount - a.successCount)

  return new Response(JSON.stringify(rows.slice(0, 100)), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
