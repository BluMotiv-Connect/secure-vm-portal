import { apiClient } from './apiClient'

export const reportService = {
  // Generate time report
  async generateTimeReport(params = {}) {
    try {
      const response = await apiClient.get('/reports/time', { params })
      return response
    } catch (error) {
      throw error
    }
  },

  // Generate user productivity report
  async generateUserProductivityReport(params = {}) {
    try {
      const response = await apiClient.get('/reports/user-productivity', { params })
      return response
    } catch (error) {
      throw error
    }
  },

  // Generate VM usage report
  async generateVMUsageReport(params = {}) {
    try {
      const response = await apiClient.get('/reports/vm-usage', { params })
      return response
    } catch (error) {
      throw error
    }
  },

  // Generate summary report
  async generateSummaryReport(params = {}) {
    try {
      const response = await apiClient.get('/reports/summary', { params })
      return response
    } catch (error) {
      throw error
    }
  },

  // Download Excel report
  async downloadExcelReport(reportType, params = {}) {
    try {
      const response = await apiClient.get(`/reports/${reportType}`, {
        params: { ...params, format: 'excel' },
        responseType: 'blob'
      })
      return response
    } catch (error) {
      throw error
    }
  },

  // Get report templates
  async getReportTemplates(params = {}) {
    try {
      const response = await apiClient.get('/reports/templates', { params })
      return response
    } catch (error) {
      throw error
    }
  },

  // Create report template
  async createReportTemplate(templateData) {
    try {
      const response = await apiClient.post('/reports/templates', templateData)
      return response
    } catch (error) {
      throw error
    }
  },

  // Update report template
  async updateReportTemplate(id, templateData) {
    try {
      const response = await apiClient.put(`/reports/templates/${id}`, templateData)
      return response
    } catch (error) {
      throw error
    }
  },

  // Delete report template
  async deleteReportTemplate(id) {
    try {
      const response = await apiClient.delete(`/reports/templates/${id}`)
      return response
    } catch (error) {
      throw error
    }
  }
}
