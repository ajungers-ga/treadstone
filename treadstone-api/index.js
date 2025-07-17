// 1. Import dependencies (REQUIRE STATEMENTS)
const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')
const createPlayersRouter = require('./routes/players') //renamed to match function export
require('dotenv').config()

// 2. App setup
const app = express()
const PORT = process.env.PORT || 3001

// 3. Middleware
app.use(cors())
app.use(express.json())

// 4. PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})
app.set('db', pool) // Attaching POOL for SHARED access in routers

// 5. Routes

// Root route
app.get('/', (req, res) => {
  res.send('Treadstone API is live!')
})

// Events route (still inline for now)
app.get('/events', async (req, res) => {
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

// Players route (modular)
app.use('/players', createPlayersRouter(pool)) 

// 6. Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
