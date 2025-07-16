const ExcelJS = require('exceljs')
const logger = require('./logger')

class ReportUtils {
  // Format duration from minutes to human readable
  static formatDuration(minutes) {
    if (!minutes || minutes === 0) return '0m'
    
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
    return `${mins}m`
  }

  // Format date for reports
  static formatDate(date, format = 'short') {
    if (!date) return 'N/A'
    
    const d = new Date(date)
    
    switch (format) {
      case 'short':
        return d.toLocaleDateString()
      case 'long':
        return d.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      case 'datetime':
        return d.toLocaleString()
      case 'time':
        return d.toLocaleTimeString()
      default:
        return d.toISOString()
    }
  }

  // Calculate efficiency percentage
  static calculateEfficiency(workMinutes, totalMinutes) {
    if (!totalMinutes || totalMinutes === 0) return 0
    return Math.round((workMinutes / totalMinutes) * 100)
  }

  // Generate Excel workbook with styling
  static async createStyledWorkbook(title = 'Report') {
    const workbook = new ExcelJS.Workbook()
    
    // Set workbook properties
    workbook.creator = 'Secure VM Portal'
    workbook.created = new Date()
    workbook.modified = new Date()
    workbook.title = title
    
    return workbook
  }

  // Apply header styling to worksheet
  static styleWorksheetHeaders(worksheet, headerRow = 1) {
    const headerRowObj = worksheet.getRow(headerRow)
    
    headerRowObj.font = { 
      bold: true, 
      color: { argb: 'FFFFFFFF' },
      size: 12
    }
    
    headerRowObj.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    }
    
    headerRowObj.alignment = { 
      vertical: 'middle', 
      horizontal: 'center' 
    }
    
    headerRowObj.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  }

  // Add conditional formatting for efficiency
  static addEfficiencyFormatting(worksheet, range) {
    worksheet.addConditionalFormatting({
      ref: range,
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
  }

  // Group data by specified field
  static groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key]
      if (!groups[group]) {
        groups[group] = []
      }
      groups[group].push(item)
      return groups
    }, {})
  }

  // Calculate summary statistics
  static calculateSummaryStats(data, timeField = 'totalMinutes') {
    if (!data || data.length === 0) {
      return {
        total: 0,
        average: 0,
        min: 0,
        max: 0,
        count: 0
      }
    }

    const values = data.map(item => item[timeField] || 0)
    
    return {
      total: values.reduce((sum, val) => sum + val, 0),
      average: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: data.length
    }
  }

  // Generate chart data for Excel
  static generateChartData(data, xField, yField) {
    return data.map(item => ({
      category: item[xField],
      value: item[yField]
    }))
  }

  // Create summary sheet for workbook
  static async createSummarySheet(workbook, summaryData) {
    const worksheet = workbook.addWorksheet('Summary')
    
    // Title
    worksheet.mergeCells('A1:D1')
    worksheet.getCell('A1').value = 'Report Summary'
    worksheet.getCell('A1').font = { size: 16, bold: true }
    worksheet.getCell('A1').alignment = { horizontal: 'center' }
    
    // Summary data
    let row = 3
    Object.entries(summaryData).forEach(([key, value]) => {
      worksheet.getCell(`A${row}`).value = key
      worksheet.getCell(`B${row}`).value = value
      row++
    })
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 20
    })
    
    return worksheet
  }

  // Validate report parameters
  static validateReportParams(params) {
    const errors = []
    
    if (!params.startDate) {
      errors.push('Start date is required')
    }
    
    if (!params.endDate) {
      errors.push('End date is required')
    }
    
    if (params.startDate && params.endDate) {
      const start = new Date(params.startDate)
      const end = new Date(params.endDate)
      
      if (start > end) {
        errors.push('Start date must be before end date')
      }
      
      const daysDiff = (end - start) / (1000 * 60 * 60 * 24)
      if (daysDiff > 365) {
        errors.push('Date range cannot exceed 365 days')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Generate filename with timestamp
  static generateFilename(baseName, extension = 'xlsx') {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    return `${baseName}_${timestamp}.${extension}`
  }

  // Convert data to CSV format
  static convertToCSV(data, headers) {
    if (!data || data.length === 0) return ''
    
    const csvHeaders = headers || Object.keys(data[0])
    const csvRows = data.map(row => 
      csvHeaders.map(header => {
        const value = row[header]
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value
      }).join(',')
    )
    
    return [csvHeaders.join(','), ...csvRows].join('\n')
  }

  // Add data validation to worksheet
  static addDataValidation(worksheet, range, validationRule) {
    worksheet.getCell(range).dataValidation = validationRule
  }

  // Create pivot table data structure
  static createPivotData(data, rowField, valueField, aggregation = 'sum') {
    const grouped = this.groupBy(data, rowField)
    
    return Object.entries(grouped).map(([key, items]) => {
      let value
      const values = items.map(item => item[valueField] || 0)
      
      switch (aggregation) {
        case 'sum':
          value = values.reduce((sum, val) => sum + val, 0)
          break
        case 'avg':
          value = values.reduce((sum, val) => sum + val, 0) / values.length
          break
        case 'count':
          value = values.length
          break
        case 'max':
          value = Math.max(...values)
          break
        case 'min':
          value = Math.min(...values)
          break
        default:
          value = values.reduce((sum, val) => sum + val, 0)
      }
      
      return {
        category: key,
        value: Math.round(value * 100) / 100
      }
    })
  }

  // Log report generation
  static logReportGeneration(reportType, params, recordCount, userId) {
    logger.audit('REPORT_GENERATED', {
      reportType,
      parameters: params,
      recordCount,
      generatedBy: userId,
      timestamp: new Date().toISOString()
    })
  }
}

module.exports = ReportUtils
