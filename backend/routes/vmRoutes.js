const express = require('express')
const { pool } = require('../config/database')
const router = express.Router()

// Middleware to verify admin role
const requireAdmin = (req, res, next) => {
  console.log('[VM Admin Check] User:', req.user)
  
  if (!req.user) {
    return res.status(401).json({ error: 'User not authenticated' })
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required',
      userRole: req.user.role 
    })
  }
  
  next()
}

// Get all VMs (with assignment info)
router.get('/', requireAdmin, async (req, res) => {
  try {
    console.log('[Get VMs] Fetching VMs for admin:', req.user.email)
    
    const result = await pool.query(`
      SELECT 
        vm.*,
        u.name as assigned_user_name,
        u.email as assigned_user_email
      FROM virtual_machines vm
      LEFT JOIN users u ON vm.assigned_user_id = u.id
      ORDER BY vm.created_at DESC
    `)

    console.log(`[Get VMs] ✅ Found ${result.rows.length} VMs`)

    res.json({
      success: true,
      vms: result.rows,
      total: result.rows.length
    })
  } catch (error) {
    console.error('[Get VMs] ❌ Error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch VMs',
      details: error.message 
    })
  }
})

// Get user's assigned VMs
router.get('/my-vms', async (req, res) => {
  try {
    const userId = req.user.id
    console.log('[Get My VMs] Fetching VMs for user:', userId)

    const result = await pool.query(`
      SELECT vm.* FROM virtual_machines vm
      WHERE vm.assigned_user_id = $1 AND vm.status = 'online'
      ORDER BY vm.name
    `, [userId])

    console.log(`[Get My VMs] ✅ Found ${result.rows.length} assigned VMs`)

    res.json({
      success: true,
      vms: result.rows
    })
  } catch (error) {
    console.error('[Get My VMs] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to fetch assigned VMs' })
  }
})

// Create new VM (with cloud provider support)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      ip_address, 
      username,
      password,
      os_type, 
      os_version, 
      status = 'offline',
      region,
      instance_id,
      tags = {},
      cloud_provider = 'azure',
      connection_method = 'bastion',
      subscription_id,
      resource_group,
      vm_name,
      zone,
      project_id,
      account_id,
      key_pair_name,
      security_group_id
    } = req.body

    console.log('[Create VM] Creating new VM:', { name, ip_address, cloud_provider, connection_method })

    if (!name || !ip_address || !username || !password || !os_type) {
      return res.status(400).json({ 
        error: 'Name, IP address, username, password, and OS type are required' 
      })
    }

    // Validate cloud provider specific requirements
    if (cloud_provider === 'azure' && connection_method === 'bastion') {
      if (!subscription_id || !resource_group || !vm_name) {
        return res.status(400).json({ 
          error: 'Azure Bastion requires Subscription ID, Resource Group, and VM Name' 
        })
      }
    }

    if (cloud_provider === 'aws' && connection_method === 'bastion') {
      if (!instance_id || !region) {
        return res.status(400).json({ 
          error: 'AWS Session Manager requires Instance ID and Region' 
        })
      }
    }

    if (cloud_provider === 'gcp' && connection_method === 'bastion') {
      if (!project_id || !zone || !vm_name) {
        return res.status(400).json({ 
          error: 'GCP IAP requires Project ID, Zone, and Instance Name' 
        })
      }
    }

    // Validate IP address format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    if (!ipRegex.test(ip_address)) {
      return res.status(400).json({ error: 'Invalid IP address format' })
    }

    // Check if VM with same IP already exists
    const existingVM = await pool.query('SELECT id FROM virtual_machines WHERE ip_address = $1', [ip_address])
    if (existingVM.rows.length > 0) {
      return res.status(409).json({ error: 'VM with this IP address already exists' })
    }

    // Insert new VM with cloud provider fields
    const result = await pool.query(`
      INSERT INTO virtual_machines 
      (name, description, ip_address, username, password, os_type, os_version, status, region, instance_id, tags,
       cloud_provider, connection_method, subscription_id, resource_group, vm_name, zone, project_id, 
       account_id, key_pair_name, security_group_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `, [name, description, ip_address, username, password, os_type, os_version, status, region, instance_id, 
        JSON.stringify(tags), cloud_provider, connection_method, subscription_id, resource_group, vm_name, 
        zone, project_id, account_id, key_pair_name, security_group_id])

    console.log('[Create VM] ✅ VM created successfully:', result.rows[0])

    res.json({
      success: true,
      vm: result.rows[0],
      message: 'VM created successfully'
    })
  } catch (error) {
    console.error('[Create VM] ❌ Error:', error)
    if (error.code === '23505') {
      res.status(409).json({ error: 'VM with this IP address already exists' })
    } else {
      res.status(500).json({ 
        error: 'Failed to create VM',
        details: error.message 
      })
    }
  }
})

