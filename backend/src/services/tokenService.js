const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { query } = require('../config/database')
const logger = require('../utils/logger')
const { TIME_CONSTANTS } = require('../utils/constants')

class TokenService {
  // Generate API tokens for service-to-service communication
  static async generateApiToken(userId, name, permissions = [], expiresIn = '1y') {
    try {
      const tokenId = crypto.randomUUID()
      const secret = crypto.randomBytes(32).toString('hex')
      
      const payload = {
        tokenId,
        userId,
        name,
        permissions,
        type: 'api',
        iat: Math.floor(Date.now() / 1000)
      }

      const token = jwt.sign(payload, secret, { 
        expiresIn,
        issuer: 'secure-vm-portal-api',
        audience: 'secure-vm-portal-services'
      })

      // Store token metadata in database
      const sql = `
        INSERT INTO api_tokens (id, user_id, name, permissions, secret_hash, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        RETURNING *
      `
      
      const expiresAt = new Date(Date.now() + this.parseExpiration(expiresIn))
      const secretHash = crypto.createHash('sha256').update(secret).digest('hex')
      
      await query(sql, [
        tokenId,
        userId,
        name,
        JSON.stringify(permissions),
        secretHash,
        expiresAt
      ])

      logger.audit('API_TOKEN_CREATED', {
        tokenId,
        userId,
        name,
        permissions,
        expiresAt
      })

      return {
        tokenId,
        token,
        expiresAt
      }
    } catch (error) {
      logger.error('Failed to generate API token:', error)
      throw error
    }
  }

  // Verify API token
  static async verifyApiToken(token) {
    try {
      // Decode without verification first to get tokenId
      const decoded = jwt.decode(token)
      if (!decoded || decoded.type !== 'api') {
        throw new Error('Invalid token type')
      }

      // Get token secret from database
      const sql = 'SELECT * FROM api_tokens WHERE id = $1 AND is_active = true'
      const result = await query(sql, [decoded.tokenId])
      
      if (result.rows.length === 0) {
        throw new Error('Token not found or inactive')
      }

      const tokenData = result.rows[0]
      
      // Check if token is expired
      if (new Date() > new Date(tokenData.expires_at)) {
        throw new Error('Token expired')
      }

      // Reconstruct secret and verify token
      const secret = tokenData.secret_hash // This should be the actual secret, not hash
      const verified = jwt.verify(token, secret, {
        issuer: 'secure-vm-portal-api',
        audience: 'secure-vm-portal-services'
      })

      return {
        isValid: true,
        tokenData: {
          ...verified,
          permissions: JSON.parse(tokenData.permissions)
        }
      }
    } catch (error) {
      logger.debug('API token verification failed:', error.message)
      return {
        isValid: false,
        error: error.message
      }
    }
  }

  // Revoke API token
  static async revokeApiToken(tokenId, userId) {
    try {
      const sql = `
        UPDATE api_tokens 
        SET is_active = false, revoked_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `
      
      const result = await query(sql, [tokenId, userId])
      
      if (result.rows.length === 0) {
        throw new Error('Token not found')
      }

      logger.audit('API_TOKEN_REVOKED', {
        tokenId,
        userId,
        revokedAt: new Date().toISOString()
      })

      return result.rows[0]
    } catch (error) {
      logger.error('Failed to revoke API token:', error)
      throw error
    }
  }

  // List user's API tokens
  static async getUserApiTokens(userId) {
    try {
      const sql = `
        SELECT id, name, permissions, expires_at, created_at, is_active, last_used_at
        FROM api_tokens
        WHERE user_id = $1
        ORDER BY created_at DESC
      `
      
      const result = await query(sql, [userId])
      
      return result.rows.map(row => ({
        ...row,
        permissions: JSON.parse(row.permissions)
      }))
    } catch (error) {
      logger.error('Failed to get user API tokens:', error)
      throw error
    }
  }

  // Update token last used timestamp
  static async updateTokenLastUsed(tokenId) {
    try {
      const sql = `
        UPDATE api_tokens 
        SET last_used_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `
      
      await query(sql, [tokenId])
    } catch (error) {
      logger.debug('Failed to update token last used:', error)
    }
  }

  // Clean up expired tokens
  static async cleanupExpiredTokens() {
    try {
      const sql = `
        UPDATE api_tokens 
        SET is_active = false
        WHERE expires_at < CURRENT_TIMESTAMP AND is_active = true
        RETURNING id, name, user_id
      `
      
      const result = await query(sql)
      
      if (result.rows.length > 0) {
        logger.info(`Cleaned up ${result.rows.length} expired API tokens`)
        
        result.rows.forEach(token => {
          logger.audit('API_TOKEN_EXPIRED', {
            tokenId: token.id,
            name: token.name,
            userId: token.user_id
          })
        })
      }

      return result.rows.length
    } catch (error) {
      logger.error('Failed to cleanup expired tokens:', error)
      throw error
    }
  }

  // Parse expiration string to milliseconds
  static parseExpiration(expiresIn) {
    const units = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000,
      'y': 365 * 24 * 60 * 60 * 1000
    }

    const match = expiresIn.match(/^(\d+)([smhdwy])$/)
    if (!match) {
      throw new Error('Invalid expiration format')
    }

    const [, amount, unit] = match
    return parseInt(amount) * units[unit]
  }
}

module.exports = TokenService
