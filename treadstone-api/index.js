// // index.js — Treadstone API (CommonJS)
// // Express + pg, with events, players, scores (names + computed to_par),
// // player profile routes, and a home summary.

// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();
// const { Pool } = require('pg');

// const app = express();
// const PORT = process.env.PORT || 3001;

// // Pool reads DATABASE_URL or PG* vars from .env
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   // Use SSL only if you explicitly set PGSSL=require (e.g., for cloud PG)
//   ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : false,
// });

// app.use(cors({
//   origin: ['http://localhost:5173'],
//   methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
//   allowedHeaders: ['Content-Type','Authorization'],
// }));
// app.use(express.json());

// // ---------- Health ----------
// app.get('/health', async (_req, res) => {
//   try {
//     const r = await pool.query('SELECT 1 as ok');
//     res.json({ ok: r.rows[0].ok === 1, port: String(PORT) });
//   } catch (e) {
//     res.status(500).json({ ok: false, error: String(e.message || e) });
//   }
// });

// // ---------- Home summary ----------
// app.get('/home/summary', async (_req, res) => {
//   try {
//     const nowQ = await pool.query('SELECT now()::date AS today');
//     const today = nowQ.rows[0].today;

//     const totalsQ = await pool.query(`
//       SELECT
//         (SELECT COUNT(*) FROM players)                     AS players,
//         (SELECT COUNT(*) FROM events)                      AS events,
//         (SELECT COUNT(DISTINCT season) FROM events)        AS seasons
//     `);

//     // Latest past (or equal) event
//     const latestEventQ = await pool.query(`
//       SELECT
//         e.id, e.name, e.date, e.course_id, e.season,
//         c.name AS course_name, c.par AS course_par
//       FROM events e
//       LEFT JOIN courses c ON c.id = e.course_id
//       WHERE e.date <= $1
//       ORDER BY e.date DESC, e.id DESC
//       LIMIT 1
//     `, [today]);

//     let latest = latestEventQ.rows[0] || null;
//     let latestTop = [];
//     if (latest) {
//       const topQ = await pool.query(`
//         SELECT
//           s.id,
//           s.placement,
//           s.strokes,
//           COALESCE(s.to_par, (NULLIF(s.strokes::text,'')::int - c.par)) AS to_par,
//           CONCAT_WS(' ', p1.first_name, p1.last_name) AS player1_name,
//           CONCAT_WS(' ', p2.first_name, p2.last_name) AS player2_name,
//           CONCAT_WS(' ', p3.first_name, p3.last_name) AS player3_name,
//           CONCAT_WS(' ', p4.first_name, p4.last_name) AS player4_name
//         FROM scores s
//         JOIN events e ON e.id = s.event_id
//         LEFT JOIN courses c ON c.id = e.course_id
//         LEFT JOIN players p1 ON p1.id = s.player1_id
//         LEFT JOIN players p2 ON p2.id = s.player2_id
//         LEFT JOIN players p3 ON p3.id = s.player3_id
//         LEFT JOIN players p4 ON p4.id = s.player4_id
//         WHERE s.event_id = $1
//         ORDER BY s.placement NULLS LAST, s.id ASC
//         LIMIT 5
//       `, [latest.id]);
//       latestTop = topQ.rows;
//     }

//     // Next upcoming event
//     const nextEventQ = await pool.query(`
//       SELECT
//         e.id, e.name, e.date, e.course_id, e.season,
//         c.name AS course_name, c.par AS course_par
//       FROM events e
//       LEFT JOIN courses c ON c.id = e.course_id
//       WHERE e.date > $1
//       ORDER BY e.date ASC, e.id ASC
//       LIMIT 1
//     `, [today]);

//     const nextEvent = nextEventQ.rows[0] || null;

//     res.json({
//       totals: totalsQ.rows[0],
//       latest_event: latest ? { ...latest, top_results: latestTop } : null,
//       next_event: nextEvent,
//     });
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ error: String(e.message || e) });
//   }
// });

