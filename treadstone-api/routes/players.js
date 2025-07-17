// routes/players.js

const express = require('express')

// Export a function that receives the pool from index.js
module.exports = (pool) => {
  const router = express.Router()

  // GET /players/
  router.get('/', async (req, res) => {
    try {
      const db = await pool.connect()
      const result = await db.query('SELECT * FROM players')
      db.release()
      res.json(result.rows)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to fetch players' })
    }
  })

  return router
}
