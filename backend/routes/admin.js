const express = require('express')
const router = express.Router()
const { supabaseAdmin } = require('../config/supabase')
const { protect, adminOnly } = require('../middleware/auth')
const { sendEmail, emails } = require('../utils/email')
const { formatCurrency, calculateTotalPrizePool } = require('../utils/prizePool')
const {
  generateRandomDraw,
  generateAlgorithmicDraw,
  processDraw,
  calculatePrizePools
} = require('../utils/drawEngine')

// All admin routes require auth + admin role
router.use(protect)
router.use(adminOnly)

// =====================
// ANALYTICS / REPORTS
// =====================

// @route   GET /api/admin/analytics
// @desc    Full analytics overview (per PRD reports section)
// @access  Admin
router.get('/analytics', async (req, res) => {
  try {
    const [
      { count: totalUsers },
      { count: activeSubscribers },
      { data: subscriptions },
      { count: totalDraws },
      { data: winners },
      { data: charityContributions }
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('subscriptions').select('plan, prize_contribution, charity_contribution').eq('status', 'active'),
      supabaseAdmin.from('draws').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('winners').select('prize_amount, status'),
      supabaseAdmin.from('subscriptions').select('charity_contribution, charity_id')
    ])

    const totalPrizePool = subscriptions?.reduce((sum, s) => sum + (s.prize_contribution || 0), 0) || 0
    const totalCharityContributions = charityContributions?.reduce((sum, s) => sum + (s.charity_contribution || 0), 0) || 0
    const totalPaidOut = winners?.filter(w => w.status === 'paid').reduce((sum, w) => sum + (w.prize_amount || 0), 0) || 0

    res.json({
      analytics: {
        total_users: totalUsers,
        active_subscribers: activeSubscribers,
        total_draws: totalDraws,
        total_prize_pool: totalPrizePool,
        total_charity_contributions: totalCharityContributions,
        total_paid_out: totalPaidOut,
        monthly_vs_yearly: {
          monthly: subscriptions?.filter(s => s.plan === 'monthly').length || 0,
          yearly: subscriptions?.filter(s => s.plan === 'yearly').length || 0
        }
      }
    })
  } catch (err) {
    console.error('Analytics error:', err)
    res.status(500).json({ error: 'Failed to fetch analytics.' })
  }
})

// @route   GET /api/admin/reports/overview  (matches admin dashboard page call)
// @access  Admin
router.get('/reports/overview', async (req, res) => {
  try {
    const [
      { count: totalUsers },
      { count: activeSubscribers },
      { data: subscriptions },
      { count: totalDraws },
      { data: winners },
      { count: activeCharities },
      { count: pendingWinners }
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('subscriptions').select('plan, prize_contribution, charity_contribution').eq('status', 'active'),
      supabaseAdmin.from('draws').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('winners').select('prize_amount, status'),
      supabaseAdmin.from('charities').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('winners').select('*', { count: 'exact', head: true }).eq('status', 'verification_pending')
    ])

    const totalPrizePool = subscriptions?.reduce((sum, s) => sum + (s.prize_contribution || 0), 0) || 0
    const totalCharity = subscriptions?.reduce((sum, s) => sum + (s.charity_contribution || 0), 0) || 0

    // Recent signups (last 7 days grouped by date)
    const { data: recentUsers } = await supabaseAdmin
      .from('users')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .order('created_at', { ascending: true })

    const signupsByDate = {}
    ;(recentUsers || []).forEach(u => {
      const d = u.created_at.split('T')[0]
      signupsByDate[d] = (signupsByDate[d] || 0) + 1
    })
    const recent_signups = Object.entries(signupsByDate).map(([date, count]) => ({ date, count }))

    // Monthly revenue (last 6 months)
    const { data: monthlyRevData } = await supabaseAdmin
      .from('subscriptions')
      .select('created_at, amount')
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    const revenueByMonth = {}
    ;(monthlyRevData || []).forEach(s => {
      const m = s.created_at?.slice(0, 7)
      if (m) revenueByMonth[m] = (revenueByMonth[m] || 0) + (s.amount || 0)
    })
    const monthly_revenue = Object.entries(revenueByMonth).slice(-6).map(([month, revenue]) => ({ month, revenue }))

    res.json({
      total_users: totalUsers || 0,
      active_subscribers: activeSubscribers || 0,
      total_prize_pool: totalPrizePool,
      total_charity: totalCharity,
      active_charities: activeCharities || 0,
      draws_this_month: totalDraws || 0,
      pending_winners: pendingWinners || 0,
      recent_signups,
      monthly_revenue
    })
  } catch (err) {
    console.error('Reports overview error:', err)
    res.status(500).json({ error: 'Failed to fetch overview.' })
  }
})

