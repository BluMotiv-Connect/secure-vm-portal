const express = require('express')
const VMController = require('../controllers/vmController')
const { authenticateToken } = require('../middleware/auth')
const { requireAdmin, requireEmployee } = require('../middleware/authorization')
const { handleValidationErrors, sanitizeInput } = require('../middleware/validation')
const {
  validateCreateVM,
  validateUpdateVM,
  validateVMCredentials,
  validateVMAssignment,
  validateVMId,
  validateVMSearch
} = require('../validators/vmValidator')

const router = express.Router()

// Apply authentication to all routes
router.use(authenticateToken)
router.use(sanitizeInput)

// Employee routes - VMs assigned to current user
router.get('/my-vms',
  requireEmployee,
  VMController.getMyVMs
)

// Admin routes - full VM management
router.use(requireAdmin)

// GET /api/vms - Get all VMs with pagination and filtering
router.get('/',
  validateVMSearch,
  handleValidationErrors,
  VMController.getVMs
)

// GET /api/vms/stats - Get VM statistics
router.get('/stats',
  VMController.getVMStats
)

// GET /api/vms/:id - Get VM by ID
router.get('/:id',
  validateVMId,
  handleValidationErrors,
  VMController.getVMById
)

// POST /api/vms - Create new VM
router.post('/',
  validateCreateVM,
  handleValidationErrors,
  VMController.createVM
)

// PUT /api/vms/:id - Update VM
router.put('/:id',
  validateVMId,
  validateUpdateVM,
  handleValidationErrors,
  VMController.updateVM
)

// DELETE /api/vms/:id - Delete VM
router.delete('/:id',
  validateVMId,
  handleValidationErrors,
  VMController.deleteVM
)

// POST /api/vms/:id/assign - Assign VM to user
router.post('/:id/assign',
  validateVMId,
  validateVMAssignment,
  handleValidationErrors,
  VMController.assignVM
)

// POST /api/vms/:id/unassign - Unassign VM
router.post('/:id/unassign',
  validateVMId,
  handleValidationErrors,
  VMController.unassignVM
)

// POST /api/vms/:id/credentials - Set VM credentials
router.post('/:id/credentials',
  validateVMId,
  validateVMCredentials,
  handleValidationErrors,
  VMController.setVMCredentials
)

// GET /api/vms/:id/credentials - Get VM credentials
router.get('/:id/credentials',
  validateVMId,
  handleValidationErrors,
  VMController.getVMCredentials
)

// POST /api/vms/:id/test-credentials - Test VM credentials
router.post('/:id/test-credentials',
  validateVMId,
  validateVMCredentials,
  handleValidationErrors,
  VMController.testVMCredentials
)

// GET /api/vms/:id/test-connectivity - Test VM connectivity
router.get('/:id/test-connectivity',
  validateVMId,
  handleValidationErrors,
  VMController.testVMConnectivity
)

// VM Usage Routes
router.get('/usage/vm/:vmId', auth, async (req, res) => {
  try {
    const { vmId } = req.params;
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const stats = await vmService.getVMUsageStats(vmId, startDate, new Date());
    res.json(stats);
  } catch (error) {
    console.error('Error fetching VM usage stats:', error);
    res.status(500).json({ error: 'Failed to fetch VM usage statistics' });
  }
});

router.get('/usage/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const usage = await vmService.getUserVMUsage(userId, startDate, new Date());
    res.json(usage);
  } catch (error) {
    console.error('Error fetching user VM usage:', error);
    res.status(500).json({ error: 'Failed to fetch user VM usage data' });
  }
});

router.get('/usage/summary', auth, async (req, res) => {
  try {
    const summary = await vmService.getVMUsageSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error fetching VM usage summary:', error);
    res.status(500).json({ error: 'Failed to fetch VM usage summary' });
  }
});

module.exports = router
