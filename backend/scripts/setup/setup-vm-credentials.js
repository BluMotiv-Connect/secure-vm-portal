const { pool } = require('../../backend/src/config/database')
const { encrypt } = require('../../backend/src/config/security')
const logger = require('../../backend/src/utils/logger')

// Your actual VM credentials - REPLACE WITH YOUR REAL CREDENTIALS
const vmCredentials = [
  {
    name: 'Windows Dev Server',
    description: 'Development server for Windows applications',
    ip: '192.168.1.100',
    osType: 'windows',
    osVersion: 'Windows Server 2019',
    username: 'administrator',
    password: 'your-actual-password-1',
    connectionPort: 3389,
    connectionType: 'rdp'
  },
  {
    name: 'Linux Web Server',
    description: 'Ubuntu web server for development',
    ip: '192.168.1.101',
    osType: 'linux',
    osVersion: 'Ubuntu 20.04 LTS',
    username: 'ubuntu',
    password: 'your-actual-password-2',
    connectionPort: 22,
    connectionType: 'ssh'
  },
  {
    name: 'Database Server',
    description: 'CentOS database server',
    ip: '192.168.1.102',
    osType: 'linux',
    osVersion: 'CentOS 8',
    username: 'root',
    password: 'your-actual-password-3',
    connectionPort: 22,
    connectionType: 'ssh'
  }
]

async function setupVMCredentials() {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    console.log('🔧 Setting up VM credentials...')
    
    for (const vm of vmCredentials) {
      // Insert or update VM
      const vmQuery = `
        INSERT INTO virtual_machines (name, description, ip_address, os_type, os_version, status, region)
        VALUES ($1, $2, $3, $4, $5, 'online', 'Local')
        ON CONFLICT (ip_address) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          os_type = EXCLUDED.os_type,
          os_version = EXCLUDED.os_version,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `
      
      const vmResult = await client.query(vmQuery, [
        vm.name,
        vm.description,
        vm.ip,
        vm.osType,
        vm.osVersion
      ])
      
      const vmId = vmResult.rows[0].id
      
      // Encrypt password
      const encryptedPassword = encrypt(vm.password)
      
      // Insert or update credentials
      const credQuery = `
        INSERT INTO vm_credentials (vm_id, username, password_encrypted, connection_port, connection_type)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (vm_id) DO UPDATE SET
          username = EXCLUDED.username,
          password_encrypted = EXCLUDED.password_encrypted,
          connection_port = EXCLUDED.connection_port,
          connection_type = EXCLUDED.connection_type,
          updated_at = CURRENT_TIMESTAMP
      `
      
      await client.query(credQuery, [
        vmId,
        vm.username,
        encryptedPassword,
        vm.connectionPort,
        vm.connectionType
      ])
      
      console.log(`✅ Setup complete for ${vm.name} (${vm.ip})`)
      
      logger.audit('VM_CREDENTIALS_SETUP', {
        vmId,
        vmName: vm.name,
        ip: vm.ip,
        osType: vm.osType,
        connectionType: vm.connectionType
      })
    }
    
    await client.query('COMMIT')
    console.log('🎉 All VM credentials setup complete!')
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Setup failed:', error)
    throw error
  } finally {
    client.release()
  }
}

// Run setup if called directly
if (require.main === module) {
  setupVMCredentials()
    .then(() => {
      console.log('VM credentials setup completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('VM credentials setup failed:', error)
      process.exit(1)
    })
}

module.exports = { setupVMCredentials }
