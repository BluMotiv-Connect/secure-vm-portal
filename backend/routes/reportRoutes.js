const express = require('express')
const { pool } = require('../config/database')
const router = express.Router()

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

// Get detailed VM usage report with multi-user assignments
router.get('/vm-usage-detailed', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, vmId, userId } = req.query

    console.log('[VM Usage Report] Generating detailed VM usage report')

    let whereClause = 'WHERE ws.end_time IS NOT NULL'
    let params = []
    let paramCount = 0

    // Add date filters
    if (startDate) {
      paramCount++
      whereClause += ` AND ws.start_time >= $${paramCount}`
      params.push(startDate)
    }

    if (endDate) {
      paramCount++
      whereClause += ` AND ws.start_time <= $${paramCount}`
      params.push(endDate)
    }

    // Add VM filter
    if (vmId) {
      paramCount++
      whereClause += ` AND ws.vm_id = $${paramCount}`
      params.push(vmId)
    }

    // Add user filter
    if (userId) {
      paramCount++
      whereClause += ` AND ws.user_id = $${paramCount}`
      params.push(userId)
    }

    const result = await pool.query(`
      SELECT 
        ws.id as session_id,
        ws.start_time,
        ws.end_time,
        ws.duration_minutes,
        ws.session_type,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role,
        vm.id as vm_id,
        vm.name as vm_name,
        vm.ip_address as vm_ip,
        vm.os_type,
        vm.cloud_provider,
        vm.connection_method,
        t.id as task_id,
        t.task_name,
        p.id as project_id,
        p.name as project_name,
        -- Get all users currently assigned to this VM
        (
          SELECT json_agg(
            json_build_object(
              'user_id', va_users.user_id,
              'user_name', va_users.user_name,
              'user_email', va_users.user_email,
              'assigned_at', va_users.assigned_at
            )
          )
          FROM (
            SELECT 
              va.user_id,
              u_assigned.name as user_name,
              u_assigned.email as user_email,
              va.assigned_at
            FROM vm_assignments va
            JOIN users u_assigned ON va.user_id = u_assigned.id
            WHERE va.vm_id = vm.id
            ORDER BY va.assigned_at ASC
          ) va_users
        ) as all_assigned_users
      FROM work_sessions ws
      JOIN users u ON ws.user_id = u.id
      LEFT JOIN virtual_machines vm ON ws.vm_id = vm.id
      LEFT JOIN tasks t ON ws.task_id = t.id
      LEFT JOIN projects p ON t.project_id = p.id
      ${whereClause}
      ORDER BY ws.start_time DESC
    `, params)

    console.log(`[VM Usage Report] ✅ Found ${result.rows.length} session records`)

    res.json({
      success: true,
      sessions: result.rows,
      total: result.rows.length,
      filters: { startDate, endDate, vmId, userId }
    })
  } catch (error) {
    console.error('[VM Usage Report] ❌ Error:', error)
    res.status(500).json({ 
      error: 'Failed to generate VM usage report',
      details: error.message 
    })
  }
})

