const logger = require('../utils/logger')
const { getClientIP } = require('../utils/helpers')

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  // Log error details
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: getClientIP(req),
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  })

  // Default error response
  let error = {
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  }

  // Handle different error types
  if (err.name === 'ValidationError') {
    error = {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.details || err.message,
      timestamp: new Date().toISOString()
    }
    return res.status(400).json(error)
  }

  if (err.name === 'UnauthorizedError' || err.status === 401) {
    error = {
      success: false,
      error: 'Unauthorized access',
      code: 'UNAUTHORIZED',
      timestamp: new Date().toISOString()
    }
    return res.status(401).json(error)
  }

  if (err.name === 'ForbiddenError' || err.status === 403) {
    error = {
      success: false,
      error: 'Access forbidden',
      code: 'FORBIDDEN',
      timestamp: new Date().toISOString()
    }
    return res.status(403).json(error)
  }

  if (err.name === 'NotFoundError' || err.status === 404) {
    error = {
      success: false,
      error: 'Resource not found',
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString()
    }
    return res.status(404).json(error)
  }

  if (err.name === 'ConflictError' || err.status === 409) {
    error = {
      success: false,
      error: 'Resource conflict',
      code: 'CONFLICT',
      details: err.message,
      timestamp: new Date().toISOString()
    }
    return res.status(409).json(error)
  }

  // Database errors
  if (err.code === '23505') { // PostgreSQL unique violation
    error = {
      success: false,
      error: 'Duplicate entry',
      code: 'DUPLICATE_ENTRY',
      timestamp: new Date().toISOString()
    }
    return res.status(409).json(error)
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    error = {
      success: false,
      error: 'Referenced resource not found',
      code: 'FOREIGN_KEY_VIOLATION',
      timestamp: new Date().toISOString()
    }
    return res.status(400).json(error)
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
      timestamp: new Date().toISOString()
    }
    return res.status(401).json(error)
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      success: false,
      error: 'Token expired',
      code: 'TOKEN_EXPIRED',
      timestamp: new Date().toISOString()
    }
    return res.status(401).json(error)
  }

  // Rate limiting errors
  if (err.status === 429) {
    error = {
      success: false,
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: err.retryAfter,
      timestamp: new Date().toISOString()
    }
    return res.status(429).json(error)
  }

  // Development vs Production error details
  if (process.env.NODE_ENV === 'development') {
    error.stack = err.stack
    error.details = err.message
  }

  // Send error response
  res.status(err.status || 500).json(error)
}

// 404 handler for undefined routes
const notFoundHandler = (req, res) => {
  const error = {
    success: false,
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  }

  logger.warn('Route not found:', {
    path: req.originalUrl,
    method: req.method,
    ip: getClientIP(req),
    userAgent: req.get('User-Agent')
  })

  res.status(404).json(error)
}

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
}
