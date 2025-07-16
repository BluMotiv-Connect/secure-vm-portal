const ReportService = require('../services/reportService')
const ExcelExportService = require('../services/excelExportService')
const Report = require('../models/Report')
const { validationResult } = require('express-validator')
const logger = require('../utils/logger')
const { getClientIP, parsePagination } = require('../utils/helpers')

class ReportController {
  // Generate time report
  static async generateTimeReport(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const {
        startDate,
        endDate,
        userIds,
        vmIds,
        workTypes,
        includeNonWork,
        groupBy,
        format = 'json'
      } = req.query

      const filters = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        userIds: userIds ? userIds.split(',').map(id => parseInt(id)) : [],
        vmIds: vmIds ? vmIds.split(',').map(id => parseInt(id)) : [],
        workTypes: workTypes ? workTypes.split(',') : [],
        includeNonWork: includeNonWork === 'true',
        groupBy
      }

      const reportData = await ReportService.generateTimeReport(filters)

      if (format === 'excel') {
        const excelData = await ExcelExportService.exportTimeReport(
          reportData,
          `time-report-${startDate}-${endDate}.xlsx`
        )

        res.setHeader('Content-Type', excelData.mimeType)
        res.setHeader('Content-Disposition', `attachment; filename="${excelData.filename}"`)
        return res.send(excelData.buffer)
      }

