import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import api from '../utils/api'
import { FiArrowRight, FiTrendingUp, FiHeart, FiAward, FiClock } from 'react-icons/fi'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Use allSettled so a 403 on scores (no subscription) doesn't kill the whole dashboard
    Promise.allSettled([
      api.get('/api/scores'),
      api.get('/api/subscriptions/status'),
      api.get('/api/draws/participation'),
      api.get('/api/winners/my'),
    ]).then(([scores, sub, draws, wins]) => {
      setData({
        scores: scores.status === 'fulfilled' ? (scores.value.data.scores || []) : [],
        // /api/subscriptions/status returns { subscription: {...} } — unwrap it
        subscription: sub.status === 'fulfilled' ? (sub.value.data.subscription || null) : null,
        draws: draws.status === 'fulfilled' ? draws.value.data : { entered: 0, upcoming: [] },
        winnings: wins.status === 'fulfilled' ? wins.value.data : { total_won: 0, wins_count: 0, pending_verification: false }
      })
    }).finally(() => setLoading(false))
  }, [])

  const isActive = data?.subscription?.status === 'active'

  if (loading) return <PageSkeleton />

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.wrapper}>
        <div className="container">
          {/* Header */}
          <div className={styles.header}>
            <div>
              <p className={styles.greeting}>Good to see you back 👋</p>
              <h1 className={styles.name}>{user?.full_name || 'Golfer'}</h1>
            </div>
            <div className={styles.headerActions}>
              {!isActive && (
                <Link to="/subscribe" className="btn-primary">
                  Activate Subscription
                </Link>
              )}
              <Link to="/scores" className="btn-outline">
                + Add Score
              </Link>
            </div>
          </div>

          {/* Status Bar */}
          <div className={styles.statusBar}>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Subscription</span>
              <span className={`badge ${isActive ? 'badge-green' : 'badge-red'}`}>
                {isActive ? '● Active' : '● Inactive'}
              </span>
            </div>
            {isActive && data?.subscription?.current_period_end && (
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Renews</span>
                <span className={styles.statusValue}>
                  {new Date(data.subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            )}
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Plan</span>
              <span className={styles.statusValue} style={{ textTransform: 'capitalize' }}>
                {data?.subscription?.plan || '—'}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Draws Entered</span>
              <span className={styles.statusValue}>{data?.draws?.entered ?? 0}</span>
            </div>
          </div>

          {/* Main Grid */}
          <div className={styles.mainGrid}>
            {/* Scores Card */}
            <div className={`card ${styles.scoresCard}`}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <FiTrendingUp size={16} style={{ color: 'var(--accent)' }} />
                  My Scores
                </div>
                <Link to="/scores" className="btn-ghost">
                  Manage <FiArrowRight size={13} />
                </Link>
              </div>
              {data?.scores?.length > 0 ? (
                <div className={styles.scoresList}>
                  {data.scores.slice(0, 5).map((s, i) => (
                    <div key={s.id} className={styles.scoreItem}>
                      <div className={styles.scoreRank}>#{i + 1}</div>
                      <div className={styles.scoreVal}>{s.score}</div>
                      <div className={styles.scoreLabel}>Stableford</div>
                      <div className={styles.scoreDate}>
                        {new Date(s.played_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <span style={{ fontSize: 36 }}>⛳</span>
                  <p>No scores yet</p>
                  <Link to="/scores" className="btn-primary" style={{ marginTop: 12, fontSize: 14, padding: '10px 20px' }}>
                    Add Your First Score
                  </Link>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className={styles.rightCol}>
              {/* Charity Card */}
              <div className={`card ${styles.charityCard}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    <FiHeart size={16} style={{ color: '#F87171' }} />
                    My Charity
                  </div>
                  <Link to="/profile" className="btn-ghost">Change</Link>
                </div>
                {user?.charity ? (
                  <div className={styles.charityInfo}>
                    <h3 className={styles.charityName}>{user.charity?.name || 'Not selected'}</h3>
                    <div className={styles.charityContrib}>
                      <span className={styles.contribPct}>{user.charity_percentage || 10}%</span>
                      <span className={styles.contribLabel}>of your subscription goes to this charity</span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState} style={{ padding: '20px 0' }}>
                    <p style={{ fontSize: 14 }}>No charity selected</p>
                    <Link to="/charities" className="btn-ghost" style={{ marginTop: 8 }}>Browse Charities →</Link>
                  </div>
                )}
              </div>

              {/* Draws Card */}
              <div className={`card ${styles.drawCard}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    <FiAward size={16} style={{ color: 'var(--gold)' }} />
                    Upcoming Draws
                  </div>
                  <Link to="/draws" className="btn-ghost">View All</Link>
                </div>
                {data?.draws?.upcoming?.length > 0 ? (
                  data.draws.upcoming.slice(0, 2).map(d => (
                    <div key={d.id} className={styles.drawItem}>
                      <div>
                        <div className={styles.drawName}>{d.name || 'Monthly Draw'}</div>
                        <div className={styles.drawDate}>
                          <FiClock size={11} />
                          {new Date(d.draw_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                        </div>
                      </div>
                      <span className="badge badge-green">Entered</span>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState} style={{ padding: '20px 0' }}>
                    <p style={{ fontSize: 14 }}>{isActive ? 'No upcoming draws' : 'Subscribe to enter draws'}</p>
                  </div>
                )}
              </div>

              {/* Winnings Card */}
              <div className={`card ${styles.winCard}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    🏆 Winnings
                  </div>
                </div>
                <div className={styles.winStats}>
                  <div className={styles.winStat}>
                    <span className={styles.winVal}>
                      ₹{((data?.winnings?.total_won || 0) / 100).toFixed(2)}
                    </span>
                    <span className={styles.winLabel}>Total Won</span>
                  </div>
                  <div className={styles.winDivider} />
                  <div className={styles.winStat}>
                    <span className={styles.winVal}>
                      {data?.winnings?.wins_count || 0}
                    </span>
                    <span className={styles.winLabel}>Times Won</span>
                  </div>
                </div>
                {data?.winnings?.pending_verification && (
                  <div className={styles.pendingAlert}>
                    ⚠️ You have a win pending verification. <Link to="/profile" style={{ color: 'var(--gold)' }}>Upload proof →</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{ height: 70, background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }} />
      <div className="container" style={{ paddingTop: 40 }}>
        <div className="skeleton" style={{ height: 40, width: 200, borderRadius: 8, marginBottom: 32 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ height: 180, borderRadius: 20 }} />
          ))}
        </div>
      </div>
    </div>
  )
}
