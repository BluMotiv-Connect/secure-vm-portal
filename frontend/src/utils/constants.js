// Application constants
export const APP_NAME = 'Secure VM Portal'
export const APP_VERSION = '1.0.0'

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee'
}

// VM status
export const VM_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  MAINTENANCE: 'maintenance',
  ERROR: 'error'
}

// Connection types
export const CONNECTION_TYPES = {
  RDP: 'rdp',
  SSH: 'ssh',
  VNC: 'vnc'
}

// Session status
export const SESSION_STATUS = {
  ACTIVE: 'active',
  ENDED: 'ended',
  TIMEOUT: 'timeout',
  ERROR: 'error'
}

// Work log types
export const WORK_LOG_TYPES = {
  WORK: 'work',
  BREAK: 'break',
  MEETING: 'meeting',
  TRAINING: 'training',
  OTHER: 'other'
}

// Theme constants
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark'
}

// API endpoints
export const API_ENDPOINTS = {
  AUTH: '/auth',
  USERS: '/users',
  VMS: '/vms',
  SESSIONS: '/sessions',
  WORK_LOGS: '/work-logs',
  REPORTS: '/reports'
}

// Local storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebarCollapsed',
  USER_PREFERENCES: 'userPreferences'
}

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100]
}

// File upload
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf']
}

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy HH:mm',
  ISO: 'yyyy-MM-dd',
  TIME: 'HH:mm:ss'
}

// Validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  IP_ADDRESS: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
}

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'An internal server error occurred.',
  VALIDATION_ERROR: 'Please check your input and try again.'
}

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Welcome back!',
  LOGOUT: 'Logged out successfully',
  SAVE: 'Changes saved successfully',
  DELETE: 'Item deleted successfully',
  UPDATE: 'Updated successfully'
}
