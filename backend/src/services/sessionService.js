const { pool } = require('../config/database')
const logger = require('../utils/logger')
const ConnectionUtils = require('../utils/connectionUtils')

class SessionService {
  // Start a new session
  static async startSession(userId, vmId, connectionType) {
    try {
      const sql = `
        INSERT INTO sessions (
          user_id, 
          vm_id, 
          connection_type, 
          status,
          start_time
        )
        VALUES ($1, $2, $3, 'active', CURRENT_TIMESTAMP)
        RETURNING *
      `

      const result = await pool.query(sql, [userId, vmId, connectionType])
      const session = result.rows[0]

      logger.audit('SESSION_STARTED', {
        sessionId: session.id,
        userId,
        vmId,
        connectionType
      })

      return session
    } catch (error) {
      logger.error('Failed to start session:', error)
      throw error
    }
  }

  // Get active sessions for a user
  static async getActiveSessions(userId) {
    try {
      const sql = `
        SELECT 
          s.*,
          vm.name as vm_name,
          vm.ip_address as vm_ip_address,
          vm.os_type,
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - s.start_time))/60 as current_duration_minutes
        FROM sessions s
        JOIN virtual_machines vm ON s.vm_id = vm.id
        WHERE s.user_id = $1 AND s.status = 'active'
        ORDER BY s.start_time DESC
      `

      const result = await pool.query(sql, [userId])
      
      return result.rows.map(row => ({
        sessionId: row.id,
        vmId: row.vm_id,
        vmName: row.vm_name,
        vmIpAddress: row.vm_ip_address,
        osType: row.os_type,
        connectionType: row.connection_type,
        startTime: row.start_time,
        status: row.status,
        durationMinutes: Math.round(row.current_duration_minutes || 0),
        metadata: row.metadata
      }))
    } catch (error) {
      logger.error('Failed to get active sessions:', error)
      throw error
    }
  }

  // Get all active sessions (admin)
  static async getAllActiveSessions() {
    try {
      const sql = `
        SELECT 
          s.*,
          u.name as user_name,
          u.email as user_email,
          vm.name as vm_name,
          vm.ip_address as vm_ip_address,
          vm.os_type,
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - s.start_time))/60 as current_duration_minutes
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        JOIN virtual_machines vm ON s.vm_id = vm.id
        WHERE s.status = 'active'
        ORDER BY s.start_time DESC
      `

      const result = await pool.query(sql)
      
      return result.rows.map(row => ({
        sessionId: row.id,
        userId: row.user_id,
        userName: row.user_name,
        userEmail: row.user_email,
        vmId: row.vm_id,
        vmName: row.vm_name,
        vmIpAddress: row.vm_ip_address,
        osType: row.os_type,
        connectionType: row.connection_type,
        startTime: row.start_time,
        status: row.status,
        durationMinutes: Math.round(row.current_duration_minutes || 0),
        metadata: row.metadata
      }))
    } catch (error) {
      logger.error('Failed to get all active sessions:', error)
      throw error
    }
  }

  // End session
  static async endSession(sessionId, reason = 'user_disconnect') {
    try {
      const sql = `
        UPDATE sessions 
        SET 
          status = 'ended',
          end_time = CURRENT_TIMESTAMP,
          metadata = metadata || $2::jsonb
        WHERE id = $1 AND status = 'active'
        RETURNING *
      `

      const metadata = { 
        endReason: reason, 
        endTimestamp: new Date().toISOString() 
      }
      
      const result = await pool.query(sql, [sessionId, JSON.stringify(metadata)])

      if (result.rows.length === 0) {
        throw new Error('Session not found or already ended')
      }

      const session = result.rows[0]
      const durationMinutes = Math.round(
        (new Date(session.end_time) - new Date(session.start_time)) / (1000 * 60)
      )

      // Clean up session files
      await ConnectionUtils.cleanupSessionFiles(sessionId)

      logger.audit('SESSION_ENDED', {
        sessionId,
        userId: session.user_id,
        vmId: session.vm_id,
        reason,
        durationMinutes
      })

      return {
        sessionId,
        endTime: session.end_time,
        durationMinutes
      }
    } catch (error) {
      logger.error('Failed to end session:', error)
      throw error
    }
  }

  // Get VM usage statistics
  static async getVMUsageStats(vmId, startDate, endDate) {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_sessions,
          SUM(duration_minutes) as total_minutes,
          COUNT(DISTINCT user_id) as unique_users,
          MAX(end_time) as last_used
        FROM sessions
        WHERE 
          vm_id = $1 
          AND start_time >= $2 
          AND start_time <= $3
          AND status = 'ended'
      `

      const result = await pool.query(sql, [vmId, startDate, endDate])
      const stats = result.rows[0]

      return {
        totalSessions: parseInt(stats.total_sessions) || 0,
        totalHours: Math.round((parseInt(stats.total_minutes) || 0) / 60),
        uniqueUsers: parseInt(stats.unique_users) || 0,
        lastUsed: stats.last_used
      }
    } catch (error) {
      logger.error('Failed to get VM usage stats:', error)
      throw error
    }
  }

  // Get user's VM usage
  static async getUserVMUsage(userId, startDate, endDate) {
    try {
      const sql = `
        SELECT 
          vm.id as vm_id,
          vm.name as vm_name,
          COUNT(*) as total_sessions,
          SUM(s.duration_minutes) as total_minutes,
          MAX(s.end_time) as last_used
        FROM sessions s
        JOIN virtual_machines vm ON s.vm_id = vm.id
        WHERE 
          s.user_id = $1 
          AND s.start_time >= $2 
          AND s.start_time <= $3
          AND s.status = 'ended'
        GROUP BY vm.id, vm.name
      `

      const result = await pool.query(sql, [userId, startDate, endDate])
      
      return result.rows.map(row => ({
        vmId: row.vm_id,
        vmName: row.vm_name,
        totalSessions: parseInt(row.total_sessions) || 0,
        totalHours: Math.round((parseInt(row.total_minutes) || 0) / 60),
        lastUsed: row.last_used
      }))
    } catch (error) {
      logger.error('Failed to get user VM usage:', error)
      throw error
    }
  }
}

module.exports = SessionService
