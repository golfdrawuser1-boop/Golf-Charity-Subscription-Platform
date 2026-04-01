import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { FiCheck } from 'react-icons/fi'
import styles from './SubscribePage.module.css'

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID

const PLANS = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '₹1,999',
    period: '/month',
    features: [
      'Enter monthly prize draws',
      'Track up to 5 Stableford scores',
      'Support your chosen charity',
      'Access draw results & history',
      'Cancel anytime',
    ],
    highlight: false,
  },
  {
    id: 'yearly',
    name: 'Annual',
    price: '₹19,999',
    period: '/year',
    savings: 'Save ₹3,989',
    features: [
      'Everything in Monthly',
      'Save 25% vs monthly billing',
      '12 months of draw entries',
      'Priority winner support',
      'Early access to new features',
    ],
    highlight: true,
  },
]

const BENEFITS = [
  { icon: '🏆', text: 'Monthly prize draws with jackpot rollover' },
  { icon: '💚', text: '10%+ of subscription goes to your charity' },
  { icon: '⛳', text: 'Track your Stableford scores' },
  { icon: '🔒', text: 'Cancel anytime, no hidden fees' },
]

// Load Razorpay SDK dynamically
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function SubscribePage() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [selected, setSelected] = useState('yearly')
  const [loading, setLoading] = useState(false)
  const [checkingSubscription, setCheckingSubscription] = useState(true)

  // Redirect if already subscribed
  useEffect(() => {
    if (!user) { setCheckingSubscription(false); return }
    api.get('/api/subscriptions/status')
      .then(({ data }) => {
        if (data.subscription?.status === 'active') {
          toast('You already have an active subscription!', { icon: '✅' })
          navigate('/dashboard', { replace: true })
        }
      })
      .catch(() => {})
      .finally(() => setCheckingSubscription(false))
  }, [user, navigate])

  const handleSubscribe = async () => {
    if (!user) {
      toast('Please sign in first', { icon: '👋' })
      navigate('/login')
      return
    }

    setLoading(true)

    try {
      // Step 1: Load Razorpay SDK
      const sdkLoaded = await loadRazorpayScript()
      if (!sdkLoaded) {
        toast.error('Payment gateway failed to load. Please check your internet connection.')
        setLoading(false)
        return
      }

      // Step 2: Create order on backend
      const { data: order } = await api.post('/api/subscriptions/create-order', {
        plan: selected,
      })

      // Step 3: Open Razorpay checkout
      const options = {
        key: order.key_id || RAZORPAY_KEY,
        amount: order.amount,
        currency: order.currency,
        name: 'GolfDraw',
        description: selected === 'yearly'
          ? 'Annual Subscription — ₹19,999/year'
          : 'Monthly Subscription — ₹1,999/month',
        order_id: order.order_id,
        prefill: {
          name: order.user_name || user.full_name,
          email: order.user_email || user.email,
        },
        theme: { color: '#4ADE80' },
        modal: {
          ondismiss: () => {
            setLoading(false)
            toast('Payment cancelled. You can try again anytime.', { icon: '💡' })
          },
        },
        handler: async (response) => {
          // Step 4: Verify payment on backend and activate subscription
          try {
            toast.loading('Activating your subscription…', { id: 'activating' })
            await api.post('/api/subscriptions/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: selected,
            })
            toast.dismiss('activating')

            // Refresh user profile so subscription shows as active
            const { data: me } = await api.get('/api/auth/me')
            if (me.user) updateUser(me.user)

            navigate(`/success?plan=${selected}`, { replace: true })
          } catch (err) {
            toast.dismiss('activating')
            toast.error(
              err.response?.data?.error ||
              'Payment received but activation failed. Please contact support with your payment ID: ' + response.razorpay_payment_id
            )
            setLoading(false)
          }
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (response) => {
        setLoading(false)
        toast.error('Payment failed: ' + (response.error?.description || 'Please try again.'))
      })
      rzp.open()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not initiate payment. Please try again.')
      setLoading(false)
    }
  }

  if (checkingSubscription) {
    return (
      <div style={{
        minHeight: '100vh', background: '#080C0A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 36, height: 36,
          border: '2px solid rgba(74,222,128,0.2)',
          borderTop: '2px solid #4ADE80',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg}>
        <div className={styles.blob1} />
        <div className={styles.blob2} />
      </div>

      {/* Nav */}
      <div className={styles.topNav}>
        <Link to="/" className={styles.logoLink}>
          <span>⛳</span>
          <span className={styles.logoText}>Golf<span>Draw</span></span>
        </Link>
        {user
          ? <Link to="/dashboard" className="btn-ghost">← Dashboard</Link>
          : <Link to="/login" className="btn-ghost">Sign in</Link>
        }
      </div>

      <div className="container">
        <div className={styles.hero}>
          <span className="badge badge-green">🎯 Simple Pricing</span>
          <h1 className={styles.title}>Choose your plan</h1>
          <p className={styles.sub}>Join thousands of golfers. Play. Give. Win. Every month.</p>
        </div>

        {/* Plans */}
        <div className={styles.plansGrid}>
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`${styles.planCard} ${selected === plan.id ? styles.selected : ''} ${plan.highlight ? styles.highlighted : ''}`}
              onClick={() => setSelected(plan.id)}
            >
              {plan.highlight && <div className={styles.popularBadge}>Most Popular</div>}
              {plan.savings && (
                <span className="badge badge-gold" style={{ marginBottom: 16 }}>{plan.savings}</span>
              )}
              <h2 className={styles.planName}>{plan.name}</h2>
              <div className={styles.planPrice}>
                <span className={styles.priceVal}>{plan.price}</span>
                <span className={styles.pricePeriod}>{plan.period}</span>
              </div>
              {plan.id === 'yearly' && <p className={styles.monthly}>That's just ₹1,667/month</p>}
              <ul className={styles.featureList}>
                {plan.features.map(f => (
                  <li key={f} className={styles.feature}>
                    <FiCheck size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
              <div className={`${styles.selectIndicator} ${selected === plan.id ? styles.selectActive : ''}`}>
                {selected === plan.id ? '✓ Selected' : 'Select'}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={styles.ctaArea}>
          <button
            className="btn-primary"
            onClick={handleSubscribe}
            disabled={loading}
            style={{ fontSize: 17, padding: '16px 48px' }}
          >
            {loading ? <Spinner /> : `Subscribe ${selected === 'yearly' ? 'Annually' : 'Monthly'} →`}
          </button>
          <p className={styles.ctaSub}>
            Secure payment via Razorpay · Cancel anytime ·{' '}
            {user
              ? `Logged in as ${user.email}`
              : <Link to="/register" style={{ color: 'var(--accent)' }}>Create account first</Link>
            }
          </p>
        </div>

        {/* Benefits */}
        <div className={styles.benefits}>
          {BENEFITS.map(b => (
            <div key={b.text} className={styles.benefit}>
              <span style={{ fontSize: 22 }}>{b.icon}</span>
              <span className={styles.benefitText}>{b.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 18, height: 18,
      border: '2px solid rgba(8,12,10,0.3)',
      borderTop: '2px solid #080C0A',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    }} />
  )
}
