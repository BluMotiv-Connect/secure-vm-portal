const express = require('express')
const { pool } = require('../config/database')
const router = express.Router()

// Get all projects for current user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id
    
    const result = await pool.query(`
      SELECT 
        p.*,
        COUNT(t.id) as task_count
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.user_id = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [userId])

    res.json({
      success: true,
      projects: result.rows
    })
  } catch (error) {
    console.error('Get projects error:', error)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// Create new project
router.post('/', async (req, res) => {
  try {
    const { name, description, start_date, end_date } = req.body
    const userId = req.user.id

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' })
    }

    // Handle empty dates - convert empty strings to null
    const formattedStartDate = start_date && start_date.trim() ? start_date : null
    const formattedEndDate = end_date && end_date.trim() ? end_date : null

    // Validate date format if provided
    if (formattedStartDate && !isValidDate(formattedStartDate)) {
      return res.status(400).json({ error: 'Invalid start date format' })
    }
    if (formattedEndDate && !isValidDate(formattedEndDate)) {
      return res.status(400).json({ error: 'Invalid end date format' })
    }

    // Validate date range if both dates are provided
    if (formattedStartDate && formattedEndDate && new Date(formattedStartDate) > new Date(formattedEndDate)) {
      return res.status(400).json({ error: 'End date must be after start date' })
    }

    const result = await pool.query(`
      INSERT INTO projects (name, description, user_id, start_date, end_date, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [name, description || '', userId, formattedStartDate, formattedEndDate])

    console.log('[Create Project] ✅ Project created successfully:', result.rows[0])

    res.json({
      success: true,
      project: result.rows[0]
    })
  } catch (error) {
    console.error('Create project error:', error)
    res.status(500).json({ 
      error: 'Failed to create project',
      details: error.message
    })
  }
})

// Update project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, status, start_date, end_date } = req.body
    const userId = req.user.id

    const result = await pool.query(`
      UPDATE projects 
      SET name = $1, description = $2, status = $3, start_date = $4, end_date = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND user_id = $7
      RETURNING *
    `, [name, description, status, start_date, end_date, id, userId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json({
      success: true,
      project: result.rows[0]
    })
  } catch (error) {
    console.error('Update project error:', error)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    console.log(`[Delete Project] Attempting to delete project ${id} for user ${userId}`)

    // First check if project exists and belongs to user
    const projectCheck = await pool.query(`
      SELECT id, name FROM projects 
      WHERE id = $1 AND user_id = $2
    `, [id, userId])

    if (projectCheck.rows.length === 0) {
      console.log(`[Delete Project] ❌ Project ${id} not found or doesn't belong to user ${userId}`)
      return res.status(404).json({ error: 'Project not found' })
    }

    const projectName = projectCheck.rows[0].name
    console.log(`[Delete Project] Found project "${projectName}", proceeding with deletion`)

    // Check for active work sessions
    const activeSessionsCheck = await pool.query(`
      SELECT COUNT(*) as count FROM work_sessions ws
      JOIN tasks t ON ws.task_id = t.id
      WHERE t.project_id = $1 AND ws.is_active = true AND ws.end_time IS NULL
    `, [id])

    if (parseInt(activeSessionsCheck.rows[0].count) > 0) {
      console.log(`[Delete Project] ❌ Cannot delete project "${projectName}" - has active work sessions`)
      return res.status(400).json({ 
        error: 'Cannot delete project with active work sessions. Please end all active sessions first.' 
      })
    }

    // Proceed with deletion
    const result = await pool.query(`
      DELETE FROM projects 
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [id, userId])

    console.log(`[Delete Project] ✅ Project "${projectName}" deleted successfully`)

    res.json({
      success: true,
      message: 'Project deleted successfully'
    })
  } catch (error) {
    console.error('[Delete Project] ❌ Error:', error)
    console.error('[Delete Project] Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint
    })
    
    // Provide more specific error messages
    if (error.code === '23503') {
      res.status(400).json({ 
        error: 'Cannot delete project due to existing dependencies. Please delete related tasks and work sessions first.' 
      })
    } else {
      res.status(500).json({ 
        error: 'Failed to delete project',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
})

module.exports = router

// Helper function to validate date format (YYYY-MM-DD)
function isValidDate(dateString) {
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date) && dateString.match(/^\d{4}-\d{2}-\d{2}$/)
}
