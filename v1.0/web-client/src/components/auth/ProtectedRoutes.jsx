import React from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from './AuthWrapper.jsx'
import { Navigate } from 'react-router-dom'
import { isDesktopApp } from '../../config/api.js'

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  if (loading) {
    return null
  }
  return user ? <Outlet /> : <Navigate to={!isDesktopApp() ? "/landing" : "/login"} replace />
}

export default ProtectedRoutes
