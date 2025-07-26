/**
 * Utility functions for testing authentication and token refresh
 * These functions can be called from the browser console for debugging
 */

import { apiClient } from '../services/apiClient'
import { isTokenValid, getTokenTimeRemaining, clearAuthStorage } from './tokenUtils'

// Make functions available globally for console testing
window.authTest = {
  // Test current token validity
  checkToken: () => {
    const token = localStorage.getItem('authToken')
    if (!token) {
      console.log('❌ No token found')
      return false
    }
    
    const isValid = isTokenValid(token)
    const timeRemaining = getTokenTimeRemaining(token)
    
    console.log('🔍 Token Status:')
    console.log('  Valid:', isValid)
    console.log('  Time remaining:', Math.floor(timeRemaining / 60), 'minutes')
    
    return isValid
  },

  // Test API call to trigger token refresh if needed
  testApiCall: async () => {
    try {
      console.log('🧪 Testing API call...')
      const response = await apiClient.get('/auth/me')
      console.log('✅ API call successful:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ API call failed:', error.message)
      throw error
    }
  },

  // Clear auth and test
  clearAndTest: () => {
    console.log('🧹 Clearing auth storage...')
    clearAuthStorage()
    console.log('✅ Auth storage cleared')
    
    // Try an API call to see what happens
    return window.authTest.testApiCall()
  },

  // Simulate expired token (for testing)
  simulateExpiredToken: () => {
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid'
    localStorage.setItem('authToken', expiredToken)
    console.log('⏰ Set expired token for testing')
    
    return window.authTest.testApiCall()
  },

  // Get current auth state
  getAuthState: () => {
    const token = localStorage.getItem('authToken')
    const user = localStorage.getItem('user')
    
    console.log('📊 Current Auth State:')
    console.log('  Token exists:', !!token)
    console.log('  User exists:', !!user)
    
    if (token) {
      console.log('  Token valid:', isTokenValid(token))
      console.log('  Time remaining:', Math.floor(getTokenTimeRemaining(token) / 60), 'minutes')
    }
    
    if (user) {
      try {
        const userData = JSON.parse(user)
        console.log('  User:', userData.email, '(' + userData.role + ')')
      } catch (e) {
        console.log('  User data invalid')
      }
    }
  }
}

console.log('🔧 Auth testing utilities loaded. Use window.authTest.* functions in console.')