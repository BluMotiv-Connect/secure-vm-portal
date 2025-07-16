const WorkLog = require('../models/WorkLog')
const NonWorkLog = require('../models/NonWorkLog')
const WorkLogService = require('../services/workLogService')
const TimeTrackingService = require('../services/timeTrackingService')
const { validationResult } = require('express-validator')
const logger = require('../utils/logger')
const { getClientIP, parsePagination } = require('../utils/helpers')

class WorkLogController {
  // Start work session
  static async startWorkSession(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const { vmId, sessionId, taskTitle, taskDescription, workType, isBillable } = req.body
      const userId = req.user.id

      const workLog = await WorkLogService.startWorkSession(userId, vmId, sessionId, {
        taskTitle,
        taskDescription,
        workType,
        isBillable
      })

      res.json({
        success: true,
        workLog: workLog.toJSON(),
        message: 'Work session started successfully'
      })
    } catch (error) {
      logger.error('Failed to start work session:', error)
      res.status(500).json({
        error: error.message || 'Failed to start work session',
        code: 'WORK_SESSION_START_FAILED'
      })
    }
  }

  // End work session
  static async endWorkSession(req, res) {
    try {
      const { id } = req.params
      const { endTime } = req.body
      const userId = req.user.id

      const workLog = await WorkLogService.endWorkSession(
        parseInt(id), 
        userId, 
        endTime ? new Date(endTime) : new Date()
      )

      res.json({
        success: true,
        workLog: workLog.toJSON(),
        message: 'Work session ended successfully'
      })
    } catch (error) {
      logger.error('Failed to end work session:', error)
      res.status(500).json({
        error: error.message || 'Failed to end work session',
        code: 'WORK_SESSION_END_FAILED'
      })
    }
  }

  // Get work logs
  static async getWorkLogs(req, res) {
    try {
      const { page, limit, offset } = parsePagination(req.query)
      const { vmId, workType, startDate, endDate, isBillable, sortBy, sortOrder } = req.query
      const userId = req.user.role === 'admin' ? req.query.userId : req.user.id

      const options = {
        page,
        limit,
        userId: userId ? parseInt(userId) : undefined,
        vmId: vmId ? parseInt(vmId) : undefined,
        workType,
        startDate,
        endDate,
        isBillable: isBillable !== undefined ? isBillable === 'true' : undefined,
        sortBy,
        sortOrder
      }

      const result = await WorkLog.findAll(options)

      logger.audit('WORK_LOGS_FETCHED', {
        requestedBy: req.user.id,
        filters: options,
        resultCount: result.workLogs.length,
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        ...result
      })
    } catch (error) {
      logger.error('Failed to fetch work logs:', error)
      res.status(500).json({
        error: 'Failed to fetch work logs',
        code: 'WORK_LOGS_FETCH_FAILED'
      })
    }
  }

  // Get work log by ID
  static async getWorkLogById(req, res) {
    try {
      const { id } = req.params
      const workLog = await WorkLog.findById(id)

      if (!workLog) {
        return res.status(404).json({
          error: 'Work log not found',
          code: 'WORK_LOG_NOT_FOUND'
        })
      }

      // Check access permissions
      if (req.user.role !== 'admin' && workLog.userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'WORK_LOG_ACCESS_DENIED'
        })
      }

      res.json({
        success: true,
        workLog: workLog.toJSON()
      })
    } catch (error) {
      logger.error('Failed to fetch work log:', error)
      res.status(500).json({
        error: 'Failed to fetch work log',
        code: 'WORK_LOG_FETCH_FAILED'
      })
    }
  }

  // Update work log
  static async updateWorkLog(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const { id } = req.params
      const updateData = req.body
      const userId = req.user.id

      const workLog = await WorkLog.findById(id)
      if (!workLog) {
        return res.status(404).json({
          error: 'Work log not found',
          code: 'WORK_LOG_NOT_FOUND'
        })
      }

      // Check access permissions
      if (req.user.role !== 'admin' && workLog.userId !== userId) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'WORK_LOG_ACCESS_DENIED'
        })
      }

      await workLog.update(updateData)

      logger.audit('WORK_LOG_UPDATED', {
        updatedBy: userId,
        workLogId: workLog.id,
        changes: updateData,
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        workLog: workLog.toJSON(),
        message: 'Work log updated successfully'
      })
    } catch (error) {
      logger.error('Failed to update work log:', error)
      res.status(500).json({
        error: 'Failed to update work log',
        code: 'WORK_LOG_UPDATE_FAILED'
      })
    }
  }

  // Delete work log
  static async deleteWorkLog(req, res) {
    try {
      const { id } = req.params
      const userId = req.user.id

      const workLog = await WorkLog.findById(id)
      if (!workLog) {
        return res.status(404).json({
          error: 'Work log not found',
          code: 'WORK_LOG_NOT_FOUND'
        })
      }

      // Check access permissions
      if (req.user.role !== 'admin' && workLog.userId !== userId) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'WORK_LOG_ACCESS_DENIED'
        })
      }

      await workLog.delete()

      logger.audit('WORK_LOG_DELETED', {
        deletedBy: userId,
        workLogId: workLog.id,
        taskTitle: workLog.taskTitle,
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        message: 'Work log deleted successfully'
      })
    } catch (error) {
      logger.error('Failed to delete work log:', error)
      res.status(500).json({
        error: 'Failed to delete work log',
        code: 'WORK_LOG_DELETE_FAILED'
      })
    }
  }

  // Get active work log
  static async getActiveWorkLog(req, res) {
    try {
      const userId = req.user.id
      const activeWorkLog = await WorkLog.getActiveWorkLog(userId)

      res.json({
        success: true,
        activeWorkLog
      })
    } catch (error) {
      logger.error('Failed to get active work log:', error)
      res.status(500).json({
        error: 'Failed to get active work log',
        code: 'ACTIVE_WORK_LOG_FETCH_FAILED'
      })
    }
  }

  // Get work summary
  static async getWorkSummary(req, res) {
    try {
      const { startDate, endDate } = req.query
      const userId = req.user.role === 'admin' ? req.query.userId : req.user.id

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'Start date and end date are required',
          code: 'MISSING_DATE_RANGE'
        })
      }

      const summary = await WorkLogService.getUserWorkSummary(
        userId ? parseInt(userId) : req.user.id,
        new Date(startDate),
        new Date(endDate)
      )

      res.json({
        success: true,
        summary
      })
    } catch (error) {
      logger.error('Failed to get work summary:', error)
      res.status(500).json({
        error: 'Failed to get work summary',
        code: 'WORK_SUMMARY_FETCH_FAILED'
      })
    }
  }

  // Log non-work time
  static async logNonWorkTime(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const { reason, startTime, endTime } = req.body
      const userId = req.user.id

      const nonWorkLog = await WorkLogService.logNonWorkTime(
        userId,
        reason,
        new Date(startTime),
        endTime ? new Date(endTime) : new Date()
      )

      res.json({
        success: true,
        nonWorkLog: nonWorkLog.toJSON(),
        message: 'Non-work time logged successfully'
      })
    } catch (error) {
      logger.error('Failed to log non-work time:', error)
      res.status(500).json({
        error: 'Failed to log non-work time',
        code: 'NON_WORK_LOG_FAILED'
      })
    }
  }

  // Get time tracking data
  static async getTimeTracking(req, res) {
    try {
      const { startDate, endDate } = req.query
      const userId = req.user.role === 'admin' ? req.query.userId : req.user.id

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'Start date and end date are required',
          code: 'MISSING_DATE_RANGE'
        })
      }

      const timeData = await TimeTrackingService.getUserTimeTracking(
        userId ? parseInt(userId) : req.user.id,
        new Date(startDate),
        new Date(endDate)
      )

      res.json({
        success: true,
        timeTracking: timeData
      })
    } catch (error) {
      logger.error('Failed to get time tracking data:', error)
      res.status(500).json({
        error: 'Failed to get time tracking data',
        code: 'TIME_TRACKING_FETCH_FAILED'
      })
    }
  }

  // Get work statistics
  static async getWorkStats(req, res) {
    try {
      const { days = 30 } = req.query
      const userId = req.user.role === 'admin' ? null : req.user.id

      const stats = await WorkLogService.getWorkStatistics(userId, parseInt(days))

      res.json({
        success: true,
        stats
      })
    } catch (error) {
      logger.error('Failed to get work statistics:', error)
      res.status(500).json({
        error: 'Failed to get work statistics',
        code: 'WORK_STATS_FAILED'
      })
    }
  }

  // Generate time report
  static async generateTimeReport(req, res) {
    try {
      const { startDate, endDate, format = 'detailed' } = req.query
      const userId = req.user.role === 'admin' ? req.query.userId : req.user.id

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'Start date and end date are required',
          code: 'MISSING_DATE_RANGE'
        })
      }

      const report = await TimeTrackingService.generateTimeReport(
        userId ? parseInt(userId) : req.user.id,
        new Date(startDate),
        new Date(endDate),
        format
      )

      logger.audit('TIME_REPORT_GENERATED', {
        generatedBy: req.user.id,
        targetUserId: userId,
        period: { startDate, endDate },
        format,
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        report
      })
    } catch (error) {
      logger.error('Failed to generate time report:', error)
      res.status(500).json({
        error: 'Failed to generate time report',
        code: 'TIME_REPORT_FAILED'
      })
    }
  }
}

module.exports = WorkLogController
