const { pool } = require('../config/database');
const logger = require('../utils/logger');

class EmployeeDashboardService {
  // Get current week overview
  static async getCurrentWeekOverview(userId) {
    try {
      const sql = `
        WITH daily_stats AS (
          SELECT 
            DATE(wl.start_time) as work_date,
            wl.work_type,
            COUNT(*) as session_count,
            SUM(wl.duration_minutes) as total_minutes
          FROM work_logs wl
          WHERE wl.user_id = $1
            AND wl.start_time >= date_trunc('week', CURRENT_DATE)
            AND wl.start_time < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week'
          GROUP BY DATE(wl.start_time), wl.work_type
        ),
        project_stats AS (
          SELECT 
            p.name as project_name,
            COUNT(DISTINCT t.id) as total_tasks,
            COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
            SUM(wl.duration_minutes) as total_minutes
          FROM projects p
          JOIN tasks t ON t.project_id = p.id
          LEFT JOIN work_logs wl ON wl.task_id = t.id
          WHERE t.assigned_to = $1
            AND wl.start_time >= date_trunc('week', CURRENT_DATE)
            AND wl.start_time < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week'
          GROUP BY p.id, p.name
        ),
        today_stats AS (
          SELECT 
            COALESCE(SUM(duration_minutes), 0) as total_minutes_today
          FROM work_logs
          WHERE user_id = $1
            AND DATE(start_time) = CURRENT_DATE
        )
        SELECT 
          json_build_object(
            'dailyHours', COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'date', work_date,
                    'workMinutes', SUM(total_minutes) FILTER (WHERE work_type = 'work'),
                    'breakMinutes', SUM(total_minutes) FILTER (WHERE work_type = 'break'),
                    'meetingMinutes', SUM(total_minutes) FILTER (WHERE work_type = 'meeting')
                  )
                )
                FROM daily_stats
                GROUP BY work_date
                ORDER BY work_date
              ),
              '[]'::json
            ),
            'projectTime', COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'projectName', project_name,
                    'totalTasks', total_tasks,
                    'completedTasks', completed_tasks,
                    'totalMinutes', total_minutes
                  )
                )
                FROM project_stats
              ),
              '[]'::json
            ),
            'summary', json_build_object(
              'totalWorkMinutes', (
                SELECT COALESCE(SUM(total_minutes) FILTER (WHERE work_type = 'work'), 0)
                FROM daily_stats
              ),
              'totalBreakMinutes', (
                SELECT COALESCE(SUM(total_minutes) FILTER (WHERE work_type = 'break'), 0)
                FROM daily_stats
              ),
              'totalMeetingMinutes', (
                SELECT COALESCE(SUM(total_minutes) FILTER (WHERE work_type = 'meeting'), 0)
                FROM daily_stats
              ),
              'totalSessions', (
                SELECT COALESCE(SUM(session_count), 0)
                FROM daily_stats
              )
            ),
            'hoursToday', (
              SELECT ROUND(total_minutes_today / 60.0, 1)
              FROM today_stats
            )
          ) as dashboard_data
      `;

      const result = await pool.query(sql, [userId]);
      return result.rows[0]?.dashboard_data || {
        dailyHours: [],
        projectTime: [],
        summary: {
          totalWorkMinutes: 0,
          totalBreakMinutes: 0,
          totalMeetingMinutes: 0,
          totalSessions: 0
        },
        hoursToday: 0
      };
    } catch (error) {
      logger.error('Error getting current week overview:', error);
      throw error;
    }
  }

  // Get daily work hours
  static async getDailyWorkHours(userId, days = 30) {
    try {
      const sql = `
        SELECT 
          DATE(wl.start_time) as work_date,
          wl.work_type,
          COUNT(*) as session_count,
          SUM(wl.duration_minutes) as total_minutes
        FROM work_logs wl
        WHERE wl.user_id = $1
          AND wl.start_time >= CURRENT_DATE - INTERVAL '1 day' * $2
        GROUP BY DATE(wl.start_time), wl.work_type
        ORDER BY work_date DESC
      `;

      const result = await pool.query(sql, [userId, days]);
      return result.rows || [];
    } catch (error) {
      logger.error('Error getting daily work hours:', error);
      throw error;
    }
  }

  // Get project time distribution
  static async getProjectTimeDistribution(userId, days = 30) {
    try {
      const sql = `
        SELECT 
          p.name as project_name,
          COUNT(DISTINCT t.id) as total_tasks,
          COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
          COALESCE(SUM(wl.duration_minutes), 0) as total_minutes
        FROM projects p
        JOIN tasks t ON t.project_id = p.id
        LEFT JOIN work_logs wl ON wl.task_id = t.id
        WHERE t.assigned_to = $1
          AND (wl.start_time >= CURRENT_DATE - INTERVAL '1 day' * $2 OR wl.start_time IS NULL)
        GROUP BY p.id, p.name
        ORDER BY total_minutes DESC
      `;

      const result = await pool.query(sql, [userId, days]);
      return result.rows || [];
    } catch (error) {
      logger.error('Error getting project time distribution:', error);
      throw error;
    }
  }

