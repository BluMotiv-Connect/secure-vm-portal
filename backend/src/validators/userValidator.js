const { body, param, query } = require('express-validator')
const { USER_ROLES } = require('../utils/constants')

// Create user validation
const validateCreateUser = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods'),

  body('email')
    .isEmail()
    .withMessage('Valid email address is required')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),

  body('azureId')
    .trim()
    .notEmpty()
    .withMessage('Azure ID is required')
    .isLength({ min: 10, max: 255 })
    .withMessage('Azure ID must be between 10 and 255 characters'),

  body('role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage('Role must be either admin or employee')
]

// Update user validation
const validateUpdateUser = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email address is required')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),

  body('role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage('Role must be either admin or employee'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
]

// User ID parameter validation
const validateUserId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer')
    .toInt()
]

// User search validation
const validateUserSearch = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),

  query('role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage('Role must be either admin or employee'),

  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
    .toBoolean(),

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

  query('sortBy')
    .optional()
    .isIn(['name', 'email', 'role', 'created_at', 'last_login'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
]

// Bulk update validation
const validateBulkUpdate = [
  body('userIds')
    .isArray({ min: 1 })
    .withMessage('User IDs array is required and must not be empty'),

  body('userIds.*')
    .isInt({ min: 1 })
    .withMessage('Each user ID must be a positive integer'),

  body('updates')
    .isObject()
    .withMessage('Updates object is required'),

  body('updates.role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage('Role must be either admin or employee'),

  body('updates.isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
]

module.exports = {
  validateCreateUser,
  validateUpdateUser,
  validateUserId,
  validateUserSearch,
  validateBulkUpdate
}
