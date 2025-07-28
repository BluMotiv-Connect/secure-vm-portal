#!/usr/bin/env node

/**
 * Script to check if consent system database tables and functions exist
 */

const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function checkConsentDatabase() {
  const client = await pool.connect()
  
  try {
    console.log('🔍 Checking consent system database setup...\n')
    
    // Check if consent tables exist
    const tables = [
      'agreement_versions',
      'user_consents', 
      'consent_audit_log',
      'consent_notifications'
    ]
    
    console.log('📋 Checking tables:')
    for (const table of tables) {
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [table])
        
        const exists = result.rows[0].exists
        console.log(`  ${exists ? '✅' : '❌'} ${table}`)
        
        if (exists) {
          // Check row count
          const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`)
          console.log(`     └─ ${countResult.rows[0].count} rows`)
        }
      } catch (error) {
        console.log(`  ❌ ${table} - Error: ${error.message}`)
      }
    }
    
    console.log('\n🔧 Checking database functions:')
    
    // Check if consent functions exist
    const functions = [
      'check_user_consent_validity'
    ]
    
    for (const func of functions) {
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = $1
          )
        `, [func])
        
        const exists = result.rows[0].exists
        console.log(`  ${exists ? '✅' : '❌'} ${func}()`)
      } catch (error) {
        console.log(`  ❌ ${func}() - Error: ${error.message}`)
      }
    }
    
    console.log('\n📊 Sample data check:')
    
    // Check if there's at least one agreement version
    try {
      const agreementResult = await client.query('SELECT * FROM agreement_versions ORDER BY created_at DESC LIMIT 1')
      if (agreementResult.rows.length > 0) {
        const agreement = agreementResult.rows[0]
        console.log(`  ✅ Latest agreement: v${agreement.version} (${agreement.is_current ? 'current' : 'not current'})`)
        console.log(`     └─ Created: ${agreement.created_at}`)
        console.log(`     └─ Effective: ${agreement.effective_date}`)
      } else {
        console.log('  ❌ No agreement versions found')
      }
    } catch (error) {
      console.log(`  ❌ Agreement check failed: ${error.message}`)
    }
    
    console.log('\n🧪 Testing consent function:')
    
    // Test the consent function with a dummy user ID
    try {
      const testResult = await client.query('SELECT * FROM check_user_consent_validity($1)', [1])
      console.log('  ✅ check_user_consent_validity() function works')
      console.log(`     └─ Sample result: ${JSON.stringify(testResult.rows[0])}`)
    } catch (error) {
      console.log(`  ❌ Function test failed: ${error.message}`)
    }
    
    console.log('\n✅ Database check complete!')
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

// Run the check
checkConsentDatabase().catch(error => {
  console.error('❌ Script failed:', error.message)
  process.exit(1)
})