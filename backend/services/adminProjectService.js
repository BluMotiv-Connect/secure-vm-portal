const { pool } = require('../config/database')

class AdminProjectService {
  
  /**
   * Get projects with comprehensive filtering and pagination
   */
  static async getProjectsWithFilters(filters = {}, pagination = {}) {
    const { 
      user_id, 
      status, 
      start_date, 
      end_date, 
      search,
      project_status 
    } = filters
    
    const { 
      page = 1, 
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = pagination

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
      whereConditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`)
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Validate sort parameters
    const validSortColumns = ['name', 'created_at', 'updated_at', 'start_date', 'end_date', 'status', 'user_name']
    const validSortOrders = ['ASC', 'DESC']
    
    const safeSortBy = validSortColumns.includes(sort_by) ? sort_by : 'created_at'
    const safeSortOrder = validSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC'

    // Calculate offset for pagination
    const offset = (page - 1) * limit
    queryParams.push(limit, offset)

    const query = `
      SELECT 
        p.*,
        u.name as user_name,
        u.email as user_email,
        COUNT(t.id) as task_count,
        COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
        COUNT(ws.id) as total_work_sessions,
        SUM(ws.duration_minutes) as total_work_minutes,
        CASE 
          WHEN p.end_date < CURRENT_DATE AND p.status != 'completed' THEN 'overdue'
          WHEN p.start_date <= CURRENT_DATE AND p.end_date >= CURRENT_DATE THEN 'current'
          WHEN p.start_date > CURRENT_DATE THEN 'upcoming'
          ELSE 'no_dates'
        END as timeline_status
      FROM projects p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN tasks t ON p.id = t.project_id
      LEFT JOIN work_sessions ws ON t.id = ws.task_id
      ${whereClause}
      GROUP BY p.id, u.id, u.name, u.email
      ORDER BY ${safeSortBy === 'user_name' ? 'u.name' : 'p.' + safeSortBy} ${safeSortOrder}
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

    return {
      projects: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalProjects,
        totalPages: Math.ceil(totalProjects / limit),
        hasNext: page * limit < totalProjects,
        hasPrev: page > 1
      }
    }
  }

