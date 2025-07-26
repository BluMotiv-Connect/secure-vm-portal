// Keep-alive utility to prevent backend from sleeping
class KeepAliveService {
  constructor() {
    this.intervalId = null
    this.isActive = false
    this.failureCount = 0
    this.maxFailures = 3
    this.baseInterval = 8 * 60 * 1000 // 8 minutes
    this.backendUrl = import.meta.env.VITE_API_URL || 'https://secure-vm-portal-backend.onrender.com'
  }

  start() {
    if (this.isActive) {
      console.log('[KeepAlive] Service already running')
      return
    }

    this.isActive = true
    console.log('[KeepAlive] Starting keep-alive service')
    
    // Initial ping
    this.ping()
    
    // Set up regular pings
    this.intervalId = setInterval(() => {
      this.ping()
    }, this.baseInterval)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isActive = false
    console.log('[KeepAlive] Service stopped')
  }

  async ping() {
    try {
      console.log('[KeepAlive] Pinging backend...')
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch(`${this.backendUrl}/wake`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        console.log('[KeepAlive] ✅ Backend is awake:', data.message)
        this.failureCount = 0 // Reset failure count on success
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
    } catch (error) {
      this.failureCount++
      console.warn(`[KeepAlive] ❌ Ping failed (${this.failureCount}/${this.maxFailures}):`, error.message)
      
      // If too many failures, try alternative endpoints
      if (this.failureCount >= this.maxFailures) {
        console.log('[KeepAlive] Too many failures, trying alternative endpoints...')
        await this.tryAlternativeEndpoints()
      }
    }
  }

  async tryAlternativeEndpoints() {
    const endpoints = ['/ping', '/health']
    
    for (const endpoint of endpoints) {
      try {
        console.log(`[KeepAlive] Trying alternative endpoint: ${endpoint}`)
        
        const response = await fetch(`${this.backendUrl}${endpoint}`, {
          method: 'GET',
          timeout: 10000
        })
        
        if (response.ok) {
          console.log(`[KeepAlive] ✅ Alternative endpoint ${endpoint} responded`)
          this.failureCount = 0
          return
        }
      } catch (error) {
        console.warn(`[KeepAlive] Alternative endpoint ${endpoint} failed:`, error.message)
      }
    }
    
    console.error('[KeepAlive] All endpoints failed, backend might be down')
  }

  // Method to manually wake up backend (for user interactions)
  async wakeUp() {
    console.log('[KeepAlive] Manual wake-up requested')
    await this.ping()
  }

  // Get service status
  getStatus() {
    return {
      isActive: this.isActive,
      failureCount: this.failureCount,
      lastPing: new Date().toISOString()
    }
  }
}

// Create singleton instance
const keepAliveService = new KeepAliveService()

export default keepAliveService