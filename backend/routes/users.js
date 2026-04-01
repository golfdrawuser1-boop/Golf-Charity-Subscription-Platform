const express = require('express')
const router = express.Router()
const { supabaseAdmin } = require('../config/supabase')
const { protect } = require('../middleware/auth')

// All user routes require auth
router.use(protect)

// @route   PUT /api/users/profile
// @desc    Update user profile (alias matches frontend calls)
// @access  Private
router.put('/profile', async (req, res) => {
  try {
    const { full_name, charity_id, charity_percentage } = req.body
    if (charity_percentage && charity_percentage < 10) {
      return res.status(400).json({ error: 'Minimum charity contribution is 10%.' })
    }
    const updates = { updated_at: new Date().toISOString() }
    if (full_name) updates.full_name = full_name
    if (charity_id !== undefined) updates.charity_id = charity_id || null
    if (charity_percentage) updates.charity_percentage = charity_percentage

    const { data, error } = await supabaseAdmin
      .from('users').update(updates).eq('id', req.user.id).select().single()
    if (error) throw error
    res.json({ message: 'Profile updated.', user: data })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile.' })
  }
})

// @route   PUT /api/users/charity
// @desc    Update user's selected charity
// @access  Private
router.put('/charity', async (req, res) => {
  try {
    const { charity_id, charity_percentage } = req.body
    if (!charity_id) return res.status(400).json({ error: 'charity_id is required.' })

    // Verify charity exists
    const { data: charity } = await supabaseAdmin
      .from('charities').select('id, name').eq('id', charity_id).single()
    if (!charity) return res.status(404).json({ error: 'Charity not found.' })

    const updates = { charity_id, updated_at: new Date().toISOString() }
    if (charity_percentage && charity_percentage >= 10) updates.charity_percentage = charity_percentage

    const { data, error } = await supabaseAdmin
      .from('users').update(updates).eq('id', req.user.id).select().single()
    if (error) throw error
    res.json({ message: `Now supporting ${charity.name}.`, user: data })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update charity.' })
  }
})

module.exports = router
