const { query } = require('../config/database')
const logger = require('../utils/logger')
const { WORK_LOG_TYPES } = require('../utils/constants')

class WorkLog {
  constructor(data) {
    this.id = data.id
    this.uuid = data.uuid
    this.userId = data.user_id
    this.vmId = data.vm_id
    this.sessionId = data.session_id
    this.workType = data.work_type
    this.taskTitle = data.task_title
    this.taskDescription = data.task_description
    this.startTime = data.start_time
    this.endTime = data.end_time
    this.durationMinutes = data.duration_minutes
    this.isBillable = data.is_billable
    this.createdAt = data.created_at
    this.updatedAt = data.updated_at
  }

  // Create a new work log
  static async create(workLogData) {
    try {
      const sql = `
        INSERT INTO work_logs (user_id, vm_id, session_id, work_type, task_title, task_description, start_time, is_billable)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `
      
      const values = [
        workLogData.userId,
        workLogData.vmId,
        workLogData.sessionId || null,
        workLogData.workType || WORK_LOG_TYPES.WORK,
        workLogData.taskTitle || null,
        workLogData.taskDescription || null,
        workLogData.startTime || new Date(),
        workLogData.isBillable !== undefined ? workLogData.isBillable : true
      ]

      const result = await query(sql, values)
      const workLog = new WorkLog(result.rows[0])

      logger.audit('WORK_LOG_CREATED', {
        workLogId: workLog.id,
        userId: workLog.userId,
        vmId: workLog.vmId,
        workType: workLog.workType,
        taskTitle: workLog.taskTitle
      })

      return workLog
    } catch (error) {
      logger.error('Failed to create work log:', error)
      throw error
    }
  }

  // Find work log by ID
  static async findById(id) {
    try {
      const sql = 'SELECT * FROM work_logs WHERE id = $1'
      const result = await query(sql, [id])
      
      return result.rows.length > 0 ? new WorkLog(result.rows[0]) : null
    } catch (error) {
      logger.error('Failed to find work log by ID:', error)
      throw error
    }
  }

  // Get work logs with pagination and filtering
  static async findAll(options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        userId, 
        vmId, 
        workType, 
        startDate, 
        endDate,
        isBillable,
        sortBy = 'start_time',
        sortOrder = 'desc'
      } = options
      
      const offset = (page - 1) * limit

      let sql = `
        SELECT wl.*, 
               u.name as user_name, u.email as user_email,
               vm.name as vm_name, vm.ip_address
        FROM work_logs wl
        JOIN users u ON wl.user_id = u.id
        JOIN virtual_machines vm ON wl.vm_id = vm.id
        WHERE 1=1
      `
      const values = []
      let paramCount = 0

      // Add filters
      if (userId) {
        paramCount++
        sql += ` AND wl.user_id = $${paramCount}`
        values.push(userId)
      }

      if (vmId) {
        paramCount++
        sql += ` AND wl.vm_id = $${paramCount}`
        values.push(vmId)
      }

      if (workType) {
        paramCount++
        sql += ` AND wl.work_type = $${paramCount}`
        values.push(workType)
      }

      if (startDate) {
        paramCount++
        sql += ` AND wl.start_time >= $${paramCount}`
        values.push(startDate)
      }

      if (endDate) {
        paramCount++
        sql += ` AND wl.start_time <= $${paramCount}`
        values.push(endDate)
      }

      if (isBillable !== undefined) {
        paramCount++
        sql += ` AND wl.is_billable = $${paramCount}`
        values.push(isBillable)
      }

      // Add sorting and pagination
      sql += ` ORDER BY wl.${sortBy} ${sortOrder.toUpperCase()}`
      sql += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
      values.push(limit, offset)

      const result = await query(sql, values)
      
      // Get total count
      let countSql = `
        SELECT COUNT(*) as total
        FROM work_logs wl
        WHERE 1=1
      `
      const countValues = values.slice(0, -2) // Remove limit and offset

      if (userId) countSql += ` AND wl.user_id = $1`
      if (vmId) countSql += ` AND wl.vm_id = $${userId ? 2 : 1}`
      if (workType) countSql += ` AND wl.work_type = $${(userId ? 1 : 0) + (vmId ? 1 : 0) + 1}`

      const countResult = await query(countSql, countValues)
      const total = parseInt(countResult.rows[0].total)

