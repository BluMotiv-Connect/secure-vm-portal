const crypto = require('crypto')
const logger = require('../utils/logger')

// Security configuration
const SECURITY_CONFIG = {
  ENCRYPTION: {
    ALGORITHM: 'aes-256-gcm',
    KEY_LENGTH: 32,
    IV_LENGTH: 16,
    TAG_LENGTH: 16,
    SALT_LENGTH: 32
  },
  JWT: {
    ALGORITHM: 'HS256',
    EXPIRES_IN: '8h',
    REFRESH_EXPIRES_IN: '7d'
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: true,
    SALT_ROUNDS: 12
  },
  SESSION: {
    MAX_DURATION: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
    CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour in milliseconds
    MAX_CONCURRENT: 3
  }
}

// Generate encryption key from environment variable
const getEncryptionKey = () => {
  const keyString = process.env.ENCRYPTION_KEY
  if (!keyString) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  
  if (keyString.length < 32) {
    // Derive key using PBKDF2 if provided key is too short
    return crypto.pbkdf2Sync(keyString, 'secure-vm-portal-salt', 100000, 32, 'sha256')
  }
  
  return Buffer.from(keyString.substring(0, 32), 'utf8')
}

// Encrypt sensitive data
const encrypt = (text) => {
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(SECURITY_CONFIG.ENCRYPTION.IV_LENGTH)
    const cipher = crypto.createCipheriv(SECURITY_CONFIG.ENCRYPTION.ALGORITHM, key, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    // Combine iv, tag, and encrypted data
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted
  } catch (error) {
    logger.error('Encryption failed:', error)
    throw new Error('Failed to encrypt data')
  }
}

// Decrypt sensitive data
const decrypt = (encryptedData) => {
  try {
    const key = getEncryptionKey()
    const parts = encryptedData.split(':')
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format')
    }
    
    const iv = Buffer.from(parts[0], 'hex')
    const tag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]
    
    const decipher = crypto.createDecipheriv(SECURITY_CONFIG.ENCRYPTION.ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    logger.error('Decryption failed:', error)
    throw new Error('Failed to decrypt data')
  }
}

// Generate secure random string
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex')
}

// Hash password
const hashPassword = async (password) => {
  const bcrypt = require('bcryptjs')
  return await bcrypt.hash(password, SECURITY_CONFIG.PASSWORD.SALT_ROUNDS)
}

// Verify password
const verifyPassword = async (password, hash) => {
  const bcrypt = require('bcryptjs')
  return await bcrypt.compare(password, hash)
}

// Validate password strength
const validatePassword = (password) => {
  const errors = []
  
  if (password.length < SECURITY_CONFIG.PASSWORD.MIN_LENGTH) {
    errors.push(`Password must be at least ${SECURITY_CONFIG.PASSWORD.MIN_LENGTH} characters long`)
  }
  
  if (SECURITY_CONFIG.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (SECURITY_CONFIG.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (SECURITY_CONFIG.PASSWORD.REQUIRE_NUMBERS && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (SECURITY_CONFIG.PASSWORD.REQUIRE_SYMBOLS && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Sanitize input to prevent XSS
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

module.exports = {
  SECURITY_CONFIG,
  encrypt,
  decrypt,
  generateSecureToken,
  hashPassword,
  verifyPassword,
  validatePassword,
  sanitizeInput
}
