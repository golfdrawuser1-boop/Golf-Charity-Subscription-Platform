import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'

import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ScoresPage from './pages/ScoresPage'
import DrawsPage from './pages/DrawsPage'
import CharitiesPage from './pages/CharitiesPage'
import SubscribePage from './pages/SubscribePage'
import WinnersPage from './pages/WinnersPage'
import ProfilePage from './pages/ProfilePage'
import SuccessPage from './pages/SuccessPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function PageLoader() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', background: '#080C0A',
    }}>
      <div style={{
        width: 40, height: 40,
        border: '2px solid rgba(74,222,128,0.2)',
        borderTop: '2px solid #4ADE80',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  )
}

function AppRoutes() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#111814', color: '#F0FDF4',
            border: '1px solid rgba(255,255,255,0.07)',
            fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
          },
          success: { iconTheme: { primary: '#4ADE80', secondary: '#080C0A' } },
          error: { iconTheme: { primary: '#F87171', secondary: '#080C0A' } },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/charities" element={<CharitiesPage />} />
        <Route path="/winners" element={<WinnersPage />} />

        {/* Payment success — Razorpay calls handler then navigates here */}
        <Route path="/success" element={<SuccessPage />} />

        {/* Guest only */}
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

        {/* Protected */}
        <Route path="/subscribe" element={<ProtectedRoute><SubscribePage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/scores" element={<ProtectedRoute><ScoresPage /></ProtectedRoute>} />
        <Route path="/draws" element={<ProtectedRoute><DrawsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

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
