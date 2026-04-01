import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FiCheckCircle, FiArrowRight } from 'react-icons/fi'

export default function SuccessPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [countdown, setCountdown] = useState(8)
  const plan = searchParams.get('plan') || 'monthly'

  // Countdown + auto-redirect
  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); navigate('/dashboard', { replace: true }); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [navigate])

  return (
    <div style={{
      minHeight: '100vh', background: '#080C0A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 16px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(74,222,128,0.09) 0%, transparent 65%)',
      }} />

      {/* Card */}
      <div style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(74,222,128,0.2)',
        borderRadius: 24, padding: '56px 48px',
        maxWidth: 480, width: '100%', textAlign: 'center',
        boxShadow: '0 0 80px rgba(74,222,128,0.07)',
      }}>
        {/* Icon */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(74,222,128,0.12)',
          border: '2px solid rgba(74,222,128,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          animation: 'successPulse 2s ease-in-out infinite',
        }}>
          <FiCheckCircle size={38} color="#4ADE80" />
        </div>

        <h1 style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 32, fontWeight: 800,
          color: '#F0FDF4', letterSpacing: '-0.02em', marginBottom: 12,
        }}>
          Payment Successful! 🎉
        </h1>

        <p style={{ fontSize: 16, color: 'rgba(240,253,244,0.6)', lineHeight: 1.6, marginBottom: 32 }}>
          Welcome to GolfDraw. Your subscription is now active and you're entered into the next monthly draw.
        </p>

        {/* Summary */}
        <div style={{
          background: 'rgba(74,222,128,0.05)',
          border: '1px solid rgba(74,222,128,0.14)',
          borderRadius: 14, padding: '20px 24px', marginBottom: 32,
          display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left',
        }}>
          {[
            { label: 'Status', value: '✓ Active', accent: true },
            { label: 'Plan', value: plan.charAt(0).toUpperCase() + plan.slice(1) },
            { label: 'Charity contribution', value: '10% of your subscription' },
            { label: 'Next draw', value: 'End of this month' },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'rgba(240,253,244,0.45)' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: accent ? '#4ADE80' : '#F0FDF4' }}>{value}</span>
            </div>
          ))}
        </div>

        <Link to="/dashboard" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: '#4ADE80', color: '#080C0A',
          fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 700,
          padding: '14px 32px', borderRadius: 12, textDecoration: 'none',
        }}>
          Go to Dashboard <FiArrowRight size={16} />
        </Link>

        <p style={{ marginTop: 16, fontSize: 12, color: 'rgba(240,253,244,0.28)' }}>
          Redirecting in {countdown}s…
        </p>
      </div>

      <style>{`
        @keyframes successPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.2); }
          50% { box-shadow: 0 0 0 14px rgba(74,222,128,0); }
        }
      `}</style>
    </div>
  )
}
