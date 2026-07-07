const envBase =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || ''

let resolvedBase = envBase

export function isDesktopApp() {
  if (typeof window === 'undefined') {
    return false
  }

  if (window.assesslyDesktop?.isDesktop) {
    return true
  }

  // Fallback when preload bridge is delayed or unavailable in the shell.
  return (
    typeof navigator !== 'undefined' &&
    /Electron/i.test(navigator.userAgent)
  )
}

export function getDesktopBridge() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.assesslyDesktop ?? null
}

export async function initApiBase() {
  if (!isDesktopApp()) {
    return resolvedBase
  }

  const bridge = getDesktopBridge()
  if (!bridge?.getApiBaseUrl) {
    return resolvedBase
  }

  const url = await bridge.getApiBaseUrl()
  if (url) {
    resolvedBase = url
  }

  return resolvedBase
}

export function setResolvedApiBase(url) {
  resolvedBase = String(url || '').replace(/\/$/, '')
}

export function getApiBase() {
  return resolvedBase
}

export function hasApiBase() {
  return Boolean(resolvedBase)
}
