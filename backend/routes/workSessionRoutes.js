const express = require('express')
const { pool } = require('../config/database')
const crypto = require('crypto')
const CredentialService = require('../src/services/credentialService')

// Create separate routers for authenticated and public routes
const authenticatedRouter = express.Router()
const publicRouter = express.Router()

// Test endpoint to check if public router is working
publicRouter.get('/test-public', (req, res) => {
  console.log('[Test Public] Public router is working!')
  res.json({ message: 'Public router is working!', timestamp: new Date().toISOString() })
})

// Download RDP file endpoint (public with token validation)
publicRouter.get('/download/rdp/:token', async (req, res) => {
  try {
    const { token } = req.params
    console.log('[RDP Download] ==========================================')
    console.log('[RDP Download] Attempting to download RDP file with token:', token)
    console.log('[RDP Download] Request URL:', req.originalUrl)
    console.log('[RDP Download] Request method:', req.method)
    console.log('[RDP Download] User Agent:', req.headers['user-agent'])
    console.log('[RDP Download] ==========================================')

    // Set CORS headers for the download
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    const result = await pool.query(`
      SELECT content, vm_id FROM temp_connections 
      WHERE token = $1 AND expires_at > NOW()
    `, [token])

    console.log('[RDP Download] Database query result:', result.rows.length, 'rows found')

    if (result.rows.length === 0) {
      console.log('[RDP Download] ❌ RDP file not found or expired for token:', token)

      // Let's also check if the token exists but is expired
      const expiredCheck = await pool.query(`
        SELECT token, expires_at, created_at FROM temp_connections 
        WHERE token = $1
      `, [token])

      if (expiredCheck.rows.length > 0) {
        console.log('[RDP Download] Token found but expired:', expiredCheck.rows[0])
        return res.status(410).send('RDP file has expired. Please start a new work session.')
      } else {
        console.log('[RDP Download] Token not found in database at all')
        return res.status(404).send('RDP file not found. Please start a new work session.')
      }
    }

    // Decode base64 content back to text
    const fullContent = Buffer.from(result.rows[0].content, 'base64').toString('utf8')
    
    // Extract content type and actual content
    let contentType = 'rdp'
    let actualContent = fullContent
    
    if (fullContent.startsWith('REM CONTENT_TYPE:')) {
      const lines = fullContent.split('\r\n')
      const typeMatch = lines[0].match(/REM CONTENT_TYPE:(.+)/)
      if (typeMatch) {
        contentType = typeMatch[1]
        actualContent = lines.slice(1).join('\r\n')
      }
    }
    
    console.log('[RDP Download] ✅ Connection file found, type:', contentType, 'size:', actualContent.length, 'characters')
    console.log('[RDP Download] Content preview:', actualContent.substring(0, 100) + '...')

    // Set proper headers based on content type
    if (contentType === 'batch') {
      res.setHeader('Content-Type', 'application/octet-stream')
      res.setHeader('Content-Disposition', `attachment; filename="vm-connection.bat"`)
    } else {
      res.setHeader('Content-Type', 'application/x-rdp')
      res.setHeader('Content-Disposition', `attachment; filename="vm-connection.rdp"`)
    }
    
    res.setHeader('Content-Length', Buffer.byteLength(actualContent, 'utf8'))
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')

    // Send as plain text
    res.send(actualContent)

  } catch (error) {
    console.error('[RDP Download] ❌ Error downloading RDP file:', error)
    res.status(500).send('Failed to download RDP file. Please try again.')
  }
})

// All other routes require authentication
// Get assigned VMs for user
authenticatedRouter.get('/assigned-vms', async (req, res) => {
  try {
    const userId = req.user.id
    console.log('[Assigned VMs] Fetching VMs for user:', userId, req.user.email)

    const result = await pool.query(`
      SELECT DISTINCT vm.* FROM virtual_machines vm
      JOIN vm_assignments va ON vm.id = va.vm_id
      WHERE va.user_id = $1 AND vm.status = 'online'
      ORDER BY vm.name
    `, [userId])

    console.log(`[Assigned VMs] ✅ Found ${result.rows.length} assigned VMs for user ${req.user.email}`)

    res.json({
      success: true,
      vms: result.rows
    })
  } catch (error) {
    console.error('[Assigned VMs] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to fetch assigned VMs' })
  }
})

