// 1. Import dependencies
const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { Pool } = require('pg')

// 2. App setup
const app = express()
const PORT = process.env.PORT || 3001

// 3. Middleware
app.use(cors())
app.use(express.json())

// 4. PostgreSQL pool setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// 5. Test DB connection
pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch((err) => console.error('❌ DB connection error:', err))



  
// 6. Routes----------------------------------------------------------//
app.get('/', (req, res) => {
  res.send('Treadstone API is live!')
})

// GET /players - return all players
app.get('/players', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM players ORDER BY id ASC')
    res.json(result.rows)
  } catch (err) {
    console.error('Error fetching players:', err)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// GET /events - all events with course info
app.get('/events', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT events.*, courses.name AS course_name, courses.par
      FROM events
      JOIN courses ON events.course_id = courses.id
      ORDER BY date DESC
    `)
    res.json(result.rows)
  } catch (err) {
    console.error('Error fetching events:', err)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// GET /events/upcoming - events where date >= today
app.get('/events/upcoming', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT events.*, courses.name AS course_name, courses.par
      FROM events
      JOIN courses ON events.course_id = courses.id
      WHERE date >= CURRENT_DATE
      ORDER BY date ASC
    `)
    res.json(result.rows)
  } catch (err) {
    console.error('Error fetching upcoming events:', err)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})



// 7. Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
