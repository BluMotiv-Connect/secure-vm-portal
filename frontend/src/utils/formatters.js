import { format, formatDistance, formatRelative, isValid, parseISO } from 'date-fns'

// Date formatting functions
export const formatDate = (date, formatString = 'MMM dd, yyyy') => {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  
  if (!isValid(dateObj)) return 'Invalid date'
  
  return format(dateObj, formatString)
}

export const formatDateTime = (date) => {
  return formatDate(date, 'MMM dd, yyyy HH:mm')
}

export const formatTime = (date) => {
  return formatDate(date, 'HH:mm:ss')
}

export const formatRelativeTime = (date) => {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  
  if (!isValid(dateObj)) return 'Invalid date'
  
  return formatRelative(dateObj, new Date())
}

export const formatTimeAgo = (date) => {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  
  if (!isValid(dateObj)) return 'Invalid date'
  
  return formatDistance(dateObj, new Date(), { addSuffix: true })
}

// Duration formatting
export const formatDuration = (minutes) => {
  if (!minutes || minutes < 0) return '0m'
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (hours === 0) {
    return `${remainingMinutes}m`
  } else if (remainingMinutes === 0) {
    return `${hours}h`
  } else {
    return `${hours}h ${remainingMinutes}m`
  }
}

export const formatDurationDetailed = (minutes) => {
  if (!minutes || minutes < 0) return '0 minutes'
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  const parts = []
  
  if (hours > 0) {
    parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`)
  }
  
  if (remainingMinutes > 0) {
    parts.push(`${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`)
  }
  
  return parts.join(' and ') || '0 minutes'
}

// Number formatting
export const formatNumber = (number, options = {}) => {
  if (number == null) return ''
  
  return new Intl.NumberFormat('en-US', options).format(number)
}

export const formatCurrency = (amount, currency = 'USD') => {
  return formatNumber(amount, {
    style: 'currency',
    currency
  })
}

export const formatPercentage = (value, decimals = 1) => {
  return formatNumber(value, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

// File size formatting
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Status formatting
export const formatStatus = (status) => {
  if (!status) return ''
  
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Phone number formatting
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return ''
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '')
  
  // Format as (XXX) XXX-XXXX for US numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  
  // Return original if not a standard format
  return phoneNumber
}

// IP address formatting
export const formatIPAddress = (ip) => {
  if (!ip) return ''
  
  // Basic validation and formatting
  const parts = ip.split('.')
  if (parts.length === 4 && parts.every(part => !isNaN(part) && part >= 0 && part <= 255)) {
    return parts.map(part => parseInt(part).toString()).join('.')
  }
  
  return ip
}

// Text formatting
export const formatCamelCase = (text) => {
  if (!text) return ''
  
  return text
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

export const formatSnakeCase = (text) => {
  if (!text) return ''
  
  return text
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
}

export const formatKebabCase = (text) => {
  if (!text) return ''
  
  return text
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
}

// Array formatting
export const formatList = (items, options = {}) => {
  if (!Array.isArray(items) || items.length === 0) return ''
  
  const { conjunction = 'and', limit = null } = options
  
  let displayItems = items
  if (limit && items.length > limit) {
    displayItems = items.slice(0, limit)
    displayItems.push(`and ${items.length - limit} more`)
  }
  
  if (displayItems.length === 1) {
    return displayItems[0]
  } else if (displayItems.length === 2) {
    return `${displayItems[0]} ${conjunction} ${displayItems[1]}`
  } else {
    const lastItem = displayItems.pop()
    return `${displayItems.join(', ')}, ${conjunction} ${lastItem}`
  }
}

// URL formatting
export const formatUrl = (url) => {
  if (!url) return ''
  
  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`
  }
  
  return url
}

// Mask sensitive data
export const maskEmail = (email) => {
  if (!email) return ''
  
  const [username, domain] = email.split('@')
  if (!domain) return email
  
  const maskedUsername = username.length > 2 
    ? username[0] + '*'.repeat(username.length - 2) + username[username.length - 1]
    : username
  
  return `${maskedUsername}@${domain}`
}

export const maskPhoneNumber = (phone) => {
  if (!phone) return ''
  
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length >= 10) {
    return `***-***-${cleaned.slice(-4)}`
  }
  
  return phone
}

export const maskCreditCard = (cardNumber) => {
  if (!cardNumber) return ''
  
  const cleaned = cardNumber.replace(/\D/g, '')
  if (cleaned.length >= 4) {
    return `****-****-****-${cleaned.slice(-4)}`
  }
  
  return cardNumber
}
