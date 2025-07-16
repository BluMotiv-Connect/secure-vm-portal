const { body, query } = require('express-validator')
const { VALIDATION_PATTERNS, USER_ROLES } = require('../utils/constants')

// Azure authentication validation
const validateAzureAuth = [
  body('azureToken')
    .notEmpty()
    .withMessage('Azure AD token is required')
    .isString()
    .withMessage('Azure AD token must be a string')
    .isLength({ min: 50 })
    .withMessage('Invalid Azure AD token format'),
]

// Token refresh validation
const validateTokenRefresh = [
  body('refreshToken')
    .optional()
    .isString()
    .withMessage('Refresh token must be a string')
    .isLength({ min: 50 })
    .withMessage('Invalid refresh token format'),
]

// Profile update validation
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Name contains invalid characters')
    .custom((value) => {
      // Check for excessive whitespace
      if (value.includes('  ')) {
        throw new Error('Name cannot contain multiple consecutive spaces')
      }
      return true
    }),
]

// API token creation validation
const validateApiTokenCreation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Token name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Token name must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Token name can only contain letters, numbers, spaces, hyphens, and underscores')
    .custom((value) => {
      // Check for reserved names
      const reservedNames = ['admin', 'system', 'api', 'token', 'auth']
      if (reservedNames.some(reserved => value.toLowerCase().includes(reserved))) {
        throw new Error('Token name cannot contain reserved words')
      }
      return true
    }),

  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array')
    .custom((permissions) => {
      const validPermissions = [
        'read:users', 'write:users', 'delete:users',
        'read:vms', 'write:vms', 'delete:vms',
        'read:sessions', 'write:sessions', 'terminate:sessions',
        'read:reports', 'export:reports',
        'read:audit'
      ]
      
      const invalidPermissions = permissions.filter(p => !validPermissions.includes(p))
      if (invalidPermissions.length > 0) {
        throw new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`)
      }
      return true
    }),

  body('expiresIn')
    .optional()
    .matches(/^(\d+)([smhdwy])$/)
    .withMessage('Invalid expiration format. Use format like "1y", "30d", "24h", etc.')
    .custom((value) => {
      const match = value.match(/^(\d+)([smhdwy])$/)
      if (match) {
        const [, amount, unit] = match
        const maxValues = { s: 86400, m: 1440, h: 24, d: 365, w: 52, y: 5 }
        
        if (parseInt(amount) > maxValues[unit]) {
          throw new Error(`Expiration too long. Maximum: ${maxValues[unit]}${unit}`)
        }
      }
      return true
    }),
]

// User search validation
// User search validation
const validateUserSearch = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s@\.\-_]+$/)
    .withMessage('Search term contains invalid characters'),

  query('role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage('Invalid role filter'),

  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
    .toBoolean(),
]

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
]

module.exports = {
  validateAzureAuth,
  validateTokenRefresh,
  validateProfileUpdate,
  validateApiTokenCreation,
  validateUserSearch,
  validatePagination
}

