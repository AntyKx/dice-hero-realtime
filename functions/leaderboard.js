const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS })
}

// GET /leaderboard?dungeonId=&heroClass=&seasonId=&limit=50
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const dungeonId = url.searchParams.get('dungeonId')
  const heroClass = url.searchParams.get('heroClass') || null
  const seasonId  = url.searchParams.get('seasonId')  || ''   // '' = history
  const limit     = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')))

  if (!dungeonId) {
    return new Response(JSON.stringify({ error: 'dungeonId required' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  let stmt
  if (heroClass) {
    stmt = env.DB.prepare(
      'SELECT * FROM leaderboard WHERE dungeon_id = ? AND hero_class = ? AND season_id = ? ORDER BY score DESC, total_turns ASC LIMIT ?'
    ).bind(dungeonId, heroClass, seasonId, limit)
  } else {
    stmt = env.DB.prepare(
      'SELECT * FROM leaderboard WHERE dungeon_id = ? AND season_id = ? ORDER BY score DESC, total_turns ASC LIMIT ?'
    ).bind(dungeonId, seasonId, limit)
  }

  const { results } = await stmt.all()
  const records = results.map(row => ({
    id:                 `${row.player_id}_${row.dungeon_id}_${row.hero_class}_${row.season_id}`,
    playerId:           row.player_id,
    playerName:         row.player_name,
    dungeonId:          row.dungeon_id,
    heroClass:          row.hero_class,
    score:              row.score,
    rankGrade:          row.rank_grade,
    totalTurns:         row.total_turns,
    remainingHpPercent: row.remaining_hp_pct,
    seasonId:           row.season_id || null,
    difficulty:         row.difficulty,
    clearTime:          row.clear_time,
    clearSuccess:       true,
    isValidForRanking:  true,
    dungeonName:        '',
  }))

  return new Response(JSON.stringify(records), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// POST /leaderboard
export async function onRequestPost({ request, env }) {
  let body
  try { body = await request.json() } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const {
    playerId, playerName, dungeonId, heroClass,
    score, rankGrade, totalTurns, remainingHpPercent,
    seasonId, difficulty, clearTime,
  } = body

  // Basic validation
  if (!playerId || !dungeonId || !heroClass || !playerName || score == null || !totalTurns || !clearTime) {
    return new Response(JSON.stringify({ error: 'missing required fields' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
  if (typeof score !== 'number' || score < 0 || score > 20000) {
    return new Response(JSON.stringify({ error: 'invalid score' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
  if (typeof totalTurns !== 'number' || totalTurns < 1 || totalTurns > 999) {
    return new Response(JSON.stringify({ error: 'invalid turns' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const now        = new Date().toISOString()
  const safeName   = String(playerName).trim().slice(0, 16) || '勇者'
  const safeSeasonId = String(seasonId ?? '')
  const safeDiff   = String(difficulty ?? 'legendary')
  const hpPct      = typeof remainingHpPercent === 'number' ? remainingHpPercent : 0

  const upsertSql = `
    INSERT INTO leaderboard
      (player_id, dungeon_id, hero_class, season_id, player_name, score, rank_grade, total_turns, remaining_hp_pct, difficulty, clear_time, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(player_id, dungeon_id, hero_class, season_id) DO UPDATE SET
      player_name     = excluded.player_name,
      score           = MAX(score, excluded.score),
      rank_grade      = CASE WHEN excluded.score >= score THEN excluded.rank_grade      ELSE rank_grade      END,
      total_turns     = CASE WHEN excluded.score >= score THEN excluded.total_turns     ELSE total_turns     END,
      remaining_hp_pct= CASE WHEN excluded.score >= score THEN excluded.remaining_hp_pct ELSE remaining_hp_pct END,
      clear_time      = CASE WHEN excluded.score >= score THEN excluded.clear_time      ELSE clear_time      END,
      updated_at      = excluded.updated_at
  `

  const roundedScore = Math.round(score)

  // Weekly row
  await env.DB.prepare(upsertSql).bind(
    playerId, dungeonId, heroClass, safeSeasonId,
    safeName, roundedScore, rankGrade ?? null,
    totalTurns, hpPct, safeDiff, clearTime, now
  ).run()

  // All-time row (season_id = '')
  if (safeSeasonId !== '') {
    await env.DB.prepare(upsertSql).bind(
      playerId, dungeonId, heroClass, '',
      safeName, roundedScore, rankGrade ?? null,
      totalTurns, hpPct, safeDiff, clearTime, now
    ).run()
  }

  // Query actual rank positions (COUNT of entries with strictly higher score)
  const rankSql       = 'SELECT COUNT(*) + 1 AS rank FROM leaderboard WHERE dungeon_id = ? AND season_id = ? AND score > ?'
  const rankClassSql  = 'SELECT COUNT(*) + 1 AS rank FROM leaderboard WHERE dungeon_id = ? AND hero_class = ? AND season_id = ? AND score > ?'
  const [wkAll, wkClass, histAll, histClass] = await Promise.all([
    env.DB.prepare(rankSql).bind(dungeonId, safeSeasonId, roundedScore).first(),
    env.DB.prepare(rankClassSql).bind(dungeonId, heroClass, safeSeasonId, roundedScore).first(),
    env.DB.prepare(rankSql).bind(dungeonId, '', roundedScore).first(),
    env.DB.prepare(rankClassSql).bind(dungeonId, heroClass, '', roundedScore).first(),
  ])

  return new Response(JSON.stringify({
    ok: true,
    ranks: {
      weeklyAllRank:    wkAll?.rank   ?? 1,
      weeklyClassRank:  wkClass?.rank ?? 1,
      historyAllRank:   histAll?.rank  ?? 1,
      historyClassRank: histClass?.rank ?? 1,
    },
  }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
