const logger = require('../utils/logger')
const { getClientIP } = require('../utils/helpers')

// Request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now()
  const clientIP = getClientIP(req)
  
  // Log request start
  logger.info('Request started:', {
    method: req.method,
    url: req.originalUrl,
    ip: clientIP,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  })

  // Override res.json to log response
  const originalJson = res.json
  res.json = function(data) {
    const duration = Date.now() - startTime
    
    // Log response
    logger.info('Request completed:', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: clientIP,
      userId: req.user?.id,
      success: data?.success !== false,
      timestamp: new Date().toISOString()
    })

    // Call original json method
    return originalJson.call(this, data)
  }

  next()
}

// Security event logger
const securityLogger = (event, details = {}) => {
  logger.security(event, {
    ...details,
    timestamp: new Date().toISOString(),
    severity: details.severity || 'medium'
  })
}

// Audit logger for sensitive operations
const auditLogger = (req, action, details = {}) => {
  logger.audit(action, {
    userId: req.user?.id,
    userEmail: req.user?.email,
    ip: getClientIP(req),
    userAgent: req.get('User-Agent'),
    ...details,
    timestamp: new Date().toISOString()
  })
}

module.exports = {
  requestLogger,
  securityLogger,
  auditLogger
}
