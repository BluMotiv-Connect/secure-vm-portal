import React, { createContext, useContext, useReducer } from 'react'
import { toast } from 'react-hot-toast'

const NotificationContext = createContext()

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
}

// Notification reducer
const notificationReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      }
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      }
    
    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: []
      }
    
    case 'MARK_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        )
      }
    
    default:
      return state
  }
}

const initialState = {
  notifications: []
}

export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState)

  const addNotification = (notification) => {
    const id = Date.now() + Math.random()
    const newNotification = {
      id,
      timestamp: new Date(),
      read: false,
      ...notification
    }

    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: newNotification
    })

    // Show toast notification
    switch (notification.type) {
      case NOTIFICATION_TYPES.SUCCESS:
        toast.success(notification.message)
        break
      case NOTIFICATION_TYPES.ERROR:
        toast.error(notification.message)
        break
      case NOTIFICATION_TYPES.WARNING:
        toast(notification.message, { icon: '⚠️' })
        break
      case NOTIFICATION_TYPES.INFO:
        toast(notification.message, { icon: 'ℹ️' })
        break
      default:
        toast(notification.message)
    }

    return id
  }

  const removeNotification = (id) => {
    dispatch({
      type: 'REMOVE_NOTIFICATION',
      payload: id
    })
  }

  const clearNotifications = () => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' })
  }

  const markAsRead = (id) => {
    dispatch({
      type: 'MARK_AS_READ',
      payload: id
    })
  }

  // Convenience methods
  const success = (message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.SUCCESS,
      message,
      ...options
    })
  }

  const error = (message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.ERROR,
      message,
      ...options
    })
  }

  const warning = (message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.WARNING,
      message,
      ...options
    })
  }

  const info = (message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.INFO,
      message,
      ...options
    })
  }

  const value = {
    notifications: state.notifications,
    unreadCount: state.notifications.filter(n => !n.read).length,
    addNotification,
    removeNotification,
    clearNotifications,
    markAsRead,
    success,
    error,
    warning,
    info
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
