import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { FiSearch, FiArrowLeft } from 'react-icons/fi'
import styles from './CharitiesPage.module.css'

export default function CharitiesPage() {
  const { user } = useAuth()
  const [charities, setCharities] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selecting, setSelecting] = useState(null)

  useEffect(() => {
    api.get('/api/charities').then(r => setCharities(r.data.charities || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = charities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  )

  const featured = filtered.filter(c => c.is_featured)
  const regular = filtered.filter(c => !c.is_featured)

  const handleSelect = async (charityId) => {
    if (!user) { toast.error('Please log in to select a charity'); return }
    setSelecting(charityId)
    try {
      await api.put('/api/users/charity', { charity_id: charityId })
      toast.success('Charity updated!')
    } catch {
      toast.error('Failed to update charity')
    } finally {
      setSelecting(null)
    }
  }

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.wrapper}>
        <div className="container">

          {/* Dashboard Back Button */}
          {user && (
            <Link to="/dashboard" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: 'rgba(240,253,244,0.5)', fontSize: 14, textDecoration: 'none',
              marginBottom: 24, transition: 'color 0.2s',
            }}
              onMouseEnter={e => e.target.style.color = '#4ADE80'}
              onMouseLeave={e => e.target.style.color = 'rgba(240,253,244,0.5)'}
            >
              <FiArrowLeft size={14} /> Dashboard
            </Link>
          )}

          {/* Header */}
          <div className={styles.header}>
            <span className="badge badge-green">💚 Give Back</span>
            <h1 className={styles.title}>Our Charity Partners</h1>
            <p className={styles.sub}>Every subscription you take out helps fund one of these incredible causes. You choose who benefits.</p>
          </div>

          {/* Search */}
          <div className={styles.searchWrap}>
            <FiSearch size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search charities..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginTop: 32 }}>
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="skeleton" style={{ height: 200, borderRadius: 16 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              No charities found
            </div>
          ) : (
            <>
              {/* Featured */}
              {featured.length > 0 && (
                <div style={{ marginTop: 40 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16 }}>
                    ⭐ Featured Charity
                  </p>
                  <div className={styles.grid}>
                    {featured.map(c => (
                      <CharityCard key={c.id} charity={c} user={user} selecting={selecting} onSelect={handleSelect} featured />
                    ))}
                  </div>
                </div>
              )}

              {/* Regular */}
              {regular.length > 0 && (
                <div style={{ marginTop: 40 }}>
                  {featured.length > 0 && (
                    <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>
                      All Charities
                    </p>
                  )}
                  <div className={styles.grid}>
                    {regular.map(c => (
                      <CharityCard key={c.id} charity={c} user={user} selecting={selecting} onSelect={handleSelect} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CharityCard({ charity, user, selecting, onSelect, featured }) {
  return (
    <div className={`${styles.card} ${featured ? styles.featuredCard : ''}`}>
      {featured && <div className={styles.featuredBadge}>⭐ Featured</div>}
      <div className={styles.cardBody}>
        <span className={styles.category}>{charity.category}</span>
        <h3 className={styles.cardName}>{charity.name}</h3>
        <p className={styles.cardDesc}>{charity.description}</p>
      </div>
      {user && (
        <button
          className={styles.selectBtn}
          onClick={() => onSelect(charity.id)}
          disabled={selecting === charity.id}
        >
          {selecting === charity.id ? 'Updating...' : 'Support This Charity'}
        </button>
      )}
    </div>
  )
}
