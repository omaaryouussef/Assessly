import { globalShortcut } from 'electron'

const BLOCKED_SHORTCUTS = [
  'Alt+Tab',
  'Alt+Esc',
  'Alt+F4',
  'Alt+Space',
  'CommandOrControl+Tab',
  'CommandOrControl+Q',
  'CommandOrControl+Shift+Esc',
  'CommandOrControl+Shift+I',
  'CommandOrControl+Shift+J',
  'F11',
  'Super',
  'Meta',
]

const registeredShortcuts = new Set()

export function startShortcutBlocker(onBlocked) {
  stopShortcutBlocker()

  for (const accelerator of BLOCKED_SHORTCUTS) {
    try {
      const registered = globalShortcut.register(accelerator, () => {
        onBlocked?.({
          eventType: 'FOCUS_ESCAPE_ATTEMPT',
          severity: 'warning',
          metadata: { shortcut: accelerator },
        })
      })

      if (registered) {
        registeredShortcuts.add(accelerator)
      }
    } catch (error) {
      console.warn(`Could not register shortcut ${accelerator}:`, error.message)
    }
  }
}

export function stopShortcutBlocker() {
  for (const accelerator of registeredShortcuts) {
    try {
      globalShortcut.unregister(accelerator)
    } catch {
      // ignore unregister errors
    }
  }
  registeredShortcuts.clear()
}
