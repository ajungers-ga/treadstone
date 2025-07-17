// routes/scores.js

const express = require('express')

function createScoresRouter(pool) {
  const router = express.Router()

  // GET all scores
  router.get('/', async (req, res) => {
    try {
      const db = await pool.connect()
      const result = await db.query('SELECT * FROM scores')
      db.release()
      res.json(result.rows)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to fetch scores' })
    }
  })

  return router
}

module.exports = createScoresRouter
