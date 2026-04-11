import { useEffect, useState } from 'react'
import api from '../api/client'
import Sidebar from '../components/Sidebar'
import RiskBadge from '../components/RiskBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'

const RISK_COLORS = { low: '#2dd4bf', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' }

export default function ParentDashboard() {
  const { theme } = useTheme()
  const isLight = theme !== 'dark'
  const hoverBg = isLight ? '#edf1f7' : '#1c2128'
  const rowHoverBg = isLight ? '#f1f5f9' : '#1c212880' // slightly transparent for rows

  const [children, setChildren] = useState([])
  const [selectedChild, setSelectedChild] = useState(null)
  
  const [attendance, setAttendance] = useState([])
  const [assessments, setAssessments] = useState([])
  const [semResults, setSemResults] = useState([])
  const [riskData, setRiskData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [childLoading, setChildLoading] = useState(false)

  useEffect(() => {
    fetchMyChildren()
  }, [])

  const fetchMyChildren = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/parents/my-students')
      setChildren(res.data)
      if (res.data.length > 0) {
        selectChild(res.data[0])
      }
    } catch {
      toast.error('Failed to load children')
    } finally {
      setLoading(false)
    }
  }

  const selectChild = async (child) => {
    setSelectedChild(child)
    setChildLoading(true)
    try {
      const [attRes, asmRes, semRes, riskRes] = await Promise.all([
        api.get(`/api/parents/students/${child.student_id}/attendance`),
        api.get(`/api/parents/students/${child.student_id}/assessments`),
        api.get(`/api/parents/students/${child.student_id}/semester-results`),
        api.get(`/api/parents/students/${child.student_id}/risk`),
      ])
      setAttendance(attRes.data)
      setAssessments(asmRes.data)
      setSemResults(semRes.data)
      setRiskData(riskRes.data)
    } catch {
      toast.error('Failed to load student details')
    } finally {
      setChildLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto animate-fade-in">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-text-primary">Parent Portal</h1>
            <p className="text-text-secondary text-sm mt-1">Monitor your children's academic wellness</p>
          </div>

          {loading ? <LoadingSpinner /> : children.length === 0 ? (
             <div className="card text-center p-10">
               <p className="text-xl">👨‍👩‍👧</p>
               <p className="text-text-secondary mt-2">No students linked to your account yet.</p>
               <p className="text-xs text-text-secondary mt-1">Contact the administration to link your child.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Left Column: Children list */}
              <div className="lg:col-span-1 space-y-4">
                <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">My Children</h2>
                {children.map(c => (
                  <button
                    key={c.student_id}
                    onClick={() => selectChild(c)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-150 
                      ${selectedChild?.student_id === c.student_id
                        ? 'border-purple-500 bg-purple-600/10'
                        : 'border-surface-border bg-surface-card hover:border-purple-500/50'}`}
                  >
                    <p className="font-bold text-text-primary">{c.name}</p>
                    <p className="text-xs text-text-secondary">{c.department}</p>
                    <p className="text-xs text-text-secondary mb-2">Sem {c.semester} · {c.roll_number}</p>
                    <RiskBadge level={c.risk_level ?? 'low'} />
                  </button>
                ))}
              </div>

              {/* Right Column: Detailed views */}
              <div className="lg:col-span-3 space-y-6">
                {childLoading ? <LoadingSpinner /> : selectedChild && (
                  <>
                    {/* Risk Overview */}
                    <div className="card" style={{ borderTop: `4px solid ${RISK_COLORS[selectedChild?.risk_level ?? 'low']}` }}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-xl font-bold text-text-primary">{selectedChild.name}</h2>
                          <p className="text-sm text-text-secondary">Current Risk Status</p>
                        </div>
                        <RiskBadge level={selectedChild.risk_level ?? 'low'} />
                      </div>
                      
                      {riskData?.advice && (
                        <div className="mt-4 p-3 rounded-lg border border-surface-border" style={{ backgroundColor: hoverBg }}>
                          <p className="text-sm text-text-primary">💡 <strong>Mentor's Advice:</strong> {riskData.advice}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Daily Attendance */}
                      <div className="card">
                        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">📅 Daily Attendance</h3>
                        {attendance.length === 0 ? (
                          <p className="text-xs text-text-muted italic">No recent attendance records.</p>
                        ) : (
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {attendance.map(a => (
                              <div key={a.id} className="flex items-center justify-between p-2 rounded text-sm border border-surface-border" style={{ backgroundColor: hoverBg }}>
                                <div>
                                  <span className="font-medium text-text-primary">{new Date(a.date).toLocaleDateString()}</span>
                                  <span className="text-xs text-text-secondary ml-2">{a.subject}</span>
                                </div>
                                <span className={a.is_present ? 'text-brand-600 dark:text-teal-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold'}>
                                  {a.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Internal Exams */}
                      <div className="card">
                        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">📝 Internal Exams</h3>
                        {assessments.length === 0 ? (
                          <p className="text-xs text-text-muted italic">No recent exam records.</p>
                        ) : (
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {assessments.map(a => (
                              <div key={a.id} className="flex items-center justify-between p-2.5 rounded text-sm border border-surface-border" style={{ backgroundColor: hoverBg }}>
                                <div>
                                  <p className="font-medium text-text-primary">{a.subject} <span className="text-xs text-text-secondary ml-1">Sem {a.semester}</span></p>
                                  <p className="text-xs text-text-secondary">Submissions: {a.assignment_submission_rate}% | Attendance: {a.attendance_pct}%</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-text-primary">{a.internal_marks?.toFixed(1)} / 100</p>
                                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">{a.grade}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Semester Results */}
                    <div className="card">
                      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">🎓 Semester Results</h3>
                      {semResults.length === 0 ? (
                        <p className="text-xs text-text-muted italic">No semester results available yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase text-text-secondary" style={{ backgroundColor: hoverBg }}>
                              <tr>
                                <th className="px-4 py-2 rounded-l-lg">Semester</th>
                                <th className="px-4 py-2">Year</th>
                                <th className="px-4 py-2">GPA</th>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2">Arrears</th>
                                <th className="px-4 py-2 rounded-r-lg">Remarks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {semResults.map(r => (
                                <tr key={r.id} className="border-b border-surface-border last:border-0 transition-colors"
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = rowHoverBg}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <td className="px-4 py-3 font-medium text-text-primary">Semester {r.semester}</td>
                                  <td className="px-4 py-3 text-text-secondary">{r.academic_year}</td>
                                  <td className="px-4 py-3 font-semibold text-brand-600 dark:text-brand-400">{r.gpa?.toFixed(2) ?? '-'}</td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${r.passed ? 'bg-teal-500/20 text-brand-600 dark:text-teal-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}`}>
                                      {r.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-text-secondary">{r.arrears > 0 ? r.arrears : '-'}</td>
                                  <td className="px-4 py-3 text-text-secondary text-xs">{r.remarks || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                    
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
