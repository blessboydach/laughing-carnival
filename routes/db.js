// db.js
const { createClient } = require('@libsql/client')
const crypto = require('crypto')

const TURSO_DB_URL = 'libsql://vangdashboard-vangdashboard.aws-ap-south-1.turso.io'
const TURSO_DB_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODg3NjQ4MzgsImlkIjoiMDFhMDdhYjAtNjkwMS03YmE1LWJmNzEtMDY4MDJkOThiODBhIiwia2lkIjoic09qZWVkWEFpV0l6cUZTNzZ5WEJpR3FtN0lhNTlqaUhuTzlSdGRfeWhYdyIsInJpZCI6ImYzZWVkYjdkLWRmNDctNGNlZi1hMzc5LTQ2ZDlhYTg0MDVkZiJ9.ckZ0DsTT0VdLKOy7BxKL9zLdwxX90OF7ppj6G5PXZjE0lwR7MrlcPKnJZfkS8K1AB1Onk115IRTrKKGFFS1vCA'

const db = createClient({
  url: TURSO_DB_URL,
  authToken: TURSO_DB_AUTH_TOKEN
})

async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS panels (
      panel_id TEXT PRIMARY KEY,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tokens (
      token_hash TEXT PRIMARY KEY,
      panel_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'LOGGEDOUT',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (panel_id) REFERENCES panels(panel_id)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS graveyard (
      token_hash TEXT PRIMARY KEY,
      reason TEXT,
      deleted_by TEXT,
      deleted_at TEXT DEFAULT (datetime('now'))
    )
  `)
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

async function getTokenByHash(hash) {
  const result = await db.execute({
    sql: 'SELECT * FROM tokens WHERE token_hash = ?',
    args: [hash]
  })
  return result.rows[0]
}

async function getTokensForPanel(panelId) {
  const result = await db.execute({
    sql: 'SELECT token_hash, status FROM tokens WHERE panel_id = ?',
    args: [panelId]
  })
  return result.rows
}

async function createToken(panelId) {
  const randomPart = crypto.randomBytes(8).toString('hex')
  const panelSuffix = panelId.replace(/[^a-zA-Z0-9]/g, '').slice(-6)
  const token = `vg_${randomPart}_${panelSuffix}`
  const hash = hashToken(token)

  await db.execute({
    sql: 'INSERT OR IGNORE INTO panels (panel_id) VALUES (?)',
    args: [panelId]
  })
  await db.execute({
    sql: 'INSERT INTO tokens (token_hash, panel_id, status) VALUES (?, ?, ?)',
    args: [hash, panelId, 'LOGGEDOUT']
  })
  return token
}

async function deleteToken(tokenHash, reason, deletedBy) {
  await db.execute({
    sql: 'DELETE FROM tokens WHERE token_hash = ?',
    args: [tokenHash]
  })
  await db.execute({
    sql: 'INSERT INTO graveyard (token_hash, reason, deleted_by) VALUES (?, ?, ?)',
    args: [tokenHash, reason, deletedBy]
  })
}

async function isTokenDead(tokenHash) {
  const result = await db.execute({
    sql: 'SELECT 1 FROM graveyard WHERE token_hash = ?',
    args: [tokenHash]
  })
  return result.rows.length > 0
}

module.exports = {
  db,
  initDB,
  hashToken,
  getTokenByHash,
  getTokensForPanel,
  createToken,
  deleteToken,
  isTokenDead
}
