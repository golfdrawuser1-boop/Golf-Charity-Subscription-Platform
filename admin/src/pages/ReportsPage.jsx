import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import PageHeader from '../components/PageHeader'
import api from '../utils/api'
import styles from './ReportsPage.module.css'

const COLORS = ['#A855F7', '#4ADE80', '#F59E0B', '#F87171', '#60A5FA']

export default function ReportsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('6m')

  useEffect(() => {
    setLoading(true)
    api.get(`/api/admin/reports/full?period=${period}`)
      .then(r => setData(r.data))
      .catch(() => setData(getMockData()))
      .finally(() => setLoading(false))
  }, [period])

  const summary = data?.summary || {}

  return (
    <div className={styles.page}>
      <PageHeader
        title="Reports & Analytics"
        sub="Platform performance, revenue, and draw statistics"
        actions={
          <div className={styles.periodSelect}>
            {['1m', '3m', '6m', '1y'].map(p => (
              <button key={p} className={`${styles.periodBtn} ${period === p ? styles.periodActive : ''}`}
                onClick={() => setPeriod(p)}>
                {p === '1m' ? '1 Month' : p === '3m' ? '3 Months' : p === '6m' ? '6 Months' : '1 Year'}
              </button>
            ))}
          </div>
        }
      />

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        {[
          { label: 'Total Revenue', value: `₹${(parseFloat(summary.total_revenue || 0) / 100).toFixed(2)}`, delta: summary.revenue_delta, color: 'var(--accent)' },
          { label: 'Total Users', value: (summary.total_users || 0).toLocaleString(), delta: summary.users_delta, color: 'var(--green)' },
          { label: 'Charity Donated', value: `₹${(parseFloat(summary.charity_total || 0) / 100).toFixed(2)}`, delta: null, color: '#F87171' },
          { label: 'Draws Run', value: summary.draws_total || 0, delta: null, color: 'var(--gold)' },
          { label: 'Prize Pool Paid', value: `₹${(parseFloat(summary.prizes_paid || 0) / 100).toFixed(2)}`, delta: null, color: '#60A5FA' },
          { label: 'Avg. Score', value: parseFloat(summary.avg_score || 0).toFixed(1), delta: null, color: 'var(--text-secondary)' },
        ].map(s => (
          <div key={s.label} className={`card ${styles.summaryCard}`}>
            <p className={styles.summaryLabel}>{s.label}</p>
            <p className={styles.summaryValue} style={{ color: s.color }}>
              {loading ? <span className="skeleton" style={{ display: 'inline-block', width: 80, height: 28, borderRadius: 6 }} /> : s.value}
            </p>
            {s.delta !== null && s.delta !== undefined && (
              <p className={`${styles.delta} ${s.delta >= 0 ? styles.deltaUp : styles.deltaDown}`}>
                {s.delta >= 0 ? '↑' : '↓'} {Math.abs(s.delta)}% vs last period
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Revenue + Subscribers charts */}
      <div className={styles.chartsRow}>
        <div className={`card ${styles.chartCard}`}>
          <h2 className={styles.chartTitle}>Revenue Over Time</h2>
          {loading ? <SkeletonChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data?.revenue_over_time || []}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A855F7" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(250,245,255,0.4)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#131118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, fontSize: 12 }}
                  formatter={v => [`₹${(parseFloat(v) / 100).toFixed(2)}`, 'Revenue']}
                  labelStyle={{ color: 'rgba(250,245,255,0.5)' }}
                  itemStyle={{ color: '#A855F7' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#A855F7" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={`card ${styles.chartCard}`}>
          <h2 className={styles.chartTitle}>Subscriber Growth</h2>
          {loading ? <SkeletonChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data?.subscriber_growth || []}>
                <defs>
                  <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ADE80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(250,245,255,0.4)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#131118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, fontSize: 12 }}
                  formatter={v => [v, 'Subscribers']}
                  labelStyle={{ color: 'rgba(250,245,255,0.5)' }}
                  itemStyle={{ color: '#4ADE80' }}
                />
                <Area type="monotone" dataKey="count" stroke="#4ADE80" strokeWidth={2} fill="url(#subGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Draw stats + Charity breakdown */}
      <div className={styles.chartsRow}>
        <div className={`card ${styles.chartCard}`}>
          <h2 className={styles.chartTitle}>Draw Prize Distribution</h2>
          {loading ? <SkeletonChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.draw_stats || []}>
                <XAxis dataKey="draw" tick={{ fontSize: 11, fill: 'rgba(250,245,255,0.4)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#131118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, fontSize: 12 }}
                  formatter={v => [`₹${(parseFloat(v) / 100).toFixed(2)}`, 'Pool']}
                  labelStyle={{ color: 'rgba(250,245,255,0.5)' }}
                  itemStyle={{ color: '#F59E0B' }}
                />
                <Bar dataKey="pool" fill="#F59E0B" radius={[4,4,0,0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={`card ${styles.chartCard}`}>
          <h2 className={styles.chartTitle}>Charity Contributions</h2>
          {loading ? <SkeletonChart /> : (
            <div className={styles.pieWrap}>
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie
                    data={data?.charity_breakdown || []}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={90}
                    dataKey="amount"
                    paddingAngle={3}
                  >
                    {(data?.charity_breakdown || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#131118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, fontSize: 12 }}
                    formatter={v => [`₹${(parseFloat(v) / 100).toFixed(2)}`]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.pieLegend}>
                {(data?.charity_breakdown || []).map((c, i) => (
                  <div key={c.name} className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: COLORS[i % COLORS.length] }} />
                    <div>
                      <div className={styles.legendName}>{c.name}</div>
                      <div className={styles.legendVal}>₹{(parseFloat(c.amount) / 100).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Draw Checklist */}
      <div className={`card ${styles.checklistCard}`}>
        <h2 className={styles.chartTitle}>Draw Statistics</h2>
        <div className={styles.drawTable}>
          {loading ? (
            [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8, marginBottom: 8 }} />)
          ) : (data?.draw_results || []).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: '20px 0', fontSize: 14 }}>No draws run yet</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Draw</th>
                  <th>Date</th>
                  <th>Participants</th>
                  <th>Prize Pool</th>
                  <th>Winners</th>
                  <th>Jackpot</th>
                </tr>
              </thead>
              <tbody>
                {data.draw_results.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</td>
                    <td>{new Date(d.draw_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td>{d.participant_count || 0}</td>
                    <td style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                      ₹{(parseFloat(d.prize_pool || 0) / 100).toFixed(2)}
                    </td>
                    <td>
                      <span className="badge badge-purple">{d.winner_count || 0}</span>
                    </td>
                    <td>
                      {d.jackpot_rolled ? (
                        <span className="badge badge-gold">↩ Rolled</span>
                      ) : (
                        <span className="badge badge-green">Won</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function SkeletonChart() {
  return <div className="skeleton" style={{ height: 220, borderRadius: 10 }} />
}

function getMockData() {
  return {
    summary: { total_revenue: 0, total_users: 0, charity_total: 0, draws_total: 0, prizes_paid: 0, avg_score: 0 },
    revenue_over_time: [],
    subscriber_growth: [],
    draw_stats: [],
    charity_breakdown: [],
    draw_results: [],
  }
}
