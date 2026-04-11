import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(email, password)
      toast.success(`Welcome back, ${user.name}!`)
      navigate(user.role === 'admin' ? '/admin' : user.role === 'mentor' ? '/mentor' : '/student')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px]
                        bg-brand-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600/20
                          border border-brand-500/30 rounded-2xl mb-5 glow-brand">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Academic Risk Predictor</h1>
          <p className="text-text-secondary text-sm mt-1.5">AI-powered early warning intelligence system</p>
        </div>

        {/* Card */}
        <div className="card">
          <h2 className="text-lg font-semibold text-text-primary mb-6">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username or Student Name</label>
              <input
                id="email"
                type="text"
                className="input"
                placeholder="rohit or rohit@parent"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className="input pr-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary text-sm"
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              id="login-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="divider" />
          <div className="space-y-2">
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wide mb-3">Demo Credentials</p>
            {[
              { role: 'Admin', email: 'admin@demo.edu', icon: '⚙️' },
              { role: 'Mentor', email: 'mentor@demo.edu', icon: '👨‍🏫' },
              { role: 'Student', email: 'student@demo.edu', icon: '🎒' },
            ].map(({ role, email: demoEmail, icon }) => (
              <button
                key={role}
                type="button"
                onClick={() => { setEmail(demoEmail); setPassword('demo1234') }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-border)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-hover)' }}
                className="w-full text-left px-3 py-2 rounded-lg border border-surface-border
                           transition-colors text-sm flex items-center gap-2"
                style={{ background: 'var(--surface-hover)' }}
              >
                <span>{icon}</span>
                <span className="font-medium text-text-primary">{role}</span>
                <span className="text-text-secondary text-xs ml-auto">{demoEmail}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
