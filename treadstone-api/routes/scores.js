// routes/scores.js

const express = require('express')
const { isAdmin } = require('../middleware/auth') // Step 3: Import middleware

function createScoresRouter(pool) {
  const router = express.Router()

  // GET /scores - Public: Fetch all scores with joined player names
  router.get('/', async (req, res) => {
    try {
      const db = await pool.connect()

      const result = await db.query(`
        SELECT 
          s.id,
          s.event_id,
          e.name AS event_name,
          e.date,
          s.strokes,
          s.placement,
          s.notes,

          p1.first_name || ' ' || p1.last_name AS player1_name,
          p2.first_name || ' ' || p2.last_name AS player2_name,
          p3.first_name || ' ' || p3.last_name AS player3_name,
          p4.first_name || ' ' || p4.last_name AS player4_name

        FROM scores s
        JOIN events e ON s.event_id = e.id
        LEFT JOIN players p1 ON s.player1_id = p1.id
        LEFT JOIN players p2 ON s.player2_id = p2.id
        LEFT JOIN players p3 ON s.player3_id = p3.id
        LEFT JOIN players p4 ON s.player4_id = p4.id
        ORDER BY e.date DESC, s.placement ASC;
      `)

      db.release()
      res.json(result.rows)
    } catch (err) {
      console.error('Error fetching scores:', err)
      res.status(500).json({ error: 'Failed to fetch scores' })
    }
  })

  // Future example: Protected POST route
  /*
  router.post('/', isAdmin, async (req, res) => {
    // TODO: Insert score
  })
  */

  return router
}

module.exports = createScoresRouter
