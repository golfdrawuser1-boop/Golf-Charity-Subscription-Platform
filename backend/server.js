require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')

const app = express()

// =====================
// SECURITY MIDDLEWARE
// =====================
app.use(helmet())

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Please try again later.' }
})
app.use('/api', limiter)

// =====================
// CORS
// =====================
// Collect all allowed origins from env (supports comma-separated list too)
const rawOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  // Local dev fallbacks (safe to keep — they won't match in production)
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  'http://localhost:4174',
]

// Also support ALLOWED_ORIGINS env var for extra flexibility (comma-separated)
if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach(o => rawOrigins.push(o.trim()))
}

const allowedOrigins = [...new Set(rawOrigins.filter(Boolean))]

console.log('Allowed CORS origins:', allowedOrigins)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, Postman, curl)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    // Return false (block) instead of throwing — avoids unhandled error crashes
    return callback(null, false)
  },
  credentials: true,
  optionsSuccessStatus: 200,
}))

// Handle CORS-blocked preflight cleanly
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && !allowedOrigins.includes(origin) && req.method === 'OPTIONS') {
    return res.status(403).json({ error: 'Not allowed by CORS' })
  }
  next()
})

// =====================
// BODY PARSERS
// Razorpay webhook needs raw body — must come BEFORE express.json()
// =====================
app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// =====================
// LOGGING
// =====================
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

// =====================
// HEALTH CHECK
// =====================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    project: 'Golf Charity Subscription Platform',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  })
})

// =====================
// API ROUTES
// =====================
app.use('/api/auth', require('./routes/auth'))
app.use('/api/users', require('./routes/users'))
app.use('/api/scores', require('./routes/scores'))
app.use('/api/subscriptions', require('./routes/subscriptions'))
app.use('/api/charities', require('./routes/charities'))
app.use('/api/draws', require('./routes/draws'))
app.use('/api/winners', require('./routes/winners'))
app.use('/api/admin', require('./routes/admin'))

// =====================
// 404 HANDLER
// =====================
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found.` })
})

// =====================
// GLOBAL ERROR HANDLER
// =====================
app.use((err, req, res, next) => {
  // Handle CORS errors gracefully
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS: Origin not allowed.' })
  }
  console.error('Unhandled error:', err)
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again.'
      : err.message
  })
})

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`
  ====================================
  Golf Charity Platform - Backend API
  ====================================
  Server: http://localhost:${PORT}
  Health: http://localhost:${PORT}/health
  Env:    ${process.env.NODE_ENV || 'development'}
  Payment: Razorpay
  ====================================
  `)
})

module.exports = app