// Start VM session with cloud-specific connection
authenticatedRouter.post('/start-vm-session', async (req, res) => {
  try {
    const { vm_id, task_id } = req.body
    const userId = req.user.id

    console.log('[Start VM Session] Starting session for VM:', vm_id, 'User:', userId)

    // Get VM details with cloud configuration - check via vm_assignments table
    const vmResult = await pool.query(`
      SELECT vm.* FROM virtual_machines vm
      JOIN vm_assignments va ON vm.id = va.vm_id
      WHERE vm.id = $1 AND va.user_id = $2
    `, [vm_id, userId])

    if (vmResult.rows.length === 0) {
      return res.status(403).json({ error: 'VM not assigned to you' })
    }

    const vm = vmResult.rows[0]

    // Verify task belongs to user
    const taskResult = await pool.query(`
      SELECT t.id, t.task_name, p.name as project_name 
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1 AND p.user_id = $2
    `, [task_id, userId])

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' })
    }

    const task = taskResult.rows[0]

    // Check for active sessions
    const activeSession = await pool.query(`
      SELECT id FROM work_sessions 
      WHERE user_id = $1 AND is_active = true AND end_time IS NULL
    `, [userId])

    if (activeSession.rows.length > 0) {
      return res.status(400).json({ error: 'You already have an active work session' })
    }

    // Start work session tracking
    const sessionResult = await pool.query(`
      INSERT INTO work_sessions (user_id, task_id, vm_id, session_type, start_time)
      VALUES ($1, $2, $3, 'vm', NOW())
      RETURNING *
    `, [userId, task_id, vm_id])

    const session = sessionResult.rows[0]

    // Generate connection URL and instructions based on cloud provider
    let connectionUrl = ''
    let instructions = ''

    switch (vm.cloud_provider) {
      case 'azure':
        if (vm.connection_method === 'bastion') {
          connectionUrl = `https://portal.azure.com/#@${process.env.AZURE_TENANT_ID}/resource/subscriptions/${vm.subscription_id}/resourceGroups/${vm.resource_group}/providers/Microsoft.Compute/virtualMachines/${vm.vm_name}/bastion`
          instructions = `Azure Bastion will open in a new tab. You'll be authenticated automatically through your Azure AD account. Click "Connect" and choose your preferred connection method:
          
• For Windows VMs: Select "RDP" and click "Connect"
• For Linux VMs: Select "SSH" and click "Connect"
• Your session will be logged automatically
• Close the browser tab when finished to end the session`
        } else if (vm.connection_method === 'direct') {
          connectionUrl = await generateAzureRDPFile(vm, userId, session.id)
          instructions = `An RDP file will be downloaded for direct connection to your Azure VM:

• Double-click the downloaded .rdp file to open the connection
• Credentials are embedded in the file for automatic login
• If prompted for password, it should be pre-filled - just click OK
• Your session will be tracked automatically
• Close the RDP window when finished`
        } else {
          connectionUrl = await generateAzureVPNConnection(vm, userId)
          instructions = `VPN connection details provided:

• Ensure you're connected to the corporate VPN
• Use the provided RDP file to connect
• Network access is routed through VPN gateway
• Session tracking is automatic`
        }
        break

      case 'aws':
        if (vm.connection_method === 'bastion') {
          connectionUrl = `https://${vm.region}.console.aws.amazon.com/systems-manager/session-manager/sessions?region=${vm.region}#start-session`
          instructions = `AWS Session Manager will open in a new tab:

• Find your instance "${vm.instance_id}" in the list
• Click "Start session" to connect securely
• A browser-based terminal will open
• Type 'exit' or close the tab when finished
• All commands are logged automatically`
        } else if (vm.connection_method === 'direct') {
          connectionUrl = await generateAWSConnectionFile(vm, userId)
          instructions = `AWS direct connection configured:

• Use the provided SSH key or RDP file
• Connect directly to the instance
• Ensure security groups allow access
• Session duration is tracked`
        } else {
          connectionUrl = await generateAWSVPNConnection(vm, userId)
          instructions = `AWS VPN connection established:

• Connect through AWS VPN Gateway
• Use provided connection details
• Network traffic is encrypted
• Access is logged and monitored`
        }
        break

      case 'gcp':
        if (vm.connection_method === 'bastion') {
          connectionUrl = `https://console.cloud.google.com/compute/instances/details/${vm.zone}/${vm.vm_name}?project=${vm.project_id}&tab=ssh-in-browser`
          instructions = `GCP Console will open with Identity-Aware Proxy:

• Click the "SSH" button to connect
• Browser-based terminal will open automatically
• Connection is secured through IAP
• Type 'exit' or close tab when finished
• All activity is logged in Cloud Logging`
        } else if (vm.connection_method === 'direct') {
          connectionUrl = await generateGCPConnectionFile(vm, userId)
          instructions = `GCP direct connection configured:

• Use gcloud CLI or SSH client
• Connection details provided
• Firewall rules allow direct access
• Session is monitored and logged`
        } else {
          connectionUrl = await generateGCPVPNConnection(vm, userId)
          instructions = `GCP VPN connection established:

• Connect through Cloud VPN tunnel
• Use cloud shell or local SSH client
• Network access is secured
• All traffic is encrypted and logged`
        }
        break

      default:
        // Other/On-premises
        connectionUrl = await generateDirectRDPFile(vm, userId, session.id)
        instructions = `Direct connection to VM with embedded credentials:

• An RDP file (.rdp) will be downloaded with embedded credentials
• Double-click the downloaded file to open the RDP connection
• The connection should open automatically without prompting for password
• If prompted for credentials, they are pre-filled - just click OK
• Close the RDP window when finished working
• Session time is tracked automatically`
    }

    console.log('[Start VM Session] ✅ Session started successfully:', session.id)

    res.json({
      success: true,
      session: {
        ...session,
        task_name: task.task_name,
        project_name: task.project_name
      },
      connectionUrl,
      connectionType: `${vm.cloud_provider}-${vm.connection_method}`,
      vmName: vm.name,
      instructions
    })

  } catch (error) {
    console.error('[Start VM Session] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to start VM session' })
  }
})

