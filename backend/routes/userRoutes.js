const express = require('express')
const { pool } = require('../config/database')
const router = express.Router()

// Middleware to verify admin role
const requireAdmin = (req, res, next) => {
  console.log('[Admin Check] Headers received:', req.headers)
  console.log('[Admin Check] User from middleware:', req.user)
  
  if (!req.user) {
    console.log('[Admin Check] ❌ User not authenticated - req.user is undefined')
    return res.status(401).json({ error: 'User not authenticated' })
  }
  
  if (req.user.role !== 'admin') {
    console.log('[Admin Check] ❌ Admin access required - user role:', req.user.role)
    return res.status(403).json({ 
      error: 'Admin access required',
      userRole: req.user.role 
    })
  }
  
  console.log('[Admin Check] ✅ Admin access granted for:', req.user.email)
  next()
}

// Debug endpoint to test authentication
router.get('/debug', async (req, res) => {
  console.log('[Debug] Full request headers:', req.headers)
  console.log('[Debug] Authorization header:', req.headers.authorization)
  console.log('[Debug] User from middleware:', req.user)
  
  res.json({
    success: true,
    message: 'Debug endpoint reached',
    headers: {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      contentType: req.headers['content-type']
    },
    user: req.user || null,
    timestamp: new Date().toISOString()
  })
})

// Health check endpoint for database
router.get('/health', async (req, res) => {
  try {
    // Test the mock database
    const result = await pool.query('SELECT COUNT(*) FROM users')
    
    res.json({
      success: true,
      database: 'connected',
      userCount: parseInt(result.rows[0].count || 0),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Health Check] Database error:', error)
    res.status(500).json({
      success: false,
      database: 'disconnected',
      error: error.message
    })
  }
})

// Get all users (with enhanced error handling and debugging)
router.get('/', requireAdmin, async (req, res) => {
  try {
    console.log('[Get Users] Fetching users from database for admin:', req.user.email)
    console.log('[Get Users] Admin user details:', req.user)
    
    const result = await pool.query(`
      SELECT 
        id,
        azure_id,
        email,
        name,
        role,
        is_active,
        created_at,
        updated_at
      FROM users 
      ORDER BY created_at DESC
    `)

    console.log(`[Get Users] ✅ Found ${result.rows.length} users in database`)
    console.log('[Get Users] Users data:', result.rows)

    res.json({
      success: true,
      users: result.rows,
      total: result.rows.length,
      requestedBy: req.user.email
    })
  } catch (error) {
    console.error('[Get Users] ❌ Database error:', error)
    
    // Provide specific error messages
    let errorMessage = 'Failed to fetch users'
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Database connection refused. Please ensure database is running.'
    } else if (error.code === '3D000') {
      errorMessage = 'Database does not exist. Please create the database.'
    } else if (error.code === '42P01') {
      errorMessage = 'Users table does not exist. Please run database initialization.'
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: error.message,
      code: error.code
    })
  }
})

// Create new user (real database insert)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { azure_id, email, name, role = 'employee', is_active = true } = req.body

    console.log('[Create User] Creating new user:', { email, name, role })
    console.log('[Create User] Request body:', req.body)
    console.log('[Create User] Created by admin:', req.user.email)

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existingUser.rows.length > 0) {
      console.log('[Create User] ❌ User already exists:', email)
      return res.status(409).json({ error: 'User with this email already exists' })
    }

    // Insert new user
    const result = await pool.query(`
      INSERT INTO users (azure_id, email, name, role, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [azure_id || null, email, name, role, is_active])

    console.log('[Create User] ✅ User created successfully:', result.rows[0])

    res.json({
      success: true,
      user: result.rows[0],
      message: 'User created successfully'
    })
  } catch (error) {
    console.error('[Create User] ❌ Error:', error)
    if (error.code === '23505') {
      res.status(409).json({ error: 'User with this email already exists' })
    } else {
      res.status(500).json({ 
        error: 'Failed to create user',
        details: error.message 
      })
    }
  }
})

// Update user (real database update)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { email, name, role, is_active } = req.body

    console.log('[Update User] Updating user:', { id, email, name, role, is_active })
    console.log('[Update User] Updated by admin:', req.user.email)

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // Check if user exists
    const userExists = await pool.query('SELECT id FROM users WHERE id = $1', [id])
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check if email is taken by another user
    const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id])
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already taken by another user' })
    }

    // Update user
    const result = await pool.query(`
      UPDATE users 
      SET email = $1, name = $2, role = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [email, name, role, is_active, id])

    console.log('[Update User] ✅ User updated successfully:', result.rows[0])

    res.json({
      success: true,
      user: result.rows[0],
      message: 'User updated successfully'
    })
  } catch (error) {
    console.error('[Update User] ❌ Error:', error)
    if (error.code === '23505') {
      res.status(409).json({ error: 'Email already exists' })
    } else {
      res.status(500).json({ 
        error: 'Failed to update user',
        details: error.message 
      })
    }
  }
})

// Delete user (real database delete)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    console.log('[Delete User] Deleting user:', id)
    console.log('[Delete User] Deleted by admin:', req.user.email)

    // Check if user exists
    const userExists = await pool.query('SELECT id, email FROM users WHERE id = $1', [id])
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Don't allow deleting the current admin user
    if (userExists.rows[0].email === req.user.email) {
      return res.status(400).json({ error: 'Cannot delete your own account' })
    }

    // Delete user
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id])

    console.log('[Delete User] ✅ User deleted successfully:', result.rows[0])

    res.json({
      success: true,
      message: 'User deleted successfully',
      deletedUser: result.rows[0]
    })
  } catch (error) {
    console.error('[Delete User] ❌ Error:', error)
    res.status(500).json({ 
      error: 'Failed to delete user',
      details: error.message 
    })
  }
})

// Get user by ID (real database query)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    console.log('[Get User] Fetching user by ID:', id)

    const result = await pool.query(`
      SELECT 
        id,
        azure_id,
        email,
        name,
        role,
        is_active,
        created_at,
        updated_at
      FROM users 
      WHERE id = $1
    `, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    console.log('[Get User] ✅ User found:', result.rows[0])

    res.json({
      success: true,
      user: result.rows[0]
    })
  } catch (error) {
    console.error('[Get User] ❌ Error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch user',
      details: error.message 
    })
  }
})

// Get current user info
router.get('/me', async (req, res) => {
  try {
    console.log('[Get Me] Current user request from:', req.user?.email)
    
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    res.json({
      success: true,
      user: req.user
    })
  } catch (error) {
    console.error('[Get Me] ❌ Error:', error)
    res.status(500).json({ 
      error: 'Failed to get current user',
      details: error.message 
    })
  }
})

module.exports = router
