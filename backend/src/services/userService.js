const User = require('../models/User')
const { pool } = require('../config/database')
const logger = require('../utils/logger')

class UserService {
  // Advanced user search with filters
  static async searchUsers(filters = {}) {
    try {
      const {
        search,
        role,
        isActive,
        createdAfter,
        createdBefore,
        lastLoginAfter,
        lastLoginBefore,
        sortBy = 'created_at',
        sortOrder = 'desc',
        limit = 20,
        offset = 0
      } = filters

      let query = `
        SELECT u.*, 
               COUNT(vm.id) as assigned_vms_count,
               COUNT(s.id) as active_sessions_count
        FROM users u
        LEFT JOIN virtual_machines vm ON u.id = vm.assigned_to
        LEFT JOIN sessions s ON u.id = s.user_id AND s.status = 'active'
        WHERE 1=1
      `
      const params = []
      let paramCount = 0

      // Add search filter
      if (search) {
        paramCount++
        query += ` AND (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`
        params.push(`%${search}%`)
      }

      // Add role filter
      if (role) {
        paramCount++
        query += ` AND u.role = $${paramCount}`
        params.push(role)
      }

      // Add active status filter
      if (isActive !== undefined) {
        paramCount++
        query += ` AND u.is_active = $${paramCount}`
        params.push(isActive)
      }

      // Add date filters
      if (createdAfter) {
        paramCount++
        query += ` AND u.created_at >= $${paramCount}`
        params.push(createdAfter)
      }

      if (createdBefore) {
        paramCount++
        query += ` AND u.created_at <= $${paramCount}`
        params.push(createdBefore)
      }

      if (lastLoginAfter) {
        paramCount++
        query += ` AND u.last_login >= $${paramCount}`
        params.push(lastLoginAfter)
      }

      if (lastLoginBefore) {
        paramCount++
        query += ` AND u.last_login <= $${paramCount}`
        params.push(lastLoginBefore)
      }

      // Add grouping and sorting
      query += ` GROUP BY u.id`
      query += ` ORDER BY u.${sortBy} ${sortOrder.toUpperCase()}`

      // Add pagination
      query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
      params.push(limit, offset)

      const result = await pool.query(query, params)
      
      // Get total count
      let countQuery = `
        SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        WHERE 1=1
      `
      const countParams = params.slice(0, -2) // Remove limit and offset

      if (search) countQuery += ` AND (u.name ILIKE $1 OR u.email ILIKE $1)`
      if (role) countQuery += ` AND u.role = $${search ? 2 : 1}`
      if (isActive !== undefined) countQuery += ` AND u.is_active = $${(search ? 1 : 0) + (role ? 1 : 0) + 1}`

      const countResult = await pool.query(countQuery, countParams)
      const total = parseInt(countResult.rows[0].total)

      return {
        users: result.rows.map(row => ({
          ...new User(row).toJSON(),
          assignedVmsCount: parseInt(row.assigned_vms_count),
          activeSessionsCount: parseInt(row.active_sessions_count)
        })),
        total
      }
    } catch (error) {
      logger.error('User search failed:', error)
      throw error
    }
  }

  // Get user activity summary
  static async getUserActivitySummary(userId, days = 30) {
    try {
      const query = `
        SELECT 
          DATE(wl.start_time) as date,
          COUNT(wl.id) as session_count,
          SUM(wl.duration_minutes) as total_minutes,
          AVG(wl.duration_minutes) as avg_minutes,
          COUNT(DISTINCT wl.vm_id) as unique_vms
        FROM work_logs wl
        WHERE wl.user_id = $1 
          AND wl.start_time >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(wl.start_time)
        ORDER BY date DESC
      `

      const result = await pool.query(query, [userId])
      
      return result.rows.map(row => ({
        date: row.date,
        sessionCount: parseInt(row.session_count),
        totalMinutes: parseInt(row.total_minutes) || 0,
        avgMinutes: parseFloat(row.avg_minutes) || 0,
        uniqueVms: parseInt(row.unique_vms)
      }))
    } catch (error) {
      logger.error('Failed to get user activity summary:', error)
      throw error
    }
  }

  // Get user performance metrics
  static async getUserPerformanceMetrics(userId) {
    try {
      const query = `
        SELECT 
          COUNT(wl.id) as total_sessions,
          SUM(wl.duration_minutes) as total_work_minutes,
          AVG(wl.duration_minutes) as avg_session_minutes,
          COUNT(DISTINCT DATE(wl.start_time)) as active_days,
          COUNT(DISTINCT wl.vm_id) as vms_used,
          MAX(wl.start_time) as last_activity,
          COUNT(wl.id) FILTER (WHERE wl.start_time >= CURRENT_DATE - INTERVAL '7 days') as sessions_last_7d,
          SUM(wl.duration_minutes) FILTER (WHERE wl.start_time >= CURRENT_DATE - INTERVAL '7 days') as minutes_last_7d
        FROM work_logs wl
        WHERE wl.user_id = $1
          AND wl.start_time >= CURRENT_DATE - INTERVAL '90 days'
      `

      const result = await pool.query(query, [userId])
      const metrics = result.rows[0]

      return {
        totalSessions: parseInt(metrics.total_sessions) || 0,
        totalWorkMinutes: parseInt(metrics.total_work_minutes) || 0,
        avgSessionMinutes: parseFloat(metrics.avg_session_minutes) || 0,
        activeDays: parseInt(metrics.active_days) || 0,
        vmsUsed: parseInt(metrics.vms_used) || 0,
        lastActivity: metrics.last_activity,
        sessionsLast7d: parseInt(metrics.sessions_last_7d) || 0,
        minutesLast7d: parseInt(metrics.minutes_last_7d) || 0
      }
    } catch (error) {
      logger.error('Failed to get user performance metrics:', error)
      throw error
    }
  }

  // Validate user data
  static validateUserData(userData) {
    const errors = []

    if (!userData.name || userData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long')
    }

    if (!userData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push('Valid email address is required')
    }

    if (!userData.azureId || userData.azureId.trim().length === 0) {
      errors.push('Azure ID is required')
    }

    if (userData.role && !['admin', 'employee'].includes(userData.role)) {
      errors.push('Role must be either admin or employee')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Check user permissions
  static async checkUserPermissions(userId, resource, action) {
    try {
      const user = await User.findById(userId)
      if (!user) return false

      // Admin has all permissions
      if (user.role === 'admin') return true

      // Define employee permissions
      const employeePermissions = {
        'vms': ['read', 'connect'],
        'sessions': ['create', 'read', 'end'],
        'workLogs': ['create', 'read', 'update'],
        'profile': ['read', 'update']
      }

      const resourcePermissions = employeePermissions[resource] || []
      return resourcePermissions.includes(action)
    } catch (error) {
      logger.error('Permission check failed:', error)
      return false
    }
  }
}

module.exports = UserService
