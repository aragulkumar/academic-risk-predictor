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
  const [csvFile, setCsvFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)

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

  const handleNotifyParent = async () => {
    if (!selected) return
    const reason = prompt("Enter reason for notifying parent (e.g., Failed internal exams, Continuous low attendance):")
    if (!reason) return

    try {
      const res = await api.post('/api/mentors/notify-parent', {
        student_id: selected.student_id,
        reason: reason
      })
      if (res.data.success) {
        toast.success(res.data.message)
      } else {
        toast.error(res.data.message)
      }
      openStudent(selected) // Refresh intervention history
    } catch (err) {
      toast.error('Failed to send notification')
    }
  }

  const filtered = heatmap.filter(s =>
    s.roll_number.toLowerCase().includes(search.toLowerCase()) ||
    s.department.toLowerCase().includes(search.toLowerCase()) ||
    (s.student_name || s.name || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleCsvUpload = async () => {
    if (!csvFile) return
    setUploading(true)
    setUploadResult(null)
    try {
      const formData = new FormData()
      formData.append('file', csvFile)
      const res = await api.post('/api/upload/assessments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadResult(res.data)
      toast.success(`${res.data.saved} assessments uploaded successfully!`)
      setCsvFile(null)
      fetchData() // refresh dashboard
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.[0]) return null
    const d = payload[0].payload
    return (
      <div className="bg-surface-card border border-surface-border rounded-xl p-3 text-xs shadow-xl">
        <p className="text-text-secondary">{d.date}</p>
        <p className="text-lg font-bold" style={{ color: RISK_COLORS[d.level] }}>
          {d.score?.toFixed(1)} / 100
        </p>
        <RiskBadge level={d.level} />
      </div>
    )
  }

  return (
    <div className="flex" style={{ minHeight: '100vh' }}>
      <Sidebar />
      <main className="flex-1 flex overflow-hidden" style={{ minHeight: '100vh' }}>
        {/* Left panel */}
        <div className="flex-1 overflow-auto">
          {/* Header gradient banner */}
          <div
            className="px-8 py-6 border-b border-surface-border"
            style={{
              background: 'linear-gradient(135deg, var(--surface-card) 0%, color-mix(in srgb, var(--brand-500) 4%, var(--surface-card)) 100%)',
            }}
          >
            <div className="max-w-4xl">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-text-primary tracking-tight">Mentor Dashboard</h1>
                  <p className="text-text-secondary text-sm mt-1">Student risk heatmap &amp; intervention center</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--brand-500)', border: '1px solid rgba(99,102,241,0.2)' }}
                  >
                    📅 {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>

              {/* Inline Stats Row */}
              {!loading && summary && (
                <div className="flex gap-4 mt-5 flex-wrap">
                  {[
                    { label: 'Total Students', value: summary.total_students ?? 0, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', icon: '👥' },
                    { label: 'Safe', value: summary.safe_count ?? 0, color: '#059669', bg: 'rgba(5,150,105,0.1)', icon: '✅' },
                    { label: 'At Risk', value: summary.at_risk_count ?? 0, color: '#d97706', bg: 'rgba(217,119,6,0.1)', icon: '⚠️' },
                    { label: 'Critical', value: summary.critical_count ?? 0, color: '#dc2626', bg: 'rgba(220,38,38,0.1)', icon: '🚨' },
                  ].map(s => (
                    <div
                      key={s.label}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-surface-border flex-1 min-w-28"
                      style={{ background: 'var(--surface-card)' }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                        style={{ background: s.bg }}
                      >
                        {s.icon}
                      </div>
                      <div>
                        <p className="text-xl font-bold tabular-nums leading-none" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-xs text-text-secondary mt-0.5">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {loading && <div className="mt-4"><LoadingSpinner /></div>}
            </div>
          </div>

          <div className="p-8">
          <div className="max-w-4xl animate-fade-in">

            {/* CSV Upload Panel */}
            <div className="card mb-6">
              <h2 className="section-title mb-4">📤 Bulk Upload Assessment Data</h2>
              <p className="text-xs text-text-secondary mb-4">
                Upload a <code className="bg-surface-hover px-1 rounded text-brand-400">.csv</code> or{' '}
                <code className="bg-surface-hover px-1 rounded text-brand-400">.xlsx</code> file with columns:{' '}
                <span className="text-text-secondary">roll_number, subject, semester, attendance_pct, internal_marks, assignment_submission_rate</span>
              </p>

              {/* Drop Zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); setCsvFile(e.dataTransfer.files[0]); setUploadResult(null) }}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                  dragOver ? 'border-brand-500 bg-brand-600/10' : 'border-surface-border hover:border-brand-700'
                }`}
                onClick={() => document.getElementById('csv-file-input').click()}
              >
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={e => { setCsvFile(e.target.files[0]); setUploadResult(null) }}
                />
                {csvFile ? (
                  <div>
                    <p className="text-2xl mb-1">📄</p>
                    <p className="text-sm font-semibold text-text-primary">{csvFile.name}</p>
                    <p className="text-xs text-text-secondary">{(csvFile.size / 1024).toFixed(1)} KB — Click to change</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl mb-2">☁️</p>
                    <p className="text-sm text-text-secondary">Drag & drop your CSV here, or <span className="text-brand-400 underline">browse</span></p>
                    <p className="text-xs text-text-secondary mt-1">Supports .csv and .xlsx files</p>
                  </div>
                )}
              </div>

              {csvFile && (
                <button
                  id="upload-csv-btn"
                  onClick={handleCsvUpload}
                  disabled={uploading}
                  className="btn-primary w-full mt-4 text-sm"
                >
                  {uploading ? '⏳ Uploading & Running ML...' : '🚀 Upload & Predict Risk for All Students'}
                </button>
              )}

              {/* Upload Result Summary */}
              {uploadResult && (
                <div className="mt-4 p-4 rounded-xl border border-surface-border bg-surface-hover">
                  <p className="text-sm font-semibold text-text-primary mb-3">{uploadResult.message}</p>
                  <div className="flex gap-4 mb-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-teal-500/20 text-teal-400">✅ {uploadResult.saved} Saved</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">⚠️ {uploadResult.failed} Failed</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-brand-600/20 text-brand-400">🤖 {uploadResult.risk_prediction}</span>
                  </div>
                  {uploadResult.errors?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-text-secondary font-medium">Failed rows:</p>
                      {uploadResult.errors.map((e, i) => (
                        <p key={i} className="text-xs text-red-400 font-mono">
                          Row {e.row} · {e.roll_number ?? '?'} → {e.error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

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
                        {/* Avatar */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                          style={{ background: RISK_COLORS[s.risk_level] + '22', color: RISK_COLORS[s.risk_level], border: `1.5px solid ${RISK_COLORS[s.risk_level]}44` }}
                        >
                          {(s.student_name || s.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-bold text-text-primary">{s.student_name || s.name}</span>
                            <RiskBadge level={s.risk_level} />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-text-secondary">{s.roll_number}</span>
                            <span className="text-text-secondary text-xs">·</span>
                            <span className="text-text-secondary text-xs">{s.department} · Sem {s.semester}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-2xl font-bold tabular-nums" style={{ color: RISK_COLORS[s.risk_level] ?? '#6b7280' }}>
                            {s.risk_score?.toFixed(0) ?? '—'}
                          </p>
                          <p className="text-xs text-text-secondary">/ 100</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-center text-text-secondary py-8">No students match search</p>
                  )}
                </div>
              )}
                {/* end heatmap grid card */}
          </div>{/* end max-w-4xl */}
          </div>{/* end p-8 */}
        </div>{/* end flex-1 overflow-auto */}

        {/* Right detail panel - sticky */}
        {selected && (
          <div
            className="w-96 border-l border-surface-border bg-surface-card animate-fade-in flex flex-col"
            style={{ position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}
          >
            {/* Panel header strip */}
            <div
              className="px-6 py-4 border-b border-surface-border flex items-center justify-between shrink-0"
              style={{ background: `linear-gradient(135deg, ${RISK_COLORS[selected.risk_level]}12, transparent)` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
                  style={{ background: RISK_COLORS[selected.risk_level] + '22', color: RISK_COLORS[selected.risk_level] }}
                >
                  {(selected.student_name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary leading-tight">{selected.student_name || 'Student'}</p>
                  <p className="text-xs text-text-secondary">{selected.roll_number}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all text-xs">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* 1. Score & Factors */}
            <div className="card" style={{ borderColor: RISK_COLORS[selected.risk_level] + '44' }}>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold tabular-nums" style={{ color: RISK_COLORS[selected.risk_level] }}>
                  {selected.risk_score?.toFixed(0) ?? '—'}
                </span>
                <div className="pb-1">
                  <p className="text-xs text-text-secondary">Risk Score</p>
                  <RiskBadge level={selected.risk_level} />
                </div>
              </div>
              {selected.top_factors && (
                <div className="mt-4 pt-4 border-t border-surface-border">
                  <p className="text-xs text-text-secondary font-medium mb-2">🔍 Key Factors</p>
                  {selected.top_factors.split('\n').filter(Boolean).map((f, i) => (
                    <p key={i} className="text-xs text-text-primary py-1 border-b border-surface-border/50 last:border-0">{f}</p>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Parent Info block */}
            <div className="card border-purple-900/30 bg-purple-900/5">
              <h4 className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-3">👨‍👩‍👧 Parent / Guardian</h4>
              {selected.parent_contact ? (
                <div>
                  <p className="text-sm font-bold text-text-primary">{selected.parent_contact.name}</p>
                  <p className="text-xs text-text-secondary mt-1">📞 {selected.parent_contact.phone}</p>
                  <p className="text-xs text-text-secondary">✉️ {selected.parent_contact.email}</p>
                  
                  <button 
                    onClick={handleNotifyParent}
                    className="w-full mt-4 py-2 px-3 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors"
                  >
                    🚨 Notify Parent of Risk/Failure
                  </button>
                </div>
              ) : (
                <p className="text-xs text-text-secondary italic">No parent linked to this student.</p>
              )}
            </div>

            {/* 3. Log Intervention */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wide">Log Intervention</p>
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
              <div className="mb-5">
                <p className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wide">Intervention History</p>
                <div className="space-y-2">
                  {interventions.map(iv => (
                    <div key={iv.id} className="px-3 py-2.5 rounded-xl bg-surface-hover border border-surface-border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-text-primary">
                          {ACTION_LABELS[iv.action_type] ?? iv.action_type}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {new Date(iv.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {iv.notes && <p className="text-xs text-text-secondary">{iv.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Student Profile Card */}
            <div className="card mt-auto bg-surface-hover/50 border-surface-border">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center font-bold text-xl border border-brand-500/50">
                    {selected.student_name ? selected.student_name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-text-primary">{selected.student_name || 'Student'}</h3>
                    <p className="text-sm font-mono text-text-secondary font-semibold">{selected.roll_number}</p>
                    <p className="text-xs text-text-secondary mt-1">{selected.department} · Semester {selected.semester}</p>
                  </div>
                </div>
            </div>{/* end profile card */}
            </div>{/* end overflow-y-auto scroll body */}
          </div>{/* end sticky right panel */}
        )}
      </main>
    </div>
  )
}
