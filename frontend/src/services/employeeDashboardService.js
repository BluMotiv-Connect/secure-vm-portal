import { apiClient } from './apiClient'
import { dedupeRequest } from '../utils/debounce'

export const employeeDashboardService = {
  // Get comprehensive dashboard stats
  async getDashboardStats(timeRange = '30') {
    try {
      const response = await apiClient.get(`/employee/dashboard/stats?days=${timeRange}`)
      return response.data || {}
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
      throw error
    }
  },

  // Get daily work hours for chart
  async getDailyWorkHours(days = 30) {
    try {
      const response = await apiClient.get(`/employee/dashboard/daily-hours?days=${days}`)
      return Array.isArray(response.data) ? response.data : []
    } catch (error) {
      console.error('Failed to fetch daily work hours:', error)
      throw error
    }
  },

  // Get task completion trends
  async getTaskCompletionStats(days = 30) {
    return dedupeRequest(`task-completion-${days}`, async () => {
      try {
        const response = await apiClient.get(`/employee/dashboard/task-completion?days=${days}`)
        return response.data || {}
      } catch (error) {
        console.error('Failed to fetch task completion stats:', error)
        throw error
      }
    })
  },

  // Get project time distribution
  async getProjectTimeDistribution(days = 30) {
    return dedupeRequest(`project-time-${days}`, async () => {
      try {
        const response = await apiClient.get(`/employee/dashboard/project-time?days=${days}`)
        return Array.isArray(response.data) ? response.data : []
      } catch (error) {
        console.error('Failed to fetch project time distribution:', error)
        throw error
      }
    })
  },

  // Get work session quality metrics
  async getSessionQualityMetrics(days = 30) {
    try {
      const response = await apiClient.get(`/employee/dashboard/session-quality?days=${days}`)
      return response.data || {}
    } catch (error) {
      console.error('Failed to fetch session quality metrics:', error)
      throw error
    }
  },

  // Get productivity streaks and achievements
  async getProductivityStreaks() {
    try {
      const response = await apiClient.get('/employee/dashboard/streaks')
      return response.data || {}
    } catch (error) {
      console.error('Failed to fetch productivity streaks:', error)
      throw error
    }
  },

  // Get current week overview
  async getCurrentWeekOverview() {
    return dedupeRequest('current-week', async () => {
      try {
        const response = await apiClient.get('/employee/dashboard/current-week')
        return response.data || {}
      } catch (error) {
        console.error('Failed to fetch current week overview:', error)
        throw error
      }
    })
  },

  // Get work type distribution
  async getWorkTypeDistribution(days = 30) {
    try {
      const response = await apiClient.get(`/employee/dashboard/work-types?days=${days}`)
      return Array.isArray(response.data) ? response.data : []
    } catch (error) {
      console.error('Failed to fetch work type distribution:', error)
      throw error
    }
  },

  // Get VM usage patterns
  async getVMUsagePatterns(days = 30) {
    return dedupeRequest(`vm-usage-${days}`, async () => {
      try {
        const response = await apiClient.get(`/employee/dashboard/vm-usage?days=${days}`)
        return Array.isArray(response.data) ? response.data : []
      } catch (error) {
        console.error('Failed to fetch VM usage patterns:', error)
        throw error
      }
    })
  }
}

export default employeeDashboardService 