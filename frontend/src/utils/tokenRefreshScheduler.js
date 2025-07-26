/**
 * Token Refresh Scheduler
 * Proactively refreshes tokens before they expire to prevent authentication issues
 */

import { isTokenValid, getTokenTimeRemaining } from './tokenUtils'

class TokenRefreshScheduler {
  constructor() {
    this.refreshTimer = null
    this.isRunning = false
    this.refreshThreshold = 5 * 60 // 5 minutes in seconds
  }

  start() {
    if (this.isRunning) {
      console.log('[TokenScheduler] Already running')
      return
    }

    console.log('[TokenScheduler] Starting token refresh scheduler')
    this.isRunning = true
    this.scheduleNextRefresh()
  }

  stop() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    this.isRunning = false
    console.log('[TokenScheduler] Token refresh scheduler stopped')
  }

  scheduleNextRefresh() {
    if (!this.isRunning) return

    const token = localStorage.getItem('authToken')
    if (!token || !isTokenValid(token)) {
      console.log('[TokenScheduler] No valid token found, stopping scheduler')
      this.stop()
      return
    }

    const timeRemaining = getTokenTimeRemaining(token)
    const refreshIn = Math.max(0, timeRemaining - this.refreshThreshold)

    console.log(`[TokenScheduler] Next refresh in ${Math.floor(refreshIn / 60)} minutes`)

    this.refreshTimer = setTimeout(() => {
      this.attemptTokenRefresh()
    }, refreshIn * 1000)
  }

  async attemptTokenRefresh() {
    if (!this.isRunning) return

    try {
      console.log('[TokenScheduler] Attempting proactive token refresh...')
      
      // Get MSAL instance
      const msalInstance = window.msalInstance
      if (!msalInstance) {
        console.warn('[TokenScheduler] MSAL instance not available')
        this.scheduleNextRefresh() // Try again later
        return
      }

      // Get current account
      const accounts = msalInstance.getAllAccounts()
      if (accounts.length === 0) {
        console.warn('[TokenScheduler] No MSAL accounts found')
        this.stop()
        return
      }

      const account = accounts[0]

      // Try to acquire token silently
      const response = await msalInstance.acquireTokenSilent({
        scopes: ['openid', 'profile', 'email'],
        account: account,
        forceRefresh: true
      })

      console.log('[TokenScheduler] MSAL token refreshed successfully')

      // Call backend to get new JWT token
      const backendResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          accessToken: response.accessToken
        })
      })

      if (backendResponse.ok) {
        const data = await backendResponse.json()
        if (data.token) {
          localStorage.setItem('authToken', data.token)
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user))
          }
          console.log('[TokenScheduler] ✅ Token refreshed proactively')
        }
      } else {
        console.warn('[TokenScheduler] Backend token refresh failed:', backendResponse.status)
      }

    } catch (error) {
      console.error('[TokenScheduler] Proactive token refresh failed:', error.message)
    }

    // Schedule next refresh regardless of success/failure
    this.scheduleNextRefresh()
  }

  // Method to manually trigger refresh (for testing)
  triggerRefresh() {
    console.log('[TokenScheduler] Manual refresh triggered')
    this.attemptTokenRefresh()
  }
}

// Create singleton instance
const tokenRefreshScheduler = new TokenRefreshScheduler()

// Make available for debugging
if (process.env.NODE_ENV === 'development') {
  window.tokenScheduler = tokenRefreshScheduler
}

export default tokenRefreshScheduler