import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { FiArrowLeft } from 'react-icons/fi'
import styles from './WinnersPage.module.css'

export default function WinnersPage() {
  const { user } = useAuth()
  const [winners, setWinners] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/winners')
      .then(r => {
        const flat = (r.data.winners || []).map(w => ({
          ...w,
          user_name: w.users?.full_name || w.user_name || 'Anonymous',
          draw_name: w.draws?.name || w.draw_name || 'Monthly Draw',
          draw_date: w.draws?.draw_date || w.draw_date,
        }))
        setWinners(flat)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const grouped = winners.reduce((acc, w) => {
    const key = w.draw_name || 'Monthly Draw'
    if (!acc[key]) acc[key] = []
    acc[key].push(w)
    return acc
  }, {})

  const matchLabel = (type) => {
    if (type === '5_match') return { label: '5 Match 🏆', color: '#F59E0B' }
    if (type === '4_match') return { label: '4 Match 🥈', color: '#94A3B8' }
    return { label: '3 Match 🥉', color: '#CD7C2F' }
  }

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.wrapper}>
        <div className="container">

          {/* Dashboard Back Button */}
          {user && (
            <Link to="/dashboard" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: 'rgba(240,253,244,0.5)', fontSize: 14, textDecoration: 'none',
              marginBottom: 24, transition: 'color 0.2s',
            }}
              onMouseEnter={e => e.target.style.color = '#4ADE80'}
              onMouseLeave={e => e.target.style.color = 'rgba(240,253,244,0.5)'}
            >
              <FiArrowLeft size={14} /> Dashboard
            </Link>
          )}

          <div className={styles.header}>
            <span className="badge badge-gold">🏆 Hall of Fame</span>
            <h1 className={styles.title}>Past Winners</h1>
            <p className={styles.sub}>Congratulations to everyone who has won a GolfDraw prize.</p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 32 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14 }} />)}
            </div>
          ) : winners.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '80px 20px',
              background: 'var(--bg-card)', borderRadius: 20,
              border: '1px solid var(--border)', marginTop: 40,
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>No winners yet</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                Winners will appear here after draws are published.
              </p>
            </div>
          ) : (
            <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 32 }}>
              {Object.entries(grouped).map(([drawName, drawWinners]) => (
                <div key={drawName}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
                    {drawName}
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {drawWinners.map(w => {
                      const { label, color } = matchLabel(w.match_type)
                      return (
                        <div key={w.id} style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: 14, padding: '18px 24px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          flexWrap: 'wrap', gap: 12,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{
                              width: 44, height: 44, borderRadius: '50%',
                              background: `${color}22`, border: `1px solid ${color}44`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 18,
                            }}>
                              🏆
                            </div>
                            <div>
                              <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>
                                {w.user_name}
                              </p>
                              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                {label} · {w.draw_date ? new Date(w.draw_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                              </p>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: 20, fontWeight: 800, color, fontFamily: 'var(--font-display)' }}>
                              ₹{((w.prize_amount || 0) / 100).toFixed(0)}
                            </p>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                              {w.status}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
