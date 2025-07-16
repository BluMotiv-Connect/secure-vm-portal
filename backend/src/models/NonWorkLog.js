const { query } = require('../config/database')
const logger = require('../utils/logger')

class NonWorkLog {
  constructor(data) {
    this.id = data.id
    this.uuid = data.uuid
    this.userId = data.user_id
    this.reason = data.reason
    this.startTime = data.start_time
    this.endTime = data.end_time
    this.durationMinutes = data.duration_minutes
    this.date = data.date
    this.createdAt = data.created_at
  }

  // Create a new non-work log
  static async create(nonWorkLogData) {
    try {
      const sql = `
        INSERT INTO non_work_logs (user_id, reason, start_time, end_time, date)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `
      
      const date = nonWorkLogData.date || new Date().toISOString().split('T')[0]
      
      const values = [
        nonWorkLogData.userId,
        nonWorkLogData.reason,
        nonWorkLogData.startTime || new Date(),
        nonWorkLogData.endTime || null,
        date
      ]

      const result = await query(sql, values)
      const nonWorkLog = new NonWorkLog(result.rows[0])

      logger.audit('NON_WORK_LOG_CREATED', {
        nonWorkLogId: nonWorkLog.id,
        userId: nonWorkLog.userId,
        reason: nonWorkLog.reason,
        date: nonWorkLog.date
      })

      return nonWorkLog
    } catch (error) {
      logger.error('Failed to create non-work log:', error)
      throw error
    }
  }

  // Find non-work log by ID
  static async findById(id) {
    try {
      const sql = 'SELECT * FROM non_work_logs WHERE id = $1'
      const result = await query(sql, [id])
      
      return result.rows.length > 0 ? new NonWorkLog(result.rows[0]) : null
    } catch (error) {
      logger.error('Failed to find non-work log by ID:', error)
      throw error
    }
  }

  // Get non-work logs with pagination and filtering
  static async findAll(options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        userId, 
        startDate, 
        endDate,
        sortBy = 'start_time',
        sortOrder = 'desc'
      } = options
      
      const offset = (page - 1) * limit

      let sql = `
        SELECT nwl.*, u.name as user_name, u.email as user_email
        FROM non_work_logs nwl
        JOIN users u ON nwl.user_id = u.id
        WHERE 1=1
      `
      const values = []
      let paramCount = 0

      // Add filters
      if (userId) {
        paramCount++
        sql += ` AND nwl.user_id = $${paramCount}`
        values.push(userId)
      }

      if (startDate) {
        paramCount++
        sql += ` AND nwl.date >= $${paramCount}`
        values.push(startDate)
      }

      if (endDate) {
        paramCount++
        sql += ` AND nwl.date <= $${paramCount}`
        values.push(endDate)
      }

      // Add sorting and pagination
      sql += ` ORDER BY nwl.${sortBy} ${sortOrder.toUpperCase()}`
      sql += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
      values.push(limit, offset)

      const result = await query(sql, values)
      
      // Get total count
      let countSql = `
        SELECT COUNT(*) as total
        FROM non_work_logs nwl
        WHERE 1=1
      `
      const countValues = values.slice(0, -2) // Remove limit and offset

      if (userId) countSql += ` AND nwl.user_id = $1`
      if (startDate) countSql += ` AND nwl.date >= $${userId ? 2 : 1}`
      if (endDate) countSql += ` AND nwl.date <= $${(userId ? 1 : 0) + (startDate ? 1 : 0) + 1}`

      const countResult = await query(countSql, countValues)
      const total = parseInt(countResult.rows[0].total)

      return {
        nonWorkLogs: result.rows.map(row => ({
          ...new NonWorkLog(row).toJSON(),
          userName: row.user_name,
          userEmail: row.user_email
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
      logger.error('Failed to get non-work logs:', error)
      throw error
    }
  }

  // Update non-work log
  async update(updateData) {
    try {
      const allowedFields = ['reason', 'start_time', 'end_time']
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
        UPDATE non_work_logs 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount + 1}
        RETURNING *
      `

      const result = await query(sql, values)
      const updatedNonWorkLog = new NonWorkLog(result.rows[0])

      logger.audit('NON_WORK_LOG_UPDATED', {
        nonWorkLogId: this.id,
        userId: this.userId,
        changes: updateData
      })

      // Update current instance
      Object.assign(this, updatedNonWorkLog)
      return this
    } catch (error) {
      logger.error('Failed to update non-work log:', error)
      throw error
    }
  }

  // Delete non-work log
  async delete() {
    try {
      const sql = 'DELETE FROM non_work_logs WHERE id = $1'
      await query(sql, [this.id])

      logger.audit('NON_WORK_LOG_DELETED', {
        nonWorkLogId: this.id,
        userId: this.userId,
        reason: this.reason
      })

      return true
    } catch (error) {
      logger.error('Failed to delete non-work log:', error)
      throw error
    }
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

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      uuid: this.uuid,
      userId: this.userId,
      reason: this.reason,
      startTime: this.startTime,
      endTime: this.endTime,
      durationMinutes: this.getDurationMinutes(),
      date: this.date,
      createdAt: this.createdAt
    }
  }
}

module.exports = NonWorkLog
