import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' }
})

// Inject token automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('gd_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('gd_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
