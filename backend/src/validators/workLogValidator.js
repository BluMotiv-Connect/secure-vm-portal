const { body, param, query } = require('express-validator')
const { WORK_LOG_TYPES } = require('../utils/constants')

// Start work session validation
const validateStartWorkSession = [
  body('vmId')
    .notEmpty()
    .withMessage('VM ID is required')
    .isInt({ min: 1 })
    .withMessage('VM ID must be a positive integer')
    .toInt(),

  body('sessionId')
    .optional()
    .isLength({ min: 10 })
    .withMessage('Invalid session ID format'),

  body('taskTitle')
    .trim()
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Task title must be between 3 and 255 characters'),

  body('taskDescription')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Task description must not exceed 1000 characters'),

  body('workType')
    .optional()
    .isIn(Object.values(WORK_LOG_TYPES))
    .withMessage('Invalid work type'),

  body('isBillable')
    .optional()
    .isBoolean()
    .withMessage('isBillable must be a boolean value')
    .toBoolean()
]

// Update work log validation
const validateUpdateWorkLog = [
  body('taskTitle')
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Task title must be between 3 and 255 characters'),

  body('taskDescription')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Task description must not exceed 1000 characters'),

  body('workType')
    .optional()
    .isIn(Object.values(WORK_LOG_TYPES))
    .withMessage('Invalid work type'),

  body('endTime')
    .optional()
    .isISO8601()
    .withMessage('End time must be in ISO 8601 format')
    .toDate(),

  body('isBillable')
    .optional()
    .isBoolean()
    .withMessage('isBillable must be a boolean value')
    .toBoolean()
]

// End work session validation
const validateEndWorkSession = [
  body('endTime')
    .optional()
    .isISO8601()
    .withMessage('End time must be in ISO 8601 format')
    .toDate()
]

// Non-work log validation
const validateNonWorkLog = [
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason is required')
    .isLength({ min: 3, max: 500 })
    .withMessage('Reason must be between 3 and 500 characters'),

  body('startTime')
    .isISO8601()
    .withMessage('Start time must be in ISO 8601 format')
    .toDate(),

  body('endTime')
    .optional()
    .isISO8601()
    .withMessage('End time must be in ISO 8601 format')
    .toDate()
    .custom((endTime, { req }) => {
      if (endTime && req.body.startTime && new Date(endTime) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time')
      }
      return true
    })
]

// Work log ID parameter validation
const validateWorkLogId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Work log ID must be a positive integer')
    .toInt()
]

// Work log search validation
const validateWorkLogSearch = [
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

  query('workType')
    .optional()
    .isIn(Object.values(WORK_LOG_TYPES))
    .withMessage('Invalid work type'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in ISO 8601 format')
    .toDate(),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be in ISO 8601 format')
    .toDate(),

  query('isBillable')
    .optional()
    .isBoolean()
    .withMessage('isBillable must be a boolean value')
    .toBoolean(),

  query('sortBy')
    .optional()
    .isIn(['start_time', 'end_time', 'duration_minutes', 'task_title', 'work_type'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
]

// Date range validation
const validateDateRange = [
  query('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be in ISO 8601 format')
    .toDate(),

  query('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be in ISO 8601 format')
    .toDate()
    .custom((endDate, { req }) => {
      if (endDate && req.query.startDate && new Date(endDate) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date')
      }
      return true
    })
]

module.exports = {
  validateStartWorkSession,
  validateUpdateWorkLog,
  validateEndWorkSession,
  validateNonWorkLog,
  validateWorkLogId,
  validateWorkLogSearch,
  validateDateRange
}