// // ---------- Events ----------
// app.get('/events', async (_req, res) => {
//   try {
//     const q = `
//       SELECT
//         e.id, e.name, e.date, e.course_id, e.is_team_event, e.notes,
//         e.season, e.is_major, e.major_label, e.finalized,
//         c.name AS course_name,
//         c.par  AS course_par
//       FROM events e
//       LEFT JOIN courses c ON c.id = e.course_id
//       ORDER BY e.date DESC, e.id DESC;
//     `;
//     const { rows } = await pool.query(q);
//     res.json(rows);
//   } catch (e) {
//     res.status(500).json({ error: String(e.message || e) });
//   }
// });

// app.get('/events/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const q = `
//       SELECT
//         e.id, e.name, e.date, e.course_id, e.is_team_event, e.notes,
//         e.season, e.is_major, e.major_label, e.finalized,
//         c.name AS course_name,
//         c.par  AS course_par
//       FROM events e
//       LEFT JOIN courses c ON c.id = e.course_id
//       WHERE e.id = $1
//       LIMIT 1;
//     `;
//     const { rows } = await pool.query(q, [id]);
//     if (rows.length === 0) return res.status(404).json({ error: 'Event not found' });
//     res.json(rows[0]);
//   } catch (e) {
//     res.status(500).json({ error: String(e.message || e) });
//   }
// });

// // ---------- Scores (names + computed to_par) ----------
// app.get('/events/:id/scores', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const q = `
//       SELECT
//         s.id,
//         s.event_id,
//         s.player1_id,
//         CONCAT_WS(' ', p1.first_name, p1.last_name) AS player1_name,
//         s.player2_id,
//         CONCAT_WS(' ', p2.first_name, p2.last_name) AS player2_name,
//         s.player3_id,
//         CONCAT_WS(' ', p3.first_name, p3.last_name) AS player3_name,
//         s.player4_id,
//         CONCAT_WS(' ', p4.first_name, p4.last_name) AS player4_name,
//         s.strokes,
//         COALESCE(
//           s.to_par,
//           (NULLIF(s.strokes::text,'')::int - c.par)
//         ) AS to_par,
//         s.placement,
//         s.disqualified
//       FROM scores s
//       JOIN events e ON e.id = s.event_id
//       LEFT JOIN courses c ON c.id = e.course_id
//       LEFT JOIN players p1 ON p1.id = s.player1_id
//       LEFT JOIN players p2 ON p2.id = s.player2_id
//       LEFT JOIN players p3 ON p3.id = s.player3_id
//       LEFT JOIN players p4 ON p4.id = s.player4_id
//       WHERE s.event_id = $1
//       ORDER BY
//         s.placement NULLS LAST,
//         COALESCE(s.to_par, (NULLIF(s.strokes::text,'')::int - c.par)) NULLS LAST,
//         s.strokes NULLS LAST,
//         s.id ASC;
//     `;
//     const { rows } = await pool.query(q, [id]);
//     res.json(rows); // [] if none
//   } catch (e) {
//     res.status(500).json({ error: String(e.message || e) });
//   }
// });

// // ---------- Players (list + detail + stats + results) ----------
// app.get('/players', async (_req, res) => {
//   try {
//     const q = `
//       SELECT
//         id,
//         first_name,
//         last_name,
//         nickname,
//         hometown,
//         debut_year,
//         image_url,
//         hof_inducted,
//         hof_year,
//         accolades
//       FROM players
//       ORDER BY last_name ASC, first_name ASC, id ASC;
//     `;
//     const { rows } = await pool.query(q);
//     const withFullName = rows.map(p => ({
//       ...p,
//       full_name: [p.first_name, p.last_name].filter(Boolean).join(' ').trim(),
//     }));
//     res.json(withFullName);
//   } catch (e) {
//     res.status(500).json({ error: String(e.message || e) });
//   }
// });

