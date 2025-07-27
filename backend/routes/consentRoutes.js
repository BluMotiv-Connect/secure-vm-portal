const express = require('express')
const { Pool } = require('pg')
const { authenticateToken } = require('../middleware/auth')
const router = express.Router()

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// Helper function to get client IP address
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.ip
}

// Helper function to get user agent
const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'Unknown'
}

// Helper function to create audit log entry
const createAuditLog = async (client, userId, userEmail, action, details = {}) => {
  const query = `
    INSERT INTO consent_audit_log (
      user_id, user_email, action, agreement_version, language,
      ip_address, user_agent, details
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `
  
  await client.query(query, [
    userId,
    userEmail,
    action,
    details.agreementVersion || null,
    details.language || 'en',
    details.ipAddress || null,
    details.userAgent || null,
    JSON.stringify(details.metadata || {})
  ])
}

// GET /api/consent/agreement/:version? - Get agreement content
router.get('/agreement/:version?', async (req, res) => {
  try {
    const { version } = req.params
    const { language = 'en' } = req.query
    
    // First check if the agreement_versions table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agreement_versions'
      )
    `)
    
    if (!tableExists.rows[0].exists) {
      // Table doesn't exist, return default agreement
      console.log('Agreement table not found, returning default agreement')
      res.json({
        content: {
          title: "User Consent Agreement for Portal Access",
          sections: [
            {
              id: "purpose",
              title: "Purpose of This Agreement",
              content: "This agreement outlines the terms of access and use of the portal, including responsibilities related to confidentiality, resource usage, data protection, and project conduct."
            },
            {
              id: "voluntary_consent",
              title: "Voluntary and Informed Consent",
              content: "Your consent to this agreement is voluntary, and you may choose not to proceed without facing undue consequences. You are encouraged to read this agreement carefully and seek clarification before accepting."
            }
          ]
        },
        version: '1.0.0',
        effectiveDate: new Date().toISOString(),
        languages: ['en']
      })
      return
    }
    
    let query
    let params
    
    if (version) {
      query = 'SELECT * FROM agreement_versions WHERE version = $1'
      params = [version]
    } else {
      query = 'SELECT * FROM agreement_versions WHERE is_current = true'
      params = []
    }
    
    const result = await pool.query(query, params)
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Agreement not found',
        message: version ? `Agreement version ${version} not found` : 'No current agreement found',
        code: 'CONSENT_005'
      })
    }
    
    const agreement = result.rows[0]
    
    // Log agreement view
    if (req.user) {
      try {
        const client = await pool.connect()
        try {
          await createAuditLog(client, req.user.id, req.user.email, 'consent_viewed', {
            agreementVersion: agreement.version,
            language,
            ipAddress: getClientIP(req),
            userAgent: getUserAgent(req),
            metadata: { requestedVersion: version }
          })
        } finally {
          client.release()
        }
      } catch (auditError) {
        console.error('Audit log error (non-critical):', auditError)
        // Continue without audit logging
      }
    }
    
    res.json({
      content: agreement.content,
      version: agreement.version,
      effectiveDate: agreement.effective_date,
      languages: ['en'] // TODO: Add multi-language support
    })
    
  } catch (error) {
    console.error('Get agreement error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve agreement',
      code: 'SERVER_ERROR'
    })
  }
})

// GET /api/consent/status - Check user's consent status (requires auth)
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect()
    
    try {
      // First check if the consent function exists
      const functionExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.routines 
          WHERE routine_schema = 'public' 
          AND routine_name = 'check_user_consent_validity'
        )
      `)
      
      if (!functionExists.rows[0].exists) {
        // Function doesn't exist, return default response
        console.log('Consent function not found, returning default response')
        res.json({
          hasValidConsent: false,
          consentDate: null,
          agreementVersion: null,
          language: 'en',
          currentVersion: '1.0.0',
          requiresNewConsent: true
        })
        return
      }
      
      // Use the database function to check consent validity
      const result = await client.query(
        'SELECT * FROM check_user_consent_validity($1)',
        [req.user.id]
      )
      
      const consentStatus = result.rows[0]
      
      // Log consent check
      try {
        await createAuditLog(client, req.user.id, req.user.email, 'consent_checked', {
          agreementVersion: consentStatus.current_version,
          ipAddress: getClientIP(req),
          userAgent: getUserAgent(req),
          metadata: {
            hasValidConsent: consentStatus.has_valid_consent,
            requiresNewConsent: consentStatus.requires_new_consent
          }
        })
      } catch (auditError) {
        console.error('Audit log error (non-critical):', auditError)
        // Continue without audit logging
      }
      
      res.json({
        hasValidConsent: consentStatus.has_valid_consent,
        consentDate: consentStatus.consent_date,
        agreementVersion: consentStatus.agreement_version,
        language: consentStatus.language,
        currentVersion: consentStatus.current_version,
        requiresNewConsent: consentStatus.requires_new_consent
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('Check consent status error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check consent status',
      code: 'SERVER_ERROR'
    })
  }
})

