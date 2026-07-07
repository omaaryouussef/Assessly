import { session } from 'electron'

let filterEnabled = false
let allowedHosts = new Set()
let listenerRegistered = false

function isAllowedUrl(urlString) {
  try {
    const parsed = new URL(urlString)
    if (parsed.protocol === 'devtools:') {
      return false
    }
    if (parsed.protocol === 'app:') {
      return true
    }
    if (parsed.protocol === 'file:') {
      return true
    }
    if (parsed.protocol === 'blob:') {
      return true
    }
    if (parsed.protocol === 'data:') {
      return true
    }
    if (['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) {
      return allowedHosts.has(parsed.hostname)
    }
    return false
  } catch {
    return false
  }
}

function onBeforeRequestHandler(details, callback) {
  if (!filterEnabled || isAllowedUrl(details.url)) {
    callback({ cancel: false })
    return
  }
  callback({ cancel: true })
}

function ensureListenerRegistered() {
  if (listenerRegistered) {
    return
  }

  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['<all_urls>'] },
    onBeforeRequestHandler,
  )
  listenerRegistered = true
}

export function enableNetworkFilter(apiBaseUrl) {
  allowedHosts = new Set(['localhost', '127.0.0.1'])

  if (apiBaseUrl) {
    try {
      const parsed = new URL(apiBaseUrl)
      allowedHosts.add(parsed.hostname)
    } catch {
      // ignore invalid API URL
    }
  }

  ensureListenerRegistered()
  filterEnabled = true
}

export function disableNetworkFilter() {
  filterEnabled = false
  allowedHosts = new Set()
}
