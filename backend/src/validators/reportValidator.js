const { body, param, query } = require('express-validator')

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
      const daysDiff = (new Date(endDate) - new Date(req.query.startDate)) / (1000 * 60 * 60 * 24)
      if (daysDiff > 365) {
        throw new Error('Date range cannot exceed 365 days')
      }
      return true
    })
]

// Time report validation
const validateTimeReport = [
  ...validateDateRange,
  
  query('userIds')
    .optional()
    .custom((value) => {
      if (value) {
        const ids = value.split(',')
        if (ids.some(id => isNaN(parseInt(id)) || parseInt(id) <= 0)) {
          throw new Error('All user IDs must be positive integers')
        }
      }
      return true
    }),

  query('vmIds')
    .optional()
    .custom((value) => {
      if (value) {
        const ids = value.split(',')
        if (ids.some(id => isNaN(parseInt(id)) || parseInt(id) <= 0)) {
          throw new Error('All VM IDs must be positive integers')
        }
      }
      return true
    }),

  query('workTypes')
    .optional()
    .custom((value) => {
      if (value) {
        const types = value.split(',')
        const validTypes = ['work', 'break', 'meeting', 'training', 'other']
        if (types.some(type => !validTypes.includes(type))) {
          throw new Error('Invalid work type')
        }
      }
      return true
    }),

  query('includeNonWork')
    .optional()
    .isBoolean()
    .withMessage('includeNonWork must be a boolean value')
    .toBoolean(),

  query('groupBy')
    .optional()
    .isIn(['user', 'vm', 'date', 'workType', 'userDate', 'vmDate'])
    .withMessage('Invalid groupBy value'),

  query('format')
    .optional()
    .isIn(['json', 'excel'])
    .withMessage('Format must be json or excel')
]

// User productivity report validation
const validateUserProductivityReport = [
  ...validateDateRange,
  
  query('userIds')
    .optional()
    .custom((value) => {
      if (value) {
        const ids = value.split(',')
        if (ids.some(id => isNaN(parseInt(id)) || parseInt(id) <= 0)) {
          throw new Error('All user IDs must be positive integers')
        }
      }
      return true
    }),

  query('format')
    .optional()
    .isIn(['json', 'excel'])
    .withMessage('Format must be json or excel')
]

// VM usage report validation
const validateVMUsageReport = [
  ...validateDateRange,
  
  query('vmIds')
    .optional()
    .custom((value) => {
      if (value) {
        const ids = value.split(',')
        if (ids.some(id => isNaN(parseInt(id)) || parseInt(id) <= 0)) {
          throw new Error('All VM IDs must be positive integers')
        }
      }
      return true
    }),

  query('format')
    .optional()
    .isIn(['json', 'excel'])
    .withMessage('Format must be json or excel')
]

// Report template validation
const validateReportTemplate = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Report name is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Report name must be between 3 and 255 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),

  body('type')
    .notEmpty()
    .withMessage('Report type is required')
    .isIn(['time', 'productivity', 'vmUsage', 'summary'])
    .withMessage('Invalid report type'),

  body('parameters')
    .optional()
    .isObject()
    .withMessage('Parameters must be an object'),

  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean value')
    .toBoolean()
]

// Report template ID validation
const validateReportTemplateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Report template ID must be a positive integer')
    .toInt()
]

module.exports = {
  validateTimeReport,
  validateUserProductivityReport,
  validateVMUsageReport,
  validateDateRange,
  validateReportTemplate,
  validateReportTemplateId
}
