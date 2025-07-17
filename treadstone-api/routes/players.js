// routes/players.js

// 1. Import dependencies
const express = require('express')
const router = express.Router()

// 2. Define routes
// GET /players — fetch all players
router.get('/', async (req, res) => {
  const db = req.app.get('db') // Get pool from app
  try {
    const client = await db.connect()
    const result = await client.query('SELECT * FROM players')
    client.release()
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch players' })
  }
})

// 3. Export router
module.exports = router
