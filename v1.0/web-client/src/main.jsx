import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import AuthWrapper from './components/auth/AuthWrapper'
import { CourseWrapper } from '../contexts/CourseContext'
import '@fortawesome/fontawesome-free/css/all.min.css'
import './components/components.css';
import './pages/pages.css';
import './index.css';
import router from './router'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthWrapper>
      <CourseWrapper>
      <RouterProvider router={router} />
      </CourseWrapper>
    </AuthWrapper>
  </StrictMode>,
)
