const Razorpay = require('razorpay')
require('dotenv').config()

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// Plan amounts in paise (INR × 100)
const PLANS = {
  monthly: {
    amount: 199900,      // ₹1,999 in paise
    currency: 'INR',
    description: 'GolfDraw Monthly Subscription',
    interval: 'monthly',
  },
  yearly: {
    amount: 1999900,     // ₹19,999 in paise
    currency: 'INR',
    description: 'GolfDraw Annual Subscription',
    interval: 'yearly',
  },
}

module.exports = { razorpay, PLANS }