// // single player
// app.get('/players/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const q = `
//       SELECT
//         id, first_name, last_name, nickname, hometown, debut_year,
//         image_url, hof_inducted, hof_year, accolades
//       FROM players
//       WHERE id = $1
//       LIMIT 1;
//     `;
//     const { rows } = await pool.query(q, [id]);
//     if (rows.length === 0) return res.status(404).json({ error: 'Player not found' });
//     const p = rows[0];
//     p.full_name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
//     res.json(p);
//   } catch (e) {
//     res.status(500).json({ error: String(e.message || e) });
//   }
// });

// // player stats
// app.get('/players/:id/stats', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const q = `
//       WITH player_scores AS (
//         SELECT
//           s.*,
//           e.season,
//           e.date,
//           c.par AS course_par,
//           COALESCE(s.to_par, (NULLIF(s.strokes::text,'')::int - c.par)) AS to_par_calc
//         FROM scores s
//         JOIN events e ON e.id = s.event_id
//         LEFT JOIN courses c ON c.id = e.course_id
//         WHERE $1 IN (s.player1_id, s.player2_id, s.player3_id, s.player4_id)
//       )
//       SELECT
//         COUNT(DISTINCT event_id)            AS events_played,
//         COUNT(*) FILTER (WHERE placement=1) AS events_won,
//         COUNT(*) FILTER (WHERE placement<=3) AS podiums,
//         MIN(placement)                      AS best_finish,
//         AVG(strokes)::numeric(10,2)         AS avg_strokes,
//         AVG(to_par_calc)::numeric(10,2)     AS avg_to_par,
//         MIN(date)                           AS first_event_date,
//         MAX(date)                           AS last_event_date,
//         COUNT(DISTINCT season)              AS seasons_played
//       FROM player_scores;
//     `;
//     const { rows } = await pool.query(q, [req.params.id]);
//     res.json(rows[0] || {});
//   } catch (e) {
//     res.status(500).json({ error: String(e.message || e) });
//   }
// });

// // player results
// app.get('/players/:id/results', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const q = `
//       SELECT
//         e.id AS event_id,
//         e.name AS event_name,
//         e.date,
//         e.season,
//         c.name AS course_name,
//         c.par  AS course_par,
//         s.id   AS score_id,
//         s.placement,
//         s.strokes,
//         COALESCE(s.to_par, (NULLIF(s.strokes::text,'')::int - c.par)) AS to_par,
//         CONCAT_WS(' ', p1.first_name, p1.last_name) AS player1_name,
//         CONCAT_WS(' ', p2.first_name, p2.last_name) AS player2_name,
//         CONCAT_WS(' ', p3.first_name, p3.last_name) AS player3_name,
//         CONCAT_WS(' ', p4.first_name, p4.last_name) AS player4_name
//       FROM scores s
//       JOIN events e ON e.id = s.event_id
//       LEFT JOIN courses c ON c.id = e.course_id
//       LEFT JOIN players p1 ON p1.id = s.player1_id
//       LEFT JOIN players p2 ON p2.id = s.player2_id
//       LEFT JOIN players p3 ON p3.id = s.player3_id
//       LEFT JOIN players p4 ON p4.id = s.player4_id
//       WHERE $1 IN (s.player1_id, s.player2_id, s.player3_id, s.player4_id)
//       ORDER BY e.date DESC, s.placement NULLS LAST, s.id ASC;
//     `;
//     const { rows } = await pool.query(q, [id]);
//     res.json(rows);
//   } catch (e) {
//     res.status(500).json({ error: String(e.message || e) });
//   }
// });

// // ---------- Start ----------
// app.listen(PORT, () => {
//   console.log(`Server listening on port ${PORT}`);
// });







// index.js — Treadstone API (CommonJS)
// Express + pg, with events, players, scores (names + computed to_par),
// player profile routes, home summary, and a compact /api/homepage feed.

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// Pool reads DATABASE_URL or PG* vars from .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Use SSL only if you explicitly set PGSSL=require (e.g., for cloud PG)
  ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : false,
});