// @route   GET /api/admin/reports/full  (matches ReportsPage call)
// @access  Admin
router.get('/reports/full', async (req, res) => {
  try {
    const [
      { count: totalUsers },
      { count: activeSubscribers },
      { data: subscriptions },
      { data: draws },
      { data: winners },
      { data: charities }
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('subscriptions').select('prize_contribution, charity_contribution, plan, created_at').eq('status', 'active'),
      supabaseAdmin.from('draws').select('id, name, draw_date, total_pool, total_participants, status, jackpot_rollover').order('draw_date', { ascending: false }).limit(12),
      supabaseAdmin.from('winners').select('prize_amount, status, draw_id, match_type'),
      supabaseAdmin.from('charities').select('id, name').eq('is_active', true)
    ])

    const totalRevenue = subscriptions?.reduce((s, x) => s + (x.prize_contribution || 0) + (x.charity_contribution || 0), 0) || 0
    const charityTotal = subscriptions?.reduce((s, x) => s + (x.charity_contribution || 0), 0) || 0
    const prizesPaid = winners?.filter(w => w.status === 'paid').reduce((s, w) => s + (w.prize_amount || 0), 0) || 0

    // Revenue over time (monthly — use prize_contribution as revenue proxy)
    const revMap = {}
    ;(subscriptions || []).forEach(s => {
      const m = s.created_at?.slice(0, 7)
      if (m) revMap[m] = (revMap[m] || 0) + ((s.prize_contribution || 0) + (s.charity_contribution || 0))
    })
    const revenue_over_time = Object.entries(revMap).slice(-6).map(([month, revenue]) => ({ month, revenue }))

    // Subscriber growth
    const subMap = {}
    ;(subscriptions || []).forEach(s => {
      const m = s.created_at?.slice(0, 7)
      if (m) subMap[m] = (subMap[m] || 0) + 1
    })
    const subscriber_growth = Object.entries(subMap).slice(-6).map(([month, count]) => ({ month, count }))

    // Draw stats
    const draw_stats = (draws || []).slice(0, 6).map(d => ({
      draw: d.name || d.draw_date?.slice(0, 7),
      pool: d.total_pool || 0
    }))

    // Draw results table
    const draw_results = (draws || []).map(d => {
      const drawWinners = winners?.filter(w => w.draw_id === d.id) || []
      return {
        ...d,
        prize_pool: d.total_pool || 0,
        participant_count: d.total_participants || 0,
        winner_count: drawWinners.length,
        jackpot_rolled: (d.jackpot_rollover || 0) > 0
      }
    })

    res.json({
      summary: {
        total_revenue: totalRevenue,
        total_users: totalUsers || 0,
        charity_total: charityTotal,
        draws_total: draws?.length || 0,
        prizes_paid: prizesPaid,
        avg_score: 0
      },
      revenue_over_time,
      subscriber_growth,
      draw_stats,
      charity_breakdown: [],
      draw_results
    })
  } catch (err) {
    console.error('Reports full error:', err)
    res.status(500).json({ error: 'Failed to fetch reports.' })
  }
})


// =====================
// USER MANAGEMENT
// =====================

// @route   GET /api/admin/users
// @desc    Get all users with subscription info
// @access  Admin
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('users')
      .select(`
        *,
        subscriptions(plan, status, created_at),
        charities(name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: users, error, count } = await query

    if (error) throw error

    res.json({ users, total: count, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' })
  }
})

// @route   GET /api/admin/users/:id
// @desc    Get single user full profile
// @access  Admin
router.get('/users/:id', async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        subscriptions(*),
        scores(score, played_on, created_at),
        winners(match_type, prize_amount, status),
        charities(name, description)
      `)
      .eq('id', req.params.id)
      .single()

    if (error) return res.status(404).json({ error: 'User not found.' })

    res.json({ user })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user.' })
  }
})

