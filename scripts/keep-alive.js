#!/usr/bin/env node

// Keep-alive script to prevent Render free tier from sleeping
// This script pings your backend every 10 minutes to keep it awake

const axios = require('axios')

const BACKEND_URL = 'https://secure-vm-portal-backend.onrender.com'
const PING_INTERVAL = 10 * 60 * 1000 // 10 minutes in milliseconds

console.log('🚀 Starting keep-alive service for Render backend...')
console.log(`📡 Backend URL: ${BACKEND_URL}`)
console.log(`⏰ Ping interval: ${PING_INTERVAL / 1000 / 60} minutes`)

async function pingBackend() {
  try {
    const startTime = Date.now()
    const response = await axios.get(`${BACKEND_URL}/api/health`, {
      timeout: 30000 // 30 second timeout
    })
    
    const responseTime = Date.now() - startTime
    const timestamp = new Date().toISOString()
    
    if (response.status === 200) {
      console.log(`✅ [${timestamp}] Backend is alive - Response time: ${responseTime}ms`)
    } else {
      console.log(`⚠️  [${timestamp}] Backend responded with status: ${response.status}`)
    }
  } catch (error) {
    const timestamp = new Date().toISOString()
    
    if (error.code === 'ECONNABORTED') {
      console.log(`⏰ [${timestamp}] Backend is waking up (timeout) - This is normal`)
    } else if (error.response) {
      console.log(`❌ [${timestamp}] Backend error: ${error.response.status} - ${error.response.statusText}`)
    } else {
      console.log(`🔄 [${timestamp}] Backend is starting up: ${error.message}`)
    }
  }
}

// Initial ping
pingBackend()

// Set up interval pinging
setInterval(pingBackend, PING_INTERVAL)

console.log('🎯 Keep-alive service is running. Press Ctrl+C to stop.')