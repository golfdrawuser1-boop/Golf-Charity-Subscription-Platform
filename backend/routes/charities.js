const express = require('express')
const router = express.Router()
const { supabaseAdmin } = require('../config/supabase')
const { protect, requireSubscription } = require('../middleware/auth')

// ====================================================
// ALL NAMED ROUTES MUST COME BEFORE /:id WILDCARD
// ====================================================

// @route   GET /api/charities
// @desc    Get all charities with search and filter (per PRD)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { search, category, featured, limit } = req.query

    let query = supabaseAdmin
      .from('charities')
      .select('*')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('name', { ascending: true })

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (featured === 'true') {
      query = query.eq('is_featured', true)
    }

    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data: charities, error } = await query

    if (error) throw error

    res.json({ charities })
  } catch (err) {
    console.error('Get charities error:', err)
    res.status(500).json({ error: 'Failed to fetch charities.' })
  }
})

// @route   GET /api/charities/featured
// @desc    Get featured/spotlight charity for homepage (per PRD)
// @access  Public
// MUST come before /:id — otherwise /featured hits the /:id handler
router.get('/featured', async (req, res) => {
  try {
    const { data: charity, error } = await supabaseAdmin
      .from('charities')
      .select('*')
      .eq('is_featured', true)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    res.json({ charity: charity || null })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch featured charity.' })
  }
})

// @route   PUT /api/charities/select
// @desc    User selects their charity (per PRD — selected at signup/profile)
// @access  Private
// MUST come before /:id — otherwise PUT /select hits /:id handler
router.put('/select', protect, async (req, res) => {
  try {
    const { charity_id, charity_percentage } = req.body

    if (!charity_id) {
      return res.status(400).json({ error: 'Charity ID is required.' })
    }

    const percentage = charity_percentage || 10
    if (percentage < 10) {
      return res.status(400).json({ error: 'Minimum charity contribution is 10%.' })
    }

    const { data: charity } = await supabaseAdmin
      .from('charities')
      .select('id, name')
      .eq('id', charity_id)
      .single()

    if (!charity) {
      return res.status(404).json({ error: 'Charity not found.' })
    }

    await supabaseAdmin
      .from('users')
      .update({ charity_id, charity_percentage: percentage })
      .eq('id', req.user.id)

    res.json({
      message: `You are now supporting ${charity.name} with ${percentage}% of your subscription.`
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update charity selection.' })
  }
})

// @route   GET /api/charities/:id
// @desc    Get single charity profile with events (per PRD)
// @access  Public
// MUST come after all named routes
router.get('/:id', async (req, res) => {
  try {
    const { data: charity, error } = await supabaseAdmin
      .from('charities')
      .select(`*, charity_events(*)`)
      .eq('id', req.params.id)
      .eq('is_active', true)
      .single()

    if (error) {
      return res.status(404).json({ error: 'Charity not found.' })
    }

    res.json({ charity })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch charity.' })
  }
})

// @route   POST /api/charities/:id/donate
// @desc    Make independent donation to a charity (per PRD)
// @access  Private
router.post('/:id/donate', protect, async (req, res) => {
  try {
    const { amount, message } = req.body
    const { id: charityId } = req.params

    if (!amount || amount < 100) {
      return res.status(400).json({ error: 'Minimum donation is ₹1.' })
    }

    const { data: charity } = await supabaseAdmin
      .from('charities')
      .select('id, name')
      .eq('id', charityId)
      .single()

    if (!charity) {
      return res.status(404).json({ error: 'Charity not found.' })
    }

    const { data: donation, error } = await supabaseAdmin
      .from('donations')
      .insert({
        user_id: req.user.id,
        charity_id: charityId,
        amount,
        message: message || null,
        type: 'independent',
        status: 'completed'
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({
      message: `Thank you for donating to ${charity.name}!`,
      donation
    })
  } catch (err) {
    console.error('Donation error:', err)
    res.status(500).json({ error: 'Failed to process donation.' })
  }
})

module.exports = router
