const express = require('express')
const router = express.Router()
const { pool } = require('../config/database')
const { authenticateToken } = require('../middleware/auth')

// Get comprehensive dashboard stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const days = parseInt(req.query.days) || 30
    const endDate = new Date()
    const startDate = new Date(endDate - days * 24 * 60 * 60 * 1000)

    // Get total work hours from work_sessions only
    const totalHoursResult = await pool.query(`
      SELECT 
        COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 60), 0) as totalMinutes
      FROM work_sessions 
      WHERE user_id = $1 AND start_time >= $2 AND start_time <= $3
    `, [userId, startDate, endDate])

    // Get daily average from work_sessions
    const activeDaysResult = await pool.query(`
      SELECT COUNT(DISTINCT DATE(start_time)) as activeDays
      FROM work_sessions 
      WHERE user_id = $1 AND start_time >= $2 AND start_time <= $3
    `, [userId, startDate, endDate])

    // Get task completion stats for user's assigned tasks
    const taskStats = await pool.query(`
      SELECT 
        COUNT(*) as totalTasks,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completedTasks
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE p.user_id = $1 AND t.created_at >= $2
    `, [userId, startDate])

    // Get active projects count for user (through project ownership)
    const projectStats = await pool.query(`
      SELECT COUNT(DISTINCT p.id) as activeProjects
      FROM projects p
      WHERE p.user_id = $1 AND p.status = 'active'
    `, [userId])

    // Get this week vs last week hours
    const thisWeekStart = new Date()
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())
    thisWeekStart.setHours(0, 0, 0, 0)
    
    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    const lastWeekEnd = new Date(thisWeekStart)

    const thisWeekResult = await pool.query(`
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 60 / 60), 0) as hours
      FROM work_sessions 
      WHERE user_id = $1 AND start_time >= $2
    `, [userId, thisWeekStart])

    const lastWeekResult = await pool.query(`
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 60 / 60), 0) as hours
      FROM work_sessions 
      WHERE user_id = $1 AND start_time >= $2 AND start_time < $3
    `, [userId, lastWeekStart, lastWeekEnd])

    const totalHours = totalHoursResult.rows[0].totalminutes / 60
    const activeDays = Math.max(activeDaysResult.rows[0].activedays, 1)
    const completedTasks = taskStats.rows[0].completedtasks || 0
    const totalTasks = taskStats.rows[0].totaltasks || 0
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    res.json({
      totalHours: Math.round(totalHours * 10) / 10,
      averageDaily: Math.round((totalHours / activeDays) * 10) / 10,
      completedTasks,
      activeProjects: projectStats.rows[0].activeprojects,
      efficiency: Math.min(100, Math.round(Math.random() * 20 + 75)), // Mock efficiency calculation
      thisWeekHours: Math.round(thisWeekResult.rows[0].hours * 10) / 10,
      lastWeekHours: Math.round(lastWeekResult.rows[0].hours * 10) / 10,
      taskCompletionRate,
      currentStreak: Math.floor(Math.random() * 10) + 1 // Mock streak data
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard stats' })
  }
})

// Get daily work hours
router.get('/daily-hours', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const days = parseInt(req.query.days) || 30
    const endDate = new Date()
    const startDate = new Date(endDate - days * 24 * 60 * 60 * 1000)

    const results = await pool.query(`
      SELECT 
        DATE(start_time) as date,
        SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 60) as totalMinutes
      FROM work_sessions 
      WHERE user_id = $1 AND start_time >= $2 AND start_time <= $3
      GROUP BY DATE(start_time)
      ORDER BY date
    `, [userId, startDate, endDate])

    // Fill in missing dates with 0 minutes
    const dailyData = []
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      const existingData = results.rows.find(r => r.date === dateStr)
      dailyData.push({
        date: dateStr,
        totalMinutes: existingData ? existingData.totalminutes : 0
      })
    }

    res.json(dailyData)
  } catch (error) {
    console.error('Error fetching daily hours:', error)
    res.status(500).json({ error: 'Failed to fetch daily hours' })
  }
})

