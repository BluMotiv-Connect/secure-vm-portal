const ExcelJS = require('exceljs')
const logger = require('../utils/logger')

class ExcelExportService {
  // Export time report to Excel
  static async exportTimeReport(reportData, filename = 'time-report.xlsx') {
    try {
      const workbook = new ExcelJS.Workbook()
      
      // Set workbook properties
      workbook.creator = 'Secure VM Portal'
      workbook.created = new Date()
      workbook.modified = new Date()

      // Create summary sheet
      await this.createSummarySheet(workbook, reportData)
      
      // Create detailed data sheet
      await this.createDetailedDataSheet(workbook, reportData)
      
      // Create charts sheet if data is available
      if (reportData.data && reportData.data.length > 0) {
        await this.createChartsSheet(workbook, reportData)
      }

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer()
      
      logger.audit('EXCEL_REPORT_EXPORTED', {
        reportType: 'time',
        filename,
        recordCount: reportData.data?.length || 0
      })

      return {
        buffer,
        filename,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    } catch (error) {
      logger.error('Failed to export time report to Excel:', error)
      throw error
    }
  }

  // Export user productivity report to Excel
  static async exportUserProductivityReport(reportData, filename = 'user-productivity-report.xlsx') {
    try {
      const workbook = new ExcelJS.Workbook()
      
      workbook.creator = 'Secure VM Portal'
      workbook.created = new Date()
      workbook.modified = new Date()

      // Create productivity summary sheet
      const worksheet = workbook.addWorksheet('User Productivity')
      
      // Add headers
      worksheet.columns = [
        { header: 'User Name', key: 'userName', width: 20 },
        { header: 'Active Days', key: 'activeDays', width: 12 },
        { header: 'Total Hours', key: 'totalHours', width: 12 },
        { header: 'Work Hours', key: 'workHours', width: 12 },
        { header: 'Break Hours', key: 'breakHours', width: 12 },
        { header: 'Meeting Hours', key: 'meetingHours', width: 12 },
        { header: 'Avg Daily Hours', key: 'avgDailyHours', width: 15 },
        { header: 'Avg Sessions/Day', key: 'avgDailySessions', width: 15 },
        { header: 'Productivity %', key: 'productivityPercentage', width: 15 },
        { header: 'Avg Day Length', key: 'avgDayLength', width: 15 }
      ]

      // Style headers
      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      }
      worksheet.getRow(1).font.color = { argb: 'FFFFFFFF' }

      // Add data
      reportData.data.forEach(user => {
        worksheet.addRow({
          userName: user.userName,
          activeDays: user.activeDays,
          totalHours: Math.round((user.totalMinutes / 60) * 100) / 100,
          workHours: Math.round((user.totalWorkMinutes / 60) * 100) / 100,
          breakHours: Math.round((user.totalBreakMinutes / 60) * 100) / 100,
          meetingHours: Math.round((user.totalMeetingMinutes / 60) * 100) / 100,
          avgDailyHours: Math.round((user.avgDailyMinutes / 60) * 100) / 100,
          avgDailySessions: Math.round(user.avgDailySessions * 100) / 100,
          productivityPercentage: user.productivityPercentage,
          avgDayLength: Math.round((user.avgDayLengthMinutes / 60) * 100) / 100
        })
      })

      // Add conditional formatting for productivity percentage
      worksheet.addConditionalFormatting({
        ref: `I2:I${worksheet.rowCount}`,
        rules: [
          {
            type: 'colorScale',
            cfvo: [
              { type: 'num', value: 0 },
              { type: 'num', value: 50 },
              { type: 'num', value: 100 }
            ],
            color: [
              { argb: 'FFFF0000' }, // Red
              { argb: 'FFFFFF00' }, // Yellow
              { argb: 'FF00FF00' }  // Green
            ]
          }
        ]
      })

      const buffer = await workbook.xlsx.writeBuffer()
      
      logger.audit('EXCEL_REPORT_EXPORTED', {
        reportType: 'userProductivity',
        filename,
        recordCount: reportData.data?.length || 0
      })

      return {
        buffer,
        filename,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    } catch (error) {
      logger.error('Failed to export user productivity report to Excel:', error)
      throw error
    }
  }

  // Export VM usage report to Excel
  static async exportVMUsageReport(reportData, filename = 'vm-usage-report.xlsx') {
    try {
      const workbook = new ExcelJS.Workbook()
      
      workbook.creator = 'Secure VM Portal'
      workbook.created = new Date()
      workbook.modified = new Date()

      const worksheet = workbook.addWorksheet('VM Usage')
      
      // Add headers
      worksheet.columns = [
        { header: 'VM Name', key: 'vmName', width: 20 },
        { header: 'IP Address', key: 'ipAddress', width: 15 },
        { header: 'OS Type', key: 'osType', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Unique Users', key: 'uniqueUsers', width: 12 },
        { header: 'Total Sessions', key: 'totalSessions', width: 15 },
        { header: 'Usage Hours', key: 'usageHours', width: 12 },
        { header: 'Avg Session (min)', key: 'avgSessionMinutes', width: 18 },
        { header: 'Active Days', key: 'activeDays', width: 12 },
        { header: 'Work Sessions', key: 'workSessions', width: 15 },
        { header: 'Work %', key: 'workSessionPercentage', width: 10 }
      ]

      // Style headers
      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF70AD47' }
      }
      worksheet.getRow(1).font.color = { argb: 'FFFFFFFF' }

      // Add data
      reportData.data.forEach(vm => {
        worksheet.addRow({
          vmName: vm.vmName,
          ipAddress: vm.ipAddress,
          osType: vm.osType,
          status: vm.status,
          uniqueUsers: vm.uniqueUsers,
          totalSessions: vm.totalSessions,
          usageHours: Math.round((vm.totalUsageMinutes / 60) * 100) / 100,
          avgSessionMinutes: Math.round(vm.avgSessionMinutes * 100) / 100,
          activeDays: vm.activeDays,
          workSessions: vm.workSessions,
          workSessionPercentage: vm.workSessionPercentage
        })
      })

      // Add status color coding
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) { // Skip header
          const statusCell = row.getCell('status')
          switch (statusCell.value) {
            case 'online':
              statusCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF90EE90' }
              }
              break
            case 'offline':
              statusCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFCCCB' }
              }
              break
            case 'maintenance':
              statusCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFD700' }
              }
              break
          }
        }
      })

      const buffer = await workbook.xlsx.writeBuffer()
      
      logger.audit('EXCEL_REPORT_EXPORTED', {
        reportType: 'vmUsage',
        filename,
        recordCount: reportData.data?.length || 0
      })

      return {
        buffer,
        filename,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    } catch (error) {
      logger.error('Failed to export VM usage report to Excel:', error)
      throw error
    }
  }

  // Helper methods for creating sheets
  static async createSummarySheet(workbook, reportData) {
    const worksheet = workbook.addWorksheet('Summary')
    
    // Add title
    worksheet.mergeCells('A1:D1')
    worksheet.getCell('A1').value = 'Time Report Summary'
    worksheet.getCell('A1').font = { size: 16, bold: true }
    worksheet.getCell('A1').alignment = { horizontal: 'center' }

    // Add generation info
    worksheet.getCell('A3').value = 'Generated:'
    worksheet.getCell('B3').value = new Date(reportData.generatedAt).toLocaleString()
    
    worksheet.getCell('A4').value = 'Period:'
    worksheet.getCell('B4').value = `${reportData.filters.startDate} to ${reportData.filters.endDate}`

    // Add summary statistics
    if (reportData.summary) {
      worksheet.getCell('A6').value = 'Summary Statistics'
      worksheet.getCell('A6').font = { bold: true }
      
      worksheet.getCell('A7').value = 'Total Sessions:'
      worksheet.getCell('B7').value = reportData.summary.totalSessions
      
      worksheet.getCell('A8').value = 'Total Hours:'
      worksheet.getCell('B8').value = Math.round((reportData.summary.totalMinutes / 60) * 100) / 100
      
      worksheet.getCell('A9').value = 'Billable Hours:'
      worksheet.getCell('B9').value = Math.round((reportData.summary.totalBillableMinutes / 60) * 100) / 100
      
      worksheet.getCell('A10').value = 'Unique Users:'
      worksheet.getCell('B10').value = reportData.summary.uniqueUsers
      
      worksheet.getCell('A11').value = 'Unique VMs:'
      worksheet.getCell('B11').value = reportData.summary.uniqueVMs
    }
  }

  static async createDetailedDataSheet(workbook, reportData) {
    const worksheet = workbook.addWorksheet('Detailed Data')
    
    // Add headers
    worksheet.columns = [
      { header: 'User Name', key: 'userName', width: 20 },
      { header: 'VM Name', key: 'vmName', width: 20 },
      { header: 'IP Address', key: 'vmIpAddress', width: 15 },
      { header: 'Work Type', key: 'workType', width: 12 },
      { header: 'Date', key: 'workDate', width: 12 },
      { header: 'Sessions', key: 'sessionCount', width: 10 },
      { header: 'Total Hours', key: 'totalHours', width: 12 },
      { header: 'Avg Session (min)', key: 'avgSessionMinutes', width: 18 },
      { header: 'Billable Sessions', key: 'billableSessions', width: 15 },
      { header: 'Billable Hours', key: 'billableHours', width: 15 }
    ]

    // Style headers
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    }
    worksheet.getRow(1).font.color = { argb: 'FFFFFFFF' }

    // Add data
    reportData.data.forEach(row => {
      worksheet.addRow({
        userName: row.userName,
        vmName: row.vmName,
        vmIpAddress: row.vmIpAddress,
        workType: row.workType,
        workDate: row.workDate,
        sessionCount: row.sessionCount,
        totalHours: Math.round((row.totalMinutes / 60) * 100) / 100,
        avgSessionMinutes: Math.round(row.avgSessionMinutes * 100) / 100,
        billableSessions: row.billableSessions,
        billableHours: Math.round((row.billableMinutes / 60) * 100) / 100
      })
    })
  }

  static async createChartsSheet(workbook, reportData) {
    const worksheet = workbook.addWorksheet('Charts Data')
    
    // Prepare data for charts
    const userSummary = {}
    const vmSummary = {}
    const workTypeSummary = {}

    reportData.data.forEach(row => {
      // User summary
      if (!userSummary[row.userName]) {
        userSummary[row.userName] = 0
      }
      userSummary[row.userName] += row.totalMinutes

      // VM summary
      if (!vmSummary[row.vmName]) {
        vmSummary[row.vmName] = 0
      }
      vmSummary[row.vmName] += row.totalMinutes

      // Work type summary
      if (!workTypeSummary[row.workType]) {
        workTypeSummary[row.workType] = 0
      }
      workTypeSummary[row.workType] += row.totalMinutes
    })

    // Add user summary data
    worksheet.getCell('A1').value = 'User Summary'
    worksheet.getCell('A1').font = { bold: true }
    worksheet.getCell('A2').value = 'User'
    worksheet.getCell('B2').value = 'Hours'
    
    let row = 3
    Object.entries(userSummary).forEach(([user, minutes]) => {
      worksheet.getCell(`A${row}`).value = user
      worksheet.getCell(`B${row}`).value = Math.round((minutes / 60) * 100) / 100
      row++
    })
  }
}

module.exports = ExcelExportService
