import { useEffect, useState } from 'react'
import api from '../api/client'
import Sidebar from '../components/Sidebar'
import StatCard from '../components/StatCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const { theme } = useTheme()
  const isLight = theme !== 'dark'
  // Explicit colors per theme — never depends on CSS variable resolution
  const modalBg     = isLight ? '#ffffff' : '#161b22'
  const modalBorder = isLight ? '#d1d9e6' : '#21262d'
  const panelBg     = isLight ? '#f8fafc' : '#0d1117'
  const headerBg    = isLight ? '#ffffff' : '#161b22'
  const footerBg    = isLight ? '#f8fafc' : '#161b22'
  const formBg      = isLight ? '#f0f4f9' : '#0d1117'
  const textPrimary = isLight ? '#0d1117' : '#f1f5f9'
  const textSecondary = isLight ? '#3b4558' : '#94a3b8'
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ 
    name: '', email: '', password: '', role: 'student', phone: '',
    roll_number: '', department: 'Computer Science', semester: 1, batch_year: new Date().getFullYear(),
    parent_name: '', parent_email: '', parent_phone: '', parent_password: ''
  })
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
      if (form.role === 'student') {
        // Use the specialized enrollment API
        await api.post('/api/admin/enroll-student', {
          student_name: form.name,
          student_email: form.email,
          student_password: form.password,
          roll_number: form.roll_number,
          department: form.department,
          semester: form.semester,
          batch_year: form.batch_year,
          parent_name: form.parent_name,
          parent_email: form.parent_email,
          parent_phone: form.parent_phone,
          parent_password: form.parent_password
        })
        toast.success('Student & Parent enrolled successfully')
      } else {
        // Standard user creation
        await api.post('/api/admin/users', {
          name: form.name, email: form.email, password: form.password, role: form.role, phone: form.phone
        })
        toast.success('User created successfully')
      }
      
      setShowModal(false)
      setForm({ 
        name: '', email: '', password: '', role: 'student', phone: '',
        roll_number: '', department: 'Computer Science', semester: 1, batch_year: new Date().getFullYear(),
        parent_name: '', parent_email: '', parent_phone: '', parent_password: ''
      })
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
              <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
              <p className="text-text-secondary text-sm mt-1">Manage users, roles, and institution settings</p>
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
              <span className="text-xs text-text-secondary">{users.length} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border">
                    {['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-text-secondary uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {users.map(u => (
                    <tr
                      key={u.id}
                      className="transition-colors group cursor-pointer"
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-hover)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-xs font-bold text-brand-600 border border-brand-100">
                            {u.name[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-text-primary">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-text-secondary">{u.email}</td>
                      <td className="py-3 px-2">
                        <span className={`font-semibold capitalize text-xs ${roleColors[u.role]}`}>{u.role}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-teal-400/10 text-teal-400' : 'bg-red-400/10 text-red-400'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-text-secondary text-xs">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleToggleActive(u)}
                            className="text-xs text-text-secondary hover:text-text-primary transition-colors px-2 py-1 rounded-lg hover:bg-surface-border">
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
                <div className="text-center py-12 text-text-secondary">No users found</div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="w-full max-w-xl animate-slide-up flex flex-col max-h-[95vh] overflow-hidden shadow-2xl rounded-2xl border"
            style={{ background: modalBg, borderColor: modalBorder }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-6 border-b shrink-0"
              style={{ background: headerBg, borderColor: modalBorder }}
            >
              <h3 className="text-xl font-bold" style={{ color: textPrimary }}>Create New User</h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-xl"
                style={{ color: textSecondary }}
                onMouseEnter={e => { e.currentTarget.style.background = isLight ? '#e2e8f0' : '#1c2128' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >✕</button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateUser} className="flex-1 overflow-y-auto flex flex-col" style={{ background: formBg }}>
              <div className="p-6 space-y-6">

                {/* Primary Role */}
                <div
                  className="p-5 rounded-2xl border shadow-sm relative overflow-hidden"
                  style={{ background: modalBg, borderColor: modalBorder }}
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-brand-500" />
                  <label className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-3 block">Primary Role</label>
                  <select
                    className="w-full rounded-xl px-4 py-2.5 outline-none border font-semibold cursor-pointer transition-all"
                    style={{ background: panelBg, color: textPrimary, borderColor: modalBorder }}
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  >
                    <option value="student">👨‍🎓 Student &amp; Parent Pair</option>
                    <option value="mentor">👨‍🏫 Mentor</option>
                    <option value="admin">🛡️ Admin</option>
                  </select>
                </div>

                {/* User / Student Details */}
                <div
                  className="p-6 rounded-2xl border shadow-sm space-y-5"
                  style={{ background: modalBg, borderColor: modalBorder }}
                >
                  <h4
                    className="text-xs font-bold uppercase tracking-widest border-b pb-3 shrink-0"
                    style={{ color: textPrimary, borderColor: modalBorder }}
                  >
                    {form.role === 'student' ? 'Student Details' : 'User Details'}
                  </h4>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                    {[
                      { label: 'Full Name',     key: 'name',     type: 'text',     placeholder: 'e.g. Anjali Sharma' },
                      { label: 'Email Address', key: 'email',    type: 'email',    placeholder: 'email@college.edu' },
                      { label: 'Password',      key: 'password', type: 'password', placeholder: '••••••••' },
                      { label: 'Phone Number',  key: 'phone',    type: 'tel',      placeholder: '+91...' },
                    ].map(({ label, key, type, placeholder }) => (
                      <div key={key}>
                        <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: textSecondary }}>{label}</label>
                        <input
                          type={type}
                          className="w-full rounded-xl px-4 py-2.5 outline-none border text-sm transition-all"
                          style={{ background: panelBg, color: textPrimary, borderColor: modalBorder }}
                          placeholder={placeholder}
                          value={form[key]}
                          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                          required={key !== 'phone'}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Student-only extra fields */}
                  {form.role === 'student' && (
                    <div className="grid grid-cols-2 gap-x-5 gap-y-4 pt-5 mt-2 border-t" style={{ borderColor: modalBorder }}>
                      {[
                        { label: 'Roll Number', key: 'roll_number', type: 'text',   placeholder: 'CS001' },
                        { label: 'Department',  key: 'department',  type: 'text',   placeholder: 'Computer Science' },
                        { label: 'Semester',    key: 'semester',    type: 'number', placeholder: '1' },
                        { label: 'Batch Year',  key: 'batch_year',  type: 'number', placeholder: '2024' },
                      ].map(({ label, key, type, placeholder }) => (
                        <div key={key}>
                          <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: textSecondary }}>{label}</label>
                          <input
                            type={type}
                            className="w-full rounded-xl px-4 py-2.5 outline-none border text-sm transition-all"
                            style={{ background: panelBg, color: textPrimary, borderColor: modalBorder }}
                            placeholder={placeholder}
                            value={form[key]}
                            onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? +e.target.value : e.target.value }))}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Parent Details */}
                {form.role === 'student' && (
                  <div
                    className="p-6 rounded-2xl border shadow-sm relative overflow-hidden"
                    style={{
                      background: isLight ? '#f0f4ff' : '#0f1320',
                      borderColor: isLight ? '#c7d2fe' : '#2d3a6b',
                    }}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                    <h4 className="text-xs font-bold text-brand-600 uppercase tracking-widest pb-3 mb-5 border-b border-brand-200/50 flex items-center gap-2">
                      <span>👨‍👩‍👦</span> Parent / Guardian Info
                    </h4>
                    <div className="grid grid-cols-2 gap-x-5 gap-y-4 relative z-10">
                      {[
                        { label: 'Name',          key: 'parent_name',     type: 'text',     placeholder: "e.g. Ramesh's Parent" },
                        { label: 'Email',          key: 'parent_email',    type: 'email',    placeholder: 'parent@email.com' },
                        { label: 'Phone',          key: 'parent_phone',    type: 'tel',      placeholder: '+91...' },
                        { label: 'Login Password', key: 'parent_password', type: 'password', placeholder: '••••••••' },
                      ].map(({ label, key, type, placeholder }) => (
                        <div key={key}>
                          <label className="text-[11px] font-bold text-brand-600 uppercase tracking-wider mb-1.5 block">{label}</label>
                          <input
                            type={type}
                            className="w-full rounded-xl px-4 py-2.5 outline-none border text-sm transition-all"
                            style={{
                              background: isLight ? '#ffffff' : '#0d1117',
                              color: textPrimary,
                              borderColor: isLight ? '#c7d2fe' : '#2d3a6b',
                            }}
                            placeholder={placeholder}
                            value={form[key]}
                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                className="p-6 border-t flex justify-end gap-3 shrink-0"
                style={{ background: footerBg, borderColor: modalBorder }}
              >
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary px-6 font-semibold">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary px-8">
                  {submitting ? 'Creating...' : '✓ Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
