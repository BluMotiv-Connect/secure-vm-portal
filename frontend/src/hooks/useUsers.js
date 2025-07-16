import { useQuery, useMutation, useQueryClient } from 'react-query'
import { userService } from '@services/userService'
import { useNotifications } from '@contexts/NotificationContext'

export const useUsers = (params = {}) => {
  const queryClient = useQueryClient()
  const { success, error } = useNotifications()

  // Get users query
  const usersQuery = useQuery(
    ['users', params],
    () => userService.getUsers(params),
    {
      keepPreviousData: true,
      staleTime: 30000, // 30 seconds
    }
  )

  // Get user by ID query
  const useUser = (id) => {
    return useQuery(
      ['user', id],
      () => userService.getUserById(id),
      {
        enabled: !!id,
        staleTime: 60000, // 1 minute
      }
    )
  }

  // Get user stats query
  const userStatsQuery = useQuery(
    ['userStats'],
    () => userService.getUserStats(),
    {
      staleTime: 300000, // 5 minutes
    }
  )

  // Create user mutation
  const createUserMutation = useMutation(
    (userData) => userService.createUser(userData),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['users'])
        queryClient.invalidateQueries(['userStats'])
        success('User created successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to create user')
      }
    }
  )

  // Update user mutation
  const updateUserMutation = useMutation(
    ({ id, userData }) => userService.updateUser(id, userData),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['users'])
        queryClient.invalidateQueries(['user', variables.id])
        queryClient.invalidateQueries(['userStats'])
        success('User updated successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to update user')
      }
    }
  )

  // Delete user mutation
  const deleteUserMutation = useMutation(
    (id) => userService.deleteUser(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['users'])
        queryClient.invalidateQueries(['userStats'])
        success('User deleted successfully')
      },
      onError: (err) => {
        const errorMessage = err.response?.data?.error
        const errorDetails = err.response?.data?.details

        // Handle specific error cases
        if (errorMessage?.includes('active sessions')) {
          error('Cannot delete user with active sessions. Please end all active sessions first.')
        } else if (errorMessage?.includes('assigned VMs')) {
          error('Cannot delete user with assigned VMs. Please unassign all VMs first.')
        } else if (errorMessage?.includes('temporary connections')) {
          error('Cannot delete user with active connections. Please wait for connections to close or force close them.')
        } else if (errorMessage?.includes('Cannot delete your own account')) {
          error('You cannot delete your own account.')
        } else {
          error(errorMessage || 'Failed to delete user')
        }

        // Log detailed error for debugging
        if (errorDetails) {
          console.error('Delete user error details:', errorDetails)
        }
      }
    }
  )

  // Restore user mutation
  const restoreUserMutation = useMutation(
    (id) => userService.restoreUser(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['users'])
        queryClient.invalidateQueries(['userStats'])
        success('User restored successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to restore user')
      }
    }
  )

  // Bulk update mutation
  const bulkUpdateMutation = useMutation(
    ({ userIds, updates }) => userService.bulkUpdateUsers(userIds, updates),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['users'])
        queryClient.invalidateQueries(['userStats'])
        success('Users updated successfully')
      },
      onError: (err) => {
        error(err.response?.data?.error || 'Failed to update users')
      }
    }
  )

  return {
    // Queries
    users: usersQuery.data?.users || [],
    pagination: usersQuery.data?.pagination,
    isLoading: usersQuery.isLoading,
    isError: usersQuery.isError,
    error: usersQuery.error,
    refetch: usersQuery.refetch,

    // User stats
    userStats: userStatsQuery.data?.stats,
    statsLoading: userStatsQuery.isLoading,

    // Individual user
    useUser,

    // Mutations
    createUser: createUserMutation.mutate,
    updateUser: updateUserMutation.mutate,
    deleteUser: deleteUserMutation.mutate,
    restoreUser: restoreUserMutation.mutate,
    bulkUpdate: bulkUpdateMutation.mutate,

    // Mutation states
    isCreating: createUserMutation.isLoading,
    isUpdating: updateUserMutation.isLoading,
    isDeleting: deleteUserMutation.isLoading,
    isRestoring: restoreUserMutation.isLoading,
    isBulkUpdating: bulkUpdateMutation.isLoading
  }
}
