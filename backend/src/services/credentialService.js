const VMCredentials = require('../models/VMCredentials')
const { encrypt, decrypt } = require('../config/security')
const logger = require('../utils/logger')

class CredentialService {
  // Create or update VM credentials
  static async setVMCredentials(vmId, credentialsData) {
    try {
      // Validate input data
      if (!vmId) {
        throw new Error('VM ID is required')
      }

      // Set default connection type based on VM OS type if not provided
      if (!credentialsData.connectionType) {
        const VirtualMachine = require('../models/VirtualMachine')
        const vm = await VirtualMachine.findById(vmId)
        credentialsData.connectionType = vm?.osType === 'windows' ? 'rdp' : 'ssh'
      }

      // Set default connection port based on type
      if (!credentialsData.connectionPort) {
        credentialsData.connectionPort = credentialsData.connectionType === 'rdp' ? 3389 : 22
      }

      // Check if credentials already exist
      const existingCredentials = await VMCredentials.findByVMId(vmId)
      
      let result
      if (existingCredentials) {
        // For updates, only update the fields that are provided
        const updateData = {
          ...credentialsData,
          // Only include password/privateKey if they are provided
          password: credentialsData.password || undefined,
          privateKey: credentialsData.privateKey || undefined
        }
        result = await existingCredentials.update(updateData)
      } else {
        // For new credentials, ensure all required fields are present
        if (!credentialsData.username) {
          throw new Error('Username is required for new credentials')
        }
        
        if (credentialsData.connectionType === 'rdp' && !credentialsData.password) {
          throw new Error('Password is required for RDP connections')
        }

        result = await VMCredentials.create({
          vmId,
          ...credentialsData
        })
      }

      logger.audit('VM_CREDENTIALS_SET', {
        vmId,
        action: existingCredentials ? 'updated' : 'created',
        connectionType: credentialsData.connectionType
      })

      return result.toSafeJSON()
    } catch (error) {
      logger.error('Failed to set VM credentials:', error)
      throw error
    }
  }

  // Get credentials for VM connection (internal use only)
  static async getConnectionCredentials(vmId, userId) {
    try {
      // First try to get credentials from vm_credentials table (new approach)
      let credentials
      try {
        credentials = await VMCredentials.findByVMId(vmId)
      } catch (error) {
        // If vm_credentials table doesn't exist or no credentials found, fall back to virtual_machines table
        console.log('[CredentialService] Falling back to virtual_machines table for credentials')
      }

      if (!credentials) {
        // Fallback: Get credentials directly from virtual_machines table
        const { pool } = require('../config/database')
        const result = await pool.query('SELECT username, password FROM virtual_machines WHERE id = $1', [vmId])
        
        if (result.rows.length === 0) {
          throw new Error('VM credentials not found')
        }

        const vmData = result.rows[0]
        
        // Log credential access for audit
        logger.audit('CREDENTIALS_ACCESSED', {
          vmId,
          userId,
          source: 'virtual_machines_table'
        })

        const decryptedCredentials = {
          username: vmData.username,
          password: vmData.password, // Already in plain text in virtual_machines table
          privateKey: null,
          connectionPort: 3389, // Default RDP port
          connectionType: 'rdp'
        }

        console.log(`[CredentialService] Retrieved credentials for VM ${vmId} from virtual_machines table:`, {
          username: decryptedCredentials.username,
          hasPassword: !!decryptedCredentials.password
        })

        return decryptedCredentials
      }

      // Use encrypted credentials from vm_credentials table
      logger.audit('CREDENTIALS_ACCESSED', {
        vmId,
        userId,
        credentialsId: credentials.id,
        source: 'vm_credentials_table'
      })

      const decryptedCredentials = {
        username: credentials.username,
        password: credentials.getDecryptedPassword(),
        privateKey: credentials.getDecryptedPrivateKey(),
        connectionPort: credentials.connectionPort,
        connectionType: credentials.connectionType
      }

      logger.debug(`Decrypted credentials for VM ${vmId}:`, decryptedCredentials)

      return decryptedCredentials
    } catch (error) {
      logger.error('Failed to get connection credentials:', error)
      throw error
    }
  }

