const User = require('../models/User')
const { validationResult } = require('express-validator')
const logger = require('../utils/logger')
const { getClientIP, parsePagination, buildPaginationResponse } = require('../utils/helpers')
const { USER_ROLES } = require('../utils/constants')

class UserController {
  // Get all users with pagination and filtering
  static async getUsers(req, res) {
    try {
      const { page, limit, offset } = parsePagination(req.query)
      const { search, role, isActive, sortBy = 'created_at', sortOrder = 'desc' } = req.query

      const options = {
        page,
        limit,
        search,
        role,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        sortBy,
        sortOrder
      }

      const result = await User.findAll(options)

      logger.audit('USERS_FETCHED', {
        requestedBy: req.user.id,
        filters: { search, role, isActive },
        resultCount: result.users.length,
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        ...result
      })
    } catch (error) {
      logger.error('Failed to fetch users:', error)
      res.status(500).json({
        error: 'Failed to fetch users',
        code: 'USERS_FETCH_FAILED'
      })
    }
  }

  // Get user by ID
  static async getUserById(req, res) {
    try {
      const { id } = req.params
      const user = await User.findById(id)

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
      }

      // Get additional user data
      const assignedVMs = await user.getAssignedVMs()
      const activeSessions = await user.getActiveSessions()
      const workLogsSummary = await user.getWorkLogsSummary(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        new Date()
      )

      logger.audit('USER_DETAILS_VIEWED', {
        viewedBy: req.user.id,
        targetUserId: user.id,
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        user: user.toJSON(),
        assignedVMs,
        activeSessions,
        workLogsSummary
      })
    } catch (error) {
      logger.error('Failed to fetch user:', error)
      res.status(500).json({
        error: 'Failed to fetch user',
        code: 'USER_FETCH_FAILED'
      })
    }
  }

  // Create new user
  static async createUser(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const { name, email, azureId, role = USER_ROLES.EMPLOYEE } = req.body

      // Check if user already exists
      const existingUser = await User.findByEmail(email)
      if (existingUser) {
        return res.status(409).json({
          error: 'User with this email already exists',
          code: 'USER_EXISTS'
        })
      }

      const existingAzureUser = await User.findByAzureId(azureId)
      if (existingAzureUser) {
        return res.status(409).json({
          error: 'User with this Azure ID already exists',
          code: 'AZURE_USER_EXISTS'
        })
      }

      const user = await User.create({
        name,
        email,
        azureId,
        role
      })

      logger.audit('USER_CREATED', {
        createdBy: req.user.id,
        newUserId: user.id,
        userData: { name, email, role },
        ip: getClientIP(req)
      })

      res.status(201).json({
        success: true,
        user: user.toJSON(),
        message: 'User created successfully'
      })
    } catch (error) {
      logger.error('Failed to create user:', error)
      res.status(500).json({
        error: 'Failed to create user',
        code: 'USER_CREATION_FAILED'
      })
    }
  }

  // Update user
  static async updateUser(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const { id } = req.params
      const { name, email, role, isActive } = req.body

      const user = await User.findById(id)
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
      }

      // Check if email is already taken by another user
      if (email && email !== user.email) {
        const existingUser = await User.findByEmail(email)
        if (existingUser && existingUser.id !== user.id) {
          return res.status(409).json({
            error: 'Email already taken by another user',
            code: 'EMAIL_TAKEN'
          })
        }
      }

      const updates = {}
      if (name !== undefined) updates.name = name
      if (email !== undefined) updates.email = email
      if (role !== undefined) updates.role = role
      if (isActive !== undefined) updates.is_active = isActive

      await user.update(updates)

      logger.audit('USER_UPDATED', {
        updatedBy: req.user.id,
        targetUserId: user.id,
        changes: updates,
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        user: user.toJSON(),
        message: 'User updated successfully'
      })
    } catch (error) {
      logger.error('Failed to update user:', error)
      res.status(500).json({
        error: 'Failed to update user',
        code: 'USER_UPDATE_FAILED'
      })
    }
  }

  // Delete user (soft delete)
  static async deleteUser(req, res) {
    try {
      const { id } = req.params

      const user = await User.findById(id)
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
      }

      // Prevent self-deletion
      if (user.id === req.user.id) {
        return res.status(400).json({
          error: 'Cannot delete your own account',
          code: 'SELF_DELETE_FORBIDDEN'
        })
      }

      try {
        await user.deactivate()

        logger.audit('USER_DELETED', {
          deletedBy: req.user.id,
          targetUserId: user.id,
          targetUserEmail: user.email,
          ip: getClientIP(req)
        })

        res.json({
          success: true,
          message: 'User deleted successfully'
        })
      } catch (deactivateError) {
        // Handle specific deactivation errors
        logger.error('Failed to deactivate user:', deactivateError)
        
        return res.status(400).json({
          error: deactivateError.message || 'Failed to deactivate user',
          code: 'USER_DEACTIVATION_FAILED',
          details: {
            message: deactivateError.message,
            userId: user.id
          }
        })
      }
    } catch (error) {
      logger.error('Failed to delete user:', error)
      res.status(500).json({
        error: 'An unexpected error occurred while deleting the user',
        code: 'USER_DELETE_FAILED',
        details: {
          message: error.message
        }
      })
    }
  }

  // Restore user (reactivate)
  static async restoreUser(req, res) {
    try {
      const { id } = req.params

      const user = await User.findById(id)
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
      }

      await user.activate()

      logger.audit('USER_RESTORED', {
        restoredBy: req.user.id,
        targetUserId: user.id,
        targetUserEmail: user.email,
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        user: user.toJSON(),
        message: 'User restored successfully'
      })
    } catch (error) {
      logger.error('Failed to restore user:', error)
      res.status(500).json({
        error: 'Failed to restore user',
        code: 'USER_RESTORE_FAILED'
      })
    }
  }

  // Get user statistics
  static async getUserStats(req, res) {
    try {
      const { pool } = require('../config/database')

      const statsQuery = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
          COUNT(*) FILTER (WHERE role = 'employee') as employee_count,
          COUNT(*) FILTER (WHERE is_active = true) as active_count,
          COUNT(*) FILTER (WHERE is_active = false) as inactive_count,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_30d,
          COUNT(*) FILTER (WHERE last_login >= CURRENT_DATE - INTERVAL '7 days') as active_users_7d
        FROM users
      `

      const result = await pool.query(statsQuery)
      const stats = result.rows[0]

      // Convert string numbers to integers
      Object.keys(stats).forEach(key => {
        stats[key] = parseInt(stats[key])
      })

      logger.audit('USER_STATS_VIEWED', {
        viewedBy: req.user.id,
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        stats
      })
    } catch (error) {
      logger.error('Failed to fetch user stats:', error)
      res.status(500).json({
        error: 'Failed to fetch user statistics',
        code: 'USER_STATS_FAILED'
      })
    }
  }

  // Bulk operations
  static async bulkUpdateUsers(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const { userIds, updates } = req.body

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          error: 'User IDs array is required',
          code: 'INVALID_USER_IDS'
        })
      }

      const { pool } = require('../config/database')
      const results = []

      for (const userId of userIds) {
        try {
          const user = await User.findById(userId)
          if (user && user.id !== req.user.id) { // Prevent self-modification
            await user.update(updates)
            results.push({ userId, success: true })
          } else {
            results.push({ userId, success: false, reason: 'User not found or self-modification' })
          }
        } catch (error) {
          results.push({ userId, success: false, reason: error.message })
        }
      }

      logger.audit('BULK_USER_UPDATE', {
        updatedBy: req.user.id,
        userIds,
        updates,
        results,
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        results,
        message: 'Bulk update completed'
      })
    } catch (error) {
      logger.error('Failed to bulk update users:', error)
      res.status(500).json({
        error: 'Failed to bulk update users',
        code: 'BULK_UPDATE_FAILED'
      })
    }
  }
}

module.exports = UserController
