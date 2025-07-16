const WorkLog = require('../models/WorkLog')
const logger = require('../utils/logger')

// Middleware to check work log access permissions
const checkWorkLogAccess = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user.role

    // Admin can access all work logs
    if (userRole === 'admin') {
      return next()
    }

    // For non-admin users, check if they own the work log
    if (id) {
      const workLog = await WorkLog.findById(id)
      
      if (!workLog) {
        return res.status(404).json({
          error: 'Work log not found',
          code: 'WORK_LOG_NOT_FOUND'
        })
      }

      if (workLog.userId !== userId) {
        logger.security('Unauthorized work log access attempt', {
          userId,
          requestedWorkLogId: id,
          workLogOwnerId: workLog.userId,
          ip: req.ip,
          severity: 'medium'
        })

        return res.status(403).json({
          error: 'Access denied - you can only access your own work logs',
          code: 'WORK_LOG_ACCESS_DENIED'
        })
      }
    }

    next()
  } catch (error) {
    logger.error('Work log access check failed:', error)
    res.status(500).json({
      error: 'Failed to verify work log access',
      code: 'WORK_LOG_ACCESS_CHECK_FAILED'
    })
  }
}

// Middleware to check if user can create work logs
const checkWorkLogCreation = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { vmId } = req.body

    // Check if user has an active work log
    const activeWorkLog = await WorkLog.getActiveWorkLog(userId)
    if (activeWorkLog) {
      return res.status(409).json({
        error: 'You already have an active work session. Please end it first.',
        code: 'ACTIVE_WORK_SESSION_EXISTS',
        activeWorkLog: {
          id: activeWorkLog.id,
          taskTitle: activeWorkLog.taskTitle,
          vmName: activeWorkLog.vmName,
          startTime: activeWorkLog.startTime
        }
      })
    }

    // Additional validation can be added here
    // e.g., check VM assignment, working hours, etc.

    next()
  } catch (error) {
    logger.error('Work log creation check failed:', error)
    res.status(500).json({
      error: 'Failed to verify work log creation permissions',
      code: 'WORK_LOG_CREATION_CHECK_FAILED'
    })
  }
}

// Middleware to validate work log data
const validateWorkLogData = (req, res, next) => {
  const { taskTitle, workType, vmId } = req.body

  const errors = []

  if (!taskTitle || taskTitle.trim().length === 0) {
    errors.push('Task title is required')
  }

  if (taskTitle && taskTitle.length > 255) {
    errors.push('Task title must not exceed 255 characters')
  }

  if (!vmId || !Number.isInteger(vmId) || vmId <= 0) {
    errors.push('Valid VM ID is required')
  }

  if (workType && !['work', 'break', 'meeting', 'training', 'other'].includes(workType)) {
    errors.push('Invalid work type')
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'WORK_LOG_VALIDATION_FAILED',
      details: errors
    })
  }

  next()
}

module.exports = {
  checkWorkLogAccess,
  checkWorkLogCreation,
  validateWorkLogData
}
