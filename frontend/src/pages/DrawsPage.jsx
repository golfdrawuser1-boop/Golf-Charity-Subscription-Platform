import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../utils/api'
import styles from './DrawsPage.module.css'

export default function DrawsPage() {
  const [draws, setDraws] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('upcoming') // upcoming | past

  useEffect(() => {
    // GET /api/draws now returns published + scheduled + open draws
    api.get('/api/draws')
      .then(r => setDraws(r.data.draws || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const upcoming = draws.filter(d => d.status !== 'published')
  const past = draws.filter(d => d.status === 'published')
  const list = tab === 'upcoming' ? upcoming : past

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.wrapper}>
        <div className="container">
          <div className={styles.header}>
            <div>
              <Link to="/dashboard" className={styles.back}>← Dashboard</Link>
              <h1 className={styles.title}>Draws</h1>
              <p className={styles.sub}>Monthly draws based on your Stableford scores</p>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'upcoming' ? styles.active : ''}`}
              onClick={() => setTab('upcoming')}>
              Upcoming ({upcoming.length})
            </button>
            <button className={`${styles.tab} ${tab === 'past' ? styles.active : ''}`}
              onClick={() => setTab('past')}>
              Past Results ({past.length})
            </button>
          </div>

          {loading ? (
            <div className={styles.list}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 20 }} />)}
            </div>
          ) : list.length === 0 ? (
            <div className={styles.empty}>
              <span style={{ fontSize: 48 }}>🎯</span>
              <h3>{tab === 'upcoming' ? 'No upcoming draws scheduled' : 'No past draws yet'}</h3>
              <p>{tab === 'upcoming' ? 'Check back soon — draws happen monthly.' : 'Past draw results will appear here.'}</p>
            </div>
          ) : (
            <div className={styles.list}>
              {list.map(draw => (
                <DrawCard key={draw.id} draw={draw} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DrawCard({ draw }) {
  const isPast = draw.status === 'published'
  const drawDate = new Date(draw.draw_date)
  const isThisMonth = drawDate.getMonth() === new Date().getMonth()

  return (
    <div className={`card ${styles.drawCard}`}>
      <div className={styles.drawLeft}>
        <div className={styles.drawMeta}>
          <span className={`badge ${isPast ? 'badge-muted' : 'badge-green'}`}>
            {isPast ? '✓ Completed' : isThisMonth ? '● Live' : '⏳ Upcoming'}
          </span>
          <span className={styles.drawType}>{draw.draw_type === 'algorithm' ? '🧠 Algorithmic' : '🎲 Random'}</span>
        </div>
        <h2 className={styles.drawName}>{draw.name || `Monthly Draw — ${drawDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`}</h2>
        <p className={styles.drawDate}>
          Draw date: <strong>{drawDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
        </p>
      </div>

      {/* DB column is draw_numbers — not winning_numbers */}
      {isPast && draw.draw_numbers && (
        <div className={styles.drawNumbers}>
          <p className={styles.numbersLabel}>Winning Numbers</p>
          <div className={styles.balls}>
            {draw.draw_numbers.map((n, i) => (
              <div key={i} className={styles.ball}>{n}</div>
            ))}
          </div>
        </div>
      )}

      {!isPast && (
        <div className={styles.drawPool}>
          <div className={styles.poolStat}>
            <span className={styles.poolVal}>₹{((draw.prize_pool || 0) / 100).toFixed(2)}</span>
            <span className={styles.poolLabel}>Prize Pool</span>
          </div>
          <div className={styles.poolStat}>
            <span className={styles.poolVal}>{draw.participant_count || 0}</span>
            <span className={styles.poolLabel}>Participants</span>
          </div>
        </div>
      )}

      {isPast && draw.winners && draw.winners.length > 0 && (
        <div className={styles.winnersPreview}>
          <p className={styles.numbersLabel}>Top Winner</p>
          <div className={styles.winner}>
            <span className={styles.winnerName}>{draw.winners[0]?.users?.full_name || 'Anonymous'}</span>
            <span className="badge badge-gold">₹{((draw.winners[0]?.prize_amount || 0) / 100).toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
