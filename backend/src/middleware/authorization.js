const AuthService = require('../services/authService')
const logger = require('../utils/logger')
const { getClientIP } = require('../utils/helpers')
const { USER_ROLES } = require('../utils/constants')

// Require specific role
const requireRole = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        })
      }

      const allowedRoles = Array.isArray(roles) ? roles : [roles]
      
      if (!allowedRoles.includes(req.user.role)) {
        logger.audit('AUTHORIZATION_DENIED', {
          userId: req.user.id,
          requiredRoles: allowedRoles,
          userRole: req.user.role,
          resource: req.path,
          method: req.method,
          ip: getClientIP(req)
        })

        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: allowedRoles,
          current: req.user.role
        })
      }

      next()
    } catch (error) {
      logger.error('Authorization middleware error:', error)
      res.status(500).json({
        error: 'Authorization failed',
        code: 'AUTHORIZATION_ERROR'
      })
    }
  }
}

// Require admin role
const requireAdmin = requireRole(USER_ROLES.ADMIN)

// Require employee role (or higher)
const requireEmployee = requireRole([USER_ROLES.ADMIN, USER_ROLES.EMPLOYEE])

// Check resource permissions
const checkPermissions = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        })
      }

      const hasPermission = await AuthService.validatePermissions(
        req.user,
        resource,
        action
      )

      if (!hasPermission) {
        logger.audit('PERMISSION_DENIED', {
          userId: req.user.id,
          resource,
          action,
          userRole: req.user.role,
          ip: getClientIP(req)
        })

        return res.status(403).json({
          error: `Permission denied for ${action} on ${resource}`,
          code: 'PERMISSION_DENIED',
          resource,
          action
        })
      }

      next()
    } catch (error) {
      logger.error('Permission check error:', error)
      res.status(500).json({
        error: 'Permission check failed',
        code: 'PERMISSION_CHECK_ERROR'
      })
    }
  }
}

// Check if user owns resource or is admin
const requireOwnershipOrAdmin = (getResourceUserId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        })
      }

      // Admin can access any resource
      if (req.user.role === USER_ROLES.ADMIN) {
        return next()
      }

      // Get resource owner ID
      const resourceUserId = typeof getResourceUserId === 'function' 
        ? await getResourceUserId(req)
        : req.params[getResourceUserId] || req.body[getResourceUserId]

      if (req.user.id !== parseInt(resourceUserId)) {
        logger.audit('OWNERSHIP_DENIED', {
          userId: req.user.id,
          resourceUserId,
          resource: req.path,
          method: req.method,
          ip: getClientIP(req)
        })

        return res.status(403).json({
          error: 'Access denied - resource not owned by user',
          code: 'OWNERSHIP_DENIED'
        })
      }

      next()
    } catch (error) {
      logger.error('Ownership check error:', error)
      res.status(500).json({
        error: 'Ownership check failed',
        code: 'OWNERSHIP_CHECK_ERROR'
      })
    }
  }
}

// Rate limiting by user
const rateLimitByUser = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map()

  return (req, res, next) => {
    try {
      if (!req.user) {
        return next()
      }

      const userId = req.user.id
      const now = Date.now()
      const windowStart = now - windowMs

      // Clean old entries
      if (userRequests.has(userId)) {
        const requests = userRequests.get(userId).filter(time => time > windowStart)
        userRequests.set(userId, requests)
      }

      // Check current requests
      const currentRequests = userRequests.get(userId) || []
      
      if (currentRequests.length >= maxRequests) {
        logger.audit('RATE_LIMIT_EXCEEDED', {
          userId,
          requestCount: currentRequests.length,
          maxRequests,
          windowMs,
          ip: getClientIP(req)
        })

        return res.status(429).json({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(windowMs / 1000)
        })
      }

      // Add current request
      currentRequests.push(now)
      userRequests.set(userId, currentRequests)

      next()
    } catch (error) {
      logger.error('Rate limiting error:', error)
      next() // Don't fail the request on rate limiting errors
    }
  }
}

module.exports = {
  requireRole,
  requireAdmin,
  requireEmployee,
  checkPermissions,
  requireOwnershipOrAdmin,
  rateLimitByUser
}
