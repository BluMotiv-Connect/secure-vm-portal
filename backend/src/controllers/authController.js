const AuthService = require('../services/authService')
const TokenService = require('../services/tokenService')
const User = require('../models/User')
const logger = require('../utils/logger')
const { getClientIP, maskSensitiveData } = require('../utils/helpers')

class AuthController {
  // Authenticate with Azure AD token
  static async authenticateAzure(req, res) {
    try {
      const { azureToken } = req.body

      if (!azureToken) {
        return res.status(400).json({
          error: 'Azure AD token is required',
          code: 'MISSING_AZURE_TOKEN'
        })
      }

      const result = await AuthService.authenticateWithAzure(azureToken)

      // Set secure HTTP-only cookie for refresh token
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      })

      logger.audit('AUTHENTICATION_SUCCESS', {
        userId: result.user.id,
        email: result.user.email,
        ip: getClientIP(req),
        userAgent: req.get('User-Agent')
      })

      res.json({
        success: true,
        user: result.user,
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn,
        tokenType: result.tokens.tokenType
      })
    } catch (error) {
      logger.error('Azure authentication failed:', {
        error: error.message,
        ip: getClientIP(req),
        userAgent: req.get('User-Agent')
      })

      const statusCode = error.message.includes('Invalid') ? 401 : 500
      res.status(statusCode).json({
        error: error.message,
        code: 'AUTHENTICATION_FAILED'
      })
    }
  }

  // Refresh access token
  static async refreshToken(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken

      if (!refreshToken) {
        return res.status(401).json({
          error: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN'
        })
      }

      const result = await AuthService.refreshToken(refreshToken)

      // Update refresh token cookie
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      })

      logger.audit('TOKEN_REFRESH_SUCCESS', {
        userId: result.user.id,
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        user: result.user,
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn,
        tokenType: result.tokens.tokenType
      })
    } catch (error) {
      logger.error('Token refresh failed:', {
        error: error.message,
        ip: getClientIP(req)
      })

      // Clear invalid refresh token cookie
      res.clearCookie('refreshToken')

      res.status(401).json({
        error: error.message,
        code: 'TOKEN_REFRESH_FAILED'
      })
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      const user = req.user

      // Get additional user data
      const assignedVMs = await user.getAssignedVMs()
      const activeSessions = await user.getActiveSessions()

      res.json({
        success: true,
        user: user.toJSON(),
        assignedVMs: assignedVMs.length,
        activeSessions: activeSessions.length,
        lastLogin: user.lastLogin
      })
    } catch (error) {
      logger.error('Failed to get user profile:', error)
      res.status(500).json({
        error: 'Failed to get user profile',
        code: 'PROFILE_FETCH_FAILED'
      })
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const user = req.user
      const { name } = req.body

      // Only allow users to update their own name
      const updates = {}
      if (name && name.trim()) {
        updates.name = name.trim()
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: 'No valid fields to update',
          code: 'NO_UPDATES'
        })
      }

      await user.update(updates)

      logger.audit('PROFILE_UPDATED', {
        userId: user.id,
        updates: maskSensitiveData(updates),
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        user: user.toJSON(),
        message: 'Profile updated successfully'
      })
    } catch (error) {
      logger.error('Failed to update profile:', error)
      res.status(500).json({
        error: 'Failed to update profile',
        code: 'PROFILE_UPDATE_FAILED'
      })
    }
  }

  // Logout user
  static async logout(req, res) {
    try {
      const user = req.user

      await AuthService.logout(user.id, req.token)

      // Clear refresh token cookie
      res.clearCookie('refreshToken')

      logger.audit('USER_LOGOUT', {
        userId: user.id,
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        message: 'Logged out successfully'
      })
    } catch (error) {
      logger.error('Logout failed:', error)
      res.status(500).json({
        error: 'Logout failed',
        code: 'LOGOUT_FAILED'
      })
    }
  }

  // Generate API token
  static async generateApiToken(req, res) {
    try {
      const user = req.user
      const { name, permissions = [], expiresIn = '1y' } = req.body

      if (!name || !name.trim()) {
        return res.status(400).json({
          error: 'Token name is required',
          code: 'MISSING_TOKEN_NAME'
        })
      }

      const result = await TokenService.generateApiToken(
        user.id,
        name.trim(),
        permissions,
        expiresIn
      )

      logger.audit('API_TOKEN_GENERATED', {
        userId: user.id,
        tokenId: result.tokenId,
        name: name.trim(),
        permissions,
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        tokenId: result.tokenId,
        token: result.token,
        expiresAt: result.expiresAt,
        message: 'API token generated successfully'
      })
    } catch (error) {
      logger.error('Failed to generate API token:', error)
      res.status(500).json({
        error: 'Failed to generate API token',
        code: 'API_TOKEN_GENERATION_FAILED'
      })
    }
  }

  // Get user's API tokens
  static async getApiTokens(req, res) {
    try {
      const user = req.user
      const tokens = await TokenService.getUserApiTokens(user.id)

      res.json({
        success: true,
        tokens
      })
    } catch (error) {
      logger.error('Failed to get API tokens:', error)
      res.status(500).json({
        error: 'Failed to get API tokens',
        code: 'API_TOKENS_FETCH_FAILED'
      })
    }
  }

  // Revoke API token
  static async revokeApiToken(req, res) {
    try {
      const user = req.user
      const { tokenId } = req.params

      await TokenService.revokeApiToken(tokenId, user.id)

      logger.audit('API_TOKEN_REVOKED', {
        userId: user.id,
        tokenId,
        ip: getClientIP(req)
      })

      res.json({
        success: true,
        message: 'API token revoked successfully'
      })
    } catch (error) {
      logger.error('Failed to revoke API token:', error)
      res.status(500).json({
        error: 'Failed to revoke API token',
        code: 'API_TOKEN_REVOCATION_FAILED'
      })
    }
  }

  // Validate token (for internal use)
  static async validateToken(req, res) {
    try {
      const user = req.user

      res.json({
        success: true,
        valid: true,
        user: user.toSafeJSON()
      })
    } catch (error) {
      res.status(401).json({
        success: false,
        valid: false,
        error: 'Invalid token'
      })
    }
  }
}

module.exports = AuthController
