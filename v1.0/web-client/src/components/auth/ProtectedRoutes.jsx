import React from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from './AuthWrapper.jsx'
import { Navigate } from 'react-router-dom'
import { isDesktopApp } from '../../config/api.js'
import LoadingPage from '../LoadingPage.jsx'

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  if (loading) {
    return <LoadingPage message="Checking your session…" />
  }
  return user ? (
    <Outlet />
  ) : (
    <Navigate to={!isDesktopApp() ? '/landing' : '/login'} replace />
  )
}

export default ProtectedRoutes
