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
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { withCredentials: true })
    const { accessToken } = response.data
    localStorage.setItem('authToken', accessToken)
    return accessToken
  } catch (err) {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    window.location.href = '/login'
    throw err
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

    // Handle authentication errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue requests while refreshing
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(apiClient(originalRequest))
          })
        })
      }
      originalRequest._retry = true
      isRefreshing = true
      try {
        const newToken = await refreshToken()
        isRefreshing = false
        onRefreshed(newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      } catch (err) {
        isRefreshing = false
        return Promise.reject(err)
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
