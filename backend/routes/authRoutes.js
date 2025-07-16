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
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
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

// Logout endpoint
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  })
})

module.exports = router
