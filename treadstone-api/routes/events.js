// routes/events.js

// 1. Import dependencies
const express = require('express')
const { isAdmin } = require('../middleware/auth')
const router = express.Router()

// 2. GET /events (public)
// Fetch all events from the database
router.get('/', async (req, res) => {
  const pool = req.app.get('db')
  try {
    const db = await pool.connect()
    const result = await db.query('SELECT * FROM events ORDER BY date DESC')
    db.release()
    res.json(result.rows)
  } catch (err) {
    console.error('Error fetching events:', err)
    res.status(500).json({ error: 'Failed to fetch events' })
  }
})

// 3. POST /events (admin only)
// Create a new event — requires admin token
router.post('/', isAdmin, async (req, res) => {
  const {
    name,
    date,
    course_id,
    is_team_event,
    season,
    is_major,
    major_label,
    finalized
  } = req.body

  const pool = req.app.get('db')
  try {
    const db = await pool.connect()
    const result = await db.query(
      `
        INSERT INTO events (
          name, date, course_id, is_team_event, season, is_major, major_label, finalized
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [name, date, course_id, is_team_event, season, is_major, major_label, finalized]
    )
    db.release()
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('Error creating event:', err)
    res.status(500).json({ error: 'Failed to create event' })
  }
})

// 4. Export router
module.exports = router
