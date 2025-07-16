const fs = require('fs').promises
const path = require('path')
const os = require('os')
const logger = require('../utils/logger')

class RDPConnectionService {
  // Generate RDP connection
  static async generateConnection({ vm, credentials, sessionId }) {
    try {
      // Create RDP file content
      const rdpContent = this.generateRDPFile({
        ip: vm.ipAddress,
        username: credentials.username,
        port: credentials.connectionPort || 3389,
        sessionId
      })

      // Save RDP file temporarily
      const rdpFilePath = path.join(os.tmpdir(), `session_${sessionId}.rdp`)
      await fs.writeFile(rdpFilePath, rdpContent)

      // Generate PowerShell script for automatic connection
      const psScript = this.generatePowerShellScript({
        ip: vm.ipAddress,
        username: credentials.username,
        password: credentials.password,
        rdpFilePath,
        sessionId
      })

      const scriptPath = path.join(os.tmpdir(), `connect_${sessionId}.ps1`)
      await fs.writeFile(scriptPath, psScript)

      // Generate batch file for Windows
      const batScript = this.generateBatchScript({
        ip: vm.ipAddress,
        username: credentials.username,
        password: credentials.password,
        sessionId
      })

      const batPath = path.join(os.tmpdir(), `connect_${sessionId}.bat`)
      await fs.writeFile(batScript, batScript)

      logger.audit('RDP_CONNECTION_GENERATED', {
        sessionId,
        vmId: vm.id,
        vmIp: vm.ipAddress,
        files: [rdpFilePath, scriptPath, batPath]
      })

      return {
        type: 'rdp',
        method: 'automatic',
        rdpFile: rdpFilePath,
        scriptPath: scriptPath,
        batchPath: batPath,
        instructions: this.getConnectionInstructions(vm.name),
        downloadUrl: `/api/connections/${sessionId}/download/rdp`,
        connectCommand: process.platform === 'win32' 
          ? `powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`
          : `open "${rdpFilePath}"`,
        manualConnection: {
          host: vm.ipAddress,
          port: credentials.connectionPort || 3389,
          username: credentials.username,
          // Don't include password in response for security
        }
      }
    } catch (error) {
      logger.error('RDP connection generation failed:', error)
      throw error
    }
  }

  // Generate RDP file content
  static generateRDPFile({ ip, username, port = 3389, sessionId, password }) {
    const rdpContent = [
      'screen mode id:i:2',
      'use multimon:i:0',
      'desktopwidth:i:1920',
      'desktopheight:i:1080',
      'session bpp:i:32',
      'compression:i:1',
      'keyboardhook:i:2',
      'audiocapturemode:i:0',
      'videoplaybackmode:i:1',
      'connection type:i:7',
      'networkautodetect:i:1',
      'bandwidthautodetect:i:1',
      'displayconnectionbar:i:1',
      'disable wallpaper:i:1',
      'allow font smoothing:i:1',
      'allow desktop composition:i:0',
      'disable full window drag:i:1',
      'disable menu anims:i:1',
      'disable themes:i:0',
      'disable cursor setting:i:0',
      'bitmapcachepersistenable:i:1',
      `full address:s:${ip}`,
      'audiomode:i:0',
      'redirectprinters:i:1',
      'redirectcomports:i:0',
      'redirectsmartcards:i:1',
      'redirectclipboard:i:1',
      'redirectposdevices:i:0',
      'autoreconnection enabled:i:1',
      'authentication level:i:2',
      'prompt for credentials:i:0',
      'negotiate security layer:i:1',
      'remoteapplicationmode:i:0',
      'alternate shell:s:',
      'shell working directory:s:',
      'enablecredsspsupport:i:1',
      `username:s:${username}`,
      `password:s:${password}`
    ];

    return rdpContent.join('\r\n');
  }

  // Generate PowerShell script
  static generatePowerShellScript({ ip, username, password, rdpFilePath, sessionId }) {
    return `# Secure VM Portal - Automated RDP Connection
# Session ID: ${sessionId}
# Generated: ${new Date().toISOString()}

Write-Host "Connecting to ${ip} as ${username}..." -ForegroundColor Green

try {
    # Store credentials securely
    $securePassword = ConvertTo-SecureString "${password}" -AsPlainText -Force
    $credential = New-Object System.Management.Automation.PSCredential("${username}", $securePassword)
    
    # Store credentials in Windows Credential Manager
    cmdkey /generic:"${ip}" /user:"${username}" /pass:"${password}" | Out-Null
    
    Write-Host "Launching RDP connection..." -ForegroundColor Yellow
    
    # Launch RDP connection
    Start-Process mstsc -ArgumentList "${rdpFilePath}" -Wait
    
    Write-Host "RDP session ended." -ForegroundColor Green
    
} catch {
    Write-Host "Connection failed: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Clean up credentials
    Start-Sleep -Seconds 2
    cmdkey /delete:"${ip}" 2>$null | Out-Null
    
    # Clean up temporary files
    if (Test-Path "${rdpFilePath}") {
        Remove-Item "${rdpFilePath}" -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $PSCommandPath) {
        Remove-Item $PSCommandPath -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host "Cleanup completed." -ForegroundColor Gray
}

# Auto-close window after 5 seconds
Start-Sleep -Seconds 5`
  }

  // Generate batch script
  static generateBatchScript({ ip, username, password, sessionId }) {
    return `@echo off
title Secure VM Portal - RDP Connection
echo Connecting to ${ip} as ${username}...
echo Session ID: ${sessionId}
echo.

REM Store credentials
cmdkey /generic:"${ip}" /user:"${username}" /pass:"${password}" >nul 2>&1

REM Launch RDP connection
echo Launching RDP connection...
mstsc /v:${ip} /f

REM Wait a moment then cleanup
timeout /t 5 /nobreak >nul 2>&1

REM Clean up credentials
cmdkey /delete:"${ip}" >nul 2>&1

echo Connection ended.
timeout /t 3 /nobreak >nul 2>&1`
  }

  // Get connection instructions
  static getConnectionInstructions(vmName) {
    return {
      title: `Connect to ${vmName}`,
      steps: [
        'Your RDP connection has been prepared with automatic credentials',
        'Click the download button to get the connection files',
        'Run the PowerShell script (recommended) or batch file as Administrator',
        'The RDP session will launch automatically with pre-filled credentials',
        'Your session will be tracked for work logging purposes'
      ],
      requirements: [
        'Windows operating system with RDP client',
        'PowerShell execution policy allows script execution',
        'Administrator privileges for credential storage',
        'Network connectivity to the target VM'
      ],
      troubleshooting: [
        'If connection fails, verify the VM is online and accessible',
        'Check Windows Firewall settings for RDP (port 3389)',
        'Ensure your user account has RDP access permissions',
        'Contact your administrator if credentials are incorrect'
      ]
    }
  }

  // Cleanup connection files
  static async cleanup(sessionId) {
    try {
      const filesToCleanup = [
        path.join(os.tmpdir(), `session_${sessionId}.rdp`),
        path.join(os.tmpdir(), `connect_${sessionId}.ps1`),
        path.join(os.tmpdir(), `connect_${sessionId}.bat`)
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

      logger.audit('RDP_CONNECTION_CLEANUP', {
        sessionId,
        filesCleanedUp: filesToCleanup.length
      })
    } catch (error) {
      logger.error('RDP cleanup failed:', error)
      throw error
    }
  }

  // Test RDP connectivity
  static async testConnectivity(ip, port = 3389, timeout = 5000) {
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
}

module.exports = RDPConnectionService
