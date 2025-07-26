const ConsentService = require('../services/consentService')

class ConsentUtils {
  constructor() {
    this.consentService = new ConsentService()
  }

  /**
   * Validate consent data before processing
   * @param {Object} consentData - Consent data to validate
   * @returns {Object} Validation result
   */
  validateConsentData(consentData) {
    const errors = []
    
    if (!consentData.userId || typeof consentData.userId !== 'number') {
      errors.push('Valid user ID is required')
    }
    
    if (!consentData.agreementVersion || typeof consentData.agreementVersion !== 'string') {
      errors.push('Agreement version is required')
    }
    
    if (consentData.language && !/^[a-z]{2}(-[A-Z]{2})?$/.test(consentData.language)) {
      errors.push('Invalid language format (expected: en, en-US, etc.)')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Format consent record for API response
   * @param {Object} consent - Raw consent record from database
   * @returns {Object} Formatted consent record
   */
  formatConsentRecord(consent) {
    if (!consent) return null
    
    return {
      id: consent.uuid,
      userId: consent.user_id,
      agreementVersion: consent.agreement_version,
      language: consent.language,
      consentDate: consent.consent_date,
      status: consent.status,
      withdrawalDate: consent.withdrawal_date,
      withdrawalReason: consent.withdrawal_reason,
      ipAddress: consent.ip_address // Only include for admin views
    }
  }

  /**
   * Format consent record for user view (removes sensitive data)
   * @param {Object} consent - Raw consent record from database
   * @returns {Object} User-safe consent record
   */
  formatConsentRecordForUser(consent) {
    if (!consent) return null
    
    return {
      id: consent.uuid,
      agreementVersion: consent.agreement_version,
      language: consent.language,
      consentDate: consent.consent_date,
      status: consent.status,
      withdrawalDate: consent.withdrawal_date,
      withdrawalReason: consent.withdrawal_reason
      // IP address excluded for privacy
    }
  }

  /**
   * Generate consent summary for reporting
   * @param {Array} consents - Array of consent records
   * @returns {Object} Consent summary
   */
  generateConsentSummary(consents) {
    const summary = {
      total: consents.length,
      active: 0,
      withdrawn: 0,
      expired: 0,
      byVersion: {},
      byLanguage: {},
      recentActivity: []
    }
    
    consents.forEach(consent => {
      // Count by status
      summary[consent.status] = (summary[consent.status] || 0) + 1
      
      // Count by version
      summary.byVersion[consent.agreement_version] = 
        (summary.byVersion[consent.agreement_version] || 0) + 1
      
      // Count by language
      summary.byLanguage[consent.language] = 
        (summary.byLanguage[consent.language] || 0) + 1
      
      // Track recent activity (last 30 days)
      const consentDate = new Date(consent.consent_date)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      if (consentDate >= thirtyDaysAgo) {
        summary.recentActivity.push({
          date: consent.consent_date,
          action: 'consent_given',
          version: consent.agreement_version
        })
      }
      
      // Track withdrawals
      if (consent.withdrawal_date) {
        const withdrawalDate = new Date(consent.withdrawal_date)
        if (withdrawalDate >= thirtyDaysAgo) {
          summary.recentActivity.push({
            date: consent.withdrawal_date,
            action: 'consent_withdrawn',
            version: consent.agreement_version,
            reason: consent.withdrawal_reason
          })
        }
      }
    })
    
    // Sort recent activity by date
    summary.recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date))
    
    return summary
  }

  /**
   * Check if user needs to re-consent due to agreement updates
   * @param {Object} userConsent - User's current consent
   * @param {string} currentVersion - Current agreement version
   * @returns {boolean} True if re-consent is needed
   */
  needsReConsent(userConsent, currentVersion) {
    if (!userConsent || userConsent.status !== 'active') {
      return true
    }
    
    return userConsent.agreement_version !== currentVersion
  }

  /**
   * Calculate consent expiry date
   * @param {Date} consentDate - Date when consent was given
   * @param {number} expiryDays - Number of days until expiry (default: 365)
   * @returns {Date} Expiry date
   */
  calculateExpiryDate(consentDate, expiryDays = 365) {
    const expiry = new Date(consentDate)
    expiry.setDate(expiry.getDate() + expiryDays)
    return expiry
  }

  /**
   * Check if consent is expired
   * @param {Object} consent - Consent record
   * @param {number} expiryDays - Number of days until expiry (default: 365)
   * @returns {boolean} True if expired
   */
  isConsentExpired(consent, expiryDays = 365) {
    if (!consent || consent.status !== 'active') {
      return true
    }
    
    const expiryDate = this.calculateExpiryDate(new Date(consent.consent_date), expiryDays)
    return new Date() > expiryDate
  }

