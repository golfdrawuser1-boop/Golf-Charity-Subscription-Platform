require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')

const app = express()

// =====================
// TRUST PROXY
// MUST be set before rate-limiter and any IP-based middleware.
// Render/Railway/Heroku all sit behind a load-balancer that sets
// X-Forwarded-For. Without this, express-rate-limit throws
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR and crashes EVERY /api route
// — including login and register.
// =====================
app.set('trust proxy', 1)

// =====================
// SECURITY MIDDLEWARE
// =====================
app.use(helmet())

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,                  // max requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
})
app.use('/api', limiter)

// =====================
// CORS
// Pull allowed origins from env — falls back to localhost for dev.
// =====================
const allowedOrigins = [
  'https://golf-charity-subscription-platform-pi-jet.vercel.app',
  'https://golfcharity-admin.vercel.app',
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean) // remove undefined/empty entries

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, mobile apps, curl)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    console.warn(`CORS blocked: ${origin}`)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
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
  Server : http://localhost:${PORT}
  Health : http://localhost:${PORT}/health
  Env    : ${process.env.NODE_ENV || 'development'}
  Proxy  : trusted (Render/Railway compatible)
  ====================================
  `)
})

module.exports = app
