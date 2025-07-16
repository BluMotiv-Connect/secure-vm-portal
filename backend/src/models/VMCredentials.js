const { query } = require('../config/database')
const { encrypt, decrypt } = require('../config/security')
const logger = require('../utils/logger')

class VMCredentials {
  constructor(data) {
    this.id = data.id
    this.vmId = data.vm_id
    this.username = data.username
    this.passwordEncrypted = data.password_encrypted
    this.privateKeyEncrypted = data.private_key_encrypted
    this.connectionPort = data.connection_port
    this.connectionType = data.connection_type
    this.createdAt = data.created_at
    this.updatedAt = data.updated_at
  }

  // Create new VM credentials
  static async create(credentialsData) {
    try {
      // Validate required fields
      if (!credentialsData.username) {
        throw new Error('Username is required for VM credentials')
      }
      
      // For RDP connections, password is mandatory
      if (credentialsData.connectionType === 'rdp' && !credentialsData.password) {
        throw new Error('Password is required for RDP connections')
      }

      const encryptedPassword = credentialsData.password ? encrypt(credentialsData.password) : encrypt('') // Store empty string if no password
      const encryptedPrivateKey = credentialsData.privateKey ? encrypt(credentialsData.privateKey) : null

      const sql = `
        INSERT INTO vm_credentials (vm_id, username, password_encrypted, private_key_encrypted, connection_port, connection_type)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `
      
      const values = [
        credentialsData.vmId,
        credentialsData.username,
        encryptedPassword,
        encryptedPrivateKey,
        credentialsData.connectionType === 'rdp' ? (credentialsData.connectionPort || 3389) : (credentialsData.connectionPort || 22),
        credentialsData.connectionType || 'rdp'
      ]

      const result = await query(sql, values)
      const credentials = new VMCredentials(result.rows[0])

      logger.audit('VM_CREDENTIALS_CREATED', {
        vmId: credentials.vmId,
        username: credentials.username,
        connectionType: credentials.connectionType
      })

      return credentials
    } catch (error) {
      logger.error('Failed to create VM credentials:', error)
      if (error.code === '23505') { // Unique violation
        throw new Error('Credentials already exist for this VM. Use update instead.')
      }
      throw error
    }
  }

  // Find credentials by VM ID
  static async findByVMId(vmId) {
    try {
      const sql = 'SELECT * FROM vm_credentials WHERE vm_id = $1'
      const result = await query(sql, [vmId])
      
      return result.rows.length > 0 ? new VMCredentials(result.rows[0]) : null
    } catch (error) {
      logger.error('Failed to find credentials by VM ID:', error)
      throw error
    }
  }

  // Update credentials
  async update(updateData) {
    try {
      const updates = []
      const values = []
      let paramCount = 0

      if (updateData.username !== undefined) {
        paramCount++
        updates.push(`username = $${paramCount}`)
        values.push(updateData.username)
      }

      if (updateData.password !== undefined) {
        paramCount++
        updates.push(`password_encrypted = $${paramCount}`)
        values.push(updateData.password ? encrypt(updateData.password) : null)
      }

      if (updateData.privateKey !== undefined) {
        paramCount++
        updates.push(`private_key_encrypted = $${paramCount}`)
        values.push(updateData.privateKey ? encrypt(updateData.privateKey) : null)
      }

      if (updateData.connectionPort !== undefined) {
        paramCount++
        updates.push(`connection_port = $${paramCount}`)
        values.push(updateData.connectionPort)
      }

      if (updateData.connectionType !== undefined) {
        paramCount++
        updates.push(`connection_type = $${paramCount}`)
        values.push(updateData.connectionType)
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update')
      }

      values.push(this.id)
      const sql = `
        UPDATE vm_credentials 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount + 1}
        RETURNING *
      `

      const result = await query(sql, values)
      const updatedCredentials = new VMCredentials(result.rows[0])

      logger.audit('VM_CREDENTIALS_UPDATED', {
        vmId: this.vmId,
        credentialsId: this.id,
        changes: Object.keys(updateData)
      })

      // Update current instance
      Object.assign(this, updatedCredentials)
      return this
    } catch (error) {
      logger.error('Failed to update VM credentials:', error)
      throw error
    }
  }

  // Get decrypted password (for internal use only)
  getDecryptedPassword() {
    try {
      if (!this.passwordEncrypted) return null
      return decrypt(this.passwordEncrypted)
    } catch (error) {
      logger.error('Failed to decrypt password:', error)
      throw new Error('Failed to decrypt password')
    }
  }

  // Get decrypted private key (for internal use only)
  getDecryptedPrivateKey() {
    try {
      if (!this.privateKeyEncrypted) return null
      return decrypt(this.privateKeyEncrypted)
    } catch (error) {
      logger.error('Failed to decrypt private key:', error)
      throw new Error('Failed to decrypt private key')
    }
  }

  // Delete credentials
  async delete() {
    try {
      const sql = 'DELETE FROM vm_credentials WHERE id = $1'
      await query(sql, [this.id])

      logger.audit('VM_CREDENTIALS_DELETED', {
        vmId: this.vmId,
        credentialsId: this.id
      })

      return true
    } catch (error) {
      logger.error('Failed to delete VM credentials:', error)
      throw error
    }
  }

  // Test connection (placeholder for future implementation)
  async testConnection() {
    // This would implement actual connection testing
    // For now, return a mock result
    return {
      success: true,
      message: 'Connection test not implemented',
      responseTime: 0
    }
  }

  // Convert to safe JSON (without sensitive data)
  toSafeJSON() {
    return {
      id: this.id,
      vmId: this.vmId,
      username: this.username,
      connectionPort: this.connectionPort,
      connectionType: this.connectionType,
      hasPassword: !!this.passwordEncrypted,
      hasPrivateKey: !!this.privateKeyEncrypted,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }
}

module.exports = VMCredentials