// Get VM assignment history report
router.get('/vm-assignments-history', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, vmId, userId } = req.query

    console.log('[VM Assignment History] Generating assignment history report')

    let whereClause = 'WHERE 1=1'
    let params = []
    let paramCount = 0

    // Add date filters
    if (startDate) {
      paramCount++
      whereClause += ` AND va.assigned_at >= $${paramCount}`
      params.push(startDate)
    }

    if (endDate) {
      paramCount++
      whereClause += ` AND va.assigned_at <= $${paramCount}`
      params.push(endDate)
    }

    // Add VM filter
    if (vmId) {
      paramCount++
      whereClause += ` AND va.vm_id = $${paramCount}`
      params.push(vmId)
    }

    // Add user filter
    if (userId) {
      paramCount++
      whereClause += ` AND va.user_id = $${paramCount}`
      params.push(userId)
    }

    const result = await pool.query(`
      SELECT 
        va.id as assignment_id,
        va.assigned_at,
        va.vm_id,
        va.user_id,
        vm.name as vm_name,
        vm.ip_address as vm_ip,
        vm.os_type,
        vm.cloud_provider,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role,
        assigned_by_user.name as assigned_by_name,
        assigned_by_user.email as assigned_by_email,
        -- Get usage statistics for this user on this VM
        (
          SELECT json_build_object(
            'total_sessions', COUNT(ws.id),
            'total_hours', COALESCE(SUM(ws.duration_minutes), 0) / 60.0,
            'last_session', MAX(ws.start_time),
            'avg_session_duration', COALESCE(AVG(ws.duration_minutes), 0)
          )
          FROM work_sessions ws
          WHERE ws.vm_id = va.vm_id 
          AND ws.user_id = va.user_id
          AND ws.end_time IS NOT NULL
        ) as usage_stats
      FROM vm_assignments va
      JOIN virtual_machines vm ON va.vm_id = vm.id
      JOIN users u ON va.user_id = u.id
      LEFT JOIN users assigned_by_user ON va.assigned_by = assigned_by_user.id
      ${whereClause}
      ORDER BY va.assigned_at DESC
    `, params)

    console.log(`[VM Assignment History] ✅ Found ${result.rows.length} assignment records`)

    res.json({
      success: true,
      assignments: result.rows,
      total: result.rows.length,
      filters: { startDate, endDate, vmId, userId }
    })
  } catch (error) {
    console.error('[VM Assignment History] ❌ Error:', error)
    res.status(500).json({ 
      error: 'Failed to generate VM assignment history report',
      details: error.message 
    })
  }
})

// Get VM utilization summary with multi-user data
router.get('/vm-utilization-summary', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    console.log('[VM Utilization Summary] Generating utilization summary')

    let dateFilter = ''
    let params = []
    let paramCount = 0

    if (startDate && endDate) {
      paramCount += 2
      dateFilter = `AND ws.start_time >= $${paramCount - 1} AND ws.start_time <= $${paramCount}`
      params.push(startDate, endDate)
    }

    const result = await pool.query(`
      SELECT 
        vm.id as vm_id,
        vm.name as vm_name,
        vm.ip_address,
        vm.os_type,
        vm.cloud_provider,
        vm.status,
        vm.assigned_user_name as primary_assigned_user,
        -- Get all currently assigned users
        (
          SELECT json_agg(
            json_build_object(
              'user_id', va.user_id,
              'user_name', u.name,
              'user_email', u.email,
              'assigned_at', va.assigned_at
            )
          )
          FROM vm_assignments va
          JOIN users u ON va.user_id = u.id
          WHERE va.vm_id = vm.id
        ) as all_assigned_users,
        -- Get usage statistics
        COALESCE(usage_stats.total_sessions, 0) as total_sessions,
        COALESCE(usage_stats.total_hours, 0) as total_hours,
        COALESCE(usage_stats.unique_users, 0) as unique_users,
        COALESCE(usage_stats.avg_session_duration, 0) as avg_session_duration,
        usage_stats.last_used,
        usage_stats.most_active_user,
        -- Calculate utilization percentage (assuming 8 hours/day as 100% utilization)
        CASE 
          WHEN $${paramCount + 1}::date IS NOT NULL AND $${paramCount + 2}::date IS NOT NULL THEN
            ROUND(
              (COALESCE(usage_stats.total_hours, 0) / 
               (EXTRACT(days FROM $${paramCount + 2}::date - $${paramCount + 1}::date) * 8)) * 100, 2
            )
          ELSE 0
        END as utilization_percentage
      FROM virtual_machines vm
      LEFT JOIN (
        SELECT 
          ws.vm_id,
          COUNT(ws.id) as total_sessions,
          SUM(ws.duration_minutes) / 60.0 as total_hours,
          COUNT(DISTINCT ws.user_id) as unique_users,
          AVG(ws.duration_minutes) as avg_session_duration,
          MAX(ws.start_time) as last_used,
          (
            SELECT u.name
            FROM work_sessions ws2
            JOIN users u ON ws2.user_id = u.id
            WHERE ws2.vm_id = ws.vm_id
            AND ws2.end_time IS NOT NULL
            ${dateFilter.replace('ws.', 'ws2.')}
            GROUP BY u.id, u.name
            ORDER BY SUM(ws2.duration_minutes) DESC
            LIMIT 1
          ) as most_active_user
        FROM work_sessions ws
        WHERE ws.end_time IS NOT NULL
        ${dateFilter}
        GROUP BY ws.vm_id
      ) usage_stats ON vm.id = usage_stats.vm_id
      ORDER BY total_hours DESC NULLS LAST
    `, [...params, startDate, endDate])

    console.log(`[VM Utilization Summary] ✅ Found ${result.rows.length} VM records`)

    res.json({
      success: true,
      vms: result.rows,
      total: result.rows.length,
      filters: { startDate, endDate }
    })
  } catch (error) {
    console.error('[VM Utilization Summary] ❌ Error:', error)
    res.status(500).json({ 
      error: 'Failed to generate VM utilization summary',
      details: error.message 
    })
  }
})

