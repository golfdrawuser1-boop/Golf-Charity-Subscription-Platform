import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(() => localStorage.getItem('gd_token'))
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('gd_refresh_token'))

  // Keep axios header in sync with token
  const setAuthHeader = useCallback((t) => {
    if (t) axios.defaults.headers.common['Authorization'] = `Bearer ${t}`
    else delete axios.defaults.headers.common['Authorization']
  }, [])

  // Load user from token on mount / token change
  useEffect(() => {
    let cancelled = false

    const loadUser = async () => {
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }

      setAuthHeader(token)

      try {
        const { data } = await axios.get(`${API}/api/auth/me`)
        if (!cancelled) setUser(data.user)
      } catch (err) {
        if (cancelled) return

        // If 401 and we have a refresh token, try to refresh
        if (err.response?.status === 401 && refreshToken) {
          try {
            const { data: refreshData } = await axios.post(`${API}/api/auth/refresh`, {
              refresh_token: refreshToken,
            })
            const newToken = refreshData.token
            const newRefresh = refreshData.refresh_token

            localStorage.setItem('gd_token', newToken)
            localStorage.setItem('gd_refresh_token', newRefresh)
            setToken(newToken)
            setRefreshToken(newRefresh)
            setAuthHeader(newToken)

            // Retry /me with new token
            const { data: retryData } = await axios.get(`${API}/api/auth/me`, {
              headers: { Authorization: `Bearer ${newToken}` }
            })
            if (!cancelled) setUser(retryData.user)
            return
          } catch {
            // Refresh also failed — clear everything
          }
        }

        // Token invalid and cannot refresh — clear
        localStorage.removeItem('gd_token')
        localStorage.removeItem('gd_refresh_token')
        setToken(null)
        setRefreshToken(null)
        setUser(null)
        setAuthHeader(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadUser()
    return () => { cancelled = true }
  }, [token, refreshToken, setAuthHeader])

  const login = async (email, password) => {
    // Always clear old session before login
    setAuthHeader(null)

    const { data } = await axios.post(`${API}/api/auth/login`, { email, password })

    const newToken = data.token
    const newRefresh = data.refresh_token

    localStorage.setItem('gd_token', newToken)
    if (newRefresh) localStorage.setItem('gd_refresh_token', newRefresh)

    setAuthHeader(newToken)
    setToken(newToken)
    setRefreshToken(newRefresh || null)
    setUser(data.user)

    return data.user
  }

  const register = async (formData) => {
    setAuthHeader(null)

    const { data } = await axios.post(`${API}/api/auth/register`, formData)

    if (!data.token) {
      // Account created but auto-login failed — return partial user
      return data.user
    }

    localStorage.setItem('gd_token', data.token)
    if (data.refresh_token) localStorage.setItem('gd_refresh_token', data.refresh_token)

    setAuthHeader(data.token)
    setToken(data.token)
    setRefreshToken(data.refresh_token || null)
    setUser(data.user)

    return data.user
  }

  const logout = () => {
    localStorage.removeItem('gd_token')
    localStorage.removeItem('gd_refresh_token')
    setToken(null)
    setRefreshToken(null)
    setUser(null)
    setAuthHeader(null)
  }

  const updateUser = (updates) => setUser(prev => ({ ...prev, ...updates }))

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
