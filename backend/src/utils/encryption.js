const crypto = require('crypto')
const logger = require('./logger')

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const TAG_LENGTH = 16

// Get encryption key from environment
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must be exactly ${KEY_LENGTH} characters long`)
  }
  
  return Buffer.from(key, 'utf8')
}

// Encrypt sensitive data
const encrypt = (text) => {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Text to encrypt must be a non-empty string')
    }

    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipher(ALGORITHM, key)
    cipher.setAAD(Buffer.from('secure-vm-portal', 'utf8'))

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    // Combine IV, tag, and encrypted data
    const result = iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted
    
    return result
  } catch (error) {
    logger.error('Encryption failed:', error)
    throw new Error('Failed to encrypt data')
  }
}

// Decrypt sensitive data
const decrypt = (encryptedData) => {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Encrypted data must be a non-empty string')
    }

    const parts = encryptedData.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format')
    }

    const key = getEncryptionKey()
    const iv = Buffer.from(parts[0], 'hex')
    const tag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]

    const decipher = crypto.createDecipher(ALGORITHM, key)
    decipher.setAAD(Buffer.from('secure-vm-portal', 'utf8'))
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    logger.error('Decryption failed:', error)
    throw new Error('Failed to decrypt data')
  }
}

// Hash passwords (one-way)
const hashPassword = (password, salt = null) => {
  try {
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex')
    }
    
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
    return { hash, salt }
  } catch (error) {
    logger.error('Password hashing failed:', error)
    throw new Error('Failed to hash password')
  }
}

// Verify password
const verifyPassword = (password, hash, salt) => {
  try {
    const { hash: newHash } = hashPassword(password, salt)
    return hash === newHash
  } catch (error) {
    logger.error('Password verification failed:', error)
    return false
  }
}

// Generate secure random token
const generateSecureToken = (length = 32) => {
  try {
    return crypto.randomBytes(length).toString('hex')
  } catch (error) {
    logger.error('Token generation failed:', error)
    throw new Error('Failed to generate secure token')
  }
}

// Generate API key
const generateAPIKey = () => {
  try {
    const timestamp = Date.now().toString(36)
    const randomPart = crypto.randomBytes(16).toString('hex')
    return `svp_${timestamp}_${randomPart}`
  } catch (error) {
    logger.error('API key generation failed:', error)
    throw new Error('Failed to generate API key')
  }
}

// Encrypt VM credentials specifically
const encryptVMCredentials = (credentials) => {
  try {
    const credentialsString = JSON.stringify(credentials)
    return encrypt(credentialsString)
  } catch (error) {
    logger.error('VM credentials encryption failed:', error)
    throw new Error('Failed to encrypt VM credentials')
  }
}

// Decrypt VM credentials specifically
const decryptVMCredentials = (encryptedCredentials) => {
  try {
    const credentialsString = decrypt(encryptedCredentials)
    return JSON.parse(credentialsString)
  } catch (error) {
    logger.error('VM credentials decryption failed:', error)
    throw new Error('Failed to decrypt VM credentials')
  }
}

// Create HMAC signature for data integrity
const createSignature = (data, secret = null) => {
  try {
    const key = secret || process.env.JWT_SECRET
    if (!key) {
      throw new Error('Secret key is required for signature')
    }
    
    const hmac = crypto.createHmac('sha256', key)
    hmac.update(typeof data === 'string' ? data : JSON.stringify(data))
    return hmac.digest('hex')
  } catch (error) {
    logger.error('Signature creation failed:', error)
    throw new Error('Failed to create signature')
  }
}

// Verify HMAC signature
const verifySignature = (data, signature, secret = null) => {
  try {
    const expectedSignature = createSignature(data, secret)
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch (error) {
    logger.error('Signature verification failed:', error)
    return false
  }
}

module.exports = {
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  generateSecureToken,
  generateAPIKey,
  encryptVMCredentials,
  decryptVMCredentials,
  createSignature,
  verifySignature
}