// Start work session (general)
authenticatedRouter.post('/start', async (req, res) => {
  try {
    const { task_id, session_type, vm_id, reason } = req.body
    const userId = req.user.id

    console.log('[Start Session] Starting work session:', {
      userId,
      task_id,
      session_type,
      vm_id,
      reason
    })

    // Verify task belongs to user
    const taskCheck = await pool.query(`
      SELECT t.id, t.task_name, p.name as project_name FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1 AND p.user_id = $2
    `, [task_id, userId])

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' })
    }

    const task = taskCheck.rows[0]

    // Check for active sessions
    const activeSession = await pool.query(`
      SELECT id FROM work_sessions 
      WHERE user_id = $1 AND is_active = true AND end_time IS NULL
    `, [userId])

    if (activeSession.rows.length > 0) {
      return res.status(400).json({ error: 'You already have an active work session' })
    }

    // If VM session, verify VM is assigned to user via vm_assignments table
    if (session_type === 'vm' && vm_id) {
      const vmCheck = await pool.query(`
        SELECT vm.* FROM virtual_machines vm
        JOIN vm_assignments va ON vm.id = va.vm_id
        WHERE vm.id = $1 AND va.user_id = $2
      `, [vm_id, userId])

      if (vmCheck.rows.length === 0) {
        return res.status(403).json({ error: 'VM not assigned to you' })
      }
    }

    // Create work session
    const result = await pool.query(`
      INSERT INTO work_sessions (user_id, task_id, vm_id, session_type, start_time, reason)
      VALUES ($1, $2, $3, $4, NOW(), $5)
      RETURNING *
    `, [userId, task_id, vm_id, session_type, reason])

    const session = result.rows[0]

    // Add task and project info to response
    const sessionWithDetails = {
      ...session,
      task_name: task.task_name,
      project_name: task.project_name
    }

    console.log('[Start Session] ✅ Work session started successfully:', session.id)

    res.json({
      success: true,
      session: sessionWithDetails
    })
  } catch (error) {
    console.error('[Start Session] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to start work session' })
  }
})

// End work session
authenticatedRouter.post('/end-session', async (req, res) => {
  try {
    const userId = req.user.id

    // End any active sessions for this user
    const result = await pool.query(`
      UPDATE work_sessions 
      SET end_time = NOW(),
          is_active = false,
          duration_minutes = EXTRACT(EPOCH FROM (NOW() - start_time))/60
      WHERE user_id = $1 
      AND is_active = true 
      AND end_time IS NULL
      RETURNING *
    `, [userId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active session found' })
    }

    console.log('[End Session] ✅ Session ended successfully:', result.rows[0])

    res.json({
      success: true,
      message: 'Work session ended successfully',
      session: result.rows[0]
    })
  } catch (error) {
    console.error('[End Session] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to end work session' })
  }
})

// Simple debug endpoint to check basic session data
authenticatedRouter.get('/debug/simple-sessions', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    // Simple query without joins to avoid timeout
    const result = await pool.query(`
      SELECT id, user_id, task_id, is_active, end_time, start_time
      FROM work_sessions 
      WHERE is_active = true AND end_time IS NULL
      ORDER BY start_time DESC
      LIMIT 20
    `)

    console.log(`[Simple Debug] Found ${result.rows.length} active sessions`)
    
    res.json({
      success: true,
      activeSessions: result.rows.length,
      sessions: result.rows
    })
  } catch (error) {
    console.error('[Simple Debug] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to fetch simple debug sessions' })
  }
})

// Debug endpoint to check all sessions
authenticatedRouter.get('/debug/all-sessions', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const result = await pool.query(`
      SELECT 
        ws.*,
        u.name as user_name,
        u.email as user_email,
        t.task_name,
        p.name as project_name
      FROM work_sessions ws
      JOIN users u ON ws.user_id = u.id
      JOIN tasks t ON ws.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      ORDER BY ws.start_time DESC
      LIMIT 50
    `)

    console.log(`[Debug Sessions] Found ${result.rows.length} total sessions`)
    
    const activeSessions = result.rows.filter(s => s.is_active && !s.end_time)
    console.log(`[Debug Sessions] Found ${activeSessions.length} active sessions`)
    
    res.json({
      success: true,
      totalSessions: result.rows.length,
      activeSessions: activeSessions.length,
      sessions: result.rows,
      activeSessionsDetails: activeSessions
    })
  } catch (error) {
    console.error('[Debug Sessions] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to fetch debug sessions' })
  }
})

