import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  FiGrid, FiUsers, FiRefreshCw, FiHeart,
  FiAward, FiBarChart2, FiLogOut, FiShield
} from 'react-icons/fi'
import styles from './Sidebar.module.css'

const NAV = [
  { to: '/', icon: <FiGrid size={16} />, label: 'Dashboard', end: true },
  { to: '/users', icon: <FiUsers size={16} />, label: 'Users' },
  { to: '/draws', icon: <FiRefreshCw size={16} />, label: 'Draws' },
  { to: '/charities', icon: <FiHeart size={16} />, label: 'Charities' },
  { to: '/winners', icon: <FiAward size={16} />, label: 'Winners' },
  { to: '/reports', icon: <FiBarChart2 size={16} />, label: 'Reports' },
]

// ─── Logout Confirmation Modal ────────────────────────────────────────────────
function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(9,8,12,0.88)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#131118', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, padding: '36px 32px', maxWidth: 360, width: '100%',
        textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
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
          color: '#FAF5FF', marginBottom: 10,
        }}>
          Sign out of Admin?
        </h3>
        <p style={{ fontSize: 14, color: 'rgba(250,245,255,0.45)', lineHeight: 1.6, marginBottom: 28 }}>
          You'll be returned to the admin login screen.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#FAF5FF', fontFamily: 'DM Sans, sans-serif', fontSize: 14,
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

export default function Sidebar() {
  const { admin, logout } = useAuth()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)

  const handleLogoutConfirm = () => {
    setShowModal(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {showModal && (
        <LogoutModal
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowModal(false)}
        />
      )}

      <aside className={styles.sidebar}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}><FiShield size={18} /></div>
          <div>
            <div className={styles.logoText}>GolfDraw</div>
            <div className={styles.logoSub}>Admin Panel</div>
          </div>
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          <p className={styles.navLabel}>Navigation</p>
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className={styles.bottom}>
          <div className={styles.adminInfo}>
            <div className={styles.avatar}>
              {admin?.full_name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className={styles.adminMeta}>
              <div className={styles.adminName}>{admin?.full_name || 'Admin'}</div>
              <div className={styles.adminRole}>Administrator</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={() => setShowModal(true)}>
            <FiLogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
