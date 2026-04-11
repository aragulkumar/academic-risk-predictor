import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import MentorDashboard from './pages/MentorDashboard'
import StudentDashboard from './pages/StudentDashboard'
import ParentDashboard from './pages/ParentDashboard'
import LoadingSpinner from './components/LoadingSpinner'

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner fullscreen />
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner fullscreen />

  const roleHome = user
    ? user.role === 'admin' ? '/admin'
    : user.role === 'mentor' ? '/mentor'
    : user.role === 'parent' ? '/parent'
    : '/student'
    : '/login'

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={roleHome} /> : <LoginPage />} />

      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      <Route path="/mentor" element={
        <ProtectedRoute roles={['mentor', 'admin']}>
          <MentorDashboard />
        </ProtectedRoute>
      } />

      <Route path="/student" element={
        <ProtectedRoute roles={['student']}>
          <StudentDashboard />
        </ProtectedRoute>
      } />

      <Route path="/parent" element={
        <ProtectedRoute roles={['parent']}>
          <ParentDashboard />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to={roleHome} replace />} />
    </Routes>
  )
}
