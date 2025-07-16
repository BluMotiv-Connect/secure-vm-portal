const express = require('express')
const { pool } = require('../config/database')
const router = express.Router()

// Helper function to handle date values
const sanitizeDate = (dateValue) => {
  if (!dateValue || dateValue === '' || dateValue === 'null' || dateValue === 'undefined') {
    return null;
  }
  return dateValue;
}

// Get tasks for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params
    const userId = req.user.id

    // Verify project belongs to user
    const projectCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    )

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const result = await pool.query(`
      SELECT * FROM tasks 
      WHERE project_id = $1
      ORDER BY created_at DESC
    `, [projectId])

    res.json({
      success: true,
      tasks: result.rows
    })
  } catch (error) {
    console.error('Get tasks error:', error)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
})

// Create new task
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
    const userId = req.user.id

    console.log('[Create Task] Request data:', {
      project_id, task_name, proposed_start_date, actual_start_date, 
      proposed_end_date, actual_end_date, status, status_description
    })

    // Verify project belongs to user
    const projectCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [project_id, userId]
    )

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // Validate required fields
    if (!task_name || !project_id) {
      return res.status(400).json({ error: 'Task name and project ID are required' })
    }

    // Sanitize date values
    const sanitizedProposedStart = sanitizeDate(proposed_start_date)
    const sanitizedActualStart = sanitizeDate(actual_start_date)
    const sanitizedProposedEnd = sanitizeDate(proposed_end_date)
    const sanitizedActualEnd = sanitizeDate(actual_end_date)

    console.log('[Create Task] Sanitized dates:', {
      proposed_start: sanitizedProposedStart,
      actual_start: sanitizedActualStart,
      proposed_end: sanitizedProposedEnd,
      actual_end: sanitizedActualEnd
    })

    const result = await pool.query(`
      INSERT INTO tasks (
        project_id, project_outcome_id, task_name, dependency, 
        proposed_start_date, actual_start_date, proposed_end_date, actual_end_date,
        status, status_description, file_link
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [project_id, project_outcome_id, task_name, dependency, 
        sanitizedProposedStart, sanitizedActualStart, sanitizedProposedEnd, sanitizedActualEnd, 
        status, status_description, file_link])

    console.log('[Create Task] ✅ Task created successfully:', result.rows[0])

    res.json({
      success: true,
      task: result.rows[0]
    })
  } catch (error) {
    console.error('[Create Task] ❌ Error:', error)
    res.status(500).json({ 
      error: 'Failed to create task', 
      details: error.message 
    })
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
    const userId = req.user.id

    console.log('[Update Task] Request data:', {
      id, task_name, proposed_start_date, actual_start_date, 
      proposed_end_date, actual_end_date, status, status_description
    })

    // Verify task belongs to user's project
    const taskCheck = await pool.query(`
      SELECT t.id FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1 AND p.user_id = $2
    `, [id, userId])

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' })
    }

    // Sanitize date values
    const sanitizedProposedStart = sanitizeDate(proposed_start_date)
    const sanitizedActualStart = sanitizeDate(actual_start_date)
    const sanitizedProposedEnd = sanitizeDate(proposed_end_date)
    const sanitizedActualEnd = sanitizeDate(actual_end_date)

    const result = await pool.query(`
      UPDATE tasks 
      SET project_outcome_id = $1, task_name = $2, dependency = $3, 
          proposed_start_date = $4, actual_start_date = $5, proposed_end_date = $6, 
          actual_end_date = $7, status = $8, status_description = $9, file_link = $10, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [project_outcome_id, task_name, dependency, 
        sanitizedProposedStart, sanitizedActualStart, sanitizedProposedEnd, sanitizedActualEnd, 
        status, status_description, file_link, id])

    console.log('[Update Task] ✅ Task updated successfully:', result.rows[0])

    res.json({
      success: true,
      task: result.rows[0]
    })
  } catch (error) {
    console.error('[Update Task] ❌ Error:', error)
    res.status(500).json({ 
      error: 'Failed to update task',
      details: error.message 
    })
  }
})

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Verify task belongs to user's project
    const taskCheck = await pool.query(`
      SELECT t.id FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1 AND p.user_id = $2
    `, [id, userId])

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' })
    }

    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id])

    console.log('[Delete Task] ✅ Task deleted successfully')

    res.json({
      success: true,
      message: 'Task deleted successfully'
    })
  } catch (error) {
    console.error('[Delete Task] ❌ Error:', error)
    res.status(500).json({ error: 'Failed to delete task' })
  }
})

module.exports = router
