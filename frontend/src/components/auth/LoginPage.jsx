import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { Shield, Users, ArrowLeft } from 'lucide-react'
import ConsentAgreementModal from '../consent/ConsentAgreementModal'
import { consentService } from '../../services/consentService'

const LoginPage = () => {
  const { login } = useAuth()
  const { inProgress } = useMsal()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  
  // Consent-related state
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [hasConsented, setHasConsented] = useState(false)
  const [agreementContent, setAgreementContent] = useState(null)
  const [consentLoading, setConsentLoading] = useState(false)
  const [consentError, setConsentError] = useState('')

  useEffect(() => {
    const role = localStorage.getItem('selectedRole')
    if (!role) {
      navigate('/')
      return
    }
    setSelectedRole(role)
    
    // Load agreement content when component mounts
    loadAgreementContent()
  }, [navigate])

  // Load agreement content
  const loadAgreementContent = async () => {
    try {
      setConsentLoading(true)
      const result = await consentService.getAgreement()
      
      if (result.success) {
        setAgreementContent(result.data)
      } else {
        setConsentError(result.error)
      }
    } catch (error) {
      console.error('Failed to load agreement content:', error)
      setConsentError('Failed to load consent agreement')
    } finally {
      setConsentLoading(false)
    }
  }

  // Handle consent modal actions
  const handleConsentChange = (consented) => {
    setHasConsented(consented)
  }

  const handleConsentModalClose = () => {
    setShowConsentModal(false)
    setHasConsented(false)
  }

  // Show consent modal before login
  const handleShowConsent = () => {
    if (!agreementContent) {
      setError('Unable to load consent agreement. Please refresh the page.')
      return
    }
    setShowConsentModal(true)
  }

  const handleLogin = async () => {
    try {
      setIsLoading(true)
      setError('')
    
      console.log('[LoginPage] Starting login for role:', selectedRole)
    
      // Add timeout and proper error handling for async operations
      // Increased timeout to 70 seconds to accommodate Render wake-up time (up to 50 seconds)
      const loginPromise = login()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login timeout after 70 seconds - backend may be sleeping')), 70000)
      )
      
      const user = await Promise.race([loginPromise, timeoutPromise])
    
      console.log('[LoginPage] Login successful, user:', user)
    
    // Role validation logic - use database role, not hardcoded emails
      if (selectedRole === 'admin') {
        // Check if user has admin role in database
        if (user.role !== 'admin') {
          setError('Access denied. You do not have admin privileges. Please contact administrator.')
          localStorage.removeItem('selectedRole')
          return
        }
        console.log('[LoginPage] Admin access granted for:', user.email)
      } else if (selectedRole === 'employee') {
        // Any active user can access user portal, but admins can also access it
        if (user.role !== 'employee' && user.role !== 'admin') {
          setError('Access denied. Please contact administrator to add your account to the system.')
          localStorage.removeItem('selectedRole')
          return
        }
        console.log('[LoginPage] User access granted for:', user.email, 'with role:', user.role)
      }
    
      // Record consent after successful authentication
      if (hasConsented && agreementContent) {
        try {
          console.log('[LoginPage] Recording user consent')
          const consentResult = await consentService.recordConsent(
            agreementContent.version || '1.0.0',
            'en'
          )
          
          if (consentResult.success) {
            console.log('[LoginPage] Consent recorded successfully')
          } else {
            console.warn('[LoginPage] Failed to record consent:', consentResult.error)
            // Don't block login for consent recording failure, but log it
          }
        } catch (consentError) {
          console.error('[LoginPage] Consent recording error:', consentError)
          // Continue with login even if consent recording fails
        }
      }

      // Clear selected role from storage
      localStorage.removeItem('selectedRole')
    
      // Navigate based on selected role (not user's database role)
      if (selectedRole === 'admin') {
        navigate('/admin')
      } else {
       navigate('/employee')
      }
    
    } catch (error) {
      console.error('[LoginPage] Login error:', error)
    
      if (error.message.includes('Access denied')) {
        setError(error.message)
      } else {
        setError(`Login failed: ${error.message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }


  const handleBackToRoleSelection = () => {
    localStorage.removeItem('selectedRole')
    navigate('/')
  }

  const getRoleInfo = () => {
    if (selectedRole === 'admin') {
      return {
        icon: Shield,
        title: 'Admin Login',
        description: 'Sign in to manage users and VMs',
        color: 'blue'
      }
    } else {
      return {
        icon: Users,
        title: 'User Login',
        description: 'Sign in to access your assigned VMs',
        color: 'green'
      }
    }
  }

  const roleInfo = getRoleInfo()
  const Icon = roleInfo.icon

  // Show loading if MSAL is still initializing
  if (inProgress === "startup") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing authentication system...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-lg w-full space-y-6 p-8">
        {/* Back Button */}
        <button
          onClick={handleBackToRoleSelection}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to role selection
        </button>

        <div className="text-center">
          <div className={`mx-auto w-16 h-16 bg-${roleInfo.color}-100 rounded-full flex items-center justify-center mb-4`}>
            <Icon className={`w-8 h-8 text-${roleInfo.color}-600`} />
          </div>
          
          <h2 className="text-3xl font-extrabold text-gray-900">
            {roleInfo.title}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {roleInfo.description}
          </p>
          
          {selectedRole === 'admin' && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Admin access is granted based on your assigned role in the system
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Consent Agreement Section */}
        {!hasConsented && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                User Consent Agreement Required
              </h3>
              <p className="text-sm text-gray-600">
                Please review and accept the terms before proceeding
              </p>
            </div>

            {consentLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading agreement...</p>
              </div>
            ) : consentError ? (
              <div className="text-center py-4">
                <p className="text-sm text-red-600 mb-2">{consentError}</p>
                <button
                  onClick={loadAgreementContent}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Retry
                </button>
              </div>
            ) : agreementContent ? (
              <div>
                {/* Agreement Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    {agreementContent.content?.title || 'User Consent Agreement for Portal Access'}
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    This agreement outlines the terms of access and use of the portal, including responsibilities 
                    related to confidentiality, resource usage, data protection, and project conduct.
                  </p>
                  <div className="text-xs text-gray-500">
                    Version: {agreementContent.version || '1.0.0'} • 
                    Effective: {agreementContent.effectiveDate ? 
                      new Date(agreementContent.effectiveDate).toLocaleDateString() : 
                      'Today'
                    }
                  </div>
                </div>

                {/* Key Points */}
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Key Points:</h5>
                  <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                    <li>Compliance with GDPR and India's Digital Personal Data Protection Act (DPDP Act, 2023)</li>
                    <li>Confidentiality of login credentials and responsible resource usage</li>
                    <li>Proper use of learning resources and project reporting requirements</li>
                    <li>Data protection, security policies, and monitoring compliance</li>
                    <li>Intellectual property ownership and repository usage guidelines</li>
                  </ul>
                </div>

                {/* Full Agreement Link */}
                <div className="mb-4">
                  <button
                    onClick={handleShowConsent}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Read Full Agreement ({agreementContent.content?.sections?.length || 13} sections)
                  </button>
                </div>

                {/* Consent Checkbox */}
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="inline-consent-checkbox"
                    checked={hasConsented}
                    onChange={(e) => handleConsentChange(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label 
                    htmlFor="inline-consent-checkbox" 
                    className="text-sm text-gray-700 leading-relaxed cursor-pointer"
                  >
                    {agreementContent.content?.acknowledgment?.checkbox_text || 
                     'I agree to the terms and conditions of the User Consent Agreement.'}
                  </label>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <div>
          <button
            onClick={handleLogin}
            disabled={isLoading || inProgress !== "none" || !hasConsented}
            className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
              hasConsented 
                ? `bg-${roleInfo.color}-600 hover:bg-${roleInfo.color}-700` 
                : 'bg-gray-400 cursor-not-allowed'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${roleInfo.color}-500 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Signing in...
              </div>
            ) : (
              'Sign in with Microsoft'
            )}
          </button>
          
          {!hasConsented && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Please accept the agreement above to continue
            </p>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Secure authentication powered by Microsoft 365
          </p>
        </div>
      </div>

      {/* Consent Agreement Modal */}
      <ConsentAgreementModal
        isOpen={showConsentModal}
        onConsentChange={handleConsentChange}
        onClose={handleConsentModalClose}
        agreementContent={agreementContent?.content}
        isLoading={consentLoading}
        error={consentError}
      />
    </div>
  )
}

export default LoginPage
