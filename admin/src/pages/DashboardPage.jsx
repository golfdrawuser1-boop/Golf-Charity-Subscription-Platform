import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import PageHeader from '../components/PageHeader'
import api from '../utils/api'
import { FiUsers, FiDollarSign, FiHeart, FiAward, FiArrowRight } from 'react-icons/fi'
import styles from './DashboardPage.module.css'

const STAT_CONFIG = [
  { key: 'total_users', label: 'Total Users', icon: <FiUsers size={18} />, color: 'var(--accent)', prefix: '' },
  { key: 'active_subscribers', label: 'Active Subscribers', icon: <FiUsers size={18} />, color: 'var(--green)', prefix: '' },
  { key: 'total_prize_pool', label: 'Total Prize Pool', icon: <FiDollarSign size={18} />, color: 'var(--gold)', prefix: '₹' },
  { key: 'total_charity', label: 'Charity Donated', icon: <FiHeart size={18} />, color: 'var(--red)', prefix: '₹' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/admin/reports/overview')
      .then(r => setStats(r.data))
      .catch(() => setStats({
        total_users: 0, active_subscribers: 0,
        total_prize_pool: 0, total_charity: 0,
        recent_signups: [], monthly_revenue: [],
        pending_winners: 0, draws_this_month: 0
      }))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className={styles.page}>
      <PageHeader
        title="Dashboard"
        sub="Platform overview and key metrics"
      />

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        {STAT_CONFIG.map(({ key, label, icon, color, prefix }) => (
          <div key={key} className={`card ${styles.statCard}`}>
            <div className={styles.statIcon} style={{ background: `${color}18`, color }}>
              {icon}
            </div>
            <div>
              <p className={styles.statLabel}>{label}</p>
              <p className={styles.statValue}>
                {loading
                  ? <span className="skeleton" style={{ display: 'inline-block', width: 80, height: 28, borderRadius: 6 }} />
                  : `${prefix}${typeof stats?.[key] === 'number' ? (prefix === '₹' ? (parseFloat(stats[key]) / 100).toFixed(2) : stats[key].toLocaleString()) : 0}`
                }
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className={styles.chartsRow}>
        {/* Revenue Chart */}
        <div className={`card ${styles.chartCard}`}>
          <h2 className={styles.chartTitle}>Monthly Revenue</h2>
          {loading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: 10 }} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats?.monthly_revenue || []}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(250,245,255,0.4)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#131118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, fontSize: 13 }}
                  labelStyle={{ color: 'rgba(250,245,255,0.6)' }}
                  itemStyle={{ color: '#A855F7' }}
                  formatter={(v) => [`₹${(parseFloat(v) / 100).toFixed(2)}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#A855F7" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Signups Chart */}
        <div className={`card ${styles.chartCard}`}>
          <h2 className={styles.chartTitle}>New Signups</h2>
          {loading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: 10 }} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.recent_signups || []}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgba(250,245,255,0.4)' }} axisLine={false} tickLine={false} />
                <YAxis hide allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#131118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, fontSize: 13 }}
                  labelStyle={{ color: 'rgba(250,245,255,0.6)' }}
                  itemStyle={{ color: '#4ADE80' }}
                  formatter={(v) => [v, 'Signups']}
                />
                <Bar dataKey="count" fill="#4ADE80" radius={[4, 4, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Action Items */}
      <div className={styles.actionsRow}>
        {[
          {
            title: 'Pending Verifications',
            value: stats?.pending_winners || 0,
            desc: 'Winners awaiting proof review',
            link: '/winners',
            badge: 'badge-gold',
            urgent: (stats?.pending_winners || 0) > 0
          },
          {
            title: 'Draws This Month',
            value: stats?.draws_this_month || 0,
            desc: 'Draws run or scheduled',
            link: '/draws',
            badge: 'badge-purple',
            urgent: false
          },
          {
            title: 'Active Charities',
            value: stats?.active_charities || 0,
            desc: 'Charities in directory',
            link: '/charities',
            badge: 'badge-green',
            urgent: false
          },
        ].map(item => (
          <Link key={item.title} to={item.link} className={`card ${styles.actionCard} ${item.urgent ? styles.urgent : ''}`}>
            <div className={styles.actionTop}>
              <span className={`badge ${item.badge}`}>{item.value}</span>
              {item.urgent && <span className={styles.urgentDot} />}
            </div>
            <h3 className={styles.actionTitle}>{item.title}</h3>
            <p className={styles.actionDesc}>{item.desc}</p>
            <div className={styles.actionArrow}><FiArrowRight size={16} /></div>
          </Link>
        ))}
      </div>
    </div>
  )
}
