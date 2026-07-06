import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import AuthWrapper from './components/auth/AuthWrapper'
import DesktopSetupScreen from './components/desktop/DesktopSetupScreen'
import { CourseWrapper } from '../contexts/CourseContext'
import { hasApiBase, initApiBase, isDesktopApp } from './config/api'
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
          <RouterProvider router={router} />
        </CourseWrapper>
      </AuthWrapper>
    </StrictMode>
  )
}

function Bootstrap() {
  const [ready, setReady] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)

  useEffect(() => {
    async function prepareDesktop() {
      await initApiBase()

      if (isDesktopApp() && !hasApiBase()) {
        setNeedsSetup(true)
      }

      setReady(true)
    }

    prepareDesktop()
  }, [])

  if (!ready) {
    return null
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
