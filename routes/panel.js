// routes/panel.js
const express = require('express')
const router = express.Router()
const { getTokensForPanel, db } = require('../db')

router.post('/register', async (req, res) => {
  const { panel_id } = req.body
  if (!panel_id) return res.status(400).json({ error: 'panel_id required' })

  await db.execute({
    sql: 'INSERT OR IGNORE INTO panels (panel_id) VALUES (?)',
    args: [panel_id]
  })

  const tokens = await getTokensForPanel(panel_id)
  res.json({ success: true, tokens })
})

router.post('/status', async (req, res) => {
  const { token_hash, status } = req.body
  if (!token_hash || !status) return res.status(400).json({ error: 'token_hash and status required' })

  await db.execute({
    sql: 'UPDATE tokens SET status = ? WHERE token_hash = ?',
    args: [status, token_hash]
  })

  res.json({ success: true })
})

module.exports = router
