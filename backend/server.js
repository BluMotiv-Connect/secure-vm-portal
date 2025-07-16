const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const { authenticateToken } = require('./middleware/auth')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet())

// CORS configuration - MUST come before rate limiting
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  'https://secure-vm-portal-frontend.onrender.com' // Add your Render frontend URL
].filter(Boolean)

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      console.log('CORS blocked origin:', origin)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  optionsSuccessStatus: 200
}))

// Rate limiting - More lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Much higher limit for dev
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(15 * 60) // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and auth endpoints in development
    if (process.env.NODE_ENV === 'development') {
      return req.path === '/api/health' || req.path.startsWith('/api/auth')
    }
    return false
  }
})
app.use(limiter)

app.use(express.json())

// Health check endpoint (no auth required)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend server is running!',
    timestamp: new Date().toISOString()
  })
})

// Auth routes (no auth required)
app.use('/api/auth', require('./routes/authRoutes'))

// Work session public routes (no auth required - token-based validation)
const { authenticatedRouter: workSessionAuth, publicRouter: workSessionPublic } = require('./routes/workSessionRoutes')
app.use('/api/work-sessions', workSessionPublic)

// Protected routes (auth required)
app.use('/api/users', authenticateToken, require('./routes/userRoutes'))
app.use('/api/vms', authenticateToken, require('./routes/vmRoutes'))
app.use('/api/projects', authenticateToken, require('./routes/projectRoutes'))
app.use('/api/admin/projects', authenticateToken, require('./routes/adminProjectRoutes'))
app.use('/api/admin/tasks', authenticateToken, require('./routes/adminTaskRoutes'))
app.use('/api/tasks', authenticateToken, require('./routes/taskRoutes'))
app.use('/api/work-sessions', authenticateToken, workSessionAuth)
app.use('/api/employee/dashboard', authenticateToken, require('./routes/employeeDashboardRoutes'))

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
})