// Add a cleanup endpoint for stale sessions
authenticatedRouter.post('/cleanup-stale-sessions', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    // Clean up sessions that are marked active but have no activity for over an hour
    const result = await pool.query(`
      UPDATE work_sessions 
      SET end_time = NOW(),
          is_active = false,
          duration_minutes = EXTRACT(EPOCH FROM (NOW() - start_time))/60
      WHERE is_active = true 
      AND start_time < NOW() - INTERVAL '1 hour'
      RETURNING *
    `)

    console.log(`[Cleanup Sessions] ✅ Cleaned up ${result.rows.length} stale sessions`)

    res.json({
      success: true,
      message: `Cleaned up ${result.rows.length} stale sessions`,
      sessions: result.rows
    })
  } catch (error) {
    console.error('[Cleanup Sessions] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to cleanup stale sessions' })
  }
})

// Force cleanup all active sessions (admin only)
authenticatedRouter.post('/cleanup-all-active', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    // Clean up ALL active sessions
    const result = await pool.query(`
      UPDATE work_sessions 
      SET end_time = NOW(),
          is_active = false,
          duration_minutes = EXTRACT(EPOCH FROM (NOW() - start_time))/60
      WHERE is_active = true AND end_time IS NULL
      RETURNING *
    `)

    console.log(`[Force Cleanup] ✅ Cleaned up ${result.rows.length} active sessions`)

    res.json({
      success: true,
      message: `Force cleaned up ${result.rows.length} active sessions`,
      sessions: result.rows
    })
  } catch (error) {
    console.error('[Force Cleanup] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to force cleanup sessions' })
  }
})

// Debug project dependencies (admin only)
authenticatedRouter.get('/debug/project-dependencies/:projectId', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { projectId } = req.params

    // Check all tables that might reference this project
    const [
      workSessions,
      projectAssignments,
      tasks,
      tempConnections
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM work_sessions WHERE project_id = $1', [projectId]),
      pool.query('SELECT COUNT(*) as count FROM project_assignments WHERE project_id = $1', [projectId]),
      pool.query('SELECT COUNT(*) as count FROM tasks WHERE project_id = $1', [projectId]),
      pool.query(`
        SELECT COUNT(*) as count FROM temp_connections tc 
        JOIN work_sessions ws ON tc.session_id = ws.id 
        WHERE ws.project_id = $1
      `, [projectId])
    ])

    const dependencies = {
      workSessions: parseInt(workSessions.rows[0].count),
      projectAssignments: parseInt(projectAssignments.rows[0].count),
      tasks: parseInt(tasks.rows[0].count),
      tempConnections: parseInt(tempConnections.rows[0].count)
    }

    console.log(`[Debug Project Dependencies] Project ${projectId}:`, dependencies)

    res.json({
      success: true,
      projectId,
      dependencies,
      totalDependencies: Object.values(dependencies).reduce((sum, count) => sum + count, 0)
    })
  } catch (error) {
    console.error('[Debug Project Dependencies] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to debug project dependencies' })
  }
})

// Force cleanup project dependencies (admin only)
authenticatedRouter.post('/cleanup-project-dependencies/:projectId', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { projectId } = req.params

    // Clean up all dependencies in the correct order
    const cleanupResults = []

    // 1. Clean up temp_connections first
    const tempConnections = await pool.query(`
      DELETE FROM temp_connections 
      WHERE session_id IN (
        SELECT id FROM work_sessions WHERE project_id = $1
      )
      RETURNING *
    `, [projectId])
    cleanupResults.push({ table: 'temp_connections', count: tempConnections.rows.length })

    // 2. Clean up work_sessions
    const workSessions = await pool.query(`
      DELETE FROM work_sessions WHERE project_id = $1 RETURNING *
    `, [projectId])
    cleanupResults.push({ table: 'work_sessions', count: workSessions.rows.length })

    // 3. Clean up project_assignments
    const projectAssignments = await pool.query(`
      DELETE FROM project_assignments WHERE project_id = $1 RETURNING *
    `, [projectId])
    cleanupResults.push({ table: 'project_assignments', count: projectAssignments.rows.length })

    console.log(`[Cleanup Project Dependencies] Project ${projectId}:`, cleanupResults)

    res.json({
      success: true,
      message: `Cleaned up all dependencies for project ${projectId}`,
      projectId,
      cleanupResults
    })
  } catch (error) {
    console.error('[Cleanup Project Dependencies] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to cleanup project dependencies' })
  }
})

