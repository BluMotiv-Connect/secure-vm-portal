import React, { useState, useEffect } from 'react'
import { connectionService } from '@services/connectionService'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import { Monitor, Wifi, Clock, AlertCircle, CheckCircle, XCircle, Activity } from 'lucide-react'

const BrowserConnectionStatus = ({ session, onSessionEnd, vm }) => {
  const [status, setStatus] = useState('checking')
  const [connectionDetails, setConnectionDetails] = useState(null)
  const [duration, setDuration] = useState(0)
  const [isEnding, setIsEnding] = useState(false)

  // Update duration every second
  useEffect(() => {
    if (session?.startTime) {
      const updateDuration = () => {
        const start = new Date(session.startTime)
        const now = new Date()
        const minutes = Math.floor((now - start) / (1000 * 60))
        setDuration(minutes)
      }

      updateDuration()
      const interval = setInterval(updateDuration, 60000) // Update every minute

      return () => clearInterval(interval)
    }
  }, [session?.startTime])

  // Check connection status periodically
  useEffect(() => {
    let statusInterval

    const checkStatus = async () => {
      try {
        const response = await connectionService.getBrowserConnectionStatus(session.sessionId)
        setStatus(response.status)
        setConnectionDetails(response)
        
        // If session is no longer active, stop checking
        if (response.status === 'inactive' || response.status === 'not_found') {
          if (statusInterval) clearInterval(statusInterval)
          onSessionEnd && onSessionEnd()
        }
      } catch (error) {
        console.error('Failed to check connection status:', error)
        setStatus('error')
      }
    }

    if (session?.sessionId) {
      checkStatus()
      statusInterval = setInterval(checkStatus, 30000) // Check every 30 seconds
    }

    return () => {
      if (statusInterval) clearInterval(statusInterval)
    }
  }, [session?.sessionId, onSessionEnd])

  const handleForceEnd = async () => {
    try {
      setIsEnding(true)
      await connectionService.forceEndBrowserConnection(session.sessionId)
      onSessionEnd && onSessionEnd()
    } catch (error) {
      console.error('Failed to force end connection:', error)
    } finally {
      setIsEnding(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'active':
        return connectionDetails?.processRunning ? 
          <Activity className="h-5 w-5 text-green-600 animate-pulse" /> :
          <CheckCircle className="h-5 w-5 text-green-600" />
      case 'inactive':
        return <XCircle className="h-5 w-5 text-gray-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-blue-600" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'active':
        return connectionDetails?.processRunning ? 'Connected & Active' : 'Session Active'
      case 'inactive':
        return 'Session Ended'
      case 'error':
        return 'Connection Error'
      default:
        return 'Checking Status...'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return connectionDetails?.processRunning ? 'success' : 'warning'
      case 'inactive':
        return 'gray'
      case 'error':
        return 'danger'
      default:
        return 'info'
    }
  }

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-3">
            <Monitor className="h-6 w-6 text-blue-600" />
            <span>Active Connection</span>
          </div>
          <Badge variant={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* VM Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Virtual Machine:</span>
            <p className="text-gray-900">{vm?.name || session.vmName}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">IP Address:</span>
            <p className="text-gray-900 font-mono">{vm?.ipAddress || session.vmIpAddress}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Connection Type:</span>
            <p className="text-gray-900 uppercase">{session.connectionType}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Duration:</span>
            <p className="text-gray-900">{formatDuration(duration)}</p>
          </div>
        </div>

        {/* Status Details */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-3">
            {getStatusIcon()}
            <span className="font-medium text-gray-900">{getStatusText()}</span>
          </div>
          
          {status === 'active' && (
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Wifi className="h-4 w-4" />
                <span>
                  {connectionDetails?.processRunning ? 
                    'Connection process is running' : 
                    'Session is active (process may have ended)'
                  }
                </span>
              </div>
              
              {connectionDetails?.processRunning && (
                <div className="text-xs text-green-600 font-medium">
                  ✓ Automatic session tracking is active
                </div>
              )}
            </div>
          )}
          
          {status === 'inactive' && (
            <p className="text-sm text-gray-600">
              Session has ended. Work logs have been saved automatically.
            </p>
          )}
          
          {status === 'error' && (
            <p className="text-sm text-red-600">
              Unable to check connection status. The connection may have ended unexpectedly.
            </p>
          )}
        </div>

        {/* Session Information */}
        <div className="border-t pt-4">
          <div className="text-sm text-gray-600 space-y-1">
            <div>Session ID: <span className="font-mono text-xs">{session.sessionId}</span></div>
            <div>Started: {new Date(session.startTime).toLocaleString()}</div>
            {session.endTime && (
              <div>Ended: {new Date(session.endTime).toLocaleString()}</div>
            )}
          </div>
        </div>

        {/* Actions */}
        {status === 'active' && (
          <div className="border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleForceEnd}
              loading={isEnding}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {isEnding ? 'Ending Session...' : 'Force End Session'}
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Session will end automatically when you close the connection.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default BrowserConnectionStatus 