// POST /api/consent/record - Record user consent (requires auth)
router.post('/record', authenticateToken, async (req, res) => {
  try {
    const { agreementVersion, language = 'en' } = req.body
    
    if (!agreementVersion) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Agreement version is required',
        code: 'CONSENT_002'
      })
    }
    
    // Check if consent tables exist
    const tablesExist = await pool.query(`
      SELECT 
        EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_consents') as user_consents_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agreement_versions') as agreement_versions_exists
    `)
    
    if (!tablesExist.rows[0].user_consents_exists || !tablesExist.rows[0].agreement_versions_exists) {
      // Tables don't exist, return success (consent system not fully set up)
      console.log('Consent tables not found, returning success response')
      res.status(201).json({
        success: true,
        consentId: 'default-consent-id',
        timestamp: new Date().toISOString(),
        message: 'Consent recorded successfully (consent system not fully configured)'
      })
      return
    }
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Verify agreement version exists
      const versionCheck = await client.query(
        'SELECT version FROM agreement_versions WHERE version = $1',
        [agreementVersion]
      )
      
      if (versionCheck.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          error: 'Invalid agreement version',
          message: `Agreement version ${agreementVersion} does not exist`,
          code: 'CONSENT_002'
        })
      }
      
      // Check if user already has active consent for this version
      const existingConsent = await client.query(`
        SELECT id FROM user_consents 
        WHERE user_id = $1 AND agreement_version = $2 AND status = 'active'
      `, [req.user.id, agreementVersion])
      
      if (existingConsent.rows.length > 0) {
        await client.query('ROLLBACK')
        return res.status(409).json({
          error: 'Consent already exists',
          message: 'User has already consented to this agreement version',
          code: 'CONSENT_003'
        })
      }
      
      // Withdraw any previous active consents
      await client.query(`
        UPDATE user_consents 
        SET status = 'expired', updated_at = NOW()
        WHERE user_id = $1 AND status = 'active'
      `, [req.user.id])
      
      // Record new consent
      const consentResult = await client.query(`
        INSERT INTO user_consents (
          user_id, agreement_version, language, consent_date,
          ip_address, user_agent, status
        ) VALUES ($1, $2, $3, NOW(), $4, $5, 'active')
        RETURNING id, uuid, consent_date
      `, [
        req.user.id,
        agreementVersion,
        language,
        getClientIP(req),
        getUserAgent(req)
      ])
      
      const newConsent = consentResult.rows[0]
      
      await client.query('COMMIT')
      
      res.status(201).json({
        success: true,
        consentId: newConsent.uuid,
        timestamp: newConsent.consent_date,
        message: 'Consent recorded successfully'
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('Record consent error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to record consent',
      code: 'SERVER_ERROR'
    })
  }
})

// POST /api/consent/withdraw - Withdraw user consent (requires auth)
router.post('/withdraw', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body
    
    // Check if consent tables exist
    const tablesExist = await pool.query(`
      SELECT 
        EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_consents') as user_consents_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'consent_notifications') as notifications_exists
    `)
    
    if (!tablesExist.rows[0].user_consents_exists) {
      // Tables don't exist, return success (consent system not fully set up)
      console.log('Consent tables not found, returning success response for withdrawal')
      res.json({
        success: true,
        message: 'Consent withdrawn successfully (consent system not fully configured)',
        timestamp: new Date().toISOString()
      })
      return
    }
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Find active consent
      const activeConsent = await client.query(`
        SELECT id, agreement_version FROM user_consents 
        WHERE user_id = $1 AND status = 'active'
        ORDER BY consent_date DESC
        LIMIT 1
      `, [req.user.id])
      
      if (activeConsent.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(404).json({
          error: 'No active consent found',
          message: 'User has no active consent to withdraw',
          code: 'CONSENT_004'
        })
      }
      
      // Update consent to withdrawn
      await client.query(`
        UPDATE user_consents 
        SET status = 'withdrawn',
            withdrawal_date = NOW(),
            withdrawal_reason = $1,
            withdrawal_ip_address = $2,
            withdrawal_user_agent = $3,
            updated_at = NOW()
        WHERE id = $4
      `, [
        reason || 'User requested withdrawal',
        getClientIP(req),
        getUserAgent(req),
        activeConsent.rows[0].id
      ])
      
      // Create notification for admins (if notifications table exists)
      if (tablesExist.rows[0].notifications_exists) {
        try {
          await client.query(`
            INSERT INTO consent_notifications (
              user_id, notification_type, agreement_version, sent_to, message
            ) VALUES ($1, 'consent_withdrawn', $2, 'admin@blumotiv.com', $3)
          `, [
            req.user.id,
            activeConsent.rows[0].agreement_version,
            `User ${req.user.name} (${req.user.email}) has withdrawn consent. Reason: ${reason || 'Not specified'}`
          ])
        } catch (notificationError) {
          console.error('Notification creation failed (non-critical):', notificationError)
          // Continue without notification
        }
      }
      
      await client.query('COMMIT')
      
      res.json({
        success: true,
        message: 'Consent withdrawn successfully',
        timestamp: new Date().toISOString()
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('Withdraw consent error:', error)
    
    if (error.message.includes('withdrawal failed')) {
      return res.status(400).json({
        error: 'Withdrawal failed',
        message: error.message,
        code: 'CONSENT_004'
      })
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to withdraw consent',
      code: 'SERVER_ERROR'
    })
  }
})

// GET /api/consent/history - Get user's consent history (requires auth)
router.get('/history', authenticateToken, async (req, res) => {
  try {
    // Check if user_consents table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_consents'
      )
    `)
    
    if (!tableExists.rows[0].exists) {
      // Table doesn't exist, return empty history
      console.log('Consent history table not found, returning empty history')
      res.json({
        consents: [],
        total: 0
      })
      return
    }
    
    const result = await pool.query(`
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
    `, [req.user.id])
    
    res.json({
      consents: result.rows,
      total: result.rows.length
    })
    
  } catch (error) {
    console.error('Get consent history error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve consent history',
      code: 'SERVER_ERROR'
    })
  }
})

module.exports = router