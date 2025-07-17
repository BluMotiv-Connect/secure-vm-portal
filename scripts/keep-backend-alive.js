#!/usr/bin/env node

/**
 * Simple script to keep the backend alive by pinging it every 10 minutes
 * This prevents Render's free tier from putting the backend to sleep
 */

const axios = require('axios')

const BACKEND_URL = process.env.BACKEND_URL || 'https://secure-vm-portal-backend.onrender.com'
const PING_INTERVAL = 10 * 60 * 1000 // 10 minutes in milliseconds

async function pingBackend() {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/health`, {
      timeout: 30000
    })
    
    console.log(`✅ [${new Date().toISOString()}] Backend is alive:`, response.data.message)
    return true
  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Backend ping failed:`, error.message)
    return false
  }
}

async function keepAlive() {
  console.log(`🚀 Starting backend keep-alive service...`)
  console.log(`📡 Pinging ${BACKEND_URL}/api/health every 10 minutes`)
  
  // Initial ping
  await pingBackend()
  
  // Set up interval
  setInterval(async () => {
    await pingBackend()
  }, PING_INTERVAL)
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down keep-alive service...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down keep-alive service...')
  process.exit(0)
})

// Start the service
keepAlive().catch(error => {
  console.error('Failed to start keep-alive service:', error)
  process.exit(1)
})