// Get task completion stats
router.get('/task-completion', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const days = parseInt(req.query.days) || 30
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get current task status distribution for user's assigned tasks
    const completionData = await pool.query(`
      SELECT 
        COALESCE(t.status, 'pending') as status,
        COUNT(*) as count
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE p.user_id = $1 AND t.created_at >= $2
      GROUP BY t.status
    `, [userId, startDate])

    // Get weekly completion trends for user's tasks
    const weeklyTrends = await pool.query(`
      SELECT 
        EXTRACT(YEAR FROM t.updated_at) as year,
        EXTRACT(WEEK FROM t.updated_at) as week,
        DATE_TRUNC('week', t.updated_at) as week_start,
        COUNT(*) as completed
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE p.user_id = $1 AND t.status = 'completed' AND t.updated_at >= $2
      GROUP BY year, week, week_start
      ORDER BY year, week
    `, [userId, startDate])

    res.json({
      completionData: completionData.rows,
      weeklyTrends: weeklyTrends.rows.map(w => ({
        week: w.week_start,
        completed: w.completed
      }))
    })
  } catch (error) {
    console.error('Error fetching task completion stats:', error)
    res.status(500).json({ error: 'Failed to fetch task completion stats' })
  }
})

// Get project time distribution
router.get('/project-time', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const days = parseInt(req.query.days) || 30
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const results = await pool.query(`
      SELECT 
        p.name as project_name,
        SUM(EXTRACT(EPOCH FROM (COALESCE(ws.end_time, NOW()) - ws.start_time)) / 60) as total_minutes
      FROM work_sessions ws
      JOIN tasks t ON ws.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE ws.user_id = $1 AND ws.start_time >= $2 AND p.user_id = $3
      GROUP BY p.id, p.name
      ORDER BY total_minutes DESC
    `, [userId, startDate, userId])

    res.json(results.rows.map(r => ({
      project: r.project_name,
      minutes: r.total_minutes
    })))
  } catch (error) {
    console.error('Error fetching project time distribution:', error)
    res.status(500).json({ error: 'Failed to fetch project time distribution' })
  }
})

// Get streaks and achievements
router.get('/streaks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const days = parseInt(req.query.days) || 30
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get work days in period
    const workDays = await pool.query(`
      SELECT DISTINCT DATE(start_time) as work_date
      FROM work_sessions 
      WHERE user_id = $1 AND start_time >= $2
      ORDER BY work_date DESC
    `, [userId, startDate])

    // Calculate current streak
    let currentStreak = 0
    const today = new Date().toISOString().split('T')[0]
    const workDates = workDays.rows.map(r => r.work_date)
    
    // Simple streak calculation - consecutive days from today
    for (let i = 0; i < days; i++) {
      const checkDate = new Date()
      checkDate.setDate(checkDate.getDate() - i)
      const dateStr = checkDate.toISOString().split('T')[0]
      
      if (workDates.includes(dateStr)) {
        currentStreak++
      } else {
        break
      }
    }

    res.json({
      currentStreak,
      totalWorkDays: workDays.rows.length,
      achievementUnlocked: currentStreak >= 7 ? "Week Warrior" : null
    })
  } catch (error) {
    console.error('Error fetching streaks:', error)
    res.status(500).json({ error: 'Failed to fetch streaks' })
  }
})

// Get current week overview
router.get('/current-week', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const thisWeekStart = new Date()
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())
    thisWeekStart.setHours(0, 0, 0, 0)

    // Get this week's total hours
    const weekHours = await pool.query(`
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 60 / 60), 0) as total_hours
      FROM work_sessions 
      WHERE user_id = $1 AND start_time >= $2
    `, [userId, thisWeekStart])

    // Get this week's completed tasks
    const weekTasks = await pool.query(`
      SELECT COUNT(*) as completed_tasks
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE p.user_id = $1 AND t.status = 'completed' AND t.updated_at >= $2
    `, [userId, thisWeekStart])

    // Get daily breakdown for this week
    const dailyBreakdown = await pool.query(`
      SELECT 
        EXTRACT(DOW FROM start_time) as day_of_week,
        SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 60 / 60) as hours
      FROM work_sessions 
      WHERE user_id = $1 AND start_time >= $2
      GROUP BY day_of_week
      ORDER BY day_of_week
    `, [userId, thisWeekStart])

    const weekTarget = 40 // 40 hours per week target
    const progress = Math.min(100, Math.round((weekHours.rows[0].total_hours / weekTarget) * 100))

    res.json({
      totalHours: Math.round(weekHours.rows[0].total_hours * 10) / 10,
      weekTarget,
      progress,
      completedTasks: weekTasks.rows[0].completed_tasks,
      dailyBreakdown: dailyBreakdown.rows,
      achievements: progress >= 100 ? ["Week Target Achieved!"] : []
    })
  } catch (error) {
    console.error('Error fetching current week overview:', error)
    res.status(500).json({ error: 'Failed to fetch current week overview' })
  }
})

// Mock endpoints for features that need more complex implementation
router.get('/session-quality', authenticateToken, async (req, res) => {
  res.json({ message: 'Session quality metrics coming soon' })
})

router.get('/work-types', authenticateToken, async (req, res) => {
  res.json({ message: 'Work type distribution coming soon' })
})

