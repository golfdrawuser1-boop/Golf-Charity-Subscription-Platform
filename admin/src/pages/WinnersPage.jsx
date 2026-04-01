import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { FiCheck, FiX, FiEye } from 'react-icons/fi'
import styles from './WinnersPage.module.css'

// Backend uses single status: 'pending' | 'verification_pending' | 'verified' | 'rejected' | 'paid'

const TABS = ['all', 'pending', 'verified', 'paid']

export default function WinnersPage() {
  const [winners, setWinners] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [processing, setProcessing] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  const loadWinners = () => {
    setLoading(true)
    api.get('/api/admin/winners')
      .then(r => {
        const flat = (r.data.winners || []).map(w => ({
          ...w,
          user_name: w.users?.full_name || w.user_name || 'Unknown',
          user_email: w.users?.email || w.user_email || '',
          draw_name: w.draws?.name || w.draw_name || 'Monthly Draw',
          draw_date: w.draws?.draw_date || w.draw_date || null,
        }))
        setWinners(flat)
      })
      .catch(() => toast.error('Failed to load winners'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadWinners() }, [])

  const handleVerify = async (id, action) => {
    setProcessing(id + action)
    try {
      await api.put(`/api/admin/winners/${id}/verify`, { action })
      toast.success(action === 'approve' ? 'Winner approved!' : 'Winner rejected')
      loadWinners()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed')
    } finally { setProcessing(null) }
  }

  const handleMarkPaid = async (id) => {
    setProcessing(id + 'paid')
    try {
      await api.put(`/api/admin/winners/${id}/payout`)
      toast.success('Marked as paid!')
      loadWinners()
    } catch {
      toast.error('Failed to update payout')
    } finally { setProcessing(null) }
  }

  const filtered = winners.filter(w => {
    if (tab === 'all') return true
    if (tab === 'pending') return ['pending', 'verification_pending'].includes(w.status)
    if (tab === 'verified') return w.status === 'verified'
    if (tab === 'paid') return w.status === 'paid'
    return true
  })

  const pendingCount = winners.filter(w => ['pending', 'verification_pending'].includes(w.status)).length

  return (
    <div className={styles.page}>
      <PageHeader title="Winners" sub="Verify submissions and manage prize payouts" />

      {pendingCount > 0 && (
        <div className={styles.alertBanner}>
          ⚠️ <strong>{pendingCount} winner{pendingCount > 1 ? 's' : ''}</strong> pending verification
          <button className={styles.alertBtn} onClick={() => setTab('pending')}>Review now →</button>
        </div>
      )}

      <div className={styles.tabs}>
        {TABS.map(t => {
          const count =
            t === 'all' ? winners.length
            : t === 'pending' ? winners.filter(w => ['pending', 'verification_pending'].includes(w.status)).length
            : t === 'verified' ? winners.filter(w => w.status === 'verified').length
            : winners.filter(w => w.status === 'paid').length
          return (
            <button key={t} className={`${styles.tab} ${tab === t ? styles.activeTab : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              <span className={styles.tabCount}>{count}</span>
            </button>
          )
        })}
      </div>

      <div className={`card ${styles.tableCard}`}>
        {loading ? (
          <div className={styles.loadingRows}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8, marginBottom: 8 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <span style={{ fontSize: 40 }}>🏆</span>
            <p>No winners in this category</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Winner</th><th>Draw</th><th>Match</th><th>Prize</th><th>Proof</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => (
                <tr key={w.id}>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.userAvatar}>{w.user_name?.[0]?.toUpperCase() || '?'}</div>
                      <div>
                        <div className={styles.userName}>{w.user_name}</div>
                        <div className={styles.userEmail}>{w.user_email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13 }}>{w.draw_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {w.draw_date ? new Date(w.draw_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${w.match_type?.includes('5') ? 'badge-gold' : w.match_type?.includes('4') ? 'badge-purple' : 'badge-muted'}`}>
                      {w.match_type || '—'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--gold)' }}>
                      ₹{(parseFloat(w.prize_amount || 0) / 100).toFixed(2)}
                    </span>
                  </td>
                  <td>
                    {w.proof_url
                      ? <button className="btn-ghost" onClick={() => setPreviewUrl(w.proof_url)}><FiEye size={13} /> View</button>
                      : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Not uploaded</span>
                    }
                  </td>
                  <td><StatusBadge status={w.status} /></td>
                  <td>
                    <div className={styles.actionBtns}>
                      {w.status === 'verification_pending' && (
                        <>
                          <button className={styles.approveBtn} disabled={!!processing} onClick={() => handleVerify(w.id, 'approve')} title="Approve">
                            {processing === w.id + 'approve' ? '...' : <FiCheck size={14} />}
                          </button>
                          <button className={styles.rejectBtn} disabled={!!processing} onClick={() => handleVerify(w.id, 'reject')} title="Reject">
                            {processing === w.id + 'reject' ? '...' : <FiX size={14} />}
                          </button>
                        </>
                      )}
                      {w.status === 'verified' && (
                        <button className={styles.paidBtn} disabled={!!processing} onClick={() => handleMarkPaid(w.id)}>
                          {processing === w.id + 'paid' ? '...' : '✓ Mark Paid'}
                        </button>
                      )}
                      {w.status === 'paid' && <span style={{ fontSize: 12, color: 'var(--green)' }}>✓ Complete</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {previewUrl && (
        <div className={styles.modal} onClick={() => setPreviewUrl(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Score Proof</h3>
              <button className="btn-ghost" onClick={() => setPreviewUrl(null)}><FiX size={18} /></button>
            </div>
            <img src={previewUrl} alt="Score proof" className={styles.proofImg} />
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  if (status === 'paid') return <span className="badge badge-green">✓ Paid</span>
  if (status === 'verified') return <span className="badge badge-purple">Verified</span>
  if (status === 'rejected') return <span className="badge badge-red">Rejected</span>
  if (status === 'verification_pending') return <span className="badge badge-gold">⏳ Reviewing</span>
  return <span className="badge badge-muted">Pending</span>
}
