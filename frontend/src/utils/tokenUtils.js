/**
 * Utility functions for JWT token handling
 */

/**
 * Validates if a JWT token is still valid (not expired)
 * @param {string} token - JWT token to validate
 * @returns {boolean} - True if token is valid, false otherwise
 */
export const isTokenValid = (token) => {
  if (!token) return false
  
  try {
    // Decode JWT payload
    const payload = JSON.parse(atob(token.split('.')[1]))
    const currentTime = Date.now() / 1000
    
    // Check if token has expiration and if it's still valid
    if (payload.exp && payload.exp > currentTime) {
      return true
    }
    
    return false
  } catch (error) {
    console.error('Error validating token:', error)
    return false
  }
}

/**
 * Gets the expiration time of a JWT token
 * @param {string} token - JWT token
 * @returns {number|null} - Expiration timestamp or null if invalid
 */
export const getTokenExpiration = (token) => {
  if (!token) return null
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp || null
  } catch (error) {
    console.error('Error getting token expiration:', error)
    return null
  }
}

/**
 * Gets the time remaining until token expires (in seconds)
 * @param {string} token - JWT token
 * @returns {number} - Seconds until expiration, 0 if expired or invalid
 */
export const getTokenTimeRemaining = (token) => {
  const exp = getTokenExpiration(token)
  if (!exp) return 0
  
  const currentTime = Date.now() / 1000
  const remaining = exp - currentTime
  
  return Math.max(0, remaining)
}

/**
 * Checks if token will expire within the specified time (in seconds)
 * @param {string} token - JWT token
 * @param {number} thresholdSeconds - Time threshold in seconds (default: 300 = 5 minutes)
 * @returns {boolean} - True if token expires within threshold
 */
export const isTokenExpiringSoon = (token, thresholdSeconds = 300) => {
  const timeRemaining = getTokenTimeRemaining(token)
  return timeRemaining > 0 && timeRemaining <= thresholdSeconds
}

/**
 * Clears all authentication-related data from localStorage
 */
export const clearAuthStorage = () => {
  localStorage.removeItem('authToken')
  localStorage.removeItem('user')
  localStorage.removeItem('selectedRole')
}

/**
 * Gets stored authentication data
 * @returns {object} - Object with token and user data
 */
export const getStoredAuth = () => {
  try {
    const token = localStorage.getItem('authToken')
    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : null
    
    return { token, user }
  } catch (error) {
    console.error('Error getting stored auth:', error)
    return { token: null, user: null }
  }
}