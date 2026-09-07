// server.js
const express = require('express')
const cors = require('cors')
const http = require('http')
const path = require('path')

const { initDB } = require('./db')
const { setupWebSocket } = require('./wsHandler')

const panelRoutes = require('./routes/panel')
const dashboardRoutes = require('./routes/dashboard')
const masterRoutes = require('./routes/master')

const app = express()
const server = http.createServer(app)

app.use(cors())
app.use(express.json())

// Serve static dashboard from ./dashboard
app.use(express.static(path.join(__dirname, 'dashboard')))

app.use('/panel', panelRoutes)
app.use('/dashboard', dashboardRoutes)
app.use('/master', masterRoutes)

setupWebSocket(server)

const PORT = 3000

initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 VANGUARD Dashboard Backend LIVE → http://localhost:${PORT}`)
  })
})