  // Get VM usage patterns
  static async getVMUsagePatterns(userId, days = 30) {
    try {
      const sql = `
        SELECT 
          vm.name as vm_name,
          vm.os_type,
          COUNT(DISTINCT DATE(wl.start_time)) as active_days,
          COUNT(*) as total_sessions,
          COALESCE(SUM(wl.duration_minutes), 0) as total_minutes,
          MAX(wl.start_time) as last_used
        FROM virtual_machines vm
        LEFT JOIN work_logs wl ON wl.vm_id = vm.id AND wl.user_id = $1 AND wl.start_time >= CURRENT_DATE - INTERVAL '1 day' * $2
        WHERE vm.id IN (
          SELECT DISTINCT vm_id 
          FROM work_logs 
          WHERE user_id = $1 
          AND start_time >= CURRENT_DATE - INTERVAL '1 day' * $2
        )
        GROUP BY vm.id, vm.name, vm.os_type
        ORDER BY total_minutes DESC
      `;

      const result = await pool.query(sql, [userId, days]);
      return result.rows || [];
    } catch (error) {
      logger.error('Error getting VM usage patterns:', error);
      throw error;
    }
  }

  // Get task completion stats
  static async getTaskCompletionStats(userId, days = 30) {
    try {
      const sql = `
        WITH task_stats AS (
          SELECT 
            t.status,
            COUNT(*) as count,
            DATE_TRUNC('week', t.updated_at) as week
          FROM tasks t
          WHERE t.assigned_to = $1
            AND t.updated_at >= CURRENT_DATE - INTERVAL '1 day' * $2
          GROUP BY t.status, DATE_TRUNC('week', t.updated_at)
        ),
        today_stats AS (
          SELECT 
            COUNT(*) FILTER (WHERE status = 'completed' AND DATE(updated_at) = CURRENT_DATE) as completed_today,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_this_month
          FROM tasks
          WHERE assigned_to = $1
            AND updated_at >= CURRENT_DATE - INTERVAL '1 day' * $2
        )
        SELECT json_build_object(
          'statusDistribution', COALESCE(
            (
              SELECT json_agg(json_build_object(
                'status', status,
                'count', COUNT(*)
              ))
              FROM task_stats
              GROUP BY status
            ),
            '[]'::json
          ),
          'weeklyTrends', COALESCE(
            (
              SELECT json_agg(json_build_object(
                'week', week,
                'completed', COUNT(*) FILTER (WHERE status = 'completed')
              ) ORDER BY week)
              FROM task_stats
              GROUP BY week
            ),
            '[]'::json
          ),
          'completedToday', COALESCE((SELECT completed_today FROM today_stats), 0),
          'completedThisMonth', COALESCE((SELECT completed_this_month FROM today_stats), 0)
        ) as task_stats
      `;

      const result = await pool.query(sql, [userId, days]);
      return result.rows[0]?.task_stats || {
        statusDistribution: [],
        weeklyTrends: [],
        completedToday: 0,
        completedThisMonth: 0
      };
    } catch (error) {
      logger.error('Error getting task completion stats:', error);
      throw error;
    }
  }

  // Get work type distribution
  static async getWorkTypeDistribution(userId, days = 30) {
    try {
      const sql = `
        WITH work_type_stats AS (
          SELECT 
            work_type,
            SUM(duration_minutes) as total_minutes
          FROM work_logs
          WHERE user_id = $1
            AND start_time >= CURRENT_DATE - INTERVAL '1 day' * $2
          GROUP BY work_type
        ),
        total_minutes AS (
          SELECT COALESCE(SUM(total_minutes), 0) as grand_total
          FROM work_type_stats
        )
        SELECT 
          work_type,
          COALESCE(total_minutes, 0) as total_minutes,
          CASE 
            WHEN (SELECT grand_total FROM total_minutes) > 0 
            THEN ROUND((total_minutes::float / (SELECT grand_total FROM total_minutes) * 100)::numeric, 1)
            ELSE 0 
          END as percentage
        FROM work_type_stats
        ORDER BY total_minutes DESC
      `;

      const result = await pool.query(sql, [userId, days]);
      return result.rows || [];
    } catch (error) {
      logger.error('Error getting work type distribution:', error);
      throw error;
    }
  }

  // Get productivity streaks
  static async getProductivityStreaks(userId) {
    try {
      const sql = `
        WITH daily_work AS (
          SELECT 
            DATE(start_time) as work_date,
            SUM(duration_minutes) as total_minutes
          FROM work_logs
          WHERE user_id = $1
            AND work_type = 'work'
            AND start_time >= CURRENT_DATE - INTERVAL '90 days'
          GROUP BY DATE(start_time)
          HAVING SUM(duration_minutes) >= 60
        ),
        streaks AS (
          SELECT 
            work_date,
            work_date - (ROW_NUMBER() OVER (ORDER BY work_date))::integer AS streak_group
          FROM daily_work
        ),
        streak_lengths AS (
          SELECT 
            streak_group,
            COUNT(*) as streak_length,
            MIN(work_date) as streak_start,
            MAX(work_date) as streak_end
          FROM streaks
          GROUP BY streak_group
        )
        SELECT json_build_object(
          'currentStreak', COALESCE(
            (
              SELECT streak_length 
              FROM streak_lengths 
              WHERE streak_end = CURRENT_DATE - 1
              OR streak_end = CURRENT_DATE
            ),
            0
          ),
          'longestStreak', COALESCE(
            (
              SELECT MAX(streak_length) 
              FROM streak_lengths
            ),
            0
          ),
          'totalProductiveDays', COALESCE(
            (
              SELECT COUNT(*) 
              FROM daily_work
            ),
            0
          )
        ) as streak_data
      `;

      const result = await pool.query(sql, [userId]);
      return result.rows[0]?.streak_data || {
        currentStreak: 0,
        longestStreak: 0,
        totalProductiveDays: 0
      };
    } catch (error) {
      logger.error('Error getting productivity streaks:', error);
      throw error;
    }
  }
}

module.exports = EmployeeDashboardService; 