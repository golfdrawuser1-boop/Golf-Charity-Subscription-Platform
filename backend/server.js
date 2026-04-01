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
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  process.env.ADMIN_URL || 'http://localhost:5174',
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true)
    else callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}))

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
