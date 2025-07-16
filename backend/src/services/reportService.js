const { pool } = require('../config/database')
const logger = require('../utils/logger')

class ReportService {
  // Generate comprehensive time report
  static async generateTimeReport(filters = {}) {
    try {
      const {
        startDate,
        endDate,
        userIds = [],
        vmIds = [],
        workTypes = [],
        includeNonWork = false,
        groupBy = 'user' // user, vm, date, workType
      } = filters

      let sql = `
        SELECT 
          wl.user_id,
          u.name as user_name,
          u.email as user_email,
          wl.vm_id,
          vm.name as vm_name,
          vm.ip_address,
          wl.work_type,
          DATE(wl.start_time) as work_date,
          COUNT(*) as session_count,
          SUM(wl.duration_minutes) as total_minutes,
          AVG(wl.duration_minutes) as avg_session_minutes,
          MIN(wl.start_time) as first_session,
          MAX(COALESCE(wl.end_time, wl.start_time)) as last_session,
          COUNT(*) FILTER (WHERE wl.is_billable = true) as billable_sessions,
          SUM(wl.duration_minutes) FILTER (WHERE wl.is_billable = true) as billable_minutes
        FROM work_logs wl
        JOIN users u ON wl.user_id = u.id
        JOIN virtual_machines vm ON wl.vm_id = vm.id
        WHERE wl.start_time >= $1 AND wl.start_time <= $2
      `

      const params = [startDate, endDate]
      let paramCount = 2

      // Add user filter
      if (userIds.length > 0) {
        paramCount++
        sql += ` AND wl.user_id = ANY($${paramCount})`
        params.push(userIds)
      }

      // Add VM filter
      if (vmIds.length > 0) {
        paramCount++
        sql += ` AND wl.vm_id = ANY($${paramCount})`
        params.push(vmIds)
      }

      // Add work type filter
      if (workTypes.length > 0) {
        paramCount++
        sql += ` AND wl.work_type = ANY($${paramCount})`
        params.push(workTypes)
      }

      // Add grouping
      const groupByFields = {
        user: 'wl.user_id, u.name, u.email',
        vm: 'wl.vm_id, vm.name, vm.ip_address',
        date: 'DATE(wl.start_time)',
        workType: 'wl.work_type',
        userDate: 'wl.user_id, u.name, u.email, DATE(wl.start_time)',
        vmDate: 'wl.vm_id, vm.name, vm.ip_address, DATE(wl.start_time)'
      }

      sql += ` GROUP BY ${groupByFields[groupBy] || groupByFields.user}, wl.vm_id, vm.name, vm.ip_address, wl.work_type, DATE(wl.start_time)`
      sql += ` ORDER BY user_name, work_date DESC, vm_name`

      const result = await pool.query(sql, params)

      // Get non-work data if requested
      let nonWorkData = []
      if (includeNonWork) {
        nonWorkData = await this.getNonWorkData(filters)
      }

      // Calculate summary statistics
      const summary = await this.calculateReportSummary(result.rows)

      return {
        data: result.rows.map(row => ({
          userId: row.user_id,
          userName: row.user_name,
          userEmail: row.user_email,
          vmId: row.vm_id,
          vmName: row.vm_name,
          vmIpAddress: row.ip_address,
          workType: row.work_type,
          workDate: row.work_date,
          sessionCount: parseInt(row.session_count),
          totalMinutes: parseInt(row.total_minutes) || 0,
          avgSessionMinutes: parseFloat(row.avg_session_minutes) || 0,
          firstSession: row.first_session,
          lastSession: row.last_session,
          billableSessions: parseInt(row.billable_sessions),
          billableMinutes: parseInt(row.billable_minutes) || 0
        })),
        nonWorkData,
        summary,
        filters,
        generatedAt: new Date().toISOString()
      }
    } catch (error) {
      logger.error('Failed to generate time report:', error)
      throw error
    }
  }

