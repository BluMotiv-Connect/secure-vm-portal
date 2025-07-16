const ConnectionService = require('../services/connectionService')
const BrowserConnectionService = require('../services/browserConnectionService')
const Session = require('../models/Session')
const { validationResult } = require('express-validator')
const logger = require('../utils/logger')
const { getClientIP } = require('../utils/helpers')
const fs = require('fs').promises
const path = require('path')

class ConnectionController {
  // Initiate VM connection
  static async initiateConnection(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const { vmId } = req.body
      const userId = req.user.id
      const clientIp = getClientIP(req)
      const userAgent = req.get('User-Agent')

      const result = await ConnectionService.initiateConnection(
        userId,
        vmId,
        clientIp,
        userAgent
      )

      res.json({
        success: true,
        ...result,
        message: 'Connection initiated successfully'
      })
    } catch (error) {
      logger.error('Connection initiation failed:', error)
      res.status(500).json({
        error: error.message || 'Failed to initiate connection',
        code: 'CONNECTION_INITIATION_FAILED'
      })
    }
  }

  // End VM connection
  static async endConnection(req, res) {
    try {
      const { sessionId } = req.params
      const { reason = 'user_disconnect' } = req.body
      const userId = req.user.id

      const session = await ConnectionService.endConnection(sessionId, userId, reason)

      res.json({
        success: true,
        session,
        message: 'Connection ended successfully'
      })
    } catch (error) {
      logger.error('Connection termination failed:', error)
      res.status(500).json({
        error: error.message || 'Failed to end connection',
        code: 'CONNECTION_TERMINATION_FAILED'
      })
    }
  }

  // Get active connections
  static async getActiveConnections(req, res) {
    try {
      const userId = req.user.id
      const connections = await ConnectionService.getActiveConnections(userId)

      res.json({
        success: true,
        connections
      })
    } catch (error) {
      logger.error('Failed to get active connections:', error)
      res.status(500).json({
        error: 'Failed to get active connections',
        code: 'ACTIVE_CONNECTIONS_FETCH_FAILED'
      })
    }
  }

  // Get connection history
  static async getConnectionHistory(req, res) {
    try {
      const userId = req.user.id
      const { page = 1, limit = 20, vmId, startDate, endDate } = req.query

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        vmId: vmId ? parseInt(vmId) : undefined,
        startDate,
        endDate
      }

      const result = await ConnectionService.getConnectionHistory(userId, options)

      res.json({
        success: true,
        ...result
      })
    } catch (error) {
      logger.error('Failed to get connection history:', error)
      res.status(500).json({
        error: 'Failed to get connection history',
        code: 'CONNECTION_HISTORY_FETCH_FAILED'
      })
    }
  }

  // Monitor session
  static async monitorSession(req, res) {
    try {
      const { sessionId } = req.params
      const result = await ConnectionService.monitorSession(sessionId)

      res.json({
        success: true,
        ...result
      })
    } catch (error) {
      logger.error('Session monitoring failed:', error)
      res.status(500).json({
        error: error.message || 'Failed to monitor session',
        code: 'SESSION_MONITORING_FAILED'
      })
    }
  }

  // Download connection files
  static async downloadConnectionFiles(req, res) {
    try {
      const { sessionId, type } = req.params
      const userId = req.user.id

      // Verify session belongs to user
      const session = await Session.findBySessionId(sessionId)
      if (!session || session.userId !== userId) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'SESSION_ACCESS_DENIED'
        })
      }

      let filePath
      let fileName
      let contentType

      if (type === 'rdp') {
        filePath = path.join(require('os').tmpdir(), `session_${sessionId}.rdp`)
        fileName = `vm-connection-${sessionId}.rdp`
        contentType = 'application/x-rdp'
      } else if (type === 'ssh') {
        const platform = req.get('User-Agent')?.includes('Windows') ? 'bat' : 'sh'
        filePath = path.join(require('os').tmpdir(), `ssh_${sessionId}.${platform}`)
        fileName = `vm-connection-${sessionId}.${platform}`
        contentType = 'application/octet-stream'
      } else {
        return res.status(400).json({
          error: 'Invalid connection type',
          code: 'INVALID_CONNECTION_TYPE'
        })
      }

      // Check if file exists
      try {
        await fs.access(filePath)
      } catch (error) {
        return res.status(404).json({
          error: 'Connection file not found',
          code: 'CONNECTION_FILE_NOT_FOUND'
        })
      }

      // Return file content as JSON for debugging
      const fileContent = await fs.readFile(filePath, 'utf8')
      res.json({
        success: true,
        fileName,
        contentType,
        fileContent
      })

      logger.audit('CONNECTION_FILE_DOWNLOADED', {
        sessionId,
        userId,
        fileType: type,
        fileName
      })
    } catch (error) {
      logger.error('Connection file download failed:', error)
      res.status(500).json({
        error: 'Failed to download connection file',
        code: 'CONNECTION_FILE_DOWNLOAD_FAILED'
      })
    }
  }

  // Get connection statistics
  static async getConnectionStats(req, res) {
    try {
      const userId = req.user.role === 'admin' ? null : req.user.id
      const { days = 30 } = req.query

      const stats = await ConnectionService.getConnectionStats(userId, parseInt(days))

      res.json({
        success: true,
        stats
      })
    } catch (error) {
      logger.error('Failed to get connection stats:', error)
      res.status(500).json({
        error: 'Failed to get connection statistics',
        code: 'CONNECTION_STATS_FAILED'
      })
    }
  }

  // Get browser connection status
  static async getBrowserConnectionStatus(req, res) {
    try {
      const { sessionId } = req.params
      const result = await BrowserConnectionService.getConnectionStatus(sessionId)

      res.json({
        success: true,
        ...result
      })
    } catch (error) {
      logger.error('Browser connection status check failed:', error)
      res.status(500).json({
        error: error.message || 'Failed to check connection status',
        code: 'BROWSER_CONNECTION_STATUS_FAILED'
      })
    }
  }

  // Force end browser connection
  static async forceEndBrowserConnection(req, res) {
    try {
      const { sessionId } = req.params
      const result = await BrowserConnectionService.forceEndConnection(sessionId)

      res.json({
        success: true,
        ...result
      })
    } catch (error) {
      logger.error('Force end browser connection failed:', error)
      res.status(500).json({
        error: error.message || 'Failed to force end connection',
        code: 'FORCE_END_CONNECTION_FAILED'
      })
    }
  }
}

module.exports = ConnectionController
