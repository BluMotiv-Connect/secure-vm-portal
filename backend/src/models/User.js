const { query } = require('../config/database')
const { encrypt, decrypt } = require('../config/security')
const logger = require('../utils/logger')
const { USER_ROLES } = require('../utils/constants')

class User {
  constructor(data) {
    this.id = data.id
    this.uuid = data.uuid
    this.name = data.name
    this.email = data.email
    this.azureId = data.azure_id
    this.role = data.role
    this.isActive = data.is_active
    this.lastLogin = data.last_login
    this.createdAt = data.created_at
    this.updatedAt = data.updated_at
  }

  // Create a new user
  static async create(userData) {
    try {
      const sql = `
        INSERT INTO users (name, email, azure_id, role, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `
      
      const values = [
        userData.name,
        userData.email.toLowerCase(),
        userData.azureId,
        userData.role || USER_ROLES.EMPLOYEE,
        userData.isActive !== undefined ? userData.isActive : true
      ]

      const result = await query(sql, values)
      const user = new User(result.rows[0])

      logger.audit('USER_CREATED', {
        userId: user.id,
        email: user.email,
        role: user.role,
        azureId: user.azureId
      })

      return user
    } catch (error) {
      logger.error('Failed to create user:', error)
      throw error
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const sql = 'SELECT * FROM users WHERE id = $1 AND is_active = true'
      const result = await query(sql, [id])
      
      return result.rows.length > 0 ? new User(result.rows[0]) : null
    } catch (error) {
      logger.error('Failed to find user by ID:', error)
      throw error
    }
  }

  // Find user by Azure ID
  static async findByAzureId(azureId) {
    try {
      const sql = 'SELECT * FROM users WHERE azure_id = $1'
      const result = await query(sql, [azureId])
      
      return result.rows.length > 0 ? new User(result.rows[0]) : null
    } catch (error) {
      logger.error('Failed to find user by Azure ID:', error)
      throw error
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const sql = 'SELECT * FROM users WHERE email = $1'
      const result = await query(sql, [email.toLowerCase()])
      
      return result.rows.length > 0 ? new User(result.rows[0]) : null
    } catch (error) {
      logger.error('Failed to find user by email:', error)
      throw error
    }
  }