  // Generate user productivity report
  static async generateUserProductivityReport(filters = {}) {
    try {
      const { startDate, endDate, userIds = [] } = filters

      let sql = `
        WITH user_daily_stats AS (
          SELECT 
            wl.user_id,
            u.name as user_name,
            DATE(wl.start_time) as work_date,
            SUM(wl.duration_minutes) as total_minutes,
            SUM(wl.duration_minutes) FILTER (WHERE wl.work_type = 'work') as work_minutes,
            SUM(wl.duration_minutes) FILTER (WHERE wl.work_type = 'break') as break_minutes,
            SUM(wl.duration_minutes) FILTER (WHERE wl.work_type = 'meeting') as meeting_minutes,
            COUNT(*) as session_count,
            COUNT(DISTINCT wl.vm_id) as unique_vms,
            MIN(wl.start_time) as day_start,
            MAX(COALESCE(wl.end_time, wl.start_time)) as day_end
          FROM work_logs wl
          JOIN users u ON wl.user_id = u.id
          WHERE wl.start_time >= $1 AND wl.start_time <= $2
      `

      const params = [startDate, endDate]
      let paramCount = 2

      if (userIds.length > 0) {
        paramCount++
        sql += ` AND wl.user_id = ANY($${paramCount})`
        params.push(userIds)
      }

      sql += `
          GROUP BY wl.user_id, u.name, DATE(wl.start_time)
        )
        SELECT 
          user_id,
          user_name,
          COUNT(*) as active_days,
          SUM(total_minutes) as total_minutes,
          SUM(work_minutes) as total_work_minutes,
          SUM(break_minutes) as total_break_minutes,
          SUM(meeting_minutes) as total_meeting_minutes,
          AVG(total_minutes) as avg_daily_minutes,
          AVG(work_minutes) as avg_daily_work,
          AVG(session_count) as avg_daily_sessions,
          AVG(unique_vms) as avg_daily_vms,
          CASE 
            WHEN SUM(total_minutes) > 0 THEN
              ROUND((SUM(work_minutes) * 100.0 / SUM(total_minutes)), 2)
            ELSE 0
          END as productivity_percentage,
          AVG(EXTRACT(EPOCH FROM (day_end - day_start)) / 60) as avg_day_length_minutes
        FROM user_daily_stats
        GROUP BY user_id, user_name
        ORDER BY total_work_minutes DESC
      `

      const result = await pool.query(sql, params)

      return {
        data: result.rows.map(row => ({
          userId: row.user_id,
          userName: row.user_name,
          activeDays: parseInt(row.active_days),
          totalMinutes: parseInt(row.total_minutes) || 0,
          totalWorkMinutes: parseInt(row.total_work_minutes) || 0,
          totalBreakMinutes: parseInt(row.total_break_minutes) || 0,
          totalMeetingMinutes: parseInt(row.total_meeting_minutes) || 0,
          avgDailyMinutes: parseFloat(row.avg_daily_minutes) || 0,
          avgDailyWork: parseFloat(row.avg_daily_work) || 0,
          avgDailySessions: parseFloat(row.avg_daily_sessions) || 0,
          avgDailyVms: parseFloat(row.avg_daily_vms) || 0,
          productivityPercentage: parseFloat(row.productivity_percentage) || 0,
          avgDayLengthMinutes: parseFloat(row.avg_day_length_minutes) || 0
        })),
        filters,
        generatedAt: new Date().toISOString()
      }
    } catch (error) {
      logger.error('Failed to generate user productivity report:', error)
      throw error
    }
  }

  // Generate VM usage report
  static async generateVMUsageReport(filters = {}) {
    try {
      const { startDate, endDate, vmIds = [] } = filters

      let sql = `
        SELECT 
          vm.id as vm_id,
          vm.name as vm_name,
          vm.ip_address,
          vm.os_type,
          vm.status,
          COUNT(DISTINCT wl.user_id) as unique_users,
          COUNT(wl.id) as total_sessions,
          SUM(wl.duration_minutes) as total_usage_minutes,
          AVG(wl.duration_minutes) as avg_session_minutes,
          COUNT(DISTINCT DATE(wl.start_time)) as active_days,
          MIN(wl.start_time) as first_usage,
          MAX(COALESCE(wl.end_time, wl.start_time)) as last_usage,
          COUNT(*) FILTER (WHERE wl.work_type = 'work') as work_sessions,
          COUNT(*) FILTER (WHERE wl.is_billable = true) as billable_sessions,
          ROUND(
            (COUNT(*) FILTER (WHERE wl.work_type = 'work') * 100.0 / COUNT(*)), 2
          ) as work_session_percentage
        FROM virtual_machines vm
        LEFT JOIN work_logs wl ON vm.id = wl.vm_id 
          AND wl.start_time >= $1 
          AND wl.start_time <= $2
      `

      const params = [startDate, endDate]
      let paramCount = 2

      if (vmIds.length > 0) {
        paramCount++
        sql += ` AND vm.id = ANY($${paramCount})`
        params.push(vmIds)
      }

      sql += `
        GROUP BY vm.id, vm.name, vm.ip_address, vm.os_type, vm.status
        ORDER BY total_usage_minutes DESC NULLS LAST
      `

      const result = await pool.query(sql, params)

      return {
        data: result.rows.map(row => ({
          vmId: row.vm_id,
          vmName: row.vm_name,
          ipAddress: row.ip_address,
          osType: row.os_type,
          status: row.status,
          uniqueUsers: parseInt(row.unique_users) || 0,
          totalSessions: parseInt(row.total_sessions) || 0,
          totalUsageMinutes: parseInt(row.total_usage_minutes) || 0,
          avgSessionMinutes: parseFloat(row.avg_session_minutes) || 0,
          activeDays: parseInt(row.active_days) || 0,
          firstUsage: row.first_usage,
          lastUsage: row.last_usage,
          workSessions: parseInt(row.work_sessions) || 0,
          billableSessions: parseInt(row.billable_sessions) || 0,
          workSessionPercentage: parseFloat(row.work_session_percentage) || 0
        })),
        filters,
        generatedAt: new Date().toISOString()
      }
    } catch (error) {
      logger.error('Failed to generate VM usage report:', error)
      throw error
    }
  }

