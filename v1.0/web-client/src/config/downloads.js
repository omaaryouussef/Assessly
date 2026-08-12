const GITHUB_OWNER = 'omaaryouussef'
const GITHUB_REPO = 'Assessly'
const DESKTOP_VERSION = '1.0.0'

export function getDesktopDownloads() {
  const releaseBase = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`
  const macUrl = import.meta.env.VITE_DESKTOP_DOWNLOAD_MAC || ''

  return {
    win:
      import.meta.env.VITE_DESKTOP_DOWNLOAD_WIN ||
      `${releaseBase}/latest/download/Assessly-Setup-${DESKTOP_VERSION}.exe`,
    mac: macUrl,
    macAvailable: Boolean(macUrl),
    releasesPage: `${releaseBase}/latest`,
  }
}

export function detectDesktopPlatform() {
  if (typeof navigator === 'undefined') {
    return 'unknown'
  }

  const ua = navigator.userAgent
  if (/Win/i.test(ua)) {
    return 'win'
  }
  if (/Mac/i.test(ua)) {
    return 'mac'
  }
  return 'unknown'
}
