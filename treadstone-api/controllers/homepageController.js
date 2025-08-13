const pool = require('../db'); // adjust if your pool is elsewhere

// Helper: format names like "A. Smith / B. Jones"
function formatNames(rows) {
  return rows.map(r => {
    const names = (r.player_ids || []).map(pid => {
      const p = r.player_map[String(pid)];
      return p ? `${p.first_name?.[0]}. ${p.last_name}` : `Player #${pid}`;
    }).join(' / ');
    return { ...r, names };
  });
}

// Fetch a map of playerId -> {first_name,last_name} for a set of ids
async function getPlayerMap(client, ids) {
  if (ids.length === 0) return {};
  const { rows } = await client.query(
    `SELECT id, first_name, last_name FROM players WHERE id = ANY($1::int[])`,
    [ids]
  );
  return rows.reduce((acc, p) => {
    acc[String(p.id)] = p;
    return acc;
  }, {});
}

exports.getHomepage = async (req, res) => {
  const client = await pool.connect();
  try {
    // 1) Upcoming
    const upcomingQ = `
      SELECT e.id, e.name, e.date, c.name AS course
      FROM events e
      LEFT JOIN courses c ON c.id = e.course_id
      WHERE e.finalized = false AND e.date >= CURRENT_DATE
      ORDER BY e.date ASC
      LIMIT 3;
    `;

    // 2) Latest finalized events (5) with podium rows (placements 1–3)
    const latestQ = `
      WITH last5 AS (
        SELECT e.id, e.name, e.date, c.name AS course
        FROM events e
        LEFT JOIN courses c ON c.id = e.course_id
        WHERE e.finalized = true
        ORDER BY e.date DESC
        LIMIT 5
      )
      SELECT l.id AS event_id, l.name, l.date, l.course,
             s.placement, s.strokes, s.to_par,
             ARRAY_REMOVE(ARRAY[s.player1_id, s.player2_id, s.player3_id, s.player4_id], NULL) AS player_ids
      FROM last5 l
      LEFT JOIN scores s ON s.event_id = l.id
      WHERE s.placement IN (1,2,3) AND (s.disqualified IS NULL OR s.disqualified=false)
      ORDER BY l.date DESC, s.placement ASC NULLS LAST;
    `;

    // 3) Leaderboard snippet for most recent finalized event
    const lbQ = `
      WITH latest AS (
        SELECT e.id, e.name, e.date, c.name AS course
        FROM events e
        LEFT JOIN courses c ON c.id = e.course_id
        WHERE e.finalized = true
        ORDER BY e.date DESC
        LIMIT 1
      )
      SELECT l.id AS event_id, l.name, l.date, l.course,
             s.placement, s.strokes, s.to_par,
             ARRAY_REMOVE(ARRAY[s.player1_id, s.player2_id, s.player3_id, s.player4_id], NULL) AS player_ids
      FROM latest l
      LEFT JOIN scores s ON s.event_id = l.id
      WHERE (s.disqualified IS NULL OR s.disqualified=false)
      ORDER BY s.placement ASC NULLS LAST, s.strokes ASC NULLS LAST
      LIMIT 5;
    `;

    // 4) Top players by wins (ties split), plus events played, major wins
    const topPlayersQ = `
      WITH final_evts AS (
        SELECT id FROM events WHERE finalized = true
      ),
      winners AS (
        SELECT s.event_id, COUNT(*)::numeric AS winners_count
        FROM scores s
        JOIN final_evts f ON f.id = s.event_id
        WHERE s.placement = 1 AND (s.disqualified IS NULL OR s.disqualified = false)
        GROUP BY s.event_id
      ),
      unpivot AS (
        SELECT s.id AS score_id, s.event_id, s.placement, s.disqualified, u.p_id AS player_id
        FROM scores s
        CROSS JOIN LATERAL (VALUES (s.player1_id),(s.player2_id),(s.player3_id),(s.player4_id)) u(p_id)
        WHERE u.p_id IS NOT NULL
      )
      SELECT p.id AS player_id,
             CONCAT(p.first_name, ' ', p.last_name) AS name,
             COALESCE(SUM(CASE WHEN u.placement = 1 AND (u.disqualified IS NULL OR u.disqualified=false)
                               THEN 1.0 / w.winners_count ELSE 0 END), 0)::numeric(10,2) AS career_wins,
             COUNT(DISTINCT CASE WHEN e.finalized = true THEN u.event_id END) AS events_played,
             COALESCE(SUM(CASE WHEN e.is_major = true AND u.placement = 1
                                AND (u.disqualified IS NULL OR u.disqualified=false)
                               THEN 1.0 / w.winners_count ELSE 0 END), 0)::numeric(10,2) AS major_wins
      FROM players p
      LEFT JOIN unpivot u ON u.player_id = p.id
      LEFT JOIN events e ON e.id = u.event_id
      LEFT JOIN winners w ON w.event_id = u.event_id
      GROUP BY p.id, name
      ORDER BY career_wins DESC, events_played DESC, name ASC
      LIMIT 10;
    `;

    const [upcoming, latestRows, lbRows, topPlayers] = await Promise.all([
      client.query(upcomingQ),
      client.query(latestQ),
      client.query(lbQ),
      client.query(topPlayersQ),
    ]);

    // Build player id set to hydrate names
    const playerIdSet = new Set();
    for (const r of latestRows.rows) (r.player_ids || []).forEach(id => playerIdSet.add(id));
    for (const r of lbRows.rows) (r.player_ids || []).forEach(id => playerIdSet.add(id));
    const playerMap = await getPlayerMap(client, Array.from(playerIdSet));

    // Group latest events + podium
    const latestMap = new Map();
    for (const r of latestRows.rows) {
      const key = r.event_id;
      if (!latestMap.has(key)) {
        latestMap.set(key, {
          id: r.event_id,
          name: r.name,
          date: r.date,
          course: r.course,
          podium: []
        });
      }
      latestMap.get(key).podium.push({
        placement: r.placement,
        strokes: r.strokes,
        toPar: r.to_par,
        playerIds: r.player_ids || []
      });
    }
    const latestEvents = Array.from(latestMap.values()).map(evt => {
      // decorate with formatted names
      evt.podium = (evt.podium || []).map(p => {
        const names = (p.playerIds || []).map(pid => {
          const pl = playerMap[String(pid)];
          return pl ? `${pl.first_name?.[0]}. ${pl.last_name}` : `Player #${pid}`;
        }).join(' / ');
        return { ...p, teamName: names };
      });
      return evt;
    });

    // Decorate leaderboard snippet rows
    const decoratedLb = lbRows.rows.map(r => ({
      placement: r.placement,
      strokes: r.strokes,
      toPar: r.to_par,
      playerIds: r.player_ids || [],
      names: (r.player_ids || []).map(pid => {
        const pl = playerMap[String(pid)];
        return pl ? `${pl.first_name?.[0]}. ${pl.last_name}` : `Player #${pid}`;
      }).join(' / ')
    }));

    const leaderboardSnippet = lbRows.rows.length
      ? {
          event: {
            id: lbRows.rows[0].event_id,
            name: lbRows.rows[0].name,
            date: lbRows.rows[0].date,
            course: lbRows.rows[0].course
          },
          rows: decoratedLb
        }
      : null;

    res.json({
      upcomingEvents: upcoming.rows,
      latestEvents,
      leaderboardSnippet,
      topPlayers: topPlayers.rows
    });
  } catch (err) {
    console.error('homepage error', err);
    res.status(500).json({ error: 'Failed to build homepage payload' });
  } finally {
    client.release();
  }
};
