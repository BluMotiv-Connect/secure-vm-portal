import React, { createContext, useContext, useState, useEffect } from 'react'
import { useMsal } from '@azure/msal-react'
import { loginRequest } from '../config/authConfig'
import { apiClient } from '../services/apiClient'
import { isTokenValid, clearAuthStorage, getStoredAuth } from '../utils/tokenUtils'
import tokenRefreshScheduler from '../utils/tokenRefreshScheduler'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const { instance, accounts, inProgress } = useMsal()
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Wait for MSAL to finish any startup processes
    if (inProgress === "startup") {
      console.log('[Auth] MSAL is starting up, waiting...')
      return
    }
    
    console.log('[Auth] MSAL startup complete, initializing auth')
    initializeAuth()
  }, [accounts, inProgress])

  const initializeAuth = async () => {
    try {
      console.log('[Auth] Checking for existing authentication...')
      
      // Check localStorage first
      const { token: storedToken, user: storedUser } = getStoredAuth()

      if (storedUser && storedToken) {
        console.log('[Auth] Found stored credentials')
        
        // Validate token before using it
        if (isTokenValid(storedToken)) {
          // Token is still valid
          console.log('[Auth] Stored token is valid')
          setUser(storedUser)
          setIsAuthenticated(true)
          setIsLoading(false)
          
          // Start proactive token refresh scheduler
          tokenRefreshScheduler.start()
          return
        } else {
          console.log('[Auth] Stored token is expired, clearing storage')
          clearAuthStorage()
        }
      }

      // Check MSAL accounts
      if (accounts.length > 0) {
        console.log('[Auth] Found MSAL account, attempting silent token acquisition')
        const account = accounts[0]
        
        try {
          const response = await instance.acquireTokenSilent({
            ...loginRequest,
            account: account
          })
          
          console.log('[Auth] Silent token acquisition successful')
          await handleSuccessfulAuth(response.accessToken)
        } catch (error) {
          console.error('[Auth] Silent token acquisition failed:', error)
          // Don't throw error, just set loading to false
          setIsLoading(false)
        }
      } else {
        console.log('[Auth] No accounts found')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('[Auth] Auth initialization error:', error)
      setIsLoading(false)
    }
  }

  const handleSuccessfulAuth = async (accessToken) => {
    try {
      console.log('[Auth] Calling backend with access token...')
    
      const response = await apiClient.post('/auth/login', {
        accessToken
      })

      console.log('[Auth] Backend response received:', response.data)

      const { token, user: userData } = response.data

      if (!token) {
        throw new Error('No token received from backend')
      }

      const finalUserData = {
        ...userData,
        email: userData.email || userData.mail || userData.userPrincipalName
      }

      console.log('[Auth] Storing token and user data...')
    
      // Store token and user data
      localStorage.setItem('authToken', token)
      localStorage.setItem('user', JSON.stringify(finalUserData))
    
    // Verify storage
      const storedToken = localStorage.getItem('authToken')
      const storedUser = localStorage.getItem('user')
    
      console.log('[Auth] ✅ Token stored successfully:', !!storedToken)
      console.log('[Auth] ✅ User stored successfully:', !!storedUser)
      console.log('[Auth] Token preview:', storedToken?.substring(0, 20) + '...')

      setUser(finalUserData)
      setIsAuthenticated(true)
      setIsLoading(false)

      // Start proactive token refresh scheduler
      tokenRefreshScheduler.start()

      return finalUserData
    } catch (error) {
      console.error('[Auth] Backend authentication failed:', error)
      throw error
    }
  }


  const login = async () => {
    try {
      setIsLoading(true)
      console.log('[Auth] Starting login process...')
      
      const response = await instance.loginPopup(loginRequest)
      console.log('[Auth] Login popup successful')
      
      const userData = await handleSuccessfulAuth(response.accessToken)
      return userData
    } catch (error) {
      console.error('[Auth] Login failed:', error)
      setIsLoading(false)
      throw error
    }
  }

  const logout = async () => {
    try {
      console.log('[Auth] Logging out...')
      clearAuthStorage()
      setUser(null)
      setIsAuthenticated(false)
      
      await instance.logoutPopup()
    } catch (error) {
      console.error('[Auth] Logout error:', error)
    }
  }

  const clearAuth = () => {
    console.log('[Auth] Clearing authentication state')
    clearAuthStorage()
    setUser(null)
    setIsAuthenticated(false)
    
    // Stop token refresh scheduler
    tokenRefreshScheduler.stop()
  }

  const refreshAuthState = async () => {
    console.log('[Auth] Refreshing authentication state')
    try {
      const { token: storedToken, user: storedUser } = getStoredAuth()
      
      if (storedUser && storedToken && isTokenValid(storedToken)) {
        setUser(storedUser)
        setIsAuthenticated(true)
        
        // Start token refresh scheduler if not already running
        tokenRefreshScheduler.start()
        return true
      } else {
        setUser(null)
        setIsAuthenticated(false)
        if (storedToken && !isTokenValid(storedToken)) {
          console.log('[Auth] Token expired during refresh, clearing storage')
          clearAuthStorage()
        }
        
        // Stop token refresh scheduler
        tokenRefreshScheduler.stop()
        return false
      }
    } catch (error) {
      console.error('[Auth] Error refreshing auth state:', error)
      clearAuth()
      return false
    }
  }

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    clearAuth,
    refreshAuthState
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
