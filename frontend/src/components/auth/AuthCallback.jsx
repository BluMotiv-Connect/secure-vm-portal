import React, { useEffect } from 'react'
import { useMsal } from '@azure/msal-react'
import { useNavigate } from 'react-router-dom'

const AuthCallback = () => {
  const { instance } = useMsal()
  const navigate = useNavigate()

  useEffect(() => {
    instance.handleRedirectPromise()
      .then((response) => {
        if (response) {
          console.log('Login successful:', response)
          navigate('/')
        } else {
          // Silent sign-in failed, redirect to login
          navigate('/login')
        }
      })
      .catch((error) => {
        console.error('Auth callback error:', error)
        navigate('/login?error=auth_failed')
      })
  }, [instance, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Processing authentication...</p>
      </div>
    </div>
  )
}

export default AuthCallback
