const express = require('express')
const cors = require('cors')
const path = require('path')
const helmet = require('helmet')
const morgan = require('morgan')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

const logger = require('./utils/logger')
const { API_CONSTANTS } = require('./utils/constants')

// Import routes
const authRoutes = require('./routes/authRoutes')
const userRoutes = require('./routes/userRoutes')
const vmRoutes = require('./routes/vmRoutes')
const connectionRoutes = require('./routes/connectionRoutes')
const workLogRoutes = require('./routes/workLogRoutes')
const reportRoutes = require('./routes/reportRoutes')
const employeeDashboardRoutes = require('./routes/employeeDashboardRoutes')
const projectRoutes = require('../routes/projectRoutes')

const app = express()

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1)

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // Increase preflight cache to 10 minutes
}

// Enable CORS for all requests
app.use(cors(corsOptions))

// Explicitly handle preflight requests
app.options('*', cors(corsOptions))

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:5173']
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))

// Compression middleware
app.use(compression())

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  skip: (req) => req.method === 'OPTIONS',
});
app.use(limiter)

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}))

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  strict: true
}))
app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb'
}))

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  })
})

app.get('/', (req, res) => {
  res.json({ message: 'Secure VM Portal API' })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/vms', vmRoutes)
app.use('/api/connections', connectionRoutes)
app.use('/api/worklogs', workLogRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/employee/dashboard', employeeDashboardRoutes)
app.use('/api/projects', projectRoutes)

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')))
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'))
  })
}

// Catch-all for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'POST /api/auth/azure',
      'POST /api/auth/refresh',
      'GET /api/auth/profile',
      'PUT /api/auth/profile',
      'POST /api/auth/logout'
    ]
  })
})

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// 404 handler for all other routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  })
})

module.exports = app
