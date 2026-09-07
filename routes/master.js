// routes/master.js
const express = require('express')
const router = express.Router()
const { createToken, deleteToken, hashToken, getTokensForPanel } = require('../db')

const MASTER_SECRET = 'vanguard-master-secret-2026'

const authMiddleware = (req, res, next) => {
  const secret = req.headers['x-master-secret']
  if (secret !== MASTER_SECRET) return res.status(401).json({ error: 'Unauthorized' })
  next()
}

router.post('/create-token', authMiddleware, async (req, res) => {
  const { panel_id } = req.body
  if (!panel_id) return res.status(400).json({ error: 'panel_id required' })

  const token = await createToken(panel_id)
  res.json({ success: true, token })
})

router.post('/delete-token', authMiddleware, async (req, res) => {
  const { token } = req.body
  if (!token) return res.status(400).json({ error: 'token required' })

  const hash = hashToken(token)
  await deleteToken(hash, 'master_deleted', 'master')
  res.json({ success: true })
})

router.get('/list-tokens', authMiddleware, async (req, res) => {
  const { panel_id } = req.query
  if (!panel_id) return res.status(400).json({ error: 'panel_id required' })

  const tokens = await getTokensForPanel(panel_id)
  const masked = tokens.map(({ token_hash, status }) => ({
    mask: `VG${token_hash.slice(0, 5)}***${token_hash.slice(-3)}`,
    status
  }))
  res.json({ tokens: masked })
})

module.exports = router