  // Generate summary dashboard report
  static async generateSummaryReport(filters = {}) {
    try {
      const { startDate, endDate } = filters

      // Get overall statistics
      const overallStats = await this.getOverallStats(startDate, endDate)
      
      // Get daily trends
      const dailyTrends = await this.getDailyTrends(startDate, endDate)
      
      // Get top users
      const topUsers = await this.getTopUsers(startDate, endDate, 10)
      
      // Get top VMs
      const topVMs = await this.getTopVMs(startDate, endDate, 10)
      
      // Get work type distribution
      const workTypeDistribution = await this.getWorkTypeDistribution(startDate, endDate)

      return {
        overallStats,
        dailyTrends,
        topUsers,
        topVMs,
        workTypeDistribution,
        filters,
        generatedAt: new Date().toISOString()
      }
    } catch (error) {
      logger.error('Failed to generate summary report:', error)
      throw error
    }
  }

  // Helper methods
  static async getNonWorkData(filters) {
    try {
      const { startDate, endDate, userIds = [] } = filters

      let sql = `
        SELECT 
          nwl.user_id,
          u.name as user_name,
          nwl.reason,
          nwl.date,
          COUNT(*) as entry_count,
          SUM(nwl.duration_minutes) as total_minutes
        FROM non_work_logs nwl
        JOIN users u ON nwl.user_id = u.id
        WHERE nwl.date >= $1 AND nwl.date <= $2
      `

      const params = [startDate, endDate]
      let paramCount = 2

      if (userIds.length > 0) {
        paramCount++
        sql += ` AND nwl.user_id = ANY($${paramCount})`
        params.push(userIds)
      }

      sql += ` GROUP BY nwl.user_id, u.name, nwl.reason, nwl.date ORDER BY nwl.date DESC`

      const result = await pool.query(sql, params)
      return result.rows
    } catch (error) {
      logger.error('Failed to get non-work data:', error)
      return []
    }
  }

  static async calculateReportSummary(data) {
    const totalSessions = data.reduce((sum, row) => sum + parseInt(row.session_count), 0)
    const totalMinutes = data.reduce((sum, row) => sum + parseInt(row.total_minutes || 0), 0)
    const totalBillableMinutes = data.reduce((sum, row) => sum + parseInt(row.billable_minutes || 0), 0)
    const uniqueUsers = new Set(data.map(row => row.user_id)).size
    const uniqueVMs = new Set(data.map(row => row.vm_id)).size

    return {
      totalSessions,
      totalMinutes,
      totalBillableMinutes,
      uniqueUsers,
      uniqueVMs,
      avgSessionMinutes: totalSessions > 0 ? totalMinutes / totalSessions : 0,
      billablePercentage: totalMinutes > 0 ? (totalBillableMinutes / totalMinutes) * 100 : 0
    }
  }

