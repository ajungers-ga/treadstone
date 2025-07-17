// routes/players.js

const express = require('express')
const { isAdmin } = require('../middleware/auth') // 1. Import admin middleware

function createPlayersRouter(pool) {
  const router = express.Router()

  // 2. Public route - get all players
  router.get('/', async (req, res) => {
    const db = await pool.connect()
    try {
      const result = await db.query('SELECT * FROM players ORDER BY last_name')
      res.json(result.rows)
    } catch (err) {
      console.error('Error fetching players:', err)
      res.status(500).json({ error: 'Failed to fetch players' })
    } finally {
      db.release()
    }
  })

  // 3. Public route - get one player
  router.get('/:id', async (req, res) => {
    const db = await pool.connect()
    try {
      const result = await db.query('SELECT * FROM players WHERE id = $1', [req.params.id])
      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Player not found' })
      } else {
        res.json(result.rows[0])
      }
    } catch (err) {
      console.error('Error fetching player:', err)
      res.status(500).json({ error: 'Failed to fetch player' })
    } finally {
      db.release()
    }
  })

  // 4. Protected route - create new player (admin only)
  router.post('/', isAdmin, async (req, res) => {
    const { first_name, last_name, nickname } = req.body
    const db = await pool.connect()
    try {
      const result = await db.query(
        'INSERT INTO players (first_name, last_name, nickname) VALUES ($1, $2, $3) RETURNING *',
        [first_name, last_name, nickname]
      )
      res.status(201).json(result.rows[0])
    } catch (err) {
      console.error('Error creating player:', err)
      res.status(500).json({ error: 'Failed to create player' })
    } finally {
      db.release()
    }
  })

  // 5. Protected route - update player by ID (admin only)
  router.put('/:id', isAdmin, async (req, res) => {
    const {
      first_name,
      last_name,
      nickname,
      hometown,
      debut_year
    } = req.body

    const db = await pool.connect()
    try {
      const result = await db.query(
        `UPDATE players
         SET first_name = $1,
             last_name = $2,
             nickname = $3,
             hometown = $4,
             debut_year = $5
         WHERE id = $6
         RETURNING *`,
        [first_name, last_name, nickname, hometown, debut_year, req.params.id]
      )

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Player not found' })
      } else {
        res.json(result.rows[0])
      }
    } catch (err) {
      console.error('Error updating player:', err)
      res.status(500).json({ error: 'Failed to update player' })
    } finally {
      db.release()
    }
  })

  // 6. Protected route - delete player by ID (admin only)
  router.delete('/:id', isAdmin, async (req, res) => {
    const db = await pool.connect()
    try {
      const result = await db.query('DELETE FROM players WHERE id = $1', [req.params.id])
      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Player not found' })
      } else {
        res.json({ message: 'Player deleted' })
      }
    } catch (err) {
      console.error('Error deleting player:', err)
      res.status(500).json({ error: 'Failed to delete player' })
    } finally {
      db.release()
    }
  })

  // 7. Return the router
  return router
}

module.exports = createPlayersRouter