// Get active session
authenticatedRouter.get('/active', async (req, res) => {
  try {
    const userId = req.user.id

    console.log('[Active Session] Checking active session for user:', userId)

    const result = await pool.query(`
      SELECT ws.*, t.task_name, p.name as project_name, vm.name as vm_name
      FROM work_sessions ws
      JOIN tasks t ON ws.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN virtual_machines vm ON ws.vm_id = vm.id
      WHERE ws.user_id = $1 AND ws.is_active = true AND ws.end_time IS NULL
      ORDER BY ws.start_time DESC
      LIMIT 1
    `, [userId])

    const activeSession = result.rows[0] || null
    console.log('[Active Session] ✅ Active session check:', activeSession ? 'Found' : 'None')

    res.json({
      success: true,
      activeSession: activeSession
    })
  } catch (error) {
    console.error('[Active Session] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to fetch active session' })
  }
})

// Get work session history
authenticatedRouter.get('/history', async (req, res) => {
  try {
    const userId = req.user.id
    const { limit = 50, offset = 0 } = req.query

    console.log('[Session History] Fetching session history for user:', userId)

    const result = await pool.query(`
      SELECT ws.*, t.task_name, p.name as project_name, vm.name as vm_name
      FROM work_sessions ws
      JOIN tasks t ON ws.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN virtual_machines vm ON ws.vm_id = vm.id
      WHERE ws.user_id = $1
      ORDER BY ws.start_time DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset])

    console.log(`[Session History] ✅ Found ${result.rows.length} session records`)

    res.json({
      success: true,
      sessions: result.rows,
      total: result.rows.length
    })
  } catch (error) {
    console.error('[Session History] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to fetch session history' })
  }
})

// Get session statistics
authenticatedRouter.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id
    const { startDate, endDate } = req.query

    console.log('[Session Stats] Fetching stats for user:', userId)

    let dateFilter = ''
    let params = [userId]

    if (startDate && endDate) {
      dateFilter = 'AND ws.start_time >= $2 AND ws.start_time <= $3'
      params.push(startDate, endDate)
    }

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        COALESCE(SUM(duration_minutes), 0) as total_minutes,
        COALESCE(AVG(duration_minutes), 0) as avg_session_duration,
        COUNT(CASE WHEN session_type = 'vm' THEN 1 END) as vm_sessions,
        COUNT(CASE WHEN session_type = 'personal' THEN 1 END) as personal_sessions
      FROM work_sessions ws
      WHERE ws.user_id = $1 AND ws.end_time IS NOT NULL ${dateFilter}
    `, params)

    const stats = result.rows[0]
    console.log('[Session Stats] ✅ Stats calculated:', stats)

    res.json({
      success: true,
      stats: {
        totalSessions: parseInt(stats.total_sessions),
        totalMinutes: parseFloat(stats.total_minutes),
        totalHours: parseFloat(stats.total_minutes) / 60,
        avgSessionDuration: parseFloat(stats.avg_session_duration),
        vmSessions: parseInt(stats.vm_sessions),
        personalSessions: parseInt(stats.personal_sessions)
      }
    })
  } catch (error) {
    console.error('[Session Stats] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to fetch session statistics' })
  }
})

// Admin: Get active sessions only
authenticatedRouter.get('/admin/active', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    console.log('[Admin Active Sessions] Fetching all active sessions')

    const result = await pool.query(`
      SELECT 
        ws.*,
        u.name as user_name,
        u.email as user_email,
        t.task_name,
        p.name as project_name,
        vm.name as vm_name,
        vm.ip_address as vm_ip,
        vm.os_type,
        vm.cloud_provider,
        EXTRACT(EPOCH FROM (NOW() - ws.start_time))/60 as duration_minutes_current
      FROM work_sessions ws
      JOIN users u ON ws.user_id = u.id
      JOIN tasks t ON ws.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN virtual_machines vm ON ws.vm_id = vm.id
      WHERE ws.is_active = true AND ws.end_time IS NULL
      ORDER BY ws.start_time DESC
    `)

    console.log(`[Admin Active Sessions] ✅ Found ${result.rows.length} active sessions`)

    res.json({
      success: true,
      sessions: result.rows,
      total: result.rows.length
    })
  } catch (error) {
    console.error('[Admin Active Sessions] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to fetch active sessions' })
  }
})

