const { body, param, query } = require('express-validator')
const { VM_STATUS, OS_TYPES, CONNECTION_TYPES } = require('../utils/constants')

// Create VM validation
const validateCreateVM = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('VM name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('VM name must be between 2 and 255 characters')
    .matches(/^[a-zA-Z0-9\s\-_\.]+$/)
    .withMessage('VM name can only contain letters, numbers, spaces, hyphens, underscores, and periods'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),

  body('ipAddress')
    .notEmpty()
    .withMessage('IP address is required')
    .matches(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)
    .withMessage('Valid IP address is required'),

  body('osType')
    .notEmpty()
    .withMessage('OS type is required')
    .isIn(Object.values(OS_TYPES))
    .withMessage('Invalid OS type'),

  body('osVersion')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('OS version must not exceed 100 characters'),

  body('status')
    .optional()
    .isIn(Object.values(VM_STATUS))
    .withMessage('Invalid status'),

  body('region')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Region must not exceed 100 characters'),

  body('instanceId')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Instance ID must not exceed 255 characters'),

  body('tags')
    .optional()
    .isObject()
    .withMessage('Tags must be an object')
]

// Update VM validation
const validateUpdateVM = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('VM name must be between 2 and 255 characters')
    .matches(/^[a-zA-Z0-9\s\-_\.]+$/)
    .withMessage('VM name can only contain letters, numbers, spaces, hyphens, underscores, and periods'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),

  body('ipAddress')
    .optional()
    .matches(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)
    .withMessage('Valid IP address is required'),

  body('osType')
    .optional()
    .isIn(Object.values(OS_TYPES))
    .withMessage('Invalid OS type'),

  body('osVersion')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('OS version must not exceed 100 characters'),

  body('status')
    .optional()
    .isIn(Object.values(VM_STATUS))
    .withMessage('Invalid status'),

  body('assignedTo')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Assigned user ID must be a positive integer')
    .toInt(),

  body('region')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Region must not exceed 100 characters'),

  body('instanceId')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Instance ID must not exceed 255 characters'),

  body('tags')
    .optional()
    .isObject()
    .withMessage('Tags must be an object')
]

// VM credentials validation
const validateVMCredentials = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Username must be between 1 and 255 characters'),

  body('password')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Password cannot be empty if provided'),

  body('privateKey')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Private key cannot be empty if provided'),

  body('connectionPort')
    .optional()
    .isInt({ min: 1, max: 65535 })
    .withMessage('Connection port must be between 1 and 65535')
    .toInt(),

  body('connectionType')
    .optional()
    .isIn(Object.values(CONNECTION_TYPES))
    .withMessage('Invalid connection type')
]

// VM assignment validation
const validateVMAssignment = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer')
    .toInt()
]

// VM ID parameter validation
const validateVMId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('VM ID must be a positive integer')
    .toInt()
]

// VM search validation
const validateVMSearch = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),

  query('status')
    .optional()
    .isIn(Object.values(VM_STATUS))
    .withMessage('Invalid status filter'),

  query('osType')
    .optional()
    .isIn(Object.values(OS_TYPES))
    .withMessage('Invalid OS type filter'),

  query('assignedTo')
    .optional()
    .custom((value) => {
      if (value === 'unassigned') return true
      if (!isNaN(parseInt(value)) && parseInt(value) > 0) return true
      throw new Error('Invalid assignedTo filter')
    }),

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
    .isIn(['name', 'ip_address', 'os_type', 'status', 'created_at', 'updated_at'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
]

module.exports = {
  validateCreateVM,
  validateUpdateVM,
  validateVMCredentials,
  validateVMAssignment,
  validateVMId,
  validateVMSearch
}
