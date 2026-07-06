import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getApiBaseUrl,
  getDefaultLocalApiUrl,
  setApiBaseUrl,
} from './config.js'
import { registerAppProtocol, registerPrivilegedScheme } from './protocol.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'

registerPrivilegedScheme()

function getWebClientDistPath() {
  if (isDev) {
    return path.resolve(__dirname, '../../../web-client/dist')
  }

  return path.join(process.resourcesPath, 'web-client')
}

function getPreloadPath() {
  return path.join(__dirname, '../preload/index.js')
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  Menu.setApplicationMenu(null)

  if (isDev) {
    mainWindow.loadURL(DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadURL('app://assessly/index.html')
  }

  return mainWindow
}

function registerIpcHandlers() {
  ipcMain.handle('config:get-api-base-url', () => getApiBaseUrl())
  ipcMain.handle('config:set-api-base-url', (_event, url) => setApiBaseUrl(url))
  ipcMain.handle('config:get-default-local-url', () => getDefaultLocalApiUrl())
  ipcMain.handle('config:get-platform', () => process.platform)
}

app.whenReady().then(() => {
  if (!isDev) {
    registerAppProtocol(getWebClientDistPath())
  }

  registerIpcHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})




