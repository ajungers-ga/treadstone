// routes/events.js

// 1. Import dependencies
const express = require('express')
const { isAdmin } = require('../middleware/auth')

// 2. Export function that receives the pool
function createEventsRouter(pool) {
  const router = express.Router()

  // 3. GET /events (public)
  // Fetch all events with course details
  router.get('/', async (req, res) => {
    try {
      const db = await pool.connect()
      const result = await db.query(`
        SELECT 
          e.*,
          c.name AS course_name,
          c.city || ', ' || c.state AS course_location,
          c.par AS course_par
        FROM events e
        LEFT JOIN courses c ON e.course_id = c.id
        ORDER BY e.date DESC
      `)
      db.release()
      res.json(result.rows)
    } catch (err) {
      console.error('Error fetching events:', err)
      res.status(500).json({ error: 'Failed to fetch events' })
    }
  })

  // 4. POST /events (admin only)
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

      const newEvent = result.rows[0]

      res.status(201).json({
        message: 'Event created',
        event_id: newEvent.id,
        data: newEvent
      })
    } catch (err) {
      console.error('Error creating event:', err)
      res.status(500).json({ error: 'Failed to create event' })
    }
  })

  // 5. Return the router
  return router
}

module.exports = createEventsRouter
