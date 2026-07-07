import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ExamLockdownContext = createContext(null)

export function ExamLockdownProvider({ children }) {
  const [examModeActive, setExamModeActive] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.examMode = examModeActive ? 'true' : 'false'
    if (examModeActive) {
      document.documentElement.dataset.sidebar = 'hidden'
    }

    if (!examModeActive) {
      return undefined
    }

    window.history.pushState(null, '', window.location.href)
    const blockBackNavigation = () => {
      window.history.pushState(null, '', window.location.href)
    }
    window.addEventListener('popstate', blockBackNavigation)

    return () => {
      document.documentElement.dataset.examMode = 'false'
      window.removeEventListener('popstate', blockBackNavigation)
    }
  }, [examModeActive])

  const value = useMemo(
    () => ({
      examModeActive,
      setExamModeActive,
    }),
    [examModeActive]
  )

  return (
    <ExamLockdownContext.Provider value={value}>
      {children}
    </ExamLockdownContext.Provider>
  )
}

export function useExamLockdown() {
  const context = useContext(ExamLockdownContext)
  if (!context) {
    throw new Error('useExamLockdown must be used within ExamLockdownProvider')
  }
  return context
}
