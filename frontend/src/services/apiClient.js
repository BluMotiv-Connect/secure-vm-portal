import axios from 'axios'

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

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb)
}
function onRefreshed(token) {
  refreshSubscribers.forEach(cb => cb(token))
  refreshSubscribers = []
}

async function refreshToken() {
  try {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      console.warn('No refresh token available, redirecting to login')
      throw new Error('No refresh token available')
    }
    
    console.log('Attempting to refresh token...')
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { 
      withCredentials: true,
      timeout: 10000 // 10 second timeout for refresh
    })
    
    if (response.data.success && response.data.token) {
      const { token, refreshToken: newRefreshToken } = response.data
      localStorage.setItem('authToken', token)
      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken)
      }
      console.log('Token refreshed successfully')
      return token
    } else {
      throw new Error('Invalid refresh response')
    }
  } catch (error) {
    console.error('Token refresh failed:', error.response?.data || error.message)
    
    // If refresh token is expired or invalid, clear everything and redirect
    if (error.response?.status === 401 || error.response?.data?.code === 'TOKEN_EXPIRED') {
      console.warn('Refresh token expired, clearing auth and redirecting to login')
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      window.location.href = '/login'
      throw new Error('Refresh token expired')
    }
    
    // For other errors, still clear auth and redirect
    console.error('Refresh failed, clearing auth and redirecting to login')
    localStorage.removeItem('authToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    window.location.href = '/login'
    throw error
  }
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
      config.headers.Authorization = `Bearer ${token}`
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
        
        originalRequest._retry = true
        isRefreshing = true
        
        try {
          // Try to refresh the token
          const newToken = await refreshToken()
          isRefreshing = false
          onRefreshed(newToken)
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return apiClient(originalRequest)
        } catch (refreshError) {
          isRefreshing = false
          onRefreshed(null) // Notify waiting requests that refresh failed
          console.error('Token refresh failed, redirecting to login...')
          
          // Clear stored tokens and redirect to login
          localStorage.removeItem('authToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('user')
          
          // Redirect to login page
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      }
    }

    // Handle CORS errors that might actually be authentication issues
    if (error.message === 'Network Error' && !error.response) {
      console.warn('Network error detected, checking if token is expired...')
      
      // Check if token exists and is potentially expired
      const token = localStorage.getItem('authToken')
      if (token) {
        try {
          // Decode JWT to check expiration (simple check)
          const payload = JSON.parse(atob(token.split('.')[1]))
          const currentTime = Date.now() / 1000
          
          if (payload.exp && payload.exp < currentTime) {
            console.warn('Token is expired, clearing auth and redirecting to login...')
            localStorage.removeItem('authToken')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('user')
            window.location.href = '/login'
            return Promise.reject(new Error('Token expired'))
          }
        } catch (tokenError) {
          console.error('Error checking token expiration:', tokenError)
        }
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
