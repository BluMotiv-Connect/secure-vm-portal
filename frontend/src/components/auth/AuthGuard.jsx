import React from 'react'
import { useAuth } from '../../contexts/AuthContext' // Fixed path: ../../ instead of ../
import { useConsent } from '../../contexts/ConsentContext'
import { Navigate } from 'react-router-dom'

const AuthGuard = ({ children, requiredRole = null }) => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const { consentStatus, isLoading: consentLoading, isInitialized: consentInitialized } = useConsent()

  // Show loading spinner while authentication or consent is being determined
  if (isLoading || consentLoading || !consentInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isLoading ? 'Loading...' : 'Checking consent status...'}
          </p>
        </div>
      </div>
    )
  }

  // Only redirect to login if we're sure the user is not authenticated
  if (!isAuthenticated) {
    console.log('[AuthGuard] User not authenticated, redirecting to login')
    return <Navigate to="/login" replace />
  }

  // Check consent status - redirect to login if consent is required but not provided
  // Skip consent check for admin users to avoid blocking admin access
  const isConsentRequired = process.env.REACT_APP_CONSENT_REQUIRED === 'true'
  if (isConsentRequired && user?.role !== 'admin' && !consentStatus.hasValidConsent) {
    console.log('[AuthGuard] Consent required but not provided, redirecting to login')
    return <Navigate to="/login" replace />
  }

  // Role validation logic - Allow admin to access both portals
  if (requiredRole) {
    const hasAccess = checkRoleAccess(user, requiredRole)
    
    if (!hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
            <p className="text-sm text-gray-500">
              Your role: <span className="font-medium">{user?.role}</span><br/>
              Required role: <span className="font-medium">{requiredRole}</span>
            </p>
            <button
              onClick={() => window.history.back()}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      )
    }
  }

  return children
}

// Helper function to check role access
const checkRoleAccess = (user, requiredRole) => {
  if (!user || !user.role) {
    return false
  }

  // Admin can access both admin and user portals
  if (user.role === 'admin') {
    return true // Admin has access to everything
  }

  // Regular users can only access user portal
  if (user.role === 'employee' && requiredRole === 'employee') {
    return true
  }

  // Specific role match
  if (user.role === requiredRole) {
    return true
  }

  return false
}

export default AuthGuard