// Get user VM access report (which users accessed which VMs)
router.get('/user-vm-access', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query

    console.log('[User VM Access Report] Generating user VM access report')

    let whereClause = 'WHERE ws.end_time IS NOT NULL AND ws.vm_id IS NOT NULL'
    let params = []
    let paramCount = 0

    // Add date filters
    if (startDate) {
      paramCount++
      whereClause += ` AND ws.start_time >= $${paramCount}`
      params.push(startDate)
    }

    if (endDate) {
      paramCount++
      whereClause += ` AND ws.start_time <= $${paramCount}`
      params.push(endDate)
    }

    // Add user filter
    if (userId) {
      paramCount++
      whereClause += ` AND ws.user_id = $${paramCount}`
      params.push(userId)
    }

    const result = await pool.query(`
      SELECT 
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role,
        json_agg(
          json_build_object(
            'vm_id', vm.id,
            'vm_name', vm.name,
            'vm_ip', vm.ip_address,
            'os_type', vm.os_type,
            'cloud_provider', vm.cloud_provider,
            'total_sessions', vm_usage.total_sessions,
            'total_hours', vm_usage.total_hours,
            'avg_session_duration', vm_usage.avg_session_duration,
            'first_used', vm_usage.first_used,
            'last_used', vm_usage.last_used,
            'is_currently_assigned', CASE WHEN va.user_id IS NOT NULL THEN true ELSE false END
          )
          ORDER BY vm_usage.total_hours DESC
        ) as vm_usage
      FROM users u
      JOIN (
        SELECT 
          ws.user_id,
          ws.vm_id,
          COUNT(ws.id) as total_sessions,
          SUM(ws.duration_minutes) / 60.0 as total_hours,
          AVG(ws.duration_minutes) as avg_session_duration,
          MIN(ws.start_time) as first_used,
          MAX(ws.start_time) as last_used
        FROM work_sessions ws
        ${whereClause}
        GROUP BY ws.user_id, ws.vm_id
      ) vm_usage ON u.id = vm_usage.user_id
      JOIN virtual_machines vm ON vm_usage.vm_id = vm.id
      LEFT JOIN vm_assignments va ON vm.id = va.vm_id AND u.id = va.user_id
      GROUP BY u.id, u.name, u.email, u.role
      ORDER BY u.name
    `, params)

    console.log(`[User VM Access Report] ✅ Found ${result.rows.length} user records`)

    res.json({
      success: true,
      users: result.rows,
      total: result.rows.length,
      filters: { startDate, endDate, userId }
    })
  } catch (error) {
    console.error('[User VM Access Report] ❌ Error:', error)
    res.status(500).json({ 
      error: 'Failed to generate user VM access report',
      details: error.message 
    })
  }
})

module.exports = router