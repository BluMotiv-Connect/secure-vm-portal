import { useQuery, useMutation, useQueryClient } from 'react-query'
import { workLogService } from '@services/workLogService'
import { useNotifications } from '@contexts/NotificationContext'

export const useWorkLogs = (params = {}) => {
  const queryClient = useQueryClient()
  const { success, error } = useNotifications()

  // Get work logs query
  const workLogsQuery = useQuery(
    ['workLogs', params],
    () => workLogService.getWorkLogs(params),
    {
      keepPreviousData: true,
      staleTime: 30000, // 30 seconds
    }
  )

  // Get active work log query
  const activeWorkLogQuery = useQuery(
    ['activeWorkLog'],
    () => workLogService.getActiveWorkLog(),
    {
      refetchInterval: 60000, // Refetch every minute
      staleTime: 30000, // 30 seconds
    }
  )

  // Get work log by ID query
  const useWorkLog = (id) => {
    return useQuery(
      ['workLog', id],
      () => workLogService.getWorkLogById(id),
      {
        enabled: !!id,
        staleTime: 60000, // 1 minute
      }
    )
  }

  // Get work summary query
  const useWorkSummary = (startDate, endDate, userId = null) => {
    return useQuery(
      ['workSummary', startDate, endDate, userId],
      () => workLogService.getWorkSummary(startDate, endDate, userId),
      {
        enabled: !!(startDate && endDate),
        staleTime: 300000, // 5 minutes
      }
    )
  }

  // Get work stats query
  const workStatsQuery = useQuery(
    ['workStats'],
    () => workLogService.getWorkStats(),
    {
      staleTime: 300000, // 5 minutes
    }
  )

  // Start work session mutation
  const startWorkSessionMutation = useMutation(
    (workData) => workLogService.startWorkSession(workData),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['workLogs'])
        queryClient.invalidateQueries(['activeWorkLog'])
        queryClient.invalidateQueries(['workStats'])
        success('Work session started successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to start work session')
      }
    }
  )

  // End work session mutation
  const endWorkSessionMutation = useMutation(
    ({ workLogId, endTime }) => workLogService.endWorkSession(workLogId, endTime),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['workLogs'])
        queryClient.invalidateQueries(['activeWorkLog'])
        queryClient.invalidateQueries(['workStats'])
        queryClient.invalidateQueries(['workSummary'])
        success('Work session ended successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to end work session')
      }
    }
  )

  // Update work log mutation
  const updateWorkLogMutation = useMutation(
    ({ id, workData }) => workLogService.updateWorkLog(id, workData),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['workLogs'])
        queryClient.invalidateQueries(['workLog', variables.id])
        queryClient.invalidateQueries(['activeWorkLog'])
        queryClient.invalidateQueries(['workStats'])
        success('Work log updated successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to update work log')
      }
    }
  )

  // Delete work log mutation
  const deleteWorkLogMutation = useMutation(
    (id) => workLogService.deleteWorkLog(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['workLogs'])
        queryClient.invalidateQueries(['workStats'])
        success('Work log deleted successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to delete work log')
      }
    }
  )

  // Log non-work time mutation
  const logNonWorkTimeMutation = useMutation(
    (nonWorkData) => workLogService.logNonWorkTime(nonWorkData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['workLogs'])
        queryClient.invalidateQueries(['workStats'])
        success('Non-work time logged successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to log non-work time')
      }
    }
  )

  return {
    // Queries
    workLogs: workLogsQuery.data?.workLogs || [],
    pagination: workLogsQuery.data?.pagination,
    isLoading: workLogsQuery.isLoading,
    isError: workLogsQuery.isError,
    error: workLogsQuery.error,
    refetch: workLogsQuery.refetch,

    // Active work log
    activeWorkLog: activeWorkLogQuery.data?.activeWorkLog,
    isActiveLoading: activeWorkLogQuery.isLoading,
    refetchActive: activeWorkLogQuery.refetch,

    // Work stats
    workStats: workStatsQuery.data?.stats,
    statsLoading: workStatsQuery.isLoading,

    // Individual work log
    useWorkLog,

    // Work summary
    useWorkSummary,

    // Mutations
    startWorkSession: startWorkSessionMutation.mutate,
    endWorkSession: endWorkSessionMutation.mutate,
    updateWorkLog: updateWorkLogMutation.mutate,
    deleteWorkLog: deleteWorkLogMutation.mutate,
    logNonWorkTime: logNonWorkTimeMutation.mutate,

    // Mutation states
    isStarting: startWorkSessionMutation.isLoading,
    isEnding: endWorkSessionMutation.isLoading,
    isUpdating: updateWorkLogMutation.isLoading,
    isDeleting: deleteWorkLogMutation.isLoading,
    isLoggingNonWork: logNonWorkTimeMutation.isLoading
  }
}
