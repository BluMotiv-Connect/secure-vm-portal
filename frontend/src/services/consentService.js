import { apiClient } from './apiClient'

class ConsentService {
  /**
   * Get agreement content by version
   * @param {string} version - Agreement version (optional, defaults to current)
   * @param {string} language - Language code (default: 'en')
   * @returns {Promise<Object>} Agreement content
   */
  async getAgreement(version = null, language = 'en') {
    try {
      const url = version ? `/consent/agreement/${version}` : '/consent/agreement'
      const response = await apiClient.get(url, {
        params: { language }
      })
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('ConsentService.getAgreement error:', error)
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to load agreement',
        code: error.response?.data?.code
      }
    }
  }

  /**
   * Check user's consent status
   * @returns {Promise<Object>} Consent status
   */
  async checkStatus() {
    try {
      const response = await apiClient.get('/consent/status')
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('ConsentService.checkStatus error:', error)
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to check consent status',
        code: error.response?.data?.code
      }
    }
  }

  /**
   * Record user consent
   * @param {string} agreementVersion - Agreement version
   * @param {string} language - Language code (default: 'en')
   * @returns {Promise<Object>} Result of consent recording
   */
  async recordConsent(agreementVersion, language = 'en') {
    try {
      const response = await apiClient.post('/consent/record', {
        agreementVersion,
        language
      })
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('ConsentService.recordConsent error:', error)
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to record consent',
        code: error.response?.data?.code
      }
    }
  }

  /**
   * Withdraw user consent
   * @param {string} reason - Reason for withdrawal (optional)
   * @returns {Promise<Object>} Result of consent withdrawal
   */
  async withdrawConsent(reason = '') {
    try {
      const response = await apiClient.post('/consent/withdraw', {
        reason
      })
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('ConsentService.withdrawConsent error:', error)
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to withdraw consent',
        code: error.response?.data?.code
      }
    }
  }

  /**
   * Get user's consent history
   * @returns {Promise<Object>} Consent history
   */
  async getHistory() {
    try {
      const response = await apiClient.get('/consent/history')
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('ConsentService.getHistory error:', error)
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to load consent history',
        code: error.response?.data?.code
      }
    }
  }

  /**
   * Admin: Get consent records with pagination
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Consent records
   */
  async getConsentRecords(params = {}) {
    try {
      const response = await apiClient.get('/admin/consent/records', {
        params
      })
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('ConsentService.getConsentRecords error:', error)
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to load consent records',
        code: error.response?.data?.code
      }
    }
  }

  /**
   * Admin: Get consent compliance reports
   * @returns {Promise<Object>} Compliance reports
   */
  async getComplianceReports() {
    try {
      const response = await apiClient.get('/admin/consent/reports')
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('ConsentService.getComplianceReports error:', error)
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to load compliance reports',
        code: error.response?.data?.code
      }
    }
  }

  /**
   * Admin: Get consent audit logs
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Audit logs
   */
  async getAuditLogs(params = {}) {
    try {
      const response = await apiClient.get('/admin/consent/audit', {
        params
      })
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('ConsentService.getAuditLogs error:', error)
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to load audit logs',
        code: error.response?.data?.code
      }
    }
  }

  /**
   * Admin: Send consent notifications
   * @param {Array} userIds - Array of user IDs
   * @param {string} notificationType - Type of notification
   * @param {string} message - Notification message
   * @returns {Promise<Object>} Result of notification sending
   */
  async sendNotifications(userIds, notificationType, message) {
    try {
      const response = await apiClient.post('/admin/consent/notify', {
        userIds,
        notificationType,
        message
      })
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('ConsentService.sendNotifications error:', error)
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to send notifications',
        code: error.response?.data?.code
      }
    }
  }

  /**
   * Admin: Export consent records
   * @param {Object} params - Export parameters
   * @returns {Promise<Object>} Export result
   */
  async exportRecords(params = {}) {
    try {
      const response = await apiClient.get('/admin/consent/export', {
        params,
        responseType: params.format === 'csv' ? 'blob' : 'json'
      })
      
      if (params.format === 'csv') {
        // Handle CSV download
        const blob = new Blob([response.data], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `consent-records-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        return {
          success: true,
          data: { message: 'CSV file downloaded successfully' }
        }
      }
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('ConsentService.exportRecords error:', error)
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to export records',
        code: error.response?.data?.code
      }
    }
  }

  /**
   * Validate consent data before submission
   * @param {Object} consentData - Consent data to validate
   * @returns {Object} Validation result
   */
  validateConsentData(consentData) {
    const errors = []
    
    if (!consentData.agreementVersion) {
      errors.push('Agreement version is required')
    }
    
    if (consentData.language && !/^[a-z]{2}(-[A-Z]{2})?$/.test(consentData.language)) {
      errors.push('Invalid language format')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Format consent status for display
   * @param {Object} status - Raw consent status
   * @returns {Object} Formatted status
   */
  formatConsentStatus(status) {
    if (!status) return null
    
    return {
      hasValidConsent: Boolean(status.hasValidConsent),
      consentDate: status.consentDate ? new Date(status.consentDate) : null,
      agreementVersion: status.agreementVersion || null,
      language: status.language || 'en',
      requiresNewConsent: Boolean(status.requiresNewConsent),
      currentVersion: status.currentVersion || null,
      isExpired: status.hasValidConsent === false && status.consentDate !== null,
      daysSinceConsent: status.consentDate ? 
        Math.floor((new Date() - new Date(status.consentDate)) / (1000 * 60 * 60 * 24)) : 
        null
    }
  }

  /**
   * Get consent requirement message based on status
   * @param {Object} status - Consent status
   * @returns {string} Requirement message
   */
  getConsentRequirementMessage(status) {
    if (!status) return 'Consent status unknown'
    
    if (status.hasValidConsent) {
      return 'Consent is valid and up to date'
    }
    
    if (!status.consentDate) {
      return 'Initial consent required to access the portal'
    }
    
    if (status.requiresNewConsent) {
      return 'Agreement has been updated - new consent required'
    }
    
    return 'Consent verification required'
  }

  /**
   * Check if consent system is enabled
   * @returns {boolean} True if consent system is enabled
   */
  isConsentSystemEnabled() {
    return process.env.REACT_APP_CONSENT_REQUIRED === 'true'
  }

  /**
   * Get supported languages
   * @returns {Array} Array of supported language codes
   */
  getSupportedLanguages() {
    return [
      { code: 'en', name: 'English' }
      // TODO: Add more languages when multi-language support is implemented
    ]
  }
}

// Export singleton instance
export const consentService = new ConsentService()
export default consentService