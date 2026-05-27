import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthWrapper.jsx'

function RoleGuard({ allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return null
  }

  if (user?.role && allowedRoles.includes(user.role)) {
    return <Outlet />
  }

  return (
    <Navigate
      to="/courses"
      replace
      state={{ message: 'You do not have access to this page.' }}
    />
  )
}

export default RoleGuard
