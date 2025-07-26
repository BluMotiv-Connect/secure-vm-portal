const express = require('express')
const { Pool } = require('pg')
const router = express.Router()

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Admin role required',
      code: 'AUTH_002'
    })
  }
  next()
}

// GET /api/admin/consent/records - Get all consent records with pagination
router.get('/records', requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      version, 
      search,
      sortBy = 'consent_date',
      sortOrder = 'DESC'
    } = req.query
    
    const offset = (page - 1) * limit
    
    // Build WHERE clause
    let whereConditions = []
    let queryParams = []
    let paramIndex = 1
    
    if (status) {
      whereConditions.push(`uc.status = $${paramIndex}`)
      queryParams.push(status)
      paramIndex++
    }
    
    if (version) {
      whereConditions.push(`uc.agreement_version = $${paramIndex}`)
      queryParams.push(version)
      paramIndex++
    }
    
    if (search) {
      whereConditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`)
      queryParams.push(`%${search}%`)
      paramIndex++
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
    
    // Validate sort parameters
    const validSortColumns = ['consent_date', 'user_name', 'user_email', 'agreement_version', 'status']
    const validSortOrders = ['ASC', 'DESC']
    
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'consent_date'
    const safeSortOrder = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC'
    
    // Get records with user information
    const recordsQuery = `
      SELECT 
        uc.id,
        uc.uuid,
        uc.user_id,
        u.name as user_name,
        u.email as user_email,
        uc.agreement_version,
        uc.language,
        uc.consent_date,
        uc.status,
        uc.withdrawal_date,
        uc.withdrawal_reason,
        uc.ip_address
      FROM user_consents uc
      JOIN users u ON uc.user_id = u.id
      ${whereClause}
      ORDER BY ${safeSortBy === 'user_name' ? 'u.name' : safeSortBy === 'user_email' ? 'u.email' : 'uc.' + safeSortBy} ${safeSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    
    queryParams.push(limit, offset)
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM user_consents uc
      JOIN users u ON uc.user_id = u.id
      ${whereClause}
    `
    
    const [recordsResult, countResult] = await Promise.all([
      pool.query(recordsQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
    ])
    
    const totalRecords = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(totalRecords / limit)
    
    res.json({
      records: recordsResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords,
        limit: parseInt(limit),
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
    
  } catch (error) {
    console.error('Get consent records error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve consent records',
      code: 'SERVER_ERROR'
    })
  }
})

// GET /api/admin/consent/reports - Get consent compliance reports
router.get('/reports', requireAdmin, async (req, res) => {
  try {
    const client = await pool.connect()
    
    try {
      // Get overall statistics
      const statsQuery = `
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
      `
      
      const statsResult = await client.query(statsQuery)
      const stats = statsResult.rows[0]
      
      // Calculate compliance rate
      const complianceRate = stats.total_users > 0 
        ? ((stats.consented_users / stats.total_users) * 100).toFixed(2)
        : 0
      
      // Get version breakdown
      const versionQuery = `
        SELECT 
          uc.agreement_version,
          COUNT(*) as user_count,
          COUNT(CASE WHEN uc.status = 'active' THEN 1 END) as active_count,
          COUNT(CASE WHEN uc.status = 'withdrawn' THEN 1 END) as withdrawn_count
        FROM user_consents uc
        GROUP BY uc.agreement_version
        ORDER BY uc.agreement_version DESC
      `
      
      const versionResult = await client.query(versionQuery)
      
      // Get recent activity (last 30 days)
      const activityQuery = `
        SELECT 
          DATE(consent_date) as date,
          COUNT(*) as consents_given,
          COUNT(CASE WHEN status = 'withdrawn' THEN 1 END) as consents_withdrawn
        FROM user_consents
        WHERE consent_date >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(consent_date)
        ORDER BY date DESC
        LIMIT 30
      `
      
      const activityResult = await client.query(activityQuery)
      
      // Get users requiring consent
      const pendingQuery = `
        SELECT 
          u.id,
          u.name,
          u.email,
          u.created_at,
          CASE 
            WHEN uc.user_id IS NULL THEN 'never_consented'
            WHEN uc.agreement_version != av.version THEN 'outdated_consent'
            ELSE 'unknown'
          END as reason
        FROM users u
        CROSS JOIN (SELECT version FROM agreement_versions WHERE is_current = true) av
        LEFT JOIN user_consents uc ON u.id = uc.user_id AND uc.status = 'active'
        WHERE u.is_active = true 
          AND (uc.user_id IS NULL OR uc.agreement_version != av.version)
        ORDER BY u.created_at DESC
        LIMIT 100
      `
      
      const pendingResult = await client.query(pendingQuery)
      
      res.json({
        summary: {
          totalUsers: parseInt(stats.total_users),
          consentedUsers: parseInt(stats.consented_users),
          withdrawnUsers: parseInt(stats.withdrawn_users),
          pendingConsent: parseInt(stats.pending_consent),
          complianceRate: parseFloat(complianceRate)
        },
        versionBreakdown: versionResult.rows,
        recentActivity: activityResult.rows,
        pendingUsers: pendingResult.rows,
        generatedAt: new Date().toISOString()
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('Get consent reports error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate consent reports',
      code: 'SERVER_ERROR'
    })
  }
})

// GET /api/admin/consent/audit - Get consent audit logs
router.get('/audit', requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 100, 
      action, 
      userId,
      startDate,
      endDate,
      sortOrder = 'DESC'
    } = req.query
    
    const offset = (page - 1) * limit
    
    // Build WHERE clause
    let whereConditions = []
    let queryParams = []
    let paramIndex = 1
    
    if (action) {
      whereConditions.push(`action = $${paramIndex}`)
      queryParams.push(action)
      paramIndex++
    }
    
    if (userId) {
      whereConditions.push(`user_id = $${paramIndex}`)
      queryParams.push(userId)
      paramIndex++
    }
    
    if (startDate) {
      whereConditions.push(`timestamp >= $${paramIndex}`)
      queryParams.push(startDate)
      paramIndex++
    }
    
    if (endDate) {
      whereConditions.push(`timestamp <= $${paramIndex}`)
      queryParams.push(endDate)
      paramIndex++
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
    const safeSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC'
    
    const auditQuery = `
      SELECT 
        id,
        uuid,
        user_id,
        user_email,
        action,
        agreement_version,
        language,
        ip_address,
        timestamp,
        details
      FROM consent_audit_log
      ${whereClause}
      ORDER BY timestamp ${safeSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    
    queryParams.push(limit, offset)
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM consent_audit_log
      ${whereClause}
    `
    
    const [auditResult, countResult] = await Promise.all([
      pool.query(auditQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2))
    ])
    
    const totalRecords = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(totalRecords / limit)
    
    res.json({
      auditLogs: auditResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords,
        limit: parseInt(limit),
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
    
  } catch (error) {
    console.error('Get consent audit error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve audit logs',
      code: 'SERVER_ERROR'
    })
  }
})

// POST /api/admin/consent/notify - Send consent notifications
router.post('/notify', requireAdmin, async (req, res) => {
  try {
    const { userIds, notificationType, message } = req.body
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'User IDs array is required',
        code: 'VALIDATION_ERROR'
      })
    }
    
    if (!notificationType) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Notification type is required',
        code: 'VALIDATION_ERROR'
      })
    }
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Get current agreement version
      const versionResult = await client.query(
        'SELECT version FROM agreement_versions WHERE is_current = true'
      )
      
      const currentVersion = versionResult.rows[0]?.version
      
      // Insert notifications for each user
      const notifications = []
      for (const userId of userIds) {
        const result = await client.query(`
          INSERT INTO consent_notifications (
            user_id, notification_type, agreement_version, sent_to, message
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING id, uuid, sent_at
        `, [
          userId,
          notificationType,
          currentVersion,
          req.user.email, // Admin who sent the notification
          message || `Consent notification sent by ${req.user.name}`
        ])
        
        notifications.push(result.rows[0])
      }
      
      await client.query('COMMIT')
      
      res.json({
        success: true,
        message: `Notifications sent to ${userIds.length} users`,
        notifications: notifications
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('Send consent notifications error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to send notifications',
      code: 'SERVER_ERROR'
    })
  }
})

// GET /api/admin/consent/export - Export consent records
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const { format = 'json', status, version } = req.query
    
    // Build WHERE clause
    let whereConditions = []
    let queryParams = []
    let paramIndex = 1
    
    if (status) {
      whereConditions.push(`uc.status = $${paramIndex}`)
      queryParams.push(status)
      paramIndex++
    }
    
    if (version) {
      whereConditions.push(`uc.agreement_version = $${paramIndex}`)
      queryParams.push(version)
      paramIndex++
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
    
    const exportQuery = `
      SELECT 
        uc.uuid,
        u.name as user_name,
        u.email as user_email,
        uc.agreement_version,
        uc.language,
        uc.consent_date,
        uc.status,
        uc.withdrawal_date,
        uc.withdrawal_reason,
        uc.ip_address
      FROM user_consents uc
      JOIN users u ON uc.user_id = u.id
      ${whereClause}
      ORDER BY uc.consent_date DESC
    `
    
    const result = await pool.query(exportQuery, queryParams)
    
    if (format === 'csv') {
      // Convert to CSV format
      const headers = [
        'Consent ID', 'User Name', 'User Email', 'Agreement Version', 
        'Language', 'Consent Date', 'Status', 'Withdrawal Date', 
        'Withdrawal Reason', 'IP Address'
      ]
      
      let csv = headers.join(',') + '\n'
      
      result.rows.forEach(row => {
        const csvRow = [
          row.uuid,
          `"${row.user_name}"`,
          row.user_email,
          row.agreement_version,
          row.language,
          row.consent_date,
          row.status,
          row.withdrawal_date || '',
          `"${row.withdrawal_reason || ''}"`,
          row.ip_address || ''
        ]
        csv += csvRow.join(',') + '\n'
      })
      
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="consent-records-${new Date().toISOString().split('T')[0]}.csv"`)
      res.send(csv)
    } else {
      // JSON format
      res.json({
        records: result.rows,
        exportedAt: new Date().toISOString(),
        totalRecords: result.rows.length,
        filters: { status, version }
      })
    }
    
  } catch (error) {
    console.error('Export consent records error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to export consent records',
      code: 'SERVER_ERROR'
    })
  }
})

module.exports = router