import { useEffect, useState } from 'react'
import api from '../api/client'
import Sidebar from '../components/Sidebar'
import StatCard from '../components/StatCard'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', phone: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users'),
      ])
      setStats(statsRes.data)
      setUsers(usersRes.data)
    } catch {
      toast.error('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/api/admin/users', form)
      toast.success('User created successfully')
      setShowModal(false)
      setForm({ name: '', email: '', password: '', role: 'student', phone: '' })
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (user) => {
    try {
      await api.patch(`/api/admin/users/${user.id}`, { is_active: !user.is_active })
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`)
      fetchData()
    } catch {
      toast.error('Failed to update user')
    }
  }

  const handleDelete = async (userId) => {
    if (!confirm('Delete this user permanently?')) return
    try {
      await api.delete(`/api/admin/users/${userId}`)
      toast.success('User deleted')
      fetchData()
    } catch {
      toast.error('Failed to delete user')
    }
  }

  const roleColors = { admin: 'text-brand-400', mentor: 'text-teal-400', student: 'text-amber-400' }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Admin Dashboard</h1>
              <p className="text-gray-500 text-sm mt-1">Manage users, roles, and institution settings</p>
            </div>
            <button id="create-user-btn" onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <span>➕</span> Add User
            </button>
          </div>

          {/* Stats */}
          {loading ? <LoadingSpinner /> : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon="👥" label="Total Users" value={stats?.total_users ?? 0} color="brand" />
              <StatCard icon="🎒" label="Students" value={stats?.total_students ?? 0} color="teal" />
              <StatCard icon="🔮" label="Risk Scores Computed" value={stats?.risk_scores_computed ?? 0} color="amber" />
              <StatCard icon="📈" label="Avg Risk Score" value={`${stats?.average_risk_score ?? 0}`} sub="out of 100" color="orange" />
            </div>
          )}

          {/* Users Table */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h2 className="section-title mb-0">All Users</h2>
              <span className="text-xs text-gray-500">{users.length} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border">
                    {['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-surface-border flex items-center justify-center text-xs font-bold text-gray-300">
                            {u.name[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-200">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-gray-400">{u.email}</td>
                      <td className="py-3 px-2">
                        <span className={`font-semibold capitalize text-xs ${roleColors[u.role]}`}>{u.role}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-teal-400/10 text-teal-400' : 'bg-red-400/10 text-red-400'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-500 text-xs">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleToggleActive(u)}
                            className="text-xs text-gray-500 hover:text-gray-200 transition-colors px-2 py-1 rounded-lg hover:bg-surface-border">
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => handleDelete(u.id)}
                            className="text-xs text-red-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-600/10">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-600">No users found</div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-100">Create New User</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-300 text-xl">✕</button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Dr. Jane Smith' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'jane@institution.edu' },
                { label: 'Password', key: 'password', type: 'password', placeholder: '••••••••' },
                { label: 'Phone (optional)', key: 'phone', type: 'tel', placeholder: '+91 99999 00000' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input type={type} className="input" placeholder={placeholder}
                    value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    required={key !== 'phone'} />
                </div>
              ))}
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="student">Student</option>
                  <option value="mentor">Mentor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
