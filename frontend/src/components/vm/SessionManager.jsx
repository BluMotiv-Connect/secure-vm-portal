import React from 'react'
import { useConnections } from '@hooks/useConnections'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import TimerWidget from '@components/time/TimerWidget'
import { Monitor, Download, X, ExternalLink } from 'lucide-react'

const SessionManager = ({ sessions }) => {
  const { endConnection, downloadFile, isEnding, isDownloading } = useConnections()

  const handleEndSession = async (sessionId) => {
    try {
      await endConnection({ sessionId, reason: 'user_disconnect' })
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  }

  const handleDownloadConnection = async (session) => {
    try {
      const fileType = session.connectionType === 'rdp' ? 'rdp' : 'ssh'
      await downloadFile({ 
        sessionId: session.sessionId, 
        type: fileType,
        filename: `${session.vmName}-connection.${fileType === 'rdp' ? 'ps1' : 'sh'}`
      })
    } catch (error) {
      console.error('Failed to download connection file:', error)
    }
  }

  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No active sessions</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <Card key={session.sessionId}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-success-100 rounded-lg">
                  <Monitor className="h-5 w-5 text-success-600" />
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">{session.vmName}</h4>
                  <p className="text-sm text-gray-500">{session.vmIpAddress}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="success" size="sm">
                      {session.connectionType.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      Started {new Date(session.startTime).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <TimerWidget 
                  workLog={{ startTime: session.startTime }}
                  showControls={false}
                  size="sm"
                />
                
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadConnection(session)}
                    loading={isDownloading}
                    disabled={isDownloading}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`#/session/${session.sessionId}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleEndSession(session.sessionId)}
                    loading={isEnding}
                    disabled={isEnding}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default SessionManager
