let currentToken = ''
let currentSessionId = ''

async function checkToken() {
  const token = document.getElementById('token').value.trim()
  if (!token) {
    showStatus('Please enter your token', 'error')
    return
  }
  currentToken = token
  showLoader(true)
  hideStatus()

  const res = await fetch('/dashboard/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  })
  const data = await res.json()
  showLoader(false)

  if (data.status === 'TOKEN_DEAD') {
    showStatus('This token has been deleted by the master.', 'error')
  } else if (data.status === 'TOKEN_NOT_FOUND') {
    showStatus('Token not found. Please check and try again.', 'error')
  } else if (data.status === 'PANEL_DEAD') {
    showStatus('Panel is offline. Cannot pair at the moment.', 'error')
  } else if (data.status === 'HANDSHAKE_ACTIVE') {
    showStatus('Panel is online. You can pair now.', 'success')
    showPairSection()
  } else if (data.status === 'LOGGEDOUT') {
    showStatus('Your bot is logged out. Re-pair to get back online.', 'info')
    showPairSection()
  } else {
    showStatus('Unknown status: ' + data.status, 'error')
  }
}

function showPairSection() {
  document.getElementById('pairSection').classList.remove('hidden')
}

function hidePairSection() {
  document.getElementById('pairSection').classList.add('hidden')
}

async function requestPair() {
  const phone = document.getElementById('phone').value.trim()
  if (!phone || phone.length < 9) {
    showStatus('Please enter a valid phone number', 'error')
    return
  }

  showLoader(true)
  const res = await fetch('/dashboard/pair', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: currentToken, phone })
  })
  const data = await res.json()
  showLoader(false)

  if (data.success) {
    currentSessionId = data.sessionId
    pollForCode()
  } else {
    showStatus(data.error || 'Pairing failed', 'error')
  }
}

async function pollForCode() {
  const pairResult = document.getElementById('pairResult')
  pairResult.innerHTML = '<p>Waiting for code...</p>'
  
  const interval = setInterval(async () => {
    const res = await fetch(`/dashboard/code/${currentSessionId}`)
    const data = await res.json()
    if (data.code) {
      clearInterval(interval)
      pairResult.innerHTML = `
        <div style="font-size:32px;letter-spacing:8px;font-weight:600;">${data.code}</div>
        <button class="copy-btn" onclick="copyCode('${data.code}')">📋 Copy Code</button>
      `
    } else if (data.error) {
      clearInterval(interval)
      pairResult.innerHTML = `<p style="color:#e11d48">${data.error}</p>`
    }
  }, 3000)
}

function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    alert('Code copied!')
  })
}

function showStatus(message, type) {
  const el = document.getElementById('statusMessage')
  el.textContent = message
  el.className = `status ${type}`
}

function hideStatus() {
  document.getElementById('statusMessage').classList.add('hidden')
}

function showLoader(show) {
  const loader = document.getElementById('loader')
  if (show) {
    loader.style.display = 'flex'
  } else {
    loader.style.display = 'none'
  }
}
