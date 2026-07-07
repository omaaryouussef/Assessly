export function normalizeSecuritySettings(row) {
  if (!row) {
    return null;
  }

  return {
    windowSwitching: Boolean(row.windowswitching ?? row.windowSwitching),
    clipboardAccess: Boolean(row.clipboardaccess ?? row.clipboardAccess),
    screenSnapshot: Boolean(row.screensnapshot ?? row.screenSnapshot),
    questionStats: Boolean(row.questionstats ?? row.questionStats),
    networkRestriction: Boolean(
      row.networkrestriction ?? row.networkRestriction,
    ),
    processMonitoring: Boolean(
      row.processmonitoring ?? row.processMonitoring,
    ),
  };
}

export function assessmentRequiresDesktop(securitySettings) {
  const settings = normalizeSecuritySettings(securitySettings);
  if (!settings) {
    return false;
  }

  return (
    !settings.windowSwitching ||
    !settings.clipboardAccess ||
    !settings.screenSnapshot ||
    settings.networkRestriction ||
    settings.processMonitoring
  );
}

export function assessmentNeedsLockdown(securitySettings) {
  return assessmentRequiresDesktop(securitySettings);
}