  /**
   * Generate consent notification message
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   * @returns {string} Formatted message
   */
  generateNotificationMessage(type, data) {
    switch (type) {
      case 'consent_withdrawn':
        return `User ${data.userName} (${data.userEmail}) has withdrawn consent for agreement version ${data.version}. Reason: ${data.reason || 'Not specified'}`
      
      case 'consent_expired':
        return `Consent for user ${data.userName} (${data.userEmail}) has expired for agreement version ${data.version}`
      
      case 'new_user_consent':
        return `New user ${data.userName} (${data.userEmail}) has provided consent for agreement version ${data.version}`
      
      case 'agreement_updated':
        return `Agreement has been updated to version ${data.version}. Users will need to re-consent.`
      
      case 'compliance_alert':
        return `Consent compliance alert: ${data.message}`
      
      default:
        return `Consent notification: ${data.message || 'No details provided'}`
    }
  }

  /**
   * Sanitize IP address for logging (GDPR compliance)
   * @param {string} ipAddress - Full IP address
   * @returns {string} Sanitized IP address
   */
  sanitizeIPAddress(ipAddress) {
    if (!ipAddress) return null
    
    // For IPv4, mask the last octet
    if (ipAddress.includes('.')) {
      const parts = ipAddress.split('.')
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`
      }
    }
    
    // For IPv6, mask the last 64 bits
    if (ipAddress.includes(':')) {
      const parts = ipAddress.split(':')
      if (parts.length >= 4) {
        return `${parts.slice(0, 4).join(':')}:xxxx:xxxx:xxxx:xxxx`
      }
    }
    
    return 'xxx.xxx.xxx.xxx'
  }

  /**
   * Generate consent audit report
   * @param {Array} auditLogs - Array of audit log entries
   * @returns {Object} Audit report
   */
  generateAuditReport(auditLogs) {
    const report = {
      totalEntries: auditLogs.length,
      actionBreakdown: {},
      userActivity: {},
      timeRange: {
        earliest: null,
        latest: null
      },
      complianceMetrics: {
        consentGiven: 0,
        consentWithdrawn: 0,
        consentViewed: 0,
        accessDenied: 0
      }
    }
    
    auditLogs.forEach(log => {
      // Count actions
      report.actionBreakdown[log.action] = (report.actionBreakdown[log.action] || 0) + 1
      
      // Track user activity
      if (log.user_email) {
        if (!report.userActivity[log.user_email]) {
          report.userActivity[log.user_email] = {
            totalActions: 0,
            actions: {}
          }
        }
        report.userActivity[log.user_email].totalActions++
        report.userActivity[log.user_email].actions[log.action] = 
          (report.userActivity[log.user_email].actions[log.action] || 0) + 1
      }
      
      // Track time range
      const logTime = new Date(log.timestamp)
      if (!report.timeRange.earliest || logTime < report.timeRange.earliest) {
        report.timeRange.earliest = logTime
      }
      if (!report.timeRange.latest || logTime > report.timeRange.latest) {
        report.timeRange.latest = logTime
      }
      
      // Update compliance metrics
      switch (log.action) {
        case 'consent_given':
          report.complianceMetrics.consentGiven++
          break
        case 'consent_withdrawn':
          report.complianceMetrics.consentWithdrawn++
          break
        case 'consent_viewed':
          report.complianceMetrics.consentViewed++
          break
        case 'access_denied_withdrawn_consent':
        case 'consent_required':
          report.complianceMetrics.accessDenied++
          break
      }
    })
    
    return report
  }

  /**
   * Validate agreement version format
   * @param {string} version - Version string to validate
   * @returns {boolean} True if valid
   */
  isValidVersionFormat(version) {
    return /^[0-9]+\.[0-9]+\.[0-9]+$/.test(version)
  }

  /**
   * Compare version strings
   * @param {string} version1 - First version
   * @param {string} version2 - Second version
   * @returns {number} -1 if version1 < version2, 0 if equal, 1 if version1 > version2
   */
  compareVersions(version1, version2) {
    const v1Parts = version1.split('.').map(Number)
    const v2Parts = version2.split('.').map(Number)
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0
      const v2Part = v2Parts[i] || 0
      
      if (v1Part < v2Part) return -1
      if (v1Part > v2Part) return 1
    }
    
    return 0
  }

  /**
   * Get next version number
   * @param {string} currentVersion - Current version
   * @param {string} type - Version bump type ('major', 'minor', 'patch')
   * @returns {string} Next version
   */
  getNextVersion(currentVersion, type = 'minor') {
    const parts = currentVersion.split('.').map(Number)
    
    switch (type) {
      case 'major':
        return `${parts[0] + 1}.0.0`
      case 'minor':
        return `${parts[0]}.${parts[1] + 1}.0`
      case 'patch':
        return `${parts[0]}.${parts[1]}.${parts[2] + 1}`
      default:
        return `${parts[0]}.${parts[1] + 1}.0`
    }
  }
}

module.exports = new ConsentUtils()