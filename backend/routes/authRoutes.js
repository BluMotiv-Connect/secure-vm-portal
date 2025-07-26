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
// Login endpoint (enhanced to handle all authentication issues)
router.post('/login', async (req, res) => {
  try {
    const { accessToken } = req.body

    console.log('[Auth] Login attempt started')

    if (!accessToken) {
      console.log('[Auth] ❌ No access token provided')
      return res.status(400).json({
        error: 'Access token is required'
      })
    }

    // Validate token with Microsoft Graph
    let userInfo
    try {
      userInfo = await validateAzureToken(accessToken)
      console.log('[Auth] ✅ Azure token validated successfully')
      console.log('[Auth] User info from Azure:', {
        id: userInfo.id,
        email: userInfo.mail || userInfo.userPrincipalName,
        name: userInfo.displayName
      })
    } catch (error) {
      console.log('[Auth] ❌ Azure token validation failed:', error.message)
      return res.status(401).json({
        error: 'Invalid Microsoft token',
        message: 'Please sign in again with Microsoft'
      })
    }

    const userEmail = userInfo.mail || userInfo.userPrincipalName
    
    if (!userEmail) {
      console.log('[Auth] ❌ No email found in Azure token')
      return res.status(400).json({
        error: 'Email not found in Microsoft account',
        message: 'Your Microsoft account must have an email address'
      })
    }

    console.log('[Auth] Looking for user in database:', userEmail)

    // Check if user exists in database with comprehensive query
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [userEmail]
    )

    if (result.rows.length === 0) {
      console.log('[Auth] ❌ User not found in database:', userEmail)
      return res.status(403).json({
        error: 'Access denied. Your email address is not authorized.',
        email: userEmail,
        message: 'Please contact your administrator to be added to the system.',
        code: 'USER_NOT_FOUND'
      })
    }

    const user = result.rows[0]
    console.log('[Auth] User found in database:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.is_active
    })

    // Check if user is active
    if (!user.is_active) {
      console.log('[Auth] ❌ User account is inactive:', userEmail)
      return res.status(403).json({
        error: 'Account is inactive',
        message: 'Your account has been deactivated. Please contact administrator.',
        code: 'ACCOUNT_INACTIVE'
      })
    }

    // Update Azure ID if not set (for users added by admin)
    if (!user.azure_id && userInfo.id) {
      console.log('[Auth] Updating Azure ID for user:', user.email)
      await pool.query(
        'UPDATE users SET azure_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [userInfo.id, user.id]
      )
      user.azure_id = userInfo.id
    }

    // Update name from Azure if different (and if Azure has a name)
    if (userInfo.displayName && user.name !== userInfo.displayName) {
      console.log('[Auth] Updating name for user:', user.email, 'from', user.name, 'to', userInfo.displayName)
      await pool.query(
        'UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [userInfo.displayName, user.id]
      )
      user.name = userInfo.displayName
    }

    // Update last login timestamp
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    )

    console.log('[Auth] ✅ Login successful - Role:', user.role, 'Email:', userEmail)

    // Create JWT token with fresh user data
    const tokenPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      iss: 'secure-vm-portal'
    }

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '2h' })
    
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

// Admin endpoint to fix user authentication issues
router.post('/admin/fix-user-auth', async (req, res) => {
  try {
    const { email } = req.body
    
    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      })
    }

    console.log('[Fix User Auth] Attempting to fix authentication for:', email)

    // Find user in database
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found in database',
        email: email,
        message: 'User needs to be created by admin first'
      })
    }

    const user = result.rows[0]
    
    // Reset user authentication data
    await pool.query(`
      UPDATE users 
      SET 
        azure_id = NULL,
        updated_at = CURRENT_TIMESTAMP,
        is_active = true
      WHERE id = $1
    `, [user.id])

    console.log('[Fix User Auth] ✅ User authentication reset for:', email)

    res.json({
      success: true,
      message: 'User authentication reset successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_active: true
      },
      instructions: 'User should now be able to sign in with Microsoft'
    })

  } catch (error) {
    console.error('[Fix User Auth] ❌ Error:', error)
    res.status(500).json({
      error: 'Failed to fix user authentication',
      message: error.message
    })
  }
})

// Debug endpoint to check user status
router.get('/admin/check-user/:email', async (req, res) => {
  try {
    const { email } = req.params
    
    console.log('[Check User] Checking user status for:', email)

    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    )

    if (result.rows.length === 0) {
      return res.json({
        found: false,
        email: email,
        message: 'User not found in database',
        action: 'User needs to be created by admin'
      })
    }

    const user = result.rows[0]
    
    res.json({
      found: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_active: user.is_active,
        azure_id: user.azure_id ? 'Set' : 'Not set',
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login: user.last_login
      },
      status: user.is_active ? 'Active' : 'Inactive',
      canLogin: user.is_active
    })

  } catch (error) {
    console.error('[Check User] ❌ Error:', error)
    res.status(500).json({
      error: 'Failed to check user status',
      message: error.message
    })
  }
})

// Force refresh user session with current role (for role changes)
router.post('/refresh-session', async (req, res) => {
  try {
    const authHeader = req.headers['authorization']
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Access token required' })
    }

    const token = authHeader.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' })
    }

    // Decode token to get user ID (don't verify expiration for refresh)
    const decoded = jwt.decode(token)
    
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    console.log('[Refresh Session] Refreshing session for user ID:', decoded.id)

    // Get current user data from database
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [decoded.id]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found or inactive',
        message: 'Please sign in again'
      })
    }

    const user = result.rows[0]
    
    console.log('[Refresh Session] ✅ Generating new token with current role:', user.role)

    // Generate new token with current user data from database
    const newToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role, // This will be the CURRENT role from database
        iat: Math.floor(Date.now() / 1000),
        iss: 'secure-vm-portal'
      },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    )

    // Generate new refresh token
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

    res.json({
      success: true,
      token: newToken,
      refreshToken: refreshToken,
      user: responseUser,
      message: 'Session refreshed with current role'
    })

  } catch (error) {
    console.error('[Refresh Session] ❌ Error:', error)
    res.status(500).json({
      error: 'Failed to refresh session',
      message: error.message
    })
  }
})

module.exports = router
