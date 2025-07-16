const { pool } = require('../config/database')
const logger = require('../utils/logger')

class ChartDataService {
  // Get work time trends data for charts
  static async getWorkTimeTrends(userId = null, days = 30) {
    try {
      let sql = `
        SELECT 
          DATE(start_time) as date,
          SUM(duration_minutes) FILTER (WHERE work_type = 'work') as work_minutes,
          SUM(duration_minutes) FILTER (WHERE work_type = 'break') as break_minutes,
          SUM(duration_minutes) FILTER (WHERE work_type = 'meeting') as meeting_minutes,
          COUNT(*) as total_sessions,
          COUNT(DISTINCT vm_id) as unique_vms
        FROM work_logs
        WHERE start_time >= CURRENT_DATE - INTERVAL '${days} days'
      `

      const params = []
      if (userId) {
        sql += ' AND user_id = $1'
        params.push(userId)
      }

      sql += ' GROUP BY DATE(start_time) ORDER BY date'

      const result = await pool.query(sql, params)
      
      return result.rows.map(row => ({
        date: row.date,
        workMinutes: parseInt(row.work_minutes) || 0,
        breakMinutes: parseInt(row.break_minutes) || 0,
        meetingMinutes: parseInt(row.meeting_minutes) || 0,
        totalSessions: parseInt(row.total_sessions),
        uniqueVms: parseInt(row.unique_vms)
      }))
    } catch (error) {
      logger.error('Failed to get work time trends:', error)
      throw error
    }
  }

  // Get user activity data for charts
  static async getUserActivityData(days = 30) {
    try {
      const sql = `
        SELECT 
          u.name as user_name,
          COUNT(wl.id) as total_sessions,
          SUM(wl.duration_minutes) as total_minutes,
          COUNT(DISTINCT wl.vm_id) as unique_vms,
          COUNT(DISTINCT DATE(wl.start_time)) as active_days,
          AVG(wl.duration_minutes) as avg_session_duration
        FROM users u
        LEFT JOIN work_logs wl ON u.id = wl.user_id 
          AND wl.start_time >= CURRENT_DATE - INTERVAL '${days} days'
        WHERE u.role = 'employee'
        GROUP BY u.id, u.name
        ORDER BY total_minutes DESC NULLS LAST
      `

      const result = await pool.query(sql)
      
      return result.rows.map(row => ({
        userName: row.user_name,
        totalSessions: parseInt(row.total_sessions) || 0,
        totalMinutes: parseInt(row.total_minutes) || 0,
        uniqueVms: parseInt(row.unique_vms) || 0,
        activeDays: parseInt(row.active_days) || 0,
        avgSessionDuration: parseFloat(row.avg_session_duration) || 0
      }))
    } catch (error) {
      logger.error('Failed to get user activity data:', error)
      throw error
    }
  }

  // Get VM usage data for charts
  static async getVMUsageData(days = 30) {
    try {
      const sql = `
        SELECT 
          vm.name as vm_name,
          vm.os_type,
          COUNT(wl.id) as total_sessions,
          SUM(wl.duration_minutes) as total_minutes,
          COUNT(DISTINCT wl.user_id) as unique_users,
          COUNT(DISTINCT DATE(wl.start_time)) as active_days,
          AVG(wl.duration_minutes) as avg_session_duration
        FROM virtual_machines vm
        LEFT JOIN work_logs wl ON vm.id = wl.vm_id 
          AND wl.start_time >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY vm.id, vm.name, vm.os_type
        ORDER BY total_minutes DESC NULLS LAST
      `

      const result = await pool.query(sql)
      
      return result.rows.map(row => ({
        vmName: row.vm_name,
        osType: row.os_type,
        totalSessions: parseInt(row.total_sessions) || 0,
        totalMinutes: parseInt(row.total_minutes) || 0,
        uniqueUsers: parseInt(row.unique_users) || 0,
        activeDays: parseInt(row.active_days) || 0,
        avgSessionDuration: parseFloat(row.avg_session_duration) || 0
      }))
    } catch (error) {
      logger.error('Failed to get VM usage data:', error)
      throw error
    }
  }

  // Get productivity metrics for charts
  static async getProductivityMetrics(userId = null, days = 30) {
    try {
      let sql = `
        SELECT 
          work_type,
          COUNT(*) as session_count,
          SUM(duration_minutes) as total_minutes,
          AVG(duration_minutes) as avg_duration
        FROM work_logs
        WHERE start_time >= CURRENT_DATE - INTERVAL '${days} days'
      `

      const params = []
      if (userId) {
        sql += ' AND user_id = $1'
        params.push(userId)
      }

      sql += ' GROUP BY work_type ORDER BY total_minutes DESC'

      const result = await pool.query(sql)
      
      return result.rows.map(row => ({
        workType: row.work_type,
        sessionCount: parseInt(row.session_count),
        totalMinutes: parseInt(row.total_minutes),
        avgDuration: parseFloat(row.avg_duration)
      }))
    } catch (error) {
      logger.error('Failed to get productivity metrics:', error)
      throw error
    }
  }

  // Get hourly activity patterns
  static async getHourlyActivityPattern(userId = null, days = 30) {
    try {
      let sql = `
        SELECT 
          EXTRACT(HOUR FROM start_time) as hour,
          COUNT(*) as session_count,
          SUM(duration_minutes) as total_minutes
        FROM work_logs
        WHERE start_time >= CURRENT_DATE - INTERVAL '${days} days'
      `

      const params = []
      if (userId) {
        sql += ' AND user_id = $1'
        params.push(userId)
      }

      sql += ' GROUP BY EXTRACT(HOUR FROM start_time) ORDER BY hour'

      const result = await pool.query(sql)
      
      // Fill in missing hours with zero values
      const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        sessionCount: 0,
        totalMinutes: 0
      }))

      result.rows.forEach(row => {
        const hour = parseInt(row.hour)
        hourlyData[hour] = {
          hour,
          sessionCount: parseInt(row.session_count),
          totalMinutes: parseInt(row.total_minutes)
        }
      })

      return hourlyData
    } catch (error) {
      logger.error('Failed to get hourly activity pattern:', error)
      throw error
    }
  }

  // Get weekly activity patterns
  static async getWeeklyActivityPattern(userId = null, weeks = 12) {
    try {
      let sql = `
        SELECT 
          EXTRACT(DOW FROM start_time) as day_of_week,
          COUNT(*) as session_count,
          SUM(duration_minutes) as total_minutes,
          AVG(duration_minutes) as avg_duration
        FROM work_logs
        WHERE start_time >= CURRENT_DATE - INTERVAL '${weeks} weeks'
      `

      const params = []
      if (userId) {
        sql += ' AND user_id = $1'
        params.push(userId)
      }

      sql += ' GROUP BY EXTRACT(DOW FROM start_time) ORDER BY day_of_week'

      const result = await pool.query(sql)
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      
      return result.rows.map(row => ({
        dayOfWeek: parseInt(row.day_of_week),
        dayName: dayNames[parseInt(row.day_of_week)],
        sessionCount: parseInt(row.session_count),
        totalMinutes: parseInt(row.total_minutes),
        avgDuration: parseFloat(row.avg_duration)
      }))
    } catch (error) {
      logger.error('Failed to get weekly activity pattern:', error)
      throw error
    }
  }
}

module.exports = ChartDataService
