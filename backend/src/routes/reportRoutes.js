const express = require('express')
const ReportController = require('../controllers/reportController')
const { authenticateToken } = require('../middleware/auth')
const { requireAdmin } = require('../middleware/authorization')
const { handleValidationErrors, sanitizeInput } = require('../middleware/validation')
const {
  validateTimeReport,
  validateUserProductivityReport,
  validateVMUsageReport,
  validateDateRange,
  validateReportTemplate,
  validateReportTemplateId
} = require('../validators/reportValidator')

const router = express.Router()

// Apply authentication and admin role requirement to all routes
router.use(authenticateToken)
router.use(requireAdmin)
router.use(sanitizeInput)

// GET /api/reports/time - Generate time report
router.get('/time',
  validateTimeReport,
  handleValidationErrors,
  ReportController.generateTimeReport
)

// GET /api/reports/user-productivity - Generate user productivity report
router.get('/user-productivity',
  validateUserProductivityReport,
  handleValidationErrors,
  ReportController.generateUserProductivityReport
)

// GET /api/reports/vm-usage - Generate VM usage report
router.get('/vm-usage',
  validateVMUsageReport,
  handleValidationErrors,
  ReportController.generateVMUsageReport
)

// GET /api/reports/summary - Generate summary report
router.get('/summary',
  validateDateRange,
  handleValidationErrors,
  ReportController.generateSummaryReport
)

// GET /api/reports/templates - Get report templates
router.get('/templates',
  ReportController.getReportTemplates
)

// POST /api/reports/templates - Create report template
router.post('/templates',
  validateReportTemplate,
  handleValidationErrors,
  ReportController.createReportTemplate
)

// PUT /api/reports/templates/:id - Update report template
router.put('/templates/:id',
  validateReportTemplateId,
  validateReportTemplate,
  handleValidationErrors,
  ReportController.updateReportTemplate
)

// DELETE /api/reports/templates/:id - Delete report template
router.delete('/templates/:id',
  validateReportTemplateId,
  handleValidationErrors,
  ReportController.deleteReportTemplate
)

module.exports = router
