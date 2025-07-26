const jwt = require('jsonwebtoken')
const { pool } = require('../config/database')

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    console.log('[Auth Middleware] Authorization header:', authHeader ? 'Present' : 'Missing')
    
    if (!authHeader) {
      console.log('[Auth Middleware] ❌ No authorization header')
      return res.status(401).json({ error: 'Access token required' })
    }

    const token = authHeader.split(' ')[1] // Extract token after "Bearer "
    console.log('[Auth Middleware] Token extracted:', token ? 'YES' : 'NO')

    if (!token) {
      console.log('[Auth Middleware] ❌ No token in authorization header')
      return res.status(401).json({ error: 'Access token required' })
    }

    if (!process.env.JWT_SECRET) {
      console.log('[Auth Middleware] ❌ JWT_SECRET not set')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log('[Auth Middleware] ✅ Token decoded for user ID:', decoded.id)
    
    // IMPORTANT: Always get fresh user data from database to handle role changes
    const userResult = await pool.query(
      'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    )

    if (userResult.rows.length === 0) {
      console.log('[Auth Middleware] ❌ User not found in database:', decoded.id)
      return res.status(401).json({ 
        error: 'User not found',
        message: 'Please sign in again',
        code: 'USER_NOT_FOUND'
      })
    }

    const currentUser = userResult.rows[0]

    // Check if user is still active
    if (!currentUser.is_active) {
      console.log('[Auth Middleware] ❌ User account is inactive:', currentUser.email)
      return res.status(403).json({ 
        error: 'Account inactive',
        message: 'Your account has been deactivated',
        code: 'ACCOUNT_INACTIVE'
      })
    }

    // Use CURRENT user data from database (not from JWT token)
    req.user = {
      id: currentUser.id,
      email: currentUser.email,
      name: currentUser.name,
      role: currentUser.role // This will always be the current role from database
    }
    
    console.log('[Auth Middleware] ✅ User authenticated with current role:', req.user.role)
    next()
  } catch (error) {
    console.error('[Auth Middleware] ❌ Token validation failed:', error.message)
    
    if (error.name === 'TokenExpiredError') {
      console.log('[Auth Middleware] ❌ Token expired')
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired', 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED' 
      })
    } else if (error.name === 'JsonWebTokenError') {
      console.log('[Auth Middleware] ❌ Invalid token:', error.message)
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token',
        message: 'Invalid token', 
        code: 'INVALID_TOKEN' 
      })
    } else {
      console.log('[Auth Middleware] ❌ Token verification error:', error.message)
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication failed',
        message: 'Authentication failed', 
        code: 'AUTH_FAILED' 
      })
    }
  }
}

module.exports = { authenticateToken }
