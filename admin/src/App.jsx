import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'

import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import DrawsPage from './pages/DrawsPage'
import CharitiesPage from './pages/CharitiesPage'
import WinnersPage from './pages/WinnersPage'
import ReportsPage from './pages/ReportsPage'

function AdminLayout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 'var(--sidebar-w)', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        {children}
      </main>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!admin) return <Navigate to="/login" replace />
  return <AdminLayout>{children}</AdminLayout>
}

function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ width: 36, height: 36, border: '2px solid rgba(168,85,247,0.2)', borderTop: '2px solid #A855F7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )
}

function AppRoutes() {
  const { admin } = useAuth()
  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#131118', color: '#FAF5FF', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'DM Sans, sans-serif', fontSize: '14px' },
        success: { iconTheme: { primary: '#4ADE80', secondary: '#09080C' } },
        error: { iconTheme: { primary: '#F87171', secondary: '#09080C' } }
      }} />
      <Routes>
        <Route path="/login" element={admin ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
        <Route path="/draws" element={<ProtectedRoute><DrawsPage /></ProtectedRoute>} />
        <Route path="/charities" element={<ProtectedRoute><CharitiesPage /></ProtectedRoute>} />
        <Route path="/winners" element={<ProtectedRoute><WinnersPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
