import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import AuthWrapper from './components/auth/AuthWrapper'
import DesktopSetupScreen from './components/desktop/DesktopSetupScreen'
import { CourseWrapper } from '../contexts/CourseContext'
import { ExamLockdownProvider } from './contexts/ExamLockdownContext'
import { hasApiBase, initApiBase, isDesktopApp } from './config/api'
import './config/monacoSetup'
import '@fortawesome/fontawesome-free/css/all.min.css'
import './components/components.css'
import './pages/pages.css'
import './index.css'
import router from './router'

function AppRoot() {
  return (
    <StrictMode>
      <AuthWrapper>
        <CourseWrapper>
          <ExamLockdownProvider>
            <RouterProvider router={router} />
          </ExamLockdownProvider>
        </CourseWrapper>
      </AuthWrapper>
    </StrictMode>
  )
}

function Bootstrap() {
  const [ready, setReady] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [missingProductionApi, setMissingProductionApi] = useState(false)

  useEffect(() => {
    async function prepareDesktop() {
      await initApiBase()

      if (isDesktopApp() && !hasApiBase()) {
        if (import.meta.env.DEV) {
          setNeedsSetup(true)
        } else {
          setMissingProductionApi(true)
        }
      }

      setReady(true)
    }

    prepareDesktop()
  }, [])

  if (!ready) {
    return null
  }

  if (missingProductionApi) {
    return (
      <div className="desktop-setup">
        <div className="desktop-setup__card">
          <h1>Assessly desktop</h1>
          <p className="desktop-setup__error">
            This installer was built without a server URL. Contact your instructor
            or reinstall from an official download link.
          </p>
        </div>
      </div>
    )
  }

  if (needsSetup) {
    return (
      <DesktopSetupScreen
        onComplete={() => {
          setNeedsSetup(false)
        }}
      />
    )
  }

  return <AppRoot />
}

createRoot(document.getElementById('root')).render(<Bootstrap />)
