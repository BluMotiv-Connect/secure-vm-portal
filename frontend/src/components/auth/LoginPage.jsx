import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { Shield, Users, ArrowLeft } from 'lucide-react'

const LoginPage = () => {
  const { login } = useAuth()
  const { inProgress } = useMsal()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedRole, setSelectedRole] = useState('')

  useEffect(() => {
    const role = localStorage.getItem('selectedRole')
    if (!role) {
      navigate('/')
      return
    }
    setSelectedRole(role)
  }, [navigate])

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
        // Any active user can access employee portal, but admins can also access it
        if (user.role !== 'employee' && user.role !== 'admin') {
          setError('Access denied. Please contact administrator to add your account to the system.')
          localStorage.removeItem('selectedRole')
          return
        }
        console.log('[LoginPage] Employee access granted for:', user.email, 'with role:', user.role)
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
        title: 'Employee Login',
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
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

        <div>
          <button
            onClick={handleLogin}
            disabled={isLoading || inProgress !== "none"}
            className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-${roleInfo.color}-600 hover:bg-${roleInfo.color}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${roleInfo.color}-500 disabled:opacity-50 disabled:cursor-not-allowed`}
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
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Secure authentication powered by Microsoft 365
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
