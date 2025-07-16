const express = require('express')
const { pool } = require('../config/database')
const router = express.Router()

// Middleware to verify admin role
const requireAdmin = (req, res, next) => {
  console.log('[Admin Task Check] User:', req.user)
  
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

// Get all tasks across all projects (with filtering)
router.get('/', async (req, res) => {
  try {
    const { 
      project_id, 
      user_id, 
      status, 
      search,
      page = 1, 
      limit = 20 
    } = req.query

    console.log('[Admin Tasks] Fetching tasks with filters:', { 
      project_id, user_id, status, search, page, limit 
    })

    let whereConditions = []
    let queryParams = []
    let paramIndex = 1

    // Build dynamic WHERE clause
    if (project_id) {
      whereConditions.push(`t.project_id = $${paramIndex}`)
      queryParams.push(project_id)
      paramIndex++
    }

    if (user_id) {
      whereConditions.push(`p.user_id = $${paramIndex}`)
      queryParams.push(user_id)
      paramIndex++
    }

    if (status) {
      whereConditions.push(`t.status = $${paramIndex}`)
      queryParams.push(status)
      paramIndex++
    }

    if (search) {
      whereConditions.push(`t.task_name ILIKE $${paramIndex}`)
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : ''

    // Calculate offset
    const offset = (page - 1) * limit

    // Add pagination parameters
    queryParams.push(limit, offset)
    
    const query = `
      SELECT 
        t.*,
        p.name as project_name,
        p.status as project_status,
        u.name as user_name,
        u.email as user_email,
        COUNT(ws.id) as work_session_count,
        SUM(ws.duration_minutes) as total_work_minutes,
        COUNT(ws.id) FILTER (WHERE ws.end_time IS NULL) as active_sessions
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN users u ON p.user_id = u.id
      LEFT JOIN work_sessions ws ON t.id = ws.task_id
      ${whereClause}
      GROUP BY t.id, p.id, p.name, p.status, u.id, u.name, u.email
      ORDER BY t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    const result = await pool.query(query, queryParams)

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT t.id) as total
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN users u ON p.user_id = u.id
      ${whereClause}
    `

    const countParams = queryParams.slice(0, -2) // Remove limit and offset
    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].total)

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }

    console.log(`[Admin Tasks] ✅ Found ${result.rows.length} tasks (${total} total)`)

    res.json({
      success: true,
      tasks: result.rows,
      pagination: pagination
    })
  } catch (error) {
    console.error('[Admin Tasks] ❌ Error fetching tasks:', error)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
})

