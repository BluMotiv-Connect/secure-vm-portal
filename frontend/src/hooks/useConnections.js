import { useQuery, useMutation, useQueryClient } from 'react-query'
import { connectionService } from '@services/connectionService'
import { useNotifications } from '@contexts/NotificationContext'

export const useConnections = () => {
  const queryClient = useQueryClient()
  const { success, error } = useNotifications()

  // Get active connections query
  const activeConnectionsQuery = useQuery(
    ['activeConnections'],
    () => connectionService.getActiveConnections(),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 10000, // 10 seconds
    }
  )

  // Get connection history query
  const useConnectionHistory = (params = {}) => {
    return useQuery(
      ['connectionHistory', params],
      () => connectionService.getConnectionHistory(params),
      {
        keepPreviousData: true,
        staleTime: 60000, // 1 minute
      }
    )
  }

  // Get connection stats query
  const connectionStatsQuery = useQuery(
    ['connectionStats'],
    () => connectionService.getConnectionStats(),
    {
      staleTime: 300000, // 5 minutes
    }
  )

  // Initiate connection mutation
  const initiateConnectionMutation = useMutation(
    (vmId) => connectionService.initiateConnection(vmId),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['activeConnections'])
        success('Connection initiated successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to initiate connection')
      }
    }
  )

  // End connection mutation
  const endConnectionMutation = useMutation(
    ({ sessionId, reason }) => connectionService.endConnection(sessionId, reason),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['activeConnections'])
        queryClient.invalidateQueries(['connectionHistory'])
        queryClient.invalidateQueries(['connectionStats'])
        success('Connection ended successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to end connection')
      }
    }
  )

  // Download connection file mutation
  const downloadFileMutation = useMutation(
    ({ sessionId, type }) => connectionService.downloadConnectionFile(sessionId, type),
    {
      onSuccess: (data, variables) => {
        // Create download link
        const url = window.URL.createObjectURL(new Blob([data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `vm-connection-${variables.sessionId}.${variables.type === 'rdp' ? 'ps1' : 'sh'}`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
        
        success('Connection file downloaded successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to download connection file')
      }
    }
  )

  return {
    // Queries
    activeConnections: activeConnectionsQuery.data?.connections || [],
    isLoadingActive: activeConnectionsQuery.isLoading,
    activeConnectionsError: activeConnectionsQuery.error,
    refetchActive: activeConnectionsQuery.refetch,

    // Connection history
    useConnectionHistory,

    // Connection stats
    connectionStats: connectionStatsQuery.data?.stats,
    statsLoading: connectionStatsQuery.isLoading,

    // Mutations
    initiateConnection: initiateConnectionMutation.mutate,
    endConnection: endConnectionMutation.mutate,
    downloadFile: downloadFileMutation.mutate,

    // Mutation states
    isInitiating: initiateConnectionMutation.isLoading,
    isEnding: endConnectionMutation.isLoading,
    isDownloading: downloadFileMutation.isLoading
  }
}
