const WorkLog = require('../models/WorkLog')
const NonWorkLog = require('../models/NonWorkLog')
const { pool } = require('../config/database')
const logger = require('../utils/logger')

class TimeTrackingService {
  // Get comprehensive time tracking data for user
  static async getUserTimeTracking(userId, startDate, endDate) {
    try {
      const workData = await this.getWorkTimeData(userId, startDate, endDate)
      const nonWorkData = await this.getNonWorkTimeData(userId, startDate, endDate)
      const productivity = await this.calculateProductivityMetrics(userId, startDate, endDate)
      
      return {
        workTime: workData,
        nonWorkTime: nonWorkData,
        productivity,
        summary: this.calculateTimeSummary(workData, nonWorkData)
      }
    } catch (error) {
      logger.error('Failed to get user time tracking:', error)
      throw error
    }
  }

  // Get work time data
  static async getWorkTimeData(userId, startDate, endDate) {
    try {
      const sql = `
        SELECT 
          DATE(start_time) as date,
          work_type,
          COUNT(*) as session_count,
          SUM(duration_minutes) as total_minutes,
          MIN(start_time) as first_session,
          MAX(COALESCE(end_time, start_time)) as last_session,
          ARRAY_AGG(
            JSON_BUILD_OBJECT(
              'id', id,
              'taskTitle', task_title,
              'startTime', start_time,
              'endTime', end_time,
              'duration', duration_minutes,
              'isBillable', is_billable
            ) ORDER BY start_time
          ) as sessions
        FROM work_logs
        WHERE user_id = $1 
          AND start_time >= $2 
          AND start_time <= $3
        GROUP BY DATE(start_time), work_type
        ORDER BY date DESC, work_type
      `

      const result = await pool.query(sql, [userId, startDate, endDate])
      
      return result.rows.map(row => ({
        date: row.date,
        workType: row.work_type,
        sessionCount: parseInt(row.session_count),
        totalMinutes: parseInt(row.total_minutes) || 0,
        firstSession: row.first_session,
        lastSession: row.last_session,
        sessions: row.sessions
      }))
    } catch (error) {
      logger.error('Failed to get work time data:', error)
      throw error
    }
  }

  // Get non-work time data
  static async getNonWorkTimeData(userId, startDate, endDate) {
    try {
      const sql = `
        SELECT 
          date,
          reason,
          COUNT(*) as entry_count,
          SUM(duration_minutes) as total_minutes,
          ARRAY_AGG(
            JSON_BUILD_OBJECT(
              'id', id,
              'reason', reason,
              'startTime', start_time,
              'endTime', end_time,
              'duration', duration_minutes
            ) ORDER BY start_time
          ) as entries
        FROM non_work_logs
        WHERE user_id = $1 
          AND date >= $2 
          AND date <= $3
        GROUP BY date, reason
        ORDER BY date DESC, reason
      `

      const result = await pool.query(sql, [userId, startDate, endDate])
      
      return result.rows.map(row => ({
        date: row.date,
        reason: row.reason,
        entryCount: parseInt(row.entry_count),
        totalMinutes: parseInt(row.total_minutes) || 0,
        entries: row.entries
      }))
    } catch (error) {
      logger.error('Failed to get non-work time data:', error)
      throw error
    }
  }

  // Calculate productivity metrics
  static async calculateProductivityMetrics(userId, startDate, endDate) {
    try {
      const sql = `
        WITH daily_stats AS (
          SELECT 
            DATE(start_time) as date,
            SUM(duration_minutes) FILTER (WHERE work_type = 'work') as work_minutes,
            SUM(duration_minutes) FILTER (WHERE work_type = 'break') as break_minutes,
            SUM(duration_minutes) FILTER (WHERE work_type = 'meeting') as meeting_minutes,
            COUNT(*) FILTER (WHERE work_type = 'work') as work_sessions,
            COUNT(*) FILTER (WHERE is_billable = true) as billable_sessions,
            MIN(start_time) as day_start,
            MAX(COALESCE(end_time, start_time)) as day_end
          FROM work_logs
          WHERE user_id = $1 
            AND start_time >= $2 
            AND start_time <= $3
          GROUP BY DATE(start_time)
        )
        SELECT 
          COUNT(*) as active_days,
          AVG(work_minutes) as avg_daily_work,
          AVG(break_minutes) as avg_daily_break,
          AVG(meeting_minutes) as avg_daily_meeting,
          AVG(work_sessions) as avg_daily_sessions,
          AVG(billable_sessions) as avg_billable_sessions,
          AVG(EXTRACT(EPOCH FROM (day_end - day_start)) / 60) as avg_day_length,
          SUM(work_minutes) as total_work_minutes,
          SUM(break_minutes) as total_break_minutes,
          SUM(meeting_minutes) as total_meeting_minutes
        FROM daily_stats
      `

      const result = await pool.query(sql, [userId, startDate, endDate])
      const metrics = result.rows[0]

      const totalWorkMinutes = parseInt(metrics.total_work_minutes) || 0
      const totalBreakMinutes = parseInt(metrics.total_break_minutes) || 0
      const totalMeetingMinutes = parseInt(metrics.total_meeting_minutes) || 0
      const totalMinutes = totalWorkMinutes + totalBreakMinutes + totalMeetingMinutes

      return {
        activeDays: parseInt(metrics.active_days) || 0,
        avgDailyWork: parseFloat(metrics.avg_daily_work) || 0,
        avgDailyBreak: parseFloat(metrics.avg_daily_break) || 0,
        avgDailyMeeting: parseFloat(metrics.avg_daily_meeting) || 0,
        avgDailySessions: parseFloat(metrics.avg_daily_sessions) || 0,
        avgBillableSessions: parseFloat(metrics.avg_billable_sessions) || 0,
        avgDayLength: parseFloat(metrics.avg_day_length) || 0,
        totalWorkMinutes,
        totalBreakMinutes,
        totalMeetingMinutes,
        totalMinutes,
        workPercentage: totalMinutes > 0 ? (totalWorkMinutes / totalMinutes) * 100 : 0,
        breakPercentage: totalMinutes > 0 ? (totalBreakMinutes / totalMinutes) * 100 : 0,
        meetingPercentage: totalMinutes > 0 ? (totalMeetingMinutes / totalMinutes) * 100 : 0
      }
    } catch (error) {
      logger.error('Failed to calculate productivity metrics:', error)
      throw error
    }
  }