// Get VM usage data for employee
router.get('/vm-usage', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const days = parseInt(req.query.days) || 30
    const endDate = new Date()
    const startDate = new Date(endDate - days * 24 * 60 * 60 * 1000)

    const results = await pool.query(`
      WITH vm_stats AS (
        SELECT 
          vm.name as vm_name,
          COUNT(DISTINCT ws.id) as total_sessions,
          COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ws.end_time, NOW()) - ws.start_time)) / 60), 0) as total_minutes,
          MAX(ws.start_time) as last_used
        FROM virtual_machines vm
        LEFT JOIN work_sessions ws ON ws.vm_id = vm.id 
        WHERE ws.user_id = $1 
        AND ws.start_time >= $2 
        AND ws.start_time <= $3
        GROUP BY vm.id, vm.name
      )
      SELECT 
        vm_name as "vmName",
        total_sessions as "totalSessions",
        total_minutes as "totalUsageMinutes",
        last_used as "lastUsed"
      FROM vm_stats
      ORDER BY total_minutes DESC
    `, [userId, startDate, endDate])

    res.json(results.rows)
  } catch (error) {
    console.error('Error fetching VM usage:', error)
    res.status(500).json({ error: 'Failed to fetch VM usage data' })
  }
})

// Get project details for employee
router.get('/project-details', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days) || 30;
    const endDate = new Date();
    const startDate = new Date(endDate - days * 24 * 60 * 60 * 1000);

    // Get active projects count and work time stats
    const projectStats = await pool.query(`
      WITH project_stats AS (
        SELECT 
          p.id,
          p.name,
          p.description,
          p.status,
          COUNT(DISTINCT t.id) as total_tasks,
          COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
          COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ws.end_time, NOW()) - ws.start_time)) / 60), 0) as total_minutes,
          MAX(ws.start_time) as last_active
        FROM projects p
        LEFT JOIN tasks t ON t.project_id = p.id
        LEFT JOIN work_sessions ws ON ws.task_id = t.id
        WHERE p.user_id = $1 
        AND (ws.start_time >= $2 OR ws.start_time IS NULL)
        GROUP BY p.id, p.name, p.description, p.status
      )
      SELECT 
        COUNT(DISTINCT id) as active_projects,
        COALESCE(SUM(total_minutes), 0) as total_work_minutes,
        COALESCE(AVG(total_minutes), 0) as avg_minutes_per_project,
        json_agg(json_build_object(
          'id', id,
          'name', name,
          'description', description,
          'status', status,
          'totalTasks', total_tasks,
          'completedTasks', completed_tasks,
          'totalMinutes', total_minutes,
          'lastActive', last_active
        )) as projects
      FROM project_stats
    `, [userId, startDate]);

    const stats = projectStats.rows[0];
    
    res.json({
      activeProjects: stats.active_projects,
      totalWorkMinutes: Math.round(stats.total_work_minutes),
      avgMinutesPerProject: Math.round(stats.avg_minutes_per_project),
      projects: stats.projects || []
    });
  } catch (error) {
    console.error('Error fetching project details:', error);
    res.status(500).json({ error: 'Failed to fetch project details' });
  }
});

// Get task status details for employee
router.get('/task-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days) || 30;
    const endDate = new Date();
    const startDate = new Date(endDate - days * 24 * 60 * 60 * 1000);

    // Get task stats and recent tasks
    const taskStats = await pool.query(`
      WITH task_stats AS (
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
          COUNT(CASE WHEN t.status = 'in-progress' THEN 1 END) as in_progress_tasks
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE p.user_id = $1 
        AND t.created_at >= $2
      ),
      recent_tasks AS (
        SELECT 
          t.id,
          t.task_name,
          t.status,
          t.status_description,
          t.updated_at,
          p.name as project_name
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE p.user_id = $1 
        AND t.created_at >= $2
        ORDER BY t.updated_at DESC
        LIMIT 5
      )
      SELECT 
        (SELECT row_to_json(s.*) FROM task_stats s) as stats,
        (SELECT json_agg(r.*) FROM recent_tasks r) as recent_tasks
    `,[userId, startDate]);

    const stats = taskStats.rows[0].stats;
    const recentTasks = taskStats.rows[0].recent_tasks || [];

    res.json({
      totalTasks: stats.total_tasks,
      completedTasks: stats.completed_tasks,
      inProgressTasks: stats.in_progress_tasks,
      recentTasks: recentTasks
    });
  } catch (error) {
    console.error('Error fetching task status:', error);
    res.status(500).json({ error: 'Failed to fetch task status' });
  }
});

module.exports = router 