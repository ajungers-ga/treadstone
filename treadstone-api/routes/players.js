// routes/players.js

const express = require('express')
const { isAdmin } = require('../middleware/auth')

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

  // POST /players/ - Create a new player (admin only)
  router.post('/', isAdmin, async (req, res) => {
    const {
      first_name,
      last_name,
      nickname,
      hometown,
      debut_year,
      accolades
    } = req.body

    try {
      const db = await pool.connect()
      const result = await db.query(
        `INSERT INTO players 
          (first_name, last_name, nickname, hometown, debut_year, accolades)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [first_name, last_name, nickname, hometown, debut_year, accolades]
      )
      db.release()
      res.status(201).json(result.rows[0])
    } catch (err) {
      console.error('Error creating player:', err)
      res.status(500).json({ error: 'Failed to create player' })
    }
  })

  return router
}
