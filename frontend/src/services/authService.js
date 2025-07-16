import { apiClient } from './apiClient'

export const authService = {
  // Login with Azure AD token
  async login(azureToken) {
    try {
      const response = await apiClient.post('/auth/azure', {
        azureToken
      })
      return response
    } catch (error) {
      throw error
    }
  },

  // Refresh access token
  async refreshToken() {
    try {
      const response = await apiClient.post('/auth/refresh')
      return response
    } catch (error) {
      throw error
    }
  },

  // Get current user profile
  async getProfile() {
    try {
      const response = await apiClient.get('/auth/profile')
      return response
    } catch (error) {
      throw error
    }
  },

  // Update user profile
  async updateProfile(profileData) {
    try {
      const response = await apiClient.put('/auth/profile', profileData)
      return response
    } catch (error) {
      throw error
    }
  },

  // Logout
  async logout() {
    try {
      const response = await apiClient.post('/auth/logout')
      return response
    } catch (error) {
      throw error
    }
  },

  // Validate token
  async validateToken() {
    try {
      const response = await apiClient.get('/auth/validate')
      return response
    } catch (error) {
      throw error
    }
  },

  // Get API tokens
  async getApiTokens() {
    try {
      const response = await apiClient.get('/auth/api-tokens')
      return response
    } catch (error) {
      throw error
    }
  },

  // Generate API token
  async generateApiToken(tokenData) {
    try {
      const response = await apiClient.post('/auth/api-tokens', tokenData)
      return response
    } catch (error) {
      throw error
    }
  },

  // Revoke API token
  async revokeApiToken(tokenId) {
    try {
      const response = await apiClient.delete(`/auth/api-tokens/${tokenId}`)
      return response
    } catch (error) {
      throw error
    }
  }
}
