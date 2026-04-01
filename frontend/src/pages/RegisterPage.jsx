import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import styles from './AuthPage.module.css'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [charities, setCharities] = useState([])
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    charity_id: '',
    charity_percentage: 10
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/api/charities?limit=6').then(r => setCharities(r.data.charities || [])).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters')
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created! Welcome to GolfDraw.')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }))

  return (
    <div className={styles.page}>
      <div className={styles.bg}><div className={styles.blob} /></div>
      <div className={styles.card} style={{ maxWidth: 520 }}>
        <Link to="/" className={styles.logoLink}>
          <span>⛳</span>
          <span className={styles.logoText}>Golf<span>Draw</span></span>
        </Link>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.sub}>Join thousands of golfers playing with purpose</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Full Name</label>
              <input type="text" placeholder="John Smith" value={form.full_name}
                onChange={e => f('full_name', e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label>Email Address</label>
              <input type="email" placeholder="you@example.com" value={form.email}
                onChange={e => f('email', e.target.value)} required />
            </div>
          </div>

          <div className={styles.field}>
            <label>Password</label>
            <input type="password" placeholder="Min. 6 characters" value={form.password}
              onChange={e => f('password', e.target.value)} required minLength={6} />
          </div>

          {charities.length > 0 && (
            <div className={styles.field}>
              <label>Choose your charity (optional — can change later)</label>
              <div className={styles.charitySelect}>
                {charities.map(c => (
                  <div key={c.id}
                    className={`${styles.charityOption} ${form.charity_id === c.id ? styles.selected : ''}`}
                    onClick={() => f('charity_id', form.charity_id === c.id ? '' : c.id)}>
                    {c.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {form.charity_id && (
            <div className={styles.field}>
              <label>Charity contribution: <strong style={{ color: 'var(--accent)' }}>{form.charity_percentage}%</strong></label>
              <input type="range" min={10} max={50} step={5} value={form.charity_percentage}
                onChange={e => f('charity_percentage', +e.target.value)}
                style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>Min 10%</span><span>Max 50%</span>
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? <Spinner /> : 'Create Account →'}
          </button>
        </form>

        <p className={styles.switchText}>
          Already have an account? <Link to="/login" className={styles.switchLink}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

function Spinner() {
  return <span style={{
    display: 'inline-block', width: 16, height: 16,
    border: '2px solid rgba(8,12,10,0.3)',
    borderTop: '2px solid #080C0A',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite'
  }} />
}
