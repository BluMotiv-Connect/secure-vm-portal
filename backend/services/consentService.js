const { Pool } = require('pg')

class ConsentService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  }

  /**
   * Get the current active agreement version
   * @returns {Promise<Object>} Current agreement version object
   */
  async getCurrentAgreementVersion() {
    try {
      const result = await this.pool.query(
        'SELECT * FROM agreement_versions WHERE is_current = true'
      )
      
      if (result.rows.length === 0) {
        throw new Error('No current agreement version found')
      }
      
      return result.rows[0]
    } catch (error) {
      console.error('Error getting current agreement version:', error)
      throw error
    }
  }

  /**
   * Get agreement version by version string
   * @param {string} version - Version string (e.g., "1.0.0")
   * @returns {Promise<Object>} Agreement version object
   */
  async getAgreementVersion(version) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM agreement_versions WHERE version = $1',
        [version]
      )
      
      if (result.rows.length === 0) {
        throw new Error(`Agreement version ${version} not found`)
      }
      
      return result.rows[0]
    } catch (error) {
      console.error('Error getting agreement version:', error)
      throw error
    }
  }

  /**
   * Check if a user has valid consent for the current agreement version
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Consent validity status
   */
  async checkUserConsentValidity(userId) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM check_user_consent_validity($1)',
        [userId]
      )
      
      return result.rows[0]
    } catch (error) {
      console.error('Error checking user consent validity:', error)
      throw error
    }
  }

  /**
   * Record user consent for a specific agreement version
   * @param {Object} consentData - Consent data
   * @param {number} consentData.userId - User ID
   * @param {string} consentData.agreementVersion - Agreement version
   * @param {string} consentData.language - Language code (default: 'en')
   * @param {string} consentData.ipAddress - Client IP address
   * @param {string} consentData.userAgent - User agent string
   * @returns {Promise<Object>} Created consent record
   */
  async recordUserConsent(consentData) {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')
      
      const { userId, agreementVersion, language = 'en', ipAddress, userAgent } = consentData
      
      // Validate agreement version exists
      const versionCheck = await client.query(
        'SELECT version FROM agreement_versions WHERE version = $1',
        [agreementVersion]
      )
      
      if (versionCheck.rows.length === 0) {
        throw new Error(`Agreement version ${agreementVersion} does not exist`)
      }
      
      // Check if user already has active consent for this version
      const existingConsent = await client.query(`
        SELECT id FROM user_consents 
        WHERE user_id = $1 AND agreement_version = $2 AND status = 'active'
      `, [userId, agreementVersion])
      
      if (existingConsent.rows.length > 0) {
        throw new Error('User has already consented to this agreement version')
      }
      
      // Expire any previous active consents
      await client.query(`
        UPDATE user_consents 
        SET status = 'expired', updated_at = NOW()
        WHERE user_id = $1 AND status = 'active'
      `, [userId])
      
      // Record new consent
      const consentResult = await client.query(`
        INSERT INTO user_consents (
          user_id, agreement_version, language, consent_date,
          ip_address, user_agent, status
        ) VALUES ($1, $2, $3, NOW(), $4, $5, 'active')
        RETURNING *
      `, [userId, agreementVersion, language, ipAddress, userAgent])
      
      await client.query('COMMIT')
      
      return consentResult.rows[0]
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Withdraw user consent
   * @param {Object} withdrawalData - Withdrawal data
   * @param {number} withdrawalData.userId - User ID
   * @param {string} withdrawalData.reason - Withdrawal reason
   * @param {string} withdrawalData.ipAddress - Client IP address
   * @param {string} withdrawalData.userAgent - User agent string
   * @returns {Promise<Object>} Updated consent record
   */
  async withdrawUserConsent(withdrawalData) {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')
      
      const { userId, reason, ipAddress, userAgent } = withdrawalData
      
      // Find active consent
      const activeConsent = await client.query(`
        SELECT * FROM user_consents 
        WHERE user_id = $1 AND status = 'active'
        ORDER BY consent_date DESC
        LIMIT 1
      `, [userId])
      
      if (activeConsent.rows.length === 0) {
        throw new Error('No active consent found to withdraw')
      }
      
      const consent = activeConsent.rows[0]
      
      // Update consent to withdrawn
      const updatedConsent = await client.query(`
        UPDATE user_consents 
        SET status = 'withdrawn',
            withdrawal_date = NOW(),
            withdrawal_reason = $1,
            withdrawal_ip_address = $2,
            withdrawal_user_agent = $3,
            updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `, [reason, ipAddress, userAgent, consent.id])
      
      // Get user information for notification
      const userResult = await client.query(
        'SELECT name, email FROM users WHERE id = $1',
        [userId]
      )
      
      const user = userResult.rows[0]
      
      // Create notification for admins
      await client.query(`
        INSERT INTO consent_notifications (
          user_id, notification_type, agreement_version, sent_to, message
        ) VALUES ($1, 'consent_withdrawn', $2, 'admin@blumotiv.com', $3)
      `, [
        userId,
        consent.agreement_version,
        `User ${user.name} (${user.email}) has withdrawn consent. Reason: ${reason || 'Not specified'}`
      ])
      
      await client.query('COMMIT')
      
      return updatedConsent.rows[0]
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get user's consent history
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of consent records
   */
  async getUserConsentHistory(userId) {
    try {
      const result = await this.pool.query(`
        SELECT 
          uuid,
          agreement_version,
          language,
          consent_date,
          status,
          withdrawal_date,
          withdrawal_reason
        FROM user_consents 
        WHERE user_id = $1 
        ORDER BY consent_date DESC
      `, [userId])
      
      return result.rows
    } catch (error) {
      console.error('Error getting user consent history:', error)
      throw error
    }
  }

  /**
   * Create audit log entry
   * @param {Object} auditData - Audit data
   * @param {number} auditData.userId - User ID
   * @param {string} auditData.userEmail - User email
   * @param {string} auditData.action - Action performed
   * @param {string} auditData.agreementVersion - Agreement version
   * @param {string} auditData.language - Language code
   * @param {string} auditData.ipAddress - Client IP address
   * @param {string} auditData.userAgent - User agent string
   * @param {Object} auditData.details - Additional details
   * @returns {Promise<Object>} Created audit log entry
   */
  async createAuditLog(auditData) {
    try {
      const {
        userId,
        userEmail,
        action,
        agreementVersion,
        language = 'en',
        ipAddress,
        userAgent,
        sessionId,
        details = {}
      } = auditData
      
      const result = await this.pool.query(`
        INSERT INTO consent_audit_log (
          user_id, user_email, action, agreement_version, language,
          ip_address, user_agent, session_id, details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        userId,
        userEmail,
        action,
        agreementVersion,
        language,
        ipAddress,
        userAgent,
        sessionId,
        JSON.stringify(details)
      ])
      
      return result.rows[0]
    } catch (error) {
      console.error('Error creating audit log:', error)
      throw error
    }
  }

  /**
   * Get users who need to provide consent
   * @param {Object} options - Query options
   * @param {number} options.limit - Limit number of results
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} Array of users needing consent
   */
  async getUsersNeedingConsent(options = {}) {
    try {
      const { limit = 100, offset = 0 } = options
      
      const result = await this.pool.query(`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.created_at,
          CASE 
            WHEN uc.user_id IS NULL THEN 'never_consented'
            WHEN uc.agreement_version != av.version THEN 'outdated_consent'
            ELSE 'unknown'
          END as reason,
          uc.agreement_version as current_consent_version,
          av.version as required_version
        FROM users u
        CROSS JOIN (SELECT version FROM agreement_versions WHERE is_current = true) av
        LEFT JOIN user_consents uc ON u.id = uc.user_id AND uc.status = 'active'
        WHERE u.is_active = true 
          AND (uc.user_id IS NULL OR uc.agreement_version != av.version)
        ORDER BY u.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset])
      
      return result.rows
    } catch (error) {
      console.error('Error getting users needing consent:', error)
      throw error
    }
  }

  /**
   * Get consent compliance statistics
   * @returns {Promise<Object>} Compliance statistics
   */
  async getComplianceStatistics() {
    try {
      const result = await this.pool.query(`
        SELECT 
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT CASE WHEN uc.status = 'active' THEN uc.user_id END) as consented_users,
          COUNT(DISTINCT CASE WHEN uc.status = 'withdrawn' THEN uc.user_id END) as withdrawn_users,
          COUNT(DISTINCT CASE WHEN u.id NOT IN (
            SELECT user_id FROM user_consents WHERE status = 'active'
          ) THEN u.id END) as pending_consent
        FROM users u
        LEFT JOIN user_consents uc ON u.id = uc.user_id
        WHERE u.is_active = true
      `)
      
      const stats = result.rows[0]
      
      // Calculate compliance rate
      const complianceRate = stats.total_users > 0 
        ? ((stats.consented_users / stats.total_users) * 100)
        : 0
      
      return {
        totalUsers: parseInt(stats.total_users),
        consentedUsers: parseInt(stats.consented_users),
        withdrawnUsers: parseInt(stats.withdrawn_users),
        pendingConsent: parseInt(stats.pending_consent),
        complianceRate: parseFloat(complianceRate.toFixed(2))
      }
    } catch (error) {
      console.error('Error getting compliance statistics:', error)
      throw error
    }
  }

  /**
   * Check if consent has expired based on business rules
   * @param {Object} consent - Consent record
   * @param {number} expiryDays - Number of days after which consent expires
   * @returns {boolean} True if consent has expired
   */
  isConsentExpired(consent, expiryDays = 365) {
    if (!consent || consent.status !== 'active') {
      return true
    }
    
    const consentDate = new Date(consent.consent_date)
    const expiryDate = new Date(consentDate.getTime() + (expiryDays * 24 * 60 * 60 * 1000))
    const now = new Date()
    
    return now > expiryDate
  }

  /**
   * Expire old consents based on business rules
   * @param {number} expiryDays - Number of days after which consent expires
   * @returns {Promise<number>} Number of consents expired
   */
  async expireOldConsents(expiryDays = 365) {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')
      
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() - expiryDays)
      
      const result = await client.query(`
        UPDATE user_consents 
        SET status = 'expired', updated_at = NOW()
        WHERE status = 'active' 
          AND consent_date < $1
        RETURNING id
      `, [expiryDate])
      
      await client.query('COMMIT')
      
      return result.rows.length
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Validate agreement content structure
   * @param {Object} content - Agreement content object
   * @returns {Object} Validation result
   */
  validateAgreementContent(content) {
    const errors = []
    
    if (!content || typeof content !== 'object') {
      errors.push('Content must be a valid object')
      return { isValid: false, errors }
    }
    
    if (!content.title || typeof content.title !== 'string') {
      errors.push('Title is required and must be a string')
    }
    
    if (!content.sections || !Array.isArray(content.sections)) {
      errors.push('Sections must be an array')
    } else {
      content.sections.forEach((section, index) => {
        if (!section.id || typeof section.id !== 'string') {
          errors.push(`Section ${index + 1}: ID is required and must be a string`)
        }
        if (!section.title || typeof section.title !== 'string') {
          errors.push(`Section ${index + 1}: Title is required and must be a string`)
        }
        if (!section.content || typeof section.content !== 'string') {
          errors.push(`Section ${index + 1}: Content is required and must be a string`)
        }
      })
    }
    
    if (!content.acknowledgment || typeof content.acknowledgment !== 'object') {
      errors.push('Acknowledgment section is required')
    } else {
      if (!content.acknowledgment.checkbox_text) {
        errors.push('Acknowledgment checkbox text is required')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Close database connection pool
   */
  async close() {
    await this.pool.end()
  }
}

module.exports = ConsentService