// Admin: Get all sessions
authenticatedRouter.get('/admin/all', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { limit = 100, offset = 0, userId, startDate, endDate } = req.query

    console.log('[Admin Sessions] Fetching all sessions')

    let whereClause = 'WHERE 1=1'
    let params = []
    let paramCount = 0

    if (userId) {
      paramCount++
      whereClause += ` AND ws.user_id = $${paramCount}`
      params.push(userId)
    }

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

    paramCount++
    params.push(limit)
    const limitParam = `$${paramCount}`

    paramCount++
    params.push(offset)
    const offsetParam = `$${paramCount}`

    const result = await pool.query(`
      SELECT 
        ws.*,
        u.name as user_name,
        u.email as user_email,
        t.task_name,
        p.name as project_name,
        vm.name as vm_name,
        vm.ip_address as vm_ip
      FROM work_sessions ws
      JOIN users u ON ws.user_id = u.id
      JOIN tasks t ON ws.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN virtual_machines vm ON ws.vm_id = vm.id
      ${whereClause}
      ORDER BY ws.start_time DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `, params)

    console.log(`[Admin Sessions] ✅ Found ${result.rows.length} session records`)

    res.json({
      success: true,
      sessions: result.rows,
      total: result.rows.length
    })
  } catch (error) {
    console.error('[Admin Sessions] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to fetch sessions' })
  }
})

// Get sessions for specific user (admin endpoint)
authenticatedRouter.get('/admin/user/:userId', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { userId } = req.params
    const { startDate, endDate, limit = 100 } = req.query

    console.log('[Admin User Sessions] Fetching sessions for user:', userId)

    let whereClause = 'WHERE ws.user_id = $1'
    let params = [userId]
    let paramCount = 1

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

    paramCount++
    params.push(limit)

    const result = await pool.query(`
      SELECT 
        ws.*,
        u.name as user_name,
        u.email as user_email,
        t.task_name,
        p.name as project_name,
        vm.name as vm_name,
        vm.ip_address as vm_ip
      FROM work_sessions ws
      JOIN users u ON ws.user_id = u.id
      JOIN tasks t ON ws.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN virtual_machines vm ON ws.vm_id = vm.id
      ${whereClause}
      ORDER BY ws.start_time DESC
      LIMIT $${paramCount}
    `, params)

    console.log(`[Admin User Sessions] ✅ Found ${result.rows.length} sessions for user ${userId}`)

    res.json({
      success: true,
      sessions: result.rows,
      total: result.rows.length,
      userId: userId
    })
  } catch (error) {
    console.error('[Admin User Sessions] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to fetch user sessions' })
  }
})

// Force end session (admin only)
authenticatedRouter.post('/admin/force-end/:sessionId', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { sessionId } = req.params

    console.log('[Force End Session] Admin force ending session:', sessionId)

    const result = await pool.query(`
      UPDATE work_sessions 
      SET end_time = NOW(), 
          duration_minutes = EXTRACT(EPOCH FROM (NOW() - start_time)) / 60,
          is_active = false
      WHERE id = $1 AND is_active = true
      RETURNING *
    `, [sessionId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Active session not found' })
    }

    console.log('[Force End Session] ✅ Session force ended by admin')

    res.json({
      success: true,
      session: result.rows[0],
      message: 'Session ended by administrator'
    })
  } catch (error) {
    console.error('[Force End Session] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to force end session' })
  }
})

// Bulk end sessions (admin only)
authenticatedRouter.post('/admin/bulk-end', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { sessionIds } = req.body

    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({ error: 'Session IDs array is required' })
    }

    console.log('[Bulk End Sessions] Admin ending sessions:', sessionIds)

    // Create placeholders for the IN clause
    const placeholders = sessionIds.map((_, index) => `$${index + 1}`).join(',')

    const result = await pool.query(`
      UPDATE work_sessions 
      SET end_time = NOW(), 
          duration_minutes = EXTRACT(EPOCH FROM (NOW() - start_time)) / 60,
          is_active = false
      WHERE id IN (${placeholders}) AND is_active = true
      RETURNING *
    `, sessionIds)

    console.log(`[Bulk End Sessions] ✅ ${result.rows.length} sessions ended by admin`)

    res.json({
      success: true,
      endedSessions: result.rows,
      count: result.rows.length,
      message: `${result.rows.length} sessions ended by administrator`
    })
  } catch (error) {
    console.error('[Bulk End Sessions] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to bulk end sessions' })
  }
})

// Log non-work activity (when user is not working)
authenticatedRouter.post('/non-work-log', async (req, res) => {
  try {
    const { reason, date } = req.body
    const userId = req.user.id

    console.log('[Non-Work Log] Logging non-work activity for user:', userId)

    if (!reason || !date) {
      return res.status(400).json({ error: 'Reason and date are required' })
    }

    // Insert non-work log
    const result = await pool.query(`
      INSERT INTO non_work_logs (user_id, reason, date, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `, [userId, reason, date])

    console.log('[Non-Work Log] ✅ Non-work activity logged successfully')

    res.json({
      success: true,
      log: result.rows[0],
      message: 'Non-work activity logged successfully'
    })
  } catch (error) {
    console.error('[Non-Work Log] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to log non-work activity' })
  }
})

