import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'

const NAV = {
  admin:   [{ to: '/admin',   icon: '⚙️',  label: 'Dashboard' }],
  mentor:  [{ to: '/mentor',  icon: '📊',  label: 'Dashboard' }],
  student: [{ to: '/student', icon: '🎯',  label: 'My Dashboard' }],
  parent:  [{ to: '/parent',  icon: '👨‍👩‍👧', label: 'Parent Portal' }],
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const links = NAV[user?.role] ?? []

  const handleLogout = () => {
    logout()
    toast.success('Signed out')
    navigate('/login')
  }

  const roleColor = user?.role === 'admin' ? 'text-brand-400' : user?.role === 'mentor' ? 'text-teal-400' : user?.role === 'parent' ? 'text-purple-400' : 'text-amber-400'
  const roleBg = user?.role === 'admin' ? 'bg-brand-600/20' : user?.role === 'mentor' ? 'bg-teal-600/20' : user?.role === 'parent' ? 'bg-purple-600/20' : 'bg-amber-600/20'

  return (
    <aside className="w-64 min-h-screen bg-surface-card border-r border-surface-border flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-lg">
            🎓
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary leading-tight">Risk Predictor</p>
            <p className="text-xs text-text-secondary">Academic Intelligence</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
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

      {/* Theme Toggle */}
      <div className="px-5 py-2">
        <button 
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all duration-150 text-sm font-medium border border-transparent hover:border-surface-border text-left"
        >
          <span className="text-base">{theme === 'dark' ? '☀️' : '🌙'}</span>
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>

      {/* User */}
      <div className="px-3 pb-4 border-t border-surface-border pt-4">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-hover border border-surface-border mb-2">
          <div className={`w-8 h-8 rounded-lg ${roleBg} flex items-center justify-center text-sm`}>
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{user?.name}</p>
            <p className={`text-xs font-medium capitalize ${roleColor}`}>{user?.role}</p>
          </div>
        </div>
        <button
          id="logout-btn"
          onClick={handleLogout}
          className="w-full nav-link text-red-400 hover:text-red-300 hover:bg-red-600/10"
        >
          <span>🚪</span> Sign Out
        </button>
      </div>
    </aside>
  )
}
