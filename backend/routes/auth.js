const express = require('express')
const router = express.Router()
const { supabase, supabaseAdmin } = require('../config/supabase')
const { protect } = require('../middleware/auth')
const { sendEmail, emails } = require('../utils/email')

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, charity_id, charity_percentage } = req.body

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password and full name are required.' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' })
    }

    // Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } }
    })

    if (authError) {
      return res.status(400).json({ error: authError.message })
    }

    // Insert profile row
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name,
        role: 'user',
        charity_id: charity_id || null,
        charity_percentage: charity_percentage || 10,
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
    }

    // Welcome email (non-blocking)
    sendEmail({ to: email, ...emails.welcomeEmail(full_name) }).catch(() => {})

    // Auto sign-in to get token
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password })

    if (loginError || !loginData?.session) {
      // Account created but auto-login failed — user can log in manually
      return res.status(201).json({
        message: 'Account created! Please sign in.',
        token: null,
        user: { id: authData.user.id, email, full_name, role: 'user', charity_percentage: charity_percentage || 10 }
      })
    }

    res.status(201).json({
      message: 'Account created successfully!',
      token: loginData.session.access_token,
      refresh_token: loginData.session.refresh_token,
      user: {
        id: authData.user.id,
        email,
        full_name,
        role: 'user',
        charity_id: charity_id || null,
        charity_percentage: charity_percentage || 10,
        has_active_subscription: false,
        subscription: null,
      }
    })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Registration failed. Please try again.' })
  }
})

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    // Fetch fresh user profile from DB
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileErr || !profile) {
      return res.status(401).json({ error: 'User profile not found. Please contact support.' })
    }

    // Fetch active subscription
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', data.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    res.json({
      message: 'Login successful',
      token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        ...profile,
        has_active_subscription: !!subscription,
        subscription: subscription || null,
      }
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed. Please try again.' })
  }
})

// @route   POST /api/auth/logout
router.post('/logout', protect, async (req, res) => {
  try {
    await supabase.auth.signOut()
    res.json({ message: 'Logged out successfully.' })
  } catch (err) {
    res.status(500).json({ error: 'Logout failed.' })
  }
})

// @route   POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body
    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token required.' })
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token })
    if (error) {
      return res.status(401).json({ error: 'Session expired. Please login again.' })
    }

    res.json({
      token: data.session.access_token,
      refresh_token: data.session.refresh_token
    })
  } catch (err) {
    res.status(500).json({ error: 'Token refresh failed.' })
  }
})

// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single()

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let charity = null
    if (profile?.charity_id) {
      const { data: charityData } = await supabaseAdmin
        .from('charities')
        .select('name, description')
        .eq('id', profile.charity_id)
        .maybeSingle()
      charity = charityData
    }

    res.json({
      user: {
        ...profile,
        subscription: subscription || null,
        has_active_subscription: !!subscription,
        charity,
      }
    })
  } catch (err) {
    console.error('Get /me error:', err)
    res.status(500).json({ error: 'Failed to fetch profile.' })
  }
})

// @route   PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { full_name, charity_id, charity_percentage } = req.body

    if (charity_percentage !== undefined && charity_percentage < 10) {
      return res.status(400).json({ error: 'Minimum charity contribution is 10%.' })
    }

    const updates = { updated_at: new Date().toISOString() }
    if (full_name) updates.full_name = full_name
    if (charity_id !== undefined) updates.charity_id = charity_id
    if (charity_percentage !== undefined) updates.charity_percentage = charity_percentage

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single()

    if (error) throw error

    res.json({ message: 'Profile updated successfully.', user: data })
  } catch (err) {
    console.error('Profile update error:', err)
    res.status(500).json({ error: 'Failed to update profile.' })
  }
})

// @route   POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required.' })

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    })

    if (error) return res.status(400).json({ error: error.message })

    res.json({ message: 'Password reset email sent. Check your inbox.' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to send reset email.' })
  }
})

// @route   PUT /api/auth/change-password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { new_password } = req.body
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' })
    }
    const { error } = await supabase.auth.updateUser({ password: new_password })
    if (error) return res.status(400).json({ error: error.message })
    res.json({ message: 'Password updated successfully.' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password.' })
  }
})

module.exports = router
