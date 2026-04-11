import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'

const NAV = {
  admin:   [
    { to: '/admin',   icon: '⚙️',  label: 'Dashboard' },
  ],
  mentor:  [
    { to: '/mentor',  icon: '📊',  label: 'Dashboard' },
  ],
  student: [
    { to: '/student', icon: '🎯',  label: 'My Dashboard' },
  ],
  parent:  [
    { to: '/parent',  icon: '👨‍👩‍👧', label: 'Parent Portal' },
  ],
}

const ROLE_META = {
  admin:   { color: 'text-brand-500',  bg: 'bg-brand-500/15',   ring: 'ring-brand-500/30',  emoji: '⚙️' },
  mentor:  { color: 'text-teal-500',   bg: 'bg-teal-500/15',    ring: 'ring-teal-500/30',   emoji: '👨‍🏫' },
  student: { color: 'text-amber-500',  bg: 'bg-amber-500/15',   ring: 'ring-amber-500/30',  emoji: '🎒' },
  parent:  { color: 'text-purple-500', bg: 'bg-purple-500/15',  ring: 'ring-purple-500/30', emoji: '👨‍👩‍👧' },
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const links = NAV[user?.role] ?? []
  const meta = ROLE_META[user?.role] ?? ROLE_META.student

  const handleLogout = () => {
    logout()
    toast.success('Signed out')
    navigate('/login')
  }

  return (
    <aside
      className="w-64 shrink-0 flex flex-col border-r border-surface-border"
      style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        background: 'var(--surface-card)',
        borderRightColor: 'var(--surface-border)',
      }}
    >
      {/* ── Brand ─────────────────────────── */}
      <div className="px-5 py-5 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}
          >
            🎓
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary leading-tight tracking-tight">Risk Predictor</p>
            <p className="text-xs text-text-secondary font-medium">Academic Intelligence</p>
          </div>
        </div>
      </div>

      {/* ── Navigation ────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => isActive ? 'nav-link-active' : 'nav-link'}
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── Bottom pinned section ─────────── */}
      <div className="border-t border-surface-border">

        {/* Theme Toggle */}
        <div className="px-3 pt-3">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-text-secondary hover:text-text-primary transition-all duration-200 text-sm font-medium group"
            style={{ background: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 transition-transform group-hover:scale-110"
              style={{ background: theme === 'dark' ? 'rgba(251,191,36,0.15)' : 'rgba(99,102,241,0.12)' }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </span>
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            <span
              className="ml-auto text-xs px-1.5 py-0.5 rounded-md font-semibold"
              style={{
                background: theme === 'dark' ? 'rgba(251,191,36,0.12)' : 'rgba(99,102,241,0.10)',
                color: theme === 'dark' ? '#fbbf24' : '#6366f1'
              }}
            >
              {theme === 'dark' ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        {/* User Card */}
        <div className="px-3 pt-2 pb-3">
          <div
            className="flex items-center gap-3 px-3 py-3 rounded-xl border border-surface-border mb-2"
            style={{ background: 'var(--surface-hover)' }}
          >
            <div
              className={`w-9 h-9 rounded-xl ${meta.bg} ring-1 ${meta.ring} flex items-center justify-center text-sm font-bold shrink-0 ${meta.color}`}
            >
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate leading-tight">{user?.name}</p>
              <p className={`text-xs font-semibold capitalize mt-0.5 ${meta.color}`}>{user?.role}</p>
            </div>
          </div>

          {/* Sign Out */}
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
            style={{ color: '#ef4444' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#f87171' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ef4444' }}
          >
            <span className="text-base">🚪</span>
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  )
}
