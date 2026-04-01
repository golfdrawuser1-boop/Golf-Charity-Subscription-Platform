const express = require('express')
const router = express.Router()
const { supabaseAdmin } = require('../config/supabase')
const { protect, requireSubscription } = require('../middleware/auth')

// ====================================================
// ALL NAMED ROUTES MUST COME BEFORE /:id WILDCARD
// ====================================================

// @route   GET /api/draws/next
// @desc    Get next scheduled/open draw (matches frontend dashboard call)
// @access  Public
router.get('/next', async (req, res) => {
  try {
    const { data: draw } = await supabaseAdmin
      .from('draws').select('*').in('status', ['scheduled', 'open'])
      .order('draw_date', { ascending: true }).limit(1).single()
    const { data: lastDraw } = await supabaseAdmin
      .from('draws').select('jackpot_rollover').eq('status', 'published')
      .order('draw_date', { ascending: false }).limit(1).single()
    res.json({ draw: draw || null, jackpot_rollover: lastDraw?.jackpot_rollover || 0 })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch next draw.' })
  }
})

// @route   GET /api/draws/upcoming
// @desc    Get next upcoming draw info
// @access  Public
router.get('/upcoming', async (req, res) => {
  try {
    const { data: draw } = await supabaseAdmin
      .from('draws')
      .select('*')
      .eq('status', 'scheduled')
      .order('draw_date', { ascending: true })
      .limit(1)
      .single()

    const { data: lastDraw } = await supabaseAdmin
      .from('draws')
      .select('jackpot_rollover')
      .eq('status', 'published')
      .order('draw_date', { ascending: false })
      .limit(1)
      .single()

    res.json({
      draw: draw || null,
      jackpot_rollover: lastDraw?.jackpot_rollover || 0
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch upcoming draw.' })
  }
})

// @route   GET /api/draws/participation
// @desc    Get user's participation counts + upcoming draws (matches frontend dashboard call)
// @access  Private
router.get('/participation', protect, async (req, res) => {
  try {
    const { count: entered } = await supabaseAdmin
      .from('draw_entries').select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
    const { data: upcoming } = await supabaseAdmin
      .from('draws').select('*').in('status', ['scheduled', 'open'])
      .order('draw_date', { ascending: true }).limit(3)
    res.json({ entered: entered || 0, upcoming: upcoming || [] })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch participation.' })
  }
})

// @route   GET /api/draws/my/participation
// @desc    Get user's full draw participation history (per PRD dashboard)
// @access  Private + Subscriber
router.get('/my/participation', protect, requireSubscription, async (req, res) => {
  try {
    const { data: entries, error } = await supabaseAdmin
      .from('draw_entries')
      .select(`
        *,
        draws(draw_date, status, draw_numbers),
        winners(match_type, prize_amount, status)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const totalEntered = entries.length
    const totalWon = entries.filter(e => e.winners).length
    const totalEarned = entries
      .filter(e => e.winners?.status === 'paid')
      .reduce((sum, e) => sum + (e.winners?.prize_amount || 0), 0)

    res.json({
      entries,
      summary: {
        total_entered: totalEntered,
        total_won: totalWon,
        total_earned: totalEarned
      }
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch participation history.' })
  }
})

// @route   GET /api/draws
// @desc    Get all published draws (+ upcoming for the tab view)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { data: draws, error } = await supabaseAdmin
      .from('draws')
      .select('*')
      .in('status', ['published', 'scheduled', 'open'])
      .order('draw_date', { ascending: false })
      .limit(24)

    if (error) throw error

    // Normalise DB column names for frontend compatibility
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

// @route   GET /api/draws/:id
// @desc    Get single draw details with results
// @access  Public
// MUST come after all named routes
router.get('/:id', async (req, res) => {
  try {
    const { data: draw, error } = await supabaseAdmin
      .from('draws')
      .select(`
        *,
        winners(
          id,
          match_type,
          prize_amount,
          status,
          users(full_name)
        )
      `)
      .eq('id', req.params.id)
      .single()

    if (error) {
      return res.status(404).json({ error: 'Draw not found.' })
    }

    res.json({ draw })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch draw.' })
  }
})

module.exports = router
