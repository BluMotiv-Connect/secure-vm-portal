const VirtualMachine = require('../models/VirtualMachine')
const VMCredentials = require('../models/VMCredentials')
const { Session } = require('../models/Session');
const CredentialService = require('./credentialService')
const RDPConnectionService = require('./rdpConnectionService')
const SSHConnectionService = require('./sshConnectionService')
const BrowserConnectionService = require('./browserConnectionService')
const { generateSecureToken } = require('../config/security')
const logger = require('../utils/logger')

class ConnectionService {
  // Initiate VM connection
  static async initiateConnection(userId, vmId, clientIp, userAgent) {
    try {
      // Verify VM exists and user has access
      const vm = await VirtualMachine.findById(vmId)
      if (!vm) {
        throw new Error('VM not found')
      }

      if (!vm.canUserAccess(userId)) {
        throw new Error('Access denied - VM not assigned to user')
      }

      if (!vm.isAvailable()) {
        throw new Error(`VM is not available for connection. Status: ${vm.status}`)
      }

      // Get VM credentials
      const credentials = await CredentialService.getConnectionCredentials(vmId, userId)
      if (!credentials) {
        throw new Error('VM credentials not found')
      }

      // Generate unique session ID
      const sessionId = `session_${Date.now()}_${generateSecureToken(16)}`

      // Create session record
      const session = await Session.create({
        sessionId,
        userId,
        vmId,
        connectionType: credentials.connectionType,
        clientIp,
        userAgent,
        metadata: {
          vmName: vm.name,
          vmIpAddress: vm.ipAddress,
          initiatedAt: new Date().toISOString()
        }
      })

      // Generate connection instructions based on OS/connection type
      let connectionInfo
      
      // Check if auto-launch is requested (browser-based connection)
      const autoLaunch = true // This can be made configurable per user/admin setting
      
      if (autoLaunch) {
        // Browser-based automatic connection
        connectionInfo = await BrowserConnectionService.launchVMConnection(sessionId, vm, credentials)
      } else {
        // Traditional file-based connection
        if (credentials.connectionType === 'rdp') {
          connectionInfo = await RDPConnectionService.generateConnection({
            vm,
            credentials,
            sessionId
          })
        } else if (credentials.connectionType === 'ssh') {
          connectionInfo = await SSHConnectionService.generateConnection({
            vm,
            credentials,
            sessionId
          })
        } else {
          throw new Error(`Unsupported connection type: ${credentials.connectionType}`)
        }
      }

      logger.audit('CONNECTION_INITIATED', {
        sessionId,
        userId,
        vmId,
        vmName: vm.name,
        connectionType: credentials.connectionType,
        clientIp
      })

      return {
        session: session.toJSON(),
        connectionInfo,
        vm: vm.toJSON()
      }
    } catch (error) {
      logger.error('Connection initiation failed:', error)
      throw error
    }
  }

  async createConnection(userId, vmId, connectionType) {
    try {
      // Create a new session
      const session = await Session.create({
        userId,
        vmId,
        connectionType
      });

      logger.info(`Created new session for user ${userId} on VM ${vmId}`);
      return session;
    } catch (error) {
      logger.error('Failed to create connection:', error);
      throw error;
    }
  }

  async endConnection(sessionId) {
    try {
      const session = await Session.findById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      await session.end();
      logger.info(`Ended session ${sessionId}`);
      return session;
    } catch (error) {
      logger.error('Failed to end connection:', error);
      throw error;
    }
  }

  async getSessionStats(vmId) {
    try {
      return await Session.getSessionStats(vmId);
    } catch (error) {
      logger.error('Failed to get session stats:', error);
      throw error;
    }
  }

  // Get active connections for user
  static async getActiveConnections(userId) {
    try {
      const sessions = await Session.getActiveSessionsForUser(userId)
      
      return sessions.map(session => ({
        ...session,
        duration: session.durationMinutes || 0,
        canReconnect: session.status === 'active'
      }))
    } catch (error) {
      logger.error('Failed to get active connections:', error)
      throw error
    }
  }

