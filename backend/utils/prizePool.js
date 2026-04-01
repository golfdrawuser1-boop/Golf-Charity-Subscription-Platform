/**
 * PRIZE POOL CALCULATOR
 * As per PRD: A fixed portion of each subscription contributes to prize pool
 */

// Subscription amounts (in pence/cents for Stripe)
const SUBSCRIPTION_AMOUNTS = {
  monthly: 199900, // ₹1,999
  yearly: 1999900  // ₹19,999
}

// What percentage goes to prize pool (60% of subscription)
const PRIZE_POOL_PERCENTAGE = parseFloat(process.env.PRIZE_POOL_PERCENTAGE || 60) / 100

// What percentage goes to charity (minimum 10%)
const MIN_CHARITY_PERCENTAGE = parseFloat(process.env.MIN_CHARITY_PERCENTAGE || 10) / 100

// Calculate prize pool contribution from one subscription
const calculateContribution = (plan) => {
  const amount = SUBSCRIPTION_AMOUNTS[plan] || SUBSCRIPTION_AMOUNTS.monthly
  return Math.floor(amount * PRIZE_POOL_PERCENTAGE)
}

// Calculate total prize pool from all active subscribers
const calculateTotalPrizePool = (subscribers) => {
  return subscribers.reduce((total, sub) => {
    return total + calculateContribution(sub.plan)
  }, 0)
}

// Calculate charity contribution for a user
const calculateCharityAmount = (plan, charityPercentage) => {
  const amount = SUBSCRIPTION_AMOUNTS[plan] || SUBSCRIPTION_AMOUNTS.monthly
  const percentage = Math.max(charityPercentage / 100, MIN_CHARITY_PERCENTAGE)
  return Math.floor(amount * percentage)
}

// Format pence to pounds display
const formatCurrency = (pence) => {
  return `₹${(pence / 100).toFixed(2)}`
}

module.exports = {
  SUBSCRIPTION_AMOUNTS,
  calculateContribution,
  calculateTotalPrizePool,
  calculateCharityAmount,
  formatCurrency
}
