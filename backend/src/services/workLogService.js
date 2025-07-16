const WorkLog = require('../models/WorkLog')
const NonWorkLog = require('../models/NonWorkLog')
const { pool } = require('../config/database')
const logger = require('../utils/logger')

class WorkLogService {
  // Start work session
  static async startWorkSession(userId, vmId, sessionId, taskData) {
    try {
      // Check if user has an active work log
      const activeWorkLog = await WorkLog.getActiveWorkLog(userId)
      if (activeWorkLog) {
        throw new Error('You already have an active work session. Please end it first.')
      }

      const workLog = await WorkLog.create({
        userId,
        vmId,
        sessionId,
        workType: taskData.workType || 'work',
        taskTitle: taskData.taskTitle,
        taskDescription: taskData.taskDescription,
        isBillable: taskData.isBillable !== undefined ? taskData.isBillable : true
      })

      logger.audit('WORK_SESSION_STARTED', {
        workLogId: workLog.id,
        userId,
        vmId,
        sessionId,
        taskTitle: taskData.taskTitle
      })

      return workLog
    } catch (error) {
      logger.error('Failed to start work session:', error)
      throw error
    }
  }

  // End work session
  static async endWorkSession(workLogId, userId, endTime = new Date()) {
    try {
      const workLog = await WorkLog.findById(workLogId)
      if (!workLog) {
        throw new Error('Work log not found')
      }

      if (workLog.userId !== userId) {
        throw new Error('Access denied - not your work log')
      }

      if (!workLog.isActive()) {
        throw new Error('Work log is already ended')
      }

      await workLog.end(endTime)

      logger.audit('WORK_SESSION_ENDED', {
        workLogId,
        userId,
        duration: workLog.getDurationMinutes(),
        taskTitle: workLog.taskTitle
      })

      return workLog
    } catch (error) {
      logger.error('Failed to end work session:', error)
      throw error
    }
  }

  // Get user's work summary
  static async getUserWorkSummary(userId, startDate, endDate) {
    try {
      const summary = await WorkLog.getUserSummary(userId, startDate, endDate)
      
      // Get daily breakdown
      const dailyBreakdown = await this.getDailyWorkBreakdown(userId, startDate, endDate)
      
      // Get work type breakdown
      const workTypeBreakdown = await this.getWorkTypeBreakdown(userId, startDate, endDate)
      
      return {
        ...summary,
        dailyBreakdown,
        workTypeBreakdown
      }
    } catch (error) {
      logger.error('Failed to get user work summary:', error)
      throw error
    }
  }

  // Get daily work breakdown
  static async getDailyWorkBreakdown(userId, startDate, endDate) {
    try {
      const sql = `
        SELECT 
          DATE(start_time) as date,
          COUNT(*) as session_count,
          SUM(duration_minutes) as total_minutes,
          AVG(duration_minutes) as avg_minutes,
          COUNT(*) FILTER (WHERE work_type = 'work') as work_sessions,
          COUNT(*) FILTER (WHERE work_type = 'break') as break_sessions,
          COUNT(*) FILTER (WHERE is_billable = true) as billable_sessions
        FROM work_logs
        WHERE user_id = $1 
          AND start_time >= $2 
          AND start_time <= $3
        GROUP BY DATE(start_time)
        ORDER BY date DESC
      `

      const result = await pool.query(sql, [userId, startDate, endDate])
      
      return result.rows.map(row => ({
        date: row.date,
        sessionCount: parseInt(row.session_count),
        totalMinutes: parseInt(row.total_minutes) || 0,
        avgMinutes: parseFloat(row.avg_minutes) || 0,
        workSessions: parseInt(row.work_sessions),
        breakSessions: parseInt(row.break_sessions),
        billableSessions: parseInt(row.billable_sessions)
      }))
    } catch (error) {
      logger.error('Failed to get daily work breakdown:', error)
      throw error
    }
  }

  // Get work type breakdown
  static async getWorkTypeBreakdown(userId, startDate, endDate) {
    try {
      const sql = `
        SELECT 
          work_type,
          COUNT(*) as session_count,
          SUM(duration_minutes) as total_minutes,
          AVG(duration_minutes) as avg_minutes
        FROM work_logs
        WHERE user_id = $1 
          AND start_time >= $2 
          AND start_time <= $3
        GROUP BY work_type
        ORDER BY total_minutes DESC
      `

      const result = await pool.query(sql, [userId, startDate, endDate])
      
      return result.rows.map(row => ({
        workType: row.work_type,
        sessionCount: parseInt(row.session_count),
        totalMinutes: parseInt(row.total_minutes) || 0,
        avgMinutes: parseFloat(row.avg_minutes) || 0
      }))
    } catch (error) {
      logger.error('Failed to get work type breakdown:', error)
      throw error
    }
  }

