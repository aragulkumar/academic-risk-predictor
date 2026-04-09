import { useEffect, useState } from 'react'
import api from '../api/client'
import Sidebar from '../components/Sidebar'
import StatCard from '../components/StatCard'
import RiskBadge from '../components/RiskBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const RISK_COLORS = { low: '#2dd4bf', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' }

const ACTION_LABELS = {
  check_in: '📅 Schedule Check-In',
  resource_sent: '📚 Send Resources',
  counseling_flag: '🧠 Flag for Counseling',
  parent_notified: '📞 Notify Parent',
  custom: '✏️ Custom Note',
}

export default function MentorDashboard() {
  const [summary, setSummary] = useState(null)
  const [heatmap, setHeatmap] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState([])
  const [interventions, setInterventions] = useState([])
  const [actionType, setActionType] = useState('check_in')
  const [notes, setNotes] = useState('')
  const [logLoading, setLogLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [heatRes, summRes] = await Promise.all([
        api.get('/api/mentors/heatmap'),
        api.get('/api/mentors/dashboard/summary'),
      ])
      setHeatmap(heatRes.data)
      setSummary(summRes.data)
    } catch { toast.error('Failed to load dashboard') }
    finally { setLoading(false) }
  }

  const openStudent = async (s) => {
    setSelected(s)
    try {
      const [histRes, intRes] = await Promise.all([
        api.get(`/api/students/${s.student_id}/risk-scores`),
        api.get(`/api/mentors/interventions/${s.student_id}`),
      ])
      setHistory(histRes.data.reverse().map((r, i) => ({
        name: `Day ${i + 1}`,
        score: r.score,
        level: r.risk_level,
        date: new Date(r.computed_at).toLocaleDateString(),
      })))
      setInterventions(intRes.data)
    } catch { toast.error('Failed to load student details') }
  }

  const logIntervention = async () => {
    if (!selected) return
    setLogLoading(true)
    try {
      await api.post('/api/mentors/interventions', {
        student_id: selected.student_id,
        action_type: actionType,
        notes,
      })
      toast.success('Intervention logged ✓')
      setNotes('')
      openStudent(selected)
    } catch { toast.error('Failed to log intervention') }
    finally { setLogLoading(false) }
  }

  const filtered = heatmap.filter(s =>
    s.roll_number.toLowerCase().includes(search.toLowerCase()) ||
    s.department.toLowerCase().includes(search.toLowerCase())
  )

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.[0]) return null
    const d = payload[0].payload
    return (
      <div className="bg-surface-card border border-surface-border rounded-xl p-3 text-xs shadow-xl">
        <p className="text-gray-400">{d.date}</p>
        <p className="text-lg font-bold" style={{ color: RISK_COLORS[d.level] }}>
          {d.score?.toFixed(1)} / 100
        </p>
        <RiskBadge level={d.level} />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-4xl animate-fade-in">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-100">Mentor Dashboard</h1>
              <p className="text-gray-500 text-sm mt-1">Student risk heatmap & intervention center</p>
            </div>

            {/* Stats */}
            {loading ? <LoadingSpinner /> : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard icon="👥" label="My Students" value={summary?.total_students ?? 0} color="brand" />
                <StatCard icon="✅" label="Safe" value={summary?.safe_count ?? 0} color="teal" />
                <StatCard icon="⚠️" label="At Risk" value={summary?.at_risk_count ?? 0} color="amber" />
                <StatCard icon="🚨" label="Critical" value={summary?.critical_count ?? 0} color="red" />
              </div>
            )}

            {/* Search */}
            <div className="mb-4">
              <input className="input max-w-xs" placeholder="🔍 Search by roll no. or dept..." value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Heatmap Grid */}
            <div className="card">
              <h2 className="section-title">Student Risk Heatmap</h2>
              {loading ? <LoadingSpinner /> : (
                <div className="grid grid-cols-1 gap-3">
                  {filtered.map(s => (
                    <button
                      key={s.student_id}
                      onClick={() => openStudent(s)}
                      className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-150 
                        hover:border-brand-700/60 hover:bg-surface-hover
                        ${selected?.student_id === s.student_id
                          ? 'border-brand-600/50 bg-brand-600/5'
                          : 'border-surface-border bg-surface-hover/50'}`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Risk bar */}
                        <div className="w-2 h-10 rounded-full shrink-0"
                          style={{ background: RISK_COLORS[s.risk_level] ?? '#374151' }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-semibold text-gray-300">{s.roll_number}</span>
                            <span className="text-gray-600 text-xs">·</span>
                            <span className="text-gray-500 text-xs">{s.department} · Sem {s.semester}</span>
                            <RiskBadge level={s.risk_level} />
                          </div>
                          {s.top_factors && (
                            <p className="text-xs text-gray-500 truncate">{s.top_factors}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-2xl font-bold tabular-nums" style={{ color: RISK_COLORS[s.risk_level] ?? '#6b7280' }}>
                            {s.risk_score?.toFixed(0) ?? '—'}
                          </p>
                          <p className="text-xs text-gray-600">/ 100</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-center text-gray-600 py-8">No students match search</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right detail panel */}
        {selected && (
          <div className="w-96 border-l border-surface-border bg-surface-card overflow-auto p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-gray-100">{selected.roll_number}</h3>
                <p className="text-xs text-gray-500">{selected.department} · Semester {selected.semester}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-300">✕</button>
            </div>

            {/* Score */}
            <div className="card mb-5" style={{ borderColor: RISK_COLORS[selected.risk_level] + '33' }}>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold tabular-nums" style={{ color: RISK_COLORS[selected.risk_level] }}>
                  {selected.risk_score?.toFixed(0) ?? '—'}
                </span>
                <div className="pb-1">
                  <p className="text-xs text-gray-500">Risk Score</p>
                  <RiskBadge level={selected.risk_level} />
                </div>
              </div>
              {selected.top_factors && (
                <div className="mt-4 pt-4 border-t border-surface-border">
                  <p className="text-xs text-gray-500 font-medium mb-2">🔍 Key Factors</p>
                  {selected.top_factors.split(' | ').map((f, i) => (
                    <p key={i} className="text-xs text-gray-400 py-1 border-b border-surface-border/50 last:border-0">{f}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Trajectory chart */}
            {history.length > 1 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Risk Trajectory</p>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={70} stroke="#ef444466" strokeDasharray="4 4" label={{ value: 'Alert', fill: '#ef4444', fontSize: 10 }} />
                      <Line type="monotone" dataKey="score" stroke="#5c7cfa" strokeWidth={2}
                        dot={{ r: 3, fill: '#5c7cfa' }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Intervention panel */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Log Intervention</p>
              <div className="space-y-3">
                <select className="input text-sm" value={actionType} onChange={e => setActionType(e.target.value)}>
                  {Object.entries(ACTION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <textarea className="input text-sm resize-none" rows={3}
                  placeholder="Add notes (optional)..."
                  value={notes} onChange={e => setNotes(e.target.value)} />
                <button id="log-intervention-btn" onClick={logIntervention}
                  disabled={logLoading} className="btn-primary w-full text-sm">
                  {logLoading ? 'Saving...' : '✓ Log Action'}
                </button>
              </div>
            </div>

            {/* Intervention History */}
            {interventions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Intervention History</p>
                <div className="space-y-2">
                  {interventions.map(iv => (
                    <div key={iv.id} className="px-3 py-2.5 rounded-xl bg-surface-hover border border-surface-border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-300">
                          {ACTION_LABELS[iv.action_type] ?? iv.action_type}
                        </span>
                        <span className="text-xs text-gray-600">
                          {new Date(iv.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {iv.notes && <p className="text-xs text-gray-500">{iv.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
