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
  const bakedBase = envBase.replace(/\/$/, '')

  if (!bridge?.getApiBaseUrl) {
    return resolvedBase
  }

  const savedUrl = (await bridge.getApiBaseUrl())?.replace(/\/$/, '')

  // Production installers bake the API URL — do not let an old dev setup override it.
  if (bakedBase) {
    resolvedBase = bakedBase
    return resolvedBase
  }

  if (savedUrl) {
    resolvedBase = savedUrl
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
