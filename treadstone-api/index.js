// 1. Import dependencies (REQUIRE STATEMENTS)
const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')
const createPlayersRouter = require('./routes/players') // named function export
const createScoresRouter = require('./routes/scores')
const eventsRouter = require('./routes/events') // modular route
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

// 5.1 //----Root route----//
app.get('/', (req, res) => {
  res.send('Treadstone API is live!')
})

// 5.2 //----Modular routes----//
app.use('/players', createPlayersRouter(pool)) 
app.use('/events', eventsRouter)
app.use('/scores', createScoresRouter(pool))

// 6. Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
