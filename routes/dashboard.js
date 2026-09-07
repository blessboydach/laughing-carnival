// routes/dashboard.js
const express = require('express')
const axios = require('axios')
const router = express.Router()
const { hashToken, getTokenByHash, isTokenDead } = require('../db')
const { panelSockets } = require('../wsHandler')

const PAIR_SITE_URL = 'https://vanguardmdpair.onrender.com'

router.post('/check', async (req, res) => {
  const { token } = req.body
  if (!token) return res.status(400).json({ error: 'Token required' })

  const hash = hashToken(token)
  if (await isTokenDead(hash)) return res.json({ status: 'TOKEN_DEAD' })

  const tokenData = await getTokenByHash(hash)
  if (!tokenData) return res.json({ status: 'TOKEN_NOT_FOUND' })

  const panelId = tokenData.panel_id
  const socket = panelSockets.get(panelId)
  if (!socket) return res.json({ status: 'PANEL_DEAD' })

  const handshakeResult = await new Promise((resolve) => {
    const pending = {
      timeout: setTimeout(() => {
        socket.pendingPing = null
        resolve({ status: 'TIMEOUT' })
      }, 10000),
      resolve: (statuses) => resolve({ status: 'PONG', statuses })
    }
    socket.pendingPing = pending
    socket.send(JSON.stringify({ type: 'PING' }))
  })

  if (handshakeResult.status === 'TIMEOUT') return res.json({ status: 'PANEL_DEAD' })

  const tokenStatus = handshakeResult.statuses?.[hash] || 'LOGGEDOUT'
  return res.json({
    status: tokenStatus === 'LIVE' ? 'HANDSHAKE_ACTIVE' : 'LOGGEDOUT',
    panel_id: panelId
  })
})

router.post('/pair', async (req, res) => {
  const { token, phone } = req.body
  if (!token || !phone) return res.status(400).json({ error: 'Token and phone required' })

  const hash = hashToken(token)
  const tokenData = await getTokenByHash(hash)
  if (!tokenData || await isTokenDead(hash)) {
    return res.status(404).json({ error: 'Token invalid or dead' })
  }

  try {
    const response = await axios.post(`${PAIR_SITE_URL}/generate-max`, { phone })
    if (response.data.success) {
      return res.json({ success: true, sessionId: response.data.sessionId })
    } else {
      return res.status(400).json({ error: 'Failed to start pairing' })
    }
  } catch (e) {
    return res.status(502).json({ error: 'Pairing service unavailable' })
  }
})

router.get('/code/:sessionId', async (req, res) => {
  try {
    const response = await axios.get(`${PAIR_SITE_URL}/getcode/${req.params.sessionId}`)
    res.json(response.data)
  } catch (e) {
    res.status(502).json({ error: 'Pairing service unavailable' })
  }
})

module.exports = router
