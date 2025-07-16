const jwt = require('jsonwebtoken')
const { validateTokenWithGraph, isUserAdmin } = require('../config/azure')
const User = require('../models/User')
const logger = require('../utils/logger')
const { generateSecureToken } = require('../config/security')
const { TIME_CONSTANTS } = require('../utils/constants')

class AuthService {
  // Validate Azure AD token and authenticate user
  static async authenticateWithAzure(azureToken) {
    try {
      // Validate token with Microsoft Graph
      const validation = await validateTokenWithGraph(azureToken)
      
      if (!validation.isValid) {
        throw new Error('Invalid Azure AD token')
      }

      const { userInfo } = validation

      // Find or create user in database
      let user = await User.findByAzureId(userInfo.azureId)
      
      if (!user) {
        // Create new user
        user = await User.create({
          name: userInfo.name,
          email: userInfo.email,
          azureId: userInfo.azureId,
          role: await this.determineUserRole(azureToken, userInfo)
        })
        
        logger.audit('NEW_USER_REGISTERED', {
          userId: user.id,
          email: user.email,
          azureId: user.azureId,
          source: 'azure_ad'
        })
      } else {
        // Update existing user info if needed
        const updates = {}
        if (user.name !== userInfo.name) updates.name = userInfo.name
        if (user.email !== userInfo.email) updates.email = userInfo.email
        
        if (Object.keys(updates).length > 0) {
          await user.update(updates)
        }
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('User account is deactivated')
      }

      // Update last login
      await user.updateLastLogin()

      // Generate JWT tokens
      const tokens = await this.generateTokens(user)

      logger.audit('USER_AUTHENTICATED', {
        userId: user.id,
        email: user.email,
        method: 'azure_ad',
        tokenGenerated: true
      })

      return {
        user: user.toJSON(),
        tokens
      }
    } catch (error) {
      logger.error('Azure authentication failed:', error)
      throw error
    }
  }

  // Determine user role based on Azure AD groups or email domain
  static async determineUserRole(azureToken, userInfo) {
    try {
      // Check if user is admin based on Azure AD groups
      const adminGroupIds = process.env.AZURE_ADMIN_GROUP_IDS?.split(',') || []
      
      if (adminGroupIds.length > 0) {
        const isAdmin = await isUserAdmin(azureToken, adminGroupIds)
        if (isAdmin) return 'admin'
      }

      // Fallback: Check by email domain
      const adminDomains = process.env.ADMIN_EMAIL_DOMAINS?.split(',') || []
      const userDomain = userInfo.email.split('@')[1]
      
      if (adminDomains.includes(userDomain)) {
        return 'admin'
      }

      // Default role
      return 'employee'
    } catch (error) {
      logger.error('Failed to determine user role:', error)
      return 'employee' // Default to employee on error
    }
  }

  // Generate JWT access and refresh tokens
  static async generateTokens(user) {
    try {
      const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        azureId: user.azureId,
        tokenType: 'access'
      }

      const accessToken = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { 
          expiresIn: process.env.JWT_EXPIRES_IN || '8h',
          issuer: 'secure-vm-portal',
          audience: 'secure-vm-portal-users'
        }
      )

      const refreshToken = jwt.sign(
        { 
          userId: user.id, 
          tokenType: 'refresh',
          tokenId: generateSecureToken(16)
        },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { 
          expiresIn: '7d',
          issuer: 'secure-vm-portal',
          audience: 'secure-vm-portal-users'
        }
      )

      // Store refresh token hash in database (optional - for token revocation)
      // await this.storeRefreshToken(user.id, refreshToken)

      return {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '8h',
        tokenType: 'Bearer'
      }
    } catch (error) {
      logger.error('Failed to generate tokens:', error)
      throw error
    }
  }

  // Verify JWT token
  static async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'secure-vm-portal',
        audience: 'secure-vm-portal-users'
      })

      if (decoded.tokenType !== 'access') {
        throw new Error('Invalid token type')
      }

      // Get user from database to ensure they still exist and are active
      const user = await User.findById(decoded.userId)
      
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive')
      }

      return {
        isValid: true,
        user,
        decoded
      }
    } catch (error) {
      logger.debug('Token verification failed:', error.message)
      return {
        isValid: false,
        error: error.message
      }
    }
  }

  // Refresh access token using refresh token
  static async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(
        refreshToken, 
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        {
          issuer: 'secure-vm-portal',
          audience: 'secure-vm-portal-users'
        }
      )

      if (decoded.tokenType !== 'refresh') {
        throw new Error('Invalid token type')
      }

      const user = await User.findById(decoded.userId)
      
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive')
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user)

      logger.audit('TOKEN_REFRESHED', {
        userId: user.id,
        email: user.email
      })

      return {
        user: user.toJSON(),
        tokens
      }
    } catch (error) {
      logger.error('Token refresh failed:', error)
      throw error
    }
  }

  // Logout user (optional: revoke tokens)
  static async logout(userId, token) {
    try {
      // Optional: Add token to blacklist or revoke refresh tokens
      // This would require a token blacklist table or Redis store
      
      logger.audit('USER_LOGOUT', {
        userId,
        timestamp: new Date().toISOString()
      })

      return { success: true }
    } catch (error) {
      logger.error('Logout failed:', error)
      throw error
    }
  }

  // Validate user permissions for resource access
  static async validatePermissions(user, resource, action) {
    try {
      // Basic role-based permissions
      const permissions = {
        admin: {
          users: ['create', 'read', 'update', 'delete'],
          vms: ['create', 'read', 'update', 'delete', 'assign'],
          sessions: ['read', 'monitor', 'terminate'],
          reports: ['read', 'export'],
          audit: ['read']
        },
        employee: {
          vms: ['read', 'connect'],
          sessions: ['create', 'read'],
          workLogs: ['create', 'read', 'update'],
          profile: ['read', 'update']
        }
      }

      const userPermissions = permissions[user.role] || {}
      const resourcePermissions = userPermissions[resource] || []

      return resourcePermissions.includes(action)
    } catch (error) {
      logger.error('Permission validation failed:', error)
      return false
    }
  }
}

module.exports = AuthService
