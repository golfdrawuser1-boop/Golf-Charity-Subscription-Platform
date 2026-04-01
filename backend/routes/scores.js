const express = require('express')
const router = express.Router()
const { supabaseAdmin } = require('../config/supabase')
const { protect, requireSubscription } = require('../middleware/auth')

// All score routes require authentication + active subscription
router.use(protect)
router.use(requireSubscription)

// @route   GET /api/scores
// @desc    Get user's latest 5 scores (most recent first per PRD)
// @access  Private + Subscriber
router.get('/', async (req, res) => {
  try {
    const { data: scores, error } = await supabaseAdmin
      .from('scores')
      .select('*')
      .eq('user_id', req.user.id)
      .order('played_on', { ascending: false })
      .limit(5)

    if (error) throw error

    res.json({ scores })
  } catch (err) {
    console.error('Get scores error:', err)
    res.status(500).json({ error: 'Failed to fetch scores.' })
  }
})

// @route   POST /api/scores
// @desc    Add new score - auto removes oldest if more than 5 (per PRD)
// @access  Private + Subscriber
router.post('/', async (req, res) => {
  try {
    const { score, played_on } = req.body

    // Validate score range (1-45 Stableford per PRD)
    if (!score || score < 1 || score > 45) {
      return res.status(400).json({
        error: 'Score must be between 1 and 45 (Stableford format).'
      })
    }

    if (!played_on) {
      return res.status(400).json({ error: 'Date played is required.' })
    }

    // Validate date is not in future
    if (new Date(played_on) > new Date()) {
      return res.status(400).json({ error: 'Score date cannot be in the future.' })
    }

    // Check current score count
    const { data: existingScores, error: fetchError } = await supabaseAdmin
      .from('scores')
      .select('id, played_on')
      .eq('user_id', req.user.id)
      .order('played_on', { ascending: true }) // oldest first

    if (fetchError) throw fetchError

    // If user already has 5 scores, delete the oldest one (rolling window per PRD)
    if (existingScores.length >= 5) {
      const oldest = existingScores[0]
      await supabaseAdmin
        .from('scores')
        .delete()
        .eq('id', oldest.id)
    }

    // Insert new score
    const { data: newScore, error: insertError } = await supabaseAdmin
      .from('scores')
      .insert({
        user_id: req.user.id,
        score: parseInt(score),
        played_on,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Fetch updated scores list (most recent first per PRD)
    const { data: updatedScores } = await supabaseAdmin
      .from('scores')
      .select('*')
      .eq('user_id', req.user.id)
      .order('played_on', { ascending: false })
      .limit(5)

    res.status(201).json({
      message: 'Score added successfully.',
      score: newScore,
      all_scores: updatedScores
    })
  } catch (err) {
    console.error('Add score error:', err)
    res.status(500).json({ error: 'Failed to add score.' })
  }
})

// @route   PUT /api/scores/:id
// @desc    Edit a score
// @access  Private + Subscriber
router.put('/:id', async (req, res) => {
  try {
    const { score, played_on } = req.body
    const { id } = req.params

    if (score && (score < 1 || score > 45)) {
      return res.status(400).json({
        error: 'Score must be between 1 and 45 (Stableford format).'
      })
    }

    // Make sure score belongs to this user
    const { data: existing } = await supabaseAdmin
      .from('scores')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single()

    if (!existing) {
      return res.status(404).json({ error: 'Score not found.' })
    }

    const updates = {}
    if (score) updates.score = parseInt(score)
    if (played_on) updates.played_on = played_on
    updates.updated_at = new Date().toISOString()

    const { data: updated, error } = await supabaseAdmin
      .from('scores')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ message: 'Score updated successfully.', score: updated })
  } catch (err) {
    console.error('Update score error:', err)
    res.status(500).json({ error: 'Failed to update score.' })
  }
})

// @route   DELETE /api/scores/:id
// @desc    Delete a score
// @access  Private + Subscriber
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Make sure score belongs to this user
    const { data: existing } = await supabaseAdmin
      .from('scores')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single()

    if (!existing) {
      return res.status(404).json({ error: 'Score not found.' })
    }

    await supabaseAdmin.from('scores').delete().eq('id', id)

    res.json({ message: 'Score deleted successfully.' })
  } catch (err) {
    console.error('Delete score error:', err)
    res.status(500).json({ error: 'Failed to delete score.' })
  }
})

module.exports = router
