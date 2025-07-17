import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { MsalProvider } from '@azure/msal-react'
import { PublicClientApplication } from '@azure/msal-browser'
import { QueryClient, QueryClientProvider } from 'react-query'
import { msalConfig } from './config/authConfig'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { NotificationProvider } from './contexts/NotificationContext'
import axios from 'axios'

// Pages
import RoleSelection from './pages/RoleSelection'
import LoginPage from './components/auth/LoginPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import Users from './pages/admin/Users'
import VirtualMachines from './pages/admin/VirtualMachines'
import Projects from './pages/admin/Projects'
import Reports from './pages/admin/Reports'
import EmployeeDashboard from './pages/employee/EmployeeDashboard'

// Components
import AuthGuard from './components/auth/AuthGuard'

// Create and initialize MSAL instance OUTSIDE component tree
const msalInstance = new PublicClientApplication(msalConfig)

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function App() {
  // Wake up backend on app start
  useEffect(() => {
    const wakeUpBackend = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
        console.log('Waking up backend on app start...')
        await axios.get(`${API_BASE_URL}/health`, { timeout: 30000 })
        console.log('Backend is ready!')
      } catch (error) {
        console.warn('Backend wake-up failed on app start:', error.message)
      }
    }
    
    wakeUpBackend()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <MsalProvider instance={msalInstance}>
        <AuthProvider>
          <ThemeProvider>
            <NotificationProvider>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<RoleSelection />} />
                <Route path="/login" element={<LoginPage />} />
                
                {/* Protected Admin routes */}
                <Route path="/admin" element={
                  <AuthGuard requiredRole="admin">
                    <AdminDashboard />
                  </AuthGuard>
                } />
                
                <Route path="/admin/users" element={
                  <AuthGuard requiredRole="admin">
                    <Users />
                  </AuthGuard>
                } />
                
                <Route path="/admin/virtual-machines" element={
                  <AuthGuard requiredRole="admin">
                    <VirtualMachines />
                  </AuthGuard>
                } />
                
                <Route path="/admin/projects" element={
                  <AuthGuard requiredRole="admin">
                    <Projects />
                  </AuthGuard>
                } />
                
                <Route path="/admin/reports" element={
                  <AuthGuard requiredRole="admin">
                    <Reports />
                  </AuthGuard>
                } />
                
                {/* Protected Employee routes */}
                <Route path="/employee" element={
                  <AuthGuard requiredRole="employee">
                    <EmployeeDashboard />
                  </AuthGuard>
                } />
                
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </NotificationProvider>
          </ThemeProvider>
        </AuthProvider>
      </MsalProvider>
    </QueryClientProvider>
  )
}

export default App
