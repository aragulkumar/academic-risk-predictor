import { useEffect, useState } from 'react'
import api from '../api/client'
import Sidebar from '../components/Sidebar'
import RiskBadge from '../components/RiskBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

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
  const [interventions, setInterventions] = useState([])
  const [actionType, setActionType] = useState('check_in')
  const [notes, setNotes] = useState('')
  const [logLoading, setLogLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [csvFile, setCsvFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  // Attendance Modal States
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0])
  const [attendanceSubject, setAttendanceSubject] = useState('General')
  const [attendanceMap, setAttendanceMap] = useState({})
  const [attendanceLoading, setAttendanceLoading] = useState(false)

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
    setInterventions([])
    try {
      const intRes = await api.get(`/api/mentors/interventions/${s.student_id}`)
      setInterventions(intRes.data)
    } catch { toast.error('Failed to load student details') }
  }

  const openAttendanceModal = () => {
    const initialMap = {}
    heatmap.forEach(s => { initialMap[s.student_id] = true }) // Default to true (present)
    setAttendanceMap(initialMap)
    setShowAttendanceModal(true)
  }

  const submitAttendance = async () => {
    setAttendanceLoading(true)
    const records = Object.keys(attendanceMap).map(id => ({
      student_id: parseInt(id),
      is_present: attendanceMap[id]
    }))

    try {
      await api.post('/api/attendance/bulk', {
        date: attendanceDate,
        subject: attendanceSubject,
        records
      })
      toast.success('Batch attendance saved successfully!')
      setShowAttendanceModal(false)
    } catch {
      toast.error('Failed to save attendance')
    } finally {
      setAttendanceLoading(false)
    }
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
      toast.success('Intervention logged')
      setNotes('')
      openStudent(selected)
    } catch { toast.error('Failed to log intervention') }
    finally { setLogLoading(false) }
  }

  const handleNotifyParent = async () => {
    if (!selected) return
    const reason = prompt('Enter reason for notifying parent:')
    if (!reason) return
    try {
      const res = await api.post('/api/mentors/notify-parent', {
        student_id: selected.student_id,
        reason,
      })
      if (res.data.success) toast.success(res.data.message)
      else toast.error(res.data.message)
      openStudent(selected)
    } catch {
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
      toast.success(`${res.data.saved} assessments uploaded!`)
      setCsvFile(null)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const STATS = [
    { label: 'Total Students', value: summary?.total_students ?? 0, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', icon: '👥' },
    { label: 'Safe',           value: summary?.safe_count     ?? 0, color: '#059669', bg: 'rgba(5,150,105,0.1)',    icon: '✅' },
    { label: 'At Risk',        value: summary?.at_risk_count  ?? 0, color: '#d97706', bg: 'rgba(217,119,6,0.1)',    icon: '⚠️' },
    { label: 'Critical',       value: summary?.critical_count ?? 0, color: '#dc2626', bg: 'rgba(220,38,38,0.1)',    icon: '🚨' },
  ]

  return (
    <div className="flex" style={{ minHeight: '100vh' }}>
      <Sidebar />

      <main className="flex-1 flex overflow-hidden" style={{ minHeight: '100vh' }}>

        {/* ── Left scrollable panel ── */}
        <div className="flex-1 overflow-auto">

          {/* Gradient header */}
          <div
            className="px-8 py-6 border-b border-surface-border"
            style={{ background: 'var(--surface-card)' }}
          >
            <div className="max-w-4xl">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h1 className="text-2xl font-bold text-text-primary tracking-tight">Mentor Dashboard</h1>
                  <p className="text-text-secondary text-sm mt-1">Student risk heatmap &amp; intervention center</p>
                </div>
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full mt-1"
                  style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--brand-500)', border: '1px solid rgba(99,102,241,0.2)' }}
                >
                  {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
              </div>

              {loading ? (
                <LoadingSpinner />
              ) : (
                <div className="flex gap-3 flex-wrap">
                  {STATS.map(s => (
                    <div
                      key={s.label}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-surface-border flex-1"
                      style={{ background: 'var(--surface-card)', minWidth: '120px' }}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0" style={{ background: s.bg }}>
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
            </div>
          </div>

          {/* Main content */}
          <div className="p-8">
            <div className="max-w-4xl">

              {/* CSV Upload */}
              <div className="card mb-6">
                <h2 className="section-title mb-3">📤 Bulk Upload Assessment Data</h2>
                <p className="text-xs text-text-secondary mb-4">
                  Upload a <code className="bg-surface-hover px-1 rounded" style={{ color: 'var(--brand-500)' }}>.csv</code>{' '}
                  or <code className="bg-surface-hover px-1 rounded" style={{ color: 'var(--brand-500)' }}>.xlsx</code> file
                  with columns: roll_number, subject, semester, attendance_pct, internal_marks, assignment_submission_rate
                </p>
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); setCsvFile(e.dataTransfer.files[0]); setUploadResult(null) }}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
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
                      <p className="text-sm text-text-secondary">
                        Drag &amp; drop your CSV here, or <span className="underline" style={{ color: 'var(--brand-500)' }}>browse</span>
                      </p>
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
                {uploadResult && (
                  <div className="mt-4 p-4 rounded-xl border border-surface-border bg-surface-hover">
                    <p className="text-sm font-semibold text-text-primary mb-3">{uploadResult.message}</p>
                    <div className="flex gap-3 flex-wrap">
                      <span className="text-xs px-2 py-1 rounded-full bg-teal-500/20 text-teal-500">✅ {uploadResult.saved} Saved</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-500">⚠️ {uploadResult.failed} Failed</span>
                      <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--brand-500)' }}>🤖 {uploadResult.risk_prediction}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Search */}
              <div className="mb-4">
                <input
                  className="input max-w-sm"
                  placeholder="🔍 Search by name, roll no. or dept..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* Heatmap & Attendance Header */}
              <div className="flex items-center justify-between mb-4 mt-8">
                <h2 className="section-title mb-0">Student Risk Heatmap</h2>
                <button
                  onClick={openAttendanceModal}
                  className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-2"
                  style={{ background: 'var(--surface-card)', borderColor: 'var(--brand-500)', color: 'var(--brand-600)' }}
                >
                  📅 Mark Daily Attendance
                </button>
              </div>

              {/* Heatmap */}
              <div className="card">
                {loading ? (
                  <LoadingSpinner />
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {filtered.map(s => (
                      <button
                        key={s.student_id}
                        onClick={() => openStudent(s)}
                        className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-150 ${
                          selected?.student_id === s.student_id
                            ? 'border-brand-500/40'
                            : 'border-surface-border hover:border-brand-500/30'
                        }`}
                        style={{ background: selected?.student_id === s.student_id ? 'color-mix(in srgb, var(--brand-500) 5%, var(--surface-card))' : 'var(--surface-card)' }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                            style={{
                              background: RISK_COLORS[s.risk_level] + '22',
                              color: RISK_COLORS[s.risk_level],
                              border: `1.5px solid ${RISK_COLORS[s.risk_level]}55`,
                            }}
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
                            <p className="text-2xl font-bold tabular-nums" style={{ color: RISK_COLORS[s.risk_level] }}>
                              {s.risk_score?.toFixed(0) ?? '—'}
                            </p>
                            <p className="text-xs text-text-secondary">/ 100</p>
                          </div>
                        </div>
                      </button>
                    ))}
                    {filtered.length === 0 && (
                      <p className="text-center text-text-secondary py-10">No students match your search.</p>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* ── Right sticky detail panel ── */}
        {selected && (
          <div
            className="w-96 border-l border-surface-border flex flex-col animate-fade-in"
            style={{
              position: 'sticky',
              top: 0,
              height: '100vh',
              background: 'var(--surface-card)',
              borderLeftColor: 'var(--surface-border)',
            }}
          >
            {/* Panel header */}
            <div
              className="px-5 py-4 border-b border-surface-border flex items-center justify-between shrink-0"
              style={{ background: `linear-gradient(135deg, ${RISK_COLORS[selected.risk_level]}15, transparent)` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ background: RISK_COLORS[selected.risk_level] + '25', color: RISK_COLORS[selected.risk_level] }}
                >
                  {(selected.student_name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary leading-tight">{selected.student_name || 'Student'}</p>
                  <p className="text-xs text-text-secondary">{selected.roll_number} · Sem {selected.semester}</p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all text-xs"
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* 1. Risk Score */}
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
                    <p className="text-xs text-text-secondary font-semibold mb-2 uppercase tracking-wide">🔍 Key Factors</p>
                    {selected.top_factors.split('\n').filter(Boolean).map((f, i) => (
                      <p key={i} className="text-xs text-text-primary py-1.5 border-b border-surface-border/50 last:border-0">{f}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Parent */}
              <div className="card" style={{ borderColor: 'rgba(147,51,234,0.2)', background: 'rgba(147,51,234,0.04)' }}>
                <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#9333ea' }}>👨‍👩‍👧 Parent / Guardian</h4>
                {selected.parent_contact ? (
                  <div>
                    <p className="text-sm font-bold text-text-primary">{selected.parent_contact.name}</p>
                    <p className="text-xs text-text-secondary mt-1">📞 {selected.parent_contact.phone || 'No phone'}</p>
                    <p className="text-xs text-text-secondary">✉️ {selected.parent_contact.email}</p>
                    <button
                      onClick={handleNotifyParent}
                      className="w-full mt-3 py-2 px-3 rounded-lg text-sm font-semibold transition-colors"
                      style={{ color: '#dc2626', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)' }}
                    >
                      🚨 Notify Parent of Risk/Failure
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary italic">No parent linked to this student.</p>
                )}
              </div>

              {/* 3. Log Intervention */}
              <div className="card">
                <p className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wide">Log Intervention</p>
                <div className="space-y-3">
                  <select className="input text-sm" value={actionType} onChange={e => setActionType(e.target.value)}>
                    {Object.entries(ACTION_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <textarea
                    className="input text-sm resize-none"
                    rows={3}
                    placeholder="Add notes (optional)..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                  <button
                    id="log-intervention-btn"
                    onClick={logIntervention}
                    disabled={logLoading}
                    className="btn-primary w-full text-sm"
                  >
                    {logLoading ? 'Saving...' : '✓ Log Action'}
                  </button>
                </div>
              </div>

              {/* Intervention history */}
              {interventions.length > 0 && (
                <div className="card">
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
              <div className="card" style={{ background: 'var(--surface-hover)' }}>
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-2xl border-2 shrink-0"
                    style={{
                      background: 'rgba(99,102,241,0.15)',
                      color: 'var(--brand-500)',
                      borderColor: 'rgba(99,102,241,0.3)',
                    }}
                  >
                    {(selected.student_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-text-primary">{selected.student_name || 'Student'}</h3>
                    <p className="text-xs font-mono text-text-secondary">{selected.roll_number}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{selected.department} · Semester {selected.semester}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── Attendance Modal ── */}
        {showAttendanceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface-card rounded-2xl w-[600px] max-w-[90vw] max-h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-surface-border">
              {/* Header */}
              <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface-hover/50">
                <h2 className="text-lg font-bold text-text-primary">📋 Mark Daily Attendance</h2>
                <button onClick={() => setShowAttendanceModal(false)} className="text-text-secondary hover:text-text-primary">✕</button>
              </div>
              
              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="label">Date</label>
                    <input type="date" className="input text-sm py-2" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Subject / Session</label>
                    <input type="text" className="input text-sm py-2" value={attendanceSubject} onChange={e => setAttendanceSubject(e.target.value)} placeholder="e.g., General, CS101" />
                  </div>
                </div>

                <div className="border border-surface-border rounded-xl overflow-hidden">
                  <div className="bg-surface-hover/80 px-4 py-2 border-b border-surface-border flex justify-between items-center text-xs font-bold text-text-secondary">
                    <span>Student ({heatmap.length})</span>
                    <div className="flex gap-4">
                      <button onClick={() => {
                        const m = {}; heatmap.forEach(s => m[s.student_id] = true); setAttendanceMap(m);
                      }} className="text-brand-500 hover:underline">Mark All</button>
                      <button onClick={() => {
                        const m = {}; heatmap.forEach(s => m[s.student_id] = false); setAttendanceMap(m);
                      }} className="text-red-500 hover:underline">Clear All</button>
                    </div>
                  </div>
                  <div className="divide-y divide-surface-border">
                    {heatmap.map(s => (
                      <div key={s.student_id} className="px-4 py-3 flex items-center justify-between hover:bg-surface-hover/30 transition-colors">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{s.student_name || s.name}</p>
                          <p className="text-xs text-text-secondary font-mono">{s.roll_number}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={attendanceMap[s.student_id] ?? false} onChange={e => setAttendanceMap(prev => ({...prev, [s.student_id]: e.target.checked}))} />
                          <div className="w-11 h-6 bg-red-500 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-surface-border bg-surface-hover/50 flex justify-end gap-3">
                <button onClick={() => setShowAttendanceModal(false)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={submitAttendance} disabled={attendanceLoading} className="btn-primary text-sm min-w-32">
                  {attendanceLoading ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
