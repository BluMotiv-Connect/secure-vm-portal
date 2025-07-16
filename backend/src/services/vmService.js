const VirtualMachine = require('../models/VirtualMachine')
const VMCredentials = require('../models/VMCredentials')
const { pool } = require('../config/database')
const logger = require('../utils/logger')

class VMService {
  // Advanced VM search with filters
  static async searchVMs(filters = {}) {
    try {
      const {
        search,
        status,
        osType,
        assignedTo,
        region,
        tags,
        sortBy = 'created_at',
        sortOrder = 'desc',
        limit = 20,
        offset = 0
      } = filters

      let query = `
        SELECT vm.*, 
               u.name as assigned_user_name,
               u.email as assigned_user_email,
               COUNT(s.id) as active_sessions_count,
               COUNT(wl.id) as total_work_sessions
        FROM virtual_machines vm
        LEFT JOIN users u ON vm.assigned_to = u.id
        LEFT JOIN sessions s ON vm.id = s.vm_id AND s.status = 'active'
        LEFT JOIN work_logs wl ON vm.id = wl.vm_id
        WHERE 1=1
      `
      const params = []
      let paramCount = 0

      // Add search filter
      if (search) {
        paramCount++
        query += ` AND (vm.name ILIKE $${paramCount} OR vm.ip_address::text ILIKE $${paramCount} OR vm.description ILIKE $${paramCount})`
        params.push(`%${search}%`)
      }

      // Add status filter
      if (status) {
        paramCount++
        query += ` AND vm.status = $${paramCount}`
        params.push(status)
      }

      // Add OS type filter
      if (osType) {
        paramCount++
        query += ` AND vm.os_type = $${paramCount}`
        params.push(osType)
      }

      // Add assignment filter
      if (assignedTo !== undefined) {
        if (assignedTo === null) {
          query += ` AND vm.assigned_to IS NULL`
        } else {
          paramCount++
          query += ` AND vm.assigned_to = $${paramCount}`
          params.push(assignedTo)
        }
      }

      // Add region filter
      if (region) {
        paramCount++
        query += ` AND vm.region = $${paramCount}`
        params.push(region)
      }

      // Add tags filter
      if (tags && Object.keys(tags).length > 0) {
        Object.entries(tags).forEach(([key, value]) => {
          paramCount++
          query += ` AND vm.tags->>'${key}' = $${paramCount}`
          params.push(value)
        })
      }

      // Add grouping and sorting
      query += ` GROUP BY vm.id, u.name, u.email`
      query += ` ORDER BY vm.${sortBy} ${sortOrder.toUpperCase()}`

      // Add pagination
      query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
      params.push(limit, offset)

      const result = await pool.query(query, params)
      
      // Get total count
      let countQuery = `
        SELECT COUNT(DISTINCT vm.id) as total
        FROM virtual_machines vm
        WHERE 1=1
      `
      const countParams = params.slice(0, -2) // Remove limit and offset

      if (search) countQuery += ` AND (vm.name ILIKE $1 OR vm.ip_address::text ILIKE $1 OR vm.description ILIKE $1)`
      if (status) countQuery += ` AND vm.status = $${search ? 2 : 1}`
      if (osType) countQuery += ` AND vm.os_type = $${(search ? 1 : 0) + (status ? 1 : 0) + 1}`

      const countResult = await pool.query(countQuery, countParams)
      const total = parseInt(countResult.rows[0].total)

      return {
        vms: result.rows.map(row => ({
          ...new VirtualMachine(row).toJSON(),
          assignedUserName: row.assigned_user_name,
          assignedUserEmail: row.assigned_user_email,
          activeSessionsCount: parseInt(row.active_sessions_count),
          totalWorkSessions: parseInt(row.total_work_sessions)
        })),
        total
      }
    } catch (error) {
      logger.error('VM search failed:', error)
      throw error
    }
  }

