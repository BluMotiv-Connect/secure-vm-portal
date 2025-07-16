#!/usr/bin/env node

const { pool } = require('../../src/config/database')
const { encryptVMCredentials } = require('../../src/utils/encryption')
const logger = require('../../src/utils/logger')

async function setupAdminUser() {
  try {
    console.log('🚀 Setting up admin user...')

    // Check if admin user already exists
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE role = $1 LIMIT 1',
      ['admin']
    )

    if (existingAdmin.rows.length > 0) {
      console.log('✅ Admin user already exists')
      return
    }

    // Create admin user
    const adminData = {
      name: process.env.ADMIN_NAME || 'System Administrator',
      email: process.env.ADMIN_EMAIL || 'admin@yourdomain.com',
      azureId: process.env.ADMIN_AZURE_ID || 'admin-azure-id-placeholder',
      role: 'admin',
      isActive: true
    }

    const result = await pool.query(
      `INSERT INTO users (name, email, azure_id, role, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING id, email`,
      [adminData.name, adminData.email, adminData.azureId, adminData.role, adminData.isActive]
    )

    const adminUser = result.rows[0]

    // Create admin API token
    const tokenHash = require('crypto')
      .createHash('sha256')
      .update('admin-token-' + Date.now())
      .digest('hex')

    await pool.query(
      `INSERT INTO api_tokens (user_id, token_name, token_hash, permissions, expires_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '1 year')`,
      [
        adminUser.id,
        'Admin Setup Token',
        tokenHash,
        JSON.stringify(['admin', 'system'])
      ]
    )

    // Log admin creation
    await pool.query(
      `INSERT INTO audit_logs (action, resource_type, resource_id, metadata)
       VALUES ($1, $2, $3, $4)`,
      [
        'ADMIN_USER_CREATED',
        'users',
        adminUser.id,
        JSON.stringify({
          email: adminUser.email,
          createdBy: 'setup_script',
          timestamp: new Date().toISOString()
        })
      ]
    )

    console.log(`✅ Admin user created: ${adminUser.email}`)
    console.log('📧 Please update the Azure AD ID in the database with the actual value')
    
  } catch (error) {
    console.error('❌ Failed to setup admin user:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run if called directly
if (require.main === module) {
  setupAdminUser()
}

module.exports = setupAdminUser
