import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('assesslyDesktop', {
  isDesktop: true,
  getApiBaseUrl: () => ipcRenderer.invoke('config:get-api-base-url'),
  setApiBaseUrl: (url) => ipcRenderer.invoke('config:set-api-base-url', url),
  getDefaultLocalApiUrl: () => ipcRenderer.invoke('config:get-default-local-url'),
  getPlatform: () => ipcRenderer.invoke('config:get-platform'),
})