// @route   PUT /api/admin/users/:id
// @desc    Edit user profile (per PRD admin user management)
// @access  Admin
router.put('/users/:id', async (req, res) => {
  try {
    const { full_name, role, charity_id, charity_percentage } = req.body
    const updates = {}

    if (full_name) updates.full_name = full_name
    if (role && ['user', 'admin'].includes(role)) updates.role = role
    if (charity_id) updates.charity_id = charity_id
    if (charity_percentage) updates.charity_percentage = charity_percentage
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error

    res.json({ message: 'User updated successfully.', user: data })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user.' })
  }
})

// @route   PUT /api/admin/users/:id/scores/:scoreId
// @desc    Admin edit user golf score (per PRD)
// @access  Admin
router.put('/users/:id/scores/:scoreId', async (req, res) => {
  try {
    const { score, played_on } = req.body

    if (score && (score < 1 || score > 45)) {
      return res.status(400).json({ error: 'Score must be between 1 and 45.' })
    }

    const updates = {}
    if (score) updates.score = parseInt(score)
    if (played_on) updates.played_on = played_on
    updates.updated_at = new Date().toISOString()
    updates.edited_by_admin = true

    const { data, error } = await supabaseAdmin
      .from('scores')
      .update(updates)
      .eq('id', req.params.scoreId)
      .eq('user_id', req.params.id)
      .select()
      .single()

    if (error) throw error

    res.json({ message: 'Score updated by admin.', score: data })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update score.' })
  }
})

// @route   PUT /api/admin/subscriptions/:id
// @desc    Admin manage subscription status
// @access  Admin
router.put('/subscriptions/:id', async (req, res) => {
  try {
    const { status } = req.body

    if (!['active', 'lapsed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' })
    }

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error

    res.json({ message: 'Subscription updated.', subscription: data })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update subscription.' })
  }
})

// =====================
// DRAW MANAGEMENT
// =====================

// @route   POST /api/admin/draws
// @desc    Create a new scheduled draw (per PRD — admin creates draw, then simulates/publishes)
// @access  Admin
router.post('/draws', async (req, res) => {
  try {
    const { name, draw_date, draw_type = 'random', prize_pool } = req.body

    if (!name || !draw_date) {
      return res.status(400).json({ error: 'Draw name and draw_date are required.' })
    }

    // Auto-calculate prize pool from active subscriptions if not overridden
    let resolvedPrizePool = prize_pool ? parseFloat(prize_pool) * 100 : null
    if (!resolvedPrizePool) {
      const { data: subs } = await supabaseAdmin
        .from('subscriptions')
        .select('prize_contribution')
        .eq('status', 'active')
      resolvedPrizePool = subs?.reduce((sum, s) => sum + (s.prize_contribution || 0), 0) || 0
    }

    // Normalise draw_type to match DB check constraint ('random' | 'algorithmic')
    const safeDrawType = draw_type === 'algorithm' ? 'algorithmic' : draw_type

    const { data: draw, error } = await supabaseAdmin
      .from('draws')
      .insert({
        name,
        draw_date,
        draw_type: safeDrawType,
        status: 'scheduled',
        total_pool: resolvedPrizePool,  // correct DB column name
        total_participants: 0,           // correct DB column name
        draw_numbers: []                 // required field; populated at publish time
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ message: 'Draw created successfully.', draw })
  } catch (err) {
    console.error('Create draw error:', err)
    res.status(500).json({ error: 'Failed to create draw.' })
  }
})

