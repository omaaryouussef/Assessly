// Executable names only (not substring matches) to avoid false positives like
// msedgewebview2.exe being flagged for "msedge".
const FORBIDDEN_EXECUTABLES = new Set([
  'chrome.exe',
  'msedge.exe',
  'firefox.exe',
  'brave.exe',
  'opera.exe',
  'vivaldi.exe',
  'discord.exe',
  'slack.exe',
  'teams.exe',
  'zoom.exe',
  'chatgpt.exe',
  'cursor.exe',
  'codex.exe',
  'claude setup.exe',
  'visual studio code.exe',
  'vscode.exe',
  'copilot.exe',
  'notion.exe',
  'telegram.exe',
  'whatsapp.exe',
])

// System/runtime processes that must stay running (Electron uses WebView2 on Windows).
const ALLOWED_EXECUTABLES = new Set([
  'msedgewebview2.exe',
  'microsoftedgewebview2.exe',
])

export const FORBIDDEN_PROCESS_NAMES = [...FORBIDDEN_EXECUTABLES]

export function isForbiddenProcess(processName) {
  const normalized = String(processName || '').toLowerCase()

  if (ALLOWED_EXECUTABLES.has(normalized)) {
    return false
  }

  return FORBIDDEN_EXECUTABLES.has(normalized)
}
