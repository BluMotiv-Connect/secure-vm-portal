const rateLimit = require('express-rate-limit')
const RedisStore = require('rate-limit-redis')
const Redis = require('redis')
const logger = require('../utils/logger')

// Create Redis client for rate limiting
const redisClient = Redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false
})

redisClient.on('error', (err) => {
  logger.error('Redis rate limiting error:', err)
})

// General API rate limiting
const apiLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded:', {
      ip: req.ip,
      url: req.originalUrl,
      userAgent: req.get('User-Agent')
    })
    
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes'
    })
  }
})

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('Auth rate limit exceeded:', {
      ip: req.ip,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      severity: 'high'
    })
    
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes'
    })
  }
})

// Rate limiting for VM connection endpoints
const connectionLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 connection attempts per windowMs
  message: {
    error: 'Too many connection attempts, please try again later',
    code: 'CONNECTION_RATE_LIMIT_EXCEEDED',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('Connection rate limit exceeded:', {
      ip: req.ip,
      url: req.originalUrl,
      userId: req.user?.id,
      severity: 'medium'
    })
    
    res.status(429).json({
      error: 'Too many connection attempts, please try again later',
      code: 'CONNECTION_RATE_LIMIT_EXCEEDED',
      retryAfter: '5 minutes'
    })
  }
})

// Rate limiting for file downloads
const downloadLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 downloads per minute
  message: {
    error: 'Too many download requests, please try again later',
    code: 'DOWNLOAD_RATE_LIMIT_EXCEEDED',
    retryAfter: '1 minute'
  }
})

// Create rate limiter based on user ID for authenticated endpoints
const createUserLimiter = (windowMs, max) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
    windowMs,
    max,
    keyGenerator: (req) => {
      return req.user?.id ? `user:${req.user.id}` : req.ip
    },
    message: {
      error: 'Too many requests from this user, please try again later',
      code: 'USER_RATE_LIMIT_EXCEEDED'
    }
  })
}

module.exports = {
  apiLimiter,
  authLimiter,
  connectionLimiter,
  downloadLimiter,
  createUserLimiter,
  redisClient
}
