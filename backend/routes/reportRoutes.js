const express = require('express')
const { pool } = require('../config/database')
const router = express.Router()

// Generate comprehensive report
router.get('/comprehensive', async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query
    
    // Build dynamic query based on filters
    let dateFilter = ''
    let userFilter = ''
    let params = []
    let paramCount = 0

    if (startDate && endDate) {
      paramCount += 2
      dateFilter = `AND ws.start_time >= $${paramCount-1} AND ws.start_time <= $${paramCount}`
      params.push(startDate, endDate)
    }

    if (userId) {
      paramCount++
      userFilter = `AND ws.user_id = $${paramCount}`
      params.push(userId)
    }

    // Get comprehensive data
    const [usersResult, vmsResult, sessionsResult, projectsResult] = await Promise.all([
      pool.query('SELECT * FROM users ORDER BY created_at'),
      pool.query('SELECT * FROM virtual_machines ORDER BY created_at'),
      pool.query(`
        SELECT ws.*, u.name as user_name, u.email as user_email,
               t.task_name, p.name as project_name, vm.name as vm_name
        FROM work_sessions ws
        JOIN users u ON ws.user_id = u.id
        JOIN tasks t ON ws.task_id = t.id
        JOIN projects p ON t.project_id = p.id
        LEFT JOIN virtual_machines vm ON ws.vm_id = vm.id
        WHERE 1=1 ${dateFilter} ${userFilter}
        ORDER BY ws.start_time DESC
      `, params),
      pool.query('SELECT * FROM projects ORDER BY created_at')
    ])

    res.json({
      success: true,
      data: {
        users: usersResult.rows,
        vms: vmsResult.rows,
        sessions: sessionsResult.rows,
        projects: projectsResult.rows
      }
    })
  } catch (error) {
    console.error('Generate report error:', error)
    res.status(500).json({ error: 'Failed to generate report' })
  }
})

module.exports = router
