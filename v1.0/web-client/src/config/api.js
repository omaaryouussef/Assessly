const envBase =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || ''

let resolvedBase = envBase

export function isDesktopApp() {
  return typeof window !== 'undefined' && Boolean(window.assesslyDesktop?.isDesktop)
}

export async function initApiBase() {
  if (!isDesktopApp()) {
    return resolvedBase
  }

  const url = await window.assesslyDesktop.getApiBaseUrl()
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
