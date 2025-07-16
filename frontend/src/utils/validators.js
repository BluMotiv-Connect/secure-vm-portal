import { VALIDATION_PATTERNS } from './constants'

// Basic validation functions
export const isRequired = (value) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

export const isEmail = (email) => {
  if (!email) return false
  return VALIDATION_PATTERNS.EMAIL.test(email)
}

export const isPhoneNumber = (phone) => {
  if (!phone) return false
  return VALIDATION_PATTERNS.PHONE.test(phone)
}

export const isIPAddress = (ip) => {
  if (!ip) return false
  return VALIDATION_PATTERNS.IP_ADDRESS.test(ip)
}

export const isUrl = (url) => {
  if (!url) return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Length validations
export const minLength = (value, min) => {
  if (!value) return false
  return value.toString().length >= min
}

export const maxLength = (value, max) => {
  if (!value) return true
  return value.toString().length <= max
}

export const exactLength = (value, length) => {
  if (!value) return false
  return value.toString().length === length
}

// Number validations
export const isNumber = (value) => {
  return !isNaN(value) && !isNaN(parseFloat(value))
}

export const isInteger = (value) => {
  return Number.isInteger(Number(value))
}

export const minValue = (value, min) => {
  if (!isNumber(value)) return false
  return Number(value) >= min
}

export const maxValue = (value, max) => {
  if (!isNumber(value)) return false
  return Number(value) <= max
}

export const isPositive = (value) => {
  if (!isNumber(value)) return false
  return Number(value) > 0
}

export const isNegative = (value) => {
  if (!isNumber(value)) return false
  return Number(value) < 0
}

// Date validations
export const isValidDate = (date) => {
  if (!date) return false
  const dateObj = new Date(date)
  return dateObj instanceof Date && !isNaN(dateObj)
}

export const isAfterDate = (date, afterDate) => {
  if (!isValidDate(date) || !isValidDate(afterDate)) return false
  return new Date(date) > new Date(afterDate)
}

export const isBeforeDate = (date, beforeDate) => {
  if (!isValidDate(date) || !isValidDate(beforeDate)) return false
  return new Date(date) < new Date(beforeDate)
}

export const isFutureDate = (date) => {
  if (!isValidDate(date)) return false
  return new Date(date) > new Date()
}

export const isPastDate = (date) => {
  if (!isValidDate(date)) return false
  return new Date(date) < new Date()
}

// String pattern validations
export const isAlphabetic = (value) => {
  if (!value) return false
  return /^[a-zA-Z]+$/.test(value)
}

export const isAlphanumeric = (value) => {
  if (!value) return false
  return /^[a-zA-Z0-9]+$/.test(value)
}

export const isNumeric = (value) => {
  if (!value) return false
  return /^[0-9]+$/.test(value)
}

export const containsUppercase = (value) => {
  if (!value) return false
  return /[A-Z]/.test(value)
}

export const containsLowercase = (value) => {
  if (!value) return false
  return /[a-z]/.test(value)
}

export const containsNumber = (value) => {
  if (!value) return false
  return /\d/.test(value)
}

export const containsSpecialChar = (value) => {
  if (!value) return false
  return /[!@#$%^&*(),.?":{}|<>]/.test(value)
}

// Password validation
export const isStrongPassword = (password) => {
  if (!password) return false
  
  return (
    minLength(password, 8) &&
    containsUppercase(password) &&
    containsLowercase(password) &&
    containsNumber(password) &&
    containsSpecialChar(password)
  )
}

// File validation
export const isValidFileType = (file, allowedTypes) => {
  if (!file || !allowedTypes) return false
  return allowedTypes.includes(file.type)
}

export const isValidFileSize = (file, maxSize) => {
  if (!file || !maxSize) return false
  return file.size <= maxSize
}

// Array validations
export const isArray = (value) => {
  return Array.isArray(value)
}

export const isNonEmptyArray = (value) => {
  return Array.isArray(value) && value.length > 0
}

export const arrayMinLength = (value, min) => {
  if (!Array.isArray(value)) return false
  return value.length >= min
}

export const arrayMaxLength = (value, max) => {
  if (!Array.isArray(value)) return false
  return value.length <= max
}

// Object validations
export const isObject = (value) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export const hasProperty = (obj, property) => {
  return isObject(obj) && obj.hasOwnProperty(property)
}

// Custom validation builder
export const createValidator = (rules) => {
  return (value) => {
    const errors = []
    
    for (const rule of rules) {
      const { validator, message, condition } = rule
      
      // Skip validation if condition is not met
      if (condition && !condition(value)) continue
      
      if (!validator(value)) {
        errors.push(message)
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Form validation helper
export const validateForm = (data, schema) => {
  const errors = {}
  let isValid = true
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field]
    const fieldErrors = []
    
    for (const rule of rules) {
      const { validator, message, condition } = rule
      
      // Skip validation if condition is not met
      if (condition && !condition(value, data)) continue
      
      if (!validator(value)) {
        fieldErrors.push(message)
        isValid = false
      }
    }
    
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors
    }
  }
  
  return {
    isValid,
    errors
  }
}

// Common validation schemas
export const commonSchemas = {
  email: [
    { validator: isRequired, message: 'Email is required' },
    { validator: isEmail, message: 'Please enter a valid email address' }
  ],
  
  password: [
    { validator: isRequired, message: 'Password is required' },
    { validator: (value) => minLength(value, 8), message: 'Password must be at least 8 characters long' },
    { validator: containsUppercase, message: 'Password must contain at least one uppercase letter' },
    { validator: containsLowercase, message: 'Password must contain at least one lowercase letter' },
    { validator: containsNumber, message: 'Password must contain at least one number' },
    { validator: containsSpecialChar, message: 'Password must contain at least one special character' }
  ],
  
  name: [
    { validator: isRequired, message: 'Name is required' },
    { validator: (value) => minLength(value, 2), message: 'Name must be at least 2 characters long' },
    { validator: (value) => maxLength(value, 100), message: 'Name must not exceed 100 characters' }
  ],
  
  phone: [
    { validator: isRequired, message: 'Phone number is required' },
    { validator: isPhoneNumber, message: 'Please enter a valid phone number' }
  ],
  
  ipAddress: [
    { validator: isRequired, message: 'IP address is required' },
    { validator: isIPAddress, message: 'Please enter a valid IP address' }
  ]
}

