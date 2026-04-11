import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import { useTheme } from '../context/ThemeContext'
import Sidebar from '../components/Sidebar'
import RiskBadge from '../components/RiskBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts'

const RISK_COLORS = { low: '#2dd4bf', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' }

// Read-only metric card driven from real assessment data
function MetricBar({ label, value, max = 100, unit = '%', color }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const barColor = pct >= 85 ? '#2dd4bf' : pct >= 65 ? '#5c7cfa' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm text-text-primary font-medium">{label}</p>
        <span className="text-xs tabular-nums text-text-secondary font-semibold">
          {typeof value === 'number' ? value.toFixed(1) : '—'}{unit}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: hoverBg }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-text-muted">{pct}% of target</span>
        {pct >= 85 && <span className="text-xs text-teal-400 font-semibold">On Track</span>}
        {pct < 50 && <span className="text-xs text-red-400 font-semibold">Needs Attention</span>}
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  const { theme } = useTheme()
  const isLight = theme !== 'dark'
  const hoverBg = isLight ? '#edf1f7' : '#1c2128'
  const rowHoverBg = isLight ? '#f1f5f9' : '#1c212880'

  const { user } = useAuth()
  const [scores, setScores] = useState([])
  const [student, setStudent] = useState(null)
  const [assessment, setAssessment] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [semResults, setSemResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/api/students/${user.id}`)
        setStudent(res.data)

        // Fetch risk score history
        const scoreRes = await api.get(`/api/students/${res.data.id}/risk-scores`)
        setScores(scoreRes.data.reverse().map((r, i) => ({
          week: `W${i + 1}`,
          score: r.score,
          level: r.risk_level,
          date: new Date(r.computed_at).toLocaleDateString(),
        })))

        // Fetch latest assessment data
        try {
          const asmRes = await api.get(`/api/students/${res.data.id}/assessments`)
          if (asmRes.data?.length > 0) {
            setAssessment(asmRes.data[0])
          }
        } catch { /* ignore */ }

        // Fetch daily attendance
        try {
          const attRes = await api.get(`/api/attendance/student/${res.data.id}`)
          setAttendance(attRes.data)
        } catch { /* ignore */ }

        // Fetch semester results
        try {
          const semRes = await api.get(`/api/students/${res.data.id}/semester-results`)
          setSemResults(semRes.data)
        } catch { /* ignore */ }
      } catch {
        // Demo fallback when no backend connection
        setScores([
          { week: 'W1', score: 32, level: 'low' },
          { week: 'W2', score: 41, level: 'medium' },
          { week: 'W3', score: 58, level: 'medium' },
          { week: 'W4', score: 44, level: 'medium' },
          { week: 'W5', score: 29, level: 'low' },
        ])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const latest = scores[scores.length - 1]
  const prev = scores[scores.length - 2]
  const trend = latest && prev ? +(latest.score - prev.score).toFixed(1) : null
  const level = latest?.level ?? 'low'

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.[0]) return null
    const d = payload[0].payload
    return (
      <div className="bg-surface-card border border-surface-border rounded-xl p-3 text-xs shadow-xl">
        <p className="text-text-secondary">{d.date ?? d.week}</p>
        <p className="text-base font-bold text-text-primary">{d.score?.toFixed(1)}<span className="text-text-secondary"> / 100</span></p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto animate-fade-in">

          {/* Welcome header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                Hey, {user?.name?.split(' ')[0]} 👋
              </h1>
              <p className="text-text-secondary text-sm mt-1">Here's your academic wellness snapshot for this week</p>
            </div>
            <RiskBadge level={level} />
          </div>

          {loading ? <LoadingSpinner /> : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Risk Score Card */}
              <div className="lg:col-span-1">
                <div className="card h-full" style={{ borderColor: RISK_COLORS[level] + '33' }}>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-4">Current Risk Score</p>
                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-6xl font-black tabular-nums" style={{ color: RISK_COLORS[level] }}>
                      {latest?.score?.toFixed(0) ?? '—'}
                    </span>
                    <span className="text-text-secondary text-lg pb-1">/ 100</span>
                  </div>

                  {/* Ring progress */}
                  <div className="flex justify-center my-5">
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--surface-border)" strokeWidth="10" />
                      <circle cx="60" cy="60" r="50" fill="none"
                        stroke={RISK_COLORS[level]} strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={`${Math.PI * 100}`}
                        strokeDashoffset={`${Math.PI * 100 * (1 - (latest?.score ?? 0) / 100)}`}
                        transform="rotate(-90 60 60)"
                        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                      />
                      <text x="60" y="65" textAnchor="middle" fill={RISK_COLORS[level]} fontSize="20" fontWeight="700">
                        {level.toUpperCase()[0]}
                      </text>
                    </svg>
                  </div>

                  {trend !== null && (
                    <div className={`flex items-center gap-1 text-sm font-medium ${trend > 0 ? 'text-red-400' : 'text-teal-400'}`}>
                      <span>{trend > 0 ? '↑' : '↓'}</span>
                      <span>{Math.abs(trend)} pts vs last week</span>
                    </div>
                  )}

                  <p className="mt-4 text-xs text-text-secondary leading-relaxed">
                    {level === 'low' && "You're doing great! Keep up your attendance and submission streak."}
                    {level === 'medium' && "Some improvement areas detected. Focus on attendance and timely submissions."}
                    {level === 'high' && "Your risk is elevated. Please connect with your mentor for support."}
                    {level === 'critical' && "Urgent attention needed. Your mentor has been notified and is ready to help."}
                  </p>
                </div>
              </div>

              {/* Right column */}
              <div className="lg:col-span-2 space-y-6">

                {/* Trajectory chart */}
                <div className="card">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-4">Academic Trajectory</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={scores}>
                        <defs>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#5c7cfa" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#5c7cfa" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
                        <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#6b7280' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="score" stroke="#5c7cfa" strokeWidth={2.5}
                          fill="url(#areaGrad)" dot={{ r: 4, fill: '#5c7cfa', strokeWidth: 0 }}
                          activeDot={{ r: 6 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Academic Metrics — READ ONLY from database */}
                <div className="card">
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Academic Metrics</p>
                    <span className="text-xs text-text-muted px-2 py-1 rounded-md" style={{ backgroundColor: hoverBg }}>
                      📊 From your dataset — read only
                    </span>
                  </div>

                  {assessment ? (
                    <div className="space-y-5">
                      <MetricBar
                        label="Attendance Rate"
                        value={assessment.attendance_pct}
                        unit="%"
                      />
                      <MetricBar
                        label="Internal Assessment Score"
                        value={assessment.internal_marks}
                        unit=" / 100"
                        max={100}
                      />
                      <MetricBar
                        label="Assignment Submission Rate"
                        value={assessment.assignment_submission_rate}
                        unit="%"
                      />
                      <p className="text-xs text-text-muted pt-2 border-t border-surface-border">
                        Subject: <span className="text-text-secondary">{assessment.subject}</span>
                        &nbsp;·&nbsp; Semester: <span className="text-text-secondary">{assessment.semester}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary text-center py-6">
                      No assessment data available yet. Your mentor or admin will upload your scores.
                    </p>
                  )}
                </div>

                {/* Motivational tip */}
                <div className="card border-brand-700/30 bg-brand-600/5">
                  <div className="flex gap-4">
                    <div className="text-2xl shrink-0">💡</div>
                    <div>
                      <p className="text-sm font-semibold text-brand-300 mb-1">Growth Insight</p>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        Students who attend &gt;85% of classes improve their risk score by an average of
                        <span className="text-brand-400 font-semibold"> 22 points</span> within 3 weeks.
                        Your attendance is the highest-impact factor — you've got this!
                      </p>
                    </div>
                  </div>
                </div>

              </div>
              
              {/* Third column / bottom row for logs */}
              <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                
                {/* Daily Attendance Log */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-text-secondary border-b border-surface-border pb-3 mb-3">📅 Daily Attendance Log</h3>
                  {attendance.length === 0 ? (
                    <p className="text-xs text-text-muted py-4 text-center">No attendance records found.</p>
                  ) : (
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                      {attendance.map(a => (
                        <div key={a.id} className="flex justify-between items-center p-2 rounded bg-surface-hover/50 text-sm border border-surface-border">
                          <div>
                            <span className="font-medium text-text-primary">{new Date(a.date).toLocaleDateString()}</span>
                            <span className="text-xs text-text-secondary ml-2">{a.subject}</span>
                          </div>
                          <span className={a.is_present ? 'text-teal-400 font-semibold' : 'text-red-400 font-semibold'}>
                            {a.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Semester Results Log */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-text-secondary border-b border-surface-border pb-3 mb-3">🎓 Semester Results</h3>
                  {semResults.length === 0 ? (
                    <p className="text-xs text-text-muted py-4 text-center">No semester results available.</p>
                  ) : (
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                      {semResults.map(r => (
                        <div key={r.id} className="p-3 rounded bg-surface-hover/30 text-sm border border-surface-border flex justify-between items-center">
                          <div>
                            <p className="font-medium text-brand-300">Semester {r.semester} <span className="text-text-secondary text-xs ml-1">({r.academic_year})</span></p>
                            <p className="text-xs text-text-secondary mt-1">GPA: {r.gpa?.toFixed(2) ?? '-'} | Arrears: {r.arrears}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${r.passed ? 'bg-teal-500/10 text-teal-400' : 'bg-red-500/10 text-red-400'}`}>
                            {r.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