  static async getOverallStats(startDate, endDate) {
    try {
      const sql = `
        SELECT 
          COUNT(DISTINCT wl.user_id) as active_users,
          COUNT(DISTINCT wl.vm_id) as used_vms,
          COUNT(*) as total_sessions,
          SUM(wl.duration_minutes) as total_minutes,
          AVG(wl.duration_minutes) as avg_session_minutes,
          COUNT(*) FILTER (WHERE wl.work_type = 'work') as work_sessions,
          COUNT(*) FILTER (WHERE wl.is_billable = true) as billable_sessions,
          COUNT(DISTINCT DATE(wl.start_time)) as active_days
        FROM work_logs wl
        WHERE wl.start_time >= $1 AND wl.start_time <= $2
      `

      const result = await pool.query(sql, [startDate, endDate])
      const stats = result.rows[0]

      return {
        activeUsers: parseInt(stats.active_users) || 0,
        usedVMs: parseInt(stats.used_vms) || 0,
        totalSessions: parseInt(stats.total_sessions) || 0,
        totalMinutes: parseInt(stats.total_minutes) || 0,
        avgSessionMinutes: parseFloat(stats.avg_session_minutes) || 0,
        workSessions: parseInt(stats.work_sessions) || 0,
        billableSessions: parseInt(stats.billable_sessions) || 0,
        activeDays: parseInt(stats.active_days) || 0
      }
    } catch (error) {
      logger.error('Failed to get overall stats:', error)
      return {}
    }
  }

  static async getDailyTrends(startDate, endDate) {
    try {
      const sql = `
        SELECT 
          DATE(wl.start_time) as date,
          COUNT(*) as sessions,
          SUM(wl.duration_minutes) as minutes,
          COUNT(DISTINCT wl.user_id) as users,
          COUNT(DISTINCT wl.vm_id) as vms
        FROM work_logs wl
        WHERE wl.start_time >= $1 AND wl.start_time <= $2
        GROUP BY DATE(wl.start_time)
        ORDER BY date
      `

      const result = await pool.query(sql, [startDate, endDate])
      return result.rows.map(row => ({
        date: row.date,
        sessions: parseInt(row.sessions),
        minutes: parseInt(row.minutes) || 0,
        users: parseInt(row.users),
        vms: parseInt(row.vms)
      }))
    } catch (error) {
      logger.error('Failed to get daily trends:', error)
      return []
    }
  }

  static async getTopUsers(startDate, endDate, limit = 10) {
    try {
      const sql = `
        SELECT 
          wl.user_id,
          u.name as user_name,
          COUNT(*) as sessions,
          SUM(wl.duration_minutes) as total_minutes
        FROM work_logs wl
        JOIN users u ON wl.user_id = u.id
        WHERE wl.start_time >= $1 AND wl.start_time <= $2
        GROUP BY wl.user_id, u.name
        ORDER BY total_minutes DESC
        LIMIT $3
      `

      const result = await pool.query(sql, [startDate, endDate, limit])
      return result.rows.map(row => ({
        userId: row.user_id,
        userName: row.user_name,
        sessions: parseInt(row.sessions),
        totalMinutes: parseInt(row.total_minutes) || 0
      }))
    } catch (error) {
      logger.error('Failed to get top users:', error)
      return []
    }
  }

  static async getTopVMs(startDate, endDate, limit = 10) {
    try {
      const sql = `
        SELECT 
          wl.vm_id,
          vm.name as vm_name,
          COUNT(*) as sessions,
          SUM(wl.duration_minutes) as total_minutes
        FROM work_logs wl
        JOIN virtual_machines vm ON wl.vm_id = vm.id
        WHERE wl.start_time >= $1 AND wl.start_time <= $2
        GROUP BY wl.vm_id, vm.name
        ORDER BY total_minutes DESC
        LIMIT $3
      `

      const result = await pool.query(sql, [startDate, endDate, limit])
      return result.rows.map(row => ({
        vmId: row.vm_id,
        vmName: row.vm_name,
        sessions: parseInt(row.sessions),
        totalMinutes: parseInt(row.total_minutes) || 0
      }))
    } catch (error) {
      logger.error('Failed to get top VMs:', error)
      return []
    }
  }

  static async getWorkTypeDistribution(startDate, endDate) {
    try {
      const sql = `
        SELECT 
          wl.work_type,
          COUNT(*) as sessions,
          SUM(wl.duration_minutes) as total_minutes
        FROM work_logs wl
        WHERE wl.start_time >= $1 AND wl.start_time <= $2
        GROUP BY wl.work_type
        ORDER BY total_minutes DESC
      `

      const result = await pool.query(sql, [startDate, endDate])
      return result.rows.map(row => ({
        workType: row.work_type,
        sessions: parseInt(row.sessions),
        totalMinutes: parseInt(row.total_minutes) || 0
      }))
    } catch (error) {
      logger.error('Failed to get work type distribution:', error)
      return []
    }
  }
}

module.exports = ReportService