  // Get all users with pagination
  static async findAll(options = {}) {
    try {
      const { page = 1, limit = 20, role, isActive, search } = options
      const offset = (page - 1) * limit

      let sql = `
        SELECT * FROM users 
        WHERE 1=1
      `
      const values = []
      let paramCount = 0

      // Add filters
      if (role) {
        paramCount++
        sql += ` AND role = $${paramCount}`
        values.push(role)
      }

      if (isActive !== undefined) {
        paramCount++
        sql += ` AND is_active = $${paramCount}`
        values.push(isActive)
      }

      if (search) {
        paramCount++
        sql += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`
        values.push(`%${search}%`)
      }

      // Add pagination
      sql += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
      values.push(limit, offset)

      const result = await query(sql, values)
      const users = result.rows.map(row => new User(row))

      // Get total count
      let countSql = 'SELECT COUNT(*) FROM users WHERE 1=1'
      const countValues = values.slice(0, -2) // Remove limit and offset

      if (role) countSql += ' AND role = $1'
      if (isActive !== undefined) countSql += ` AND is_active = $${role ? 2 : 1}`
      if (search) countSql += ` AND (name ILIKE $${(role ? 1 : 0) + (isActive !== undefined ? 1 : 0) + 1} OR email ILIKE $${(role ? 1 : 0) + (isActive !== undefined ? 1 : 0) + 1})`

      const countResult = await query(countSql, countValues)
      const total = parseInt(countResult.rows[0].count)

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    } catch (error) {
      logger.error('Failed to get users:', error)
      throw error
    }
  }

  // Update user
  async update(updateData) {
    try {
      const allowedFields = ['name', 'email', 'role', 'is_active']
      const updates = []
      const values = []
      let paramCount = 0

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          paramCount++
          updates.push(`${key} = $${paramCount}`)
          values.push(key === 'email' ? updateData[key].toLowerCase() : updateData[key])
        }
      })

      if (updates.length === 0) {
        throw new Error('No valid fields to update')
      }

      values.push(this.id)
      const sql = `
        UPDATE users 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount + 1}
        RETURNING *
      `

      const result = await query(sql, values)
      const updatedUser = new User(result.rows[0])

      logger.audit('USER_UPDATED', {
        userId: this.id,
        changes: updateData,
        updatedBy: 'system' // This should be set by the calling function
      })

      // Update current instance
      Object.assign(this, updatedUser)
      return this
    } catch (error) {
      logger.error('Failed to update user:', error)
      throw error
    }
  }

  // Update last login
  async updateLastLogin() {
    try {
      const sql = `
        UPDATE users 
        SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING last_login
      `
      
      const result = await query(sql, [this.id])
      this.lastLogin = result.rows[0].last_login

      logger.audit('USER_LOGIN', {
        userId: this.id,
        email: this.email,
        timestamp: this.lastLogin
      })

      return this.lastLogin
    } catch (error) {
      logger.error('Failed to update last login:', error)
      throw error
    }
  }

  // Soft delete user
  async deactivate() {
    try {
      // First check for active sessions
      const activeSessions = await query(
        'SELECT COUNT(*) FROM sessions WHERE user_id = $1 AND status = $2',
        [this.id, 'active']
      )
      
      if (parseInt(activeSessions.rows[0].count) > 0) {
        throw new Error('User has active sessions. Please end all sessions before deactivating.')
      }

      // Check for VM assignments
      const vmAssignments = await query(
        'SELECT COUNT(*) FROM virtual_machines WHERE assigned_user_id = $1',
        [this.id]
      )
      
      if (parseInt(vmAssignments.rows[0].count) > 0) {
        throw new Error('User has assigned VMs. Please unassign all VMs before deactivating.')
      }

      // Check for temp connections
      const tempConnections = await query(
        'SELECT COUNT(*) FROM temp_connections WHERE user_id = $1',
        [this.id]
      )
      
      if (parseInt(tempConnections.rows[0].count) > 0) {
        throw new Error('User has temporary connections. Please wait for connections to close or force close them.')
      }

      // If all checks pass, deactivate the user
      await this.update({ is_active: false })
      
      logger.audit('USER_DEACTIVATED', {
        userId: this.id,
        email: this.email
      })

      return this
    } catch (error) {
      logger.error('Failed to deactivate user:', error)
      throw error
    }
  }

  // Reactivate user
  async activate() {
    try {
      await this.update({ is_active: true })
      
      logger.audit('USER_ACTIVATED', {
        userId: this.id,
        email: this.email
      })

      return this
    } catch (error) {
      logger.error('Failed to activate user:', error)
      throw error
    }
  }

  // Check if user has specific role
  hasRole(role) {
    return this.role === role
  }

  // Check if user is admin
  isAdmin() {
    return this.role === USER_ROLES.ADMIN
  }

  // Check if user is employee
  isEmployee() {
    return this.role === USER_ROLES.EMPLOYEE
  }

  // Get user's assigned VMs
  async getAssignedVMs() {
    try {
      const sql = `
        SELECT vm.*, vc.connection_type, vc.connection_port
        FROM virtual_machines vm
        LEFT JOIN vm_credentials vc ON vm.id = vc.vm_id
        WHERE vm.assigned_to = $1 AND vm.status != 'error'
        ORDER BY vm.name
      `
      
      const result = await query(sql, [this.id])
      return result.rows
    } catch (error) {
      logger.error('Failed to get assigned VMs:', error)
      throw error
    }
  }

  // Get user's active sessions
  async getActiveSessions() {
    try {
      const sql = `
        SELECT s.*, vm.name as vm_name, vm.ip_address
        FROM sessions s
        JOIN virtual_machines vm ON s.vm_id = vm.id
        WHERE s.user_id = $1 AND s.status = 'active'
        ORDER BY s.start_time DESC
      `
      
      const result = await query(sql, [this.id])
      return result.rows
    } catch (error) {
      logger.error('Failed to get active sessions:', error)
      throw error
    }
  }

  // Get user's work logs summary
  async getWorkLogsSummary(startDate, endDate) {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_sessions,
          SUM(duration_minutes) as total_minutes,
          AVG(duration_minutes) as avg_minutes,
          work_type,
          DATE(start_time) as work_date
        FROM work_logs
        WHERE user_id = $1 
          AND start_time >= $2 
          AND start_time <= $3
        GROUP BY work_type, DATE(start_time)
        ORDER BY work_date DESC, work_type
      `
      
      const result = await query(sql, [this.id, startDate, endDate])
      return result.rows
    } catch (error) {
      logger.error('Failed to get work logs summary:', error)
      throw error
    }
  }

  // Convert to JSON (remove sensitive data)
  toJSON() {
    return {
      id: this.id,
      uuid: this.uuid,
      name: this.name,
      email: this.email,
      role: this.role,
      isActive: this.isActive,
      lastLogin: this.lastLogin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  // Convert to safe JSON for client (minimal data)
  toSafeJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role
    }
  }
}

module.exports = User
