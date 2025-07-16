import { apiClient } from './apiClient'

export const userService = {
  // Get all users with pagination and filtering
  async getUsers(params = {}) {
    try {
      const response = await apiClient.get('/users', { params })
      return response
    } catch (error) {
      throw error
    }
  },

  // Get user by ID
  async getUserById(id) {
    try {
      const response = await apiClient.get(`/users/${id}`)
      return response
    } catch (error) {
      throw error
    }
  },

  // Create new user
  async createUser(userData) {
    try {
      const response = await apiClient.post('/users', userData)
      return response
    } catch (error) {
      throw error
    }
  },

  // Update user
  async updateUser(id, userData) {
    try {
      const response = await apiClient.put(`/users/${id}`, userData)
      return response
    } catch (error) {
      throw error
    }
  },

  // Delete user
  async deleteUser(id) {
    try {
      const response = await apiClient.delete(`/users/${id}`)
      return response
    } catch (error) {
      throw error
    }
  },

  // Restore user
  async restoreUser(id) {
    try {
      const response = await apiClient.post(`/users/${id}/restore`)
      return response
    } catch (error) {
      throw error
    }
  },

  // Get user statistics
  async getUserStats() {
    try {
      const response = await apiClient.get('/users/stats')
      return response
    } catch (error) {
      throw error
    }
  },

  // Bulk update users
  async bulkUpdateUsers(userIds, updates) {
    try {
      const response = await apiClient.patch('/users/bulk', {
        userIds,
        updates
      })
      return response
    } catch (error) {
      throw error
    }
  }
}
