import psList from 'ps-list'
import { isForbiddenProcess } from './forbiddenProcesses.js'

let monitorInterval = null
let onViolation = null

export function startProcessMonitor(callback, intervalMs = 3000) {
  stopProcessMonitor()
  onViolation = callback

  monitorInterval = setInterval(async () => {
    try {
      const processes = await psList()
      const forbidden = processes
        .map((process) => process.name)
        .filter((name) => isForbiddenProcess(name))

      if (forbidden.length > 0) {
        onViolation?.({
          eventType: 'FORBIDDEN_PROCESS',
          severity: 'warning',
          metadata: { processes: [...new Set(forbidden)] },
        })
      }
    } catch (error) {
      console.error('Process monitor failed:', error)
    }
  }, intervalMs)
}

export function stopProcessMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval)
    monitorInterval = null
  }
  onViolation = null
}

export async function findForbiddenProcesses() {
  const processes = await psList()
  return [
    ...new Set(
      processes
        .map((process) => process.name)
        .filter((name) => isForbiddenProcess(name)),
    ),
  ]
}
