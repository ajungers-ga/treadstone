// routes/events.js

// 1. Import dependencies
const express = require('express')
const router = express.Router()

// 2. Define GET /events route
router.get('/', async (req, res) => {
  const pool = req.app.get('db') // Get shared PostgreSQL pool
  try {
    const db = await pool.connect()
    const result = await db.query('SELECT * FROM events')
    db.release()
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch events' })
  }
})

// 3. Export router
module.exports = router