  /**
   * Get user workload summary
   */
  static async getUserWorkloadSummary() {
    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        COUNT(p.id) as total_projects,
        COUNT(p.id) FILTER (WHERE p.status = 'active') as active_projects,
        COUNT(p.id) FILTER (WHERE p.status = 'completed') as completed_projects,
        COUNT(t.id) as total_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
        SUM(ws.duration_minutes) as total_work_minutes,
        COUNT(ws.id) FILTER (WHERE ws.end_time IS NULL) as active_sessions
      FROM users u
      LEFT JOIN projects p ON u.id = p.user_id
      LEFT JOIN tasks t ON p.id = t.project_id
      LEFT JOIN work_sessions ws ON t.id = ws.task_id
      WHERE u.is_active = true
      GROUP BY u.id, u.name, u.email, u.role
      ORDER BY u.role DESC, active_projects DESC, total_projects DESC
    `

    const result = await pool.query(query)
    return result.rows.map(row => ({
      ...row,
      total_work_hours: Math.round((row.total_work_minutes || 0) / 60),
      project_completion_rate: row.total_projects > 0 
        ? Math.round((row.completed_projects / row.total_projects) * 100) 
        : 0,
      task_completion_rate: row.total_tasks > 0 
        ? Math.round((row.completed_tasks / row.total_tasks) * 100) 
        : 0
    }))
  }

  /**
   * Validate project assignment
   */
  static async validateProjectAssignment(projectId, userId) {
    // Check if user already has too many active projects
    const userProjectsResult = await pool.query(`
      SELECT COUNT(*) as active_count
      FROM projects 
      WHERE user_id = $1 AND status = 'active'
    `, [userId])

    const activeProjectsCount = parseInt(userProjectsResult.rows[0].active_count)
    const maxActiveProjects = 10 // Configurable limit

    if (activeProjectsCount >= maxActiveProjects) {
      return {
        valid: false,
        reason: `User already has ${activeProjectsCount} active projects (max: ${maxActiveProjects})`
      }
    }

    // Check for conflicts with existing project dates
    const conflictResult = await pool.query(`
      SELECT p.name, p.start_date, p.end_date
      FROM projects p
      WHERE p.user_id = $1 AND p.id != $2 AND p.status = 'active'
      AND (
        (p.start_date IS NOT NULL AND p.end_date IS NOT NULL) OR
        (p.start_date IS NOT NULL)
      )
    `, [userId, projectId])

    // This is a basic check - you might want more sophisticated date conflict detection
    
    return { valid: true }
  }

  /**
   * Get project analytics for dashboard
   */
  static async getProjectAnalytics(dateRange = 30) {
    const query = `
      SELECT 
        DATE(p.created_at) as date,
        COUNT(*) as projects_created,
        COUNT(*) FILTER (WHERE p.status = 'completed') as projects_completed,
        COUNT(DISTINCT p.user_id) as unique_users,
        AVG(t.total_tasks) as avg_tasks_per_project
      FROM projects p
      LEFT JOIN (
        SELECT project_id, COUNT(*) as total_tasks
        FROM tasks
        GROUP BY project_id
      ) t ON p.id = t.project_id
      WHERE p.created_at >= CURRENT_DATE - INTERVAL '${dateRange} days'
      GROUP BY DATE(p.created_at)
      ORDER BY date DESC
    `

    const dailyStats = await pool.query(query)

    // Get overall project health metrics
    const healthQuery = `
      SELECT 
        COUNT(*) as total_projects,
        COUNT(*) FILTER (WHERE status = 'active') as active_projects,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_projects,
        COUNT(*) FILTER (WHERE status = 'on-hold') as on_hold_projects,
        COUNT(*) FILTER (WHERE end_date < CURRENT_DATE AND status != 'completed') as overdue_projects,
        AVG(CASE 
          WHEN start_date IS NOT NULL AND end_date IS NOT NULL 
          THEN end_date - start_date 
          ELSE NULL 
        END) as avg_duration_days,
        COUNT(DISTINCT user_id) as users_with_projects
      FROM projects
    `

    const healthResult = await pool.query(healthQuery)

    return {
      daily_stats: dailyStats.rows,
      health_metrics: {
        ...healthResult.rows[0],
        avg_duration_days: parseFloat(healthResult.rows[0].avg_duration_days) || 0
      }
    }
  }

  /**
   * Bulk update project status
   */
  static async bulkUpdateProjects(projectIds, updates, adminId) {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      const updateResults = []
      
      for (const projectId of projectIds) {
        // Validate project exists
        const projectCheck = await client.query('SELECT id, name FROM projects WHERE id = $1', [projectId])
        if (projectCheck.rows.length === 0) {
          continue // Skip non-existent projects
        }

        // Build update query
        const updateFields = []
        const values = []
        let paramIndex = 1

        if (updates.status) {
          updateFields.push(`status = $${paramIndex}`)
          values.push(updates.status)
          paramIndex++
        }

        if (updates.user_id) {
          updateFields.push(`user_id = $${paramIndex}`)
          values.push(updates.user_id)
          paramIndex++
        }

        if (updateFields.length === 0) continue

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
        values.push(projectId)

        const updateQuery = `
          UPDATE projects 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING id, name
        `

        const result = await client.query(updateQuery, values)
        updateResults.push(result.rows[0])
      }

      await client.query('COMMIT')
      
      return {
        success: true,
        updated_count: updateResults.length,
        updated_projects: updateResults
      }
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get available users for project assignment
   */
  static async getAvailableUsers() {
    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        COUNT(p.id) as current_projects,
        COUNT(p.id) FILTER (WHERE p.status = 'active') as active_projects,
        MAX(p.created_at) as last_project_assigned
      FROM users u
      LEFT JOIN projects p ON u.id = p.user_id
      WHERE u.is_active = true
      GROUP BY u.id, u.name, u.email, u.role
      ORDER BY u.role DESC, active_projects ASC, u.name ASC
    `

    const result = await pool.query(query)
    return result.rows
  }
}

module.exports = AdminProjectService 