import { apiClient } from './apiClient'

export const workLogService = {
  // Start work session
  async startWorkSession(workData) {
    try {
      const response = await apiClient.post('/work-logs/start', workData)
      return response
    } catch (error) {
      throw error
    }
  },

  // End work session
  async endWorkSession(workLogId, endTime) {
    try {
      const response = await apiClient.post(`/work-logs/${workLogId}/end`, { endTime })
      return response
    } catch (error) {
      throw error
    }
  },

  // Get work logs
  async getWorkLogs(params = {}) {
    try {
      const response = await apiClient.get('/work-logs', { params })
      return response
    } catch (error) {
      throw error
    }
  },

  // Get work log by ID
  async getWorkLogById(id) {
    try {
      const response = await apiClient.get(`/work-logs/${id}`)
      return response
    } catch (error) {
      throw error
    }
  },

  // Update work log
  async updateWorkLog(id, workData) {
    try {
      const response = await apiClient.put(`/work-logs/${id}`, workData)
      return response
    } catch (error) {
      throw error
    }
  },

  // Delete work log
  async deleteWorkLog(id) {
    try {
      const response = await apiClient.delete(`/work-logs/${id}`)
      return response
    } catch (error) {
      throw error
    }
  },

  // Get active work log
  async getActiveWorkLog() {
    try {
      const response = await apiClient.get('/work-logs/active')
      return response
    } catch (error) {
      throw error
    }
  },

  // Get work summary
  async getWorkSummary(startDate, endDate, userId = null) {
    try {
      const params = { startDate, endDate }
      if (userId) params.userId = userId
      
      const response = await apiClient.get('/work-logs/summary', { params })
      return response
    } catch (error) {
      throw error
    }
  },

  // Get time tracking data
  async getTimeTracking(startDate, endDate, userId = null) {
    try {
      const params = { startDate, endDate }
      if (userId) params.userId = userId
      
      const response = await apiClient.get('/work-logs/time-tracking', { params })
      return response
    } catch (error) {
      throw error
    }
  },

  // Get work statistics
  async getWorkStats(days = 30) {
    try {
      const response = await apiClient.get('/work-logs/stats', { params: { days } })
      return response
    } catch (error) {
      throw error
    }
  },

  // Log non-work time
  async logNonWorkTime(nonWorkData) {
    try {
      const response = await apiClient.post('/work-logs/non-work', nonWorkData)
      return response
    } catch (error) {
      throw error
    }
  },

  // Generate time report
  async generateTimeReport(startDate, endDate, format = 'detailed', userId = null) {
    try {
      const params = { startDate, endDate, format }
      if (userId) params.userId = userId
      
      const response = await apiClient.get('/work-logs/report', { params })
      return response
    } catch (error) {
      throw error
    }
  }
}