      return {
        workLogs: result.rows.map(row => ({
          ...new WorkLog(row).toJSON(),
          userName: row.user_name,
          userEmail: row.user_email,
          vmName: row.vm_name,
          vmIpAddress: row.ip_address
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    } catch (error) {
      logger.error('Failed to get work logs:', error)
      throw error
    }
  }

  // Get active work log for user
  static async getActiveWorkLog(userId) {
    try {
      const sql = `
        SELECT wl.*, vm.name as vm_name, vm.ip_address
        FROM work_logs wl
        JOIN virtual_machines vm ON wl.vm_id = vm.id
        WHERE wl.user_id = $1 AND wl.end_time IS NULL
        ORDER BY wl.start_time DESC
        LIMIT 1
      `
      
      const result = await query(sql, [userId])
      
      if (result.rows.length > 0) {
        const row = result.rows[0]
        return {
          ...new WorkLog(row).toJSON(),
          vmName: row.vm_name,
          vmIpAddress: row.ip_address
        }
      }
      
      return null
    } catch (error) {
      logger.error('Failed to get active work log:', error)
      throw error
    }
  }

  // Update work log
  async update(updateData) {
    try {
      const allowedFields = ['work_type', 'task_title', 'task_description', 'end_time', 'is_billable']
      const updates = []
      const values = []
      let paramCount = 0

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          paramCount++
          updates.push(`${key} = $${paramCount}`)
          values.push(updateData[key])
        }
      })

      if (updates.length === 0) {
        throw new Error('No valid fields to update')
      }

      values.push(this.id)
      const sql = `
        UPDATE work_logs 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount + 1}
        RETURNING *
      `

      const result = await query(sql, values)
      const updatedWorkLog = new WorkLog(result.rows[0])

      logger.audit('WORK_LOG_UPDATED', {
        workLogId: this.id,
        userId: this.userId,
        changes: updateData
      })

      // Update current instance
      Object.assign(this, updatedWorkLog)
      return this
    } catch (error) {
      logger.error('Failed to update work log:', error)
      throw error
    }
  }

  // End work log
  async end(endTime = new Date()) {
    try {
      await this.update({ end_time: endTime })

      logger.audit('WORK_LOG_ENDED', {
        workLogId: this.id,
        userId: this.userId,
        vmId: this.vmId,
        duration: this.getDurationMinutes(),
        taskTitle: this.taskTitle
      })

      return this
    } catch (error) {
      logger.error('Failed to end work log:', error)
      throw error
    }
  }

  // Delete work log
  async delete() {
    try {
      const sql = 'DELETE FROM work_logs WHERE id = $1'
      await query(sql, [this.id])

      logger.audit('WORK_LOG_DELETED', {
        workLogId: this.id,
        userId: this.userId,
        vmId: this.vmId,
        taskTitle: this.taskTitle
      })

      return true
    } catch (error) {
      logger.error('Failed to delete work log:', error)
      throw error
    }
  }

  // Check if work log is active
  isActive() {
    return !this.endTime
  }

  // Get duration in minutes
  getDurationMinutes() {
    if (this.durationMinutes) {
      return this.durationMinutes
    }

    if (this.endTime && this.startTime) {
      const start = new Date(this.startTime)
      const end = new Date(this.endTime)
      return Math.round((end - start) / (1000 * 60))
    }

    if (this.startTime) {
      const start = new Date(this.startTime)
      const now = new Date()
      return Math.round((now - start) / (1000 * 60))
    }

    return 0
  }

  // Get work log summary for user
  static async getUserSummary(userId, startDate, endDate) {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_logs,
          SUM(duration_minutes) as total_minutes,
          AVG(duration_minutes) as avg_minutes,
          COUNT(*) FILTER (WHERE work_type = 'work') as work_logs,
          COUNT(*) FILTER (WHERE work_type = 'break') as break_logs,
          COUNT(*) FILTER (WHERE work_type = 'meeting') as meeting_logs,
          COUNT(*) FILTER (WHERE is_billable = true) as billable_logs,
          COUNT(DISTINCT vm_id) as unique_vms,
          COUNT(DISTINCT DATE(start_time)) as active_days
        FROM work_logs
        WHERE user_id = $1 
          AND start_time >= $2 
          AND start_time <= $3
      `

      const result = await query(sql, [userId, startDate, endDate])
      const summary = result.rows[0]

      return {
        totalLogs: parseInt(summary.total_logs) || 0,
        totalMinutes: parseInt(summary.total_minutes) || 0,
        avgMinutes: parseFloat(summary.avg_minutes) || 0,
        workLogs: parseInt(summary.work_logs) || 0,
        breakLogs: parseInt(summary.break_logs) || 0,
        meetingLogs: parseInt(summary.meeting_logs) || 0,
        billableLogs: parseInt(summary.billable_logs) || 0,
        uniqueVms: parseInt(summary.unique_vms) || 0,
        activeDays: parseInt(summary.active_days) || 0
      }
    } catch (error) {
      logger.error('Failed to get user work log summary:', error)
      throw error
    }
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      uuid: this.uuid,
      userId: this.userId,
      vmId: this.vmId,
      sessionId: this.sessionId,
      workType: this.workType,
      taskTitle: this.taskTitle,
      taskDescription: this.taskDescription,
      startTime: this.startTime,
      endTime: this.endTime,
      durationMinutes: this.getDurationMinutes(),
      isBillable: this.isBillable,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }
}

module.exports = WorkLog
