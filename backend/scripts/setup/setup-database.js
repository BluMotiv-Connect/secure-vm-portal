#!/usr/bin/env node

const fs = require('fs').promises
const path = require('path')
const { pool } = require('../../src/config/database')

async function setupDatabase() {
  try {
    console.log('🚀 Setting up database...')

    // Check if database is already initialized
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `)

    if (tableCheck.rows.length > 0) {
      console.log('✅ Database already initialized')
      return
    }

    // Get migration files
    const migrationsDir = path.join(__dirname, '../../database/migrations')
    const migrationFiles = await fs.readdir(migrationsDir)
    const sortedMigrations = migrationFiles
      .filter(file => file.endsWith('.sql'))
      .sort()

    console.log(`📁 Found ${sortedMigrations.length} migration files`)

    // Run migrations in order
    for (const migrationFile of sortedMigrations) {
      console.log(`⚡ Running migration: ${migrationFile}`)
      
      const migrationPath = path.join(migrationsDir, migrationFile)
      const migrationSQL = await fs.readFile(migrationPath, 'utf8')
      
      // Split by semicolon and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0)

      for (const statement of statements) {
        try {
          await pool.query(statement)
        } catch (error) {
          if (!error.message.includes('already exists')) {
            throw error
          }
        }
      }
      
      console.log(`✅ Completed: ${migrationFile}`)
    }

    // Run seed files
    const seedsDir = path.join(__dirname, '../../database/seeds')
    try {
      const seedFiles = await fs.readdir(seedsDir)
      const sortedSeeds = seedFiles
        .filter(file => file.endsWith('.sql'))
        .sort()

      for (const seedFile of sortedSeeds) {
        console.log(`🌱 Running seed: ${seedFile}`)
        
        const seedPath = path.join(seedsDir, seedFile)
        const seedSQL = await fs.readFile(seedPath, 'utf8')
        
        const statements = seedSQL
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0)

        for (const statement of statements) {
          try {
            await pool.query(statement)
          } catch (error) {
            if (!error.message.includes('duplicate key') && 
                !error.message.includes('already exists')) {
              console.warn(`⚠️  Seed warning: ${error.message}`)
            }
          }
        }
        
        console.log(`✅ Completed seed: ${seedFile}`)
      }
    } catch (error) {
      console.log('📝 No seed files found, skipping...')
    }

    // Verify setup
    const userCount = await pool.query('SELECT COUNT(*) FROM users')
    const vmCount = await pool.query('SELECT COUNT(*) FROM virtual_machines')
    
    console.log('📊 Database setup completed:')
    console.log(`   Users: ${userCount.rows[0].count}`)
    console.log(`   VMs: ${vmCount.rows[0].count}`)
    
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase()
}

module.exports = setupDatabase
