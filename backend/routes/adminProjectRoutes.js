const express = require('express')
const { pool } = require('../config/database')
const AdminProjectService = require('../services/adminProjectService')
const router = express.Router()

// Middleware to verify admin role
const requireAdmin = (req, res, next) => {
  console.log('[Admin Project Check] User:', req.user)
  
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

// Apply admin middleware to all routes
router.use(requireAdmin)

// Get all projects across all users (Admin view)
router.get('/', async (req, res) => {
  try {
    const { user_id, status, start_date, end_date, search, page = 1, limit = 20 } = req.query
    
    console.log('[Admin Projects] Fetching all projects with filters:', {
      user_id, status, start_date, end_date, search, page, limit
    })

    let whereConditions = []
    let queryParams = []
    let paramIndex = 1

    // Build dynamic WHERE clause
    if (user_id) {
      whereConditions.push(`p.user_id = $${paramIndex}`)
      queryParams.push(user_id)
      paramIndex++
    }

    if (status) {
      whereConditions.push(`p.status = $${paramIndex}`)
      queryParams.push(status)
      paramIndex++
    }

    if (start_date) {
      whereConditions.push(`p.start_date >= $${paramIndex}`)
      queryParams.push(start_date)
      paramIndex++
    }

    if (end_date) {
      whereConditions.push(`p.end_date <= $${paramIndex}`)
      queryParams.push(end_date)
      paramIndex++
    }

    if (search) {
      whereConditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`)
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Calculate offset for pagination
    const offset = (page - 1) * limit
    queryParams.push(limit, offset)

    const query = `
      SELECT 
        p.*,
        u.name as user_name,
        u.email as user_email,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
        COUNT(DISTINCT ws.id) as total_work_sessions,
        SUM(ws.duration_minutes) as total_work_minutes,
        COUNT(DISTINCT pa.user_id) as assigned_users_count,
        array_agg(DISTINCT au.name ORDER BY au.name) FILTER (WHERE au.name IS NOT NULL) as assigned_user_names,
        array_agg(DISTINCT au.email ORDER BY au.email) FILTER (WHERE au.email IS NOT NULL) as assigned_user_emails
      FROM projects p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN tasks t ON p.id = t.project_id
      LEFT JOIN work_sessions ws ON t.id = ws.task_id
      LEFT JOIN project_assignments pa ON p.id = pa.project_id
      LEFT JOIN users au ON pa.user_id = au.id
      ${whereClause}
      GROUP BY p.id, u.id, u.name, u.email
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    const result = await pool.query(query, queryParams)

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM projects p
      LEFT JOIN users u ON p.user_id = u.id
      ${whereClause}
    `
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2))
    const totalProjects = parseInt(countResult.rows[0].total)

    console.log(`[Admin Projects] ✅ Found ${result.rows.length} projects (${totalProjects} total)`)

    res.json({
      success: true,
      projects: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalProjects,
        totalPages: Math.ceil(totalProjects / limit)
      }
    })
  } catch (error) {
    console.error('[Admin Projects] ❌ Error fetching projects:', error)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// Get all projects for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const { include_tasks = false } = req.query

    console.log(`[Admin Projects] Fetching projects for user ${userId}, include_tasks: ${include_tasks}`)

    // Verify user exists
    const userCheck = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [userId])
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = userCheck.rows[0]

    let query = `
      SELECT 
        p.*,
        COUNT(t.id) as task_count,
        COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.user_id = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `

    let result = await pool.query(query, [userId])
    let projects = result.rows

    // Include tasks if requested
    if (include_tasks === 'true') {
      for (let project of projects) {
        const tasksResult = await pool.query(`
          SELECT * FROM tasks 
          WHERE project_id = $1 
          ORDER BY created_at ASC
        `, [project.id])
        project.tasks = tasksResult.rows
      }
    }

    console.log(`[Admin Projects] ✅ Found ${projects.length} projects for user ${user.name}`)

    res.json({
      success: true,
      user: user,
      projects: projects
    })
  } catch (error) {
    console.error('[Admin Projects] ❌ Error fetching user projects:', error)
    res.status(500).json({ error: 'Failed to fetch user projects' })
  }
})

// Create new project and assign to user
router.post('/', async (req, res) => {
  try {
    const { name, description, user_id, start_date, end_date, status = 'active' } = req.body
    const adminId = req.user.id

    console.log('[Admin Projects] Creating new project:', {
      name, user_id, status, created_by: adminId
    })

    // Validate required fields
    if (!name || !user_id) {
      return res.status(400).json({ error: 'Project name and user assignment are required' })
    }

    // Verify assigned user exists
    const userCheck = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [user_id])
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Assigned user not found' })
    }

    const assignedUser = userCheck.rows[0]

    // Create project
    const result = await pool.query(`
      INSERT INTO projects (name, description, user_id, status, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, description, user_id, status, start_date, end_date])

    const project = {
      ...result.rows[0],
      user_name: assignedUser.name,
      user_email: assignedUser.email,
      task_count: 0,
      completed_tasks: 0
    }

    console.log(`[Admin Projects] ✅ Project created with ID ${project.id} for user ${assignedUser.name}`)

    res.json({
      success: true,
      message: `Project "${name}" created and assigned to ${assignedUser.name}`,
      project: project
    })
  } catch (error) {
    console.error('[Admin Projects] ❌ Error creating project:', error)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

// Update project (admin can update any project)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, user_id, status, start_date, end_date } = req.body

    console.log(`[Admin Projects] Updating project ${id}:`, {
      name, user_id, status
    })

    // Check if project exists
    const projectCheck = await pool.query('SELECT * FROM projects WHERE id = $1', [id])
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // If user_id is being changed, verify new user exists
    if (user_id) {
      const userCheck = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [user_id])
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Assigned user not found' })
      }
    }

    // Build update query dynamically
    const updates = []
    const values = []
    let paramIndex = 1

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`)
      values.push(name)
      paramIndex++
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`)
      values.push(description)
      paramIndex++
    }
    if (user_id !== undefined) {
      updates.push(`user_id = $${paramIndex}`)
      values.push(user_id)
      paramIndex++
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`)
      values.push(status)
      paramIndex++
    }
    if (start_date !== undefined) {
      updates.push(`start_date = $${paramIndex}`)
      values.push(start_date)
      paramIndex++
    }
    if (end_date !== undefined) {
      updates.push(`end_date = $${paramIndex}`)
      values.push(end_date)
      paramIndex++
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    const updateQuery = `
      UPDATE projects 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await pool.query(updateQuery, values)

    // Get updated project with user info
    const updatedProjectQuery = `
      SELECT 
        p.*,
        u.name as user_name,
        u.email as user_email,
        COUNT(t.id) as task_count,
        COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks
      FROM projects p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.id = $1
      GROUP BY p.id, u.id, u.name, u.email
    `

    const updatedResult = await pool.query(updatedProjectQuery, [id])
    const updatedProject = updatedResult.rows[0]

    console.log(`[Admin Projects] ✅ Project ${id} updated successfully`)

    res.json({
      success: true,
      message: 'Project updated successfully',
      project: updatedProject
    })
  } catch (error) {
    console.error('[Admin Projects] ❌ Error updating project:', error)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

// Assign/reassign project to different user
router.post('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params
    const { user_id, user_ids } = req.body
    const adminId = req.user.id

    console.log(`[Admin Projects] Assigning project ${id} to user(s)`, { user_id, user_ids })

    // Support both single user and multiple users
    const targetUserIds = user_ids && Array.isArray(user_ids) ? user_ids : [user_id]
    
    if (!targetUserIds || targetUserIds.length === 0 || targetUserIds.some(id => !id)) {
      return res.status(400).json({ error: 'At least one valid user ID is required' })
    }

    // Check if project exists
    const projectCheck = await pool.query('SELECT * FROM projects WHERE id = $1', [id])
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const project = projectCheck.rows[0]

    // Verify all users exist
    const userCheck = await pool.query(
      `SELECT id, name, email, role FROM users WHERE id = ANY($1::int[]) AND is_active = true`,
      [targetUserIds]
    )
    
    if (userCheck.rows.length !== targetUserIds.length) {
      return res.status(404).json({ error: 'One or more users not found or inactive' })
    }

    const users = userCheck.rows

    // Start transaction
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // For backward compatibility, update the main user_id field to the first user
      const primaryUserId = targetUserIds[0]
      await client.query(`
        UPDATE projects 
        SET user_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [primaryUserId, id])

      // Clear existing assignments for this project
      await client.query('DELETE FROM project_assignments WHERE project_id = $1', [id])

      // Add new assignments for all users
      for (const userId of targetUserIds) {
        await client.query(`
          INSERT INTO project_assignments (project_id, user_id, assigned_by, assigned_at)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
          ON CONFLICT (project_id, user_id) DO NOTHING
        `, [id, userId, adminId])
      }

      await client.query('COMMIT')

      // Get updated project with all assigned users
      const updatedProjectQuery = `
        SELECT 
          p.*,
          array_agg(DISTINCT u.name ORDER BY u.name) as assigned_user_names,
          array_agg(DISTINCT u.email ORDER BY u.email) as assigned_user_emails,
          COUNT(DISTINCT pa.user_id) as assigned_users_count,
          pu.name as primary_user_name,
          pu.email as primary_user_email
        FROM projects p
        LEFT JOIN project_assignments pa ON p.id = pa.project_id
        LEFT JOIN users u ON pa.user_id = u.id
        LEFT JOIN users pu ON p.user_id = pu.id
        WHERE p.id = $1
        GROUP BY p.id, pu.name, pu.email
      `

      const updatedResult = await client.query(updatedProjectQuery, [id])
      const updatedProject = updatedResult.rows[0]

      console.log(`[Admin Projects] ✅ Project "${project.name}" assigned to ${users.length} user(s): ${users.map(u => u.name).join(', ')}`)

      res.json({
        success: true,
        message: `Project "${project.name}" assigned to ${users.length} user(s): ${users.map(u => u.name).join(', ')}`,
        project: {
          ...updatedProject,
          // For compatibility with existing frontend
          user_name: updatedProject.primary_user_name,
          user_email: updatedProject.primary_user_email,
          // New fields for multiple assignments
          assigned_users: users,
          assigned_users_count: users.length
        }
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('[Admin Projects] ❌ Error assigning project:', error)
    res.status(500).json({ error: 'Failed to assign project' })
  }
})

// Get all assigned users for a project
router.get('/:id/assignments', async (req, res) => {
  try {
    const { id } = req.params

    console.log(`[Admin Projects] Fetching assignments for project ${id}`)

    // Check if project exists
    const projectCheck = await pool.query('SELECT * FROM projects WHERE id = $1', [id])
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // Get all assigned users
    const assignmentsQuery = `
      SELECT 
        pa.id,
        pa.project_id,
        pa.user_id,
        pa.assigned_at,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role,
        ab.name as assigned_by_name,
        p.user_id = u.id as is_primary_user
      FROM project_assignments pa
      JOIN users u ON pa.user_id = u.id
      JOIN users ab ON pa.assigned_by = ab.id
      JOIN projects p ON pa.project_id = p.id
      WHERE pa.project_id = $1
      ORDER BY is_primary_user DESC, u.name ASC
    `

    const result = await pool.query(assignmentsQuery, [id])

    console.log(`[Admin Projects] ✅ Found ${result.rows.length} assignments for project ${id}`)

    res.json({
      success: true,
      project_id: parseInt(id),
      assignments: result.rows
    })
  } catch (error) {
    console.error('[Admin Projects] ❌ Error fetching project assignments:', error)
    res.status(500).json({ error: 'Failed to fetch project assignments' })
  }
})

// Remove user from project
router.delete('/:id/assignments/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params

    console.log(`[Admin Projects] Removing user ${userId} from project ${id}`)

    // Check if project exists
    const projectCheck = await pool.query('SELECT * FROM projects WHERE id = $1', [id])
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // Check if user is assigned to the project
    const assignmentCheck = await pool.query(`
      SELECT pa.*, u.name as user_name, p.user_id as primary_user_id
      FROM project_assignments pa
      JOIN users u ON pa.user_id = u.id
      JOIN projects p ON pa.project_id = p.id
      WHERE pa.project_id = $1 AND pa.user_id = $2
    `, [id, userId])

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User is not assigned to this project' })
    }

    const assignment = assignmentCheck.rows[0]
    const isPrimaryUser = assignment.primary_user_id === parseInt(userId)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Remove from project_assignments
      await client.query('DELETE FROM project_assignments WHERE project_id = $1 AND user_id = $2', [id, userId])

      // If this was the primary user, update the main projects table
      if (isPrimaryUser) {
        // Find another assigned user to make primary, or set to null
        const otherUsersResult = await client.query(`
          SELECT user_id FROM project_assignments WHERE project_id = $1 LIMIT 1
        `, [id])

        const newPrimaryUserId = otherUsersResult.rows.length > 0 ? otherUsersResult.rows[0].user_id : null

        await client.query(`
          UPDATE projects 
          SET user_id = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [newPrimaryUserId, id])
      }

      await client.query('COMMIT')

      console.log(`[Admin Projects] ✅ User ${assignment.user_name} removed from project ${id}`)

      res.json({
        success: true,
        message: `User ${assignment.user_name} removed from project`,
        was_primary_user: isPrimaryUser
      })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('[Admin Projects] ❌ Error removing user from project:', error)
    res.status(500).json({ error: 'Failed to remove user from project' })
  }
})

