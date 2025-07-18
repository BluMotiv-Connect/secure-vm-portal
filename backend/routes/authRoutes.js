const express = require('express')
const jwt = require('jsonwebtoken')
const axios = require('axios')
const { pool } = require('../config/database')
const router = express.Router()

// Azure AD token validation
const validateAzureToken = async (accessToken) => {
  try {
    const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    return response.data
  } catch (error) {
    throw new Error('Invalid Azure AD token')
  }
}

// Login endpoint
// Login endpoint (updated to handle admin-added users)
router.post('/login', async (req, res) => {
  try {
    const { accessToken } = req.body

    if (!accessToken) {
      return res.status(400).json({
        error: 'Access token is required'
      })
    }

    // Validate token with Microsoft Graph
    const userInfo = await validateAzureToken(accessToken)
    console.log('User info from Azure:', userInfo)

    const userEmail = userInfo.mail || userInfo.userPrincipalName

    // Check if user exists in database
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [userEmail]
    )

    if (result.rows.length === 0) {
      console.log('User not found in database:', userEmail)
      return res.status(403).json({
        error: 'Access denied. Your email address is not authorized. Please contact administrator.',
        email: userEmail,
        message: 'Only users added by admin can access the system.'
      })
    }

    const user = result.rows[0]
    console.log('User found in database:', user)

    // Update Azure ID if not set (for users added by admin)
    if (!user.azure_id && userInfo.id) {
      await pool.query(
        'UPDATE users SET azure_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [userInfo.id, user.id]
      )
      user.azure_id = userInfo.id
      console.log('Updated Azure ID for user:', user.email)
    }

    // Update name from Azure if different
    if (user.name !== userInfo.displayName) {
      await pool.query(
        'UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [userInfo.displayName, user.id]
      )
      user.name = userInfo.displayName
      console.log('Updated name for user:', user.email)
    }

    console.log('Login successful - Role:', user.role, 'Email:', userEmail)

    // Create JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        iss: 'secure-vm-portal'
      },
      process.env.JWT_SECRET,
      { expiresIn: '2h' } // Shorter expiration for better security
    )
    
    // Generate refresh token
    const refreshToken = jwt.sign(
      {
        id: user.id,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        iss: 'secure-vm-portal'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    const responseUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }

    console.log('Sending user response:', responseUser)

    res.json({
      success: true,
      token,
      refreshToken,
      user: responseUser
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(401).json({
      error: 'Authentication failed',
      message: error.message
    })
  }
})

// Token validation endpoint
router.get('/validate', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    res.json({
      success: true,
      user: decoded
    })

  } catch (error) {
    res.status(401).json({
      error: 'Invalid token'
    })
  }
})

// Token refresh endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body
    
    if (!refreshToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Refresh token is required',
        message: 'Refresh token is required' 
      })
    }
    
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET)
    
    // Check if it's a valid refresh token
    if (!decoded || !decoded.id || decoded.type !== 'refresh') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid refresh token',
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN' 
      })
    }
    
    // Get user from database
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [decoded.id]
    )
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found',
        message: 'User not found',
        code: 'USER_NOT_FOUND' 
      })
    }
    
    const user = result.rows[0]
    
    // Generate new JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        name: user.name,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        iss: 'secure-vm-portal'
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '2h' }
    )
    
    // Generate new refresh token
    const newRefreshToken = jwt.sign(
      { 
        id: user.id,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        iss: 'secure-vm-portal'
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    )
    
    console.log('[Token Refresh] ✅ Token refreshed successfully for user:', user.email)
    
    // Return new tokens
    res.json({
      success: true,
      token,
      refreshToken: newRefreshToken,
      message: 'Token refreshed successfully'
    })
  } catch (error) {
    console.error('[Token Refresh] ❌ Error:', error)
    
    // Check if token is expired
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Refresh token expired', 
        message: 'Refresh token expired',
        code: 'TOKEN_EXPIRED' 
      })
    }
    
    // Check if token is invalid
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid refresh token', 
        message: 'Invalid refresh token',
        code: 'INVALID_TOKEN' 
      })
    }
    
    res.status(401).json({ 
      success: false, 
      error: 'Token refresh failed',
      message: 'Token refresh failed' 
    })
  }
})

// Logout endpoint
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  })
})

module.exports = router
