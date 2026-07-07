export function normalizeSecuritySettings(raw) {
  if (!raw) {
    return {
      windowSwitching: false,
      clipboardAccess: false,
      screenSnapshot: false,
      questionStats: false,
      networkRestriction: false,
      processMonitoring: false,
    }
  }

  return {
    windowSwitching: Boolean(raw.windowswitching ?? raw.windowSwitching),
    clipboardAccess: Boolean(raw.clipboardaccess ?? raw.clipboardAccess),
    screenSnapshot: Boolean(raw.screensnapshot ?? raw.screenSnapshot),
    questionStats: Boolean(raw.questionstats ?? raw.questionStats),
    networkRestriction: Boolean(
      raw.networkrestriction ?? raw.networkRestriction
    ),
    processMonitoring: Boolean(raw.processmonitoring ?? raw.processMonitoring),
  }
}

export function assessmentRequiresDesktop(settings) {
  const normalized = normalizeSecuritySettings(settings)
  return (
    !normalized.windowSwitching ||
    !normalized.clipboardAccess ||
    !normalized.screenSnapshot ||
    normalized.networkRestriction ||
    normalized.processMonitoring
  )
}

export function buildLockdownProfile(settings) {
  const normalized = normalizeSecuritySettings(settings)
  return {
    windowSwitching: normalized.windowSwitching,
    clipboardAccess: normalized.clipboardAccess,
    screenSnapshot: normalized.screenSnapshot,
    networkRestriction: normalized.networkRestriction,
    processMonitoring: normalized.processMonitoring,
    apiBaseUrl: '',
  }
}