app.use(cors({
  origin: ['http://localhost:5173'],
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json());

/* =========================
   Health
   ========================= */
app.get('/health', async (_req, res) => {
  try {
    const r = await pool.query('SELECT 1 as ok');
    res.json({ ok: r.rows[0].ok === 1, port: String(PORT) });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

/* =========================
   Home summary (you already had this)
   ========================= */
app.get('/home/summary', async (_req, res) => {
  try {
    const nowQ = await pool.query('SELECT now()::date AS today');
    const today = nowQ.rows[0].today;

    const totalsQ = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM players)              AS players,
        (SELECT COUNT(*) FROM events)               AS events,
        (SELECT COUNT(DISTINCT season) FROM events) AS seasons
    `);

    // Latest past (or equal) event
    const latestEventQ = await pool.query(`
      SELECT
        e.id, e.name, e.date, e.course_id, e.season,
        c.name AS course_name, c.par AS course_par
      FROM events e
      LEFT JOIN courses c ON c.id = e.course_id
      WHERE e.date <= $1
      ORDER BY e.date DESC, e.id DESC
      LIMIT 1
    `, [today]);

    let latest = latestEventQ.rows[0] || null;
    let latestTop = [];
    if (latest) {
      const topQ = await pool.query(`
        SELECT
          s.id,
          s.placement,
          s.strokes,
          COALESCE(s.to_par, (NULLIF(s.strokes::text,'')::int - c.par)) AS to_par,
          CONCAT_WS(' ', p1.first_name, p1.last_name) AS player1_name,
          CONCAT_WS(' ', p2.first_name, p2.last_name) AS player2_name,
          CONCAT_WS(' ', p3.first_name, p3.last_name) AS player3_name,
          CONCAT_WS(' ', p4.first_name, p4.last_name) AS player4_name
        FROM scores s
        JOIN events e ON e.id = s.event_id
        LEFT JOIN courses c ON c.id = e.course_id
        LEFT JOIN players p1 ON p1.id = s.player1_id
        LEFT JOIN players p2 ON p2.id = s.player2_id
        LEFT JOIN players p3 ON p3.id = s.player3_id
        LEFT JOIN players p4 ON p4.id = s.player4_id
        WHERE s.event_id = $1
        ORDER BY s.placement NULLS LAST, s.id ASC
        LIMIT 5
      `, [latest.id]);
      latestTop = topQ.rows;
    }

    // Next upcoming event
    const nextEventQ = await pool.query(`
      SELECT
        e.id, e.name, e.date, e.course_id, e.season,
        c.name AS course_name, c.par AS course_par
      FROM events e
      LEFT JOIN courses c ON c.id = e.course_id
      WHERE e.date > $1
      ORDER BY e.date ASC, e.id ASC
      LIMIT 1
    `, [today]);

    const nextEvent = nextEventQ.rows[0] || null;

    res.json({
      totals: totalsQ.rows[0],
      latest_event: latest ? { ...latest, top_results: latestTop } : null,
      next_event: nextEvent,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
});

/* =========================
   NEW: Compact Homepage feed
   - upcomingEvents (next 3)
   - latestEvents (last 3 finalized, each with podium placements 1–3)
   - leaderboardSnippet (most recent finalized, top 5)
   - topPlayers (career wins with tie-splitting; majors; events played)
   ========================= */
app.get('/api/homepage', async (_req, res) => {
  const client = await pool.connect();
  try {
    // Upcoming (next 3)
    const upcomingQ = `
      SELECT e.id, e.name, e.date, c.name AS course
      FROM events e
      LEFT JOIN courses c ON c.id = e.course_id
      WHERE e.finalized = false AND e.date >= CURRENT_DATE
      ORDER BY e.date ASC, e.id ASC
      LIMIT 3;
    `;

    // Latest 3 finalized events + podium (placements 1–3) with compact team name
    const latestQ = `
      WITH last3 AS (
        SELECT e.id, e.name, e.date, c.name AS course
        FROM events e
        LEFT JOIN courses c ON c.id = e.course_id
        WHERE e.finalized = true
        ORDER BY e.date DESC, e.id DESC
        LIMIT 3
      )
      SELECT
        l.id   AS event_id,
        l.name,
        l.date,
        l.course,
        s.placement,
        s.strokes,
        s.to_par,
        ARRAY_REMOVE(ARRAY[s.player1_id, s.player2_id, s.player3_id, s.player4_id], NULL) AS player_ids,
        TRIM(BOTH ' / ' FROM CONCAT_WS(' / ',
          CASE WHEN p1.id IS NOT NULL THEN CONCAT(LEFT(p1.first_name,1), '. ', p1.last_name) END,
          CASE WHEN p2.id IS NOT NULL THEN CONCAT(LEFT(p2.first_name,1), '. ', p2.last_name) END,
          CASE WHEN p3.id IS NOT NULL THEN CONCAT(LEFT(p3.first_name,1), '. ', p3.last_name) END,
          CASE WHEN p4.id IS NOT NULL THEN CONCAT(LEFT(p4.first_name,1), '. ', p4.last_name) END
        )) AS team_name
      FROM last3 l
      JOIN scores s ON s.event_id = l.id
      LEFT JOIN players p1 ON p1.id = s.player1_id
      LEFT JOIN players p2 ON p2.id = s.player2_id
      LEFT JOIN players p3 ON p3.id = s.player3_id
      LEFT JOIN players p4 ON p4.id = s.player4_id
      WHERE (s.disqualified IS NULL OR s.disqualified = false)
        AND s.placement IN (1,2,3)
      ORDER BY l.date DESC, s.placement ASC NULLS LAST, s.id ASC;
    `;

    // Leaderboard snippet (most recent finalized event, top 5)
    const lbQ = `
      WITH latest AS (
        SELECT e.id, e.name, e.date, c.name AS course
        FROM events e
        LEFT JOIN courses c ON c.id = e.course_id
        WHERE e.finalized = true
        ORDER BY e.date DESC, e.id DESC
        LIMIT 1
      )
      SELECT
        l.id   AS event_id,
        l.name,
        l.date,
        l.course,
        s.placement,
        s.strokes,
        s.to_par,
        ARRAY_REMOVE(ARRAY[s.player1_id, s.player2_id, s.player3_id, s.player4_id], NULL) AS player_ids,
        TRIM(BOTH ' / ' FROM CONCAT_WS(' / ',
          CASE WHEN p1.id IS NOT NULL THEN CONCAT(LEFT(p1.first_name,1), '. ', p1.last_name) END,
          CASE WHEN p2.id IS NOT NULL THEN CONCAT(LEFT(p2.first_name,1), '. ', p2.last_name) END,
          CASE WHEN p3.id IS NOT NULL THEN CONCAT(LEFT(p3.first_name,1), '. ', p3.last_name) END,
          CASE WHEN p4.id IS NOT NULL THEN CONCAT(LEFT(p4.first_name,1), '. ', p4.last_name) END
        )) AS team_name
      FROM latest l
      JOIN scores s ON s.event_id = l.id
      LEFT JOIN players p1 ON p1.id = s.player1_id
      LEFT JOIN players p2 ON p2.id = s.player2_id
      LEFT JOIN players p3 ON p3.id = s.player3_id
      LEFT JOIN players p4 ON p4.id = s.player4_id
      WHERE (s.disqualified IS NULL OR s.disqualified = false)
      ORDER BY s.placement ASC NULLS LAST, s.strokes ASC NULLS LAST, s.id ASC
      LIMIT 5;
    `;

    // Top players by wins (tie-splitting), events played, major wins
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
        SELECT s.event_id, s.placement, s.disqualified, u.p_id AS player_id
        FROM scores s
        CROSS JOIN LATERAL (VALUES (s.player1_id),(s.player2_id),(s.player3_id),(s.player4_id)) u(p_id)
        WHERE u.p_id IS NOT NULL
      )
      SELECT
        p.id AS player_id,
        CONCAT(p.first_name, ' ', p.last_name) AS name,
        COALESCE(SUM(
          CASE WHEN u.placement = 1 AND (u.disqualified IS NULL OR u.disqualified = false)
               THEN 1.0 / w.winners_count ELSE 0 END
        ), 0)::numeric(10,2) AS career_wins,
        COUNT(DISTINCT CASE WHEN e.finalized = true THEN u.event_id END) AS events_played,
        COALESCE(SUM(
          CASE WHEN e.is_major = true AND u.placement = 1
               AND (u.disqualified IS NULL OR u.disqualified = false)
               THEN 1.0 / w.winners_count ELSE 0 END
        ), 0)::numeric(10,2) AS major_wins
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

    // Group latestEvents rows into events with podium arrays
    const latestMap = new Map();
    for (const r of latestRows.rows) {
      if (!latestMap.has(r.event_id)) {
        latestMap.set(r.event_id, {
          id: r.event_id,
          name: r.name,
          date: r.date,
          course: r.course,
          podium: []
        });
      }
      latestMap.get(r.event_id).podium.push({
        placement: r.placement,
        strokes: r.strokes,
        toPar: r.to_par,
        playerIds: r.player_ids || [],
        teamName: r.team_name
      });
    }
    const latestEvents = Array.from(latestMap.values());

    const leaderboardSnippet = lbRows.rows.length
      ? {
          event: {
            id: lbRows.rows[0].event_id,
            name: lbRows.rows[0].name,
            date: lbRows.rows[0].date,
            course: lbRows.rows[0].course
          },
          rows: lbRows.rows.map(r => ({
            placement: r.placement,
            strokes: r.strokes,
            toPar: r.to_par,
            playerIds: r.player_ids || [],
            teamName: r.team_name
          }))
        }
      : null;

    res.json({
      upcomingEvents: upcoming.rows,
      latestEvents,
      leaderboardSnippet,
      topPlayers: topPlayers.rows
    });
  } catch (e) {
    console.error('homepage error', e);
    res.status(500).json({ error: 'Failed to build homepage payload' });
  } finally {
    client.release();
  }
});

/* =========================
   Events
   ========================= */
app.get('/events', async (_req, res) => {
  try {
    const q = `
      SELECT
        e.id, e.name, e.date, e.course_id, e.is_team_event, e.notes,
        e.season, e.is_major, e.major_label, e.finalized,
        c.name AS course_name,
        c.par  AS course_par
      FROM events e
      LEFT JOIN courses c ON c.id = e.course_id
      ORDER BY e.date DESC, e.id DESC;
    `;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const q = `
      SELECT
        e.id, e.name, e.date, e.course_id, e.is_team_event, e.notes,
        e.season, e.is_major, e.major_label, e.finalized,
        c.name AS course_name,
        c.par  AS course_par
      FROM events e
      LEFT JOIN courses c ON c.id = e.course_id
      WHERE e.id = $1
      LIMIT 1;
    `;
    const { rows } = await pool.query(q, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

/* =========================
   Scores (names + computed to_par)
   ========================= */
app.get('/events/:id/scores', async (req, res) => {
  try {
    const { id } = req.params;
    const q = `
      SELECT
        s.id,
        s.event_id,
        s.player1_id,
        CONCAT_WS(' ', p1.first_name, p1.last_name) AS player1_name,
        s.player2_id,
        CONCAT_WS(' ', p2.first_name, p2.last_name) AS player2_name,
        s.player3_id,
        CONCAT_WS(' ', p3.first_name, p3.last_name) AS player3_name,
        s.player4_id,
        CONCAT_WS(' ', p4.first_name, p4.last_name) AS player4_name,
        s.strokes,
        COALESCE(
          s.to_par,
          (NULLIF(s.strokes::text,'')::int - c.par)
        ) AS to_par,
        s.placement,
        s.disqualified
      FROM scores s
      JOIN events e ON e.id = s.event_id
      LEFT JOIN courses c ON c.id = e.course_id
      LEFT JOIN players p1 ON p1.id = s.player1_id
      LEFT JOIN players p2 ON p2.id = s.player2_id
      LEFT JOIN players p3 ON p3.id = s.player3_id
      LEFT JOIN players p4 ON p4.id = s.player4_id
      WHERE s.event_id = $1
      ORDER BY
        s.placement NULLS LAST,
        COALESCE(s.to_par, (NULLIF(s.strokes::text,'')::int - c.par)) NULLS LAST,
        s.strokes NULLS LAST,
        s.id ASC;
    `;
    const { rows } = await pool.query(q, [id]);
    res.json(rows); // [] if none
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

/* =========================
   Players (list + detail + stats + results)
   ========================= */
app.get('/players', async (_req, res) => {
  try {
    const q = `
      SELECT
        id,
        first_name,
        last_name,
        nickname,
        hometown,
        debut_year,
        image_url,
        hof_inducted,
        hof_year,
        accolades
      FROM players
      ORDER BY last_name ASC, first_name ASC, id ASC;
    `;
    const { rows } = await pool.query(q);
    const withFullName = rows.map(p => ({
      ...p,
      full_name: [p.first_name, p.last_name].filter(Boolean).join(' ').trim(),
    }));
    res.json(withFullName);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// single player
app.get('/players/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const q = `
      SELECT
        id, first_name, last_name, nickname, hometown, debut_year,
        image_url, hof_inducted, hof_year, accolades
      FROM players
      WHERE id = $1
      LIMIT 1;
    `;
    const { rows } = await pool.query(q, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Player not found' });
    const p = rows[0];
    p.full_name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
    res.json(p);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// player stats
app.get('/players/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const q = `
      WITH player_scores AS (
        SELECT
          s.*,
          e.season,
          e.date,
          c.par AS course_par,
          COALESCE(s.to_par, (NULLIF(s.strokes::text,'')::int - c.par)) AS to_par_calc
        FROM scores s
        JOIN events e ON e.id = s.event_id
        LEFT JOIN courses c ON c.id = e.course_id
        WHERE $1 IN (s.player1_id, s.player2_id, s.player3_id, s.player4_id)
      )
      SELECT
        COUNT(DISTINCT event_id)            AS events_played,
        COUNT(*) FILTER (WHERE placement=1) AS events_won,
        COUNT(*) FILTER (WHERE placement<=3) AS podiums,
        MIN(placement)                      AS best_finish,
        AVG(strokes)::numeric(10,2)         AS avg_strokes,
        AVG(to_par_calc)::numeric(10,2)     AS avg_to_par,
        MIN(date)                           AS first_event_date,
        MAX(date)                           AS last_event_date,
        COUNT(DISTINCT season)              AS seasons_played
      FROM player_scores;
    `;
    const { rows } = await pool.query(q, [req.params.id]);
    res.json(rows[0] || {});
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// player results
app.get('/players/:id/results', async (req, res) => {
  try {
    const { id } = req.params;
    const q = `
      SELECT
        e.id AS event_id,
        e.name AS event_name,
        e.date,
        e.season,
        c.name AS course_name,
        c.par  AS course_par,
        s.id   AS score_id,
        s.placement,
        s.strokes,
        COALESCE(s.to_par, (NULLIF(s.strokes::text,'')::int - c.par)) AS to_par,
        CONCAT_WS(' ', p1.first_name, p1.last_name) AS player1_name,
        CONCAT_WS(' ', p2.first_name, p2.last_name) AS player2_name,
        CONCAT_WS(' ', p3.first_name, p3.last_name) AS player3_name,
        CONCAT_WS(' ', p4.first_name, p4.last_name) AS player4_name
      FROM scores s
      JOIN events e ON e.id = s.event_id
      LEFT JOIN courses c ON c.id = e.course_id
      LEFT JOIN players p1 ON p1.id = s.player1_id
      LEFT JOIN players p2 ON p2.id = s.player2_id
      LEFT JOIN players p3 ON p3.id = s.player3_id
      LEFT JOIN players p4 ON p4.id = s.player4_id
      WHERE $1 IN (s.player1_id, s.player2_id, s.player3_id, s.player4_id)
      ORDER BY e.date DESC, s.placement NULLS LAST, s.id ASC;
    `;
    const { rows } = await pool.query(q, [id]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

/* =========================
   Start
   ========================= */
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
