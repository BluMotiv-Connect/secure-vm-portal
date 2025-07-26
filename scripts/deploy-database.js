#!/usr/bin/env node

const { Pool } = require('../backend/node_modules/pg')
const fs = require('fs')
const path = require('path')

// Database configuration for Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://secure_vm_portal_user:u4fwpipFUbVdt6kXl5XKGPhdEg8AWipU@dpg-d1pdmejipnbc73fuqtk0-a.oregon-postgres.render.com/secure_vm_portal_s3ww',
  ssl: { rejectUnauthorized: false }
})

async function deployDatabase() {
  console.log('🚀 Starting database deployment to Render...')
  
  try {
    // Test connection
    const client = await pool.connect()
    console.log('✅ Connected to Render PostgreSQL database')
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'render_setup.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')
    
    console.log('📄 Executing database schema...')
    
    // Execute the entire schema at once
    try {
      await client.query(schema)
      console.log('✅ Database schema executed successfully!')
    } catch (error) {
      // If there are "already exists" errors, that's okay
      if (error.message.includes('already exists') || 
          error.message.includes('duplicate key')) {
        console.log(`⚠️  Some objects already exist, continuing...`)
      } else {
        throw error
      }
    }
    
    // Apply consent system migration
    console.log('📄 Applying consent system migration...')
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '001_add_consent_system.sql')
    
    if (fs.existsSync(migrationPath)) {
      const migration = fs.readFileSync(migrationPath, 'utf8')
      
      try {
        await client.query(migration)
        console.log('✅ Consent system migration applied successfully!')
      } catch (error) {
        if (error.message.includes('already applied') || 
            error.message.includes('already exists')) {
          console.log('⚠️  Consent system migration already applied, skipping...')
        } else {
          throw error
        }
      }
    } else {
      console.log('⚠️  Consent system migration file not found, skipping...')
    }
    
    console.log('✅ Database schema deployed successfully!')
    
    // Verify tables were created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    console.log('📋 Created tables:')
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`)
    })
    
    // Verify admin user
    const adminCheck = await client.query('SELECT * FROM users WHERE role = $1', ['admin'])
    console.log(`👤 Admin users found: ${adminCheck.rows.length}`)
    adminCheck.rows.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`)
    })
    
    client.release()
    console.log('🎉 Database deployment completed successfully!')
    
  } catch (error) {
    console.error('❌ Database deployment failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run deployment
deployDatabase()