  // Get VM statistics
  static async getVMStats() {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_vms,
          COUNT(*) FILTER (WHERE status = 'online') as online_count,
          COUNT(*) FILTER (WHERE status = 'offline') as offline_count,
          COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance_count,
          COUNT(*) FILTER (WHERE assigned_to IS NOT NULL) as assigned_count,
          COUNT(*) FILTER (WHERE assigned_to IS NULL) as unassigned_count,
          COUNT(DISTINCT os_type) as unique_os_types,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_vms_30d
        FROM virtual_machines
      `

      const result = await pool.query(statsQuery)
      const stats = result.rows[0]

      // Convert string numbers to integers
      Object.keys(stats).forEach(key => {
        stats[key] = parseInt(stats[key])
      })

      return stats
    } catch (error) {
      logger.error('Failed to get VM stats:', error)
      throw error
    }
  }

  // Get VMs assigned to a user
  static async getVMsForUser(userId) {
    try {
      const sql = `
        SELECT vm.*, vc.connection_type, vc.connection_port,
               COUNT(s.id) as active_sessions_count
        FROM virtual_machines vm
        LEFT JOIN vm_credentials vc ON vm.id = vc.vm_id
        LEFT JOIN sessions s ON vm.id = s.vm_id AND s.status = 'active'
        WHERE vm.assigned_to = $1
        GROUP BY vm.id, vc.connection_type, vc.connection_port
        ORDER BY vm.name
      `
      
      const result = await pool.query(sql, [userId])
      return result.rows.map(row => ({
        ...new VirtualMachine(row).toJSON(),
        connectionType: row.connection_type,
        connectionPort: row.connection_port,
        activeSessionsCount: parseInt(row.active_sessions_count)
      }))
    } catch (error) {
      logger.error('Failed to get VMs for user:', error)
      throw error
    }
  }

  // Bulk assign VMs to users
  static async bulkAssignVMs(assignments) {
    try {
      const results = []
      
      for (const assignment of assignments) {
        try {
          const vm = await VirtualMachine.findById(assignment.vmId)
          if (vm) {
            await vm.assignToUser(assignment.userId)
            results.push({ vmId: assignment.vmId, success: true })
          } else {
            results.push({ vmId: assignment.vmId, success: false, reason: 'VM not found' })
          }
        } catch (error) {
          results.push({ vmId: assignment.vmId, success: false, reason: error.message })
        }
      }

      return results
    } catch (error) {
      logger.error('Bulk VM assignment failed:', error)
      throw error
    }
  }

  // Check VM connectivity
  static async checkVMConnectivity(vmId) {
    try {
      const vm = await VirtualMachine.findById(vmId)
      if (!vm) {
        throw new Error('VM not found')
      }

      const credentials = await vm.getCredentials()
      if (!credentials) {
        throw new Error('VM credentials not found')
      }

      // This would implement actual connectivity testing
      // For now, return a mock result based on VM status
      const isConnectable = vm.status === 'online'
      
      return {
        vmId,
        isConnectable,
        status: vm.status,
        lastChecked: new Date(),
        responseTime: isConnectable ? Math.random() * 100 : null,
        error: isConnectable ? null : 'VM is not online'
      }
    } catch (error) {
      logger.error('VM connectivity check failed:', error)
      return {
        vmId,
        isConnectable: false,
        error: error.message,
        lastChecked: new Date()
      }
    }
  }

  // Get VM usage analytics
  static async getVMUsageAnalytics(vmId, days = 30) {
    try {
      const sql = `
        SELECT 
          DATE(s.start_time) as date,
          COUNT(s.id) as session_count,
          SUM(s.duration_minutes) as total_minutes,
          COUNT(DISTINCT s.user_id) as unique_users,
          AVG(s.duration_minutes) as avg_session_duration
        FROM sessions s
        WHERE s.vm_id = $1 
          AND s.start_time >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(s.start_time)
        ORDER BY date DESC
      `

      const result = await pool.query(sql, [vmId])
      
      return result.rows.map(row => ({
        date: row.date,
        sessionCount: parseInt(row.session_count),
        totalMinutes: parseInt(row.total_minutes) || 0,
        uniqueUsers: parseInt(row.unique_users),
        avgSessionDuration: parseFloat(row.avg_session_duration) || 0
      }))
    } catch (error) {
      logger.error('Failed to get VM usage analytics:', error)
      throw error
    }
  }

  // Validate VM data
  static validateVMData(vmData) {
    const errors = []

    if (!vmData.name || vmData.name.trim().length < 2) {
      errors.push('VM name must be at least 2 characters long')
    }

    if (!vmData.ipAddress || !/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(vmData.ipAddress)) {
      errors.push('Valid IP address is required')
    }

    if (!vmData.osType || !['windows', 'linux', 'macos'].includes(vmData.osType)) {
      errors.push('Valid OS type is required (windows, linux, macos)')
    }

    if (vmData.status && !['online', 'offline', 'maintenance', 'error'].includes(vmData.status)) {
      errors.push('Invalid status value')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

async function getVMUsageStats(vmId, startDate, endDate) {
  const query = `
    SELECT 
      u.username,
      COUNT(s.id) as total_sessions,
      SUM(s.duration_minutes) as total_minutes,
      MAX(s.end_time) as last_used
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.vm_id = $1
    AND s.start_time >= $2
    AND s.start_time <= $3
    AND s.end_time IS NOT NULL
    GROUP BY u.id, u.username
    ORDER BY total_minutes DESC`;

  const result = await pool.query(query, [vmId, startDate, endDate]);
  return result.rows;
}

async function getUserVMUsage(userId, startDate, endDate) {
  const query = `
    SELECT 
      vm.name as vm_name,
      COUNT(s.id) as total_sessions,
      SUM(s.duration_minutes) as total_minutes,
      MAX(s.end_time) as last_used
    FROM sessions s
    JOIN virtual_machines vm ON s.vm_id = vm.id
    WHERE s.user_id = $1
    AND s.start_time >= $2
    AND s.start_time <= $3
    AND s.end_time IS NOT NULL
    GROUP BY vm.id, vm.name
    ORDER BY total_minutes DESC`;

  const result = await pool.query(query, [userId, startDate, endDate]);
  return result.rows;
}

async function getVMUsageSummary() {
  const query = `
    SELECT 
      vm.name as vm_name,
      u.username,
      vus.total_sessions,
      vus.total_duration_minutes,
      vus.last_used_at
    FROM vm_usage_summary vus
    JOIN virtual_machines vm ON vus.vm_id = vm.id
    JOIN users u ON vus.user_id = u.id
    ORDER BY vm.name, vus.total_duration_minutes DESC`;

  const result = await pool.query(query);
  return result.rows;
}

module.exports = {
  VMService,
  getVMUsageStats,
  getUserVMUsage,
  getVMUsageSummary
};
