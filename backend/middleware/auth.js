const { supabase, supabaseAdmin } = require('../config/supabase')

// Verify user is authenticated via Supabase Auth token
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided. Please login.' })
    }

    const token = authHeader.split(' ')[1]

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token. Please login again.' })
    }

    // Fetch full user profile from our users table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return res.status(401).json({ error: 'User profile not found.' })
    }

    // Check subscription is active on every request (as per PRD)
    // Use maybeSingle() — single() throws PGRST116 when no row found, causing false 500s
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    req.user = { ...profile, subscription: subscription || null }
    req.token = token
    next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    res.status(500).json({ error: 'Authentication failed.' })
  }
}

// Verify user has an active subscription
const requireSubscription = (req, res, next) => {
  if (!req.user.subscription) {
    return res.status(403).json({
      error: 'Active subscription required to access this feature.',
      code: 'SUBSCRIPTION_REQUIRED'
    })
  }
  next()
}

// Verify user is an admin
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' })
  }
  next()
}

module.exports = { protect, requireSubscription, adminOnly }
