const { query } = require('../config/database')
const logger = require('../utils/logger')

class Report {
  constructor(data) {
    this.id = data.id
    this.uuid = data.uuid
    this.name = data.name
    this.description = data.description
    this.type = data.type
    this.parameters = data.parameters
    this.createdBy = data.created_by
    this.isPublic = data.is_public
    this.createdAt = data.created_at
    this.updatedAt = data.updated_at
  }

  // Create a new report template
  static async create(reportData) {
    try {
      const sql = `
        INSERT INTO reports (name, description, type, parameters, created_by, is_public)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `
      
      const values = [
        reportData.name,
        reportData.description || null,
        reportData.type,
        JSON.stringify(reportData.parameters || {}),
        reportData.createdBy,
        reportData.isPublic !== undefined ? reportData.isPublic : false
      ]

      const result = await query(sql, values)
      const report = new Report(result.rows[0])

      logger.audit('REPORT_TEMPLATE_CREATED', {
        reportId: report.id,
        name: report.name,
        type: report.type,
        createdBy: report.createdBy
      })

      return report
    } catch (error) {
      logger.error('Failed to create report template:', error)
      throw error
    }
  }

  // Find report by ID
  static async findById(id) {
    try {
      const sql = 'SELECT * FROM reports WHERE id = $1'
      const result = await query(sql, [id])
      
      return result.rows.length > 0 ? new Report(result.rows[0]) : null
    } catch (error) {
      logger.error('Failed to find report by ID:', error)
      throw error
    }
  }

  // Get all reports with filtering
  static async findAll(options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        type, 
        createdBy, 
        isPublic,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options
      
      const offset = (page - 1) * limit

      let sql = `
        SELECT r.*, u.name as creator_name
        FROM reports r
        JOIN users u ON r.created_by = u.id
        WHERE 1=1
      `
      const values = []
      let paramCount = 0

      // Add filters
      if (type) {
        paramCount++
        sql += ` AND r.type = $${paramCount}`
        values.push(type)
      }

      if (createdBy) {
        paramCount++
        sql += ` AND r.created_by = $${paramCount}`
        values.push(createdBy)
      }

      if (isPublic !== undefined) {
        paramCount++
        sql += ` AND r.is_public = $${paramCount}`
        values.push(isPublic)
      }

      // Add sorting and pagination
      sql += ` ORDER BY r.${sortBy} ${sortOrder.toUpperCase()}`
      sql += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
      values.push(limit, offset)

      const result = await query(sql, values)
      
      // Get total count
      let countSql = `
        SELECT COUNT(*) as total
        FROM reports r
        WHERE 1=1
      `
      const countValues = values.slice(0, -2) // Remove limit and offset

      if (type) countSql += ` AND r.type = $1`
      if (createdBy) countSql += ` AND r.created_by = $${type ? 2 : 1}`
      if (isPublic !== undefined) countSql += ` AND r.is_public = $${(type ? 1 : 0) + (createdBy ? 1 : 0) + 1}`

      const countResult = await query(countSql, countValues)
      const total = parseInt(countResult.rows[0].total)

      return {
        reports: result.rows.map(row => ({
          ...new Report(row).toJSON(),
          creatorName: row.creator_name
        })),
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
      logger.error('Failed to get reports:', error)
      throw error
    }
  }

  // Update report
  async update(updateData) {
    try {
      const allowedFields = ['name', 'description', 'parameters', 'is_public']
      const updates = []
      const values = []
      let paramCount = 0

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          paramCount++
          updates.push(`${key} = $${paramCount}`)
          
          if (key === 'parameters') {
            values.push(JSON.stringify(updateData[key]))
          } else {
            values.push(updateData[key])
          }
        }
      })

      if (updates.length === 0) {
        throw new Error('No valid fields to update')
      }

      values.push(this.id)
      const sql = `
        UPDATE reports 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount + 1}
        RETURNING *
      `

      const result = await query(sql, values)
      const updatedReport = new Report(result.rows[0])

      logger.audit('REPORT_TEMPLATE_UPDATED', {
        reportId: this.id,
        changes: updateData
      })

      // Update current instance
      Object.assign(this, updatedReport)
      return this
    } catch (error) {
      logger.error('Failed to update report:', error)
      throw error
    }
  }

  // Delete report
  async delete() {
    try {
      const sql = 'DELETE FROM reports WHERE id = $1'
      await query(sql, [this.id])

      logger.audit('REPORT_TEMPLATE_DELETED', {
        reportId: this.id,
        name: this.name,
        type: this.type
      })

      return true
    } catch (error) {
      logger.error('Failed to delete report:', error)
      throw error
    }
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      uuid: this.uuid,
      name: this.name,
      description: this.description,
      type: this.type,
      parameters: this.parameters,
      createdBy: this.createdBy,
      isPublic: this.isPublic,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }
}

module.exports = Report