// @route   POST /api/admin/draws/simulate
// @desc    Simulate a draw (pre-analysis mode per PRD - does NOT publish)
// @access  Admin
router.post('/draws/simulate', async (req, res) => {
  try {
    const { draw_type: rawDrawType = 'random', draw_id, algorithm_mode = 'frequent' } = req.body
    const draw_type = rawDrawType === 'algorithm' ? 'algorithmic' : rawDrawType

    // Get all active subscribers with their scores
    const { data: participants } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        full_name,
        scores(score, played_on)
      `)
      .eq('role', 'user')

    // Filter only users with active subscription and at least 3 scores
    const { data: activeSubscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'active')

    const activeUserIds = new Set(activeSubscriptions.map(s => s.user_id))
    const eligibleParticipants = participants.filter(p =>
      activeUserIds.has(p.id) && p.scores.length >= 3
    )

    // Generate draw numbers
    let drawNumbers
    if (draw_type === 'algorithmic') {
      const allScores = eligibleParticipants.flatMap(p => p.scores.map(s => s.score))
      drawNumbers = generateAlgorithmicDraw(allScores, algorithm_mode)
    } else {
      drawNumbers = generateRandomDraw()
    }

    // Calculate prize pool
    const { data: subs } = await supabaseAdmin
      .from('subscriptions')
      .select('plan, prize_contribution')
      .eq('status', 'active')

    const totalPool = subs?.reduce((sum, s) => sum + (s.prize_contribution || 0), 0) || 0

    // Get current jackpot rollover
    const { data: lastDraw } = await supabaseAdmin
      .from('draws')
      .select('jackpot_rollover')
      .eq('status', 'published')
      .order('draw_date', { ascending: false })
      .limit(1)
      .single()

    const jackpotRollover = lastDraw?.jackpot_rollover || 0
    const prizePools = calculatePrizePools(totalPool, jackpotRollover)

    // Process draw (simulation only - not saved)
    const results = processDraw(eligibleParticipants, drawNumbers, prizePools)

    res.json({
      simulation: true,
      draw_numbers: drawNumbers,
      draw_type,
      total_participants: eligibleParticipants.length,
      total_pool: totalPool,
      jackpot_rollover: jackpotRollover,
      prize_pools: prizePools,
      results: {
        five_match_count: results.five_match_winners.length,
        four_match_count: results.four_match_winners.length,
        three_match_count: results.three_match_winners.length,
        prize_per_winner: results.prize_per_winner,
        would_jackpot_rollover: results.jackpot_rollover > 0,
        winners_preview: {
          five_match: results.five_match_winners.map(w => ({ id: w.id, name: w.full_name })),
          four_match: results.four_match_winners.map(w => ({ id: w.id, name: w.full_name })),
          three_match: results.three_match_winners.map(w => ({ id: w.id, name: w.full_name }))
        }
      }
    })
  } catch (err) {
    console.error('Draw simulation error:', err)
    res.status(500).json({ error: 'Draw simulation failed.' })
  }
})

// @route   POST /api/admin/draws/run
// @desc    Run and publish official draw (per PRD)
// @access  Admin
router.post('/draws/run', async (req, res) => {
  try {
    const { draw_type: rawDrawType2 = 'random', draw_id, algorithm_mode = 'frequent', draw_date } = req.body
    const draw_type = rawDrawType2 === 'algorithm' ? 'algorithmic' : rawDrawType2

    // Get all eligible participants
    const { data: participants } = await supabaseAdmin
      .from('users')
      .select(`id, full_name, email, scores(score, played_on)`)
      .eq('role', 'user')

    const { data: activeSubscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, plan, prize_contribution')
      .eq('status', 'active')

    const activeUserIds = new Set(activeSubscriptions.map(s => s.user_id))
    const eligibleParticipants = participants.filter(p =>
      activeUserIds.has(p.id) && p.scores.length >= 3
    )

    // Generate draw numbers
    let drawNumbers
    if (draw_type === 'algorithmic') {
      const allScores = eligibleParticipants.flatMap(p => p.scores.map(s => s.score))
      drawNumbers = generateAlgorithmicDraw(allScores, algorithm_mode)
    } else {
      drawNumbers = generateRandomDraw()
    }

    // Calculate prize pools
    const totalPool = activeSubscriptions.reduce((sum, s) => sum + (s.prize_contribution || 0), 0)

    const { data: lastDraw } = await supabaseAdmin
      .from('draws')
      .select('jackpot_rollover')
      .eq('status', 'published')
      .order('draw_date', { ascending: false })
      .limit(1)
      .single()

    const jackpotRollover = lastDraw?.jackpot_rollover || 0
    const prizePools = calculatePrizePools(totalPool, jackpotRollover)
    const results = processDraw(eligibleParticipants, drawNumbers, prizePools)

    // Save draw to database
    // If draw_id provided (admin ran from existing scheduled draw), update it
    // Otherwise insert a new draw record
    let draw, drawError
    if (draw_id) {
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('draws')
        .update({
          draw_numbers: drawNumbers,
          draw_type,
          status: 'published',
          total_pool: totalPool,
          jackpot_rollover: results.jackpot_rollover,
          five_match_pool: prizePools.five_match,
          four_match_pool: prizePools.four_match,
          three_match_pool: prizePools.three_match,
          total_participants: eligibleParticipants.length
        })
        .eq('id', draw_id)
        .select()
        .single()
      draw = updated
      drawError = updateErr
    } else {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('draws')
        .insert({
          draw_date: draw_date || new Date().toISOString().split('T')[0],
          draw_numbers: drawNumbers,
          draw_type,
          status: 'published',
          total_pool: totalPool,
          jackpot_rollover: results.jackpot_rollover,
          five_match_pool: prizePools.five_match,
          four_match_pool: prizePools.four_match,
          three_match_pool: prizePools.three_match,
          total_participants: eligibleParticipants.length
        })
        .select()
        .single()
      draw = inserted
      drawError = insertErr
    }

    if (drawError) throw drawError

    // Save draw entries for all participants
    const entries = eligibleParticipants.map(p => ({
      draw_id: draw.id,
      user_id: p.id,
      scores_snapshot: p.scores
    }))
    await supabaseAdmin.from('draw_entries').insert(entries)

    // Save winners and send notifications
    const allWinners = [
      ...results.five_match_winners.map(w => ({ ...w, match_type: '5_match', prize: results.prize_per_winner.five_match })),
      ...results.four_match_winners.map(w => ({ ...w, match_type: '4_match', prize: results.prize_per_winner.four_match })),
      ...results.three_match_winners.map(w => ({ ...w, match_type: '3_match', prize: results.prize_per_winner.three_match }))
    ]

    for (const winner of allWinners) {
      await supabaseAdmin.from('winners').insert({
        draw_id: draw.id,
        user_id: winner.id,
        match_type: winner.match_type,
        match_count: winner.match_count,
        prize_amount: winner.prize,
        status: 'pending'
      })

      // Send winner alert email
      await sendEmail({
        to: winner.email,
        ...emails.winnerAlert(winner.full_name, (winner.prize / 100).toFixed(2), winner.match_type)
      })
    }

    // Send draw results to all participants
    for (const participant of eligibleParticipants) {
      const won = allWinners.find(w => w.id === participant.id)
      await sendEmail({
        to: participant.email,
        ...emails.drawResults(
          participant.full_name,
          draw.draw_date,
          won ? won.match_count : 0
        )
      })
    }

    res.json({
      message: 'Draw completed and published successfully.',
      draw,
      results: {
        five_match_winners: results.five_match_winners.length,
        four_match_winners: results.four_match_winners.length,
        three_match_winners: results.three_match_winners.length,
        jackpot_rolled_over: results.jackpot_rollover > 0,
        jackpot_rollover_amount: results.jackpot_rollover
      }
    })
  } catch (err) {
    console.error('Draw run error:', err)
    res.status(500).json({ error: 'Failed to run draw.' })
  }
})

// @route   GET /api/admin/draws
// @desc    Get all draws including unpublished
// @access  Admin
router.get('/draws', async (req, res) => {
  try {
    const { data: draws, error } = await supabaseAdmin
      .from('draws')
      .select('*')
      .order('draw_date', { ascending: false })

    if (error) throw error

    // Normalise field names so the admin frontend gets consistent keys
    // DB uses total_pool / total_participants; frontend uses prize_pool / participant_count
    const normalised = (draws || []).map(d => ({
      ...d,
      prize_pool: d.total_pool ?? d.prize_pool ?? 0,
      participant_count: d.total_participants ?? d.participant_count ?? 0,
    }))

    res.json({ draws: normalised })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch draws.' })
  }
})

// =====================
// CHARITY MANAGEMENT
// =====================

// @route   POST /api/admin/charities
// @desc    Add new charity
// @access  Admin
router.post('/charities', async (req, res) => {
  try {
    const { name, description, image_url, website, category, is_featured } = req.body

    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required.' })
    }

    const { data, error } = await supabaseAdmin
      .from('charities')
      .insert({
        name,
        description,
        image_url: image_url || null,
        website: website || null,
        category: category || 'general',
        is_featured: is_featured || false,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ message: 'Charity added successfully.', charity: data })
  } catch (err) {
    res.status(500).json({ error: 'Failed to add charity.' })
  }
})

// @route   PUT /api/admin/charities/:id
// @desc    Edit charity
// @access  Admin
router.put('/charities/:id', async (req, res) => {
  try {
    const { name, description, image_url, website, category, is_featured, is_active } = req.body
    const updates = {}

    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (image_url !== undefined) updates.image_url = image_url
    if (website !== undefined) updates.website = website
    if (category !== undefined) updates.category = category
    if (is_featured !== undefined) updates.is_featured = is_featured
    if (is_active !== undefined) updates.is_active = is_active
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('charities')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error

    res.json({ message: 'Charity updated successfully.', charity: data })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update charity.' })
  }
})

// @route   DELETE /api/admin/charities/:id
// @desc    Delete (deactivate) charity
// @access  Admin
router.delete('/charities/:id', async (req, res) => {
  try {
    await supabaseAdmin
      .from('charities')
      .update({ is_active: false })
      .eq('id', req.params.id)

    res.json({ message: 'Charity removed successfully.' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove charity.' })
  }
})

// @route   POST /api/admin/charities/:id/events
// @desc    Add golf day / event to charity (per PRD charity profiles)
// @access  Admin
router.post('/charities/:id/events', async (req, res) => {
  try {
    const { title, description, event_date, location, registration_url } = req.body

    const { data, error } = await supabaseAdmin
      .from('charity_events')
      .insert({
        charity_id: req.params.id,
        title,
        description,
        event_date,
        location,
        registration_url
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ message: 'Event added.', event: data })
  } catch (err) {
    res.status(500).json({ error: 'Failed to add event.' })
  }
})

// =====================
// WINNER VERIFICATION
// =====================

// @route   GET /api/admin/winners
// @desc    Get all winners for verification (per PRD)
// @access  Admin
router.get('/winners', async (req, res) => {
  try {
    const { status } = req.query

    let query = supabaseAdmin
      .from('winners')
      .select(`
        *,
        users(full_name, email),
        draws(draw_date, draw_numbers)
      `)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data: winners, error } = await query
    if (error) throw error

    res.json({ winners })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch winners.' })
  }
})

// @route   PUT /api/admin/winners/:id/verify
// @desc    Approve or reject winner proof (per PRD: Pending → Paid)
// @access  Admin
router.put('/winners/:id/verify', async (req, res) => {
  try {
    const { action, rejection_reason } = req.body

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject.' })
    }

    const { data: winner } = await supabaseAdmin
      .from('winners')
      .select(`*, users(full_name, email)`)
      .eq('id', req.params.id)
      .single()

    if (!winner) return res.status(404).json({ error: 'Winner not found.' })

    const newStatus = action === 'approve' ? 'verified' : 'rejected'
    const updates = {
      status: newStatus,
      verified_at: new Date().toISOString(),
      verified_by: req.user.id
    }

    if (action === 'reject') {
      updates.rejection_reason = rejection_reason || 'Proof not accepted.'
    }

    await supabaseAdmin.from('winners').update(updates).eq('id', req.params.id)

    res.json({
      message: `Winner ${action === 'approve' ? 'approved' : 'rejected'} successfully.`
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify winner.' })
  }
})

// @route   PUT /api/admin/winners/:id/payout
// @desc    Mark winner payout as completed (Pending → Paid per PRD)
// @access  Admin
router.put('/winners/:id/payout', async (req, res) => {
  try {
    const { data: winner } = await supabaseAdmin
      .from('winners')
      .select(`*, users(full_name, email)`)
      .eq('id', req.params.id)
      .single()

    if (!winner) return res.status(404).json({ error: 'Winner not found.' })

    if (winner.status !== 'verified') {
      return res.status(400).json({ error: 'Winner must be verified before payout.' })
    }

    await supabaseAdmin
      .from('winners')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        paid_by: req.user.id
      })
      .eq('id', req.params.id)

    // Send payout confirmation email
    await sendEmail({
      to: winner.users.email,
      ...emails.payoutComplete(winner.users.full_name, (winner.prize_amount / 100).toFixed(2))
    })

    res.json({ message: 'Payout marked as completed. Email sent to winner.' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to process payout.' })
  }
})

module.exports = router
