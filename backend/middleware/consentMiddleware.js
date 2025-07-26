const ConsentService = require('../services/consentService')

class ConsentMiddleware {
  constructor() {
    this.consentService = new ConsentService()
  }

  /**
   * Middleware to check if user has valid consent
   * Blocks access if consent is required but not provided
   */
  requireConsent = async (req, res, next) => {
    try {
      // Skip consent check if feature is disabled
      if (process.env.CONSENT_REQUIRED !== 'true') {
        return next()
      }

      // Skip for certain routes that shouldn't require consent
      const exemptRoutes = [
        '/api/health',
        '/api/auth',
        '/api/consent/agreement',
        '/api/consent/status',
        '/api/consent/record'
      ]

      const isExemptRoute = exemptRoutes.some(route => req.path.startsWith(route))
      if (isExemptRoute) {
        return next()
      }

      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated to access this resource',
          code: 'AUTH_001'
        })
      }

      // Check user's consent status
      const consentStatus = await this.consentService.checkUserConsentValidity(req.user.id)

      if (!consentStatus.has_valid_consent) {
        // Log the consent requirement
        await this.consentService.createAuditLog({
          userId: req.user.id,
          userEmail: req.user.email,
          action: 'consent_required',
          agreementVersion: consentStatus.current_version,
          ipAddress: this.getClientIP(req),
          userAgent: req.headers['user-agent'],
          details: {
            requestedPath: req.path,
            method: req.method,
            requiresNewConsent: consentStatus.requires_new_consent
          }
        })

        return res.status(403).json({
          error: 'Consent required',
          message: 'User must provide consent to access this resource',
          code: 'CONSENT_001',
          data: {
            requiresNewConsent: consentStatus.requires_new_consent,
            currentVersion: consentStatus.current_version,
            userConsentVersion: consentStatus.agreement_version
          }
        })
      }

      // Add consent info to request for use in other middleware/routes
      req.userConsent = consentStatus
      next()

    } catch (error) {
      console.error('Consent middleware error:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to check consent status',
        code: 'SERVER_ERROR'
      })
    }
  }

  /**
   * Middleware to check consent but not block access
   * Adds consent status to request object for informational purposes
   */
  checkConsent = async (req, res, next) => {
    try {
      if (!req.user) {
        return next()
      }

      const consentStatus = await this.consentService.checkUserConsentValidity(req.user.id)
      req.userConsent = consentStatus

      next()
    } catch (error) {
      console.error('Consent check middleware error:', error)
      // Don't block request on error, just log and continue
      req.userConsent = null
      next()
    }
  }

  /**
   * Middleware to require admin role for consent management
   */
  requireAdminForConsent = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin role required for consent management',
        code: 'AUTH_002'
      })
    }
    next()
  }

  /**
   * Middleware to log consent-related actions
   */
  logConsentAction = (action) => {
    return async (req, res, next) => {
      try {
        if (req.user) {
          await this.consentService.createAuditLog({
            userId: req.user.id,
            userEmail: req.user.email,
            action: action,
            ipAddress: this.getClientIP(req),
            userAgent: req.headers['user-agent'],
            details: {
              path: req.path,
              method: req.method,
              body: req.method === 'POST' ? req.body : undefined
            }
          })
        }
        next()
      } catch (error) {
        console.error('Consent logging middleware error:', error)
        // Don't block request on logging error
        next()
      }
    }
  }

  /**
   * Helper method to get client IP address
   */
  getClientIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           req.ip
  }

  /**
   * Middleware to handle consent withdrawal
   * Immediately revokes access when consent is withdrawn
   */
  handleConsentWithdrawal = async (req, res, next) => {
    try {
      if (!req.user) {
        return next()
      }

      // Check if user has withdrawn consent
      const consentStatus = await this.consentService.checkUserConsentValidity(req.user.id)
      
      if (consentStatus.has_valid_consent === false && req.userConsent?.status === 'withdrawn') {
        // Log access attempt after withdrawal
        await this.consentService.createAuditLog({
          userId: req.user.id,
          userEmail: req.user.email,
          action: 'access_denied_withdrawn_consent',
          ipAddress: this.getClientIP(req),
          userAgent: req.headers['user-agent'],
          details: {
            path: req.path,
            method: req.method
          }
        })

        return res.status(403).json({
          error: 'Access revoked',
          message: 'Access has been revoked due to consent withdrawal',
          code: 'CONSENT_WITHDRAWN'
        })
      }

      next()
    } catch (error) {
      console.error('Consent withdrawal middleware error:', error)
      next()
    }
  }

  /**
   * Middleware to check if agreement version has been updated
   * Requires re-consent if user's consent is for an older version
   */
  checkAgreementVersion = async (req, res, next) => {
    try {
      if (!req.user || !req.userConsent) {
        return next()
      }

      const currentVersion = await this.consentService.getCurrentAgreementVersion()
      
      if (req.userConsent.agreement_version !== currentVersion.version) {
        await this.consentService.createAuditLog({
          userId: req.user.id,
          userEmail: req.user.email,
          action: 'outdated_consent_detected',
          agreementVersion: currentVersion.version,
          ipAddress: this.getClientIP(req),
          userAgent: req.headers['user-agent'],
          details: {
            userConsentVersion: req.userConsent.agreement_version,
            currentVersion: currentVersion.version,
            path: req.path
          }
        })

        return res.status(403).json({
          error: 'Consent update required',
          message: 'Agreement has been updated, new consent required',
          code: 'CONSENT_OUTDATED',
          data: {
            userConsentVersion: req.userConsent.agreement_version,
            currentVersion: currentVersion.version,
            requiresNewConsent: true
          }
        })
      }

      next()
    } catch (error) {
      console.error('Agreement version check middleware error:', error)
      next()
    }
  }
}

// Export singleton instance
const consentMiddleware = new ConsentMiddleware()

module.exports = {
  requireConsent: consentMiddleware.requireConsent,
  checkConsent: consentMiddleware.checkConsent,
  requireAdminForConsent: consentMiddleware.requireAdminForConsent,
  logConsentAction: consentMiddleware.logConsentAction,
  handleConsentWithdrawal: consentMiddleware.handleConsentWithdrawal,
  checkAgreementVersion: consentMiddleware.checkAgreementVersion,
  ConsentMiddleware
}