// Update VM (with cloud provider support)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { 
      name, 
      description, 
      ip_address, 
      username,
      password,
      os_type, 
      os_version, 
      status,
      region,
      instance_id,
      tags,
      cloud_provider,
      connection_method,
      subscription_id,
      resource_group,
      vm_name,
      zone,
      project_id,
      account_id,
      key_pair_name,
      security_group_id
    } = req.body

    console.log('[Update VM] Updating VM:', { id, name, cloud_provider, connection_method })

    if (!name || !ip_address || !username || !password || !os_type) {
      return res.status(400).json({ 
        error: 'Name, IP address, username, password, and OS type are required' 
      })
    }

    // Check if VM exists
    const vmExists = await pool.query('SELECT id FROM virtual_machines WHERE id = $1', [id])
    if (vmExists.rows.length === 0) {
      return res.status(404).json({ error: 'VM not found' })
    }

    // Check if IP is taken by another VM
    const ipCheck = await pool.query('SELECT id FROM virtual_machines WHERE ip_address = $1 AND id != $2', [ip_address, id])
    if (ipCheck.rows.length > 0) {
      return res.status(409).json({ error: 'IP address is already taken by another VM' })
    }

    // Update VM with all fields
    const result = await pool.query(`
      UPDATE virtual_machines 
      SET name = $1, description = $2, ip_address = $3, username = $4, password = $5,
          os_type = $6, os_version = $7, status = $8, region = $9, instance_id = $10, 
          tags = $11, cloud_provider = $12, connection_method = $13, subscription_id = $14,
          resource_group = $15, vm_name = $16, zone = $17, project_id = $18, account_id = $19,
          key_pair_name = $20, security_group_id = $21, updated_at = CURRENT_TIMESTAMP
      WHERE id = $22
      RETURNING *
    `, [name, description, ip_address, username, password, os_type, os_version, status, region, instance_id, 
        JSON.stringify(tags), cloud_provider, connection_method, subscription_id, resource_group, vm_name, 
        zone, project_id, account_id, key_pair_name, security_group_id, id])

    console.log('[Update VM] ✅ VM updated successfully')

    res.json({
      success: true,
      vm: result.rows[0],
      message: 'VM updated successfully'
    })
  } catch (error) {
    console.error('[Update VM] ❌ Error:', error)
    res.status(500).json({ 
      error: 'Failed to update VM',
      details: error.message 
    })
  }
})

// Assign VM to user
router.post('/:id/assign', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { user_id } = req.body

    console.log('[Assign VM] Assigning VM:', id, 'to user:', user_id)

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Check if VM exists
    const vmCheck = await pool.query('SELECT * FROM virtual_machines WHERE id = $1', [id])
    if (vmCheck.rows.length === 0) {
      return res.status(404).json({ error: 'VM not found' })
    }

    // Check if user exists
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [user_id])
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = userCheck.rows[0]

    // Remove existing assignment for this VM
    await pool.query('DELETE FROM vm_assignments WHERE vm_id = $1', [id])

    // Create new assignment
    await pool.query(`
      INSERT INTO vm_assignments (vm_id, user_id, assigned_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (vm_id, user_id) DO NOTHING
    `, [id, user_id, req.user.id])

    // Update VM table with assignment info
    await pool.query(`
      UPDATE virtual_machines 
      SET assigned_user_id = $1, assigned_user_name = $2, assigned_user_email = $3
      WHERE id = $4
    `, [user_id, user.name, user.email, id])

    console.log('[Assign VM] ✅ VM assigned successfully')

    res.json({
      success: true,
      message: 'VM assigned successfully'
    })
  } catch (error) {
    console.error('[Assign VM] ❌ Error:', error)
    res.status(500).json({ 
      error: 'Failed to assign VM',
      details: error.message 
    })
  }
})

