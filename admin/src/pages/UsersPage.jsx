import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { FiSearch, FiEdit3, FiX, FiSave, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import styles from './UsersPage.module.css'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const PER_PAGE = 15

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/api/admin/users?page=${page}&limit=${PER_PAGE}&search=${search}`)
      // Normalise: API returns users with subscriptions[] joined — flatten the active subscription
      const normalised = (data.users || []).map(u => {
        const activeSub = (u.subscriptions || []).find(s => s.status === 'active') || u.subscriptions?.[0] || null
        return {
          ...u,
          subscription_status: activeSub?.status || null,
          subscription_id: activeSub?.id || null,
          plan: activeSub?.plan || null,
          charity_name: u.charities?.name || null,
        }
      })
      setUsers(normalised)
      setTotal(data.total || 0)
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [page, search])

  const openEdit = (user) => {
    setEditUser(user)
    // Only send fields the PUT /api/admin/users/:id endpoint accepts
    setEditForm({ full_name: user.full_name, role: user.role, charity_id: user.charity_id || '', charity_percentage: user.charity_percentage || 10 })
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      await api.put(`/api/admin/users/${editUser.id}`, editForm)
      toast.success('User updated')
      setEditUser(null)
      fetchUsers()
    } catch { toast.error('Update failed') }
    finally { setSaving(false) }
  }

  const toggleSubscription = async (userId, subscriptionId, currentStatus) => {
    if (!subscriptionId) return toast.error('No subscription found for this user')
    const newStatus = currentStatus === 'active' ? 'cancelled' : 'active'
    try {
      // Correct endpoint: PUT /api/admin/subscriptions/:id
      await api.put(`/api/admin/subscriptions/${subscriptionId}`, { status: newStatus })
      toast.success(`Subscription ${newStatus}`)
      fetchUsers()
    } catch { toast.error('Failed to update') }
  }

  const pages = Math.ceil(total / PER_PAGE)

  return (
    <div className={styles.page}>
      <PageHeader
        title="Users"
        sub={`${total} total users`}
      />

      {/* Search */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <FiSearch size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Table */}
      <div className={`card ${styles.tableCard}`}>
        {loading ? (
          <div style={{ padding: 20 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8, borderRadius: 8 }} />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className={styles.empty}>
            <FiSearch size={32} style={{ color: 'var(--text-muted)' }} />
            <p>{search ? `No results for "${search}"` : 'No users yet'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Subscription</th>
                  <th>Plan</th>
                  <th>Charity %</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.userAvatar}>{user.full_name?.[0]?.toUpperCase() || '?'}</div>
                        <span className={styles.userName}>{user.full_name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                    <td>
                      <span className={`badge ${
                        user.subscription_status === 'active' ? 'badge-green'
                        : user.subscription_status === 'cancelled' ? 'badge-red'
                        : 'badge-muted'
                      }`}>
                        {user.subscription_status || 'none'}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                      {user.plan || '—'}
                    </td>
                    <td>
                      {user.charity_percentage
                        ? <span className="badge badge-green">{user.charity_percentage}%</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>
                      }
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button className="btn-ghost" onClick={() => openEdit(user)} title="Edit user">
                          <FiEdit3 size={14} />
                        </button>
                        <button
                          className={user.subscription_status === 'active' ? 'btn-danger' : 'btn-outline'}
                          style={{ fontSize: 12, padding: '5px 10px' }}
                          onClick={() => toggleSubscription(user.id, user.subscription_id, user.subscription_status)}
                        >
                          {user.subscription_status === 'active' ? 'Cancel' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className={styles.pagination}>
            <button className="btn-ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <FiChevronLeft size={16} /> Prev
            </button>
            <span className={styles.pageInfo}>Page {page} of {pages}</span>
            <button className="btn-ghost" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>
              Next <FiChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div className={styles.overlay} onClick={() => setEditUser(null)}>
          <div className={`card ${styles.modal}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h2 className={styles.modalTitle}>Edit User</h2>
              <button className="btn-ghost" onClick={() => setEditUser(null)}><FiX size={16} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.field}>
                <label>Full Name</label>
                <input type="text" value={editForm.full_name}
                  onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label>Email (read-only)</label>
                <input type="email" value={editUser.email} disabled style={{ opacity: 0.5 }} />
              </div>
              <div className={styles.field}>
                <label>Role</label>
                <select value={editForm.role || 'user'}
                  onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className={styles.field}>
                <label>Charity Contribution %</label>
                <input type="number" min={10} max={100} value={editForm.charity_percentage}
                  onChange={e => setEditForm({ ...editForm, charity_percentage: parseInt(e.target.value) })} />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className="btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? 'Saving...' : <><FiSave size={14} /> Save Changes</>}
              </button>
              <button className="btn-outline" onClick={() => setEditUser(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
