import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getApiBaseUrl, setApiBaseUrl } from './config.js'
import { LockdownManager } from './lockdown/LockdownManager.js'
import { registerAppProtocol, registerPrivilegedScheme } from './protocol.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'

registerPrivilegedScheme()

let mainWindow = null
let lockdownManager = null

function getWebClientDistPath() {
  if (isDev) {
    return path.resolve(__dirname, '../../../web-client/dist')
  }

  return path.join(process.resourcesPath, 'web-client')
}

function getPreloadPath() {
  return path.join(__dirname, '../preload/index.cjs')
}

function emitLockdownViolation(payload) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return
  }

  mainWindow.webContents.send('lockdown:violation', payload)
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    fullscreenable: true,
    frame: true,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  Menu.setApplicationMenu(null)

  if (isDev) {
    mainWindow.loadURL(DEV_SERVER_URL)
  } else {
    mainWindow.loadURL('app://assessly/index.html')
  }

  return mainWindow
}

function registerIpcHandlers() {
  ipcMain.handle('config:get-api-base-url', () => getApiBaseUrl())
  ipcMain.handle('config:set-api-base-url', (_event, url) => setApiBaseUrl(url))
  ipcMain.handle('config:get-platform', () => process.platform)

  ipcMain.handle('lockdown:precheck', async (_event, profile) => {
    if (!lockdownManager) {
      return { ok: true, issues: [] }
    }
    return lockdownManager.precheck({
      ...profile,
      apiBaseUrl: profile?.apiBaseUrl || getApiBaseUrl(),
    })
  })

  ipcMain.handle('lockdown:start', async (_event, profile) => {
    if (!lockdownManager) {
      return { ok: false, issues: [{ code: 'NO_MANAGER', message: 'Lockdown unavailable' }] }
    }

    return lockdownManager.start({
      ...profile,
      apiBaseUrl: profile?.apiBaseUrl || getApiBaseUrl(),
    })
  })

  ipcMain.handle('lockdown:stop', async () => {
    try {
      if (lockdownManager) {
        await lockdownManager.stop()
      }
    } catch (error) {
      console.error('lockdown:stop failed:', error)
    }
    return { ok: true }
  })

  ipcMain.handle('lockdown:is-active', () => Boolean(lockdownManager?.isActive()))

  ipcMain.handle('exam:enter-presentation', () => {
    if (!lockdownManager) {
      return { ok: false }
    }
    return lockdownManager.enterPresentationMode()
  })

  ipcMain.handle('exam:exit-presentation', () => {
    if (!lockdownManager) {
      return { ok: false }
    }
    return lockdownManager.exitPresentationMode()
  })
}

app.whenReady().then(() => {
  if (!isDev) {
    registerAppProtocol(getWebClientDistPath())
  }

  lockdownManager = new LockdownManager(
    () => mainWindow,
    emitLockdownViolation,
  )

  registerIpcHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('before-quit', async () => {
  if (lockdownManager) {
    await lockdownManager.stop()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
