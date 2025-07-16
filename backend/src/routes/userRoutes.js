const express = require('express')
const UserController = require('../controllers/userController')
const { authenticateToken } = require('../middleware/auth')
const { requireAdmin } = require('../middleware/authorization')
const { handleValidationErrors, sanitizeInput } = require('../middleware/validation')
const {
  validateCreateUser,
  validateUpdateUser,
  validateUserId,
  validateUserSearch,
  validateBulkUpdate
} = require('../validators/userValidator')

const router = express.Router()

// Apply authentication and admin role requirement to all routes
router.use(authenticateToken)
router.use(requireAdmin)
router.use(sanitizeInput)

// GET /api/users - Get all users with pagination and filtering
router.get('/',
  validateUserSearch,
  handleValidationErrors,
  UserController.getUsers
)

// GET /api/users/stats - Get user statistics
router.get('/stats',
  UserController.getUserStats
)

// GET /api/users/:id - Get user by ID
router.get('/:id',
  validateUserId,
  handleValidationErrors,
  UserController.getUserById
)

// POST /api/users - Create new user
router.post('/',
  validateCreateUser,
  handleValidationErrors,
  UserController.createUser
)

// PUT /api/users/:id - Update user
router.put('/:id',
  validateUserId,
  validateUpdateUser,
  handleValidationErrors,
  UserController.updateUser
)

// DELETE /api/users/:id - Delete user (soft delete)
router.delete('/:id',
  validateUserId,
  handleValidationErrors,
  UserController.deleteUser
)

// POST /api/users/:id/restore - Restore deleted user
router.post('/:id/restore',
  validateUserId,
  handleValidationErrors,
  UserController.restoreUser
)

// PATCH /api/users/bulk - Bulk update users
router.patch('/bulk',
  validateBulkUpdate,
  handleValidationErrors,
  UserController.bulkUpdateUsers
)

module.exports = router
