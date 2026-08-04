import React from 'react'
import { Outlet } from 'react-router-dom'
import { useContext, createContext, useState, useEffect } from 'react'
import { getApiBase } from '../../config/api'
const AuthContext = createContext()

function AuthWrapper({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    async function checkAuth() {
      try {
        const token = localStorage.getItem('user_token')
        if (!token || token === 'undefined') {
          setIsAuthenticated(false)
          setUser(null)
          setToken(null)
          return
        }
        const response = await fetch(`${getApiBase()}/api/users/user`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!response.ok) {
          localStorage.removeItem('user_token')
          setIsAuthenticated(false)
          setUser(null)
          setToken(null)
          return
        }
        const data = await response.json()
        if (data.error) {
          throw new Error(data.error)
        }

        if (token && data) {
          setUser(data)
          setToken(token)
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
        }
      } catch (error) {
        localStorage.removeItem('user_token')
        setIsAuthenticated(false)
        setUser(null)
        setToken(null)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  const login = async (email, password) => {
    try {
      const response = await fetch(`${getApiBase()}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (data.needVerification) {
        return { needVerification: true }
      }
      if (!response.ok) {
        throw new Error(data.error || 'Failed to login')
      }
      if (data.error) {
        throw new Error(data.error)
      }
      const { token, user } = data
      localStorage.setItem('user_token', token)
      setUser(user)
      setToken(token)
      setIsAuthenticated(true)
      setLoading(false)
      return { token, user }
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const googleLogin = () => {
    window.location.assign(`${getApiBase()}/api/users/auth/google`)
  }

  const register = async (email, password, name, auc_id, role, department) => {
    try {
      const response = await fetch(`${getApiBase()}/api/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name, auc_id, role, department }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }
      if (data.error) {
        throw new Error(data.error)
      }
      return data
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('user_token')
    setUser(null)
    setToken(null)
    setIsAuthenticated(false)
    setLoading(false)
    return
  }

  const acceptToken = async (incomingToken) => {
    if (!incomingToken || incomingToken === 'undefined') {
      throw new Error('Missing auth token')
    }

    try {
      localStorage.setItem('user_token', incomingToken)
      const response = await fetch(`${getApiBase()}/api/users/user`, {
        headers: {
          Authorization: `Bearer ${incomingToken}`,
        },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to authenticate')
      }
      if (data.error) {
        throw new Error(data.error)
      }

      setUser(data)
      setToken(incomingToken)
      setIsAuthenticated(true)
      setLoading(false)
      return { token: incomingToken, user: data }
    } catch (error) {
      localStorage.removeItem('user_token')
      setUser(null)
      setToken(null)
      setIsAuthenticated(false)
      setLoading(false)
      throw error
    }
  }

  const completeGoogleProfile = async (
    pendingToken,
    { auc_id, department }
  ) => {
    try {
      const response = await fetch(
        `${getApiBase()}/api/users/google/complete-profile`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pending: pendingToken,
            auc_id,
            department,
          }),
        }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete profile')
      }
      if (data.error) {
        throw new Error(data.error)
      }
      const { token, user } = data
      localStorage.setItem('user_token', token)
      setUser(user)
      setToken(token)
      setIsAuthenticated(true)
      setLoading(false)
      return { token, user }
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const verifyEmail = async (email, code) => {
    try {
      const response = await fetch(`${getApiBase()}/api/users/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Verification failed')
      }
      if (data.error) {
        throw new Error(data.error)
      }
      const { token, user } = data
      localStorage.setItem('user_token', token)
      setUser(user)
      setToken(token)
      setIsAuthenticated(true)
      setLoading(false)
      return { token, user }
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const value = {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    googleLogin,
    acceptToken,
    completeGoogleProfile,
    verifyEmail,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  return useContext(AuthContext)
}

export default AuthWrapper
