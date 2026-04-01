import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import api from '../utils/api'
import styles from './HomePage.module.css'

const STATS = [
  { label: 'Active Members', value: '2,847' },
  { label: 'Total Donated', value: '₹142K' },
  { label: 'Monthly Jackpot', value: '₹8,400' },
  { label: 'Charities Supported', value: '24' },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Subscribe',
    desc: 'Join with a monthly or yearly plan. Every subscription contributes to the prize pool and a charity of your choice.'
  },
  {
    step: '02',
    title: 'Enter Your Scores',
    desc: 'Record your latest 5 Stableford golf scores. Your scores are your draw tickets — every round counts.'
  },
  {
    step: '03',
    title: 'Win & Give',
    desc: 'Monthly draws match your scores against the draw numbers. Win cash prizes while your subscription funds charity.'
  }
]

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [charities, setCharities] = useState([])
  const [nextDraw, setNextDraw] = useState(null)
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0 })

  useEffect(() => {
    api.get('/api/charities?limit=3').then(r => setCharities(r.data.charities || [])).catch(() => {})
    api.get('/api/draws/next').then(r => setNextDraw(r.data)).catch(() => {})
  }, [])

  // Countdown to end of month with seconds
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const diff = end - now
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const handleProtectedNav = (path) => {
    if (!user) {
      navigate('/login')
    } else {
      navigate(path)
    }
  }

  return (
    <div className={`${styles.page} noise`}>
      <Navbar />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBg}>
          <div className={styles.blob1} />
          <div className={styles.blob2} />
          <div className={styles.grid} />
        </div>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroBadge}>
            <span className="badge badge-green">⚡ Monthly Draw Open</span>
          </div>
          <h1 className={styles.heroTitle}>
            Golf that<br />
            <span className={styles.heroAccent}>gives back</span>
          </h1>
          <p className={styles.heroSub}>
            Track your scores. Enter monthly prize draws. Support the charity<br className={styles.br} /> you care about. All in one platform built for golfers who want more.
          </p>
          <div className={styles.heroCtas}>
            <button onClick={() => handleProtectedNav('/dashboard')} className="btn-primary">
              Start Playing →
            </button>
            <button onClick={() => handleProtectedNav('/winners')} className="btn-outline">See Past Winners</button>
          </div>

          {/* Draw Countdown */}
          <div className={styles.countdown}>
            <p className={styles.countdownLabel}>Next draw closes in</p>
            <div className={styles.countdownTiles}>
              {[
                { v: countdown.days, l: 'Days' },
                { v: countdown.hours, l: 'Hours' },
                { v: countdown.mins, l: 'Mins' },
                { v: countdown.secs, l: 'Secs' },
              ].map(({ v, l }) => (
                <div key={l} className={styles.countdownTile}>
                  <span className={styles.countdownNum}>{String(v).padStart(2, '0')}</span>
                  <span className={styles.countdownSub}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className={styles.statsBar}>
        <div className="container">
          <div className={styles.statsGrid}>
            {STATS.map(s => (
              <div key={s.label} className={styles.statItem}>
                <span className={styles.statValue}>{s.value}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHead}>
            <span className="badge badge-muted">How It Works</span>
            <h2 className={styles.sectionTitle}>Simple by design.<br />Rewarding by nature.</h2>
          </div>
          <div className={styles.stepsGrid}>
            {HOW_IT_WORKS.map((s, i) => (
              <div key={i} className={`card ${styles.stepCard}`}>
                <span className={styles.stepNum}>{s.step}</span>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prize Pool */}
      <section className={styles.prizeSection}>
        <div className="container">
          <div className={styles.prizeCard}>
            <div className={styles.prizeLeft}>
              <span className="badge badge-gold">🏆 Prize Pool</span>
              <h2 className={styles.prizeTitle}>Three ways to win every month</h2>
              <p className={styles.prizeDesc}>Match 3, 4, or all 5 numbers drawn against your Stableford scores. Jackpot rolls over if no 5-match winner.</p>
              <Link to="/subscribe" className="btn-primary" style={{ marginTop: 24 }}>Join the Draw →</Link>
            </div>
            <div className={styles.prizeRight}>
              {[
                { match: '5 Numbers', share: '40%', label: 'Jackpot', badge: 'badge-gold', rollover: true },
                { match: '4 Numbers', share: '35%', label: 'Major Prize', badge: 'badge-green', rollover: false },
                { match: '3 Numbers', share: '25%', label: 'Prize', badge: 'badge-muted', rollover: false },
              ].map(p => (
                <div key={p.match} className={styles.prizeTier}>
                  <div>
                    <div className={styles.prizeMatch}>{p.match}</div>
                    <div className={styles.prizeMatchLabel}>{p.label} {p.rollover && <span className={styles.rollBadge}>↩ Rollover</span>}</div>
                  </div>
                  <span className={`badge ${p.badge}`}>{p.share}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Charities */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHead}>
            <span className="badge badge-green">💚 Charity Impact</span>
            <h2 className={styles.sectionTitle}>You choose who benefits</h2>
            <p className={styles.sectionSub}>A minimum of 10% of every subscription goes directly to your chosen charity. Increase your contribution any time.</p>
          </div>
          {charities.length > 0 ? (
            <div className={styles.charitiesGrid}>
              {charities.map(c => (
                <div key={c.id} className={`card ${styles.charityCard}`}>
                  {c.image_url && <img src={c.image_url} alt={c.name} className={styles.charityImg} />}
                  <div className={styles.charityInfo}>
                    {c.is_featured && <span className="badge badge-gold" style={{ marginBottom: 8 }}>⭐ Featured</span>}
                    <h3 className={styles.charityName}>{c.name}</h3>
                    <p className={styles.charityDesc}>{c.description?.slice(0, 100)}...</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.charitiesGrid}>
              {[1,2,3].map(i => (
                <div key={i} className={`card ${styles.charityCard}`}>
                  <div className={`skeleton ${styles.charityImg}`} />
                  <div style={{ padding: '0 4px' }}>
                    <div className="skeleton" style={{ height: 18, width: '60%', marginBottom: 10, borderRadius: 6 }} />
                    <div className="skeleton" style={{ height: 14, width: '90%', marginBottom: 6, borderRadius: 6 }} />
                    <div className="skeleton" style={{ height: 14, width: '70%', borderRadius: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <Link to="/charities" className="btn-outline">View All Charities →</Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.ctaSection}>
        <div className="container">
          <div className={styles.ctaBox}>
            <div className={styles.ctaGlow} />
            <h2 className={styles.ctaTitle}>Ready to play with purpose?</h2>
            <p className={styles.ctaSub}>Join thousands of golfers tracking scores, winning prizes, and making a difference.</p>
            <div className={styles.ctaBtns}>
              <Link to="/subscribe" className="btn-primary">Subscribe Now</Link>
              <Link to="/charities" className="btn-ghost">Browse Charities</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerInner}>
            <div className={styles.footerLogo}>
              <span style={{ fontSize: 20 }}>⛳</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>
                Golf<span style={{ color: 'var(--accent)' }}>Draw</span>
              </span>
            </div>
            <p className={styles.footerText}>© 2026 GolfDraw. Built for golfers who give back.</p>
            <div className={styles.footerLinks}>
              <Link to="/charities" className={styles.footerLink}>Charities</Link>
              <Link to="/winners" className={styles.footerLink}>Winners</Link>
              <Link to="/subscribe" className={styles.footerLink}>Subscribe</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
