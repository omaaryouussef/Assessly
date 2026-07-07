const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('assesslyDesktop', {
  isDesktop: true,
  getApiBaseUrl: () => ipcRenderer.invoke('config:get-api-base-url'),
  setApiBaseUrl: (url) => ipcRenderer.invoke('config:set-api-base-url', url),
  getDefaultLocalApiUrl: () => ipcRenderer.invoke('config:get-default-local-url'),
  getPlatform: () => ipcRenderer.invoke('config:get-platform'),

  startLocalServer: () => ipcRenderer.invoke('local-server:start'),
  stopLocalServer: () => ipcRenderer.invoke('local-server:stop'),
  getLocalServerStatus: () => ipcRenderer.invoke('local-server:status'),

  precheckLockdownEnvironment: (profile) =>
    ipcRenderer.invoke('lockdown:precheck', profile),
  startLockdown: (profile) => ipcRenderer.invoke('lockdown:start', profile),
  stopLockdown: () => ipcRenderer.invoke('lockdown:stop'),
  isLockdownActive: () => ipcRenderer.invoke('lockdown:is-active'),
  enterExamPresentation: () => ipcRenderer.invoke('exam:enter-presentation'),
  exitExamPresentation: () => ipcRenderer.invoke('exam:exit-presentation'),
  onLockdownViolation: (callback) => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('lockdown:violation', listener)
    return () => ipcRenderer.removeListener('lockdown:violation', listener)
  },
})
