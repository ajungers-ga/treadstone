// 1. Import dependencies
const express = require('express')
const cors = require('cors')
require('dotenv').config()

// 2. App setup
const app = express()
const PORT = process.env.PORT || 3001

// 3. Middleware
app.use(cors())
app.use(express.json())

// 4. Routes
app.get('/', (req, res) => {
  res.send('Treadstone API is live!')
})

// 5. Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
