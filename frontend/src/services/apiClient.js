import axios from 'axios'
import { isTokenValid, clearAuthStorage } from '../utils/tokenUtils'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const apiClient = axios.create({
  baseURL: API_BASE_URL || 'http://localhost:3001/api',
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Helper to refresh token
let isRefreshing = false
let refreshSubscribers = []
let refreshPromise = null
let lastRefreshAttempt = 0
const REFRESH_COOLDOWN = 30000 // 30 seconds cooldown between refresh attempts

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb)
}

function onRefreshed(token) {
  refreshSubscribers.forEach(cb => cb(token))
  refreshSubscribers = []
}

function clearAuthAndRedirect() {
  console.log('Clearing authentication and redirecting to login...')
  clearAuthStorage()
  
  // Avoid redirect loops by checking current location
  if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
    // Store intended path for after login
    sessionStorage.setItem('intendedPath', window.location.pathname)
    window.location.href = '/login'
  }
}

async function refreshToken() {
  // If already refreshing, return the existing promise
  if (refreshPromise) {
    return refreshPromise
  }

  // Check cooldown period to prevent rapid refresh attempts
  const now = Date.now()
  if (now - lastRefreshAttempt < REFRESH_COOLDOWN) {
    console.log('Token refresh in cooldown period, skipping...')
    throw new Error('Token refresh in cooldown period')
  }
  
  lastRefreshAttempt = now

  refreshPromise = (async () => {
    try {
      console.log('Attempting to refresh MSAL token...')
      
      // Get MSAL instance from window (it's globally available)
      const msalInstance = window.msalInstance
      if (!msalInstance) {
        throw new Error('MSAL instance not available')
      }
      
      // Wait for MSAL to be initialized if needed
      try {
        await msalInstance.initialize()
      } catch (initError) {
        // MSAL might already be initialized, this is okay
        console.log('MSAL already initialized or initialization failed:', initError.message)
      }
      
      // Get current account
      const accounts = msalInstance.getAllAccounts()
      if (accounts.length === 0) {
        console.error('No MSAL accounts found. User needs to log in again.')
        throw new Error('No MSAL accounts found - please log in again')
      }
      
      const account = accounts[0]
      
      // Try to acquire token silently with proper error handling
      let msalResponse
      try {
        msalResponse = await msalInstance.acquireTokenSilent({
          scopes: ['openid', 'profile', 'email'],
          account: account,
          forceRefresh: true // Force refresh to get a new token
        })
      } catch (msalError) {
        console.error('MSAL silent token acquisition failed:', msalError)
        
        // If silent acquisition fails, try interactive login
        if (msalError.name === 'InteractionRequiredAuthError' || 
            msalError.name === 'BrowserAuthError') {
          console.log('Attempting interactive token acquisition...')
          try {
            msalResponse = await msalInstance.acquireTokenPopup({
              scopes: ['openid', 'profile', 'email'],
              account: account
            })
          } catch (interactiveError) {
            console.error('Interactive token acquisition also failed:', interactiveError)
            throw new Error('Both silent and interactive token acquisition failed')
          }
        } else {
          throw msalError
        }
      }
      
      console.log('MSAL token refreshed successfully')
      
      // Call backend to get new JWT token (use axios directly to avoid interceptor loop)
      const backendResponse = await axios.post(`${API_BASE_URL || 'http://localhost:3001/api'}/auth/login`, {
        accessToken: msalResponse.accessToken
      }, {
        timeout: 30000,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (backendResponse.data.token) {
        const newToken = backendResponse.data.token
        const userData = backendResponse.data.user
        
        // Update localStorage with new token and user data
        localStorage.setItem('authToken', newToken)
        if (userData) {
          localStorage.setItem('user', JSON.stringify(userData))
        }
        
        console.log('Backend JWT token refreshed successfully')
        return newToken
      } else {
        throw new Error('No token received from backend')
      }
      
    } catch (error) {
      console.error('Token refresh failed:', error.message)
      console.error('Token refresh error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        msalAvailable: !!window.msalInstance,
        accountsLength: window.msalInstance?.getAllAccounts()?.length || 0
      })
      
      // Clear auth data and redirect
      clearAuthAndRedirect()
      throw error
    } finally {
      // Clear the refresh promise
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// Function to wake up backend
async function wakeUpBackend() {
  try {
    console.log('Waking up backend...')
    await axios.get(`${API_BASE_URL}/health`, { timeout: 30000 })
    console.log('Backend is awake!')
    return true
  } catch (error) {
    console.warn('Backend wake-up failed:', error.message)
    return false
  }
}

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      // Validate token before using it
      if (isTokenValid(token)) {
        config.headers.Authorization = `Bearer ${token}`
      } else {
        console.warn('Token is expired, clearing storage')
        clearAuthStorage()
        // Don't add expired token to request
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle backend sleeping (502/503 errors) or CORS errors - Render free tier
    if (error.response?.status === 502 || error.response?.status === 503 || 
        error.code === 'ERR_NETWORK' || error.message.includes('Network Error') ||
        (error.message.includes('CORS') && error.message.includes('Access-Control-Allow-Origin'))) {
      
      console.warn('Backend might be sleeping or CORS issue detected. Attempting to wake up backend...')
      
      return new Promise(async (resolve, reject) => {
        try {
          // Try to wake up the backend first
          await wakeUpBackend()
          
          // Wait a bit more for backend to fully initialize
          setTimeout(() => {
            resolve(apiClient(originalRequest))
          }, 3000)
        } catch (wakeError) {
          console.error('Failed to wake up backend:', wakeError)
          // Still try the original request after a delay
          setTimeout(() => {
            resolve(apiClient(originalRequest))
          }, 5000)
        }
      })
    }

    // Handle rate limiting (429) with retry after delay
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 5 // Default 5 seconds
      console.warn(`Rate limited. Retrying after ${retryAfter} seconds...`)
      
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(apiClient(originalRequest))
        }, retryAfter * 1000)
      })
    }

    // Handle authentication errors (JWT token expired or forbidden)
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      const errorData = error.response?.data
      
      // Check if it's specifically a token expiration issue
      if (errorData?.error === 'Token expired' || errorData?.code === 'TOKEN_EXPIRED' || 
          errorData?.message === 'Token expired' || error.response?.status === 401) {
        
        console.warn('JWT token expired, attempting to refresh...')
        
        // Prevent retry loops
        originalRequest._retry = true
        
        if (isRefreshing) {
          // Queue requests while refreshing
          return new Promise((resolve, reject) => {
            subscribeTokenRefresh((token) => {
              if (token) {
                originalRequest.headers.Authorization = `Bearer ${token}`
                resolve(apiClient(originalRequest))
              } else {
                reject(new Error('Token refresh failed'))
              }
            })
          })
        }
        
        isRefreshing = true
        
        try {
          // Try to refresh the token using MSAL
          const newToken = await refreshToken()
          isRefreshing = false
          onRefreshed(newToken)
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return apiClient(originalRequest)
        } catch (refreshError) {
          isRefreshing = false
          onRefreshed(null) // Notify waiting requests that refresh failed
          console.error('Token refresh failed:', refreshError.message)
          
          // Don't redirect here - let the refresh function handle it
          return Promise.reject(refreshError)
        }
      } else {
        // For other 401/403 errors, clear auth and redirect
        console.warn('Authentication failed with non-token error:', errorData)
        clearAuthAndRedirect()
        return Promise.reject(error)
      }
    }

    // Handle CORS errors that might actually be authentication issues
    if (error.message === 'Network Error' && !error.response) {
      console.warn('Network error detected, checking if token is expired...')
      
      // Check if token exists and is potentially expired
      const token = localStorage.getItem('authToken')
      if (token && !isTokenValid(token)) {
        console.warn('Token is expired, clearing auth and redirecting to login...')
        clearAuthAndRedirect()
        return Promise.reject(new Error('Token expired'))
      }
    }

    // Enhanced error logging for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      })
    }

    return Promise.reject(error)
  }
)

// Export the wake up function for external use
export { wakeUpBackend }
