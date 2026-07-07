import { screen, systemPreferences } from 'electron'
import {
  enableNetworkFilter,
  disableNetworkFilter,
} from './networkFilter.js'
import {
  findForbiddenProcesses,
  startProcessMonitor,
  stopProcessMonitor,
} from './processMonitor.js'
import {
  startShortcutBlocker,
  stopShortcutBlocker,
} from './shortcutBlocker.js'

export class LockdownManager {
  constructor(getMainWindow, emitViolation) {
    this.getMainWindow = getMainWindow
    this.emitViolation = emitViolation
    this.active = false
    this.presentationActive = false
    this.profile = null
    this.savedWindowState = null
    this.windowHandlers = null
    this.devtoolsBlocker = null
    this.containmentApplied = false
    this.contentProtectionApplied = false
    this.lastViolationAt = new Map()
  }

  needsLockdown(profile) {
    if (!profile) {
      return false
    }

    return (
      profile.windowSwitching === false ||
      profile.clipboardAccess === false ||
      profile.screenSnapshot === false ||
      profile.networkRestriction === true ||
      profile.processMonitoring === true
    )
  }

  shouldContainWindows() {
    return this.profile?.windowSwitching === false
  }

  async precheck(profile) {
    const issues = []

    if (!this.needsLockdown(profile)) {
      return { ok: true, issues }
    }

    if (process.platform === 'darwin') {
      const trusted = systemPreferences.isTrustedAccessibilityClient(false)
      if (!trusted) {
        const prompted = systemPreferences.isTrustedAccessibilityClient(true)
        if (!prompted) {
          issues.push({
            code: 'ACCESSIBILITY_REQUIRED',
            message:
              'macOS Accessibility permission is required for exam lockdown. Open System Settings → Privacy & Security → Accessibility and enable Assessly.',
          })
        }
      }
    }

    if (profile.processMonitoring) {
      const forbidden = await findForbiddenProcesses()
      if (forbidden.length > 0) {
        issues.push({
          code: 'FORBIDDEN_PROCESSES',
          message: `Close these applications before starting: ${forbidden.join(', ')}`,
          metadata: { processes: forbidden },
        })
      }
    }

    return {
      ok: issues.length === 0,
      issues,
    }
  }

  reportViolation(payload) {
    const key = `${payload.eventType}:${JSON.stringify(payload.metadata ?? {})}`
    const now = Date.now()
    const lastAt = this.lastViolationAt.get(key) ?? 0
    if (now - lastAt < 2000) {
      return
    }
    this.lastViolationAt.set(key, now)
    this.emitViolation?.(payload)
    this.reclaimFocus()
  }

  reclaimFocus() {
    if (!this.shouldContainWindows()) {
      return
    }

    const mainWindow = this.getMainWindow()
    if (!mainWindow || mainWindow.isDestroyed()) {
      return
    }

    if (!mainWindow.isVisible()) {
      mainWindow.show()
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    const display = screen.getDisplayMatching(mainWindow.getBounds())
    mainWindow.setMinimumSize(0, 0)
    mainWindow.setBounds(display.bounds)
    mainWindow.setMenuBarVisibility(false)
    mainWindow.setAlwaysOnTop(true, 'screen-saver')
    mainWindow.setFullScreen(true)
    mainWindow.setKiosk(true)
    mainWindow.moveTop()
    mainWindow.focus()
    mainWindow.webContents.focus()
  }

  applyWindowPolicies() {
    const mainWindow = this.getMainWindow()
    if (!mainWindow || mainWindow.isDestroyed()) {
      return
    }

    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools()
    }

    const containWindows = this.shouldContainWindows()

    if (containWindows && !this.savedWindowState) {
      this.savedWindowState = {
        closable: mainWindow.isClosable(),
        minimizable: mainWindow.isMinimizable(),
        resizable: mainWindow.isResizable(),
        fullScreen: mainWindow.isFullScreen(),
        kiosk: mainWindow.isKiosk(),
        alwaysOnTop: mainWindow.isAlwaysOnTop(),
        bounds: mainWindow.getBounds(),
        minimumSize: mainWindow.getMinimumSize(),
      }
    }

    if (containWindows && !this.containmentApplied) {
      const display = screen.getPrimaryDisplay()
      mainWindow.setMinimumSize(0, 0)
      mainWindow.setBounds(display.bounds)
      mainWindow.setMenuBarVisibility(false)
      mainWindow.setClosable(false)
      mainWindow.setMinimizable(false)
      mainWindow.setResizable(false)
      mainWindow.setAlwaysOnTop(true, 'screen-saver')
      mainWindow.setFullScreen(true)
      mainWindow.setKiosk(true)
      this.containmentApplied = true
    }

    if (this.profile?.screenSnapshot === false && !this.contentProtectionApplied) {
      mainWindow.setContentProtection(true)
      this.contentProtectionApplied = true
    }

    if (this.devtoolsBlocker) {
      return
    }

    const handleEscape = () => {
      this.reclaimFocus()
    }

    if (containWindows) {
      mainWindow.on('blur', handleEscape)
      mainWindow.on('hide', handleEscape)
      mainWindow.on('minimize', handleEscape)
      this.windowHandlers = { handleEscape }
    }

    this.devtoolsBlocker = (event, input) => {
      const key = String(input.key || '').toLowerCase()
      const blocked =
        key === 'f12' ||
        (input.control && input.shift && key === 'i') ||
        (input.control && input.shift && key === 'j') ||
        (input.control && key === 'r') ||
        (input.meta && input.alt && key === 'i')

      if (blocked) {
        event.preventDefault()
        this.reportViolation({
          eventType: 'FOCUS_ESCAPE_ATTEMPT',
          severity: 'warning',
          metadata: { reason: 'devtools_shortcut', key },
        })
      }
    }

    mainWindow.webContents.on('before-input-event', this.devtoolsBlocker)
  }

