const fs = require('fs').promises
const path = require('path')
const os = require('os')
const { spawn } = require('child_process')
const logger = require('./logger')

class ConnectionUtils {
  // Generate unique session identifier
  static generateSessionId() {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 9)
    return `session_${timestamp}_${random}`
  }

  // Validate IP address format
  static isValidIP(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    return ipRegex.test(ip)
  }

  // Test network connectivity to a host
  static async testConnectivity(host, port, timeout = 5000) {
    return new Promise((resolve) => {
      const net = require('net')
      const socket = new net.Socket()

      const timer = setTimeout(() => {
        socket.destroy()
        resolve({
          success: false,
          error: 'Connection timeout',
          responseTime: timeout
        })
      }, timeout)

      const startTime = Date.now()

      socket.connect(port, host, () => {
        clearTimeout(timer)
        socket.destroy()
        resolve({
          success: true,
          responseTime: Date.now() - startTime
        })
      })

      socket.on('error', (error) => {
        clearTimeout(timer)
        socket.destroy()
        resolve({
          success: false,
          error: error.message,
          responseTime: Date.now() - startTime
        })
      })
    })
  }

  // Create temporary directory for session files
  static async createSessionDirectory(sessionId) {
    try {
      const sessionDir = path.join(os.tmpdir(), 'vm-portal-sessions', sessionId)
      await fs.mkdir(sessionDir, { recursive: true })
      return sessionDir
    } catch (error) {
      logger.error('Failed to create session directory:', error)
      throw new Error('Failed to create session directory')
    }
  }

  // Clean up session files
  static async cleanupSessionFiles(sessionId) {
    try {
      const sessionDir = path.join(os.tmpdir(), 'vm-portal-sessions', sessionId)
      
      // Remove all files in session directory
      try {
        const files = await fs.readdir(sessionDir)
        await Promise.all(files.map(file => 
          fs.unlink(path.join(sessionDir, file)).catch(() => {})
        ))
        await fs.rmdir(sessionDir)
      } catch (error) {
        // Directory might not exist, which is fine
      }

      // Also clean up any files in temp root
      const tempFiles = [
        path.join(os.tmpdir(), `session_${sessionId}.rdp`),
        path.join(os.tmpdir(), `connect_${sessionId}.ps1`),
        path.join(os.tmpdir(), `connect_${sessionId}.bat`),
        path.join(os.tmpdir(), `ssh_${sessionId}.sh`),
        path.join(os.tmpdir(), `ssh_${sessionId}.bat`),
        path.join(os.tmpdir(), `key_${sessionId}`)
      ]

      await Promise.all(tempFiles.map(file => 
        fs.unlink(file).catch(() => {})
      ))

      logger.debug(`Cleaned up session files for: ${sessionId}`)
    } catch (error) {
      logger.error('Session cleanup failed:', error)
    }
  }

  // Execute shell command safely
  static async executeCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: options.timeout || 30000,
        ...options
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code })
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`))
        }
      })

      child.on('error', (error) => {
        reject(error)
      })

      // Handle timeout
      if (options.timeout) {
        setTimeout(() => {
          child.kill('SIGTERM')
          reject(new Error('Command timeout'))
        }, options.timeout)
      }
    })
  }

  // Generate secure file permissions
  static async setSecurePermissions(filePath) {
    try {
      if (process.platform !== 'win32') {
        await fs.chmod(filePath, 0o600) // Read/write for owner only
      }
    } catch (error) {
      logger.warn('Failed to set secure permissions:', error)
    }
  }

  // Validate connection parameters
  static validateConnectionParams(params) {
    const errors = []

    if (!params.host || !this.isValidIP(params.host)) {
      errors.push('Valid host IP address is required')
    }

    if (!params.port || params.port < 1 || params.port > 65535) {
      errors.push('Valid port number (1-65535) is required')
    }

    if (!params.username || params.username.trim().length === 0) {
      errors.push('Username is required')
    }

    if (!params.connectionType || !['rdp', 'ssh'].includes(params.connectionType)) {
      errors.push('Valid connection type (rdp/ssh) is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Generate connection metadata
  static generateConnectionMetadata(vm, user, sessionId) {
    return {
      sessionId,
      vmId: vm.id,
      vmName: vm.name,
      vmIpAddress: vm.ipAddress,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      connectionType: vm.osType?.toLowerCase().includes('windows') ? 'rdp' : 'ssh',
      timestamp: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version
    }
  }

  // Create connection audit log
  static async auditConnection(action, metadata) {
    try {
      logger.audit(`CONNECTION_${action.toUpperCase()}`, {
        ...metadata,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Connection audit failed:', error)
    }
  }

  // Check if session is expired
  static isSessionExpired(startTime, maxDurationHours = 8) {
    const start = new Date(startTime)
    const now = new Date()
    const durationHours = (now - start) / (1000 * 60 * 60)
    return durationHours > maxDurationHours
  }

  // Format connection duration
  static formatDuration(startTime, endTime = null) {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const durationMs = end - start
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000)

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  // Get connection file extension based on type and platform
  static getConnectionFileExtension(connectionType, platform = process.platform) {
    if (connectionType === 'rdp') {
      return platform === 'win32' ? 'ps1' : 'rdp'
    } else if (connectionType === 'ssh') {
      return platform === 'win32' ? 'bat' : 'sh'
    }
    return 'txt'
  }

  // Sanitize filename for safe file operations
  static sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9\-_\.]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 100) // Limit length
  }
}

module.exports = ConnectionUtils
