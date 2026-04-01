import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { FiUser, FiHeart, FiUpload, FiSave } from 'react-icons/fi'
import styles from './ProfilePage.module.css'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [charities, setCharities] = useState([])
  const [wins, setWins] = useState([])
  const [tab, setTab] = useState('profile')
  const [form, setForm] = useState({ full_name: '', email: '', charity_id: '', charity_percentage: 10 })
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (user) setForm({ full_name: user.full_name || '', email: user.email || '', charity_id: user.charity_id || '', charity_percentage: user.charity_percentage || 10 })
    api.get('/api/charities').then(r => setCharities(r.data.charities || [])).catch(() => {})
    api.get('/api/winners/my').then(r => setWins(r.data.wins || [])).catch(() => {})
  }, [user])

  const saveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.put('/api/users/profile', { full_name: form.full_name, charity_id: form.charity_id, charity_percentage: form.charity_percentage })
      updateUser(data.user)
      toast.success('Profile updated!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile')
    } finally { setSaving(false) }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirm) return toast.error('Passwords do not match')
    if (pwForm.new_password.length < 6) return toast.error('Min. 6 characters')
    setSaving(true)
    try {
      await api.put('/api/auth/change-password', { current_password: pwForm.current_password, new_password: pwForm.new_password })
      toast.success('Password updated!')
      setPwForm({ current_password: '', new_password: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password')
    } finally { setSaving(false) }
  }

  const uploadProof = async (winId, file) => {
    try {
      // Backend expects { proof_url } as a JSON string — no file upload handler exists.
      // Convert the image to a base64 data URL so it can be stored directly.
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          await api.post(`/api/winners/${winId}/proof`, { proof_url: reader.result })
          toast.success('Proof uploaded! Admin will verify soon.')
          api.get('/api/winners/my').then(r => setWins(r.data.wins || []))
        } catch {
          toast.error('Upload failed')
        }
      }
      reader.onerror = () => toast.error('Could not read file')
      reader.readAsDataURL(file)
    } catch {
      toast.error('Upload failed')
    }
  }

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.wrapper}>
        <div className="container">
          <div className={styles.header}>
            <Link to="/dashboard" className={styles.back}>← Dashboard</Link>
            <h1 className={styles.title}>My Profile</h1>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            {[
              { id: 'profile', label: 'Profile', icon: <FiUser size={14}/> },
              { id: 'charity', label: 'Charity', icon: <FiHeart size={14}/> },
              { id: 'winnings', label: 'Winnings', icon: '🏆' },
            ].map(t => (
              <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.activeTab : ''}`}
                onClick={() => setTab(t.id)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className={styles.content}>
            {/* Profile Tab */}
            {tab === 'profile' && (
              <div className={styles.panel}>
                <div className={`card ${styles.card}`}>
                  <h2 className={styles.cardTitle}>Personal Details</h2>
                  <form onSubmit={saveProfile} className={styles.form}>
                    <div className={styles.field}>
                      <label>Full Name</label>
                      <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required />
                    </div>
                    <div className={styles.field}>
                      <label>Email Address</label>
                      <input type="email" value={form.email} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                      <span className={styles.hint}>Email cannot be changed</span>
                    </div>
                    <button type="submit" className="btn-primary" disabled={saving}>
                      {saving ? 'Saving...' : <><FiSave size={14}/> Save Changes</>}
                    </button>
                  </form>
                </div>

                <div className={`card ${styles.card}`}>
                  <h2 className={styles.cardTitle}>Change Password</h2>
                  <form onSubmit={changePassword} className={styles.form}>
                    <div className={styles.field}>
                      <label>Current Password</label>
                      <input type="password" value={pwForm.current_password}
                        onChange={e => setPwForm({...pwForm, current_password: e.target.value})} required />
                    </div>
                    <div className={styles.field}>
                      <label>New Password</label>
                      <input type="password" value={pwForm.new_password}
                        onChange={e => setPwForm({...pwForm, new_password: e.target.value})} required minLength={6} />
                    </div>
                    <div className={styles.field}>
                      <label>Confirm New Password</label>
                      <input type="password" value={pwForm.confirm}
                        onChange={e => setPwForm({...pwForm, confirm: e.target.value})} required />
                    </div>
                    <button type="submit" className="btn-outline" disabled={saving}>Update Password</button>
                  </form>
                </div>

                {/* Subscription */}
                <div className={`card ${styles.card}`}>
                  <h2 className={styles.cardTitle}>Subscription</h2>
                  <div className={styles.subInfo}>
                    <div className={styles.subRow}>
                      <span className={styles.subLabel}>Status</span>
                      <span className={`badge ${user?.subscription?.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                        {user?.subscription?.status || 'No subscription'}
                      </span>
                    </div>
                    <div className={styles.subRow}>
                      <span className={styles.subLabel}>Plan</span>
                      <span style={{ textTransform: 'capitalize' }}>{user?.subscription?.plan || '—'}</span>
                    </div>
                  </div>
                  {user?.subscription?.status !== 'active' && (
                    <Link to="/subscribe" className="btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>
                      Activate Subscription →
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Charity Tab */}
            {tab === 'charity' && (
              <div className={styles.panel}>
                <div className={`card ${styles.card}`}>
                  <h2 className={styles.cardTitle}>Your Charity</h2>
                  <p className={styles.cardSub}>Choose which charity receives a portion of your subscription. Minimum 10%.</p>
                  <form onSubmit={saveProfile} className={styles.form}>
                    <div className={styles.field}>
                      <label>Charity</label>
                      <select value={form.charity_id} onChange={e => setForm({...form, charity_id: e.target.value})}>
                        <option value="">— None selected —</option>
                        {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    {form.charity_id && (
                      <div className={styles.field}>
                        <label>Contribution: <strong style={{ color: 'var(--accent)' }}>{form.charity_percentage}%</strong></label>
                        <input type="range" min={10} max={50} step={5} value={form.charity_percentage}
                          onChange={e => setForm({...form, charity_percentage: +e.target.value})}
                          style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          <span>10% (min)</span><span>50% (max)</span>
                        </div>
                      </div>
                    )}
                    <button type="submit" className="btn-primary" disabled={saving}>
                      <FiHeart size={14} /> Save Charity
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Winnings Tab */}
            {tab === 'winnings' && (
              <div className={styles.panel}>
                {wins.length === 0 ? (
                  <div className={`card ${styles.card}`}>
                    <div className={styles.empty}>
                      <span style={{ fontSize: 48 }}>🏆</span>
                      <h3>No wins yet</h3>
                      <p>Keep entering your scores every month — your win is coming!</p>
                    </div>
                  </div>
                ) : wins.map(w => (
                  <div key={w.id} className={`card ${styles.card}`}>
                    <div className={styles.winHeader}>
                      <div>
                        <span className="badge badge-gold" style={{ marginBottom: 8 }}>{w.match_type}</span>
                        <h3 className={styles.winName}>{w.draw_name}</h3>
                        <p className={styles.winDate}>{new Date(w.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div className={styles.winAmount}>
                        <span className={styles.winAmt}>₹{(parseFloat(w.prize_amount || 0) / 100).toFixed(2)}</span>
                        <span className={`badge ${w.status === 'paid' ? 'badge-green' : w.status === 'verification_pending' ? 'badge-gold' : 'badge-muted'}`}>
                          {w.status === 'paid' ? '✓ Paid' : w.status === 'verification_pending' ? '⏳ Verifying' : 'Pending'}
                        </span>
                      </div>
                    </div>
                    {(w.status === 'pending' || !w.proof_url) && w.status !== 'paid' && w.status !== 'verified' && (
                      <div className={styles.proofBox}>
                        <p className={styles.proofLabel}>Upload screenshot of your scores to claim your prize</p>
                        <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }}
                          onChange={e => e.target.files[0] && uploadProof(w.id, e.target.files[0])} />
                        <button className="btn-primary" onClick={() => fileRef.current?.click()}
                          style={{ fontSize: 14, padding: '10px 20px' }}>
                          <FiUpload size={14} /> Upload Proof
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