  clearWindowPolicies() {
    const mainWindow = this.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed() && this.windowHandlers) {
      mainWindow.removeListener('blur', this.windowHandlers.handleEscape)
      mainWindow.removeListener('hide', this.windowHandlers.handleEscape)
      mainWindow.removeListener('minimize', this.windowHandlers.handleEscape)
    }

    if (mainWindow && !mainWindow.isDestroyed() && this.devtoolsBlocker) {
      mainWindow.webContents.removeListener(
        'before-input-event',
        this.devtoolsBlocker,
      )
      this.devtoolsBlocker = null
    }

    if (
      mainWindow &&
      !mainWindow.isDestroyed() &&
      this.containmentApplied &&
      this.savedWindowState
    ) {
      mainWindow.setKiosk(false)
      mainWindow.setFullScreen(false)
      mainWindow.setAlwaysOnTop(this.savedWindowState.alwaysOnTop)
      mainWindow.setClosable(this.savedWindowState.closable)
      mainWindow.setMinimizable(this.savedWindowState.minimizable)
      mainWindow.setResizable(this.savedWindowState.resizable)
      if (this.savedWindowState.minimumSize) {
        mainWindow.setMinimumSize(
          this.savedWindowState.minimumSize[0],
          this.savedWindowState.minimumSize[1],
        )
      }
      mainWindow.setBounds(this.savedWindowState.bounds)
      mainWindow.setMenuBarVisibility(true)
    }

    if (mainWindow && !mainWindow.isDestroyed() && this.contentProtectionApplied) {
      mainWindow.setContentProtection(false)
    }

    this.savedWindowState = null
    this.windowHandlers = null
    this.containmentApplied = false
    this.contentProtectionApplied = false
  }

  enterPresentationMode() {
    if (this.presentationActive) {
      if (this.shouldContainWindows()) {
        this.reclaimFocus()
      }
      return { ok: true }
    }

    this.presentationActive = true
    this.applyWindowPolicies()

    if (this.shouldContainWindows()) {
      startShortcutBlocker((payload) => this.reportViolation(payload))
      this.reclaimFocus()
    }

    return { ok: true }
  }

  exitPresentationMode() {
    if (this.active) {
      return { ok: true }
    }

    if (!this.presentationActive) {
      return { ok: true }
    }

    stopShortcutBlocker()
    this.clearWindowPolicies()
    this.presentationActive = false
    this.lastViolationAt.clear()
    return { ok: true }
  }

  async start(profile) {
    if (this.active) {
      await this.stop()
    }

    const precheck = await this.precheck(profile)
    if (!precheck.ok) {
      return { ok: false, ...precheck }
    }

    if (!this.needsLockdown(profile)) {
      return { ok: true, issues: [] }
    }

    this.profile = profile
    this.active = true

    this.enterPresentationMode()

    if (profile.networkRestriction) {
      enableNetworkFilter(profile.apiBaseUrl)
    }

    if (profile.processMonitoring) {
      startProcessMonitor((payload) => this.reportViolation(payload))
    }

    return { ok: true, issues: [] }
  }

  async stop() {
    if (!this.active && !this.presentationActive) {
      return { ok: true }
    }

    try {
      stopShortcutBlocker()
      stopProcessMonitor()
      disableNetworkFilter()
      this.clearWindowPolicies()
    } catch (error) {
      console.error('Error while stopping lockdown:', error)
    }

    this.active = false
    this.presentationActive = false
    this.profile = null
    this.lastViolationAt.clear()
    return { ok: true }
  }

  isActive() {
    return this.active || this.presentationActive
  }
}
