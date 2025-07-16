const fs = require('fs').promises
const path = require('path')
const os = require('os')
const logger = require('../utils/logger')

class SSHConnectionService {
  // Generate SSH connection
  static async generateConnection({ vm, credentials, sessionId }) {
    try {
      // Generate SSH connection scripts
      const sshScript = this.generateSSHScript({
        ip: vm.ipAddress,
        username: credentials.username,
        password: credentials.password,
        privateKey: credentials.privateKey,
        port: credentials.connectionPort || 22,
        sessionId
      })

      // Save SSH script
      const scriptPath = path.join(os.tmpdir(), `ssh_${sessionId}.sh`)
      await fs.writeFile(scriptPath, sshScript)
      await fs.chmod(scriptPath, '755')

      // Generate batch file for Windows
      const batScript = this.generateWindowsSSHScript({
        ip: vm.ipAddress,
        username: credentials.username,
        password: credentials.password,
        port: credentials.connectionPort || 22,
        sessionId
      })

      const batPath = path.join(os.tmpdir(), `ssh_${sessionId}.bat`)
      await fs.writeFile(batPath, batScript)

      // Handle SSH key if provided
      let keyPath = null
      if (credentials.privateKey) {
        keyPath = path.join(os.tmpdir(), `key_${sessionId}`)
        await fs.writeFile(keyPath, credentials.privateKey)
        await fs.chmod(keyPath, '600')
      }

      logger.audit('SSH_CONNECTION_GENERATED', {
        sessionId,
        vmId: vm.id,
        vmIp: vm.ipAddress,
        authMethod: credentials.privateKey ? 'key' : 'password',
        files: [scriptPath, batPath, keyPath].filter(Boolean)
      })

      return {
        type: 'ssh',
        method: 'automatic',
        scriptPath: scriptPath,
        batchPath: batPath,
        keyPath: keyPath,
        instructions: this.getConnectionInstructions(vm.name, vm.osType),
        downloadUrl: `/api/connections/${sessionId}/download/ssh`,
        connectCommand: process.platform === 'win32' 
          ? `cmd.exe /c "${batPath}"`
          : `bash "${scriptPath}"`,
        manualConnection: {
          host: vm.ipAddress,
          port: credentials.connectionPort || 22,
          username: credentials.username,
          authMethod: credentials.privateKey ? 'key' : 'password'
        }
      }
    } catch (error) {
      logger.error('SSH connection generation failed:', error)
      throw error
    }
  }

  // Generate SSH script for Unix-like systems
  static generateSSHScript({ ip, username, password, privateKey, port = 22, sessionId }) {
    if (privateKey) {
      return `#!/bin/bash
# Secure VM Portal - Automated SSH Connection (Key Authentication)
# Session ID: ${sessionId}
# Generated: ${new Date().toISOString()}

echo "Connecting to ${ip}:${port} as ${username} using SSH key..."
echo "Session ID: ${sessionId}"
echo

# SSH connection with private key
ssh -i "${path.join(os.tmpdir(), `key_${sessionId}`)}" \\
    -o StrictHostKeyChecking=no \\
    -o UserKnownHostsFile=/dev/null \\
    -o PasswordAuthentication=no \\
    -p ${port} \\
    ${username}@${ip}

echo "SSH session ended."

# Cleanup
rm -f "${path.join(os.tmpdir(), `key_${sessionId}`)}" 2>/dev/null
rm -f "$0" 2>/dev/null

exit 0`
    } else {
      return `#!/bin/bash
# Secure VM Portal - Automated SSH Connection (Password Authentication)
# Session ID: ${sessionId}
# Generated: ${new Date().toISOString()}

echo "Connecting to ${ip}:${port} as ${username}..."
echo "Session ID: ${sessionId}"
echo

# Check if sshpass is available
if ! command -v sshpass &> /dev/null; then
    echo "Error: sshpass is required for password authentication"
    echo "Please install sshpass:"
    echo "  Ubuntu/Debian: sudo apt-get install sshpass"
    echo "  CentOS/RHEL: sudo yum install sshpass"
    echo "  macOS: brew install sshpass"
    exit 1
fi

# SSH connection with password
export SSHPASS="${password}"
sshpass -e ssh \\
    -o StrictHostKeyChecking=no \\
    -o UserKnownHostsFile=/dev/null \\
    -p ${port} \\
    ${username}@${ip}

echo "SSH session ended."

# Cleanup
unset SSHPASS
rm -f "$0" 2>/dev/null

exit 0`
    }
  }

