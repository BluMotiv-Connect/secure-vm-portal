const jwt = require('jsonwebtoken')

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    console.log('[Auth Middleware] Full headers:', req.headers)
    console.log('[Auth Middleware] Authorization header:', authHeader)
    
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
    console.log('[Auth Middleware] ✅ Token decoded successfully:', decoded)
    
    // Set user data from JWT token
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role
    }
    
    console.log('[Auth Middleware] ✅ User set on request:', req.user)
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
