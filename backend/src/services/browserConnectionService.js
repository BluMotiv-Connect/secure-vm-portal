const logger = require('../utils/logger')
const Session = require('../models/Session')
const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)
const os = require('os')

class BrowserConnectionService {
  
  // Launch VM connection automatically and track session
  static async launchVMConnection(sessionId, vm, credentials) {
    try {
      logger.info(`[Browser Connection] Launching ${credentials.connectionType} connection for session ${sessionId}`)
      
      if (credentials.connectionType === 'rdp') {
        return await this.launchRDPConnection(sessionId, vm, credentials)
      } else if (credentials.connectionType === 'ssh') {
        return await this.launchSSHConnection(sessionId, vm, credentials)
      } else {
        throw new Error(`Unsupported connection type: ${credentials.connectionType}`)
      }
    } catch (error) {
      logger.error('[Browser Connection] Failed to launch VM connection:', error)
      throw error
    }
  }

  // Launch RDP connection automatically
  static async launchRDPConnection(sessionId, vm, credentials) {
    try {
      const { ip, username, password } = { 
        ip: vm.ipAddress, 
        username: credentials.username, 
        password: credentials.password 
      }
      const port = credentials.connectionPort || 3389

      logger.info(`[Browser Connection] Launching RDP to ${ip}:${port} as ${username}`)

      // Store credentials in Windows Credential Manager securely
      const cmdKeyCommand = `cmdkey /generic:"${ip}" /user:"${username}" /pass:"${password}"`
      await execAsync(cmdKeyCommand)

      // Launch RDP connection in full screen mode
      const rdpCommand = `mstsc /v:${ip}:${port} /f`
      
      // Start the RDP connection process (non-blocking)
      const rdpProcess = exec(rdpCommand)
      
      // Track the process
      const processInfo = {
        pid: rdpProcess.pid,
        command: rdpCommand,
        startTime: new Date()
      }

      // Update session with process info
      await Session.updateConnectionProcess(sessionId, processInfo)

      // Set up process monitoring
      this.monitorConnectionProcess(sessionId, rdpProcess, ip)

      logger.audit('RDP_AUTO_LAUNCHED', {
        sessionId,
        vmId: vm.id,
        vmIp: ip,
        processId: rdpProcess.pid,
        username: username
      })

      return {
        success: true,
        processId: rdpProcess.pid,
        connectionType: 'rdp',
        autoLaunched: true,
        message: 'RDP connection launched automatically'
      }

    } catch (error) {
      logger.error('[Browser Connection] RDP launch failed:', error)
      throw error
    }
  }

  // Launch SSH connection automatically  
  static async launchSSHConnection(sessionId, vm, credentials) {
    try {
      const { ip, username, password, privateKey } = {
        ip: vm.ipAddress,
        username: credentials.username,
        password: credentials.password,
        privateKey: credentials.privateKey
      }
      const port = credentials.connectionPort || 22

      logger.info(`[Browser Connection] Launching SSH to ${ip}:${port} as ${username}`)

      let sshCommand
      
      if (privateKey) {
        // Use private key authentication
        const keyFile = `/tmp/ssh_key_${sessionId}`
        require('fs').writeFileSync(keyFile, privateKey, { mode: 0o600 })
        
        sshCommand = `ssh -i "${keyFile}" -o StrictHostKeyChecking=no -p ${port} ${username}@${ip}`
      } else {
        // Use password authentication with sshpass
        sshCommand = `sshpass -p "${password}" ssh -o StrictHostKeyChecking=no -p ${port} ${username}@${ip}`
      }

      // Launch SSH in a new terminal window
      let terminalCommand
      const platform = os.platform()
      
      if (platform === 'darwin') {
        // macOS - open in Terminal.app
        terminalCommand = `osascript -e 'tell app "Terminal" to do script "${sshCommand}"'`
      } else if (platform === 'linux') {
        // Linux - try various terminal emulators
        terminalCommand = `gnome-terminal -- bash -c "${sshCommand}; exec bash" || xterm -e "${sshCommand}" || konsole -e "${sshCommand}"`
      } else {
        // Windows - use Windows Terminal or cmd
        terminalCommand = `start cmd /k "${sshCommand}"`
      }

      const sshProcess = exec(terminalCommand)
      
      const processInfo = {
        pid: sshProcess.pid,
        command: sshCommand,
        startTime: new Date()
      }

      await Session.updateConnectionProcess(sessionId, processInfo)
      this.monitorConnectionProcess(sessionId, sshProcess, ip)

      logger.audit('SSH_AUTO_LAUNCHED', {
        sessionId,
        vmId: vm.id,
        vmIp: ip,
        processId: sshProcess.pid,
        username: username,
        authMethod: privateKey ? 'key' : 'password'
      })

      return {
        success: true,
        processId: sshProcess.pid,
        connectionType: 'ssh',
        autoLaunched: true,
        message: 'SSH connection launched automatically'
      }

    } catch (error) {
      logger.error('[Browser Connection] SSH launch failed:', error)
      throw error
    }
  }