  // Log non-work time
  static async logNonWorkTime(userId, reason, startTime, endTime) {
    try {
      const nonWorkLog = await NonWorkLog.create({
        userId,
        reason,
        startTime,
        endTime,
        date: new Date(startTime).toISOString().split('T')[0]
      })

      logger.audit('NON_WORK_TIME_LOGGED', {
        nonWorkLogId: nonWorkLog.id,
        userId,
        reason,
        duration: nonWorkLog.getDurationMinutes()
      })

      return nonWorkLog
    } catch (error) {
      logger.error('Failed to log non-work time:', error)
      throw error
    }
  }

  // Get work statistics
  static async getWorkStatistics(userId = null, days = 30) {
    try {
      let sql = `
        SELECT 
          COUNT(*) as total_work_logs,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT vm_id) as unique_vms,
          SUM(duration_minutes) as total_work_minutes,
          AVG(duration_minutes) as avg_session_duration,
          COUNT(*) FILTER (WHERE work_type = 'work') as work_sessions,
          COUNT(*) FILTER (WHERE work_type = 'break') as break_sessions,
          COUNT(*) FILTER (WHERE work_type = 'meeting') as meeting_sessions,
          COUNT(*) FILTER (WHERE is_billable = true) as billable_sessions,
          COUNT(DISTINCT DATE(start_time)) as active_days
        FROM work_logs
        WHERE start_time >= CURRENT_DATE - INTERVAL '${days} days'
      `

      const params = []
      if (userId) {
        sql += ' AND user_id = $1'
        params.push(userId)
      }

      const result = await pool.query(sql, params)
      const stats = result.rows[0]

      return {
        totalWorkLogs: parseInt(stats.total_work_logs) || 0,
        uniqueUsers: parseInt(stats.unique_users) || 0,
        uniqueVms: parseInt(stats.unique_vms) || 0,
        totalWorkMinutes: parseInt(stats.total_work_minutes) || 0,
        avgSessionDuration: parseFloat(stats.avg_session_duration) || 0,
        workSessions: parseInt(stats.work_sessions) || 0,
        breakSessions: parseInt(stats.break_sessions) || 0,
        meetingSessions: parseInt(stats.meeting_sessions) || 0,
        billableSessions: parseInt(stats.billable_sessions) || 0,
        activeDays: parseInt(stats.active_days) || 0
      }
    } catch (error) {
      logger.error('Failed to get work statistics:', error)
      throw error
    }
  }

  // Validate work log data
  static validateWorkLogData(workLogData) {
    const errors = []

    if (!workLogData.taskTitle || workLogData.taskTitle.trim().length === 0) {
      errors.push('Task title is required')
    }

    if (workLogData.taskTitle && workLogData.taskTitle.length > 255) {
      errors.push('Task title must not exceed 255 characters')
    }

    if (workLogData.taskDescription && workLogData.taskDescription.length > 1000) {
      errors.push('Task description must not exceed 1000 characters')
    }

    if (workLogData.workType && !['work', 'break', 'meeting', 'training', 'other'].includes(workLogData.workType)) {
      errors.push('Invalid work type')
    }

    if (workLogData.startTime && workLogData.endTime) {
      const start = new Date(workLogData.startTime)
      const end = new Date(workLogData.endTime)
      
      if (end <= start) {
        errors.push('End time must be after start time')
      }

      const durationHours = (end - start) / (1000 * 60 * 60)
      if (durationHours > 12) {
        errors.push('Work session cannot exceed 12 hours')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Auto-end expired work sessions
  static async autoEndExpiredSessions() {
    try {
      const sql = `
        UPDATE work_logs 
        SET end_time = start_time + INTERVAL '8 hours'
        WHERE end_time IS NULL 
          AND start_time < CURRENT_TIMESTAMP - INTERVAL '8 hours'
        RETURNING id, user_id, task_title
      `

      const result = await pool.query(sql)
      
      for (const row of result.rows) {
        logger.audit('WORK_SESSION_AUTO_ENDED', {
          workLogId: row.id,
          userId: row.user_id,
          taskTitle: row.task_title,
          reason: 'automatic_timeout'
        })
      }

      logger.info(`Auto-ended ${result.rows.length} expired work sessions`)
      return result.rows.length
    } catch (error) {
      logger.error('Failed to auto-end expired sessions:', error)
      throw error
    }
  }
}

module.exports = WorkLogService
