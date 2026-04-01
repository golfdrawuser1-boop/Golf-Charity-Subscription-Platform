import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { FiPlus, FiPlay, FiSend, FiX, FiRefreshCw } from 'react-icons/fi'
import styles from './DrawsPage.module.css'

export default function DrawsPage() {
  const [draws, setDraws] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [simulation, setSimulation] = useState(null)
  const [simLoading, setSimLoading] = useState(null)
  const [publishing, setPublishing] = useState(null)
  const [createForm, setCreateForm] = useState({
    name: '', draw_date: '', draw_type: 'random', prize_pool: ''
  })

  const fetchDraws = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/admin/draws')
      setDraws(data.draws || [])
    } catch { toast.error('Failed to load draws') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchDraws() }, [])

  const createDraw = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/admin/draws', createForm)
      toast.success('Draw created!')
      setShowCreate(false)
      setCreateForm({ name: '', draw_date: '', draw_type: 'random', prize_pool: '' })
      fetchDraws()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create draw')
    }
  }

  const simulate = async (drawId) => {
    setSimLoading(drawId)
    setSimulation(null)
    try {
      // Backend returns: { draw_numbers, results: { five_match_count, four_match_count, three_match_count, ... } }
      const { data } = await api.post('/api/admin/draws/simulate', { draw_id: drawId, draw_type: 'random' })

      // Normalise to what the UI needs
      const projected_winners = {
        '5-Match': data.results?.five_match_count ?? 0,
        '4-Match': data.results?.four_match_count ?? 0,
        '3-Match': data.results?.three_match_count ?? 0,
      }

      setSimulation({
        drawId,
        winning_numbers: data.draw_numbers || [],   // backend field is draw_numbers
        projected_winners,
        total_pool: data.total_pool,
        total_participants: data.total_participants,
        would_jackpot_rollover: data.results?.would_jackpot_rollover,
      })
      toast.success('Simulation complete!')
    } catch { toast.error('Simulation failed') }
    finally { setSimLoading(null) }
  }

  const publish = async (drawId) => {
    if (!confirm('Publish this draw? This will finalise results and notify winners.')) return
    setPublishing(drawId)
    try {
      await api.post('/api/admin/draws/run', { draw_id: drawId, draw_type: 'random' })
      toast.success('Draw published! Winners notified.')
      setSimulation(null)
      fetchDraws()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to publish')
    } finally { setPublishing(null) }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Draws"
        sub="Configure and run monthly prize draws"
        actions={
          <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
            <FiPlus size={15} /> New Draw
          </button>
        }
      />

      {/* Create Form */}
      {showCreate && (
        <div className={`card ${styles.createCard}`}>
          <div className={styles.createHead}>
            <h2 className={styles.createTitle}>Create New Draw</h2>
            <button className="btn-ghost" onClick={() => setShowCreate(false)}><FiX size={16} /></button>
          </div>
          <form onSubmit={createDraw} className={styles.createForm}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label>Draw Name</label>
                <input type="text" placeholder="e.g. April 2026 Monthly Draw"
                  value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} required />
              </div>
              <div className={styles.field}>
                <label>Draw Date</label>
                <input type="date" value={createForm.draw_date}
                  onChange={e => setCreateForm({ ...createForm, draw_date: e.target.value })} required />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label>Draw Type</label>
                <select value={createForm.draw_type}
                  onChange={e => setCreateForm({ ...createForm, draw_type: e.target.value })}>
                  <option value="random">🎲 Random (Lottery style)</option>
                  <option value="algorithm">🧠 Algorithmic (Score-weighted)</option>
                </select>
              </div>
              <div className={styles.field}>
                <label>Override Prize Pool (₹ — leave blank to auto-calculate)</label>
                <input type="number" min={0} step={0.01} placeholder="Auto"
                  value={createForm.prize_pool} onChange={e => setCreateForm({ ...createForm, prize_pool: e.target.value })} />
              </div>
            </div>
            <div className={styles.createActions}>
              <button type="submit" className="btn-primary"><FiPlus size={14} /> Create Draw</button>
              <button type="button" className="btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Simulation Result */}
      {simulation && (
        <div className={`card ${styles.simCard}`}>
          <div className={styles.simHead}>
            <h2 className={styles.simTitle}>🎲 Simulation Results</h2>
            <button className="btn-ghost" onClick={() => setSimulation(null)}><FiX size={15} /></button>
          </div>
          <div className={styles.simNumbers}>
            <p className={styles.simLabel}>Generated Numbers</p>
            <div className={styles.balls}>
              {(simulation.winning_numbers || []).map((n, i) => (
                <div key={i} className={styles.ball}>{n}</div>
              ))}
            </div>
          </div>
          {simulation.total_participants !== undefined && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0' }}>
              {simulation.total_participants} eligible participants · Pool: ₹{((simulation.total_pool || 0) / 100).toFixed(2)}
              {simulation.would_jackpot_rollover && ' · ⚠️ Jackpot would roll over (no 5-match)'}
            </p>
          )}
          {simulation.projected_winners && (
            <div className={styles.simWinners}>
              <p className={styles.simLabel}>Projected Winners</p>
              <div className={styles.winnerTiers}>
                {Object.entries(simulation.projected_winners).map(([tier, count]) => (
                  <div key={tier} className={styles.tierItem}>
                    <span className={styles.tierName}>{tier}</span>
                    <span className="badge badge-purple">{count} winner{count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className={styles.simActions}>
            <button className="btn-primary" onClick={() => publish(simulation.drawId)} disabled={publishing === simulation.drawId}>
              {publishing === simulation.drawId ? 'Publishing...' : <><FiSend size={14} /> Publish This Draw</>}
            </button>
            <button className="btn-outline" onClick={() => simulate(simulation.drawId)} disabled={simLoading === simulation.drawId}>
              <FiRefreshCw size={14} /> Re-simulate
            </button>
          </div>
        </div>
      )}

      {/* Draws List */}
      {loading ? (
        <div className={styles.list}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 18 }} />)}
        </div>
      ) : draws.length === 0 ? (
        <div className={`card ${styles.empty}`}>
          <span style={{ fontSize: 40 }}>🎯</span>
          <p>No draws yet. Create your first draw above.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {draws.map(draw => (
            <div key={draw.id} className={`card ${styles.drawCard}`}>
              <div className={styles.drawInfo}>
                <div className={styles.drawMeta}>
                  <span className={`badge ${draw.status === 'published' ? 'badge-green' : draw.status === 'simulated' ? 'badge-gold' : 'badge-purple'}`}>
                    {draw.status === 'published' ? '✓ Published' : draw.status === 'simulated' ? '⚡ Simulated' : '⏳ Pending'}
                  </span>
                  <span className={styles.drawType}>{draw.draw_type === 'algorithm' ? '🧠 Algorithmic' : '🎲 Random'}</span>
                </div>
                <h3 className={styles.drawName}>{draw.name || 'Monthly Draw'}</h3>
                <div className={styles.drawDetails}>
                  <span>📅 {new Date(draw.draw_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  <span>💷 Pool: ₹{(parseFloat(draw.prize_pool || 0) / 100).toFixed(2)}</span>
                  <span>👥 {draw.participant_count || 0} participants</span>
                </div>
              </div>

              {draw.status !== 'published' && (
                <div className={styles.drawActions}>
                  <button
                    className="btn-outline"
                    onClick={() => simulate(draw.id)}
                    disabled={simLoading === draw.id}
                  >
                    {simLoading === draw.id
                      ? <><FiRefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Simulating...</>
                      : <><FiPlay size={14} /> Simulate</>
                    }
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => publish(draw.id)}
                    disabled={publishing === draw.id}
                  >
                    {publishing === draw.id ? 'Publishing...' : <><FiSend size={14} /> Publish</>}
                  </button>
                </div>
              )}

              {/* draw_numbers is the DB/API field name — not winning_numbers */}
              {draw.status === 'published' && draw.draw_numbers && (
                <div className={styles.drawNumbers}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Winning Numbers</p>
                  <div className={styles.balls}>
                    {draw.draw_numbers.map((n, i) => (
                      <div key={i} className={styles.ball}>{n}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
