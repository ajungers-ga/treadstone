// index.js — Treadstone API (CommonJS)
// Express + pg, with events, players, and scores (names + computed to_par)

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
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ---------- Health ----------
app.get('/health', async (_req, res) => {
  try {
    const r = await pool.query('SELECT 1 as ok');
    res.json({ ok: r.rows[0].ok === 1, port: String(PORT) });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// ---------- Events ----------
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

// ---------- Scores (names + computed to_par) ----------
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
        /* Compute to_par if null: strokes - course_par */
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

// ---------- Players (for /players page) ----------
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
    // Add a convenience field full_name for the client
    const withFullName = rows.map(p => ({
      ...p,
      full_name: [p.first_name, p.last_name].filter(Boolean).join(' ').trim(),
    }));
    res.json(withFullName);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