// Helper functions for generating connection files
// Helper function to encode password for RDP file (Windows DPAPI style)
function encodeRDPPassword(password) {
  // Convert password to UTF-16LE and then to hex
  const utf16Buffer = Buffer.from(password, 'utf16le')
  return utf16Buffer.toString('hex')
}

async function generateAzureRDPFile(vm, userId, sessionId) {
  const tempToken = crypto.randomBytes(32).toString('hex')
  console.log('[RDP Generation] Generating RDP file for VM:', vm.id, 'User:', userId, 'Token:', tempToken)

  // Always fetch credentials using CredentialService
  let credentials
  try {
    credentials = await CredentialService.getConnectionCredentials(vm.id, userId)
    console.log('[RDP Generation] ✅ Credentials found for VM:', vm.id)
  } catch (err) {
    console.warn(`[RDP Generation] ⚠️ No credentials found for VM ${vm.id}, creating default credentials. Admin should update these!`)
    await CredentialService.setVMCredentials(vm.id, {
      username: 'defaultuser',
      password: 'changeme123!',
      connectionType: 'rdp',
      connectionPort: 3389
    })
    credentials = await CredentialService.getConnectionCredentials(vm.id, userId)
    console.log('[RDP Generation] ✅ Default credentials created for VM:', vm.id)
  }

  // Create RDP file content with embedded credentials for automatic login
  const rdpContent = [
    'screen mode id:i:2',
    'use multimon:i:0',
    'desktopwidth:i:1920',
    'desktopheight:i:1080',
    'session bpp:i:32',
    'winposstr:s:0,1,320,27,1628,953',
    'compression:i:1',
    'keyboardhook:i:2',
    'audiocapturemode:i:0',
    'videoplaybackmode:i:1',
    'connection type:i:7',
    'networkautodetect:i:1',
    'bandwidthautodetect:i:1',
    'displayconnectionbar:i:1',
    'enableworkspacereconnect:i:0',
    'disable wallpaper:i:0',
    'allow font smoothing:i:0',
    'allow desktop composition:i:0',
    'disable full window drag:i:1',
    'disable menu anims:i:1',
    'disable themes:i:0',
    'disable cursor setting:i:0',
    'bitmapcachepersistenable:i:1',
    `full address:s:${vm.ip_address}`,
    `username:s:${credentials.username}`,
    'audiomode:i:0',
    'redirectprinters:i:1',
    'redirectlocation:i:0',
    'redirectcomports:i:0',
    'redirectsmartcards:i:1',
    'redirectwebauthn:i:1',
    'redirectclipboard:i:1',
    'redirectposdevices:i:0',
    'autoreconnection enabled:i:1',
    'authentication level:i:2',
    'prompt for credentials:i:0',
    'negotiate security layer:i:1',
    'remoteapplicationmode:i:0',
    'alternate shell:s:',
    'shell working directory:s:',
    'gatewayhostname:s:',
    'gatewayusagemethod:i:4',
    'gatewaycredentialssource:i:4',
    'gatewayprofileusagemethod:i:0',
    'promptcredentialonce:i:0',
    'gatewaybrokeringtype:i:0',
    'use redirection server name:i:0',
    'rdgiskdcproxy:i:0',
    'kdcproxyname:s:',
    'enablerdsaadauth:i:0',
    // Add domain (if applicable)
    'domain:s:'
  ].join('\r\n')

  // Try to create RDP file with embedded password, fallback to batch file if needed
  const usePasswordEmbedding = true // Can be configured based on environment
  
  let finalContent
  let contentType = 'rdp'
  
  if (usePasswordEmbedding) {
    // Create enhanced RDP file with embedded credentials
    const enhancedRdpContent = [
    'screen mode id:i:2',
    'use multimon:i:0',
    'desktopwidth:i:1920',
    'desktopheight:i:1080',
    'session bpp:i:32',
    'winposstr:s:0,1,320,27,1628,953',
    'compression:i:1',
    'keyboardhook:i:2',
    'audiocapturemode:i:0',
    'videoplaybackmode:i:1',
    'connection type:i:7',
    'networkautodetect:i:1',
    'bandwidthautodetect:i:1',
    'displayconnectionbar:i:1',
    'enableworkspacereconnect:i:0',
    'disable wallpaper:i:0',
    'allow font smoothing:i:0',
    'allow desktop composition:i:0',
    'disable full window drag:i:1',
    'disable menu anims:i:1',
    'disable themes:i:0',
    'disable cursor setting:i:0',
    'bitmapcachepersistenable:i:1',
    `full address:s:${vm.ip_address}`,
    `username:s:${credentials.username}`,
    'audiomode:i:0',
    'redirectprinters:i:1',
    'redirectlocation:i:0',
    'redirectcomports:i:0',
    'redirectsmartcards:i:1',
    'redirectwebauthn:i:1',
    'redirectclipboard:i:1',
    'redirectposdevices:i:0',
    'autoreconnection enabled:i:1',
    'authentication level:i:2',
    'prompt for credentials:i:0',
    'negotiate security layer:i:1',
    'remoteapplicationmode:i:0',
    'alternate shell:s:',
    'shell working directory:s:',
    'gatewayhostname:s:',
    'gatewayusagemethod:i:4',
    'gatewaycredentialssource:i:4',
    'gatewayprofileusagemethod:i:0',
    'promptcredentialonce:i:0',
    'gatewaybrokeringtype:i:0',
    'use redirection server name:i:0',
    'rdgiskdcproxy:i:0',
    'kdcproxyname:s:',
    'enablerdsaadauth:i:0',
    'domain:s:',
      // Add password in binary format (hex encoded UTF-16LE)
      `password 51:b:${encodeRDPPassword(credentials.password)}`
    ].join('\r\n')
    
    finalContent = enhancedRdpContent
  } else {
    // Fallback: Create a batch file that stores credentials and launches RDP
    const batchContent = `@echo off
echo Setting up connection to ${vm.name} (${vm.ip_address})...
echo.

REM Store credentials in Windows Credential Manager
cmdkey /generic:TERMSRV/${vm.ip_address} /user:${credentials.username} /pass:${credentials.password}

REM Create temporary RDP file
echo screen mode id:i:2 > "%temp%\\vm-connection.rdp"
echo use multimon:i:0 >> "%temp%\\vm-connection.rdp"
echo desktopwidth:i:1920 >> "%temp%\\vm-connection.rdp"
echo desktopheight:i:1080 >> "%temp%\\vm-connection.rdp"
echo session bpp:i:32 >> "%temp%\\vm-connection.rdp"
echo compression:i:1 >> "%temp%\\vm-connection.rdp"
echo keyboardhook:i:2 >> "%temp%\\vm-connection.rdp"
echo full address:s:${vm.ip_address} >> "%temp%\\vm-connection.rdp"
echo username:s:${credentials.username} >> "%temp%\\vm-connection.rdp"
echo authentication level:i:2 >> "%temp%\\vm-connection.rdp"
echo prompt for credentials:i:0 >> "%temp%\\vm-connection.rdp"

echo Launching RDP connection...
start "" mstsc "%temp%\\vm-connection.rdp"

echo.
echo Connection launched! The RDP window should open shortly.
echo Credentials have been stored automatically.
echo.
pause

REM Cleanup
del "%temp%\\vm-connection.rdp" 2>nul
`
    finalContent = batchContent
    contentType = 'batch'
  }

  // Convert to base64 for storage
  const base64Content = Buffer.from(finalContent, 'utf8').toString('base64')

  // Store base64 encoded connection file
  console.log('[RDP Generation] Storing connection file in database with token:', tempToken, 'type:', contentType)
  console.log('[RDP Generation] Content preview:', finalContent.substring(0, 200) + '...')

  // Store content type in a comment within the content for retrieval
  const contentWithType = `REM CONTENT_TYPE:${contentType}\r\n${finalContent}`
  const base64ContentWithType = Buffer.from(contentWithType, 'utf8').toString('base64')

  await pool.query(`
    INSERT INTO temp_connections (token, vm_id, user_id, session_id, content, expires_at)
    VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '2 hours')
  `, [tempToken, vm.id, userId, sessionId, base64ContentWithType])

  console.log('[RDP Generation] ✅ RDP file stored successfully, returning download URL')

  // Return full backend URL for RDP download
  const backendUrl = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001'
  const downloadUrl = `${backendUrl}/api/work-sessions/download/rdp/${tempToken}`
  console.log('[RDP Generation] Full download URL:', downloadUrl)

  return downloadUrl
}

async function generateDirectRDPFile(vm, userId, sessionId) {
  return generateAzureRDPFile(vm, userId, sessionId)
}

async function generateAWSConnectionFile(vm, userId) {
  const tempToken = crypto.randomBytes(32).toString('hex')
  return `/api/download/aws-script/${tempToken}`
}

async function generateGCPConnectionFile(vm, userId) {
  const tempToken = crypto.randomBytes(32).toString('hex')
  return `/api/download/gcp-script/${tempToken}`
}

async function generateAzureVPNConnection(vm, userId) {
  return generateAzureRDPFile(vm, userId, null)
}

async function generateAWSVPNConnection(vm, userId) {
  return generateAWSConnectionFile(vm, userId)
}

async function generateGCPVPNConnection(vm, userId) {
  return generateGCPConnectionFile(vm, userId)
}

// Health check endpoint
authenticatedRouter.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM work_sessions')
    res.json({
      success: true,
      status: 'healthy',
      totalSessions: parseInt(result.rows[0].count),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Health Check] ❌ Error:', error)
    res.status(500).json({ error: 'Health check failed' })
  }
})

module.exports = { authenticatedRouter, publicRouter }
