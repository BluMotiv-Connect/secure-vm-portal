import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiClient } from '@services/apiClient'
import { useAuth } from './useAuth'
import { useNotifications } from '@contexts/NotificationContext'

export const useApi = () => {
  const { logout } = useAuth()
  const { error: showError } = useNotifications()
  const queryClient = useQueryClient()

  // Generic GET hook
  const useGet = (key, url, options = {}) => {
    return useQuery(
      key,
      () => apiClient.get(url),
      {
        onError: (error) => {
          if (error.response?.status === 401) {
            logout()
          } else if (!options.silent) {
            showError(error.response?.data?.error || 'An error occurred')
          }
        },
        ...options
      }
    )
  }

  // Generic POST hook
  const usePost = (options = {}) => {
    return useMutation(
      ({ url, data }) => apiClient.post(url, data),
      {
        onError: (error) => {
          if (error.response?.status === 401) {
            logout()
          } else if (!options.silent) {
            showError(error.response?.data?.error || 'An error occurred')
          }
        },
        onSuccess: (data, variables) => {
          // Invalidate related queries
          if (options.invalidateQueries) {
            options.invalidateQueries.forEach(key => {
              queryClient.invalidateQueries(key)
            })
          }
        },
        ...options
      }
    )
  }

  // Generic PUT hook
  const usePut = (options = {}) => {
    return useMutation(
      ({ url, data }) => apiClient.put(url, data),
      {
        onError: (error) => {
          if (error.response?.status === 401) {
            logout()
          } else if (!options.silent) {
            showError(error.response?.data?.error || 'An error occurred')
          }
        },
        onSuccess: (data, variables) => {
          if (options.invalidateQueries) {
            options.invalidateQueries.forEach(key => {
              queryClient.invalidateQueries(key)
            })
          }
        },
        ...options
      }
    )
  }

  // Generic DELETE hook
  const useDelete = (options = {}) => {
    return useMutation(
      (url) => apiClient.delete(url),
      {
        onError: (error) => {
          if (error.response?.status === 401) {
            logout()
          } else if (!options.silent) {
            showError(error.response?.data?.error || 'An error occurred')
          }
        },
        onSuccess: (data, variables) => {
          if (options.invalidateQueries) {
            options.invalidateQueries.forEach(key => {
              queryClient.invalidateQueries(key)
            })
          }
        },
        ...options
      }
    )
  }

  return {
    useGet,
    usePost,
    usePut,
    useDelete,
    queryClient
  }
}
