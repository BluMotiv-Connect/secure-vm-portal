import { useQuery, useMutation, useQueryClient } from 'react-query'
import { vmService } from '@services/vmService'
import { useNotifications } from '@contexts/NotificationContext'

export const useVMs = (params = {}) => {
  const queryClient = useQueryClient()
  const { success, error } = useNotifications()

  // Get VMs query
  const vmsQuery = useQuery(
    ['vms', params],
    () => vmService.getVMs(params),
    {
      keepPreviousData: true,
      staleTime: 30000, // 30 seconds
    }
  )

  // Get VM by ID query
  const useVM = (id) => {
    return useQuery(
      ['vm', id],
      () => vmService.getVMById(id),
      {
        enabled: !!id,
        staleTime: 60000, // 1 minute
      }
    )
  }

  // Get VM assigned users query
  const useVMAssignedUsers = (vmId) => {
    return useQuery(
      ['vm-assigned-users', vmId],
      () => vmService.getAssignedUsers(vmId),
      {
        enabled: !!vmId,
        staleTime: 60000, // 1 minute
      }
    )
  }

  // Get VM stats query
  const vmStatsQuery = useQuery(
    ['vmStats'],
    () => vmService.getVMStats(),
    {
      staleTime: 300000, // 5 minutes
    }
  )

  // Get user's VMs query
  const myVMsQuery = useQuery(
    ['myVMs'],
    () => vmService.getMyVMs(),
    {
      staleTime: 60000, // 1 minute
    }
  )

  // Create VM mutation
  const createVMMutation = useMutation(
    (vmData) => vmService.createVM(vmData),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['vms'])
        queryClient.invalidateQueries(['vmStats'])
        success('VM created successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to create VM')
      }
    }
  )

  // Update VM mutation
  const updateVMMutation = useMutation(
    ({ id, vmData }) => vmService.updateVM(id, vmData),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['vms'])
        queryClient.invalidateQueries(['vm', variables.id])
        queryClient.invalidateQueries(['vmStats'])
        queryClient.invalidateQueries(['myVMs'])
        success('VM updated successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to update VM')
      }
    }
  )

  // Delete VM mutation
  const deleteVMMutation = useMutation(
    (id) => vmService.deleteVM(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['vms'])
        queryClient.invalidateQueries(['vmStats'])
        queryClient.invalidateQueries(['myVMs'])
        success('VM deleted successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to delete VM')
      }
    }
  )

  // Assign VM to users mutation
  const assignVMMutation = useMutation(
    ({ id, userIds }) => vmService.assignUsers(id, userIds),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['vms'])
        queryClient.invalidateQueries(['vm', variables.id])
        queryClient.invalidateQueries(['vm-assigned-users', variables.id])
        queryClient.invalidateQueries(['vmStats'])
        queryClient.invalidateQueries(['myVMs'])
        success('VM assigned successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to assign VM')
      }
    }
  )

  // Unassign VM from users mutation
  const unassignVMMutation = useMutation(
    ({ id, userIds }) => userIds ? vmService.unassignUsers(id, userIds) : vmService.unassignAll(id),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['vms'])
        queryClient.invalidateQueries(['vm', variables.id])
        queryClient.invalidateQueries(['vm-assigned-users', variables.id])
        queryClient.invalidateQueries(['vmStats'])
        queryClient.invalidateQueries(['myVMs'])
        success('VM unassigned successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to unassign VM')
      }
    }
  )

  // Set credentials mutation
  const setCredentialsMutation = useMutation(
    ({ vmId, ...credentials }) => vmService.setVMCredentials(vmId, credentials),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['vm'])
        success('VM credentials updated successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to update VM credentials')
      }
    }
  )

  // Get credentials mutation
  const getCredentialsMutation = useMutation(
    (id) => vmService.getVMCredentials(id),
    {
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to get VM credentials')
      }
    }
  )

  // Test credentials mutation  
  const testCredentialsMutation = useMutation(
    ({ vmId, ...credentials }) => vmService.testVMCredentials(vmId, credentials),
    {
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to test VM credentials')
      }
    }
  )

  // Test connectivity mutation
  const testConnectivityMutation = useMutation(
    (id) => vmService.testVMConnectivity(id),
    {
      onSuccess: (data) => {
        if (data.connectivity.isConnectable) {
          success('VM is reachable')
        } else {
          error(`VM connectivity test failed: ${data.connectivity.error}`)
        }
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to test VM connectivity')
      }
    }
  )

  return {
    // Queries
    vms: vmsQuery.data?.vms || [],
    pagination: vmsQuery.data?.pagination,
    isLoading: vmsQuery.isLoading,
    isError: vmsQuery.isError,
    error: vmsQuery.error,
    refetch: vmsQuery.refetch,

    // VM stats
    vmStats: vmStatsQuery.data?.stats,
    statsLoading: vmStatsQuery.isLoading,

    // User VMs
    myVMs: myVMsQuery.data?.vms || [],
    myVMsLoading: myVMsQuery.isLoading,

    // Individual VM
    useVM,
    useVMAssignedUsers,

    // Mutations
    createVM: createVMMutation.mutate,
    updateVM: updateVMMutation.mutate,
    deleteVM: deleteVMMutation.mutate,
    assignVM: assignVMMutation.mutate,
    unassignVM: unassignVMMutation.mutate,
    saveCredentials: setCredentialsMutation.mutate,
    getCredentials: getCredentialsMutation.mutateAsync,
    testCredentials: testCredentialsMutation.mutateAsync,
    testConnectivity: testConnectivityMutation.mutate,

    // Mutation states
    isCreating: createVMMutation.isLoading,
    isUpdating: updateVMMutation.isLoading,
    isDeleting: deleteVMMutation.isLoading,
    isAssigning: assignVMMutation.isLoading,
    isUnassigning: unassignVMMutation.isLoading,
    isSettingCredentials: setCredentialsMutation.isLoading,
    isGettingCredentials: getCredentialsMutation.isLoading,
    isTestingCredentials: testCredentialsMutation.isLoading,
    isTesting: testConnectivityMutation.isLoading
  }
}