  // Get connection history
  static async getConnectionHistory(userId, options = {}) {
    try {
      const result = await Session.findAll({
        userId,
        ...options
      })

      return result
    } catch (error) {
      logger.error('Failed to get connection history:', error)
      throw error
    }
  }

  // Monitor session health
  static async monitorSession(sessionId) {
    try {
      const session = await Session.findBySessionId(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }

      // Check if session has been running too long (configurable timeout)
      const maxSessionDuration = 8 * 60 * 60 * 1000 // 8 hours in milliseconds
      const sessionDuration = Date.now() - new Date(session.startTime).getTime()

      if (sessionDuration > maxSessionDuration) {
        await session.end('timeout')
        
        logger.audit('SESSION_TIMEOUT', {
          sessionId,
          userId: session.userId,
          vmId: session.vmId,
          duration: session.getDurationMinutes()
        })

        return {
          status: 'timeout',
          message: 'Session ended due to timeout',
          session: session.toJSON()
        }
      }

      // Additional health checks could be added here
      // e.g., ping VM, check if process is still running, etc.

      return {
        status: 'healthy',
        session: session.toJSON(),
        duration: session.getDurationMinutes()
      }
    } catch (error) {
      logger.error('Session monitoring failed:', error)
      throw error
    }
  }

  // Get connection statistics
  static async getConnectionStats(userId = null, days = 30) {
    try {
      const { pool } = require('../config/database')
      
      let sql = `
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
          COUNT(*) FILTER (WHERE status = 'ended') as ended_sessions,
          COUNT(*) FILTER (WHERE status = 'timeout') as timeout_sessions,
          AVG(duration_minutes) FILTER (WHERE duration_minutes IS NOT NULL) as avg_duration,
          SUM(duration_minutes) FILTER (WHERE duration_minutes IS NOT NULL) as total_duration,
          COUNT(DISTINCT vm_id) as unique_vms_used,
          COUNT(DISTINCT DATE(start_time)) as active_days
        FROM sessions
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
        totalSessions: parseInt(stats.total_sessions) || 0,
        activeSessions: parseInt(stats.active_sessions) || 0,
        endedSessions: parseInt(stats.ended_sessions) || 0,
        timeoutSessions: parseInt(stats.timeout_sessions) || 0,
        avgDuration: parseFloat(stats.avg_duration) || 0,
        totalDuration: parseInt(stats.total_duration) || 0,
        uniqueVmsUsed: parseInt(stats.unique_vms_used) || 0,
        activeDays: parseInt(stats.active_days) || 0
      }
    } catch (error) {
      logger.error('Failed to get connection stats:', error)
      throw error
    }
  }

  // Cleanup expired sessions
  static async cleanupExpiredSessions() {
    try {
      const { pool } = require('../config/database')
      
      // End sessions that have been active for more than 8 hours
      const sql = `
        UPDATE sessions 
        SET status = 'timeout', end_time = CURRENT_TIMESTAMP
        WHERE status = 'active' 
          AND start_time < CURRENT_TIMESTAMP - INTERVAL '8 hours'
        RETURNING session_id, user_id, vm_id
      `

      const result = await pool.query(sql)
      
      for (const row of result.rows) {
        logger.audit('SESSION_AUTO_TIMEOUT', {
          sessionId: row.session_id,
          userId: row.user_id,
          vmId: row.vm_id,
          reason: 'automatic_cleanup'
        })

        // Cleanup connection files
        try {
          await RDPConnectionService.cleanup(row.session_id)
          await SSHConnectionService.cleanup(row.session_id)
        } catch (cleanupError) {
          logger.error('Cleanup error for session:', cleanupError)
        }
      }

      logger.info(`Cleaned up ${result.rows.length} expired sessions`)
      return result.rows.length
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error)
      throw error
    }
  }
}

module.exports = ConnectionService