  // Calculate time summary
  static calculateTimeSummary(workData, nonWorkData) {
    const totalWorkMinutes = workData.reduce((sum, day) => sum + day.totalMinutes, 0)
    const totalNonWorkMinutes = nonWorkData.reduce((sum, day) => sum + day.totalMinutes, 0)
    const totalMinutes = totalWorkMinutes + totalNonWorkMinutes

    const workDays = [...new Set(workData.map(day => day.date))].length
    const totalSessions = workData.reduce((sum, day) => sum + day.sessionCount, 0)

    return {
      totalWorkMinutes,
      totalNonWorkMinutes,
      totalMinutes,
      workDays,
      totalSessions,
      avgDailyWork: workDays > 0 ? totalWorkMinutes / workDays : 0,
      avgSessionDuration: totalSessions > 0 ? totalWorkMinutes / totalSessions : 0,
      workEfficiency: totalMinutes > 0 ? (totalWorkMinutes / totalMinutes) * 100 : 0
    }
  }

  // Get time tracking analytics for admin
  static async getTimeTrackingAnalytics(startDate, endDate) {
    try {
      const sql = `
        WITH user_stats AS (
          SELECT 
            u.id as user_id,
            u.name as user_name,
            COUNT(wl.id) as total_sessions,
            SUM(wl.duration_minutes) as total_minutes,
            AVG(wl.duration_minutes) as avg_session,
            COUNT(DISTINCT DATE(wl.start_time)) as active_days,
            COUNT(*) FILTER (WHERE wl.work_type = 'work') as work_sessions,
            COUNT(*) FILTER (WHERE wl.is_billable = true) as billable_sessions
          FROM users u
          LEFT JOIN work_logs wl ON u.id = wl.user_id 
            AND wl.start_time >= $1 
            AND wl.start_time <= $2
          WHERE u.role = 'employee'
          GROUP BY u.id, u.name
        )
        SELECT 
          COUNT(*) as total_users,
          SUM(total_sessions) as total_sessions,
          SUM(total_minutes) as total_minutes,
          AVG(avg_session) as avg_session_duration,
          SUM(active_days) as total_active_days,
          SUM(work_sessions) as total_work_sessions,
          SUM(billable_sessions) as total_billable_sessions,
          AVG(total_minutes) as avg_user_minutes,
          ARRAY_AGG(
            JSON_BUILD_OBJECT(
              'userId', user_id,
              'userName', user_name,
              'totalSessions', total_sessions,
              'totalMinutes', total_minutes,
              'avgSession', avg_session,
              'activeDays', active_days,
              'workSessions', work_sessions,
              'billableSessions', billable_sessions
            ) ORDER BY total_minutes DESC
          ) as user_breakdown
        FROM user_stats
      `

      const result = await pool.query(sql, [startDate, endDate])
      const analytics = result.rows[0]

      return {
        totalUsers: parseInt(analytics.total_users) || 0,
        totalSessions: parseInt(analytics.total_sessions) || 0,
        totalMinutes: parseInt(analytics.total_minutes) || 0,
        avgSessionDuration: parseFloat(analytics.avg_session_duration) || 0,
        totalActiveDays: parseInt(analytics.total_active_days) || 0,
        totalWorkSessions: parseInt(analytics.total_work_sessions) || 0,
        totalBillableSessions: parseInt(analytics.total_billable_sessions) || 0,
        avgUserMinutes: parseFloat(analytics.avg_user_minutes) || 0,
        userBreakdown: analytics.user_breakdown || []
      }
    } catch (error) {
      logger.error('Failed to get time tracking analytics:', error)
      throw error
    }
  }

  // Generate time report
  static async generateTimeReport(userId, startDate, endDate, format = 'detailed') {
    try {
      const timeData = await this.getUserTimeTracking(userId, startDate, endDate)
      
      if (format === 'summary') {
        return {
          userId,
          period: { startDate, endDate },
          summary: timeData.summary,
          productivity: timeData.productivity
        }
      }

      return {
        userId,
        period: { startDate, endDate },
        ...timeData,
        generatedAt: new Date().toISOString()
      }
    } catch (error) {
      logger.error('Failed to generate time report:', error)
      throw error
    }
  }
}

module.exports = TimeTrackingService
