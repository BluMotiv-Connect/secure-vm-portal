import { useMemo } from 'react'
import { useWorkLogs } from './useWorkLogs'

export const useCharts = (filters = {}) => {
  const { useWorkSummary, useTimeReport } = useWorkLogs()
  
  const { data: summaryData } = useWorkSummary(
    filters.startDate,
    filters.endDate,
    filters.userId
  )
  
  const { data: timeData } = useTimeReport({
    ...filters,
    format: 'json'
  })

  // Process data for charts
  const chartData = useMemo(() => {
    if (!summaryData || !timeData) return null

    // Daily activity chart data
    const dailyActivity = summaryData.dailyBreakdown?.map(day => ({
      date: day.date,
      totalMinutes: day.totalMinutes,
      workMinutes: day.workSessions * (day.totalMinutes / day.sessionCount),
      breakMinutes: day.breakSessions * (day.totalMinutes / day.sessionCount),
      sessions: day.sessionCount
    })) || []

    // Work type distribution
    const workTypeDistribution = summaryData.workTypeBreakdown?.reduce((acc, item) => {
      acc[item.workType] = item.totalMinutes
      return acc
    }, {}) || {}

    // Productivity trends
    const productivityTrends = summaryData.dailyBreakdown?.map(day => ({
      date: day.date,
      productivity: day.totalMinutes > 0 ? (day.workSessions / day.sessionCount) * 100 : 0,
      efficiency: day.billableSessions / day.sessionCount * 100
    })) || []

    // User comparison data (if multiple users)
    const userComparison = timeData?.data?.reduce((acc, entry) => {
      const existing = acc.find(item => item.userName === entry.userName)
      if (existing) {
        existing.totalMinutes += entry.totalMinutes
        existing.sessions += entry.sessionCount
      } else {
        acc.push({
          userName: entry.userName,
          totalMinutes: entry.totalMinutes,
          sessions: entry.sessionCount,
          productivity: entry.billableMinutes / entry.totalMinutes * 100
        })
      }
      return acc
    }, []) || []

    return {
      dailyActivity,
      workTypeDistribution,
      productivityTrends,
      userComparison
    }
  }, [summaryData, timeData])

  return {
    chartData,
    isLoading: !summaryData || !timeData,
    summaryData,
    timeData
  }
}
