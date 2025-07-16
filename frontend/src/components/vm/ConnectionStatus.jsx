import React from 'react'
import { useConnections } from '@hooks/useConnections'
import Badge from '@components/ui/Badge'
import Button from '@components/ui/Button'
import { Card, CardContent } from '@components/ui/Card'
import { 
  Wifi, 
  WifiOff, 
  Clock, 
  Monitor, 
  X, 
  Download,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

const ConnectionStatus = ({ session, onDisconnect, onDownload, compact = false }) => {
  const { endConnection, isEnding } = useConnections()

  const formatDuration = (startTime) => {
    const start = new Date(startTime)
    const now = new Date()
    const durationMs = now - start
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <Wifi className="h-4 w-4 text-success-600" />
      case 'connecting':
        return <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full" />
      case 'disconnecting':
        return <div className="animate-pulse h-4 w-4 bg-warning-600 rounded-full" />
      case 'ended':
        return <WifiOff className="h-4 w-4 text-gray-400" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-error-600" />
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success'
      case 'connecting': return 'primary'
      case 'disconnecting': return 'warning'
      case 'ended': return 'secondary'
      case 'error': return 'error'
      default: return 'secondary'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Connected'
      case 'connecting': return 'Connecting...'
      case 'disconnecting': return 'Disconnecting...'
      case 'ended': return 'Disconnected'
      case 'error': return 'Connection Error'
      default: return 'Unknown'
    }
  }

  const handleDisconnect = async () => {
    try {
      await endConnection({ 
        sessionId: session.sessionId, 
        reason: 'user_disconnect' 
      })
      if (onDisconnect) {
        onDisconnect()
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload(session)
    }
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {getStatusIcon(session.status)}
        <Badge variant={getStatusColor(session.status)} size="sm">
          {getStatusText(session.status)}
        </Badge>
        {session.status === 'active' && (
          <span className="text-xs text-gray-500">
            {formatDuration(session.startTime)}
          </span>
        )}
      </div>
    )
  }

  return (
    <Card className={`border-2 ${
      session.status === 'active' ? 'border-success-200 bg-success-50' :
      session.status === 'error' ? 'border-error-200 bg-error-50' :
      'border-gray-200'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Monitor className="h-5 w-5 text-gray-600" />
            </div>
            
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-gray-900">{session.vmName}</h4>
                {getStatusIcon(session.status)}
                <Badge variant={getStatusColor(session.status)} size="sm">
                  {getStatusText(session.status)}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center space-x-1">
                  <Monitor className="h-3 w-3" />
                  <span>{session.vmIpAddress}</span>
                </span>
                
                <span className="flex items-center space-x-1">
                  <span className="font-medium">
                    {session.connectionType?.toUpperCase()}
                  </span>
                </span>
                
                {session.status === 'active' && (
                  <span className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDuration(session.startTime)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {session.status === 'active' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownload}
                  title="Download connection file"
                >
                  <Download className="h-4 w-4" />
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDisconnect}
                  loading={isEnding}
                  disabled={isEnding}
                  title="Disconnect session"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            
            {session.status === 'ended' && (
              <div className="flex items-center space-x-1 text-success-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Completed</span>
              </div>
            )}
            
            {session.status === 'error' && (
              <div className="flex items-center space-x-1 text-error-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Failed</span>
              </div>
            )}
          </div>
        </div>

        {/* Additional Session Info */}
        {session.status === 'active' && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-xs text-gray-500">
              <div>
                <span className="font-medium">Started:</span>
                <p>{new Date(session.startTime).toLocaleTimeString()}</p>
              </div>
              <div>
                <span className="font-medium">Duration:</span>
                <p className="font-mono">{formatDuration(session.startTime)}</p>
              </div>
              <div>
                <span className="font-medium">Session ID:</span>
                <p className="font-mono">{session.sessionId?.slice(-8)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Details */}
        {session.status === 'error' && session.error && (
          <div className="mt-3 pt-3 border-t border-error-200">
            <p className="text-sm text-error-700">
              <strong>Error:</strong> {session.error}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ConnectionStatus
