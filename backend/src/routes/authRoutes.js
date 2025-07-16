const express = require('express')
const AuthController = require('../controllers/authController')
const { authenticateToken, optionalAuth } = require('../middleware/auth')
const { requireRole, requireAdmin } = require('../middleware/authorization')
const { validationRules, handleValidationErrors, sanitizeInput } = require('../middleware/validation')
const { 
  validateAzureAuth, 
  validateTokenRefresh, 
  validateProfileUpdate,
  validateApiTokenCreation 
} = require('../validators/authValidator')

const router = express.Router()

// Apply sanitization to all routes
router.use(sanitizeInput)

// Public routes (no authentication required)

// POST /api/auth/azure - Authenticate with Azure AD
router.post('/azure',
  validateAzureAuth,
  handleValidationErrors,
  AuthController.authenticateAzure
)

// POST /api/auth/refresh - Refresh access token
router.post('/refresh',
  validateTokenRefresh,
  handleValidationErrors,
  AuthController.refreshToken
)

// GET /api/auth/validate - Validate token (for internal services)
router.get('/validate',
  optionalAuth,
  AuthController.validateToken
)

// Protected routes (authentication required)

// GET /api/auth/profile - Get current user profile
router.get('/profile',
  authenticateToken,
  AuthController.getProfile
)

// PUT /api/auth/profile - Update user profile
router.put('/profile',
  authenticateToken,
  validateProfileUpdate,
  handleValidationErrors,
  AuthController.updateProfile
)

// POST /api/auth/logout - Logout user
router.post('/logout',
  authenticateToken,
  AuthController.logout
)

// API Token management routes

// GET /api/auth/api-tokens - Get user's API tokens
router.get('/api-tokens',
  authenticateToken,
  AuthController.getApiTokens
)

// POST /api/auth/api-tokens - Generate new API token
router.post('/api-tokens',
  authenticateToken,
  validateApiTokenCreation,
  handleValidationErrors,
  AuthController.generateApiToken
)

// DELETE /api/auth/api-tokens/:tokenId - Revoke API token
router.delete('/api-tokens/:tokenId',
  authenticateToken,
  validationRules.uuidParam,
  handleValidationErrors,
  AuthController.revokeApiToken
)

module.exports = router