// Unassign VM
router.delete('/:id/assign', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    console.log('[Unassign VM] Unassigning VM:', id)

    // Remove assignment
    await pool.query('DELETE FROM vm_assignments WHERE vm_id = $1', [id])

    // Update VM table to remove assignment info
    await pool.query(`
      UPDATE virtual_machines 
      SET assigned_user_id = NULL, assigned_user_name = NULL, assigned_user_email = NULL
      WHERE id = $1
    `, [id])

    console.log('[Unassign VM] ✅ VM unassigned successfully')

    res.json({
      success: true,
      message: 'VM unassigned successfully'
    })
  } catch (error) {
    console.error('[Unassign VM] ❌ Error:', error)
    res.status(500).json({ 
      error: 'Failed to unassign VM',
      details: error.message 
    })
  }
})

// Delete VM
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    console.log('[Delete VM] Deleting VM:', id)

    // Check if VM exists
    const vmExists = await pool.query('SELECT id, name FROM virtual_machines WHERE id = $1', [id])
    if (vmExists.rows.length === 0) {
      return res.status(404).json({ error: 'VM not found' })
    }

    // Check for active sessions
    try {
      const sessionCheck = await pool.query(
        'SELECT COUNT(*) FROM work_sessions WHERE vm_id = $1 AND is_active = true',
        [id]
      )

      if (parseInt(sessionCheck.rows[0].count) > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete VM with active sessions' 
        })
      }
    } catch (sessionError) {
      console.log('[Delete VM] Sessions table check skipped')
    }

    // Delete associated work sessions first
    await pool.query('DELETE FROM work_sessions WHERE vm_id = $1', [id])

    // Delete VM (assignments will be deleted automatically due to CASCADE)
    const result = await pool.query('DELETE FROM virtual_machines WHERE id = $1 RETURNING *', [id])

    console.log('[Delete VM] ✅ VM deleted successfully:', result.rows[0])

    res.json({
      success: true,
      message: 'VM deleted successfully',
      deletedVM: result.rows[0]
    })
  } catch (error) {
    console.error('[Delete VM] ❌ Error:', error)
    res.status(500).json({ 
      error: 'Failed to delete VM',
      details: error.message 
    })
  }
})

// Get VM by ID
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query(`
      SELECT vm.*, u.name as assigned_user_name, u.email as assigned_user_email
      FROM virtual_machines vm
      LEFT JOIN users u ON vm.assigned_user_id = u.id
      WHERE vm.id = $1
    `, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'VM not found' })
    }

    res.json({
      success: true,
      vm: result.rows[0]
    })
  } catch (error) {
    console.error('[Get VM] ❌ Error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch VM',
      details: error.message 
    })
  }
})

// Get VM usage statistics
router.get('/:id/stats', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { startDate, endDate } = req.query

    let dateFilter = ''
    let params = [id]

    if (startDate && endDate) {
      dateFilter = 'AND ws.start_time >= $2 AND ws.start_time <= $3'
      params.push(startDate, endDate)
    }

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        COALESCE(SUM(duration_minutes), 0) as total_minutes,
        COALESCE(AVG(duration_minutes), 0) as avg_session_duration,
        COUNT(DISTINCT user_id) as unique_users,
        MAX(start_time) as last_used
      FROM work_sessions ws
      WHERE vm_id = $1 AND end_time IS NOT NULL ${dateFilter}
    `, params)

    const stats = result.rows[0]

    res.json({
      success: true,
      stats: {
        totalSessions: parseInt(stats.total_sessions),
        totalMinutes: parseFloat(stats.total_minutes),
        totalHours: parseFloat(stats.total_minutes) / 60,
        avgSessionDuration: parseFloat(stats.avg_session_duration),
        uniqueUsers: parseInt(stats.unique_users),
        lastUsed: stats.last_used
      }
    })
  } catch (error) {
    console.error('[VM Stats] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to fetch VM statistics' })
  }
})

module.exports = router
