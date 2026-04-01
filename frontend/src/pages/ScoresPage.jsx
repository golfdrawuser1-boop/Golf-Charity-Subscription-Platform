import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { FiPlus, FiTrash2, FiEdit3, FiCheck, FiX, FiInfo } from 'react-icons/fi'
import styles from './ScoresPage.module.css'

export default function ScoresPage() {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ score: '', played_on: new Date().toISOString().split('T')[0] })
  const [submitting, setSubmitting] = useState(false)

  const fetchScores = async () => {
    try {
      const { data } = await api.get('/api/scores')
      setScores(data.scores || [])
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('Active subscription required to manage scores.')
      } else {
        toast.error('Failed to load scores')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchScores() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const val = parseInt(form.score)
    if (isNaN(val) || val < 1 || val > 45) return toast.error('Score must be between 1 and 45')
    if (!form.played_on) return toast.error('Please select a date')

    setSubmitting(true)
    try {
      if (editId) {
        await api.put(`/api/scores/${editId}`, form)
        toast.success('Score updated!')
        setEditId(null)
      } else {
        await api.post('/api/scores', form)
        toast.success(scores.length >= 5 ? 'Score added! Oldest score replaced.' : 'Score added!')
      }
      setForm({ score: '', played_on: new Date().toISOString().split('T')[0] })
      setShowForm(false)
      fetchScores()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save score')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (s) => {
    setEditId(s.id)
    setForm({ score: s.score, played_on: s.played_on })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this score?')) return
    try {
      await api.delete(`/api/scores/${id}`)
      toast.success('Score deleted')
      fetchScores()
    } catch {
      toast.error('Failed to delete score')
    }
  }

  const cancelEdit = () => {
    setEditId(null)
    setShowForm(false)
    setForm({ score: '', played_on: new Date().toISOString().split('T')[0] })
  }

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.wrapper}>
        <div className="container">
          {/* Header */}
          <div className={styles.header}>
            <div>
              <Link to="/dashboard" className={styles.back}>← Dashboard</Link>
              <h1 className={styles.title}>My Scores</h1>
              <p className={styles.sub}>Track your last 5 Stableford scores. Each score is your draw entry.</p>
            </div>
            {!showForm && (
              <button className="btn-primary" onClick={() => setShowForm(true)}>
                <FiPlus size={16} /> Add Score
              </button>
            )}
          </div>

          {/* Info Banner */}
          <div className={styles.infoBanner}>
            <FiInfo size={15} style={{ flexShrink: 0, color: 'var(--accent)' }} />
            <p>Only your <strong>latest 5 scores</strong> are kept. Adding a 6th score automatically replaces the oldest one. Scores must be in <strong>Stableford format</strong> (1–45).</p>
          </div>

          {/* Score Form */}
          {showForm && (
            <div className={`card ${styles.formCard}`}>
              <h2 className={styles.formTitle}>{editId ? '✏️ Edit Score' : '+ Add New Score'}</h2>
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label>Stableford Score (1–45)</label>
                    <input
                      type="number" min={1} max={45} placeholder="e.g. 34"
                      value={form.score}
                      onChange={e => setForm({ ...form, score: e.target.value })}
                      required autoFocus
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Date Played</label>
                    <input
                      type="date" value={form.played_on}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={e => setForm({ ...form, played_on: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className={styles.formActions}>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? <Spinner /> : editId ? <><FiCheck size={15}/> Update Score</> : <><FiPlus size={15}/> Add Score</>}
                  </button>
                  <button type="button" className="btn-outline" onClick={cancelEdit}>
                    <FiX size={15} /> Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Scores List */}
          {loading ? (
            <div className={styles.scoresList}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 88, borderRadius: 14 }} />)}
            </div>
          ) : scores.length === 0 ? (
            <div className={styles.emptyState}>
              <span style={{ fontSize: 56 }}>⛳</span>
              <h3>No scores yet</h3>
              <p>Add your first Stableford score to enter the monthly draw</p>
              {!showForm && (
                <button className="btn-primary" onClick={() => setShowForm(true)} style={{ marginTop: 16 }}>
                  <FiPlus size={16} /> Add First Score
                </button>
              )}
            </div>
          ) : (
            <>
              <div className={styles.scoresList}>
                {scores.map((s, i) => (
                  <div key={s.id} className={`${styles.scoreCard} ${i === 0 ? styles.latest : ''}`}>
                    <div className={styles.scoreRank}>
                      <span className={styles.rankNum}>{i + 1}</span>
                      {i === 0 && <span className={styles.latestTag}>Latest</span>}
                    </div>
                    <div className={styles.scoreMain}>
                      <span className={styles.scoreNum}>{s.score}</span>
                      <span className={styles.scoreLabel}>Stableford</span>
                    </div>
                    <div className={styles.scoreDate}>
                      {new Date(s.played_on).toLocaleDateString('en-GB', {
                        weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </div>
                    {/* Visual bar */}
                    <div className={styles.scoreBar}>
                      <div className={styles.scoreBarFill} style={{ width: `${(s.score / 45) * 100}%` }} />
                    </div>
                    <div className={styles.scoreActions}>
                      <button className="btn-ghost" onClick={() => handleEdit(s)}>
                        <FiEdit3 size={14} />
                      </button>
                      <button className="btn-ghost" onClick={() => handleDelete(s.id)}
                        style={{ color: '#F87171' }}>
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Slot counter */}
              <div className={styles.slotCounter}>
                <span className={styles.slotLabel}>Score slots used</span>
                <div className={styles.slots}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className={`${styles.slot} ${i <= scores.length ? styles.slotFilled : ''}`} />
                  ))}
                </div>
                <span className={styles.slotCount}>{scores.length} / 5</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return <span style={{
    display: 'inline-block', width: 15, height: 15,
    border: '2px solid rgba(8,12,10,0.3)', borderTop: '2px solid #080C0A',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite'
  }} />
}
