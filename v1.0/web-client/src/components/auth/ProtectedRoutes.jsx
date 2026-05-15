import React from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from './AuthWrapper.jsx'
import { Navigate } from 'react-router-dom'

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  if (loading) {
    return null
  }
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

export default ProtectedRoutes
