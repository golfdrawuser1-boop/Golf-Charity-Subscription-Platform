import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(() => localStorage.getItem('gd_admin_token'))
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('gd_admin_refresh_token'))

  const setAuthHeader = useCallback((t) => {
    if (t) axios.defaults.headers.common['Authorization'] = `Bearer ${t}`
    else delete axios.defaults.headers.common['Authorization']
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!token) {
        setAdmin(null)
        setLoading(false)
        return
      }

      setAuthHeader(token)

      try {
        const { data } = await axios.get(`${API}/api/auth/me`)

        if (cancelled) return

        // Always check fresh DB role — handles role change in Supabase
        if (data.user?.role !== 'admin') {
          localStorage.removeItem('gd_admin_token')
          localStorage.removeItem('gd_admin_refresh_token')
          setToken(null)
          setAdmin(null)
          setAuthHeader(null)
        } else {
          setAdmin(data.user)
        }
      } catch (err) {
        if (cancelled) return

        // Try refresh on 401
        if (err.response?.status === 401 && refreshToken) {
          try {
            const { data: refreshData } = await axios.post(`${API}/api/auth/refresh`, {
              refresh_token: refreshToken,
            })
            const newToken = refreshData.token
            const newRefresh = refreshData.refresh_token

            localStorage.setItem('gd_admin_token', newToken)
            localStorage.setItem('gd_admin_refresh_token', newRefresh)
            setToken(newToken)
            setRefreshToken(newRefresh)
            setAuthHeader(newToken)

            const { data: retryData } = await axios.get(`${API}/api/auth/me`, {
              headers: { Authorization: `Bearer ${newToken}` }
            })
            if (!cancelled && retryData.user?.role === 'admin') {
              setAdmin(retryData.user)
              return
            }
          } catch { /* fall through to clear */ }
        }

        localStorage.removeItem('gd_admin_token')
        localStorage.removeItem('gd_admin_refresh_token')
        setToken(null)
        setRefreshToken(null)
        setAdmin(null)
        setAuthHeader(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [token, refreshToken, setAuthHeader])

  const login = async (email, password) => {
    localStorage.removeItem('gd_admin_token')
    localStorage.removeItem('gd_admin_refresh_token')
    setAuthHeader(null)

    const { data } = await axios.post(`${API}/api/auth/login`, { email, password })

    // Role check — fresh from DB
    if (data.user?.role !== 'admin') {
      throw new Error('This account does not have admin access. If you just changed the role in Supabase, please log in again.')
    }

    localStorage.setItem('gd_admin_token', data.token)
    if (data.refresh_token) localStorage.setItem('gd_admin_refresh_token', data.refresh_token)

    setAuthHeader(data.token)
    setToken(data.token)
    setRefreshToken(data.refresh_token || null)
    setAdmin(data.user)

    return data.user
  }

  const logout = () => {
    localStorage.removeItem('gd_admin_token')
    localStorage.removeItem('gd_admin_refresh_token')
    setToken(null)
    setRefreshToken(null)
    setAdmin(null)
    setAuthHeader(null)
  }

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
