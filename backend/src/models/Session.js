const { query } = require('../config/database');
const logger = require('../utils/logger');

class Session {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.vmId = data.vm_id;
    this.startTime = data.start_time;
    this.endTime = data.end_time;
    this.durationMinutes = data.duration_minutes;
    this.status = data.status;
    this.connectionType = data.connection_type;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  static async create(sessionData) {
    try {
      const sql = `
        INSERT INTO sessions (
          user_id, vm_id, connection_type, status
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const values = [
        sessionData.userId,
        sessionData.vmId,
        sessionData.connectionType,
        'active'
      ];

      const result = await query(sql, values);
      return new Session(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create session:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const sql = 'SELECT * FROM sessions WHERE id = $1';
      const result = await query(sql, [id]);
      return result.rows[0] ? new Session(result.rows[0]) : null;
    } catch (error) {
      logger.error('Failed to find session:', error);
      throw error;
    }
  }

  static async getSessionStats(vmId) {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_sessions,
          COALESCE(SUM(duration_minutes) / 60.0, 0) as total_hours,
          MAX(start_time) as last_session_time
        FROM sessions 
        WHERE vm_id = $1 AND status = 'completed'
      `;
      
      const result = await query(sql, [vmId]);
      const stats = result.rows[0];
      
      return {
        totalSessions: parseInt(stats.total_sessions),
        totalHours: Math.round(parseFloat(stats.total_hours) * 10) / 10,
        lastSessionTime: stats.last_session_time
      };
    } catch (error) {
      logger.error('Failed to get session stats:', error);
      throw error;
    }
  }

  async end() {
    try {
      const sql = `
        UPDATE sessions 
        SET status = 'completed',
            end_time = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await query(sql, [this.id]);
      Object.assign(this, new Session(result.rows[0]));
      return this;
    } catch (error) {
      logger.error('Failed to end session:', error);
      throw error;
    }
  }

  isActive() {
    return this.status === 'active';
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      vmId: this.vmId,
      startTime: this.startTime,
      endTime: this.endTime,
      durationMinutes: this.durationMinutes,
      status: this.status,
      connectionType: this.connectionType,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = { Session };