  // Monitor connection process for automatic session tracking
  static monitorConnectionProcess(sessionId, process, vmIp) {
    logger.info(`[Browser Connection] Monitoring process ${process.pid} for session ${sessionId}`)

    // Monitor process exit
    process.on('exit', async (code) => {
      logger.info(`[Browser Connection] Process ${process.pid} exited with code ${code}`)
      
      try {
        // Clean up credentials from Windows Credential Manager
        if (vmIp) {
          await execAsync(`cmdkey /delete:"${vmIp}"`)
        }

        // End the session automatically
        const session = await Session.findBySessionId(sessionId)
        if (session && session.isActive()) {
          await session.end('process_exit')
          
          logger.audit('SESSION_AUTO_ENDED', {
            sessionId,
            processId: process.pid,
            exitCode: code,
            reason: 'connection_process_ended'
          })
        }
      } catch (error) {
        logger.error('[Browser Connection] Process cleanup failed:', error)
      }
    })

    // Monitor process errors
    process.on('error', async (error) => {
      logger.error(`[Browser Connection] Process ${process.pid} error:`, error)
      
      try {
        const session = await Session.findBySessionId(sessionId)
        if (session && session.isActive()) {
          await session.end('process_error')
        }
      } catch (cleanupError) {
        logger.error('[Browser Connection] Error cleanup failed:', cleanupError)
      }
    })

    // Set up periodic health check
    const healthCheckInterval = setInterval(async () => {
      try {
        // Check if process is still running
        process.kill(0) // This doesn't actually kill, just checks if process exists
      } catch (error) {
        // Process is dead
        clearInterval(healthCheckInterval)
        
        try {
          const session = await Session.findBySessionId(sessionId)
          if (session && session.isActive()) {
            await session.end('process_not_found')
          }
        } catch (sessionError) {
          logger.error('[Browser Connection] Session cleanup failed:', sessionError)
        }
      }
    }, 30000) // Check every 30 seconds

    // Clean up interval after 8 hours max
    setTimeout(() => {
      clearInterval(healthCheckInterval)
    }, 8 * 60 * 60 * 1000)
  }

  // Get active connection status
  static async getConnectionStatus(sessionId) {
    try {
      const session = await Session.findBySessionId(sessionId)
      if (!session) {
        return { status: 'not_found' }
      }

      if (!session.isActive()) {
        return { status: 'inactive', session: session.toJSON() }
      }

      // Check if connection process is still running
      if (session.metadata?.processId) {
        try {
          process.kill(session.metadata.processId, 0)
          return { 
            status: 'active', 
            session: session.toJSON(),
            processRunning: true 
          }
        } catch {
          return { 
            status: 'active', 
            session: session.toJSON(),
            processRunning: false 
          }
        }
      }

      return { status: 'active', session: session.toJSON() }
    } catch (error) {
      logger.error('[Browser Connection] Status check failed:', error)
      throw error
    }
  }

  // Force end connection and cleanup
  static async forceEndConnection(sessionId) {
    try {
      const session = await Session.findBySessionId(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }

      // Kill the connection process if it exists
      if (session.metadata?.processId) {
        try {
          process.kill(session.metadata.processId, 'SIGTERM')
          logger.info(`[Browser Connection] Killed process ${session.metadata.processId}`)
        } catch (error) {
          logger.warn(`[Browser Connection] Could not kill process ${session.metadata.processId}:`, error)
        }
      }

      // Clean up credentials
      if (session.metadata?.vmIpAddress) {
        try {
          await execAsync(`cmdkey /delete:"${session.metadata.vmIpAddress}"`)
        } catch (error) {
          logger.warn('[Browser Connection] Credential cleanup failed:', error)
        }
      }

      // End session
      await session.end('force_disconnect')

      logger.audit('CONNECTION_FORCE_ENDED', {
        sessionId,
        processId: session.metadata?.processId
      })

      return { success: true, message: 'Connection ended successfully' }
    } catch (error) {
      logger.error('[Browser Connection] Force end failed:', error)
      throw error
    }
  }
}

module.exports = BrowserConnectionService 