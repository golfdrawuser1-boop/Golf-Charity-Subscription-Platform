import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiShield, FiLock } from 'react-icons/fi'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back, Admin!')
      navigate('/', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Login failed'
      toast.error(msg, { duration: 5000 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg}>
        <div className={styles.blob} />
      </div>
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <FiShield size={28} className={styles.icon} />
        </div>
        <h1 className={styles.title}>Admin Access</h1>
        <p className={styles.sub}>GolfDraw Control Panel — Authorised personnel only</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Email</label>
            <input
              type="email"
              placeholder="admin@golfdraw.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <input
              type="password"
              placeholder="Your password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
          >
            {loading
              ? <span style={{
                  display: 'inline-block', width: 16, height: 16,
                  border: '2px solid rgba(250,245,255,0.3)',
                  borderTop: '2px solid #FAF5FF',
                  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                }} />
              : <><FiLock size={14} /> Sign In to Admin</>
            }
          </button>
        </form>

        <p className={styles.notice}>
          🔒 This panel is restricted to administrators only. Unauthorised access is prohibited.
        </p>
      </div>
    </div>
  )
}
