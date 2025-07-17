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
    const {
      first_name,
      last_name,
      nickname,
      hometown,
      debut_year,
      image_url,
      hof_inducted,
      hof_year,
      accolades
    } = req.body

    const db = await pool.connect()
    try {
      const result = await db.query(
        `INSERT INTO players 
        (first_name, last_name, nickname, hometown, debut_year, image_url, hof_inducted, hof_year, accolades)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [first_name, last_name, nickname, hometown, debut_year, image_url, hof_inducted, hof_year, accolades]
      )

      const newPlayer = result.rows[0]

      res.status(201).json({
        message: 'Player created',
        player_id: newPlayer.id,
        data: newPlayer
      })
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
      debut_year,
      image_url,
      hof_inducted,
      hof_year,
      accolades
    } = req.body

    const db = await pool.connect()
    try {
      const result = await db.query(
        `UPDATE players
         SET first_name = $1,
             last_name = $2,
             nickname = $3,
             hometown = $4,
             debut_year = $5,
             image_url = $6,
             hof_inducted = $7,
             hof_year = $8,
             accolades = $9
         WHERE id = $10
         RETURNING *`,
        [first_name, last_name, nickname, hometown, debut_year, image_url, hof_inducted, hof_year, accolades, req.params.id]
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