      logger.audit('TIME_REPORT_GENERATED', {
        generatedBy: req.user.id,
        filters,
        recordCount: reportData.data.length,
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        report: reportData
      })
    } catch (error) {
      logger.error('Failed to generate time report:', error)
      res.status(500).json({
        error: 'Failed to generate time report',
        code: 'TIME_REPORT_FAILED'
      })
    }
  }

  // Generate user productivity report
  static async generateUserProductivityReport(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const { startDate, endDate, userIds, format = 'json' } = req.query

      const filters = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        userIds: userIds ? userIds.split(',').map(id => parseInt(id)) : []
      }

      const reportData = await ReportService.generateUserProductivityReport(filters)

      if (format === 'excel') {
        const excelData = await ExcelExportService.exportUserProductivityReport(
          reportData,
          `user-productivity-${startDate}-${endDate}.xlsx`
        )

        res.setHeader('Content-Type', excelData.mimeType)
        res.setHeader('Content-Disposition', `attachment; filename="${excelData.filename}"`)
        return res.send(excelData.buffer)
      }

      logger.audit('USER_PRODUCTIVITY_REPORT_GENERATED', {
        generatedBy: req.user.id,
        filters,
        recordCount: reportData.data.length,
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        report: reportData
      })
    } catch (error) {
      logger.error('Failed to generate user productivity report:', error)
      res.status(500).json({
        error: 'Failed to generate user productivity report',
        code: 'USER_PRODUCTIVITY_REPORT_FAILED'
      })
    }
  }

  // Generate VM usage report
  static async generateVMUsageReport(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const { startDate, endDate, vmIds, format = 'json' } = req.query

      const filters = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        vmIds: vmIds ? vmIds.split(',').map(id => parseInt(id)) : []
      }

      const reportData = await ReportService.generateVMUsageReport(filters)

      if (format === 'excel') {
        const excelData = await ExcelExportService.exportVMUsageReport(
          reportData,
          `vm-usage-${startDate}-${endDate}.xlsx`
        )

        res.setHeader('Content-Type', excelData.mimeType)
        res.setHeader('Content-Disposition', `attachment; filename="${excelData.filename}"`)
        return res.send(excelData.buffer)
      }

      logger.audit('VM_USAGE_REPORT_GENERATED', {
        generatedBy: req.user.id,
        filters,
        recordCount: reportData.data.length,
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        report: reportData
      })
    } catch (error) {
      logger.error('Failed to generate VM usage report:', error)
      res.status(500).json({
        error: 'Failed to generate VM usage report',
        code: 'VM_USAGE_REPORT_FAILED'
      })
    }
  }

  // Generate summary report
  static async generateSummaryReport(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const { startDate, endDate } = req.query

      const filters = {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      }

      const reportData = await ReportService.generateSummaryReport(filters)

      logger.audit('SUMMARY_REPORT_GENERATED', {
        generatedBy: req.user.id,
        filters,
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        report: reportData
      })
    } catch (error) {
      logger.error('Failed to generate summary report:', error)
      res.status(500).json({
        error: 'Failed to generate summary report',
        code: 'SUMMARY_REPORT_FAILED'
      })
    }
  }

  // Get report templates
  static async getReportTemplates(req, res) {
    try {
      const { page, limit, offset } = parsePagination(req.query)
      const { type, isPublic } = req.query

      const options = {
        page,
        limit,
        type,
        isPublic: isPublic !== undefined ? isPublic === 'true' : undefined,
        createdBy: req.user.role === 'admin' ? undefined : req.user.id
      }

      const result = await Report.findAll(options)

      res.json({
        success: true,
        ...result
      })
    } catch (error) {
      logger.error('Failed to get report templates:', error)
      res.status(500).json({
        error: 'Failed to get report templates',
        code: 'REPORT_TEMPLATES_FETCH_FAILED'
      })
    }
  }

  // Create report template
  static async createReportTemplate(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const { name, description, type, parameters, isPublic } = req.body

      const report = await Report.create({
        name,
        description,
        type,
        parameters,
        createdBy: req.user.id,
        isPublic
      })

      logger.audit('REPORT_TEMPLATE_CREATED', {
        createdBy: req.user.id,
        reportId: report.id,
        name: report.name,
        type: report.type,
        ip: getClientIP(req)
      })

      res.status(201).json({
        success: true,
        report: report.toJSON(),
        message: 'Report template created successfully'
      })
    } catch (error) {
      logger.error('Failed to create report template:', error)
      res.status(500).json({
        error: 'Failed to create report template',
        code: 'REPORT_TEMPLATE_CREATE_FAILED'
      })
    }
  }

  // Update report template
  static async updateReportTemplate(req, res) {
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

      const report = await Report.findById(id)
      if (!report) {
        return res.status(404).json({
          error: 'Report template not found',
          code: 'REPORT_TEMPLATE_NOT_FOUND'
        })
      }

      // Check permissions
      if (req.user.role !== 'admin' && report.createdBy !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'REPORT_TEMPLATE_ACCESS_DENIED'
        })
      }

      await report.update(updateData)

      logger.audit('REPORT_TEMPLATE_UPDATED', {
        updatedBy: req.user.id,
        reportId: report.id,
        changes: updateData,
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        report: report.toJSON(),
        message: 'Report template updated successfully'
      })
    } catch (error) {
      logger.error('Failed to update report template:', error)
      res.status(500).json({
        error: 'Failed to update report template',
        code: 'REPORT_TEMPLATE_UPDATE_FAILED'
      })
    }
  }

  // Delete report template
  static async deleteReportTemplate(req, res) {
    try {
      const { id } = req.params

      const report = await Report.findById(id)
      if (!report) {
        return res.status(404).json({
          error: 'Report template not found',
          code: 'REPORT_TEMPLATE_NOT_FOUND'
        })
      }

      // Check permissions
      if (req.user.role !== 'admin' && report.createdBy !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'REPORT_TEMPLATE_ACCESS_DENIED'
        })
      }

      await report.delete()

      logger.audit('REPORT_TEMPLATE_DELETED', {
        deletedBy: req.user.id,
        reportId: report.id,
        name: report.name,
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        message: 'Report template deleted successfully'
      })
    } catch (error) {
      logger.error('Failed to delete report template:', error)
      res.status(500).json({
        error: 'Failed to delete report template',
        code: 'REPORT_TEMPLATE_DELETE_FAILED'
      })
    }
  }
}

module.exports = ReportController
