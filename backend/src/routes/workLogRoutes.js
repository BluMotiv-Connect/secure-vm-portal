const express = require('express')
const WorkLogController = require('../controllers/workLogController')
const { authenticateToken } = require('../middleware/auth')
const { requireEmployee, requireAdmin } = require('../middleware/authorization')
const { handleValidationErrors, sanitizeInput } = require('../middleware/validation')
const {
  validateStartWorkSession,
  validateUpdateWorkLog,
  validateEndWorkSession,
  validateNonWorkLog,
  validateWorkLogId,
  validateWorkLogSearch,
  validateDateRange
} = require('../validators/workLogValidator')

const router = express.Router()

// Apply authentication to all routes
router.use(authenticateToken)
router.use(requireEmployee)
router.use(sanitizeInput)

// POST /api/work-logs/start - Start work session
router.post('/start',
  validateStartWorkSession,
  handleValidationErrors,
  WorkLogController.startWorkSession
)

// POST /api/work-logs/:id/end - End work session
router.post('/:id/end',
  validateWorkLogId,
  validateEndWorkSession,
  handleValidationErrors,
  WorkLogController.endWorkSession
)

// GET /api/work-logs/active - Get active work log
router.get('/active',
  WorkLogController.getActiveWorkLog
)

// GET /api/work-logs - Get work logs with filtering
router.get('/',
  validateWorkLogSearch,
  handleValidationErrors,
  WorkLogController.getWorkLogs
)

// GET /api/work-logs/summary - Get work summary
router.get('/summary',
  validateDateRange,
  handleValidationErrors,
  WorkLogController.getWorkSummary
)

// GET /api/work-logs/time-tracking - Get time tracking data
router.get('/time-tracking',
  validateDateRange,
  handleValidationErrors,
  WorkLogController.getTimeTracking
)

// GET /api/work-logs/stats - Get work statistics
router.get('/stats',
  WorkLogController.getWorkStats
)

// GET /api/work-logs/report - Generate time report
router.get('/report',
  validateDateRange,
  handleValidationErrors,
  WorkLogController.generateTimeReport
)

// GET /api/work-logs/:id - Get work log by ID
router.get('/:id',
  validateWorkLogId,
  handleValidationErrors,
  WorkLogController.getWorkLogById
)

// PUT /api/work-logs/:id - Update work log
router.put('/:id',
  validateWorkLogId,
  validateUpdateWorkLog,
  handleValidationErrors,
  WorkLogController.updateWorkLog
)

// DELETE /api/work-logs/:id - Delete work log
router.delete('/:id',
  validateWorkLogId,
  handleValidationErrors,
  WorkLogController.deleteWorkLog
)

// POST /api/work-logs/non-work - Log non-work time
router.post('/non-work',
  validateNonWorkLog,
  handleValidationErrors,
  WorkLogController.logNonWorkTime
)

module.exports = router
