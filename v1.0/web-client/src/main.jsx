import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import AuthWrapper from './components/auth/AuthWrapper'
import '@fortawesome/fontawesome-free/css/all.min.css'
import './components/components.css';
import './pages/pages.css';
import './index.css';
import router from './router'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthWrapper>
      <RouterProvider router={router} />
    </AuthWrapper>
  </StrictMode>,
)
