const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const { supabaseAdmin } = require('../config/supabase')
const { razorpay, PLANS } = require('../config/razorpay')
const { protect } = require('../middleware/auth')
const { sendEmail, emails } = require('../utils/email')
const { calculateContribution, calculateCharityAmount } = require('../utils/prizePool')

// ─────────────────────────────────────────────────────────────
// POST /api/subscriptions/create-order
// Creates a Razorpay Order — frontend opens Razorpay checkout
// ─────────────────────────────────────────────────────────────
router.post('/create-order', protect, async (req, res) => {
  try {
    const { plan } = req.body
    if (!['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({ error: 'Plan must be monthly or yearly.' })
    }

    if (req.user.subscription) {
      return res.status(400).json({ error: 'You already have an active subscription.' })
    }

    const selectedPlan = PLANS[plan]

    const order = await razorpay.orders.create({
      amount: selectedPlan.amount,
      currency: selectedPlan.currency,
      receipt: `sub_${req.user.id}_${Date.now()}`,
      notes: {
        user_id: req.user.id,
        plan,
        user_email: req.user.email,
        user_name: req.user.full_name,
      },
    })

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      plan,
      user_name: req.user.full_name,
      user_email: req.user.email,
    })
  } catch (err) {
    console.error('Razorpay create-order error:', err)
    res.status(500).json({ error: 'Failed to create payment order. Please try again.' })
  }
})

// ─────────────────────────────────────────────────────────────
// POST /api/subscriptions/verify-payment
// Verifies Razorpay payment signature and activates subscription
// ─────────────────────────────────────────────────────────────
router.post('/verify-payment', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return res.status(400).json({ error: 'Missing payment verification fields.' })
    }

    // Verify signature — HMAC SHA256
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' })
    }

    // Check if subscription already activated (idempotent)
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (existing) {
      return res.json({ message: 'Subscription already active.', already_active: true })
    }

    // Get user's charity percentage
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('charity_percentage, full_name, email')
      .eq('id', req.user.id)
      .single()

    const prizeContribution = calculateContribution(plan)
    const charityAmount = calculateCharityAmount(plan, user?.charity_percentage || 10)
    const periodEnd = plan === 'yearly'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Save subscription to DB
    const { data: sub, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: req.user.id,
        razorpay_order_id,
        razorpay_payment_id,
        plan,
        status: 'active',
        prize_contribution: prizeContribution,
        charity_contribution: charityAmount,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd,
      })
      .select()
      .single()

    if (subError) throw subError

    // Send confirmation email (non-blocking)
    sendEmail({
      to: user.email,
      ...emails.subscriptionConfirmed(user.full_name, plan),
    }).catch(() => {})

    res.json({ message: 'Subscription activated successfully!', subscription: sub })
  } catch (err) {
    console.error('Verify payment error:', err)
    res.status(500).json({ error: 'Payment verification failed. Please contact support.' })
  }
})

// ─────────────────────────────────────────────────────────────
// POST /api/subscriptions/webhook
// Razorpay webhook for server-side payment events
// ─────────────────────────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    const signature = req.headers['x-razorpay-signature']

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.body)
        .digest('hex')

      if (expectedSignature !== signature) {
        return res.status(400).json({ error: 'Invalid webhook signature.' })
      }
    }

    const event = JSON.parse(req.body)
    const { event: eventType, payload } = event

    if (eventType === 'payment.captured') {
      const payment = payload.payment.entity
      const userId = payment.notes?.user_id
      const plan = payment.notes?.plan

      if (userId && plan) {
        const { data: existing } = await supabaseAdmin
          .from('subscriptions')
          .select('id')
          .eq('razorpay_payment_id', payment.id)
          .maybeSingle()

        if (!existing) {
          const { data: user } = await supabaseAdmin
            .from('users')
            .select('charity_percentage, full_name, email')
            .eq('id', userId)
            .single()

          await supabaseAdmin.from('subscriptions').insert({
            user_id: userId,
            razorpay_order_id: payment.order_id,
            razorpay_payment_id: payment.id,
            plan,
            status: 'active',
            prize_contribution: calculateContribution(plan),
            charity_contribution: calculateCharityAmount(plan, user?.charity_percentage || 10),
            current_period_start: new Date().toISOString(),
            current_period_end: plan === 'yearly'
              ? new Date(Date.now() + 365 * 86400000).toISOString()
              : new Date(Date.now() + 30 * 86400000).toISOString(),
          })
        }
      }
    }

    if (eventType === 'subscription.cancelled') {
      const sub = payload.subscription.entity
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('razorpay_order_id', sub.notes?.order_id)
    }

    res.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err)
    res.status(500).json({ error: 'Webhook processing failed.' })
  }
})

// ─────────────────────────────────────────────────────────────
// GET /api/subscriptions/status
// ─────────────────────────────────────────────────────────────
router.get('/status', protect, async (req, res) => {
  try {
    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    res.json({ subscription: subscription || null })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscription status.' })
  }
})

// ─────────────────────────────────────────────────────────────
// POST /api/subscriptions/cancel
// ─────────────────────────────────────────────────────────────
router.post('/cancel', protect, async (req, res) => {
  try {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, razorpay_payment_id')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!sub) return res.status(400).json({ error: 'No active subscription found.' })

    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', sub.id)

    res.json({ message: 'Subscription cancelled successfully.' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel subscription.' })
  }
})

module.exports = router
