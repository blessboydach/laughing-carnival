// wsHandler.js
const { WebSocketServer } = require('ws')
const { getTokensForPanel } = require('./db')

// panel_id -> socket
const panelSockets = new Map()

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (socket) => {
    socket.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString())

        if (msg.type === 'HELLO') {
          const { panel_id } = msg
          if (!panel_id) {
            socket.send(JSON.stringify({ type: 'ERROR', error: 'panel_id required' }))
            socket.close()
            return
          }

          panelSockets.set(panel_id, socket)
          socket.panel_id = panel_id

          const tokens = await getTokensForPanel(panel_id)
          socket.send(JSON.stringify({
            type: 'TOKENS',
            tokens: tokens
          }))
        }

        if (msg.type === 'STATUS') {
          const { token_hash, status } = msg
          const { db } = require('./db')
          await db.execute({
            sql: 'UPDATE tokens SET status = ? WHERE token_hash = ?',
            args: [status, token_hash]
          })
        }

        if (msg.type === 'PONG') {
          if (socket.pendingPing) {
            clearTimeout(socket.pendingPing.timeout)
            socket.pendingPing.resolve(msg.statuses || {})
            socket.pendingPing = null
          }
        }
      } catch (e) {
        console.error('WS error:', e)
      }
    })

    socket.on('close', () => {
      if (socket.panel_id) {
        panelSockets.delete(socket.panel_id)
      }
    })
  })

  return panelSockets
}

module.exports = { setupWebSocket, panelSockets }