// Get tasks for a specific project
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params

    console.log(`[Admin Tasks] Fetching tasks for project ${projectId}`)

    // Verify project exists and get project info
    const projectCheck = await pool.query(`
      SELECT p.*, u.name as user_name, u.email as user_email 
      FROM projects p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.id = $1
    `, [projectId])
    
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
    `, [projectId])

    console.log(`[Admin Tasks] ✅ Found ${tasksResult.rows.length} tasks for project "${project.name}"`)

    res.json({
      success: true,
      project: project,
      tasks: tasksResult.rows
    })
  } catch (error) {
    console.error('[Admin Tasks] ❌ Error fetching project tasks:', error)
    res.status(500).json({ error: 'Failed to fetch project tasks' })
  }
})

// Create new task for any project
router.post('/', async (req, res) => {
  try {
    const { 
      project_id, 
      project_outcome_id, 
      task_name, 
      dependency, 
      proposed_start_date, 
      actual_start_date,
      proposed_end_date,
      actual_end_date,
      status = 'pending',
      status_description,
      file_link 
    } = req.body
    const adminId = req.user.id

    console.log('[Admin Tasks] Creating new task:', {
      project_id, task_name, status, created_by: adminId
    })

    // Validate required fields
    if (!project_id || !task_name) {
      return res.status(400).json({ error: 'Project ID and task name are required' })
    }

    // Verify project exists
    const projectCheck = await pool.query(`
      SELECT p.*, u.name as user_name, u.email as user_email 
      FROM projects p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.id = $1
    `, [project_id])

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const project = projectCheck.rows[0]

    // Create task
    const result = await pool.query(`
      INSERT INTO tasks (
        project_id, project_outcome_id, task_name, dependency, 
        proposed_start_date, actual_start_date, proposed_end_date, actual_end_date,
        status, status_description, file_link
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [project_id, project_outcome_id, task_name, dependency, 
        proposed_start_date, actual_start_date, proposed_end_date, actual_end_date,
        status, status_description, file_link])

    const task = {
      ...result.rows[0],
      project_name: project.name,
      user_name: project.user_name,
      user_email: project.user_email,
      work_session_count: 0,
      total_work_minutes: 0,
      active_sessions: 0
    }

    console.log(`[Admin Tasks] ✅ Task created with ID ${task.id} for project "${project.name}"`)

    res.json({
      success: true,
      message: `Task "${task_name}" created for project "${project.name}"`,
      task: task
    })
  } catch (error) {
    console.error('[Admin Tasks] ❌ Error creating task:', error)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

// Update task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { 
      project_outcome_id, 
      task_name, 
      dependency, 
      proposed_start_date, 
      actual_start_date,
      proposed_end_date, 
      actual_end_date,
      status,
      status_description,
      file_link 
    } = req.body

    console.log(`[Admin Tasks] Updating task ${id}`)

    // Verify task exists
    const taskCheck = await pool.query(`
      SELECT t.*, p.name as project_name, u.name as user_name 
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE t.id = $1
    `, [id])

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' })
    }

    // Build dynamic update query
    const updates = []
    const values = []
    let paramIndex = 1

    if (project_outcome_id !== undefined) {
      updates.push(`project_outcome_id = $${paramIndex}`)
      values.push(project_outcome_id)
      paramIndex++
    }

    if (task_name !== undefined) {
      updates.push(`task_name = $${paramIndex}`)
      values.push(task_name)
      paramIndex++
    }

    if (dependency !== undefined) {
      updates.push(`dependency = $${paramIndex}`)
      values.push(dependency)
      paramIndex++
    }

    if (proposed_start_date !== undefined) {
      updates.push(`proposed_start_date = $${paramIndex}`)
      values.push(proposed_start_date || null)
      paramIndex++
    }

    if (actual_start_date !== undefined) {
      updates.push(`actual_start_date = $${paramIndex}`)
      values.push(actual_start_date || null)
      paramIndex++
    }

    if (proposed_end_date !== undefined) {
      updates.push(`proposed_end_date = $${paramIndex}`)
      values.push(proposed_end_date || null)
      paramIndex++
    }

    if (actual_end_date !== undefined) {
      updates.push(`actual_end_date = $${paramIndex}`)
      values.push(actual_end_date || null)
      paramIndex++
    }

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`)
      values.push(status)
      paramIndex++
    }

    if (status_description !== undefined) {
      updates.push(`status_description = $${paramIndex}`)
      values.push(status_description)
      paramIndex++
    }

    if (file_link !== undefined) {
      updates.push(`file_link = $${paramIndex}`)
      values.push(file_link)
      paramIndex++
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    const updateQuery = `
      UPDATE tasks 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await pool.query(updateQuery, values)

    // Get updated task with project info
    const updatedTaskQuery = `
      SELECT 
        t.*,
        p.name as project_name,
        p.status as project_status,
        u.name as user_name,
        u.email as user_email,
        COUNT(ws.id) as work_session_count,
        SUM(ws.duration_minutes) as total_work_minutes,
        COUNT(ws.id) FILTER (WHERE ws.end_time IS NULL) as active_sessions
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN users u ON p.user_id = u.id
      LEFT JOIN work_sessions ws ON t.id = ws.task_id
      WHERE t.id = $1
      GROUP BY t.id, p.id, p.name, p.status, u.id, u.name, u.email
    `

    const updatedResult = await pool.query(updatedTaskQuery, [id])
    const updatedTask = updatedResult.rows[0]

    console.log(`[Admin Tasks] ✅ Task ${id} updated successfully`)

    res.json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask
    })
  } catch (error) {
    console.error('[Admin Tasks] ❌ Error updating task:', error)
    res.status(500).json({ error: 'Failed to update task' })
  }
})

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    console.log(`[Admin Tasks] Deleting task ${id}`)

    // Verify task exists and get info
    const taskCheck = await pool.query(`
      SELECT t.*, p.name as project_name, u.name as user_name 
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE t.id = $1
    `, [id])

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' })
    }

    const task = taskCheck.rows[0]

    // Check for active work sessions
    const activeSessionCheck = await pool.query(`
      SELECT id FROM work_sessions 
      WHERE task_id = $1 AND end_time IS NULL
    `, [id])

    if (activeSessionCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete task with active work sessions. End all sessions first.' 
      })
    }

    // Delete task (work sessions will be cascade deleted)
    await pool.query('DELETE FROM tasks WHERE id = $1', [id])

    console.log(`[Admin Tasks] ✅ Task "${task.task_name}" deleted from project "${task.project_name}"`)

    res.json({
      success: true,
      message: `Task "${task.task_name}" deleted successfully`
    })
  } catch (error) {
    console.error('[Admin Tasks] ❌ Error deleting task:', error)
    res.status(500).json({ error: 'Failed to delete task' })
  }
})

// Get task statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('[Admin Tasks] Fetching task statistics')

    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
        COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'blocked') as blocked_tasks,
        COUNT(DISTINCT project_id) as projects_with_tasks,
        AVG(
          CASE 
            WHEN proposed_start_date IS NOT NULL AND proposed_end_date IS NOT NULL 
            THEN proposed_end_date - proposed_start_date 
            ELSE NULL 
          END
        ) as avg_proposed_duration_days
      FROM tasks
    `)

    const workSessionStats = await pool.query(`
      SELECT 
        COUNT(*) as total_work_sessions,
        SUM(duration_minutes) as total_work_minutes,
        COUNT(*) FILTER (WHERE end_time IS NULL) as active_sessions,
        COUNT(DISTINCT task_id) as tasks_with_sessions
      FROM work_sessions
    `)

    const tasksByProject = await pool.query(`
      SELECT 
        p.name as project_name,
        u.name as user_name,
        COUNT(t.id) as task_count,
        COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_task_count
      FROM projects p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN tasks t ON p.id = t.project_id
      GROUP BY p.id, p.name, u.id, u.name
      HAVING COUNT(t.id) > 0
      ORDER BY task_count DESC
      LIMIT 10
    `)

    const combinedStats = {
      ...stats.rows[0],
      ...workSessionStats.rows[0],
      avg_proposed_duration_days: parseFloat(stats.rows[0].avg_proposed_duration_days) || 0,
      total_work_hours: Math.round((workSessionStats.rows[0].total_work_minutes || 0) / 60),
      top_projects: tasksByProject.rows
    }

    console.log('[Admin Tasks] ✅ Task statistics fetched successfully')

    res.json({
      success: true,
      stats: combinedStats
    })
  } catch (error) {
    console.error('[Admin Tasks] ❌ Error fetching task statistics:', error)
    res.status(500).json({ error: 'Failed to fetch task statistics' })
  }
})

module.exports = router 