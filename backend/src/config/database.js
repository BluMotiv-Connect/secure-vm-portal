const { Pool } = require('pg')
const logger = require('../utils/logger')

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/secure_vm_portal',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_POOL_MAX) || 20,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
}

// Create connection pool
const pool = new Pool(dbConfig)

// Pool event handlers
pool.on('connect', (client) => {
  logger.debug('New database client connected')
})

pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle database client:', err)
})

pool.on('remove', (client) => {
  logger.debug('Database client removed from pool')
})

// Database connection function
const connectDatabase = async () => {
  try {
    const client = await pool.connect()
    const result = await client.query('SELECT NOW() as current_time, version() as version')
    
    logger.info('Database connected successfully', {
      currentTime: result.rows[0].current_time,
      version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]
    })
    
    client.release()
    return true
  } catch (error) {
    logger.error('Database connection failed:', {
      error: error.message,
      code: error.code,
      host: dbConfig.host,
      database: dbConfig.database
    })
    throw error
  }
}

// Query helper function
const query = async (text, params) => {
  const start = Date.now()
  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    
    logger.debug('Database query executed', {
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration: `${duration}ms`,
      rows: result.rowCount
    })
    
    return result
  } catch (error) {
    logger.error('Database query failed:', {
      error: error.message,
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      params: params
    })
    throw error
  }
}

// Transaction helper function
const transaction = async (callback) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Graceful shutdown
const closeDatabase = async () => {
  try {
    await pool.end()
    logger.info('Database pool closed')
  } catch (error) {
    logger.error('Error closing database pool:', error)
  }
}

module.exports = {
  pool,
  query,
  transaction,
  connectDatabase,
  closeDatabase
}
