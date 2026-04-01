const express = require('express')
const router = express.Router()
const { supabaseAdmin } = require('../config/supabase')
const { protect, requireSubscription } = require('../middleware/auth')
const { sendEmail, emails } = require('../utils/email')
const { formatCurrency } = require('../utils/prizePool')

// ====================================================
// NAMED ROUTES MUST COME BEFORE /:id WILDCARD
// ====================================================

// @route   GET /api/winners/my
// @desc    Get current user's winnings (matches frontend dashboard + profile calls)
// @access  Private
router.get('/my', protect, async (req, res) => {
  try {
    const { data: wins, error } = await supabaseAdmin
      .from('winners')
      .select('*, draws(draw_date, draw_numbers, name)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
    if (error) throw error

    const total_won = wins.reduce((s, w) => s + (w.prize_amount || 0), 0)
    const pending_verification = wins.some(w => w.status === 'verification_pending')
    res.json({
      wins: wins || [],
      total_won,
      wins_count: wins.length,
      pending_verification
    })
  } catch (err) {
    console.error('Get /my winnings error:', err)
    res.status(500).json({ error: 'Failed to fetch winnings.' })
  }
})

// @route   GET /api/winners/my-winnings
// @desc    Alias — returns full summary (per PRD dashboard)
// @access  Private + Subscriber
router.get('/my-winnings', protect, requireSubscription, async (req, res) => {
  try {
    const { data: winnings, error } = await supabaseAdmin
      .from('winners')
      .select('*, draws(draw_date, draw_numbers)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const totalWon = winnings.reduce((sum, w) => sum + (w.prize_amount || 0), 0)
    const pendingAmount = winnings
      .filter(w => w.status === 'pending')
      .reduce((sum, w) => sum + (w.prize_amount || 0), 0)
    const paidAmount = winnings
      .filter(w => w.status === 'paid')
      .reduce((sum, w) => sum + (w.prize_amount || 0), 0)

    res.json({
      winnings,
      summary: {
        total_won: totalWon,
        pending_amount: pendingAmount,
        paid_amount: paidAmount,
        total_count: winnings.length
      }
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch winnings.' })
  }
})

// @route   GET /api/winners
// @desc    Get publicly visible paid winners list
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { data: winners, error } = await supabaseAdmin
      .from('winners')
      .select(`
        id,
        match_type,
        prize_amount,
        status,
        created_at,
        draws(draw_date, draw_numbers),
        users(full_name)
      `)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    res.json({ winners })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch winners.' })
  }
})

// @route   POST /api/winners/:id/proof
// @desc    Winner uploads proof screenshot (matches frontend multipart call)
// @access  Private
router.post('/:id/proof', protect, async (req, res) => {
  try {
    const { proof_url } = req.body
    if (!proof_url) return res.status(400).json({ error: 'proof_url required.' })

    const { data: winner } = await supabaseAdmin
      .from('winners')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single()

    if (!winner) {
      return res.status(404).json({ error: 'Winner record not found.' })
    }

    if (winner.status !== 'pending') {
      return res.status(400).json({
        error: `Cannot upload proof. Current status: ${winner.status}`
      })
    }

    const { data, error } = await supabaseAdmin
      .from('winners')
      .update({
        proof_url,
        status: 'verification_pending',
        proof_submitted_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single()

    if (error) throw error

    res.json({ message: 'Proof submitted.', winner: data })
  } catch (err) {
    console.error('Proof upload error:', err)
    res.status(500).json({ error: 'Failed to submit proof.' })
  }
})

// @route   POST /api/winners/:id/upload-proof
// @desc    Alias (per PRD verification flow)
// @access  Private
router.post('/:id/upload-proof', protect, async (req, res) => {
  try {
    const { proof_url, proof_notes } = req.body

    if (!proof_url) {
      return res.status(400).json({ error: 'Proof screenshot URL is required.' })
    }

    const { data: winner } = await supabaseAdmin
      .from('winners')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single()

    if (!winner) {
      return res.status(404).json({ error: 'Winner record not found.' })
    }

    if (winner.status !== 'pending') {
      return res.status(400).json({
        error: `Cannot upload proof. Current status: ${winner.status}`
      })
    }

    const { data: updated, error } = await supabaseAdmin
      .from('winners')
      .update({
        proof_url,
        proof_notes: proof_notes || null,
        status: 'verification_pending',
        proof_submitted_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error

    res.json({
      message: 'Proof submitted successfully. Admin will review within 2-3 business days.',
      winner: updated
    })
  } catch (err) {
    console.error('Proof upload error:', err)
    res.status(500).json({ error: 'Failed to submit proof.' })
  }
})

// module.exports at the end — nothing registered after this line
module.exports = router
