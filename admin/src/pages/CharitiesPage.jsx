import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { FiPlus, FiEdit3, FiTrash2, FiX, FiSave, FiStar } from 'react-icons/fi'
import styles from './CharitiesPage.module.css'

const EMPTY = { name: '', description: '', image_url: '', upcoming_events: '', is_featured: false }

export default function CharitiesPage() {
  const [charities, setCharities] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | 'edit'
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchCharities = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/charities')
      setCharities(data.charities || [])
    } catch { toast.error('Failed to load charities') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchCharities() }, [])

  const openCreate = () => { setForm(EMPTY); setEditId(null); setModal('create') }
  const openEdit = (c) => { setForm({ name: c.name, description: c.description || '', image_url: c.image_url || '', upcoming_events: c.upcoming_events || '', is_featured: c.is_featured }); setEditId(c.id); setModal('edit') }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (modal === 'create') {
        await api.post('/api/admin/charities', form)
        toast.success('Charity added!')
      } else {
        await api.put(`/api/admin/charities/${editId}`, form)
        toast.success('Charity updated!')
      }
      setModal(null)
      fetchCharities()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  const deleteCharity = async (id) => {
    if (!confirm('Delete this charity? Users assigned to it will lose their selection.')) return
    try {
      await api.delete(`/api/admin/charities/${id}`)
      toast.success('Charity deleted')
      fetchCharities()
    } catch { toast.error('Delete failed') }
  }

  const toggleFeatured = async (charity) => {
    try {
      await api.put(`/api/admin/charities/${charity.id}`, { ...charity, is_featured: !charity.is_featured })
      toast.success(charity.is_featured ? 'Removed from featured' : 'Set as featured!')
      fetchCharities()
    } catch { toast.error('Failed to update') }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className={styles.page}>
      <PageHeader
        title="Charities"
        sub={`${charities.length} charities in directory`}
        actions={
          <button className="btn-primary" onClick={openCreate}>
            <FiPlus size={15} /> Add Charity
          </button>
        }
      />

      {loading ? (
        <div className={styles.grid}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 18 }} />)}
        </div>
      ) : charities.length === 0 ? (
        <div className={`card ${styles.empty}`}>
          <FiStar size={32} style={{ color: 'var(--text-muted)' }} />
          <p>No charities yet. Add your first one!</p>
          <button className="btn-primary" onClick={openCreate}><FiPlus size={14} /> Add Charity</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {charities.map(c => (
            <div key={c.id} className={`card ${styles.charityCard}`}>
              {c.image_url ? (
                <img src={c.image_url} alt={c.name} className={styles.img} onError={e => e.target.style.display='none'} />
              ) : (
                <div className={styles.imgPlaceholder}>💚</div>
              )}
              <div className={styles.body}>
                <div className={styles.charityHeader}>
                  <div>
                    {c.is_featured && <span className="badge badge-gold" style={{ marginBottom: 6 }}>⭐ Featured</span>}
                    <h3 className={styles.name}>{c.name}</h3>
                  </div>
                </div>
                <p className={styles.desc}>{c.description?.slice(0, 90)}{c.description?.length > 90 ? '...' : ''}</p>
                {c.upcoming_events && <p className={styles.events}>📅 {c.upcoming_events}</p>}
                <div className={styles.count}>
                  <span className="badge badge-muted">{c.subscriber_count || 0} subscribers</span>
                </div>
              </div>
              <div className={styles.actions}>
                <button className="btn-ghost" onClick={() => toggleFeatured(c)} title={c.is_featured ? 'Remove featured' : 'Set featured'}>
                  <FiStar size={14} style={{ color: c.is_featured ? 'var(--gold)' : undefined }} />
                </button>
                <button className="btn-ghost" onClick={() => openEdit(c)}>
                  <FiEdit3 size={14} />
                </button>
                <button className="btn-ghost" onClick={() => deleteCharity(c.id)}
                  style={{ color: 'var(--red)' }}>
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={`card ${styles.modal}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h2 className={styles.modalTitle}>{modal === 'create' ? 'Add Charity' : 'Edit Charity'}</h2>
              <button className="btn-ghost" onClick={() => setModal(null)}><FiX size={16} /></button>
            </div>
            <form onSubmit={save} className={styles.modalForm}>
              <div className={styles.field}>
                <label>Charity Name</label>
                <input type="text" placeholder="e.g. Macmillan Cancer Support"
                  value={form.name} onChange={e => f('name', e.target.value)} required />
              </div>
              <div className={styles.field}>
                <label>Description</label>
                <textarea rows={3} placeholder="What does this charity do?"
                  value={form.description} onChange={e => f('description', e.target.value)}
                  style={{ resize: 'vertical' }} />
              </div>
              <div className={styles.field}>
                <label>Image URL</label>
                <input type="url" placeholder="https://example.com/image.jpg"
                  value={form.image_url} onChange={e => f('image_url', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Upcoming Events</label>
                <input type="text" placeholder="e.g. Charity Golf Day — 15 June 2026"
                  value={form.upcoming_events} onChange={e => f('upcoming_events', e.target.value)} />
              </div>
              <div className={styles.checkRow}>
                <input type="checkbox" id="featured" checked={form.is_featured}
                  onChange={e => f('is_featured', e.target.checked)}
                  style={{ width: 'auto', padding: 0 }} />
                <label htmlFor="featured" style={{ margin: 0, textTransform: 'none', fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: 0 }}>
                  Mark as Featured (shown on homepage)
                </label>
              </div>
              <div className={styles.modalFooter}>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : <><FiSave size={14} /> {modal === 'create' ? 'Add Charity' : 'Save Changes'}</>}
                </button>
                <button type="button" className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
