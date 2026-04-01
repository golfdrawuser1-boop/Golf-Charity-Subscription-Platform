require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')

const app = express()

// =====================
// TRUST PROXY
// =====================
app.set('trust proxy', 1)

// =====================
// SECURITY MIDDLEWARE
// =====================
app.use(helmet())

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
})
app.use('/api', limiter)

// =====================
// CORS — all origins hardcoded + env fallback, trailing slashes stripped
// =====================
const allowedOrigins = [
  'https://golf-charity-subscription-platform-pi-jet.vercel.app',
  'https://golfcharity-admin.vercel.app',
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  'http://localhost:5173',
  'http://localhost:5174',
]
  .filter(Boolean)
  .map(o => o.replace(/\/$/, '').replace(/\/login$/, '')) // strip trailing slash AND /login suffix

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    const cleanOrigin = origin.replace(/\/$/, '')
    if (allowedOrigins.includes(cleanOrigin)) return callback(null, true)
    console.warn(`CORS blocked: ${origin}`)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))

// =====================
// BODY PARSERS
// =====================
app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// =====================
// LOGGING
// =====================
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// =====================
// HEALTH CHECK
// =====================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    project: 'Golf Charity Subscription Platform',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  })
})

// =====================
// API ROUTES
// =====================
app.use('/api/auth',          require('./routes/auth'))
app.use('/api/users',         require('./routes/users'))
app.use('/api/scores',        require('./routes/scores'))
app.use('/api/subscriptions', require('./routes/subscriptions'))
app.use('/api/charities',     require('./routes/charities'))
app.use('/api/draws',         require('./routes/draws'))
app.use('/api/winners',       require('./routes/winners'))
app.use('/api/admin',         require('./routes/admin'))

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
      : err.message,
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
  Server  : http://localhost:${PORT}
  Health  : http://localhost:${PORT}/health
  Env     : ${process.env.NODE_ENV || 'development'}
  Origins : ${allowedOrigins.join(' | ')}
  ====================================
  `)
})

module.exports = app
