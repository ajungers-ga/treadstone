// routes/scores.js

const express = require('express')
const { isAdmin } = require('../middleware/auth') // 1. Import admin middleware

function createScoresRouter(pool) {
  const router = express.Router()

  // 2. Public route - get all scores with joined player names
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

  // 3. Protected route - create a new score (admin only)
  router.post('/', isAdmin, async (req, res) => {
    const {
      event_id,
      player1_id,
      player2_id,
      player3_id,
      player4_id,
      strokes,
      placement,
      notes
    } = req.body

    try {
      const db = await pool.connect()

      const result = await db.query(
        `INSERT INTO scores 
          (event_id, player1_id, player2_id, player3_id, player4_id, strokes, placement, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [event_id, player1_id, player2_id, player3_id, player4_id, strokes, placement, notes]
      )

      db.release()

      const newScore = result.rows[0]

      res.status(201).json({
        message: 'Score created',
        score_id: newScore.id,
        data: newScore
      })
    } catch (err) {
      console.error('Error inserting score:', err)
      res.status(500).json({ error: 'Failed to create score' })
    }
  })

  // 4. Protected route - update a score (admin only)
  router.put('/:id', isAdmin, async (req, res) => {
    const { strokes, placement, notes } = req.body

    try {
      const db = await pool.connect()

      const result = await db.query(
        `UPDATE scores
         SET strokes = $1, placement = $2, notes = $3
         WHERE id = $4
         RETURNING *`,
        [strokes, placement, notes, req.params.id]
      )

      db.release()

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Score not found' })
      } else {
        res.json({
          message: 'Score updated',
          score_id: result.rows[0].id,
          data: result.rows[0]
        })
      }
    } catch (err) {
      console.error('Error updating score:', err)
      res.status(500).json({ error: 'Failed to update score' })
    }
  })

  // 5. Protected route - delete a score (admin only)
  router.delete('/:id', isAdmin, async (req, res) => {
    try {
      const db = await pool.connect()

      const result = await db.query('DELETE FROM scores WHERE id = $1 RETURNING *', [req.params.id])

      db.release()

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Score not found' })
      } else {
        res.json({
          message: 'Score deleted',
          score_id: result.rows[0].id
        })
      }
    } catch (err) {
      console.error('Error deleting score:', err)
      res.status(500).json({ error: 'Failed to delete score' })
    }
  })

  // 6. Return the router
  return router
}

module.exports = createScoresRouter