// Delete project (admin can delete any project)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    console.log(`[Admin Projects] Deleting project ${id}`)

    // Check if project exists and get info
    const projectCheck = await pool.query(`
      SELECT p.*, u.name as user_name 
      FROM projects p 
      LEFT JOIN users u ON p.user_id = u.id 
      WHERE p.id = $1
    `, [id])
    
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const project = projectCheck.rows[0]

    // Check for active work sessions
    const activeSessionsCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM work_sessions ws
      JOIN tasks t ON ws.task_id = t.id
      WHERE t.project_id = $1 AND ws.end_time IS NULL
    `, [id])

    if (parseInt(activeSessionsCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete project with active work sessions. Please end all active sessions first.' 
      })
    }

    // Delete project (cascades to tasks and work_sessions)
    await pool.query('DELETE FROM projects WHERE id = $1', [id])

    console.log(`[Admin Projects] ✅ Project "${project.name}" deleted successfully`)

    res.json({
      success: true,
      message: `Project "${project.name}" deleted successfully`
    })
  } catch (error) {
    console.error('[Admin Projects] ❌ Error deleting project:', error)
    res.status(500).json({ error: 'Failed to delete project' })
  }
})

// Get project statistics for admin dashboard
router.get('/stats', async (req, res) => {
  try {
    console.log('[Admin Projects] Fetching project statistics')

    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(*) FILTER (WHERE status = 'active') as active_projects,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_projects,
        COUNT(*) FILTER (WHERE status = 'on-hold') as on_hold_projects,
        COUNT(DISTINCT user_id) as users_with_projects,
        AVG(
          CASE 
            WHEN start_date IS NOT NULL AND end_date IS NOT NULL 
            THEN end_date - start_date 
            ELSE NULL 
          END
        ) as avg_project_duration_days
      FROM projects
    `)

    const taskStats = await pool.query(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks
      FROM tasks
    `)

    const workSessionStats = await pool.query(`
      SELECT 
        COUNT(*) as total_work_sessions,
        SUM(duration_minutes) as total_work_minutes,
        COUNT(*) FILTER (WHERE end_time IS NULL) as active_sessions
      FROM work_sessions ws
      JOIN tasks t ON ws.task_id = t.id
      JOIN projects p ON t.project_id = p.id
    `)

    const combinedStats = {
      ...stats.rows[0],
      ...taskStats.rows[0],
      ...workSessionStats.rows[0],
      avg_project_duration_days: parseFloat(stats.rows[0].avg_project_duration_days) || 0,
      total_work_hours: Math.round((workSessionStats.rows[0].total_work_minutes || 0) / 60)
    }

    console.log('[Admin Projects] ✅ Statistics fetched successfully')

    res.json({
      success: true,
      stats: combinedStats
    })
  } catch (error) {
    console.error('[Admin Projects] ❌ Error fetching statistics:', error)
    res.status(500).json({ error: 'Failed to fetch project statistics' })
  }
})

// Get user workload summary
router.get('/workload', async (req, res) => {
  try {
    console.log('[Admin Projects] Fetching user workload summary')

    const workloadData = await AdminProjectService.getUserWorkloadSummary()

    console.log(`[Admin Projects] ✅ Found workload data for ${workloadData.length} users`)

    res.json({
      success: true,
      workload: workloadData
    })
  } catch (error) {
    console.error('[Admin Projects] ❌ Error fetching workload:', error)
    res.status(500).json({ error: 'Failed to fetch user workload data' })
  }
})

// Get analytics for admin dashboard
router.get('/analytics', async (req, res) => {
  try {
    const { days = 30 } = req.query
    console.log(`[Admin Projects] Fetching analytics for last ${days} days`)

    const analyticsData = await AdminProjectService.getProjectAnalytics(parseInt(days))

    console.log('[Admin Projects] ✅ Analytics data fetched successfully')

    res.json({
      success: true,
      analytics: analyticsData
    })
  } catch (error) {
    console.error('[Admin Projects] ❌ Error fetching analytics:', error)
    res.status(500).json({ error: 'Failed to fetch project analytics' })
  }
})

// Get available users for assignment
router.get('/available-users', async (req, res) => {
  try {
    console.log('[Admin Projects] Fetching available users')

    const users = await AdminProjectService.getAvailableUsers()

    console.log(`[Admin Projects] ✅ Found ${users.length} available users`)

    res.json({
      success: true,
      users: users
    })
  } catch (error) {
    console.error('[Admin Projects] ❌ Error fetching available users:', error)
    res.status(500).json({ error: 'Failed to fetch available users' })
  }
})

// Bulk update projects
router.patch('/bulk-update', async (req, res) => {
  try {
    const { project_ids, updates } = req.body
    const adminId = req.user.id

    console.log('[Admin Projects] Bulk updating projects:', {
      project_ids,
      updates,
      admin_id: adminId
    })

    if (!project_ids || !Array.isArray(project_ids) || project_ids.length === 0) {
      return res.status(400).json({ error: 'Project IDs array is required' })
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Updates object is required' })
    }

    const result = await AdminProjectService.bulkUpdateProjects(project_ids, updates, adminId)

    console.log(`[Admin Projects] ✅ Bulk update completed: ${result.updated_count} projects updated`)

    res.json({
      success: true,
      message: `Successfully updated ${result.updated_count} projects`,
      ...result
    })
  } catch (error) {
    console.error('[Admin Projects] ❌ Error in bulk update:', error)
    res.status(500).json({ error: 'Failed to perform bulk update' })
  }
})

// Get tasks for a specific project (admin view)
router.get('/:id/tasks', async (req, res) => {
  try {
    const { id } = req.params

    console.log(`[Admin Projects] Fetching tasks for project ${id}`)

    // Verify project exists
    const projectCheck = await pool.query(`
      SELECT p.*, u.name as user_name 
      FROM projects p 
      LEFT JOIN users u ON p.user_id = u.id 
      WHERE p.id = $1
    `, [id])
    
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const project = projectCheck.rows[0]

    // Get all tasks for the project
    const tasksResult = await pool.query(`
      SELECT 
        t.*,
        COUNT(ws.id) as work_session_count,
        SUM(ws.duration_minutes) as total_work_minutes,
        COUNT(ws.id) FILTER (WHERE ws.end_time IS NULL) as active_sessions
      FROM tasks t
      LEFT JOIN work_sessions ws ON t.id = ws.task_id
      WHERE t.project_id = $1
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `, [id])

    console.log(`[Admin Projects] ✅ Found ${tasksResult.rows.length} tasks for project "${project.name}"`)

    res.json({
      success: true,
      project: project,
      tasks: tasksResult.rows
    })
  } catch (error) {
    console.error('[Admin Projects] ❌ Error fetching project tasks:', error)
    res.status(500).json({ error: 'Failed to fetch project tasks' })
  }
})

module.exports = router 