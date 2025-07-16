const express = require('express')
const ConnectionController = require('../controllers/connectionController')
const { authenticateToken } = require('../middleware/auth')
const { requireEmployee } = require('../middleware/authorization')
const { checkVMAccess, checkVMAvailability } = require('../middleware/vmAccess')
const { handleValidationErrors, sanitizeInput } = require('../middleware/validation')
const {
  validateInitiateConnection,
  validateEndConnection,
  validateSessionId,
  validateConnectionHistory,
  validateDownloadFile
} = require('../validators/connectionValidator')

const router = express.Router()

// Apply authentication to all routes
router.use(authenticateToken)
router.use(requireEmployee)
router.use(sanitizeInput)

// POST /api/connections/initiate - Initiate VM connection
router.post('/initiate',
  validateInitiateConnection,
  handleValidationErrors,
  ConnectionController.initiateConnection
)

// POST /api/connections/:sessionId/end - End VM connection
router.post('/:sessionId/end',
  validateEndConnection,
  handleValidationErrors,
  ConnectionController.endConnection
)

// GET /api/connections/active - Get active connections
router.get('/active',
  ConnectionController.getActiveConnections
)

// GET /api/connections/history - Get connection history
router.get('/history',
  validateConnectionHistory,
  handleValidationErrors,
  ConnectionController.getConnectionHistory
)

// GET /api/connections/:sessionId/monitor - Monitor session
router.get('/:sessionId/monitor',
  validateSessionId,
  handleValidationErrors,
  ConnectionController.monitorSession
)

// GET /api/connections/:sessionId/download/:type - Download connection files
router.get('/:sessionId/download/:type',
  validateDownloadFile,
  handleValidationErrors,
  ConnectionController.downloadConnectionFiles
)

// GET /api/connections/stats - Get connection statistics
router.get('/stats',
  ConnectionController.getConnectionStats
)

// GET /api/connections/:sessionId/browser-status - Get browser connection status
router.get('/:sessionId/browser-status',
  validateSessionId,
  handleValidationErrors,
  ConnectionController.getBrowserConnectionStatus
)

// POST /api/connections/:sessionId/force-end - Force end browser connection
router.post('/:sessionId/force-end',
  validateSessionId,
  handleValidationErrors,
  ConnectionController.forceEndBrowserConnection
)

module.exports = router
