import { apiClient } from './apiClient'

export const connectionService = {
  // Initiate VM connection
  async initiateConnection(vmId) {
    try {
      const response = await apiClient.post('/connections/initiate', { vmId })
      return response
    } catch (error) {
      throw error
    }
  },

  // End VM connection
  async endConnection(sessionId, reason = 'user_disconnect') {
    try {
      const response = await apiClient.post(`/connections/${sessionId}/end`, { reason })
      return response
    } catch (error) {
      throw error
    }
  },

  // Get active connections
  async getActiveConnections() {
    try {
      const response = await apiClient.get('/connections/active')
      return response
    } catch (error) {
      throw error
    }
  },

  // Get connection history
  async getConnectionHistory(params = {}) {
    try {
      const response = await apiClient.get('/connections/history', { params })
      return response
    } catch (error) {
      throw error
    }
  },

  // Monitor session
  async monitorSession(sessionId) {
    try {
      const response = await apiClient.get(`/connections/${sessionId}/monitor`)
      return response
    } catch (error) {
      throw error
    }
  },

  // Download connection files
  async downloadConnectionFile(sessionId, type) {
    try {
      const response = await apiClient.get(`/connections/${sessionId}/download/${type}`, {
        responseType: 'blob'
      })
      return response
    } catch (error) {
      throw error
    }
  },

  // Get connection statistics
  async getConnectionStats(days = 30) {
    try {
      const response = await apiClient.get('/connections/stats', {
        params: { days }
      })
      return response
    } catch (error) {
      throw error
    }
  },

  // Get browser connection status
  async getBrowserConnectionStatus(sessionId) {
    try {
      const response = await apiClient.get(`/connections/${sessionId}/browser-status`)
      return response
    } catch (error) {
      throw error
    }
  },

  // Force end browser connection
  async forceEndBrowserConnection(sessionId) {
    try {
      const response = await apiClient.post(`/connections/${sessionId}/force-end`)
      return response
    } catch (error) {
      throw error
    }
  }
}
