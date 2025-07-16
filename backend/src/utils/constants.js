// Application constants
const APP_CONSTANTS = {
  NAME: 'Secure VM Portal',
  VERSION: '1.0.0',
  DESCRIPTION: 'Secure Virtual Machine Work Logging Portal'
}

// User roles
const USER_ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee'
}

// VM status constants
const VM_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  MAINTENANCE: 'maintenance',
  ERROR: 'error'
}

// Operating system types
const OS_TYPES = {
  WINDOWS: 'windows',
  LINUX: 'linux',
  MACOS: 'macos'
}

// Session status constants
const SESSION_STATUS = {
  ACTIVE: 'active',
  ENDED: 'ended',
  TIMEOUT: 'timeout',
  ERROR: 'error'
}

// Connection types
const CONNECTION_TYPES = {
  RDP: 'rdp',
  SSH: 'ssh',
  VNC: 'vnc'
}

// Work log types
const WORK_LOG_TYPES = {
  WORK: 'work',
  BREAK: 'break',
  MEETING: 'meeting',
  TRAINING: 'training',
  OTHER: 'other'
}

// API constants
const API_CONSTANTS = {
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100
  },
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  },
  FILE_UPLOAD: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf']
  }
}

// Database constants
const DB_CONSTANTS = {
  TABLES: {
    USERS: 'users',
    VIRTUAL_MACHINES: 'virtual_machines',
    VM_CREDENTIALS: 'vm_credentials',
    SESSIONS: 'sessions',
    WORK_LOGS: 'work_logs',
    NON_WORK_LOGS: 'non_work_logs',
    AUDIT_LOGS: 'audit_logs'
  },
  INDEXES: {
    USERS_AZURE_ID: 'idx_users_azure_id',
    USERS_EMAIL: 'idx_users_email',
    VMS_ASSIGNED_TO: 'idx_vms_assigned_to',
    SESSIONS_USER_ID: 'idx_sessions_user_id',
    WORK_LOGS_USER_ID: 'idx_work_logs_user_id'
  }
}

// Error codes
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
}

// Time constants
const TIME_CONSTANTS = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000
}

// Validation patterns
const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  IP_ADDRESS: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
}

// Export all constants
module.exports = {
  APP_CONSTANTS,
  USER_ROLES,
  VM_STATUS,
  OS_TYPES,
  SESSION_STATUS,
  CONNECTION_TYPES,
  WORK_LOG_TYPES,
  API_CONSTANTS,
  DB_CONSTANTS,
  ERROR_CODES,
  TIME_CONSTANTS,
  VALIDATION_PATTERNS
}
