// routes/events.js

// 1. Import dependencies
const express = require('express')
const { isAdmin } = require('../middleware/auth')

// 2. Export function that receives the pool
function createEventsRouter(pool) {
  const router = express.Router()

  // 3. GET /events (public)
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

  // 3.1 GET /events/:id (public)
  router.get('/:id', async (req, res) => {
    const eventId = req.params.id

    try {
      const db = await pool.connect()

      // Fetch the event and course info
      const eventResult = await db.query(
        `
          SELECT 
            e.*,
            c.name AS course_name,
            c.city || ', ' || c.state AS course_location,
            c.par AS course_par
          FROM events e
          LEFT JOIN courses c ON e.course_id = c.id
          WHERE e.id = $1
        `,
        [eventId]
      )

      if (eventResult.rows.length === 0) {
        db.release()
        return res.status(404).json({ error: 'Event not found' })
      }

      const event = eventResult.rows[0]

      // Fetch all team scores with full player names
      const teamResult = await db.query(
        `
          SELECT 
            s.*,
            p1.first_name || ' ' || p1.last_name AS player1_name,
            p2.first_name || ' ' || p2.last_name AS player2_name,
            p3.first_name || ' ' || p3.last_name AS player3_name,
            p4.first_name || ' ' || p4.last_name AS player4_name
          FROM scores s
          LEFT JOIN players p1 ON s.player1_id = p1.id
          LEFT JOIN players p2 ON s.player2_id = p2.id
          LEFT JOIN players p3 ON s.player3_id = p3.id
          LEFT JOIN players p4 ON s.player4_id = p4.id
          WHERE s.event_id = $1
        `,
        [eventId]
      )

      db.release()

      // Format the teams to use player names instead of IDs
      event.teams = teamResult.rows.map(team => ({
        id: team.id,
        strokes: team.strokes,
        placement: team.placement,
        notes: team.notes,
        player1: team.player1_name,
        player2: team.player2_name,
        player3: team.player3_name,
        player4: team.player4_name,
      }))

      res.json(event)
    } catch (err) {
      console.error('Error fetching event by ID:', err)
      res.status(500).json({ error: 'Failed to fetch event' })
    }
  })

  // 4. POST /events (admin only)
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
