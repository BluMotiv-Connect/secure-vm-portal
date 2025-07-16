const crypto = require('crypto')
const { VALIDATION_PATTERNS, TIME_CONSTANTS } = require('./constants')

/**
 * Generate a unique identifier
 */
const generateId = () => {
  return crypto.randomUUID()
}

/**
 * Generate a secure random string
 */
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  return VALIDATION_PATTERNS.EMAIL.test(email)
}

/**
 * Validate IP address format
 */
const isValidIP = (ip) => {
  return VALIDATION_PATTERNS.IP_ADDRESS.test(ip)
}

/**
 * Validate UUID format
 */
const isValidUUID = (uuid) => {
  return VALIDATION_PATTERNS.UUID.test(uuid)
}

/**
 * Format duration in milliseconds to human readable format
 */
const formatDuration = (milliseconds) => {
  if (milliseconds < TIME_CONSTANTS.MINUTE) {
    return `${Math.round(milliseconds / 1000)}s`
  } else if (milliseconds < TIME_CONSTANTS.HOUR) {
    return `${Math.round(milliseconds / TIME_CONSTANTS.MINUTE)}m`
  } else if (milliseconds < TIME_CONSTANTS.DAY) {
    const hours = Math.floor(milliseconds / TIME_CONSTANTS.HOUR)
    const minutes = Math.round((milliseconds % TIME_CONSTANTS.HOUR) / TIME_CONSTANTS.MINUTE)
    return `${hours}h ${minutes}m`
  } else {
    const days = Math.floor(milliseconds / TIME_CONSTANTS.DAY)
    const hours = Math.round((milliseconds % TIME_CONSTANTS.DAY) / TIME_CONSTANTS.HOUR)
    return `${days}d ${hours}h`
  }
}

/**
 * Format bytes to human readable format
 */
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Sanitize string for safe database storage
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str
  
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
}

/**
 * Deep clone an object
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Check if object is empty
 */
const isEmpty = (obj) => {
  if (obj == null) return true
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0
  if (typeof obj === 'object') return Object.keys(obj).length === 0
  return false
}

/**
 * Debounce function
 */
const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function
 */
const throttle = (func, limit) => {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Sleep function for async operations
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry function with exponential backoff
 */
const retry = async (fn, maxAttempts = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxAttempts) throw error
      
      const backoffDelay = delay * Math.pow(2, attempt - 1)
      await sleep(backoffDelay)
    }
  }
}

/**
 * Parse pagination parameters
 */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20))
  const offset = (page - 1) * limit
  
  return { page, limit, offset }
}

/**
 * Build pagination response
 */
const buildPaginationResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit)
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }
}

/**
 * Mask sensitive data for logging
 */
const maskSensitiveData = (data) => {
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential']
  const masked = { ...data }
  
  Object.keys(masked).forEach(key => {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      masked[key] = '***MASKED***'
    }
  })
  
  return masked
}

/**
 * Get client IP address from request
 */
const getClientIP = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         '0.0.0.0'
}

/**
 * Generate session ID
 */
const generateSessionId = () => {
  return `session_${Date.now()}_${generateRandomString(16)}`
}

/**
 * Calculate time difference in minutes
 */
const getTimeDifferenceInMinutes = (startTime, endTime = new Date()) => {
  const start = new Date(startTime)
  const end = new Date(endTime)
  return Math.round((end - start) / (1000 * 60))
}

/**
 * Check if time is within business hours
 */
const isBusinessHours = (date = new Date()) => {
  const hour = date.getHours()
  const day = date.getDay()
  
  // Monday to Friday, 9 AM to 6 PM
  return day >= 1 && day <= 5 && hour >= 9 && hour < 18
}

module.exports = {
  generateId,
  generateRandomString,
  isValidEmail,
  isValidIP,
  isValidUUID,
  formatDuration,
  formatBytes,
  sanitizeString,
  deepClone,
  isEmpty,
  debounce,
  throttle,
  sleep,
  retry,
  parsePagination,
  buildPaginationResponse,
  maskSensitiveData,
  getClientIP,
  generateSessionId,
  getTimeDifferenceInMinutes,
  isBusinessHours
}
