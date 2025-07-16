const { ConfidentialClientApplication } = require('@azure/msal-node')
const logger = require('../utils/logger')

// Azure AD configuration
const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    knownAuthorities: [`https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`]
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        if (!containsPii) {
          logger.debug('MSAL:', message)
        }
      },
      piiLoggingEnabled: false,
      logLevel: process.env.NODE_ENV === 'development' ? 3 : 1
    }
  }
}

// Validate Azure configuration
const validateAzureConfig = () => {
  const requiredEnvVars = ['AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TENANT_ID']
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required Azure AD environment variables: ${missingVars.join(', ')}`)
  }
  
  logger.info('Azure AD configuration validated successfully')
}

// Create MSAL instance
let msalInstance
try {
  validateAzureConfig()
  msalInstance = new ConfidentialClientApplication(msalConfig)
  logger.info('Azure AD MSAL instance created successfully')
} catch (error) {
  logger.error('Failed to initialize Azure AD:', error)
  throw error
}

// Microsoft Graph API configuration
const GRAPH_CONFIG = {
  BASE_URL: 'https://graph.microsoft.com/v1.0',
  SCOPES: {
    USER_READ: 'https://graph.microsoft.com/User.Read',
    USER_READ_ALL: 'https://graph.microsoft.com/User.Read.All'
  }
}

// Validate Azure AD token with Microsoft Graph
const validateTokenWithGraph = async (accessToken) => {
  try {
    const response = await fetch(`${GRAPH_CONFIG.BASE_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Graph API error: ${response.status} ${response.statusText}`)
    }

    const userInfo = await response.json()
    
    logger.audit('AZURE_TOKEN_VALIDATED', {
      userId: userInfo.id,
      userPrincipalName: userInfo.userPrincipalName,
      displayName: userInfo.displayName
    })

    return {
      isValid: true,
      userInfo: {
        azureId: userInfo.id,
        email: userInfo.mail || userInfo.userPrincipalName,
        name: userInfo.displayName,
        jobTitle: userInfo.jobTitle,
        department: userInfo.department,
        officeLocation: userInfo.officeLocation
      }
    }
  } catch (error) {
    logger.error('Token validation with Graph API failed:', error)
    return {
      isValid: false,
      error: error.message
    }
  }
}

// Get user groups from Azure AD
const getUserGroups = async (accessToken) => {
  try {
    const response = await fetch(`${GRAPH_CONFIG.BASE_URL}/me/memberOf`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Graph API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.value.map(group => ({
      id: group.id,
      displayName: group.displayName,
      description: group.description
    }))
  } catch (error) {
    logger.error('Failed to get user groups:', error)
    return []
  }
}

// Check if user is admin based on Azure AD groups
const isUserAdmin = async (accessToken, adminGroupIds = []) => {
  if (!adminGroupIds.length) {
    // If no admin groups configured, check by email domain or other logic
    return false
  }

  try {
    const userGroups = await getUserGroups(accessToken)
    return userGroups.some(group => adminGroupIds.includes(group.id))
  } catch (error) {
    logger.error('Failed to check admin status:', error)
    return false
  }
}

module.exports = {
  msalInstance,
  msalConfig,
  GRAPH_CONFIG,
  validateTokenWithGraph,
  getUserGroups,
  isUserAdmin,
  validateAzureConfig
}
