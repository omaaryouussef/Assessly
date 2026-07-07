import { useCallback, useEffect, useRef, useState } from 'react'
import { getApiBase, getDesktopBridge, isDesktopApp } from '../config/api'
import {
  assessmentRequiresDesktop,
  buildLockdownProfile,
  normalizeSecuritySettings,
} from '../utils/securitySettings'

export function useLockdown({
  assessmentId,
  token,
  securitySettings,
  listenForViolations,
}) {
  const [precheckIssues, setPrecheckIssues] = useState([])
  const [violation, setViolation] = useState(null)
  const [lockdownActive, setLockdownActive] = useState(false)
  const postedEventsRef = useRef(new Set())

  const postViolation = useCallback(
    async (payload) => {
      if (!assessmentId || !token) {
        return
      }

      const dedupeKey = `${payload.eventType}:${JSON.stringify(payload.metadata ?? {})}`
      if (postedEventsRef.current.has(dedupeKey)) {
        return
      }
      postedEventsRef.current.add(dedupeKey)

      try {
        await fetch(
          `${getApiBase()}/api/assessments/${assessmentId}/proctoring-events`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              eventType: payload.eventType,
              severity: payload.severity || 'warning',
              metadata: payload.metadata ?? null,
            }),
          }
        )
      } catch (error) {
        console.error('Failed to post proctoring event', error)
      }
    },
    [assessmentId, token]
  )

  const startLockdown = useCallback(async () => {
    if (!isDesktopApp()) {
      return {
        ok: false,
        issues: [
          {
            code: 'NOT_DESKTOP',
            message: 'This assessment must be taken in the Assessly desktop app.',
          },
        ],
      }
    }

    if (!assessmentRequiresDesktop(securitySettings)) {
      return { ok: true, issues: [] }
    }

    const bridge = getDesktopBridge()
    if (!bridge?.startLockdown) {
      return {
        ok: false,
        issues: [
          {
            code: 'NO_BRIDGE',
            message:
              'Desktop lockdown is unavailable. Fully quit and restart the Assessly desktop app, then try again.',
          },
        ],
      }
    }

    const profile = {
      ...buildLockdownProfile(securitySettings),
      apiBaseUrl: getApiBase(),
    }

    const precheck = await bridge.precheckLockdownEnvironment(profile)
    if (!precheck.ok) {
      setPrecheckIssues(precheck.issues || [])
      return precheck
    }

    const result = await bridge.startLockdown(profile)
    if (!result.ok) {
      setPrecheckIssues(result.issues || [])
      return result
    }

    setPrecheckIssues([])
    setLockdownActive(true)
    return result
  }, [securitySettings])

  const stopLockdown = useCallback(async () => {
    if (!isDesktopApp()) {
      return
    }

    const bridge = getDesktopBridge()
    if (bridge?.stopLockdown) {
      try {
        await bridge.stopLockdown()
      } catch (error) {
        console.error('Failed to stop desktop lockdown:', error)
      }
    }
    setLockdownActive(false)
    postedEventsRef.current.clear()
  }, [])

  useEffect(() => {
    if (!listenForViolations || !isDesktopApp()) {
      return undefined
    }

    const bridge = getDesktopBridge()
    if (!bridge?.onLockdownViolation) {
      return undefined
    }

    const unsubscribe = bridge.onLockdownViolation((payload) => {
      setViolation(payload)
      postViolation(payload)
    })

    return unsubscribe
  }, [listenForViolations, postViolation])

  useEffect(() => {
    return () => {
      if (isDesktopApp()) {
        const bridge = getDesktopBridge()
        bridge?.stopLockdown?.()
      }
    }
  }, [])

  const clearViolation = useCallback(() => {
    setViolation(null)
  }, [])

  const clearPrecheckIssues = useCallback(() => {
    setPrecheckIssues([])
  }, [])

  return {
    lockdownActive,
    precheckIssues,
    violation,
    startLockdown,
    stopLockdown,
    clearViolation,
    clearPrecheckIssues,
    requiresDesktop: assessmentRequiresDesktop(securitySettings),
    normalizedSecurity: normalizeSecuritySettings(securitySettings),
  }
}
