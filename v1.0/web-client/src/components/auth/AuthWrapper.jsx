import React from 'react'
import { Outlet } from 'react-router-dom'
import { useContext, createContext, useState, useEffect } from 'react'
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL
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
        const response = await fetch(`${API_BASE}/api/users/user`, {
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
      const response = await fetch(`${API_BASE}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
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

  const register = async (email, password, name, auc_id, role) => {
    try {
      const response = await fetch(`${API_BASE}/api/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name, auc_id, role }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }
      if (data.error) {
        throw new Error(data.error)
      }
      const { user, token } = data
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
  const logout = () => {
    localStorage.removeItem('user_token')
    setUser(null)
    setToken(null)
    setIsAuthenticated(false)
    setLoading(false)
    return
  }

  const value = {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  return useContext(AuthContext)
}

export default AuthWrapper
