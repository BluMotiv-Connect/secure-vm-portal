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
  'https://secure-vm-portal-frontend.onrender.com' // Your actual Render frontend URL
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
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Origin', 
    'Accept',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['X-Total-Count', 'Access-Control-Allow-Origin'],
  optionsSuccessStatus: 200,
  maxAge: 86400, // 24 hours
  preflightContinue: false
}))

// Additional CORS handling for preflight requests
app.options('*', (req, res) => {
  const origin = req.headers.origin
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*')
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH')
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Origin,Accept')
    res.header('Access-Control-Allow-Credentials', 'true')
    res.header('Access-Control-Max-Age', '86400')
  }
  res.sendStatus(200)
})

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

// Favicon endpoint to prevent browser warnings
app.get('/favicon.ico', (req, res) => {
  res.status(204).end() // No content response
})

// Auth routes (no auth required)
app.use('/api/auth', require('./routes/authRoutes'))

// Consent routes - mixed auth requirements
const consentRoutes = require('./routes/consentRoutes')
// Public route for getting agreement content
app.use('/api/consent', consentRoutes)
// Protected routes require authentication (handled within the route file)

// Work session routes - public routes first, then authenticated routes
const { authenticatedRouter: workSessionAuth, publicRouter: workSessionPublic } = require('./routes/workSessionRoutes')

// Mount public routes first (these don't require auth)
app.use('/api/work-sessions', workSessionPublic)

// Mount authenticated routes second (these require auth)
app.use('/api/work-sessions', authenticateToken, workSessionAuth)

// Other protected routes (auth required)
app.use('/api/users', authenticateToken, require('./routes/userRoutes'))
app.use('/api/vms', authenticateToken, require('./routes/vmRoutes'))
app.use('/api/projects', authenticateToken, require('./routes/projectRoutes'))
app.use('/api/admin/projects', authenticateToken, require('./routes/adminProjectRoutes'))
app.use('/api/admin/tasks', authenticateToken, require('./routes/adminTaskRoutes'))
app.use('/api/tasks', authenticateToken, require('./routes/taskRoutes'))
app.use('/api/employee/dashboard', authenticateToken, require('./routes/employeeDashboardRoutes'))
app.use('/api/reports', authenticateToken, require('./routes/reportRoutes'))
app.use('/api/admin/consent', authenticateToken, require('./routes/adminConsentRoutes'))

// Health check endpoint (no auth required) - for cron jobs and monitoring
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Backend server is running',
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  }
  
  console.log(`[Health Check] ${new Date().toISOString()} - Server is alive`)
  res.status(200).json(healthCheck)
})

// Alternative simple health check endpoint
app.get('/ping', (req, res) => {
  console.log(`[Ping] ${new Date().toISOString()} - Ping received`)
  res.status(200).send('pong')
})

// Wake up endpoint specifically for cron jobs
app.get('/wake', (req, res) => {
  console.log(`[Wake Up] ${new Date().toISOString()} - Wake up call received`)
  res.status(200).json({
    message: 'Backend is awake!',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())} seconds`
  })
})

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