  // Test VM credentials
  static async testCredentials(vmId) {
    try {
      const credentials = await VMCredentials.findByVMId(vmId)
      if (!credentials) {
        throw new Error('VM credentials not found')
      }

      // This would implement actual credential testing
      // For now, return a mock result
      const testResult = await credentials.testConnection()
      
      logger.audit('CREDENTIALS_TESTED', {
        vmId,
        credentialsId: credentials.id,
        success: testResult.success
      })

      return testResult
    } catch (error) {
      logger.error('Credential test failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Test VM credentials with provided data (without saving)
  static async testVMCredentials(vmId, credentialsData) {
    try {
      const VirtualMachine = require('../models/VirtualMachine')
      const vm = await VirtualMachine.findById(vmId)
      
      if (!vm) {
        throw new Error('VM not found')
      }

      // Validate credentials data
      const validation = this.validateCredentials(credentialsData)
      if (!validation.isValid) {
        return {
          success: false,
          message: 'Invalid credentials: ' + validation.errors.join(', '),
          errors: validation.errors
        }
      }

      // For now, return a mock successful test
      // In a real implementation, this would attempt actual connection
      const mockDelay = Math.random() * 1000 + 500 // 500-1500ms
      await new Promise(resolve => setTimeout(resolve, mockDelay))

      const success = Math.random() > 0.1 // 90% success rate for demo
      
      logger.audit('CREDENTIALS_TESTED_WITH_DATA', {
        vmId,
        username: credentialsData.username,
        connectionType: credentialsData.connectionType,
        success
      })

      if (success) {
        return {
          success: true,
          message: 'Connection test successful',
          responseTime: Math.round(mockDelay),
          details: {
            connectionType: credentialsData.connectionType,
            port: credentialsData.connectionPort,
            authMethod: credentialsData.privateKey ? 'key-based' : 'password'
          }
        }
      } else {
        return {
          success: false,
          message: 'Connection test failed - unable to establish connection',
          responseTime: Math.round(mockDelay),
          details: {
            error: 'Connection timeout or authentication failure'
          }
        }
      }
    } catch (error) {
      logger.error('VM credential test failed:', error)
      return {
        success: false,
        message: error.message || 'Connection test failed',
        error: error.message
      }
    }
  }

  // Rotate VM credentials
  static async rotateCredentials(vmId, newCredentials) {
    try {
      const credentials = await VMCredentials.findByVMId(vmId)
      if (!credentials) {
        throw new Error('VM credentials not found')
      }

      // Update with new credentials
      await credentials.update(newCredentials)
      
      logger.audit('CREDENTIALS_ROTATED', {
        vmId,
        credentialsId: credentials.id
      })

      return credentials.toSafeJSON()
    } catch (error) {
      logger.error('Failed to rotate credentials:', error)
      throw error
    }
  }

  // Generate SSH key pair (placeholder)
  static async generateSSHKeyPair() {
    try {
      // This would implement actual SSH key generation
      // For now, return mock keys
      const mockPrivateKey = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAFwAAAAdzc2gtcn
NhAAAAAwEAAQAAAQEA... (mock key)
-----END OPENSSH PRIVATE KEY-----`

      const mockPublicKey = `ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC... (mock key) generated@secure-vm-portal`

      return {
        privateKey: mockPrivateKey,
        publicKey: mockPublicKey,
        fingerprint: 'SHA256:mockfingerprint'
      }
    } catch (error) {
      logger.error('Failed to generate SSH key pair:', error)
      throw error
    }
  }

  // Validate credential data
  static validateCredentials(credentialsData) {
    const errors = []

    if (!credentialsData.username || credentialsData.username.trim().length === 0) {
      errors.push('Username is required')
    }

    if (!credentialsData.password && !credentialsData.privateKey) {
      errors.push('Either password or private key is required')
    }

    if (credentialsData.connectionPort && (credentialsData.connectionPort < 1 || credentialsData.connectionPort > 65535)) {
      errors.push('Connection port must be between 1 and 65535')
    }

    if (credentialsData.connectionType && !['ssh', 'rdp', 'vnc'].includes(credentialsData.connectionType)) {
      errors.push('Invalid connection type')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Get credential usage statistics
  static async getCredentialStats(vmId) {
    try {
      const { pool } = require('../config/database')
      
      const sql = `
        SELECT 
          COUNT(s.id) as total_connections,
          COUNT(DISTINCT s.user_id) as unique_users,
          MAX(s.start_time) as last_used,
          COUNT(s.id) FILTER (WHERE s.start_time >= CURRENT_DATE - INTERVAL '7 days') as connections_last_7d
        FROM sessions s
        WHERE s.vm_id = $1
      `

      const result = await pool.query(sql, [vmId])
      const stats = result.rows[0]

      return {
        totalConnections: parseInt(stats.total_connections) || 0,
        uniqueUsers: parseInt(stats.unique_users) || 0,
        lastUsed: stats.last_used,
        connectionsLast7d: parseInt(stats.connections_last_7d) || 0
      }
    } catch (error) {
      logger.error('Failed to get credential stats:', error)
      throw error
    }
  }
}

module.exports = CredentialService
