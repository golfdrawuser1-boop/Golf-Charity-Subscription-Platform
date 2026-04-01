const nodemailer = require('nodemailer')

// Email is optional — if credentials not configured, silently skip
// To enable: set EMAIL_USER and EMAIL_PASS (Gmail App Password) in .env
const isEmailConfigured = () => {
  return !!(
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS &&
    process.env.EMAIL_USER !== 'your_email@gmail.com' &&
    process.env.EMAIL_PASS !== 'your_app_password'
  )
}

const createTransporter = () => {
  if (!isEmailConfigured()) return null
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

const sendEmail = async ({ to, subject, html, text }) => {
  if (!isEmailConfigured()) {
    console.log(`[Email skipped — not configured] To: ${to} | Subject: ${subject}`)
    return { skipped: true }
  }
  try {
    const transporter = createTransporter()
    const info = await transporter.sendMail({
      from: `"GolfDraw" <${process.env.EMAIL_USER}>`,
      to, subject, html, text,
    })
    return info
  } catch (err) {
    // Log but never crash the app — email is non-critical
    console.error('Email send error (non-fatal):', err.message)
    return { error: err.message }
  }
}

const emails = {
  welcomeEmail: (name) => ({
    subject: 'Welcome to GolfDraw! 🏌️',
    html: `<h2>Welcome, ${name}!</h2><p>Your GolfDraw account is ready. Subscribe to start playing and giving.</p>`,
    text: `Welcome ${name}! Your GolfDraw account is ready.`,
  }),

  subscriptionConfirmed: (name, plan) => ({
    subject: 'Subscription Confirmed — GolfDraw ✅',
    html: `<h2>You're in, ${name}!</h2><p>Your ${plan} subscription is now active. You're entered into the next monthly draw.</p>`,
    text: `Hi ${name}, your ${plan} subscription is active.`,
  }),

  drawResult: (name, matchType, prize) => ({
    subject: '🎉 You Won a GolfDraw Prize!',
    html: `<h2>Congratulations ${name}!</h2><p>You matched ${matchType} and won ₹${prize}. Log in to verify your winnings.</p>`,
    text: `Congratulations ${name}! You won ₹${prize}.`,
  }),

  payoutComplete: (name, amount) => ({
    subject: 'Your GolfDraw Payout is Complete 💰',
    html: `<h2>Hi ${name},</h2><p>Your prize payout of ₹${amount} has been processed. Congratulations!</p>`,
    text: `Hi ${name}, your payout of ₹${amount} is complete.`,
  }),
}

module.exports = { sendEmail, emails }
