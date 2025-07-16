const { body, param, query } = require('express-validator')

// Initiate connection validation
const validateInitiateConnection = [
  body('vmId')
    .notEmpty()
    .withMessage('VM ID is required')
    .isInt({ min: 1 })
    .withMessage('VM ID must be a positive integer')
    .toInt()
]

// End connection validation
const validateEndConnection = [
  param('sessionId')
    .notEmpty()
    .withMessage('Session ID is required')
    .isLength({ min: 10 })
    .withMessage('Invalid session ID format'),

  body('reason')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Reason must be between 1 and 100 characters')
]

// Session ID parameter validation
const validateSessionId = [
  param('sessionId')
    .notEmpty()
    .withMessage('Session ID is required')
    .isLength({ min: 10 })
    .withMessage('Invalid session ID format')
]

// Connection history validation
const validateConnectionHistory = [
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

  query('vmId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('VM ID must be a positive integer')
    .toInt(),

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
]

// Download file validation
const validateDownloadFile = [
  param('sessionId')
    .notEmpty()
    .withMessage('Session ID is required')
    .isLength({ min: 10 })
    .withMessage('Invalid session ID format'),

  param('type')
    .isIn(['rdp', 'ssh'])
    .withMessage('File type must be either rdp or ssh')
]

module.exports = {
  validateInitiateConnection,
  validateEndConnection,
  validateSessionId,
  validateConnectionHistory,
  validateDownloadFile
}