  // Generate Windows SSH script
  static generateWindowsSSHScript({ ip, username, password, port = 22, sessionId }) {
    return `@echo off
title Secure VM Portal - SSH Connection
echo Connecting to ${ip}:${port} as ${username}...
echo Session ID: ${sessionId}
echo.

REM Check if OpenSSH is available
where ssh >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: OpenSSH client is not installed or not in PATH
    echo Please install OpenSSH client:
    echo   Windows 10/11: Settings ^> Apps ^> Optional Features ^> OpenSSH Client
    echo   Or download PuTTY from https://www.putty.org/
    pause
    exit /b 1
)

REM SSH connection
echo Launching SSH connection...
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=nul -p ${port} ${username}@${ip}

echo.
echo SSH session ended.
timeout /t 3 /nobreak >nul 2>&1

REM Self-delete
del "%~f0" >nul 2>&1`
  }

  // Get connection instructions
  static getConnectionInstructions(vmName, osType) {
    const baseInstructions = {
      title: `Connect to ${vmName}`,
      steps: [
        'Your SSH connection has been prepared',
        'Download the connection script for your operating system',
        'Run the script in a terminal/command prompt',
        'The SSH session will launch with automatic authentication',
        'Your session will be tracked for work logging purposes'
      ]
    }

    if (osType.toLowerCase().includes('windows')) {
      return {
        ...baseInstructions,
        requirements: [
          'OpenSSH client installed (Windows 10/11 built-in or PuTTY)',
          'Terminal or Command Prompt access',
          'Network connectivity to the target VM'
        ],
        troubleshooting: [
          'If OpenSSH is not found, install it from Windows Optional Features',
          'Alternative: Use PuTTY with the provided connection details',
          'Check Windows Firewall settings for SSH (port 22)',
          'Verify the VM SSH service is running and accessible'
        ]
      }
    } else {
      return {
        ...baseInstructions,
        requirements: [
          'SSH client (usually pre-installed on Linux/macOS)',
          'sshpass package for password authentication (if using password)',
          'Terminal access',
          'Network connectivity to the target VM'
        ],
        troubleshooting: [
          'Install sshpass if using password authentication',
          'Check firewall settings for SSH (port 22)',
          'Verify SSH service is running on the target VM',
          'Ensure your SSH key has correct permissions (600) if using key auth'
        ]
      }
    }
  }

  // Cleanup connection files
  static async cleanup(sessionId) {
    try {
      const filesToCleanup = [
        path.join(os.tmpdir(), `ssh_${sessionId}.sh`),
        path.join(os.tmpdir(), `ssh_${sessionId}.bat`),
        path.join(os.tmpdir(), `key_${sessionId}`)
      ]

      for (const filePath of filesToCleanup) {
        try {
          await fs.unlink(filePath)
          logger.debug(`Cleaned up file: ${filePath}`)
        } catch (error) {
          // File might not exist, which is fine
          if (error.code !== 'ENOENT') {
            logger.warn(`Failed to cleanup file ${filePath}:`, error)
          }
        }
      }

      logger.audit('SSH_CONNECTION_CLEANUP', {
        sessionId,
        filesCleanedUp: filesToCleanup.length
      })
    } catch (error) {
      logger.error('SSH cleanup failed:', error)
      throw error
    }
  }

  // Test SSH connectivity
  static async testConnectivity(ip, port = 22, timeout = 5000) {
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

      socket.connect(port, ip, () => {
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

  // Generate SSH config entry
  static generateSSHConfig({ ip, username, port = 22, keyPath, alias }) {
    return `
# Secure VM Portal - ${alias}
Host ${alias}
    HostName ${ip}
    Port ${port}
    User ${username}
    ${keyPath ? `IdentityFile ${keyPath}` : ''}
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    LogLevel QUIET
`
  }
}

module.exports = SSHConnectionService
