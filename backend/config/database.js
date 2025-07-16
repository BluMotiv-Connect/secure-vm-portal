const { Pool } = require('pg')

// Database configuration for both development and production
const getDatabaseConfig = () => {
  // If DATABASE_URL is provided (production), use it
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    }
  }
  
  // Otherwise use individual environment variables (development)
  return {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'secure_vm_portal',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 5432,
  }
}

const pool = new Pool(getDatabaseConfig())

// Test connection on startup
const testConnection = async () => {
  try {
    const client = await pool.connect()
    console.log('✅ Database connection successful')
    
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
    
    // Create users table
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

    // Create virtual_machines table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS virtual_machines (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        ip_address VARCHAR(45) UNIQUE NOT NULL,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        os_type VARCHAR(50) NOT NULL,
        os_version VARCHAR(100),
        status VARCHAR(50) DEFAULT 'offline',
        region VARCHAR(100),
        instance_id VARCHAR(255),
        tags JSONB DEFAULT '{}',
        assigned_user_id INTEGER REFERENCES users(id),
        assigned_user_name VARCHAR(255),
        assigned_user_email VARCHAR(255),
        active_sessions_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Create projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'active',
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Create tasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        project_outcome_id VARCHAR(100),
        task_name VARCHAR(255) NOT NULL,
        dependency VARCHAR(255),
        proposed_start_date DATE,
        actual_start_date DATE,
        proposed_end_date DATE,
        actual_end_date DATE,
        status VARCHAR(50) DEFAULT 'pending',
        status_description TEXT,
        file_link TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Create work_sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS work_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        vm_id INTEGER REFERENCES virtual_machines(id),
        session_type VARCHAR(50) NOT NULL, -- 'vm', 'm365', 'personal'
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        duration_minutes INTEGER,
        reason TEXT, -- for personal computer work
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Create vm_assignments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vm_assignments (
        id SERIAL PRIMARY KEY,
        vm_id INTEGER REFERENCES virtual_machines(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assigned_by INTEGER REFERENCES users(id),
        UNIQUE(vm_id, user_id)
      );
    `)

    // Create temp_connections table for secure file downloads
    await pool.query(`
      CREATE TABLE IF NOT EXISTS temp_connections (
        id SERIAL PRIMARY KEY,
        token VARCHAR(64) UNIQUE NOT NULL,
        vm_id INTEGER REFERENCES virtual_machines(id),
        user_id INTEGER REFERENCES users(id),
        session_id INTEGER REFERENCES work_sessions(id),
        content TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Sample VMs removed - VMs should be created through the admin interface

    // Insert admin user
    await pool.query(`
      INSERT INTO users (azure_id, email, name, role, is_active) 
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
    `, ['f7219976-3d76-499e-aa34-6807c7bbeff1', 'vivin@blumotiv.com', 'Vivin', 'admin', true])

    console.log('✅ Database initialized successfully')
    
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
  console.error('❌ Unexpected error on idle client', err)
})

module.exports = { pool }
