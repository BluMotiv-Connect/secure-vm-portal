const { 
  apiLimiter, 
  authLimiter, 
  connectionLimiter, 
  downloadLimiter,
  createUserLimiter 
} = require('../config/rateLimiting')

// Apply appropriate rate limiting based on route
const applyRateLimit = (type = 'api') => {
  switch (type) {
    case 'auth':
      return authLimiter
    case 'connection':
      return connectionLimiter
    case 'download':
      return downloadLimiter
    case 'user':
      return createUserLimiter(15 * 60 * 1000, 50) // 50 requests per 15 minutes per user
    case 'api':
    default:
      return apiLimiter
  }
}

module.exports = {
  applyRateLimit
}
