const { Pool } = require('pg')

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'secure_vm_portal',
  password: process.env.DB_PASSWORD || 'postgres', // Default PostgreSQL password
  port: process.env.DB_PORT || 5432,
})

// Test connection on startup
const testConnection = async () => {
  try {
    const client = await pool.connect()
    console.log('✅ Database connection successful')
    
    // Test query
    const result = await client.query('SELECT NOW()')
    console.log('✅ Database query test successful:', result.rows[0])
    
    client.release()
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    console.error('Please ensure PostgreSQL is running and database exists')
  }
}

// Initialize database tables
const initializeDatabase = async () => {
  try {
    console.log('🔧 Initializing database...')
    
    // Create users table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        azure_id VARCHAR(255) UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'employee',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Insert initial admin user
    await pool.query(`
      INSERT INTO users (azure_id, email, name, role, is_active) 
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
    `, ['f7219976-3d76-499e-aa34-6807c7bbeff1', 'vivin@blumotiv.com', 'Vivin', 'admin', true])

    console.log('✅ Database initialized successfully')
    
    // Verify admin user exists
    const adminCheck = await pool.query('SELECT * FROM users WHERE email = $1', ['vivin@blumotiv.com'])
    console.log('✅ Admin user verified:', adminCheck.rows[0])
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message)
  }
}

// Test connection and initialize on startup
testConnection().then(() => {
  initializeDatabase()
})

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err)
})

module.exports = { pool }
