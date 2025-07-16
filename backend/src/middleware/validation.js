const { body, param, query, validationResult } = require('express-validator')
const { VALIDATION_PATTERNS } = require('../utils/constants')

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    })
  }
  
  next()
}

// Common validation rules
const validationRules = {
  // Azure token validation
  azureToken: [
    body('azureToken')
      .notEmpty()
      .withMessage('Azure AD token is required')
      .isLength({ min: 100 })
      .withMessage('Invalid Azure AD token format')
  ],

  // Refresh token validation
  refreshToken: [
    body('refreshToken')
      .optional()
      .isLength({ min: 100 })
      .withMessage('Invalid refresh token format')
  ],

  // User profile validation
  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Name must be between 2 and 255 characters')
      .matches(/^[a-zA-Z\s\-'\.]+$/)
      .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods')
  ],

  // API token validation
  createApiToken: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Token name is required')
      .isLength({ min: 3, max: 100 })
      .withMessage('Token name must be between 3 and 100 characters')
      .matches(/^[a-zA-Z0-9\s\-_]+$/)
      .withMessage('Token name can only contain letters, numbers, spaces, hyphens, and underscores'),
    
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array'),
    
    body('permissions.*')
      .optional()
      .isString()
      .withMessage('Each permission must be a string'),
    
    body('expiresIn')
      .optional()
      .matches(/^(\d+)([smhdwy])$/)
      .withMessage('Invalid expiration format. Use format like "1y", "30d", "24h", etc.')
  ],

  // Pagination validation
  pagination: [
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
    
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search term must be between 1 and 100 characters')
  ],

  // ID parameter validation
  idParam: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID must be a positive integer')
      .toInt()
  ],

  // UUID parameter validation
  uuidParam: [
    param('uuid')
      .isUUID()
      .withMessage('Invalid UUID format')
  ],

  // Email validation
  email: [
    body('email')
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail()
      .custom(value => {
        if (!VALIDATION_PATTERNS.EMAIL.test(value)) {
          throw new Error('Invalid email format')
        }
        return true
      })
  ],

  // Role validation
  role: [
    body('role')
      .optional()
      .isIn(['admin', 'employee'])
      .withMessage('Role must be either "admin" or "employee"')
  ],

  // Boolean validation
  boolean: (field) => [
    body(field)
      .optional()
      .isBoolean()
      .withMessage(`${field} must be a boolean value`)
      .toBoolean()
  ],

  // Date validation
  dateRange: [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be in ISO 8601 format')
      .toDate(),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be in ISO 8601 format')
      .toDate()
      .custom((endDate, { req }) => {
        if (req.query.startDate && endDate < new Date(req.query.startDate)) {
          throw new Error('End date must be after start date')
        }
        return true
      })
  ]
}

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return value
        .trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
    }
    return value
  }

  const sanitizeObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject)
    } else if (obj && typeof obj === 'object') {
      const sanitized = {}
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value)
      }
      return sanitized
    }
    return sanitizeValue(obj)
  }

  req.body = sanitizeObject(req.body)
  req.query = sanitizeObject(req.query)
  req.params = sanitizeObject(req.params)

  next()
}

module.exports = {
  validationRules,
  handleValidationErrors,
  sanitizeInput
}
