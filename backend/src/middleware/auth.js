const AuthService = require('../services/authService')
const TokenService = require('../services/tokenService')
const logger = require('../utils/logger')
const { getClientIP } = require('../utils/helpers')

// Authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'MISSING_ACCESS_TOKEN'
      })
    }

    const verification = await AuthService.verifyToken(token)

    if (!verification.isValid) {
      logger.debug('Token verification failed:', {
        error: verification.error,
        ip: getClientIP(req)
      })

      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_ACCESS_TOKEN'
      })
    }

    // Attach user and token to request
    req.user = verification.user
    req.token = token
    req.tokenData = verification.decoded

    next()
  } catch (error) {
    logger.error('Authentication middleware error:', error)
    res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTHENTICATION_ERROR'
    })
  }
}

// Authenticate API token
const authenticateApiToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        error: 'API token required',
        code: 'MISSING_API_TOKEN'
      })
    }

    const verification = await TokenService.verifyApiToken(token)

    if (!verification.isValid) {
      return res.status(401).json({
        error: 'Invalid or expired API token',
        code: 'INVALID_API_TOKEN'
      })
    }

    // Update token last used
    await TokenService.updateTokenLastUsed(verification.tokenData.tokenId)

    // Attach token data to request
    req.apiToken = verification.tokenData
    req.token = token

    next()
  } catch (error) {
    logger.error('API token authentication error:', error)
    res.status(500).json({
      error: 'API authentication failed',
      code: 'API_AUTHENTICATION_ERROR'
    })
  }
}

// Optional authentication (don't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (token) {
      const verification = await AuthService.verifyToken(token)
      if (verification.isValid) {
        req.user = verification.user
        req.token = token
        req.tokenData = verification.decoded
      }
    }

    next()
  } catch (error) {
    // Don't fail on optional auth errors
    logger.debug('Optional auth failed:', error)
    next()
  }
}

module.exports = {
  authenticateToken,
  authenticateApiToken,
  optionalAuth
}
