import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiMenu, FiX, FiUser, FiLogOut, FiChevronDown, FiAlertCircle } from 'react-icons/fi'
import styles from './Navbar.module.css'

// ─── Logout Confirmation Modal ────────────────────────────────────────────────
function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(8,12,10,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#111814', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, padding: '36px 32px', maxWidth: 380, width: '100%',
        textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <FiLogOut size={22} color="#F87171" />
        </div>
        <h3 style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 20, fontWeight: 700,
          color: '#F0FDF4', marginBottom: 10,
        }}>
          Sign out?
        </h3>
        <p style={{ fontSize: 14, color: 'rgba(240,253,244,0.5)', lineHeight: 1.6, marginBottom: 28 }}>
          You'll need to sign back in to access your dashboard, scores, and draws.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#F0FDF4', fontFamily: 'DM Sans, sans-serif', fontSize: 14,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 10,
              background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.25)',
              color: '#F87171', fontFamily: 'DM Sans, sans-serif', fontSize: 14,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Yes, sign out
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => { setMobileOpen(false); setUserMenuOpen(false) }, [location])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogoutRequest = () => {
    setUserMenuOpen(false)
    setMobileOpen(false)
    setShowLogoutModal(true)
  }

  const handleLogoutConfirm = () => {
    logout()
    setShowLogoutModal(false)
    navigate('/')
  }

  return (
    <>
      {showLogoutModal && (
        <LogoutModal
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}

      <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
        <div className={styles.inner}>
          {/* Logo — click shows logout confirm if logged in, else go home */}
          {user ? (
            <button
              onClick={handleLogoutRequest}
              className={styles.logo}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              title="Click to sign out"
            >
              <span className={styles.logoIcon}>⛳</span>
              <span className={styles.logoText}>Golf<span>Draw</span></span>
            </button>
          ) : (
            <Link to="/" className={styles.logo}>
              <span className={styles.logoIcon}>⛳</span>
              <span className={styles.logoText}>Golf<span>Draw</span></span>
            </Link>
          )}

          {/* Desktop Nav */}
          <div className={styles.links}>
            <Link to="/charities" className={styles.link}>Charities</Link>
            <Link to="/winners" className={styles.link}>Winners</Link>
            {user && <Link to="/draws" className={styles.link}>Draws</Link>}
          </div>

          {/* Auth */}
          <div className={styles.auth}>
            {user ? (
              <div className={styles.userMenu} ref={dropdownRef}>
                <button className={styles.userBtn} onClick={() => setUserMenuOpen(!userMenuOpen)}>
                  <div className={styles.avatar}>
                    {user.full_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className={styles.userName}>{user.full_name?.split(' ')[0]}</span>
                  <FiChevronDown size={14} />
                </button>
                {userMenuOpen && (
                  <div className={styles.dropdown}>
                    <Link to="/dashboard" className={styles.dropItem} onClick={() => setUserMenuOpen(false)}>
                      Dashboard
                    </Link>
                    <Link to="/scores" className={styles.dropItem} onClick={() => setUserMenuOpen(false)}>
                      My Scores
                    </Link>
                    <Link to="/profile" className={styles.dropItem} onClick={() => setUserMenuOpen(false)}>
                      <FiUser size={14} /> Profile
                    </Link>
                    <hr className={styles.divider} />
                    <button className={`${styles.dropItem} ${styles.dropLogout}`} onClick={handleLogoutRequest}>
                      <FiLogOut size={14} /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">Sign in</Link>
                <Link to="/subscribe" className="btn-primary">Get Started</Link>
              </>
            )}
            <button className={styles.hamburger} onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className={styles.mobile}>
            <Link to="/charities" className={styles.mobileLink}>Charities</Link>
            <Link to="/winners" className={styles.mobileLink}>Winners</Link>
            {user ? (
              <>
                <Link to="/dashboard" className={styles.mobileLink}>Dashboard</Link>
                <Link to="/scores" className={styles.mobileLink}>My Scores</Link>
                <Link to="/profile" className={styles.mobileLink}>Profile</Link>
                <button className={styles.mobileLogout} onClick={handleLogoutRequest}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={styles.mobileLink}>Sign In</Link>
                <Link to="/subscribe" className={`${styles.mobileLink} ${styles.mobileCta}`}>Get Started</Link>
              </>
            )}
          </div>
        )}
      </nav>
    </>
  )
}
